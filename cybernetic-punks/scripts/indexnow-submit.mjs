// scripts/indexnow-submit.mjs
// OPERATOR-RUN IndexNow submit (Brief 224). Tells IndexNow-participating engines (Bing among them) which of our
// URLs changed. NOT automated: no cron, no deploy hook, no package.json entry. Justin runs it by hand.
//
// SOURCE OF URLS: the LIVE sitemaps only (GET https://cyberneticpunks.com/sitemap.xml, then each child), never the
// DB. A URL that is not in a sitemap is never submitted, so noindex pages (kept out of the sitemaps) never are.
//
// THE KEY: the single source of truth is the key file's NAME, public/<32 hex>.txt, whose content is exactly the key
// (no trailing newline; the IndexNow protocol asks for a UTF-8 text file holding the key). The script finds it by
// listing public/ and fails unless there is exactly one such file and its content equals its name. The key is public
// by design (it is served at the site root); it is not a secret.
//
// SAFETY:
//   - DRY RUN BY DEFAULT: prints the exact URL list and request body and sends NOTHING unless --submit is passed.
//   - --submit sends ONE POST to https://api.indexnow.org/indexnow and prints the status and body. 200 and 202 are
//     accepted; 400/403/422/429 get a plain message. Never retries.
//   - Only https://cyberneticpunks.com URLs found in our own live sitemaps; deduped.
//   - Above --limit (default 500, hard max 10000) it REFUSES: sends nothing and exits non-zero. Never drops silently.
//
// SELECTION:
//   --since <date|datetime>  URLs whose sitemap lastmod >= since (inclusive). A bare date (YYYY-MM-DD) means midnight
//                            America/Los_Angeles; a bare-date lastmod is read the same way. Entries with no lastmod are
//                            never selected by --since (the count is printed); they are reachable through --urls only.
//   --urls <file>            An explicit list (one URL per line) that REPLACES the --since filter. Each URL must be on
//                            https://cyberneticpunks.com and appear in a live sitemap; anything else is rejected and
//                            listed with the reason. --since is required only when --urls is not given.
//
// USAGE:
//   node scripts/indexnow-submit.mjs --since 2026-10-29                  (DRY RUN: list and body, nothing sent)
//   node scripts/indexnow-submit.mjs --since 2026-10-29 --submit         (one POST to IndexNow)
//   node scripts/indexnow-submit.mjs --urls changed.txt                  (DRY RUN for an explicit list)
//   node scripts/indexnow-submit.mjs --since 2026-10-01 --limit 1000     (raise the cap)

import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const HOST = 'cyberneticpunks.com';
export const ORIGIN = 'https://' + HOST;
export const SITEMAP_INDEX = ORIGIN + '/sitemap.xml';
export const ENDPOINT = 'https://api.indexnow.org/indexnow';
export const DEFAULT_LIMIT = 500;
export const MAX_LIMIT = 10000;
var KEY_FILE_RE = /^([0-9a-f]{32})\.txt$/;

// ---- the key (single source of truth: the file name in public/) ----

// publicDir: a file URL ending in '/' (default: this repo's public/).
export function findKey(publicDir) {
  var dir = publicDir || new URL('../public/', import.meta.url);
  var hits = readdirSync(dir).filter(function (f) { return KEY_FILE_RE.test(f); });
  if (hits.length !== 1) throw new Error('expected exactly one public/<32 hex>.txt key file, found ' + hits.length);
  var key = KEY_FILE_RE.exec(hits[0])[1];
  var body = readFileSync(new URL(hits[0], dir), 'utf8');
  if (body !== key) throw new Error('key file content does not equal its name (no whitespace or newline allowed)');
  return key;
}

// ---- sitemap parsing ----

function unescapeXml(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

// <sitemapindex>: the child sitemap URLs.
export function parseSitemapIndex(xml) {
  var out = [];
  var re = /<sitemap>[\s\S]*?<loc>([\s\S]*?)<\/loc>[\s\S]*?<\/sitemap>/g;
  var m;
  while ((m = re.exec(xml))) out.push(unescapeXml(m[1].trim()));
  return out;
}

// <urlset>: [{loc, lastmod|null}].
export function parseUrlset(xml) {
  var out = [];
  var re = /<url>([\s\S]*?)<\/url>/g;
  var m;
  while ((m = re.exec(xml))) {
    var loc = /<loc>([\s\S]*?)<\/loc>/.exec(m[1]);
    if (!loc) continue;
    var lm = /<lastmod>([\s\S]*?)<\/lastmod>/.exec(m[1]);
    out.push({ loc: unescapeXml(loc[1].trim()), lastmod: lm ? unescapeXml(lm[1].trim()) : null });
  }
  return out;
}

// ---- dates ----

var LA_PARTS = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

// The UTC instant (ms) of 00:00 America/Los_Angeles on YYYY-MM-DD (PDT is UTC-7, PST is UTC-8; correct on switch days).
export function laMidnightUtc(ymd) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new Error('not a YYYY-MM-DD date: ' + ymd);
  for (var off of [7, 8]) {
    var t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), off);
    var p = {};
    LA_PARTS.formatToParts(new Date(t)).forEach(function (x) { p[x.type] = x.value; });
    if (p.year + '-' + p.month + '-' + p.day === ymd && p.hour === '00' && p.minute === '00') return t;
  }
  throw new Error('could not resolve Los Angeles midnight for ' + ymd);
}

// A sitemap lastmod or a --since value as a UTC instant (ms): a bare date is LA midnight, anything else is parsed as given.
export function toInstant(s) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return laMidnightUtc(s);
  var t = Date.parse(s);
  if (Number.isNaN(t)) throw new Error('not a date or datetime: ' + s);
  return t;
}

// ---- selection ----

function onHost(u) {
  try {
    var x = new URL(u);
    return x.protocol === 'https:' && x.host === HOST;
  } catch (e) { return false; }
}

// entries: [{loc, lastmod}] from the live sitemaps. opts: {since (ms) | null, urls ([string]) | null, limit}.
// --urls REPLACES the since filter; each listed URL must be on our host and in a sitemap. Deduped either way.
// Returns {selected, rejected [{url, reason}], noLastmod, overLimit}.
export function selectUrls(entries, opts) {
  var limit = opts.limit == null ? DEFAULT_LIMIT : opts.limit;
  var inSitemap = new Map();
  entries.forEach(function (e) { if (onHost(e.loc) && !inSitemap.has(e.loc)) inSitemap.set(e.loc, e); });
  var selected = [];
  var rejected = [];
  var noLastmod = 0;
  var seen = new Set();
  if (opts.urls) {
    opts.urls.map(function (u) { return u.trim(); }).filter(Boolean).forEach(function (u) {
      if (seen.has(u)) return;
      seen.add(u);
      if (!onHost(u)) rejected.push({ url: u, reason: 'not on ' + ORIGIN });
      else if (!inSitemap.has(u)) rejected.push({ url: u, reason: 'not in any live sitemap' });
      else selected.push(u);
    });
  } else {
    if (opts.since == null) throw new Error('--since is required when --urls is not given');
    inSitemap.forEach(function (e) {
      if (!e.lastmod) { noLastmod++; return; }
      if (toInstant(e.lastmod) >= opts.since) selected.push(e.loc);
    });
  }
  return { selected: selected, rejected: rejected, noLastmod: noLastmod, overLimit: selected.length > limit };
}

export function buildPayload(key, urlList) {
  return { host: HOST, key: key, keyLocation: ORIGIN + '/' + key + '.txt', urlList: urlList };
}

// Plain messages for the IndexNow response codes.
export function describeStatus(status) {
  if (status === 200) return 'ACCEPTED (200): URLs submitted.';
  if (status === 202) return 'ACCEPTED (202): received; the key is still being validated.';
  if (status === 400) return 'REJECTED (400 Bad Request): the request body is invalid.';
  if (status === 403) return 'REJECTED (403 Forbidden): the key is not valid or the key file was not found at keyLocation.';
  if (status === 422) return 'REJECTED (422 Unprocessable Entity): a URL does not belong to the host, or the key does not match the schema.';
  if (status === 429) return 'REJECTED (429 Too Many Requests): rate limited. Wait before trying again; this script never retries.';
  return 'UNEXPECTED status ' + status + '. Nothing was retried.';
}

// ---- the run (fetch and log injected so the tests never touch the network) ----

function argValue(argv, flag) {
  var i = argv.indexOf(flag);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
}

var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

// Returns an exit code. deps: {fetch, log, readFile, key, delayMs}.
export async function run(argv, deps) {
  var log = deps.log;
  var doFetch = deps.fetch;
  var submit = argv.indexOf('--submit') !== -1;
  var sinceArg = argValue(argv, '--since');
  var urlsFile = argValue(argv, '--urls');
  var limitArg = argValue(argv, '--limit');
  var limit = limitArg == null ? DEFAULT_LIMIT : Number(limitArg);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    log('ERROR: --limit must be an integer from 1 to ' + MAX_LIMIT + '. Nothing sent.');
    return 1;
  }
  if (!urlsFile && !sinceArg) {
    log('ERROR: --since <YYYY-MM-DD or ISO datetime> is required (or give --urls <file>). Nothing sent.');
    return 1;
  }
  var since = null;
  if (!urlsFile) {
    try { since = toInstant(sinceArg); } catch (e) { log('ERROR: ' + e.message + '. Nothing sent.'); return 1; }
  }
  var urls = null;
  if (urlsFile) urls = deps.readFile(urlsFile).split(/\r?\n/);

  var key = deps.key;
  var indexRes = await doFetch(SITEMAP_INDEX);
  if (indexRes.status !== 200) { log('ERROR: ' + SITEMAP_INDEX + ' returned ' + indexRes.status + '. Nothing sent.'); return 1; }
  var children = parseSitemapIndex(await indexRes.text());
  var entries = [];
  for (var c of children) {
    if (deps.delayMs) await sleep(deps.delayMs);
    var r = await doFetch(c);
    if (r.status !== 200) { log('ERROR: ' + c + ' returned ' + r.status + '. Nothing sent.'); return 1; }
    entries = entries.concat(parseUrlset(await r.text()));
  }
  log('Read ' + children.length + ' child sitemaps, ' + entries.length + ' URLs.');

  var sel = selectUrls(entries, { since: since, urls: urls, limit: limit });
  if (urls) log('Selection: --urls ' + urlsFile + ' (replaces --since).');
  else log('Selection: lastmod >= ' + sinceArg + ' (' + new Date(since).toISOString() + '). Skipped for no lastmod: ' + sel.noLastmod + '.');
  sel.rejected.forEach(function (x) { log('  REJECTED ' + x.url + ' -- ' + x.reason); });
  log('Selected: ' + sel.selected.length + ' URL(s).');
  if (sel.overLimit) {
    log('REFUSED: ' + sel.selected.length + ' URLs selected, limit is ' + limit + '. Nothing sent; raise --limit to proceed.');
    return 1;
  }
  if (sel.selected.length === 0) { log('Nothing to submit. Nothing sent.'); return 0; }
  sel.selected.forEach(function (u) { log('  ' + u); });
  var payload = buildPayload(key, sel.selected);
  log('Request: POST ' + ENDPOINT + '  Content-Type: application/json; charset=utf-8');
  log(JSON.stringify(payload, null, 2));

  if (!submit) {
    log('DRY RUN - nothing sent. Re-run with --submit to send this one request.');
    return 0;
  }
  var res = await doFetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(payload) });
  var body = '';
  try { body = await res.text(); } catch (e) { body = ''; }
  log('HTTP ' + res.status + (body ? ' ' + body : ''));
  log(describeStatus(res.status));
  return res.status === 200 || res.status === 202 ? 0 : 1;
}

// Run only when executed directly; importing the module (the tests) never runs it or touches the network.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  var key;
  try { key = findKey(); } catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
  run(process.argv.slice(2), {
    fetch: globalThis.fetch,
    log: console.log,
    readFile: function (f) { return readFileSync(f, 'utf8'); },
    key: key,
    delayMs: 500,
  }).then(function (code) { process.exit(code); }, function (e) { console.error(e); process.exit(1); });
}
