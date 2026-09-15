-- 2026-09-15-wardogs-black-market-draft.sql
-- HELD. Operator pastes + runs in Supabase (rule 2). Inserts ONE Wardogs Black Market article
-- as a DRAFT (is_published=false) -> it appears in the admin Drafts panel (gate_status=clear,
-- rejected=false) for review. On APPROVE the app flips is_published=true + noindex=false.
-- Conventions matched to a live Wardogs article: game_slug=wardogs, editor=NEXUS (the sole
-- Wardogs editor), directive_type=standard, noindex=true (draft), tags text[], jsonb defaults.
-- Section: the slug is mapped to the ECONOMY section in lib/games/wardogs.js
-- (WARDOGS_ARTICLE_SECTION) so on approval it renders at /wardogs/economy/wardogs-black-market-whats-live-vs-coming.
-- Idempotent: the WHERE NOT EXISTS guard makes a re-run a no-op (no unique-constraint dependency).

INSERT INTO feed_items (game_slug, editor, headline, body, source, source_url, slug, tags,
  is_published, noindex, gate_status, rejected, directive_type, creator_info, reaction_counts)
SELECT
  'wardogs',
  'NEXUS',
  'Wardogs Black Market: What''s Actually Live vs. What''s Still Coming',
  'If you have been searching for how the Wardogs "black market" works, you have probably run into a lot of confusion. That is because most of what people describe as the black market was pitched by Bulkhead as a roadmap for Early Access, and a lot of it has not actually shipped yet. Here is the honest breakdown of what is live right now versus what is still a plan.

**What''s Live Right Now**

Two pieces of the economy layer are actually in the game today:

- The Gold Exchange. You can optionally convert your in-game cash into Gold Bars at a daily floating rate. The rate moves each day, so there is a "buy in the dip" element to it. This is real and in the game now.
- Gold for cosmetics. Those Gold Bars buy end-game cosmetics that stay permanently unlocked across seasons. This is the sanctioned way to spend gold, and it is live.

The intended loop tying these together: at the end of a season, Wardogs resets your cash and XP progression, auto-converts your leftover cash into Gold Bars, and your gold plus cosmetics carry over. The seasonal-wipe design is in the game''s own copy, though no wipe date has been announced yet.

**What Was Pitched But Hasn''t Shipped**

In Bulkhead''s "Early Access & Beyond" video, they laid out a much bigger black market vision. As of now, most of it is design intent, not something you can do in-game:

- Arms-dealer overnight smuggling (bribing a dealer to smuggle you weapons or ammo between matches) - not shipped.
- Kill wagers (betting you can get 10 kills in a life next match) - not shipped.
- Owning manufacturers (investing in weapon or vehicle businesses to produce loadouts cheaper than the in-match vendor) - not shipped.
- A player-driven shop (selling unlocked high-level items to other players at your own markup) - not shipped as a meta shop.
- A persistent vault of black-market guns and vehicles you redeem for free in future matches - not shipped (the in-match supply crates and FOB are a different system).

**The Honest Bottom Line**

Bulkhead was clear about this themselves in the same video: the metagame "is not all ready on day one - we''re building during Early Access - the foundations are in." So if you see a guide telling you to run your own weapon factory or place wagers in the Wardogs black market right now, that is describing the roadmap, not the current game.

What you can actually do today: convert cash to gold, ride the daily rate, and buy permanent cosmetics. Everything past that is Early Access design intent - promising, but not live.

One more note on monetization, since it comes up: Bulkhead''s Early Access stance is no buying cash or gold with real money - skins and cash must be earned, and gold-for-cosmetics is the intended sink. That is the Early Access pledge; full-release monetization was left open.

Sources: Bulkhead''s "WARDOGS | Early Access & Beyond" developer video (Gold Exchange at ~2:33, Black Market roadmap at ~4:12); Bulkhead''s "Clarifying Our Stance on MTX" statement. Status current as of September 15, 2026 - we will update this as roadmap features ship.',
  'Bulkhead "WARDOGS | Early Access & Beyond" dev video + "Clarifying Our Stance on MTX"',
  'https://www.youtube.com/watch?v=PQvtvAvl-78',
  'wardogs-black-market-whats-live-vs-coming',
  ARRAY['wardogs','black market','economy','gold exchange','cosmetics','early access','monetization','bulkhead']::text[],
  false,           -- is_published (DRAFT)
  true,            -- noindex (flips to false on approve)
  'clear',         -- gate_status (so it shows in the Drafts panel, not held)
  false,           -- rejected
  'standard',      -- directive_type
  '{}'::jsonb,     -- creator_info
  '{"slept_on":0,"meta_shift":0,"cipher_bait":0,"required_intel":0}'::jsonb  -- reaction_counts
WHERE NOT EXISTS (
  SELECT 1 FROM feed_items WHERE slug = 'wardogs-black-market-whats-live-vs-coming' AND game_slug = 'wardogs'
);

-- VERIFY: SELECT id, is_published, noindex, gate_status, editor, slug FROM feed_items
--   WHERE slug = 'wardogs-black-market-whats-live-vs-coming' AND game_slug = 'wardogs';
--   expect 1 row: is_published=false, noindex=true, gate_status=clear, editor=NEXUS.
