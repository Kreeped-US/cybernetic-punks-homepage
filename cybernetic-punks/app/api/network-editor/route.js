// app/api/network-editor/route.js
// VANTAGE's standalone generator -- the network editor-in-chief's own path.
// SEPARATE BY DESIGN: this route touches NONE of the protected per-game pipeline
// (lib/editorCore.js, /api/cron, lib/gather/*). It reads ONLY network-level
// signals and writes one network_brief row per run.
//
// NETWORK-LEVEL SIGNALS ONLY: games + live/launch state from ROOT_GAMES config,
// and recent cross-game feed_items HEADLINES (title/editor/game_slug/created_at)
// as framing material to POINT at. It NEVER reads any stat table (shell_stats,
// weapon_stats, shell_stat_values, meta_tiers, cradle_nodes) -- those must never
// enter Vantage's context. The meta-not-intel boundary is enforced in her prompt
// (lib/network/vantage.js, VANTAGE_BOUNDARY).
//
// Cadence: invoked at most once per day by Vercel cron (vercel.json). She is
// expected to stay quiet often -- skip=true writes a skipped row and surfaces
// nothing.

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { COMMENT_MODEL } from '@/lib/models';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import { VANTAGE_SYSTEM_PROMPT, VANTAGE_TOOL, buildVantageUserPrompt } from '@/lib/network/vantage';

export const dynamic = 'force-dynamic';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

export async function GET(req) {
  // CRON_SECRET fail-safe guard (mirrors /api/cron): inert until the secret is
  // set, then requires the Bearer header Vercel Cron sends automatically.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[VANTAGE] CRON_SECRET not set -- route is UNGUARDED. Set it in Vercel env to arm the guard.');
  } else {
    const auth = req && req.headers ? req.headers.get('authorization') : null;
    if (auth !== 'Bearer ' + cronSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // createClient INSIDE the handler (never module scope). Service key to write
  // network_brief; anon fallback keeps reads working if the service key is unset.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  try {
    // Games + state from config (network-level, no DB).
    var games = ROOT_GAMES.map(function(g) {
      return {
        label: g.label,
        live: g.pulse.mode === 'live',
        note: g.pulse.mode === 'pre-launch' ? g.pulse.note : null,
      };
    });

    // Recent cross-game HEADLINES as framing material only. Headline/editor/
    // game_slug/created_at -- never stat tables.
    var recent = [];
    try {
      var headlineRes = await supabase
        .from('feed_items')
        .select('headline, editor, game_slug, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(12);
      recent = (headlineRes.data || []).map(function(r) {
        return { game: r.game_slug, editor: r.editor, headline: r.headline, when: timeAgo(r.created_at) };
      });
    } catch (e) {
      recent = [];
    }

    var userPrompt = buildVantageUserPrompt({ games: games, recent: recent });

    // One Anthropic call, haiku-tier (COMMENT_MODEL), tool-forced for structured
    // output. Client constructed in-handler (not module scope).
    var anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    var message;
    try {
      message = await anthropic.messages.create({
        model: COMMENT_MODEL,
        max_tokens: 600,
        system: VANTAGE_SYSTEM_PROMPT,
        tools: [VANTAGE_TOOL],
        tool_choice: { type: 'tool', name: VANTAGE_TOOL.name },
        messages: [{ role: 'user', content: userPrompt }],
      });
    } catch (apiErr) {
      console.log('[VANTAGE] API error: ' + apiErr.message);
      return Response.json({ error: 'vantage_api_error', message: apiErr.message }, { status: 502 });
    }

    var block = (message.content || []).find(function(b) {
      return b.type === 'tool_use' && b.name === VANTAGE_TOOL.name;
    });
    if (!block) {
      return Response.json({ error: 'no_tool_use', stop_reason: message.stop_reason }, { status: 502 });
    }

    var out = block.input || {};
    // Skip when she says skip OR produced no hero line -- either way, nothing surfaces.
    var skip = out.skip === true || !out.hero_line;
    var nowIso = new Date().toISOString();

    var insert = {
      hero_line: skip ? null : String(out.hero_line).slice(0, 200),
      brief: skip ? null : (out.brief ? String(out.brief).slice(0, 500) : null),
      skipped: skip,
      cycle_ts: nowIso,
    };

    var { data: written, error } = await supabase
      .from('network_brief')
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.log('[VANTAGE] insert failed: ' + error.message);
      return Response.json({ error: 'insert_failed', message: error.message }, { status: 500 });
    }

    return Response.json({
      success: true,
      skipped: skip,
      id: written ? written.id : null,
      hero_line: insert.hero_line,
      has_brief: !!insert.brief,
      timestamp: nowIso,
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
