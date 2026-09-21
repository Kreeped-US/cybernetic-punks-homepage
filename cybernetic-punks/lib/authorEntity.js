// lib/authorEntity.js
// SINGLE SOURCE OF TRUTH for the real accountable author (Justin) + publisher, used by every
// article route's JSON-LD and byline receipt (Brief 2a, 2026-09-21). Replaces the former
// fictional-persona authorship: articles are AI-DRAFTED and then verified in-game + approved by
// Justin, the solo operator -- author=Justin is honest ONLY alongside that AI disclosure (kept on
// the per-article receipt line + /about).
//
// Author-entity URL = the /about#justin anchor (FABLE-FLAG A resolved to the anchor, NOT a new
// /author/justin route, to keep the SEO freeze's "zero new routes" guarantee). sameAs verified to
// resolve 2026-09-21 (x.com/Kreeped 200; github.com/Kreeped-US 200). The BUSINESS X account
// (@Cybernetic87250) belongs on the PUBLISHER org, not the person.

export const AUTHOR_URL = 'https://cyberneticpunks.com/about#justin';

// The person entity for schema.org author / reviewedBy on every article.
export const JUSTIN_PERSON = {
  '@type': 'Person',
  name: 'Justin',
  url: AUTHOR_URL,
  sameAs: ['https://x.com/Kreeped', 'https://github.com/Kreeped-US'],
};

// The publisher org (unchanged name; business social on the org, logo for rich results).
export const PUBLISHER_ORG = {
  '@type': 'Organization',
  name: 'Cybernetic Punks',
  url: 'https://cyberneticpunks.com',
  logo: { '@type': 'ImageObject', url: 'https://cyberneticpunks.com/cnp-512.png' },
  sameAs: ['https://x.com/Cybernetic87250'],
};

// Shared date formatter for the receipt (UTC, en-US long date). Returns null on a
// missing/invalid date rather than guessing.
function receiptDate(createdAt) {
  var d = createdAt ? new Date(createdAt) : null;
  return (d && !isNaN(d.getTime()))
    ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    : null;
}

// The approval CLAUSE alone (no desk label) -- used on article pages that ALREADY show
// the desk in a byline chip, so the desk is not repeated: "Approved by Justin on <date>".
// Date derives from feed_items.created_at (no DB column added).
//
// CHAIN OF CUSTODY SPLIT (Brief 2b, 2026-09-21): the receipt is ACCOUNTABILITY only -- it no
// longer claims "verified in-game". Every draft is human-approved, but not every article is a
// primary-source VERIFICATION (an Attributed/Reported or Our Read piece is approved yet not
// "verified in-game"). The verification CLAIM now lives solely in the per-article tier badge
// (ArticleProvenanceBadge), so the receipt can never contradict the badge.
export function approvalClause(createdAt) {
  var dateStr = receiptDate(createdAt);
  return dateStr
    ? 'Approved by Justin on ' + dateStr
    : 'Approved by Justin';
}

// The FULL per-article byline RECEIPT: "<Desk> - Approved by Justin on <date>". For surfaces
// that do NOT separately show the desk. deskLabel comes from the roster section label.
export function verifiedReceipt(deskLabel, createdAt) {
  var desk = deskLabel || 'Editorial Desk';
  return desk + ' - ' + approvalClause(createdAt);
}
