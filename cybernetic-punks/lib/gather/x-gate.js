// lib/gather/x-gate.js
// DETERMINISTIC gate for X posts -- the cheap first pass BEFORE any VANTAGE step.
// Implements the Stage-1 inline spec exactly: STRICT / skip-aggressive. Zero
// qualifying posts is a CORRECT outcome. Substance + copyright, never length.
//
// Nothing here calls an API or writes anything -- pure functions over already-pulled
// posts. All thresholds are tunable named constants; they start OVER-strict and are
// loosened only with data, never the reverse.
//
// Exports:
//   isGameRelevant(text, relevance)      -> bool  (X-shaped reuse of the video relevance rule)
//   preFilter(post, relevance)           -> { pass, reason? }   deterministic drop gate
//   depthScore(metrics)                  -> number (replies+quotes WEIGHTED OVER likes)
//   totalEngagement(metrics)             -> number
//   accountBaseline(posts)               -> { median, count }   (from posts already pulled)
//   expansionTrigger(post, baseline)     -> { expand, why }     Floor AND (depth OR spike)
//   qualifies(post)                      -> { qualifies, reason }  substance A + B

// ── TUNABLE CONSTANTS (over-strict start) ────────────────────────────────────
export var MIN_MEANINGFUL_WORDS = 8;   // below this + no reasoning signal -> one-liner drop
export var MIN_COVERABLE_WORDS  = 6;   // below this, an article would be >50% reprint -> drop
export var FLOOR_ENGAGEMENT     = 25;  // absolute floor: replies+quotes+likes must clear this
export var DEPTH_MIN            = 8;    // conversation-depth score needed to read a thread
export var DEPTH_REPLY_WEIGHT   = 2;    // replies weight
export var DEPTH_QUOTE_WEIGHT   = 3;    // quotes weighted OVER replies; likes excluded (weakest)
export var SPIKE_MULTIPLIER     = 3;    // account-spike: post engagement >= N x account median
export var MIN_BASELINE_POSTS   = 4;    // fewer pulled posts than this -> baseline too thin

// Bare-reaction skip-list: a post that is ONLY these (or emoji/punctuation) has no
// claim to characterize. Kept lowercase; matched against the whole normalized text.
export var BARE_REACTIONS = [
  'w', 'l', 'w take', 'l take', 'this', 'this sucks', 'peak', 'based', 'real', 'facts',
  'lol', 'lmao', 'lmfao', 'fr', 'frfr', 'same', 'no', 'yes', 'yep', 'nope', 'ratio',
  'cope', 'seethe', 'mid', 'trash', 'goated', 'goat', 'ez', 'gg', 'rip', 'sheesh',
  'nah', 'yikes', 'oof', 'this', 'exactly', 'preach', 'agreed', 'true', 'valid',
];

// Reasoning signals: words that mark a CLAIM / argument rather than a bare phrase.
// Presence lets a shortish post through the one-liner gate (it is saying something).
var REASONING_SIGNALS = [
  'because', 'since', 'so', 'therefore', 'if', 'when', 'means', 'why', 'vs', 'versus',
  'better', 'worse', 'stronger', 'weaker', 'should', 'shouldnt', 'needs', 'problem',
  'issue', 'broken', 'underrated', 'overrated', 'buff', 'nerf', 'nerfed', 'buffed',
  'meta', 'tier', 'viable', 'balance', 'balanced', 'op', 'busted', 'counter', 'build',
  'loadout', 'strategy', 'actually', 'the reason', 'imo', 'take', 'wrong', 'right',
];

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')      // strip urls (t.co etc.) -- not substance
    .replace(/[@#]\w+/g, ' ')             // strip mentions/hashtags for the word count
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordsOf(norm) {
  return norm ? norm.split(' ').filter(Boolean) : [];
}

function hasReasoningSignal(norm) {
  for (var i = 0; i < REASONING_SIGNALS.length; i++) {
    if (norm.indexOf(REASONING_SIGNALS[i]) !== -1) return true;
  }
  return false;
}

// X-shaped reuse of the video relevance rule (mirrors lib/gather/relevance.js intent):
// KEEP only if a strong game token appears, OR the ambiguous term is PAIRED with a
// gaming-context token. No relevance config -> cannot judge -> treat as NOT relevant
// (strict: a game we cannot scope should not pull open-ended search noise).
export function isGameRelevant(text, relevance) {
  if (!relevance) return false;
  var hay = ' ' + normalize(text) + ' ';
  var strong = relevance.gameTokens || [];
  for (var i = 0; i < strong.length; i++) {
    if (hay.indexOf(' ' + String(strong[i]).toLowerCase()) !== -1) return true;
  }
  var amb = relevance.ambiguousTerm ? String(relevance.ambiguousTerm).toLowerCase() : null;
  if (amb && hay.indexOf(amb) !== -1) {
    var ctx = relevance.contextTokens || [];
    for (var j = 0; j < ctx.length; j++) {
      if (hay.indexOf(String(ctx[j]).toLowerCase()) !== -1) return true;
    }
  }
  return false;
}

function drop(reason) { return { pass: false, reason: reason }; }

// PRE-FILTER -- deterministic drops, each with a reason label for the dry-run report.
// Order: emoji/bare -> off-topic -> media-only-thin -> one-liner -> too-thin-to-cover.
export function preFilter(post, relevance) {
  var text = String(post && post.text || '').trim();
  var norm = normalize(text);
  var words = wordsOf(norm);

  // Emoji-only / punctuation-only: no letters or digits at all.
  if (!/[a-z0-9]/i.test(text)) return drop('bare-reaction');

  // Bare reaction: the whole normalized text is a known reaction phrase, or <=2 words
  // that are all bare-reaction tokens.
  if (BARE_REACTIONS.indexOf(norm) !== -1) return drop('bare-reaction');
  if (words.length <= 2 && words.every(function (w) { return BARE_REACTIONS.indexOf(w) !== -1; })) {
    return drop('bare-reaction');
  }

  // Off-topic / name-collision: fails the X-shaped relevance rule.
  if (!isGameRelevant(text, relevance)) return drop('off-topic');

  // Media-primary with thin text: substance lives in an image/clip we cannot read.
  if (post && post.has_media && words.length < MIN_MEANINGFUL_WORDS) {
    return drop('media-only-thin');
  }

  // One-liner with no reasoning: short AND makes no claim we could characterize.
  if (words.length < MIN_MEANINGFUL_WORDS && !hasReasoningSignal(norm)) {
    return drop('one-liner-no-reasoning');
  }

  // Too thin to cover without reproducing: so short that any article would be >50%
  // reprint of the post + invented padding. Copyright + substance both fail here.
  if (words.length < MIN_COVERABLE_WORDS) {
    return drop('too-thin-to-cover-without-reproducing');
  }

  return { pass: true };
}

// ── EXPANSION (popularity-TRIGGERED, substance-GATED) ────────────────────────
// FIREWALL: these only decide whether to READ a thread. They NEVER qualify a draft.
export function totalEngagement(m) {
  m = m || {};
  return (m.replies || 0) + (m.quotes || 0) + (m.likes || 0);
}

// Conversation depth: replies + quotes, WEIGHTED OVER likes (likes are NOT counted --
// they are the weakest signal per the spec).
export function depthScore(m) {
  m = m || {};
  return (m.replies || 0) * DEPTH_REPLY_WEIGHT + (m.quotes || 0) * DEPTH_QUOTE_WEIGHT;
}

// Account baseline from posts ALREADY pulled (no extra API calls): median total
// engagement across this account's pulled posts.
export function accountBaseline(posts) {
  var vals = (posts || []).map(function (p) { return totalEngagement(p.metrics); }).sort(function (a, b) { return a - b; });
  if (!vals.length) return { median: 0, count: 0 };
  var mid = Math.floor(vals.length / 2);
  var median = vals.length % 2 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
  return { median: median, count: vals.length };
}

// Expansion trigger (Justin's rule): Floor AND (conversation-depth OR account-spike).
// Thin baseline (< MIN_BASELINE_POSTS) -> fall back to floor + depth only (no spike).
export function expansionTrigger(post, baseline) {
  var eng = totalEngagement(post.metrics);
  var floorOk = eng >= FLOOR_ENGAGEMENT;
  if (!floorOk) return { expand: false, why: 'below-floor (' + eng + ' < ' + FLOOR_ENGAGEMENT + ')' };

  var depth = depthScore(post.metrics);
  var depthOk = depth >= DEPTH_MIN;

  var spikeOk = false;
  var thinBaseline = !baseline || baseline.count < MIN_BASELINE_POSTS || !baseline.median;
  if (!thinBaseline) spikeOk = eng >= SPIKE_MULTIPLIER * baseline.median;

  if (depthOk || spikeOk) {
    var reasons = [];
    if (depthOk) reasons.push('depth ' + depth + ' >= ' + DEPTH_MIN);
    if (spikeOk) reasons.push('spike ' + eng + ' >= ' + SPIKE_MULTIPLIER + 'x median ' + baseline.median);
    if (thinBaseline) reasons.push('(baseline thin -> floor+depth only)');
    return { expand: true, why: 'floor ok (' + eng + ') AND ' + reasons.join(' / ') };
  }
  return { expand: false, why: 'floor ok but no depth (' + depth + ') / no spike' + (thinBaseline ? ' [baseline thin]' : '') };
}

// ── SUBSTANCE (A + B) -- decides eligibility AFTER any expansion ──────────────
// Runs on the post's EFFECTIVE text (anchor text, or thread_text once expanded).
// A: states a real position -- standalone take (reasoning) OR quote+position.
// B: enough to CHARACTERIZE without reproducing (>= MIN_MEANINGFUL_WORDS of substance).
// A thread anchor with no expanded thread cannot yet qualify (its substance is unread).
export function qualifies(post) {
  var effective = (post.thread_text && post.thread_text.trim()) ? post.thread_text : post.text;
  var norm = normalize(effective);
  var words = wordsOf(norm);

  if (post.is_thread_anchor && !(post.thread_text && post.thread_text.trim())) {
    return { qualifies: false, reason: 'thread-anchor-unexpanded (substance lives in the unread thread)' };
  }
  if (words.length < MIN_MEANINGFUL_WORDS) {
    return { qualifies: false, reason: 'insufficient-substance (' + words.length + ' words)' };
  }
  var isQuotePosition = !!post.is_quote && hasReasoningSignal(norm);
  var isStandaloneTake = hasReasoningSignal(norm);
  if (!isStandaloneTake && !isQuotePosition) {
    return { qualifies: false, reason: 'no-characterizable-position (no claim/reasoning to write about)' };
  }
  return { qualifies: true, reason: post.thread_text ? 'thread take (expanded)' : (isQuotePosition ? 'quote+position' : 'standalone take') };
}
