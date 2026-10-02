// lib/games/hubModel.js
// PURE view-model for the shared game-hub pieces (hub layout B, 2026-10-02): the Latest Intel list, the
// facts strip, and the Coverage cards + Coming row. GAME-AGNOSTIC: everything is derived from the game
// config + the ONE shared article index (lib/games/sectionArticles.js fetchArticleIndex) + the optional
// official-version lookup. No React import -> node-testable. Every output is RSC-plain (strings, numbers,
// booleans, plain arrays/objects), so it is safe to hand to ANY component, server or client.

import { sectionForArticle } from './articleSection.js';
import { isEligibleArticle } from './sectionArticles.js';
import { formatPublishDate } from '../formatDate.js';

export var LATEST_INTEL_LIMIT = 5;

function sectionLabel(config, slug) {
  var s = (config.sections || []).find(function (x) { return x.slug === slug; });
  return s ? (s.navLabel || s.label) : slug;
}
function ts(v) { var t = Date.parse(v); return Number.isFinite(t) ? t : 0; }

// LATEST INTEL: the newest `limit` eligible articles, each with its section label, headline, display
// date, and the URL built from the SHARED resolver (so a fallback-routed article links to its one live
// URL). Rows that resolve to no section are dropped (never a dead link). [] -> the list is hidden.
export function selectLatestIntel(config, rows, limit) {
  var n = Number.isFinite(limit) ? limit : LATEST_INTEL_LIMIT;
  return (Array.isArray(rows) ? rows : [])
    .filter(isEligibleArticle)
    .slice().sort(function (a, b) { return ts(b.created_at) - ts(a.created_at); })
    .map(function (r) {
      var section = sectionForArticle(config.slug, r);
      if (!section) return null;
      return {
        href: config.basePath + '/' + section + '/' + r.slug,
        headline: r.headline || r.slug,
        sectionLabel: sectionLabel(config, section),
        date: formatPublishDate(r.created_at) || '',
        dateTime: r.created_at || '',
      };
    })
    .filter(Boolean)
    .slice(0, n);
}

// LATEST REPORT: the publish date of the newest eligible article, ISO -- or null when there are none.
// feed_items has NO published_at column, so the publish date is created_at -- the same date every article
// byline, section card, and Latest Intel row shows. Deliberately NOT updated_at: it moves on edits that
// are not new reporting (a typo fix, a tag change), so it would overstate freshness.
export function latestReportAt(rows) {
  var best = 0, iso = null;
  (Array.isArray(rows) ? rows : []).forEach(function (r) {
    if (!isEligibleArticle(r)) return;
    var t = ts(r.created_at);
    if (t > best) { best = t; iso = new Date(t).toISOString(); }
  });
  return iso;
}

// FACTS STRIP: config.facts (static, sourced in the config), then the DERIVED facts -- current version
// (official post; omitted when null), reports (eligible count), latest report (omitted when null) -- then
// the store link from config.storeUrl. Nothing is estimated: a fact without a value is dropped.
//   item: { label, value, href?, note? }
export function buildHubFacts(config, derived) {
  var d = derived || {};
  var out = [];
  (config.facts || []).forEach(function (f) {
    if (f && f.label && f.value) out.push({ label: String(f.label), value: String(f.value) });
  });
  if (d.version && d.version.version) {
    var v = { label: 'Current version', value: d.version.version };
    if (d.version.url) v.href = d.version.url;
    var vd = formatPublishDate(d.version.date);
    if (vd) v.note = 'patch notes ' + vd;
    out.push(v);
  }
  var n = Number.isFinite(d.reportCount) ? d.reportCount : 0;
  out.push({ label: 'Reports', value: n > 0 ? n + ' published' : 'Being built' });
  var latest = d.latestReportAt ? formatPublishDate(d.latestReportAt) : '';
  if (latest) out.push({ label: 'Latest report', value: latest });
  if (config.storeUrl) out.push({ label: 'Store', value: (config.storeName || 'Store page') + ' →', href: config.storeUrl });
  return out;
}

// COVERAGE: an EDITOR section with >= 1 resolved article is a full card; every other section (data
// sections, empty editor sections) becomes a small "Coming" chip that still links. Sections flagged
// hideFromNav are kept off the Coming row (they are deliberately unlinked from navigation) but still
// get a card once they have articles. No per-game config: the rule reads only source + the counts.
export function splitCoverage(config, counts) {
  var c = counts || {};
  var cards = [], coming = [];
  (config.sections || []).forEach(function (s) {
    var n = c[s.slug] || 0;
    if (s.source === 'editor' && n > 0) cards.push({ slug: s.slug, count: n });
    else if (!s.hideFromNav) coming.push({ slug: s.slug, label: s.label, href: config.basePath + '/' + s.slug });
  });
  return { cards: cards, coming: coming };
}
