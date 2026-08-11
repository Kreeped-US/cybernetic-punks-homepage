# Content Pipeline Architecture - the demand-informed assignment gate

**Status:** Fable ruling (2026-08-10), recorded after a two-session code-verified mapping of the
actual pipeline. This document supersedes the pipeline-upgrade direction from the 2026-08-07 session
(see "Supersession" below).

**Amended 2026-08-11** with the pre-launch demand lifecycle ruling (demand ranks the verification
queue pre-launch, shapes framing post-launch, never manufactures content) - see "AMENDMENT" at the
end. That ruling corrected an in-flight direction (a dmz_keyword_research content-planning table/view)
before it was built.

**Reading note:** the CURRENT STATE section is verified against code (main @ f11d9ff). The
ARCHITECTURE section is the ruling - designed, not yet built. Build order is at the end.

## The one-line principle
Verified substance is the WARRANT to write; demand (keywords/GSC) is the PRIORITIZER (which warranted
topic first) and the SHAPER (winnable angle/framing); demand is neither a generator of topics nor a
veto on substance. Everything below implements that sentence literally.

## Verified current state (mapped from code, main @ f11d9ff)

BUILT and active (the record's "designed-not-built" was stale):
- Structured generation + provenance capture: editors produce forced-structured output (per-editor
  tool schemas with a cited_blocks field; tool_choice forces the tool). External fact-sources are
  id-tagged: [BN1-6] (Bungie patch notes), [YT1-5] (YouTube). cited_blocks are validated against a
  registry (buildBlockRegistry / resolveCitedBlocks), unknown ids REJECTED, the primary source
  resolves to verified_source + verified_source_url persisted on the feed_item; no valid citation
  -> verified_source = NULL logged as an honest-unknown flag. The model cannot author a URL or name
  an absent source.
- The pre-publish gate is fully built (2a/2b/3a/4). Runs LOG-ONLY on Marathon (full classifier +
  two-stage detector + decideGate, logs findings + gap metric, publishes regardless). DMZ mode is
  fail-closed but INERT (cron is Marathon-only). Phase 4 auto-release is live.
- Models: ARTICLE_MODEL = Sonnet, COMMENT_MODEL = Haiku, headline-rewrite = Haiku.
- The forward half-arc is wired: assignment -> input (fetchGameContext = verified store rows +
  tagged [BN]/[YT] blocks) -> editor (forced tool call) -> published (Marathon log-only auto-publish;
  VANTAGE discourse draft -> admin-approve) -> GSC capture (dailyPull -> gsc_query_metrics).

HELD BY DELIBERATE CHOICE (decisions, not gaps):
- The roster is frozen to NEXUS, patch-gated (Marathon: editors ['NEXUS'], editorsRequiringPatch
  ['CIPHER','NEXUS','DEXTER']; non-patch day = zero editors). CIPHER/DEXTER/GHOST/MIRANDA are
  defined-but-inactive; BROKER is display-only-stubbed. The freeze is the manual anti-glut brake
  (learned from the ~139 near-dup evergreen glut; MIRANDA + GHOST dropped).
- DMZ editors do not generate - deliberate: the DMZ store is thin, and to avoid repeating the glut.

ABSENT / firewalled (the gap this architecture closes):
- keyword/demand -> topic selection: ABSENT. keyword_targets never written (unseeded); Mangools
  research external/unwired; keyword framing is "a LENS NOT A GATE - a keyword never decides WHAT
  gets written" (post-gen headline-only, inert).
- GSC -> topic selection: ABSENT BY DESIGN (firewall): "NOTHING here enters a prompt," "never seeds
  generation, never auto-acts." Cannibalization/near-miss/review-list are read-only operator signals.
- No pre-generation input-quality or cannibalization gate (only post-gen body-length + dup-title
  SKIP; topic near-dup guard is MIRANDA-only = inert). The real anti-glut brake is the roster freeze.

Why the firewall exists (operator-confirmed): fear of the Marathon glut - keyword-chasing generation
produced near-dup content that hurt SEO. The firewall bluntly kept demand-signals out so the pipeline
could not content-farm. It worked but is too blunt: it also severs the LEGITIMATE use of demand
(guiding editors to winnable, non-redundant content), and it must never become a reason to NOT write
content that verified substance warrants just because no keyword agrees.

## The architecture (the ruling - designed, not yet built)

The insight: warrant, anti-glut, and prioritization are not three systems to reconcile - they are
three checks in one gate plus a sort order on its output. One gate, one queue, one sort.

1. The warranted-candidate queue + the firewall's precise new boundary.
Topics enter the queue ONLY BY WARRANT: the mechanized substance test (entity+facet resolves to
sufficient verified blocks - a DB join, not a judgment), or an event trigger (verified intel worth
publishing). Demand then does exactly two things: RANKS the queue and ANNOTATES it (priority from
keyword/GSC where it exists, plus framing metadata - target phrasing, winnable angle).
Firewall STAYS UP permanently: demand can never CREATE a queue entry (no keyword manufactures a topic
- the glut's cause); never REMOVE one (a warranted topic with zero keyword data sits at default
priority, written on rotation - no veto; substance is its own warrant); performance-signals never
enter prompts as steering. Firewall COMES DOWN: rank order + framing inside the assignment brief.
This is a deliberate WIDENING of "lens not gate" (from post-gen-headline-only to assignment-time
angle/phrasing). Justification: the narrow lens was correct for an UNGATED pipeline (a keyword in the
prompt was a manufacture vector); now existence is warrant-gated (keyword can't summon a topic) and
hard claims are blocks-plus-gate-bounded (keyword can't summon a fact), so the keyword influences only
which question the piece answers and in whose words. The lens widens because the gates it compensated
for now exist.

2. Seeding the keyword data.
Mangools CSVs seed keyword_targets via the existing admin entry path (server-validated entity tags,
game-scoped): one curated bulk import; ongoing intake via the review-list accept/decline workflow;
NEVER automatic. The join: an accepted keyword tagged to an entity WITH verified substance -> queue-
ranking data; a keyword WITHOUT warrant -> the GAP LEDGER (visible demand awaiting substance; for DMZ
literally the pre-written launch-day queue), which structurally CANNOT trigger generation. Seeded
demand either ranks what's warranted or waits for warrant. No third path.

3. The structural anti-glut gate (the pre-generation assignment gate).
Every assignment (queue-picked, admin directive, or editor self-selected) passes three checks:
(a) the SUBSTANCE FLOOR - enough verified blocks for this entity+facet to ground a non-thin article
    (mechanized count over resolvable rows). This IS the input-quality gate.
(b) the NOVELTY CHECK, promoted network-wide - the tuple/topic-identity guard (currently MIRANDA-only)
    becomes every editor's dedup; failure mode is ROUTING not refusal (an existing page owning the
    tuple converts the assignment to a REINFORCE task on that page).
(c) the CANNIBALIZATION CHECK - query-ownership against canonicals, same routing.
Fail any -> no generation; the assignment CONVERTS (reinforce/verification/gap) or dies. Retroactive
proof: the 139-near-dup glut all fails (b); keyword-manufactured topics all fail (a). Restraint as
STRUCTURE. This licenses UNFREEZING the roster: editors run whenever assignments pass; zero-output
cycles stay normal (self-skip, now enforced at intake); the freeze stops being the brake because the
gate is. The roster freeze retires with honors.

4. Input quality is the same gate. The substance floor IS the "enough verified material for a non-
redundant article" check; novelty ensures a NEW angle; demand ranks the survivors. Three checks in
one gate plus a sort.

5. Same architecture, both games - difference in queue composition + gate mode, not code. Marathon
unfreezes INTO this with a queue mostly REINFORCE dispositions + occasional patch-events (maintenance
mode as queue composition). DMZ comes online through the warrant test as its natural ramp (assignments
issuable exactly as verified rows land - store-population is content-population, mechanized at the
assignment layer), fail-closed gate as the belt. Per-game config supplies mode + thresholds; one
machine.

## Build order
1. The assignment gate + queue - small: three DB checks (substance floor, novelty, cannibalization) +
   a queue table. The core.
2. The seeding import - Mangools CSVs -> keyword_targets via the validated admin path; the gap ledger.
3. Unfreeze Marathon on the new gate - the LIVE REHEARSAL, so DMZ inherits an operating system.
4. DMZ comes online as its store fills (warrant test as the natural ramp; fail-closed gate as belt).

## Supersession
This supersedes the 2026-08-07 "grounding-at-generation is the highest-leverage upgrade" direction,
which ran on a stale premise (grounding designed-not-built). The 2026-08-10 code verification proved
grounding, provenance capture, and the gate ARE built. The real absent piece is the two feedback loops,
closed by the assignment gate. Residual of the old ruling still valid: per-CLAIM / per-store-ROW
citation (store rows are typed but not in the cited_blocks id scheme) is a real bounded FUTURE upgrade
- NOT launch-critical, NOT the priority; the assignment gate is.

## The through-line
The network scales by making verified substance the warrant, demand the prioritizer-and-shaper, and
the anti-glut discipline STRUCTURAL - one pre-generation gate that lets editors run without the manual
roster freeze. Demand is finally connected to generation, through a gate, on purpose.

---

## AMENDMENT - Fable ruling: pre-launch demand and the verification queue (2026-08-11)

Recorded after a code-and-data-verified ground-truth pull on the DMZ pre-launch state (empty dmz_*
store, 66-keyword Mangools research across six heterogeneous CSVs, launch Oct 23 2026). This ruling
EXTENDS the one-line principle above into a full lifecycle, and CORRECTS an in-flight direction (a
dmz_keyword_research content-planning table + view) before it was built.

### The correction

Demand research is a STRATEGY INPUT, not content data. It must NOT be modeled as first-class content-
adjacent data that a content-planning process consumes - that risks demand MANUFACTURING the content
plan (the thin-content failure the moat exists to defeat), just relocated to the planning layer.

The firewall (generation context) is NOT the relevant pre-launch constraint; "demand prioritizes and
shapes, neither manufactures nor vetoes" IS. Pre-launch, the manufactures-risk is at PLANNING, not
generation - the store is empty, so there is nothing to generate from and the generation firewall is
moot; the live risk is a demand-built launch plan standing in for verified substance.

### THE LIFECYCLE PRINCIPLE (governs every game launch)

- PRE-LAUNCH: demand prioritizes VERIFICATION EFFORT. It ranks WHICH entities to go make verified-real
  first - the highest-demand POIs / weapons / missions get structured into the game's tables first,
  because that is where the launch audience will be. Demand ranks the verification QUEUE, not the
  content plan.
- POST-LAUNCH: verified substance AUTHORIZES content; demand SHAPES its framing / emphasis. This is the
  established Marathon pattern - warrant, then rank, then frame.
- NEVER: demand manufactures content, at any stage. Pre-launch it ranks what to VERIFY; post-launch it
  shapes what to EMPHASIZE; it never authorizes a page that lacks verified substance.

### Consequence for DMZ

The demand research's job is to rank the pre-launch VERIFICATION queue - which dmz_* entities to
structure into verified rows first - NOT to produce a "launch content plan." The consumer to build is a
verification-PRIORITIZATION view (what to verify first), not a content-planning view. This supersedes
the prepared dmz_keyword_research content-planning table/view direction; the import artifacts under
docs/research/dmz-demand-2026-07/ remain as raw research evidence, not as a committed content-data
store, unless/until re-scoped as verification-queue ranking.

### Why this is consistent with the architecture above

Section 2 already routes a keyword WITHOUT warrant to the GAP LEDGER ("visible demand awaiting
substance ... structurally CANNOT trigger generation"; "for DMZ literally the pre-written launch-day
queue"). This ruling names what that ledger IS pre-launch: a VERIFICATION queue. The gap ledger is not
passive - pre-launch it is READ to decide verification ORDER (highest demand verified first). Demand
still never crosses into authorship; it only orders the work of making substance real. Warrant remains
the sole authorizer of a page, at every stage.
