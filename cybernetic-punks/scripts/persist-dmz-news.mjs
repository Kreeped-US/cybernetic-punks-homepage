// scripts/persist-dmz-news.mjs
// ============================================================
// ONE-TIME persistence of the 3 reviewed DMZ pre-launch news articles into
// feed_items (game_slug='dmz'). The article TEXT below is FROZEN: it is the
// gen-dmz-news.mjs dry-run output the owner reviewed (commit f7a3f92), later
// resynced to the shipped feed_items rows (FOB and Crafting prose rewrites plus
// the Hajin SEO trim). This script does NOT call
// the generator -- the content is locked here so what ships is exactly what was
// reviewed.
//
// CIRCULARITY: safe. The autonomous gather pipeline only ever reads feed_items
// scoped to the producing game (game_slug='marathon'); game_slug='dmz' rows are
// never re-ingested. This is a manual, one-off insert, not the pipeline reading
// its own output.
//
// IDEMPOTENT: slugs are DETERMINISTIC (no time-hash) and the script skips any
// article whose slug already exists for game_slug='dmz' -- safe to re-run.
//
// WRITES TO THE DB. Uses the service-role key (insert past RLS). Run once:
//   node scripts/persist-dmz-news.mjs            (insert any missing of the 3)
//   node scripts/persist-dmz-news.mjs --dry      (print what WOULD be inserted)
// Reads SUPABASE_SERVICE_KEY + NEXT_PUBLIC_SUPABASE_URL from env or .env.local.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

// --- minimal .env.local loader (bare-node has no Next env injection) ----------
function loadEnvLocal() {
  if (process.env.SUPABASE_SERVICE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  let raw;
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  } catch (e) {
    return;
  }
  const lines = raw.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.charAt(0) === '#') continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (val.length >= 2 && (val.charAt(0) === '"' || val.charAt(0) === "'")) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

// Deterministic slug (no time-hash, so re-runs are idempotent).
function slugify(headline) {
  return headline
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

var SOURCE_URL = 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive';

// ---------------------------------------------------------------------------
// THE 3 FROZEN ARTICLES. Bodies are line arrays joined with '\n' ('' = blank line
// between blocks) and are kept byte-for-byte in sync with the shipped feed_items
// rows (game_slug='dmz'): the FOB and Crafting prose rewrites and the Hajin SEO
// trim (near-verbatim source quotes reworded for de-duplication). Original lineage:
// f7a3f92 dry-run output + 3 hand-trims, since superseded by those DB edits.
// ---------------------------------------------------------------------------
var ARTICLES = [
  {
    headline: 'DMZ Forward Operating Base: every hub system detailed',
    tags: ['dmz', 'modern warfare 4', 'fob', 'forward operating base', 'crafting', 'pre-launch'],
    body: [
      '**How the Forward Operating Base Works in MW4 DMZ**',
      '',
      'Every DMZ run starts and ends at the Forward Operating Base. The official Call of Duty Deep Dive, published June 6, 2026, frames it around three pillars -- preparation, progression, and long-term squad support -- and describes it as both a services hub and a social staging ground where squads regroup, rearm, inspect Operators, and help onboard newer players before infil.',
      '',
      'One detail the blog states plainly: the FOB is not fixed. As you earn XP, complete Missions, and move through the Trait System, it "evolves alongside you," unlocking functionality and visually transforming as you go. The Deep Dive stops short of showing what each tier looks like, but the link between your progression and the hub\'s growth is stated directly.',
      '',
      'Rather than walk the stations in menu order, here is how they group by what you actually use them for.',
      '',
      '**The economy: earning and spending**',
      '',
      'Your Wallet holds in-game cash, and Missions and Ops are the primary source -- earnings wire straight to it. Cash covers weapons and Gunsmithing attachments, rescuing MIA Operators, and buying Lieutenant Intel. The Deep Dive also notes a wrinkle: you can run an Active Duty Operator as a cash mule in specific high-value situations like vault breaks, HVT kills, and Dynamic Ops.',
      '',
      'Spending happens at two counters. The Gunsmith sells weapons and attachments -- more effective gear costs more -- and supports up to five Attachments plus an Apex Attachment per weapon, though the blog separately confirms eight-Attachment weapons inside Hajin. Weapon progression carries across both Multiplayer and DMZ. Alongside it, the Weapon Vendor offers a rotating, limited selection of specialized weapons that refreshes periodically.',
      '',
      '**The gear loop: crafting and storage**',
      '',
      'The 3D Printer turns resources you gather in the field into functional equipment -- the blog confirms NVGs, ballistic vests, backpacks, consumables, and Killstreaks, with recipes unlocking over time. One firm limit: it does not manufacture Primary, Secondary, or Melee weapons. Those come from the Gunsmith and Vendor, keeping crafting and buying as separate lanes.',
      '',
      'What you keep between runs lives in the Stash, a persistent inventory of weapons, equipment, consumables, and valuables split between the Stash itself and your Active Duty Operator\'s Backpack and Loadout. Stash size grows as you rank up, and a Free Loadout option exists for jumping straight into a deployment.',
      '',
      '**Prep and planning**',
      '',
      'Orders and Objectives is the mission desk -- active Missions, completed objectives, rewards, and planning your next operation. The Firing Range gives you a first-person space to test Primary and Secondary builds before committing them to a run. And Active Duty / Operators manages your roster, including Operators awaiting recovery after a failed exfil; each one carries a persistent Backpack, Loadout, and Trait Tree.',
      '',
      '**The hunt and the risk**',
      '',
      'Two stations deal in danger. The Boss Board tracks hostile Lieutenants: pay for intel to pinpoint them, or climb Hunt Towers in the field to find the nearest one. Kill a Lieutenant and they drop Dog Tags that populate your Board -- but the Deep Dive is clear those tags cut both ways, staying trackable and valuable to enemy squads hunting you. The Bounty Leaderboard extends that tension, surfacing the most dangerous rival players active in the Exclusion Zone.',
      '',
      'When you are ready, Deploy handles infil through the Paid Infil System -- a quiet approach on foot, or a faster, louder entry by helicopter or plane, with an optional vehicle drop.',
      '',
      '**Still unconfirmed**',
      '',
      'The Deep Dive does not detail how many FOB upgrade tiers exist, what the Trait Tree looks like at each Operator level, or the full Weapon Vendor rotation. Imagery of the FOB is promised at a later date.',
      '',
      'DMZ launches October 23, 2026 as part of Call of Duty: Modern Warfare 4.',
    ].join('\n'),
  },
  {
    headline: 'DMZ 3D Printer crafting system: every category detailed',
    tags: ['dmz', 'modern warfare 4', '3d printer', 'crafting', 'fob', 'loadout'],
    body: [
      '**How Crafting and the 3D Printer Work in MW4 DMZ**',
      '',
      'Crafting in DMZ runs through a single machine: an upgradable 3D Printer at your FOB. The official Call of Duty Deep Dive, published June 6, 2026, describes it as the center of the between-mission prep loop -- you feed in resources recovered from the field and it manufactures equipment and rarer gear, with each upgrade unlocking "increasingly advanced crafting options."',
      '',
      'Two conveniences are called out. Materials disassemble automatically during a run, so you are not managing salvage mid-mission, and the blog describes the inventory side as "easy to navigate." What it does not detail is the upgrade path itself -- how many tiers exist, what each costs, or which outputs unlock when.',
      '',
      'The Deep Dive lists ten printable categories. Here is how they break down by role.',
      '',
      '**Survivability -- what you wear and carry**',
      '',
      'Plate Carriers cover different types of armor vest, and Backpacks come in varying sizes and specializations, determining how much you can haul out. Consumables round out staying power, spanning everything from pain killers to radiation blockers.',
      '',
      '**Offense -- what you throw and deploy**',
      '',
      'Lethals are offensive equipment built to damage or eliminate threats, with Tacticals as their non-lethal strategic counterpart. Above both sit Fire Support Items -- deployable offensive killstreak support for when a fight escalates past what you are carrying.',
      '',
      '**Utility and abilities**',
      '',
      'The Gear category covers tactical equipment like NVGs and Parachutes. Field Upgrades are the standout here, and the blog draws its one explicit DMZ-vs-Multiplayer line on them: unlike in Multiplayer, Field Upgrades in DMZ do not recharge. That single sentence is the clearest mechanical distinction the Deep Dive makes for the whole system -- an ability you print is an ability you spend, not one that cycles back.',
      '',
      '**The two structural outliers**',
      '',
      'Two categories are not really "products." Tracked Recipes is a set of tagged recipes you are actively hunting -- a pursuit rather than a finished item -- though the blog does not say how a recipe enters that tracked list or what makes it available. Special Items is the catch-all, described only as "a wide variety of items for a wide variety of purposes."',
      '',
      '**Rarity is tied to how far you push**',
      '',
      'The Deep Dive links crafting depth directly to map progression, and the language is blunt: "the deeper players push into the region, the more opportunities they uncover to secure rarer resources needed to support stronger loadouts and specialized playstyles." In practice that ties the FOB crafting loop back to in-mission risk -- the best Printer outputs depend on resources found deeper in, not on what is lying around near your infil.',
      '',
      '**Still unconfirmed**',
      '',
      'The Printer\'s upgrade tiers, per-tier resource costs, and which categories gate behind which tier are all absent from the Deep Dive. So is the mechanism behind Tracked Recipes.',
      '',
      'DMZ launches October 23, 2026 as part of Call of Duty: Modern Warfare 4.',
    ].join('\n'),
  },
  {
    headline: 'DMZ Hajin exclusion zone: what the Deep Dive reveals',
    tags: ['dmz', 'modern warfare 4', 'hajin', 'exclusion zone', 'map', 'pre-launch'],
    body: [
      '**The Setup: A Peninsula Left Behind**',
      '',
      'According to Call of Duty\'s official blog, DMZ is set against the aftermath of the Modern Warfare 4 Campaign. An exclusion zone spanning the Korean peninsula remains saturated with abandoned military technology, weapons stockpiles, and destabilizing threats. As a shadow CIA asset dropped behind enemy lines, your job is to secure abandoned weapons and technology before rival forces do.',
      '',
      'With both Rogue Operators and enemy combatants active in the zone, every squad has to read each encounter -- cooperate, fight, or slip away before things escalate -- and get out with whatever they can carry.',
      '',
      '**Hajin: The Zone Itself**',
      '',
      'Hajin sits in a contested exclusion zone where Russia meets the Korean peninsula, left saturated with military technology and strategic assets after the Modern Warfare 4 campaign. The blog characterizes it as one of the largest and most ambitious Call of Duty environments ever built, designed explicitly around exploration, environmental storytelling, and high-risk operations.',
      '',
      'The region carries the marks of its history. The Deep Dive notes the zone is scarred by radiation, mass evacuation, and the collapse of civilian infrastructure -- context that shapes the named locations players will move through:',
      '',
      '- The irradiated Fallout reactor',
      '- A highly secured Prison complex',
      '- The remains of Hajin City',
      '- A heavily defended Military Base',
      '',
      'Each region is described as offering different combat opportunities, sealed or secret areas, and traversal challenges. The blog specifically calls out points of interest with unexpected entrances accessible only via water, alongside other unnamed operational risks.',
      '',
      '**Dynamic Atmosphere**',
      '',
      'One structural detail the Deep Dive highlights is environmental change. The atmosphere within the Hajin Exclusion Zone can shift based on environmental effects, described as creating new opportunities and challenges on every run. Sudden downpours are noted as reducing visibility and forcing Operators to adapt how they explore, move, and engage. Dense fog banks and overcast skies are described as transforming familiar routes into navigational variables.',
      '',
      'The blog does not specify the full range of environmental conditions beyond rain and fog, nor does it detail how these effects are triggered or how frequently they occur.',
      '',
      '**Depth and Discovery**',
      '',
      'The Deep Dive closes its Hajin overview with a note on depth: players willing to push further into the zone can uncover hidden mysteries, pursue high-value gear, and engage in increasingly dangerous missions with greater risks and rewards. The blog does not yet specify what those missions involve or how the risk-reward structure is mechanically defined.',
      '',
      'What is clear from the announcement is that Hajin is built around layered geography -- named, distinct zones with different threat profiles, environmental storytelling embedded in the landscape, and points of interest with entrances accessible only via water.',
      '',
      'DMZ launches October 23, 2026 as part of Call of Duty: Modern Warfare 4.',
    ].join('\n'),
  },
];

async function main() {
  loadEnvLocal();
  var dry = process.argv.indexOf('--dry') !== -1;

  var url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_KEY;
  if (!dry && (!url || !key)) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).');
    process.exit(1);
  }

  var rows = ARTICLES.map(function (a) {
    return {
      headline: a.headline,
      body: a.body,
      editor: 'NEXUS',
      source: 'DEEP DIVE',
      source_url: SOURCE_URL,
      tags: a.tags,
      ce_score: 0,
      is_published: true,
      thumbnail: null,
      slug: slugify(a.headline),
      game_slug: 'dmz',
    };
  });

  console.log('DMZ news persistence' + (dry ? ' (DRY -- no write)' : '') + '. Target: feed_items, game_slug=dmz.');
  for (let i = 0; i < rows.length; i++) {
    console.log('  - ' + rows[i].slug + '   /dmz/field-intel/' + rows[i].slug);
  }

  if (dry) {
    console.log('Dry mode: nothing written.');
    return;
  }

  var supabase = createClient(url, key);

  for (let i = 0; i < rows.length; i++) {
    var row = rows[i];
    // idempotent: skip if this slug already exists for DMZ
    var existing = await supabase
      .from('feed_items')
      .select('id')
      .eq('slug', row.slug)
      .eq('game_slug', 'dmz')
      .maybeSingle();
    if (existing.data) {
      console.log('SKIP (exists): ' + row.slug + '  id=' + existing.data.id);
      continue;
    }
    var ins = await supabase.from('feed_items').insert(row).select('id, slug').maybeSingle();
    if (ins.error) {
      console.error('FAIL: ' + row.slug + ' -> ' + ins.error.message);
    } else {
      console.log('INSERTED: ' + ins.data.slug + '  id=' + ins.data.id);
    }
  }

  console.log('Done.');
}

main();
