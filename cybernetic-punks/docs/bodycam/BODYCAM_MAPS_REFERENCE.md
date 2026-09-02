# Bodycam Maps & World Reference (confirmed facts, TIERED BY CONFIDENCE)

STATUS: REFERENCE. Sourced ground truth for Bodycam map/world coverage -- map articles and pages
draw from THIS doc so a stale rotation is never published as fact. Not itself rendered. Written
2026-09-02. Companion to docs/bodycam/BODYCAM_SYSTEM_REFERENCE.md (identity / modes / progression).

SOURCING: primary = Reissad Studio's Sept 2 2026 "Locked & Loaded" (v0.8) patch + official
devlogs. The HISTORICAL pool is Reissad's v0.7 (Nov 25 2025) map list, labeled as such. Secondary
coverage (IGN / YouTube) is corroboration only, never the fact. Community guides are flagged
attributed. Where live status is not verifiable, it stays HONEST-NULL.

>>> THE CONFIDENCE TIERS ARE THE POINT. <<< Some maps are CONFIRMED current in the Sept 2 build;
most of the urban pool is HISTORICAL -- last enumerated in v0.7 and NOT verified in the live Sept 2
build. Recording them flat as "current maps" would publish a stale rotation sheet as fact. Never
state a HISTORICAL map as a live/current rotation map. There is NO v0.8 map-select roster to verify
against.

---

## 1. World model (confirmed, first-party)

Bodycam has no campaign, no connected overworld, and no lore/faction briefing. The world is a set
of DISCONNECTED, real-world-inspired arenas -- "inspired by or replicated from real-world
locations" -- seen through a body camera, plus a persistent walkable HUB between matches. There is
no narrative layer tying the maps together: the fiction is the footage itself.

## 2. The HUB (confirmed, Sept 2 -- the persistent place; it replaced the main menu)

The front end is a physical, walkable training compound with a tablet, NOT a city or a campaign
hub. As of the Sept 2 build:

- OPEN now: firing range (invulnerable), armory, attachment room, lounge, restrooms, podcast area,
  pool table, screening rooms, social tab.
- CLOSED for maintenance (opening later): obstacle course, shoot house, drone / RC car rooms.

## 3. Weather & lighting (confirmed, Sept 2)

- No live day-night cycle. Each match/round rolls a WEIGHTED lighting + weather scenario and then
  HOLDS it for that match/round.
- Host migration preserves the rolled scenario.
- Night moonlight is stronger than before.
- Weather is a MATCH MODIFIER: the same layout plays differently in day / overcast / night. A map
  is one layout with rolled conditions, not separate day/night maps.

---

## 4. Maps -- TIERED BY CONFIDENCE (the load-bearing section)

### TIER A -- CONFIRMED CURRENT (in the Sept 2 "Locked & Loaded" / v0.8 notes)

- TRENCHES -- ADDED this update. The flagship, one of the largest maps built. Outdoor, with two
  visual halves (dense forest / shelled devastation); flooded and dry trench networks; underground
  galleries and tunnels; a central ruined church with an underground shelter; observation posts;
  ruined compounds; drone workshops; open fields. Borders are MINEFIELDS -- a kill-boundary, not an
  invisible wall. Built with dedicated FPV drone / RC car lanes. Destructible trees are on the
  roadmap (not confirmed live). Supports Hardpoint and Wingman. (Sourced: devlog + patch notes.)
- CQB / CQB POWERGUN -- referenced as current (Hardpoint support added, named alongside Trenches:
  "Trenches and CQB"). Based on Powergun Terrain, a real French airsoft site (scanned into the
  game: plans, photos, drone capture, wall-tag scans). Confirmed current.

### TIER B -- CONFIRMED OUT (Sept 2 notes: explicitly NOT in this update, planned later)

- OIL RIG -- a vertical offshore-platform map. "Not in this update, planned for the future."
- TUMBLEWOOD -- a forest-thicket map. "Not in this update, planned for the future."

Do not describe these as playable. They are announced-but-absent.

### TIER C -- MODE-DISABLED (Zombies is off this patch, back for Halloween -- see the system reference)

- VILLAGE and ASYLUM -- Zombies (co-op PvE) maps. Zombies is DISABLED in the Sept 2 update, so
  these are NOT in the current PvP rotation. The crossbow was a Zombies-first weapon on Village.
  Treat Village/Asylum as part of the disabled Zombies layer, not as live maps.

### TIER D -- HISTORICAL, LAST ENUMERATED v0.7 (Nov 25 2025) -- NOT VERIFIED IN THE LIVE SEPT 2 BUILD

DO NOT STATE ANY OF THESE AS A CURRENT / LIVE ROTATION MAP.

- Russian Building, Hospital, Rome, Worn House, Airsoft / Airsoft House, Bomb House, Paintball,
  Public Pool, Warehouse, Logistics, Backrooms, The Pit, Shooting Range.

RECORD EXACTLY (why this tier exists):
- These names come from Reissad's v0.7 map list (Nov 25 2025), a PRE-REBUILD snapshot.
- The Sept 2 "Locked & Loaded" notes give NO map roster and name NONE of these as current.
- "Named once, not listed as removed" is a LEAKY rule: a May 2026 Steam thread already treated
  Logistics as missing for months. A map appearing in an old list is not evidence it is in the
  current client.
- NO v0.8 map-select screenshot / current roster exists to verify them.
- Therefore this is a HISTORICAL INVENTORY, not a confirmed live rotation. Each of these may or may
  not be in the current client. Live status is HONEST-NULL -- unknown, not asserted either way.

### TIER E -- COMMUNITY-SOURCED / ATTRIBUTED (NOT first-party -- always flag)

- The "Boss Leroy" Village Easter egg and similar community-guide details are ATTRIBUTED to
  community guides, not confirmed by Reissad. If used, they must be attributed in-text as
  community-sourced and never stated as official fact.

---

## 5. Map usage (confirmed)

- Wingman (2v2) is THE competitive mode; Body Bomb 5v5 is gone. Wingman-compatible maps received
  bombsites and side-switch. No mid-match Wingman join.
- Hardpoint support is called out on Trenches and CQB.
- Gadgets (FPV drones / RC cars) are MAP FEATURES now, not just loadout toys: Trenches was built
  with drone workshops and dedicated RC lanes.

---

## 6. Writing rules for downstream map content

- CURRENT rotation claims: only Tier A (Trenches, CQB). Everything else is qualified.
- Tier B: "announced, not in this update." Tier C: "Zombies map, mode disabled this patch." Tier D:
  "listed in the v0.7 (Nov 2025) map pool; not verified in the current build" -- never "current map."
- Never publish the Tier D list as a live rotation sheet. Never assert a Tier D map is present OR
  removed -- both are unverified; say "unverified in the current build."
- Community details (Tier E) are attributed, never stated as first-party.
- Secondary coverage (IGN/YouTube) corroborates; it is never the source of record.

CHANGE DISCIPLINE: update only from a new primary source (a Reissad patch / devlog, or -- the one
thing that would move Tier D -- an actual v0.8+ map-select roster) and keep the sourcing current.
If a current roster appears, re-tier the historical pool against it; until then Tier D stays
historical-not-verified.
