import { callEditor, buildMirandaPrompt, generateArticleComments, consumeKeyword } from '@/lib/editorCore';
import { notifyIntelFeed, notifyMetaUpdate, notifyPatchNotes, notifyRankedIntel } from '@/lib/discord';
import { createClient } from '@supabase/supabase-js';
import { gatherAll } from '@/lib/gather/index';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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

  if (['CIPHER', 'NEXUS', 'DEXTER'].includes(editorName) && rawData.youtubeVideos && rawData.youtubeVideos.length > 0) {
    var topVideo = rawData.youtubeVideos[0];
    return {
      thumbnail: topVideo.thumbnail || 'https://img.youtube.com/vi/' + topVideo.youtube_id + '/hqdefault.jpg',
      source_url: 'https://www.youtube.com/watch?v=' + topVideo.youtube_id,
      source: 'YOUTUBE',
    };
  }

  return { thumbnail: null, source_url: null, source: 'YOUTUBE' };
}

// ── BUILD "DO NOT REPEAT" BLOCK ───────────────────────────────
function buildNoRepeatBlock(headlines) {
  if (!headlines || headlines.length === 0) return '';
  return (
    '\n\n--- TOPICS YOU ALREADY COVERED — DO NOT REPEAT THESE ANGLES ---\n' +
    headlines.map(function(h, i) { return (i + 1) + '. ' + h; }).join('\n') +
    '\nChoose a completely different weapon, shell, strategy, or topic this cycle. ' +
    'If the source material overlaps with a previous topic, find a fresh angle within it.\n---'
  );
}

// ── BUILD PATCH PRIORITY BLOCK ────────────────────────────────
function buildPatchPriorityBlock(patchItems) {
  if (!patchItems || patchItems.length === 0) return '';
  return (
    '\n\n--- ⚠️ PRIORITY OVERRIDE: NEW OFFICIAL BUNGIE UPDATE DETECTED ---\n' +
    'The following Bungie communications were just published:\n' +
    patchItems.map(function(p) {
      return '• ' + p.title + (p.url ? ' — ' + p.url : '');
    }).join('\n') +
    '\nYour article THIS CYCLE must reflect this update. ' +
    'For NEXUS: adjust tier placements to account for any balance changes. ' +
    'For DEXTER: flag any builds that are buffed or nerfed. ' +
    'For CIPHER: assess ranked impact — what plays are stronger or weaker now. ' +
    'For GHOST: cover community reaction to the patch. ' +
    'This patch context takes priority over all other topics.\n---'
  );
}

// ── BUILD DIRECTIVE BLOCK ─────────────────────────────────────
// Injected when an editor has a pending directive queued via the admin panel
function buildDirectiveBlock(directive) {
  if (!directive) return '';
  var block = '\n\n--- 🎯 EDITOR DIRECTIVE — THIS IS YOUR ASSIGNED TOPIC THIS CYCLE ---\n';
  block += 'You have been given a specific article assignment. This overrides your normal content selection.\n\n';
  block += 'ASSIGNMENT: ' + directive.instruction + '\n';
  if (directive.url) {
    block += 'SOURCE URL: ' + directive.url + '\n';
    block += 'Visit or reference this URL in your analysis. This is the primary source for your article.\n';
  }
  block += '\nWrite your article specifically about this topic. Do not default to generic meta analysis or build content — cover this directive directly and thoroughly.\n---';
  return block;
}

async function processEditor(editorName, prompt, rawData) {
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

    if (editorName === 'CIPHER') insertData.ce_score = result.ce_score || 0;
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

    // NEXUS meta_update — upsert into meta_tiers
    if (editorName === 'NEXUS' && result.meta_update && Array.isArray(result.meta_update)) {
      try {
        var metaRows = result.meta_update
          .filter(function(item) { return (item.type === 'weapon' || item.type === 'shell') && item.name; })
          .map(function(item) {
            return {
              name: item.name,
              type: item.type,
              tier: item.tier || 'B',
              trend: item.trend || 'stable',
              note: item.note || '',
              ranked_note: item.ranked_note || null,
              ranked_tier_solo: item.ranked_tier_solo || null,
              ranked_tier_squad: item.ranked_tier_squad || null,
              holotag_tier: item.holotag_tier || null,
              updated_at: new Date().toISOString(),
            };
          });

        if (metaRows.length > 0) {
          var { error: metaError } = await supabase
            .from('meta_tiers')
            .upsert(metaRows, { onConflict: 'name' });

          if (metaError) {
            console.log('[CRON] NEXUS meta_tiers upsert failed: ' + metaError.message);
          } else {
            console.log('[CRON] NEXUS upserted meta_tiers with ' + metaRows.length + ' entries');
            // Only fires if there are actual movers — silent when meta is stable
            notifyMetaUpdate(metaRows).catch(function(e) { console.log('[DISCORD] meta notify error: ' + e.message); });
          }
        }
      } catch (metaErr) {
        console.log('[CRON] NEXUS meta_tiers error: ' + metaErr.message);
      }
    }

    var { data: feedItem, error } = await supabase.from('feed_items').insert(insertData).select().single();

    if (error) {
      return { editor: editorName, success: false, error: error.message };
    }

    // Mark SEO keyword as consumed — only after successful article insert.
    // If we crashed before this point, the keyword stays available for retry.
    if (result._seo_keyword_id) {
      consumeKeyword(supabase, result._seo_keyword_id).catch(function(e) {
        console.log('[CRON] keyword consume failed (non-fatal): ' + e.message);
      });
      console.log('[CRON] ' + editorName + ' consumed keyword id=' + result._seo_keyword_id);
    }

    // ── TWITTER/X AUTO-POSTING DISABLED ──
    // Suspended indefinitely. Post manually via @Cybernetic87250.

    // Generate editor comments on this article
    if (feedItem) {
      generateArticleComments(
        { id: feedItem.id, headline: feedItem.headline, body: feedItem.body },
        editorName,
        supabase
      ).catch(function(err) {
        console.log('[CRON] comment generation error for ' + editorName + ': ' + err.message);
      });
    }

    // Discord notifications — non-blocking
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
  try {
    var prompts = await gatherAll();
    var rawData = prompts._rawData || { youtubeVideos: [], twitchClips: [], xData: null, bungieNews: [] };

    // ── STEP 1: Fetch pending directives ──────────────────────────
    var directiveMap = {};
    try {
      var { data: directives } = await supabase
        .from('editor_directives')
        .select('id, editor, instruction, url')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      // One directive per editor — take the oldest pending one per editor
      (directives || []).forEach(function(d) {
        if (!directiveMap[d.editor]) directiveMap[d.editor] = d;
      });

      var directiveCount = Object.keys(directiveMap).length;
      if (directiveCount > 0) {
        console.log('[CRON] Directives found: ' + Object.entries(directiveMap).map(function(e) { return e[0]; }).join(', '));
      }
    } catch (dirErr) {
      console.log('[CRON] Directive fetch failed (non-fatal): ' + dirErr.message);
    }

    // ── STEP 2: Fetch recent headlines for dedup ──────────────────
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

    // ── STEP 3: Detect patch notes ────────────────────────────────
    var patchItems = (rawData.bungieNews || []).filter(function(n) { return n.is_patch_note; });
    var hasPatch = patchItems.length > 0;
    var patchBlock = hasPatch ? buildPatchPriorityBlock(patchItems) : '';

    if (hasPatch) {
      console.log('[CRON] Patch detected: ' + patchItems.map(function(p) { return p.title; }).join(', '));
    }

    // ── STEP 4: Inject directive + dedup + patch into each editor prompt ──
    // CIPHER
    if (typeof prompts.CIPHER === 'string') {
      if (directiveMap['CIPHER']) prompts.CIPHER += buildDirectiveBlock(directiveMap['CIPHER']);
      else {
        prompts.CIPHER += buildNoRepeatBlock(recentHeadlines.CIPHER);
        if (hasPatch) prompts.CIPHER += patchBlock;
      }
    }

    // NEXUS
    if (typeof prompts.NEXUS === 'string') {
      if (directiveMap['NEXUS']) {
        prompts.NEXUS += buildDirectiveBlock(directiveMap['NEXUS']);
      } else {
        if (hasPatch) prompts.NEXUS = patchBlock + '\n\n' + prompts.NEXUS;
        prompts.NEXUS += buildNoRepeatBlock(recentHeadlines.NEXUS);
      }
    }

    // DEXTER
    if (typeof prompts.DEXTER === 'string') {
      if (directiveMap['DEXTER']) prompts.DEXTER += buildDirectiveBlock(directiveMap['DEXTER']);
      else {
        prompts.DEXTER += buildNoRepeatBlock(recentHeadlines.DEXTER);
        if (hasPatch) prompts.DEXTER += patchBlock;
      }
    }

    // GHOST
    if (typeof prompts.GHOST === 'string') {
      if (directiveMap['GHOST']) prompts.GHOST += buildDirectiveBlock(directiveMap['GHOST']);
      else {
        prompts.GHOST += buildNoRepeatBlock(recentHeadlines.GHOST);
        if (hasPatch) prompts.GHOST += patchBlock;
      }
    }

    // MIRANDA — directive injected via mirandaData object
    if (directiveMap['MIRANDA'] && prompts.MIRANDA && typeof prompts.MIRANDA === 'object') {
      prompts.MIRANDA._directive = directiveMap['MIRANDA'];
    }

    // ── STEP 5: Patch Discord notification with dedup ─────────────
    if (hasPatch) {
      try {
        var cutoff23h = new Date(Date.now() - 23 * 3600 * 1000).toISOString();
        var { data: recentPatchNotif } = await supabase
          .from('site_events')
          .select('id')
          .eq('event_name', 'patch_discord')
          .gte('created_at', cutoff23h)
          .limit(1);

        if (!recentPatchNotif || recentPatchNotif.length === 0) {
          notifyPatchNotes(rawData.bungieNews).catch(function(e) {
            console.log('[DISCORD] patch notify error: ' + e.message);
          });
          await supabase.from('site_events').insert({ event_name: 'patch_discord' });
          console.log('[CRON] Patch Discord notification sent — recorded in site_events');
        } else {
          console.log('[CRON] Patch already notified in last 23h — skipping Discord');
        }
      } catch (patchErr) {
        console.log('[CRON] Patch dedup check failed: ' + patchErr.message + ' — sending anyway');
        notifyPatchNotes(rawData.bungieNews).catch(function(e) {
          console.log('[DISCORD] patch notify error: ' + e.message);
        });
      }
    }

    // ── STEP 6: Run editors IN PARALLEL ───────────────────────────
    // Previously: sequential loop with 15s sleep between each (60s dead time
    // per cycle, ~10min total). Now: all 5 editors fire simultaneously via
    // Promise.allSettled — cycle drops to ~3min. allSettled prevents one
    // editor's failure from killing the others.
    var editors = [
      { name: 'CIPHER',  prompt: prompts.CIPHER  },
      { name: 'NEXUS',   prompt: prompts.NEXUS   },
      { name: 'DEXTER',  prompt: prompts.DEXTER  },
      { name: 'GHOST',   prompt: prompts.GHOST   },
      { name: 'MIRANDA', prompt: prompts.MIRANDA },
    ];

    var settledResults = await Promise.allSettled(
      editors.map(function(e) { return processEditor(e.name, e.prompt, rawData); })
    );

    // Unwrap settled results back to a flat results array
    var results = settledResults.map(function(s, idx) {
      if (s.status === 'fulfilled') return s.value;
      return { editor: editors[idx].name, success: false, error: s.reason?.message || 'Unhandled rejection' };
    });

    // ── STEP 7: Mark directives consumed for editors that succeeded ──
    // Done after parallel execution completes — same logic as before,
    // just batched into its own pass.
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
      results: results,
      tweet: 'Auto-posting disabled — post manually via @Cybernetic87250',
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
