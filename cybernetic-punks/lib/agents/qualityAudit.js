// lib/agents/qualityAudit.js
// QUALITY AUDIT AGENT (Stage 1) -- operational monitoring, a SEPARATE additive
// path (not the editorial pipeline). Reads recent published articles for a game
// and runs two DETERMINISTIC checks (no LLM -- pure string/regex, cheap + fast):
//   1. codename leakage: an editor codename appearing in reader-facing prose.
//   2. retired-feature references: a SITE feature that no longer exists.
// Findings are written to quality_alerts (status 'new', human-reviewed).
//
// SCOPE / SAFETY: touches none of the protected files (editorCore, gather, the
// editor cron, admin auth). Game-agnostic: it reads the per-game config
// (lib/games) for the retired-feature list, so DMZ later supplies its own.
// The Supabase client is built INSIDE the function with the service key (the
// insert bypasses RLS) -- never at module scope, so this is force-dynamic-safe.

import { createClient } from '@supabase/supabase-js';
import { getGameConfig } from '@/lib/games';
import { getAllEditors } from '@/lib/editors/roster';

// Network-level editor codenames that must NOT leak into reader-facing article
// prose. Single-sourced from the canonical roster + VANTAGE (the network editor,
// defined separately in lib/network/vantage.js, not in the roster).
function editorCodenames() {
  var keys = getAllEditors()
    .map(function (e) { return (e && e.key ? e.key : '').toUpperCase(); })
    .filter(Boolean);
  if (keys.indexOf('VANTAGE') === -1) keys.push('VANTAGE');
  return keys;
}

// Short context window around a match for the evidence field.
function snippet(text, idx, matchLen) {
  var start = Math.max(0, idx - 40);
  var end = Math.min(text.length, idx + matchLen + 40);
  var core = text.slice(start, end).replace(/\s+/g, ' ').trim();
  return (start > 0 ? '...' : '') + core + (end < text.length ? '...' : '');
}

// runQualityAudit(gameSlug, hoursWindow = 24)
// Returns { checked, found, byType } -- found counts NEWLY written alerts.
export async function runQualityAudit(gameSlug, hoursWindow) {
  if (hoursWindow == null) hoursWindow = 24;
  var summary = { checked: 0, found: 0, byType: { codename_leak: 0, retired_feature: 0 } };

  var config;
  try { config = getGameConfig(gameSlug); } catch (e) { return summary; }

  var retired = (config.operationalAgents
    && config.operationalAgents.qualityAudit
    && config.operationalAgents.qualityAudit.retiredFeatures) || [];

  var codenames = editorCodenames();
  // Word-boundary, case-SENSITIVE all-caps. Real codename leakage shows up as the
  // uppercase backend token (CIPHER/NEXUS/...). Marathon is stealth-heavy, so
  // lowercase "ghost"/"ghosting" is pervasive LEGIT vocab -- matching ONLY the
  // ALL-CAPS form keeps this primary check trustworthy from the first run.
  // Codenames are plain uppercase letters (no regex escaping needed); \b avoids
  // substrings. No 'i' flag = case-sensitive.
  var codeRe = codenames.length ? new RegExp('\\b(' + codenames.join('|') + ')\\b') : null;

  // In-handler service-key client (RLS-bypassing insert). Anon fallback keeps
  // reads working if the service key is unset (insert would then be RLS-gated).
  var supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  var sinceIso = new Date(Date.now() - hoursWindow * 3600 * 1000).toISOString();

  var articles = [];
  try {
    var res = await supabase
      .from('feed_items')
      .select('id, headline, body, editor, created_at')
      .eq('game_slug', gameSlug)
      .eq('is_published', true)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false });
    articles = res.data || [];
  } catch (e) {
    return summary;
  }

  var findings = [];
  articles.forEach(function (a) {
    summary.checked++;
    var prose = (a.headline || '') + '\n' + (a.body || '');

    // (1) Codename leakage -- first match per article is enough for an alert.
    if (codeRe) {
      var m = codeRe.exec(prose);
      if (m) {
        findings.push({
          game_slug: gameSlug,
          article_id: a.id,
          alert_type: 'codename_leak',
          severity: 'high',
          evidence: 'Codename "' + m[1] + '" in prose: ' + snippet(prose, m.index, m[1].length),
        });
      }
    }

    // (2) Retired-feature references -- case-insensitive substring match.
    var lower = prose.toLowerCase();
    for (var i = 0; i < retired.length; i++) {
      var term = retired[i];
      if (!term) continue;
      var at = lower.indexOf(term.toLowerCase());
      if (at !== -1) {
        findings.push({
          game_slug: gameSlug,
          article_id: a.id,
          alert_type: 'retired_feature',
          severity: 'medium',
          evidence: 'Retired feature "' + term + '": ' + snippet(prose, at, term.length),
        });
        break; // one retired-feature alert per article is enough for v1
      }
    }
  });

  if (findings.length === 0) return summary;

  // Light dedupe: skip findings already alerted for the same (article, type) so
  // repeated runs (the Stage-2 cron) do not pile duplicate rows. Status-agnostic.
  var ids = findings.map(function (f) { return f.article_id; });
  var existing = {};
  try {
    var ex = await supabase
      .from('quality_alerts')
      .select('article_id, alert_type')
      .eq('game_slug', gameSlug)
      .in('article_id', ids);
    (ex.data || []).forEach(function (r) { existing[r.article_id + '|' + r.alert_type] = true; });
  } catch (e) {}

  var toInsert = findings.filter(function (f) { return !existing[f.article_id + '|' + f.alert_type]; });

  if (toInsert.length > 0) {
    try {
      await supabase.from('quality_alerts').insert(toInsert);
    } catch (e) {
      return summary;
    }
    toInsert.forEach(function (f) {
      summary.found++;
      if (summary.byType[f.alert_type] != null) summary.byType[f.alert_type]++;
    });
  }

  return summary;
}
