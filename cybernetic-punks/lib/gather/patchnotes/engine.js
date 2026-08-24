// lib/gather/patchnotes/engine.js
// SHARED, game-agnostic patch-notes engine (Gap 2 Phase B). A FAITHFUL
// extraction of the merge + detect + format logic currently inline in
// bungie.js -- same prefer-fuller merge, same detection, same formatting --
// so B2 can repoint Marathon through it and prove byte-identical output.
// See docs/network/PATCHNOTES_PHASEB_SCOPING.md.
//
// UNWIRED in B1 (nothing imports this yet). Cleaning is NOT here -- it is
// per-source and lives in the adapters (Steam JSON = BBCode, RSS = HTML).

import { blockId, BLOCK_CAP } from '../blockId.js';

// Merge per-source articles (prefer the fuller version on title collision),
// sort newest-first, then tag is_patch_note from per-game detection rules.
// `now` is injectable (default Date.now()) so the freshness gate is
// deterministic in the byte-identical fixture test.
export function mergeAndDetect(articles, rules, now = Date.now()) {
  // Prefer-fuller dedup by title (Gap 1): notes_complete wins; tie-break on
  // longer contents. Input order is preserved as the first-seen tie-break for
  // equal entries (adapters pass JSON before RSS, matching the old behavior).
  const byKey = new Map();
  const isFuller = (cand, cur) => {
    if (!!cand.notes_complete !== !!cur.notes_complete) return !!cand.notes_complete;
    return (cand.contents || '').length > (cur.contents || '').length;
  };
  for (const article of articles) {
    const key = (article.title || '').toLowerCase().slice(0, 60);
    const existing = byKey.get(key);
    if (!existing || isFuller(article, existing)) {
      byKey.set(key, article);
    }
  }
  const all = [...byKey.values()];

  // Sort by date descending.
  all.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Detection: OFFICIAL SOURCE, AND (version pattern OR a patch keyword) in the
  // TITLE, AND fresh. Rules are per-game config (rules.officialFeedName,
  // rules.versionRe, rules.keywords, rules.freshnessMs).
  //
  // TWO PRECISION FIXES (2026-07-20) -- both were leaking badly on Marathon,
  // where the old rules fired on 25 of 60 days to cover 7 real patches:
  //
  // 1. SOURCE RESTRICTION. Steam's news feed for an appid mixes official
  //    announcements with third-party PRESS (51 of 100 Marathon items were
  //    Gamemag.ru / PCGamesN / Rock Paper Shotgun). Press coverage of a game is
  //    not a patch. `rules.officialFeedName` is CONFIG-DRIVEN, never hardcoded --
  //    this engine is shared and DMZ's source will use a different id.
  //      ABSENT  -> no restriction, preserving prior behaviour for any game that
  //                 has not set one.
  //      MISSING feedname on the item -> treated as OFFICIAL. The RSS half of the
  //                 steam-news adapter carries no feedname, and that feed is the
  //                 official community-announcements endpoint (verified: 10/10
  //                 items were Bungie posts, zero press). Dropping it would lose
  //                 official announcements that RSS has and the count=8 JSON
  //                 window does not.
  //
  // 2. TITLE-ONLY KEYWORDS. Keywords previously matched title + FULL BODY, so a
  //    single occurrence of 'patch' anywhere in any article's text opened the
  //    gate -- which is exactly how a staff-departure story qualified. versionRe
  //    already tested the title only; keywords now match it too.
  const tagged = all.map((a) => {
    var title = a.title || '';
    var titleLower = title.toLowerCase();
    // POSITIVE official-provenance signal (G1, Option A -- conservative fail-safe).
    // An item is OFFICIAL only when affirmatively marked so:
    //   - source === 'steam-rss'  : the Steam community-announcements RSS feed. It
    //       carries no feedname but IS the official endpoint (verified official-only),
    //       so we credit it by its ORIGIN, not by an absent field.
    //   - feedname === officialFeedName : a JSON item on the configured official feed.
    // Everything else is NOT official: third-party press (a real outlet feedname, e.g.
    // "Rock, Paper, Shotgun" / "Gamemag.ru") AND any ambiguous JSON item with an EMPTY
    // feedname. We UNDER-claim the ambiguous empty-feedname case rather than over-claim
    // it (the prior `!a.feedname` rule over-claimed). With no officialFeedName configured
    // the restriction is off and all items are official (prior behaviour, unchanged).
    // For the real Steam feed this is 1:1 with the old rule on official items -- RSS
    // items are exactly the no-feedname ones -- so detection is unchanged in practice;
    // it only stops STAMPING press as official and tightens a non-occurring edge.
    var isOfficial = !rules.officialFeedName
      || a.source === 'steam-rss'
      || a.feedname === rules.officialFeedName;
    var matchesVersion = rules.versionRe.test(title);
    var matchesKeyword = rules.keywords.some((k) => titleLower.includes(k));
    var articleAgeMs = now - new Date(a.date).getTime();
    var isFresh = !isNaN(articleAgeMs) && articleAgeMs >= 0 && articleAgeMs <= rules.freshnessMs;
    return Object.assign({}, a, {
      is_official: isOfficial,
      is_patch_note: isOfficial && (matchesVersion || matchesKeyword) && isFresh,
    });
  });

  return tagged;
}

// Editor prompt block. `label` is the per-game news-section name (Marathon =
// "BUNGIE NEWS"); the OFFICIAL.../END... decoration is added here, reproducing
// the original header "OFFICIAL BUNGIE NEWS" + footer "END BUNGIE NEWS".
export function formatForEditor(articles, label) {
  if (!articles || articles.length === 0) return '';
  const recent = articles.slice(0, BLOCK_CAP.bungie);
  // PROVENANCE-HONEST LABELLING (G1 fix). Only items with a POSITIVE official signal
  // (a.is_official, set by mergeAndDetect) are presented under the OFFICIAL header;
  // third-party press / ambiguous items go in a clearly-labelled non-official block.
  // NOTHING is dropped -- every item still reaches the editor as a topic signal; only
  // the provenance CLAIM is corrected. The blockId index is the item's position in
  // `recent` (NOT a per-block counter), so the [BN{n}] ids still line up 1:1 with
  // rawData.bungieNews for the verified_source capture resolver (see blockId.js).
  const renderItem = (a, idx) => {
    const bid = blockId('bungie', idx + 1);
    const lab = a.is_patch_note ? 'PATCH NOTE' : (a.is_official ? 'DEV NEWS' : 'PRESS');
    // Completeness signal (Gap 1): tell the editor whether it has the full
    // official notes or only a blurb, so a partial ingest produces an honest
    // hedge instead of confident-wrong.
    const completeness = a.notes_complete === true
      ? 'COMPLETENESS: FULL official notes ingested below.'
      : 'COMPLETENESS: PARTIAL -- only a short blurb was ingested this cycle, NOT the full notes. Do NOT state specific values, numbers, or change lists as confirmed; report only what this blurb explicitly says and note that the full notes were not available.';
    return `[${bid}] [${lab}] ${a.title}\n  Date: ${new Date(a.date).toLocaleDateString()}\n  ${completeness}\n  ${a.contents || '(No preview available)'}\n  URL: ${a.url}`;
  };
  const officialLines = recent.map((a, i) => (a.is_official ? renderItem(a, i) : null)).filter(Boolean).join('\n\n');
  const pressLines = recent.map((a, i) => (a.is_official ? null : renderItem(a, i))).filter(Boolean).join('\n\n');
  var out = '';
  if (officialLines) {
    out += `\n\n--- OFFICIAL ${label} (most recent first) ---\n${officialLines}\n--- END OFFICIAL ${label} ---`;
  }
  if (pressLines) {
    out += `\n\n--- THIRD-PARTY PRESS / COMMUNITY COVERAGE (NOT official ${label}; secondary reporting -- use only as a topic signal, cite only what the outlet itself states, and never restate it as official) ---\n${pressLines}\n--- END THIRD-PARTY PRESS / COMMUNITY COVERAGE ---`;
  }
  return out;
}

// Ticker lines. The current ticker format carries no per-game label (just the
// PATCH/DEV prefix + uppercased title); `label` is accepted for API symmetry
// with formatForEditor and reserved for future use.
export function formatForTicker(articles, label) {
  if (!articles || articles.length === 0) return null;
  return articles.slice(0, 10).map((a) => {
    const prefix = a.is_patch_note ? '🔧 PATCH: ' : '📡 DEV: ';
    return prefix + a.title.toUpperCase();
  });
}
