// app/og/dmz-traits/route.test.mjs
// The DMZ trait planner share image route, driven for real (next/og renders under node:test). A FAKE
// globalThis.fetch emulates PostgREST for one fake host and THROWS on any other host; env values are
// fake and restored after each test. Every response must be a PNG with the short cache and
// X-Robots-Tag: noindex, the generic fallback included; a bad code never errors.
import { test, before, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { loadComponent } from '../../../lib/games/jsxHarness.test-helper.mjs';
import { encodeBuild } from '../../../lib/dmz/traitBuild.js';

const FAKE_URL = 'http://fake-supabase.test';
const FAKE_ENV = { NEXT_PUBLIC_SUPABASE_URL: FAKE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: 'fake-anon-key-for-tests' };
const realFetch = globalThis.fetch;
const savedEnv = {};
let calls;
let mode;
let GET, runtime, dynamic;

// The card (lib/og/dmzTraitsCard.js) is JSX, so it is compiled by the JSX harness with next/og mapped to
// the real module; the route (no JSX) is loaded the same way with its card import pointed at it.
before(async () => {
  const ogUrl = pathToFileURL(createRequire(import.meta.url).resolve('next/og')).href;
  const card = await loadComponent('lib/og/dmzTraitsCard.js', { stubs: { 'next/og': "export { ImageResponse } from '" + ogUrl + "';\n" } });
  globalThis.__dmzTraitsCard = card.dmzTraitsCard;
  const route = await loadComponent('app/og/dmz-traits/route.js', {
    stubs: { '@/lib/og/dmzTraitsCard': 'export function dmzTraitsCard(m) { return globalThis.__dmzTraitsCard(m); }\n' },
  });
  GET = route.GET; runtime = route.runtime; dynamic = route.dynamic;
});

// Test-only fixture rows.
const TREES = [{ slug: 't-a', label: 'Fixture Tree A', sort: 1, verified: true, verified_source: 'fixture', source_url: null }];
const TRAITS = [
  { slug: 'a1', tree_slug: 't-a', tier: 1, position_in_tier: 1, name: 'Fixture A1', effect_text: null, point_cost: 1, level_required: null, tags: null, verified: true, verified_source: 'fixture', source_url: null },
  { slug: 'uv', tree_slug: 't-a', tier: 1, position_in_tier: 2, name: 'SECRET', effect_text: null, point_cost: 1, level_required: null, tags: null, verified: false, verified_source: null, source_url: null },
];

async function fakeFetch(input) {
  const u = new URL(typeof input === 'string' ? input : input.url);
  if (u.host !== 'fake-supabase.test') throw new Error('TEST SAFETY: request to non-fake host ' + u.host + ' refused');
  calls.push(u.pathname);
  if (mode === 'error') return new Response(JSON.stringify({ code: 'PGRST205', message: 'missing' }), { status: 404, headers: { 'content-type': 'application/json' } });
  const body = u.pathname === '/rest/v1/dmz_trait_trees' ? TREES : u.pathname === '/rest/v1/dmz_traits' ? TRAITS : [];
  return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

beforeEach(() => {
  calls = [];
  mode = 'ok';
  for (const k of Object.keys(FAKE_ENV)) { savedEnv[k] = process.env[k]; process.env[k] = FAKE_ENV[k]; }
  globalThis.fetch = fakeFetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
  for (const k of Object.keys(FAKE_ENV)) { if (savedEnv[k] === undefined) delete process.env[k]; else process.env[k] = savedEnv[k]; }
});

async function get(qs) {
  const quiet = console.error;
  console.error = () => {};
  try {
    const res = await GET(new Request('http://localhost/og/dmz-traits' + qs));
    const buf = Buffer.from(await res.arrayBuffer());
    return { res, buf };
  } finally {
    console.error = quiet;
  }
}

function assertImage(res, buf) {
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.equal(res.headers.get('cache-control'), 'public, max-age=60, s-maxage=300, stale-while-revalidate=300');
  assert.equal(res.headers.get('x-robots-tag'), 'noindex');
  assert.deepEqual([...buf.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], 'PNG signature');
}

test('route config: Node runtime, force-dynamic', () => {
  assert.equal(runtime, 'nodejs');
  assert.equal(dynamic, 'force-dynamic');
});

test('no b -> generic card, no data read', async () => {
  const { res, buf } = await get('');
  assertImage(res, buf);
  assert.deepEqual(calls, []);
});

test('rejected codes (garbage, oversize, other version) -> generic card, no data read, never an error', async () => {
  const generic = (await get('')).buf;
  for (const qs of ['?b=garbage!', '?b=' + 'A'.repeat(2001), '?b=' + Buffer.from(JSON.stringify({ v: 2, o: [{ b: null, p: [] }] })).toString('base64url')]) {
    const { res, buf } = await get(qs);
    assertImage(res, buf);
    assert.ok(buf.equals(generic), qs.slice(0, 20) + ' renders the generic card');
  }
  assert.deepEqual(calls, []);
});

test('valid build with a verified pick -> one tolerant read, a build card (differs from generic)', async () => {
  const generic = (await get('')).buf;
  const code = encodeBuild({ active: 0, operators: [{ id: 1, budget: null, picks: ['a1', 'uv'] }] });
  const { res, buf } = await get('?b=' + code);
  assertImage(res, buf);
  assert.deepEqual(calls, ['/rest/v1/dmz_trait_trees', '/rest/v1/dmz_traits']);
  assert.ok(!buf.equals(generic), 'build card is not the generic card');
});

test('valid code but the read fails, or only unverified picks -> generic card', async () => {
  const generic = (await get('')).buf;
  mode = 'error';
  const code = encodeBuild({ active: 0, operators: [{ id: 1, budget: null, picks: ['a1'] }] });
  const failed = await get('?b=' + code);
  assertImage(failed.res, failed.buf);
  assert.ok(failed.buf.equals(generic));
  mode = 'ok';
  const onlyUv = await get('?b=' + encodeBuild({ active: 0, operators: [{ id: 1, budget: null, picks: ['uv'] }] }));
  assertImage(onlyUv.res, onlyUv.buf);
  assert.ok(onlyUv.buf.equals(generic));
});
