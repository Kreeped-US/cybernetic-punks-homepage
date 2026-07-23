# /intel prune candidates

_Generated read-only on 2026-07-22 from the database + the GSC Pages export (`Pages (3).csv`, 692 /intel rows). The only write is this file._

## 6. Method

- **Signal 1 — low reach (GSC):** impressions per /intel URL from the GSC Performance→Pages export (3-month window). **GSC omits zero-impression pages**, so a published /intel page ABSENT from the export = 0 impressions = never surfaced. Impressions here = GSC value if present, else 0. Buckets: **≤1** (conservative floor), **2–4** (barely surfacing), **5+**. The aggressive "≤4" threshold = the first two combined.
- **Signal 2 — duplicates:** grouped by `deriveTuple` (entity/facet), then clustered on **headline token-set Jaccard ≥ 0.50** (union-find). Body Jaccard was calibrated and rejected as a signal (cross-topic baseline 0.113, within-tuple max ~0.38 — the anti-dup guards work; duplication lives in headlines/queries, not bodies).
- **Publish date — CONTEXT ONLY.** A column for judging edge cases (recent low-reach = fair chance; old low-reach = likely dead). **It selects nothing** — no article is a candidate because of its age (revised framing).
- **protected?** = referenced by `coverage_registry.feed_item_id` (scaffolding for the coverage view). Canonicals/matchups point at hub pages, not articles.
- **CONFIDENT CUT = low-reach (≤1) ∩ duplicate.** EDGE CASE = low-reach (≤1) ∩ unique. Neither uses date.

## 1. Summary counts

| metric | count |
|---|---|
| total published /intel pages (Marathon) | 1566 |
| — indexed (in sitemap) | 898 |
| — already noindexed (already cut) | 668 |
| present in GSC (≥1 impression at least once) | 688 |
| **impressions ≤1** (incl. absent-from-GSC) | **1109** |
| impressions 2–4 | 246 |
| impressions 5+ | 211 |
| duplicate-cluster members (84 clusters) | 313 |
| **CONFIDENT CUTS — low-reach ∩ duplicate** | **223** (23 still indexed) |
| EDGE CASES — low-reach ∩ unique | 886 (532 still indexed) |
| confident cuts that are PROTECTED (hold) | 54 |

> **Read this first.** Of the corpus, **668 pages are already noindexed** (already cut). The live decision is over the **898 indexed** pages. Among those, **23** are both low-reach and a duplicate (confident cuts, minus any protected), and **532** are low-reach but unique (edge cases — judgment). Most of the 223/886 totals are pages already noindexed; they are shown for completeness but need no action.

## 2. Confident-cut list — low-reach (≤1 impression) ∩ duplicate

Sorted by cluster, then impressions. **23 still-INDEXED** rows are the actionable cuts; noindexed rows are already handled. Hold any `protected?=YES`.

| URL | impr | clicks | publish_date | status | cluster | size | protected? |
|---|---|---|---|---|---|---|---|
| https://cyberneticpunks.com/intel/marathon-sentinel-build-castle-doctrine-smg-anchor-guide-s2-84hk | 1 | 0 | 2026-06-18 | noindexed | #1 `shell/sentinel/build` | 5 | **YES** |
| https://cyberneticpunks.com/intel/sentinel-castle-doctrine-engine-the-season-2-defensive-meta-that-turns-a05z | 0 | 0 | 2026-06-09 | noindexed | #2 `shell/sentinel/build` | 2 | no |
| https://cyberneticpunks.com/intel/marathon-assassin-build-shadow-strike-knife-engine-after-economy-patch-je7u | 0 | 0 | 2026-06-18 | noindexed | #3 `shell/assassin/build` | 4 | **YES** |
| https://cyberneticpunks.com/intel/assassin-shadow-strike-engine-the-season-2-invisibility-meta-that-turn-l143 | 0 | 0 | 2026-06-12 | noindexed | #4 `shell/assassin/build` | 5 | **YES** |
| https://cyberneticpunks.com/intel/assassin-minus-sights-engine-the-season-2-ads-invisibility-meta-that-t-x6w2 | 0 | 0 | 2026-06-03 | noindexed | #4 `shell/assassin/build` | 5 | no |
| https://cyberneticpunks.com/intel/assassin-shadow-dive-engine-the-phase-shift-combat-meta-that-turns-ste-7he2 | 0 | 0 | 2026-05-24 | noindexed | #4 `shell/assassin/build` | 5 | **YES** |
| https://cyberneticpunks.com/intel/assassin-guerrilla-engine-the-season-2-smoke-meta-that-turns-active-ca-pt9x | 1 | 0 | 2026-05-29 | noindexed | #4 `shell/assassin/build` | 5 | **YES** |
| https://cyberneticpunks.com/intel/best-assassin-ranked-solo-build-kkv-9sd-stealth-aggression-meta-fbar | 0 | 0 | 2026-06-11 | noindexed | #5 `shell/assassin/build` | 4 | no |
| https://cyberneticpunks.com/intel/best-assassin-ranked-solo-build-stryder-m1t-precision-meta-6zga | 0 | 0 | 2026-06-02 | noindexed | #5 `shell/assassin/build` | 4 | **YES** |
| https://cyberneticpunks.com/intel/best-assassin-ranked-solo-build-longshot-stealth-sniper-meta-28lh | 0 | 0 | 2026-05-24 | noindexed | #5 `shell/assassin/build` | 4 | **YES** |
| https://cyberneticpunks.com/intel/assassin-shadow-strike-engine-season-2-nightfall-preparation-guide-tu18 | 1 | 0 | 2026-05-14 | noindexed | #6 `shell/assassin/build` | 2 | no |
| https://cyberneticpunks.com/intel/assassin-shadow-strike-engine-post-security-update-invisibility-assass-36kx | 0 | 0 | 2026-05-12 | noindexed | #7 `shell/assassin/build` | 3 | no |
| https://cyberneticpunks.com/intel/assassin-shadow-strike-engine-post-1062-stealth-assassination-meta-uz89 | 0 | 0 | 2026-05-05 | noindexed | #7 `shell/assassin/build` | 3 | no |
| https://cyberneticpunks.com/intel/marathon-thief-build-grapple-to-extract-solo-ranked-engine-0m36 | 0 | 0 | 2026-07-17 | noindexed | #8 `shell/thief/build` | 3 | **YES** |
| https://cyberneticpunks.com/intel/thief-hideout-engine-the-season-2-drone-invisibility-meta-that-turns-p-5kic | 0 | 0 | 2026-05-30 | noindexed | #9 `shell/thief/build` | 4 | **YES** |
| https://cyberneticpunks.com/intel/thief-hideout-engine-the-season-2-drone-meta-that-turns-pickpocket-int-udl3 | 1 | 0 | 2026-06-08 | noindexed | #9 `shell/thief/build` | 4 | **YES** |
| https://cyberneticpunks.com/intel/thief-break-and-enter-engine-the-season-2-grapple-meta-that-turns-pick-d2ba | 1 | 0 | 2026-06-04 | noindexed | #9 `shell/thief/build` | 4 | **YES** |
| https://cyberneticpunks.com/intel/best-thief-ranked-solo-build-brrt-smg-speed-meta-hg9k | 0 | 0 | 2026-05-24 | noindexed | #10 `shell/thief/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/thief-shell-solo-queue-build-post-wstr-nerf-speed-meta-dominance-svze | 0 | 0 | 2026-04-25 | noindexed | #11 `shell/thief/build` | 2 | no |
| https://cyberneticpunks.com/intel/thief-shell-brrt-smg-build-post-wstr-nerf-speed-demon-dominance-gplo | 1 | 0 | 2026-04-20 | noindexed | #11 `shell/thief/build` | 2 | no |
| https://cyberneticpunks.com/intel/thief-cryo-archive-infiltration-build-speed-demon-loot-extraction-qdcw | 0 | 0 | 2026-03-25 | noindexed | #12 `shell/thief/build` | 8 | **YES** |
| https://cyberneticpunks.com/intel/cryo-archive-thief-build-high-risk-loot-hunting-in-bungies-endgame-v9lr | 0 | 0 | 2026-03-25 | noindexed | #12 `shell/thief/build` | 8 | **YES** |
| https://cyberneticpunks.com/intel/cryo-archive-thief-build-s-tier-vault-extraction-specialist-5kta | 0 | 0 | 2026-03-25 | noindexed | #12 `shell/thief/build` | 8 | no |
| https://cyberneticpunks.com/intel/cryo-archive-thief-speed-stealth-build-for-high-risk-extraction-fodp | 0 | 0 | 2026-03-24 | noindexed | #12 `shell/thief/build` | 8 | no |
| https://cyberneticpunks.com/intel/cryo-archive-loot-rush-thief-speed-build-for-high-tier-extractions-2z1j | 1 | 0 | 2026-04-01 | noindexed | #12 `shell/thief/build` | 8 | **YES** |
| https://cyberneticpunks.com/intel/cryo-archive-thief-build-speed-vault-extraction-specialist-pzsr | 1 | 0 | 2026-03-24 | noindexed | #12 `shell/thief/build` | 8 | no |
| https://cyberneticpunks.com/intel/marathon-triage-build-the-s-tier-squad-anchor-for-season-2-1bpt | 0 | 0 | 2026-07-08 | noindexed | #13 `shell/triage/build` | 7 | **YES** |
| https://cyberneticpunks.com/intel/marathon-triage-build-best-ranked-solo-loadout-for-climbing-66b3 | 0 | 0 | 2026-07-06 | **INDEXED** | #13 `shell/triage/build` | 7 | **YES** |
| https://cyberneticpunks.com/intel/triage-no-good-deed-engine-the-season-2-support-meta-that-turns-team-h-sgfp | 0 | 0 | 2026-05-25 | noindexed | #14 `shell/triage/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/triage-no-good-deed-engine-the-season-2-healing-chain-meta-that-turns--zybc | 1 | 0 | 2026-05-28 | noindexed | #14 `shell/triage/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/best-triage-ranked-solo-build-m77-self-sufficient-survival-meta-9ph1 | 0 | 0 | 2026-06-09 | noindexed | #15 `shell/triage/build` | 3 | **YES** |
| https://cyberneticpunks.com/intel/triage-ranked-solo-build-self-revive-nerf-creates-new-win-condition-pund | 0 | 0 | 2026-05-18 | noindexed | #15 `shell/triage/build` | 3 | no |
| https://cyberneticpunks.com/intel/best-triage-ranked-solo-build-post-self-revive-nerf-meta-ts6y | 0 | 0 | 2026-05-14 | noindexed | #15 `shell/triage/build` | 3 | no |
| https://cyberneticpunks.com/intel/triage-support-engine-season-2-nightfall-accessibility-revolution-kjlq | 0 | 0 | 2026-05-18 | noindexed | #16 `shell/triage/build` | 2 | no |
| https://cyberneticpunks.com/intel/triage-shell-sponsored-kit-tank-carri-protocols-support-meta-build-msl4 | 0 | 0 | 2026-04-21 | noindexed | #17 `shell/triage/build` | 3 | **YES** |
| https://cyberneticpunks.com/intel/triage-shell-support-build-carri-protocol-crew-reinforcement-meta-5djs | 0 | 0 | 2026-04-17 | noindexed | #17 `shell/triage/build` | 3 | **YES** |
| https://cyberneticpunks.com/intel/carri-protocol-triage-build-crew-support-meta-after-update-106-ehvk | 0 | 0 | 2026-04-15 | noindexed | #17 `shell/triage/build` | 3 | **YES** |
| https://cyberneticpunks.com/intel/cryo-archive-meta-triage-med-drone-build-dominates-new-weekend-mode-biuy | 0 | 0 | 2026-03-28 | noindexed | #18 `shell/triage/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/triage-med-drone-cryo-archive-build-weekend-dominance-setup-gen3 | 0 | 0 | 2026-03-28 | noindexed | #18 `shell/triage/build` | 2 | no |
| https://cyberneticpunks.com/intel/marathon-destroyer-build-riot-barricade-frontline-guide-s2-jxnl | 1 | 0 | 2026-06-21 | noindexed | #19 `shell/destroyer/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/marathon-destroyer-build-best-ranked-solo-loadout-right-now-5y5g | 0 | 0 | 2026-07-15 | noindexed | #20 `shell/destroyer/build` | 3 | **YES** |
| https://cyberneticpunks.com/intel/marathon-destroyer-build-deepening-your-tech-after-update-1105-xsbq | 0 | 0 | 2026-07-10 | noindexed | #21 `shell/destroyer/build` | 3 | **YES** |
| https://cyberneticpunks.com/intel/marathon-destroyer-build-carri-squad-anchor-after-update-1102-2i9z | 0 | 0 | 2026-06-17 | noindexed | #21 `shell/destroyer/build` | 3 | no |
| https://cyberneticpunks.com/intel/destroyer-impact-siphons-engine-the-season-2-barrier-meta-that-turns-i-5838 | 0 | 0 | 2026-06-11 | noindexed | #22 `shell/destroyer/build` | 6 | no |
| https://cyberneticpunks.com/intel/destroyer-riot-barricade-engine-the-season-2-shield-tank-meta-that-tur-7sj4 | 0 | 0 | 2026-06-06 | noindexed | #22 `shell/destroyer/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/destroyer-impact-siphons-engine-the-season-2-shield-feeding-meta-that--rgdp | 0 | 0 | 2026-06-01 | noindexed | #22 `shell/destroyer/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/destroyer-impact-siphons-engine-the-season-2-shield-vampire-meta-that--jyam | 0 | 0 | 2026-05-27 | noindexed | #22 `shell/destroyer/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/destroyer-impact-siphons-engine-the-season-2-frontline-meta-that-turns-xgfh | 1 | 0 | 2026-05-25 | noindexed | #22 `shell/destroyer/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/destroyer-riot-barricade-engine-the-season-2-bullrush-meta-that-absorb-6knw | 1 | 0 | 2026-05-22 | noindexed | #22 `shell/destroyer/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/destroyer-impact-siphons-engine-post-109-tank-revolution-8wx7 | 0 | 0 | 2026-05-13 | noindexed | #23 `shell/destroyer/build` | 3 | no |
| https://cyberneticpunks.com/intel/destroyer-impact-siphons-engine-post-security-update-shield-meta-revol-s9sa | 1 | 0 | 2026-05-11 | noindexed | #23 `shell/destroyer/build` | 3 | no |
| https://cyberneticpunks.com/intel/best-rook-ranked-solo-build-the-destroyer-counter-meta-586n | 0 | 0 | 2026-06-11 | noindexed | #24 `shell/destroyer/build` | 6 | no |
| https://cyberneticpunks.com/intel/best-destroyer-ranked-solo-build-demolition-hmg-control-meta-ni1b | 0 | 0 | 2026-06-07 | noindexed | #24 `shell/destroyer/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/destroyer-solo-tank-build-post-1061-free-kit-meta-exploitation-2jpt | 0 | 0 | 2026-04-22 | noindexed | #24 `shell/destroyer/build` | 6 | no |
| https://cyberneticpunks.com/intel/destroyer-ranked-solo-build-conquest-lmg-meta-post-109-qr21 | 1 | 0 | 2026-05-20 | noindexed | #24 `shell/destroyer/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/best-destroyer-ranked-solo-build-post-1063-tank-meta-ne6q | 1 | 0 | 2026-05-11 | noindexed | #24 `shell/destroyer/build` | 6 | no |
| https://cyberneticpunks.com/intel/cryo-archive-complete-guide-vault-route-and-compiler-boss-strategy-owgv | 0 | 0 | 2026-04-09 | noindexed | #25 `map/cryo-archive/guide` | 3 | no |
| https://cyberneticpunks.com/intel/marathon-assassin-counter-how-to-beat-it-with-recon-y50h | 1 | 0 | 2026-06-19 | noindexed | #26 `shell/assassin/counter` | 6 | **YES** |
| https://cyberneticpunks.com/intel/marathon-assassin-shell-master-stealth-and-solo-ranked-7d9r | 0 | 0 | 2026-06-27 | **INDEXED** | #27 `shell/assassin/guide` | 2 | no |
| https://cyberneticpunks.com/intel/marathon-assassin-shell-guide-solo-ranked-stealth-mechanics-3wz1 | 0 | 0 | 2026-06-20 | noindexed | #27 `shell/assassin/guide` | 2 | no |
| https://cyberneticpunks.com/intel/complete-assassin-shell-stealth-guide-high-risk-high-reward-holotag-sp-2h0p | 0 | 0 | 2026-05-10 | noindexed | #28 `shell/assassin/guide` | 4 | no |
| https://cyberneticpunks.com/intel/complete-assassin-shell-stealth-guide-high-risk-holotag-theft-mastery-p7j4 | 0 | 0 | 2026-05-04 | noindexed | #28 `shell/assassin/guide` | 4 | no |
| https://cyberneticpunks.com/intel/assassin-shell-mastery-holotag-theft-and-stealth-positioning-guide-39g3 | 0 | 0 | 2026-04-21 | noindexed | #28 `shell/assassin/guide` | 4 | no |
| https://cyberneticpunks.com/intel/assassin-shell-complete-stealth-guide-high-risk-holotag-theft-mastery-atv7 | 1 | 0 | 2026-04-24 | noindexed | #28 `shell/assassin/guide` | 4 | no |
| https://cyberneticpunks.com/intel/marathon-rook-shell-learn-the-game-before-it-punishes-you-9cql | 0 | 0 | 2026-07-13 | **INDEXED** | #29 `shell/rook/guide` | 2 | no |
| https://cyberneticpunks.com/intel/complete-rook-shell-flex-guide-master-the-learning-shell-for-ranked-su-5wft | 0 | 0 | 2026-05-06 | noindexed | #30 `shell/rook/guide` | 2 | no |
| https://cyberneticpunks.com/intel/complete-rook-shell-guide-the-essential-learning-platform-for-new-rank-p78h | 1 | 0 | 2026-05-16 | noindexed | #30 `shell/rook/guide` | 2 | no |
| https://cyberneticpunks.com/intel/rook-shell-mastery-complete-beginners-guide-to-marathons-ultimate-star-tjgr | 0 | 0 | 2026-04-09 | noindexed | #31 `shell/rook/guide` | 2 | no |
| https://cyberneticpunks.com/intel/complete-rook-shell-guide-your-first-marathon-shell-mastery-zas5 | 1 | 0 | 2026-05-03 | noindexed | #31 `shell/rook/guide` | 2 | no |
| https://cyberneticpunks.com/intel/recon-early-warning-system-engine-the-squad-intel-meta-that-turns-prox-h0t9 | 1 | 0 | 2026-05-29 | noindexed | #32 `shell/recon/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/marathon-recon-ranked-solo-build-br33-long-range-intel-0rfn | 0 | 0 | 2026-06-13 | noindexed | #33 `shell/recon/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/best-recon-mid-range-build-stryder-m1t-intel-control-meta-zkgf | 0 | 0 | 2026-06-10 | noindexed | #33 `shell/recon/build` | 6 | no |
| https://cyberneticpunks.com/intel/best-recon-ranked-solo-build-br33-intel-control-meta-yrop | 0 | 0 | 2026-06-06 | noindexed | #33 `shell/recon/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/best-recon-ranked-solo-build-stryder-m1t-mid-range-control-meta-tzwv | 0 | 0 | 2026-05-27 | noindexed | #33 `shell/recon/build` | 6 | no |
| https://cyberneticpunks.com/intel/best-recon-ranked-solo-build-v66-lookout-long-range-intel-meta-sbg3 | 0 | 0 | 2026-05-25 | noindexed | #33 `shell/recon/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/best-recon-ranked-solo-build-stryder-m1t-precision-meta-rg1f | 0 | 0 | 2026-05-23 | noindexed | #33 `shell/recon/build` | 6 | no |
| https://cyberneticpunks.com/intel/recon-shell-intel-dominance-build-post-wstr-nerf-information-control-wnvr | 0 | 0 | 2026-04-21 | noindexed | #34 `shell/recon/build` | 2 | no |
| https://cyberneticpunks.com/intel/recon-shell-intel-build-post-recon-tuning-battlefield-dominance-6220 | 0 | 0 | 2026-04-19 | noindexed | #34 `shell/recon/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/recon-shell-echo-pulse-build-post-buff-intelligence-dominance-guide-ti9m | 0 | 0 | 2026-04-14 | noindexed | #35 `shell/recon/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/recon-squad-support-build-echo-intelligence-dominance-post-1053-n4oz | 0 | 0 | 2026-04-09 | noindexed | #35 `shell/recon/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/post-109-recon-echo-chamber-engine-tactical-recovery-revolution-dw52 | 0 | 0 | 2026-05-13 | noindexed | #36 `shell/recon/build` | 8 | no |
| https://cyberneticpunks.com/intel/recon-echo-chamber-engine-post-security-update-intel-dominance-revolut-ner7 | 0 | 0 | 2026-05-11 | noindexed | #36 `shell/recon/build` | 8 | no |
| https://cyberneticpunks.com/intel/recon-echo-pulse-engine-post-security-update-intel-dominance-wmdu | 0 | 0 | 2026-05-09 | noindexed | #36 `shell/recon/build` | 8 | no |
| https://cyberneticpunks.com/intel/recon-shell-complete-build-guide-echo-pulse-mastery-for-squad-intel-j9cy | 0 | 0 | 2026-04-22 | noindexed | #36 `shell/recon/build` | 8 | no |
| https://cyberneticpunks.com/intel/perfect-games-recon-intel-build-echo-pulse-mastery-for-ranked-iupn | 0 | 0 | 2026-03-20 | noindexed | #36 `shell/recon/build` | 8 | no |
| https://cyberneticpunks.com/intel/recon-shell-echo-pulse-engine-post-1062-intel-superiority-build-f1xh | 1 | 0 | 2026-05-04 | noindexed | #36 `shell/recon/build` | 8 | no |
| https://cyberneticpunks.com/intel/marathon-rook-build-the-solo-survivalist-guide-for-season-2-dlcf | 0 | 0 | 2026-07-11 | **INDEXED** | #37 `shell/rook/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-right-now-99bm | 0 | 0 | 2026-07-13 | noindexed | #38 `shell/rook/build` | 8 | **YES** |
| https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-with-the-twin-tap-hbr-6yst | 0 | 0 | 2026-06-27 | noindexed | #38 `shell/rook/build` | 8 | no |
| https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-with-the-repeater-hpr-lfya | 0 | 0 | 2026-06-25 | noindexed | #38 `shell/rook/build` | 8 | no |
| https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-with-the-impact-har-j10u | 0 | 0 | 2026-06-18 | noindexed | #38 `shell/rook/build` | 8 | no |
| https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-with-the-m77-ar-uufq | 1 | 0 | 2026-06-21 | noindexed | #38 `shell/rook/build` | 8 | **YES** |
| https://cyberneticpunks.com/intel/rook-overclock-engine-the-season-2-adaptive-meta-that-turns-v75-scar-i-bggg | 0 | 0 | 2026-05-31 | noindexed | #39 `shell/rook/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/rook-overclock-engine-the-season-2-adaptive-frame-meta-that-turns-vers-hiiw | 0 | 0 | 2026-05-24 | noindexed | #39 `shell/rook/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/rook-adaptive-frame-engine-season-2-nightfall-flex-meta-revolution-a1p1 | 0 | 0 | 2026-05-17 | noindexed | #40 `shell/rook/build` | 2 | no |
| https://cyberneticpunks.com/intel/rook-adaptive-frame-engine-season-2-preparation-meta-theory-yvsl | 0 | 0 | 2026-05-14 | noindexed | #40 `shell/rook/build` | 2 | no |
| https://cyberneticpunks.com/intel/rook-overclock-engine-post-security-update-adaptive-frame-revolution-th5a | 0 | 0 | 2026-05-12 | noindexed | #41 `shell/rook/build` | 2 | no |
| https://cyberneticpunks.com/intel/rook-adaptive-frame-engine-post-security-update-control-theory-d9cf | 0 | 0 | 2026-05-11 | noindexed | #41 `shell/rook/build` | 2 | no |
| https://cyberneticpunks.com/intel/best-rook-ranked-solo-build-conquest-lmg-flex-meta-l8pl | 0 | 0 | 2026-05-31 | noindexed | #42 `shell/rook/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/best-rook-ranked-solo-build-season-2-weapon-balance-meta-8xrl | 0 | 0 | 2026-05-13 | noindexed | #42 `shell/rook/build` | 6 | no |
| https://cyberneticpunks.com/intel/best-rook-ranked-solo-build-post-1063-adaptive-weapon-meta-xzeo | 0 | 0 | 2026-05-12 | noindexed | #42 `shell/rook/build` | 6 | no |
| https://cyberneticpunks.com/intel/best-rook-ranked-solo-build-post-1063-grenade-spam-counter-cemi | 0 | 0 | 2026-05-10 | noindexed | #42 `shell/rook/build` | 6 | no |
| https://cyberneticpunks.com/intel/marathon-vandal-build-the-amplify-ranked-climb-guide-s2-hb5a | 1 | 0 | 2026-06-27 | **INDEXED** | #43 `shell/vandal/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/best-vandal-ranked-solo-build-v75-scar-energy-weapon-meta-6njy | 0 | 0 | 2026-05-22 | noindexed | #45 `shell/vandal/build` | 2 | no |
| https://cyberneticpunks.com/intel/best-vandal-build-for-season-2-ranked-solo-v75-scar-meta-ex3w | 0 | 0 | 2026-05-17 | noindexed | #45 `shell/vandal/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/vandal-disrupt-cannon-engine-post-1063-prestige-salvage-meta-kuvq | 0 | 0 | 2026-05-06 | noindexed | #46 `shell/vandal/build` | 2 | no |
| https://cyberneticpunks.com/intel/vandal-disrupt-cannon-engine-post-1063-prestige-salvage-hunt-theory-bim5 | 1 | 0 | 2026-05-08 | noindexed | #46 `shell/vandal/build` | 2 | **YES** |
| https://cyberneticpunks.com/intel/marathon-vandal-build-amplify-movement-engine-for-ranked-tj6f | 0 | 0 | 2026-07-12 | **INDEXED** | #47 `shell/vandal/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/marathon-vandal-shell-guide-best-starting-build-for-ranked-7ynj | 0 | 0 | 2026-06-18 | noindexed | #47 `shell/vandal/build` | 6 | no |
| https://cyberneticpunks.com/intel/marathon-vandal-build-amplify-movement-engine-for-solo-ranked-46s8 | 1 | 0 | 2026-06-20 | noindexed | #47 `shell/vandal/build` | 6 | **YES** |
| https://cyberneticpunks.com/intel/complete-triage-shell-support-guide-s-tier-squad-lifeline-mastery-o4kq | 0 | 0 | 2026-05-13 | noindexed | #48 `shell/triage/tier` | 7 | no |
| https://cyberneticpunks.com/intel/complete-triage-shell-support-guide-s-tier-squad-sustain-mastery-hkog | 0 | 0 | 2026-05-09 | noindexed | #48 `shell/triage/tier` | 7 | no |
| https://cyberneticpunks.com/intel/triage-shell-complete-support-guide-s-tier-squad-survival-mastery-b19b | 0 | 0 | 2026-05-06 | noindexed | #48 `shell/triage/tier` | 7 | no |
| https://cyberneticpunks.com/intel/triage-shell-complete-mastery-guide-s-tier-squad-support-dominance-p2kj | 0 | 0 | 2026-04-23 | noindexed | #48 `shell/triage/tier` | 7 | no |
| https://cyberneticpunks.com/intel/triage-support-mastery-complete-squad-play-guide-to-marathons-s-tier-m-joek | 0 | 0 | 2026-04-09 | noindexed | #48 `shell/triage/tier` | 7 | no |
| https://cyberneticpunks.com/intel/complete-triage-shell-support-guide-s-tier-squad-medical-specialist-k4b8 | 1 | 0 | 2026-05-16 | noindexed | #48 `shell/triage/tier` | 7 | no |
| https://cyberneticpunks.com/intel/marathon-patch-1105-solo-queue-fix-and-ranked-impact-xd4g | 0 | 0 | 2026-07-10 | **INDEXED** | #49 `mode/ranked/news` | 3 | no |
| https://cyberneticpunks.com/intel/marathon-update-1105-solo-queue-fix-and-ranked-impact-y8m2 | 1 | 0 | 2026-07-10 | **INDEXED** | #49 `mode/ranked/news` | 3 | no |
| https://cyberneticpunks.com/intel/complete-shell-selection-guide-for-marathon-ranked-mode-launch-jyp1 | 0 | 0 | 2026-03-11 | noindexed | #50 `mode/ranked/news` | 2 | no |
| https://cyberneticpunks.com/intel/marathon-ranked-mode-launch-shell-selection-holotag-strategy-guide-el7q | 0 | 0 | 2026-03-10 | noindexed | #50 `mode/ranked/news` | 2 | no |
| https://cyberneticpunks.com/intel/essential-ranked-mode-preparation-shell-selection-guide-hnrl | 0 | 0 | 2026-03-11 | noindexed | #51 `mode/ranked/guide` | 3 | no |
| https://cyberneticpunks.com/intel/shell-selection-for-marathon-ranked-mode-your-first-season-guide-q9w4 | 0 | 0 | 2026-03-10 | **INDEXED** | #51 `mode/ranked/guide` | 3 | no |
| https://cyberneticpunks.com/intel/shell-selection-guide-for-marathon-ranked-mode-8nn1 | 0 | 0 | 2026-03-07 | noindexed | #51 `mode/ranked/guide` | 3 | no |
| https://cyberneticpunks.com/intel/marathon-destroyer-shell-squad-ranked-domination-guide-hch2 | 1 | 0 | 2026-06-27 | **INDEXED** | #52 `shell/destroyer/guide` | 4 | no |
| https://cyberneticpunks.com/intel/destroyer-shell-advanced-combat-guide-squad-domination-tactics-tkpu | 1 | 0 | 2026-04-21 | **INDEXED** | #52 `shell/destroyer/guide` | 4 | no |
| https://cyberneticpunks.com/intel/the-counter-to-vandal-most-players-miss-recon-echo-pulse-strategy-mfno | 0 | 0 | 2026-05-23 | noindexed | #55 `shell/vandal/counter` | 5 | no |
| https://cyberneticpunks.com/intel/the-vandal-counter-most-players-miss-long-range-precision-control-32o9 | 0 | 0 | 2026-05-12 | noindexed | #55 `shell/vandal/counter` | 5 | no |
| https://cyberneticpunks.com/intel/the-counter-to-vandal-most-players-miss-recons-hard-answer-pkd9 | 1 | 0 | 2026-05-29 | noindexed | #55 `shell/vandal/counter` | 5 | no |
| https://cyberneticpunks.com/intel/the-counter-to-vandal-most-players-miss-extreme-range-denial-622z | 1 | 0 | 2026-05-19 | noindexed | #55 `shell/vandal/counter` | 5 | no |
| https://cyberneticpunks.com/intel/how-to-beat-thief-in-ranked-solo-the-range-control-strategy-dv5q | 0 | 0 | 2026-05-13 | noindexed | #56 `shell/thief/counter` | 4 | no |
| https://cyberneticpunks.com/intel/the-counter-to-thief-most-players-miss-destroyer-barricade-control-v3ps | 0 | 0 | 2026-06-12 | **INDEXED** | #57 `shell/thief/counter` | 5 | **YES** |
| https://cyberneticpunks.com/intel/the-counter-to-thief-most-players-miss-destroyers-hard-answer-y353 | 0 | 0 | 2026-05-26 | noindexed | #57 `shell/thief/counter` | 5 | no |
| https://cyberneticpunks.com/intel/the-counter-to-thief-most-players-miss-railgun-range-denial-gjuu | 0 | 0 | 2026-05-20 | noindexed | #57 `shell/thief/counter` | 5 | no |
| https://cyberneticpunks.com/intel/the-counter-to-thief-most-players-miss-conquest-lmg-hard-counter-4tns | 0 | 0 | 2026-05-17 | noindexed | #57 `shell/thief/counter` | 5 | no |
| https://cyberneticpunks.com/intel/the-thief-counter-most-players-miss-conquest-lmg-range-control-290v | 0 | 0 | 2026-05-10 | noindexed | #57 `shell/thief/counter` | 5 | no |
| https://cyberneticpunks.com/intel/marathon-thief-shell-guide-solo-ranked-extraction-mastery-s97v | 0 | 0 | 2026-06-17 | noindexed | #61 `shell/thief/guide` | 3 | no |
| https://cyberneticpunks.com/intel/thief-shell-guide-extraction-specialist-for-ranked-solo-carry-6zkj | 0 | 0 | 2026-03-25 | noindexed | #61 `shell/thief/guide` | 3 | no |
| https://cyberneticpunks.com/intel/thief-s-tier-week-the-solo-ranked-meta-that-punishes-hesitation-xdoq | 0 | 0 | 2026-05-25 | noindexed | #62 `shell/thief/tier` | 2 | no |
| https://cyberneticpunks.com/intel/thief-s-tier-week-the-ranked-solo-meta-that-punishes-server-rage-7lcz | 1 | 0 | 2026-06-06 | noindexed | #62 `shell/thief/tier` | 2 | no |
| https://cyberneticpunks.com/intel/thief-shell-extraction-dominance-pickpocket-drone-meta-surges-to-s-tie-tyo2 | 0 | 0 | 2026-05-12 | noindexed | #63 `shell/thief/tier` | 4 | no |
| https://cyberneticpunks.com/intel/thief-shell-solo-surge-pickpocket-drone-meta-dominates-s-tier-holotag--2tk4 | 0 | 0 | 2026-05-10 | noindexed | #63 `shell/thief/tier` | 4 | no |
| https://cyberneticpunks.com/intel/thief-shell-extraction-dominance-solo-ranked-s-tier-as-holotag-meta-fa-bt3i | 0 | 0 | 2026-05-08 | noindexed | #63 `shell/thief/tier` | 4 | no |
| https://cyberneticpunks.com/intel/thief-shell-extraction-dominance-pickpocket-drone-meta-surges-to-s-tie-f2fb | 1 | 0 | 2026-05-15 | noindexed | #63 `shell/thief/tier` | 4 | no |
| https://cyberneticpunks.com/intel/smart-thief-ranked-solo-guide-s-tier-extraction-specialist-1p3e | 0 | 0 | 2026-05-23 | noindexed | #64 `shell/thief/tier` | 9 | no |
| https://cyberneticpunks.com/intel/the-smart-thiefs-ranked-solo-guide-s-tier-extraction-specialist-azg9 | 0 | 0 | 2026-05-20 | noindexed | #64 `shell/thief/tier` | 9 | no |
| https://cyberneticpunks.com/intel/complete-thief-shell-guide-s-tier-solo-extraction-specialist-g09m | 0 | 0 | 2026-05-18 | noindexed | #64 `shell/thief/tier` | 9 | no |
| https://cyberneticpunks.com/intel/complete-thief-shell-stealth-guide-s-tier-solo-extraction-mastery-d9mp | 0 | 0 | 2026-05-11 | noindexed | #64 `shell/thief/tier` | 9 | no |
| https://cyberneticpunks.com/intel/thief-shell-complete-extraction-guide-s-tier-solo-loot-mastery-6h51 | 0 | 0 | 2026-05-08 | noindexed | #64 `shell/thief/tier` | 9 | no |
| https://cyberneticpunks.com/intel/thief-shell-complete-extraction-guide-s-tier-solo-ranked-mastery-011i | 0 | 0 | 2026-05-05 | noindexed | #64 `shell/thief/tier` | 9 | no |
| https://cyberneticpunks.com/intel/thief-shell-complete-extraction-guide-s-tier-solo-ranked-mastery-pvkg | 0 | 0 | 2026-04-25 | noindexed | #64 `shell/thief/tier` | 9 | no |
| https://cyberneticpunks.com/intel/thief-shell-complete-stealth-guide-s-tier-solo-extraction-mastery-e7og | 0 | 0 | 2026-04-22 | noindexed | #64 `shell/thief/tier` | 9 | no |
| https://cyberneticpunks.com/intel/thief-movement-nerf-shakes-meta-cryo-archive-schedule-split-creates-fo-7cxv | 0 | 0 | 2026-04-01 | noindexed | #65 `shell/thief/tier` | 3 | no |
| https://cyberneticpunks.com/intel/cryo-archive-schedule-split-reshapes-ranked-meta-thief-exploit-fixed-0u0t | 0 | 0 | 2026-03-28 | noindexed | #65 `shell/thief/tier` | 3 | no |
| https://cyberneticpunks.com/intel/thief-exploit-fixed-cryo-archive-schedule-split-shakes-ranked-meta-fhxe | 0 | 0 | 2026-03-28 | noindexed | #65 `shell/thief/tier` | 3 | no |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-2-thief-movement-nerf-reshapes-ranked-meta-sxo4 | 0 | 0 | 2026-04-01 | noindexed | #66 `shell/thief/tier` | 6 | no |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-2-thief-nerf-reshapes-extraction-meta-x2n8 | 0 | 0 | 2026-04-01 | noindexed | #66 `shell/thief/tier` | 6 | no |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-2-reshapes-cqb-meta-thief-drone-theft-dominates-cd0y | 0 | 0 | 2026-03-31 | noindexed | #66 `shell/thief/tier` | 6 | no |
| https://cyberneticpunks.com/intel/cryo-archive-drops-thief-shell-surges-as-extraction-meta-shifts-z7y7 | 0 | 0 | 2026-03-25 | noindexed | #66 `shell/thief/tier` | 6 | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-reshapes-meta-thief-dominance-cqb-weapon-surge-pefe | 0 | 0 | 2026-03-25 | noindexed | #67 `shell/thief/tier` | 4 | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-reshapes-meta-thief-shell-dominance-confirmed-4mao | 0 | 0 | 2026-03-25 | noindexed | #67 `shell/thief/tier` | 4 | no |
| https://cyberneticpunks.com/intel/cryo-archive-reshapes-meta-thief-shell-dominance-high-rpm-weapons-p4nd | 0 | 0 | 2026-03-24 | noindexed | #67 `shell/thief/tier` | 4 | no |
| https://cyberneticpunks.com/intel/cryo-archive-meta-shakeup-cqb-weapons-surge-thief-shell-dominance-zbfg | 0 | 0 | 2026-03-23 | noindexed | #67 `shell/thief/tier` | 4 | no |
| https://cyberneticpunks.com/intel/complete-assassin-shell-stealth-guide-high-risk-a-tier-solo-specialist-f0td | 0 | 0 | 2026-05-17 | noindexed | #68 `shell/assassin/tier` | 3 | no |
| https://cyberneticpunks.com/intel/complete-assassin-shell-stealth-guide-high-risk-a-tier-solo-specialist-8z07 | 0 | 0 | 2026-05-13 | noindexed | #68 `shell/assassin/tier` | 3 | no |
| https://cyberneticpunks.com/intel/assassin-shell-complete-stealth-guide-a-tier-solo-specialist-mastery-vqai | 1 | 0 | 2026-05-07 | noindexed | #68 `shell/assassin/tier` | 3 | no |
| https://cyberneticpunks.com/intel/complete-vandal-shell-guide-a-tier-combat-specialist-for-ranked-succes-u8ed | 0 | 0 | 2026-05-16 | noindexed | #69 `shell/vandal/tier` | 4 | no |
| https://cyberneticpunks.com/intel/complete-vandal-shell-combat-guide-a-tier-all-around-combat-mastery-mgnn | 0 | 0 | 2026-05-09 | noindexed | #69 `shell/vandal/tier` | 4 | no |
| https://cyberneticpunks.com/intel/vandal-shell-complete-mobility-guide-a-tier-multi-role-mastery-g033 | 0 | 0 | 2026-05-06 | noindexed | #69 `shell/vandal/tier` | 4 | no |
| https://cyberneticpunks.com/intel/cryo-archive-schedule-split-creates-ranked-pve-meta-divide-mebt | 0 | 0 | 2026-03-31 | noindexed | #70 `map/cryo-archive/tier` | 8 | no |
| https://cyberneticpunks.com/intel/cryo-archive-schedule-split-reshapes-meta-priorities-6jyu | 0 | 0 | 2026-03-30 | noindexed | #70 `map/cryo-archive/tier` | 8 | no |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-2-schedule-split-reshapes-pvepvp-meta-balance-bgaa | 0 | 0 | 2026-03-30 | noindexed | #70 `map/cryo-archive/tier` | 8 | no |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-window-split-reshapes-time-investment-meta-ltbv | 0 | 0 | 2026-03-29 | noindexed | #70 `map/cryo-archive/tier` | 8 | no |
| https://cyberneticpunks.com/intel/schedule-split-reshapes-meta-cryo-archive-weekend-changes-everything-aluj | 0 | 0 | 2026-03-28 | noindexed | #70 `map/cryo-archive/tier` | 8 | no |
| https://cyberneticpunks.com/intel/cryo-archive-schedule-split-reshapes-ranked-meta-priorities-0wwh | 0 | 0 | 2026-03-27 | noindexed | #70 `map/cryo-archive/tier` | 8 | no |
| https://cyberneticpunks.com/intel/cryo-archive-scheduling-shift-reshapes-ranked-meta-priorities-55nl | 0 | 0 | 2026-03-26 | noindexed | #70 `map/cryo-archive/tier` | 8 | no |
| https://cyberneticpunks.com/intel/bungies-cryo-archive-weekend-meta-forcing-ranked-schedule-split-xydn | 0 | 0 | 2026-03-25 | noindexed | #70 `map/cryo-archive/tier` | 8 | no |
| https://cyberneticpunks.com/intel/complete-destroyer-shell-tank-guide-s-tier-squad-combat-specialist-5255 | 0 | 0 | 2026-05-17 | noindexed | #71 `shell/destroyer/tier` | 7 | no |
| https://cyberneticpunks.com/intel/destroyer-shell-complete-combat-guide-s-tier-squad-tank-mastery-ls20 | 0 | 0 | 2026-05-07 | noindexed | #71 `shell/destroyer/tier` | 7 | no |
| https://cyberneticpunks.com/intel/complete-destroyer-shell-combat-guide-s-tier-squad-tank-mastery-f1qi | 0 | 0 | 2026-05-04 | noindexed | #71 `shell/destroyer/tier` | 7 | no |
| https://cyberneticpunks.com/intel/destroyer-shell-complete-tank-guide-s-tier-squad-dominance-mastery-089p | 0 | 0 | 2026-04-24 | noindexed | #71 `shell/destroyer/tier` | 7 | no |
| https://cyberneticpunks.com/intel/community-cheers-cryo-archive-schedule-split-as-technical-issues-persi-n9j5 | 0 | 0 | 2026-03-29 | noindexed | #72 `map/cryo-archive/community` | 2 | no |
| https://cyberneticpunks.com/intel/community-split-on-cryo-archive-schedule-changes-performance-issues-pe-mjhf | 0 | 0 | 2026-03-27 | noindexed | #72 `map/cryo-archive/community` | 2 | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-stream-day-2-coverage-with-mrroflwaffles-skarrow9-colp | 0 | 0 | 2026-03-26 | noindexed | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-stream-community-first-runs-live-on-twitch-rtuq | 0 | 0 | 2026-03-25 | **INDEXED** | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-stream-day-2-coverage-with-elite-runner-first-clea-1ipc | 0 | 0 | 2026-03-25 | noindexed | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-stream-live-coverage-day-2-with-community-first-ru-ccrw | 0 | 0 | 2026-03-24 | noindexed | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-stream-live-community-coverage-first-runs-rbqn | 0 | 0 | 2026-03-24 | **INDEXED** | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-stream-live-community-coverage-first-runs-1mvg | 0 | 0 | 2026-03-23 | noindexed | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-stream-community-first-runs-and-twitch-drop-events-a3qz | 0 | 0 | 2026-03-23 | noindexed | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-stream-live-coverage-day-2-with-mrroflwaf-f5lr | 0 | 0 | 2026-03-22 | noindexed | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-stream-live-community-coverage-first-runs-kyyu | 0 | 0 | 2026-03-22 | noindexed | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-stream-live-coverage-and-community-reacti-ura0 | 0 | 0 | 2026-03-22 | noindexed | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-live-stream-community-launch-coverage-first-runs-547x | 0 | 0 | 2026-03-21 | noindexed | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-stream-live-coverage-and-first-impression-a1cd | 0 | 0 | 2026-03-21 | noindexed | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-stream-first-runs-go-live-with-twitch-dro-fbmo | 0 | 0 | 2026-03-21 | noindexed | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-stream-community-first-runs-and-weekend-only-acces-gzjg | 1 | 0 | 2026-03-24 | **INDEXED** | #73 `map/cryo-archive/community` | 14 | no |
| https://cyberneticpunks.com/intel/ranked-mode-shell-tier-list-best-shells-for-solo-vs-squad-climbing-1npc | 0 | 0 | 2026-03-10 | noindexed | #74 `mode/ranked/tier` | 2 | no |
| https://cyberneticpunks.com/intel/ranked-mode-shell-selection-best-shells-for-each-rank-tier-lmgz | 0 | 0 | 2026-03-09 | noindexed | #74 `mode/ranked/tier` | 2 | no |
| https://cyberneticpunks.com/intel/essential-shell-tier-list-for-marathon-ranked-mode-launch-72qb | 0 | 0 | 2026-03-12 | noindexed | #75 `mode/ranked/tier` | 8 | no |
| https://cyberneticpunks.com/intel/marathon-ranked-mode-guide-shell-tier-list-and-strategy-breakdown-1o20 | 0 | 0 | 2026-03-11 | noindexed | #75 `mode/ranked/tier` | 8 | no |
| https://cyberneticpunks.com/intel/marathon-ranked-mode-launch-shell-tier-list-first-season-strategy-wsdi | 0 | 0 | 2026-03-11 | noindexed | #75 `mode/ranked/tier` | 8 | no |
| https://cyberneticpunks.com/intel/ranked-mode-preparation-shell-tier-list-holotag-target-strategies-br4i | 0 | 0 | 2026-03-10 | noindexed | #75 `mode/ranked/tier` | 8 | no |
| https://cyberneticpunks.com/intel/marathon-ranked-mode-launch-prep-shell-tier-list-essential-builds-rffc | 0 | 0 | 2026-03-10 | noindexed | #75 `mode/ranked/tier` | 8 | no |
| https://cyberneticpunks.com/intel/shell-selection-for-ranked-mode-tier-list-and-first-week-strategy-5pwd | 0 | 0 | 2026-03-08 | noindexed | #75 `mode/ranked/tier` | 8 | no |
| https://cyberneticpunks.com/intel/ranked-mode-launch-essential-shell-tier-list-and-holotag-strategy-kw7w | 0 | 0 | 2026-03-08 | noindexed | #75 `mode/ranked/tier` | 8 | no |
| https://cyberneticpunks.com/intel/ranked-mode-shell-selection-guide-tier-list-and-holotag-strategies-3se3 | 0 | 0 | 2026-03-07 | noindexed | #75 `mode/ranked/tier` | 8 | no |
| https://cyberneticpunks.com/intel/complete-marathon-magazine-mod-guide-essential-reload-and-capacity-upg-ncjc | 0 | 0 | 2026-05-11 | noindexed | #76 `mod_slot/magazine/guide` | 7 | no |
| https://cyberneticpunks.com/intel/complete-marathon-magazine-mod-guide-essential-reload-and-capacity-upg-ggbe | 0 | 0 | 2026-05-08 | noindexed | #76 `mod_slot/magazine/guide` | 7 | no |
| https://cyberneticpunks.com/intel/complete-recon-shell-intel-guide-a-tier-squad-information-specialist-uw7h | 0 | 0 | 2026-05-18 | noindexed | #77 `shell/recon/tier` | 6 | no |
| https://cyberneticpunks.com/intel/complete-recon-shell-intel-guide-a-tier-squad-information-specialist-otn0 | 0 | 0 | 2026-05-14 | noindexed | #77 `shell/recon/tier` | 6 | no |
| https://cyberneticpunks.com/intel/complete-recon-shell-intel-guide-a-tier-squad-information-mastery-id2d | 0 | 0 | 2026-05-11 | noindexed | #77 `shell/recon/tier` | 6 | no |
| https://cyberneticpunks.com/intel/complete-marathon-recon-shell-intel-guide-a-tier-squad-information-mas-bfg0 | 0 | 0 | 2026-05-08 | noindexed | #77 `shell/recon/tier` | 6 | no |
| https://cyberneticpunks.com/intel/recon-shell-complete-intel-guide-a-tier-squad-information-mastery-50ek | 0 | 0 | 2026-05-05 | noindexed | #77 `shell/recon/tier` | 6 | no |
| https://cyberneticpunks.com/intel/complete-marathon-barrel-mod-guide-essential-range-and-accuracy-upgrad-3vyt | 0 | 0 | 2026-05-14 | noindexed | #79 `mod_slot/barrel/guide` | 2 | no |
| https://cyberneticpunks.com/intel/complete-marathon-barrel-mod-guide-essential-accuracy-upgrades-for-eve-qkay | 1 | 0 | 2026-05-07 | noindexed | #79 `mod_slot/barrel/guide` | 2 | no |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-2-secret-cryo-discovery-changes-everything-smoa | 0 | 0 | 2026-03-27 | **INDEXED** | #80 `map/cryo-archive/news` | 2 | no |
| https://cyberneticpunks.com/intel/mid-season-recon-guide-echo-pulse-and-tracker-drone-buff-complete-anal-21h7 | 0 | 0 | 2026-04-17 | **INDEXED** | #81 `shell/recon/news` | 2 | no |
| https://cyberneticpunks.com/intel/recon-mid-season-buff-guide-echo-pulse-and-tracker-drone-optimization-ldqo | 0 | 0 | 2026-04-14 | **INDEXED** | #81 `shell/recon/news` | 2 | no |
| https://cyberneticpunks.com/intel/cryo-archive-drops-thief-dominates-weekend-only-high-stakes-mode-k8r5 | 0 | 0 | 2026-03-26 | **INDEXED** | #83 `shell/thief/news` | 2 | no |
| https://cyberneticpunks.com/intel/cryo-archive-thief-weekend-only-high-stakes-loot-optimization-0ajr | 0 | 0 | 2026-03-23 | **INDEXED** | #83 `shell/thief/news` | 2 | no |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-emergency-nerf-divides-community-on-power-fantasy-wlbo | 0 | 0 | 2026-04-07 | **INDEXED** | #84 `weapon/biotoxic-disinjector/news` | 3 | no |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-emergency-nerf-divides-marathon-community-69nw | 0 | 0 | 2026-04-06 | **INDEXED** | #84 `weapon/biotoxic-disinjector/news` | 3 | no |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-nerf-divides-community-after-35-damage-cut-bgxw | 1 | 0 | 2026-04-06 | **INDEXED** | #84 `weapon/biotoxic-disinjector/news` | 3 | no |

## 3. Duplicate clusters (keep the highest-impression member, the rest are noindex candidates)

Members sorted **highest-impression first** — the top row is the KEEP recommendation, the rest are the reworded candidates. Only clusters with ≥1 still-indexed member are detailed; fully-noindexed clusters are already cut.

**Cluster #73 — `map/cryo-archive/community`** (14 variants, 3 indexed) — suggested KEEP: highest-impression = **1 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 1 | 0 | 2026-03-24 | **INDEXED** | https://cyberneticpunks.com/intel/cryo-archive-launch-stream-community-first-runs-and-weekend-only-acces-gzjg | no |
| 2 | 0 | 0 | 2026-03-26 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-launch-stream-day-2-coverage-with-mrroflwaffles-skarrow9-colp | no |
| 3 | 0 | 0 | 2026-03-25 | **INDEXED** | https://cyberneticpunks.com/intel/cryo-archive-launch-stream-community-first-runs-live-on-twitch-rtuq | no |
| 4 | 0 | 0 | 2026-03-25 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-launch-stream-day-2-coverage-with-elite-runner-first-clea-1ipc | no |
| 5 | 0 | 0 | 2026-03-24 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-launch-stream-live-coverage-day-2-with-community-first-ru-ccrw | no |
| 6 | 0 | 0 | 2026-03-24 | **INDEXED** | https://cyberneticpunks.com/intel/cryo-archive-launch-stream-live-community-coverage-first-runs-rbqn | no |
| 7 | 0 | 0 | 2026-03-23 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-launch-stream-live-community-coverage-first-runs-1mvg | no |
| 8 | 0 | 0 | 2026-03-23 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-launch-stream-community-first-runs-and-twitch-drop-events-a3qz | no |
| 9 | 0 | 0 | 2026-03-22 | noindexed | https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-stream-live-coverage-day-2-with-mrroflwaf-f5lr | no |
| 10 | 0 | 0 | 2026-03-22 | noindexed | https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-stream-live-community-coverage-first-runs-kyyu | no |
| 11 | 0 | 0 | 2026-03-22 | noindexed | https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-stream-live-coverage-and-community-reacti-ura0 | no |
| 12 | 0 | 0 | 2026-03-21 | noindexed | https://cyberneticpunks.com/intel/marathon-cryo-archive-live-stream-community-launch-coverage-first-runs-547x | no |
| 13 | 0 | 0 | 2026-03-21 | noindexed | https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-stream-live-coverage-and-first-impression-a1cd | no |
| 14 | 0 | 0 | 2026-03-21 | noindexed | https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-stream-first-runs-go-live-with-twitch-dro-fbmo | no |

**Cluster #36 — `shell/recon/build`** (8 variants, 1 indexed) — suggested KEEP: highest-impression = **22 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 22 | 0 | 2026-07-04 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-recon-build-echo-pulse-intel-engine-for-ranked-ayf9 | **YES** |
| 2 | 4 | 0 | 2026-06-19 | noindexed | https://cyberneticpunks.com/intel/marathon-recon-build-echo-pulse-intel-engine-for-ranked-s2-og5a | **YES** |
| 3 | 1 | 0 | 2026-05-04 | noindexed | https://cyberneticpunks.com/intel/recon-shell-echo-pulse-engine-post-1062-intel-superiority-build-f1xh | no |
| 4 | 0 | 0 | 2026-05-13 | noindexed | https://cyberneticpunks.com/intel/post-109-recon-echo-chamber-engine-tactical-recovery-revolution-dw52 | no |
| 5 | 0 | 0 | 2026-05-11 | noindexed | https://cyberneticpunks.com/intel/recon-echo-chamber-engine-post-security-update-intel-dominance-revolut-ner7 | no |
| 6 | 0 | 0 | 2026-05-09 | noindexed | https://cyberneticpunks.com/intel/recon-echo-pulse-engine-post-security-update-intel-dominance-wmdu | no |
| 7 | 0 | 0 | 2026-04-22 | noindexed | https://cyberneticpunks.com/intel/recon-shell-complete-build-guide-echo-pulse-mastery-for-squad-intel-j9cy | no |
| 8 | 0 | 0 | 2026-03-20 | noindexed | https://cyberneticpunks.com/intel/perfect-games-recon-intel-build-echo-pulse-mastery-for-ranked-iupn | no |

**Cluster #38 — `shell/rook/build`** (8 variants, 3 indexed) — suggested KEEP: highest-impression = **29 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 29 | 0 | 2026-07-01 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-rook-build-the-underrated-solo-survivor-loadout-z5m0 | **YES** |
| 2 | 15 | 0 | 2026-06-26 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-rook-build-the-solo-survivor-loadout-youre-sleeping-on-1cyl | **YES** |
| 3 | 7 | 0 | 2026-07-03 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-with-the-impact-har-tsf0 | **YES** |
| 4 | 1 | 0 | 2026-06-21 | noindexed | https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-with-the-m77-ar-uufq | **YES** |
| 5 | 0 | 0 | 2026-07-13 | noindexed | https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-right-now-99bm | **YES** |
| 6 | 0 | 0 | 2026-06-27 | noindexed | https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-with-the-twin-tap-hbr-6yst | no |
| 7 | 0 | 0 | 2026-06-25 | noindexed | https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-with-the-repeater-hpr-lfya | no |
| 8 | 0 | 0 | 2026-06-18 | noindexed | https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-with-the-impact-har-j10u | no |

**Cluster #13 — `shell/triage/build`** (7 variants, 5 indexed) — suggested KEEP: highest-impression = **68 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 68 | 0 | 2026-06-29 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-triage-build-squad-anchor-loadout-for-ranked-2ztt | **YES** |
| 2 | 22 | 0 | 2026-07-05 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-triage-shell-squad-support-build-and-ranked-guide-qmk2 | **YES** |
| 3 | 14 | 0 | 2026-06-23 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-triage-solo-build-best-ranked-loadout-right-now-f8ks | **YES** |
| 4 | 9 | 1 | 2026-06-20 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-triage-build-volt-anchor-support-guide-for-ranked-squads-e4l9 | **YES** |
| 5 | 5 | 0 | 2026-06-25 | noindexed | https://cyberneticpunks.com/intel/marathon-triage-build-the-squad-support-engine-for-ranked-lqsa | **YES** |
| 6 | 0 | 0 | 2026-07-08 | noindexed | https://cyberneticpunks.com/intel/marathon-triage-build-the-s-tier-squad-anchor-for-season-2-1bpt | **YES** |
| 7 | 0 | 0 | 2026-07-06 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-triage-build-best-ranked-solo-loadout-for-climbing-66b3 | **YES** |

**Cluster #76 — `mod_slot/magazine/guide`** (7 variants, 1 indexed) — suggested KEEP: highest-impression = **24 impr** (currently noindexed!)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 24 | 0 | 2026-05-20 | noindexed | https://cyberneticpunks.com/intel/the-complete-magazine-mod-deep-guide-master-your-reload-speed-and-ammo-qre9 | no |
| 2 | 15 | 0 | 2026-05-19 | noindexed | https://cyberneticpunks.com/intel/magazine-mods-deep-guide-master-your-reload-speed-and-ammo-capacity-w4he | no |
| 3 | 6 | 0 | 2026-05-19 | noindexed | https://cyberneticpunks.com/intel/complete-magazine-mod-guide-master-your-reload-speed-and-ammo-capacity-0w4l | no |
| 4 | 2 | 0 | 2026-05-17 | **INDEXED** | https://cyberneticpunks.com/intel/complete-marathon-magazine-mod-guide-master-your-reload-speed-and-ammo-zudp | no |
| 5 | 2 | 0 | 2026-05-14 | noindexed | https://cyberneticpunks.com/intel/complete-marathon-magazine-mod-guide-essential-reload-and-capacity-upg-txgs | no |
| 6 | 0 | 0 | 2026-05-11 | noindexed | https://cyberneticpunks.com/intel/complete-marathon-magazine-mod-guide-essential-reload-and-capacity-upg-ncjc | no |
| 7 | 0 | 0 | 2026-05-08 | noindexed | https://cyberneticpunks.com/intel/complete-marathon-magazine-mod-guide-essential-reload-and-capacity-upg-ggbe | no |

**Cluster #24 — `shell/destroyer/build`** (6 variants, 1 indexed) — suggested KEEP: highest-impression = **11 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 11 | 0 | 2026-07-01 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-destroyer-build-conquest-lmg-ranked-solo-guide-yups | **YES** |
| 2 | 1 | 0 | 2026-05-20 | noindexed | https://cyberneticpunks.com/intel/destroyer-ranked-solo-build-conquest-lmg-meta-post-109-qr21 | **YES** |
| 3 | 1 | 0 | 2026-05-11 | noindexed | https://cyberneticpunks.com/intel/best-destroyer-ranked-solo-build-post-1063-tank-meta-ne6q | no |
| 4 | 0 | 0 | 2026-06-11 | noindexed | https://cyberneticpunks.com/intel/best-rook-ranked-solo-build-the-destroyer-counter-meta-586n | no |
| 5 | 0 | 0 | 2026-06-07 | noindexed | https://cyberneticpunks.com/intel/best-destroyer-ranked-solo-build-demolition-hmg-control-meta-ni1b | **YES** |
| 6 | 0 | 0 | 2026-04-22 | noindexed | https://cyberneticpunks.com/intel/destroyer-solo-tank-build-post-1061-free-kit-meta-exploitation-2jpt | no |

**Cluster #26 — `shell/assassin/counter`** (6 variants, 2 indexed) — suggested KEEP: highest-impression = **12 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 12 | 1 | 2026-06-28 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-assassin-counter-guide-how-to-beat-it-in-ranked-solo-mvdf | **YES** |
| 2 | 3 | 0 | 2026-07-14 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-assassin-counter-how-to-beat-it-in-ranked-solo-ow4i | **YES** |
| 3 | 3 | 0 | 2026-05-27 | noindexed | https://cyberneticpunks.com/intel/how-to-beat-assassin-in-ranked-solo-the-hard-counter-most-players-miss-jz8j | no |
| 4 | 2 | 0 | 2026-06-07 | noindexed | https://cyberneticpunks.com/intel/the-counter-to-assassin-most-players-miss-range-control-eti0 | **YES** |
| 5 | 2 | 0 | 2026-05-23 | noindexed | https://cyberneticpunks.com/intel/how-to-beat-assassin-the-destroyer-counter-strategy-most-players-miss-wk9q | no |
| 6 | 1 | 0 | 2026-06-19 | noindexed | https://cyberneticpunks.com/intel/marathon-assassin-counter-how-to-beat-it-with-recon-y50h | **YES** |

**Cluster #42 — `shell/rook/build`** (6 variants, 1 indexed) — suggested KEEP: highest-impression = **26 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 26 | 0 | 2026-05-15 | **INDEXED** | https://cyberneticpunks.com/intel/best-rook-build-for-season-2-ranked-solo-new-weapon-balance-meta-eosw | no |
| 2 | 4 | 0 | 2026-05-17 | noindexed | https://cyberneticpunks.com/intel/best-rook-build-for-season-2-ranked-solo-conquest-lmg-meta-zoyg | no |
| 3 | 0 | 0 | 2026-05-31 | noindexed | https://cyberneticpunks.com/intel/best-rook-ranked-solo-build-conquest-lmg-flex-meta-l8pl | **YES** |
| 4 | 0 | 0 | 2026-05-13 | noindexed | https://cyberneticpunks.com/intel/best-rook-ranked-solo-build-season-2-weapon-balance-meta-8xrl | no |
| 5 | 0 | 0 | 2026-05-12 | noindexed | https://cyberneticpunks.com/intel/best-rook-ranked-solo-build-post-1063-adaptive-weapon-meta-xzeo | no |
| 6 | 0 | 0 | 2026-05-10 | noindexed | https://cyberneticpunks.com/intel/best-rook-ranked-solo-build-post-1063-grenade-spam-counter-cemi | no |

**Cluster #47 — `shell/vandal/build`** (6 variants, 2 indexed) — suggested KEEP: highest-impression = **10 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 10 | 0 | 2026-06-26 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-vandal-shell-amplify-build-for-ranked-climbing-r1j5 | **YES** |
| 2 | 3 | 0 | 2026-07-03 | noindexed | https://cyberneticpunks.com/intel/marathon-vandal-build-amplify-movement-engine-for-ranked-u4lg | **YES** |
| 3 | 2 | 0 | 2026-04-23 | noindexed | https://cyberneticpunks.com/intel/vandal-shell-complete-build-guide-best-starting-ranked-shell-mastery-u9hv | no |
| 4 | 1 | 0 | 2026-06-20 | noindexed | https://cyberneticpunks.com/intel/marathon-vandal-build-amplify-movement-engine-for-solo-ranked-46s8 | **YES** |
| 5 | 0 | 0 | 2026-07-12 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-vandal-build-amplify-movement-engine-for-ranked-tj6f | **YES** |
| 6 | 0 | 0 | 2026-06-18 | noindexed | https://cyberneticpunks.com/intel/marathon-vandal-shell-guide-best-starting-build-for-ranked-7ynj | no |

**Cluster #66 — `shell/thief/tier`** (6 variants, 1 indexed) — suggested KEEP: highest-impression = **5 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 5 | 0 | 2026-04-02 | **INDEXED** | https://cyberneticpunks.com/intel/movement-nerf-hits-thief-meta-as-cryo-archive-weekend-2-opens-nmd4 | no |
| 2 | 2 | 0 | 2026-03-24 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-live-cqb-meta-surges-thief-shell-dominates-weekend-extrac-er55 | no |
| 3 | 0 | 0 | 2026-04-01 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-weekend-2-thief-movement-nerf-reshapes-ranked-meta-sxo4 | no |
| 4 | 0 | 0 | 2026-04-01 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-weekend-2-thief-nerf-reshapes-extraction-meta-x2n8 | no |
| 5 | 0 | 0 | 2026-03-31 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-weekend-2-reshapes-cqb-meta-thief-drone-theft-dominates-cd0y | no |
| 6 | 0 | 0 | 2026-03-25 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-drops-thief-shell-surges-as-extraction-meta-shifts-z7y7 | no |

**Cluster #1 — `shell/sentinel/build`** (5 variants, 2 indexed) — suggested KEEP: highest-impression = **29 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 29 | 1 | 2026-06-23 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-sentinel-build-castle-doctrine-cqb-guide-s2-fhiq | **YES** |
| 2 | 9 | 0 | 2026-06-28 | noindexed | https://cyberneticpunks.com/intel/marathon-sentinel-build-castle-doctrine-smg-guide-s2-y9mt | **YES** |
| 3 | 7 | 0 | 2026-07-05 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-sentinel-build-castle-doctrine-shotgun-dominance-guide-qo5r | no |
| 4 | 2 | 0 | 2026-07-14 | noindexed | https://cyberneticpunks.com/intel/marathon-sentinel-build-castle-doctrine-shotgun-guide-p3sl | **YES** |
| 5 | 1 | 0 | 2026-06-18 | noindexed | https://cyberneticpunks.com/intel/marathon-sentinel-build-castle-doctrine-smg-anchor-guide-s2-84hk | **YES** |

**Cluster #57 — `shell/thief/counter`** (5 variants, 1 indexed) — suggested KEEP: highest-impression = **0 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 0 | 0 | 2026-06-12 | **INDEXED** | https://cyberneticpunks.com/intel/the-counter-to-thief-most-players-miss-destroyer-barricade-control-v3ps | **YES** |
| 2 | 0 | 0 | 2026-05-26 | noindexed | https://cyberneticpunks.com/intel/the-counter-to-thief-most-players-miss-destroyers-hard-answer-y353 | no |
| 3 | 0 | 0 | 2026-05-20 | noindexed | https://cyberneticpunks.com/intel/the-counter-to-thief-most-players-miss-railgun-range-denial-gjuu | no |
| 4 | 0 | 0 | 2026-05-17 | noindexed | https://cyberneticpunks.com/intel/the-counter-to-thief-most-players-miss-conquest-lmg-hard-counter-4tns | no |
| 5 | 0 | 0 | 2026-05-10 | noindexed | https://cyberneticpunks.com/intel/the-thief-counter-most-players-miss-conquest-lmg-range-control-290v | no |

**Cluster #3 — `shell/assassin/build`** (4 variants, 2 indexed) — suggested KEEP: highest-impression = **71 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 71 | 4 | 2026-06-30 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-knife-build-shadow-strike-assassin-is-the-move-jlei | **YES** |
| 2 | 29 | 2 | 2026-07-09 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-assassin-build-shadow-strike-knife-engine-guide-j2op | **YES** |
| 3 | 5 | 1 | 2026-06-30 | noindexed | https://cyberneticpunks.com/intel/marathon-assassin-knife-build-shadow-strike-season-2-deep-dive-j8ae | **YES** |
| 4 | 0 | 0 | 2026-06-18 | noindexed | https://cyberneticpunks.com/intel/marathon-assassin-build-shadow-strike-knife-engine-after-economy-patch-je7u | **YES** |

**Cluster #52 — `shell/destroyer/guide`** (4 variants, 4 indexed) — suggested KEEP: highest-impression = **10 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 10 | 0 | 2026-06-20 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-destroyer-shell-guide-squad-ranked-dominance-e338 | no |
| 2 | 6 | 0 | 2026-07-07 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-destroyer-shell-squad-dominance-and-ranked-guide-l7j1 | no |
| 3 | 1 | 0 | 2026-06-27 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-destroyer-shell-squad-ranked-domination-guide-hch2 | no |
| 4 | 1 | 0 | 2026-04-21 | **INDEXED** | https://cyberneticpunks.com/intel/destroyer-shell-advanced-combat-guide-squad-domination-tactics-tkpu | no |

**Cluster #56 — `shell/thief/counter`** (4 variants, 1 indexed) — suggested KEEP: highest-impression = **8 impr** (currently noindexed!)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 8 | 0 | 2026-06-30 | noindexed | https://cyberneticpunks.com/intel/marathon-thief-counter-guide-how-to-beat-it-in-ranked-solo-izvk | no |
| 2 | 4 | 0 | 2026-06-21 | noindexed | https://cyberneticpunks.com/intel/marathon-thief-counter-guide-beat-it-in-ranked-solo-jlpz | no |
| 3 | 3 | 0 | 2026-05-31 | **INDEXED** | https://cyberneticpunks.com/intel/how-to-beat-thief-in-ranked-solo-the-destroyer-hard-counter-ba3j | **YES** |
| 4 | 0 | 0 | 2026-05-13 | noindexed | https://cyberneticpunks.com/intel/how-to-beat-thief-in-ranked-solo-the-range-control-strategy-dv5q | no |

**Cluster #25 — `map/cryo-archive/guide`** (3 variants, 1 indexed) — suggested KEEP: highest-impression = **8 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 8 | 0 | 2026-03-30 | **INDEXED** | https://cyberneticpunks.com/intel/cryo-archive-complete-vault-guide-secret-cryo-locations-compiler-boss-dpmg | no |
| 2 | 2 | 0 | 2026-04-03 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-complete-guide-7-vaults-compiler-boss-and-extract-routes-vrjk | no |
| 3 | 0 | 0 | 2026-04-09 | noindexed | https://cyberneticpunks.com/intel/cryo-archive-complete-guide-vault-route-and-compiler-boss-strategy-owgv | no |

**Cluster #49 — `mode/ranked/news`** (3 variants, 3 indexed) — suggested KEEP: highest-impression = **64 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 64 | 0 | 2026-06-24 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-update-1103-ranked-solo-queue-fix-and-what-changes-631o | no |
| 2 | 1 | 0 | 2026-07-10 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-update-1105-solo-queue-fix-and-ranked-impact-y8m2 | no |
| 3 | 0 | 0 | 2026-07-10 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-patch-1105-solo-queue-fix-and-ranked-impact-xd4g | no |

**Cluster #51 — `mode/ranked/guide`** (3 variants, 1 indexed) — suggested KEEP: highest-impression = **0 impr** (currently noindexed!)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 0 | 0 | 2026-03-11 | noindexed | https://cyberneticpunks.com/intel/essential-ranked-mode-preparation-shell-selection-guide-hnrl | no |
| 2 | 0 | 0 | 2026-03-10 | **INDEXED** | https://cyberneticpunks.com/intel/shell-selection-for-marathon-ranked-mode-your-first-season-guide-q9w4 | no |
| 3 | 0 | 0 | 2026-03-07 | noindexed | https://cyberneticpunks.com/intel/shell-selection-guide-for-marathon-ranked-mode-8nn1 | no |

**Cluster #61 — `shell/thief/guide`** (3 variants, 1 indexed) — suggested KEEP: highest-impression = **11 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 11 | 0 | 2026-06-24 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-thief-shell-guide-solo-ranked-loot-and-survival-vrs2 | no |
| 2 | 0 | 0 | 2026-06-17 | noindexed | https://cyberneticpunks.com/intel/marathon-thief-shell-guide-solo-ranked-extraction-mastery-s97v | no |
| 3 | 0 | 0 | 2026-03-25 | noindexed | https://cyberneticpunks.com/intel/thief-shell-guide-extraction-specialist-for-ranked-solo-carry-6zkj | no |

**Cluster #84 — `weapon/biotoxic-disinjector/news`** (3 variants, 3 indexed) — suggested KEEP: highest-impression = **1 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 1 | 0 | 2026-04-06 | **INDEXED** | https://cyberneticpunks.com/intel/biotoxic-disinjector-nerf-divides-community-after-35-damage-cut-bgxw | no |
| 2 | 0 | 0 | 2026-04-07 | **INDEXED** | https://cyberneticpunks.com/intel/biotoxic-disinjector-emergency-nerf-divides-community-on-power-fantasy-wlbo | no |
| 3 | 0 | 0 | 2026-04-06 | **INDEXED** | https://cyberneticpunks.com/intel/biotoxic-disinjector-emergency-nerf-divides-marathon-community-69nw | no |

**Cluster #2 — `shell/sentinel/build`** (2 variants, 1 indexed) — suggested KEEP: highest-impression = **22 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 22 | 0 | 2026-05-28 | **INDEXED** | https://cyberneticpunks.com/intel/sentinel-defensive-engine-the-season-2-castle-doctrine-meta-that-turns-9v2w | **YES** |
| 2 | 0 | 0 | 2026-06-09 | noindexed | https://cyberneticpunks.com/intel/sentinel-castle-doctrine-engine-the-season-2-defensive-meta-that-turns-a05z | no |

**Cluster #19 — `shell/destroyer/build`** (2 variants, 1 indexed) — suggested KEEP: highest-impression = **13 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 13 | 0 | 2026-07-02 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-destroyer-build-the-riot-barricade-squad-carry-guide-fom2 | **YES** |
| 2 | 1 | 0 | 2026-06-21 | noindexed | https://cyberneticpunks.com/intel/marathon-destroyer-build-riot-barricade-frontline-guide-s2-jxnl | **YES** |

**Cluster #27 — `shell/assassin/guide`** (2 variants, 1 indexed) — suggested KEEP: highest-impression = **0 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 0 | 0 | 2026-06-27 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-assassin-shell-master-stealth-and-solo-ranked-7d9r | no |
| 2 | 0 | 0 | 2026-06-20 | noindexed | https://cyberneticpunks.com/intel/marathon-assassin-shell-guide-solo-ranked-stealth-mechanics-3wz1 | no |

**Cluster #29 — `shell/rook/guide`** (2 variants, 2 indexed) — suggested KEEP: highest-impression = **9 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 9 | 1 | 2026-06-28 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-rook-shell-learn-ranked-before-you-specialize-y38m | no |
| 2 | 0 | 0 | 2026-07-13 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-rook-shell-learn-the-game-before-it-punishes-you-9cql | no |

**Cluster #37 — `shell/rook/build`** (2 variants, 2 indexed) — suggested KEEP: highest-impression = **10 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 10 | 0 | 2026-06-21 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-rook-build-the-solo-survival-anchor-for-season-2-v1ku | **YES** |
| 2 | 0 | 0 | 2026-07-11 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-rook-build-the-solo-survivalist-guide-for-season-2-dlcf | **YES** |

**Cluster #43 — `shell/vandal/build`** (2 variants, 1 indexed) — suggested KEEP: highest-impression = **3 impr** (currently noindexed!)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 3 | 0 | 2026-07-12 | noindexed | https://cyberneticpunks.com/intel/marathon-vandal-build-why-amplify-is-the-ranked-underdog-u2pp | **YES** |
| 2 | 1 | 0 | 2026-06-27 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-vandal-build-the-amplify-ranked-climb-guide-s2-hb5a | **YES** |

**Cluster #53 — `shell/recon/guide`** (2 variants, 2 indexed) — suggested KEEP: highest-impression = **13 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 13 | 0 | 2026-07-06 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-recon-shell-map-control-and-ranked-squad-guide-6efy | no |
| 2 | 2 | 0 | 2026-06-26 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-recon-shell-guide-map-control-and-squad-intel-rd86 | no |

**Cluster #58 — `mode/sponsored-survival/economy`** (2 variants, 2 indexed) — suggested KEEP: highest-impression = **66 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 66 | 1 | 2026-06-22 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-sponsored-survival-credits-and-progression-fast-track-9r86 | no |
| 2 | 27 | 0 | 2026-06-29 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-sponsored-survival-how-to-farm-credits-fast-cx2e | no |

**Cluster #59 — `shell/triage/guide`** (2 variants, 2 indexed) — suggested KEEP: highest-impression = **12 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 12 | 0 | 2026-06-26 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-triage-shell-guide-keep-your-squad-alive-and-extracting-1czk | no |
| 2 | 4 | 0 | 2026-06-19 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-triage-shell-guide-keep-your-squad-alive-in-s2-ydjg | no |

**Cluster #60 — `shell/vandal/guide`** (2 variants, 1 indexed) — suggested KEEP: highest-impression = **14 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 14 | 0 | 2026-05-20 | **INDEXED** | https://cyberneticpunks.com/intel/vandal-shell-complete-guide-why-its-marathons-best-starting-ranked-she-gqxy | no |
| 2 | 3 | 0 | 2026-05-03 | noindexed | https://cyberneticpunks.com/intel/vandal-shell-complete-combat-guide-best-starting-ranked-shell-mastery-97vr | no |

**Cluster #78 — `weapon/br33-volley-rifle/build`** (2 variants, 2 indexed) — suggested KEEP: highest-impression = **2 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 2 | 0 | 2026-05-17 | **INDEXED** | https://cyberneticpunks.com/intel/br33-volley-rifle-meta-revolution-pre-season-2-precision-build-zsb0 | no |
| 2 | 2 | 0 | 2026-04-21 | **INDEXED** | https://cyberneticpunks.com/intel/br33-volley-rifle-victory-lap-build-mid-seasons-precision-rifle-meta-d-rvu8 | no |

**Cluster #80 — `map/cryo-archive/news`** (2 variants, 2 indexed) — suggested KEEP: highest-impression = **2 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 2 | 0 | 2026-03-27 | **INDEXED** | https://cyberneticpunks.com/intel/cryo-archive-secret-cryo-locations-complete-weekend-2-discovery-guide-nc9o | no |
| 2 | 0 | 0 | 2026-03-27 | **INDEXED** | https://cyberneticpunks.com/intel/cryo-archive-weekend-2-secret-cryo-discovery-changes-everything-smoa | no |

**Cluster #81 — `shell/recon/news`** (2 variants, 2 indexed) — suggested KEEP: highest-impression = **0 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 0 | 0 | 2026-04-17 | **INDEXED** | https://cyberneticpunks.com/intel/mid-season-recon-guide-echo-pulse-and-tracker-drone-buff-complete-anal-21h7 | no |
| 2 | 0 | 0 | 2026-04-14 | **INDEXED** | https://cyberneticpunks.com/intel/recon-mid-season-buff-guide-echo-pulse-and-tracker-drone-optimization-ldqo | no |

**Cluster #82 — `shell/thief/news`** (2 variants, 2 indexed) — suggested KEEP: highest-impression = **4 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 4 | 0 | 2026-03-26 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-update-1051-thief-exploit-fix-cryo-archive-improvements-mfp1 | no |
| 2 | 3 | 1 | 2026-03-29 | **INDEXED** | https://cyberneticpunks.com/intel/marathon-update-1051-fixed-thief-exploits-and-cryo-archive-improvement-nx0w | no |

**Cluster #83 — `shell/thief/news`** (2 variants, 2 indexed) — suggested KEEP: highest-impression = **0 impr** (indexed)

| rank | impr | clicks | publish_date | status | URL | protected? |
|---|---|---|---|---|---|---|
| **KEEP?** | 0 | 0 | 2026-03-26 | **INDEXED** | https://cyberneticpunks.com/intel/cryo-archive-drops-thief-dominates-weekend-only-high-stakes-mode-k8r5 | no |
| 2 | 0 | 0 | 2026-03-23 | **INDEXED** | https://cyberneticpunks.com/intel/cryo-archive-thief-weekend-only-high-stakes-loot-optimization-0ajr | no |

### 3b. Fully-noindexed clusters (49, already cut)

| cluster | tuple | variants | max impr (any member) |
|---|---|---|---|
| #64 | `shell/thief/tier` | 9 | 2 |
| #12 | `shell/thief/build` | 8 | 2 |
| #70 | `map/cryo-archive/tier` | 8 | 0 |
| #75 | `mode/ranked/tier` | 8 | 0 |
| #48 | `shell/triage/tier` | 7 | 2 |
| #71 | `shell/destroyer/tier` | 7 | 6 |
| #22 | `shell/destroyer/build` | 6 | 1 |
| #33 | `shell/recon/build` | 6 | 0 |
| #77 | `shell/recon/tier` | 6 | 2 |
| #4 | `shell/assassin/build` | 5 | 7 |
| #55 | `shell/vandal/counter` | 5 | 2 |
| #5 | `shell/assassin/build` | 4 | 4 |
| #9 | `shell/thief/build` | 4 | 3 |
| #28 | `shell/assassin/guide` | 4 | 1 |
| #63 | `shell/thief/tier` | 4 | 1 |
| #67 | `shell/thief/tier` | 4 | 0 |
| #69 | `shell/vandal/tier` | 4 | 2 |
| #7 | `shell/assassin/build` | 3 | 4 |
| #8 | `shell/thief/build` | 3 | 6 |
| #15 | `shell/triage/build` | 3 | 0 |
| #17 | `shell/triage/build` | 3 | 0 |
| #20 | `shell/destroyer/build` | 3 | 4 |
| #21 | `shell/destroyer/build` | 3 | 3 |
| #23 | `shell/destroyer/build` | 3 | 2 |
| #65 | `shell/thief/tier` | 3 | 0 |
| #68 | `shell/assassin/tier` | 3 | 1 |
| #6 | `shell/assassin/build` | 2 | 2 |
| #10 | `shell/thief/build` | 2 | 2 |
| #11 | `shell/thief/build` | 2 | 1 |
| #14 | `shell/triage/build` | 2 | 1 |
| #16 | `shell/triage/build` | 2 | 2 |
| #18 | `shell/triage/build` | 2 | 0 |
| #30 | `shell/rook/guide` | 2 | 1 |
| #31 | `shell/rook/guide` | 2 | 1 |
| #32 | `shell/recon/build` | 2 | 5 |
| #34 | `shell/recon/build` | 2 | 0 |
| #35 | `shell/recon/build` | 2 | 0 |
| #39 | `shell/rook/build` | 2 | 0 |
| #40 | `shell/rook/build` | 2 | 0 |
| #41 | `shell/rook/build` | 2 | 0 |
| #44 | `shell/vandal/build` | 2 | 2 |
| #45 | `shell/vandal/build` | 2 | 0 |
| #46 | `shell/vandal/build` | 2 | 1 |
| #50 | `mode/ranked/news` | 2 | 0 |
| #54 | `shell/vandal/counter` | 2 | 13 |
| #62 | `shell/thief/tier` | 2 | 1 |
| #72 | `map/cryo-archive/community` | 2 | 0 |
| #74 | `mode/ranked/tier` | 2 | 0 |
| #79 | `mod_slot/barrel/guide` | 2 | 1 |

## 4. Edge-case list — low-reach (≤1) ∩ unique (needs judgment)

Unique pages (not in any duplicate cluster) with ≤1 impression. **532 still-indexed** shown; publish_date is the aid — recent = give it a chance, old = likely dead. Not pre-decided.

| URL | impr | clicks | publish_date | status | protected? |
|---|---|---|---|---|---|
| https://cyberneticpunks.com/intel/marathon-sentinel-build-prey-tracker-and-snare-mine-after-115-7yya | 0 | 0 | 2026-07-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-update-115-patch-impact-on-rook-sentinel-and-the-meta-tjbn | 0 | 0 | 2026-07-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-assassin-build-active-camo-smoke-engine-for-mid-season-2-wetx | 0 | 0 | 2026-07-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-outlook-what-joe-zieglers-exit-means-vysz | 0 | 0 | 2026-07-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-mid-season-2-patch-the-wstr-is-back-what-it-means-for-ranked-0eqn | 0 | 0 | 2026-07-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-mid-season-2-update-wstr-d54-and-grenade-meta-shifts-kyfj | 0 | 0 | 2026-07-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-wstr-combat-shotgun-build-mid-season-buff-guide-k8fq | 0 | 0 | 2026-07-16 | **INDEXED** | **YES** |
| https://cyberneticpunks.com/intel/marathon-mid-season-2-update-vault-breaker-wstr-buff-grenade-limits-k3uq | 0 | 0 | 2026-07-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-mid-season-2-patch-ranked-winners-and-losers-k0z5 | 0 | 0 | 2026-07-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-s2-gear-gap-and-server-woes-what-players-are-grinding-through-owa1 | 0 | 0 | 2026-07-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-triage-solo-ranked-winning-despite-the-shells-weakest-tier-t7ul | 1 | 0 | 2026-07-12 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-season-2-player-sentiment-the-paying-crowd-vs-reddit-t7id | 0 | 0 | 2026-07-12 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-patch-1105-what-a-bug-fix-means-for-solo-ranked-dads | 0 | 0 | 2026-07-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-mode-whats-actually-broken-and-how-to-climb-xtkw | 0 | 0 | 2026-07-10 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-update-1105-solo-queue-fix-lands-reaction-pending-xdt2 | 0 | 0 | 2026-07-10 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-holotag-tiers-the-shell-benchmarks-that-define-each-rank-ixc7 | 0 | 0 | 2026-07-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-steam-reviews-vs-reddit-two-very-different-games-ipc1 | 0 | 0 | 2026-07-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-update-1104-patch-notes-and-ranked-impact-200v | 1 | 0 | 2026-07-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-thief-shell-loot-fast-extract-clean-win-solo-fm0l | 1 | 0 | 2026-07-02 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-kkv-9sd-and-high-rpm-guns-the-bullet-eating-problem-yrej | 0 | 0 | 2026-07-01 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-thief-shell-grapple-holotag-dominance-wont-last-dkkj | 0 | 0 | 2026-06-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-climb-playbook-the-solo-path-this-week-crtd | 0 | 0 | 2026-06-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-cradle-evolution-mid-season-reset-and-what-it-changes-ylsy | 0 | 0 | 2026-06-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-best-guns-debate-what-the-lobby-is-actually-running-y1jb | 0 | 0 | 2026-06-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-squad-finding-the-communitys-real-growing-pain-70ud | 0 | 0 | 2026-06-27 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-climb-playbook-thief-and-assassin-lead-this-week-h2y3 | 0 | 0 | 2026-06-27 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-holotag-tier-benchmarks-what-each-rank-actually-requires-r4lm | 1 | 0 | 2026-06-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-sponsored-survival-removal-players-react-to-the-loss-10zq | 0 | 0 | 2026-06-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-assassin-shell-night-marsh-pvp-breakdown-vi1r | 0 | 0 | 2026-06-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-patch-1103-ranked-impact-breakdown-5ku9 | 0 | 0 | 2026-06-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-climb-playbook-vandal-gunfight-strategy-this-week-qbjj | 1 | 0 | 2026-06-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-climb-playbook-the-assassin-thief-solo-strategy-9inb | 1 | 0 | 2026-06-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-season-2-bugs-softlocks-server-drops-and-account-hacks-duv6 | 0 | 0 | 2026-06-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-season-2-progression-nerfs-steam-versus-reddit-o76k | 0 | 0 | 2026-06-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-economy-patch-what-slower-cradle-xp-means-for-progression-y4f1 | 0 | 0 | 2026-06-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-economy-dev-update-how-the-loot-nerf-shifts-the-meta-8db8 | 0 | 0 | 2026-06-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-season-2-tech-issues-the-bugs-players-are-actually-hitting-7t9y | 0 | 0 | 2026-06-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-season-2-economy-nerf-what-the-cradle-xp-cuts-mean-for-you-jupf | 0 | 0 | 2026-06-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-cradle-guide-which-tracks-to-prioritize-first-j8ar | 0 | 0 | 2026-06-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-patch-1102-carri-returns-and-solo-ranked-implications-s2c4 | 0 | 0 | 2026-06-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-update-1102-carri-returns-what-the-patch-actually-says-s0cb | 0 | 0 | 2026-06-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-update-1102-carri-returns-and-what-it-means-for-ranked-2r7y | 0 | 0 | 2026-06-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-patch-1102-ranked-impact-what-carri-changes-26f2 | 0 | 0 | 2026-06-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-battle-pistol-meta-s2-sidearm-surge-signal-yl4b | 1 | 0 | 2026-06-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-holotag-ranks-what-each-tier-actually-requires-yewz | 0 | 0 | 2026-06-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-night-marsh-mode-community-split-on-survival-horror-direction-y24v | 0 | 0 | 2026-06-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-this-week-solo-queue-survival-guide-6zxt | 0 | 0 | 2026-06-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-v85-circuit-breaker-clips-shotgun-meta-signal-6y5g | 0 | 0 | 2026-06-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-solo-queue-bug-frustrates-community-broken-matchmaking-overs-gzp6 | 0 | 0 | 2026-06-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-energy-weapons-guide-volt-battery-surge-in-s2-meta-sc4e | 0 | 0 | 2026-06-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-player-count-drop-sparks-shutdown-fears-solo-queue-frustratio-s4ca | 1 | 1 | 2026-06-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-update-110-recap-the-s2-changes-you-missed-u8mo | 0 | 0 | 2026-06-13 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-meta-coverage-content-signal-shortage-0tvl | 0 | 0 | 2026-06-13 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-this-week-thief-dominance-strategy-arjk | 0 | 0 | 2026-06-13 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-free-trial-analysis-content-drought-exposes-tutorial-gap-ap4h | 0 | 0 | 2026-06-13 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-season-2-performance-divide-steam-reviews-rally-while-reddit-ajcj | 0 | 0 | 2026-06-13 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/content-drought-exposes-marathons-tutorial-gap-single-youtube-creator--l3a1 | 0 | 0 | 2026-06-12 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/season-2-wipe-reset-exposes-marathons-retention-crisis-slickfrees-cryo-v5gx | 0 | 0 | 2026-06-12 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-divided-season-2-start-tech-support-queue-meets-endgame-cele-uyz7 | 0 | 0 | 2026-06-12 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/season-2-faction-upgrade-trap-community-discovers-most-armory-investme-5c5k | 0 | 0 | 2026-06-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/faction-power-balance-the-season-2-progression-meta-that-reveals-which-fag7 | 0 | 0 | 2026-06-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/faction-upgrade-hierarchy-exposed-community-analysis-confirms-which-se-f6wy | 0 | 0 | 2026-06-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-community-goes-silent-this-cycle-reddit-bug-reports-and-posit-f3ft | 0 | 0 | 2026-06-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-technical-frustration-meets-twitch-weapon-spotlight-communit-qba0 | 0 | 0 | 2026-06-10 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-40-price-tag-triggers-existential-crisis-a2ny | 0 | 0 | 2026-06-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/toodiffizzle-hits-level-100-as-marathons-season-2-grind-takes-shape-9gdr | 0 | 0 | 2026-06-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/d54-battle-pistol-breaks-out-of-c-tier-prison-ciggaris-1v2-clutch-sign-js1g | 0 | 0 | 2026-06-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/aiiygatorz-clutches-impossible-1v3-after-18-hour-marathon-stream-jj4g | 0 | 0 | 2026-06-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/complex-boss-farming-confirms-pve-weapon-hierarchy-seraphmaxs-24k-view-ukyt | 1 | 0 | 2026-06-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-season-2-weapon-mod-priority-what-new-runners-should-chase-fi-ujjt | 1 | 0 | 2026-06-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/this-weeks-ranked-climb-strategy-the-stealth-shell-meta-thats-breaking-4fwu | 0 | 0 | 2026-06-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-open-play-week-extension-reveals-the-real-season-2-problem-i-4ea1 | 0 | 0 | 2026-06-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-vanishes-from-its-own-algorithm-real-runner-videos-dominate-s-4c3m | 1 | 0 | 2026-06-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/faction-armory-economics-reshape-early-season-meta-credit-scarcity-for-fc6q | 0 | 0 | 2026-06-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-hour-count-divide-gets-deeper-steam-reviews-expose-the-real--evts | 0 | 0 | 2026-06-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/essential-weapon-mod-builds-for-new-runners-start-here-before-you-spec-no19 | 1 | 0 | 2026-06-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-steam-reviews-reveal-the-real-season-2-story-hour-count-tell-ymri | 1 | 0 | 2026-06-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/server-apocalypse-confirms-pve-first-weapon-hierarchy-launch-week-disa-i80s | 1 | 0 | 2026-06-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-season-2-launch-week-crashes-into-reality-the-silent-subredd-hfrw | 0 | 0 | 2026-06-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-says-marathon-is-very-positive-while-reddit-goes-silent-the-seas-rncb | 0 | 0 | 2026-06-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-season-2-server-meltdown-exposes-a-bitter-truth-reddit-rages-2rpc | 0 | 0 | 2026-06-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-season-2-launch-crisis-what-ranked-players-need-to-know-clpz | 0 | 0 | 2026-06-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-season-2-patch-impact-server-issues-hide-major-ranked-changes-mtwk | 0 | 0 | 2026-06-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-season-2-launch-disaster-splits-the-community-server-meltdow-mslh | 0 | 0 | 2026-06-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/season-2-ranked-reset-how-to-climb-fast-on-day-one-x203 | 0 | 0 | 2026-06-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/season-2-arsenal-builds-essential-weapon-mod-setups-for-new-runners-x13x | 0 | 0 | 2026-06-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/your-first-season-2-loadout-day-one-build-recommendations-7flq | 0 | 0 | 2026-06-02 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/this-weeks-ranked-climb-conquest-lmg-meta-makes-december-the-easy-seas-gy9d | 1 | 0 | 2026-06-02 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-season-1-endgame-rush-exposes-the-communitys-fomo-addiction--rfpk | 0 | 0 | 2026-06-01 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/night-marsh-horror-meta-emerges-season-2-environmental-hazards-reshape-r6ec | 0 | 0 | 2026-06-01 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/energy-economy-crisis-volt-battery-weapons-create-heat-management-nigh-luu0 | 1 | 0 | 2026-05-31 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-hours-played-tell-two-different-stories-steam-reviews-split--lbth | 0 | 0 | 2026-05-31 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/faction-upgrade-crisis-season-2-reset-exposes-upgrade-path-dependencie-5go2 | 1 | 0 | 2026-05-30 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/this-weeks-ranked-climb-why-assassin-is-the-solo-queue-answer-5bh8 | 0 | 0 | 2026-05-30 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/hardline-precision-rifle-defines-holotag-meta-23-damage-mid-range-spec-h38s | 1 | 0 | 2026-05-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-destiny-3-protest-vote-backfires-high-hour-players-call-out--gsnk | 0 | 0 | 2026-05-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/free-to-play-week-disrupts-ranked-ecosystem-season-2-launch-creates-tw-08rn | 0 | 0 | 2026-05-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-bungie-fatigue-hits-different-513-hour-player-still-cant-get-9pdp | 1 | 0 | 2026-05-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-art-direction-becomes-the-new-marmite-you-will-either-love-i-jwfd | 0 | 0 | 2026-05-27 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/pvp-spotlight-reveals-gunplay-maturation-one-hour-deep-dive-exposes-ma-tyvi | 1 | 0 | 2026-05-27 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-destiny-baggage-gets-heavy-but-150-hour-players-push-back-ha-tx28 | 0 | 0 | 2026-05-27 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-rifle-renaissance-mid-range-meta-emerges-as-squad-coordinati-y5zl | 0 | 0 | 2026-05-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-assassin-shell-sits-on-the-bench-tied-with-rook-for-6th-plac-y1y2 | 0 | 0 | 2026-05-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-playtime-warriors-draw-battle-lines-685-hours-vs-7-hours-tel-7yf7 | 0 | 0 | 2026-05-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/v99-channel-rifle-breakout-nextlevel-jj-spotlight-signals-energy-snipe-7vcq | 0 | 0 | 2026-05-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-poison-engine-the-season-2-dot-meta-that-turns-st-ddwt | 0 | 0 | 2026-05-26 | **INDEXED** | **YES** |
| https://cyberneticpunks.com/intel/rook-week-the-ranked-climb-strategy-built-for-marathons-retention-cris-db15 | 1 | 0 | 2026-05-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/destiny-2s-death-throws-marathon-under-the-bus-but-steam-players-fight-d7ha | 0 | 0 | 2026-05-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-meta-the-v99-channel-rifle-long-range-assassination-build-ielf | 1 | 0 | 2026-05-25 | **INDEXED** | **YES** |
| https://cyberneticpunks.com/intel/post-destiny-migration-wave-new-player-influx-reshapes-accessibility-m-nwi9 | 0 | 0 | 2026-05-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-holotag-tier-skill-requirements-the-build-thresholds-that-act-nkz2 | 0 | 0 | 2026-05-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-mastery-surge-slickfrees-factory-solo-performance-reveals-s7yu | 0 | 0 | 2026-05-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-performance-war-divides-pc-players-barely-80-fps-on-overkill-x6si | 0 | 0 | 2026-05-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/ranked-mode-split-exposed-solo-climb-vs-squad-coordination-creates-fun-2cot | 0 | 0 | 2026-05-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-hardcore-wall-splits-steam-community-overwhelming-to-learn-a-24f4 | 1 | 0 | 2026-05-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/faction-power-ranking-exposed-sekiguchis-ability-economy-dominance-res-7vx2 | 0 | 0 | 2026-05-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/ranked-cryo-archive-climbing-strategy-for-the-may-24-28-window-7eda | 0 | 0 | 2026-05-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-cryo-archive-solo-demand-hits-breaking-point-let-me-run-it-a-74yf | 1 | 0 | 2026-05-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/compiler-speed-kill-engine-the-biotoxic-disinjector-dot-meta-that-melt-mhde | 0 | 0 | 2026-05-23 | **INDEXED** | **YES** |
| https://cyberneticpunks.com/intel/compiler-speed-kill-evolution-endgame-boss-optimization-signals-power--mb94 | 0 | 0 | 2026-05-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-veterans-double-down-on-marathon-defense-while-destiny-players-s-rb4k | 0 | 0 | 2026-05-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/casual-player-exodus-bungie-director-admits-too-sweaty-meta-forces-sea-1lix | 0 | 0 | 2026-05-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-community-goes-full-help-mode-lfg-threads-flood-reddit-as-sea-1hhy | 0 | 0 | 2026-05-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-hardcore-identity-crisis-gets-official-confirmation-bungie-a-bjdl | 0 | 0 | 2026-05-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/shell-experimentation-wave-triage-cinematic-triggers-cross-shell-explo-gjni | 1 | 0 | 2026-05-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-rifle-meta-why-long-range-dominance-wins-ranked-games-ltw7 | 0 | 0 | 2026-05-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-destiny-divorce-gets-bitter-steam-players-defend-the-trade-w-lm2t | 0 | 0 | 2026-05-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-holotag-skill-benchmarks-what-separates-each-tier-qw53 | 0 | 0 | 2026-05-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/knife-controversy-ignites-melee-combat-inconsistency-exposes-core-syst-qttd | 0 | 0 | 2026-05-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/assault-rifle-convergence-m77-and-impact-har-define-multi-range-flexib-vy9l | 0 | 0 | 2026-05-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/essential-weapon-mod-builds-for-new-runners-start-here-before-you-spec-vvm6 | 0 | 0 | 2026-05-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-steam-players-write-love-letters-while-community-goes-missin-vlqa | 0 | 0 | 2026-05-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/the-precision-rifle-meta-why-long-range-dominance-wins-ranked-games-10i2 | 1 | 0 | 2026-05-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-steam-veterans-draw-line-in-sand-dont-casualize-our-perfect-g-0jzi | 0 | 0 | 2026-05-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-rifle-meta-guide-long-range-dominance-for-ranked-runners-5x4r | 1 | 0 | 2026-05-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-season-2-announcement-meets-community-crickets-players-too-b-5qvk | 0 | 0 | 2026-05-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-rifle-dominance-stryder-m1t-and-hardline-pr-define-mid-range-asau | 0 | 0 | 2026-05-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-community-goes-radio-silent-on-major-patch-109-reddit-activit-gdq1 | 1 | 0 | 2026-05-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/sniper-supremacy-surge-longshot-and-v99-channel-rifle-break-range-meta-m4b4 | 0 | 0 | 2026-05-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/energy-weapon-renaissance-v75-scar-and-circuit-breaker-lead-volt-batte-qska | 1 | 0 | 2026-05-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/demolition-hmg-warden-hunt-engine-update-109s-heavy-armor-counter-meta-qq0w | 1 | 0 | 2026-05-20 | **INDEXED** | **YES** |
| https://cyberneticpunks.com/intel/marathon-community-stuck-in-cryo-archive-lfg-purgatory-while-steam-pla-qkxx | 0 | 0 | 2026-05-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-community-ghosts-patch-109-as-performance-woes-hit-peak-frust-vyto | 0 | 0 | 2026-05-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/runner-reactions-how-the-community-is-responding-to-marathons-final-s1-0l5r | 1 | 0 | 2026-05-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/assault-rifle-stability-m77-and-impact-har-rise-to-counter-season-2-ni-6gbg | 0 | 0 | 2026-05-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/vandal-vs-destroyer-which-shell-wins-more-ranked-games-5y1t | 1 | 0 | 2026-05-19 | **INDEXED** | **YES** |
| https://cyberneticpunks.com/intel/season-2-nightfall-changes-everything-ranked-reset-strategy-guide-fwka | 0 | 0 | 2026-05-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-steam-loyalists-ignore-bungies-season-2-pivot-we-like-it-hos-fmrg | 0 | 0 | 2026-05-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-rifle-triangle-emerges-br33-volley-hardline-pr-and-twin-tap--qfdh | 0 | 0 | 2026-05-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/destroyer-counter-attack-engine-season-2-nightfall-anti-rush-meta-pxpl | 0 | 0 | 2026-05-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/season-1-finale-ranked-climb-pre-season-2-positioning-strategy-urfj | 0 | 0 | 2026-05-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/sniper-rifle-meta-shift-outland-and-v99-channel-rifle-define-season-2--5d7g | 0 | 0 | 2026-05-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-lfg-crisis-exposes-the-real-season-1-problem-its-not-balance-eteq | 1 | 0 | 2026-05-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/brrt-smg-flechette-revolution-1000-rpm-cqb-monster-climbs-meta-as-seas-pp5t | 1 | 0 | 2026-05-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-season-2-roadmap-everything-joe-ziegler-just-revealed-may-14--z82m | 0 | 0 | 2026-05-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/demolition-hmg-engine-season-2-tank-meta-preparation-4m88 | 1 | 0 | 2026-05-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/season-2-hype-check-steam-says-yes-but-nobodys-talking-details-486t | 0 | 0 | 2026-05-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/repeater-hpr-engine-season-2-long-range-meta-revolution-9lcw | 1 | 0 | 2026-05-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/shotgun-meta-revolution-v85-circuit-breaker-and-wstr-combat-rise-as-se-keae | 0 | 0 | 2026-05-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/brrt-smg-engine-end-of-season-meta-disruption-k1bh | 1 | 0 | 2026-05-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/season-2-holotag-tier-requirements-what-each-rank-actually-takes-os9v | 0 | 0 | 2026-05-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-marathon-players-trust-the-long-game-while-international-server--okn6 | 1 | 0 | 2026-05-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-community-stays-silent-on-season-2-while-steam-veterans-doubl-tkl8 | 0 | 0 | 2026-05-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/volt-weapon-ecosystem-collapse-v-series-arsenal-crashes-to-lowest-tier-zc5r | 0 | 0 | 2026-05-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-marathon-players-quietly-celebrate-core-game-strengths-while-sea-yjn3 | 1 | 0 | 2026-05-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-community-goes-silent-as-season-2-details-remain-vague-reddit-3tfl | 0 | 0 | 2026-05-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-steam-players-celebrate-solo-progress-while-season-2-anticipa-8o2m | 0 | 0 | 2026-05-13 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-steam-veterans-push-through-season-fatigue-while-self-revive--dp1c | 0 | 0 | 2026-05-13 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/repeater-hpr-engine-post-self-revive-nerf-precision-revolution-iz6k | 0 | 0 | 2026-05-13 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/post-1063-holotag-requirements-the-skills-that-separate-each-tier-iyxe | 0 | 0 | 2026-05-13 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/complete-marathon-optic-mod-guide-essential-magnification-and-precisio-y6pf | 0 | 0 | 2026-05-12 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/v22-volt-thrower-engine-post-security-update-sponsored-kit-meta-revolu-y4d0 | 0 | 0 | 2026-05-12 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-steam-veterans-see-golden-age-potential-while-sony-scrambles--xtqp | 0 | 0 | 2026-05-12 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/prestige-salvage-drop-changes-just-made-map-event-control-mandatory-83xa | 1 | 0 | 2026-05-12 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/wstr-combat-shotgun-nerfed-what-ranked-solo-players-should-swap-to-d608 | 1 | 0 | 2026-05-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/v75-scar-voltage-surge-volt-battery-meta-dominates-mid-range-as-season-io32 | 0 | 0 | 2026-05-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/post-1063-holotag-tier-build-requirements-what-each-rank-demands-icgf | 0 | 0 | 2026-05-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-marathon-players-quietly-satisfied-while-sony-battles-financial--i11a | 1 | 0 | 2026-05-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-community-split-on-performance-vs-cheating-priorities-reddit--n3po | 0 | 0 | 2026-05-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/recon-shell-intel-surge-echo-pulse-meta-dominates-squad-ranked-as-secu-sojp | 0 | 0 | 2026-05-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/how-to-climb-ranked-this-week-post-security-update-shell-priority-guid-s9sg | 0 | 0 | 2026-05-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-marathon-players-embrace-learning-curve-reality-while-bungie-bat-s056 | 0 | 0 | 2026-05-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/destroyer-shell-terror-sweep-iron-frame-tank-meta-dominates-ranked-squ-xpuw | 0 | 0 | 2026-05-10 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/complete-marathon-barrel-mod-guide-essential-range-and-stability-upgra-xdor | 0 | 0 | 2026-05-10 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-marathon-players-discover-post-launch-sweet-spot-best-extraction-23j5 | 0 | 0 | 2026-05-10 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-holotag-tier-requirements-what-each-rank-actually-demands-7jwu | 0 | 0 | 2026-05-10 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-players-say-marathon-1063-fixed-nothing-that-actually-matters-cbv9 | 1 | 0 | 2026-05-10 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/ares-rg-theory-post-security-update-prestige-salvage-engine-hf5s | 1 | 0 | 2026-05-09 | **INDEXED** | **YES** |
| https://cyberneticpunks.com/intel/wstr-shotgun-renaissance-combat-shotgun-defies-one-shot-nerf-trends-as-my1n | 0 | 0 | 2026-05-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-marathon-community-quietly-celebrates-atmospheric-victory-while--majh | 1 | 0 | 2026-05-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-rifle-revolution-hardline-pr-and-br33-volley-drive-mid-range-rx56 | 0 | 0 | 2026-05-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/complete-marathon-generator-and-optics-guide-essential-energy-and-sigh-rnji | 1 | 0 | 2026-05-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/the-range-counter-to-vandal-that-won-ranked-this-week-rek0 | 0 | 0 | 2026-05-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-veterans-love-marathon-despite-sonys-765m-loss-players-care-abou-rab5 | 0 | 0 | 2026-05-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-marathon-players-praise-underrated-gem-while-bungie-quietly-figh-wkwo | 0 | 0 | 2026-05-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/v75-scar-voltage-meta-this-weeks-solo-ranked-express-lane-wk2k | 0 | 0 | 2026-05-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/v75-scar-voltage-surge-charge-based-ar-claims-ranked-crown-as-volt-bat-1o0f | 1 | 0 | 2026-05-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-marathon-veterans-are-singing-literally-while-new-player-onboard-0s6m | 0 | 0 | 2026-05-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/carri-protocol-salvage-economy-ranked-players-hidden-advantage-bf2d | 0 | 0 | 2026-05-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-anti-cheat-update-shakes-ranked-false-positive-risk-vs-clean--gg0h | 1 | 0 | 2026-05-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-shrugs-at-major-security-push-while-enhanced-sponsored-kit-r-g9hj | 0 | 0 | 2026-05-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/ares-railgun-nerf-shockwaves-one-shot-meta-crumbles-as-update-1063-tar-m0uo | 1 | 0 | 2026-05-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-free-enhanced-kits-lock-pre-made-crews-into-perimeter-queue-m-lkdz | 0 | 0 | 2026-05-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-reviews-expose-marathons-hidden-divide-extraction-magic-vs-multi-lelb | 0 | 0 | 2026-05-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/ares-rg-post-nerf-theory-the-123-damage-precision-engine-still-dominat-qioy | 1 | 0 | 2026-05-07 | **INDEXED** | **YES** |
| https://cyberneticpunks.com/intel/community-completely-ignores-sponsored-queue-overhaul-while-wrestling--qcjc | 0 | 0 | 2026-05-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-goes-radio-silent-on-cryo-archive-while-steam-reviews-stay-f-vbcz | 0 | 0 | 2026-05-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-rifle-meta-explosion-br33-volley-rifle-ascends-as-chloeglorp-16n1 | 1 | 0 | 2026-05-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/free-enhanced-kits-change-ranked-queue-access-perimeter-meta-shift-0jqf | 0 | 0 | 2026-05-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-radio-silence-on-sponsored-queue-changes-while-steam-reviews-0gbu | 0 | 0 | 2026-05-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-1063-wstr-combat-shotgun-meta-solidifies-destroyer-dominance-5mki | 0 | 0 | 2026-05-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-silent-treatment-for-carri-while-steam-reviews-split-on-solo-5lew | 0 | 0 | 2026-05-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/prestige-salvage-economy-shift-map-events-drive-late-game-weapon-acces-b5kj | 0 | 0 | 2026-05-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-fractures-over-carri-launch-reddits-technical-meltdown-vs-st-akti | 0 | 0 | 2026-05-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-1063-implant-bug-fix-hurting-hands-v4-economy-stabilizes-fqke | 0 | 0 | 2026-05-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-technical-breakdown-overshadows-latest-patch-community-battl-foih | 0 | 0 | 2026-05-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-goes-radio-silent-on-major-update-while-technical-problems-d-km8o | 0 | 0 | 2026-05-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/v-series-energy-weapons-surge-volt-battery-meta-transforms-ranked-comb-q9aj | 0 | 0 | 2026-05-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-heat-management-masterclass-advanced-thermal-control-for-rank-pog9 | 0 | 0 | 2026-05-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-shells-power-ranking-meta-analysis-for-every-skill-level-v2hu | 1 | 0 | 2026-05-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-1062-grenade-defense-meta-critical-hit-changes-ranked-priorit-urn3 | 0 | 0 | 2026-05-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-reviews-reveal-marathons-knife-problem-while-celebrating-wstr-co-uqfv | 1 | 0 | 2026-05-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/wstr-combat-shotgun-comeback-marathon-1062-resurrects-cqb-meta-zz8d | 1 | 0 | 2026-05-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-splits-on-technical-issues-while-remaining-silent-on-balance-zszv | 1 | 0 | 2026-05-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-1062-pve-meta-explosion-ai-damage-bonus-reshapes-ranked-loado-4uuo | 0 | 0 | 2026-05-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/reddit-goes-silent-on-ares-nerf-while-steam-reviews-reveal-the-real-pr-4pkp | 0 | 0 | 2026-05-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/post-1062-demolition-hmg-terror-the-new-anti-grenade-tank-meta-aaas | 0 | 0 | 2026-05-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-celebrates-grenade-spam-fix-while-ignoring-deeper-matchmakin-a0db | 0 | 0 | 2026-05-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/vandal-ascends-disrupt-cannon-buffs-drive-combat-shell-renaissance-fp8g | 0 | 0 | 2026-05-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-1062-anti-projectile-meta-shell-mobility-rankings-reshuffled-f1xu | 0 | 0 | 2026-05-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-reviews-reveal-marathons-core-problem-amazing-gunplay-wrapped-in-eqpj | 1 | 0 | 2026-05-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-rifle-dominance-long-range-meta-capitalizes-on-wstr-shotgun--kesw | 1 | 0 | 2026-05-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-reviews-tell-different-story-than-player-count-headlines-communi-jrgq | 0 | 0 | 2026-05-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/reddit-drowns-in-lfg-posts-while-steam-reviews-question-marathons-long-oxsq | 0 | 0 | 2026-05-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/faction-warfare-sekiguchi-ability-builds-dominate-post-patch-ranked-me-up2n | 0 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-new-player-weapon-selection-guide-best-primary-for-your-first-u8mf | 1 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/free-weekly-sponsored-kits-break-ranked-economy-what-to-prioritize-u289 | 0 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-searches-for-teams-while-ranked-meta-questions-swirl-around--tx0p | 0 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/grenade-spam-lockdown-explosive-meta-faces-overhaul-as-bungie-promises-02jc | 0 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-quietly-embraces-latest-wstr-buff-while-player-count-concern-z19h | 0 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/ares-railgun-nerf-imminent-one-shot-meta-under-fire-as-bungie-targets--4qvw | 0 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/ares-rg-one-shot-crisis-marathon-1062-nerf-reshapes-ranked-sniping-44rl | 1 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/wstr-combat-shotgun-revival-post-1062-assassin-cqb-devastation-43ur | 0 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/wstr-resurrection-combat-shotgun-buffs-shake-cqb-meta-hierarchy-9q9c | 1 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/ares-railgun-post-1062-the-one-shot-king-returns-with-precision-core-s-95bh | 1 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-split-on-wstr-buff-as-player-count-concerns-dominate-discuss-91zu | 1 | 0 | 2026-05-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/complete-weapon-mastery-guide-finding-your-primary-for-every-shell-bui-6f3g | 1 | 0 | 2026-04-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-celebrates-carri-protocol-as-new-endgame-opens-amidst-techni-68ua | 1 | 0 | 2026-04-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/irons-rook-outpost-banking-post-patch-sponsored-kit-economy-revolution-67ye | 1 | 0 | 2026-04-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-grinds-through-performance-woes-as-lfg-activity-surges-post--jhgo | 1 | 0 | 2026-04-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/volt-weapon-surge-energy-arsenal-exploits-post-wstr-power-vacuum-huv8 | 1 | 0 | 2026-04-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/ai-uplink-security-room-trap-squad-positioning-meta-post-dire-marsh-fi-g61w | 0 | 0 | 2026-04-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-questions-dire-marsh-experimental-test-as-players-debate-map-ovdp | 0 | 0 | 2026-04-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/armory-revolution-enhanced-kit-stock-surge-creates-new-loadout-meta-n101 | 0 | 0 | 2026-04-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/zonex-shock-value-content-misses-post-1061-sponsored-kit-meta-shift-ladx | 0 | 0 | 2026-04-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-questions-core-game-direction-as-technical-issues-pile-up-tdzg | 0 | 0 | 2026-04-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-weapon-renaissance-post-wstr-nerf-creates-new-meta-hierarchy-rwln | 1 | 0 | 2026-04-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/recruits-finally-drop-viable-meds-as-community-debates-pve-vs-pvp-bala-8ao9 | 1 | 0 | 2026-04-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/checktheereplays-destroyer-triple-kill-post-wstr-nerf-timing-analysis-4qm3 | 0 | 0 | 2026-04-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-splits-on-destiny-2-resources-as-players-question-marathons--z5lo | 0 | 0 | 2026-04-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/knife-run-renaissance-zero-to-hero-strategy-exploits-depleted-med-surp-xcru | 0 | 0 | 2026-04-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/knife-to-kit-progression-shows-post-patch-depleted-med-scaling-vlsc | 1 | 0 | 2026-04-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/perkanator-weapon-tier-list-pre-wstr-nerf-analysis-now-obsolete-14n1 | 0 | 0 | 2026-04-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-celebrates-sponsored-kit-overhaul-as-med-economy-gets-long-a-9rhx | 0 | 0 | 2026-04-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/perkanators-tier-list-ignores-post-patch-depleted-kit-economy-shift-61vq | 0 | 0 | 2026-04-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-mixed-on-dire-marsh-test-as-players-debate-crowding-vs-actio-ebg5 | 0 | 0 | 2026-04-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/irons-outpost-credit-farm-shows-why-banking-still-beats-rank-climbing-b7wp | 0 | 0 | 2026-04-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-rallies-around-trades-and-technical-issues-as-updates-roll-i-jbsp | 0 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/bully-smg-meta-analysis-post-wstr-nerf-heavy-round-dominance-irwf | 0 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/compiler-loot-revolution-biotoxic-drops-and-depleted-stack-changes-res-hw9d | 1 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/toggle-zoom-persistence-bug-fix-creates-new-sniper-meta-window-g3fl | 0 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-cheers-wstr-nerf-while-early-dire-marsh-test-splits-opinion-o1i0 | 0 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/dire-marsh-density-crisis-bungie-cuts-crew-size-in-experimental-queue-mgjt | 0 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/boston-marathon-content-floods-x-marathon-game-mentions-buried-in-nois-kqgj | 1 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-players-love-solo-friendly-med-buffs-as-x-celebrates-wstr-nerfs-t94u | 0 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/dire-marsh-crew-reduction-ranked-impact-analysis-prwj | 0 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-complete-guide-security-room-5-hybrid-weapon-mast-z4vf | 0 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-splits-on-dire-marsh-test-as-wstr-nerf-relief-meets-map-conc-y3n0 | 1 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-compiler-hunt-v99-channel-rifle-sniper-build-meta-analysi-xigk | 0 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-chaos-community-meltdown-over-compiler-difficulty-urug | 0 | 0 | 2026-04-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-celebrates-anti-virus-pack-fix-while-cheating-concerns-persi-355m | 0 | 0 | 2026-04-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/zonex-teases-wstr-nerf-analysis-but-delivers-no-mechanical-depth-zrvr | 0 | 0 | 2026-04-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/pc-performance-issues-plague-marathon-as-community-searches-for-techni-7vb7 | 0 | 0 | 2026-04-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/slickfrees-squad-wipe-shows-post-wstr-meta-shift-to-sustained-dps-4rk2 | 1 | 0 | 2026-04-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/players-embrace-depleted-med-buffs-while-wstr-nerfs-get-mixed-receptio-d4q4 | 0 | 0 | 2026-04-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-players-praise-solo-friendly-updates-while-x-buzzes-over-balance-i65z | 0 | 0 | 2026-04-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/depleted-consumable-revolution-economy-changes-flip-support-shell-tier-gld4 | 0 | 0 | 2026-04-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/imnexusss-weapon-tier-list-ignores-critical-post-1061-balance-changes-evdd | 0 | 0 | 2026-04-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/update-1061-complete-balance-guide-wstr-nerfs-and-meta-shifts-odlz | 1 | 0 | 2026-04-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/wstr-nerf-lands-as-community-questions-bungies-balance-philosophy-nc9b | 1 | 0 | 2026-04-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/consumable-collapse-cryo-archive-bug-devastates-ranked-supply-lines-lsv6 | 0 | 0 | 2026-04-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/depleted-kit-economy-overhaul-reshapes-low-risk-extraction-meta-k4nd | 0 | 0 | 2026-04-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/br33-victory-lap-rollout-gets-lukewarm-reception-as-content-cycle-fati-sl2o | 0 | 0 | 2026-04-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/voltage-supremacy-energy-weapons-dominate-post-wstr-landscape-quid | 0 | 0 | 2026-04-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-players-rally-around-marathon-as-mid-season-content-wave-hits-xc1w | 0 | 0 | 2026-04-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/demolition-democracy-carri-kits-democratize-heavy-weapon-access-vsfa | 0 | 0 | 2026-04-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/imnexusss-weapon-tier-list-misses-post-wstr-nerf-meta-realities-tyho | 1 | 0 | 2026-04-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-players-praise-marathons-bold-cyberpunk-vision-amid-population-w-26jh | 0 | 0 | 2026-04-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-dominance-post-wstr-balance-creates-sniper-rifle-meta-0qnj | 0 | 0 | 2026-04-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/technical-troubles-mar-marathons-mid-season-momentum-as-community-rall-7dye | 0 | 0 | 2026-04-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/anti-virus-economy-shift-cryo-archive-bug-creates-consumable-scarcity-5v3x | 0 | 0 | 2026-04-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/victory-lap-tournament-meta-analysis-what-top-runners-used-to-win-dssx | 0 | 0 | 2026-04-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/performance-woes-and-lfg-struggles-overshadow-marathons-mid-season-hig-cslj | 0 | 0 | 2026-04-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-fragments-over-wstr-nerf-as-new-dire-marsh-sponsored-mode-di-hbbs | 1 | 0 | 2026-04-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/brrt-smg-unique-shotgun-mode-creates-new-cqb-meta-post-wstr-nerf-e5tf | 0 | 0 | 2026-04-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/carri-update-drives-lfg-surge-as-players-hunt-for-cryo-archive-teams-mdvf | 0 | 0 | 2026-04-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/carri-protocol-shifts-ranked-meta-from-solo-aggression-to-crew-coordin-j9g1 | 1 | 0 | 2026-04-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/mid-season-update-sparks-mixed-reactions-as-new-unique-weapon-drops-rmau | 1 | 0 | 2026-04-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/mid-season-update-106-complete-patch-notes-guide-for-every-runner-xq07 | 0 | 0 | 2026-04-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-vault-bugs-frustrate-players-as-lfg-groups-hunt-dna-cards-wq1e | 1 | 0 | 2026-04-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/carri-event-success-solo-proximity-chat-survival-guide-2pb2 | 0 | 0 | 2026-04-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/post-update-crashes-and-voice-chat-bugs-plague-xbox-players-mid-season-1oru | 1 | 0 | 2026-04-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/heavy-weapon-democracy-carri-kits-break-elite-arsenal-monopoly-01wc | 0 | 0 | 2026-04-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/wstr-nerf-creates-shotgun-power-vacuum-who-benefits-most-yday | 0 | 0 | 2026-04-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/post-carri-solo-queue-guide-how-proximity-chat-changes-everything-7rfl | 0 | 0 | 2026-04-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/game-directors-wtf-wstrs-update-splits-community-ahead-of-tuesday-nerf-6n6w | 0 | 0 | 2026-04-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-revolution-br33-victory-lap-unique-dominates-post-wstr-meta-502n | 0 | 0 | 2026-04-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/solo-players-first-week-survival-guide-shells-builds-and-faction-prep-cjpv | 1 | 0 | 2026-04-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-vault-bugs-hit-solo-players-harder-as-carri-pushes-teams-bh8v | 0 | 0 | 2026-04-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/tau-ceti-cup-victory-lap-tournament-meta-lessons-for-ranked-success-hvs7 | 1 | 0 | 2026-04-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-splits-on-bungies-heavy-handed-wstr-nerf-as-cryo-bugs-persis-guoc | 0 | 0 | 2026-04-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/sniper-proliferation-crisis-reveals-marathons-long-range-meta-problem-dhd2 | 0 | 0 | 2026-04-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/carri-event-meta-guide-best-solo-builds-for-proxy-chat-survival-n0dd | 0 | 0 | 2026-04-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/wstr-nerf-drama-overshadows-technical-issues-as-cryo-archive-bugs-pers-lwwk | 0 | 0 | 2026-04-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/faction-economy-collapse-sponsored-kit-revolution-destroys-gear-barrie-kez0 | 0 | 0 | 2026-04-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/wstr-nerf-sparks-mixed-reactions-as-players-brace-for-tuesday-changes-qw4y | 0 | 0 | 2026-04-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/wstr-shotgun-massacre-tuesday-nerf-kills-two-shot-meta-dominance-pcct | 0 | 0 | 2026-04-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/steam-players-split-on-cryo-vault-bugs-as-lfg-groups-push-endgame-cont-w55i | 0 | 0 | 2026-04-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/unfairlys-pvp-death-analysis-exposes-common-ranked-positioning-errors-soau | 1 | 0 | 2026-04-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-buzzes-over-recon-buffs-and-carri-cooperation-push-0yxo | 1 | 0 | 2026-04-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-hybrid-build-post-nerf-tactical-poison-meta-0brd | 0 | 0 | 2026-04-17 | **INDEXED** | **YES** |
| https://cyberneticpunks.com/intel/waxs-sub-second-extraction-shows-free-kit-experimental-meta-shift-xjrj | 0 | 0 | 2026-04-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/carri-event-deep-dive-complete-team-strategy-and-loadout-guide-722y | 0 | 0 | 2026-04-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-fragments-over-lfg-surge-as-eu-servers-struggle-post-update-62a8 | 0 | 0 | 2026-04-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/free-kit-frenzy-railgun-democracy-breaks-faction-weapon-monopolies-4e3e | 0 | 0 | 2026-04-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/carri-protocol-shifts-solo-ranked-meta-toward-objective-play-2oov | 1 | 0 | 2026-04-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-rallies-around-lfg-as-connection-woes-shadow-mid-season-laun-b5mf | 0 | 0 | 2026-04-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-accessibility-crisis-holotag-gear-ante-blocks-casual-play-9e4d | 1 | 0 | 2026-04-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/wstr-combat-shotgun-still-dominates-cqb-despite-106-weapon-adjustments-7pec | 0 | 0 | 2026-04-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-reacts-warmly-to-armory-bug-fixes-as-mid-season-momentum-bui-g7v4 | 0 | 0 | 2026-04-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-holotag-banking-strategy-shows-pre-raid-economic-prep-cqk4 | 1 | 0 | 2026-04-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/carri-event-complete-guide-proximity-chat-and-sponsored-kits-strategy-mful | 1 | 0 | 2026-04-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/smg-collapse-precision-revolution-leaves-close-range-shells-exposed-jh6c | 0 | 0 | 2026-04-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-accessibility-crisis-exposes-marathons-endgame-wall-hrax | 1 | 0 | 2026-04-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-applauds-cooperation-push-but-technical-issues-cloud-update-q9hs | 0 | 0 | 2026-04-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/free-railgun-access-sponsored-kits-eliminate-faction-lock-barriers-ojjj | 0 | 0 | 2026-04-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/performance-woes-hit-5090-users-as-community-splits-on-overrun-changes-v0i0 | 0 | 0 | 2026-04-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/precision-surge-carri-protocol-rewards-push-long-range-meta-forward-ti1b | 0 | 0 | 2026-04-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/markymarks-ambush-play-shows-post-106-team-wipe-potential-rtfr | 1 | 0 | 2026-04-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/free-kit-frenzy-revolutionizes-weapon-access-br33-victory-lap-dominate-yl63 | 0 | 0 | 2026-04-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/asia-server-crisis-and-technical-issues-overshadow-mid-season-launch-546w | 0 | 0 | 2026-04-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/tau-ceti-cup-victory-lap-post-tournament-meta-analysis-and-lessons-b64a | 0 | 0 | 2026-04-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/free-kit-frenzy-experimental-queue-divides-player-base-on-risk-vs-rewa-a18x | 0 | 0 | 2026-04-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/carri-protocol-drives-precision-weapon-surge-8lp8 | 1 | 0 | 2026-04-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/br33-victory-lap-unique-shows-bungies-mid-season-power-creep-problem-6vzu | 0 | 0 | 2026-04-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/waxs-clutch-extraction-shows-why-millisecond-timing-separates-ranks-bz3p | 0 | 0 | 2026-04-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/carri-protocol-sparks-mixed-reactions-as-steam-players-praise-stabilit-kcsr | 0 | 0 | 2026-04-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/carri-protocol-reshapes-cooperation-recon-echo-pulse-dominates-intel-in7c | 0 | 0 | 2026-04-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/dire-marsh-sponsored-queue-complete-knife-only-survival-guide-v8wc | 1 | 0 | 2026-04-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/free-kit-frenzy-launches-as-community-fragments-over-experimental-queu-u5by | 0 | 0 | 2026-04-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/experimental-queue-live-free-kit-frenzy-changes-everything-sfeu | 0 | 0 | 2026-04-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/thief-bug-crashes-into-knife-nerf-as-technical-issues-mount-iny7 | 1 | 0 | 2026-04-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/duos-queue-dies-wednesday-as-community-splits-on-anti-cheat-response-nqi2 | 0 | 0 | 2026-04-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/long-range-revolution-snipers-rise-as-melee-nerfs-reshape-combat-flow-m4zb | 1 | 0 | 2026-04-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/demolition-hmg-shows-promise-post-bubble-shield-nerf-in-1053-k9qf | 1 | 0 | 2026-04-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/ranked-rewards-drive-x-hype-while-reddit-community-quietly-fractures-skub | 0 | 0 | 2026-04-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/post-patch-thief-shell-ranked-solo-domination-after-knife-nerf-rzap | 1 | 0 | 2026-04-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/heavy-rounds-surge-knife-nerfs-bubble-shield-weakness-reshapes-combat-qz9t | 0 | 0 | 2026-04-09 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-quietly-navigates-technical-chaos-while-cryo-lfg-scene-emerg-x5jc | 0 | 0 | 2026-04-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/icemanisaacs-8-hour-gold-key-marathon-exposes-cryo-archive-exploit-win-tv55 | 0 | 0 | 2026-04-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/med-drone-buff-question-ignites-community-debate-on-support-balance-2q50 | 0 | 0 | 2026-04-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/post-nerf-biotoxic-disinjector-build-red-tier-reality-check-24eo | 1 | 0 | 2026-04-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/knife-nerfs-hit-console-players-hardest-assassin-struggles-in-new-meta-zj66 | 1 | 0 | 2026-04-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/ranked-anti-cheat-update-security-team-explains-zero-tolerance-policy-838t | 0 | 0 | 2026-04-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/thief-ranked-mastery-grapple-device-holotag-steal-timing-and-escape-ro-da6n | 0 | 0 | 2026-04-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/duos-experiment-ends-as-community-debates-anti-cheat-response-cj8v | 1 | 0 | 2026-04-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-farm-complaints-miss-the-real-ranked-meta-shift-9lta | 1 | 1 | 2026-04-08 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-frustrated-by-technical-issues-while-devs-push-balance-chang-mimr | 0 | 0 | 2026-04-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-nerfs-hit-while-ranked-rewards-drive-destroyer-surge-kx8n | 0 | 0 | 2026-04-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/shell-guide-videos-flood-market-as-meta-confusion-peaks-jd3a | 0 | 0 | 2026-04-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/recon-echo-pulse-changes-mid-season-update-preview-analysis-rz1l | 0 | 0 | 2026-04-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/bungie-nukes-biotoxic-gun-after-community-revolt-but-audio-issues-pers-r96r | 0 | 0 | 2026-04-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/assassin-shell-gets-console-treatment-still-waiting-for-tech-ocz3 | 0 | 0 | 2026-04-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/med-drone-balance-analysis-why-bungies-community-poll-matters-for-supp-xag8 | 0 | 0 | 2026-04-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/northernranger-attempts-meta-analysis-tier-lists-dont-win-extractions-tcie | 1 | 0 | 2026-04-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/biotoxic-nerf-hits-live-but-ranked-complaints-and-crashes-persist-29w5 | 0 | 0 | 2026-04-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/youtube-marathon-content-analysis-zero-game-relevant-build-data-found-5oiw | 0 | 0 | 2026-04-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-cheers-biotoxic-nerf-as-performance-issues-plague-pc-players-gcb4 | 0 | 0 | 2026-04-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marshyys-budget-build-signals-meta-shift-after-biotoxic-nerf-dork | 1 | 0 | 2026-04-06 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-nerf-sparks-relief-as-performance-issues-persist-ld3w | 0 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-35-damage-nerf-shakes-endgame-meta-knife-nerfs-ne-jzme | 1 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/bertii-asks-the-question-everyones-thinking-inx6 | 1 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-emergency-nerf-hits-live-servers-after-community--qld9 | 0 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/rook-double-barrel-dominance-why-this-shell-excels-in-1v3-clutches-q1fu | 1 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/rook-1v3-clutch-shows-shell-versatility-despite-shotgun-crutch-nq8i | 0 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/wstr-combat-shotgun-four-shot-tech-advanced-reload-manipulation-guide-w7iw | 0 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/bd-nerf-lands-as-community-splits-on-exploit-warnings-vs-performance-i-vi4b | 1 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-nerf-guide-post-balance-weapon-tier-shifts-1ir9 | 0 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-nerf-sparks-relief-as-bugs-plague-early-access-0rx0 | 0 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/brrt-smg-surge-biotoxic-nerf-reshapes-cqb-meta-zd2k | 0 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/garchomps-brrt-smg-clutches-high-octane-cqb-on-outpost-xxcy | 0 | 0 | 2026-04-05 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/pinwheel-route-optimization-maximize-credits-before-mid-season-changes-6awn | 1 | 0 | 2026-04-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/pray2play-identifies-meta-shift-repeater-hpr-overtaking-snipers-2sue | 0 | 0 | 2026-04-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/solo-outpost-economy-guide-extract-timing-vs-risk-after-mid-season-bw1j | 0 | 0 | 2026-04-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/tryhxrds-pinnacle-climb-setup-mid-range-versatility-analysis-fbes | 0 | 0 | 2026-04-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/pinnacle-players-drive-stealth-meta-while-bungie-preps-combat-rebalanc-egxa | 0 | 0 | 2026-04-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-awaits-mid-season-balance-shake-up-as-recon-changes-preview-l829 | 0 | 0 | 2026-04-04 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/mid-season-update-april-14-recon-echo-pulse-buffs-audio-fix-guide-qkym | 1 | 0 | 2026-04-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/staycation-shows-ranked-holotag-psychology-b-tier-distraction-play-mzqc | 0 | 0 | 2026-04-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-thief-speed-based-holotag-extraction-for-new-environment-uhuw | 1 | 0 | 2026-04-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/pixelbros-triage-guide-shows-promise-but-lacks-competitive-edge-s363 | 0 | 0 | 2026-04-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/bungie-teases-mid-season-balance-shake-up-while-community-splits-on-up-zzre | 0 | 0 | 2026-04-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/budget-build-meta-loony-lemons-gear-economy-theory-x7jc | 0 | 0 | 2026-04-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/recon-echo-pulse-changes-mid-season-balance-reshapes-intel-shell-5pq5 | 0 | 0 | 2026-04-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/bungie-previews-major-balance-shake-up-knives-snipers-bubble-shields-5098 | 0 | 0 | 2026-04-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/unfairly-breaks-down-ranked-mistakes-b-tier-educational-content-2563 | 1 | 0 | 2026-04-03 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/gold-boss-controller-clutch-shows-assassin-shell-promise-77cu | 0 | 0 | 2026-04-02 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/nirvous-partnership-community-growth-what-creator-support-means-for-ma-g5uh | 1 | 0 | 2026-04-02 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/noctuslunae-shows-team-first-mindset-but-lacks-viewership-pull-c62q | 1 | 0 | 2026-04-02 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/battle-pass-rush-maximize-xp-before-mid-season-update-drops-q0t2 | 0 | 0 | 2026-04-02 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/console-controls-crisis-overshadows-patch-fix-praise-p95c | 0 | 0 | 2026-04-02 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/budget-destroyer-low-cost-builds-that-still-force-holotag-kills-xycn | 0 | 0 | 2026-04-01 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/budget-meta-analysis-loony-lemons-economy-build-theory-vr1f | 0 | 0 | 2026-04-01 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/duo-queue-week-2-breakdown-dire-marsh-tactical-shifts-squad-synergies-4ce1 | 0 | 0 | 2026-04-01 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/holotag-theft-meta-ranked-distraction-tactics-hit-different-0pcn | 0 | 0 | 2026-04-01 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/outpost-changes-in-update-1052-navigation-and-loot-route-adjustments-9le9 | 0 | 0 | 2026-04-01 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/outpost-duos-meta-v85-circuit-breaker-shotgun-dominance-analysis-89v6 | 0 | 0 | 2026-04-01 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-update-1052-complete-breakdown-slide-cancel-fix-outpost-chang-ei12 | 1 | 0 | 2026-03-31 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/slide-cancel-fix-hits-marathon-as-performance-woes-dominate-player-tal-dsb6 | 0 | 0 | 2026-03-31 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-balance-overhaul-preview-zieglers-big-changes-coming-soon-jpdv | 0 | 0 | 2026-03-31 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-split-on-schedule-changes-as-rankedcryo-archive-overlap-fixe-iz7l | 0 | 0 | 2026-03-31 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-split-on-cryo-archive-schedule-change-steam-stays-positive-nw6d | 0 | 0 | 2026-03-31 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/mixed-signals-steam-players-love-it-reddit-goes-silent-after-schedule--tcel | 0 | 0 | 2026-03-31 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/schedule-separation-fixes-cryo-archive-access-crisis-but-thief-pickpoc-q6kp | 0 | 0 | 2026-03-31 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/duo-queue-deep-dive-perimeter-to-dire-marsh-tactical-progression-yev4 | 0 | 0 | 2026-03-30 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/patch-1051-ships-minor-fixes-while-community-celebrates-schedule-chang-2sgc | 0 | 0 | 2026-03-30 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/combat-shotgun-cryo-archive-play-shows-weapon-potential-but-limited-sc-zzwl | 0 | 0 | 2026-03-30 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-schedule-changes-pve-vs-ranked-time-management-8u70 | 0 | 0 | 2026-03-30 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/recon-intel-domination-early-warning-system-core-analysis-7hpd | 1 | 0 | 2026-03-30 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/sheaffer-117-promises-recon-anti-ambush-meta-15-minutes-of-pure-theory-54hz | 1 | 0 | 2026-03-30 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/thief-fashion-show-new-shell-styles-hit-cryo-archive-weekend-2-j8lm | 0 | 0 | 2026-03-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-celebrates-ranked-archive-schedule-split-after-backlash-ih6h | 0 | 0 | 2026-03-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-schedule-changes-expose-ranked-priority-gap-k74l | 0 | 0 | 2026-03-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/thief-scan-drone-mastery-intelligence-vs-speed-in-ranked-holotag-hunts-t9vt | 1 | 0 | 2026-03-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/200-hour-meta-analysis-tayxdcs-weapon-tier-list-deep-dive-rw84 | 0 | 0 | 2026-03-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/tayxdcs-200-hour-marathon-meta-analysis-data-driven-weapon-truth-phgl | 0 | 0 | 2026-03-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/thief-pickpocket-drone-exploit-fixed-master-the-new-cooldown-system-xt4x | 0 | 0 | 2026-03-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/free-loadout-theory-when-default-gear-outplays-premium-builds-wkuz | 0 | 0 | 2026-03-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/free-loadout-squad-wipe-shows-resource-management-over-gear-dependency-u7sj | 0 | 0 | 2026-03-29 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/thief-x-ray-visor-advanced-techniques-finding-high-value-targets-in-ra-34a9 | 0 | 0 | 2026-03-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-split-as-bungie-adjusts-ranked-cryo-schedule-amid-growing-qu-2doh | 0 | 0 | 2026-03-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/tayxdcs-200-hour-weapon-meta-analysis-shotgun-tier-rankings-1qxm | 0 | 0 | 2026-03-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/tayxdcs-200-hour-meta-analysis-shows-promise-but-lacks-depth-zbrq | 0 | 0 | 2026-03-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-loadout-optimization-best-gear-for-pve-weekend-runs-7x00 | 1 | 0 | 2026-03-28 | **INDEXED** | **YES** |
| https://cyberneticpunks.com/intel/vozskiis-ranked-break-what-high-tier-runners-do-between-seasons-cswe | 0 | 0 | 2026-03-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/schedule-split-wins-over-community-as-cryo-archive-gets-dedicated-time-c4eu | 0 | 0 | 2026-03-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/outpost-lobby-wipe-shows-promise-but-needs-technical-execution-985o | 0 | 0 | 2026-03-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/duo-queue-testing-perimeter-to-dire-marsh-progression-guide-hqdk | 0 | 0 | 2026-03-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/community-celebrates-schedule-split-as-performance-issues-plague-launc-h107 | 1 | 0 | 2026-03-28 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/200-hour-weapon-meta-analysis-what-actually-works-in-ranked-lxa5 | 0 | 0 | 2026-03-27 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/thief-drone-exploit-patched-m77-no-recoil-builds-surge-in-cryo-archive-qg8g | 0 | 0 | 2026-03-27 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-thief-shell-exploit-patched-analysis-of-competitive-impact-u7em | 0 | 0 | 2026-03-27 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-schedule-update-bungie-separates-ranked-and-pve-windows-38ny | 0 | 0 | 2026-03-27 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/matchmaking-fix-backfires-regional-update-creates-latency-nightmare-2it1 | 0 | 0 | 2026-03-27 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/console-assassin-shows-promise-in-extract-heavy-gameplay-z77r | 0 | 0 | 2026-03-27 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-fixes-matchmaking-woes-but-players-split-on-quality-vs-speed-bzbu | 1 | 0 | 2026-03-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-stream-day-2-elite-runners-push-deeper-into-the-va-hesh | 0 | 0 | 2026-03-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/patch-1051-tackles-thief-exploits-as-community-splits-on-triage-suppor-gogj | 0 | 0 | 2026-03-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/200-hours-means-nothing-without-ranked-context-dtkg | 0 | 0 | 2026-03-26 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-tech-issues-mar-launch-but-community-embraces-challenge-r3xh | 1 | 0 | 2026-03-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/hoshiinotv-showcases-destroyers-raw-combat-power-in-68-seconds-nslh | 0 | 0 | 2026-03-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-survival-essential-gear-and-extraction-tactics-for-weeken-wlc5 | 0 | 0 | 2026-03-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/dpgg-learns-extract-discipline-the-hard-way-claymore-vision-wasted-sy6m | 0 | 0 | 2026-03-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-hype-meets-technical-reality-bungie-patches-anteater-erro-0u1u | 0 | 0 | 2026-03-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-week-players-hit-technical-walls-despite-high-stak-6994 | 0 | 0 | 2026-03-25 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/seraphmaxs-ultimate-item-modifier-guide-textbook-analysis-questionable-8eu4 | 0 | 0 | 2026-03-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/performance-pain-overshadows-cryo-archive-launch-as-community-splits-gbse | 0 | 0 | 2026-03-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathons-new-sfx-update-audio-changes-impact-ranked-play-m9q9 | 0 | 0 | 2026-03-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/mixed-patch-reception-performance-gains-offset-by-controversial-map-ch-lh4g | 0 | 0 | 2026-03-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/dev-promises-cryo-subroutine-fix-as-community-fragments-over-performan-qlx1 | 0 | 0 | 2026-03-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-first-contact-idkhuskyy-survives-the-frozen-hell-ngr8 | 0 | 0 | 2026-03-24 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-launch-meets-mixed-reception-as-connection-issues-plague--0y0s | 0 | 0 | 2026-03-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-lock-fractures-community-as-ranked-beta-goes-live-7z7l | 0 | 0 | 2026-03-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/truds-hypes-ranked-mode-launch-but-delivers-zero-gameplay-74rd | 0 | 0 | 2026-03-23 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/shrouds-hour-long-marathon-masterclass-sets-pvp-meta-standard-c88x | 0 | 0 | 2026-03-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/vandal-undefeated-claims-ring-hollow-without-context-hakt | 0 | 0 | 2026-03-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-survival-ice-station-combat-and-weekend-extracti-q3ro | 0 | 0 | 2026-03-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-only-strategy-dividing-community-vandal-wstr-comb-noc9 | 0 | 0 | 2026-03-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/meta-analysis-icemanisaacs-statistical-best-weapons-for-ranked-season--tjoo | 1 | 0 | 2026-03-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/icemanisaacs-31min-weapon-meta-deep-dive-pulls-23k-views-amid-ranked-l-sn4d | 0 | 0 | 2026-03-22 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-live-first-weekend-zone-drops-with-elite-rewards-zl2x | 1 | 0 | 2026-03-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-warriors-high-risk-ranked-loadouts-for-limited-ac-y8y8 | 0 | 0 | 2026-03-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-launch-sparks-content-drought-casual-play-dominat-x9ca | 0 | 0 | 2026-03-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/icemanisaacs-meta-weapon-tier-list-the-statistical-truth-about-maratho-3tjj | 0 | 0 | 2026-03-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/icemanisaac-drops-meta-bible-marathons-weapon-tier-list-exposed-1h0o | 1 | 0 | 2026-03-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-drops-with-performance-woes-and-movement-exploit-concerns-9agf | 0 | 0 | 2026-03-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/cryo-archive-hits-hard-performance-issues-plague-launch-weekend-em06 | 0 | 0 | 2026-03-21 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-survival-new-map-tactics-for-ice-station-defense-k91x | 0 | 0 | 2026-03-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/budget-weapon-meta-dominates-as-ranked-beta-reveals-economy-crisis-hx8r | 0 | 0 | 2026-03-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-shell-synergy-building-around-squad-abilities-p1bk | 0 | 0 | 2026-03-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-broadcast-weekend-event-guide-for-friday-launch-z7e6 | 0 | 0 | 2026-03-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/german-ranked-tutorial-signals-pre-weekend-meta-prep-as-community-brac-wx2v | 0 | 0 | 2026-03-20 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-advanced-tracking-when-to-deploy-recon-drone-for-maximum-inte-aia9 | 0 | 0 | 2026-03-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/german-guide-covers-ranked-basics-analysis-limited-by-language-barrier-72ug | 0 | 0 | 2026-03-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-what-the-march-20th-drop-means-for-runner-5rd7 | 0 | 0 | 2026-03-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/bungie-drops-ranked-resource-guide-community-analysis-of-entry-barrier-29zg | 0 | 0 | 2026-03-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-loadout-priority-what-to-upgrade-first-for-consistent--2f09 | 1 | 0 | 2026-03-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-105-arg-update-taucetis-discord-activity-deep-dive-7l8o | 0 | 0 | 2026-03-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-explained-holotag-system-tier-rewards-extraction-strat-d04h | 0 | 0 | 2026-03-19 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-map-control-high-ground-tactics-for-gold-climbing-xszj | 0 | 0 | 2026-03-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-duos-mode-emergency-shell-synergy-guide-for-two-week-event-pr86 | 0 | 0 | 2026-03-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-solo-extraction-strategy-map-zones-and-early-exit-timing-zwah | 0 | 0 | 2026-03-18 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/tau-ceti-cup-finals-analysis-team-shrouds-shell-synergy-formula-4stb | 0 | 0 | 2026-03-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/tau-ceti-cup-finals-team-shrouds-winning-shell-composition-analysis-9wtd | 0 | 0 | 2026-03-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/tau-ceti-cup-champion-meta-team-shrouds-winning-strategies-decoded-evnt | 0 | 0 | 2026-03-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/tau-ceti-cup-breakdown-team-shrouds-victory-reveals-ranked-meta-shifts-jxrh | 0 | 0 | 2026-03-17 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/tau-ceti-cup-results-tournament-meta-reveals-new-ranked-strategies-pl2d | 0 | 0 | 2026-03-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-heat-weapon-mastery-overheating-strategies-for-ranked-victory-tur3 | 0 | 0 | 2026-03-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-precision-rifle-guide-long-range-dominance-for-ranked-yt6n | 0 | 0 | 2026-03-16 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-ranked-point-economics-understanding-loss-mitigation-systems-dxv6 | 0 | 0 | 2026-03-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-shell-switching-strategy-when-to-change-mid-match-iyj1 | 0 | 0 | 2026-03-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-tau-ceti-cup-event-meta-changes-and-competitive-strategy-o3uh | 0 | 0 | 2026-03-15 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-sound-strategy-guide-audio-cues-for-ranked-advantage-t0fr | 1 | 0 | 2026-03-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-extraction-route-mastery-securing-your-ranked-progress-y6a8 | 0 | 0 | 2026-03-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-squad-composition-guide-building-s-tier-ranked-teams-856v | 0 | 0 | 2026-03-14 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/holotag-hunt-strategy-high-value-target-priority-for-ranked-v5f7 | 0 | 0 | 2026-03-13 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-weapon-range-guide-long-range-meta-for-ranked-launch-6d6w | 0 | 0 | 2026-03-13 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/marathon-1004-update-ranked-mode-preparation-guide-c6i1 | 0 | 0 | 2026-03-12 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/shell-tier-list-for-marathon-ranked-the-meta-you-need-to-know-g6sg | 0 | 0 | 2026-03-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/complete-ranked-shell-tier-guide-launch-day-meta-analysis-mp2z | 0 | 0 | 2026-03-11 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/complete-ranked-shell-guide-best-shells-for-each-holotag-tier-4t00 | 0 | 0 | 2026-03-07 | **INDEXED** | no |
| https://cyberneticpunks.com/intel/shell-selection-for-ranked-mode-your-first-100-hours-pjzf | 0 | 0 | 2026-03-07 | **INDEXED** | no |

_(354 further edge-case pages are already noindexed — omitted.)_

## 5. Protect-list — held regardless of signals

Registry references **185** published articles total. Those that ALSO land in the confident-cut set (low-reach + duplicate) must be **held** — cutting them would orphan a coverage_registry row:

| URL | impr | referenced by | cluster |
|---|---|---|---|
| https://cyberneticpunks.com/intel/marathon-thief-build-grapple-to-extract-solo-ranked-engine-0m36 | 0 | coverage_registry (article) | #8 |
| https://cyberneticpunks.com/intel/marathon-destroyer-build-best-ranked-solo-loadout-right-now-5y5g | 0 | coverage_registry (article) | #20 |
| https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-right-now-99bm | 0 | coverage_registry (article) | #38 |
| https://cyberneticpunks.com/intel/marathon-vandal-build-amplify-movement-engine-for-ranked-tj6f | 0 | coverage_registry (article) | #47 |
| https://cyberneticpunks.com/intel/marathon-rook-build-the-solo-survivalist-guide-for-season-2-dlcf | 0 | coverage_registry (article) | #37 |
| https://cyberneticpunks.com/intel/marathon-destroyer-build-deepening-your-tech-after-update-1105-xsbq | 0 | coverage_registry (article) | #21 |
| https://cyberneticpunks.com/intel/marathon-triage-build-the-s-tier-squad-anchor-for-season-2-1bpt | 0 | coverage_registry (article) | #13 |
| https://cyberneticpunks.com/intel/marathon-triage-build-best-ranked-solo-loadout-for-climbing-66b3 | 0 | coverage_registry (article) | #13 |
| https://cyberneticpunks.com/intel/marathon-vandal-build-the-amplify-ranked-climb-guide-s2-hb5a | 1 | coverage_registry (article) | #43 |
| https://cyberneticpunks.com/intel/marathon-destroyer-build-riot-barricade-frontline-guide-s2-jxnl | 1 | coverage_registry (article) | #19 |
| https://cyberneticpunks.com/intel/marathon-rook-build-best-ranked-solo-loadout-with-the-m77-ar-uufq | 1 | coverage_registry (article) | #38 |
| https://cyberneticpunks.com/intel/marathon-vandal-build-amplify-movement-engine-for-solo-ranked-46s8 | 1 | coverage_registry (article) | #47 |
| https://cyberneticpunks.com/intel/marathon-assassin-counter-how-to-beat-it-with-recon-y50h | 1 | coverage_registry (article) | #26 |
| https://cyberneticpunks.com/intel/marathon-sentinel-build-castle-doctrine-smg-anchor-guide-s2-84hk | 1 | coverage_registry (article) | #1 |
| https://cyberneticpunks.com/intel/marathon-assassin-build-shadow-strike-knife-engine-after-economy-patch-je7u | 0 | coverage_registry (article) | #3 |
| https://cyberneticpunks.com/intel/marathon-recon-ranked-solo-build-br33-long-range-intel-0rfn | 0 | coverage_registry (article) | #33 |
| https://cyberneticpunks.com/intel/assassin-shadow-strike-engine-the-season-2-invisibility-meta-that-turn-l143 | 0 | coverage_registry (article) | #4 |
| https://cyberneticpunks.com/intel/the-counter-to-thief-most-players-miss-destroyer-barricade-control-v3ps | 0 | coverage_registry (article) | #57 |
| https://cyberneticpunks.com/intel/best-triage-ranked-solo-build-m77-self-sufficient-survival-meta-9ph1 | 0 | coverage_registry (article) | #15 |
| https://cyberneticpunks.com/intel/thief-hideout-engine-the-season-2-drone-meta-that-turns-pickpocket-int-udl3 | 1 | coverage_registry (article) | #9 |
| https://cyberneticpunks.com/intel/best-destroyer-ranked-solo-build-demolition-hmg-control-meta-ni1b | 0 | coverage_registry (article) | #24 |
| https://cyberneticpunks.com/intel/best-recon-ranked-solo-build-br33-intel-control-meta-yrop | 0 | coverage_registry (article) | #33 |
| https://cyberneticpunks.com/intel/destroyer-riot-barricade-engine-the-season-2-shield-tank-meta-that-tur-7sj4 | 0 | coverage_registry (article) | #22 |
| https://cyberneticpunks.com/intel/thief-break-and-enter-engine-the-season-2-grapple-meta-that-turns-pick-d2ba | 1 | coverage_registry (article) | #9 |
| https://cyberneticpunks.com/intel/best-assassin-ranked-solo-build-stryder-m1t-precision-meta-6zga | 0 | coverage_registry (article) | #5 |
| https://cyberneticpunks.com/intel/destroyer-impact-siphons-engine-the-season-2-shield-feeding-meta-that--rgdp | 0 | coverage_registry (article) | #22 |
| https://cyberneticpunks.com/intel/rook-overclock-engine-the-season-2-adaptive-meta-that-turns-v75-scar-i-bggg | 0 | coverage_registry (article) | #39 |
| https://cyberneticpunks.com/intel/best-rook-ranked-solo-build-conquest-lmg-flex-meta-l8pl | 0 | coverage_registry (article) | #42 |
| https://cyberneticpunks.com/intel/thief-hideout-engine-the-season-2-drone-invisibility-meta-that-turns-p-5kic | 0 | coverage_registry (article) | #9 |
| https://cyberneticpunks.com/intel/recon-early-warning-system-engine-the-squad-intel-meta-that-turns-prox-h0t9 | 1 | coverage_registry (article) | #32 |
| https://cyberneticpunks.com/intel/assassin-guerrilla-engine-the-season-2-smoke-meta-that-turns-active-ca-pt9x | 1 | coverage_registry (article) | #4 |
| https://cyberneticpunks.com/intel/triage-no-good-deed-engine-the-season-2-healing-chain-meta-that-turns--zybc | 1 | coverage_registry (article) | #14 |
| https://cyberneticpunks.com/intel/destroyer-impact-siphons-engine-the-season-2-shield-vampire-meta-that--jyam | 0 | coverage_registry (article) | #22 |
| https://cyberneticpunks.com/intel/triage-no-good-deed-engine-the-season-2-support-meta-that-turns-team-h-sgfp | 0 | coverage_registry (article) | #14 |
| https://cyberneticpunks.com/intel/best-recon-ranked-solo-build-v66-lookout-long-range-intel-meta-sbg3 | 0 | coverage_registry (article) | #33 |
| https://cyberneticpunks.com/intel/destroyer-impact-siphons-engine-the-season-2-frontline-meta-that-turns-xgfh | 1 | coverage_registry (article) | #22 |
| https://cyberneticpunks.com/intel/best-assassin-ranked-solo-build-longshot-stealth-sniper-meta-28lh | 0 | coverage_registry (article) | #5 |
| https://cyberneticpunks.com/intel/assassin-shadow-dive-engine-the-phase-shift-combat-meta-that-turns-ste-7he2 | 0 | coverage_registry (article) | #4 |
| https://cyberneticpunks.com/intel/rook-overclock-engine-the-season-2-adaptive-frame-meta-that-turns-vers-hiiw | 0 | coverage_registry (article) | #39 |
| https://cyberneticpunks.com/intel/best-thief-ranked-solo-build-brrt-smg-speed-meta-hg9k | 0 | coverage_registry (article) | #10 |
| https://cyberneticpunks.com/intel/destroyer-riot-barricade-engine-the-season-2-bullrush-meta-that-absorb-6knw | 1 | coverage_registry (article) | #22 |
| https://cyberneticpunks.com/intel/destroyer-ranked-solo-build-conquest-lmg-meta-post-109-qr21 | 1 | coverage_registry (article) | #24 |
| https://cyberneticpunks.com/intel/best-vandal-build-for-season-2-ranked-solo-v75-scar-meta-ex3w | 0 | coverage_registry (article) | #45 |
| https://cyberneticpunks.com/intel/vandal-disrupt-cannon-engine-post-1063-prestige-salvage-hunt-theory-bim5 | 1 | coverage_registry (article) | #46 |
| https://cyberneticpunks.com/intel/triage-shell-sponsored-kit-tank-carri-protocols-support-meta-build-msl4 | 0 | coverage_registry (article) | #17 |
| https://cyberneticpunks.com/intel/recon-shell-intel-build-post-recon-tuning-battlefield-dominance-6220 | 0 | coverage_registry (article) | #34 |
| https://cyberneticpunks.com/intel/triage-shell-support-build-carri-protocol-crew-reinforcement-meta-5djs | 0 | coverage_registry (article) | #17 |
| https://cyberneticpunks.com/intel/carri-protocol-triage-build-crew-support-meta-after-update-106-ehvk | 0 | coverage_registry (article) | #17 |
| https://cyberneticpunks.com/intel/recon-shell-echo-pulse-build-post-buff-intelligence-dominance-guide-ti9m | 0 | coverage_registry (article) | #35 |
| https://cyberneticpunks.com/intel/recon-squad-support-build-echo-intelligence-dominance-post-1053-n4oz | 0 | coverage_registry (article) | #35 |
| https://cyberneticpunks.com/intel/cryo-archive-loot-rush-thief-speed-build-for-high-tier-extractions-2z1j | 1 | coverage_registry (article) | #12 |
| https://cyberneticpunks.com/intel/cryo-archive-meta-triage-med-drone-build-dominates-new-weekend-mode-biuy | 0 | coverage_registry (article) | #18 |
| https://cyberneticpunks.com/intel/thief-cryo-archive-infiltration-build-speed-demon-loot-extraction-qdcw | 0 | coverage_registry (article) | #12 |
| https://cyberneticpunks.com/intel/cryo-archive-thief-build-high-risk-loot-hunting-in-bungies-endgame-v9lr | 0 | coverage_registry (article) | #12 |

---

_Read-only. No DB writes, no noindex, no deletion. GSC source: `Pages (3).csv` (692 /intel rows). Impressions = GSC value or 0 if absent (never surfaced)._
