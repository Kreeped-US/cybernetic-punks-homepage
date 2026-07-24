# DMZ Canonical Prep & SEO Readiness — Handoff Brief

**Purpose:** everything needed to have DMZ's canonical pages built, indexed, and
aging into authority BEFORE the Oct 23 launch, so launch-day search demand lands
on pages Google already trusts. Written for a planning/build chat that may lack
prior context — the doctrine facts it needs are restated here.

**Standing rule for the receiving chat:** every premise below that touches code
or data is a HYPOTHESIS to verify at the source (file:line / live DB) before
acting. This project has caught ~12 false planning premises by reading the
actual code first. Verify, then build.

---

## THE CALENDAR (why this is due in August, not October)

| date | event | consequence |
|---|---|---|
| **NOW → Aug 31** | the build window | canonicals must EXIST early to age — Google takes weeks to index and months to trust a page at DA 23. A page published Oct 20 is invisible on Oct 23 |
| **~Sept** | Marathon → maintenance mode | effort shifts to DMZ; the seams blocking DMZ build-out must already be resolved |
| **Sep 22** | Marathon Season 3 | patch re-verification load spikes — do NOT schedule interlocked DMZ work into that week |
| **Oct 23** | DMZ launch | the search flood. Pages answer it or someone else's do |

**Kill-clock reminder (doctrine):** pre-launch DMZ pages are EXEMPT from the
zero-impression kill line until launch — their clock starts Oct 23, not at
publish. Zero impressions before launch is correct, not failure.

---

## WORKSTREAM 1 — THE DEMAND MAP (do this first; everything ranks from it)

The doctrine's Gate 1: no demand, no page. Pre-launch, proxy demand counts.

1. **Pull the old-DMZ proxy in Mangools/KWFinder** (tool already purchased):
   query the ORIGINAL DMZ's terms (MW2 2022) — "DMZ best keys," "DMZ
   extraction," "DMZ Al Mazrah POIs," "DMZ contraband," "DMZ weapon case,"
   "DMZ faction missions" — plus Warzone-adjacent terms. These carry REAL
   historical volume and are the launch-demand forecast: swap old entity names
   for MW4's (Hajin, its POIs, its keys/factions).
2. **Instantiate the query templates** with every entity in the CoD Deep Dive
   blog (the only sanctioned pre-launch source): `how to get [key]`,
   `[POI] guide`, `[map] extraction routes`, `how to beat [threat]`,
   `[faction/mission] guide`, `[mechanic] explained`, `best loadout for [X]`,
   `[game] tips / beginner guide`, `DMZ vs Warzone`, `DMZ release date`.
3. **Filter: KD ≤ ~30–35 (hard cap at DA 23), sort by winnable-and-high-intent
   first** — volume is the tiebreaker, never the primary sort. Spot-check top
   candidates in SERPChecker: if page 1 is all Fandom/gg-tier wikis, skip it.
4. **Output: the ranked canonical table** — query → demand → target canonical →
   status (live / to build). This IS the build queue, the anti-cannibalization
   map, and the priority order in one artifact. Export the Mangools CSVs;
   Claude Code maps them against existing canonicals (/dmz, /dmz/fob,
   /dmz/regions already exist) to produce the gap list.

---

## WORKSTREAM 2 — BUILD THE CANONICALS (depth over count)

**Doctrine Gate 1a effort ceiling: the top ~15–25 canonicals built DEEP — not
all ~100 entities thin.** One comprehensive page outranks five thin ones at low
authority. Candidate set, subject to the demand map's actual ranking:

- **/dmz** — the hub: what DMZ is, release info, how it differs from Warzone
  (the pre-launch head terms live here; some already do)
- **/dmz/regions/hajin** — the map hub, with sections per sub-topic; spawn a
  sub-page (e.g. /dmz/regions/hajin/keys) ONLY when a sub-query has its own
  winnable demand AND standalone depth — otherwise the section stays a section
- **Keys** — the old-DMZ data says keys were a top demand cluster; likely
  deserves its own canonical early
- **/dmz/fob** — exists; strengthen against the demand map
- **Factions / missions / contracts** — per Deep Dive entities
- **Extraction / exfil mechanics** — genre-core query shape
- **The 3D Printer / economy system** — "[mechanic] explained" shape
- **Beginner guide** — high-volume launch-window query, claim it early

**Rules that apply to every page:**
- **Encyclopedia, not blog** — ONE canonical per entity/query. If two queries
  want the same page, they share it; never build two.
- **Provenance from birth:** every fact tagged `deep-dive-provisional`; nothing
  claimed that the Deep Dive doesn't say (no invented details). A visible
  "sourced from the official Deep Dive — will be game-verified at launch" line
  is honesty that also builds trust. At launch: verify in-game, flip tags to
  `game-verified`, correct what the Deep Dive got wrong.
- **Prefer tool/reference shape over prose** where possible (tables, structured
  data, interactive elements). The site's own GSC data proves tools and entity
  pages rank while articles don't — and structured pages sidestep the
  AI-content policy risk.

---

## WORKSTREAM 3 — MULTI-GAME SEAMS THAT BLOCK DMZ PAGES (resolve before building at scale)

These are from the multi-game audit's hypothesis list — **verify each at
source, then fix the confirmed ones:**

1. **Games registry** — does not exist yet. Needed: `slug, display_name,
   launch_date, status (pre-launch/live/maintenance)`. The kill clock,
   maintenance-mode behavior, and per-game config all key on it. Small table,
   big unlock — spec it against doctrine requirements, not just one consumer.
2. **`ENTITY_TYPES` extension** — currently shell/weapon/mod_slot/map/mode/
   event. DMZ's prize entities (keys, POIs, factions, missions) have no home,
   and Marathon's own designed taxonomy (factions/uniques/cradle) is also
   absent. Extend the enum + the mirrored DB CHECKs together ("alter together"
   comments mark the spots).
3. **`loadVocabulary` isMarathon branch** — non-Marathon games currently get
   empty shell/mod vocabulary, so DMZ content can't classify. Fix in the
   coverage module.
4. **Routing** — the VANTAGE precedent (dmz → /dmz/discourse/) establishes
   game-partitioned URLs. Confirm how far /dmz/* extends and that a URL alone
   determines its game (the GSC attribution rule depends on it).
5. **Sitemap + JSON-LD/metadata** — verify sitemap generation includes DMZ
   routes, and that structured data (WebSite/Organization/Breadcrumb blocks)
   doesn't hardcode "Marathon" on shared surfaces. Wrong-game JSON-LD fails
   SILENTLY WRONG — the dangerous kind.
6. **`game_slug` everywhere** — every new DMZ table: NOT NULL, no default
   (a default silently attributes rows to the wrong game).

---

## WORKSTREAM 4 — ON-PAGE SEO SPEC (enforced at creation, never retrofitted)

Doctrine Gate 4, learned from the 1,343-page title-debt on Marathon:

- **Title ≤ 60 chars**, primary keyword front-loaded (note: HEADLINE_RULES
  currently allows 65 — align the prompt AND the code gate to 60 together, one
  commit, so framed headlines stop truncating in SERPs)
- **Meta description ≤ 155 chars**
- **Alt text on every image**; **one H1** matching the target query
- **Clean keyword-bearing slugs**, no dates on evergreen pages
- **Internal links wired AT publish** — hub-and-spoke (/dmz hub ↔ region hub ↔
  detail pages, siblings cross-linked), keyword-bearing anchors, ZERO orphans.
  Internal linking is the only authority lever fully under your control; pull
  it hardest while backlinks are thin.
- **JSON-LD per canonical** (Breadcrumb + page-appropriate schema), following
  the /factions and /meta patterns already proven on Marathon

---

## WORKSTREAM 5 — INDEXING MACHINERY (mostly built; point it at DMZ)

- **Consumer C (URL Inspection)** action-driven tier: every new DMZ canonical
  enters "watch until confirmed indexed" the day it publishes — this is the
  doctrine's 30-day indexation check running as code. If a page isn't indexed
  in ~30 days, that's the earliest thin-content signal; fix it in August, not
  October.
  - **CANARY (deferred commitment, 2026-07-24):** when this is built, the FIRST
    URL it enrolls is `/dmz/pois/hajin-city` — the DMZ POI vertical's canary.
    Google's verdict on that one page gates whether the remaining eight POIs ship
    on the same template. (Build 1's brief asked to enroll it "on publish"; Consumer
    C did not exist yet, so it became this phase-5 designation. See HANDOFF, the
    `/dmz/pois` Build-1 entry.)
- **GSC page metrics** already pull daily — pre-launch DMZ pages will show
  near-zero impressions and that's expected (kill-clock exemption). The few
  pre-launch queries that DO exist ("DMZ release date," "what is DMZ MW4",
  "DMZ vs Warzone") are the early scoreboard — watch position on those.
- **At launch:** flip the pull to hourly dataState for the DMZ set; that plus
  Consumer C is the complete launch instrument, already proven for two months
  by then.

---

## WORKSTREAM 6 — OFF-SITE AUTHORITY (the ceiling-raiser; starts now, compounds slowly)

DA 23 / TF 6 / 16 referring domains is the ceiling on everything. No shortcut
exists; the launch window is the one natural link-earning moment:

1. **Pick 2–3 communities** (the DMZ/CoD subreddits, relevant Discords) and
   participate genuinely NOW — weeks of real presence before ever citing your
   own pages. Spam-dropping links is how the junk backlink profile happened;
   answering questions well is how the good one gets built.
2. **Build one citable data asset pre-launch** — e.g. the definitive Hajin
   POI/keys reference or an interactive map layer. "The best early DMZ
   resource" is what launch-week writers and Redditors link to; that's the
   plan for earning the editorial links that raise the KD ceiling.
3. **The X presence** — share the intel as it's built; citations become links.
4. **Do NOT disavow the junk backlinks** (already decided): Google discounts
   them; the fix is drowning 16 domains in earned quality, not cleanup.

---

## ADVICE FOR EXECUTING THIS (pass along verbatim)

1. **Sequence:** demand map → seam fixes (registry, ENTITY_TYPES, vocab,
   routes) → top-5 canonicals deep → next 10–20 by demand rank → authority
   work in parallel throughout. Indexing machinery is already live; just
   enroll each page as it ships.
2. **Depth beats coverage.** If time runs short, 12 deep canonicals beat 25
   thin ones — Gate 1a exists because thin-at-scale is the disease that
   produced the 1,300-article Marathon cleanup.
3. **Never invent facts to fill a section.** A false page is worse than no
   page; an honest "unverified until launch" gap is a feature. The provenance
   tags are what make launch-week corrections a query instead of an audit.
4. **Avoid the Sep 22 collision** — freeze DMZ structural work that week;
   Season 3 re-verification owns it.
5. **The freeze does not apply to this lane.** Marathon feed generation is
   frozen by doctrine; DMZ canonical building is the doctrine's Phase 1 and is
   supposed to be running. If a demand-led generation path is used for these
   pages, it runs under the five gates (demand ✓ canonical-check ✓ sourced ✓
   spec ✓), which is keyword-led BY DESIGN in this lane — distinct from the
   feed lane's lens-not-gate rule. Both rules are correct; they govern
   different lanes.
6. **Decisions needed from the operator, collected not guessed:** how far the
   /dmz/* route namespace extends beyond the VANTAGE precedent; who/what
   builds the canonical pages (manual, editor-generated under gates, or
   hybrid); per-game theming or shared design system.
7. **Definition of done (Aug 31):** ranked demand map exists · registry +
   enum + vocab seams fixed · top ~15 canonicals live, provenance-tagged,
   spec-compliant, interlinked, enrolled in indexation watch · community
   presence active in 2–3 venues · one citable DMZ data asset published.

The measurement machine is built. This is the part where the site steps in
front of the demand before it arrives — done in August, October is a harvest;
done in October, it's a scramble.
