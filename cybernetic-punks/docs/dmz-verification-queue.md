# DMZ Pre-Launch Verification Queue

**Status:** STRATEGY ARTIFACT (recorded 2026-08-11). The human-judged ORDER in which to make DMZ
entities verified-real - i.e. which dmz_* rows to populate and verify (verified=true) FIRST, before the
Oct 23 2026 launch. This is a strategy OUTPUT informing human verification order. It is NOT content
data, NOT a first-class table or view, and NOT a content plan.

**Ruling basis:** the Fable pre-launch-demand lifecycle ruling (2026-08-11, in
docs/CONTENT_PIPELINE_ARCHITECTURE.md "AMENDMENT"): pre-launch, demand ranks the VERIFICATION queue
(which entities to make verified-real first); it does NOT produce a content plan and NEVER manufactures
content. This doc IS that ranked queue.

## How this was ranked (provenance)

Ranked ONCE by human judgment, per the ruling:

- POIs by STRATEGIC CENTRALITY (operator map knowledge), NOT by demand. The prior-DMZ demand data had
  effectively NO Hajin POI signal, because Hajin is a NEW map: prior-DMZ POIs belonged to the old maps,
  and those POI terms do not transfer to Hajin, so per-POI prior demand is near-zero across the board.
  Ranking POIs on demand was impossible; strategic centrality (guaranteed launch traffic plus
  loot/content-pull) is the real signal.
- Weapons by DEMAND, from the transferable prior-DMZ signal (held loosely - see below).
- Missions / keys / items by CAPACITY order (no named entities exist pre-launch; near-zero nameable
  demand).

Hajin is the ONLY launch map, so all 9 POIs WILL be verified - this queue sets the ORDER, not the
inclusion.

The 6 demand CSVs (docs/research/dmz-demand-2026-07/) remain RAW RESEARCH EVIDENCE (uncommitted, not
content data). This queue SUPERSEDES the abandoned dmz_keyword_research content-planning table/view
direction; the source-decision artifacts under docs/research/dmz-demand-2026-07/*.sql are prep
evidence, not a committed store.

## THE QUEUE

### POIs - all 9 verify (Hajin is the only launch map); ranked by strategic centrality

**Tier 1 (guaranteed launch traffic + content-pull):**
1. Hajin City
2. Casino
3. Military Base

**Tier 2:**
4. Hospital
5. Prison
6. Fallout

**Tier 3:**
7. Broadcast
8. Farmlands
9. Dead Town

Ranking rationale: guaranteed launch traffic plus loot/content-pull. The demand data had effectively no
Hajin POI signal (the map is new), so this is strategic-centrality judgment, not demand ranking.

### Weapons - demand-ranked (verify alongside Tier 1 POIs)

Verify high-demand NAMED weapons from the transferable prior-DMZ signal alongside the Tier 1 POIs.
Ranking HELD LOOSELY: the weapon meta re-forms at launch, and GSC corrects it post-launch.

Caveat from the research: the 6 prior-DMZ CSVs carried NO named-weapon demand - the weapon-adjacent
demand was generic (e.g. "dmz weapon case" 5,400, "dmz best loadout" 480), not a named weapon. So the
named-weapon ranking is operator/roster judgment at launch, seeded by whatever transferable named-weapon
demand exists, not by this CSV set.

### Missions / keys / items - capacity order (after POIs + high-demand weapons)

No named mission/key/item entities exist pre-launch (launch-gated; the sanctioned Deep-Dive names none).
Category demand is real ("dmz key locations" 12,100 is the standout) but there is nothing to verify until
the names surface at launch. Verify in capacity order as names land, highest category demand first
(keys, then missions, then items).

## STRATEGIC NOTE (separate - NOT a queue item)

The highest-CONFIDENCE transferable DMZ demand is GENERIC loadout/strategy content ("dmz loadout",
"dmz best weapon", "[mode] tips"), NOT entity-specific. This is two things:
- a launch content-TYPE signal (general build/strategy content will have demand at launch), and
- a possible argument for a DMZ BUILD TOOL at launch (echoes Marathon's advisor).

HOLD for launch content planning. It is NOT a verification-queue item and does not rank dmz_* population.

## What the operator does with this

Populate and verify the dmz_* tables in this order: the Tier 1 POIs (plus transferable high-demand
weapons) first, then Tier 2 and Tier 3 POIs, then missions/keys/items as names surface at launch.
Verified substance is the WARRANT that (post-launch) authorizes content; this queue orders the work of
making that substance real. Demand never authorizes a page - it only ordered this list.
