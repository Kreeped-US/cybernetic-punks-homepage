// scripts/gen-vantage-discourse.mjs
// ============================================================
// VANTAGE DISCOURSE-ARTICLE DRAFT GENERATOR (Phase 1). MANUAL. DRAFT-ONLY.
// ============================================================
// Reads a human-curated discourse directive from editor_directives
// (editor='VANTAGE', directive_type='discourse', status='pending'), has VANTAGE
// write a discourse ARTICLE strictly from the vetted source_text, and inserts it
// into feed_items as an UNPUBLISHED DRAFT (is_published=false). Then marks the
// directive consumed.
//
// HARD SAFETY GATE (Phase 1): this NEVER publishes and NEVER renders. The draft
// row is is_published=false + noindex=true. There is no approve->publish action
// and no render route in this phase -- those are Phase 2, built only after the
// owner verifies these drafts are honest. This script cannot flip is_published.
//
// HONESTY: VANTAGE writes STRICTLY from the directive's vetted source_text (the
// only permitted source of facts about the creator), never asserts a game's
// facts in her own voice, and never invents anything about the real person. The
// enforcement lives in lib/network/vantage.js (VANTAGE_DISCOURSE_SYSTEM_PROMPT).
// If the source is too thin to write honestly, VANTAGE skips and nothing writes.
//
// This path is FULLY ISOLATED from the Marathon editor machinery and from the
// daily cron -- it is web-unreachable and never auto-fires. It reuses ONLY the
// Anthropic SDK + ARTICLE_MODEL + the VANTAGE discourse exports + a Supabase
// service-key client (same pattern as scripts/persist-dmz-news.mjs).
//
// RUN:  node scripts/gen-vantage-discourse.mjs            (oldest pending VANTAGE discourse directive)
//       node scripts/gen-vantage-discourse.mjs --dry      (generate + print, write NOTHING, leave directive pending)
//       node scripts/gen-vantage-discourse.mjs --id <uuid>(target one directive by id)
// Needs ANTHROPIC_API_KEY + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY --
// auto-loaded from .env.local if not already in env.

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { ARTICLE_MODEL } from '../lib/models.js';
import { VANTAGE_DISCOURSE_SYSTEM_PROMPT, VANTAGE_DISCOURSE_TOOL, buildVantageDiscoursePrompt } from '../lib/network/vantage.js';
import { logCoverageShadow } from '../lib/coverageShadow.js';

// --- minimal .env.local loader (bare-node has no Next env injection) ----------
// Unlike gen-dmz-news.mjs this does NOT early-return on ANTHROPIC_API_KEY, since
// this script also needs the Supabase keys.
function loadEnvLocal() {
  var raw;
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  } catch (e) {
    return;
  }
  var lines = raw.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.charAt(0) === '#') continue;
    var eq = line.indexOf('=');
    if (eq === -1) continue;
    var key = line.slice(0, eq).trim();
    var val = line.slice(eq + 1).trim();
    if (val.length >= 2 && (val.charAt(0) === '"' || val.charAt(0) === "'")) {
      val = val.slice(1, -1);
    }
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

// Bottom-of-article source label by URL type (mirrors the cron's creator-spotlight
// labelling so the eventual render doesn't mislabel the link). Default DISCOURSE.
function sourceLabelFor(url) {
  if (!url) return 'DISCOURSE';
  var u = url.toLowerCase();
  if (u.includes('twitch.tv')) return 'TWITCH';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YOUTUBE';
  if (u.includes('x.com') || u.includes('twitter.com')) return 'X';
  if (u.includes('reddit.com')) return 'REDDIT';
  return 'DISCOURSE';
}

async function main() {
  loadEnvLocal();
  var dry = process.argv.indexOf('--dry') !== -1;
  var idArg = null;
  var idIdx = process.argv.indexOf('--id');
  if (idIdx !== -1 && process.argv[idIdx + 1]) idArg = process.argv[idIdx + 1];

  var anthropicKey = process.env.ANTHROPIC_API_KEY;
  var url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_KEY;
  if (!anthropicKey) {
    console.error('ERROR: ANTHROPIC_API_KEY must be set (env or .env.local).');
    process.exit(1);
  }
  if (!url || !key) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).');
    process.exit(1);
  }

  var supabase = createClient(url, key);

  // 1. Fetch the target pending VANTAGE discourse directive (oldest, or by --id).
  var q = supabase
    .from('editor_directives')
    .select('id, editor, instruction, url, directive_type, source_text, creator_info, status')
    .eq('editor', 'VANTAGE')
    .eq('directive_type', 'discourse')
    .eq('status', 'pending');
  if (idArg) q = q.eq('id', idArg);
  q = q.order('created_at', { ascending: true }).limit(1);

  var dirRes = await q;
  if (dirRes.error) {
    console.error('ERROR reading editor_directives: ' + dirRes.error.message);
    process.exit(1);
  }
  var directive = dirRes.data && dirRes.data[0];
  if (!directive) {
    console.log('No pending VANTAGE discourse directive found.');
    console.log('Queue one in admin: DIRECTIVES tab, editor=VANTAGE, type=discourse, paste the vetted source text + creator info.');
    return;
  }
  if (!directive.source_text || !directive.source_text.trim()) {
    console.error('ERROR: directive ' + directive.id + ' has no source_text. VANTAGE writes strictly from a vetted source -- refusing (no source => no article).');
    process.exit(1);
  }

  var creatorName = (directive.creator_info && directive.creator_info.name) || '(unnamed)';
  console.log('Directive: ' + directive.id + '   creator=' + creatorName);

  // 2. Generate the discourse article (tool-forced, ARTICLE_MODEL).
  var anthropic = new Anthropic({ apiKey: anthropicKey });
  var userPrompt = buildVantageDiscoursePrompt(directive);
  var message;
  try {
    message = await anthropic.messages.create({
      model: ARTICLE_MODEL,
      max_tokens: 2000,
      system: VANTAGE_DISCOURSE_SYSTEM_PROMPT,
      tools: [VANTAGE_DISCOURSE_TOOL],
      tool_choice: { type: 'tool', name: VANTAGE_DISCOURSE_TOOL.name },
      messages: [{ role: 'user', content: userPrompt }],
    });
  } catch (e) {
    console.error('ANTHROPIC error: ' + e.message);
    process.exit(1);
  }

  var block = (message.content || []).find(function (b) {
    return b.type === 'tool_use' && b.name === VANTAGE_DISCOURSE_TOOL.name;
  });
  if (!block) {
    console.error('No tool_use returned (stop_reason=' + message.stop_reason + ').');
    process.exit(1);
  }
  var out = block.input || {};
  if (out.skip === true || !out.headline || !out.body) {
    console.log('VANTAGE SKIPPED -- source insufficient for an honest article. Nothing written; directive left pending.');
    if (out.skip_reason) console.log('  reason: ' + out.skip_reason);
    return;
  }

  // 3. Build the DRAFT feed_items row. is_published=false is the HARD GATE;
  //    noindex=true is defense-in-depth (both NOT NULL columns are set). game_slug
  //    is the SUBJECT game -- it decides the article's canonical home and render
  //    path (marathon -> /intel, dmz -> /dmz/discourse). REQUIRED: refuse rather
  //    than silently default, so a marathon-subject piece can never land in DMZ.
  //    Set it via the directive's "Game Slug (discourse)" field (creator_info.game_slug).
  var gameSlug = directive.creator_info && directive.creator_info.game_slug;
  if (!gameSlug || !String(gameSlug).trim()) {
    console.error('ERROR: directive ' + directive.id + ' has no Game Slug (creator_info.game_slug). Set it to the SUBJECT game (e.g. marathon or dmz) in the directive -- refusing to guess.');
    process.exit(1);
  }
  gameSlug = String(gameSlug).trim().toLowerCase();
  var slug = slugify(out.headline);
  var row = {
    headline: out.headline,
    body: out.body,
    editor: 'VANTAGE',
    source: sourceLabelFor(directive.url),
    source_url: directive.url || null,
    tags: ['discourse'],
    ce_score: 0,
    is_published: false, // DRAFT -- Phase 1 hard gate. Nothing publishes here.
    noindex: true,       // NOT NULL + defense-in-depth until a Phase 2 approve.
    thumbnail: null,
    slug: slug,
    game_slug: gameSlug, // NOT NULL.
    directive_type: 'discourse',
    creator_info: directive.creator_info || {},
  };

  console.log('');
  console.log('===== GENERATED DRAFT (review before it can ever publish) =====');
  console.log('HEADLINE: ' + row.headline);
  console.log('GAME: ' + row.game_slug + '   SOURCE: ' + row.source + '   URL: ' + (row.source_url || '(none)'));
  console.log('SLUG: ' + row.slug);
  console.log('---------------------------------------------------------------');
  console.log(row.body);
  console.log('===============================================================');
  console.log('');

  if (dry) {
    console.log('DRY RUN -- nothing written, directive left pending.');
    return;
  }

  // 4. Insert as a DRAFT (idempotent on slug within the game).
  var existing = await supabase
    .from('feed_items')
    .select('id')
    .eq('slug', slug)
    .eq('game_slug', gameSlug)
    .maybeSingle();
  if (existing.data) {
    console.log('SKIP insert (slug already exists): ' + slug + '  id=' + existing.data.id);
    return;
  }
  // COVERAGE SHADOW (Unit 4b) -- LOG ONLY, fail-open. This path bypasses the
  // cron's processEditor entirely. Never blocks: the insert below runs
  // unconditionally, and the probe cannot reach the process.exit(1) path.
  await logCoverageShadow(supabase, {
    source: 'vantage-manual',
    editor: 'VANTAGE',
    gameSlug: gameSlug,
    headline: row.headline,
  });

  var ins = await supabase.from('feed_items').insert(row).select('id, slug, is_published').maybeSingle();
  if (ins.error) {
    console.error('INSERT FAILED: ' + ins.error.message);
    process.exit(1);
  }
  console.log('DRAFT INSERTED: id=' + ins.data.id + '  slug=' + ins.data.slug + '  is_published=' + ins.data.is_published + ' (DRAFT -- not published, not rendered).');

  // 5. Mark the directive consumed (mirrors the cron's directive lifecycle).
  var upd = await supabase
    .from('editor_directives')
    .update({ status: 'consumed', consumed_at: new Date().toISOString() })
    .eq('id', directive.id);
  if (upd.error) console.error('WARN: failed to mark directive consumed: ' + upd.error.message);
  else console.log('Directive ' + directive.id + ' marked consumed.');

  console.log('');
  console.log('Review the draft in admin (DRAFTS panel) or Supabase. Phase 2 adds the approve->publish action + render route.');
}

main();
