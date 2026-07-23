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

// ── THE PREFIX RULE -- game attribution, COMPUTED AT WRITE TIME ──────────────
// Never derived at read time. Tool and entity pages (/leaderboard, /stats, /uniques,
// /uniques/misery-disciple) never join feed_items, and those are exactly the pages that
// RANK -- so a join-based attribution would drop precisely the wrong rows.
//
// DEVIATION FROM THE PLAN'S LITERAL TEXT, deliberate: the plan says `startsWith('/dmz/')`,
// which classifies the DMZ HUB ITSELF ('/dmz', no trailing slash) as marathon. Both '/dmz'
// and '/dmz/*' are treated as dmz here. The `else -> marathon` fallback is a
// silent-misattribution shape, so its edges are worth getting right rather than inheriting.
export function gameSlugForUrl(pageUrl) {
  const p = pathnameOf(pageUrl);
  if (p === '/dmz' || p === '/dmz/' || p.indexOf('/dmz/') === 0) return 'dmz';
  return 'marathon';
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
export function buildMetricRows(gscRows, knownSlugs, dataState) {
  const out = [];
  const now = new Date().toISOString();
  for (let i = 0; i < gscRows.length; i++) {
    const r = gscRows[i];
    const keys = r.keys || [];
    const date = keys[0];
    const pageUrl = keys[1];
    if (!date || !pageUrl) continue; // cannot key the row; skip rather than write junk
    const cand = slugCandidate(pageUrl);
    out.push({
      date,
      page_url: pageUrl,
      game_slug: gameSlugForUrl(pageUrl),
      slug: cand && knownSlugs.has(cand) ? cand : null,
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: r.ctr == null ? null : r.ctr,
      position: r.position == null ? null : r.position,
      data_state: dataState || null,
      fetched_at: now,
    });
  }
  return out;
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

// ── PULL LOG ─────────────────────────────────────────────────────────────────
// ONE row per run, on EVERY path including failure. This is what keeps ABSENCE
// distinguishable from ZERO: gsc_page_metrics is naturally sparse, so a page missing on a
// date means "zero impressions" ONLY IF THE PULL RAN. Without this row, a skipped pull and
// a genuinely quiet day are the same shape -- the same ambiguity `store=UNREACHABLE` vs
// `no_match` exists to resolve. Every consumer MUST read this alongside the metrics.
export async function writePullLog(supabase, entry) {
  try {
    const { error } = await supabase.from('gsc_pull_log').insert({
      window_start: entry.windowStart || null,
      window_end: entry.windowEnd || null,
      rows_fetched: typeof entry.rowsFetched === 'number' ? entry.rowsFetched : null,
      newest_date_returned: entry.newestDateReturned || null,
      data_state: entry.dataState || null,
      status: entry.status || 'ok',
      error: entry.error ? String(entry.error).slice(0, 500) : null,
      started_at: entry.startedAt || new Date().toISOString(),
    });
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
