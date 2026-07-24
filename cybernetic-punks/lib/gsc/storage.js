// lib/gsc/storage.js
// GSC Consumer A -- THE WRITE PATH. Phase (3) of docs/gsc-integration-build-plan-v5.md.
//
// ONE write path, shared by the small trailing-window pull and the one-shot historical
// backfill. They differ only in their date arguments. If a backfill ever appears to need
// DIFFERENT write logic, that is a FINDING to report, not something to route around with
// a second code path -- two storage paths is how the two diverge silently.
//
// Takes the Supabase client as a PARAMETER (same shape as lib/cronRunLog.js) rather than
// constructing one, so this module is callable from a script, a route, or a test without
// caring where credentials come from.

// Batch size for the upsert. 1080 rows (a 7-day window) fits in one call comfortably;
// the backfill is tens of thousands, so batching is built in from the start rather than
// discovered later. Keeps any single request payload well under PostgREST's limits.
const UPSERT_BATCH = 500;

// ── URL -> PATHNAME ──────────────────────────────────────────────────────────
// GSC returns ABSOLUTE urls ("https://cyberneticpunks.com/uniques/misery-disciple").
// The plan states the prefix rule as `url.startsWith('/dmz/')`, which is written for a
// PATH -- applied to the absolute url it would never match and would attribute every DMZ
// page to Marathon. So parse first, then test the pathname.
export function pathnameOf(pageUrl) {
  if (!pageUrl || typeof pageUrl !== 'string') return '';
  try {
    return new URL(pageUrl).pathname || '/';
  } catch (e) {
    // Not absolute -- treat the value as a path already (defensive; GSC always sends
    // absolute urls, but a caller passing a path should not silently misattribute).
    const q = pageUrl.indexOf('?');
    return q === -1 ? pageUrl : pageUrl.slice(0, q);
  }
}

// ── THE PREFIX RULE -- game attribution, COMPUTED AT WRITE TIME (C4) ─────────
// Never derived at read time. Tool and entity pages (/leaderboard, /stats, /uniques,
// /uniques/misery-disciple) never join feed_items, and those are exactly the pages that
// RANK -- so a join-based attribution would drop precisely the wrong rows.
//
// A ROUTE-PREFIX LOOKUP THAT FAILS LOUDLY (docs/gsc-editors-v8-canonical.md C4). The
// rejected shape was `startsWith('/dmz/') ? 'dmz' : 'marathon'`: Marathon as the ELSE
// branch silently attributes a THIRD game's URLs to Marathon -- the exact silent-wrong
// degradation the multi-game audit exists to hunt. So Marathon owns the root namespace
// but its prefixes are ENUMERATED EXPLICITLY, DMZ is namespaced under /dmz, and an
// unknown prefix returns NULL and logs loudly -- the caller drops the row and the pull is
// flagged, never a default game. Same principle as game_slug carrying no column default.
//
// ADDING A GAME: add its namespace prefix(es) below. A new MARATHON route also needs its
// top-level segment added here -- until then its first indexed URL fails LOUDLY (null +
// log) rather than being silently mislabelled. A named gap beats a silent wrong. The
// eventual home is the games registry (per the multi-game audit); a literal map today.
const GAME_ROUTE_PREFIXES = {
  dmz: ['dmz'],
  // Marathon = the root namespace, enumerated from app/ (every top-level route dir
  // except dmz + api). '' is the homepage '/'. Verified against the live GSC URL set:
  // every one of the 3419 stored page_urls resolves through this map (no-op proof).
  marathon: [
    '', 'about', 'admin', 'advisor', 'builds', 'cradle', 'creators', 'editors',
    'factions', 'guides', 'intel', 'join', 'leaderboard', 'maps', 'marathon',
    'matchups', 'me', 'meta', 'modes', 'mods', 'player-count', 'profile-preview',
    'ranked', 'rising', 'shells', 'sitrep', 'stats', 'status', 'u', 'uniques',
    'weapons', 'welcome',
  ],
};

// Reverse index: first path segment -> game. Built once.
const PREFIX_TO_GAME = (function () {
  const m = new Map();
  const games = Object.keys(GAME_ROUTE_PREFIXES);
  for (let i = 0; i < games.length; i++) {
    const prefixes = GAME_ROUTE_PREFIXES[games[i]];
    for (let j = 0; j < prefixes.length; j++) m.set(prefixes[j], games[i]);
  }
  return m;
})();

// Returns the game slug, or NULL (logged loudly) for an unknown prefix. NEVER a default.
export function gameSlugForUrl(pageUrl) {
  const p = pathnameOf(pageUrl);
  const seg = p.split('/')[1] || ''; // '' for the homepage '/'
  const game = PREFIX_TO_GAME.get(seg);
  if (!game) {
    console.error('[gsc] gameSlugForUrl: UNKNOWN route prefix "/' + seg + '" (url ' +
      pageUrl + ') -- NOT attributing to a default game (C4). Add it to ' +
      'GAME_ROUTE_PREFIXES; this row is dropped and the pull should be flagged.');
    return null;
  }
  return game;
}

// ── URL -> CANDIDATE SLUG ────────────────────────────────────────────────────
// The last path segment. Matched against the real feed_items slug set by the caller; a
// non-match means a tool/entity page and stores NULL. Deliberately NOT route-hardcoded
// (no "only /intel/ counts") so a future article namespace joins automatically. The
// random 4-char suffix on real slugs makes an accidental collision negligible.
export function slugCandidate(pageUrl) {
  const p = pathnameOf(pageUrl).replace(/\/+$/, '');
  if (!p || p === '') return null;
  const parts = p.split('/');
  const last = parts[parts.length - 1];
  return last ? decodeURIComponent(last) : null;
}

// Load every known article slug once per run, so the join is an in-memory Set lookup
// rather than 1000+ round trips. Paginated: feed_items is ~1571 rows today and PostgREST
// caps a single select, so this must not quietly stop at the first page.
export async function loadKnownSlugs(supabase) {
  const slugs = new Set();
  const PAGE = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('feed_items')
      .select('slug')
      .range(from, from + PAGE - 1);
    if (error) return { ok: false, error: error.message, slugs };
    const rows = data || [];
    for (let i = 0; i < rows.length; i++) if (rows[i].slug) slugs.add(rows[i].slug);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return { ok: true, slugs };
}

// ── GSC ROW -> DB ROW ────────────────────────────────────────────────────────
// gscRows are { keys: [date, page], clicks, impressions, ctr, position } for the
// date+page dimension pair. fetched_at is set EXPLICITLY: the column default only
// applies on INSERT, so without this a re-fetched row would keep its original
// timestamp and the trailing window would look stale.
// Returns { rows, droppedUnknownGame }. The drop count is the step-3 follow-up: a
// null-game row is DROPPED here (logged loudly by gameSlugForUrl) so one unknown URL
// cannot fail a NOT NULL batch -- but a SILENT drop is the absence-vs-zero problem the
// pull log exists to solve, so the caller persists this count into gsc_pull_log.
export function buildMetricRows(gscRows, knownSlugs, dataState) {
  const out = [];
  let droppedUnknownGame = 0;
  const now = new Date().toISOString();
  for (let i = 0; i < gscRows.length; i++) {
    const r = gscRows[i];
    const keys = r.keys || [];
    const date = keys[0];
    const pageUrl = keys[1];
    if (!date || !pageUrl) continue; // cannot key the row; skip rather than write junk
    // C4: an unknown route prefix returns null (logged loudly by gameSlugForUrl). DROP
    // the row rather than write a null into the NOT NULL game_slug column -- a single
    // unknown URL must not fail the whole batch, and must never be a default game.
    const gameSlug = gameSlugForUrl(pageUrl);
    if (!gameSlug) { droppedUnknownGame += 1; continue; }
    const cand = slugCandidate(pageUrl);
    out.push({
      date,
      page_url: pageUrl,
      game_slug: gameSlug,
      slug: cand && knownSlugs.has(cand) ? cand : null,
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr == null ? null : r.ctr,
      position: r.position == null ? null : r.position,
      data_state: dataState || null,
      fetched_at: now,
    });
  }
  return { rows: out, droppedUnknownGame };
}

// ── QUERY-LEVEL ROW BUILDER (Consumer B, page+query dimension pair) ──────────
// gscRows keys are [date, page, query]. gsc_query_metrics has NO slug/data_state
// column (query rows do not join feed_items). Same C4 null-game drop as the page
// builder. Returns { rows, droppedUnknownGame }.
export function buildQueryMetricRows(gscRows) {
  const out = [];
  let droppedUnknownGame = 0;
  const now = new Date().toISOString();
  for (let i = 0; i < gscRows.length; i++) {
    const r = gscRows[i];
    const keys = r.keys || [];
    const date = keys[0];
    const pageUrl = keys[1];
    const query = keys[2];
    if (!date || !pageUrl || !query) continue; // all three key the row
    const gameSlug = gameSlugForUrl(pageUrl);
    if (!gameSlug) { droppedUnknownGame += 1; continue; }
    out.push({
      date,
      page_url: pageUrl,
      query,
      game_slug: gameSlug,
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr == null ? null : r.ctr,
      position: r.position == null ? null : r.position,
      fetched_at: now,
    });
  }
  return { rows: out, droppedUnknownGame };
}

// ── UPSERT ───────────────────────────────────────────────────────────────────
// onConflict names the COLUMNS of the unique index on (date, page_url). Without that
// constraint the trailing-window re-fetch would INSERT DUPLICATES instead of updating --
// and PostgREST says so loudly ("no unique or exclusion constraint matching the ON
// CONFLICT specification") rather than silently duplicating, which is why the idempotence
// run is the real proof the constraint exists.
//
// FAIL-OPEN: returns { ok, written, error }; never throws into a caller.
export async function upsertPageMetrics(supabase, rows) {
  let written = 0;
  try {
    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      const batch = rows.slice(i, i + UPSERT_BATCH);
      const { error } = await supabase
        .from('gsc_page_metrics')
        .upsert(batch, { onConflict: 'date,page_url' });
      if (error) {
        return { ok: false, written, error: error.message, failedAtBatch: i / UPSERT_BATCH };
      }
      written += batch.length;
    }
    return { ok: true, written };
  } catch (err) {
    return { ok: false, written, error: (err && err.message) || String(err) };
  }
}

// Query-level upsert, arbitered on the (date, page_url, query) unique constraint (C2).
export async function upsertQueryMetrics(supabase, rows) {
  let written = 0;
  try {
    for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
      const batch = rows.slice(i, i + UPSERT_BATCH);
      const { error } = await supabase
        .from('gsc_query_metrics')
        .upsert(batch, { onConflict: 'date,page_url,query' });
      if (error) {
        return { ok: false, written, error: error.message, failedAtBatch: i / UPSERT_BATCH };
      }
      written += batch.length;
    }
    return { ok: true, written };
  } catch (err) {
    return { ok: false, written, error: (err && err.message) || String(err) };
  }
}

// ── PULL LOG ─────────────────────────────────────────────────────────────────
// ONE row per run, on EVERY path including failure. This is what keeps ABSENCE
// distinguishable from ZERO: gsc_page_metrics is naturally sparse, so a page missing on a
// date means "zero impressions" ONLY IF THE PULL RAN. Without this row, a skipped pull and
// a genuinely quiet day are the same shape -- the same ambiguity `store=UNREACHABLE` vs
// `no_match` exists to resolve. Every consumer MUST read this alongside the metrics.
// consumer ('page' | 'query') distinguishes the two pulls that share this log -- both
// write identical trailing-window shapes, so the column is the only reliable
// discriminator. dropped_unknown_game persists the C4 drop count (step-3 follow-up).
// Both are added to the payload ONLY when provided, so a caller that omits them still
// writes cleanly; the two columns are an operator ALTER (recorded in HANDOFF, rule 2).
export async function writePullLog(supabase, entry) {
  try {
    const payload = {
      window_start: entry.windowStart || null,
      window_end: entry.windowEnd || null,
      rows_fetched: typeof entry.rowsFetched === 'number' ? entry.rowsFetched : null,
      newest_date_returned: entry.newestDateReturned || null,
      data_state: entry.dataState || null,
      status: entry.status || 'ok',
      error: entry.error ? String(entry.error).slice(0, 500) : null,
      started_at: entry.startedAt || new Date().toISOString(),
    };
    if (entry.consumer !== undefined) payload.consumer = entry.consumer;
    if (typeof entry.droppedUnknownGame === 'number') payload.dropped_unknown_game = entry.droppedUnknownGame;
    const { error } = await supabase.from('gsc_pull_log').insert(payload);
    if (error) {
      console.log('[gsc_pull_log] insert failed (non-fatal): ' + error.message);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.log('[gsc_pull_log] write error (non-fatal): ' + (err && err.message));
    return { ok: false, error: (err && err.message) || String(err) };
  }
}
