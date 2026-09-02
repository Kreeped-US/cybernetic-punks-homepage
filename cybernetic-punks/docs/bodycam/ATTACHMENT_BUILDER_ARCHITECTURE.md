# Bodycam Attachment Builder -- Architecture (LARGE arc, phase 3, step 1)

STATUS: DESIGN ONLY. No builder code, no DB writes. Ends in a HOLD for Justin's review before any
implementation. Written 2026-09-02 against the live schema, the confirmed slot DAG
(docs/bodycam/ATTACHMENT_SEED_SCOPING.md), and the existing render/tool layer.

HEADLINE: the builder is a DEDICATED tool route `/bodycam/builder` = an SSR crawlable frame
(the rankable asset) + a client DAG-gated widget (engagement). It ships NOW against the EMPTY
tables as an honest slot-frame skeleton ("parts pending"), and fills in automatically as parts
land. The crawlable SEO value lives in SSR per-weapon / per-part content pages, NOT the widget.

---

## 1. The slot DAG the builder resolves (grounded)

From ATTACHMENT_SEED_SCOPING.md + the schema's `requires_slots` / `provides_slots` (text[]):

- SLOT TAXONOMY (the `slot_type` vocabulary): barrel(+short/long), muzzle(suppressor/flash-hider/
  compensator), upper-barrel, side-rail, optic-mount, optic(iron/close/mid/long + reticle +
  canted-toggle), magazine, trigger, grip, stock(+light/heavy), ammo, sticker.
- CONFIRMED DEPENDENCY EDGE (the only stated one): an `optic` REQUIRES an `optic-mount`; a
  rail/mount PROVIDES an `optic-mount` (devlog: "mount a rail before a sight"). Slot-level.
- MOUNTABILITY (what the builder computes): a part P is mountable for the selected weapon W iff
    (a) COMPAT: a `bodycam_attachment_weapon` row has (weapon_name=W, attachment=P, compatible=true), AND
    (b) DAG: `P.requires_slots` is a subset of the currently-PROVIDED slot set S, AND
    (c) SLOT FREE: `P.slot_type` is not already occupied by a mounted part (unless they share a
        `toggle_group`, e.g. canted + primary optic).
  where S = BASE_SLOTS(W) UNION (union of `provides_slots` over all currently-mounted parts).
- BASE_SLOTS(W): the always-available root set. Per the scoping doc Q3, phase-3 uses a BUILDER
  CONSTANT (the platform base slots: barrel, muzzle, magazine, side-rail/optic-mount, trigger,
  grip, stock, ammo), with per-weapon exceptions expressed via the compat join. Parts with
  `requires_slots = '{}'` mount directly on the bare weapon. (The `bodycam_weapon` extension table
  remains the additive seam if base slots ever diverge per weapon -- not built.)
- EXPANSION: mounting a rail adds `optic-mount` to S, which unlocks optics -- the DAG step. This
  is a standard BFS over provides->requires.

---

## 2. What exists to build on (read-first)

| Concern | Existing precedent | How the builder uses it |
| --- | --- | --- |
| SSR crawlable content + client tool split | `/marathon/tools/build/[shell]/page.js` SSRs the canonical via a static view, then mounts client `BuildRefiner` | Same split: SSR frame + `BodycamBuilderClient` |
| Client interactivity discipline | `BuildRefiner.js`: useState ONLY, NO URL writes, NO useEffect fetch, no side effects on load; crawler gets SSR content + fires zero calls | The builder copies these disciplines verbatim |
| Crawlable per-weapon page + derived indexability | `/dmz/builds/[weapon]/page.js`: force-dynamic, DERIVED is_indexable (noindex until every cited component verified), JSON-LD BreadcrumbList+WebPage, title <=60 | The per-weapon attachment page mirrors this |
| Honest-null data render + empty state | `components/game/GameArsenal.js` (names/classes only, values null, honesty banner) + `GameSectionPage`'s EmptyState | The builder's "parts pending" slots + content-page empty states reuse this posture |
| Bodycam vertical routing | `/bodycam/[section]` thin route over shared `GameSectionPage`; config sections field-intel/modes/arsenal/maps | The builder is a DEDICATED route, cross-linked from the Arsenal section (a static path segment takes precedence over `[section]`, so no dynamic-route collision) |
| Accent-in-code | `SHELL_ACCENT` map in the marathon build page | Bodycam steel-cyan `#3d97b8` from config theme |

GENUINELY NOVEL (no codebase precedent -- risk flagged in section 7):
- The DAG-gated mountability resolver. Marathon (5+1) and DMZ (9 fixed slots) are FLAT slot
  models -- nothing walks a requires/provides dependency graph. This logic is new.
- A tool that ships against an EMPTY table as an honest skeleton (most tools render existing data).

---

## 3. Builder component architecture + data flow

HOME: `app/bodycam/builder/page.js` (dedicated tool route; static `builder` segment beats the
`[section]` dynamic). force-dynamic (request-time, no build-time DB read -- the DMZ posture that
dodges the Marathon build-env scar).

DATA FLOW (server-fetch, client-resolve -- no client fetching):
1. The SERVER page fetches the full (small) datasets once: all `bodycam_attachments` + all
   `bodycam_attachment_weapon` for game_slug='bodycam', plus the weapon list from `weapon_stats`.
   With empty tables this is trivially cheap; even fully populated it is a few hundred rows.
2. It SSRs the CRAWLABLE FRAME (section 5) and passes the datasets as PROPS to the client:
   `<BodycamBuilderClient weapons={...} attachments={...} compat={...} baseSlots={...} accent="#3d97b8" />`.
3. The CLIENT resolves the DAG entirely in memory from those props -- NO fetch on load, NO API
   route, NO paid call (the BuildRefiner discipline, and here it is a free read so there is not
   even a server action). This also means a crawler sees the SSR frame and the client does
   nothing on mount.

CLIENT STATE (`app/bodycam/builder/BodycamBuilderClient.js`, 'use client'):
- `selectedWeapon` (string | null), `mounted` (map: slot_type -> attachment slug).
- Derived each render (pure functions, no effects):
  - `providedSlots(mounted, baseSlots)` = baseSlots UNION flatMap(mounted -> provides_slots).
  - `compatibleParts(selectedWeapon)` = attachments whose compat row for the weapon is true.
  - `isMountable(part)` = compat AND `part.requires_slots` subset-of providedSlots AND slot free
    (or shared toggle_group). The `<@` array op becomes a JS subset check.
- Interaction: pick weapon -> the slot frame shows each slot; mountable parts are selectable,
  gated parts show WHY ("needs an optic-mount -- add a rail first"); mounting a part re-derives
  providedSlots and re-opens the newly unlocked slots. Pure client-state; nothing writes a URL,
  nothing persists (matches BuildRefiner v1 -- shareable state is a deferred concern).

DAG RESOLVER (the novel core, `lib/bodycam/mountability.js` -- pure, unit-tested):
- Exports `providedSlots(mounted, baseSlots)`, `isMountable(part, mounted, compatSet, baseSlots)`,
  and `mountableNow(parts, mounted, compatSet, baseSlots)`. Pure functions over plain data, so
  they are testable WITHOUT the DB using SYNTHETIC fixtures (a rail that provides optic-mount, an
  optic that requires it) -- fixtures are test-only, never seeded, never rendered (not fabrication:
  they exercise logic, they are not product content). This de-risks the novel piece before any UI.

---

## 4. Crawlable content plan (the actual SEO asset)

The widget is client JS = NOT crawlable. The rankable value is SSR content pages. Two shapes,
both force-dynamic + DERIVED indexability (noindex until the cited rows are verified -- the DMZ
pattern; no stored flag, auto-indexes when parts verify):

- PER-WEAPON attachment page: `app/bodycam/weapons/[slug]/page.js` (static `weapons` segment).
  SSRs a weapon + its compatible attachments grouped by slot, with the honest-null tier posture
  (names/classes, no numbers) and a body link to the builder prefilled to that weapon. This is the
  primary SEO target ("bodycam <weapon> attachments / build"). Mirrors `/dmz/builds/[weapon]`.
- PER-PART page: `app/bodycam/attachments/[slug]/page.js` (static `attachments` segment). SSRs one
  part: its slot_type/subtype, its DAG position (requires/provides in plain language), notes, and
  the list of weapons it mounts on (from the compat join) -- each interlinked. Long-tail.
- INTERLINK GRAPH: per-weapon <-> per-part (via the compat join) <-> the builder; the Arsenal
  section links to the builder and to per-weapon pages. Body links from the field-intel canonicals
  to the builder from day one (the Marathon advisor scar: cross-link from ranking content).
- JSON-LD: BreadcrumbList + WebPage only (A1-clean), matching the DMZ build page.

All of these render an HONEST EMPTY STATE while parts are unpublished (section 5) and stay noindex
until verified rows exist -- so they can ship now as shells and light up automatically with data.

---

## 5. Empty-skeleton behavior (zero parts today -- honest, not broken)

With both tables empty, every surface degrades to an honest skeleton:
- THE BUILDER FRAME (SSR, crawlable): renders the attachment-SYSTEM explainer -- the confirmed
  slot taxonomy (section 1) and the ONE dependency rule (rail before optic) as static prose + a
  slot diagram. This is real, sourced, crawlable content even with zero parts.
- THE WIDGET (client): shows the full SLOT FRAME (every slot_type as an empty slot) with a
  per-slot "Parts pending -- no published parts yet" state, and a working DEMONSTRATION of the
  dependency logic on the empty frame (the optic slot is visibly LOCKED with "needs an optic-mount
  -- add a rail first" until a rail slot is filled). The mechanic is real and shown; only the
  parts are absent. It is a working slot-frame that teaches the structure, not a broken tool.
- THE CONTENT PAGES: render the honest "no parts published yet -- coverage lands as it is verified
  in-game" empty state (the GameArsenal/EmptyState posture) and stay noindex (derived: no verified
  parts). No fabricated rows, ever.

The honesty gate is the same as everywhere else: structure shown, values/parts pending, noindex
until real.

---

## 6. Phase-3 build order (proposed)

BUILDABLE NOW (against the empty tables -- no parts data needed):
1. `lib/bodycam/mountability.js` -- the DAG resolver, PURE, with a unit-test suite over synthetic
   fixtures (the novel risk, isolated and proven first, no DB, no UI).
2. `app/bodycam/builder/page.js` -- the SSR crawlable frame (system explainer + taxonomy +
   dependency rule + slot diagram), force-dynamic, noindex-until-parts.
3. `app/bodycam/builder/BodycamBuilderClient.js` -- the slot-frame widget over the resolver, with
   the honest per-slot "parts pending" empty state and the live dependency-lock demo. Works with
   empty props.
4. The crawlable SHELLS: `app/bodycam/weapons/[slug]/page.js` + `app/bodycam/attachments/[slug]/
   page.js` -- SSR, derived-indexable, honest empty states. Cross-links from the Arsenal section.

WAITS FOR PARTS DATA (phase 2 step 2 -- a published, sourced parts list):
- Nothing above needs parts to be BUILT; they are empty/noindex until real rows land. When parts
  + compat rows are seeded (honest-null, verified flips as confirmed), the widget fills, the
  content pages populate, and they auto-index via the derived gate. No rebuild, no code change.

Recommended order: 1 -> 2 -> 3 -> 4. Resolver-and-tests first because it is the only novel,
correctness-critical piece and it is fully testable in isolation.

---

## 7. Flagged risks (novel = no precedent)

- THE DAG RESOLVER is new to the codebase (all existing builders are flat). MITIGATION: pure
  module + unit tests over synthetic fixtures BEFORE any UI; the one confirmed edge keeps the
  initial graph tiny.
- SKELETON-FIRST TOOL: shipping a tool against an empty table is unusual. MITIGATION: the SSR
  frame is real sourced content on its own; the widget honestly says "parts pending".
- BASE_SLOTS as a builder constant (scoping Q3) is an assumption; if base slots diverge per weapon
  the `bodycam_weapon` extension table is the additive seam (not built now).
- INDEXABILITY: the content pages must stay noindex until verified parts exist (derived gate) so we
  never ship empty indexable shells -- called out so it is not forgotten at implementation.

---

## What this step does / does NOT do

DOES: propose the architecture (dedicated `/bodycam/builder` tool = SSR frame + client DAG widget;
the pure resolver module; the crawlable per-weapon/per-part content pages; the honest empty
skeleton; the build order). Grounds every piece in an existing precedent or flags it as novel.

DOES NOT: write any builder/resolver/route code; touch the DB; seed parts. bodycam.indexable stays
false. Awaiting Justin's approval of this architecture before phase-3 step-2 (build the resolver +
skeleton) begins.
