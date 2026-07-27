# Cybernetic Punks - Content Operating Doctrine (v3)

**The gated, verified, demand-first system for every game vertical.**

Written 2026-07-17 after the Marathon consolidation session; revised same week. This is the operating doctrine, not a one-off plan. DMZ is the first vertical to launch under it, but the method travels to every game.

v3 (2026-07-27): applied amendment set A1-A10 - see commit body for the ledger.

---

## 0. Why this exists

Marathon accumulated ~1,300 articles - most getting zero clicks, many factually wrong, many competing with each other for the same search. The cause was not "too much content." It was **generating first and checking never**: editors produced on a schedule, and nothing verified whether a topic had demand, whether a page already covered it, or whether the facts were true. This doctrine inverts that. Nothing gets written until it earns a slot by passing gates. The goal is not more content - it is only-content-that-earns-traffic, accurate out of the gate.

**The core inversion:**

```
OLD: Generate -> publish -> (maybe, later) notice it's wrong/duplicate/unwanted -> clean up
NEW: Demand -> Canonical -> Accuracy -> Spec -> ONLY THEN generate -> publish -> measure -> fix or kill
```

Generation moves from first step to last. You cannot produce a thin duplicate of a no-demand topic, because it fails a gate before it exists.

---

## 1. The five gates (every piece of content runs this sequence)

### Gate 1 - DEMAND: does anyone actually search for this?

The single most important gate, and the one Marathon completely lacked.

**Pass rule:** a page is only created for a query (or tight query cluster) with demonstrable search demand.

A query earns a canonical when three things are true at once:

- **Volume is real** - measurable demand (Mangools number, or proxy pre-launch). Floor: ~100-200/mo for a niche vertical. Don't demand big numbers; a 150-search high-intent long-tail converts better than a generic 5,000 term.
- **KD is winnable** - hard cap: **skip anything above roughly KD 30-35** until authority grows (see section 4). A high-volume term you can't rank for is worth zero. This is the filter that matters most right now.
- **Intent is high** - the searcher wants exactly what the page is. "How to get [key] DMZ" beats "DMZ."

**Sort the build queue by winnable-and-high-intent first. Volume is a tiebreaker among winnable terms, not the primary sort.** Revisit the KD cap upward as authority climbs.

**The pre-launch exception (stated explicitly so it doesn't look like a violation):** an unreleased game has near-zero measurable volume. For a pre-launch vertical, **proxy demand counts as demand** - the predecessor game's search history (section 3) is the demand evidence, and entity canonicals from official material may be claimed ahead of measurable volume so they age into authority. This is a forecast, and the measurement loop (section 6) later grades every forecast.

### Gate 2 - CANONICAL-FIRST: does a page for this already exist?

The anti-cannibalization gate. Marathon had ten articles answering "how to beat Thief" because nothing ever asked "do we already cover this?"

**Pass rule:** one authoritative canonical page per *entity* (each POI, map, mode, mechanic, item class). Before creating anything: is this a genuinely new entity, or does this answer belong ON an existing canonical?

- New entity with demand -> build its canonical.
- Belongs on an existing canonical -> STRENGTHEN that page. Never write a competing article.

**Mental model: encyclopedia, not blog.** An encyclopedia has one entry per thing; a blog has infinite overlapping posts. Marathon drifted into blog; the doctrine forces encyclopedia.

**The sub-topic test:** "Beat Thief in close range" vs "beat Thief at long range" answer *different queries* - allowed. Two pages answering the *same query* differently are duplicates - fold them in.

**Resolving entity-vs-query (the operational hard case).** One entity can carry many distinct queries ("Hajin map," "Hajin keys," "Hajin bosses," "Hajin loadout"). The rule:

1. **Start with ONE canonical per entity** (the hub - `/dmz/regions/hajin`) with sections for each sub-topic.
2. **Spawn a sub-page ONLY when** a sub-query has its own strong winnable demand AND enough unique content to stand alone (e.g. `/dmz/regions/hajin/keys` with a full keys list). It must answer a *distinct query*, not slice the same one.
3. **The spawn test:** would the sub-query searcher be *better served* by a focused page than by the hub section? If the hub section answers them fine, don't spawn - a thin sub-page competes with its own hub.
4. **Default to consolidation; expand only on evidence.** One comprehensive page outranks five thin ones at low authority.

**Enforcement:** this gate is what the coverage-registry / topic-identity design (July HANDOFF) implements - topic-level dedup, canonical-page-first routing, self-skip. Gate 2 is the policy; the registry is the mechanism. They must ship together for DMZ.

### Gate 3 - ACCURACY: is it true, and how do we know?

Marathon's data was full of wrong mechanics the pipeline propagated into articles.

**Pass rule:** every factual claim traces to a real source, and every page records how verified it is.

- **Provenance tags from day one:** `deep-dive-provisional` (pre-launch, official material only - nothing NOT in the source gets claimed) vs `game-verified` (confirmed in-game, like the Marathon mod_stats and shell matchup passes). This is the piece Marathon lacked; without it, cleanup was archaeology.
- **Verification decays**; live games patch and "verified" rots. Mechanics: the verified + verified_source column pair IS the provenance mechanism on every entity table - never a parallel column recording the same fact (two columns answering "how verified?" is drift with a start date). Provenance values are written explicitly on every insert, never as column DEFAULTs. Promotion is per-row as entities get play-verified, with the patch version carried inside verified_source as game-verified@X.Y, never a bulk flip. A fact is verified as of its patch, not forever.
- **On every patch, triage by what changed.** Weapon-balance patch -> re-verify weapon/loadout pages; map update -> POI pages. The provenance tags identify exactly which pages enter the **re-verification queue**. You never re-verify everything.
- **Stale-but-flagged beats wrong-and-silent.** If you can't re-verify immediately, a visible "last verified: patch X.X" line is honest; silently serving outdated data as current fact is the Marathon disease.
- **Dated != evergreen.** A "patch 1.1.5 breakdown" is a historical snapshot - date it and leave it. Evergreen pages get re-verified on relevant patches.
- **Claims verify against the PRIMARY source** - never against this site's own prior articles. Pre-doctrine corpus content is not a source; confirming a claim against it re-imports the risk the provenance system exists to kill. The chain terminates at official material or in-game observation. Entity names and slugs come verbatim from the source's own naming - a "natural sounding" name the source never uses is invented data wearing a URL.

**The governing rule: a false page is worse than no page.** An honest gap beats confident misinformation, every time.

### Gate 4 - TECHNICAL SPEC: is it built to SEO spec?

From the 2026-07-17 audit: technically Excellent (99/100), but 1,343 pages with over-long titles and 1,154 images missing alt text - pipeline-level gaps. Cheap to enforce at generation, painful to retrofit.

**Hard constraints at creation (a violating page does not publish):**
- Title <= 60 chars, primary keyword front-loaded
- Meta description <= 155 chars
- Alt text on every image
- One H1 per page, matching the target query where natural
- Clean, keyword-bearing slug (short, hyphenated, no dates unless genuinely dated content)
- **Inbound internal links wired at publish** (section 5) - no orphans
- **JSON-LD valid at creation, verified** - not merely present. A page whose structured data fails Google's validator does not publish until fixed.
- **No FAQPage markup, on any page, any game.** Google restricted FAQ rich results to authoritative government/health sites (Aug 2023); the markup earns nothing here even when valid. Visible FAQ content is fine; the schema block is not.
- **Structured data carries only sourced or game-verified claims.** Markup asserting model-generated prose as structured fact violates Gate 3 even when it validates. Schema inherits the provenance bar, not a lower one.
- **The title <= 60 ceiling is THE number**, and every prompt rule and code gate touching headlines must state the same number. A prompt allowing 65 with a gate at 60 rejects obedience; a gate at 65 ships SERP truncation. When the ceiling changes, prompt and gate change in ONE commit.

### Gate 5 - GENERATION: now, and only now, write it

Editors write into pre-approved, demand-validated, non-duplicative, sourced, spec-compliant slots. They no longer freewheel.

### The two-lane rule

Two content lanes, two keyword rules, both correct, never interchangeable:
- Canonical/reference pages are demand-gated (Gates 1-5): keywords legitimately DECIDE what gets built.
- Feed articles are event-triggered (verified intel worth publishing): keywords are a LENS that may reframe a finished headline and never reach the body or the trigger.
A document governing one lane must state which lane it governs. Any text finding these two rules in contradiction has lost track of the lane it is in.

---

## 2. The keyword-demand system (the input Gate 1 needs)

### Layer A - The query-template library (build once, reuse forever)

Extraction shooters share query *shapes*. Build this list once, instantiate per game:

- `how to get [item / key / keycard]`
- `[POI / location] guide`
- `best [class / shell / operator] loadout`
- `[map] extraction routes` / `[map] exfil locations`
- `[boss / threat] location` / `how to beat [boss]`
- `how to [core verb: extract / survive / revive / stash]`
- `[item] value` / `what to sell` / `[economy term]`
- `[game] release date` / `[game] vs [competitor]` (pre-launch, high volume)
- `[game] tips` / `[game] beginner guide`
- `[mechanic] explained`
- `best [weapon] for [game]`
- `[faction / mission] guide`

Each template is a slot; fill the bracket with a game's entities and you have a candidate query. This is the genre-level content skeleton.

### Layer B - Per-game demand data (Mangools, purchased 2026-07-17)

**KWFinder - build the demand map:**
- Seed with game terms -> returns related keywords with monthly volume, KD, and trend.
- **KD matters as much as volume.** Sweet spot: decent volume + LOW KD. A KD-30 term with 800 searches you can rank for beats a KD-70 term with 5,000 you never will. (Why this is non-negotiable: section 4.)
- Use the **Autocomplete and Questions filters** - they surface the Layer A templates populated with real terms and real volume.
- **Export to CSV** - the handoff to Claude Code.

**SERPChecker - the "can I actually win this?" check:**
- Shows who ranks page 1 and how strong they are. If page 1 is all high-authority wikis (Fandom, gg guides), skip the term even at high volume; if page 1 is thin, take it. This is Gate 2's external twin - don't fight unwinnable battles with other sites either.

(SERPWatcher, LinkMiner, SiteProfiler are post-launch monitoring. Ignore for now.)

**The pre-launch power move - predecessor proxy with REAL numbers.** MW4-DMZ has no search history, but the original DMZ (MW2 2022) and Warzone do. Query the old terms in KWFinder ("DMZ best keys," "DMZ extraction," "DMZ Al Mazrah POIs," "DMZ contraband") - real historical volume is the **launch-demand forecast**. Swap entity names to MW4's (Hajin, the new POIs/keys/factions) and the old game's high-volume + low-KD queries ARE the ranked build plan. You're reading what people DID search for the near-identical predecessor, not guessing.

**Free supplements (still useful):** Google autocomplete / People Also Ask (shape and rough popularity order), Reddit + Trends (topics tools miss, meta shifts), and GSC post-launch as the validation layer (section 6).

**The workflow (clean division of labor):**
1. **Mangools (you, any time):** instantiate templates with DMZ entities + old-DMZ proxy terms, filter volume + low KD, spot-check top candidates in SERPChecker, export CSVs.
2. **Claude Code (Monday):** process CSVs against the entity list and existing canonicals -> the ranked demand-vs-canonical table (Layer C), flagging cannibalization and outputting the prioritized build queue.

Mangools gives volume (only it can); Claude Code does the mapping against the DB (only it can).

### Layer C - The demand-ranked canonical plan (the output)

| Query (template + entity) | Demand | Maps to canonical | Status |
|---|---|---|---|
| "DMZ release date" | very high (pre-launch) | /dmz | live |
| "DMZ map / Hajin" | high | /dmz/regions | live |
| "DMZ FOB upgrades" | medium | /dmz/fob | live |
| "how to get [key] DMZ" | high (launch) | /dmz/[key-canonical] | to build |

This table is three things at once: the **content plan** (build top-down by demand), the **anti-cannibalization map** (one canonical per query; two queries wanting one page share it), and the **prioritization queue** (claim the big canonicals before launch so they age into authority).

---

## 3. The Marathon retrofit (mechanical, high-value)

The audit's 1,343 long titles and 1,154 missing alts are pipeline debt on the existing corpus. Unlike the content cuts (judgment-heavy), the title fix is mechanical, safe, and improves CTR on pages you're KEEPING - arguably better near-term ROI than more cutting.

- **Scope first:** the 1,343 count likely includes noindexed/cut pages. Run the fix **only on live, kept pages**, and only AFTER the pending consolidation cuts land (the 13 matchup cuts + cryo/holotag decisions). Pull the real live count - it'll be well under 1,343.
- **The fix:** shorten to <=60 chars preserving the front-loaded primary keyword; scriptable (truncate at word boundary, keep lead keyword) with a review pass on any that lose meaning. It's a `feed_items` field update - guarded, reversible, same discipline as the noindex flips. Batch, verify a sample at SERP-preview width, run.
- **Alt text:** lower priority, same shape - enforce at generation going forward (Gate 4), backfill on kept pages when convenient, semi-automated from article context/filename.

---

## 4. Authority - the ceiling on everything

From the 2026-07-17 backlink audit: **DA 23 / PA 28 / Trust Flow 6; 94 backlinks from 16 referring domains.** New-site numbers, thin profile, some spammy tool-links ("visit proxy's homepage!" anchors, link-farm-shaped referrers) alongside a few legit gaming communities.

**What it means:** low DA makes the KD cap non-negotiable. Established wikis (DA 90+) own the high-KD terms. Your entire winnable surface is low-KD, high-intent long-tail - where content quality and specificity beat domain authority. As DA/TF climb, the KD ceiling rises and bigger terms come into range. Not yet.

**The spammy backlinks - do NOT disavow.** Google algorithmically ignores most junk links (Penguin, ~2012); low Trust Flow means "not enough good links yet," not "penalized." Disavow is a loaded gun most sites should never touch, and this pattern is incidental tool-junk, not an attack. **Only disavow if** GSC shows a manual action or a sudden toxic-link flood. Action: check GSC -> Security & Manual Actions once to confirm clean, then move on. The real fix is drowning 16 domains of mediocrity in earned quality.

**Earning real authority (slow, compounding - no shortcut):**
- **Be the primary source for something.** Game-verified data (matchup matrix, mod stats, verified numbers) is genuinely citable - the moat. Verified data earns links opinion content never will.
- **Community presence, done right.** Reddit (r/marathon, DMZ/CoD subs), Discords, forums - participate genuinely; cite your canonical only when it's genuinely the best answer. Never spam-drop (that's how the junk profile happened).
- **The planned X presence** - real intel-sharing builds direct traffic AND the citations that become links.
- **Original data others can't replicate** - "we tested every shell matchup in-game" is a linkable asset. Data journalism, not opinion blogging.
- **The DMZ launch window (Oct 23)** - the accurate, early, comprehensive source during a launch surge gets cited. Pre-launch canonical-claiming matters beyond SEO: it positions you as what everyone links to when they write about DMZ.

---

## 5. Internal linking - the free authority lever

External links are slow; internal links are 100% controlled and shape how authority flows.

- **Related canonicals always cross-link.** `/matchups/thief` -> `/shells/thief`, its counter, the relevant weapons. Partly built; systematize it.
- **Hub-and-spoke.** Section hubs (`/matchups`, `/dmz/regions`) link down to detail pages; details link up and sideways to siblings. Authority concentrates on hubs (broad terms) and distributes to specifics.
- **Keyword-bearing anchor text internally** - safe and good (unlike manipulative external anchors).
- **No orphans.** New pages get inbound links FROM existing relevant pages at publish (the audit already found 2 orphans). This is a Gate 4 publish requirement, not an afterthought.

---

## 6. Measurement and the kill switch (the loop Marathon lacked)

The gates prevent bad content from being born; this catches pages that pass every gate and still fail. Marathon's deeper disease was **no feedback loop** - nothing measured whether a page worked, nothing killed the ones that didn't.

**Per-page cadence, post-publish:**
- **~30 days - indexation check (GSC).** Not indexed = earliest signal it's thin or duplicative. Investigate at 1 page, not 200. Implemented by the URL Inspection loop (Consumer C): every published page enrolls the day its URL becomes indexable - per URL, at publish, never batched. A page held at noindex for incompleteness (A3) enrolls when it flips.
- **~90 days - performance check.** Impressions + clicks + position, three outcomes:
  - **Impressions AND clicks** -> working. Reinforce if position 5-15 (a title/content push can move it to page 1).
  - **Impressions, no clicks (sub-1% CTR)** -> it ranks but nobody picks it. Fix the title/meta snippet - cheap, high-value. The page is fine; the SERP presentation isn't.
  - **No impressions** -> kill *candidate*, not automatic kill - see the clock rules below.

**The kill clock - two corrections that prevent false kills:**
1. **Pre-launch pages are exempt until launch.** A Hajin canonical built in July *cannot* have impressions before Oct 23 - its clock starts at game launch, not at publish. Killing pre-launch canonicals at 90 days would destroy the exact pages the strategy says to age into authority.
2. **At DA 23, evergreen pages can take 4-6 months to rank.** Use 90 days as the *review* trigger, ~6 months of zero impressions as the *kill* line while authority is low. Tighten the window as DA grows. (The 30-day indexation check stays - Google declining to index is a real signal at any authority.)

**Kill = consolidate or noindex** - fold into a stronger canonical where content is salvageable. Do this at a handful of pages, continuously; never again at 1,300. The Marathon consolidation was the fire; this is the smoke detector.

**Close the loop back to Gate 1.** GSC's realized winners are proven demand - build more like them. The failures recalibrate the demand estimates. Over time Gate 1 picks are trained on your own results, not just Mangools projections.

Once first-party data exists it is SENIOR to third-party estimates:
- **GSC-sourced candidates are thresholded in the site's own impressions**; the Mangools volume floor never applies to them. A query already sending impressions has proven relevance at any measured volume.
- **A page ranking position 11-30 is winnability evidence stronger than any modeled KD score** - the site is empirically competing.
- **Third-party traffic estimates are decision-grade nowhere at this scale** (Ahrefs showed 0 on a page GSC shows earning clicks at position 5.5). Prioritization reads GSC, always.

---

## 7. The AI-content risk (named honestly)

Google increasingly discounts mass-produced AI content, and its helpful-content systems target sites that feel machine-generated at scale. For a site whose articles ARE AI-generated, this may be a bigger long-term risk than cannibalization. It doesn't mean stop - it means position where AI generation is a strength:

- **Tools and structured references beat prose.** An interactive matchup matrix, a mod database, a verified stat table, a loadout builder - "AI assembled a verified data tool" reads completely differently (to Google and users) than "AI wrote 500 words of opinion."
- **Game-verified data is the moat precisely because it's not generatable.** Any AI can write "Recon counters Assassin"; only a player can verify it. Every gate pushing toward verified/specific/structured is also pushing away from the slop risk.
- **Selective human touch on flagships.** The canonicals you most want to rank and earn links may warrant human editing/voice on top of the AI draft - not for volume, for distinctiveness.
- **The freeze was correct, and this is the second reason why** - it cut the mass-AI footprint, not just the cannibalization.

Keep revisiting this; it's not solved. But the doctrine's whole thrust already points the right way.

---

## 8. DMZ - the two-phase plan

Honest constraint: DMZ has near-zero search volume until Oct 23. "Perfect it out the gate" means perfecting the SYSTEM now, not the volume.

### Phase 1 - Pre-launch (now -> Oct 23): claim canonical ground
- **Build the DMZ keyword map** (section 2, Layers B+C) via the old-DMZ/Warzone proxy. First Monday action.
- **Map every Deep Dive entity** (Hajin + named POIs, FOB stations, 3D Printer categories, factions, mission/threat systems) -> one provisional canonical each, tagged `deep-dive-provisional`. (Sanctioned by Gate 1's pre-launch exception.)
- **Wire the gates into the DMZ editors before they generate anything** - DMZ never repeats the Marathon freewheel.
- **Win the pre-launch queries that exist now:** "DMZ release date," "DMZ map," "DMZ vs Warzone," "what is DMZ MW4" - real canonicals aging into authority before the wave.
- **Provisional and incomplete are different states**; only one noindexes. A page noindexes because it is INCOMPLETE (a stub), and indexes the day it is depth-complete and spec-compliant - while still provisional, with the visible sourcing line doing the honesty work. The index gate must never key to game-verification: verification is only possible at launch, so keying to it would hold every pre-launch canonical out of the index until launch day and nullify Phase 1's aging strategy.

### Phase 2 - Launch (Oct 23+): answer the flood, accurately
- **Game-verify:** flip `deep-dive-provisional` -> `game-verified`, correcting what the Deep Dive got wrong (there will be some; that's what the tag is for).
- **Turn on gated generation** for the demand-mapped launch queries ("how to get [key]," "[POI] loadout," "extraction routes").
- **Start every pre-launch page's kill clock** and let GSC grade the demand bets (section 6): double down on winners, cut decliners at a handful.

---

## 9. Per-vertical portability

**Travels (build once):** the five gates, the query-template library, the provenance-field pattern, the Layer C plan format, the measurement cadence.
**Per-game (rebuild each time):** the entity list, the volume numbers, the specific canonicals, the game-verified pass.

Onboarding a future game is a checklist:
1. Instantiate templates with the new game's entities.
2. Pull demand (predecessor proxy pre-launch; real numbers at launch).
3. Rank into a canonical plan.
4. Build canonicals top-down by demand, provisional-sourced, provenance-tagged.
5. Game-verify at launch; flip provisional -> verified.
6. Turn on gated generation for demand-mapped, canonical-cleared slots only.

---

## 10. The Monday action list (priority order)

1. **Build the DMZ keyword map in Mangools** - templates + Deep Dive entities + old-DMZ proxy terms in KWFinder, filter volume + low KD, spot-check in SERPChecker, export CSVs -> Claude Code produces the ranked canonical table. The keystone; start the Mangools pulls this weekend.
2. **Audit existing DMZ canonicals against the map** - /dmz, /dmz/fob, /dmz/regions exist; the gap list of high-demand queries without canonicals is the pre-launch build queue.
3. **Add the provenance field to DMZ content** (the `verified` + `verified_source` pair; patch carried inside `verified_source` as `game-verified@X.Y`) so accuracy is trackable from the start.
4. **Wire the gate checks as hard editor pre-conditions** - demand exists, no canonical covers it, source cited, technical spec met. Connect to the coverage-registry design so Gate 2 has its enforcement mechanism.
5. **Confirm no manual penalty** - GSC -> Security & Manual Actions, once. If clean (almost certainly), no disavow; move on.
6. **Hard-filter every keyword pick by KD <= ~30-35** when building the canonical plan. Mandatory at DA 23, not a preference.
7. **Start the slow authority work** - pick 2-3 communities (r/marathon, DMZ/CoD subs, relevant Discords) for genuine participation; treat game-verified data pages as the citable link-earning assets.
8. **Set up the measurement cadence** (section 6) - 30-day indexation check, 90-day review, 6-month kill line (clock starts at game launch for pre-launch pages).
9. **Wire internal links as a publish step** (section 5) - hub-and-spoke, keyword anchors, no orphans.
10. **Build the patch re-verification queue** (Gate 3) - patch drops -> provenance tags identify affected pages -> re-verify queue.
11. **Marathon title-fix batch** (section 3) - after the pending consolidation cuts land, shorten live over-length titles; alt-text backfill when convenient.

---

## 11. The principles, distilled

1. **Generate last, not first.** Content earns its existence by passing gates.
2. **No demand, no page** - with proxy demand counting pre-launch, and every forecast graded later by GSC.
3. **Winnable beats big.** At DA 23, low-KD high-intent long-tail is the only game you can win. Sort by winnability; volume is the tiebreaker.
4. **One canonical per entity; expand only on proven demand.** Encyclopedia, not blog.
5. **A false page is worse than no page.** Honest gaps beat confident misinformation.
6. **Verification decays.** Tag facts with their patch; re-verify what each patch touched.
7. **Build to SEO spec at generation** - title <=60, meta <=155, alt text, inbound links - never retrofit 1,343 pages again.
8. **Measure and kill - with a fair clock.** 30/90-day checks; fix snippet-losers; kill only after the page had a real chance to rank (and after launch, for pre-launch pages).
9. **Internal links are free authority.** Wire them at publish; no orphans.
10. **Structured, verified data over AI prose.** The moat is data only a player can verify; AI opinion is what Google filters.
11. **Authority is the ceiling; raise it slowly.** Earn editorial links with citable data and genuine community presence. Never disavow without a manual action.
12. **The method travels; the data doesn't.** Gates and templates build once; entities, volumes, and verification are per-game and ongoing.
13. **Documented is not enforced** - prefer structural enforcement at the layer that cannot be bypassed. Paired-state invariants get a trigger AND a CHECK. Closed value sets get DB CHECKs mirrored to code constants. Attribution columns are NOT NULL with no default. Mapping functions fail loudly on unknown input, never defaulting to an existing value. A rule living only in prose has not shipped.

---

## 12. How this doctrine changes

This doctrine and every governing design document live committed in docs/ and change by EDIT with the reasoning ledgered - never by regeneration from a draft. A session that rebuilds a document from its own prior copy silently drops every correction it didn't transcribe. Corollary: this doctrine is required reading for any session making content-policy decisions.
