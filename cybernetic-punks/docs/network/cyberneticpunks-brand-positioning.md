# Cybernetic Punks — Brand Positioning (the network brand)

## Status
Positioning foundation. Anchors the neutral root hub design, the
product-verbiage/network-vs-game audit, the profile/premium vision, and
the editorial quality standards. This is strategic framing, not a build
spec.

## Verbal identity (locked)
- Brand name: **Cybernetic Punks** (TWO words — not "CyberneticPunks").
- Descriptor (under logo / hero / meta — clear, SEO): **"The
  extraction-shooter intelligence network"**. Claims the category ("the"),
  carries multi-game scope ("network"), owns "intelligence."
- Tagline (share card / memorable / attitude): **"No hype. Just intel."**
  Authority-with-punk-edge: anti-content-farm stance + a quality promise
  in one line; reinforces depth-over-AI-buzz positioning.
- Pairing: "Cybernetic Punks — the extraction-shooter intelligence
  network. No hype. Just intel."
- Retire: "Built on the Grid" (Marathon-flavored, doesn't survive into the
  network brand).

## The brand inversion (locked)
Cybernetic Punks is NO LONGER "a Marathon site that's adding games." It is
**the extraction-shooter intelligence network** — a brand in its own
right. Individual games (Marathon, DMZ, future titles) are PROPERTIES /
coverage areas UNDER that brand, not the brand itself.
- The brand is the network. Games are what the network covers.
- This is only possible because of the multi-game architecture (game
  template, shared backend, cross-game AI editors) already built — that
  architecture is the ENGINE for this brand position.

## Positioning (locked)
**Headline = DEPTH / QUALITY**, not AI.
- The brand promise: "the best extraction-shooter intelligence, period —
  deepest data, most current, most useful, across games."
- AI is the ENGINE, not the headline. It is HOW the depth is delivered at
  a scale/freshness humans can't match (per-entity databases, launch-day
  data, auto-updating meta, cross-game coverage) — but it is NOT the sales
  pitch.
- Why: "AI-powered content" is the most commoditized, gimmick-prone
  framing on the web. Leading with it reads as slop. Leading with DEPTH
  and letting AI be the satisfying explanation for unmatched currency/
  completeness reads as premium. AI earns its mention by explaining the
  quality, after the quality is felt.
- The visitor's reason to come = it's genuinely the most useful, complete,
  current extraction-shooter resource. The AI is why that's sustainable.

## The competitive position this unlocks
- Nobody holds "THE cross-genre extraction-shooter authority." CODCentral
  = CoD-only. Marathon sites = Marathon-only. Tarkov sites = Tarkov-only.
- Cybernetic Punks can be the network that covers extraction shooters
  ACROSS games with systems depth none of the single-game incumbents
  match — a brand-level moat bigger than any one game.
- The edge is NOT "we use AI, they don't." The edge is "queryable,
  always-current, per-entity systems depth (every weapon/recipe/region,
  updated every patch) that a human-staffed blog physically cannot
  maintain." Depth is the brand; AI is why depth is possible.

## The quality bar is now a BRAND REQUIREMENT (locked)
- Claiming "premier / the best" raises the editorial bar. The verification
  discipline is no longer just hygiene — it is brand-critical.
- A "premier intelligence" brand CANNOT have editors hallucinating stats,
  extrapolating crises from thin data, citing unverified numbers, or
  bleeding content across games.
- The work already done is QUALITY-OF-PRODUCT work, now load-bearing for
  the brand: the [UNVERIFIED] calibration + citation enforcement, the
  thin-source honesty rule, the NEXUS anti-doom-loop guard, the no-bleed
  editorial scoping, headline rules. These become STANDARDS the brand must
  hold every cycle, not one-off fixes.
- Brand implication: the editorial quality bar goes UP, and holding it is
  part of delivering the brand promise. The promise writes checks the
  editors must cash every cycle.

## How this shapes the neutral root hub
The root is the BRAND'S FRONT DOOR. Its jobs, in priority order:
1. ESTABLISH THE BRAND — "Cybernetic Punks: extraction-shooter
   intelligence network." Lead with depth/quality positioning (NOT "AI
   inside").
2. ROUTE to the visitor's game — fast, themed game tiles (Marathon teal /
   DMZ amber), each a clear door into that game's hub.
3. SHOW THE NETWORK IS ALIVE — light, GAME-SEGMENTED pulse (per-game
   latest, visually compartmentalized — NOT a blended feed, which would
   break content separation).
- The root is a router-with-a-pulse + brand front door, NOT a content
  destination and NOT a blended feed.
- Anti-gimmick guardrail: "premier brand" is established by the root doing
  its jobs well + the network genuinely delivering depth — NOT by brand
  decoration (manifestos, mission statements, brand video). Keep the root
  build TIGHT; premium feel comes from polish + substance, not brand-stuff.

## Structural change this implies (confirmed)
- The current rich Marathon homepage (tier list / advisor / cradle / live
  stats — all Marathon) MOVES to Marathon's hub page.
- The root becomes a NEW neutral brand/network layer ABOVE the games.
- (Per locked URL decisions: Marathon stays unprefixed; root is the
  network front door.)

## Neutral root hub — approved layout direction
The root layout structure is LOCKED (exact copy/pixels = build-time):
1. BRAND HERO (leads): network identity + the depth/quality promise as a
   confident one-liner (draft: "The deepest, most current intel in every
   extraction shooter"). AI is whispered at the FOOTER as the engine
   ("powered by a live intelligence pipeline — updated continuously,
   verified against patch data"), NOT in the hero. Depth sells; AI
   explains.
2. ROUTING TILES ("choose your zone"): one themed entry tile per game —
   Marathon (teal, its pulse: online count + next update) and DMZ (amber,
   pre-launch state: "Oct 23 / field intel incoming"). Each tile is a
   clear door into that game's hub and previews its world via its theme.
   The DMZ tile working pre-launch IS the pre-launch-hub vision.
3. GAME-SEGMENTED PULSE: per-game "latest from X" columns, visually
   separated + themed — NOT a blended feed (honors content separation; a
   Marathon-seeker and DMZ-seeker each read their own column).
- TIGHT, not sprawling: no manifesto/mission-essay/brand video. Premium
  feel = restraint + typography + a confident promise + the network
  actually delivering depth. (Anti-gimmick guardrail.)
- A light account/"join free" affordance present but not pushy (gestures
  at the future profile/premium layer; not built yet).
- Open/rough: exact hero copy + brand voice (push later), final density,
  the account affordance wording.

## Products model — network types, per-game instances (locked)
The homepage product cards were 4 MARATHON-specific products. They become
4 NETWORK-LEVEL product TYPES that each game instantiates with its own
data + vocabulary. Same network-vs-game discipline as tables/sections.

### The rule
- A product TYPE is network-level (the network knows how to render it).
- A game only SURFACES the types it actually has — NOT every game gets
  all 4. A game's config declares which products it offers. (Prevents the
  "DMZ has no Cradle" confusion structurally — DMZ's config just omits/
  remaps it.)
- Each instance speaks the GAME'S NATIVE VOCABULARY (Marathon: build/
  shell/Cradle; DMZ: loadout/operator/FOB). The type is universal; the
  label + copy + data are the game's.

### Extends the game-template (GAME_TEMPLATE.md)
Products join sections in the per-game config: a game declares
{ sections: [...], products: [...] }. Each product entry ~
{ type, label, ... } — type network-level, label/data game-scoped. Same
config-driven, content-agnostic pattern as sections. Adding a game = it
declares its products too.

### The 4 product types resolved
- TIER LIST — ranked gear/loadout rankings. Marathon: "weapons & shells,
  ranked S–C." DMZ: "weapons & gear, ranked." Genre-universal, strong SEO
  ("[game] tier list" is a real search). Likely every game.
- BUILD ADVISOR — input your situation -> optimized build/loadout rec.
  Marathon: "tell us your shell, we build the loadout." DMZ: "tell us your
  operator/playstyle." Most games.
- PROGRESSION PLANNER — plan character progression. Marathon instance =
  "Cradle Planner" (stat build). DMZ instance = "FOB Planner" (trait tree).
  ONLY games with plannable progression — a game without it simply omits
  this product. (This is the product that proved "not all 4 apply to every
  game.")
- BUILD COACH — submit an existing build -> AI grades it. Marathon: "get
  your build graded." DMZ: "get your loadout graded." Most games. PREMIUM
  candidate (ties to the AI-advisor surface + the profile/premium vision).

### Notes
- SEO: per-game vocabulary HELPS SEO — players search the game's terms
  ("DMZ loadout," "Marathon tier list"). Matching native vocab ranks
  better than forcing one neutral term. Vocab choice serves clarity AND
  SEO.
- Per-game glossary: each game needs a small source-of-truth glossary in
  its config so vocab stays consistent within a game (DMZ always
  "loadout," never drifting to "build").
- These products are informative, get-to-the-point, SEO-friendly — the
  card copy should state the function plainly in the game's words.

## Feeds into (later, not now)
- Product-verbiage / network-vs-game audit: implemented per the products
  model above (own build session).
- Profile / premium vision: a NETWORK profile spanning all games is a far
  stronger premium proposition than a single-game profile. See
  profile-premium-vision.md. (Vision-capture, sits on the DEFERRED identity
  rework — not pulled forward.)
