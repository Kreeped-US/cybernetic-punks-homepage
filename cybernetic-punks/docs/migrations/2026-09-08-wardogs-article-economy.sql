-- 2026-09-08-wardogs-article-economy.sql
-- Wardogs launch-week article #2 (the economy explainer) -- a feed_items insert. THE OPERATOR RUNS
-- THIS in Supabase. Claude runs no DB writes.
--
-- GROUNDING: 100% from docs/wardogs/WARDOGS_LAUNCH_REFERENCE.md (refined economy section), following
-- its writing rules exactly: the STRUCTURE is stated as confirmed fact (Tier 1, first-party, held
-- through two public betas); the NUMBERS are stated ONLY as beta-client-observed (the IN-GAME BETA
-- CLIENT provenance -- Gold Exchange panel, "Beta 2 - 3 Sept"), never as launch fact or a Bulkhead
-- figure. The beta wipe is scoped precisely (test-wipe, not a live-economy-rule change). No number is
-- promoted to launch-fact; honest-null figures (payout rates, the death refund, gold-bar rate) are
-- left unstated.
--
-- WHERE IT RENDERS: /wardogs/economy/how-the-wardogs-economy-works. Requires BOTH this row AND the
-- slug->section mapping in lib/games/wardogs.js WARDOGS_ARTICLE_SECTION (added on this branch).
-- Section = economy (the dedicated section, clustered with wardogs-cash-economy + wardogs-economy).
-- (feed_items has no section column, so the mapping is the only section source -- no section value
-- in this INSERT changes; only the mapping determines the URL.)
--
-- STATE: is_published=true (live on run). noindex=FALSE -- wardogs.indexable is TRUE, so this ranks.
--
-- EDITOR: NEXUS (wardogs' news voice; every live wardogs article). SECTION: economy.
--
-- BODY FORMAT: standard markdown -- whole-line **bold** headers, "- " bullets, blank-line paragraphs.
-- The shared parser (lib/dmz/articleContent, CRLF fix on main) renders it formatted.
--
-- SOURCE: source_url is the real Wardogs Steam store page (app 1867240); the structure is cited to
-- the store page + Bulkhead statements, the numbers to the Beta 02 in-game Gold Exchange panel, in-body.
--
-- IDEMPOTENCY: no unique key on (game_slug, slug), so a re-run DUPLICATES. Run ONCE. To reset:
-- delete from feed_items where game_slug='wardogs' and slug='how-the-wardogs-economy-works';
--
-- Run the whole statement at once.

insert into feed_items
  (game_slug, editor, headline, slug, body, tags, source, source_url, ce_score, is_published, noindex, noindexed_at, thumbnail, created_at)
values (
  'wardogs',
  'NEXUS',
  'How the Wardogs Economy Works: Buy-Per-Life Loadouts and Persistent Cash',
  'how-the-wardogs-economy-works',
  $wd$**The Short Answer**

Wardogs does not have classes. Instead of picking a kit, you manage money: you start with a one-time stake, you buy a fresh loadout every time you spawn, and your cash carries from match to match. Your "class" is whatever you can afford this life. That persistent, buy-per-life economy is the system that makes Wardogs different from other shooters -- and Bulkhead has kept it unchanged across two public betas.

Everything about the STRUCTURE below is confirmed. The specific NUMBERS are what appeared in the Beta 02 client and may shift at launch -- those are flagged as we go.

**The Core Loop: Start, Buy, Persist**

- You start with $10,000, once. Bulkhead's Steam page frames it as a "journey" stake -- a one-time starting balance for your account, not a per-match allowance.
- Before each life, you buy your loadout from a vendor. There is no fixed class or preset kit; what you field is what you choose to purchase right then.
- Your cash persists. Money you earn does not reset between matches -- it carries forward as the resource that ties your loadouts, progression, and teamplay together.

The result is that Wardogs is a game of resource management as much as aim. Spend big on a life that ends fast and you feel it; bank cash across matches and you can field heavier kit when it counts. Your loadout is your shopping list, and the budget is real.

**How You Earn**

Cash comes from playing your role, and Wardogs pays for teamplay, not just kills:

- Revives, transport, kills, spotting, and completing objectives all earn cash.
- The Hot Zone pays double -- a doubled cash reward and double body value on the score tick -- so contesting it is worth the risk.

Because the game rewards support actions and objective play, you are not forced to frag to stay solvent. A player who drives, revives, and spots earns too.

**The Gold Layer: Cash To Cosmetics**

Above the round-to-round cash economy sits a cosmetics layer:

- Cash converts to Gold Bars, which buy cosmetics from the Gold Market.
- The gold rate moves daily.
- At the end of a season, leftover cash auto-converts, and your gold and cosmetics persist across seasons.
- You never sell cash, gold, or camos -- there is no trading of the currency between players.

Critically, this layer is cosmetics only. Bulkhead has stated there are no microtransactions during Early Access beyond the optional Supporter Edition. Money in Wardogs buys guns for the fight and cosmetics for the flex -- nothing pay-to-win.

**The Numbers We Have Seen (Beta 02 -- Not Yet Launch-Confirmed)**

The system above is confirmed. The exact figures are not first-party yet. What is circulating comes from the in-game Gold Exchange panel in the official Beta 02 client, stamped "Beta 2 - 3 Sept" -- authentic build UI, but from the beta, and Bulkhead has not republished it as an official source. Treat these as recorded in Beta 02, subject to change at launch:

- A "new recruit" discount of around 50% for low-level players (roughly below level 9).
- Ammunition billed separately by caliber, in the range of about $10 to $250 per box.
- The Gold Exchange rates and vendor prices shown in that panel.

Other numbers -- the per-action payout rates, the death refund, the exact gold-bar dollar rate, and whether any Beta 02 balance survives launch -- have no first-party figure at all, so we are not stating them. Once the live build is up, those get verified and published then.

One clarification, because it gets muddled: your beta progress does not carry into Early Access. That is because the test was condensed into a single weekend -- a wipe of the TEST, not a statement that the live economy wipes. The persistent-cash system is the entire point of the game.

**Key Facts**

- No classes: you buy a loadout from a vendor before each life; your "class" is your shopping list.
- Start with $10,000 once (a one-time "journey" stake, per the Steam page); cash persists match-to-match.
- Teamplay pays -- revives, transport, kills, spotting, and objectives all earn; the Hot Zone pays double.
- Cash converts to Gold Bars for Gold Market cosmetics; the rate moves daily; leftover cash auto-converts at season end; gold and cosmetics persist across seasons; you never sell the currency.
- Cosmetics only -- no Early Access microtransactions beyond the optional Supporter Edition.
- The STRUCTURE above is confirmed and held unchanged through two public betas. The specific NUMBERS (recruit discount, ammo prices, Gold Exchange rates) are beta-client-observed (Beta 02, "3 Sept") and subject to change at launch; other figures have no official number yet.
- Source: Bulkhead's Steam store page and official statements (the structure); the in-game Gold Exchange panel from the Beta 02 client (the numbers, beta-observed).$wd$,
  array['wardogs','economy','loadout','gold market','bulkhead','early access'],
  'BULKHEAD / STEAM + BETA 02 CLIENT',
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
--     where game_slug='wardogs' and slug='how-the-wardogs-economy-works';
--   -- then load /wardogs/economy/how-the-wardogs-economy-works -- INDEXABLE, renders formatted,
--   -- appears in the Field Intel list.
