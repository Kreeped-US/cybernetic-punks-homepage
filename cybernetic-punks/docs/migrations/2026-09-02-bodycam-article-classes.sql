-- 2026-09-02-bodycam-article-classes.sql
-- ONE hand-crafted Bodycam article (the quality bar) -- a feed_items insert. THE OPERATOR RUNS THIS
-- in Supabase after review. Claude runs no DB writes.
--
-- GROUNDING: 100% from docs/bodycam/BODYCAM_SYSTEM_REFERENCE.md (Reissad's Sept 2 2026 "Locked &
-- Loaded" patch + operator context). No fabricated numbers, no invented parts, no made-up RP costs
-- -- unpublished specifics are left unstated in-body. Zombies is not asserted active (it is disabled
-- this patch per the reference doc); it is not a subject of this piece.
--
-- WHERE IT RENDERS: /bodycam/field-intel/does-bodycam-have-classes. Requires BOTH this row AND the
-- slug->section mapping in lib/games/bodycam.js BODYCAM_ARTICLE_SECTION (added on this branch). With
-- the mapping merged, the article appears in the Field Intel section list + its detail page.
--
-- STATE: is_published = true (goes live on run), noindex = true (bodycam.indexable is false, so the
-- whole /bodycam subtree is noindex now -- the article is live-but-not-indexed, built to rank when
-- the vertical opens). When bodycam.indexable flips and this piece should index, set
-- noindex = false, noindexed_at = null on this row.
--
-- EDITOR: NEXUS -- bodycam's configured editorial voice (lib/games/bodycam.js editorial.editors),
-- matching the network convention for a new game and the analogous Wardogs "roles not classes"
-- explainer (also NEXUS). getEditorDisplay normalizes case.
--
-- SOURCE: source_url is the real, verified Bodycam store page (the official source hub; not
-- synthesized). The patch is cited by name + date in-body. Replace source_url with the exact
-- patch-notes permalink if you have it.
--
-- IDEMPOTENCY: no unique key on (game_slug, slug) for feed_items, so a re-run DUPLICATES. Run ONCE.
-- To reset before re-running: delete from feed_items where game_slug='bodycam' and slug='does-bodycam-have-classes';
--
-- Run the whole statement at once.

insert into feed_items
  (game_slug, editor, headline, slug, body, tags, source, source_url, ce_score, is_published, noindex, noindexed_at, thumbnail, created_at)
values (
  'bodycam',
  'NEXUS',
  'Does Bodycam Have Classes? How the Loadout System Actually Works',
  'does-bodycam-have-classes',
  $bc$**The Short Answer**

No. Bodycam has no classes. There is no Assault, no Medic, no Engineer, and no role you pick from a menu before a match. Every player drops in as the same operator body. What separates one player from another is not a class -- it is the loadout you build. In Bodycam, your "class" is your loadout.

This is a deliberate design choice, in keeping with the game's grounded, tactical lineage -- closer to Counter-Strike or Ready or Not than to a class-based shooter. Reissad Studio's September 2, 2026 "Locked & Loaded" update is the current reference point for how these systems stand.

**The Five Loadout Slots**

A Bodycam loadout is built from five slots, and every one of them is yours to fill:

- Primary -- your main weapon.
- Secondary -- your sidearm.
- Melee -- a knife, plus your throwables.
- Explosives -- frag, flash, sticky, or impact grenades.
- Gadget -- a piece of deployable tech: an FPV drone or an RC car.

There is no loadout the game builds for you and no role that locks a slot. The identity a class would normally hand you -- support, breacher, recon -- you assemble yourself from these five choices. Two players on the same team can fill completely different roles without either of them ever selecting one.

**How You Unlock Gear: Reissad Points**

Weapons and attachments are unlocked with Reissad Points (RP). You earn RP by playing -- any mode counts -- and you spend it to open up new weapons and the attachments that go on them. Gear is earned through play, not handed out by a class.

A separate real-money shop, which sold cosmetics, is switched off in the current update; anything bought there previously is retained. Exact RP costs and unlock thresholds are not published, so this guide does not list them -- they are added here only if and when Reissad states them.

**Two Progression Tracks -- Keep Them Separate**

This is where players get confused, so it is worth stating plainly. Bodycam runs two independent progression systems:

- RP (unlocks) -- earned in every mode, spent on gear. This is the track tied to your loadout.
- Rank / ELO (the ladder) -- as of this update, your rank moves in one place only: Wingman, the 2v2 competitive mode. Wingman is solo-queue for now, with a duo queue noted as coming; matchmaking is not yet skill-based and ranked rewards are flat. The casual modes -- Team Deathmatch, Deathmatch, Hardpoint, and Gun Game -- do not move your rank at all.

Unlocking gear and climbing the ladder are different activities. You can grind RP in any mode; you can only move rank in Wingman.

**What This Means For How You Play**

Because there are no classes, every player is self-sufficient by default -- you bring your own answer to each situation in the five slots, rather than leaning on a teammate's assigned role. Your loadout is your tactical identity, and it is fluid: change the five slots and you change how you play, with no class menu in between.

It also puts the weight on decisions rather than raw loadout power. Bodycam's combat is lethal and grounded -- engagements are often settled in one or two shots, and reloading is punished if you do it under fire -- so what you carry matters less than when and how you use it. A class system would give you a role; Bodycam gives you a kit and asks you to be the role.

**A Note On Early Access**

Bodycam is in Early Access, and its systems are still moving. The "Locked & Loaded" update alone removed the 5v5 Body Bomb mode, established Wingman as the ranked mode, and added host migration so a match no longer collapses when the host leaves. Treat the specifics here as the current state, not a permanent one. Where a detail is not yet published -- exact costs, rank thresholds, per-weapon numbers -- this guide leaves it unstated rather than guessing.

**Key facts**

- Bodycam has no classes; every player uses the same operator body.
- Your loadout is your "class": Primary, Secondary, Melee, Explosives, and a Gadget (FPV drone or RC car).
- Weapons and attachments unlock with Reissad Points (RP), earned in any mode.
- Two separate tracks: RP unlocks gear; Rank/ELO moves only in Wingman 2v2.
- Source: Reissad Studio's Sept 2, 2026 "Locked & Loaded" update. Early Access -- systems are evolving, and unpublished specifics are left unstated.$bc$,
  array['bodycam','classes','loadout','loadout system','reissad','early access'],
  'LOCKED & LOADED PATCH',
  'https://store.steampowered.com/app/2406770/Bodycam/',
  0,
  true,
  true,
  now(),
  null,
  now()
);

-- VERIFY after running:
--   select slug, editor, is_published, noindex, char_length(body) from feed_items
--     where game_slug='bodycam' and slug='does-bodycam-have-classes';
--   -- then load /bodycam/field-intel/does-bodycam-have-classes (renders noindex while
--   -- bodycam.indexable is false) and confirm it appears in the Field Intel section list.
