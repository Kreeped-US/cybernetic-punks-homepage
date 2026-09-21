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

// The ORG author for legacy / auto-published articles (Brief 2e). An article Justin did NOT
// individually approve must NOT credit him as author -- that would be manufactured authority on a
// row he never reviewed. It is authored by the Organization instead.
export const ORG_AUTHOR = {
  '@type': 'Organization',
  name: 'Cybernetic Punks',
  url: 'https://cyberneticpunks.com',
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

// RECEIPT / AUTHOR HONESTY SPLIT (Brief 2e, 2026-09-21) -- the single decision point every article
// route uses. 2a wrongly applied author=Justin + "Approved by Justin" to EVERY article, including
// 435 legacy rows Justin never individually reviewed. That is manufactured authority. An article is
// treated as operator-approved ONLY when it carries an operator_approved_at timestamp (set by the
// admin approve action going forward; legacy/auto rows are null).
//
//   approved (operator_approved_at present):
//     author = Justin Person, reviewedBy = Justin, publisher = Org,
//     visible receipt "Approved by Justin on <APPROVAL date>" (the approval date, not created_at),
//     disclosure "Drafted with AI tooling; reviewed and approved by Justin."
//   legacy / auto (operator_approved_at null/absent):
//     author = Organization, NO reviewedBy, NO receipt, publisher = Org,
//     disclosure "Drafted with AI tooling."
//
// The DESK label (a section, not an author) still renders in both cases -- the route owns that.
export function resolveArticleAuthorship(article) {
  var approvedAt = (article && article.operator_approved_at) || null;
  if (approvedAt) {
    return {
      approved: true,
      author: JUSTIN_PERSON,
      reviewedBy: JUSTIN_PERSON,
      publisher: PUBLISHER_ORG,
      receipt: approvalClause(approvedAt), // uses the APPROVAL timestamp, not created_at
      disclosure: 'Drafted with AI tooling; reviewed and approved by Justin.',
    };
  }
  return {
    approved: false,
    author: ORG_AUTHOR,
    reviewedBy: null,
    publisher: PUBLISHER_ORG,
    receipt: null,
    disclosure: 'Drafted with AI tooling.',
  };
}
