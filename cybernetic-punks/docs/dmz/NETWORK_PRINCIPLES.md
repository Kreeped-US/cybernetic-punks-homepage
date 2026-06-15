# Network — Principles & Roadmap

**Status:** PRINCIPLES + ROADMAP — non-blocking design constraints the July refactor must
honor. Decision-doc only — **no code, no monetization build, no schema changes, no
routes.**
**Date:** 2026-06-15.
**Companions:** [TABLE_INVENTORY.md](TABLE_INVENTORY.md) (table/game-scope decisions),
[URL_AND_THEMING.md](URL_AND_THEMING.md) (URL map, theming, root homepage).

## Network vision (context)
A multi-game **NETWORK hub**: a neutral root links to per-game sections; one AI
"hive-mind" backend serves all games (content + ratings + answering questions); **minimal
human effort** to run and maintain; built for **monetization optionality** from the ground
up; **every game reuses the same infrastructure**.

---

## PRINCIPLE 1 — Monetization-readiness (seams only; build NOTHING yet)
> **"Leave monetization seams, build no monetization."** Any of {subscription,
> feature-gating, ads, affiliate} must be switch-on-able later without a schema/structure
> refactor. **Subscriptions are the lead model**; network identity + billing-readiness is
> the enabling foundation.

The July refactor must NOT foreclose:
- **Subscriptions / premium tiers (priority model):** requires real network-level identity
  + account/billing readiness. This **RAISES the priority** of the `player_profiles`
  identity generalization (already flagged pre-DMZ in TABLE_INVENTORY Decision B) — it is
  now also the monetization foundation. **Build ON** the existing network-level tables the
  audit found — `subscription_tiers`, `feature_gates`, `cred_ledger` — not around them.
- **Feature gating (free vs premium):** content/features gateable by tier without
  re-plumbing; `feature_gates` already exists — keep gating a first-class concept.
- **Ads (programmatic display):** page/content structure can host ad slots later without
  structural change.
- **Affiliate (gear/game links):** content can carry monetization metadata (affiliate
  links, sponsored flags) — schema should allow it even if unused.

Explicitly: **principle + seams, NOT a build.** No monetization is implemented now; the
owner switches a model on later at their discretion.

## PRINCIPLE 2 — Multi-game scaling: DMZ-first, then template
Build the **Marathon -> DMZ refactor FIRST**, then **template the game-onboarding process
AFTER**, from what's learned — do **not** pre-abstract. DURING the DMZ build,
**breadcrumb every place that is hardcoded-to-game vs. parameterized**, so the later
templating step has a map. Goal: low marginal human effort to roll in game #3, #4, #N —
**"cheap repeatable game-onboarding,"** achieved by templating after DMZ, informed by real
experience rather than guessed up front.

## ROADMAP — AI Q&A / advisor surface (flagged, not built)
The hive-mind vision includes **answering player questions and rating builds** — a Q&A /
advisor interface (the existing "Build Advisor" / "Personal Coach" teasers gesture at it).
This is a **distinct product surface** from today's content-writing editors and is **not
built today.** Recorded as a flagged future product line, **likely a premium-tier
candidate** (ties to Principle 1). Not designed today — named so the identity / billing /
gating work anticipates it.

---

## Relationship to the architecture lock
The table / URL / theming architecture lock (the June-17 deliverable) remains **COMPLETE**.
The items here are **principles and roadmap, not new open architectural decisions** — they
are non-blocking constraints the July execution must honor, plus one priority bump
(identity generalization is now monetization-critical, not just DMZ-auth-critical).
