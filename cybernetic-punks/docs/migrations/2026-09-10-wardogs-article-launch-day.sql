-- 2026-09-10-wardogs-article-launch-day.sql
-- Wardogs LAUNCH-DAY article -- "Wardogs Early Access Is Live: What to Know at Launch". A feed_items
-- insert. THE OPERATOR RUNS THIS in Supabase. Claude runs no DB writes.
--
-- GROUNDING: 100% from docs/wardogs/WARDOGS_LAUNCH_REFERENCE.md -- Tier-1 facts + the Season 1
-- changelog (2026-09-09) facts, stated as fact. NO Tier-4 unknown is stated: the full named 37-gun
-- table, live per-gun vendor prices, the Gold-Bar rate, and whether all 3 factions are day-one are
-- framed as "resolves as players hit the live vendor", never asserted. Season 1 economy numbers are
-- the NEW official ones (FOB $7,500, doubled L10-20 XP, ~1.0M to L50, Heavy Tank Driver 35, Artillery
-- Career 90) -- NOT the superseded beta figures ($2,500 / 838k). The $10,000 starting-cash number is
-- deliberately NOT stated (its Season-1 value is a Tier-4 "resolves at launch" item); the structure
-- (one-time stake, buy-per-life, cash persists) is stated as fact.
--
-- WHERE IT RENDERS: /wardogs/field-intel/wardogs-early-access-is-live-what-to-know. Requires BOTH
-- this row AND the slug->section mapping in lib/games/wardogs.js WARDOGS_ARTICLE_SECTION (added on
-- this branch: section = field-intel, with the launch overview).
--
-- STATE: STAGED AS A DRAFT -- is_published=FALSE, noindex=TRUE -- so the row exists for final review
-- WITHOUT going live before 16:00 UTC. See "PUBLISH AT 16:00 UTC" below for the flip.
--
-- created_at is pinned to the LAUNCH MOMENT ('2026-09-10 16:00:00+00') so the piece sorts as
-- launch-fresh regardless of when it is staged.
--
-- EDITOR: NEXUS (wardogs' live-news voice). SECTION: field-intel.
-- BODY FORMAT: standard markdown -- whole-line **bold** headers, "- " bullets, blank-line paragraphs
-- (the shared parser renders it formatted).
-- SOURCE: source_url = the real Wardogs Steam store page (app 1867240); Bulkhead Season 1 changelog +
-- store page cited in-body.
--
-- IDEMPOTENCY: no unique key on (game_slug, slug), so a re-run DUPLICATES. Run ONCE. To reset:
-- delete from feed_items where game_slug='wardogs' and slug='wardogs-early-access-is-live-what-to-know';
--
-- Run the whole statement at once.

insert into feed_items
  (game_slug, editor, headline, slug, body, tags, source, source_url, ce_score, is_published, noindex, noindexed_at, thumbnail, created_at)
values (
  'wardogs',
  'NEXUS',
  'Wardogs Early Access Is Live: What to Know at Launch',
  'wardogs-early-access-is-live-what-to-know',
  $wd$**The Short Answer**

Wardogs is live. Bulkhead's 100-player, three-faction tactical shooter launched into Early Access today on Steam, PC only, for $39.99 -- a $49.99 Supporter Edition adds cosmetics and nothing that touches gameplay. There is no beta code, key, or queue: it is an open purchase. Consoles are not part of this launch; the launch trailer puts them in 2028.

One thing up front: if you played a beta, your progress did not carry over. Launch is a clean slate for everyone.

**What Wardogs Actually Is**

Three rival factions, up to 100 players, fighting over randomized Control Zones with combined arms -- infantry, vehicles, and destructible, buildable terrain in the same fight. It is large-scale and objective-driven, not a round-based arena shooter.

The system that sets it apart is the economy. There are no fixed classes. You start with a one-time cash stake, and before every life you buy your loadout from a vendor -- your "class" is whatever you can afford that spawn. Cash persists between matches, and it is earned by playing the objective: revives, transport, spotting, and kills all pay, and the Hot Zone pays double. Thirty-seven weapons are confirmed in the launch arsenal, three of them free faction recruit rifles to get you started.

**The Season 1 Launch State -- It Is Slower Than the Beta**

This is the most important thing to know if the betas set your expectations: launch progression is slower, and Bulkhead says so directly. The betas were tuned for a weekend; Season 1 is tuned for a season.

- Bulkhead's stated pace: the median player reaches about level 20 in 20 to 25 hours; the top few percent grind well past that for the big-ticket unlocks.
- Every season runs its own XP curve and unlock order, so this is the Season 1 shape, not a permanent one.
- The economy and XP were retuned for launch. Confirmed Season 1 changes include a $7,500 FOB vendor, a roughly doubled level 10-to-20 XP requirement, and about a million total XP to reach level 50. Farming was reined in -- selling a cheap supply crate is now worth almost nothing.
- Heavy vehicles sit behind real gates: the Heavy Tank unlocks at Driver level 35, and the Artillery Tank far later at Career level 90.

None of that is a knock. It is a game built to be played across a season, not cleared in a weekend.

**Anti-Cheat**

Bulkhead broke its own "we don't talk about anti-cheat" habit for launch. The confirmed measures: cheater bans are posted publicly, and report weight is reduced for repeat and bad-faith reporters, so the report system is harder to abuse. The deeper technical details of the system have not been laid out, and we will not guess at them.

**What's Confirmed vs. What You'll See In-Game**

We ground launch coverage in what Bulkhead has actually confirmed and flag the rest honestly. Confirmed today: the price, the platform, the identity, the Season 1 progression and economy shape above, and the 37-weapon count. Still resolving as players get into the live game: the full named weapon table, the live vendor price of each gun, the Gold Bar conversion rate, and how the three factions settle out on day one. Those come clear the moment players are working the live vendor -- and we would rather point you to them then than guess now.

**Bottom Line**

Wardogs is out, it is $39.99 on Steam, it is PC-only, and it is a slower, season-tuned game than the beta was. Buy your loadout, play the objective, and expect to earn your heavy armor. The live details fill in fast from here.

Source: Bulkhead's Wardogs Steam store page and the official Season 1 changelog + launch trailer (2026-09-09).$wd$,
  array['wardogs','early access','launch','season 1','bulkhead','steam'],
  'BULKHEAD / STEAM (Season 1 changelog + launch)',
  'https://store.steampowered.com/app/1867240/WARDOGS/',
  0,
  false,
  true,
  null,
  null,
  timestamptz '2026-09-10 16:00:00+00'
);

-- ============================================================================
-- PUBLISH AT 16:00 UTC (the flip). RECOMMENDED PATH -- the safe publish tool, which ALSO clears
-- noindex and runs the correction-guard:
--
--   node scripts/publish-drafts.mjs --game wardogs --slugs wardogs-early-access-is-live-what-to-know --commit
--
-- NOTE: the correction-guard WILL flag this draft (it co-occurs "economy" + "vendor"/"FOB", which
-- the wardogs-s1-economy-supersedes-beta correction watches). That is EXPECTED and correct -- the
-- guard is confirming a new economy article is not citing the superseded beta figures. This article
-- uses the NEW Season 1 numbers ($7,500 FOB, not $2,500), so acknowledge and publish:
--
--   node scripts/publish-drafts.mjs --game wardogs --slugs wardogs-early-access-is-live-what-to-know --commit --force
--
-- (--force publishes AND clears noindex -> is_published=true, noindex=false, noindexed_at=null.)
--
-- ALTERNATIVE (no guard, raw SQL) -- if you prefer to publish directly at 16:00 without the tool:
--   update feed_items set is_published=true, noindex=false, noindexed_at=null
--     where game_slug='wardogs' and slug='wardogs-early-access-is-live-what-to-know';
--
-- VERIFY after publishing:
--   select slug, editor, is_published, noindex, char_length(body) from feed_items
--     where game_slug='wardogs' and slug='wardogs-early-access-is-live-what-to-know';
--   -- then load /wardogs/field-intel/wardogs-early-access-is-live-what-to-know -- INDEXABLE,
--   -- renders formatted, appears in the Field Intel list.
-- ============================================================================
