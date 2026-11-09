// lib/seo/proxyMetadataRoutes.test.mjs
// Brief 323: proxy.js Part B must not 410 a section hub's own metadata image route
// (/marathon/intel/opengraph-image etc.), while dead article slugs keep their 410.
//   1. GUARD: every opengraph-image / twitter-image route file in the slug position of an editor section
//      (the path depth Part B inspects) is in METADATA_ROUTE_SLUGS, and every name in the map has a route file.
//   2. BEHAVIOUR: proxy() with fetch stubbed (no network): routed names pass through, dead slugs 410,
//      unrouted names keep their 410, live slugs pass, four-segment paths pass, lookups fail open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { register } from 'node:module';
import { ARTICLE_SECTIONS, METADATA_ROUTE_SLUGS } from './deadIntel.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const NAMES = ['opengraph-image', 'twitter-image'];
const EXTS = ['.js', '.jsx', '.ts', '.tsx', '.png', '.jpg', '.jpeg', '.gif'];
const hasRoute = (dir, name) => EXTS.some((e) => fs.existsSync(path.join(dir, name + e)));

// The metadata routes that sit at /<game>/<section>/<name> for an editor section: the section's own
// literal folder when it has one, otherwise the game's dynamic [section] folder.
function routedNames() {
  const out = {};
  for (const [game, sections] of Object.entries(ARTICLE_SECTIONS)) {
    for (const section of sections) {
      const literal = path.join(ROOT, 'app', game, section);
      const dir = fs.existsSync(literal) ? literal : path.join(ROOT, 'app', game, '[section]');
      for (const name of NAMES) if (hasRoute(dir, name)) ((out[game] ||= {})[section] ||= []).push(name);
    }
  }
  return out;
}
const mapAsLists = () => Object.fromEntries(Object.entries(METADATA_ROUTE_SLUGS).map(([g, secs]) =>
  [g, Object.fromEntries(Object.entries(secs).map(([s, set]) => [s, [...set].sort()]))]));

test('guard: every metadata image route in an editor section slug position is exempt in METADATA_ROUTE_SLUGS', () => {
  const routed = routedNames();
  for (const [game, secs] of Object.entries(routed)) for (const [section, names] of Object.entries(secs)) for (const name of names) {
    assert.ok(METADATA_ROUTE_SLUGS[game]?.[section]?.has(name),
      `/${game}/${section}/${name} has a route file but is missing from METADATA_ROUTE_SLUGS in lib/seo/deadIntel.js, so proxy.js would 410 it as a dead article slug`);
  }
});

test('guard: every name in METADATA_ROUTE_SLUGS has a real route file (else exempting it would turn a 410 into a 404)', () => {
  const routed = routedNames();
  for (const [game, secs] of Object.entries(METADATA_ROUTE_SLUGS)) for (const [section, set] of Object.entries(secs)) for (const name of set) {
    assert.ok(ARTICLE_SECTIONS[game]?.has(section), `METADATA_ROUTE_SLUGS ${game}/${section} is not an editor section (proxy.js never 410s it)`);
    assert.ok(routed[game]?.[section]?.includes(name), `METADATA_ROUTE_SLUGS lists /${game}/${section}/${name} but no route file exists for it`);
  }
});

test('the map today: Marathon intel + Wardogs economy, field-intel, systems (opengraph-image only)', () => {
  assert.deepEqual(mapAsLists(), {
    marathon: { intel: ['opengraph-image'] },
    wardogs: { economy: ['opengraph-image'], 'field-intel': ['opengraph-image'], systems: ['opengraph-image'] },
  });
  assert.deepEqual(routedNames(), mapAsLists(), 'scan and map agree');
});

// ---- behaviour: proxy() against a stubbed Supabase REST ----
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://stub.supabase.test';
process.env.SUPABASE_SERVICE_KEY = 'stub-key';
const LIVE = { marathon: ['live-article-ab12'], wardogs: ['live-wardogs-cd34'], dmz: [], 'pubg-dednet': [] };
let fetchMode = 'ok';
globalThis.fetch = async (url) => {
  if (fetchMode === 'throw') throw new Error('network down');
  const u = new URL(url);
  const json = (rows) => new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json' } });
  if (u.pathname.endsWith('/slug_redirects')) return json([]);
  const game = (u.searchParams.get('game_slug') || '').replace(/^eq\./, '');
  const slugs = LIVE[game] || [];
  const one = u.searchParams.get('slug');
  return json((one ? slugs.filter((s) => 'eq.' + s === one) : slugs).map((slug) => ({ slug })));
};
// next/server has no ESM exports map, so plain node needs "next/server.js"; proxy.js imports "next/server"
// (Next's bundler resolves it). A test-local resolve hook maps the one specifier -- no shared harness change.
register('data:text/javascript,' + encodeURIComponent(
  'export async function resolve(s, c, n) { return n(s === "next/server" ? "next/server.js" : s, c); }'));
const { NextRequest } = await import('next/server.js');
const { proxy } = await import('../../proxy.js');
const run = async (p) => {
  const res = await proxy(new NextRequest('https://cyberneticpunks.com' + p));
  return res.status === 410 ? 410 : res.headers.get('x-middleware-next') === '1' ? 'next' : res.status;
};

test('proxy: the routed hub images pass through (all four)', async () => {
  for (const p of ['/marathon/intel/opengraph-image', '/wardogs/economy/opengraph-image', '/wardogs/field-intel/opengraph-image', '/wardogs/systems/opengraph-image']) {
    assert.equal(await run(p), 'next', p);
  }
});

test('proxy: dead article slugs still 410 in every game', async () => {
  for (const p of ['/marathon/intel/dead-article-zz99', '/wardogs/economy/dead-article-zz99', '/dmz/fob/dead-article-zz99', '/pubg-dednet/field-intel/dead-article-zz99']) {
    assert.equal(await run(p), 410, p);
  }
});

test('proxy: unrouted metadata names keep their 410 (twitter-image, DMZ, PUBG)', async () => {
  for (const p of ['/marathon/intel/twitter-image', '/dmz/fob/opengraph-image', '/dmz/field-intel/opengraph-image', '/pubg-dednet/field-intel/opengraph-image', '/wardogs/economy/twitter-image']) {
    assert.equal(await run(p), 410, p);
  }
});

test('proxy: live slugs, non-article sections and four-segment paths are unaffected', async () => {
  assert.equal(await run('/marathon/intel/live-article-ab12'), 'next');
  assert.equal(await run('/wardogs/field-intel/live-wardogs-cd34'), 'next');
  assert.equal(await run('/wardogs/arsenal/opengraph-image'), 'next', 'arsenal is not an article section');
  assert.equal(await run('/wardogs/economy/mine'), 'next', 'reserved literal route still passes');
  assert.equal(await run('/marathon/intel/dead-article-zz99/opengraph-image'), 'next', 'four segments: proxy never inspects it (unchanged)');
});

test('proxy: fail-open unchanged -- a lookup error on a cache miss never 410s', async () => {
  fetchMode = 'throw';
  try {
    assert.equal(await run('/marathon/intel/not-in-cache-yy88'), 'next');
  } finally { fetchMode = 'ok'; }
});
