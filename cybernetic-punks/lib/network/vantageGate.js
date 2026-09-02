// lib/network/vantageGate.js
// VANTAGE discourse-honesty gate -- Phase 1: DETECTION + flag-for-review (per Fable Q1).
// PURE + node-testable leaf module (no imports, no I/O), so it can run in the gen scripts
// and in vantageGate.test.mjs identically. It NEVER blocks or auto-anything: it produces
// flags a HUMAN reviews. VANTAGE stays is_published:false + human-approved this whole phase;
// the gate is the structural backstop that must exist BEFORE any Phase-2 automation removes
// that human. Fable Q1's three tiers:
//   TIER 1 attribution-survival  -- already STRUCTURAL (creator_info + source_url columns ->
//                                   the DiscourseArticle "Sourced from X" bar). Here we expose
//                                   it so a test can ASSERT a dropped-source case fails.
//   TIER 2 per-claim attribution -- DETECT CNP-voiced reception/settled claims lacking a nearby
//                                   attribution cue -> flag. (Detection, not block: judgment call.)
//   TIER 3 unverifiable stats    -- DETECT stat-shaped numbers NOT present verbatim in the vetted
//                                   source_text (and not dates/labels) -> flag. (The July
//                                   "2,263/50,000" check, now automated-to-flag.)

// ---------------------------------------------------------------------------
// Shared text helpers (mirror the DiscourseArticle renderer's markdown handling).
// ---------------------------------------------------------------------------
function stripInline(s) {
  return String(s || '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .replace(/\*\*/g, '')                     // **bold** markers
    .trim();
}

// Body -> sentences. Skips **HEADER** lines (their own line), strips inline markdown,
// splits paragraphs on sentence terminators. A header is never a "claim" to attribute.
function splitSentences(body) {
  var out = [];
  var paras = String(body || '').split(/\n+/);
  for (var i = 0; i < paras.length; i++) {
    var line = paras[i].trim();
    if (!line) continue;
    if (/^\*\*.+\*\*$/.test(line)) continue; // section header line -> not a claim
    var clean = stripInline(line);
    var parts = clean.split(/(?<=[.!?])\s+/); // sentence-ish
    for (var j = 0; j < parts.length; j++) {
      var s = parts[j].trim();
      if (s) out.push(s);
    }
  }
  return out;
}

// All normalized digit-runs in a text (commas/decimals stripped) -> Set. Used to test
// whether a body number is present VERBATIM in the vetted source_text.
function digitRuns(text) {
  var set = new Set();
  var m = String(text || '').match(/\d[\d,\.]*/g) || [];
  for (var i = 0; i < m.length; i++) {
    var key = m[i].replace(/[,\.]/g, '');
    if (key) set.add(key);
  }
  return set;
}

function contextAround(text, idx, raw) {
  var start = Math.max(0, idx - 32);
  var end = Math.min(text.length, idx + raw.length + 32);
  return (start > 0 ? '...' : '') + text.slice(start, end).trim() + (end < text.length ? '...' : '');
}

// ---------------------------------------------------------------------------
// TIER 1 -- attribution-survival (structural). Mirrors components/DiscourseArticle.js:
// the "Sourced from X on Y" bar is emitted BY CONSTRUCTION from creator_info.name +
// source_url, so survival == those columns carrying a reference. survives=false is the
// dropped-source failure a test must be able to catch.
// ---------------------------------------------------------------------------
function sourceLabelFor(row) {
  var s = String((row && row.source) || '').trim();
  if (s) return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  var u = String((row && row.source_url) || '').toLowerCase();
  if (u.indexOf('youtube') !== -1 || u.indexOf('youtu.be') !== -1) return 'YouTube';
  if (u.indexOf('twitch') !== -1) return 'Twitch';
  if (u.indexOf('x.com') !== -1 || u.indexOf('twitter') !== -1) return 'X';
  if (u.indexOf('reddit') !== -1) return 'Reddit';
  return '';
}

export function sourceReference(row) {
  row = row || {};
  var ci = row.creator_info || {};
  var hasName = !!(ci.name && String(ci.name).trim());
  var hasUrl = !!(row.source_url && String(row.source_url).trim());
  var srcLabel = sourceLabelFor(row);
  var sourcedText = hasName
    ? ('Sourced from ' + String(ci.name).trim() + (srcLabel ? ' on ' + srcLabel : ''))
    : (srcLabel ? ('Sourced from the original ' + srcLabel + ' post') : 'Sourced from the original post');
  return {
    hasName: hasName,
    hasUrl: hasUrl,
    isLinked: hasUrl,            // the bar renders as an <a> to source_url when present
    survives: hasName || hasUrl, // a named creator OR a real source link carries the reference
    sourcedText: sourcedText,
  };
}

// ---------------------------------------------------------------------------
// TIER 2 -- per-claim attribution detector. Tuned to the HIGH-SIGNAL failure class Fable
// named: reception/reality claims stated in CNP's OWN voice (settled-language) without a
// nearby attribution cue. This is the July "largely settled" slip. It deliberately does
// NOT try to flag every declarative sentence (that would be noise -- VANTAGE's framing of
// why the discourse matters is legitimately hers); it fires only when an assertion cue is
// present AND no attribution cue is. Flag-for-review, never a block.
// ---------------------------------------------------------------------------
var ATTRIBUTION_CUES = [
  ' says', ' said', ' say ', ' argues', ' argued', ' argue ', ' claims', ' claimed',
  ' contends', ' notes', ' noted', ' points out', ' pointed out', ' believes',
  ' calls ', ' called ', ' describes', ' described', 'according to', 'in his read',
  'in her read', 'in their read', 'by his account', 'by her account', 'by their account',
  'his view', 'her view', 'their view', 'his take', 'her take', 'their take',
  'reportedly', ' insists', ' maintains', ' suggests', ' reckons', ' wrote',
  ' posted', ' tweeted', ' streamed', 'the community', 'players argue', 'players say',
  ' critics', 'many argue', 'many say', 'many players', 'some argue', 'some say',
  ' fans ', 'prevailing', 'widely held', 'per his', 'per her', 'per their',
];
var ASSERTION_CUES = [
  'largely settled', 'is settled', 'are settled', 'the consensus', 'consensus is',
  ' obvious', ' obviously', 'undisputed', 'no one disputes', 'nobody disputes',
  'largely agreed', 'widely agreed', 'everyone knows', 'everyone agrees',
  "it's clear", 'it is clear', ' clearly ', 'definitively', 'established fact',
  ' proven ', 'the truth is', 'in reality', 'without question', 'unquestionably',
  'universally', 'generally accepted', 'well-established', 'no debate', 'beyond dispute',
  'indisputable', 'the fact is', ' plainly ', 'no doubt that', 'needless to say',
];

function hasCue(lc, cues) {
  for (var i = 0; i < cues.length; i++) {
    if (lc.indexOf(cues[i]) !== -1) return cues[i].trim();
  }
  return null;
}

export function detectUnattributedClaims(body) {
  var flags = [];
  var sentences = splitSentences(body);
  for (var i = 0; i < sentences.length; i++) {
    var s = sentences[i];
    var lc = ' ' + s.toLowerCase() + ' '; // pad so ' says'/' fans ' boundary cues match at edges
    var assertion = hasCue(lc, ASSERTION_CUES);
    if (!assertion) continue;               // only reception/settled-language is in scope
    var attribution = hasCue(lc, ATTRIBUTION_CUES);
    if (attribution) continue;              // attributed -> allowed (Fable rule 5)
    flags.push({
      tier: 2,
      kind: 'unattributed-claim',
      cue: assertion,
      sentence: s,
      note: 'reception/settled-language stated in CNP voice with no nearby attribution cue',
    });
  }
  return flags;
}

// ---------------------------------------------------------------------------
// TIER 3 -- unverifiable-stat detector. Flags stat-shaped numbers (percentages, comma-
// grouped or 4+ digit counts, magnitude suffixes, "<n> players/viewers/..." metrics) that
// are NOT present verbatim in the vetted source_text -- excluding dates, years, and
// version/label numbers. A number that IS in the source is excluded (the human vetted the
// source); a number that is NOT is exactly the fabricated-stat surface (the July 2,263).
// Flag-for-review: the human confirms the source-verbatim question the flag raises.
// ---------------------------------------------------------------------------
var METRIC_NOUNS = 'players|concurrent|viewers|subscribers|subs|followers|wins|losses|kills|deaths|matches|games|hours|downloads|copies|units|k\\/d|kd|mmr|elo';
var STAT_RE = new RegExp('(\\d[\\d,]*(?:\\.\\d+)?)(\\s?%|\\s?(?:k|m|million|thousand|billion|' + METRIC_NOUNS + '))?', 'gi');
var MONTHS_RE = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*$/i;
var LABEL_RE = /(season|phase|chapter|act|tier|week|day|version|patch|update|level|mw|cod|no\.|#)\s*$/i;

// Shared stat-shape scan -- the primitive BOTH Tier 3 and A11 check (1) build on, so the
// stat-shape logic lives in ONE place. Strips [text](url) links + **bold** via stripInline
// FIRST (so a tweet-ID inside a source URL is never seen -- the MrMarvelTV baseline depends
// on this), then finds stat-shaped numbers, excluding bare years, version/label numbers
// ("Season 2", "#3") and month-day ("October 23"). When srcKeys is passed (Tier 3), numbers
// present verbatim in the vetted source are ALSO excluded; A11 check (1) passes NO srcKeys,
// so ANY stat-shaped number in the prose survives. Returns [{ token, context }].
function scanStatShaped(body, srcKeys) {
  var text = stripInline(body);
  var out = [];
  var m;
  STAT_RE.lastIndex = 0;
  while ((m = STAT_RE.exec(text)) !== null) {
    var numPart = m[1];
    var suffix = (m[2] || '').trim().toLowerCase();
    var key = numPart.replace(/[,\.]/g, '');
    if (!key) continue;
    var before = text.slice(Math.max(0, m.index - 14), m.index);
    var bareYear = !suffix && /^(?:19|20)\d{2}$/.test(numPart.replace(/,/g, ''));
    if (bareYear) continue;
    if (LABEL_RE.test(before)) continue;       // "Season 2", "Patch 4", "#3"
    if (MONTHS_RE.test(before)) continue;      // "October 23"
    if (srcKeys && srcKeys.has(key)) continue; // Tier 3 ONLY: verbatim in the vetted source
    // Stat-shaped == has a %/unit/metric suffix, OR is comma-grouped, OR is a 4+ digit count.
    var statShaped = !!suffix || /,/.test(numPart) || key.length >= 4;
    if (!statShaped) continue;
    out.push({ token: m[0].trim(), context: contextAround(text, m.index, m[0]) });
  }
  return out;
}

export function detectUnverifiedStats(body, sourceText) {
  var srcKeys = digitRuns(sourceText);
  return scanStatShaped(body, srcKeys).map(function (s) {
    return {
      tier: 3,
      kind: 'unverified-stat',
      token: s.token,
      context: s.context,
      note: 'stat-shaped number not found verbatim in the vetted source_text -- confirm before surfacing',
    };
  });
}

// ---------------------------------------------------------------------------
// Orchestrator -- run all three tiers on a draft row {headline, body, creator_info,
// source_url, source}. sourceText is the vetted directive.source_text. Returns a
// review report; needsReview is advisory (flags exist / attribution dropped), NEVER a block.
// ---------------------------------------------------------------------------
export function runVantageGate(row, sourceText) {
  row = row || {};
  var tier1 = sourceReference(row);
  var tier2 = detectUnattributedClaims(row.body);
  var tier3 = detectUnverifiedStats(row.body, sourceText);
  var flagCount = tier2.length + tier3.length + (tier1.survives ? 0 : 1);
  return {
    tier1: tier1,
    tier2: tier2,
    tier3: tier3,
    flagCount: flagCount,
    needsReview: flagCount > 0,
  };
}

// A11 ENFORCING verdict -- ROW-ONLY (no sourceText needed), per doctrine amendment A11
// (docs/doctrine-v3-amendments.md, recorded at commit 7176d46). This is what the publish
// chokepoint (app/api/admin/drafts/approve) enforces; runVantageGate above stays
// detection-only for the gen-script print. Three checks:
//   (1) STAT-SHAPED SENTENCE -> HARD BLOCK. VANTAGE is structurally storeless, so ANY
//       stat-shaped number in her prose is laundered or unverifiable -- both disqualifying
//       (A11 check 1). Uses scanStatShaped WITH stripInline URL/ID stripping + date/
//       version-label exclusions KEPT, but WITHOUT Tier 3's in-source exclusion (A11: ANY
//       number holds). Runs on the HEADLINE and the BODY.
//   (2) ATTRIBUTION-SURVIVAL -> REVIEW-HOLD (overridable): the "Sourced from" reference
//       dropped (Tier 1 survives=false), or a settled-language reception claim stated in the
//       body without attribution (Tier 2).
//   (3) HEADLINE ATTRIBUTION -> REVIEW-HOLD (overridable, hard-leaning): a settled-language
//       claim in the HEADLINE without attribution (the Tier-2 detector run on the headline).
//       Dial-able to a broader headline-claim detector later.
// BASELINE the gate MUST NOT hard-block: the real MrMarvelTV discourse draft (feed_items,
// body ~2653 chars) -> hardBlock=false, zero reviewHolds. Its source-URL tweet-ID is removed
// by stripInline, so check (1) never false-positives on it.
export function runA11Gate(row) {
  row = row || {};
  var statHits = scanStatShaped(row.headline || '', null).concat(scanStatShaped(row.body || '', null));
  var tier1 = sourceReference(row);
  var bodyClaims = detectUnattributedClaims(row.body);
  var headlineClaims = detectUnattributedClaims(row.headline);
  var reviewHolds = [];
  if (!tier1.survives || bodyClaims.length > 0) reviewHolds.push('attribution-survival');
  if (headlineClaims.length > 0) reviewHolds.push('headline-attribution');
  return {
    hardBlock: statHits.length > 0,
    hardBlockCheck: statHits.length > 0 ? 'stat-shaped-sentence' : null,
    statHits: statHits,
    reviewHolds: reviewHolds,
    detail: { tier1: tier1, bodyClaims: bodyClaims, headlineClaims: headlineClaims },
  };
}

// Human-facing report string for the gen scripts (printed next to the draft). Advisory only.
export function formatGateReport(result) {
  var L = [];
  L.push('===== VANTAGE HONESTY GATE (Phase 1 -- DETECTION, human reviews; NOT a block) =====');
  L.push('TIER 1 attribution-survival: ' + (result.tier1.survives
    ? 'OK -- ' + (result.tier1.isLinked ? 'linked ' : '') + '"' + result.tier1.sourcedText + '"'
    : 'FAIL -- no creator name AND no source_url; the "Sourced from" bar would be anonymous'));
  if (result.tier2.length === 0) {
    L.push('TIER 2 per-claim attribution: OK -- no unattributed reception/settled claims detected');
  } else {
    L.push('TIER 2 per-claim attribution: ' + result.tier2.length + ' FLAG(S) for review:');
    result.tier2.forEach(function (f) { L.push('  - [' + f.cue + '] ' + f.sentence); });
  }
  if (result.tier3.length === 0) {
    L.push('TIER 3 unverifiable stats: OK -- no stat-shaped numbers outside the vetted source');
  } else {
    L.push('TIER 3 unverifiable stats: ' + result.tier3.length + ' FLAG(S) for review:');
    result.tier3.forEach(function (f) { L.push('  - "' + f.token + '"  in: ' + f.context); });
  }
  L.push('SUMMARY: ' + (result.needsReview
    ? result.flagCount + ' item(s) for the human to review before approving.'
    : 'no flags -- still requires human approval (Phase 1: nothing auto-publishes).'));
  L.push('====================================================================================');
  return L.join('\n');
}
