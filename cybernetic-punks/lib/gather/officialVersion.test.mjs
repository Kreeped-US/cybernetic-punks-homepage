// lib/gather/officialVersion.test.mjs
// The hub's "Current version" fact: newest OFFICIAL Steam post whose title matches the config versionRe.
// Hidden (null) on ANY failure; 1h memo; game-agnostic (driven by config.sources.patchNotes).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fetchOfficialVersion, pickOfficialVersion, VERSION_TTL_MS, VERSION_TIMEOUT_MS, _resetOfficialVersionCache } from './officialVersion.js';
import { buildHubFacts } from '../games/hubModel.js';
import { bodycam } from '../games/bodycam.js';

const det = bodycam.sources.patchNotes.detection;
const unix = (iso) => Date.parse(iso) / 1000;
const ITEMS = [
  { title: 'Steam Global Top Sellers for week of 8 Sep', url: 'https://steamdb.example/x', date: unix('2026-09-26T00:00:00Z'), feedname: 'SteamDB' },
  { title: 'Bodycam PATCH NOTES · V0.8 #6', url: 'https://store.steampowered.com/news/app/2406770/view/6', date: unix('2026-09-25T00:00:00Z'), feedname: 'steam_community_announcements' },
  { title: 'Bodycam PATCH NOTES · V0.8 #5', url: 'https://store.steampowered.com/news/app/2406770/view/5', date: unix('2026-09-18T00:00:00Z'), feedname: 'steam_community_announcements' },
  { title: 'Bodycam Locked And Loaded New Soundtrack', url: 'https://store.steampowered.com/news/s', date: unix('2026-09-27T00:00:00Z'), feedname: 'steam_community_announcements' },
];
const okFetch = (items, counter) => async () => { if (counter) counter.n++; return { ok: true, json: async () => ({ appnews: { newsitems: items } }) }; };

beforeEach(() => _resetOfficialVersionCache());

test('pick: newest OFFICIAL post whose title matches versionRe (skips non-official + unversioned)', () => {
  assert.deepEqual(pickOfficialVersion(ITEMS, det), {
    version: 'v0.8', title: 'Bodycam PATCH NOTES · V0.8 #6',
    url: 'https://store.steampowered.com/news/app/2406770/view/6', date: '2026-09-25T00:00:00.000Z',
  });
  assert.equal(pickOfficialVersion([ITEMS[0], ITEMS[3]], det), null, 'no versioned official post -> null');
  assert.equal(pickOfficialVersion(null, det), null);
});

test('fetch FAILURE -> null (fact hidden): throw, non-ok, malformed JSON', async () => {
  assert.equal(await fetchOfficialVersion(bodycam, { fetchImpl: async () => { throw new Error('ECONNRESET'); } }), null);
  assert.equal(await fetchOfficialVersion(bodycam, { fetchImpl: async () => ({ ok: false, status: 503 }) }), null);
  assert.equal(await fetchOfficialVersion(bodycam, { fetchImpl: async () => ({ ok: true, json: async () => ({ nope: 1 }) }) }), null);
});

test('success -> the version; cached for 1h, refetched after; failures are not cached', async () => {
  const c = { n: 0 };
  const t0 = 1_000_000;
  assert.equal((await fetchOfficialVersion(bodycam, { fetchImpl: okFetch(ITEMS, c), now: t0 })).version, 'v0.8');
  await fetchOfficialVersion(bodycam, { fetchImpl: okFetch(ITEMS, c), now: t0 + VERSION_TTL_MS - 1 });
  assert.equal(c.n, 1, 'served from the 1h memo');
  await fetchOfficialVersion(bodycam, { fetchImpl: okFetch(ITEMS, c), now: t0 + VERSION_TTL_MS + 1 });
  assert.equal(c.n, 2, 'refetched after the TTL');
  _resetOfficialVersionCache();
  await fetchOfficialVersion(bodycam, { fetchImpl: async () => { c.n++; throw new Error('x'); }, now: t0 });
  await fetchOfficialVersion(bodycam, { fetchImpl: async () => { c.n++; throw new Error('x'); }, now: t0 + 1 });
  assert.equal(c.n, 4, 'a failure is retried on the next request');
});

test('TIMEOUT -> null -> the version fact is hidden (hard cap; default 3s)', async () => {
  assert.equal(VERSION_TIMEOUT_MS, 3000, 'production cap is 3s');
  // (a) a fetch that honors the abort signal
  let sawSignal = null;
  const honoring = (url, init) => new Promise((resolve, reject) => {
    sawSignal = init && init.signal;
    init.signal.addEventListener('abort', () => reject(init.signal.reason));
  });
  const t0 = Date.now();
  assert.equal(await fetchOfficialVersion(bodycam, { fetchImpl: honoring, timeoutMs: 40 }), null);
  assert.ok(sawSignal && sawSignal.aborted, 'the request was aborted via AbortController');
  // (b) a fetch that IGNORES the signal and never settles -- still capped
  assert.equal(await fetchOfficialVersion(bodycam, { fetchImpl: () => new Promise(() => {}), timeoutMs: 40 }), null);
  // (c) headers arrive, but the body stalls -- still capped
  const stalledBody = async () => ({ ok: true, json: () => new Promise(() => {}) });
  assert.equal(await fetchOfficialVersion(bodycam, { fetchImpl: stalledBody, timeoutMs: 40 }), null);
  assert.ok(Date.now() - t0 < 1500, 'all three returned promptly after their 40ms caps');
  // the hub then omits the fact
  const labels = buildHubFacts(bodycam, { reportCount: 6, latestReportAt: null, version: null }).map((f) => f.label);
  assert.ok(!labels.includes('Current version'), 'version fact hidden on timeout');
  // a timeout is not cached: the next call fetches again and can succeed
  assert.equal((await fetchOfficialVersion(bodycam, { fetchImpl: okFetch(ITEMS), timeoutMs: 40 })).version, 'v0.8');
});

test('game-agnostic: a config without a steam-news patch source -> null, no fetch', async () => {
  const boom = async () => { throw new Error('must not fetch'); };
  assert.equal(await fetchOfficialVersion({ slug: 'x', sources: {} }, { fetchImpl: boom }), null);
  assert.equal(await fetchOfficialVersion({ slug: 'x', sources: { patchNotes: { type: 'bungie' } } }, { fetchImpl: boom }), null);
  assert.equal(await fetchOfficialVersion(null, { fetchImpl: boom }), null);
});
