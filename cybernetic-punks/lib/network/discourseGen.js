// lib/network/discourseGen.js
// SHARED CORE for VANTAGE discourse-draft generation. Extracted from
// scripts/gen-vantage-discourse.mjs so BOTH the CLI (that thin wrapper) and the admin
// route (app/api/admin/drafts/generate) invoke ONE implementation with identical output.
//
// generateDiscourseDraft(supabase, opts) is a pure orchestrator: it takes a Supabase
// client (service-key, provided by the caller -- never constructed here) and NEVER calls
// process.exit and NEVER throws for an EXPECTED failure -- it returns a result object
// { ok, status, code?, draftId?, slug?, gateReport?, skipped?, skipReason?, error? }. The
// caller decides what to do (the CLI maps to an exit code; the route maps to an HTTP
// status). Narration is emitted through opts.log / opts.logError callbacks so the CLI
// reproduces its exact console output (pass console.log / console.error) while the route
// stays silent (default no-ops) and reads the returned result.
//
// CONCURRENCY (server layer): a CLAIM-FIRST atomic guard. Before the expensive Anthropic
// call, the directive is flipped status pending -> consumed WHERE status='pending'; if that
// affected no row, another invocation already claimed it -> return code:'not_pending' and do
// NOT generate (this is what makes slugify's Date.now hash irrelevant -- two triggers can
// never both reach an insert). Any non-success AFTER the claim ROLLS BACK to pending, so a
// failed / skipped / duplicate attempt never strands the directive. Net end-state matches the
// old CLI exactly: consumed on success, pending on every other path.
//
// SAME OUTPUT as the CLI always produced: is_published=false + noindex=true DRAFT, the game_slug
// validation (gamesWithDiscourse), fetch-on-paste (youtubeSource), and runVantageGate's gen-time
// report. Nothing here publishes; the A11 gate at drafts/approve is a separate, later step.

import Anthropic from '@anthropic-ai/sdk';
import { ARTICLE_MODEL } from '../models.js';
import { VANTAGE_DISCOURSE_SYSTEM_PROMPT, VANTAGE_DISCOURSE_TOOL, buildVantageDiscoursePrompt } from './vantage.js';
import { logCoverageShadow } from '../coverageShadow.js';
import { runVantageGate, formatGateReport } from './vantageGate.js';
import { youtubeIdFromUrl, fetchYouTubeSource } from '../gather/youtubeSource.js';
import { gamesWithDiscourse } from '../games/index.js';

// Slug from a headline + a short Date.now hash (kept identical to the old CLI). The concurrency
// claim -- not this hash -- is what prevents duplicates; the slug uniqueness is incidental.
export function slugify(headline) {
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

// Bottom-of-article source label by URL type. Default DISCOURSE.
export function sourceLabelFor(url) {
  if (!url) return 'DISCOURSE';
  var u = url.toLowerCase();
  if (u.includes('twitch.tv')) return 'TWITCH';
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'YOUTUBE';
  if (u.includes('x.com') || u.includes('twitter.com')) return 'X';
  if (u.includes('reddit.com')) return 'REDDIT';
  return 'DISCOURSE';
}

// supabase : a service-key Supabase client (caller-provided).
// opts     : { directiveId=null (else oldest pending FIFO), dry=false, coverageSource,
//              log=noop, logError=noop }
export async function generateDiscourseDraft(supabase, opts) {
  opts = opts || {};
  var directiveId = opts.directiveId || null;
  var dry = opts.dry === true;
  var coverageSource = opts.coverageSource || 'vantage-manual';
  var log = typeof opts.log === 'function' ? opts.log : function () {};
  var logError = typeof opts.logError === 'function' ? opts.logError : function () {};

  var anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    logError('ERROR: ANTHROPIC_API_KEY must be set.');
    return { ok: false, code: 'no_api_key', error: 'ANTHROPIC_API_KEY must be set.' };
  }

  // 1. Fetch the target pending VANTAGE discourse directive (oldest, or by id).
  var q = supabase
    .from('editor_directives')
    .select('id, editor, instruction, url, directive_type, source_text, creator_info, status')
    .eq('editor', 'VANTAGE')
    .eq('directive_type', 'discourse')
    .eq('status', 'pending');
  if (directiveId) q = q.eq('id', directiveId);
  q = q.order('created_at', { ascending: true }).limit(1);

  var dirRes = await q;
  if (dirRes.error) {
    logError('ERROR reading editor_directives: ' + dirRes.error.message);
    return { ok: false, code: 'db_error', error: 'reading editor_directives: ' + dirRes.error.message };
  }
  var directive = dirRes.data && dirRes.data[0];
  if (!directive) {
    log('No pending VANTAGE discourse directive found.');
    log('Queue one in admin: DIRECTIVES tab, editor=VANTAGE, type=discourse, paste the vetted source text + creator info.');
    return { ok: false, code: 'not_found', error: directiveId
      ? ('No pending VANTAGE discourse directive with id ' + directiveId + ' (already generated or missing).')
      : 'No pending VANTAGE discourse directive found.' };
  }

  // FETCH-ON-PASTE (YouTube only): empty source_text + a YouTube url -> auto-fetch. Honest-null.
  if ((!directive.source_text || !directive.source_text.trim()) && youtubeIdFromUrl(directive.url)) {
    log('No source_text; url is a YouTube video -- attempting fetch-on-paste ...');
    try {
      var fetched = await fetchYouTubeSource(directive.url, process.env.YOUTUBE_API_KEY);
      if (fetched && fetched.source_text && fetched.source_text.trim()) {
        directive.source_text = fetched.source_text;
        log('Fetched source_text from YouTube (' + fetched.source_text.length + ' chars, ' + (fetched.hadTranscript ? 'transcript present' : 'description-only') + ').');
      } else {
        logError('YouTube fetch returned no usable source (no transcript AND thin/empty description, or the API key is unset). Not fabricating -- paste the vetted source_text into the directive and re-run.');
      }
    } catch (e) {
      logError('YouTube fetch failed: ' + e.message + '. Not fabricating -- paste the vetted source_text into the directive and re-run.');
    }
  }

  if (!directive.source_text || !directive.source_text.trim()) {
    logError('ERROR: directive ' + directive.id + ' has no source_text. VANTAGE writes strictly from a vetted source -- refusing (no source => no article).');
    return { ok: false, code: 'no_source_text', error: 'directive ' + directive.id + ' has no source_text.' };
  }

  var creatorName = (directive.creator_info && directive.creator_info.name) || '(unnamed)';
  log('Directive: ' + directive.id + '   creator=' + creatorName);

  // CONCURRENCY CLAIM (non-dry): atomic pending -> consumed. If it claims no row, another
  // invocation took it first -> refuse without generating. Rolled back to pending on any
  // non-success below (rollback()).
  var claimed = false;
  async function rollback() {
    if (!claimed) return;
    try { await supabase.from('editor_directives').update({ status: 'pending', consumed_at: null }).eq('id', directive.id); } catch (e) {}
    claimed = false;
  }
  if (!dry) {
    var claim = await supabase
      .from('editor_directives')
      .update({ status: 'consumed', consumed_at: new Date().toISOString() })
      .eq('id', directive.id)
      .eq('status', 'pending')
      .select('id');
    if (claim.error) {
      logError('ERROR claiming directive: ' + claim.error.message);
      return { ok: false, code: 'db_error', error: 'claiming directive: ' + claim.error.message };
    }
    if (!claim.data || claim.data.length === 0) {
      return { ok: false, code: 'not_pending', error: 'directive ' + directive.id + ' is no longer pending (already generated or in progress).' };
    }
    claimed = true;
  }

  // 2. Generate (tool-forced, ARTICLE_MODEL).
  var anthropic = new Anthropic({ apiKey: anthropicKey });
  var message;
  try {
    message = await anthropic.messages.create({
      model: ARTICLE_MODEL,
      max_tokens: 2000,
      system: VANTAGE_DISCOURSE_SYSTEM_PROMPT,
      tools: [VANTAGE_DISCOURSE_TOOL],
      tool_choice: { type: 'tool', name: VANTAGE_DISCOURSE_TOOL.name },
      messages: [{ role: 'user', content: buildVantageDiscoursePrompt(directive) }],
    });
  } catch (e) {
    logError('ANTHROPIC error: ' + e.message);
    await rollback();
    return { ok: false, code: 'anthropic_error', error: 'ANTHROPIC error: ' + e.message };
  }

  var block = (message.content || []).find(function (b) {
    return b.type === 'tool_use' && b.name === VANTAGE_DISCOURSE_TOOL.name;
  });
  if (!block) {
    logError('No tool_use returned (stop_reason=' + message.stop_reason + ').');
    await rollback();
    return { ok: false, code: 'no_tool_use', error: 'No tool_use returned (stop_reason=' + message.stop_reason + ').' };
  }
  var out = block.input || {};
  if (out.skip === true || !out.headline || !out.body) {
    log('VANTAGE SKIPPED -- source insufficient for an honest article. Nothing written; directive left pending.');
    if (out.skip_reason) log('  reason: ' + out.skip_reason);
    await rollback();
    return { ok: true, status: 'skipped', skipped: true, skipReason: out.skip_reason || null };
  }

  // 3. game_slug validation (order preserved: after generation, exactly as the CLI did).
  var gameSlug = directive.creator_info && directive.creator_info.game_slug;
  if (!gameSlug || !String(gameSlug).trim()) {
    logError('ERROR: directive ' + directive.id + ' has no Game Slug (creator_info.game_slug). Set it to the SUBJECT game (e.g. marathon or dmz) in the directive -- refusing to guess.');
    await rollback();
    return { ok: false, code: 'no_game_slug', error: 'directive ' + directive.id + ' has no Game Slug (creator_info.game_slug).' };
  }
  gameSlug = String(gameSlug).trim().toLowerCase();
  var supportedDiscourse = gamesWithDiscourse().map(function (g) { return g.slug; });
  if (supportedDiscourse.indexOf(gameSlug) === -1) {
    logError('ERROR: directive ' + directive.id + ' has game_slug "' + gameSlug + '", which is not a discourse-capable game. Supported today: ' + supportedDiscourse.join(', ') + ' (a game becomes supported when it gains a discourse render surface). Refusing to create an orphan.');
    await rollback();
    return { ok: false, code: 'invalid_game_slug', error: 'directive ' + directive.id + ' has game_slug "' + gameSlug + '", not a discourse-capable game. Supported today: ' + supportedDiscourse.join(', ') + '.' };
  }

  var slug = slugify(out.headline);
  var row = {
    headline: out.headline,
    body: out.body,
    editor: 'VANTAGE',
    source: sourceLabelFor(directive.url),
    source_url: directive.url || null,
    tags: ['discourse'],
    ce_score: 0,
    is_published: false, // DRAFT -- hard gate. Nothing publishes here.
    noindex: true,       // NOT NULL + defense-in-depth until a Phase 2 approve.
    thumbnail: null,
    slug: slug,
    game_slug: gameSlug, // NOT NULL.
    directive_type: 'discourse',
    creator_info: directive.creator_info || {},
  };

  log('');
  log('===== GENERATED DRAFT (review before it can ever publish) =====');
  log('HEADLINE: ' + row.headline);
  log('GAME: ' + row.game_slug + '   SOURCE: ' + row.source + '   URL: ' + (row.source_url || '(none)'));
  log('SLUG: ' + row.slug);
  log('---------------------------------------------------------------');
  log(row.body);
  log('===============================================================');
  log('');

  // VANTAGE HONESTY GATE (gen-time DETECTION, non-blocking -- same as the CLI). Never touches
  // is_published; the enforcing A11 gate lives at drafts/approve.
  var gateReport = formatGateReport(runVantageGate(row, directive.source_text));
  log(gateReport);
  log('');

  if (dry) {
    log('DRY RUN -- nothing written, directive left pending.');
    return { ok: true, status: 'dry', dry: true, row: row, gateReport: gateReport };
  }

  // 4. Insert as a DRAFT (idempotent on slug within the game).
  var existing = await supabase
    .from('feed_items')
    .select('id')
    .eq('slug', slug)
    .eq('game_slug', gameSlug)
    .maybeSingle();
  if (existing.data) {
    log('SKIP insert (slug already exists): ' + slug + '  id=' + existing.data.id);
    await rollback(); // matches the old CLI: a slug collision left the directive pending
    return { ok: true, status: 'exists', draftId: existing.data.id, slug: slug, gateReport: gateReport };
  }

  // COVERAGE SHADOW -- LOG ONLY, fail-open.
  await logCoverageShadow(supabase, {
    source: coverageSource,
    editor: 'VANTAGE',
    gameSlug: gameSlug,
    headline: row.headline,
  });

  var ins = await supabase.from('feed_items').insert(row).select('id, slug, is_published').maybeSingle();
  if (ins.error) {
    logError('INSERT FAILED: ' + ins.error.message);
    await rollback();
    return { ok: false, code: 'insert_error', error: 'INSERT FAILED: ' + ins.error.message };
  }
  log('DRAFT INSERTED: id=' + ins.data.id + '  slug=' + ins.data.slug + '  is_published=' + ins.data.is_published + ' (DRAFT -- not published, not rendered).');
  // The directive was already claimed (consumed) atomically above -- narrate it here for parity.
  log('Directive ' + directive.id + ' marked consumed.');
  log('');
  log('Review the draft in admin (DRAFTS panel) or Supabase.');

  return { ok: true, status: 'created', draftId: ins.data.id, slug: ins.data.slug, gameSlug: gameSlug, gateReport: gateReport };
}
