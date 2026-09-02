# Bodycam System Reference (confirmed facts -- ground truth)

STATUS: REFERENCE. Sourced ground truth for the Bodycam vertical -- the per-weapon pages, the
editors, and articles draw from THIS doc so facts are stated once and do not drift or get
re-derived. Not itself rendered. Written 2026-09-02.

SOURCING: primary = Reissad Studio's Sept 2 2026 "Locked & Loaded" Steam patch, plus
operator-provided context grounded to it. Where a value or number is not published (e.g. per-weapon
numbers), it stays HONEST-NULL -- not stated. The patch is authoritative over any older context: one
conflict is resolved below (Zombies is DISABLED this update -- section 4).

Related: docs/bodycam/ATTACHMENT_SEED_SCOPING.md (the attachment slot taxonomy + mounting rule),
docs/bodycam/ATTACHMENT_BUILDER_ARCHITECTURE.md, lib/games/bodycam.js (config).

---

## 1. Identity

- PC multiplayer tactical FPS with a BODY-CAMERA point of view: the camera reads as a chest/head
  cam -- no floating gun model, minimal crosshair, minimal ammo HUD. Audio and the on-screen scene
  carry the information, not a HUD overlay.
- Photoreal Unreal Engine 5 presentation; raw, prominent audio.
- Developer: Reissad Studio. Lifecycle: EARLY ACCESS (not a 1.0 release).
- Design lineage: a GROUNDED tactical shooter -- a Counter-Strike / Ready or Not hybrid in feel,
  deliberately NOT Call of Duty. Heavy, committed movement; reloads degrade / are interruptible
  under fire; engagements are lethal fast (1-2 shots is often enough).
- Front end is a PHYSICAL HUB (a firing range / lounge space you walk around), not a flat 2D menu.

## 2. No classes -- loadout-based, self-built

- There are NO classes in the Assault / Medic / Engineer sense. Every player uses the SAME operator
  body. Your "class" is the loadout you build.
- Loadout slots (self-built): Primary, Secondary, Melee (knife + throws), Explosives
  (frag / flash / sticky / impact), and a Gadget (an FPV drone OR an RC car).
- Weapons and attachments are UNLOCKED with Reissad Points (RP) -- see section 3.

## 3. Progression -- TWO DISTINCT TRACKS

Keep these separate; they are different systems.

### 3a. Reissad Points (RP) -- the unlock economy
- Earned by playing ANY mode.
- Spent to unlock weapons and attachments (and cosmetics when the shop returns).
- The real-money SHOP is OFF this update. Skins previously purchased are RETAINED.

### 3b. Rank / ELO -- the competitive ladder
- As of this patch, rank/ELO moves ONLY in Wingman (2v2) -- the competitive mode.
- Wingman is SOLO-QUEUE only for now; a duo queue is noted as coming.
- Matchmaking is NOT skill-based yet; ranked rewards are flat for now.
- Casual modes (Team Deathmatch, Deathmatch, Hardpoint, Gun Game) do NOT move rank/ELO.
- An older Rookie / General title skeleton is still present in the UI.

## 4. Modes (current)

CONFIRMED-ACTIVE this update:
- WINGMAN -- competitive 2v2 Search & Destroy. THE ranked mode (the only one that moves ELO, 3b).
  Replaced the removed Body Bomb 5v5. You CANNOT join mid-round.
- TEAM DEATHMATCH -- casual, respawns on.
- DEATHMATCH -- free-for-all.
- HARDPOINT -- hold rotating zones.
- GUN GAME -- weapon cycles on kills.

DISABLED this update (CORRECTION -- patch is authoritative):
- ZOMBIES -- a co-op PvE mode, but **currently DISABLED in the Sept 2 "Locked & Loaded" update**,
  planned to RETURN for Halloween. The patch states Zombie mode is disabled for this update and
  reintroduced for Halloween. Record it as DISABLED, not active. Any older context that lists
  Zombies as playable is superseded by the patch.

## 5. Session flow

1. Launch into the HUB (the physical firing-range / lounge space).
2. Use the in-world TABLET to edit loadouts, use the firing range, and configure the drone / gadget.
3. Queue a mode or join a server.
4. Fight -- friendly fire is ON in team modes; audio is the primary information system (footsteps,
   reloads, directionality) rather than a HUD.
5. HOST MIGRATION if the host leaves (new this patch) -- the session migrates rather than dropping.
6. Post-match: RP is awarded (all modes); Wingman additionally updates rank / ELO.

## 6. Honest-null boundary (what is NOT stated)

- No published per-weapon numeric values (damage, fire rate, etc.) -- see the weapon roster
  (honest-null) and the attachment scoping doc. Numbers are added only when verified in-game.
- No published attachment parts list or per-gun compatibility matrix yet (attachment tables are
  live but empty -- see ATTACHMENT_SEED_SCOPING.md).
- Exact RP costs, rank thresholds, and reward specifics are not published; described qualitatively
  only, never invented.

---

CHANGE DISCIPLINE: this doc is sourced ground truth. Update it only from a new primary source (a
Reissad patch / official post) or fresh operator-verified context, and note the source. When a
newer patch changes a fact (e.g. Zombies returns at Halloween), amend the relevant section and keep
the sourcing line current.
