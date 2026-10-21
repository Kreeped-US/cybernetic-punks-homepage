// lib/dmz/sitemapLastmod.js
// Honest sitemap lastmod for six DMZ pages that carried none: /dmz (hub), /dmz/field-intel,
// /dmz/loadouts, /dmz/printer, /dmz/fob and /dmz/regions. PURE: no DB, no clock.
//
// lastmod = the LATER of
//   (1) the newest lastmod among the DMZ articles that page lists, read from the 'dmz-article' entries
//       lib/sitemap/eligible.js has already emitted (so the article filter is eligible.js's own:
//       published AND noindex=false, routed by the shared section resolver), and
//   (2) the page's config date in ./pageDates.js (a fixed date from the content commit, hash-pinned
//       by sitemapLastmod.test.mjs so it cannot silently go stale).
// Neither -> undefined, and the sitemap omits the tag. It never uses new Date(), deploy time or now.
//
// Which articles a page lists: the hub lists every DMZ article (latest-articles list); a section lists
// the articles routed to it (/dmz/<slug>/<article>) plus its reference.featuredArticle, if any (the
// printer page features the crafting article that lives under /dmz/loadouts).
import { dmz } from '../games/dmz.js';
import { toISOWithPTOffset } from '../formatDate.js';
import { PAGE_DATES } from './pageDates.js';

var BASE = 'https://cyberneticpunks.com';

function instant(s) {
  var t = Date.parse(s);
  return Number.isNaN(t) ? -Infinity : t;
}

// Article URLs a page lists ('hub' or a section slug). null = every DMZ article.
function listedPrefixes(page, sections) {
  if (page === 'hub') return null;
  var sec = (sections || []).find(function (s) { return s.slug === page; });
  var out = [BASE + '/dmz/' + page + '/'];
  var fa = sec && sec.reference && sec.reference.featuredArticle;
  if (fa && fa.section && fa.slug) out.push(BASE + '/dmz/' + fa.section + '/' + fa.slug);
  return out;
}

// The lastmod for one page, from the eligible entries emitted so far. opts (tests only): sections,
// pageDates.
export function dmzPageLastmod(page, entries, opts) {
  var sections = (opts && opts.sections) || dmz.sections;
  var dates = (opts && opts.pageDates) || PAGE_DATES;
  var prefixes = listedPrefixes(page, sections);
  var best;
  var bestT = -Infinity;
  (entries || []).forEach(function (e) {
    if (!e || e.game !== 'dmz' || e.type !== 'dmz-article' || !e.lastmod) return;
    if (prefixes && !prefixes.some(function (p) { return p.endsWith('/') ? e.url.indexOf(p) === 0 : e.url === p; })) return;
    var t = instant(e.lastmod);
    if (t > bestT) { best = e.lastmod; bestT = t; }
  });
  var cfg = dates[page] && dates[page].lastUpdated;
  if (cfg && instant(cfg) > bestT) best = toISOWithPTOffset(cfg) || undefined;
  return best;
}

// ── Pinned content (used by the test that keeps PAGE_DATES honest) ─────────────────────────────
// The static content each page renders from config, as plain data. Excluded on purpose: anything
// visual (hero image and overlay) and anything computed from the clock (the hub's launch-status copy
// is pinned as its source strings, both branches, never as the branch chosen today).

// String literals in a JS source, comments skipped (for lib/dmz/hubCopy.js, whose copy is all literals).
export function stringLiterals(src) {
  var out = [];
  var i = 0;
  while (i < src.length) {
    var c = src[i];
    if (c === '/' && src[i + 1] === '/') { var nl = src.indexOf('\n', i); i = nl < 0 ? src.length : nl; continue; }
    if (c === '/' && src[i + 1] === '*') { var end = src.indexOf('*/', i + 2); i = end < 0 ? src.length : end + 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      var j = i + 1;
      var s = '';
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') { s += src[j + 1]; j += 2; continue; } s += src[j]; j++; }
      out.push(s);
      i = j + 1;
      continue;
    }
    i++;
  }
  return out;
}

export function pinnedContent(page, config, hubCopySource) {
  if (page === 'hub') {
    return {
      displayName: config.displayName,
      h1: config.hero && config.hero.h1,
      launch_date: config.launch_date,
      early_access_date: config.early_access_date,
      sections: config.sections.map(function (s) { return { slug: s.slug, label: s.label, description: s.description }; }),
      hubCopy: stringLiterals(String(hubCopySource || '').replace(/\r\n/g, '\n')),
      // Hub body copy held in config (2026-10-21): the Early Access note and the "What's confirmed" block.
      earlyAccessNote: config.earlyAccessNote,
      earlyAccessNoteSource: config.earlyAccessNoteSource,
      confirmedFacts: config.confirmedFacts,
    };
  }
  var sec = config.sections.find(function (s) { return s.slug === page; });
  if (!sec) return null;
  return { label: sec.label, description: sec.description, crossLinks: sec.crossLinks || null, reference: sec.reference || null };
}

// Key-sorted JSON, so the hash depends on content only, never on key order.
export function canonicalJson(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + canonicalJson(v[k]); }).join(',') + '}';
  }
  return JSON.stringify(v === undefined ? null : v);
}
