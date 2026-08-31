// scripts/persist-wardogs-economy.mjs
// ============================================================
// Persist ONE reviewed Wardogs pre-launch article -- the ECONOMY deep-dive, companion
// to the armory piece -- into feed_items (game_slug='wardogs') AS A DRAFT
// (is_published=FALSE, noindex=TRUE). Mirrors scripts/persist-wardogs-armory.mjs.
//
// CONFIDENCE TIERS IN THE BODY (the whole point):
//   - CONFIRMED (first-party: Steam/Team17 store, Bulkhead "TOP QUESTIONS" 18 Feb 2026,
//     official videos, @WARDOGS): the core loop ($10k ONE-TIME seed, buy-per-life off
//     one persistent wallet, cash persists match-to-match, death does not refill),
//     teamplay-pays ACTIONS (no rates), player-defined roles, the Hot Zone "double",
//     Gold Bars / Gold Market (daily-fluctuating rate, permanent cosmetics, survive
//     seasons, season-end reset + auto-convert), the death-penalty DESIGN (not a %),
//     cross-server persistence + community-server cutoff, and the monetization pledges
//     WITH PRECISE SCOPE (EA-boxed vs permanent) + the Supporter Edition + box price.
//   - ROADMAP (EA vs 1.0): the fuller off-session metagame is DESIGNED, "built through
//     EA", NOT a launch feature (Black Market / Vault / Player Skills / Challenge System
//     = named intent, flagged, not shipped).
//   - NOT FIRST-PARTY (flagged, NEVER stated as fact): every price/payout, death refund %,
//     the gold rate/formula, whether beta cash/gold carries to Sep 10 (assume WIPE),
//     faction vendors, formal player-to-player trading (a pre-alpha trailer MENTIONED it).
//
// SOURCE: first-party (Top Questions post + store page + official videos/@WARDOGS). No
// single supplied URL, so source_url is honest-NULL and the sources are named in-body.
//
// DRAFT, NOT PUBLISHED. DRY-RUN BY DEFAULT (--commit to write). Idempotent (skips the
// slug if already present for game_slug='wardogs'). Publish via the approve route or
// scripts/publish-drafts.mjs after review.
//
//   node scripts/persist-wardogs-economy.mjs           (DRY: print the plan)
//   node scripts/persist-wardogs-economy.mjs --commit  (insert the draft)

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { logCoverageShadow } from '../lib/coverageShadow.js';

function loadEnvLocal() {
  if (process.env.SUPABASE_SERVICE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  let raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  for (const line0 of raw.split('\n')) {
    const line = line0.trim();
    if (!line || line.charAt(0) === '#') continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (val.length >= 2 && (val.charAt(0) === '"' || val.charAt(0) === "'")) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

// THE FROZEN, REVIEWED ARTICLE. Straight hyphens / ASCII (house style).
const ARTICLE = {
  slug: 'wardogs-economy',
  headline: 'Wardogs economy explained: the persistent wallet, the Gold Market, and the monetization pledges',
  tags: ['wardogs', 'bulkhead', 'economy', 'cash economy', 'gold market', 'monetization', 'early access'],
  source: 'TOP QUESTIONS',
  source_url: null, // honest-null: first-party sources are named in-body (Top Questions post, store page, official videos, @WARDOGS)
  body: `**What Bulkhead Has Confirmed: The Core Loop**

Wardogs runs on a single persistent wallet. Drawing on Bulkhead's "WARDOGS - TOP QUESTIONS" post on Steam (18 February 2026), the Team17 store page, and the studio's official videos and @WARDOGS posts, every player starts their journey with $10,000. Read that precisely: the $10,000 is a ONE-TIME starting seed - it is not handed out per life or per match. You get it once, and from then on your balance is whatever you have earned and not spent.

From that wallet you buy a custom loadout at the start of each life - weapons, gear, utility, and vehicles. Cash carries match to match; it does not reset between games. And dying does not refill it. You come back to the same balance you had, minus whatever your next loadout costs. The wallet is the spine of the whole economy: one number that follows you.

Earning is built around teamplay. Bulkhead states that cash comes from reviving teammates, transport and taxi runs, kills, spotting enemies, holding the objective, "and more." Note the honest gap here: Bulkhead lists the ACTIONS that pay, but has not published the RATES - how much a revive or a capture is actually worth. Those numbers are not in the pre-launch materials.

Roles are player-defined, not locked. Instead of picking a class, you shape a role through what you buy and the XP you earn across six progression tracks (Medic and Pilot are the examples Bulkhead has given). There is no official class list to publish, because there are no fixed classes.

**The Hot Zone**

Inside the Control Zone sits a shifting sub-zone called the Hot Zone. Bulkhead confirms two things about it, and both are the same word: double. Cash earned inside the Hot Zone is doubled, and players inside it count double toward their team's player count for scoring. That is the extent of the confirmed math - "double" is the only number attached to it.

**Gold Bars and the Gold Market**

Above the cash economy sits a second, longer-term currency: Gold Bars. Per Bulkhead, cash converts to gold through a Gold Market whose exchange rate fluctuates daily. Gold buys permanent cosmetics, and unlike cash it survives seasons. At the end of a season, cash and XP reset - and any leftover cash auto-converts to gold, so what you banked is not simply deleted.

The daily-fluctuating rate is the notable part, and Bulkhead frames it the way a real market works: "invest now or buy in the dip." That framing is confirmed. The actual rate, the formula behind it, and how far it swings are not published - only that it moves day to day.

**The Death Penalty Is a Design, Not a Refund**

Wardogs deliberately avoids an arbitrary respawn countdown. Bulkhead's stated design is that the penalty for dying is not a timer someone picked - it is the time and risk of getting yourself back to the zone, with "every outcome etched into your account balance." This is a design philosophy, not a published number. There is no confirmed refund percentage or death-cost figure: the penalty is the opportunity cost of the run, not a stated fee.

**Economy Integrity Across Servers**

Bulkhead has addressed the anti-farm question directly. Cash and XP persist across both official and community servers - your balance is your balance wherever you play. But community servers that change economy values outside the bounds Bulkhead sets get cut off from the persistent wallet. In other words, you cannot spin up a modded server that pays inflated cash and carry that money back to the official economy. The persistent wallet is fenced.

**The Monetization Pledges - Read the Scope Carefully**

This is where precision matters most, because the pledges have different scopes and it would be easy to overstate them.

Confirmed and framed as permanent:
- No Battlepass.
- No Pay-to-Win.
- Cosmetics are earned by playing.
- Bulkhead will never monetize cash or gold - you cannot buy the in-game currencies.
- Bulkhead will never sell camos directly.

Confirmed but time-boxed to Early Access - do not read it as forever:
- Bulkhead has said it "won't monetize during Early Access." That pledge is scoped to EA. The studio has also said that after 1.0, some monetization may be needed to cover servers and anti-cheat. So "no monetization" is an Early Access promise, not a permanent one.

The one paid exception at launch is a cosmetic Supporter Edition ($49.99): it includes starter camos for the A-91, Bushmaster, and KH-2002, a Littlebird taxi camo, a scoreboard icon, and bobbleheads. It is optional and cosmetic.

Separately from the in-game economy, the box itself has a stepped price: $39.99 in Early Access, rising to roughly $49.99 and then about $59.99 by the 1.0 release.

**Early Access vs 1.0: What Ships and What Is Designed**

At Early Access, the persistence layer is cash (and XP). The fuller metagame - an off-session frontend where you keep working your economy between play sessions - is designed and, in Bulkhead's words, "built throughout Early Access." It is not a launch feature. Named systems such as a Black Market, a Vault, Player Skills, and a Challenge System have been mentioned as intent, not shipped mechanics. We are flagging them as designed and planned, not as things you will find at EA launch.

**Everything Above Is Bulkhead's Design. Here Is What They Have Not Put a Number On.**

The economy's shape is confirmed. The economy's numbers are not. We are not going to publish figures Bulkhead has not, because the whole point is that these become checkable only when the live Early Access economy is observable on September 10. Specifically unpublished, and flagged as such:
- Every weapon, vehicle, and ammo price.
- The exact payouts per revive, taxi run, capture, kill, or spot.
- Any death refund percentage.
- The gold exchange-rate formula or any specific rate (only that it fluctuates daily).
- Whether beta cash and gold carry into the September 10 Early Access build - assume a wipe until Bulkhead says otherwise.
- Faction-gated vendors, if any.
- Player-to-player cash trading as a formal system. A pre-alpha trailer mentioned "selling items to other players," but that was a mention, not a specified mechanic - we are not treating it as confirmed.

When the economy is live and observable, those numbers get verified in-game and published then - not guessed before launch.

Wardogs enters Steam Early Access on September 10, 2026, developed by Bulkhead and published by Team17.`,
};

async function main() {
  loadEnvLocal();
  const commit = process.argv.indexOf('--commit') !== -1;

  const row = {
    headline: ARTICLE.headline,
    body: ARTICLE.body,
    editor: 'NEXUS',
    source: ARTICLE.source,
    source_url: ARTICLE.source_url, // REAL url or null -- never synthesized
    tags: ARTICLE.tags,
    ce_score: 0,
    is_published: false, // DRAFT -- owner-reviewed before publish
    noindex: true,        // defense-in-depth while unpublished
    thumbnail: null,
    slug: ARTICLE.slug,
    game_slug: 'wardogs',
  };

  console.log('Wardogs economy persistence' + (commit ? ' (COMMIT)' : ' (DRY -- no write)') + '. Target: feed_items, game_slug=wardogs, is_published=FALSE (draft).');
  console.log('');
  console.log('  slug        : ' + row.slug);
  console.log('  headline    : ' + row.headline);
  console.log('  editor      : ' + row.editor + '   section (map in lib/games/wardogs.js): economy');
  console.log('  source      : ' + row.source + '   source_url: ' + (row.source_url || 'null (honest-null)'));
  console.log('  is_published: ' + row.is_published + '   noindex: ' + row.noindex + '   body chars: ' + row.body.length);
  console.log('');

  if (!commit) {
    console.log('DRY -- nothing written. Re-run with --commit to insert the draft (idempotent).');
    return;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).');
    process.exit(1);
  }
  const supabase = createClient(url, key);
  const existing = await supabase.from('feed_items').select('id').eq('slug', row.slug).eq('game_slug', 'wardogs').maybeSingle();
  if (existing.data) { console.log('SKIP (exists): ' + row.slug + '  id=' + existing.data.id); return; }
  await logCoverageShadow(supabase, { source: 'wardogs-economy', editor: row.editor, gameSlug: row.game_slug, headline: row.headline });
  const ins = await supabase.from('feed_items').insert(row).select('id, slug, is_published').maybeSingle();
  if (ins.error) console.error('FAIL: ' + row.slug + ' -> ' + ins.error.message);
  else console.log('INSERTED DRAFT: ' + ins.data.slug + '  id=' + ins.data.id + '  is_published=' + ins.data.is_published);
  console.log('Done. DRAFT only (is_published=false). Publish via the approve route or scripts/publish-drafts.mjs after review.');
}

main().catch((e) => { console.error(e); process.exit(1); });
