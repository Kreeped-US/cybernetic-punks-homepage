// lib/matchups.js
//
// Single source of truth for the /matchups reference section: the shell list,
// shell->URL slug rule, the section accent, the matchup-verification date, and
// the honesty helpers that keep the empty-state and provenance logic identical
// across every consumer. Shared by app/matchups/page.js (hub),
// app/matchups/[shell]/page.js (detail), and app/sitemap.js.
//
// WHY SHARED: three consumers must agree on which shells have pages and how a
// shell maps to a URL. If the sitemap's list drifts from the resolver's list,
// the sitemap advertises URLs that 404; if the hub's drifts, it links to them.
// One list, imported everywhere -- the same discipline lib/mods.js enforces for
// the /mods section.
//
// DATA SOURCE: shell_stats matchup columns, GAME-VERIFIED by the owner in-game
// (Season 2), written 2026-07-17 (see docs/HANDOFF.md):
//   - countered_by   text[]  -- the shells that BEAT this shell. This is the
//                               answer to "how to beat this shell" (direction
//                               verified against live articles: Assassin is
//                               countered_by [Recon, Triage], and article
//                               2ec2a58c is titled "beat it With Recon").
//   - counter_items  jsonb   -- items/tactics that beat this shell (names only).
//   - weaknesses     text[]  -- prose weakness phrases. NOT part of the
//                               2026-07-17 game-verified pass; pre-existing data
//                               of weaker provenance. Rendered under a separate,
//                               clearly-labelled "General notes" section, never
//                               as game-verified fact. See the detail page.

export const MATCHUP_ACCENT = '#ff7a45'; // combat orange -- distinct from MOD_ACCENT cyan and the brand red.

// The date the matchup matrix was owner-verified in-game and written to
// shell_stats. Used as a FIXED dateModified on the detail pages -- never
// new Date(), which would report every crawl as a fresh edit (the false-
// freshness bug fixed in app/weapons/[slug]/page.js and lib/mods.js).
export const MATCHUP_VERIFIED_DATE = '2026-07-17';

// The marker appended to shell_stats.verified_source when the matchup data was
// game-checked (see the 2026-07-17 fill). This is what lets an empty
// countered_by mean "verified: no hard counter" (Rook) rather than "nobody
// filled it yet". A shell added later WITHOUT this marker reads as "analysis
// pending", not as a confident no-counter claim.
const MATCHUP_VERIFIED_RE = /matchup data owner-verified/i;
export function isMatchupVerified(verifiedSource) {
  return MATCHUP_VERIFIED_RE.test(verifiedSource || '');
}

// SHELLS THAT GET A MATCHUP PAGE. All 8 Season 2 shells -- the matrix is
// owner-verified and complete for every one (including Sentinel, whose data
// this section renders even though /shells' copy still says "7 Runners";
// Sentinel's matchup row is filled, so hiding it would leave verified data
// unrendered). An allowlist, NOT "whatever shell_stats returns", so a garbage
// slug 404s instead of thin-rendering.
export const SHELLS = ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Sentinel', 'Thief', 'Triage', 'Vandal'];

// Shell name -> URL slug. Shell names are single plain words, so lowercase is
// the whole rule (matches app/shells/[slug] which resolves on name.toLowerCase).
export function shellToSlug(name) { return (name || '').trim().toLowerCase(); }

// URL slug -> canonical shell name, or null. Resolves ONLY against SHELLS, so an
// unknown slug 404s rather than silently rendering an empty page.
export function resolveShellSlug(slug) {
  var want = (slug || '').trim().toLowerCase();
  var match = SHELLS.find(function (s) { return shellToSlug(s) === want; });
  return match || null;
}

// Coerce a matchup column to a clean string array. countered_by/weaknesses are
// text[] and counter_items is jsonb; supabase-js returns all three as JS arrays,
// but null (Sentinel's countered_by was null before the fill) must degrade to []
// so callers never crash on .length / .map.
export function toArr(v) {
  if (Array.isArray(v)) return v.filter(function (x) { return x != null && String(x).trim() !== ''; }).map(function (x) { return String(x).trim(); });
  return [];
}

// The three honest states for a shell's counters. Keyed on the DB, not on a
// guessed default:
//   'has-counters'      -> countered_by is non-empty: render the counter list.
//   'verified-none'     -> countered_by empty AND the matchup marker is present:
//                          this is a game-verified "no hard counter" (Rook).
//                          Render it as CONTENT, not a gap.
//   'pending'           -> countered_by empty AND no marker: genuinely not filled
//                          yet. Render "analysis pending" -- an honest not-yet,
//                          visibly different from the confident Rook copy.
export function counterState(row) {
  if (toArr(row && row.countered_by).length > 0) return 'has-counters';
  return isMatchupVerified(row && row.verified_source) ? 'verified-none' : 'pending';
}

// Shells THIS shell is strong against = every shell whose countered_by array
// contains this shell (the computed inverse of the matrix). Both directions
// trace to the same game-verified data, so this is honest, not invented.
// A shell that counters itself (Recon's mirror) legitimately appears in its own
// inverse -- callers flag it as a mirror match rather than hiding it.
export function strongAgainst(allRows, shellName) {
  return allRows
    .filter(function (r) { return toArr(r.countered_by).indexOf(shellName) !== -1; })
    .map(function (r) { return r.name; });
}

// Human list join: "A", "A or B", "A, B or C" (conj 'or') / "...and..." (conj 'and').
export function proseList(arr, conj) {
  var a = (arr || []).slice();
  if (a.length === 0) return '';
  if (a.length === 1) return a[0];
  if (a.length === 2) return a[0] + ' ' + conj + ' ' + a[1];
  return a.slice(0, -1).join(', ') + ' ' + conj + ' ' + a[a.length - 1];
}

// The FAQ Q&A for a shell, built ONLY from the game-verified matrix (never from
// the counter-article prose, which we proved contains wrong claims). Returns
// { question, answer } for the two rendered states, or null for 'pending' (no
// verified answer exists, so no FAQPage schema is emitted). The SAME object
// drives the visible FAQ block and the JSON-LD, so they cannot drift.
export function matchupFaq(row, allRows) {
  var name = row.name;
  var state = counterState(row);
  var q = 'How do you beat ' + name + ' in Marathon?';

  if (state === 'verified-none') {
    return {
      question: q,
      answer: name + ' has no hard counter. It is a low-stakes solo scavenger that any '
        + 'geared squad already outguns, so there is no specific shell or item you need to '
        + 'bring against it. (Owner-verified in-game, Season 2.)',
    };
  }
  if (state === 'pending') return null;

  var counters = toArr(row.countered_by);
  var items = toArr(row.counter_items);
  // Mirror wording: a shell that counters itself reads oddly as a plain name.
  var counterProse = proseList(counters.map(function (c) {
    return c === name ? c + ' (mirror matchup)' : c;
  }), 'or');

  var ans = 'To beat ' + name + ' in Marathon, play ' + counterProse + '.';
  if (items.length) ans += ' Key counter items and tactics: ' + proseList(items, 'and') + '.';
  ans += ' These counters are owner-verified in-game (Season 2).';
  return { question: q, answer: ans };
}
