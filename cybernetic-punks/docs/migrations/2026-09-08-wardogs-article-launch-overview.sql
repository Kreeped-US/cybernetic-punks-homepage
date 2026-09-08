-- 2026-09-08-wardogs-article-launch-overview.sql
-- Wardogs launch-week article #1 (the EA launch overview) -- a feed_items insert. THE OPERATOR
-- RUNS THIS in Supabase. Claude runs no DB writes.
--
-- GROUNDING: 100% from docs/wardogs/WARDOGS_LAUNCH_REFERENCE.md, TIER-RESPECTING -- Tier 1
-- (Bulkhead-official) stated as fact; Tier 2 (beta/alpha-observed) phrased "recorded in the beta,
-- subject to change"; Tier 4 (unknown) left unstated. No fabrication, no promoting observed data to
-- official. Roadmap items (jets/categories) flagged as roadmap, not launch.
--
-- WHERE IT RENDERS: /wardogs/field-intel/wardogs-early-access-everything-confirmed. Requires BOTH
-- this row AND the slug->section mapping in lib/games/wardogs.js WARDOGS_ARTICLE_SECTION (added on
-- this branch; feed_items has no section column, so the map is the only section source).
--
-- STATE: is_published=true (live on run). noindex=FALSE -- wardogs.indexable is TRUE, so this
-- launch-week overview is INDEXABLE and should rank (unlike the noindex bodycam articles).
--
-- EDITOR: NEXUS (wardogs' news voice; matches every live wardogs article). SECTION: field-intel
-- (News -- confirmed reports on what Bulkhead has officially detailed).
--
-- BODY FORMAT: standard markdown -- whole-line **bold** section headers, "- " bullets, blank-line
-- paragraphs. The shared parser (lib/dmz/articleContent, used by the wardogs article route) has the
-- CRLF fix on main, so this renders as headings/lists/paragraphs (not a wall of text).
--
-- SOURCE: source_url is the real Wardogs Steam store page (app 1867240); Bulkhead's Aug 11
-- announcement + the store page are cited by name in-body.
--
-- IDEMPOTENCY: no unique key on (game_slug, slug), so a re-run DUPLICATES. Run ONCE. To reset:
-- delete from feed_items where game_slug='wardogs' and slug='wardogs-early-access-everything-confirmed';
--
-- Run the whole statement at once.

insert into feed_items
  (game_slug, editor, headline, slug, body, tags, source, source_url, ce_score, is_published, noindex, noindexed_at, thumbnail, created_at)
values (
  'wardogs',
  'NEXUS',
  'Wardogs Early Access: Everything Confirmed for the September 10 Launch',
  'wardogs-early-access-everything-confirmed',
  $wd$**The Short Answer**

Wardogs enters Steam Early Access on Wednesday, September 10, 2026, at 16:00 UTC -- PC only, with no invite, key, or queue. It costs $39.99, with an optional $49.99 Supporter Edition that adds cosmetics only. It is a 100-player, three-faction, large-scale tactical shooter from Bulkhead and Team17, built on a buy-your-loadout economy rather than fixed classes. Here is everything Bulkhead has confirmed for launch -- and what to still treat as unofficial.

**When, Where, And How Much**

- Launch: Wednesday, September 10, 2026, 16:00 UTC.
- Platform: Steam, PC (Windows). No invite, key, or queue -- open purchase at launch.
- Price: $39.99 standard. The $49.99 Supporter Edition adds cosmetics only -- faction weapon camos, a helicopter paint job, a scoreboard tag, and bobbleheads -- nothing that affects gameplay. Some regions get lower pricing (around $24.99 in parts of Latin America and Turkey).
- Monetization: Bulkhead has stated there are no microtransactions beyond the Supporter Edition during Early Access.
- Beta progress does not carry over -- everyone starts from a clean slate at launch.

**What Is In It At Launch**

Bulkhead has committed to a specific launch scope:

- 37 weapons are confirmed for Early Access, per Bulkhead's official August 11, 2026 announcement, with more weapons scheduled as post-launch content. Note that 37 is a confirmed count, not an official named roster -- Bulkhead has not published a full weapon list.
- Three free assault rifles put every player in the fight: the A-91, the Bushmaster M17S, and the KH-2002, the faction recruit rifles. They have no full-auto fire mode, and every player also starts with a free backpack that has limited storage. There is no state in which you cannot deploy a working gun.

**How Wardogs Actually Plays**

Wardogs is a 100-player, three-faction battle for control. Three rival teams fight to dominate randomized Control Zones across a large combined-arms battlefield -- infantry, vehicles, destructible environments, and player-built fortifications all in the same fight.

The defining system is the economy. There are no fixed classes or kits. Instead, you earn cash that carries between matches and buy your loadout from a vendor before each life. What you can field depends on what you have banked and how you choose to spend it -- your "class" is your shopping list.

As recorded in the closed betas -- observed, and subject to change at launch -- that economy ran on a one-time starting balance of around $10,000 per account, a discount for new low-level recruits, and ammunition billed separately by caliber. Treat those figures as beta-observed until they are confirmed in the live build; Bulkhead has not published an official price list.

**The Scale**

Wardogs pulled a large audience in testing. Across its two closed betas, the game peaked at roughly 245,000 concurrent players -- a community-tracked figure, not an official one. Reporting from the betas points to around 21 vehicles -- transport and attack helicopters, a level-gated main battle tank, jeeps, and a radar-equipped recon vehicle that can serve as a mobile spawn -- and to three maps with three variations each. Those counts are widely reported rather than itemized by Bulkhead, so treat them as expected, not confirmed.

**On The Roadmap (Not At Launch)**

Bulkhead has named an Early Access roadmap that includes fighter jets, expanded weapon categories, and new vehicle types. These are stated direction, NOT launch features -- do not expect them on day one. The studio has framed the post-launch period as leaning toward bug-fixes, balance, and community feedback rather than a constant stream of new content.

**What Is Not Confirmed Yet**

To be straight about the gaps: Bulkhead has not published a per-weapon price list or a full named weapon roster, so every price in circulation is beta-recorded. Anti-cheat specifics, Steam Deck and Proton support, and crossplay have not been addressed. Map names and points of interest beyond the counts are not officially detailed. Those land here as they are confirmed -- not before.

**Key facts**

- Launch: Wednesday, September 10, 2026, 16:00 UTC -- Steam / PC, no invite.
- Price: $39.99 standard; $49.99 Supporter Edition (cosmetics only); no microtransactions beyond it during EA.
- 37 weapons confirmed at launch (a count, not an official roster); more to come post-launch.
- Three free recruit rifles (A-91, Bushmaster M17S, KH-2002; no full-auto) plus a free limited backpack.
- 100-player, three-faction Control Zone combat; combined arms; buy-your-loadout-from-a-vendor economy; cash carries between matches.
- Beta progress does NOT carry to Early Access.
- Beta-observed (subject to change): about 245,000 combined peak concurrency; around 21 vehicles and 3 maps expected; about $10,000 starting cash; ammo billed by caliber.
- Roadmap, not launch: fighter jets, expanded weapon categories, new vehicle types.
- Source: Bulkhead official Steam announcements and store page (confirmed items); community trackers and beta captures (observed items, labeled as such).$wd$,
  array['wardogs','early access','launch','bulkhead','team17','september 10'],
  'BULKHEAD / STEAM',
  'https://store.steampowered.com/app/1867240/WARDOGS/',
  0,
  true,
  false,
  null,
  null,
  now()
);

-- VERIFY after running:
--   select slug, editor, is_published, noindex, char_length(body) from feed_items
--     where game_slug='wardogs' and slug='wardogs-early-access-everything-confirmed';
--   -- then load /wardogs/field-intel/wardogs-early-access-everything-confirmed -- INDEXABLE
--   -- (wardogs.indexable true, noindex false), renders formatted, appears in the Field Intel list.
