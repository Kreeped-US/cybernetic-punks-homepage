# Profile & Premium Experience — Vision (north star)

## Status
VISION / north star — NOT a build spec. Purpose: define the destination
so the (deferred) network-identity rework is built to support the right
thing. Sits on top of the deferred identity work. The vision is what's
safe and valuable to complete NOW; the risky build (live-auth cutover) is
deferred.

## The one-sentence vision
Your profile is your **cross-game extraction-shooter career**, fronted by
a **shareable card whose hero is your AI Coach grade** — the free tier is
expansive and brag-worthy, premium adds ongoing depth/power. Free is
impressive; premium is powerful. Never gate the share-worthiness — it's
the growth engine.

## Locked decisions

### Defining framing — the cross-game CAREER (locked)
- The profile leads with the cross-game "extraction-shooter career": ONE
  identity showing the player across Marathon + DMZ + future games.
- This is the network-brand payoff — no single-game site can offer it, and
  it gets MORE valuable the more games join (network effect on the user's
  own data). It's the structural reason to have an account here vs. a
  single-game site.

### The shareable card — HERO = AI Coach grade (locked)
- The shareable artifact's ONE dominant element is the AI Coach GRADE — a
  number only Cybernetic Punks can give you, so every share inherently
  brands the network ("where'd you get that grade?" -> the site).
  Builds/rank/career are supporting texture under the hero grade.
- Design requirement: the card must look incredible AS AN IMAGE (social
  shares are screenshots / OG cards), be instantly readable out of
  context, and carry Cybernetic Punks branding so each share recruits the
  next player. The share IS the ad — cheapest, highest-leverage growth
  for an underdog.
- Principle: one hero brag, not four co-equal ones (a 1-second glance
  needs a single thing the eye lands on). Resist the cluttered-dashboard
  share card.

### Free vs. premium line (locked)
- FREE = impressive + shareable: your builds, tier-relative loadouts, your
  CURRENT AI grade (snapshot), cross-game presence, the branded shareable
  card. Genuinely brag-worthy so players share it. NEVER gate the
  share-worthiness — that's the distribution engine.
- PREMIUM (gated) = depth/ongoing power: the AI coach that REMEMBERS and
  TRACKS improvement over time (grade history, trend, coaching
  relationship), unlimited saved builds (vs a free cap), advanced planner
  tools, personalized intelligence feed, ad-free, premium profile flair/
  theme.
- Elegant seam: the SAME hero element splits cleanly — current grade =
  free snapshot; grade-over-time + coaching = premium relationship. Monetize
  the relationship, not the snapshot.

### Premium FEEL (locked, per brand positioning)
- Premium comes from polish, restraint, a striking shareable artifact, and
  GENUINE utility — NOT from gating everything or piling on features. A
  sharp ops-center identity card, not a cluttered profile page. (Same
  anti-gimmick / depth-over-decoration discipline as the brand.)

## What the profile catalogues (drives the schema)
- PER-GAME: saved builds/loadouts, progression state (Marathon Cradle /
  DMZ FOB-traits), AI grades over time, tier-list-relative gear.
- NETWORK-LEVEL: the account identity, the cross-game "career" rollup, the
  shareable card.
- This inventory is what the identity schema must hold.

## The safe line for "moving sooner" (locked)
The identity rework splits into a SAFE part (move sooner) and a DANGEROUS
part (stays deferred):
- SAFE / move sooner (additive + inert, can't break the live site):
  1. DESIGN the network-identity schema (generic account linking multiple
     games; builds attach to it; profile/career structure).
  2. ADD new tables ADDITIVELY (network `accounts`, per-game player-data,
     builds) that exist ALONGSIDE current Bungie auth without replacing it
     — inert until used, same discipline as the inert game_slug column.
  3. BUILD the shareable profile page/card front-end against MOCK/SAMPLE
     data — the premium experience is mostly front-end + design and has
     ZERO dependency on the auth rework. Can be gorgeous + SEO-ready now.
- DANGEROUS / still deferred (the load-bearing cutover):
  - Swapping LIVE auth: ripping out bungie_* and migrating existing users
    to the generic account. Lock-out / data-corruption risk. Deferred
    until deliberate AND after the DMZ go-live. This is the ONLY part that
    waits.
- Principle: additive + inert before load-bearing. Everything up to the
  auth CUTOVER is fair game sooner; the cutover is the last, isolated,
  deliberate step.

## Sequencing
Vision (this doc, done) -> it specifies the schema -> build schema +
additive tables + mock-data profile page (sooner, safe) -> live-auth
cutover (deferred, deliberate, post-go-live). Build the foundation knowing
exactly what it holds up.

## How this shapes the identity rework (the payoff of doing vision first)
The rework now knows it must support: multi-game account linking, a
cross-game career rollup, per-game build/progression storage, an AI-grade
history (coaching relationship), and tiered/gated features (free snapshot
vs premium depth) on billing-ready identity. Built right for the
destination, instead of built then retrofitted.

## Still open (not blocking the vision)
- Exact shareable-card visual design (the hero-grade card) — a creative
  pass, like the DMZ theme direction; design against mock data.
- The specific grade model (what the AI Coach grade measures / its scale).
- Free build-cap number; exact premium tier contents + price.
- Community/status features (verified contributor, leaderboards) — parked
  until 200+ registered users per existing roadmap.
