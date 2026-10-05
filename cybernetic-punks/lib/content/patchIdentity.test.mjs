// lib/content/patchIdentity.test.mjs
// Stable patch identity + "pending drafts count as covered" (2026-10-05, fix/patch-identity).
// Replays the Wardogs IR Goggles incident (2026-10-02/03): run 1 makes a HELD draft; 24h later the Steam
// post has been RETITLED ("CWIS" -> "CIWS") but is the same post -> run 2 must SKIP as covered, quietly.
// Uses an in-memory site_events + feed_items store that APPLIES the filters (incl. event_data->>patch_key)
// and the real game configs. No DB, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  patchKeysFor, stablePatchKey, legacyPatchKey, normalizePatchTitle,
  isPatchCovered, siteEventMarkerExists, markPatchCovered, patchGatedRunDecision, patchOverrideActive,
  PATCH_COVERED_EVENT,
} from './patchCoverage.js';
import { classifyCronOutcome } from '../cronOutcomeDecision.mjs';
import { wardogs } from '../games/wardogs.js';
import { bodycam } from '../games/bodycam.js';
import { marathon } from '../games/marathon.js';

// ── in-memory store ──────────────────────────────────────────────────────────────────────────────
function makeDb(seed) {
  const tables = { site_events: [], feed_items: [], ...(seed || {}) };
  const get = (row, col) => {
    const m = col.match(/^(\w+)->>(\w+)$/);
    return m ? (row[m[1]] || {})[m[2]] : row[col];
  };
  const db = {
    tables, reads: 0,
    from(t) {
      const filters = []; let lim = Infinity;
      const q = {
        select() { return q; },
        eq(col, v) { filters.push((r) => get(r, col) === v); return q; },
        limit(n) { lim = n; db.reads++; return Promise.resolve({ data: tables[t].filter((r) => filters.every((f) => f(r))).slice(0, lim), error: null }); },
        insert(row) { tables[t].push(row); return Promise.resolve({ data: null, error: null }); },
      };
      return q;
    },
  };
  return db;
}

// One Steam post, as BOTH halves of the steam-news adapter deliver it (different id spaces!).
const WD_APP = wardogs.sources.patchNotes.appId; // '1867240'
const PUBLISHED = '2026-10-02T15:39:32.000Z';
const jsonItem = (title) => ({ title, url: 'https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1845383656386801', gid: '1845383656386801', publishedAt: PUBLISHED, date: PUBLISHED, source: 'steam-news', is_patch_note: true });
const rssItem = (title) => ({ title, url: 'https://store.steampowered.com/news/app/1867240/view/670629928317748295', guid: 'https://store.steampowered.com/news/app/1867240/view/670629928317748295', publishedAt: PUBLISHED, date: PUBLISHED, source: 'steam-rss', is_patch_note: true });
const OLD_TITLE = 'IR Goggles & CWIS Balance Hotfix';
const NEW_TITLE = 'IR Goggles & CIWS Balance Hotfix';

// The cron's per-run decision for a patch-gated NEXUS, built from the SAME library calls route.js makes.
async function runCron(db, game, patchItems, gameSlug) {
  const keys = patchKeysFor(patchItems, { appId: game.sources.patchNotes.appId });
  const cov = await isPatchCovered(db, gameSlug, keys.keys, { patchKeyColumn: true });
  const active = patchOverrideActive(true, cov.covered);
  const d = patchGatedRunDecision({ editorName: 'NEXUS', editorsRequiringPatch: game.editorial.editorsRequiringPatch, hasPatch: true, patchAlreadyCovered: cov.covered, hasHumanDirective: false });
  return { keys, cov, active, run: d.run, skipReason: d.skipReason };
}

// ── identity ─────────────────────────────────────────────────────────────────────────────────────
test('stable key: the JSON and RSS copies of one post get the SAME key (different post-id spaces)', () => {
  assert.equal(stablePatchKey(jsonItem(OLD_TITLE), WD_APP), 'steam:1867240:1790955572');
  assert.equal(stablePatchKey(rssItem(OLD_TITLE), WD_APP), 'steam:1867240:1790955572');
});

test('stable key: a RETITLE (CWIS -> CIWS) keeps the key; the legacy key splits (the incident)', () => {
  const a = patchKeysFor([jsonItem(OLD_TITLE)], { appId: WD_APP });
  const b = patchKeysFor([rssItem(NEW_TITLE)], { appId: WD_APP });
  assert.equal(a.key, b.key, 'same post -> same key across a retitle and across halves');
  assert.equal(a.legacyKey, 'ir goggles & cwis balance hotfix');
  assert.equal(b.legacyKey, 'ir goggles & ciws balance hotfix');
  assert.deepEqual(a.keys, [a.key, a.legacyKey], 'reads match new + legacy');
});

test('legacy key = the EXACT old formula (first 60 chars of the title, lowercased)', () => {
  const t = 'WARDOGS | Update 0.1.2 (Minor Patch) ';
  assert.equal(legacyPatchKey([{ title: t }]), t.toLowerCase().slice(0, 60));
  assert.equal(legacyPatchKey([]), null);
});

test('fallbacks: no publish time -> url; no url either -> normalized title (never the raw prefix)', () => {
  assert.equal(stablePatchKey({ title: 'X', url: 'https://a/b' }, WD_APP), 'url:https://a/b');
  assert.equal(stablePatchKey({ title: 'IR Goggles &amp; CWIS -- Balance  Hotfix!' }, WD_APP), 'title:ir goggles cwis balance hotfix');
  assert.equal(stablePatchKey({ title: 'X', publishedAt: PUBLISHED, url: 'https://a/b' }, null), 'url:https://a/b', 'no appId -> url');
  assert.equal(normalizePatchTitle('  V0.8   #6 -- Patch!  '), 'v0 8 6 patch');
  assert.deepEqual(patchKeysFor([], { appId: WD_APP }), { key: null, legacyKey: null, keys: [] });
});

// ── the incident replay ──────────────────────────────────────────────────────────────────────────
test('REPLAY: run 1 makes a HELD draft; run 2 (24h later, retitled, same post) is SKIPPED as covered', async () => {
  const db = makeDb();
  const r1 = await runCron(db, wardogs, [jsonItem(OLD_TITLE)], 'wardogs');
  assert.equal(r1.run, true, 'run 1: patch uncovered -> NEXUS runs');
  // run 1 inserts the draft HELD-for-review, stamped with the (new) patch key -- as route.js does
  db.tables.feed_items.push({ game_slug: 'wardogs', patch_key: r1.keys.key, is_published: false, gate_status: 'clear', rejected: null });
  const r2 = await runCron(db, wardogs, [rssItem(NEW_TITLE)], 'wardogs'); // retitled, and RSS won the merge this time
  assert.equal(r2.cov.covered, true);
  assert.equal(r2.cov.by, 'draft', 'covered by the pending draft (no marker exists yet)');
  assert.equal(r2.run, false);
  assert.equal(r2.skipReason, 'patch_already_covered');
  assert.equal(r2.active, false, 'no priority override injected');
  // quiet skip: the cron outcome is NOT an outage/alert
  const outcome = classifyCronOutcome([], { configuredRoster: ['NEXUS', 'MIRANDA'], patchGated: ['NEXUS'], hasPatch: true, activeRoster: [], skipReasons: { NEXUS: r2.skipReason, MIRANDA: 'self_select_no_directive' } });
  assert.equal(outcome.alert, false, 'patch_already_covered is a legit skip -- no outage email');
});

test('REPLAY: an operator-REJECTED draft also counts as covered (the patch is decided)', async () => {
  const db = makeDb();
  const k = patchKeysFor([jsonItem(OLD_TITLE)], { appId: WD_APP }).key;
  db.tables.feed_items.push({ game_slug: 'wardogs', patch_key: k, is_published: false, gate_status: 'clear', rejected: true });
  const r = await runCron(db, wardogs, [jsonItem(NEW_TITLE)], 'wardogs');
  assert.equal(r.run, false); assert.equal(r.cov.by, 'draft');
});

test('gate-held and published drafts count too (any state)', async () => {
  for (const state of [{ is_published: false, gate_status: 'held' }, { is_published: true, gate_status: 'clear' }]) {
    const db = makeDb();
    const k = patchKeysFor([jsonItem(OLD_TITLE)], { appId: WD_APP }).key;
    db.tables.feed_items.push({ game_slug: 'wardogs', patch_key: k, ...state });
    assert.equal((await runCron(db, wardogs, [jsonItem(OLD_TITLE)], 'wardogs')).run, false, JSON.stringify(state));
  }
});

test('a DIFFERENT patch from the same game is NOT skipped', async () => {
  const db = makeDb();
  db.tables.feed_items.push({ game_slug: 'wardogs', patch_key: patchKeysFor([jsonItem(OLD_TITLE)], { appId: WD_APP }).key, is_published: false, gate_status: 'clear' });
  const other = { title: 'WARDOGS | Security & Stability Hotfix', publishedAt: '2026-10-02T00:13:55.000Z', url: 'u2', is_patch_note: true };
  const r = await runCron(db, wardogs, [other], 'wardogs');
  assert.equal(r.cov.covered, false); assert.equal(r.run, true);
});

test('the SAME patch id in ANOTHER game is NOT skipped (strict game_slug scope)', async () => {
  const db = makeDb();
  const k = patchKeysFor([jsonItem(OLD_TITLE)], { appId: WD_APP });
  db.tables.feed_items.push({ game_slug: 'bodycam', patch_key: k.key, is_published: false, gate_status: 'clear' });
  db.tables.site_events.push({ game_slug: 'bodycam', event_name: PATCH_COVERED_EVENT, event_data: { patch_key: k.key } });
  const r = await runCron(db, wardogs, [jsonItem(OLD_TITLE)], 'wardogs');
  assert.equal(r.cov.covered, false); assert.equal(r.run, true);
});

test('a LEGACY-key marker is still honored (nothing already covered is re-covered on deploy)', async () => {
  const db = makeDb();
  db.tables.site_events.push({ game_slug: 'wardogs', event_name: PATCH_COVERED_EVENT, event_data: { patch_key: 'ir goggles & cwis balance hotfix', via: 'approve' } });
  const r = await runCron(db, wardogs, [jsonItem(OLD_TITLE)], 'wardogs');
  assert.equal(r.cov.covered, true); assert.equal(r.cov.by, 'marker'); assert.equal(r.run, false);
  // and a legacy-key DRAFT too
  const db2 = makeDb();
  db2.tables.feed_items.push({ game_slug: 'wardogs', patch_key: 'ir goggles & cwis balance hotfix', is_published: false, gate_status: 'clear' });
  assert.equal((await runCron(db2, wardogs, [jsonItem(OLD_TITLE)], 'wardogs')).cov.by, 'draft');
});

test('Marathon patch flow unchanged: uncovered -> runs; published-and-marked -> skips next cycle', async () => {
  const db = makeDb();
  const mItem = { title: 'Marathon Update 1.2.0 Patch Notes', publishedAt: '2026-10-04T17:00:00.000Z', url: 'm1', is_patch_note: true };
  const r1 = await runCron(db, marathon, [mItem], 'marathon');
  assert.equal(r1.keys.key, 'steam:' + marathon.sources.patchNotes.appId + ':' + (Date.parse(mItem.publishedAt) / 1000));
  assert.equal(r1.cov.covered, false);
  // auto-published path: the cron marks covered after a published patch-covering article (route.js)
  await markPatchCovered(db, 'marathon', r1.keys.key, { via: 'cron' }, r1.keys.keys);
  const r2 = await runCron(db, marathon, [mItem], 'marathon');
  assert.equal(r2.cov.covered, true); assert.equal(r2.cov.by, 'marker');
  // markPatchCovered does not pile up duplicates (check-then-insert over new + legacy keys)
  await markPatchCovered(db, 'marathon', r1.keys.key, { via: 'cron' }, r1.keys.keys);
  assert.equal(db.tables.site_events.filter((e) => e.event_name === PATCH_COVERED_EVENT).length, 1);
});

test('discord marker is NOT duplicated on a retitle (same post -> same key)', async () => {
  const db = makeDb();
  const k1 = patchKeysFor([jsonItem(OLD_TITLE)], { appId: WD_APP });
  // run 1 claims the Discord notify under the new key (route.js inserts currentPatchKey)
  assert.equal(await siteEventMarkerExists(db, 'wardogs', 'patch_discord', k1.keys), false);
  db.tables.site_events.push({ game_slug: 'wardogs', event_name: 'patch_discord', event_data: { patch_key: k1.key } });
  // run 2: retitled -> still already notified
  const k2 = patchKeysFor([rssItem(NEW_TITLE)], { appId: WD_APP });
  assert.equal(await siteEventMarkerExists(db, 'wardogs', 'patch_discord', k2.keys), true);
  // a pre-deploy LEGACY discord marker is honored while the title is unchanged
  const db2 = makeDb({ site_events: [{ game_slug: 'wardogs', event_name: 'patch_discord', event_data: { patch_key: 'ir goggles & ciws balance hotfix' } }] });
  assert.equal(await siteEventMarkerExists(db2, 'wardogs', 'patch_discord', k2.keys), true);
});

test('fail-closed: a read error reads as covered (never re-covers on a DB blip)', async () => {
  const bad = { from() { return { select() { return this; }, eq() { return this; }, limit() { return Promise.resolve({ data: null, error: { message: 'boom' } }); } }; } };
  assert.deepEqual(await isPatchCovered(bad, 'wardogs', ['k']), { covered: true, by: 'read-error' });
  assert.deepEqual(await isPatchCovered(makeDb(), 'wardogs', []), { covered: false, by: null });
});

test('pre-migration safety: patchKeyColumn:false skips the feed_items read', async () => {
  const db = makeDb({ feed_items: [{ game_slug: 'wardogs', patch_key: 'k' }] });
  assert.equal((await isPatchCovered(db, 'wardogs', ['k'], { patchKeyColumn: false })).covered, false);
});

test('bodycam (holdForReview) is protected the same way', async () => {
  const db = makeDb();
  const item = { title: 'Bodycam PATCH NOTES · V0.8 #7', publishedAt: '2026-10-06T14:00:00.000Z', url: 'b7', is_patch_note: true };
  const r1 = await runCron(db, bodycam, [item], 'bodycam');
  assert.equal(r1.run, true);
  db.tables.feed_items.push({ game_slug: 'bodycam', patch_key: r1.keys.key, is_published: false, gate_status: 'clear' });
  const r2 = await runCron(db, bodycam, [{ ...item, title: 'Bodycam PATCH NOTES · V0.8 #7 (edited)' }], 'bodycam');
  assert.equal(r2.run, false); assert.equal(r2.skipReason, 'patch_already_covered');
});
