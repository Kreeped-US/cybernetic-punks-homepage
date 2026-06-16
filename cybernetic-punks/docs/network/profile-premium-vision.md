# Profile & Premium Experience — Vision (north star)

## Status
VISION / north star — NOT a build spec. Purpose: define the destination so the (deferred) network-identity rework is built to support the right thing. Sits on top of the deferred identity work. The vision is what's safe and valuable to complete NOW; the risky build (live-auth cutover) is deferred.

## The one-sentence vision
Your profile is your **cross-game extraction-shooter career**, fronted by a **shareable card whose hero is the best brag you have** — the free tier is expansive and brag-worthy, premium adds ongoing depth/power. Free is impressive; premium is powerful. Never gate the share-worthiness — it's the growth engine.

## Locked decisions

### Defining framing — the cross-game CAREER (locked)
- The profile leads with the cross-game "extraction-shooter career": ONE identity showing the player across Marathon + DMZ + future games.
- This is the network-brand payoff — no single-game site can offer it, and it gets MORE valuable the more games join (network effect on the user's own data). It's the structural reason to have an account here vs. a single-game site.

### The shareable card — HERO SLOT, best-available (locked, refined)
The shareable artifact has ONE dominant "hero" element — but it's a SLOT filled by the best-available data, NOT hardcoded to one thing. This solves the timing problem (the AI Coach is "coming soon" / no firm date; real game APIs may or may not exist per game) — the card ships NOW with what exists and UPGRADES automatically as stronger data becomes available. Same design-for-destination / ship-with-what-exists / defer-the-integration discipline used across the project.

HERO LADDER (strongest brag first; slot takes the highest available):
1. REAL GAME-API STATS (top) — authoritative verified performance (K/D, extractions, win rate) pulled from the game's platform API. Most impressive because it's FACT, not self-entered. DEFERRED + PER-GAME: availability is entirely at each publisher's mercy (Bungie/Marathon unknown; Activision/CoD historically restricted), could be nonexistent for some games. DESIGN the slot to accept it; integrate per-game if/when a usable API exists. Do NOT build API integration now.
2. AI COACH GRADE — uniquely yours, brands every share ("where'd you get that grade?"). The strongest OWNED brag. DEFERRED until the Coach ships (it's "coming soon"); drops into the hero slot then.
3. CROSS-GAME CAREER — the network flex (Marathon + DMZ + future under one identity); a competitor single-game site CANNOT replicate it. SHIPS NOW — this is the launch hero. Gets more impressive as games/career accumulate. (Empty-but-present future-game tiles on the card actually SELL the network.)
4. STANDOUT BUILD — concrete, game-native ("look at this loadout"). Always available fallback, esp. for brand-new users with no career depth yet.

LAUNCH DECISION: ship the card with CROSS-GAME CAREER as the hero (now), built as an upgradeable slot -> grade when Coach ships -> real stats if/when a game API is integrated.

Design requirements: the card must look incredible AS AN IMAGE (social shares are screenshots / OG cards), instantly readable out of context, carry Cybernetic Punks branding so each share recruits the next player. ONE hero brag, not four co-equal ones. The share IS the ad — cheapest, highest-leverage growth for an underdog.

Schema note: real game-API stats are just ANOTHER per-game data type — the game_profile jsonb (progression, or a sibling stats jsonb) holds it game-agnostically, no structural change. Confirms the schema is sound — it absorbs the new tier without rework.

### Free vs. premium line (locked)
- FREE = impressive + shareable: your builds, tier-relative loadouts, your CURRENT grade snapshot, cross-game presence, the branded shareable card. Genuinely brag-worthy so players share it. NEVER gate the share-worthiness — that's the distribution engine.
- PREMIUM (gated) = depth/ongoing power: the AI coach that REMEMBERS and TRACKS improvement over time (grade history, trend, coaching relationship), unlimited saved builds (vs a free cap), advanced planner tools, personalized intelligence feed, ad-free, premium profile flair/theme.
- Elegant seam: the SAME hero element splits cleanly — current grade = free snapshot; grade-over-time + coaching = premium relationship. Monetize the relationship, not the snapshot.

### Premium FEEL (locked, per brand positioning)
- Premium comes from polish, restraint, a striking shareable artifact, and GENUINE utility — NOT from gating everything or piling on features. A sharp ops-center identity card, not a cluttered profile page. (Same anti-gimmick / depth-over-decoration discipline as the brand.)

## What the profile catalogues (drives the schema)
- PER-GAME: saved builds/loadouts, progression state (Marathon Cradle / DMZ FOB-traits), grades over time, tier-list-relative gear, and (deferred) real game-API stats.
- NETWORK-LEVEL: the account identity, the cross-game "career" rollup, the shareable card.
- This inventory is what the identity schema must hold.

## The safe line for "moving sooner" (locked)
The identity rework splits into a SAFE part (move sooner) and a DANGEROUS part (stays deferred):
- SAFE / move sooner (additive + inert, can't break the live site):
  1. DESIGN the network-identity schema (generic account linking multiple games; builds attach to it; profile/career structure).
  2. ADD new tables ADDITIVELY (network accounts, linked_identity, per-game player-data, builds) that exist ALONGSIDE current Bungie auth without replacing it — inert until used.
  3. BUILD the shareable profile page/card front-end against MOCK/SAMPLE data — the premium experience is mostly front-end + design and has ZERO dependency on the auth rework.
- DANGEROUS / still deferred (the load-bearing cutover):
  - Swapping LIVE auth: ripping out bungie_* and migrating existing users to the generic account. Lock-out / data-corruption risk. Deferred until deliberate AND after the DMZ go-live.
  - Per-provider OAuth sign-in flows (Xbox/PSN/Activision/Bungie/Steam) — each its own integration; deferred.
- Principle: additive + inert before load-bearing. Everything up to the auth CUTOVER is fair game sooner; the cutover is the last, isolated, deliberate step.

## Sequencing
Vision (this doc) -> it specifies the schema -> build schema + additive tables + mock-data profile page (DONE: tables built/verified, mock page built/committed) -> live-auth cutover (deferred, deliberate, post-go-live).

## How this shapes the identity rework
The rework must support: multi-game account linking (via linked_identity), a cross-game career rollup, per-game build/progression/stats storage, an AI-grade history (coaching relationship), and tiered/gated features (free snapshot vs premium depth) on billing-ready identity. Built right for the destination.

## Still open (not blocking the vision)
- Exact shareable-card visual design beyond the mock (the eventual hero tiers).
- The specific grade model (letter vs numeric vs both) — left flexible (text column) for now.
- Free build-cap number; exact premium tier contents + price.
- Real game-API integration (per-game, if/when a publisher exposes a usable API) — design accommodates it; build deferred.
- Community/status features (verified contributor, leaderboards) — parked until 200+ registered users.
