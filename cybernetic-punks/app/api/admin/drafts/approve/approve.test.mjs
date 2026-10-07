// app/api/admin/drafts/approve/approve.test.mjs
// POST /api/admin/drafts/approve refuses rejected drafts (2026-10-07). Drives the REAL route handler
// with a FAKE globalThis.fetch that emulates PostgREST for one fake Supabase host and records every
// request. SAFETY: the fake fetch THROWS on any other host and on any unrecognised request, env values
// are fake (never read from .env.local), and fetch + every env var touched are restored after each test.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { POST } from './route.js';

const FAKE_URL = 'http://fake-supabase.test';
const FAKE_HOST = 'fake-supabase.test';
const FAKE_ENV = { NEXT_PUBLIC_SUPABASE_URL: FAKE_URL, SUPABASE_SERVICE_KEY: 'fake-service-key-for-tests', ADMIN_PASSWORD: 'fake-admin-password-for-tests' };

const realFetch = globalThis.fetch;
const savedEnv = {};
let calls;
let scenario;

// A body that passes body integrity and matches no recorded correction.
const CLEAN = 'This briefing covers the official patch notes and what changed for players this week. '.repeat(8);

function draft(over) {
  return Object.assign({ id: 'd-1', headline: 'A clean draft headline for this test', body: CLEAN, game_slug: 'wardogs', editor: 'NEXUS',
    directive_type: null, tags: [], creator_info: null, source_url: null, source: null, is_published: false, rejected: null }, over);
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: { 'content-type': 'application/json' } });
}

// Fake PostgREST. Recognises ONLY the requests the approve route makes; anything else throws.
async function fakeFetch(input, init) {
  const u = new URL(typeof input === 'string' ? input : input.url);
  if (u.host !== FAKE_HOST) throw new Error('TEST SAFETY: request to non-fake host ' + u.host + ' refused');
  const method = ((init && init.method) || 'GET').toUpperCase();
  const q = decodeURIComponent(u.search.slice(1));
  const rec = { method, path: u.pathname, q, body: init && init.body ? JSON.parse(init.body) : null };
  calls.push(rec);
  if (u.pathname !== '/rest/v1/feed_items') throw new Error('TEST SAFETY: unmatched path ' + u.pathname);
  if (method === 'GET' && q.startsWith('select=id,headline,body,')) return json(scenario.read ? [scenario.read] : []);
  if (method === 'GET' && q === 'select=operator_approved_at&limit=1') return json([]);
  if (method === 'GET' && q === 'select=patch_key&limit=1') return json([]);
  if (method === 'GET' && q.startsWith('select=patch_key&id=eq.')) return json([{ patch_key: null }]);
  if (method === 'PATCH') {
    // supabase-js maybeSingle() on a write asks for ONE object (Accept: application/vnd.pgrst.object+json).
    // Real PostgREST then returns the object, or 406 PGRST116 for zero rows (which the client maps to
    // data:null). Emulate exactly that.
    const accept = new Headers(init && init.headers).get('accept') || '';
    if (!/vnd\.pgrst\.object\+json/.test(accept)) throw new Error('TEST SAFETY: PATCH without single-object Accept: ' + accept);
    if (scenario.patchReturns) return json(scenario.patchReturns);
    return json({ code: 'PGRST116', details: 'The result contains 0 rows', hint: null, message: 'JSON object requested, multiple (or no) rows returned' }, 406);
  }
  throw new Error('TEST SAFETY: unmatched request ' + method + ' ' + u.pathname + '?' + q);
}

beforeEach(() => {
  calls = [];
  scenario = {};
  for (const k of Object.keys(FAKE_ENV)) { savedEnv[k] = process.env[k]; process.env[k] = FAKE_ENV[k]; }
  globalThis.fetch = fakeFetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of Object.keys(FAKE_ENV)) { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k]; }
});

async function approve(id) {
  const res = await POST(new Request('http://localhost/api/admin/drafts/approve', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-password': FAKE_ENV.ADMIN_PASSWORD }, body: JSON.stringify({ id }),
  }));
  return { status: res.status, body: await res.json() };
}

test('setup safety: only fake env values are in use, and the fake fetch refuses any other host', async () => {
  assert.equal(process.env.NEXT_PUBLIC_SUPABASE_URL, FAKE_URL);
  assert.equal(process.env.SUPABASE_SERVICE_KEY, 'fake-service-key-for-tests');
  assert.equal(process.env.ADMIN_PASSWORD, 'fake-admin-password-for-tests');
  await assert.rejects(() => globalThis.fetch('https://example.com/rest/v1/feed_items'), /non-fake host/);
  await assert.rejects(() => globalThis.fetch(FAKE_URL + '/rest/v1/other_table'), /unmatched path/);
});

for (const game of ['wardogs', 'dmz']) {
  test(game + ': rejected=true -> 409, only the read request, no PATCH, no stamp probe', async () => {
    scenario.read = draft({ id: 'r-' + game, game_slug: game, rejected: true });
    const r = await approve('r-' + game);
    assert.equal(r.status, 409);
    assert.deepEqual(r.body, { error: 'Draft is rejected: restore it first (DECLINED list, RESTORE), then approve.', gate: 'rejected' });
    assert.equal(calls.length, 1, 'only the read');
    assert.equal(calls[0].method, 'GET');
    assert.match(calls[0].q, /select=id,headline,body,.*,is_published,rejected&id=eq\.r-/, 'the read selects rejected');
    assert.equal(calls.some((c) => c.method === 'PATCH'), false, 'no write');
    assert.equal(calls.some((c) => c.q === 'select=operator_approved_at&limit=1'), false, 'no stamp probe');
  });

  for (const rejected of [false, null]) {
    test(game + ': rejected=' + rejected + ' -> 200; PATCH carries the stamp, the tag strip and rejected=not.is.true', async () => {
      // A tag this game's vocabulary disallows, so the strip path is exercised: wardogs is not an
      // extraction game (strips 'extraction'); dmz has no ranked play (strips 'ranked').
      const badTag = game === 'wardogs' ? 'extraction' : 'ranked';
      scenario.read = draft({ id: 'a-' + game, game_slug: game, rejected, tags: ['news', badTag] });
      scenario.patchReturns = { id: 'a-' + game, slug: game + '-approved-draft', game_slug: game, is_published: true, noindex: false };
      const r = await approve('a-' + game);
      assert.equal(r.status, 200);
      // Success shape unchanged: { data, gate, strippedTags }. gate is the route's existing label (an A11
      // review hold is computed but not enforced for NEXUS, so it reads 'review-hold-overridden' or 'pass').
      assert.deepEqual(Object.keys(r.body), ['data', 'gate', 'strippedTags']);
      assert.deepEqual(r.body.data, scenario.patchReturns);
      assert.ok(['pass', 'review-hold-overridden', 'correction-acknowledged'].includes(r.body.gate), r.body.gate);
      assert.deepEqual(r.body.strippedTags, [badTag]);
      const patch = calls.filter((c) => c.method === 'PATCH');
      assert.equal(patch.length, 1);
      assert.match(patch[0].q, /^id=eq\.a-\w+&is_published=eq\.false&rejected=not\.is\.true&select=id,slug,game_slug,is_published,noindex$/);
      assert.equal(patch[0].body.is_published, true);
      assert.equal(patch[0].body.noindex, false);
      assert.equal(patch[0].body.noindexed_at, null);
      assert.match(patch[0].body.operator_approved_at, /^\d{4}-\d\d-\d\dT/, 'approval stamp in the same single write');
      assert.deepEqual(patch[0].body.tags, ['news'], 'disallowed tag stripped in the same write');
    });
  }

  test(game + ': empty PATCH result (published/rejected in between) -> 404 exactly as before', async () => {
    scenario.read = draft({ id: 'e-' + game, game_slug: game, rejected: false });
    scenario.patchReturns = null;
    const r = await approve('e-' + game);
    assert.equal(r.status, 404);
    assert.deepEqual(r.body, { error: 'No draft found for that id (already published or missing).' });
    assert.equal(calls.filter((c) => c.method === 'PATCH').length, 1);
  });
}

test('missing draft -> 404 exactly as before (no write)', async () => {
  scenario.read = null;
  const r = await approve('nope');
  assert.equal(r.status, 404);
  assert.deepEqual(r.body, { error: 'No draft found for that id (already published or missing).' });
  assert.equal(calls.length, 1);
});

test('wrong admin password -> 401 and no request at all', async () => {
  const res = await POST(new Request('http://localhost/api/admin/drafts/approve', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-admin-password': 'wrong', 'x-forwarded-for': '203.0.113.9' }, body: JSON.stringify({ id: 'x' }),
  }));
  assert.equal(res.status, 401);
  assert.equal(calls.length, 0);
});
