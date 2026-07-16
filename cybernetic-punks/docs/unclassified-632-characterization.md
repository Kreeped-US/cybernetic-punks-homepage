# D1 follow-up - Characterizing the UNCLASSIFIED bucket ("the 632" - actually 636)

**READ-ONLY.** SELECT-only reads; nothing changed. Generated against `main` @ `fc502b2`.

These are the published Marathon articles the D1 matcher had **no opinion** on: no recognizable
subject in the headline. They were never "redundant" or "keepers" - just uncharacterized.

> **COUNT DISCREPANCY (flagged, not resolved).** `docs/topic-cluster-audit.md` reports **632**
> unclassified (922 classified); re-running the same matcher for this report gives **636** (918
> classified) - a **4-article delta I cannot fully account for**, most likely a subtle difference in
> how the two scripts assembled the entity vocab. It does not change any conclusion here, but it is
> a live reminder that **the classifier is heuristic** - do not treat either number as exact.

> **DO NOT read "72 articles in hidden stacks" as 72 new duplicates.** Only **23 are still
> indexed**; the other 49 were already cut by earlier passes. See "What the stack numbers mean".

## Totals

| metric | count |
|---|---|
| published (marathon) | 1554 |
| classified by D1 | 918 |
| **unclassified (this report)** | **636** |
| of those: already noindex=true | 98 |
| of those: still indexed | 538 |

## Category breakdown

| count | category | still indexed |
|---|---|---|
| **219** | other/uncategorized | 168 |
| **191** | news/patch/ops | 185 |
| **100** | event/launch | 76 |
| **80** | cross-topic synthesis | 70 |
| **26** | thin/low-value | 21 |
| **19** | creator-coverage | 17 |
| **1** | discourse | 1 |

### Examples per category

**other/uncategorized** (219)

- `2026-03-07` Shell Tier Guide for Marathon Ranked Mode: Know Your Strengths
- `2026-03-10` Best Starting Shells for Marathon Ranked Mode
- `2026-03-10` Marathon Shell Guide: Best Starting Shells for New Runners
- `2026-03-13` Marathon Weapon Mod Priority Guide: What to Install First
- `2026-03-13` Marathon Combat Flow Guide: Movement Speed Chain Kills for Ranked

**news/patch/ops** (191)

- `2026-03-12` Marathon 1.0.0.4 Update: Ranked Mode Preparation Guide
- `2026-03-19` Marathon 1.0.5 ARG Update: TauCeti's Discord Activity Deep Dive
- `2026-03-19` Bungie Drops Ranked Resource Guide — Community Analysis of Entry Barriers
- `2026-03-20` Weekend-Only Ranked Schedule Sparks Major Backlash as Patch Crashes Persist
- `2026-03-24` Dev Promises Cryo Subroutine Fix as Community Fragments Over Performance

**event/launch** (100)

- `2026-03-07` Marathon Launch Week: Essential Shell Selection for New Runners
- `2026-03-08` Marathon Launch Day Guide: Essential Settings and First Steps
- `2026-03-09` Marathon Launch Day: Your First Session Survival Guide
- `2026-03-09` Marathon Launch Week: Shell Tier List for New Ranked Players
- `2026-03-09` Marathon Launch Week: First Steps for New Runners

**cross-topic synthesis** (80)

- `2026-03-07` Shell Selection Guide: Finding Your Ranked Main
- `2026-03-07` Shell Selection for Ranked Mode: Your First 100 Hours
- `2026-03-07` Ranked Ready: Your First Shell Tier List for Marathon Competitive
- `2026-03-07` Shell Selection for Ranked Mode: Your First 100 Hours
- `2026-03-07` Shell Selection Guide for Marathon Ranked Mode

**thin/low-value** (26)

- `2026-03-19` Ranked Mode Rollout Meets Mixed Reception as PC Performance Complaints Mount
- `2026-03-27` Community Celebrates Ranked/Cryo Schedule Split, But LFG Desperation Shows
- `2026-03-29` Community Celebrates Schedule Split as Technical Issues Pile Up
- `2026-03-29` Community Celebrates Ranked-Archive Schedule Split After Backlash
- `2026-04-02` Community Split on Balance Changes as Player Count Concerns Mount

**creator-coverage** (19)

- `2026-03-20` German Ranked Tutorial Signals Pre-Weekend Meta Prep As Community Braces
- `2026-03-21` Content Creator Analysis Reveals Weapon Meta Confusion Amid Cryo Launch
- `2026-03-23` Truds Hypes Ranked Mode Launch But Delivers Zero Gameplay
- `2026-03-27` TayXDc's 200-Hour Weapon Analysis Shows Deep Meta Understanding
- `2026-03-28` TayXDc's 200-Hour Meta Analysis Shows Promise But Lacks Depth

**discourse** (1)

- `2026-07-06` Lord Charizard flags Marathon's new all-time low player count and asks if Bungie and Sony will change course

## Hidden stacks (secondary clustering)

Method: headline-signature Jaccard (stopworded + singularized significant tokens), greedy grouping at **>=0.6**, groups of **3+**. This is a DIFFERENT axis from D1 (which needed a known entity); it finds same-topic stacks whose subject is not in the entity vocab.

| stacks found | articles in them | % of the bucket |
|---|---|---|
| 9 | **72** | 11% |

### What the stack numbers mean (read before acting)

**72 articles sit in stacks, but only 23 are still indexed.** The other **49 were already cut by
earlier passes** - their presence here is *confirmation those passes worked*, not new debt:

| stack | size | still indexed | status |
|---|---|---|---|
| "Essential Weapon Mod Builds for New Runners" | **43** | **1** | **ALREADY HANDLED** - the Phase-2 Cluster-1 mod-builds pile (42 noindexed, `-vvm6` kept). `-no19` is absent because we retitled it: the rename genuinely broke the duplicate signature. |
| "Launch Week: Your First 10/48/72 Hours" | 3 | **0** | ALREADY HANDLED |
| "Marathon Weapon Mods Guide: Essential Beginner Builds" | 5 | **1** | 4 = Phase-2 Cluster 2 (handled); **1 is a post-cleanup re-mint** (2026-06-14) that predates the dedup guard (shipped 2026-07-09) |
| Precision Rifle guides ("Long-Range Dominance for Ranked") | 5 | **5** | **LIVE** - not mods; points at `/weapons/*` |
| "Complete Magazine Mod Guide: Master Your Reload Speed..." | 4 | **4** | **LIVE** |
| "Complete Marathon Magazine Mod Guide: Essential Reload..." | 3 | **3** | **LIVE** - same topic as the x4 above |
| "Complete Marathon Barrel Mod Guide" | 3 | **3** | **LIVE** |
| "BR33 Victory Lap" (mid-season precision meta) | 3 | **3** | **LIVE** - not mods; `/weapons/*` |
| "Season 2 Arsenal Builds: Essential Weapon Mod Setups" | 3 | **3** | **LIVE** |

**So the genuinely NEW hidden cannibalization is ~23 articles across 7 live stacks** - and the
dominant theme is **weapon MOD guides**, which D1 could not see because the mod system has no
proper-noun subject in the headline.

### The real finding: a structural gap, not a cut list

Probing the 219 "other/uncategorized" for recurring domain nouns confirms it: **`mod` appears in 64
headlines, `mods` 10, `magazine` 7, `chip` 4, `barrel` 4, `optic` 3** - mods are by far the dominant
hidden subject. And there is **no canonical to consolidate toward**: `/shells/[slug]`,
`/weapons/[slug]`, `/maps/[slug]`, `/uniques/[slug]` all exist, but **`/mods` does not - despite 202
rows in `mod_stats`**. Same asymmetry flagged for cryo archive, but worse: a fully-populated table
with no reference page and ~60-80 articles orbiting it. See `docs/mods-section-build-plan.md`.

### Stack 1 - x43 (1 indexed)

| created | noindex | words | headline |
|---|---|---|---|
| 2026-05-21 | **N** | 676 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-22 | Y | 608 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-22 | Y | 514 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-22 | Y | 541 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-23 | Y | 600 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-23 | Y | 610 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-23 | Y | 687 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-24 | Y | 613 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-24 | Y | 631 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-24 | Y | 650 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-24 | Y | 700 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-25 | Y | 679 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-25 | Y | 584 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-25 | Y | 681 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-26 | Y | 635 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-26 | Y | 631 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-26 | Y | 772 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-26 | Y | 601 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-27 | Y | 674 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-27 | Y | 688 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-28 | Y | 738 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-28 | Y | 606 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-29 | Y | 692 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-29 | Y | 635 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-30 | Y | 706 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-31 | Y | 700 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-05-31 | Y | 833 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-01 | Y | 725 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-02 | Y | 654 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-03 | Y | 600 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-04 | Y | 686 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-05 | Y | 603 | Essential Weapon Mod Builds for New Runners |
| 2026-06-05 | Y | 698 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-07 | Y | 523 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-08 | Y | 739 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-09 | Y | 671 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-09 | Y | 596 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-10 | Y | 720 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-10 | Y | 771 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-11 | Y | 618 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-11 | Y | 564 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-12 | Y | 698 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |
| 2026-06-12 | Y | 484 | Essential Weapon Mod Builds for New Runners: Start Here Before You Specialize |

### Stack 2 - x5 (5 indexed)

| created | noindex | words | headline |
|---|---|---|---|
| 2026-03-16 | **N** | 225 | Marathon Precision Rifle Guide: Long-Range Dominance for Ranked |
| 2026-05-19 | **N** | 654 | Precision Rifles for Ranked Marathon: Long-Range Dominance in High-Tier Play |
| 2026-05-21 | **N** | 488 | Precision Rifle Meta Guide: Long-Range Dominance for Ranked Runners |
| 2026-05-21 | **N** | 652 | The Precision Rifle Meta: Why Long-Range Dominance Wins Ranked Games |
| 2026-05-22 | **N** | 563 | Precision Rifle Meta: Why Long-Range Dominance Wins Ranked Games |

### Stack 3 - x5 (1 indexed)

| created | noindex | words | headline |
|---|---|---|---|
| 2026-06-13 | Y | 415 | Marathon Weapon Mods Guide: Essential Beginner Builds |
| 2026-06-13 | Y | 621 | Marathon Weapon Mods Guide: Essential Beginner Builds |
| 2026-06-14 | **N** | 536 | Marathon Season 2 Weapon Mods Guide: Essential Beginner Builds |
| 2026-06-15 | Y | 568 | Marathon Weapon Mods Guide: Essential Beginner Builds |
| 2026-06-15 | Y | 659 | Marathon Weapon Mods Guide: Essential Beginner Builds |

### Stack 4 - x4 (4 indexed)

| created | noindex | words | headline |
|---|---|---|---|
| 2026-05-17 | **N** | 657 | Complete Marathon Magazine Mod Guide: Master Your Reload Speed and Ammo Capacity |
| 2026-05-19 | **N** | 719 | Complete Magazine Mod Guide: Master Your Reload Speed and Ammo Capacity |
| 2026-05-19 | **N** | 705 | Magazine Mods Deep Guide: Master Your Reload Speed and Ammo Capacity |
| 2026-05-20 | **N** | 663 | The Complete Magazine Mod Deep Guide: Master Your Reload Speed and Ammo Capacity |

### Stack 5 - x3 (0 indexed)

| created | noindex | words | headline |
|---|---|---|---|
| 2026-03-10 | Y | 260 | Marathon Launch Week: Your First 48 Hours Survival Guide |
| 2026-03-10 | Y | 231 | Marathon Launch Week: Your First 10 Hours Survival Guide |
| 2026-03-10 | Y | 272 | Marathon Launch Week: Your First 72 Hours Survival Guide |

### Stack 6 - x3 (3 indexed)

| created | noindex | words | headline |
|---|---|---|---|
| 2026-04-14 | **N** | 617 | BR33 Victory Lap: The New Mid-Season Precision Meta Contender |
| 2026-04-17 | **N** | 583 | BR33 Victory Lap Unique: Mid-Season Precision Rifle Meta Revolution |
| 2026-04-19 | **N** | 588 | BR33 Victory Lap Unique: Mid-Season One Precision Meta Disruption |

### Stack 7 - x3 (3 indexed)

| created | noindex | words | headline |
|---|---|---|---|
| 2026-05-07 | **N** | 586 | Complete Marathon Barrel Mod Guide: Essential Accuracy Upgrades for Every Range |
| 2026-05-10 | **N** | 786 | Complete Marathon Barrel Mod Guide: Essential Range and Stability Upgrades |
| 2026-05-14 | **N** | 635 | Complete Marathon Barrel Mod Guide: Essential Range and Accuracy Upgrades |

### Stack 8 - x3 (3 indexed)

| created | noindex | words | headline |
|---|---|---|---|
| 2026-05-08 | **N** | 546 | Complete Marathon Magazine Mod Guide: Essential Reload and Capacity Upgrades |
| 2026-05-11 | **N** | 572 | Complete Marathon Magazine Mod Guide: Essential Reload and Capacity Upgrades |
| 2026-05-14 | **N** | 724 | Complete Marathon Magazine Mod Guide: Essential Reload and Capacity Upgrades |

### Stack 9 - x3 (3 indexed)

| created | noindex | words | headline |
|---|---|---|---|
| 2026-06-03 | **N** | 529 | Season 2 Arsenal Builds: Essential Weapon Mod Setups for New Runners |
| 2026-06-06 | **N** | 738 | Season 2 Arsenal Builds: Essential Weapon Mod Setups for New Runners |
| 2026-06-14 | **N** | 561 | Marathon Season 2 Weapon Mods: Essential Builds Guide |


## Rough keep/cut read (instinct, NOT a proposal)

- **Clearly keep (~310+)**: `news/patch/ops` (191) + `event/launch` (100) + `discourse`/`creator-coverage` (20). Legitimately dated and sequential - exactly the class `docs/topic-cluster-audit.md` flags as **not** cannibalization. Real patch-news per version is sequential by nature.
- **Candidate for consolidation (~23 confirmed, likely more)**: the LIVE mod-guide stacks above - blocked on `/mods` existing first.
- **Needs a decision, not a cut (~80)**: `cross-topic synthesis` (tier lists / state-of-meta) - competes with `/meta` and `/shells`, but it is a different intent.
- **Genuinely murky (~200)**: the remainder of `other/uncategorized`. Cannot honestly be called keep-or-cut from headlines.

## Confidence / caveats (read before acting on anything here)

- **The ~23 live hidden-dupe figure is a FLOOR, not a ceiling.** Jaccard >= 0.6 over *headlines only* catches near-identical titles. Re-mints on the same topic with genuinely different wording will **not** appear. Real body-level clustering (or embeddings) is what would settle the true number.
- **Categorization is headline-based, not body-based.** Word counts came from the body; the category did not. `other/uncategorized` (219, 34% of the bucket) is precisely where headline-only reading fails - **both** the D1 subject matcher and this report's categorizer declined to guess.
- **Category boundaries are heuristic and first-match-wins.** An article can be both launch coverage and a mod guide; it lands in whichever rule fires first.
- **The count is 636, not 632** (see the discrepancy note at the top). Neither number is exact.
- **No GSC cross-reference.** No Search Console API/credential is wired, so there is no way from here to say which of the 538 still-indexed articles Google already rejected. The 378 "crawled - currently not indexed" set needs an export pasted in.

## Bottom line

The bucket is **mostly legitimate** (news/event/discourse ~310 of 636). Confirmed new cannibalization is **small (~23)**. The valuable output of this investigation is **not a cut list** - it is the discovery that **the mod system is a 202-row table with no canonical page**, which is what `docs/mods-section-build-plan.md` scopes.
