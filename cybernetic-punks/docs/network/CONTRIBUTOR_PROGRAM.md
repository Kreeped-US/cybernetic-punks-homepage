# Contributor Program — Offer + Trust Model

> The detailed **Stage 1** of [CREATOR_STRATEGY.md](CREATOR_STRATEGY.md) (the
> "Trusted Contributor Package"). This doc captures the offer and the trust model
> worked out in session. **DOCS ONLY** — reasoning + DECIDED vs OPEN; the
> mechanics build is a later, gated task.
>
> Related: the verification 3-state model ([lib/verification.js](../../lib/verification.js)),
> the internal measurement layer ([quality_metrics] precompute,
> [lib/qualityMetrics.js](../../lib/qualityMetrics.js)), and the moat thesis in
> [AI_QUALITY_ROADMAP.md](AI_QUALITY_ROADMAP.md).

## Why this program exists (the frame)

The contributor program **operationalizes the verification CONFIRMED mechanism**
— it is the **supply chain for the moat's core input**, not a growth nicety.

No authoritative Marathon stats source exists: Bungie publishes *changes*, not
*values*. So the only honest way `verified=true` (CONFIRMED) increases is **a
trusted human confirming a value in-game**. Contributors are how that happens —
therefore how the moat deepens.

**The measured backlog** (from the `quality_metrics` layer; overall **52.1%**
confirmed today) — where confirmation most moves `confirmed_data_share`:

| Table | Confirmed | Priority |
|---|---|---|
| cradle_nodes | 0 / 84 | high (whole table unconfirmed) |
| shell_stat_values | 0 / 91 | high |
| ammo_stats | 0 / 5 | quick win |
| shell_stats | 1 / 8 | high (marquee entity, 12.5%) |
| mod_stats | 98 / 202, but **17.3%** source-traceable | attribution gap |

This is **Stage 1 of the staged creator strategy** and does triple duty: the
verification CONFIRMED-mechanism, a moat-deepener, and a seed growth lever
(credited contributors naturally talk about what they're credited on).

---

## THE OFFER (the exchange) — DECIDED

### What contributors GIVE
- **In-game confirmation of SPECIFIC stat values** from the backlog above —
  concrete, checkable facts ("tested Sentinel shell, [stat] is X at level Y"),
  **NOT** opinions or meta takes (the editors cover those).
- **Evidence where possible** — screenshot / clip / reproducible method. Raises
  confirmability (see trust model); bare assertions are accepted but weigh less.

### What contributors GET (recognition-as-reward; sustainable pre-revenue)
- **Public attribution** — named credit on the data/pages they verify. This is
  the proven **LordTT / neodeye maps** precedent, formalized.
- **Status marker** — a verified-contributor badge/role. Cheap to give,
  genuinely motivating for community-status-driven players.
- **Influence / direct line** — early input on features; a real sense of shaping
  the platform.
- **Free premium** — promised now, delivered at monetization rollout. Costs
  nothing pre-rollout, so it belongs in the package today.

**Framing:** recognition + belonging in something they already care about, **not
a paycheck**. The right fit for a niche-game intel community and cash-free
pre-revenue. (Per [CREATOR_STRATEGY.md](CREATOR_STRATEGY.md), this is
relationship-first; the premium grant's light productization waits on
monetization enforcement existing — which now does, inert, but the *relationship*
and manual confirm-flow can start immediately.)

---

## THE TRUST MODEL (the honesty-protecting core = MOAT DEFENSE) — DECIDED

**Principle:** the model exists to **protect the CONFIRMED tier specifically.**
The brand is "verified, honest." A confidently-wrong contributor injects false
data into a pipeline whose entire value is trust. So the governing rule:

> **More contribution must NEVER dilute the meaning of `verified=true`.**

It is **graduated, not binary:**

1. **Submission ≠ confirmation.** A contributor submission lands as a *PROPOSED*
   confirmation; it does **not** directly flip `verified=true`. A human (you, or
   a highly-trusted contributor for their domain) approves before CONFIRMED. **The
   sacred flag stays human-in-the-loop.**
2. **Evidence raises trust.** Evidence-backed submissions (clip / screenshot /
   repro) weigh higher — they're checkable. Bare assertions weigh lower.
3. **Track record earns standing.** Confirmations that hold up over time (not
   later contradicted) raise a contributor's trust; eventually maybe direct
   confirm-rights *for their domain*. New contributors start lower. (LordTT /
   neodeye earned standing by being known + checkable.)
4. **Disagreement keeps it unconfirmed.** Two contributors disagree on a stat →
   that's a signal of genuine uncertainty → it stays **UNCHECKED** (or
   SOURCE_AGREED at most), **NOT CONFIRMED**. The 3-state model doing its job:
   disagreement is information, not noise to resolve by fiat.
5. **Attribution = credit AND accountability.** A later-falsified confirmation is
   traceable to who confirmed it and **costs them standing** (reversible). Credit
   cuts both ways — the same attribution that rewards also holds accountable.

### Scale discipline (DECIDED)
**Start small + high-trust** — 2–5 known, vetted players (the LordTT/neodeye tier
+ a few engaged r/Marathon / Discord regulars), **NOT an open submission form.**
Open + low-authority invites noise and trust-gaming, which is precisely the
failure the trust model exists to prevent.

Scale the model's **formality** only as contributor count grows — **don't build a
5-level reputation system for 3 people.** The five rules above are the *design*;
their *implementation* should stay as manual/lightweight as the contributor count
allows for as long as possible.

### How it maps to the 3-state model
| Situation | Resulting state |
|---|---|
| Human-approved, evidence-backed, holds up | **CONFIRMED** (`verified=true` + `verified_source`) |
| Submitted but not yet approved / bare assertion | **SOURCE_AGREED** at most (attributed, not asserted) |
| Contributors disagree / later contradicted | **UNCHECKED** (disagreement = uncertainty) |

Attribution flows into `verified_source` — which the measurement layer already
tracks (the mod_stats 17.3% source-attribution gap is exactly this: confirmations
that aren't yet traceable to a source).

---

## OPEN (next sessions)

- **Mechanics** — the submission → approval → `verified=true` flow. Has a LIGHT
  code component eventually: a submission/approval path, where it writes, and how
  it sets `verified` + `verified_source` (human-in-the-loop per rule 1).
  Relationship first; productize light. *(Likely a small admin-approval surface,
  not an open form — consistent with scale discipline.)*
- **Recruitment** — WHO specifically: start with the existing credited
  contributors (LordTT, neodeye) + engaged r/Marathon / Discord regulars; how to
  approach them; and **what to ask them to verify first** — point them at the 0%
  tables (cradle_nodes, shell_stat_values, ammo) and shells, where confirmation
  most moves the measured number.
- **Productization timing** — per [CREATOR_STRATEGY.md](CREATOR_STRATEGY.md), the
  premium-grant productization waits on monetization enforcement (now built, but
  inert until rollout). The **relationship + manual confirm-flow can start now**;
  the badge/role and premium can be granted properly once rollout exists.

## Status
- This is **strategy + design to act on**, not code. The DECIDED sections are the
  offer and the trust model; the OPEN sections are the next concrete moves.
- It interlocks the existing threads: **verification** (the 3-state it protects),
  **measurement** (`quality_metrics`, which scores progress), **monetization**
  (the premium grant it promises), and **creator strategy** (its parent stage).
- Lowest-friction first move (no code): recruit 2–3 known contributors and run
  the confirm-flow **manually** against the 0% tables — proving the relationship
  and the trust model before building any submission mechanics.
