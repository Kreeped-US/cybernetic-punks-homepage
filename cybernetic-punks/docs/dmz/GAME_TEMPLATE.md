# Network Game-Section Template — Design (the pattern every game inherits)

## Status
DESIGN doc. This defines the reusable structure for how ANY game attaches to the network. DMZ is the FIRST INSTANCE of this pattern, not a bespoke build. Marathon will eventually be refactored onto it too (later — not now; Marathon stays as-is until deliberately migrated).

## The core principle
**Universal in STRUCTURE, agnostic about CONTENT.** Every game attaches to the network the same way (the plug-in mechanism is the inherited logic). What each game's sections ARE, and what content they hold, is per-game data/config — NOT baked into the template.

Why this cut (and not a universal section set): we have one complete game (Marathon) and one pre-content game (DMZ). A universal *section set* ("every game has intel/meta/builds/guides") generalizes from one example and breaks at game #3. A universal *plug-in structure* (every game = a slug + a sections-config + the shared shell) is structural and holds regardless of what a future game's sections are. Generalize the mechanism, not the taxonomy.

## The template = three parts

### 1. game_slug as the organizing dimension (PROVEN)
Every game is identified by game_slug. Content lives in shared tables tagged with game_slug; reads filter by it. This is already proven end-to-end (the feed_items migration, Steps 2-3). A game's content is "the rows WHERE game_slug = <game>". Nothing new to design here — it's the foundation the section template sits on.

### 2. Per-game sections-config (the key abstraction)
Each game declares its sections in a config — a list of section descriptors. The route structure, nav, and landing page render FROM this config — not from hardcoded per-section pages. Each section descriptor carries: its slug (URL segment), display label (game's own vocabulary — DMZ "Field Intel" vs Marathon "Intel Feed"), and how it filters/queries content (the content-agnostic hook). Adding a game = adding a config entry. A future game with totally different sections just has a different config — the template doesn't care what the sections are.

### 3. The shared shell (presentation-level commonality)
Common across all games, theme-swapped per game: per-game header/nav (renders the sections-config), the route-group wrapper keyed on game (/dmz/... ; Marathon stays unprefixed per the locked URL decision), the empty-state pattern, the theming token-swap (Marathon teal / DMZ amber+grey+irradiated-red) at the route-group level, and a per-game landing page layout.

## What is NOT in the template (the anti-premature-abstraction line)
- NO universal section set. Sections are per-game config.
- NO universal content taxonomy. Marathon has shells/mods/weapons; DMZ has FOB/printer/regions. The template is agnostic; content types are per-game.
- NO runtime abstraction "engine"/dynamic-route-generator built as a meta-system now. Get the benefit from a clear, copyable, config-driven structure. Build the heavier generator ONLY if/when a 3rd/4th game proves it's needed.
- NO Marathon migration onto the template right now (Marathon works; migrate it deliberately later).

## How this satisfies "the logic every future game inherits"
The INHERITED logic is the plug-in mechanism: game_slug + sections-config + shared shell. Game #3 attaches by (a) tagging its content with its game_slug, (b) declaring its sections-config, (c) getting the shared shell + its theme tokens. Its unique sections may need bespoke page work, but the ATTACHMENT pattern is identical every time. That's the durable abstraction — structural, not taxonomic.

## Settled design decisions (locked)

### D1 — Config location + descriptor shape
- Per-game config MODULE (each game = a folder + a config exporting its sections) + a lightweight network-level REGISTRY mapping game_slug -> config (one place to enumerate games).
- THIN section descriptor: slug, label, contentFilter. Add fields ONLY when a real section needs one — never speculative.

### D2 — DMZ's initial section set: FULLER SKELETON
DMZ launches (as shells now) with its full skeleton, in TWO categories (this distinction is carried in the descriptor — a justified field, since the two kinds read different sources):
- EDITOR-FED sections (fill from feed_items as articles publish): Field Intel, Meta, Loadouts. These read feed_items WHERE game_slug='dmz'.
- DATA-FED sections (fill from launch-day structured data — the Track-3 database work): 3D Printer (recipes), FOB (progression/optimizer), Hajin Regions (maps/loot). These render "coming soon" shells now and will later read their OWN entity tables, not feed_items.
- Rationale: fuller skeleton makes the DMZ section look complete/real pre-launch (the hub vision), and the editor-fed/data-fed flag tells the template where each section's content comes from.
- DMZ vocabulary throughout (Field Intel / Loadouts / OPS, not Marathon's Intel Feed / Builds).

### D3 — /dmz theming in Step 4
- WIRE the token-swap mechanism at the route-group level in Step 4, using ROUGH DMZ tokens (approx the locked direction: amber primary, cold grey-blue base, irradiated-red hazard). This PROVES the theming mechanism works AND gives DMZ visual distinction (hub vision).
- The tokens are explicitly ROUGH — final palette tuned at the launch-polish pass. Do not treat the Step-4 hex as final.

### D4 — Shared shell
- Build the shell (header/nav/landing/empty-state) for DMZ CLEANLY, but do NOT extract it into a shared-component layer yet. Extract-to-shared when Marathon migrates onto the template later. Same DMZ-first-then-template discipline, one level down.

## Step 4 build is now fully specified
Step 4 = build DMZ as the empty first instance of the template: the /dmz route group + shared shell + DMZ sections-config (full skeleton, editor-fed + data-fed shells) + rough DMZ theme tokens (swap mechanism wired) + each editor-fed section reading game_slug='dmz' (empty) and each data-fed section a "coming soon" shell. Marathon untouched. Verify renders-empty + Marathon-unchanged + build green. The first game_slug='dmz' INSERT remains a SEPARATE gated go-live step.
