# Monetization + Identity Strategy (Fable-ruled)

STATUS: FOUNDATIONAL PRODUCT STRATEGY -- Fable ruling, 2026-08-07. This is the durable record of
the free/premium split and the identity architecture it implies. Read before any monetization,
paywall, tier, or identity-schema decision -- it exists so these positions are not re-derived
(sometimes wrongly) under revenue pressure. Doc-only; the launch-critical build items are tracked
in the HANDOFF PENDING/BACKLOG.

---

## The core principle: free/premium splits on ADDRESSABILITY, not depth

- Content addressed to EVERYONE (public, indexable) = FREE, forever, all of it. No indexed page
  ever moves behind the wall.
- Content addressed to YOU (computed over your saved state) = PREMIUM.
- "Free is the library; premium is the desk working for you."

WHY addressability, not depth: "gate the depth that doesn't compete for SEO" is a judgment line
that DRIFTS under revenue pressure -- advanced content is exactly what starts ranking, so the line
needs a per-piece decision every time, and it reads to users as "the good stuff is gated" (which
corrodes the generous-free brand). Addressability is STRUCTURAL: public-addressed content CANNOT be
premium (it is already served to everyone), and user-addressed content CANNOT be free-scaled (it
costs per user). No judgment calls, no drift, no gated-library perception. It maximizes both sides:
the free library is the funnel and the quality proof; the personal layer is costlier, deeper, and
un-replicable.

REJECTED: gating content depth (the "better guides = premium" model). It cannibalizes the SEO
acquisition engine (every gated guide stops ranking), it is the WEAKEST premium in the 2026 market
(it competes with the free internet one click away), and it inverts the brand (the guides ARE "the
possibilities" the free tier is supposed to show). NEVER gate depth. Public depth is the quality
proof that makes people want the premium personal layer in the first place.

---

## The premium tier: the personalized "desk"

Premium = the editors working for YOU: patch-impact briefs on your saved builds, loadout reviews
against your profile, "what this meta shift means for your setups." This form of value is:
- UN-INDEXABLE (it is per-user, so gating it costs ZERO SEO -- there is no ranking page to lose),
- UN-REPLICABLE (it needs the verified store x your saved state x the trusted editorial voice --
  general-purpose AI cannot reproduce it without all three),
- and it passes the cost filter on BOTH prongs (a real per-user LLM cost to serve, and genuine
  added depth the free tier structurally cannot offer).

---

## Candidate placements

Against Justin's cost filter -- FREE = owned data, cheap to serve to everyone; PREMIUM = carries a
per-user cost OR genuine added depth:

- CONTENT DEPTH: FREE at the public layer. The PREMIUM form of content is the personalized
  synthesis over it, never the depth itself.
- SAVED BUILDS: basic saving is FREE (with a generous cap). They are the SUBSTRATE the premium desk
  synthesizes over -- gating the save starves the premium product's own input. Premium adds volume /
  tracking / the personalized briefs on top, not the ability to save.
- COD LIVE-STATS (K/D, W/L, etc.): PREMIUM (a real scraper cost), opt-in, loudly labeled
  third-party, and isolated from the verified core. CAUTION: this is a labeled ADD-ON / beta, NEVER
  the tier's headline -- fragile third-party breakage becomes a refund conversation for a paid
  feature, so the tier's spine must be things owned end-to-end. Sequenced LAST of the premium
  features, demand-validated before taking on the cost.
- AI BUILD GRADES: PREMIUM (a per-grade LLM cost + genuine depth), sitting beside the
  unlimited-refinement premium axis the build pages were already designed around.

---

## Tier structure

- ONE premium tier to start. Resist multi-tier at zero paying users.
- Priced and pruned by launch-quarter usage data, NOT today's guesses.
- Tiers are NETWORK-LEVEL: the tier flag lives on `network_account` (the game-agnostic spine).
  Per-game surfaces are optional underneath it.

---

## Identity architecture (thin, deliberately)

- `network_account` = the game-agnostic identity spine. The tier flag is network-level, on it.
  Per-game surfaces are optional beneath.
- `game_profile` STAYS SCHEMA-ONLY -- this is CORRECT, not debt. A DMZ save needs only
  `(account, game_slug)` on the build row, not a `game_profile` row. `game_profile` activates when a
  feature (premium personalization) genuinely needs per-game data; because the spine already exists,
  that activation is purely ADDITIVE, never a migration.

---

## LAUNCH-CRITICAL vs FAST-FOLLOW (the practical payoff)

LAUNCH-CRITICAL (before Oct 23) -- TWO remaining (de-Marathoning DONE 2026-08-07):
- DE-MARATHONING the dead-end -- DONE (2026-08-07). A bug for 100% of the DMZ growth audience:
  DMZ-only (Discord) users were walled out of their own profile. Fixed: Path A (a6a4f69 --
  game-agnostic /join + the AccountMenu Profile link gate); the /me hand-off (099eb09, Option B --
  a DMZ/Discord session routes to /u/[handle] instead of the dead-end bounce). The Coach gates
  (ask-editor/audit/advisor/intake/welcome/api-profile/shells/playsMarathon badge) are confirmed
  CORRECTLY Marathon-specific and left as-is. The deeper game-agnostic /me HUB (account base +
  per-game sections) is NOT launch-critical -- it is a WINTER FAST-FOLLOW (see below), activating
  when saves + the premium desk give it content to show; Option B was the launch-critical fix.
- EMAIL / LAUNCH-NOTIFY CAPTURE. The launch surge is a ONE-TIME acquisition event; an un-captured
  visitor is permanently gone. This is the ONLY premium-path piece with a hard deadline. A form +
  a table.
- THIN DMZ SAVES (launch-critical BECAUSE cheap). Saved builds are the premium substrate; every
  launch user who cannot save is substrate that never accumulates. Just `(account, game_slug)` on
  the build row -- no game_profile, no premium logic yet.
- (The free library at full strength + registration [Path A, done] are already in place.)

FAST-FOLLOW (winter, post-traction): the premium tier itself (the desk), billing, tiers,
`game_profile` wiring, AI grades, COD-stats (LAST, demand-validated), and the game-agnostic /me HUB
(account base + per-game sections -- reclassified here from launch-critical once Option B shipped the
dead-end fix; it needs saves + the desk to have content to show). The business model ships in winter,
on top of an audience the launch kept.

---

## THE THROUGH-LINE

Free stays the generous, ranking, audience-building library -- untouched, unshrunk. Premium is the
personal layer: costly-per-user by nature, un-replicable by construction, and wanting it is the
predictable consequence of the free tier being excellent. Not a single indexed page ever moves
behind the wall.
