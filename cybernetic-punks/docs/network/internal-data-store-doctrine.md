# Internal Data Store Per Game -- Doctrine (editor + advisor fuel, NOT public reference)

**Status:** LOCKED doctrine (network-level). Guides every new game vertical.
**Recorded:** 2026-09-10. **Scope:** network strategy -- how each game captures its data and why.
**Related:** docs/network/cyberneticpunks-brand-positioning.md (the competitive position this
serves), docs/wardogs-vertical-study.md (the vertical this decision was made against), the Marathon
data store + Build Advisor (the working example this generalizes from).

---

## The principle

Every game vertical needs, AT MINIMUM, a small INTERNAL data store capturing the game's data --
weapons/stats, economy, progression/unlock levels, meta -- the way Marathon's data store already
feeds its editorial. The store is FUEL, not a feature.

It exists to do three things:

1. **Feed the editors** so they produce accurate, current content.
2. **Feed the Build Advisor** -- the synthesis layer that reasons over this data.
3. **Let editors check content against current data** to stay accurate as the game changes.

## The critical distinction -- INTERNAL FUEL, not a PUBLIC REFERENCE feature

This is the load-bearing part of the doctrine.

We do NOT build public reference tables -- unlock-level lookups, price tables, full-vendor
catalogues -- to compete with entrenched reference sites (e.g. wardogshub for Wardogs). That is
competing on their strength: they are entrenched, thorough, and exhaustive, so we would only ever be
the less-complete version of what they already do well. That is a losing fight (see the competitive
study). Reference sites display the INGREDIENTS.

Instead we capture the data INTERNALLY, and point it at what reference sites do NOT build:
SYNTHESIS. Our editors and our Build Advisor turn the data into recommendations -- "here is the
build, and here is WHY" -- tuned to a player's inputs. Reference sites show the ingredients; our
internal stores feed the cook. The store is the pantry, never the menu on the wall.

## Why it matters -- the Build Advisor is the differentiator

The Build Advisor (fed by these stores) is the claim to fame -- the wedge the reference sites refuse
to build. The internal stores are its foundation. So a new game's editorial quality AND its advisor
capability both depend on having a good internal data store from the start. Skimp on the store and
both the content and the advisor degrade; the store is upstream of everything that makes the vertical
worth having.

BUILD THE STORE WITH THE ADVISOR, NOT STANDALONE-BEFORE-IT. The advisor's data needs define the
store's shape -- what fields it must carry, at what confidence. A store built in the abstract, ahead
of the advisor that consumes it, risks capturing the wrong things (public-reference-shaped data) for
the wrong reason. Let the advisor pull the store into existence.

---

## The concrete decision this resolves -- Wardogs unlock levels

Wardogs unlock levels (Season 1 changelog: Deagle Career L85, Artillery Tank Career L90, Heavy Tank
Driver L35, etc.) plus the economy/XP data are REAL, Bulkhead-confirmed, and VALUABLE -- but as
INTERNAL advisor/editor fuel, NOT a public unlock-level reference feature.

- DO NOT build public unlock-level tracking. That is wardogshub's turf; we lose that fight.
- DO capture the progression/economy data INTERNALLY when the Wardogs Build Advisor is built -- its
  data needs define the store's shape. Build the store with the advisor, not standalone-before-it.
- The progression/economy facts are already recorded in docs/wardogs/WARDOGS_LAUNCH_REFERENCE.md
  (Season 1 changelog, tiered). That reference IS the interim internal capture; the advisor's store
  formalizes it when the advisor is built.

### Correction: "Deagle 90 -> 85" is an UNLOCK-LEVEL change, NOT a combat-stat change

Earlier the changelog's "Deagle 90 -> 85" was misread as a damage-stat change. It is an UNLOCK-LEVEL
change: Deagle moves from Career L90 to Career L85 (the changelog lists it under "Season 1.0 Unlocks:
Career"). NO Wardogs weapon COMBAT-STAT change exists in the S1 changelog -- the changelog is
progression / economy / bugfixes only. So there is no weapon-stat flip available from the changelog,
and no weapon_stats correction is owed from it. (Supersedes the earlier "Deagle weapon-stat
correction" follow-up note -- there is no such stat change.)

## Strategic state (honest, ~2h post-Wardogs-launch, 2026-09-10)

- Bulkhead has NOT published weapon combat stats or the full 37-gun named roster.
- Community hubs retagged BETA vendor data as "Season 1" -- that is a relabel, NOT a live scrape of
  the launched game. Treat it as beta-observed, not launch-verified (same discipline as the IN-GAME
  BETA CLIENT provenance in WARDOGS_LAUNCH_REFERENCE.md).
- So verified Wardogs weapon data STILL awaits genuine live in-game observation. The changelog gives
  progression/economy (already captured in the reference), not weapon stats.
- Net: there is no verified weapon-stat data to load yet. The internal store's stat fields stay
  honest-null until live observation lands.

## Next -- the Wardogs Build Advisor is the flagship

The real Wardogs flagship post-launch work is the Wardogs Build Advisor: HYBRID (reuse the Marathon
advisor architecture + a net-new COST engine + PROGRESSION-awareness) -- the wedge wardogshub refuses
to build. Its data needs define the internal store's shape. This is the high-value post-launch
Wardogs build, gated on real live data for the stats it reasons over (economy/progression are
available now; weapon combat stats await live observation).

Generalization: the same pattern applies to every future vertical -- capture internally, point it at
synthesis, build the store with the advisor, never chase the reference sites on their own ground.
