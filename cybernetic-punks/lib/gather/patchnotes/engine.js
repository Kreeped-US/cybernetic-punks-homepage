// lib/gather/patchnotes/engine.js
// SHARED, game-agnostic patch-notes engine (Gap 2 Phase B). A FAITHFUL
// extraction of the merge + detect + format logic currently inline in
// bungie.js -- same prefer-fuller merge, same detection, same formatting --
// so B2 can repoint Marathon through it and prove byte-identical output.
// See docs/network/PATCHNOTES_PHASEB_SCOPING.md.
//
// UNWIRED in B1 (nothing imports this yet). Cleaning is NOT here -- it is
// per-source and lives in the adapters (Steam JSON = BBCode, RSS = HTML).

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

  // Detection: version pattern OR a patch keyword, AND fresh. Rules are
  // per-game config (rules.versionRe, rules.keywords, rules.freshnessMs).
  const tagged = all.map((a) => {
    var title = a.title || '';
    var hay = (title + ' ' + (a.contents || '')).toLowerCase();
    var matchesVersion = rules.versionRe.test(title);
    var matchesKeyword = rules.keywords.some((k) => hay.includes(k));
    var articleAgeMs = now - new Date(a.date).getTime();
    var isFresh = !isNaN(articleAgeMs) && articleAgeMs >= 0 && articleAgeMs <= rules.freshnessMs;
    return Object.assign({}, a, { is_patch_note: (matchesVersion || matchesKeyword) && isFresh });
  });

  return tagged;
}

// Editor prompt block. `label` is the per-game news-section name (Marathon =
// "BUNGIE NEWS"); the OFFICIAL.../END... decoration is added here, reproducing
// the original header "OFFICIAL BUNGIE NEWS" + footer "END BUNGIE NEWS".
export function formatForEditor(articles, label) {
  if (!articles || articles.length === 0) return '';
  const recent = articles.slice(0, 6);
  const lines = recent.map((a) => {
    const lab = a.is_patch_note ? 'PATCH NOTE' : 'DEV NEWS';
    // Completeness signal (Gap 1): tell the editor whether it has the full
    // official notes or only a blurb, so a partial ingest produces an honest
    // hedge instead of confident-wrong.
    const completeness = a.notes_complete === true
      ? 'COMPLETENESS: FULL official notes ingested below.'
      : 'COMPLETENESS: PARTIAL -- only a short blurb was ingested this cycle, NOT the full notes. Do NOT state specific values, numbers, or change lists as confirmed; report only what this blurb explicitly says and note that the full notes were not available.';
    return `[${lab}] ${a.title}\n  Date: ${new Date(a.date).toLocaleDateString()}\n  ${completeness}\n  ${a.contents || '(No preview available)'}\n  URL: ${a.url}`;
  }).join('\n\n');
  return `\n\n--- OFFICIAL ${label} (most recent first) ---\n${lines}\n--- END ${label} ---`;
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
