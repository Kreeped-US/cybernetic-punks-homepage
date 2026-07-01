// scripts/persist-dmz-news.mjs
// ============================================================
// ONE-TIME persistence of the 3 reviewed DMZ pre-launch news articles into
// feed_items (game_slug='dmz'). The article TEXT below is FROZEN: it is the
// gen-dmz-news.mjs dry-run output the owner reviewed (commit f7a3f92), with the
// 3 hand-trims applied (see HAND-TRIMS notes inline). This script does NOT call
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
// THE 3 FROZEN ARTICLES (f7a3f92 dry-run output + the 3 hand-trims).
// Bodies are line arrays joined with '\n' ('' = blank line between blocks).
// ---------------------------------------------------------------------------
var ARTICLES = [
  {
    headline: 'DMZ Forward Operating Base: every hub system detailed',
    tags: ['dmz', 'modern warfare 4', 'fob', 'forward operating base', 'crafting', 'pre-launch'],
    body: [
      '**What the FOB Is and What It Does**',
      '',
      'Call of Duty\'s official blog published a full DMZ Deep Dive on June 6, 2026, and the most structurally detailed section covers the Forward Operating Base -- the hub players return to between every extraction operation. According to the Deep Dive, the FOB is built around three stated pillars: preparation, progression, and long-term squad support. It is also described as a social staging ground where squad members can regroup, rearm, inspect their Operators, and assist newer players before deployment.',
      '',
      'The blog is explicit that the FOB is not static. As players earn XP, complete Missions, and progress through the Trait System, the FOB "evolves alongside you" -- unlocking new functionality and visually transforming over time. The announcement does not specify what every unlock tier looks like, but the connection between player progression and hub growth is stated directly.',
      '',
      '**A Station-by-Station Breakdown**',
      '',
      'The Deep Dive lists the following stations and services inside the FOB:',
      '',
      '- **Orders and Objectives** -- tracks active Missions, completed objectives, rewards, and future operation planning.',
      '- **Stash and Loadout** -- a persistent inventory of weapons, equipment, consumables, and valuables. Gear is organized between the Stash and an Active Duty Operator\'s Backpack and Loadout. Stash size upgrades with rank. A Free Loadout option is available for immediate infil.',
      '- **Wallet** -- holds in-game cash used primarily for weapons and Gunsmithing attachments, rescuing MIA Operators, and paying for Lieutenant Intel. Cash arrives from Missions and Ops and can also be managed via an Active Duty Operator deployed as a cash mule in specific scenarios such as vault breaks, HVT defeats, or Dynamic Ops.',
      '- **3D Printer** -- a crafting station where gathered resources are turned into functional equipment and support gear. The blog specifies it does not manufacture Primary, Secondary, or Melee weapons. Confirmed craftable categories include NVGs, ballistic vests, backpacks, consumables, and Killstreaks. Recipes unlock over time.',
      '- **Gunsmith** -- weapon and attachment purchasing with cash. The Deep Dive notes up to five Attachments plus one Apex Attachment per weapon at the FOB, and separately states that eight-Attachment weapons have been confirmed within Hajin. Weapon progression carries across both Multiplayer and DMZ.',
      '- **Weapon Vendor** -- a rotating, limited selection of specialized weapons purchasable with cash, refreshing periodically.',
      '- **Firing Range** -- a first-person range for testing Primary and Secondary builds before deployment.',
      '- **Active Duty / Operators** -- manages available Operators, including those awaiting recovery after failed exfils. Each Operator carries a persistent Backpack, Loadout, and Trait Tree.',
      '- **Boss Board** -- intel hub for hostile Lieutenants. Players can pay for intel to pinpoint Lieutenant locations or climb Hunt Towers in the field. Slaying a Lieutenant drops Dog Tags that populate the Boss Board; the blog notes those tags are also trackable and valuable to enemy squads.',
      '- **Bounty Leaderboard** -- displays the most dangerous rival players currently active in the Exclusion Zone.',
      '- **Deploy** -- the infil selection point, using the Paid Infil System. Options announced include a quiet on-foot approach or faster, louder entry via helicopter or plane, with an optional vehicle drop.',
      '',
      '**What the Blog Has Not Yet Specified**',
      '',
      // HAND-TRIM 1 (FOB): removed the trailing sentence "Those details may follow
      // in additional blog installments." (asserted future installments not in the excerpt).
      'The excerpt does not detail how many FOB upgrade tiers exist, what specific Trait Tree options look like at each Operator level, or the full range of Weapon Vendor inventory.',
      '',
      'DMZ launches October 23, 2026 as part of Call of Duty: Modern Warfare 4.',
    ].join('\n'),
  },
  {
    headline: 'DMZ 3D Printer crafting system: every category detailed',
    tags: ['dmz', 'modern warfare 4', '3d printer', 'crafting', 'fob', 'loadout'],
    body: [
      '**What the 3D Printer Is**',
      '',
      'Call of Duty\'s official blog, the DMZ Deep Dive published June 6 2026, has detailed the crafting system at the center of DMZ\'s between-mission preparation loop. The system is built around a 3D Printer housed at your FOB. According to the Deep Dive, the Printer is upgradable, and upgrading it unlocks "increasingly advanced crafting options." Players use loot extracted from missions as the raw material -- feeding that recovered gear back into the Printer to manufacture equipment and rare items.',
      '',
      'One announced convenience: materials are disassembled automatically during a mission, so players do not need to manage that step in the field. The Deep Dive describes the overall inventory management as "easy to navigate."',
      '',
      '**The Ten Printable Categories**',
      '',
      'The Deep Dive lists ten distinct categories of gear the 3D Printer can produce:',
      '',
      '- Gear -- tactical equipment such as NVGs and Parachutes',
      '- Backpacks -- packs of varying sizes and specializations',
      '- Plate Carriers -- different types of armor vests',
      '- Tacticals -- strategic, non-lethal equipment',
      '- Lethals -- offensive equipment designed to damage or eliminate threats',
      '- Consumables -- beneficial items, from pain killers to radiation blockers',
      '- Field Upgrades -- abilities providing tactical support or intelligence; the Deep Dive notes that unlike in Multiplayer, Field Upgrades in DMZ do not recharge',
      '- Fire Support Items -- deployable offensive killstreak support',
      '- Tracked Recipes -- a series of tagged recipes players are actively hunting for',
      '- Special Items -- described as "a wide variety of items for a wide variety of purposes"',
      '',
      'The Field Upgrades note is the clearest mechanical distinction the blog draws between DMZ and Multiplayer for this system. The Tracked Recipes category also stands apart structurally: rather than a finished product, it represents an active pursuit of specific recipes, though the Deep Dive does not specify how recipes enter that tracked list or what triggers their availability.',
      '',
      '**Resources, Regions, and Rarity**',
      '',
      'The Deep Dive connects crafting depth directly to map progression. The announced language is direct: "the deeper players push into the region, the more opportunities they uncover to secure rarer resources needed to support stronger loadouts and specialized playstyles." This ties the FOB crafting loop back to in-mission movement -- rarer Printer outputs are linked to resources found further into the region, not to those available near a starting point.',
      '',
      'What the blog does not yet specify is the Printer\'s upgrade path itself -- how many upgrade tiers exist, what resources each tier requires, or which categories become accessible at which tier. Those details are not given in the excerpt.',
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
      'According to Call of Duty\'s official blog, DMZ is set against the aftermath of the Modern Warfare 4 Campaign. An exclusion zone spanning the Korean peninsula remains saturated with abandoned military technology, weapons stockpiles, and destabilizing threats. Players take on the role of a shadow CIA asset deployed behind enemy lines with a single directive: secure whatever weapons and technology remain before they fall into the wrong hands.',
      '',
      // HAND-TRIM 2 (Hajin): restored the full verbatim phrase "...extract whatever
      // you can carry" and dropped the "five-word summary the blog offers" framing.
      'Both Rogue Operators and enemy combatants are described as active throughout the zone. The DMZ Deep Dive frames the core tension plainly -- every squad must decide when to cooperate, when to engage, and when to disappear before tensions escalate. The blog sums up the loop directly: "Loot, fight, negotiate, betray, and extract whatever you can carry."',
      '',
      '**Hajin: The Zone Itself**',
      '',
      'Hajin is described as a contested exclusion zone nestled within a tri-point region bordering Russia and the Korean peninsula. The blog characterizes it as one of the largest and most ambitious Call of Duty environments ever built, designed explicitly around exploration, environmental storytelling, and high-risk operations.',
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
      // HAND-TRIM 3 (Hajin): "vertical or unconventional access points" -> the excerpt
      // says entrances "accessible only via water", not "vertical". Corrected.
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
