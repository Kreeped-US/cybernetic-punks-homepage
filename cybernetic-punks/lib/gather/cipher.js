// lib/gather/cipher.js
// CIPHER — Ranked Intelligence Editor synthesis pipeline
//
// Replaces the prior YouTube/Twitch-based play analysis pipeline.
// CIPHER now reads internal site state (NEXUS tier list, DEXTER builds,
// GHOST sentiment, Bungie news, game database) and produces actionable
// ranked guidance for competitive Marathon players.
//
// Five article archetypes rotate on a fixed weekly schedule (PT timezone).
// Patch detection in Bungie news overrides the schedule for that cycle.
//
// Why no external sources? The prior CIPHER pipeline depended on YouTube
// transcripts (youtube-transcript package), which fails silently from
// Vercel's serverless environment. Audit confirmed no [TRANSCRIPT] logs
// in production, meaning CIPHER was producing analysis from titles alone
// for an extended period. This rebuild eliminates that dependency entirely.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ═══════════════════════════════════════════════════════════
// WEEKLY SCHEDULE — PT timezone
// ═══════════════════════════════════════════════════════════
// 4 slots per day: [5am, 11am, 5pm, 11pm] PT
// Cron runs every 6h UTC: 00:00, 06:00, 12:00, 18:00
//   PDT (Mar-Nov, UTC-7): 17:00, 23:00, 05:00, 11:00 PT
//   PST (Nov-Mar, UTC-8): 16:00, 22:00, 04:00, 10:00 PT
//
// Schedule rationale:
//   - shell_build is the workhorse (11/28 slots) — primary SEO target
//   - weekly_climb anchors Mon/Fri/Sun 5pm — keeps "weekly" framing intact
//   - counter_meta gets 6 slots — strategic placement for losing-streak searches
//   - holotag gets 4 slots — niche audience, evergreen value
//   - patch_impact is event-triggered, never scheduled

const SCHEDULE = {
  Monday:    ['holotag',      'shell_build',  'weekly_climb', 'counter_meta'],
  Tuesday:   ['shell_build',  'counter_meta', 'shell_build',  'holotag'     ],
  Wednesday: ['counter_meta', 'shell_build',  'shell_build',  'weekly_climb'],
  Thursday:  ['shell_build',  'holotag',      'counter_meta', 'shell_build' ],
  Friday:    ['holotag',      'shell_build',  'weekly_climb', 'counter_meta'],
  Saturday:  ['shell_build',  'counter_meta', 'shell_build',  'holotag'     ],
  Sunday:    ['counter_meta', 'shell_build',  'weekly_climb', 'shell_build' ],
};

const SHELLS = ['Vandal', 'Destroyer', 'Recon', 'Assassin', 'Triage', 'Thief', 'Rook'];

// ═══════════════════════════════════════════════════════════
// SCHEDULE RESOLVER
// ═══════════════════════════════════════════════════════════
// Uses Intl.DateTimeFormat with America/Los_Angeles timezone — handles
// DST automatically. No manual UTC offset math.

function getCurrentArchetype() {
  const now = new Date();

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    hour: '2-digit',
    hour12: false,
  });

  const parts = fmt.formatToParts(now);
  const day = parts.find(function(p) { return p.type === 'weekday'; }).value;
  let hour = parseInt(parts.find(function(p) { return p.type === 'hour'; }).value, 10);
  if (hour === 24) hour = 0; // JS quirk: midnight sometimes returns 24

  // Bin hour to nearest of [5am, 11am, 5pm, 11pm]
  // Wide bins absorb cron drift and PST/PDT 1h shift
  let slot;
  if      (hour >= 2  && hour < 8)  slot = 0; // 5am
  else if (hour >= 8  && hour < 14) slot = 1; // 11am
  else if (hour >= 14 && hour < 20) slot = 2; // 5pm
  else                              slot = 3; // 11pm

  const archetype = SCHEDULE[day][slot];
  return { archetype: archetype, day: day, hour: hour, slot: slot };
}

// ═══════════════════════════════════════════════════════════
// HELPER: Find shells covered in CIPHER's recent articles
// ═══════════════════════════════════════════════════════════
// Used by buildShellBuildPrompt and buildCounterMetaPrompt to avoid
// repetition. Looks at headline + tags of last N CIPHER articles.

async function getRecentlyCoveredShells(lookbackArticles) {
  try {
    const { data } = await supabase
      .from('feed_items')
      .select('headline, tags')
      .eq('editor', 'CIPHER')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(lookbackArticles);

    const covered = new Set();
    (data || []).forEach(function(article) {
      const text = (article.headline + ' ' + (article.tags || []).join(' ')).toLowerCase();
      SHELLS.forEach(function(shell) {
        if (text.includes(shell.toLowerCase())) covered.add(shell);
      });
    });
    return covered;
  } catch (err) {
    console.log('[GATHER:CIPHER] getRecentlyCoveredShells error: ' + err.message);
    return new Set();
  }
}

// ═══════════════════════════════════════════════════════════
// ARCHETYPE 1: BEST RANKED SOLO BUILD
// ═══════════════════════════════════════════════════════════
// Picks a shell (excluding last 4 covered), pulls shell stats and current
// tier state, lists S/A tier weapons. Asks CIPHER to design the best
// ranked solo build for that shell this week.

async function buildShellBuildPrompt() {
  const recentShells = await getRecentlyCoveredShells(4);
  const available = SHELLS.filter(function(s) { return !recentShells.has(s); });
  const targetShell = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : SHELLS[Math.floor(Math.random() * SHELLS.length)];

  const [shellRes, tierRes, weaponsRes] = await Promise.all([
    supabase.from('shell_stats').select('*').eq('name', targetShell).maybeSingle(),
    supabase.from('meta_tiers')
      .select('tier, ranked_tier_solo, ranked_tier_squad, note, ranked_note, trend, holotag_tier')
      .eq('name', targetShell).eq('type', 'shell').maybeSingle(),
    supabase.from('meta_tiers')
      .select('name, tier, ranked_tier_solo, note, ranked_note, trend')
      .eq('type', 'weapon').in('ranked_tier_solo', ['S', 'A'])
      .order('ranked_tier_solo'),
  ]);

  const shell = shellRes.data;
  const shellTier = tierRes.data;
  const weapons = weaponsRes.data || [];

  const shellSection = shell
    ? 'SHELL: ' + targetShell + '\n'
      + 'Role: ' + (shell.role || 'Unknown') + '\n'
      + 'Active Ability: ' + (shell.active_ability_name || 'Unknown')
      + (shell.active_ability_description ? ' — ' + shell.active_ability_description : '') + '\n'
      + 'Passive Ability: ' + (shell.passive_ability_name || 'Unknown')
      + (shell.passive_ability_description ? ' — ' + shell.passive_ability_description : '') + '\n'
      + 'Health: ' + (shell.base_health || '?') + ' | Shield: ' + (shell.base_shield || '?')
      + ' | Speed: ' + (shell.base_speed || '?')
    : 'SHELL: ' + targetShell + ' (database entry incomplete)';

  const tierSection = shellTier
    ? 'CURRENT TIER STATE: ' + targetShell + ' is '
      + (shellTier.tier || '?') + '-tier overall, '
      + (shellTier.ranked_tier_solo || '?') + '-tier ranked solo, '
      + (shellTier.ranked_tier_squad || '?') + '-tier ranked squad. '
      + 'Trend: ' + (shellTier.trend || 'stable') + '.'
      + (shellTier.ranked_note ? ' Ranked context: ' + shellTier.ranked_note : '')
      + (shellTier.holotag_tier ? ' Holotag benchmark: ' + shellTier.holotag_tier : '')
    : 'CURRENT TIER STATE: ' + targetShell + ' tier data not yet established by NEXUS.';

  const weaponsSection = weapons.length > 0
    ? 'CURRENT S AND A TIER WEAPONS (RANKED SOLO):\n' + weapons.map(function(w) {
        return '- ' + w.name + ' [Solo: ' + (w.ranked_tier_solo || '?')
          + ', Overall: ' + (w.tier || '?') + ', Trend: ' + (w.trend || 'stable') + ']'
          + (w.ranked_note ? ' — ' + w.ranked_note : (w.note ? ' — ' + w.note : ''));
      }).join('\n')
    : 'WEAPON TIER STATE: NEXUS tier data not yet established. Use weapon database in system context.';

  return 'ARCHETYPE: BEST RANKED SOLO BUILD — ' + targetShell + '\n\n'
    + 'Your job: design and recommend the optimal ranked solo build for ' + targetShell + ' '
    + 'this week, based on current tier state and available weapons. Players will read this '
    + 'to decide their loadout before queueing ranked.\n\n'
    + shellSection + '\n\n'
    + tierSection + '\n\n'
    + weaponsSection + '\n\n'
    + 'ARTICLE GUIDANCE:\n'
    + '- Headline must include "' + targetShell + '" and a build/loadout focus phrase. '
    + 'Examples: "Best ' + targetShell + ' Build for Ranked Solo This Week", '
    + '"The ' + targetShell + ' Loadout Climbing Holotag Right Now", '
    + '"' + targetShell + ' Ranked Solo Build — Current Meta".\n'
    + '- Recommend ONE primary weapon and ONE secondary, grounded in current tier state.\n'
    + '- Recommend specific implant and mod choices from the database in your system context.\n'
    + '- State the build win condition explicitly.\n'
    + '- Set runner_grade based on this build\'s strength in the current meta. S+/S = top of '
    + 'meta in this shell\'s strongest tier state. B/A = solid but not dominant. C/D = off-meta '
    + 'or fighting against shell\'s tier weaknesses.\n'
    + '- Set source_video_id to null and source_type to null. This article is internal synthesis, '
    + 'not video analysis.\n'
    + '- Tags must include: "ranked", "' + targetShell.toLowerCase() + '", "build", and the '
    + 'primary weapon name in lowercase.\n'
    + '- Body 400-600 words, 3+ section headers using **HEADER** syntax.\n\n'
    + 'This is search-targeted content. Players Google "best ' + targetShell + ' build" — your '
    + 'headline and body should rank for that query and adjacent ones.';
}

// ═══════════════════════════════════════════════════════════
// ARCHETYPE 2: COUNTER-META
// ═══════════════════════════════════════════════════════════
// Targets the current S-tier shell unless it was countered in the last
// 2 articles, in which case falls through to A-tier.

async function buildCounterMetaPrompt() {
  // Get all S/A tier shells from meta_tiers, ranked solo
  const { data: tieredShells } = await supabase
    .from('meta_tiers')
    .select('name, tier, ranked_tier_solo, ranked_tier_squad, note, ranked_note, trend')
    .eq('type', 'shell')
    .in('ranked_tier_solo', ['S', 'A'])
    .order('ranked_tier_solo'); // S first, then A

  if (!tieredShells || tieredShells.length === 0) {
    // Fallback: pick a random shell as "dominant" — meta data not yet seeded
    const fallback = SHELLS[Math.floor(Math.random() * SHELLS.length)];
    return buildCounterMetaForShell(fallback, null);
  }

  // Find which shell was the counter target in last 2 CIPHER counter-meta articles
  const { data: recent } = await supabase
    .from('feed_items')
    .select('headline, tags')
    .eq('editor', 'CIPHER')
    .eq('is_published', true)
    .contains('tags', ['counter-meta'])
    .order('created_at', { ascending: false })
    .limit(2);

  const recentlyCountered = new Set();
  (recent || []).forEach(function(article) {
    const text = (article.headline + ' ' + (article.tags || []).join(' ')).toLowerCase();
    SHELLS.forEach(function(shell) {
      if (text.includes(shell.toLowerCase())) recentlyCountered.add(shell);
    });
  });

  // Pick first shell in tier order not recently countered
  let targetShell = null;
  let targetTier = null;
  for (let i = 0; i < tieredShells.length; i++) {
    if (!recentlyCountered.has(tieredShells[i].name)) {
      targetShell = tieredShells[i].name;
      targetTier = tieredShells[i];
      break;
    }
  }

  // If everything in S/A was recently countered, just take the top S-tier
  if (!targetShell) {
    targetShell = tieredShells[0].name;
    targetTier = tieredShells[0];
  }

  return buildCounterMetaForShell(targetShell, targetTier);
}

async function buildCounterMetaForShell(targetShell, tierInfo) {
  const [shellRes, weaponsRes] = await Promise.all([
    supabase.from('shell_stats').select('*').eq('name', targetShell).maybeSingle(),
    supabase.from('meta_tiers')
      .select('name, tier, ranked_tier_solo, note, ranked_note, trend')
      .eq('type', 'weapon').in('ranked_tier_solo', ['S', 'A']),
  ]);

  const shell = shellRes.data;
  const weapons = weaponsRes.data || [];

  const targetSection = shell
    ? 'COUNTER TARGET: ' + targetShell + '\n'
      + 'Why dominant: ' + (tierInfo
          ? (tierInfo.ranked_tier_solo + '-tier ranked solo, trend ' + (tierInfo.trend || 'stable')
            + (tierInfo.ranked_note ? '. ' + tierInfo.ranked_note : ''))
          : 'Currently meta-relevant') + '\n'
      + 'Active Ability: ' + (shell.active_ability_name || 'Unknown')
      + (shell.active_ability_description ? ' — ' + shell.active_ability_description : '') + '\n'
      + 'Passive Ability: ' + (shell.passive_ability_name || 'Unknown')
      + (shell.passive_ability_description ? ' — ' + shell.passive_ability_description : '') + '\n'
      + 'Health: ' + (shell.base_health || '?') + ' | Shield: ' + (shell.base_shield || '?')
      + ' | Speed: ' + (shell.base_speed || '?')
    : 'COUNTER TARGET: ' + targetShell + ' (limited data)';

  const counterWeaponsSection = weapons.length > 0
    ? 'AVAILABLE COUNTER-WEAPONS (currently S/A tier):\n' + weapons.map(function(w) {
        return '- ' + w.name + ' [' + (w.ranked_tier_solo || '?') + '-tier solo, '
          + (w.trend || 'stable') + ']'
          + (w.ranked_note ? ' — ' + w.ranked_note : '');
      }).join('\n')
    : 'COUNTER-WEAPONS: NEXUS tier data pending. Use weapon database in system context.';

  return 'ARCHETYPE: COUNTER-META — How to Beat ' + targetShell + '\n\n'
    + 'Your job: explain how to counter ' + targetShell + ' in ranked solo. Players reading '
    + 'this are losing to ' + targetShell + ' and searching for solutions. Give them a real '
    + 'answer grounded in stats and abilities, not vague "play smart" advice.\n\n'
    + targetSection + '\n\n'
    + counterWeaponsSection + '\n\n'
    + 'ARTICLE GUIDANCE:\n'
    + '- Headline must include "' + targetShell + '" and a counter framing. Examples: '
    + '"How to Beat ' + targetShell + ' in Ranked Solo", '
    + '"The Counter to ' + targetShell + ' Most Players Miss", '
    + '"' + targetShell + ' Is Dominating — Here\'s What Beats It".\n'
    + '- Identify ' + targetShell + '\'s exploitable weakness from its ability kit and stats.\n'
    + '- Recommend specific weapon/shell counter combinations from the data above.\n'
    + '- Cover positional play and timing — when ' + targetShell + ' is most vulnerable.\n'
    + '- runner_grade rates the COUNTER STRATEGY\'s effectiveness, not ' + targetShell + ' itself. '
    + 'S+/S = reliable hard counter. B/A = situational counter. C/D = best you can do, but not great.\n'
    + '- Set source_video_id null, source_type null.\n'
    + '- Tags must include: "ranked", "counter-meta", "' + targetShell.toLowerCase() + '".\n'
    + '- Body 400-600 words, 3+ section headers.\n\n'
    + 'This is high-intent search content. "How to beat [shell]" is exactly what frustrated '
    + 'ranked players type after a losing streak.';
}

// ═══════════════════════════════════════════════════════════
// ARCHETYPE 3: WEEKLY RANKED CLIMB PLAYBOOK
// ═══════════════════════════════════════════════════════════
// Synthesizes current meta state, recent community sentiment, and any
// patch news into a "this week, climb like this" guide.

async function buildWeeklyClimbPrompt() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [topShellsRes, topWeaponsRes, ghostRes, dexterRes] = await Promise.all([
    supabase.from('meta_tiers')
      .select('name, tier, ranked_tier_solo, ranked_tier_squad, ranked_note, trend')
      .eq('type', 'shell').in('ranked_tier_solo', ['S', 'A'])
      .order('ranked_tier_solo').limit(6),
    supabase.from('meta_tiers')
      .select('name, tier, ranked_tier_solo, ranked_note, trend')
      .eq('type', 'weapon').in('ranked_tier_solo', ['S', 'A'])
      .order('ranked_tier_solo').limit(8),
    supabase.from('feed_items')
      .select('headline, body, ce_score')
      .eq('editor', 'GHOST').eq('is_published', true)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false }).limit(3),
    supabase.from('feed_items')
      .select('headline, tags')
      .eq('editor', 'DEXTER').eq('is_published', true)
      .gte('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false }).limit(5),
  ]);

  const topShells = topShellsRes.data || [];
  const topWeapons = topWeaponsRes.data || [];
  const ghostArticles = ghostRes.data || [];
  const dexterArticles = dexterRes.data || [];

  const shellSection = topShells.length > 0
    ? 'TOP SHELLS THIS WEEK (RANKED SOLO):\n' + topShells.map(function(s) {
        return '- ' + s.name + ' [' + (s.ranked_tier_solo || '?') + '-solo, '
          + (s.ranked_tier_squad || '?') + '-squad, ' + (s.trend || 'stable') + ']'
          + (s.ranked_note ? ' — ' + s.ranked_note : '');
      }).join('\n')
    : 'TOP SHELLS: NEXUS tier data pending.';

  const weaponSection = topWeapons.length > 0
    ? 'TOP WEAPONS THIS WEEK (RANKED SOLO):\n' + topWeapons.map(function(w) {
        return '- ' + w.name + ' [' + (w.ranked_tier_solo || '?') + ', ' + (w.trend || 'stable') + ']'
          + (w.ranked_note ? ' — ' + w.ranked_note : '');
      }).join('\n')
    : 'TOP WEAPONS: NEXUS tier data pending.';

  const ghostSection = ghostArticles.length > 0
    ? 'COMMUNITY SENTIMENT (last 7 days, from GHOST):\n' + ghostArticles.map(function(g, i) {
        return (i + 1) + '. ' + g.headline + ' (mood: ' + (g.ce_score || '?') + '/10)\n'
          + '   ' + (g.body || '').slice(0, 300) + '...';
      }).join('\n\n')
    : 'COMMUNITY SENTIMENT: No recent GHOST articles to draw from.';

  const dexterSection = dexterArticles.length > 0
    ? 'RECENT BUILD COVERAGE (last 7 days, from DEXTER):\n' + dexterArticles.map(function(d) {
        return '- ' + d.headline + ' [tags: ' + (d.tags || []).join(', ') + ']';
      }).join('\n')
    : 'RECENT BUILDS: No recent DEXTER articles.';

  return 'ARCHETYPE: WEEKLY RANKED CLIMB PLAYBOOK\n\n'
    + 'Your job: synthesize the current ranked meta state into actionable climb advice for '
    + 'this week. Players reading this are about to grind ranked and want to know what to '
    + 'play, what to avoid, and what mental frame to enter the queue with.\n\n'
    + shellSection + '\n\n'
    + weaponSection + '\n\n'
    + ghostSection + '\n\n'
    + dexterSection + '\n\n'
    + 'ARTICLE GUIDANCE:\n'
    + '- Headline framing: "This Week\'s Ranked Climb Playbook", "How to Climb in Marathon '
    + 'Ranked This Week", "The Ranked Solo Strategy That\'s Working Right Now".\n'
    + '- Pick a clear thesis: what is the path of least resistance to climb this week?\n'
    + '- Recommend 2-3 specific shell/weapon combinations from the data above.\n'
    + '- Address community frustrations from GHOST coverage where relevant.\n'
    + '- Address mental game: tilt management, queue discipline, when to stop playing.\n'
    + '- runner_grade rates this week\'s climb difficulty. S+/S = easy week to climb. '
    + 'B/A = average. C/D = brutal week, climb at your own risk.\n'
    + '- Set source_video_id null, source_type null.\n'
    + '- Tags must include: "ranked", "climb", "weekly".\n'
    + '- Body 400-600 words, 3+ section headers.\n\n'
    + 'This is a recurring weekly format. Players should learn to expect it on Monday and '
    + 'Friday and Sunday evenings. Make it the article they bookmark before queueing.';
}

// ═══════════════════════════════════════════════════════════
// ARCHETYPE 4: HOLOTAG TIER BENCHMARKS
// ═══════════════════════════════════════════════════════════
// What builds and skills define each Holotag tier. Niche, evergreen,
// strong long-tail SEO play.

async function buildHolotagPrompt() {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString();

  const [tierStateRes, dexterBuildsRes] = await Promise.all([
    supabase.from('meta_tiers')
      .select('name, type, tier, ranked_tier_solo, ranked_tier_squad, holotag_tier, ranked_note, trend')
      .not('holotag_tier', 'is', null)
      .order('holotag_tier'),
    supabase.from('feed_items')
      .select('headline, tags, ce_score')
      .eq('editor', 'DEXTER').eq('is_published', true)
      .gte('created_at', fourteenDaysAgo)
      .order('ce_score', { ascending: false }).limit(8),
  ]);

  const tierState = tierStateRes.data || [];
  const dexterBuilds = dexterBuildsRes.data || [];

  const tierSection = tierState.length > 0
    ? 'HOLOTAG-FLAGGED ITEMS:\n' + tierState.map(function(t) {
        return '- ' + t.name + ' (' + t.type + '): Holotag tier '
          + (t.holotag_tier || '?') + ', overall ' + (t.tier || '?')
          + ', ranked solo ' + (t.ranked_tier_solo || '?')
          + (t.ranked_note ? ' — ' + t.ranked_note : '');
      }).join('\n')
    : 'HOLOTAG DATA: No items currently flagged with holotag tiers in NEXUS data.';

  const buildsSection = dexterBuilds.length > 0
    ? 'TOP DEXTER BUILDS (last 14 days):\n' + dexterBuilds.map(function(b) {
        return '- ' + b.headline + ' [score: ' + (b.ce_score || '?')
          + ', tags: ' + (b.tags || []).join(', ') + ']';
      }).join('\n')
    : 'BUILDS: No recent DEXTER coverage.';

  return 'ARCHETYPE: HOLOTAG TIER BENCHMARKS\n\n'
    + 'Your job: explain what builds, skills, and shells define each Holotag tier in ranked '
    + 'play. Players reading this want to know: "What do I need to be doing to break into '
    + 'the next Holotag tier?" Give them concrete benchmarks.\n\n'
    + tierSection + '\n\n'
    + buildsSection + '\n\n'
    + 'ARTICLE GUIDANCE:\n'
    + '- Headline framing: "Marathon Holotag Tier Benchmarks", "What Each Holotag Tier '
    + 'Actually Requires", "The Builds That Separate Holotag Tiers".\n'
    + '- Walk through Holotag tiers from low to high. For each: what build/shell archetypes '
    + 'are common, what skill ceiling is expected, what separates this tier from the next.\n'
    + '- Reference the data above — flagged items, top-graded builds — but you may also draw '
    + 'on the full game database in your system context for shell and weapon characteristics.\n'
    + '- Be honest about skill gaps. The article should help players self-locate honestly.\n'
    + '- runner_grade rates the article\'s utility for the GRINDING player audience. Always '
    + 'B or higher — this archetype is meant to be a reference players return to.\n'
    + '- Set source_video_id null, source_type null.\n'
    + '- Tags must include: "ranked", "holotag", "benchmarks".\n'
    + '- Body 400-600 words, 3+ section headers.\n\n'
    + 'This is evergreen long-tail SEO content. Players grinding ranked will return to it '
    + 'across weeks as their Holotag changes.';
}

// ═══════════════════════════════════════════════════════════
// ARCHETYPE 5: PATCH IMPACT (event-triggered only)
// ═══════════════════════════════════════════════════════════
// Triggered by Bungie news with is_patch_note=true. Translates patch
// content into ranked competitive implications.

async function buildPatchImpactPrompt(patchItems) {
  const patchSection = patchItems.map(function(p) {
    return 'TITLE: ' + p.title
      + (p.url ? '\nURL: ' + p.url : '')
      + (p.contents ? '\nCONTENT: ' + p.contents.slice(0, 800) : '');
  }).join('\n\n---\n\n');

  // Pull current meta state for "before/after" framing
  const { data: currentMeta } = await supabase
    .from('meta_tiers')
    .select('name, type, ranked_tier_solo, ranked_tier_squad, trend, ranked_note')
    .in('ranked_tier_solo', ['S', 'A', 'BAN'])
    .order('ranked_tier_solo')
    .limit(20);

  const metaSection = currentMeta && currentMeta.length > 0
    ? 'CURRENT META STATE (pre-patch baseline):\n' + currentMeta.map(function(m) {
        return '- ' + m.name + ' (' + m.type + '): ' + (m.ranked_tier_solo || '?')
          + '-tier solo, ' + (m.ranked_tier_squad || '?') + '-tier squad, '
          + (m.trend || 'stable')
          + (m.ranked_note ? ' — ' + m.ranked_note : '');
      }).join('\n')
    : 'META STATE: tier data pending.';

  return 'ARCHETYPE: PATCH IMPACT — RANKED COMPETITIVE IMPLICATIONS\n\n'
    + 'Your job: translate the Bungie patch below into ranked competitive implications. What '
    + 'shells got better? What got worse? What builds are now broken or newly viable? Players '
    + 'reading this just heard about the patch and want to know what to swap to immediately.\n\n'
    + 'BUNGIE PATCH CONTENT:\n\n' + patchSection + '\n\n'
    + metaSection + '\n\n'
    + 'ARTICLE GUIDANCE:\n'
    + '- Headline must reference the patch and ranked impact. Examples: "Marathon Patch '
    + 'Impact: Ranked Winners and Losers", "What This Patch Means for Ranked Solo Climbers", '
    + '"Every Build the New Patch Just Broke or Made Viable".\n'
    + '- Walk through specific changes from the patch content. Map each change to a '
    + 'competitive implication.\n'
    + '- Be specific: name shells, weapons, mods, abilities affected.\n'
    + '- Recommend immediate loadout swaps for ranked players.\n'
    + '- runner_grade rates the patch\'s impact magnitude. S+/S = meta-shifting patch. '
    + 'B/A = meaningful balance pass. C/D = minor patch with limited ranked impact.\n'
    + '- Set source_video_id null. Set source_type null.\n'
    + '- Tags must include: "ranked", "patch", "meta-shift".\n'
    + '- Body 400-600 words, 3+ section headers.\n\n'
    + 'This article publishes the same cycle the patch is detected. Speed and accuracy matter — '
    + 'be the first authoritative read on what the patch means for ranked.';
}

// ═══════════════════════════════════════════════════════════
// MAIN EXPORT
// ═══════════════════════════════════════════════════════════

export async function gatherCipher(bungieNews) {
  const patchItems = (bungieNews || []).filter(function(n) { return n.is_patch_note; });
  const hasPatch = patchItems.length > 0;

  let archetype;
  let scheduleInfo = null;

  if (hasPatch) {
    archetype = 'patch_impact';
    console.log('[GATHER:CIPHER] Patch detected (' + patchItems.length
      + ' items) — overriding schedule to patch_impact');
  } else {
    scheduleInfo = getCurrentArchetype();
    archetype = scheduleInfo.archetype;
    console.log('[GATHER:CIPHER] Schedule: ' + scheduleInfo.day + ' hour ' + scheduleInfo.hour
      + ' slot ' + scheduleInfo.slot + ' → ' + archetype);
  }

  let prompt = null;
  try {
    switch (archetype) {
      case 'shell_build':
        prompt = await buildShellBuildPrompt();
        break;
      case 'counter_meta':
        prompt = await buildCounterMetaPrompt();
        break;
      case 'weekly_climb':
        prompt = await buildWeeklyClimbPrompt();
        break;
      case 'holotag':
        prompt = await buildHolotagPrompt();
        break;
      case 'patch_impact':
        prompt = await buildPatchImpactPrompt(patchItems);
        break;
      default:
        console.error('[GATHER:CIPHER] Unknown archetype: ' + archetype);
        return null;
    }
  } catch (err) {
    console.error('[GATHER:CIPHER] Build error for archetype ' + archetype + ': ' + err.message);
    return null;
  }

  if (!prompt) {
    console.log('[GATHER:CIPHER] No prompt produced for archetype: ' + archetype);
    return null;
  }

  console.log('[GATHER:CIPHER] Ready: archetype=' + archetype
    + ', prompt length=' + prompt.length + ' chars');
  return prompt;
}