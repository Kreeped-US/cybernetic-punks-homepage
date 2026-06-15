# DMZ Refactor — URL Map & Theming Decisions

**Status:** DECISION DOC (LOCKED items + 2 flagged-open sub-items). Records decisions for
July execution. **No routes, no CSS, no redirects, no migration implemented.**
**Date:** 2026-06-15.
**Companion:** table/game-scope decisions in [TABLE_INVENTORY.md](TABLE_INVENTORY.md)
(same DMZ decision set). With this doc, the **June-17 architecture lock is FULLY
COMPLETE** — no remaining open architectural decisions; only build-time hex tuning and the
July refactor execution remain.

---

## URL MAP

### LOCKED — Prefix structure
- **Marathon stays UNPREFIXED** — existing URLs unchanged (`/intel/...`, `/meta`,
  `/rising`, etc.). **DMZ is PREFIXED** — `/dmz/intel/...`, `/dmz/meta`, etc.
- **Rationale:** protects Marathon's existing (thin: ~28 clicks/quarter) SEO authority —
  **no 301 redirects on existing URLs, no re-indexing risk.** Accepts an internal routing
  asymmetry (Marathon = the unprefixed default game) as a cheap, invisible-to-users wart
  vs. the concrete SEO risk of migrating Marathon's URLs.
- **Not permanent:** correct-for-now. Revisit a symmetric all-games-prefixed structure
  (with 301s) IF/WHEN the network grows to enough games that the asymmetry hurts AND
  there's enough authority to absorb a redirect migration. Deferred on purpose to when
  it's cheaper and the benefit is clearer.

### LOCKED — Per-game hubs (the content-separation guarantee)
- Each game has its **OWN landing hub showing ONLY that game's content.** `/dmz` = a
  DMZ-only hub (DMZ intel feed, DMZ meta, DMZ builds, DMZ news, DMZ ops-center). **A DMZ
  visitor never sees Marathon content.**
- Every DMZ sub-route (`/dmz/...`) is DMZ-scoped; route groups enforce the separation —
  the core requirement: someone seeking DMZ info must not land on a Marathon-filled page.
- Marathon's hub is its existing experience (unprefixed).

### LOCKED — Vanity redirect
- `dmzpunks.com` -> **308** -> `/dmz` (lands DMZ-seekers directly in the DMZ hub; they
  never touch the root or Marathon).

### LOCKED — Root homepage (REVISED 2026-06-15)
- **Neutral network hub from day one.** Bare `cyberneticpunks.com/` is a network landing
  showing cross-game pulse — latest across all games, "the network covers Marathon,
  DMZ, ..." — with clear routing to each game's hub. Not a bare game-picker; a living
  cross-game hub.
- **REVISION note:** this **supersedes** the earlier locked decision (flagship-default to
  Marathon, switch to a picker at DMZ launch). Changed to match the clarified multi-game-
  network vision — a neutral hub that links visitors to their game.
- **Rationale (and why this differs from the prefix decision):** the site's SEO authority
  lives in deep content pages (`/intel/...` etc.), **NOT** the bare root, so a neutral hub
  does not disturb ranking — deep-page URLs stay unchanged. The prefix decision protects
  high-authority deep-page URLs; the root holds no meaningful authority, so it is free to
  become neutral now (negligible SEO cost).
- Still honors content separation: a DMZ-seeker via `dmzpunks.com` -> `/dmz` never sees
  Marathon; the neutral hub only serves the bare-domain visitor.

---

## THEMING

### LOCKED — Mechanism
- **Per-game CSS design-token themes, swapped at the route-group level** (CSS custom
  properties keyed on the game / route group). One **shared design system** (the locked
  cyberpunk identity: glitch typography, neon-on-dark, ops-center styling) = the network's
  bones; each game swaps its palette / accent tokens.
- **DMZ gets a distinct palette/feel** (colder, militarized — evoking the Hajin Exclusion
  Zone / CoD extraction tone) vs. Marathon's existing accents: recognizably a different
  game-space, clearly the same network. Reinforces the content-separation goal (the visual
  shift signals "you're in DMZ-world").
- **Marathon keeps its current tokens unchanged.**

### LOCKED (as DIRECTION; exact hex finalized at build) — DMZ visual direction
**Cyberpunk house style, DMZ-derived palette.** DMZ stays in the neon-glitch ops-center
house style (the domain is **DMZpunks.com** — the "...punks" keeps DMZ in the network's
cyberpunk family); it does NOT go military-realism, it swaps the palette.
- **PRIMARY:** amber/orange (matches the game's own DMZ brand accent; amber-on-black reads
  cyberpunk, stays in-family). Approx token direction ~`#e89a2c` — exact value tuned at
  build.
- **BASE:** cold desaturated grey-blue (overcast Hajin exclusion-zone atmosphere) ~`#0b0e11`
  bg / ~`#11151a` surfaces / ~`#2b3640` borders. Distinct from Marathon's warm-black/teal
  base.
- **HAZARD / DANGER accent:** irradiated red-orange ~`#e0563a`, reserved for danger/alert
  semantics (e.g. an IRRADIATED tag) — echoes the fallout-zone signature. A semantic DMZ
  has that Marathon doesn't.
- **Motif / vocabulary:** gas-mask / exclusion-zone / FOB ops-center framing; DMZ uses its
  own section vocabulary (e.g. FIELD INTEL, OPS RATING, LOADOUT PLANNER) vs Marathon's
  (INTEL FEED, CE SCORE, BUILD ADVISOR).
- **Mechanism (already locked):** per-game CSS design-token swap at the route-group level
  on the shared cyberpunk design system. Marathon keeps teal/neon; DMZ swaps to the above.
- **Still build-time:** exact hex values, the precise amber/grey balance, and the exact
  irradiated-red are finalized when iterated live against real components — this records
  DIRECTION + approximate starting tokens, NOT pixel-final spec (do not treat the ~hex as
  immutable).
- **IP note:** the theme is INFORMED BY the game's mood/accent, NOT a copy of Activision's
  logo or UI. Build an original DMZpunks look; do not reproduce CoD assets.

---

## Architecture lock — COMPLETE
**No remaining open architectural decisions** for tables, URL structure, or theming. Both
former sub-items (root homepage, DMZ visual direction) are now LOCKED above. The only DMZ
items left are **build-time** (exact hex tuning / live palette iteration against real
components) and the **July refactor execution** itself — migration SQL, route
implementation, redirects, and CSS tokens.

**Network-level principles & roadmap** the July refactor must honor — monetization-
readiness (seams only), template-after-DMZ, and the AI Q&A/advisor surface — are recorded
in [NETWORK_PRINCIPLES.md](NETWORK_PRINCIPLES.md). These are non-blocking design
constraints, not open decisions.
