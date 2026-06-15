# DMZ Refactor — URL Map & Theming Decisions

**Status:** DECISION DOC (LOCKED items + 2 flagged-open sub-items). Records decisions for
July execution. **No routes, no CSS, no redirects, no migration implemented.**
**Date:** 2026-06-15.
**Companion:** table/game-scope decisions in [TABLE_INVENTORY.md](TABLE_INVENTORY.md)
(same DMZ decision set). With this doc, the **June-17 architecture lock is COMPLETE**
except the 2 minor open sub-items below — neither blocks the July refactor.

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

### OPEN sub-decision (flagged, not decided) — Root homepage
- `cyberneticpunks.com/` (bare domain, no game): options —
  (a) neutral network landing / game-picker (Marathon | DMZ),
  (b) flagship-default to Marathon with clear DMZ nav,
  (c) blended cross-game latest feed.
- **Not blocking:** DMZ traffic arrives via `dmzpunks.com` or `/dmz/...` links and lands
  in the DMZ hub directly, so the root only matters for someone typing the bare domain.
  Decide later; does not gate the refactor.

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

### OPEN sub-decision (creative pass, later) — exact DMZ visual spec
- The specific DMZ palette, accent colors, and how strongly it departs from Marathon = a
  **creative pass closer to build**, when it can be iterated visually. **Mechanism is
  locked now; exact look is not.**

---

## Remaining open architecture sub-items (neither blocks July)
1. **Root homepage** content for the bare domain (game-picker vs flagship-default vs
   blended feed).
2. **Exact DMZ visual spec** (palette/accents/departure strength) — creative pass near
   build.

Everything else in the DMZ architecture set is LOCKED (this doc + the table inventory).
Migration SQL, route implementation, redirects, and CSS tokens are **July execution**.
