# Broker (Step 6) — Scoping, Verdict, and Deferred Activation Plan

## Status
SCOPING doc (read-only research; no build). **VERDICT: Broker activation is
PAUSED.** Marathon has no renewing economy/market data to sustain a dedicated
6th editor; Broker's natural debut is DMZ's launch economy (Oct 23, 2026).
This doc captures the verdict, the wiring audit, and the full gated build plan
for when Broker IS activated. Reference: [editorial-staff-model.md](editorial-staff-model.md)
(locked Broker voice/character), [EDITOR_REWORK_AUDIT.md](EDITOR_REWORK_AUDIT.md).

Broker = **Vera Sloan**, the "economy & market" lane — a ruthlessly
unsentimental EV / cost-benefit analyst (the ledger; calls beloved metas
value-traps). Already present in the display map (`lib/editors/roster.js`):
Vera Sloan, `$` symbol, slate `#8b95a7`, **`status: 'incoming'`**.

---

## PART 1 — The gate: does Broker have a real beat? → THIN / NO-GO for Marathon now

**Marathon HAS an extraction economy:** persistent gear stakes (you can lose
your loadout), credits, faction reputation, contracts that earn equipment, and
a seasonal arsenal reset.

**But the "market" half does not exist:** no confirmed player marketplace,
auction, flea-market, or fluctuating item pricing (the Tarkov-style economy the
"EV accountant" concept implies). There is no trading/pricing signal to track.

**Economy data we actually hold (Supabase, verified June 2026):**
- `faction_armory` = **44 rows, all verified** — `credit_cost` / `material_cost`
  / `rank_required` / `is_free` (e.g. weapons at 100/50 cr, ammo at 5 cr,
  sponsored kits), by faction + rarity + item_type.
- `faction_upgrades` = 6 rows. Plus weapon/mod rarity tiers.
- This data **already feeds `fetchGameContext`**, so existing editors can
  already cite costs.

**Why THIN, not GO:**
1. **No market/pricing dynamics** — only static acquisition costs; nothing to
   track cycle-over-cycle.
2. **Dataset is tiny + static** — 44 armory rows cannot sustain a per-12h-cron
   editor; it repeats within days. Every other editor has a RENEWING source
   (Cipher = internal synthesis, Nexus/Dexter = YouTube, Ghost = Reddit/Twitch,
   Miranda = guides + stats). **Broker would have no renewing data input — and
   that input is the single hardest requirement.**
3. **Beat overlaps existing editors** — DEXTER already covers build cost /
   faction-gated-gear accessibility, and the armory data already flows into
   context; CIPHER's prompt explicitly routes economy topics to "GHOST or
   DEXTER territory."
4. **Commercial context** — Marathon reportedly underperformed (Sony/Bungie
   ~$765M writedown, 2026). Expanding editorial scope to a thin 6th lane is
   poor ROI while the core audience is uncertain.

**Verdict:** not premature as a CONCEPT (the network-level newsroom design is
right) — premature on MARATHON. As a dedicated cron editor on Marathon today,
Broker has no renewing material. **PAUSE activation.**

### The DMZ reframe (why Broker is GO later, not NO-GO forever)
Broker's genuinely rich beat is **DMZ's launch economy**. Per the DMZ docs, DMZ
ships Oct 23, 2026 with **3D Printer recipes + material costs, FOB progression
costs, a redesigned Gunsmith tied to in-match cash, and loot/extraction value**
— abundant, analyzable economy AND market content. Editors are network-level
(cover every game), so Broker should **debut with DMZ**, where an EV/cost-benefit
analyst has real, renewing material.

### Revisit triggers
- **(strong)** DMZ's economy data lands at launch (Oct 23, 2026).
- **(alt)** Marathon adds a real market / trading / fluctuating-pricing system.
Until one of these is true, hold Broker.

---

## PART 2 — Wiring audit (what activating a 6th editor touches)

### Already handled by the map-driven layer (Steps 1-3 payoff)
- `lib/editors/roster.js` already has Broker (Vera Sloan, `$`, slate,
  `status:'incoming'`); `EDITOR_ORDER` includes `broker`.
- `components/Footer.js`, `components/Nav.js`, `app/editors/page.js` consume
  `getAllEditors()` / `getEditorDisplay()`. Footer filters `status==='live'`,
  so flipping Broker to `'live'` **auto-surfaces it** in footer/nav/staff page.
- `editorInitial()` covers the missing `broker.jpg` (graceful "V" badge) until
  the imaging pass runs.

### Hardcoded-5 spots that must add Broker (the real work)
| location | what it is / what Broker needs |
|---|---|
| `lib/editorCore.js` `EDITOR_PROMPTS` / `EDITOR_TOOLS` | no Broker — needs a persona prompt (locked Broker voice) + a publish tool |
| `lib/editorCore.js` `COMMENT_VOICES` (no Broker), `COMMENT_AFFINITY` (~1315), `selectCommenters` (~1325 hardcodes `['CIPHER','NEXUS','DEXTER','GHOST','MIRANDA']`) | comment layer — Broker excluded from commenting until added |
| `app/api/cron/route.js` (editor list ~674, per-editor prompt-assembly blocks, the 4 no-repeat reads) | generation loop — add Broker + its gather input |
| **`lib/gather/*`** | **NO Broker source — the biggest new build; the Part 1 blocker** |
| `app/intel/[slug]/page.js` — `EDITOR_STYLES` (~26), `OTHER_EDITORS` (~603), `OTHER_EDITOR_CONFIG` (~604), lane `EDITORS` cfg (~10-14) | article byline/lane render; `/intel/broker` 404s today (not in the lane `EDITORS` map) |
| `app/intel/page.js:61` `EDITOR_INFO`; `app/guides/[category]/page.js:371` `EDITORS` | filter/label configs |
| `app/sitrep/page.js:176` + `app/api/sitrep-data/route.js:58` (5-arrays); `app/admin/page.js:140` (create-article editor dropdown); `app/api/dev/sample-editor/route.js:24` `VALID_EDITORS` | enumerations |

### ⚠ Hard ordering rule (the landmine)
`EDITOR_STYLES[editor] || EDITOR_STYLES.CIPHER` (and similar config fallbacks)
mean a `BROKER` article published BEFORE its display config is wired **renders
as CIPHER** (red, wrong name). Therefore: ALL display + routing wiring must land
BEFORE Broker ever publishes, and `roster.js` flips `incoming -> live` LAST.

---

## PART 3 — Gated build plan (for when Broker IS activated)
Safest / most-additive first; publishing LAST (per the ordering rule).

1. **Build the data source FIRST (the gate).** Broker needs a renewing gather
   input (DMZ economy: printer recipes/material costs, FOB costs, Gunsmith cash,
   loot values). **If there is no renewing source, STOP — do not proceed.**
2. **Persona prompt + publish tool + comment voice.** Use the proven 5b/5c
   method (structural voice, modulates-by-context + data-honesty clauses, no
   parroted quotes) via the dev sampling harness — add Broker to
   `VALID_EDITORS` to sample article + comment before committing.
3. **Wire the key everywhere EXCEPT publishing:** `selectCommenters` /
   `COMMENT_AFFINITY`, cron editor list + a Broker no-repeat read,
   `EDITOR_STYLES` / `OTHER_EDITORS` / `OTHER_EDITOR_CONFIG` / `EDITOR_INFO` /
   lane `EDITORS` / guides / sitrep / admin / harness arrays. Kill the
   silent-CIPHER fallback (null-safe display, no Cipher default).
4. **Enable the `/intel/broker` lane;** add `broker.jpg` when the imaging pass
   lands (until then the initial-badge fallback holds).
5. **LAST:** flip `lib/editors/roster.js` Broker `status: 'incoming' -> 'live'`
   and add Broker to the cron generation list so it publishes. Gate each step;
   sample before publish.

**Net:** activation is a real build (data source + persona + ~10 wiring sites +
ordered go-live), not a voice-inject. Do it when the beat is real (DMZ launch).
