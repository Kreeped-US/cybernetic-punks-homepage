// lib/gsc/detectPipelineLeak.js
// PIPELINE / META LEAK detector (2026-09-24). PURE, zero-I/O -- same posture as
// corroboration.js / hardStatDetector.js / crossGameEntities.js: the caller (runGate) hands it
// the draft and does the logging; this decides.
//
// THE PROBLEM IT CLOSES. The writer model leaks PIPELINE VOCABULARY and BARE ROUTE PATHS into
// reader-facing article text -- language that describes the CONTENT PIPELINE ("all stat values in
// the database remain unverified", "only partially available this cycle", "cite them when you have
// the Prestige version"), and internal nav literals ("Map it to /cradle"). These read as broken,
// meta, or unfinished to a reader and are the dominant driver of operator draft rejections
// (2026-09-24 noon drafts). This detector NAMES that vocabulary + the bare-path shape and holds a
// draft that leaks it -- in EVERY mode (see prePublishGate.ALWAYS_HOLD_CLASSES), because a leak is
// a reader-facing defect regardless of a game's corroboration posture.
//
// THREE CHECKS:
//   (a) BLOCK -- pipeline/meta PHRASES (PIPELINE_LEAK_PHRASES, one data array), case-INSENSITIVE,
//       over headline + body. The list is DATA so tuning it is a one-line edit, never a new regex.
//   (b) BLOCK -- BARE ROUTE PATHS in prose: a "/segment(/segment)*" token whose first segment is
//       letter-led (so a fraction/date like "9/24" never matches). Markdown links and bare URLs are
//       STRIPPED FIRST, so a legitimate [Cradle](/marathon/cradle) href is never a hit -- only a
//       raw "/cradle" sitting in prose. Body only (route literals leak in body prose, not headlines).
//   (c) FLAG (log, NEVER block) -- the word "verified" in prose. High-volume and mostly legitimate
//       (provenance honesty, "verified intel" branding), so it is observed, not enforced.
//
// The finding shape mirrors crossGameEntities' finding (class / kind / matched / verbatim / slug) so
// decideGate's class filters treat it uniformly. BLOCK findings carry class 'PIPELINE_LEAK' (an
// ALWAYS_HOLD class); FLAG findings carry class 'PIPELINE_LEAK_FLAG' and are returned SEPARATELY
// (never fed to decideGate).

// (a) Pipeline/meta phrases -- DATA, not scattered regexes. Case-insensitive substring match.
// Tuned 2026-09-24 against the rejected drafts + the last published sets: 'this cycle' was dropped
// (fires on legitimate reader prose -- "community coverage this cycle") and bare 'not verified' was
// narrowed to 'are not verified' (reader-facing provenance honesty like "announced, not verified
// in-game" is legitimate; the pipeline construction "the exact numbers are not verified" is not).
export const PIPELINE_LEAK_PHRASES = [
  'in the database',
  'available notes',
  'this article will',
  'cite them',
  'verify them yourself',
  'treat as approximate',
  'unconfirmed source',
  'are not verified',
  'exact numbers are not',
  'exact values are unconfirmed',
  'partially available',
];

// Markdown link + bare URL strippers (body is Markdown: [text](url); see lib/articleBody.js). Run
// BEFORE the route scan so a real href inside a link is never counted as a bare path.
const MD_LINK_RE = /\[[^\]]*\]\([^)]*\)/g;
const URL_RE = /https?:\/\/\S+/g;
// A bare route token in prose: first segment MUST start with a letter (excludes "9/24" fractions/
// dates), further segments may be alnum+hyphen. Anchored on a leading boundary so "and/or" style
// mid-word slashes do not match.
const ROUTE_RE = /(^|[\s(>"'.,])(\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*)\b/g;
// (c) FLAG-only: the bare word "verified".
const VERIFIED_RE = /\bverified\b/gi;

// A ±25-char context window around a hit, whitespace-collapsed, so a held row shows WHERE it leaked.
function snippetAt(text, index, len) {
  return String(text).slice(Math.max(0, index - 25), index + len + 25).replace(/\s+/g, ' ').trim();
}

// detectPipelineLeak(articles) -> { findings, flags }
//   articles: [{ slug, headline?, body }]
//   findings: BLOCK hits (class 'PIPELINE_LEAK') -- phrase + route. Fed to decideGate by runGate.
//   flags:    FLAG hits (class 'PIPELINE_LEAK_FLAG') -- 'verified'. Logged only, NEVER blocks.
// PURE. An absent/empty articles list -> no hits.
export function detectPipelineLeak(articles) {
  const findings = [];
  const flags = [];

  for (const art of (articles || [])) {
    if (!art) continue;
    const slug = art.slug;
    const headline = art.headline ? String(art.headline) : '';
    const body = art.body ? String(art.body) : '';
    const combined = headline + '\n' + body;
    const combinedLower = combined.toLowerCase();

    // (a) BLOCK -- pipeline/meta phrases over headline + body (every occurrence).
    for (const phrase of PIPELINE_LEAK_PHRASES) {
      let i = combinedLower.indexOf(phrase);
      while (i !== -1) {
        findings.push({
          class: 'PIPELINE_LEAK',
          kind: 'phrase',
          matched: phrase,
          verbatim: snippetAt(combined, i, phrase.length),
          slug,
        });
        i = combinedLower.indexOf(phrase, i + phrase.length);
      }
    }

    // (b) BLOCK -- bare route paths in body prose (markdown links + URLs stripped first).
    const prose = body.replace(MD_LINK_RE, ' ').replace(URL_RE, ' ');
    let m;
    ROUTE_RE.lastIndex = 0;
    while ((m = ROUTE_RE.exec(prose)) !== null) {
      const path = m[2];
      findings.push({
        class: 'PIPELINE_LEAK',
        kind: 'route',
        matched: path,
        verbatim: snippetAt(prose, m.index, m[0].length),
        slug,
      });
    }

    // (c) FLAG -- the word "verified" over headline + body (log only, never blocks).
    let v;
    VERIFIED_RE.lastIndex = 0;
    while ((v = VERIFIED_RE.exec(combined)) !== null) {
      flags.push({
        class: 'PIPELINE_LEAK_FLAG',
        kind: 'verified',
        matched: 'verified',
        verbatim: snippetAt(combined, v.index, 'verified'.length),
        slug,
      });
    }
  }

  return { findings, flags };
}
