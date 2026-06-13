import { callEditor, buildMirandaPrompt, generateArticleComments, consumeKeyword } from '@/lib/editorCore';
import { notifyIntelFeed, notifyMetaUpdate, notifyPatchNotes, notifyRankedIntel } from '@/lib/discord';
import { createClient } from '@supabase/supabase-js';
import { gatherAll } from '@/lib/gather/index';

export const dynamic = 'force-dynamic';

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

function buildNoRepeatBlock(headlines) {
  if (!headlines || headlines.length === 0) return '';
  return (
    '\n\n--- TOPICS YOU ALREADY COVERED -- DO NOT REPEAT THESE ANGLES ---\n' +
    headlines.map(function(h, i) { return (i + 1) + '. ' + h; }).join('\n') +
    '\nChoose a completely different weapon, shell, strategy, or topic this cycle. ' +
    'If the source material overlaps with a previous topic, find a fresh angle within it.\n---'
  );
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

async function processEditor(editorName, prompt, rawData, supabase, regradeContext, directive) {
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
            supabase.from('shell_stats').select('name'),
          ]);
          var validWeapons = new Map((validWeaponsRes.data || []).map(function(w) { return [w.name.toLowerCase().trim(), w.name]; }));
          var validShells = new Map((validShellsRes.data || []).map(function(s) { return [s.name.toLowerCase().trim(), s.name]; }));

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

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    var prompts = await gatherAll();
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

    if (typeof prompts.CIPHER === 'string') {
      if (directiveMap['CIPHER']) prompts.CIPHER += buildDirectiveBlock(directiveMap['CIPHER']);
      else {
        prompts.CIPHER += buildNoRepeatBlock(recentHeadlines.CIPHER);
        if (hasPatch) prompts.CIPHER += patchBlock;
      }
    }

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

    var editors = [
      { name: 'CIPHER',  prompt: prompts.CIPHER  },
      { name: 'NEXUS',   prompt: prompts.NEXUS   },
      { name: 'DEXTER',  prompt: prompts.DEXTER  },
      { name: 'GHOST',   prompt: prompts.GHOST   },
      { name: 'MIRANDA', prompt: prompts.MIRANDA },
    ];

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