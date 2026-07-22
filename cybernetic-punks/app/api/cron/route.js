import { callEditor, buildMirandaPrompt, generateArticleComments } from '@/lib/editorCore';
import { notifyIntelFeed, notifyMetaUpdate, notifyPatchNotes, notifyRankedIntel } from '@/lib/discord';
import { sendCronFailureAlert } from '@/lib/alertEmail';
import { createClient } from '@supabase/supabase-js';
import { gatherAll } from '@/lib/gather/index';
import { getGameConfig } from '@/lib/games';
import { precomputeHistoricalContext, fetchHistoricalContext, formatHistoricalContextBlock } from '@/lib/gather/historicalContext';
import { precomputeQualityMetrics } from '@/lib/qualityMetrics';
import { logCoverageShadow } from '@/lib/coverageShadow';
import { frameHeadline, finalizeKeywordMatch } from '@/lib/keywordFraming';
import { emitKeywordHeartbeat } from '@/lib/keywordHeartbeat';
import { topicTokens, buildIdfMap } from '@/lib/topicTokens';

export const dynamic = 'force-dynamic';

// The game this cron cycle is producing for. Gap 2 Phase A: sourced from the
// per-game config registry (lib/games) instead of a bare literal. Drives the
// gather sources, the relevance filter, fetchGameContext scoping, the editor
// roster, and the game_slug stamped on inserts + no-repeat/synthesis reads, so
// a DMZ editor would read DMZ's prior articles, not Marathon's. Marathon today;
// the cron becomes per-game (query param + its own cron entry) in Phase D.
var PRODUCING_GAME = getGameConfig();
var PRODUCING_GAME_SLUG = PRODUCING_GAME.slug;

var TIER_ORDINAL = { S: 5, A: 4, B: 3, C: 2, D: 1 };

function tierOrdinal(tier) {
  return TIER_ORDINAL[tier] || 0;
}

// Shell tier is a DETERMINISTIC CODE FACT, not a model output (2026-07-20). The
// prompt rule was "tier = the HIGHER of ranked_tier_solo and ranked_tier_squad",
// which is a mechanical max() the model kept performing (and twice defaulted to a
// confident 'A' when both inputs were null -- Rook, Sentinel). Those inputs live
// only in shell_stats now, so tier is derived here from the source of truth.
//
// EXPLICIT NULL when there is no basis: both inputs null -> null tier (the shell
// is not on the ranked ladder). NO 'B' default -- that default is exactly what
// this replaces. Weapons are a DIFFERENT case (no solo/squad exists) and keep
// their model-authored tier; this is shell-only.
function deriveShellTier(solo, squad) {
  var candidates = [solo, squad].filter(function(v) {
    return v != null && TIER_ORDINAL[v] !== undefined;
  });
  if (candidates.length === 0) return null;
  return candidates.sort(function(a, b) { return TIER_ORDINAL[b] - TIER_ORDINAL[a]; })[0];
}

function computeTrend(newTier, oldTier) {
  if (!oldTier) return 'stable';
  var diff = tierOrdinal(newTier) - tierOrdinal(oldTier);
  if (diff > 0) return 'up';
  if (diff < 0) return 'down';
  return 'stable';
}

function generateSlug(headline) {
  var base = headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 70);
  var hash = Date.now().toString(36).slice(-4);
  return base + '-' + hash;
}

function patchKey(patchItems) {
  if (!patchItems || patchItems.length === 0) return null;
  var title = (patchItems[0].title || '').toLowerCase().slice(0, 60);
  return title || null;
}

function isTwitchContent(result) {
  if (result.source_type === 'twitch') return true;
  var tags = (result.tags || []).map(function(t) { return t.toLowerCase(); });
  if (tags.some(function(t) { return t.includes('twitch') || t.includes('clip'); })) return true;
  var headline = (result.headline || '').toLowerCase();
  if (headline.includes('clip') || headline.includes('twitch')) return true;
  return false;
}

// Extract the YouTube id from a watch/embed/youtu.be URL -- mirrors the article
// template's extractYouTubeId. Used to compare a pool clip against an editor's
// recently-used source videos for the cross-cycle no-repeat.
function youtubeIdFromUrl(url) {
  if (!url) return null;
  var m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function resolveMediaInfo(result, rawData, editorName) {
  var videoId = result.source_video_id || null;
  var isTwitch = isTwitchContent(result);

  if (isTwitch && rawData.twitchClips && rawData.twitchClips.length > 0) {
    if (videoId) {
      var exactMatch = rawData.twitchClips.find(function(c) { return c.id === videoId; });
      if (exactMatch) return { thumbnail: exactMatch.thumbnail, source_url: exactMatch.clip_url, source: 'TWITCH' };
      var partialMatch = rawData.twitchClips.find(function(c) {
        return c.id.includes(videoId) || videoId.includes(c.id);
      });
      if (partialMatch) return { thumbnail: partialMatch.thumbnail, source_url: partialMatch.clip_url, source: 'TWITCH' };
    }
    var topClip = rawData.twitchClips[0];
    return { thumbnail: topClip.thumbnail, source_url: topClip.clip_url, source: 'TWITCH' };
  }

  if (videoId && !isTwitch && videoId.length >= 8) {
    return {
      thumbnail: 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg',
      source_url: 'https://www.youtube.com/watch?v=' + videoId,
      source: 'YOUTUBE',
    };
  }

  // Pool fallback for the two editors that attach a trending clip when their
  // article did not center on a specific video. Give each a DIFFERENT pool slot
  // so two SAME-CYCLE fallbacks stop landing on the identical top clip (the
  // incidental-clustering root cause): NEXUS -> [0], DEXTER -> [1]. When the pool
  // holds only one entry, DEXTER degrades to [0] (unavoidable on a thin cycle).
  // Only these two editors reach this branch -- CIPHER/GHOST null source_url
  // downstream and MIRANDA carries its own source_url. An editor whose result
  // named a specific video already returned above (source_video_id branch), so
  // this only diversifies the no-specific-video DEFAULT; every article that got a
  // clip still gets one, and the emitted source_url shape is unchanged (the
  // article template's extractYouTubeId keeps parsing it).
  var POOL_SLOT = { NEXUS: 0, DEXTER: 1 };
  if (POOL_SLOT[editorName] !== undefined && rawData.youtubeVideos && rawData.youtubeVideos.length > 0) {
    var pool = rawData.youtubeVideos;
    var slot = Math.min(POOL_SLOT[editorName], pool.length - 1);
    var poolVideo = pool[slot];
    // Cross-cycle no-repeat: from this editor's slot FORWARD, prefer the first
    // pool clip it did NOT use in its recent window (rawData.recentVideoIds), so a
    // clip that stays top-of-pool for days stops recurring across daily cycles.
    // Scanning from `slot` (not 0) preserves the same-cycle separation -- DEXTER
    // still starts at [1], never reaching for NEXUS's [0]. If every clip from the
    // slot onward was recently used (or there is no history), keep the slot clip:
    // a repeat beats no clip. Per-editor history only, so this stays race-free
    // across the parallel editors.
    var recentIds = (rawData.recentVideoIds && rawData.recentVideoIds[editorName]) || [];
    if (recentIds.length > 0) {
      for (var k = slot; k < pool.length; k++) {
        if (recentIds.indexOf(pool[k].youtube_id) === -1) { poolVideo = pool[k]; break; }
      }
    }
    return {
      thumbnail: poolVideo.thumbnail || 'https://img.youtube.com/vi/' + poolVideo.youtube_id + '/hqdefault.jpg',
      source_url: 'https://www.youtube.com/watch?v=' + poolVideo.youtube_id,
      source: 'YOUTUBE',
    };
  }

  return { thumbnail: null, source_url: null, source: 'YOUTUBE' };
}

function buildNoRepeatBlock(headlines) {
  if (!headlines || headlines.length === 0) return '';
  return (
    '\n\n--- TOPICS YOU ALREADY COVERED -- DO NOT REPEAT THESE ANGLES ---\n' +
    headlines.map(function(h, i) { return (i + 1) + '. ' + h; }).join('\n') +
    '\nChoose a completely different weapon, shell, strategy, or topic this cycle. ' +
    'If the source material overlaps with a previous topic, find a fresh angle within it. ' +
    'Never reuse an exact title from the list above -- your headline must be a distinct string, not one already used.\n' +
    'This list is INTERNAL editorial guidance ONLY. Never mention, reference, or narrate it in the article -- ' +
    'no "I already covered...", no "the previous article covered...", no "this cycle we\'re doing X instead". ' +
    'Just write the fresh piece on the different angle; the reader must never see that a no-repeat rule shaped it.\n---'
  );
}

// Forward-only publish guards (prevent duplicate-title + empty-body articles).
// MIN_BODY_WORDS: an article below this is treated as empty/near-empty and is NOT
// published. The floor sits well under the shortest LEGITIMATE content (~82-word
// GHOST community blurbs), so it only catches broken/empty bodies, never real
// short pieces. normalizeTitle: case/whitespace-insensitive compare for the exact-
// title collision guard.
var MIN_BODY_WORDS = 50;
function wordCount(s) { return (s || '').trim().split(/\s+/).filter(Boolean).length; }
function normalizeTitle(t) { return (t || '').toLowerCase().replace(/\s+/g, ' ').trim(); }

// ── NEAR-DUPLICATE EVERGREEN GUARD (MIRANDA) ────────────────────────────────
// The exact-title check above only catches BYTE-identical repeats inside the
// recent window. The real re-mint failure it misses: the SAME evergreen guide
// regenerated WEEKS apart with a reworded headline -- e.g. the 44 "Essential
// Weapon Mod Builds for New Runners" pieces published over 22 days, most of them
// outside any last-12 window. This gate compares a candidate headline's TOPIC
// against the editor's FULL recent published history and blocks a clear
// near-duplicate before it publishes.
//
// Method -- Jaccard overlap of significant headline tokens. Chosen over
// embeddings deliberately: it is simple, deterministic, dependency-free, and an
// evergreen re-mint is exactly a same-topic headline restated, so topic-word
// overlap is the right, sufficient signal. No body compare needed -- the re-mint
// headline already collides at ~1.0; the body would only echo that.
//
// Drawing the line (block dupes, never distinct angles):
//   DUP_JACCARD_THRESHOLD 0.7 -- an observed re-mint scores ~0.85-1.0 against an
//     existing piece (the cluster headlines are near-identical). A genuinely
//     distinct angle scores far lower: the shell-role weapon guide
//     ("Marathon Weapon Mods for New Runners - Combat and Extraction Builds by
//     Shell Role") tops out ~0.45 against the generic weapon-class cluster, so it
//     PASSES with a 0.25 margin. The threshold sits in the empty gap between the
//     two, and is skewed to UNDER-block: cross-phrasing variants (e.g. a
//     "Weapon Mods Guide" restatement, ~0.4) slip through to Phase 2 cleanup
//     rather than risk suppressing a real new piece.
//   DUP_MIN_SHARED_TOKENS 3 -- require real topic overlap, not a 2-word
//     coincidence spiking Jaccard on short headlines.
//   DUP_HISTORY_LIMIT 500 -- compare against the editor+game's last 500 published
//     headlines (~months of MIRANDA output) so a topic covered weeks ago is still
//     caught. The last-12 window is exactly why the re-mints slipped through.
// SUBJECT WEIGHTING (July 2026 refinement): plain Jaccard proved to over-score
// distinct per-SUBJECT variants sharing a rigid template -- the real per-weapon
// Rook builds (M77 / Repeater HPR / Twin Tap HBR) are genuinely distinct content
// but hit ~0.8 on the "Marathon Rook Build Best Ranked Solo Loadout With The..."
// boilerplate alone. Fix: weight each token by corpus rarity (IDF over the SAME
// 500-headline history the guard already fetches -- no extra query, and the
// corpus self-updates as MIRANDA publishes). Template scaffolding ("build",
// "ranked", "guide", "best") appears in dozens of headlines -> near-zero weight;
// the distinguishing subject ("m77", "repeater", "twin", "tap") appears in one
// or two -> dominant weight. Score = weighted Jaccard: idf-sum(shared) /
// idf-sum(union). Verified on production headlines: true re-mints (identical
// token sets) still score 1.0 -> blocked; the same-weapon Impact HAR dupe pair
// still collides at 1.0; distinct per-weapon Rook variants drop from ~0.8 to
// ~0.2-0.3 -> pass; -no19's distinct angle drops from 0.33 -> pass by a wider
// margin. The threshold itself is unchanged.
var DUP_JACCARD_THRESHOLD = 0.7;
var DUP_MIN_SHARED_TOKENS = 3;
var DUP_HISTORY_LIMIT = 500;

// topicTokens + buildIdfMap now live in lib/topicTokens.js (imported at the top
// of this file). They were EXTRACTED so this guard and the cross-editor
// rare-token duplicate check in lib/coverageShadow.js share ONE tokeniser --
// two copies would drift and their scores would stop being comparable.
// Behaviour is unchanged; the 0.7 threshold below is still calibrated against
// the same transform.

// Subject-weighted Jaccard: idf-sum of shared tokens / idf-sum of the union.
// `shared` stays the RAW shared-token count (the DUP_MIN_SHARED_TOKENS floor is
// about real overlap existing at all, not its weight).
function topicJaccard(tokensA, tokensB, idf) {
  if (!tokensA.length || !tokensB.length) return { score: 0, shared: 0 };
  function w(t) { return idf[t] || idf._max; }
  var setA = {};
  for (var i = 0; i < tokensA.length; i++) setA[tokensA[i]] = 1;
  var shared = 0, sharedW = 0, unionW = 0;
  for (var j = 0; j < tokensA.length; j++) unionW += w(tokensA[j]);
  for (var k = 0; k < tokensB.length; k++) {
    if (setA[tokensB[k]]) { shared++; sharedW += w(tokensB[k]); }
    else unionW += w(tokensB[k]);
  }
  return { score: unionW ? sharedW / unionW : 0, shared: shared };
}

// Read-only: return the closest published article by this editor+game whose
// topic crosses the near-duplicate threshold, or null. Never touches existing
// rows. Fail-OPEN -- a lookup error returns null (let the piece publish) so a
// transient DB blip never blocks generation.
async function findDuplicateEvergreen(supabase, editorName, gameSlug, candidateHeadline) {
  var candTokens = topicTokens(candidateHeadline);
  if (candTokens.length < DUP_MIN_SHARED_TOKENS) return null;
  try {
    var { data, error } = await supabase
      .from('feed_items')
      .select('headline, slug, created_at')
      .eq('editor', editorName)
      .eq('game_slug', gameSlug)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(DUP_HISTORY_LIMIT);
    if (error || !data) return null;
    // Corpus IDF from this same history read: template boilerplate is frequent
    // across MIRANDA's headlines -> low weight; the distinguishing subject is
    // rare -> high weight (see the subject-weighting note above the constants).
    var idf = buildIdfMap(data.map(function(r) { return r.headline || ''; }));
    var best = null;
    for (var i = 0; i < data.length; i++) {
      var existing = data[i];
      if (!existing.headline) continue;
      var cmp = topicJaccard(candTokens, topicTokens(existing.headline), idf);
      if (cmp.shared < DUP_MIN_SHARED_TOKENS) continue;
      if (cmp.score >= DUP_JACCARD_THRESHOLD && (!best || cmp.score > best.score)) {
        best = { headline: existing.headline, slug: existing.slug, created_at: existing.created_at, score: cmp.score, shared: cmp.shared };
      }
    }
    return best;
  } catch (err) {
    console.log('[CRON] ' + editorName + ' dup-check error (non-fatal, publishing): ' + err.message);
    return null;
  }
}

function buildPatchPriorityBlock(patchItems) {
  if (!patchItems || patchItems.length === 0) return '';
  return (
    '\n\n--- PRIORITY OVERRIDE: NEW OFFICIAL BUNGIE UPDATE DETECTED ---\n' +
    'The following Bungie communications were just published:\n' +
    patchItems.map(function(p) {
      return '- ' + p.title + (p.url ? ' -- ' + p.url : '');
    }).join('\n') +
    '\nYour article THIS CYCLE must reflect this update. ' +
    'For NEXUS: adjust tier placements to account for any balance changes. ' +
    'For DEXTER: flag any builds that are buffed or nerfed. ' +
    'For CIPHER: assess ranked impact -- what plays are stronger or weaker now. ' +
    'For GHOST: report the patch\'s actual contents factually from the official notes above. ' +
    'Characterize community reaction ONLY if real reactions are present in the community sources provided to you this cycle (a provided Reddit thread, a provided Steam review). ' +
    'If no community reactions to this patch are in your sources yet, say so plainly -- e.g. that the patch just landed and player reaction is not yet available -- and do NOT invent reactions, quotes, usernames, or sentiment. A short, accurate "patch just dropped, reaction pending" piece is correct; a fabricated reaction is not. ' +
    'This patch context takes priority over all other topics.\n---'
  );
}

// -- BUILD DIRECTIVE BLOCK --
// Standard directives give the editor a topic + optional URL and let it write
// from its normal sources. Creator-spotlight directives are fundamentally
// different and SAFETY-CRITICAL: they are about real, named people, so the
// editor must write STRICTLY from the vetted source_text the human provided
// and must not add, infer, or invent anything about the creator. This is the
// guard that prevents fabricated drama/quotes about real individuals.
function buildDirectiveBlock(directive) {
  if (!directive) return '';

  if (directive.directive_type === 'creator_spotlight') {
    return buildCreatorSpotlightBlock(directive);
  }

  var block = '\n\n--- EDITOR DIRECTIVE -- THIS IS YOUR ASSIGNED TOPIC THIS CYCLE ---\n';
  block += 'You have been given a specific article assignment. This overrides your normal content selection.\n\n';
  block += 'ASSIGNMENT: ' + directive.instruction + '\n';
  if (directive.url) {
    block += 'SOURCE URL: ' + directive.url + '\n';
    block += 'Visit or reference this URL in your analysis. This is the primary source for your article.\n';
  }
  block += '\nWrite your article specifically about this topic. Do not default to generic meta analysis or build content -- cover this directive directly and thoroughly.\n---';
  return block;
}

// -- BUILD CREATOR SPOTLIGHT BLOCK (SAFETY-CRITICAL) --
// The article is about a real, named content creator. The ONLY permitted
// source of facts is the vetted source_text the human editor supplied. The
// creator_info object carries the creator's name and canonical profile URLs,
// used for accurate attribution/tagging and (downstream) Person/sameAs schema.
// Hard rules: write only from source_text; never invent quotes, events,
// drama, dates, numbers, or claims not present in it; tag only the named
// creator with the provided URLs.
function buildCreatorSpotlightBlock(directive) {
  var ci = directive.creator_info || {};
  var block = '\n\n--- CREATOR SPOTLIGHT DIRECTIVE -- WRITE STRICTLY FROM VETTED SOURCE ---\n';
  block += 'This is an assigned article about a REAL, NAMED content creator. It overrides your normal content selection.\n\n';

  if (directive.instruction) {
    block += 'ANGLE / ASSIGNMENT: ' + directive.instruction + '\n\n';
  }

  block += 'VETTED SOURCE TEXT (the ONLY permitted source of facts for this article):\n';
  block += '"""\n' + (directive.source_text || '(none provided)') + '\n"""\n\n';

  if (ci.name) {
    block += 'CREATOR: ' + ci.name + '\n';
    var links = [];
    if (ci.youtube) links.push('YouTube: ' + ci.youtube);
    if (ci.x) links.push('X/Twitter: ' + ci.x);
    if (ci.twitch) links.push('Twitch: ' + ci.twitch);
    if (ci.other) links.push('Other: ' + ci.other);
    if (links.length > 0) {
      block += 'CANONICAL PROFILES (use for accurate attribution; do not alter or invent handles):\n  ' + links.join('\n  ') + '\n';
    }
  }

  if (directive.url) {
    block += 'REFERENCE URL: ' + directive.url + '\n';
  }

  block += '\nABSOLUTE RULES FOR THIS ARTICLE:\n';
  block += '1. Write ONLY from the vetted source text above. It is the single source of truth.\n';
  block += '2. Do NOT add, infer, embellish, or invent ANY fact, quote, event, date, number, claim, or piece of "drama" that is not explicitly present in the vetted source text. This article is about a real person; inventing or distorting what they said or did is strictly prohibited.\n';
  block += '3. If a detail is not in the source text, do not include it. A shorter, fully-accurate article is correct; a padded one with invented specifics is not.\n';
  block += '4. Refer to the creator by the exact name provided. Do not invent alternate handles, real names, or affiliations.\n';
  block += '5. You may write engagingly and add neutral framing/context about Marathon itself (using your verified game knowledge), but every claim ABOUT THE CREATOR or the events described must trace directly to the vetted source text.\n';
  block += '6. Do NOT inflate the creator\'s achievement beyond the source. If the source states a level or number, do not call it a "cap," "max," or "the highest" unless the source explicitly says so. Do not state or imply the creator plays a particular mode (e.g. ranked), holds a status, or has a reputation that the source did not establish. Stick to exactly what the source claims, no more.\n';
  block += '7. STRUCTURE: break the article into sections. Write each section header on its OWN LINE as **HEADER TEXT** with a blank line before and after it. Never put a header on the same line as body text, and never glue a header to the paragraph that follows. Separate paragraphs with a blank line.\n';
  block += '---';
  return block;
}

function buildCurrentTierStateBlock(currentTiers, shouldRegrade) {
  if (!currentTiers || currentTiers.length === 0) {
    return '';
  }

  var weapons = currentTiers.filter(function(t) { return t.type === 'weapon'; });
  var shells = currentTiers.filter(function(t) { return t.type === 'shell'; });

  var block = '\n\n--- CURRENT TIER STATE (from prior NEXUS regrade) ---\n';
  block += 'This is the tier list as you last set it. Treat it as your prior reasoning.\n\n';

  if (shells.length > 0) {
    block += 'SHELLS:\n';
    shells.forEach(function(s) {
      block += '  ' + s.name + ' - Tier ' + s.tier + (s.note ? ' (' + s.note + ')' : '') + '\n';
    });
  }

  if (weapons.length > 0) {
    block += '\nWEAPONS:\n';
    weapons.forEach(function(w) {
      block += '  ' + w.name + ' - Tier ' + w.tier + (w.note ? ' (' + w.note + ')' : '') + '\n';
    });
  }

  if (shouldRegrade) {
    block += '\nYou are GRADING TODAY. The full meta_update array must be returned. ';
    block += 'When you change a tier from the current state above, you must be able to justify the move based on patch context, community signal, or stat changes you reference in your article body. ';
    block += 'Most items should remain at their current tier - move tiers only when the evidence supports it.';
  } else {
    block += '\nYou are NOT regrading today (NEXUS regrades the tier list once per 24 hours unless a patch is detected). ';
    block += 'Write your meta analysis article using this current tier state as context, but DO NOT return a meta_update array - or return an empty array. ';
    block += 'Your article should reflect movement and patterns visible in current sources, not propose new tier assignments.';
  }

  block += '\n---';
  return block;
}

// ── COVERAGE REGISTRY: SHADOW MODE (Unit 4) ─────────────────────────────────
//
// LOG ONLY. This does not block, skip, or alter a single publish. It records
// what enforcement WOULD have done so Unit 5 has real data to decide on.
//
// WHY SHADOW FIRST: lib/coverage.js scores 20/20 on the regression fixture, but
// that fixture only proves we recognise KNOWN duplicates. It proves nothing about
// FALSE blocks on a genuinely new angle covering an existing entity. Turning
// enforcement on off the back of a passing fixture would be exactly the mistake
// this project keeps catching: trusting a detector's score instead of measuring
// it against reality.
//
// WHAT WE ARE MEASURING (intent, so it survives):
//   1. WOULD_BLOCK RATE   -- how often would enforcement have fired at all?
//   2. THE OVER-BLOCK RISK -- of those would-blocks, how many are genuinely novel
//      angles that SHOULD have published? This is the question the 20/20 fixture
//      could not answer, and the only reason shadow mode exists.
//   3. UNCLASSIFIED RATE on NEW content vs the 41.6% corpus baseline (measured
//      2026-07-18 over 1,282 live articles).
//
// FAIL-OPEN IS CORRECT HERE, AND ONLY HERE. If this check throws, we log and keep
// publishing. Shadow mode must never be able to stop the pipeline -- an
// observability probe that can take down generation is worse than no probe.
// DO NOT "fix" this to fail-closed: fail-CLOSED is the deliberate policy for Unit
// 5 ENFORCEMENT, a separate change. Until then, open is the point.
//
// PLACEMENT: called immediately before the feed_items insert, AFTER the existing
// body-length / exact-title / MIRANDA near-duplicate guards. That is deliberate
// -- it measures the INCREMENTAL effect of coverage enforcement on articles that
// currently DO publish, rather than double-counting pieces another guard already
// stopped.
//
// UNIT 4b: the probe itself now lives in lib/coverageShadow.js, shared with the
// three script write paths (VANTAGE auto/manual, DMZ news) that bypass this route
// entirely. One implementation so the derivation and record shape cannot drift
// between paths; see that module for the choke-point reasoning.

async function processEditor(editorName, prompt, rawData, supabase, regradeContext, directive) {
  var tierChangeContext = null;

  if (!prompt) {
    return { editor: editorName, success: false, error: 'No data gathered' };
  }

  try {
    var result;

    if (editorName === 'MIRANDA') {
      var mirandaPrompt = buildMirandaPrompt({ ...prompt, xData: rawData.xData || null });
      result = await callEditor('MIRANDA', mirandaPrompt, supabase, PRODUCING_GAME);
    } else {
      result = await callEditor(editorName, prompt, supabase, PRODUCING_GAME);
    }

    if (!result || !result.headline || result._parseError) {
      console.log('[CRON] ' + editorName + ' failed: ' + JSON.stringify(result).slice(0, 200));
      // Surface the SPECIFIC failure reason (404/model error, rate limit, no
      // tool_use, parse error) so the alert email is actionable rather than a
      // generic "parse error". callEditor returns {_error, _message/_stop_reason}
      // on an API/tool failure.
      var reason;
      if (result && result._error) {
        reason = result._error + (result._message ? ': ' + String(result._message).slice(0, 300)
          : (result._stop_reason ? ' (stop_reason: ' + result._stop_reason + ')' : ''));
      } else if (result && result._parseError) {
        reason = 'parse error';
      } else {
        reason = 'missing headline';
      }
      return { editor: editorName, success: false, error: reason };
    }

    var media = resolveMediaInfo(result, rawData, editorName);
    console.log('[CRON] ' + editorName + ' media: thumbnail=' + (media.thumbnail ? 'YES' : 'NULL') + ' source=' + media.source);

    // KEYWORD FRAMING -- pass 2. See lib/keywordFraming.js for the design.
    //
    // POSITION IS LOAD-BEARING, in both directions:
    //   AFTER resolveMediaInfo, because isTwitchContent (:73) reads result.headline
    //   to choose the thumbnail and source -- rewriting before it could change MEDIA
    //   selection, and thumbnail/source_url are FROZEN.
    //   BEFORE insertData, so headline (:498) and generateSlug (:505) pick up the
    //   final string, and before the dedup gates (:716/:731) and the coverage shadow
    //   log (:745), which must all see the headline that actually publishes.
    //
    // result.headline is REASSIGNED so every downstream consumer inherits the final
    // string with no further edits. framing.original keeps the pass-1 headline.
    // FAIL-OPEN: framing.headline is always a usable string, so this cannot block
    // publication. Inert while keyword_targets is empty.
    var framing = await frameHeadline(supabase, {
      gameSlug: PRODUCING_GAME_SLUG,
      headline: result.headline,
      body: result.body,
    });
    if (framing.applied) {
      console.log('[keyword] ' + editorName + ' FRAMED "' + framing.original + '" -> "' + framing.headline + '" (' + framing.keyword + ')');
      result.headline = framing.headline;
    }

    var insertData = {
      headline: result.headline,
      body: result.body,
      editor: editorName,
      source: media.source,
      tags: result.tags || [],
      ce_score: 0,
      is_published: true,
      slug: generateSlug(result.headline),
      thumbnail: media.thumbnail,
      source_url: media.source_url,
      // DMZ migration (step 3, batch B1): every insert path must set game_slug
      // explicitly. Hardcoded 'marathon' for now; becomes the cron's per-game
      // target when DMZ editorial starts. Required before the column DEFAULT is
      // dropped (batch B2) -- a forgotten game_slug then errors instead of
      // silently defaulting.
      game_slug: PRODUCING_GAME_SLUG,
    };

    if (editorName === 'CIPHER') {
      insertData.source = 'INTEL';
      insertData.ce_score = result.ce_score || 0;
      insertData.thumbnail = null;
      insertData.source_url = null;
    }
    if (editorName === 'NEXUS')  insertData.ce_score = result.grid_pulse || 0;
    if (editorName === 'DEXTER') insertData.ce_score = result.ce_score || 0;
    if (editorName === 'GHOST') {
      insertData.source = 'REDDIT';
      insertData.ce_score = result.mood_score || 0;
      insertData.thumbnail = null;
      insertData.source_url = null;
    }
    if (editorName === 'MIRANDA') {
      insertData.source = 'GUIDE';
      insertData.ce_score = result.ce_score || 0;
      insertData.thumbnail = result.thumbnail || null;
      insertData.source_url = result.source_url || null;
    }

    // CREATOR SPOTLIGHT (June 8, 2026): if this article was produced from a
    // creator_spotlight directive, persist the VETTED creator_info + type onto
    // the article so the page can render Person/sameAs JSON-LD. We attach the
    // directive's own creator_info (human-vetted) rather than anything the LLM
    // returned, so the structured data can't be fabricated. Standard articles
    // leave these at their column defaults.
    //
    // SOURCE URL (June 9, 2026): carry the directive's reference URL onto the
    // article so the page can embed it (Twitch clip / YouTube) or link it
    // (anything else). This runs AFTER the per-editor branches above (which
    // null out source_url for GHOST/CIPHER), so for spotlights the directive
    // URL wins. The `source` label is set by URL type so the article page's
    // bottom source link isn't mislabeled (e.g. an X link wouldn't say
    // "YOUTUBE"). Embedding only shows the real video; it never lets the editor
    // describe clip contents, so the anti-fabrication guard is unaffected.
    if (directive && directive.directive_type === 'creator_spotlight') {
      insertData.directive_type = 'creator_spotlight';
      insertData.creator_info = directive.creator_info || {};
      if (directive.url) {
        insertData.source_url = directive.url;
        var durl = directive.url.toLowerCase();
        if (durl.includes('twitch.tv') || durl.includes('clips.twitch.tv')) {
          insertData.source = 'TWITCH';
        } else if (durl.includes('youtube.com') || durl.includes('youtu.be')) {
          insertData.source = 'YOUTUBE';
        } else if (durl.includes('x.com') || durl.includes('twitter.com')) {
          insertData.source = 'X';
        } else if (durl.includes('reddit.com')) {
          insertData.source = 'REDDIT';
        }
        // else: leave whatever the per-editor branch set (e.g. REDDIT for GHOST)
      }
    }

    if (editorName === 'NEXUS' && result.meta_update && Array.isArray(result.meta_update)) {
      if (!regradeContext.shouldRegrade) {
        console.log('[CRON] NEXUS tier regrade SKIPPED (last regrade: ' +
          (regradeContext.lastRegrade ? regradeContext.lastRegrade.toISOString() : 'never') +
          ', hasPatch: ' + regradeContext.hasPatch + ')');
      } else {
        console.log('[CRON] NEXUS tier regrade RUNNING (reason: ' +
          (regradeContext.hasPatch ? 'patch detected' : '24h elapsed') + ')');

        try {
          var [validWeaponsRes, validShellsRes] = await Promise.all([
            supabase.from('weapon_stats').select('name'),
            supabase.from('shell_stats').select('name, ranked_tier_solo, ranked_tier_squad'),
          ]);
          var validWeapons = new Map((validWeaponsRes.data || []).map(function(w) { return [w.name.toLowerCase().trim(), w.name]; }));
          var validShells = new Map((validShellsRes.data || []).map(function(s) { return [s.name.toLowerCase().trim(), s.name]; }));
          // Ranked tiers by canonical name -- the inputs to the shell-tier derivation.
          var shellRankedByName = new Map((validShellsRes.data || []).map(function(s) {
            return [s.name, { solo: s.ranked_tier_solo, squad: s.ranked_tier_squad }];
          }));

          var existingTierMap = new Map();
          (regradeContext.currentTiers || []).forEach(function(t) {
            existingTierMap.set(t.name + ':' + t.type, t.tier);
          });

          var metaRows = result.meta_update
            .filter(function(item) { return (item.type === 'weapon' || item.type === 'shell') && item.name; })
            .map(function(item) {
              var lookup = item.type === 'weapon' ? validWeapons : validShells;
              var canonicalName = lookup.get((item.name || '').toLowerCase().trim());
              if (!canonicalName) {
                console.log('[CRON] NEXUS meta_tiers: rejecting unknown ' + item.type + ' "' + item.name + '"');
                return null;
              }
              // SHELL tier is derived from shell_stats (deterministic); the model's
              // item.tier is DISCARDED for shells. WEAPON tier stays model-authored
              // (no derivable inputs exist). The 'B' default applies to weapons only
              // -- a shell with no basis must be null, never 'B'.
              var newTier;
              if (item.type === 'shell') {
                var sr = shellRankedByName.get(canonicalName) || {};
                newTier = deriveShellTier(sr.solo, sr.squad); // null when no basis
              } else {
                newTier = item.tier || 'B';
              }
              var oldTier = existingTierMap.get(canonicalName + ':' + item.type);
              // A null tier (ungraded shell) has no trend to speak of -- keep it null
              // rather than letting computeTrend's !oldTier path emit 'stable'. This
              // keeps Rook/Sentinel consistent across cron runs instead of resurrecting
              // a 'stable' badge on a shell that is not on the ladder.
              var computedTrend = newTier == null ? null : computeTrend(newTier, oldTier);

              return {
                name: canonicalName,
                type: item.type,
                tier: newTier,
                trend: computedTrend,
                note: item.note || '',
                // ranked_note / ranked_tier_solo / ranked_tier_squad are NO LONGER
                // WRITTEN (2026-07-20, step 2 of the meta_tiers loop fix). They were
                // copies of shell_stats round-tripped through the NEXUS prompt, which
                // made meta_tiers read as an independent second witness when it was
                // not. Renders now read those fields from shell_stats (the source of
                // truth). Existing column values persist until step 4 nulls them.
                // holotag_tier removed 2026-07-20: meta_tiers.holotag_tier was 0 of 40
                // rows for its entire existence (the model never emitted a value).
                // The real data is shell_stats.holotag_tier_recommendation. Column
                // dropped by DDL after this lands. tier/trend/note stay (editorial).
                updated_at: new Date().toISOString(),
              };
            })
            .filter(function(row) { return row !== null; });

          if (metaRows.length > 0) {
            var { error: metaError } = await supabase
              .from('meta_tiers')
              .upsert(metaRows, { onConflict: 'name' });

            if (metaError) {
              console.log('[CRON] NEXUS meta_tiers upsert failed: ' + metaError.message);
            } else {
              var movers = metaRows.filter(function(r) { return r.trend !== 'stable'; });
              console.log('[CRON] NEXUS upserted meta_tiers: ' + metaRows.length + ' entries, ' + movers.length + ' movers');
              notifyMetaUpdate(metaRows).catch(function(e) { console.log('[DISCORD] meta notify error: ' + e.message); });

              // Stage 3 seed (AI-quality roadmap #2/#3): append an immutable tier
              // snapshot ALONGSIDE the upsert, into the append-only history table,
              // so tier streak/churn history accrues (computed later, once enough
              // snapshots exist). The meta_tiers upsert above is unchanged. This is
              // purely additive capture and NON-FATAL: a snapshot failure can never
              // break the live regrade (the upsert has already committed).
              try {
                var regradeId = new Date().toISOString();
                var snapshotRows = metaRows.map(function(r) {
                  return { game_slug: PRODUCING_GAME_SLUG, entity: r.name, entity_type: r.type, tier: r.tier, regrade_id: regradeId };
                });
                var { error: snapErr } = await supabase.from('meta_tier_snapshots').insert(snapshotRows);
                if (snapErr) console.log('[CRON] tier-snapshot append failed (non-fatal): ' + snapErr.message);
                else console.log('[CRON] tier-snapshot: appended ' + snapshotRows.length + ' rows (regrade_id=' + regradeId + ')');
              } catch (snapEx) {
                console.log('[CRON] tier-snapshot append error (non-fatal): ' + snapEx.message);
              }

              if (movers.length > 0) {
                tierChangeContext = {
                  isTierRegrade: true,
                  movers: movers.map(function(m) {
                    return {
                      name: m.name,
                      type: m.type,
                      oldTier: existingTierMap.get(m.name + ':' + m.type) || null,
                      newTier: m.tier,
                      trend: m.trend,
                    };
                  }),
                };
              }
            }
          }
        } catch (metaErr) {
          console.log('[CRON] NEXUS meta_tiers error: ' + metaErr.message);
        }
      }
    }

    // ── FORWARD-ONLY PUBLISH GUARDS (no existing rows touched) ──
    // These run AFTER the NEXUS tier regrade above, so a skipped article never
    // costs the meta_tiers update; only the article publication is prevented.
    //
    // (1) Empty/near-empty body: never publish a thin/empty article as indexable.
    //     (The persist path previously only checked for a MISSING headline, so
    //     0-word bodies slipped through as is_published+noindex=false.)
    var bodyWords = wordCount(result.body);
    if (bodyWords < MIN_BODY_WORDS) {
      console.log('[CRON] ' + editorName + ' SKIP publish: body too short (' + bodyWords + ' words < ' + MIN_BODY_WORDS + ')');
      return { editor: editorName, success: false, error: 'body too short (' + bodyWords + ' words)' };
    }
    // (2) Exact-title collision vs this editor's RECENT published titles. The soft
    //     prompt no-repeat is proven insufficient on its own, so enforce at persist.
    //     MIRANDA reads its own last-12 (prompt.recentHeadlines from gatherMirandaData);
    //     the other four read the cron's last-8 map (rawData.recentHeadlines).
    var recentTitles = editorName === 'MIRANDA'
      ? (prompt && Array.isArray(prompt.recentHeadlines) ? prompt.recentHeadlines : [])
      : ((rawData.recentHeadlines && rawData.recentHeadlines[editorName]) || []);
    var newTitleNorm = normalizeTitle(result.headline);
    if (recentTitles.some(function(t) { return normalizeTitle(t) === newTitleNorm; })) {
      console.log('[CRON] ' + editorName + ' SKIP publish: duplicate title vs recent ("' + result.headline + '")');
      return { editor: editorName, success: false, error: 'duplicate title vs recent' };
    }
    // (3) Near-duplicate EVERGREEN guard (MIRANDA only). (2) above catches only
    //     byte-identical titles inside the recent window; the real failure is the
    //     same evergreen guide re-minted weeks later with a reworded headline.
    //     This compares topic tokens against MIRANDA's FULL recent published
    //     history and SKIPS publish on a clear near-duplicate -- LOGGING which
    //     existing article it matched, never silently dropping. The other four
    //     editors are exempt on purpose: their day-to-day topic overlap is
    //     legitimately high (dated meta/news), so only the evergreen field guide
    //     runs the topic-similarity gate.
    if (editorName === 'MIRANDA') {
      var dup = await findDuplicateEvergreen(supabase, editorName, PRODUCING_GAME_SLUG, result.headline);
      if (dup) {
        console.log('[CRON] MIRANDA SKIP publish: near-duplicate evergreen (score ' +
          dup.score.toFixed(2) + ', ' + dup.shared + ' shared topic words) of existing "' +
          dup.headline + '" [' + dup.slug + '] -- new "' + result.headline + '" not published');
        return { editor: editorName, success: false, error: 'near-duplicate of existing article (' + dup.slug + ', score ' + dup.score.toFixed(2) + ')' };
      }
    }

    // (4) COVERAGE SHADOW MODE -- ALL editors, LOG ONLY, never blocks. See the
    //     logCoverageShadow comment block above for what this measures and why it
    //     is deliberately fail-open. Awaited so the record is durably written
    //     before the function can be torn down, but its outcome is ignored: the
    //     insert below runs unconditionally.
    await logCoverageShadow(supabase, {
      source: 'cron',
      editor: editorName,
      gameSlug: PRODUCING_GAME_SLUG,
      headline: result.headline,
    });

    var { data: feedItem, error } = await supabase.from('feed_items').insert(insertData).select().single();

    if (error) {
      return { editor: editorName, success: false, error: error.message };
    }

    // POST-INSERT, and only here: burn the keyword's cap and backfill the audit
    // row's feed_item_id. Every early return above (duplicate title :718,
    // near-duplicate evergreen :736, insert error :755) skips this, so a term is
    // never marked used by an article that did not publish. Fail-open; both writes
    // are audit and the article already exists.
    await finalizeKeywordMatch(supabase, framing, feedItem ? feedItem.id : null);

    if (feedItem) {
      generateArticleComments(
        { id: feedItem.id, headline: feedItem.headline, body: feedItem.body, directive_type: insertData.directive_type || 'standard' },
        editorName,
        supabase,
        tierChangeContext
      ).catch(function(err) {
        console.log('[CRON] comment generation error for ' + editorName + ': ' + err.message);
      });
    }

    if (feedItem) {
      if (editorName === 'MIRANDA') {
        notifyIntelFeed(feedItem, editorName).catch(function(e) { console.log('[DISCORD] intel notify error: ' + e.message); });
      }
      notifyRankedIntel(feedItem, editorName).catch(function(e) { console.log('[DISCORD] ranked notify error: ' + e.message); });
    }

    return {
      editor: editorName,
      success: true,
      headline: result.headline,
      has_thumbnail: !!media.thumbnail,
      thumbnail: media.thumbnail,
      id: feedItem ? feedItem.id : null,
    };

  } catch (err) {
    return { editor: editorName, success: false, error: err.message };
  }
}

export async function GET(req) {
  // SECURITY (audit #1): FAIL-SAFE cron auth guard. This route triggers PAID
  // generation, so it must not be publicly triggerable -- but the guard must
  // also never lock out Vercel's own scheduled job.
  //   - CRON_SECRET NOT set  -> ALLOW the request (log a warning). The guard is
  //     INERT until the secret exists, so deploying this code BEFORE setting the
  //     env var does NOT take down generation (avoids re-creating the outage).
  //   - CRON_SECRET set      -> REQUIRE `Authorization: Bearer <CRON_SECRET>`,
  //     else 401. Vercel Cron sends exactly this header automatically once the
  //     secret is set, so the scheduled job keeps working while public callers
  //     are rejected. Setting CRON_SECRET in Vercel is what ARMS the guard.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[CRON] CRON_SECRET not set -- route is UNGUARDED (anyone can trigger a paid cycle). Set CRON_SECRET in Vercel env to arm the guard.');
  } else {
    const auth = req && req.headers ? req.headers.get('authorization') : null;
    if (auth !== 'Bearer ' + cronSecret) {
      console.warn('[CRON] Rejected request: missing/invalid Authorization Bearer.');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // SERVICE KEY REQUIRED -- NO ANON FALLBACK.
  //
  // This previously read `SUPABASE_SERVICE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY`.
  // That fallback turned a config error into INVISIBLE DATA LOSS: tables with RLS
  // enabled and no policies (coverage_registry, coverage_shadow) silently reject
  // anon writes, and the coverage shadow probe is deliberately fail-OPEN, so a
  // rejected insert logged "persist failed (non-fatal)" and the cycle carried on
  // looking healthy. A week later the table is empty and nothing ever alerted.
  //
  // Every write this route performs (directives, feed_items, meta_tiers,
  // meta_tier_snapshots, coverage_shadow) needs the service role. Nothing here
  // legitimately uses the anon client, so there is no reason to accept one.
  // Fail LOUDLY instead -- same discipline as the three standalone scripts, which
  // hard-exit when SUPABASE_SERVICE_KEY is unset.
  if (!process.env.SUPABASE_SERVICE_KEY) {
    console.error('[CRON] ABORT: SUPABASE_SERVICE_KEY is not set. Refusing to run on the anon key -- ' +
      'RLS-protected writes would be silently rejected. Set SUPABASE_SERVICE_KEY in the Vercel env.');
    return Response.json({ error: 'SUPABASE_SERVICE_KEY not configured' }, { status: 500 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Run-start stamp, taken BEFORE any generation: the keyword heartbeat counts
  // keyword_match_log rows written since this instant, so it reports THIS run
  // rather than a rolling window that could straddle two.
  const runStartedAt = new Date().toISOString();

  try {
    var prompts = await gatherAll(PRODUCING_GAME);
    var rawData = prompts._rawData || { youtubeVideos: [], twitchClips: [], xData: null, bungieNews: [] };

    var directiveMap = {};
    try {
      var nowIso = new Date().toISOString();
      var { data: directives } = await supabase
        .from('editor_directives')
        .select('id, editor, instruction, url, scheduled_for, directive_type, source_text, creator_info')
        .eq('status', 'pending')
        .or('scheduled_for.is.null,scheduled_for.lte.' + nowIso)
        .order('scheduled_for', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });

      (directives || []).forEach(function(d) {
        if (!directiveMap[d.editor]) directiveMap[d.editor] = d;
      });

      var directiveCount = Object.keys(directiveMap).length;
      if (directiveCount > 0) {
        console.log('[CRON] Directives due this cycle: ' + Object.entries(directiveMap).map(function(e) { return e[0]; }).join(', '));
      }
    } catch (dirErr) {
      console.log('[CRON] Directive fetch failed (non-fatal): ' + dirErr.message);
    }

    // Recent per-editor rows (last 8) feed TWO no-repeat mechanisms off ONE read:
    // the angle no-repeat (headline -> buildNoRepeatBlock) and the cross-cycle
    // SOURCE-VIDEO no-repeat (source_url -> resolveMediaInfo). source_url is added
    // to the same query so there is no extra round-trip.
    var headlineResults = await Promise.all([
      supabase.from('feed_items').select('headline, source_url').eq('editor', 'CIPHER').eq('is_published', true).eq('game_slug', PRODUCING_GAME_SLUG).order('created_at', { ascending: false }).limit(8),
      supabase.from('feed_items').select('headline, source_url').eq('editor', 'NEXUS').eq('is_published', true).eq('game_slug', PRODUCING_GAME_SLUG).order('created_at', { ascending: false }).limit(8),
      supabase.from('feed_items').select('headline, source_url').eq('editor', 'DEXTER').eq('is_published', true).eq('game_slug', PRODUCING_GAME_SLUG).order('created_at', { ascending: false }).limit(8),
      supabase.from('feed_items').select('headline, source_url').eq('editor', 'GHOST').eq('is_published', true).eq('game_slug', PRODUCING_GAME_SLUG).order('created_at', { ascending: false }).limit(8),
    ]);

    var recentHeadlines = {
      CIPHER: (headlineResults[0].data || []).map(function(r) { return r.headline; }),
      NEXUS:  (headlineResults[1].data || []).map(function(r) { return r.headline; }),
      DEXTER: (headlineResults[2].data || []).map(function(r) { return r.headline; }),
      GHOST:  (headlineResults[3].data || []).map(function(r) { return r.headline; }),
    };

    // Expose the recent-title map to processEditor for the persist-time exact-title
    // guard (CIPHER/NEXUS/DEXTER/GHOST). MIRANDA is absent here on purpose -- it
    // carries its own last-12 titles on prompt.recentHeadlines (gatherMirandaData).
    rawData.recentHeadlines = recentHeadlines;

    // Recent source videos for the ONLY two editors that attach a pool clip
    // (NEXUS/DEXTER). resolveMediaInfo reads this off rawData to skip a clip the
    // editor used recently. Non-fallback editors need no entry.
    rawData.recentVideoIds = {
      NEXUS:  (headlineResults[1].data || []).map(function(r) { return youtubeIdFromUrl(r.source_url); }).filter(Boolean),
      DEXTER: (headlineResults[2].data || []).map(function(r) { return youtubeIdFromUrl(r.source_url); }).filter(Boolean),
    };

    var patchItems = (rawData.bungieNews || []).filter(function(n) { return n.is_patch_note; });
    var hasPatch = patchItems.length > 0;
    var currentPatchKey = patchKey(patchItems);
    var patchBlock = hasPatch ? buildPatchPriorityBlock(patchItems) : '';

    if (hasPatch) {
      console.log('[CRON] Patch detected: ' + patchItems.map(function(p) { return p.title; }).join(', ') + ' (patch_key="' + currentPatchKey + '")');
    }

    var patchAlreadyRegraded = false;
    if (hasPatch) {
      try {
        var { data: priorPatchRegrade } = await supabase
          .from('site_events')
          .select('id')
          .eq('event_name', 'patch_regrade')
          .eq('event_data->>patch_key', currentPatchKey)
          .limit(1);
        patchAlreadyRegraded = !!(priorPatchRegrade && priorPatchRegrade.length > 0);
      } catch (pdErr) {
        // FAIL-CLOSED: on a read error, treat as ALREADY regraded so a transient
        // DB hiccup does not re-run the patch-triggered regrade. The 24h-timer
        // regrade path is unaffected.
        patchAlreadyRegraded = true;
        console.log('[CRON] patch_regrade dedup check failed -- failing CLOSED (treating as already regraded): ' + pdErr.message);
      }
    }
    var patchShouldTrigger = hasPatch && !patchAlreadyRegraded;
    if (hasPatch) {
      console.log('[CRON] Patch present: hasPatch=true, alreadyRegradedThisPatch=' + patchAlreadyRegraded + ', patchShouldTrigger=' + patchShouldTrigger);
    }

    var regradeContext = {
      hasPatch: hasPatch,
      patchShouldTrigger: patchShouldTrigger,
      shouldRegrade: patchShouldTrigger,
      lastRegrade: null,
      currentTiers: [],
    };

    try {
      var { data: currentTiersData } = await supabase
        .from('meta_tiers')
        .select('name, type, tier, note, updated_at')
        .order('type', { ascending: true })
        .order('name', { ascending: true });

      regradeContext.currentTiers = currentTiersData || [];

      if (regradeContext.currentTiers.length > 0) {
        var newestUpdate = regradeContext.currentTiers.reduce(function(max, t) {
          var ts = new Date(t.updated_at).getTime();
          return ts > max ? ts : max;
        }, 0);
        regradeContext.lastRegrade = new Date(newestUpdate);

        var hoursElapsed = (Date.now() - newestUpdate) / (1000 * 60 * 60);
        if (hoursElapsed >= 23) {
          regradeContext.shouldRegrade = true;
        }
        console.log('[CRON] NEXUS regrade gate: hoursElapsed=' + hoursElapsed.toFixed(1) +
          ', hasPatch=' + hasPatch + ', patchShouldTrigger=' + patchShouldTrigger + ', shouldRegrade=' + regradeContext.shouldRegrade);
      } else {
        regradeContext.shouldRegrade = true;
        console.log('[CRON] NEXUS regrade gate: no existing tiers, forcing regrade');
      }
    } catch (tierErr) {
      console.log('[CRON] NEXUS regrade gate check failed (defaulting to regrade): ' + tierErr.message);
      regradeContext.shouldRegrade = true;
    }

    if (regradeContext.patchShouldTrigger) {
      try {
        await supabase.from('site_events').insert({ event_name: 'patch_regrade', event_data: { patch_key: currentPatchKey, title: (patchItems[0] && patchItems[0].title) || null } });
        console.log('[CRON] Recorded patch_regrade marker for patch_key="' + currentPatchKey + '" -- this patch will not re-trigger regrade again');
      } catch (prErr) {
        console.log('[CRON] Failed to record patch_regrade marker (non-fatal): ' + prErr.message);
      }
    }

    var currentTierBlock = buildCurrentTierStateBlock(regradeContext.currentTiers, regradeContext.shouldRegrade);

    // Historical-context block (AI-quality roadmap #2/#3, Stage 2): background
    // awareness/texture for the meta + build editors. Read once; non-fatal
    // (missing blob -> '' -> nothing injected). Wired into NEXUS/DEXTER/CIPHER
    // only (GHOST/MIRANDA skipped). Appended at the per-editor block layer so
    // fetchGameContext stays byte-identical.
    var historicalBlock = '';
    try {
      historicalBlock = formatHistoricalContextBlock(await fetchHistoricalContext(PRODUCING_GAME, supabase));
    } catch (hErr) {
      console.log('[CRON] historical-context fetch failed (non-fatal): ' + hErr.message);
    }

    if (typeof prompts.CIPHER === 'string') {
      if (directiveMap['CIPHER']) prompts.CIPHER += buildDirectiveBlock(directiveMap['CIPHER']);
      else {
        prompts.CIPHER += buildNoRepeatBlock(recentHeadlines.CIPHER);
        if (hasPatch) prompts.CIPHER += patchBlock;
      }
      prompts.CIPHER += historicalBlock;
    }

    if (typeof prompts.NEXUS === 'string') {
      if (hasPatch) prompts.NEXUS = patchBlock + '\n\n' + prompts.NEXUS;
      prompts.NEXUS += currentTierBlock;
      if (directiveMap['NEXUS']) {
        prompts.NEXUS += buildDirectiveBlock(directiveMap['NEXUS']);
      } else {
        prompts.NEXUS += buildNoRepeatBlock(recentHeadlines.NEXUS);
      }
      prompts.NEXUS += historicalBlock;
    }

    if (typeof prompts.DEXTER === 'string') {
      if (directiveMap['DEXTER']) prompts.DEXTER += buildDirectiveBlock(directiveMap['DEXTER']);
      else {
        prompts.DEXTER += buildNoRepeatBlock(recentHeadlines.DEXTER);
        if (hasPatch) prompts.DEXTER += patchBlock;
      }
      prompts.DEXTER += historicalBlock;
    }

    if (typeof prompts.GHOST === 'string') {
      if (directiveMap['GHOST']) prompts.GHOST += buildDirectiveBlock(directiveMap['GHOST']);
      else {
        prompts.GHOST += buildNoRepeatBlock(recentHeadlines.GHOST);
        if (hasPatch) prompts.GHOST += patchBlock;
      }
    }

    if (directiveMap['MIRANDA'] && prompts.MIRANDA && typeof prompts.MIRANDA === 'object') {
      prompts.MIRANDA._directive = directiveMap['MIRANDA'];
    }

    if (hasPatch) {
      // FAIL-CLOSED dedup with marker-FIRST ordering: record the patch_discord
      // marker BEFORE notifying, and only notify once the marker write has
      // succeeded. This guarantees at most one alert per patch_key even if the
      // marker insert fails, and a transient read/write error skips the alert
      // rather than re-sending. Missing one alert beats spamming every 12h.
      var patchNotifyClaimed = false;
      try {
        var { data: priorPatchNotif } = await supabase
          .from('site_events')
          .select('id')
          .eq('event_name', 'patch_discord')
          .eq('event_data->>patch_key', currentPatchKey)
          .limit(1);

        if (priorPatchNotif && priorPatchNotif.length > 0) {
          console.log('[CRON] This patch already notified (patch_key="' + currentPatchKey + '") -- skipping Discord');
        } else {
          await supabase.from('site_events').insert({ event_name: 'patch_discord', event_data: { patch_key: currentPatchKey, title: (patchItems[0] && patchItems[0].title) || null } });
          patchNotifyClaimed = true;
          console.log('[CRON] Patch Discord marker recorded for patch_key="' + currentPatchKey + '"');
        }
      } catch (patchErr) {
        console.log('[CRON] Patch dedup/marker step failed -- failing CLOSED (NOT sending, to avoid duplicates): ' + patchErr.message);
      }

      if (patchNotifyClaimed) {
        notifyPatchNotes(rawData.bungieNews).catch(function(e) {
          console.log('[DISCORD] patch notify error: ' + e.message);
        });
        console.log('[CRON] Patch Discord notification sent for patch_key="' + currentPatchKey + '"');
      }
    }

    // Editor roster + order from per-game config (the cost lever): a game can
    // launch with a subset / different cadence.
    //
    // ── ARTICLE FREEZE (adopted strategy, implemented 2026-07-16) ────────────
    // Two layers, both driven by lib/games/<game>.js editorial (see the long
    // WHY comment there):
    //   1. UNCONDITIONALLY OFF -- simply absent from `editors`. Marathon dropped
    //      MIRANDA (near-duplicate evergreen minting; 139 articles noindexed
    //      across the consolidation project) and GHOST. Nothing here to check:
    //      they are not in the array, so they never run.
    //   2. GATED TO PATCH CYCLES -- listed in `editorsRequiringPatch`. Marathon
    //      gates CIPHER/NEXUS/DEXTER: they run ONLY when this cycle detected a
    //      patch, so same-day patch coverage survives (the patch-priority prompt
    //      block below is written for exactly these three) while the daily
    //      evergreen churn stops.
    // VANTAGE is unaffected -- it is not on this cron (separate path:
    // /api/network-editor, draft-only + human-gated).
    //
    // `|| []` keeps this a NO-OP for any game without the field (e.g. DMZ):
    // empty list -> nothing is gated -> the roster passes through unchanged.
    //
    // KNOWN GAP: `hasPatch` is bungieNews filtered by `is_patch_note`, which is
    // (versionRe || keywords) && fresh<=48h. That is PATCH-NOTE-SHAPED news, not
    // ALL official news -- a dev blog with no patch vocabulary will NOT open the
    // gate. If that bites, widen the condition here to any fresh bungieNews item.
    //
    // REVERSAL: delete this filter block + restore
    //   var editors = PRODUCING_GAME.editorial.editors.map(...)
    // and re-add GHOST/MIRANDA to the config array.
    var editorsRequiringPatch = PRODUCING_GAME.editorial.editorsRequiringPatch || [];
    var activeRoster = PRODUCING_GAME.editorial.editors.filter(function (name) {
      if (editorsRequiringPatch.indexOf(name) === -1) return true;
      if (!hasPatch) {
        console.log('[CRON] FREEZE: skipping ' + name + ' -- gated to patch cycles and no patch detected this cycle');
        return false;
      }
      return true;
    });
    if (activeRoster.length === 0) {
      console.log('[CRON] FREEZE: no editors active this cycle (roster=' +
        PRODUCING_GAME.editorial.editors.join(',') + ', hasPatch=' + hasPatch + ')');
    }
    var editors = activeRoster.map(function (name) {
      return { name: name, prompt: prompts[name] };
    });

    var settledResults = await Promise.allSettled(
      editors.map(function(e) { return processEditor(e.name, e.prompt, rawData, supabase, regradeContext, directiveMap[e.name]); })
    );

    var results = settledResults.map(function(s, idx) {
      if (s.status === 'fulfilled') return s.value;
      return { editor: editors[idx].name, success: false, error: s.reason?.message || 'Unhandled rejection' };
    });

    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      if (r.success && directiveMap[r.editor]) {
        try {
          await supabase
            .from('editor_directives')
            .update({ status: 'consumed', consumed_at: new Date().toISOString() })
            .eq('id', directiveMap[r.editor].id);
          console.log('[CRON] Directive consumed for ' + r.editor + ': ' + directiveMap[r.editor].instruction.slice(0, 60));
        } catch (consumeErr) {
          console.log('[CRON] Failed to mark directive consumed: ' + consumeErr.message);
        }
      }
    }

    // ── DUPLICATE-THUMBNAIL DEDUP (post-settle) ──────────────────
    // Two articles may legitimately share one source video on a thin cycle,
    // but they must not display the IDENTICAL thumbnail. resolveMediaInfo can
    // yield the same image via either the claimed-id path or the [0] fallback,
    // so we compare the FINAL resolved thumbnail string here. `results` is in
    // the declared editors order (CIPHER, NEXUS, DEXTER, GHOST, MIRANDA) -
    // Promise.allSettled preserves input order, not completion order - so the
    // FIRST editor in that order keeps the image and each later editor sharing
    // it is repointed to its own portrait. Distinct thumbnails => no UPDATEs.
    var seenThumbnails = {};
    for (var d = 0; d < results.length; d++) {
      var dr = results[d];
      if (!dr.success || !dr.thumbnail || !dr.id) continue;
      if (!seenThumbnails[dr.thumbnail]) {
        seenThumbnails[dr.thumbnail] = true;
        continue;
      }
      var portrait = '/images/editors/' + dr.editor.toLowerCase() + '.jpg';
      try {
        await supabase.from('feed_items').update({ thumbnail: portrait }).eq('id', dr.id);
        console.log('[CRON] Duplicate thumbnail for ' + dr.editor + ' -> repointed to portrait ' + portrait);
      } catch (dupErr) {
        console.log('[CRON] Duplicate-thumbnail update failed for ' + dr.editor + ': ' + dupErr.message);
      }
    }

    var succeeded = results.filter(function(r) { return r.success; }).length;
    var directivesUsed = results.filter(function(r) { return r.success && directiveMap[r.editor]; }).length;

    // End-of-run safety-net alert: email on total outage (0 generated) or any
    // per-editor failure. Inert until Resend env is provisioned. Wrapped so an
    // alert failure can never affect the generation that just completed.
    try {
      await sendCronFailureAlert(results);
    } catch (alertErr) {
      console.log('[CRON] alert dispatch error (non-fatal): ' + alertErr.message);
    }

    // Historical-context precompute (AI-quality roadmap #2/#3, Stage 1): refresh
    // the compressed coverage-pattern blob for this game AFTER publishing, so it
    // reflects through the just-published cycle for the NEXT run. Self-catching +
    // non-fatal. NOTHING reads the blob yet (editor wiring is Stage 2) -> zero
    // effect on generated output this stage.
    await precomputeHistoricalContext(PRODUCING_GAME, supabase);

    // Internal AI-quality measurement (roadmap measurement layer): snapshot the
    // objective verification/currency metrics each cycle. Pure SQL/code, NO LLM,
    // non-fatal, internal-only -- nothing consumes it yet -> zero output change.
    await precomputeQualityMetrics(PRODUCING_GAME, supabase);

    // KEYWORD HEARTBEAT -- emitted EVERY run, including runs with zero matches.
    // This is the ONLY channel that separates a BROKEN keyword store from a QUIET
    // one: (e)'s error paths write no keyword_match_log row, so silence in that
    // table is ambiguous by construction. `store=reachable(N)` proves the lookup
    // path works; `store=UNREACHABLE` is said out loud on the run that noticed,
    // rather than discovered months later. Seeding keyword_targets is gated on
    // this line existing. Never throws; a heartbeat cannot fail a cron run.
    var keywordHb = await emitKeywordHeartbeat(supabase, PRODUCING_GAME_SLUG, {
      articles: results.length,
      since: runStartedAt,
    });

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: succeeded + ' published, ' + (results.length - succeeded) + ' skipped',
      // Surfaced in the response, not just the logs: Vercel shows this body in the
      // cron invocation detail, so the heartbeat is visible without log spelunking.
      keyword: keywordHb.line,
      directives_consumed: directivesUsed,
      patch_detected: hasPatch,
      nexus_tier_regrade: regradeContext.shouldRegrade,
      results: results,
      tweet: 'Auto-posting disabled -- post manually via @Cybernetic87250',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}