# Marathon Verification Debt — Scoping (future session, read-only until Phase 1)

## Status
SCOPING note for a DEDICATED FUTURE SESSION. **Not a task to start now. Nothing
here is read-write yet.** Surfaced by the 1.1.0.2 baseline scan (2026-06-17),
which found the real data-quality exposure is the standing verification debt, not
that patch's contents.

## Why this exists
Current Marathon verification debt (baseline, 2026-06-17):
- `weapon_stats`: **16 of 32** rows `verified=false` (half)
- `mod_stats`: **104 of 202** rows `verified=false` (just over half)

Roughly half the stat data underpinning builds, tier reads, and generated articles
is unconfirmed. For a hub whose masthead is "We don't agree, and we don't guess,"
that is the genuine credibility risk — far more than whether we model Cradle recycle
XP. (Flag columns confirmed present: `verified` boolean + `patch_verified`.)

## The trap to avoid
Do NOT flip `verified=false -> true` to make the number look better. A verified flag
with nothing real behind it is WORSE than honest unverified data — it manufactures
false confidence in exactly the place users trust us. Do not flip a single flag until
there is a DEFINED source of truth for the value behind it.

## The blocking question (answer BEFORE any write)
Two flag columns exist — `verified` and `patch_verified` — and we do not yet know
precisely what each asserts. This shapes the whole approach:
- What does `verified=true` mean? Human-confirmed in-game? Official source? Cross-
  checked against a datamine?
- What does `patch_verified` mean, and how does it relate? If it means "confirmed
  current as of a specific patch," it is the mechanism for keeping debt from silently
  regrowing every patch — the recurring half of this problem.
Until these are defined, there is no honest rule for setting either flag.

## Sourcing — where does ground truth come from? (a decision, not a default)
A designated, repeatable source per stat is needed to backfill:
- Official Bungie data where it exists.
- In-game confirmation — slow but authoritative; good for high-traffic weapons/mods.
- Datamines — fast/broad; reliability varies; decide if acceptable and how to cite.
- Community contributors — LordTT and neodeye are already credited on the Maps
  system (confirmed contributors); a structured "help us verify" effort could pay
  down debt AND deepen community engagement (the actual growth lever).

## Phased plan (read-only until Phase 1 decisions are made)
- **Phase 0 — read-only audit (no writes).** Break the 16 weapon / 104 mod
  unverified rows down by category; look for patterns (all Season 2 content? all one
  mod slot type?). Dump the `patch_verified` distribution across rows. Report what
  `verified` vs `patch_verified` appear to track in practice.
- **Phase 1 — definitions + sourcing policy (decision, not code).** Lock what each
  flag asserts and the designated source of truth.
- **Phase 2+ — backfill in gated batches** against the chosen source, baseline-
  before-write discipline, plus a repeatable per-patch cadence so debt stops
  regrowing. Scope each batch; do NOT attempt all ~120 rows in one pass.

## Scope discipline
- Its OWN session, on a FRESH branch from main. Do not bundle with patch work, the
  Nexus addendum, or any feature build.
- Read-only until the definitions/sourcing question is answered.
- Do NOT create new tables or columns — this is paying down EXISTING data, not
  modeling new data.

## Footnote — separate thread (do not fold in here)
1.1.0.2 also confirmed the content pipeline can confidently publish off truncated/
incomplete patch notes (it produced the "C.A.R.R.I. / no changes" article). That is a
DISTINCT problem — source-ingest quality for the editors, not the stat tables. Worth
its own look later; flagged so it does not get conflated with verification debt.
