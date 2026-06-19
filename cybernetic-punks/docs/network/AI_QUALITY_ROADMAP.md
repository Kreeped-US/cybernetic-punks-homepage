# AI QUALITY / EDITOR-CONTEXT ROADMAP

> Purpose: capture the "make our AI amazing" strategy thread so it can be picked
> up cold and built. Pairs with [MONETIZATION_STRATEGY.md](MONETIZATION_STRATEGY.md)
> (this IS the substance behind that doc's "verified-data moat" / "why pay vs
> free ChatGPT").

## THE CORE REFRAME (the thesis everything rests on)
- **You can't fine-tune Claude.** Anthropic doesn't expose model fine-tuning;
  the AI starts every request from the same base knowledge. Output quality is
  determined ENTIRELY by what's in the prompt at runtime.
- **So "best-educated AI about extraction shooters" = the richest, most
  accurate, most uniquely-sourced CONTEXT we feed the editors** — context no
  free tool (ChatGPT etc.) could assemble. The model is a commodity; the data
  feeding it is the moat. (Same conclusion as the monetization moat analysis —
  they're the same insight.)

## CURRENT CONTEXT (what editors already see)
`fetchGameContext()`: weapon/shell/mod/core/implant stats, faction data, recent
meta tier rankings. Gather pipeline adds: YouTube (titles/metadata), Reddit
(titles/content), Bungie news, Twitch (titles only, by honest design), the game
DB. Already better than ChatGPT (current + verified). The roadmap below adds
LAYERS BENEATH this.

## THE 6 PROPOSED CONTEXT LAYERS (from the strategy chat)
1. **Player behavior / community attention** — synthesize gather data into a
   daily "what's trending/debated/clipped" signal for NEXUS/DEXTER.
2. **Historical performance / continuity** — editors don't remember past tier
   lists, grades, articles. But the DB does (every article, every meta_tier,
   every build grade). Surface it: "Conquest LMG held S-tier 8 cycles —
   longest this season."
3. **Meta evolution patterns** — longitudinal patterns ("shotguns spike week 1
   every season, fade by week 6"). Requires the historical DB; free AI
   structurally can't do this.
4. **Cross-creator consensus** — synthesize what top creators/community agree
   or split on (vs. raw titles).
5. **Mistake patterns / edge cases** — non-obvious build failures, synergies,
   patch interactions (lives in Reddit/Discord/creator deep-dives).
6. **Verified contributor knowledge** — expand the LordTT/neodeye trusted-
   contributor model to nuanced high-level-play observations.

## THE TRUST-AXIS REFRAME (the key strategic adjustment — READ THIS)
The strategy chat framed the goal as "richest context." For a
VERIFICATION-BRANDED product specifically, the right target is **trustworthy
context, not merely abundant context.** Three reasons:
1. **More context isn't free** — every token is paid per editor call, 2×/day,
   soon ×2 games. Already ~13-15k tokens/call.
2. **More context has a QUALITY CEILING** — past a point, long prompts dilute
   the signal and make LLM output WORSE. Target = highest SIGNAL PER TOKEN, not
   maximum information.
3. **Honesty is the whole moat** — the product's pitch is "verified, honest,
   doesn't hallucinate" (the entire reason to pay vs ChatGPT). Sentiment-based
   layers (#1/#4/#5) are UNVERIFIED OPINION. The failure mode: synthesize
   "Reddit thinks Vandal is underrated" → editor writes "Vandal is underrated"
   as FACT → the trusted AI just laundered a rumor as truth. That damages a
   verification-branded product far more than a generic one. One confidently-
   wrong "fact" players catch breaks the one promise that justifies paying.

**Sort the 6 by the SAME axis as the existing 3-state verification model
(CONFIRMED / SOURCE_AGREED / UNCHECKED) — "can the editor state this as fact
without risking trust?":**
- **#2 / #3 (your own historical data)** → CONFIRMED-tier. State confidently.
  Also COMPRESSED signal (a pattern = months of data in ~10 tokens) → high
  signal-per-token. **WINNER — build first.**
- **#6 (trusted contributor)** → CONFIRMED-tier, highest trust, genuinely NEW
  knowledge (not reorganized data). Deepest moat. But it's PROCESS
  (recruiting/managing humans), folds into the open verification-CONFIRMED-
  mechanism work. **Parallel track, not code.**
- **#1 / #4 (community sentiment)** → SOURCE_AGREED-tier at best. Valuable but
  ONLY if (a) synthesized to high-signal (an extra AI pass = cost) AND (b)
  framed as sentiment ("players are debating," NEVER "the answer is"). NOTE the
  fair counter-argument: GHOST already exists to cover community talk, so
  framed-as-sentiment these may fit more cleanly than "risky" implies — as long
  as the honesty guardrail holds. **Later, with guardrails.**
- **#5 (unverified nuance / edge cases)** → UNCHECKED-tier. Highest honesty
  risk (opinion stated as fact = moat poison). Only with hard hedging. **Lowest
  priority.**

**The principle: the goal isn't to know the MOST — it's to know the most you can
STAND BEHIND.** The ideas that fit this project best are the ones whose data is
trustworthy (your own records, trusted humans), not merely abundant. This whole
roadmap should INHERIT the 3-state verification discipline, not run around it.

## SEQUENCED PRIORITY
1. **#2/#3 — historical-context layer. BUILD FIRST.** High-signal, high-trust,
   uniquely yours, low honesty risk, buildable now, no payment/launch gate.
   Directly deepens the paid moat. Scope below.
2. **#6 — trusted-contributor knowledge. Parallel PROCESS** (folds into the
   verification project's open CONFIRMED-mechanism decision; needs LordTT/
   neodeye-style recruitment, not a code sprint).
3. **#1/#4 — community-sentiment synthesis. LATER, with honesty guardrails**
   (sentiment must stay labeled; lean on GHOST's existing community remit).
4. **#5 — edge-case nuance. LAST / maybe** (hard-hedge only).

---

## READY-TO-EXECUTE SCOPE — #2/#3 Historical-Context Layer (the first build)

**Goal:** give editors COMPRESSED historical patterns from our own data, so they
can make longitudinal observations no free AI can ("X has held S-tier N cycles,"
"shotguns fade by week 6"). The magic is COMPRESSION — feed the PATTERN, not the
raw history (high signal-per-token, avoids context bloat).

**Start with a READ-ONLY SCOPING PASS (per project discipline — scope before
build):**
1. **Inventory the historical data we actually have.** What tables hold
   time-series we can mine? Known candidates: `feed_items` (every article,
   timestamped, by editor + game_slug), `meta_tier` snapshots (tier rankings
   over time?), build grades, any patch-keyed history. For each: what's
   captured, how far back, how clean, is it timestamped/patch-keyed?
2. **Identify which PATTERNS are extractable + valuable** from that data, e.g.:
   - tier longevity / streaks ("S-tier N cycles")
   - meta churn (how fast rankings change patch to patch)
   - recurrence (topics/weapons that resurface)
   - seasonal/weekly arcs (if enough history exists)
   - Be HONEST about how much history exists — early data may be too thin for
     "8 cycles" claims yet; the system should degrade gracefully (only state
     patterns the data actually supports — same verify-don't-assume discipline).
3. **Design the COMPRESSION step.** Raw history → a few high-signal lines. Likely
   a periodic analysis pass (cron-adjacent) that computes patterns and stores
   them, so editor calls READ a small precomputed "historical context" blob
   rather than each editor re-querying/re-summarizing all history (cost + token
   discipline). Decide: precompute-and-store vs compute-at-gather.
4. **Design the prompt integration.** How the compressed patterns thread into
   `fetchGameContext` / the per-editor prompts WITHOUT bloating context or
   breaking the byte-identical-Marathon discipline (it's ADDITIVE — a new
   context section, Marathon's existing context unchanged). Which editors get it
   (NEXUS/meta + DEXTER/builds are the obvious consumers; CIPHER too).
5. **Honesty guardrail.** Patterns are derived from OUR data so they're
   high-trust — but they must be STATED ACCURATELY (don't claim a streak the
   data doesn't show; don't over-interpret thin history). Inherit the
   verification mindset: only assert what the data supports.

**Then BUILD staged + gated** (same discipline as Phase A/B): additive, verify
each stage, Marathon output unaffected except for the new (accurate) historical
context, gated commits.

**Cost note:** precompute-and-store is the token-disciplined choice — compute
patterns once per cycle, feed a compact blob to editors, don't make every editor
call re-derive history. Keep the added context SMALL and high-signal.

**Multi-game note:** design game-agnostic (reads per-game history via game_slug /
per-game config) so DMZ inherits it — consistent with the Phase A config pattern.

---

## AI QUALITY MEASUREMENT — instrument first, prove second (brand-safe)

**Goal stated:** "look at the caliber of our AI and have stats to back up why
it's the best." Split into two — and the ORDER is load-bearing:
- **A. INTERNAL measurement (do first):** instrument the AI so we know — and can
  improve — how good it actually is.
- **B. EXTERNAL proof (derive second):** publish ONLY claims that survive an
  audit, derived from A.

**THE NON-NEGOTIABLE PRINCIPLE (for a verification brand):** External proof must
be a BYPRODUCT of honest internal measurement, NEVER a target reverse-engineered.
The failure mode: decide "we want to claim 95% accuracy" then build a metric that
yields 95%. The safe path is the reverse — measure honestly, see what the number
IS, publish only if it's genuinely good AND we'd hand a skeptic the methodology.
**The measurement must be capable of telling us BAD news, or it's marketing
wearing a lab coat.** For a brand whose entire pitch is "we don't make things
up," a superiority stat caught as fluff doesn't just weaken a claim — it BREAKS
the core promise that IS the moat. A generic tool survives puffery; a
verification brand does not.

### A. What's honestly measurable (internal instrumentation)
- **Hedging correctness** — how often editors correctly hedge unverified stats
  vs. state them as fact (the 3-state system makes this trackable).
- **Stat accuracy over time** — when a stat is later confirmed (trusted
  contributor / patch), was what we published right? Track corrections.
- **Data freshness at publish** — how current was the data when an article went
  out (gap between patch/source and publish).
- **Coverage/currency** — N entities tracked, % verified, time-to-update after a
  patch.
- **Verification-tier distribution** — what share of stated stats are CONFIRMED
  vs SOURCE_AGREED vs UNCHECKED (and is it trending up).
- (Note: no token/quality logging exists today — the cost audit found the
  Anthropic Console is the only spend ground-truth. Quality instrumentation is
  net-new; scope what's cheap to capture in `site_events`/DB first.)

### B. What external proof would survive scrutiny (publish ONLY these)
- **Freshness/recency, demonstrably** — "reflects the current patch; last
  updated <timestamp>" vs ChatGPT's stale training data. True, falsifiable in
  our favor.
- **The 3-state verification tags as a VISIBLE feature** — surfacing CONFIRMED /
  reported-as / unverified IS the proof of caliber: transparency ChatGPT and
  competitors don't offer. The honesty itself is the differentiator; showing it
  is the "stat." (Strongest + safest — it's already built.)
- **A documented head-to-head** — e.g. "we asked ChatGPT and our advisor the
  same N current-patch stat questions; here's how many each matched the verified
  values," WITH published methodology. The gold standard for a defensible "we're
  better" claim — IF actually run honestly and the method is shown. Far stronger
  and safer than a vague "97% accurate."
- **AVOID:** any superiority number whose methodology we couldn't show a skeptic.
  "Trust us, we measured" is a contradiction for this brand.

### Sequencing / where it fits
- This is the MEASUREMENT layer of the roadmap — you can't claim caliber without
  measuring it, and you can't improve the moat (#2/#3 etc.) without knowing if
  it's working. So instrumentation (A) is foundational and pairs with the #2/#3
  build (same DB, same verification framework).
- Public proof (B) is a LATER, careful output — gated on A producing genuinely
  good, auditable numbers. Likely surfaces near the monetization launch (it's
  part of the "why pay vs ChatGPT" story).
- Inherits the 3-state verification discipline (measurement of honesty, by an
  honest measurement).

## COST PROFILE + INFRASTRUCTURE NOTES (read before the scoping pass)

### What this roadmap costs to run
- **#2/#3 historical layer — small recurring, design-controlled:**
  - **Cost requirement #1 — PRECOMPUTE, don't recompute per editor.** Compute
    patterns ONCE per cron cycle, store a small blob, editors READ it. Do NOT
    let each of the 5 editors re-derive history every call (that's 5x the work
    2x/day — the main way this gets expensive). The cheap way ≈ one extra
    pass/cycle, or near-zero.
  - **Cost requirement #2 — use plain SQL/code for pattern extraction where
    possible, NOT an LLM call.** "S-tier for 8 cycles" is a QUERY over our own
    data, not a question for a model. Reserve LLM calls for genuine summarization
    only. Counting/streaks/trends = code = ~free.
  - **Per-call input tokens:** the pattern blob is added to each editor's
    context, so it costs input tokens every call — keep it SMALL/high-signal (a
    few lines, not raw history). A few % on top of the existing ~13-15k
    tokens/call. Minor.
  - **Honest estimate:** done right (precompute + code-over-LLM + small blob),
    single-digit $/month at most, possibly near-zero. Done wrong
    (recompute-per-editor or LLM-for-counting), meaningfully more. The DESIGN is
    the cost control — guard both requirements in scoping.
- **Measurement layer — near-zero by design:** internal instrumentation (hedging
  correctness, freshness, correction rate, tier distribution) is mostly LOGGING
  things already computed into the DB (`site_events`/a table) — DB writes, not
  AI calls. The only paid piece is the occasional head-to-head test (a handful
  of API calls, run rarely, one-off — cents). Not a recurring pipeline.
- **Bottom line:** the whole AI-quality push, done with the cost discipline
  above, is a small recurring add (realistically single-digit $/mo) on top of
  the current ~$23-25 Anthropic — and it's spent on the PAID MOAT itself, so
  it's the best-justified spend on the board (product differentiator, not
  overhead).

### Infrastructure: Supabase plan (verify + leverage)
- Justin is on a PAID Supabase plan (not free, as earlier assumed). VERIFY which
  plan + actual usage (Supabase dashboard → Usage/Billing) — partly to know
  what's being paid for vs. used pre-traction.
- **Benefit for THIS roadmap:** paid Supabase = ample headroom for the DB-heavy
  parts (historical accumulation over time + measurement logging that grows).
  Storage/rows/egress are a non-issue for a long time → the measurement layer
  ("log lots of signals over time") has zero storage concern, and the historical
  layer can accumulate freely.
- **Honest framing of the spend:** at pre-traction traffic the paid plan is
  likely justified by RELIABILITY (no free-tier auto-pause on a live production
  DB; daily backups) more than by CAPACITY (which is mostly unused headroom for
  now). That's a reasonable thing to pay for on a live product — just know that's
  WHAT it's buying (always-on + backups), not capacity you're hitting yet.

### Related spend-hygiene (carryover from the cost audit — Justin's actions)
- **Anthropic Console spend-limit** still pending — set a monthly hard cap
  (~$75-100) + alert (~$50). As features stack (this roadmap, then DMZ ~doubling
  cost), the hard cap is what guarantees the SUM never surprises. Set it before
  opening the paid beta.
- **Resend** still pending (env vars in Vercel) — arms the zero-articles outage
  alert.

## HOW THIS INTERTWINES WITH EXISTING WORK
- **Monetization moat** ([MONETIZATION_STRATEGY.md](MONETIZATION_STRATEGY.md)
  §4): this roadmap IS the moat's substance. Historical patterns = the strongest
  "why pay vs ChatGPT" (free AI has no memory; competitors have no history; only
  we have the DB).
- **Verification system** (the 3-state model): the trust axis here REUSES that
  framework. Historical-from-our-data = CONFIRMED-tier; sentiment = lower tiers,
  hedged. Don't bypass it.
- **Multi-game architecture** (Phase A/B config pattern): build the historical
  layer game-agnostic so DMZ inherits it.
- **#6 contributors** ties into the still-open verification CONFIRMED-mechanism
  decision — same people, same trust model.

## OPEN QUESTIONS
- How much usable history actually exists yet (may be thin — scope step 1 answers
  this; the feature scales in value as the DB grows).
- Precompute-and-store vs compute-at-gather (lean: precompute).
- Which editors consume it first (lean: NEXUS + DEXTER).
- Whether to ship a minimal version now (even "weapon X most-discussed N weeks
  running" from feed_items) and enrich as history accumulates.
- (Measurement) What quality signals are cheap to start capturing now (hedging
  correctness, freshness, correction rate) so the data accumulates toward both
  internal improvement and eventual defensible public proof.
