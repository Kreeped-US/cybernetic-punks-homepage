// scripts/indexnow-submit.test.mjs
// Brief 224: the operator-run IndexNow submit. Pure parts (sitemap parsing, Los Angeles midnight, selection, payload)
// and the run with an injected fake fetch: no network, and a dry run makes zero POSTs. Importing the script never runs it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import {
  HOST, ORIGIN, ENDPOINT, DEFAULT_LIMIT, MAX_LIMIT, findKey, parseSitemapIndex, parseUrlset, laMidnightUtc, toInstant,
  selectUrls, buildPayload, describeStatus, run,
} from './indexnow-submit.mjs';

const PUBLIC = new URL('../public/', import.meta.url);

test('key file: exactly one public/<32 hex>.txt, its content is exactly the key (ASCII, no newline), found by name', () => {
  const files = readdirSync(PUBLIC).filter((f) => /^[0-9a-f]{32}\.txt$/.test(f));
  assert.equal(files.length, 1);
  const key = findKey();
  assert.equal(files[0], key + '.txt');
  const raw = readFileSync(new URL(files[0], PUBLIC));
  assert.equal(raw.toString('utf8'), key);
  assert.equal(raw.length, 32, 'no BOM, no whitespace, no newline');
  assert.ok(/^[0-9a-f]{32}$/.test(key));
});

test('files are ASCII; the script names no key literal', () => {
  for (const f of ['indexnow-submit.mjs', 'indexnow-submit.test.mjs']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.ok(!/[^\x00-\x7f]/.test(src), f);
    assert.ok(!/['"][0-9a-f]{32}['"]/.test(src), f + ': no 32-hex string literal');
  }
});

const INDEX = '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + '  <sitemap>\n    <loc>https://cyberneticpunks.com/sitemap-a.xml</loc>\n    <lastmod>2026-10-29</lastmod>\n  </sitemap>\n'
  + '  <sitemap>\n    <loc>https://cyberneticpunks.com/sitemap-b.xml</loc>\n  </sitemap>\n</sitemapindex>\n';
const url = (loc, lastmod) => '  <url>\n    <loc>' + loc + '</loc>\n' + (lastmod ? '    <lastmod>' + lastmod + '</lastmod>\n' : '') + '    <changefreq>weekly</changefreq>\n  </url>\n';
const set = (...u) => '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + u.join('') + '</urlset>\n';
const A = set(
  url('https://cyberneticpunks.com/dmz/weapons/han-86', '2026-10-29'),
  url('https://cyberneticpunks.com/dmz/printer', '2026-10-29T12:58:26-07:00'),
  url('https://cyberneticpunks.com/dmz', '2026-10-28T06:22:08-07:00'),
  url('https://cyberneticpunks.com/a?x=1&amp;y=2', '2026-10-29'),
);
const B = set(
  url('https://cyberneticpunks.com/', null),
  url('https://cyberneticpunks.com/dmz/weapons/han-86', '2026-10-29'),
  url('https://cyberneticpunks.com/marathon/intel/x', '2026-08-20'),
);

test('parse: index children; urlset loc and lastmod (missing lastmod is null; &amp; unescaped)', () => {
  assert.deepEqual(parseSitemapIndex(INDEX), ['https://cyberneticpunks.com/sitemap-a.xml', 'https://cyberneticpunks.com/sitemap-b.xml']);
  const a = parseUrlset(A);
  assert.equal(a.length, 4);
  assert.deepEqual(a[1], { loc: 'https://cyberneticpunks.com/dmz/printer', lastmod: '2026-10-29T12:58:26-07:00' });
  assert.equal(a[3].loc, 'https://cyberneticpunks.com/a?x=1&y=2');
  assert.equal(parseUrlset(B)[0].lastmod, null);
});

test('dates: a bare date is midnight America/Los_Angeles, PDT and PST, including both 2026 switch days', () => {
  assert.equal(new Date(laMidnightUtc('2026-10-29')).toISOString(), '2026-10-29T07:00:00.000Z');
  assert.equal(new Date(laMidnightUtc('2026-12-15')).toISOString(), '2026-12-15T08:00:00.000Z');
  assert.equal(new Date(laMidnightUtc('2026-03-08')).toISOString(), '2026-03-08T08:00:00.000Z', 'DST starts at 2am: midnight is still PST');
  assert.equal(new Date(laMidnightUtc('2026-11-01')).toISOString(), '2026-11-01T07:00:00.000Z', 'DST ends at 2am: midnight is still PDT');
  assert.equal(toInstant('2026-10-29T12:58:26-07:00'), Date.parse('2026-10-29T19:58:26Z'));
  assert.throws(() => toInstant('yesterday'));
});

const entries = () => parseUrlset(A).concat(parseUrlset(B));

test('--since: inclusive boundary, deduped, no-lastmod entries skipped and counted', () => {
  const s = selectUrls(entries(), { since: toInstant('2026-10-29'), urls: null });
  assert.deepEqual(s.selected, ['https://cyberneticpunks.com/dmz/weapons/han-86', 'https://cyberneticpunks.com/dmz/printer', 'https://cyberneticpunks.com/a?x=1&y=2']);
  assert.equal(s.noLastmod, 1);
  assert.deepEqual(s.rejected, []);
  // Inclusive: a since equal to a lastmod instant selects it; one ms later does not.
  const t = Date.parse('2026-10-29T12:58:26-07:00');
  assert.ok(selectUrls(entries(), { since: t, urls: null }).selected.includes('https://cyberneticpunks.com/dmz/printer'));
  assert.ok(!selectUrls(entries(), { since: t + 1, urls: null }).selected.includes('https://cyberneticpunks.com/dmz/printer'));
  assert.throws(() => selectUrls(entries(), { since: null, urls: null }), /--since is required/);
});

test('host filter: sitemap entries off our host are never selected', () => {
  const e = entries().concat([{ loc: 'https://www.cyberneticpunks.com/dmz/x', lastmod: '2026-10-30' }, { loc: 'http://cyberneticpunks.com/dmz/y', lastmod: '2026-10-30' }, { loc: 'https://example.com/z', lastmod: '2026-10-30' }]);
  const s = selectUrls(e, { since: toInstant('2026-10-29'), urls: null });
  assert.ok(s.selected.every((u) => u.startsWith(ORIGIN + '/')));
  assert.equal(s.selected.length, 3);
});

test('--urls REPLACES --since: works without since, keeps a no-lastmod sitemap URL, rejects off-host and off-sitemap URLs, dedupes', () => {
  const s = selectUrls(entries(), { since: null, urls: [
    'https://cyberneticpunks.com/', 'https://cyberneticpunks.com/marathon/intel/x', 'https://cyberneticpunks.com/marathon/intel/x',
    'https://cyberneticpunks.com/not-in-sitemap', 'https://example.com/dmz', 'http://cyberneticpunks.com/dmz', '',
  ] });
  assert.deepEqual(s.selected, ['https://cyberneticpunks.com/', 'https://cyberneticpunks.com/marathon/intel/x']);
  assert.deepEqual(s.rejected, [
    { url: 'https://cyberneticpunks.com/not-in-sitemap', reason: 'not in any live sitemap' },
    { url: 'https://example.com/dmz', reason: 'not on https://cyberneticpunks.com' },
    { url: 'http://cyberneticpunks.com/dmz', reason: 'not on https://cyberneticpunks.com' },
  ]);
});

test('limit: over the limit is flagged (never trimmed); default 500, hard max 10000', () => {
  const s = selectUrls(entries(), { since: toInstant('2026-10-29'), urls: null, limit: 2 });
  assert.equal(s.overLimit, true);
  assert.equal(s.selected.length, 3, 'nothing dropped');
  assert.equal(selectUrls(entries(), { since: toInstant('2026-10-29'), urls: null, limit: 3 }).overLimit, false);
  assert.equal(DEFAULT_LIMIT, 500);
  assert.equal(MAX_LIMIT, 10000);
});

test('payload shape and status messages', () => {
  const k = 'f'.repeat(32);
  assert.deepEqual(buildPayload(k, ['https://cyberneticpunks.com/dmz']), {
    host: 'cyberneticpunks.com', key: k, keyLocation: 'https://cyberneticpunks.com/' + k + '.txt', urlList: ['https://cyberneticpunks.com/dmz'],
  });
  assert.equal(HOST, 'cyberneticpunks.com');
  assert.equal(ENDPOINT, 'https://api.indexnow.org/indexnow');
  assert.equal(describeStatus(200), 'ACCEPTED (200): URLs submitted.');
  assert.match(describeStatus(202), /^HTTP 202: RECEIVED, NOT CONFIRMED\./);
  assert.match(describeStatus(202), /Bing Webmaster Tools > IndexNow > Submitted URLs/);
  assert.doesNotMatch(describeStatus(202), /submitted\b(?! URLs)|accepted/i, '202 never reads as submitted or accepted');
  for (const s of [400, 403, 422, 429]) assert.match(describeStatus(s), /^REJECTED/);
  assert.match(describeStatus(429), /never retries/);
});

// A fake fetch serving the fixture sitemaps and recording every call; POSTs answer with `postStatus`.
function fakeFetch(postStatus) {
  const calls = [];
  const fn = async (u, init) => {
    calls.push({ url: u, method: (init && init.method) || 'GET', body: init && init.body });
    if (init && init.method === 'POST') return { status: postStatus, text: async () => '' };
    const body = u === ORIGIN + '/sitemap.xml' ? INDEX : u.endsWith('sitemap-a.xml') ? A : u.endsWith('sitemap-b.xml') ? B : null;
    return body ? { status: 200, text: async () => body } : { status: 404, text: async () => '' };
  };
  fn.calls = calls;
  return fn;
}
const KEY = 'a'.repeat(32);
const deps = (f, files) => ({ fetch: f, log: () => {}, key: KEY, readFile: (p) => files[p] });

test('run: a dry run reads the sitemaps with GETs only and makes ZERO POSTs', async () => {
  const f = fakeFetch(200);
  assert.equal(await run(['--since', '2026-10-29'], deps(f)), 0);
  assert.equal(f.calls.filter((c) => c.method === 'POST').length, 0);
  assert.deepEqual(f.calls.map((c) => c.url), [ORIGIN + '/sitemap.xml', ORIGIN + '/sitemap-a.xml', ORIGIN + '/sitemap-b.xml']);
});

test('run: --submit makes exactly ONE POST with the payload; 202 exits 2; 429 is a non-zero exit with no retry', async () => {
  const f = fakeFetch(202);
  assert.equal(await run(['--since', '2026-10-29', '--submit'], deps(f)), 2);
  const posts = f.calls.filter((c) => c.method === 'POST');
  assert.equal(posts.length, 1);
  assert.equal(posts[0].url, ENDPOINT);
  assert.deepEqual(JSON.parse(posts[0].body), buildPayload(KEY, ['https://cyberneticpunks.com/dmz/weapons/han-86', 'https://cyberneticpunks.com/dmz/printer', 'https://cyberneticpunks.com/a?x=1&y=2']));
  const g = fakeFetch(429);
  assert.equal(await run(['--since', '2026-10-29', '--submit'], deps(g)), 1);
  assert.equal(g.calls.filter((c) => c.method === 'POST').length, 1, 'no retry');
});

// Brief 241: a 202 is RECEIVED, NOT CONFIRMED (the 2026-10-29 202 batch was not registered by Bing).
async function submitLines(status) {
  const f = fakeFetch(status);
  const lines = [];
  const code = await run(['--since', '2026-10-29', '--submit'], { ...deps(f), log: (l) => lines.push(l) });
  const at = lines.findIndex((l) => l.startsWith('HTTP ' + status));
  return { code, lines, after: lines.slice(at), posts: f.calls.filter((c) => c.method === 'POST').length };
}

test('run: 202 prints RECEIVED, NOT CONFIRMED, never "submitted" or "accepted", and exits 2', async () => {
  const r = await submitLines(202);
  assert.equal(r.code, 2);
  assert.equal(r.posts, 1);
  assert.ok(r.lines.some((l) => /^HTTP 202: RECEIVED, NOT CONFIRMED\. Bing has not necessarily registered these URLs \(the 2026-10-29 batch was not\)\. Check Bing Webmaster Tools > IndexNow > Submitted URLs before treating this as done\.$/.test(l)));
  for (const l of r.lines) assert.doesNotMatch(l, /\bsubmitted\b(?! URLs)|\baccepted\b/i, l);
});

test('run: 200 still exits 0 with its existing wording', async () => {
  const r = await submitLines(200);
  assert.equal(r.code, 0);
  assert.ok(r.lines.includes('ACCEPTED (200): URLs submitted.'));
  assert.ok(!r.lines.some((l) => /NOT CONFIRMED/.test(l)));
});

test('run: a non-2xx status still fails with exit 1 as before', async () => {
  for (const [s, re] of [[400, /^REJECTED \(400/], [403, /^REJECTED \(403/], [422, /^REJECTED \(422/], [500, /^UNEXPECTED status 500/]]) {
    const r = await submitLines(s);
    assert.equal(r.code, 1, String(s));
    assert.ok(r.lines.some((l) => re.test(l)), String(s));
  }
});

test('run: the key never appears in the response lines (status line and message) for 200, 202 or a failure', async () => {
  for (const s of [200, 202, 403]) {
    const r = await submitLines(s);
    assert.ok(r.after.length >= 2, String(s));
    for (const l of r.after) assert.ok(!l.includes(KEY), s + ': ' + l);
  }
});

test('run: over --limit refuses (non-zero, zero POSTs, says raise --limit) even with --submit', async () => {
  const f = fakeFetch(200);
  const lines = [];
  const code = await run(['--since', '2026-10-29', '--limit', '2', '--submit'], { ...deps(f), log: (l) => lines.push(l) });
  assert.equal(code, 1);
  assert.equal(f.calls.filter((c) => c.method === 'POST').length, 0);
  assert.ok(lines.some((l) => /REFUSED: 3 URLs selected, limit is 2\. Nothing sent; raise --limit to proceed\./.test(l)));
  assert.equal(await run(['--since', '2026-10-29', '--limit', '10001'], deps(f)), 1, 'above the hard max');
});

test('run: --urls without --since works and lists rejects; no --since and no --urls is an error with no network', async () => {
  const f = fakeFetch(200);
  const lines = [];
  const code = await run(['--urls', 'list.txt'], { ...deps(f, { 'list.txt': 'https://cyberneticpunks.com/\nhttps://cyberneticpunks.com/nope\n' }), log: (l) => lines.push(l) });
  assert.equal(code, 0);
  assert.ok(lines.includes('  REJECTED https://cyberneticpunks.com/nope -- not in any live sitemap'));
  assert.ok(lines.includes('Selected: 1 URL(s).'));
  assert.equal(f.calls.filter((c) => c.method === 'POST').length, 0);
  const g = fakeFetch(200);
  assert.equal(await run([], deps(g)), 1);
  assert.equal(g.calls.length, 0);
});
