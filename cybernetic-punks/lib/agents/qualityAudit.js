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

  // HEARTBEAT: record this run on EVERY path (clean OR with findings) so an empty
  // quality_alerts table is unambiguous -- a recent quality_audit_runs row proves the
  // agent ran and found nothing. Best-effort: a heartbeat failure (e.g. the table not
  // created yet) is logged and NEVER breaks the scan. supabase-js does not throw on a
  // DB error (it returns { error }), so check both the result error and a rejection.
  try {
    var hb = await supabase.from('quality_audit_runs').insert({
      game_slug: gameSlug,
      articles_checked: summary.checked,
      alerts_found: findings.length,
      window_hours: hoursWindow,
    });
    if (hb && hb.error) console.error('[quality-audit] heartbeat write failed (scan unaffected):', hb.error);
  } catch (e) {
    console.error('[quality-audit] heartbeat write threw (scan unaffected):', e);
  }

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

// runBriefAudit(hoursWindow = 24)
// NETWORK-LEVEL companion to runQualityAudit. The per-game feed scan never touches
// network_brief, so an editor/VANTAGE codename leaking into a cross-game brief goes
// uncaught -- this closes that gap. Briefs have NO game_slug (they span all games), so
// this takes no gameSlug and runs ONCE per cron fire, not per game. Because the codename
// list (editorCodenames(): roster + VANTAGE) is network-level, this covers every game's
// editors automatically -- DMZ network briefs are scanned for free once DMZ launches.
//
// CODENAME LEAK ONLY in v1. Retired-feature is per-game and briefs are cross-game, so a
// retired-feature union is deferred to v2.
//
// SOURCE DISCRIMINATOR (Option A, no migration): brief-alerts are written with
// game_slug 'network'. article_id is forced NULL because quality_alerts.article_id has a
// FOREIGN KEY to feed_items -- a network_brief id is not a feed_items id and would violate
// it -- so the brief id is carried in the evidence string instead. Dedupe therefore keys on
// the brief id found inside existing network-alert evidence, not on article_id.
//
// Returns { checked, found }. Best-effort throughout: every DB step is wrapped; a failure
// logs and returns the summary, never throws (same discipline as the heartbeat).
export async function runBriefAudit(hoursWindow) {
  if (hoursWindow == null) hoursWindow = 24;
  var summary = { checked: 0, found: 0 };

  var codenames = editorCodenames();
  var codeRe = codenames.length ? new RegExp('\\b(' + codenames.join('|') + ')\\b') : null;
  if (!codeRe) return summary;

  // In-handler service-key client (RLS-bypassing insert), never at module scope.
  var supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  var sinceIso = new Date(Date.now() - hoursWindow * 3600 * 1000).toISOString();

  var briefs = [];
  try {
    var res = await supabase
      .from('network_brief')
      .select('id, hero_line, brief, created_at')
      .eq('skipped', false)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false });
    briefs = res.data || [];
  } catch (e) {
    return summary;
  }

  // findings carry briefId SEPARATELY from the insert row (the row must contain only real
  // quality_alerts columns -- a stray field would break the insert).
  var findings = [];
  briefs.forEach(function (b) {
    summary.checked++;
    var prose = (b.hero_line || '') + '\n' + (b.brief || '');
    var m = codeRe.exec(prose);
    if (m) {
      findings.push({
        briefId: b.id,
        row: {
          game_slug: 'network',
          article_id: null,
          alert_type: 'codename_leak',
          severity: 'high',
          evidence: 'Brief ' + b.id + ' - codename "' + m[1] + '" in network brief: ' + snippet(prose, m.index, m[1].length),
        },
      });
    }
  });

  // HEARTBEAT (network scope): record this scan on EVERY path so an empty quality_alerts is
  // unambiguous -- a recent game_slug='network' run row proves the brief scan ran. Best-effort.
  try {
    var hb = await supabase.from('quality_audit_runs').insert({
      game_slug: 'network',
      articles_checked: summary.checked,
      alerts_found: findings.length,
      window_hours: hoursWindow,
    });
    if (hb && hb.error) console.error('[brief-audit] heartbeat write failed (scan unaffected):', hb.error);
  } catch (e) {
    console.error('[brief-audit] heartbeat write threw (scan unaffected):', e);
  }

  if (findings.length === 0) return summary;

  // Dedupe: article_id is NULL for brief-alerts, so we cannot key on it. The brief id lives
  // in evidence ('Brief <uuid> ...') -- skip a brief if an existing network codename_leak
  // alert's evidence already references its id. Keeps repeated cron runs from piling rows.
  var alertedBriefIds = {};
  try {
    var briefIds = findings.map(function (f) { return f.briefId; });
    var ex = await supabase
      .from('quality_alerts')
      .select('evidence')
      .eq('game_slug', 'network')
      .eq('alert_type', 'codename_leak');
    (ex.data || []).forEach(function (r) {
      if (r && r.evidence) briefIds.forEach(function (id) { if (r.evidence.indexOf(id) !== -1) alertedBriefIds[id] = true; });
    });
  } catch (e) {}

  var toInsert = findings
    .filter(function (f) { return !alertedBriefIds[f.briefId]; })
    .map(function (f) { return f.row; });

  if (toInsert.length > 0) {
    try {
      await supabase.from('quality_alerts').insert(toInsert);
      summary.found = toInsert.length;
    } catch (e) {
      return summary;
    }
  }

  return summary;
}
