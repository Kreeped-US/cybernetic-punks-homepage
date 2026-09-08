// lib/marathon/provenanceBadge.js
// RENDER-LAYER transform ONLY. Turns a stored `verified_source` string into a CLEAN public badge.
// It NEVER mutates the DB and NEVER surfaces the raw internal string, an internal path
// ("docs/HANDOFF.md"), a personal name ("(Justin)"), or a correction-log history. The stored
// strings stay internally rich/honest; the page shows a derived, trust-signalling badge.
//
// Mirrors the shape of components/game/GameArsenal.js `tier()` (a pure, order-sensitive classifier
// over verified_source), but with Marathon's own "Verified" vocabulary instead of the pre-launch
// "Attributed/Reworked" vocabulary. The visual layer reuses GameArsenal's site-wide honesty amber
// (#ffb400) for the lower-confidence "Partially verified" state.
//
// Classification ORDER MATTERS (most-specific first):
//   1. contains "unverified"  -> Partially verified   (amber/dimmer -- some fields not yet checked)
//   2. contains "patch notes"/"patch" -> Verified - Bungie <patch> patch notes
//   3. contains "in-game"/"inspect"/"owner"/"shell screen"/"confirmed in-game" -> Owner-verified in-game (S<n>)
//   4. fallback -> "Verified" (generic, safe -- NEVER leaks the raw string)
// NB: "owner-verified" does NOT contain the substring "unverified", so rule 1 never false-fires on it.
//
// PATCH EXTRACTION: take the FIRST version token in the string (the primary source patch), NOT the
// latest -- this reproduces the operator-confirmed 40-row map, e.g. KKV-9SD ("1.1.5 ... + 1.1.5.2
// hotfix") -> 1.1.5, and Twin Tap HBR ("1.1.5 ...; other fields 1.1.0") -> 1.1.5.
//
// SEASON EXTRACTION: pull "S<n>" where present; default to "S2" when a valid in-game row omits it
// (every current owner/in-game row is S2-era, 2026-07/08 -- e.g. Impact HAR carries a date, not an
// S-token). Revisit the default when S3 data lands.
//
// COVERAGE: all 40 current Marathon rows (32 weapon_stats + 8 shell_stats, all verified=true with a
// real verified_source) are covered by rules 1-3; rule 4 is a defensive catch-all that should not be
// reached by today's data. See provenanceBadge.test.mjs for the full 40-row assertion.

var SEP = '·'; // middot -- the house separator (see WeaponDetailClient hero line)

// tier: 'verified' (full confidence) | 'partial' (some fields unverified). Drives the visual state.
export function provenanceBadge(verified, verifiedSource) {
  if (verified !== true) return null;                 // honest-null: no badge unless the row is verified
  var s = String(verifiedSource || '');
  var lower = s.toLowerCase();
  if (!lower) return null;

  // 1. Mixed/caveated -- at least one field is explicitly unverified. Distinct amber state.
  if (lower.indexOf('unverified') !== -1) {
    return { label: 'Partially verified', tier: 'partial' };
  }

  // 2. Patch-note sourced -- surface the primary (first-mentioned) patch version only.
  if (lower.indexOf('patch notes') !== -1 || lower.indexOf('patch') !== -1) {
    var vm = s.match(/(\d+\.\d+(?:\.\d+)*)/); // first version token = the primary source patch
    var patch = vm ? vm[1] : null;
    return {
      label: patch ? 'Verified ' + SEP + ' Bungie ' + patch + ' patch notes' : 'Verified ' + SEP + ' Bungie patch notes',
      tier: 'verified',
    };
  }

  // 3. In-game / owner / inspect / shell-screen / correction-log -> clean current-state badge.
  //    (For a correction-log string like Rook's, this renders ONLY the current verified state; the
  //     "prior row was wrong" history lives in the stored string and is never shown.)
  if (
    lower.indexOf('in-game') !== -1 ||
    lower.indexOf('inspect') !== -1 ||
    lower.indexOf('owner') !== -1 ||
    lower.indexOf('shell screen') !== -1 ||
    lower.indexOf('confirmed in-game') !== -1
  ) {
    var sm = s.match(/\bS(\d+)\b/); // season token, e.g. "S2"
    var season = sm ? 'S' + sm[1] : 'S2';
    return { label: 'Owner-verified in-game (' + season + ')', tier: 'verified' };
  }

  // 4. Verified but unrecognized source shape -- safe generic, never the raw string.
  return { label: 'Verified', tier: 'verified' };
}
