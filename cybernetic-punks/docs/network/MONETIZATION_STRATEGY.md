# Monetization + AI-moat strategy

**Status:** strategy/decision doc (2026-06-18). Captures the decisions AND the
reasoning. DECIDED vs OPEN marked throughout. Grounded in the read-only
monetization-readiness audit (same date). Related design context:
[profile-premium-vision.md](profile-premium-vision.md),
[network-identity-schema-design.md](network-identity-schema-design.md),
[NETWORK_PRINCIPLES.md](../dmz/NETWORK_PRINCIPLES.md) (monetization-readiness principle).

---

## 1. Context / framing
- The AI features (advisor / audit / ask-editor) are in **CLOSED beta not because
  they're unfinished but because monetization GATING isn't built.** The path from
  beta → product *is* monetization. What's missing is enforcement + payments, not
  the features.
- Cybernetic Punks is a **multi-game NETWORK** (Marathon live; DMZ/MW4 launching
  Oct 23 2026). **Monetization is NETWORK-level, not game-specific:** one
  subscription is to the network and spans both games. This is the spine of the
  whole strategy and why the premium DRAW is cross-game (Section 3).

---

## 2. As-is state (from the readiness audit)
**EXISTS (a real, populated foundation — well past a stub):**
- `subscription_tiers` — 5 priced tiers, populated.
- `feature_gates` — 19 rows: `feature × min_tier × daily_limit`, a real free/paid
  matrix **already designed in data**.
- `player_profiles.subscription_tier` — live per-user tier anchor.
- `user_subscriptions` — Stripe-shaped (`stripe_customer_id`,
  `stripe_subscription_id`, `status`, `period_end`, `grandfathered`) — **empty**.
- `player_profiles.total_audits_run` — usage counter.
- `subscription_tiers.override_all_free = true` on every tier — the data-level
  "free during beta" master switch.
- `lib/monetization.js` — env flag (`NEXT_PUBLIC_MONETIZATION_ENABLED`) hiding
  client-side paid teasers.

**MISSING:**
- **Enforcement** — no route reads `subscription_tier` / `feature_gates`; the
  matrix is designed but **unwired**.
- **Payments** — Stripe is **greenfield in code**; only anticipatory columns
  exist on `user_subscriptions`.

**CLEAN ANCHOR:** `cp_player_id` cookie → `player_profiles.id`, already resolved on
every paid route — gating just needs to read the tier off it.

**TWO-CLUSTER PROBLEM (OPEN):**
- **Cluster A** — `player_profiles` + `subscription_tiers` + `user_subscriptions`
  + `feature_gates`: populated, Marathon-anchored, Stripe-ready.
- **Cluster B** — `network_account` + `subscription`: empty stub from the
  identity rework.
- Tier currently lives in **3 places** (`player_profiles.subscription_tier`,
  `user_subscriptions.tier_id`, network `subscription.tier`); there are **2
  subscription tables**. Reconcile before building enforcement (Section 5).

---

## 3. Strategic decisions (DECIDED this session)

### 3.1 The paid anchor = a BUNDLE (draw + mechanic fused), not convenience-graduation
- **Premium DRAW (retention — "why keep paying"):** the **cross-game unified
  career + AI Coach grade** — the NETWORK-ONLY value that no single-game tool or
  free general model can replicate. This is what makes the subscription *sticky*.
- **Conversion MECHANIC ("why start paying"):** **unlimited AI generation** — the
  free tier is a limited taste; you hit the cap, you upgrade.
- **They FUSE into the core paid tier.** *Reasoning:* if the draw (retention hook)
  and the mechanic (conversion trigger) are split across different tiers, a user
  converted by hitting the generation cap lands on a tier that doesn't include the
  reason to *stay* — they churn. Keep both in the core paid tier so the conversion
  path leads straight to the retention value.

### 3.2 Generous free tier = the acquisition engine
- All **static intel** (articles, /meta, /maps, /intel, etc.) stays **free** — it
  is the SEO/traffic surface that brings users in. Plus a **generous taste of the
  AI** (free-tier daily caps).
- *Reasoning:* **pre-traction, users + trust are scarcer than money.** The paid
  tiers exist to be **READY for traction**, not to wring revenue from a small
  audience now. A stingy free tier optimizes for a number that doesn't matter yet
  (today's tiny paid conversion) at the cost of the thing that does (growth).

### 3.3 Tiers are TUNABLE (data, not contracts)
- `feature_gates` is data (feature × tier × limit rows) → adding or moving a
  benefit is a **row edit, not a deploy**. Design tiers as **loose,
  experiment-and-tune buckets**, not fixed contracts. This lets the model evolve
  with real conversion data without code changes.

### 3.4 Tier count — leaning ~5 (1 free + 4 paid), TUNABLE (not finalized)
- ~5 tiers captures a willingness-to-pay spread. **Tension noted:** fewer tiers
  convert more cleanly pre-traction (less decision paralysis); 5 is more about
  capturing range. Treated as tunable; **NOT finalized** — see Section 5.

### 3.5 Naming must go NETWORK-NEUTRAL (not yet named — OPEN)
- The current names (`scout` / `runner` / `specialist` / `operative` /
  `ghost_protocol`) are **Marathon-flavored** — "Runner" is literally Marathon's
  player term. *Reasoning:* a CoD/DMZ player shouldn't be sold a Marathon costume;
  the subscription is to the NETWORK. Tier names should be **network vocabulary**
  (intel-org / clearance-level framing that reads naturally for any extraction
  shooter). **NOT yet named** — OPEN.

---

## 4. The AI moat (the make-or-break: why pay vs free ChatGPT)
A moat must be something a free general model **cannot** replicate. Ranked by
defensibility:

### 4.1 DURABLE FOUNDATION — verified, current data (build the core promise here)
- The advisor is wired to the **gather pipeline** (current patch notes — the Gap-1
  full-notes ingest) + the **verification system** (3-state hedging: CONFIRMED vs
  SOURCE_AGREED/"reported as" vs UNCHECKED).
- *Why it's a moat:* a free general model's knowledge is **stale** and it
  **hallucinates stats with confidence**; ours is **current** and **honest about
  confidence**. It works for **both games**, is **fully under our control**, and is
  **already built**.
- This is the defensible paid-value foundation. **The verification work done this
  session is literally what makes it credible** — confident-wrong stats would
  destroy the entire premise, so the 3-state hedging (and the Phase-1
  trusted-contributor model behind it) is load-bearing for monetization, not just
  editorial honesty.

### 4.2 BIG UPSIDE BUT FRAGILE — personal CoD/DMZ player stats
- Real per-player match stats (K/D, survival, loadout performance) would let the
  Coach **personalize** ("your survival drops when you push mid"). A general model
  **structurally cannot** (no access to your data) — so this is a strong moat *if*
  it works.
- **The fragility:** CoD has **NO official API.** Data comes from **unofficial,
  reverse-engineered endpoints** (`my.callofduty.com` papi-client) via a
  **manually-maintained SSO token**, **public-profile players only**.
- **Risk history:** Activision **locked the ecosystem down in March 2019** (broke
  all third-party trackers at once); even tracker.gg operates under
  agreement-constraints + ongoing 400/500 errors; reality is **token babysitting +
  403 blocks**. This can break with no notice.
- **Therefore:**
  - **Position as a FAIL-SAFE BONUS, never a core promise.** Frame to users as
    *"uses verified meta data [durable] — AND, when available, your public match
    stats [bonus]."* The **"when available"** sets honest expectations up front.
  - **Architect isolated + graceful-degrade** — same fail-safe discipline as the
    inert-email-alert and the can't-crash-the-cron guards: if the endpoint breaks,
    the Coach **falls back to the verified-data foundation**, no error surfaced,
    the paid experience stays intact.
  - **Treat as a launch-window EXPERIMENT** — at MW4 launch, test whether the
    endpoint even supports the new title; decide its prominence from **real
    observed reliability, not hope.**

### 4.3 Marathon asymmetry
- Marathon has **NO stats API at all** → its personalization rests on the
  **trusted-contributor verification model** (the Phase-1 decision), not a stats
  feed. So the cross-game career is **asymmetric**: richer (real match stats) on
  DMZ *when available*, lighter (verified-meta-based) on Marathon. The product
  framing must not promise symmetric per-game depth.

### 4.4 Synthesis
The **core paid promise rests on the DURABLE verified-data moat** — controlled,
both games, can't break out from under us. **Personal-stats personalization is
upside layered on top, explicitly allowed to fail** without taking the
subscription down. Build the promise on what we control; let the fragile-but-
flashy part be a bonus.

---

## 5. OPEN items (decide later)
- **Cluster reconciliation** (A vs B canonical) — **gates the enforcement build.**
  Cluster A is built/populated/Stripe-ready; Cluster B is the future-identity
  shape. Pick one home for tier/subscription before wiring gates.
- **Final tier count + the specific feature → tier mapping** (Section 3.4).
- **Network-neutral tier NAMES** (Section 3.5).
- **Pricing pressure-test** — current ladder is `$0 / $1.99 / $4.99 / $9.99 /
  $19.99`; validate what a niche game-tools subscription actually commands.
- **Enforcement build** — wire `feature_gates` + tier lookup + daily-limit
  metering to the paid routes. **Payment-INDEPENDENT and buildable now** against
  `override_all_free` (gates can be enforced/tested while everything is still free).
- **Payment integration (Stripe)** — greenfield; the credential/money parts are
  user-action / careful-handling, **gated**, and come **LAST** (does not block the
  enforcement build).

---

## TL;DR
Beta → product = build **monetization gating**, not more features. Network-level
sub: **generous free tier (acquisition) → unlimited AI (conversion) → cross-game
verified-data Coach career (retention)**, fused in the core paid tier. The moat is
**current + honesty-hedged data we control** (works both games, already built);
**personal CoD stats are a fail-safe bonus** (unofficial endpoint, must degrade
gracefully, launch-window experiment). Enforcement is buildable now (data-driven,
payment-independent); Stripe is last. Decided: the bundle shape, the generous-free
philosophy, the moat ranking, network-neutral naming intent. Open: cluster
reconciliation, final tiers/mapping/names, pricing, then enforcement, then payments.
