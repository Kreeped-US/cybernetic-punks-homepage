import { callEditor, buildMirandaPrompt, generateArticleComments, consumeKeyword } from '@/lib/editorCore';
import { notifyIntelFeed, notifyMetaUpdate, notifyPatchNotes, notifyRankedIntel } from '@/lib/discord';
import { createClient } from '@supabase/supabase-js';
import { gatherAll } from '@/lib/gather/index';

// FIX (May 15, 2026): createClient() moved inside GET handler.
// Previously at module scope, which caused Vercel build to fail with
// "supabaseUrl is required" because Next.js 16's stricter pre-rendering
// evaluates module-scope code at build time before env vars are
// available. force-dynamic prevents Next.js from attempting static
// analysis on this route. processEditor now takes supabase as a
// parameter so the request-scoped client flows through cleanly.

// MAY 19, 2026 - TIER SYSTEM OVERHAUL:
// 1. REGRADE GATE: NEXUS only rewrites meta_tiers on patch OR >23h elapsed.
// 2. PRIOR-TIER MEMORY: cron injects CURRENT TIER STATE into NEXUS prompt.
// 3. ALGORITHMIC TREND: cron computes trend by comparing new vs old tier.
//
// MAY 20, 2026 - PATCH DEDUP + TIER-CHANGE COMMENTARY:
// 4. PATCH DEDUP: a patch forces a regrade at most once per 23h (recorded
//    via a 'patch_regrade' site_events marker). Prevents a lingering patch
//    note from forcing a regrade every cycle.
// 5. TIER-CHANGE COMMENTARY: when a regrade produces movers, the cron passes
//    a tierChangeContext to generateArticleComments so the other editors
//    react to the specific tier moves.
//
// JUNE 5, 2026 - PATCH-IDENTITY DEDUP (replaces the time-window dedup):
// The May 20 time-window dedup (23h) failed for the Season 2 launch patch:
// the article stayed within bungie.js's freshness window for 3 days, and
// each daily cycle was >23h after the last, so it cleared the window and
// re-fired the Discord notification AND a NEXUS regrade every single day.
// Fix: dedup on patch IDENTITY (a stable key derived from the patch title,
// stored in site_events.event_data.patch_key) instead of elapsed time. The
// same patch now notifies / forces a regrade exactly once, ever - regardless
// of how long it stays fresh. Paired with bungie.js freshness 72h->24h.

export const dynamic = 'force-dynamic';

// Tier ordinal mapping for algorithmic trend computation
var TIER_ORDINAL = { S: 5, A: 4, B: 3, C: 2, D: 1 };

function tierOrdinal(tier) {
  return TIER_ORDINAL[tier] || 0;
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

// JUNE 5, 2026: Stable identity key for a patch article. Matches bungie.js's
// dedup pattern (title.toLowerCase().slice(0,60)) so the cron and the gatherer
// agree on what "the same patch" means. Used to dedup the Discord notify and
// the NEXUS regrade on patch IDENTITY, not elapsed time - so a still-fresh
// patch can't re-fire on consecutive daily cycles.
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

  // CIPHER no longer references external videos as of May 1, 2026 rebuild.
  if (['NEXUS', 'DEXTER'].includes(editorName) && rawData.youtubeVideos && rawData.youtubeVideos.length > 0) {
    var topVideo = rawData.youtubeVideos[0];
    return {
      thumbnail: topVideo.thumbnail || 'https://img.youtube.com/vi/' + topVideo.youtube_id + '/hqdefault.jpg',
      source_url: 'https://www.youtube.com/watch?v=' + topVideo.youtube_id,
      source: 'YOUTUBE',
    };
  }

  return { thumbnail: null, source_url: null, source: 'YOUTUBE' };
}

// -- BUILD "DO NOT REPEAT" BLOCK --
function buildNoRepeatBlock(headlines) {
  if (!headlines || headlines.length === 0) return '';
  return (
    '\n\n--- TOPICS YOU ALREADY COVERED -- DO NOT REPEAT THESE ANGLES ---\n' +
    headlines.map(function(h, i) { return (i + 1) + '. ' + h; }).join('\n') +
    '\nChoose a completely different weapon, shell, strategy, or topic this cycle. ' +
    'If the source material overlaps with a previous topic, find a fresh angle within it.\n---'
  );
}

// -- BUILD PATCH PRIORITY BLOCK --
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
function buildDirectiveBlock(directive) {
  if (!directive) return '';
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

// -- BUILD CURRENT TIER STATE BLOCK FOR NEXUS --
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

async function processEditor(editorName, prompt, rawData, supabase, regradeContext) {
  // Holds tier-change context for NEXUS regrade cycles with movers.
  // Populated inside the meta_tiers block, read at the comment-generation
  // call so commenting editors react to specific tier moves. Stays null
  // for all other editors and for no-mover cycles.
  var tierChangeContext = null;

  if (!prompt) {
    return { editor: editorName, success: false, error: 'No data gathered' };
  }

  try {
    var result;

    if (editorName === 'MIRANDA') {
      var mirandaPrompt = buildMirandaPrompt({ ...prompt, xData: rawData.xData || null });
      result = await callEditor('MIRANDA', mirandaPrompt, supabase);
    } else {
      result = await callEditor(editorName, prompt, supabase);
    }

    if (!result || !result.headline || result._parseError) {
      console.log('[CRON] ' + editorName + ' failed: ' + JSON.stringify(result).slice(0, 200));
      return { editor: editorName, success: false, error: 'Parse error or missing headline' };
    }

    var media = resolveMediaInfo(result, rawData, editorName);
    console.log('[CRON] ' + editorName + ' media: thumbnail=' + (media.thumbnail ? 'YES' : 'NULL') + ' source=' + media.source);

    var insertData = {
      headline: result.headline,
      body: result.body,
      editor: editorName,
      source: media.source,
      tags: result.tags || [],
      ce_score: 0,
      viral_score: 0,
      is_published: true,
      slug: generateSlug(result.headline),
      thumbnail: media.thumbnail,
      source_url: media.source_url,
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

    // NEXUS meta_update -- upsert into meta_tiers, GATED ON REGRADE WINDOW
    if (editorName === 'NEXUS' && result.meta_update && Array.isArray(result.meta_update)) {
      if (!regradeContext.shouldRegrade) {
        console.log('[CRON] NEXUS tier regrade SKIPPED (last regrade: ' +
          (regradeContext.lastRegrade ? regradeContext.lastRegrade.toISOString() : 'never') +
          ', hasPatch: ' + regradeContext.hasPatch + ')');
      } else {
        console.log('[CRON] NEXUS tier regrade RUNNING (reason: ' +
          (regradeContext.hasPatch ? 'patch detected' : '24h elapsed') + ')');

        try {
          // Fetch canonical names from the database to prevent casing drift
          // and reject any items NEXUS invented that don't exist.
          var [validWeaponsRes, validShellsRes] = await Promise.all([
            supabase.from('weapon_stats').select('name'),
            supabase.from('shell_stats').select('name'),
          ]);
          var validWeapons = new Map((validWeaponsRes.data || []).map(function(w) { return [w.name.toLowerCase().trim(), w.name]; }));
          var validShells = new Map((validShellsRes.data || []).map(function(s) { return [s.name.toLowerCase().trim(), s.name]; }));

          // Build a lookup of existing tiers for algorithmic trend computation
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
              var newTier = item.tier || 'B';
              var oldTier = existingTierMap.get(canonicalName + ':' + item.type);
              // Algorithmic trend - overrides NEXUS's vibe-based output
              var computedTrend = computeTrend(newTier, oldTier);

              return {
                name: canonicalName,
                type: item.type,
                tier: newTier,
                trend: computedTrend,
                note: item.note || '',
                ranked_note: item.ranked_note || null,
                ranked_tier_solo: item.ranked_tier_solo || null,
                ranked_tier_squad: item.ranked_tier_squad || null,
                holotag_tier: item.holotag_tier || null,
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

              // Build tier-change context for cross-editor commentary.
              // existingTierMap (declared earlier in this block) still holds the
              // prior tier per item, so we can express each move as old -> new.
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

    var { data: feedItem, error } = await supabase.from('feed_items').insert(insertData).select().single();

    if (error) {
      return { editor: editorName, success: false, error: error.message };
    }

    if (result._seo_keyword_id) {
      consumeKeyword(supabase, result._seo_keyword_id).catch(function(e) {
        console.log('[CRON] keyword consume failed (non-fatal): ' + e.message);
      });
      console.log('[CRON] ' + editorName + ' consumed keyword id=' + result._seo_keyword_id);
    }

    // Generate cross-editor comments. tierChangeContext is null for everything
    // except a NEXUS regrade cycle that produced movers, in which case the
    // commenting editors react to the specific tier moves.
    if (feedItem) {
      generateArticleComments(
        { id: feedItem.id, headline: feedItem.headline, body: feedItem.body },
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
    };

  } catch (err) {
    return { editor: editorName, success: false, error: err.message };
  }
}

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    var prompts = await gatherAll();
    var rawData = prompts._rawData || { youtubeVideos: [], twitchClips: [], xData: null, bungieNews: [] };

    // -- STEP 1: Fetch pending directives that are due --
    var directiveMap = {};
    try {
      var nowIso = new Date().toISOString();
      var { data: directives } = await supabase
        .from('editor_directives')
        .select('id, editor, instruction, url, scheduled_for')
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

    // -- STEP 2: Fetch recent headlines for dedup --
    var headlineResults = await Promise.all([
      supabase.from('feed_items').select('headline').eq('editor', 'CIPHER').eq('is_published', true).order('created_at', { ascending: false }).limit(8),
      supabase.from('feed_items').select('headline').eq('editor', 'NEXUS').eq('is_published', true).order('created_at', { ascending: false }).limit(8),
      supabase.from('feed_items').select('headline').eq('editor', 'DEXTER').eq('is_published', true).order('created_at', { ascending: false }).limit(8),
      supabase.from('feed_items').select('headline').eq('editor', 'GHOST').eq('is_published', true).order('created_at', { ascending: false }).limit(8),
    ]);

    var recentHeadlines = {
      CIPHER: (headlineResults[0].data || []).map(function(r) { return r.headline; }),
      NEXUS:  (headlineResults[1].data || []).map(function(r) { return r.headline; }),
      DEXTER: (headlineResults[2].data || []).map(function(r) { return r.headline; }),
      GHOST:  (headlineResults[3].data || []).map(function(r) { return r.headline; }),
    };

    // -- STEP 3: Detect patch notes --
    var patchItems = (rawData.bungieNews || []).filter(function(n) { return n.is_patch_note; });
    var hasPatch = patchItems.length > 0;
    var currentPatchKey = patchKey(patchItems);
    var patchBlock = hasPatch ? buildPatchPriorityBlock(patchItems) : '';

    if (hasPatch) {
      console.log('[CRON] Patch detected: ' + patchItems.map(function(p) { return p.title; }).join(', ') + ' (patch_key="' + currentPatchKey + '")');
    }

    // -- STEP 4: Determine NEXUS tier regrade gate --
    // Regrade if: a NEW patch should trigger OR last regrade was > 23h ago.
    // Threshold is 23h. As of the 12h-cadence change (May 26, 2026), cycles
    // run at 00:00 and 12:00 UTC; a regrade fires at each 00:00 cycle (~24h
    // elapsed), giving a roughly-once-daily regrade. Kept at 23 (not lowered
    // to ~11) intentionally: once-daily matches the less-is-more cadence and
    // avoids regrading every cycle. Worst case on early jitter is an occasional
    // ~35h gap, which is harmless (tier list just holds steady a bit longer).
    //
    // PATCH-TRIGGERED REGRADE DEDUP:
    // UPDATED June 5, 2026 - now dedups on patch IDENTITY, not a time window.
    // The prior 23h-window check failed for the S2 launch patch: each daily
    // cycle was >23h after the last, so the window cleared and the patch forced
    // a fresh regrade every day for as long as it stayed fresh. We now check
    // whether a 'patch_regrade' marker already exists for THIS patch_key; if so,
    // the patch has already had its one regrade and won't force another. The
    // independent 23h-elapsed daily regrade is unaffected.
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
        console.log('[CRON] patch_regrade dedup check failed (treating as not-yet-regraded): ' + pdErr.message);
      }
    }
    var patchShouldTrigger = hasPatch && !patchAlreadyRegraded;
    if (hasPatch) {
      console.log('[CRON] Patch present: hasPatch=true, alreadyRegradedThisPatch=' + patchAlreadyRegraded + ', patchShouldTrigger=' + patchShouldTrigger);
    }

    var regradeContext = {
      hasPatch: hasPatch,
      patchShouldTrigger: patchShouldTrigger,
      shouldRegrade: patchShouldTrigger, // only a NEW patch triggers immediately
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
        // No existing tiers - first run ever, always regrade
        regradeContext.shouldRegrade = true;
        console.log('[CRON] NEXUS regrade gate: no existing tiers, forcing regrade');
      }
    } catch (tierErr) {
      console.log('[CRON] NEXUS regrade gate check failed (defaulting to regrade): ' + tierErr.message);
      regradeContext.shouldRegrade = true;
    }

    // -- RECORD PATCH-TRIGGERED REGRADE MARKER --
    // If a patch is forcing this cycle's regrade, record a 'patch_regrade'
    // event keyed to this patch's identity so subsequent cycles won't
    // re-trigger off the same patch. Recorded at the decision point (not after
    // NEXUS succeeds) and fails closed: worst case we skip one patch regrade
    // rather than loop.
    if (regradeContext.patchShouldTrigger) {
      try {
        await supabase.from('site_events').insert({ event_name: 'patch_regrade', event_data: { patch_key: currentPatchKey, title: (patchItems[0] && patchItems[0].title) || null } });
        console.log('[CRON] Recorded patch_regrade marker for patch_key="' + currentPatchKey + '" -- this patch will not re-trigger regrade again');
      } catch (prErr) {
        console.log('[CRON] Failed to record patch_regrade marker (non-fatal): ' + prErr.message);
      }
    }

    var currentTierBlock = buildCurrentTierStateBlock(regradeContext.currentTiers, regradeContext.shouldRegrade);

    // -- STEP 5: Inject directive + dedup + patch into each editor prompt --
    if (typeof prompts.CIPHER === 'string') {
      if (directiveMap['CIPHER']) prompts.CIPHER += buildDirectiveBlock(directiveMap['CIPHER']);
      else {
        prompts.CIPHER += buildNoRepeatBlock(recentHeadlines.CIPHER);
        if (hasPatch) prompts.CIPHER += patchBlock;
      }
    }

    // NEXUS - gets current tier state injected EVERY cycle, directive or not.
    // FIX (May 20, 2026): currentTierBlock was previously only added in the
    // no-directive branch. That meant a NEXUS directive (e.g. the scheduled
    // Season 2 pieces) stripped NEXUS of its prior-tier memory and its
    // "grading today / hold stable" instruction, causing a from-scratch
    // regrade on directive cycles. The tier context is fundamental to how
    // NEXUS operates and must be present whether or not a directive exists.
    if (typeof prompts.NEXUS === 'string') {
      if (hasPatch) prompts.NEXUS = patchBlock + '\n\n' + prompts.NEXUS;
      prompts.NEXUS += currentTierBlock;
      if (directiveMap['NEXUS']) {
        prompts.NEXUS += buildDirectiveBlock(directiveMap['NEXUS']);
      } else {
        prompts.NEXUS += buildNoRepeatBlock(recentHeadlines.NEXUS);
      }
    }

    if (typeof prompts.DEXTER === 'string') {
      if (directiveMap['DEXTER']) prompts.DEXTER += buildDirectiveBlock(directiveMap['DEXTER']);
      else {
        prompts.DEXTER += buildNoRepeatBlock(recentHeadlines.DEXTER);
        if (hasPatch) prompts.DEXTER += patchBlock;
      }
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

    // -- STEP 6: Patch Discord notification with patch-identity dedup --
    // UPDATED June 5, 2026: dedup on patch IDENTITY (event_data.patch_key), not
    // a 23h time window. The old window let the S2 launch patch re-notify daily
    // because each cycle was >23h after the last. Now: if a 'patch_discord'
    // marker already exists for THIS patch_key, skip - the patch has had its one
    // notification. A genuinely new patch has a new key and notifies once.
    if (hasPatch) {
      try {
        var { data: priorPatchNotif } = await supabase
          .from('site_events')
          .select('id')
          .eq('event_name', 'patch_discord')
          .eq('event_data->>patch_key', currentPatchKey)
          .limit(1);

        if (!priorPatchNotif || priorPatchNotif.length === 0) {
          notifyPatchNotes(rawData.bungieNews).catch(function(e) {
            console.log('[DISCORD] patch notify error: ' + e.message);
          });
          await supabase.from('site_events').insert({ event_name: 'patch_discord', event_data: { patch_key: currentPatchKey, title: (patchItems[0] && patchItems[0].title) || null } });
          console.log('[CRON] Patch Discord notification sent for patch_key="' + currentPatchKey + '" -- recorded');
        } else {
          console.log('[CRON] This patch already notified (patch_key="' + currentPatchKey + '") -- skipping Discord');
        }
      } catch (patchErr) {
        console.log('[CRON] Patch dedup check failed: ' + patchErr.message + ' -- sending anyway');
        notifyPatchNotes(rawData.bungieNews).catch(function(e) {
          console.log('[DISCORD] patch notify error: ' + e.message);
        });
      }
    }

    // -- STEP 7: Run editors IN PARALLEL --
    var editors = [
      { name: 'CIPHER',  prompt: prompts.CIPHER  },
      { name: 'NEXUS',   prompt: prompts.NEXUS   },
      { name: 'DEXTER',  prompt: prompts.DEXTER  },
      { name: 'GHOST',   prompt: prompts.GHOST   },
      { name: 'MIRANDA', prompt: prompts.MIRANDA },
    ];

    var settledResults = await Promise.allSettled(
      editors.map(function(e) { return processEditor(e.name, e.prompt, rawData, supabase, regradeContext); })
    );

    var results = settledResults.map(function(s, idx) {
      if (s.status === 'fulfilled') return s.value;
      return { editor: editors[idx].name, success: false, error: s.reason?.message || 'Unhandled rejection' };
    });

    // -- STEP 8: Mark directives consumed for editors that succeeded --
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

    var succeeded = results.filter(function(r) { return r.success; }).length;
    var directivesUsed = results.filter(function(r) { return r.success && directiveMap[r.editor]; }).length;

    return Response.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: succeeded + ' published, ' + (results.length - succeeded) + ' skipped',
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