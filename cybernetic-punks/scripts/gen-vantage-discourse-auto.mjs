// scripts/gen-vantage-discourse-auto.mjs
// ============================================================
// VANTAGE AUTO-SOURCED DISCOURSE DRAFTS (Phase A). MANUAL-TRIGGER. DRAFT-ONLY.
// ============================================================
// Auto-sources discourse candidates from the EXISTING YouTube gather (real,
// linkable, attributable artifacts), applies an eligibility gate + dedup, and
// hands each surviving candidate to the SAME VANTAGE discourse generator the
// manual script uses (buildVantageDiscoursePrompt + VANTAGE_DISCOURSE_TOOL) --
// the source payload is built IN-MEMORY from the video (no editor_directives row,
// no schema change). Drafts land is_published=FALSE + noindex=TRUE, source-flagged
// with the video URL. Justin remains the ONLY publish path (admin DRAFTS -> APPROVE).
//
// HARD BOUNDARIES (do not relax):
//   - MANUAL-TRIGGER ONLY. Not on cron. Runs only when Justin runs it.
//   - YOUTUBE ONLY. No X/Reddit automation, ever (ToS + honesty).
//   - ELIGIBILITY GATE: a video must have a transcript OR a substantial
//     description (>= MIN_DESC_CHARS) to be a candidate. Title-only / ultra-thin
//     videos are skipped BEFORE reaching VANTAGE -- she must never characterize an
//     argument that exists only in a title.
//   - VANTAGE still self-skips (skip_reason) when a source can't support an honest
//     piece; the auto-source prompt addendum raises that bar for the auto case.
//
// The gather is Marathon-only (getGameConfig) -> game_slug='marathon' -> canonical
// home /intel/<slug> (Phase 2a render path). This script reuses the manual script's
// env loader / slugify and the shared generator; it does NOT fork generation logic.
//
// RUN:  node scripts/gen-vantage-discourse-auto.mjs            (process top eligible, insert drafts)
//       node scripts/gen-vantage-discourse-auto.mjs --dry      (pull + gate + generate + PRINT, write NOTHING)
//       node scripts/gen-vantage-discourse-auto.mjs --max 5    (process up to N eligible this run; default 3)
// Needs ANTHROPIC_API_KEY + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY +
// YOUTUBE_API_KEY -- auto-loaded from .env.local if not already in env.

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { ARTICLE_MODEL } from '../lib/models.js';
import { VANTAGE_DISCOURSE_SYSTEM_PROMPT, VANTAGE_DISCOURSE_AUTO_ADDENDUM, VANTAGE_DISCOURSE_TOOL, buildVantageDiscoursePrompt } from '../lib/network/vantage.js';
import { gatherYouTube } from '../lib/gather/youtube.js';
import { filterGameVideos } from '../lib/gather/relevance.js';
import { getGameConfig } from '../lib/games/index.js';

var GAME_SLUG = 'marathon';   // the gather is Marathon-only
var MIN_DESC_CHARS = 300;     // eligibility floor: a description under ~300 chars is
                              // typically links/boilerplate, not an argument. Videos
                              // WITH a transcript qualify regardless (real substance).
var DEFAULT_MAX = 3;          // sane batch per run; overridable via --max N

// --- minimal .env.local loader (mirrors gen-vantage-discourse.mjs) ------------
function loadEnvLocal() {
  var raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  var lines = raw.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.charAt(0) === '#') continue;
    var eq = line.indexOf('='); if (eq === -1) continue;
    var key = line.slice(0, eq).trim();
    var val = line.slice(eq + 1).trim();
    if (val.length >= 2 && (val.charAt(0) === '"' || val.charAt(0) === "'")) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

function slugify(headline) {
  var base = (headline || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 70);
  var hash = Date.now().toString(36).slice(-4);
  return (base || 'discourse') + '-' + hash;
}

// Extract the 11-char YouTube id from a watch/embed/youtu.be URL (dedup key).
function youtubeIdFromUrl(url) {
  if (!url) return null;
  var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function watchUrl(id) { return 'https://www.youtube.com/watch?v=' + id; }

// Build the in-memory source_text from a video: title + channel + FULL description
// + FULL transcript (not truncated -- the transcript/description is the honesty
// substance, unlike formatForEditor's 800-char slice for the per-cycle prompt).
function buildSourceText(v) {
  var parts = [];
  parts.push('VIDEO TITLE: ' + v.title);
  parts.push('CHANNEL: ' + (v.channelTitle || v.channel || 'Unknown'));
  if (v.published_at) parts.push('PUBLISHED: ' + v.published_at);
  parts.push('');
  parts.push('DESCRIPTION:');
  parts.push((v.description && v.description.trim()) ? v.description.trim() : '(no description)');
  if (v.transcript && v.transcript.trim()) {
    parts.push('');
    parts.push("AUTO-GENERATED TRANSCRIPT (the creator's actual words -- the primary substance):");
    parts.push(v.transcript.trim());
  }
  return parts.join('\n');
}

async function main() {
  loadEnvLocal();
  var dry = process.argv.indexOf('--dry') !== -1;
  var maxIdx = process.argv.indexOf('--max');
  var maxN = (maxIdx !== -1 && process.argv[maxIdx + 1]) ? Math.max(1, parseInt(process.argv[maxIdx + 1], 10) || DEFAULT_MAX) : DEFAULT_MAX;

  var anthropicKey = process.env.ANTHROPIC_API_KEY;
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_KEY;
  if (!anthropicKey) { console.error('ERROR: ANTHROPIC_API_KEY must be set (env or .env.local).'); process.exit(1); }
  if (!url || !key) { console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).'); process.exit(1); }
  if (!process.env.YOUTUBE_API_KEY) { console.error('ERROR: YOUTUBE_API_KEY must be set (the auto-source pulls candidates from the YouTube gather).'); process.exit(1); }

  var supabase = createClient(url, key);
  var anthropic = new Anthropic({ apiKey: anthropicKey });

  // 1. Pull current candidates from the EXISTING gather (Marathon-only, transient).
  console.log('Pulling YouTube candidates via gatherYouTube() ...');
  var videos = [];
  try { videos = await gatherYouTube(); } catch (e) { console.error('gatherYouTube failed: ' + e.message); process.exit(1); }
  console.log('Candidates returned: ' + videos.length + (dry ? '   (DRY RUN -- nothing will be written)' : ''));

  // RELEVANCE FILTER (same deterministic pass the cron applies via lib/gather/index.js):
  // drop off-topic "Marathon" name-collisions (running sport, Xbox news, etc.) BEFORE
  // the eligibility gate, so VANTAGE never even considers a non-game video -- the drop
  // is deterministic, not reliant on her self-skip.
  try {
    videos = filterGameVideos(videos, 'YouTube (VANTAGE auto)', getGameConfig().relevance);
  } catch (e) {
    console.log('(relevance filter skipped -- proceeding unfiltered: ' + e.message + ')');
  }
  if (!videos.length) { console.log('No on-topic candidates this cycle. Nothing to do.'); return; }

  // 2. Dedup: youtube ids already used by any VANTAGE discourse row (draft OR published).
  var usedIds = new Set();
  try {
    var dedupRes = await supabase.from('feed_items').select('source_url').eq('editor', 'VANTAGE').contains('tags', ['discourse']).limit(1000);
    (dedupRes.data || []).forEach(function (r) { var id = youtubeIdFromUrl(r.source_url); if (id) usedIds.add(id); });
  } catch (e) { console.log('(dedup read failed, continuing best-effort: ' + e.message + ')'); }
  console.log('Already-drafted video ids: ' + usedIds.size);
  console.log('');

  // 3. Eligibility gate + dedup (gatherYouTube already sorts by view_count).
  var eligible = [];
  for (var i = 0; i < videos.length; i++) {
    var v = videos[i];
    if (usedIds.has(v.youtube_id)) { console.log('  skip (already drafted): ' + v.youtube_id + ' | ' + (v.title || '').slice(0, 60)); continue; }
    var hasTranscript = !!(v.transcript && v.transcript.trim());
    var descLen = (v.description || '').trim().length;
    if (!hasTranscript && descLen < MIN_DESC_CHARS) {
      console.log('  skip (thin: no transcript, description ' + descLen + ' < ' + MIN_DESC_CHARS + ' chars): ' + v.youtube_id + ' | ' + (v.title || '').slice(0, 60));
      continue;
    }
    eligible.push(v);
  }
  console.log('');
  console.log('Eligible after gate + dedup: ' + eligible.length + '  (processing up to ' + maxN + ')');
  console.log('');

  var toProcess = eligible.slice(0, maxN);
  var drafted = 0, selfSkipped = 0;

  for (var j = 0; j < toProcess.length; j++) {
    var vid = toProcess[j];
    var wurl = watchUrl(vid.youtube_id);
    var directiveObj = {
      url: wurl,
      source_text: buildSourceText(vid),
      creator_info: { name: vid.channelTitle || vid.channel || 'Unknown creator', game_slug: GAME_SLUG },
    };
    console.log('--- candidate ' + vid.youtube_id + '  [' + (vid.transcript ? 'transcript' : (vid.description || '').trim().length + ' chars desc') + ']  ' + (vid.title || '').slice(0, 70));

    // Generate via the SHARED generator (prompt + tool), with the auto addendum.
    var message;
    try {
      message = await anthropic.messages.create({
        model: ARTICLE_MODEL,
        max_tokens: 2000,
        system: VANTAGE_DISCOURSE_SYSTEM_PROMPT + '\n\n' + VANTAGE_DISCOURSE_AUTO_ADDENDUM,
        tools: [VANTAGE_DISCOURSE_TOOL],
        tool_choice: { type: 'tool', name: VANTAGE_DISCOURSE_TOOL.name },
        messages: [{ role: 'user', content: buildVantageDiscoursePrompt(directiveObj) }],
      });
    } catch (e) { console.error('  ANTHROPIC error (skipping candidate): ' + e.message); continue; }

    var block = (message.content || []).find(function (b) { return b.type === 'tool_use' && b.name === VANTAGE_DISCOURSE_TOOL.name; });
    if (!block) { console.log('  no tool_use (stop_reason=' + message.stop_reason + ') -- skipping'); continue; }
    var out = block.input || {};
    if (out.skip === true || !out.headline || !out.body) {
      selfSkipped++;
      console.log('  VANTAGE SELF-SKIPPED. reason: ' + (out.skip_reason || '(none)'));
      continue;
    }

    var slug = slugify(out.headline);
    var row = {
      headline: out.headline,
      body: out.body,
      editor: 'VANTAGE',
      source: 'YOUTUBE',
      source_url: wurl,
      tags: ['discourse'],
      ce_score: 0,
      is_published: false, // DRAFT -- hard gate. Nothing publishes here.
      noindex: true,       // NOT NULL + defense-in-depth until a human approve.
      thumbnail: null,
      slug: slug,
      game_slug: GAME_SLUG,
      directive_type: 'discourse',
      creator_info: directiveObj.creator_info,
    };

    console.log('  DRAFT: ' + row.headline);
    if (dry) {
      console.log('  (dry -- not written) source_url=' + wurl);
      console.log('  ----------------------------------------------------------');
      console.log(row.body);
      console.log('  ----------------------------------------------------------');
      drafted++;
      continue;
    }

    // idempotent slug guard
    var existing = await supabase.from('feed_items').select('id').eq('slug', slug).eq('game_slug', GAME_SLUG).maybeSingle();
    if (existing.data) { console.log('  SKIP insert (slug already exists): ' + slug + '  id=' + existing.data.id); continue; }
    var ins = await supabase.from('feed_items').insert(row).select('id, slug, is_published').maybeSingle();
    if (ins.error) { console.error('  INSERT FAILED: ' + ins.error.message); continue; }
    drafted++;
    console.log('  DRAFT INSERTED: id=' + ins.data.id + '  slug=' + ins.data.slug + '  source_url=' + wurl + '  (is_published=false)');
  }

  console.log('');
  console.log('Done. Drafted: ' + drafted + '   VANTAGE self-skipped: ' + selfSkipped + (dry ? '   (DRY -- nothing written)' : ''));
  if (!dry && drafted > 0) console.log('Review in admin DRAFTS (source URL is the video link) -> APPROVE to publish (renders at /intel/<slug>).');
}

main();
