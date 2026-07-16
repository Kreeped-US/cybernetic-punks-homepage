# D1 - Topic-Cluster Audit (Marathon published corpus)

**READ-ONLY.** SELECT-only DB reads. Nothing written to production, no code changed. Generated against `main` @ `099e44b`.

> **Read the method caveats (Step 2) before acting on any number here.** A first pass using a body-text fallback produced a wildly inflated "92% redundant" figure; it was validated against real headlines, found wrong, and discarded. The numbers below use the corrected, headline-only method and are deliberately conservative.

## Step 1 - Corpus

| metric | count |
|---|---|
| total marathon rows | 1556 |
| **published** | **1554** |
| **indexed-eligible** (published AND noindex=false) | **1403** |
| published + noindex=true (already cut) | 151 |
| unpublished (drafts) | 2 |

Published by editor: `{"MIRANDA":385,"NEXUS":279,"GHOST":304,"CIPHER":293,"DEXTER":292,"VANTAGE":1}`

The real published count is **1554** - above the ~1,100-1,500 expectation, and materially higher than the "1,000" cited in earlier sessions (that was a PostgREST 1,000-row page cap, not a real total).

## Step 2 - Method (and its validated limits)

A topic = **primary subject + intent**.

- **Subject - HEADLINE ONLY.** Two-tier vocab pulled live from the DB: **Tier 1** = specific proper nouns (`shell_stats` = 8 shells, `weapon_stats` = 32 weapons, named places, factions). **Tier 2** = generic mechanics (`extraction`, `holotag`, `exfil`, ...), consulted **only** when no Tier-1 noun is present.
- **Intent** (headline patterns, most-specific first): `discourse` -> `news/patch` -> `event/stream` -> `counter-guide` -> `tier/meta` -> `benchmark` -> `build-guide` -> `beginner-guide` -> `other`. Same subject + different intent = **different topics**.

### What was rejected, and why (important)

- **Body-text fallback: REMOVED.** It assigned `subject=extraction` to **240** articles whose headlines are plainly about shells ("Shell Selection Guide", "Ranked Ready: Your First Shell Tier List") - Marathon *is* an extraction shooter, so the word appears in nearly every body. This single artifact was the main driver of the discarded 92% figure.
- **Longest-string-match: REPLACED with tier precedence.** String length is not subject specificity: "Cryo Archive **Thief** Build ... Extraction Specialist" resolved to `cryo archive` (12 chars) over `Thief`. Tier 1 now wins over Tier 2, longest-match only *within* a tier. Multi-entity headlines can still pick the wrong one - **spot-check any cluster before acting on it.**
- **Coverage is partial by design.** Only **922 of 1554** published articles have a recognisable subject in the headline. The other **632** are reported as an explicit *unclassified* bucket, **not** as a cluster. Do not treat that bucket as a topic or as redundant mass.

## Step 3 - The numbers

| metric | value |
|---|---|
| published | 1554 |
| classified (has a headline subject) | 922 |
| **unclassified** (no headline subject - needs eyeball, NOT a cluster) | **632** |
| **distinct topics** (subject+intent, among classified) | **160** |
| clusters of 3+ (the cannibalization offenders) | **84** |
| **articles stacked in 3+ clusters (redundant mass)** | **824** (53% of published, 89% of classified) |
| 2-article topics | 22 |
| genuinely standalone topics (1 article) | 54 |

### Top 20 clusters by size

| # | count | still indexed | type / intent | topic | DB-backed canonical it competes with |
|---|---|---|---|---|---|
| 1 | **74** | 51 | place / event/stream | cryo archive | - |
| 2 | **33** | 29 | place / other | cryo archive | - |
| 3 | **29** | 26 | place / tier/meta | cryo archive | - |
| 4 | **27** | 27 | shell / tier/meta | Thief | YES `/shells/thief` |
| 5 | **26** | 26 | shell / tier/meta | Destroyer | YES `/shells/destroyer` |
| 6 | **26** | 26 | shell / tier/meta | Triage | YES `/shells/triage` |
| 7 | **25** | 25 | shell / tier/meta | Recon | YES `/shells/recon` |
| 8 | **23** | 15 | mechanic / tier/meta | holotag | - |
| 9 | **21** | 21 | shell / tier/meta | Vandal | YES `/shells/vandal` |
| 10 | **20** | 20 | shell / tier/meta | Assassin | YES `/shells/assassin` |
| 11 | **18** | 17 | shell / news/patch | Thief | YES `/shells/thief` |
| 12 | **18** | 17 | shell / news/patch | Recon | YES `/shells/recon` |
| 13 | **16** | 15 | place / news/patch | cryo archive | - |
| 14 | **16** | 16 | shell / news/patch | Assassin | YES `/shells/assassin` |
| 15 | **14** | 13 | shell / other | Recon | YES `/shells/recon` |
| 16 | **14** | 14 | shell / news/patch | Destroyer | YES `/shells/destroyer` |
| 17 | **13** | 13 | place / build-guide | cryo archive | - |
| 18 | **13** | 13 | shell / news/patch | Triage | YES `/shells/triage` |
| 19 | **13** | 13 | shell / tier/meta | Rook | YES `/shells/rook` |
| 20 | **12** | 12 | shell / build-guide | Recon | YES `/shells/recon` |

**Canonical competition:** every `shell` and `weapon` cluster above is competing with an existing DB-backed reference page (`/shells/<slug>`, `/weapons/<slug>`) that is the natural canonical for that entity. Place/mechanic clusters (e.g. `cryo archive`) have **no** canonical reference page - a gap worth noting for the coverage registry.

### Cluster detail (every cluster of 3+)

#### cryo archive - event/stream (74 articles, 51 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `meta-stabilizing-post-launch-new-cryo-archive-loot-drives-ranked-shift-039d` | 2026-03-18 | NEXUS | noindex | 531396b4 |
| `marathon-cryo-archive-launch-what-the-march-20th-drop-means-for-runner-5rd7` | 2026-03-19 | MIRANDA | **indexed** | 87f23571 |
| `marathon-cryo-archive-broadcast-weekend-event-guide-for-friday-launch-z7e6` | 2026-03-20 | MIRANDA | **indexed** | f3bfbbbc |
| `cryo-archive-hits-hard-performance-issues-plague-launch-weekend-em06` | 2026-03-21 | GHOST | **indexed** | d2d87cd6 |
| `marathon-cryo-archive-launch-stream-first-runs-go-live-with-twitch-dro-fbmo` | 2026-03-21 | MIRANDA | noindex | c721a0ca |
| `cryo-archive-weekend-meta-high-risk-loadouts-for-derelict-ship-surviva-8ojj` | 2026-03-21 | DEXTER | **indexed** | 629c062b |
| `cryo-archive-drops-with-performance-woes-and-movement-exploit-concerns-9agf` | 2026-03-21 | GHOST | **indexed** | cb9a4377 |
| `marathon-cryo-archive-launch-stream-live-coverage-and-first-impression-a1cd` | 2026-03-21 | MIRANDA | noindex | 7fcd9d76 |
| `cryo-archive-launch-sparks-movement-exploit-drama-tech-issues-dampen-h-4ext` | 2026-03-21 | GHOST | noindex | 07a5980f |
| `marathon-cryo-archive-live-stream-community-launch-coverage-first-runs-547x` | 2026-03-21 | MIRANDA | noindex | efc20d91 |
| `cryo-archive-weekend-launch-sparks-content-drought-casual-play-dominat-x9ca` | 2026-03-21 | NEXUS | **indexed** | 759df7f9 |
| `cryo-archive-weekend-warriors-high-risk-ranked-loadouts-for-limited-ac-y8y8` | 2026-03-21 | DEXTER | **indexed** | 7e63ea48 |
| `cryo-archive-bugs-hit-hard-community-splits-on-weekend-only-access-yvah` | 2026-03-21 | GHOST | noindex | dd7a3c27 |
| `marathon-cryo-archive-live-first-weekend-zone-drops-with-elite-rewards-zl2x` | 2026-03-21 | MIRANDA | **indexed** | da9bf658 |
| `marathon-cryo-archive-launch-stream-live-coverage-and-community-reacti-ura0` | 2026-03-22 | MIRANDA | noindex | 970ff8b9 |
| `cryo-archive-weekend-only-strategy-dividing-community-vandal-wstr-comb-noc9` | 2026-03-22 | NEXUS | **indexed** | d2fb8847 |
| `cryo-archive-launches-with-server-fixes-as-community-splits-on-weekend-pchv` | 2026-03-22 | GHOST | noindex | e31c2e79 |
| `marathon-cryo-archive-survival-ice-station-combat-and-weekend-extracti-q3ro` | 2026-03-22 | MIRANDA | **indexed** | 3552bf41 |
| `meta-vacuum-content-creation-stalls-as-cryo-archive-weekend-gates-prog-iqkv` | 2026-03-22 | NEXUS | noindex | 5aa2ee23 |
| `marathon-cryo-archive-launch-stream-live-community-coverage-first-runs-kyyu` | 2026-03-22 | MIRANDA | noindex | 92f07e16 |
| `cryo-archive-launch-weekend-signals-ranked-meta-shake-up-vandal-burst--d1il` | 2026-03-22 | NEXUS | **indexed** | 2413057e |
| `cryo-archive-launch-overshadowed-by-widespread-technical-crashes-ef52` | 2026-03-22 | GHOST | noindex | eb53059d |
| `marathon-cryo-archive-launch-stream-live-coverage-day-2-with-mrroflwaf-f5lr` | 2026-03-22 | MIRANDA | noindex | fa5a225c |
| `cryo-archive-weekend-lock-fractures-community-as-ranked-beta-goes-live-7z7l` | 2026-03-23 | NEXUS | **indexed** | 3d78e445 |
| `cryo-archive-launches-amid-technical-issues-and-weekend-only-controver-9fu9` | 2026-03-23 | GHOST | noindex | 3cd6e274 |
| `cryo-archive-launch-stream-community-first-runs-and-twitch-drop-events-a3qz` | 2026-03-23 | MIRANDA | noindex | 9ba4afee |
| `cryo-archive-thief-weekend-only-high-stakes-loot-optimization-0ajr` | 2026-03-23 | DEXTER | **indexed** | b0a4faeb |
| `cryo-archive-launch-meets-mixed-reception-as-connection-issues-plague--0y0s` | 2026-03-23 | GHOST | **indexed** | e4b55b59 |
| `cryo-archive-launch-stream-live-community-coverage-first-runs-1mvg` | 2026-03-23 | MIRANDA | noindex | 42151995 |
| `cryo-archive-launch-stream-live-community-coverage-first-runs-rbqn` | 2026-03-24 | MIRANDA | **indexed** | 12d4b6ae |
| `cryo-archive-weekend-restriction-reshapes-marathons-competitive-meta-k19v` | 2026-03-24 | NEXUS | **indexed** | 3f5c8b77 |
| `cryo-archive-meta-cold-zone-builds-for-weekend-warriors-kvlc` | 2026-03-24 | DEXTER | **indexed** | 8426896e |
| `cryo-archive-live-cqb-meta-surges-thief-shell-dominates-weekend-extrac-er55` | 2026-03-24 | NEXUS | **indexed** | ebb2d81b |
| `performance-pain-overshadows-cryo-archive-launch-as-community-splits-gbse` | 2026-03-24 | GHOST | **indexed** | 04173f62 |
| `cryo-archive-launch-stream-community-first-runs-and-weekend-only-acces-gzjg` | 2026-03-24 | MIRANDA | **indexed** | 7689639a |
| `players-battle-technical-issues-as-cryo-archive-weekend-event-rolls-ou-bmne` | 2026-03-24 | GHOST | noindex | cd84fbda |
| `cryo-archive-launch-stream-live-coverage-day-2-with-community-first-ru-ccrw` | 2026-03-24 | MIRANDA | noindex | b266872f |
| `cryo-archive-launch-reshapes-meta-thief-shell-dominance-confirmed-4mao` | 2026-03-25 | NEXUS | **indexed** | 2e1e6093 |
| `cryo-archive-launch-week-players-hit-technical-walls-despite-high-stak-6994` | 2026-03-25 | GHOST | **indexed** | 4b756c53 |
| `bungies-cryo-archive-weekend-meta-forcing-ranked-schedule-split-xydn` | 2026-03-25 | CIPHER | **indexed** | 2c4ddbfb |
| `cryo-archive-drops-thief-shell-surges-as-extraction-meta-shifts-z7y7` | 2026-03-25 | NEXUS | **indexed** | e5ad8b73 |
| `cryo-archive-launch-stream-day-2-coverage-with-elite-runner-first-clea-1ipc` | 2026-03-25 | MIRANDA | noindex | 3eb8fb8a |
| `cryo-archive-reshapes-meta-thief-and-cqb-weapons-surge-as-weekend-sche-ucx7` | 2026-03-25 | NEXUS | **indexed** | 64484aba |
| `cryo-archive-launch-smooths-out-as-bungie-fixes-matchmaking-schedule-i-vudw` | 2026-03-25 | GHOST | noindex | c539cb84 |
| `cryo-archive-survival-essential-gear-and-extraction-tactics-for-weeken-wlc5` | 2026-03-25 | MIRANDA | **indexed** | 4ace7662 |
| `cryo-archive-launch-reshapes-meta-thief-dominance-cqb-weapon-surge-pefe` | 2026-03-25 | NEXUS | noindex | a2c6a992 |
| `cryo-archive-tech-issues-mar-launch-but-community-embraces-challenge-r3xh` | 2026-03-25 | GHOST | **indexed** | 3ad69f1f |
| `cryo-archive-launch-stream-community-first-runs-live-on-twitch-rtuq` | 2026-03-25 | MIRANDA | **indexed** | c0596575 |
| `cryo-archive-drops-thief-dominates-weekend-only-high-stakes-mode-k8r5` | 2026-03-26 | NEXUS | **indexed** | ec3ff091 |
| `cryo-archive-launch-shifts-meta-cqb-weapons-surge-schedule-changes-imp-f558` | 2026-03-26 | NEXUS | **indexed** | 07f84381 |
| `thief-cryo-archive-build-speed-loot-meta-for-weekend-warriors-g0ej` | 2026-03-26 | DEXTER | **indexed** | bccc0500 |
| `cryo-archive-launch-stream-day-2-elite-runners-push-deeper-into-the-va-hesh` | 2026-03-26 | MIRANDA | **indexed** | 154680fa |
| `cryo-archive-launch-stream-day-2-coverage-with-mrroflwaffles-skarrow9-colp` | 2026-03-26 | MIRANDA | noindex | 9c5d6716 |
| `cryo-archive-weekend-drives-shell-selection-meta-thief-and-destroyer-r-vhc1` | 2026-03-27 | NEXUS | **indexed** | 28218889 |
| `cryo-archive-weekend-2-secret-cryo-discovery-changes-everything-smoa` | 2026-03-27 | MIRANDA | **indexed** | baa6cda2 |
| `cryo-archive-secret-cryo-locations-complete-weekend-2-discovery-guide-nc9o` | 2026-03-27 | MIRANDA | **indexed** | 126e6b26 |
| `triage-med-drone-cryo-archive-build-weekend-dominance-setup-gen3` | 2026-03-28 | DEXTER | **indexed** | c82f8ba7 |
| `schedule-split-reshapes-meta-cryo-archive-weekend-changes-everything-aluj` | 2026-03-28 | NEXUS | noindex | 2111ca32 |
| `cryo-archive-meta-triage-med-drone-build-dominates-new-weekend-mode-biuy` | 2026-03-28 | DEXTER | **indexed** | ddd58a0a |
| `cryo-archive-loadout-optimization-best-gear-for-pve-weekend-runs-7x00` | 2026-03-28 | MIRANDA | **indexed** | b84ef4fc |
| `cryo-archive-weekend-window-split-reshapes-time-investment-meta-ltbv` | 2026-03-29 | NEXUS | **indexed** | 5218f6be |
| `thief-fashion-show-new-shell-styles-hit-cryo-archive-weekend-2-j8lm` | 2026-03-29 | MIRANDA | **indexed** | 88100c54 |
| `cryo-archive-weekend-2-schedule-split-reshapes-pvepvp-meta-balance-bgaa` | 2026-03-30 | NEXUS | **indexed** | 53ae672e |
| `community-celebrates-cryo-archive-schedule-fix-after-weekend-overlap-f-84jp` | 2026-03-30 | GHOST | noindex | 37fe7866 |
| `cryo-archive-weekend-schedule-changes-pve-vs-ranked-time-management-8u70` | 2026-03-30 | MIRANDA | **indexed** | 94e88522 |
| `cryo-archive-weekend-meta-shift-wstr-shotgun-surge-thief-exploit-fixed-1ajt` | 2026-03-30 | NEXUS | **indexed** | e6754bd4 |
| `recon-shell-intel-build-cryo-archive-ambush-prevention-analysis-nanh` | 2026-03-31 | DEXTER | **indexed** | 4465c605 |
| `cryo-archive-weekend-2-reshapes-meta-cqb-rush-strategies-dominate-as-t-hdll` | 2026-03-31 | NEXUS | **indexed** | c2e8fb5b |
| `cryo-archive-weekend-2-reshapes-cqb-meta-thief-drone-theft-dominates-cd0y` | 2026-03-31 | NEXUS | **indexed** | b3eadd26 |
| `cryo-archive-drops-thief-drone-holotag-theft-meta-emerges-8sr4` | 2026-04-02 | NEXUS | **indexed** | 48e5f1bb |
| `marathons-cryo-archive-launch-becomes-one-man-lfg-show-while-steam-pla-x4sj` | 2026-05-10 | GHOST | **indexed** | a4b336d4 |
| `marathon-community-goes-full-sherpa-mode-as-cryo-archive-drops-steam-v-zo41` | 2026-05-17 | GHOST | **indexed** | 2da3de61 |
| `marathon-community-vanishes-into-lfg-hell-as-cryo-archive-launches-bun-atnt` | 2026-05-19 | GHOST | **indexed** | 8a262aaf |
| `the-best-cryo-archive-loadout-now-that-its-live-247-vw0v` | 2026-05-21 | DEXTER | **indexed** | b4dbaab1 |

#### cryo archive - other (33 articles, 29 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `pc-performance-pain-persists-despite-cryo-archive-hype-jevv` | 2026-03-20 | GHOST | noindex | ad390cb9 |
| `marathon-cryo-archive-survival-new-map-tactics-for-ice-station-defense-k91x` | 2026-03-20 | MIRANDA | **indexed** | 25e5fc0f |
| `cryo-archive-first-contact-idkhuskyy-survives-the-frozen-hell-ngr8` | 2026-03-24 | CIPHER | **indexed** | 51833166 |
| `cryo-archive-schedule-update-bungie-separates-ranked-and-pve-windows-38ny` | 2026-03-27 | MIRANDA | **indexed** | ee7d0509 |
| `community-split-on-cryo-archive-schedule-changes-performance-issues-pe-mjhf` | 2026-03-27 | GHOST | noindex | fcbfa7bb |
| `schedule-split-wins-over-community-as-cryo-archive-gets-dedicated-time-c4eu` | 2026-03-28 | GHOST | **indexed** | 28d0ecb4 |
| `community-split-on-cryo-archive-schedule-fix-while-bug-reports-trickle-76q3` | 2026-03-28 | GHOST | noindex | f8e71169 |
| `cryo-archive-schedule-changes-expose-ranked-priority-gap-k74l` | 2026-03-29 | CIPHER | **indexed** | eba0beb1 |
| `community-cheers-cryo-archive-schedule-split-as-technical-issues-persi-n9j5` | 2026-03-29 | GHOST | noindex | dd16444c |
| `combat-shotgun-cryo-archive-play-shows-weapon-potential-but-limited-sc-zzwl` | 2026-03-30 | CIPHER | **indexed** | 34cb5f9c |
| `community-split-on-cryo-archive-schedule-change-steam-stays-positive-nw6d` | 2026-03-31 | GHOST | **indexed** | 474553fa |
| `cryo-archive-map-analysis-gear-visibility-in-marathons-broken-pvpve-zo-kuk5` | 2026-04-05 | DEXTER | **indexed** | 8c3083e8 |
| `icemanisaacs-8-hour-gold-key-marathon-exposes-cryo-archive-exploit-win-tv55` | 2026-04-08 | CIPHER | **indexed** | f7a3bacd |
| `cryo-archive-accessibility-crisis-exposes-marathons-endgame-wall-hrax` | 2026-04-16 | CIPHER | **indexed** | 768ec2ff |
| `cryo-archive-vault-bugs-hit-solo-players-harder-as-carri-pushes-teams-bh8v` | 2026-04-18 | GHOST | **indexed** | 58df55fd |
| `cryo-archive-vault-bugs-frustrate-players-as-lfg-groups-hunt-dna-cards-wq1e` | 2026-04-19 | GHOST | **indexed** | 3221b0d8 |
| `carri-update-drives-lfg-surge-as-players-hunt-for-cryo-archive-teams-mdvf` | 2026-04-20 | GHOST | **indexed** | 679bdd5d |
| `anti-virus-economy-shift-cryo-archive-bug-creates-consumable-scarcity-5v3x` | 2026-04-20 | NEXUS | **indexed** | 9f0eb30c |
| `consumable-collapse-cryo-archive-bug-devastates-ranked-supply-lines-lsv6` | 2026-04-21 | NEXUS | **indexed** | f69e50fc |
| `cryo-archive-chaos-community-meltdown-over-compiler-difficulty-urug` | 2026-04-23 | CIPHER | **indexed** | 9a48f11e |
| `community-goes-radio-silent-on-cryo-archive-while-steam-reviews-stay-f-vbcz` | 2026-05-07 | GHOST | **indexed** | 988e3600 |
| `marathons-cryo-archive-opens-to-empty-reddit-threads-and-glowing-steam-7f7s` | 2026-05-10 | GHOST | **indexed** | 41ea4d5a |
| `marathons-community-response-to-season-endings-reveals-the-cryo-archiv-9e0x` | 2026-05-15 | GHOST | **indexed** | e9888580 |
| `marathon-community-goes-into-lfg-overdrive-as-cryo-archive-opens-but-n-oshb` | 2026-05-16 | GHOST | **indexed** | 6ebe8276 |
| `marathon-community-radio-silence-players-chase-cryo-archive-while-igno-jqgq` | 2026-05-16 | GHOST | **indexed** | 1c0aa2ec |
| `marathon-community-stuck-in-cryo-archive-lfg-purgatory-while-steam-pla-qkxx` | 2026-05-20 | GHOST | **indexed** | 0b947a35 |
| `marathon-players-split-on-cryo-archive-gatekeeping-steam-veterans-defe-qozq` | 2026-05-21 | GHOST | **indexed** | d7d9e589 |
| `marathons-cryo-archive-creates-two-speed-community-380-hour-veterans-s-ccol` | 2026-05-24 | GHOST | **indexed** | 20c6da5e |
| `marathons-cryo-archive-solo-demand-hits-breaking-point-let-me-run-it-a-74yf` | 2026-05-24 | GHOST | **indexed** | 677ae5c6 |
| `ranked-cryo-archive-climbing-strategy-for-the-may-24-28-window-7eda` | 2026-05-24 | CIPHER | **indexed** | c1f12e0c |
| `cryo-archive-mastery-surge-slickfrees-factory-solo-performance-reveals-s7yu` | 2026-05-25 | NEXUS | **indexed** | b56a5344 |
| `marathon-cryo-archive-steam-players-keep-coming-back-for-more-f68g` | 2026-06-23 | GHOST | **indexed** | 0760e7f7 |
| `marathon-cryo-archive-the-endgame-players-are-chasing-together-cu1y` | 2026-06-29 | GHOST | **indexed** | c902c801 |

#### cryo archive - tier/meta (29 articles, 26 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `cryo-archive-meta-shakeup-cqb-weapons-surge-thief-shell-dominance-zbfg` | 2026-03-23 | NEXUS | **indexed** | e5564e25 |
| `cryo-archive-reshapes-meta-thief-shell-dominance-high-rpm-weapons-p4nd` | 2026-03-24 | NEXUS | **indexed** | 877e5a49 |
| `cryo-archive-reshapes-meta-thief-shell-ascends-tank-builds-dominate-a2sl` | 2026-03-24 | NEXUS | **indexed** | c789b840 |
| `cryo-archive-meta-why-thief-shell-dominates-the-new-high-stakes-zone-b1rs` | 2026-03-24 | DEXTER | **indexed** | 4344adb1 |
| `thief-shell-meta-shift-cryo-archive-demands-covert-acquisition-mastery-3a7q` | 2026-03-25 | CIPHER | **indexed** | 170042a1 |
| `cryo-archive-thief-build-s-tier-vault-extraction-specialist-5kta` | 2026-03-25 | DEXTER | **indexed** | fb28f968 |
| `cryo-archive-scheduling-shift-reshapes-ranked-meta-priorities-55nl` | 2026-03-26 | NEXUS | noindex | 55589f11 |
| `cryo-archive-schedule-split-reshapes-ranked-meta-priorities-0wwh` | 2026-03-27 | NEXUS | **indexed** | 2fe0d21e |
| `thief-drone-exploit-fixed-pickpocket-meta-shifts-as-cryo-archive-separ-kyeq` | 2026-03-27 | NEXUS | **indexed** | b882844a |
| `thief-exploit-fixed-cryo-archive-schedule-split-shakes-ranked-meta-fhxe` | 2026-03-28 | NEXUS | noindex | 4597957b |
| `cryo-archive-schedule-split-reshapes-ranked-meta-thief-exploit-fixed-0u0t` | 2026-03-28 | NEXUS | **indexed** | 323a68f0 |
| `cryo-archive-meta-close-quarters-combat-builds-dominate-cage-matches-moq6` | 2026-03-29 | DEXTER | **indexed** | 503d1877 |
| `cryo-archive-schedule-split-reshapes-meta-priorities-6jyu` | 2026-03-30 | NEXUS | noindex | 1815c1a1 |
| `cryo-archive-schedule-split-creates-ranked-pve-meta-divide-mebt` | 2026-03-31 | NEXUS | **indexed** | 7ac8d77d |
| `cryo-archive-loot-rush-thief-speed-build-for-high-tier-extractions-2z1j` | 2026-04-01 | DEXTER | **indexed** | 836caf60 |
| `cryo-archive-push-meta-loadouts-for-high-stakes-extractions-exbp` | 2026-04-02 | DEXTER | **indexed** | e1a5999d |
| `cryo-archive-return-shifts-meta-to-cqb-dominance-3iwh` | 2026-04-03 | NEXUS | **indexed** | abbcbe24 |
| `cryo-archive-meta-why-area-control-builds-dominate-the-new-environment-4ekh` | 2026-04-03 | DEXTER | **indexed** | e0e492c4 |
| `cryo-archive-returns-cqb-meta-shift-thief-holotag-theft-dominance-yi4q` | 2026-04-03 | NEXUS | **indexed** | fdfe7769 |
| `cryo-archive-meta-cold-weather-combat-builds-for-new-environment-pble` | 2026-04-03 | DEXTER | **indexed** | 93bdaa1e |
| `cryo-archive-meta-crystallizes-wstr-bubbles-dominate-endgame-v1s3` | 2026-04-07 | NEXUS | **indexed** | ebb61191 |
| `cryo-archive-drives-meta-shift-brrt-smg-dominates-thief-shell-surges-prpp` | 2026-04-07 | NEXUS | **indexed** | 1ed1fbf4 |
| `cryo-archive-farm-complaints-miss-the-real-ranked-meta-shift-9lta` | 2026-04-08 | CIPHER | **indexed** | b1daac50 |
| `assassin-shell-cryo-archive-stealth-build-new-map-depth-meta-analysis-ug6n` | 2026-04-16 | DEXTER | **indexed** | 57dc646e |
| `cryo-archive-extraction-crisis-new-map-demands-squad-coordination-meta-v4f5` | 2026-04-19 | NEXUS | **indexed** | 12f621d5 |
| `cryo-archive-battery-bug-exposes-terminal-scanning-meta-flaws-oaou` | 2026-04-19 | CIPHER | **indexed** | 69281157 |
| `anti-virus-pack-timing-exploit-could-reshape-cryo-archive-meta-43jp` | 2026-04-20 | CIPHER | **indexed** | cac88932 |
| `cryo-archive-pvp-surge-solo-queue-dominance-as-endgame-content-reshape-bsy5` | 2026-05-22 | NEXUS | **indexed** | be42ce79 |
| `cryo-archive-endgame-surge-community-focus-shifts-to-pve-mastery-as-co-1s00` | 2026-06-01 | NEXUS | **indexed** | 2d9c75f9 |

#### Thief - tier/meta (27 articles, 27 still indexed)

Competing with DB-backed canonical: `/shells/thief`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `thief-shell-official-release-extraction-meta-gets-speed-boost-7hy5` | 2026-03-26 | MIRANDA | **indexed** | 1fd127f0 |
| `thief-meta-surge-fashion-content-exploit-fix-s-tier-solo-dominance-5qe3` | 2026-03-28 | NEXUS | **indexed** | dde7c459 |
| `thief-shell-dominates-ranked-holotag-theft-meta-shifts-extraction-game-iv6t` | 2026-04-02 | NEXUS | **indexed** | 26573e89 |
| `thief-drone-holotag-theft-meta-explodes-ranked-queue-chaos-erupts-dz1r` | 2026-04-02 | NEXUS | **indexed** | d0d9e998 |
| `thief-shell-solo-extract-build-carri-protocol-speed-meta-zih0` | 2026-04-15 | DEXTER | **indexed** | 8652e16e |
| `thief-shell-complete-stealth-guide-s-tier-solo-extraction-mastery-e7og` | 2026-04-22 | MIRANDA | **indexed** | f963a37e |
| `thief-shell-complete-extraction-guide-s-tier-solo-ranked-mastery-pvkg` | 2026-04-25 | MIRANDA | **indexed** | 11695a46 |
| `thief-shell-complete-extraction-guide-s-tier-solo-ranked-mastery-011i` | 2026-05-05 | MIRANDA | **indexed** | b3a51ca4 |
| `thief-shell-extraction-dominance-solo-ranked-s-tier-as-holotag-meta-fa-bt3i` | 2026-05-08 | NEXUS | **indexed** | 43a041bc |
| `thief-shell-complete-extraction-guide-s-tier-solo-loot-mastery-6h51` | 2026-05-08 | MIRANDA | **indexed** | 79eb7cbb |
| `thief-shell-solo-surge-pickpocket-drone-meta-dominates-s-tier-holotag--2tk4` | 2026-05-10 | NEXUS | **indexed** | 7f8cafb1 |
| `complete-thief-shell-stealth-guide-s-tier-solo-extraction-mastery-d9mp` | 2026-05-11 | MIRANDA | **indexed** | 9a4f765c |
| `thief-shell-extraction-dominance-pickpocket-drone-meta-surges-to-s-tie-tyo2` | 2026-05-12 | NEXUS | **indexed** | 2677f886 |
| `best-thief-ranked-solo-build-post-security-update-speed-meta-o10i` | 2026-05-13 | CIPHER | **indexed** | 3d759d71 |
| `complete-thief-shell-guide-s-tier-solo-extraction-specialist-epqt` | 2026-05-15 | MIRANDA | **indexed** | 997b2d8d |
| `thief-shell-extraction-dominance-pickpocket-drone-meta-surges-to-s-tie-f2fb` | 2026-05-15 | NEXUS | **indexed** | cebd074e |
| `thief-solo-queue-revolution-s-tier-stealth-engine-for-season-2-nightfa-4zkh` | 2026-05-17 | DEXTER | **indexed** | bc2b2c9e |
| `complete-thief-shell-guide-s-tier-solo-extraction-specialist-g09m` | 2026-05-18 | MIRANDA | **indexed** | da50871b |
| `the-smart-thiefs-ranked-solo-guide-s-tier-extraction-specialist-azg9` | 2026-05-20 | MIRANDA | **indexed** | 97ff24a3 |
| `this-weeks-ranked-climb-playbook-thief-solo-meta-dominates-silent-seas-0tyh` | 2026-05-21 | CIPHER | **indexed** | ef682cf5 |
| `smart-thief-ranked-solo-guide-s-tier-extraction-specialist-1p3e` | 2026-05-23 | MIRANDA | **indexed** | e4853c2c |
| `thief-s-tier-week-the-solo-ranked-meta-that-punishes-hesitation-xdoq` | 2026-05-25 | CIPHER | **indexed** | 5015fefc |
| `thief-break-and-enter-engine-the-season-2-grapple-meta-that-turns-mobi-3a27` | 2026-05-26 | DEXTER | **indexed** | 14c2c973 |
| `this-weeks-ranked-solo-reality-check-thief-s-tier-meta-means-new-rules-17x3` | 2026-06-01 | CIPHER | **indexed** | bbc42891 |
| `thief-break-and-enter-engine-the-season-2-grapple-meta-that-turns-pick-d2ba` | 2026-06-04 | DEXTER | **indexed** | ad9ec9b0 |
| `thief-s-tier-week-the-ranked-solo-meta-that-punishes-server-rage-7lcz` | 2026-06-06 | CIPHER | **indexed** | 9bd41d9a |
| `marathon-thief-grapple-guide-positioning-meta-analysis-0r3s` | 2026-06-13 | DEXTER | **indexed** | ff41c3e0 |

#### Destroyer - tier/meta (26 articles, 26 still indexed)

Competing with DB-backed canonical: `/shells/destroyer`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `the-destroyer-knife-build-budget-melee-meta-or-ranked-trap-dxxl` | 2026-03-21 | DEXTER | **indexed** | b988e526 |
| `pixelbros-destroyer-guide-lacks-meta-context-outdated-build-analysis-df4s` | 2026-03-24 | CIPHER | **indexed** | 5c3cf7ac |
| `sidequest-goblin-shows-destroyer-shotgun-meta-still-has-teeth-8npb` | 2026-04-06 | CIPHER | **indexed** | dc897673 |
| `ranked-destroyer-mastery-new-gold-tier-style-changes-everything-nab8` | 2026-04-07 | MIRANDA | **indexed** | 5677fa8d |
| `destroyer-ranked-mastery-complete-gold-tier-combat-guide-y25y` | 2026-04-08 | MIRANDA | **indexed** | 3ece04c3 |
| `destroyer-shell-complete-tank-guide-s-tier-squad-dominance-mastery-089p` | 2026-04-24 | MIRANDA | **indexed** | 82901499 |
| `complete-destroyer-shell-combat-guide-s-tier-squad-tank-mastery-f1qi` | 2026-05-04 | MIRANDA | **indexed** | 9f7740e6 |
| `destroyer-shell-breaks-ranked-meta-squad-dominance-reaches-new-heights-lc3l` | 2026-05-06 | NEXUS | **indexed** | d7a7aaaf |
| `destroyer-shell-complete-combat-guide-s-tier-squad-tank-mastery-ls20` | 2026-05-07 | MIRANDA | **indexed** | c7836947 |
| `destroyer-sponsored-perimeter-theory-the-free-green-kit-meta-shift-13r6` | 2026-05-08 | DEXTER | **indexed** | 85a6faea |
| `destroyer-shell-terror-sweep-iron-frame-tank-meta-dominates-ranked-squ-xpuw` | 2026-05-10 | NEXUS | **indexed** | 4741c2ce |
| `destroyer-impact-siphons-engine-post-security-update-shield-meta-revol-s9sa` | 2026-05-11 | DEXTER | **indexed** | 88a2c5ab |
| `complete-destroyer-shell-tank-guide-s-tier-squad-powerhouse-mastery-sa9q` | 2026-05-11 | MIRANDA | **indexed** | 0478b167 |
| `complete-destroyer-shell-combat-guide-s-tier-squad-tank-mastery-yx36` | 2026-05-14 | MIRANDA | **indexed** | a7643d79 |
| `destroyer-impact-siphons-engine-season-2-nightfall-tank-meta-revolutio-z68t` | 2026-05-16 | DEXTER | **indexed** | f8352076 |
| `complete-destroyer-shell-tank-guide-s-tier-squad-combat-specialist-5255` | 2026-05-17 | MIRANDA | **indexed** | a39d4910 |
| `destroyer-squad-fortress-iron-frame-tank-meta-surges-to-s-tier-as-seas-l441` | 2026-05-18 | NEXUS | **indexed** | 12a944cb |
| `destroyer-riot-barricade-engine-the-season-2-bullrush-meta-that-absorb-6knw` | 2026-05-22 | DEXTER | **indexed** | c6a56e56 |
| `destroyer-build-renaissance-tayxdc-video-surge-exposes-tank-shells-und-cg9f` | 2026-05-24 | NEXUS | **indexed** | daeb2bfd |
| `destroyer-impact-siphons-engine-the-season-2-frontline-meta-that-turns-xgfh` | 2026-05-25 | DEXTER | **indexed** | d3bcfa21 |
| `destroyer-tutorial-surge-signals-tank-meta-awakening-tayxdcs-dual-vide-3q9o` | 2026-05-26 | NEXUS | **indexed** | 15f441f1 |
| `destroyer-impact-siphons-engine-the-season-2-shield-vampire-meta-that--jyam` | 2026-05-27 | DEXTER | **indexed** | d7ea0c1c |
| `destroyer-build-mastery-explodes-tayxdcs-dual-tutorial-surge-reveals-t-kega` | 2026-05-27 | NEXUS | **indexed** | 602d83e1 |
| `destroyer-impact-siphons-engine-the-season-2-shield-feeding-meta-that--rgdp` | 2026-06-01 | DEXTER | **indexed** | 0e8a74be |
| `destroyer-riot-barricade-engine-the-season-2-shield-tank-meta-that-tur-7sj4` | 2026-06-06 | DEXTER | **indexed** | 08314106 |
| `destroyer-impact-siphons-engine-the-season-2-barrier-meta-that-turns-i-5838` | 2026-06-11 | DEXTER | **indexed** | 2d6231b8 |

#### Triage - tier/meta (26 articles, 26 still indexed)

Competing with DB-backed canonical: `/shells/triage`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `pixelbros-delivers-definitive-triage-meta-guide-13-minutes-of-pure-int-843a` | 2026-04-04 | CIPHER | **indexed** | 74cf1e76 |
| `pixelbros-triage-build-analysis-support-shell-meta-for-squad-ranked-agb0` | 2026-04-04 | DEXTER | **indexed** | e063c6fb |
| `med-drone-meta-incoming-triage-discussion-signals-support-shell-revolu-h0k6` | 2026-04-09 | NEXUS | **indexed** | a2aff118 |
| `triage-support-mastery-complete-squad-play-guide-to-marathons-s-tier-m-joek` | 2026-04-09 | MIRANDA | **indexed** | d000db87 |
| `triage-shell-support-build-carri-protocol-crew-reinforcement-meta-5djs` | 2026-04-17 | DEXTER | **indexed** | 548d9391 |
| `triage-mastery-unlock-shows-shells-a-tier-support-meta-potential-td08` | 2026-04-19 | CIPHER | **indexed** | 4ff47d55 |
| `triage-shell-sponsored-kit-tank-carri-protocols-support-meta-build-msl4` | 2026-04-21 | DEXTER | **indexed** | d7b8ea50 |
| `triage-shell-complete-mastery-guide-s-tier-squad-support-dominance-p2kj` | 2026-04-23 | MIRANDA | **indexed** | 14d03bef |
| `triage-shell-complete-support-guide-s-tier-squad-mastery-4agm` | 2026-05-03 | MIRANDA | **indexed** | ba416746 |
| `triage-revival-support-shell-climbs-to-a-tier-as-smoke-meta-revolution-g75r` | 2026-05-06 | NEXUS | **indexed** | 0f80ad8d |
| `triage-shell-complete-support-guide-s-tier-squad-survival-mastery-b19b` | 2026-05-06 | MIRANDA | **indexed** | 1bbb297b |
| `triage-enhanced-sponsored-kit-theory-free-green-loadouts-change-suppor-vkgl` | 2026-05-07 | DEXTER | **indexed** | 697d46bf |
| `complete-triage-shell-support-guide-s-tier-squad-sustain-mastery-hkog` | 2026-05-09 | MIRANDA | **indexed** | 2e53ed98 |
| `triage-shell-ranked-resurrection-med-drone-support-meta-climbs-from-d--nrmx` | 2026-05-11 | NEXUS | **indexed** | 1eb845ba |
| `complete-triage-shell-support-guide-s-tier-squad-lifeline-mastery-o4kq` | 2026-05-13 | MIRANDA | **indexed** | 1c23448b |
| `complete-triage-shell-support-guide-s-tier-squad-medical-specialist-k4b8` | 2026-05-16 | MIRANDA | **indexed** | 54f92f03 |
| `triage-revive-engine-the-season-2-squad-meta-that-turns-deaths-into-ad-b01t` | 2026-05-20 | DEXTER | **indexed** | d2c8e26a |
| `triage-shell-spotlight-drives-squad-composition-revolution-bungies-cin-lqs2` | 2026-05-22 | NEXUS | **indexed** | ed071567 |
| `triage-no-good-deed-engine-the-season-2-support-meta-that-turns-team-h-sgfp` | 2026-05-25 | DEXTER | **indexed** | df7c2b30 |
| `triage-no-good-deed-engine-the-season-2-healing-chain-meta-that-turns--zybc` | 2026-05-28 | DEXTER | **indexed** | 8284bd15 |
| `triage-support-framework-the-helping-hands-v4-squad-meta-that-turns-me-lfx7` | 2026-05-31 | DEXTER | **indexed** | 42cd9c12 |
| `triage-squad-supremacy-exposed-medical-shell-drives-73-of-platinum-ext-bcdg` | 2026-05-31 | NEXUS | **indexed** | 0dd9a33f |
| `best-triage-ranked-solo-build-m77-self-sufficient-survival-meta-9ph1` | 2026-06-09 | CIPHER | **indexed** | 4b22dfc0 |
| `marathon-triage-shell-analysis-the-support-meta-crisis-h4nb` | 2026-06-14 | NEXUS | **indexed** | b400997e |
| `marathon-triage-build-the-s-tier-squad-anchor-for-season-2-1bpt` | 2026-07-08 | DEXTER | **indexed** | 1f62da92 |
| `marathon-triage-solo-ranked-winning-despite-the-shells-weakest-tier-t7ul` | 2026-07-12 | CIPHER | **indexed** | 6bbf13c7 |

#### Recon - tier/meta (25 articles, 25 still indexed)

Competing with DB-backed canonical: `/shells/recon`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `perfect-game-delivers-solid-recon-tutorial-but-misses-the-meta-qmjs` | 2026-03-20 | CIPHER | **indexed** | 28ba5114 |
| `recon-surge-drives-meta-shift-economy-optimization-becomes-critical-rblk` | 2026-03-20 | NEXUS | **indexed** | a6496053 |
| `recon-intel-dominance-echo-pulse-tracker-drone-meta-analysis-s7o7` | 2026-03-20 | DEXTER | **indexed** | 49d5dbdd |
| `recon-shell-guide-shows-deep-understanding-of-intel-shell-meta-ll8p` | 2026-03-20 | CIPHER | **indexed** | 0e5ac222 |
| `economy-crisis-budget-weapons-dominate-as-recon-intel-meta-emerges-muq4` | 2026-03-20 | NEXUS | **indexed** | 7b3cbaa1 |
| `sheaffer-117-promises-recon-anti-ambush-meta-15-minutes-of-pure-theory-54hz` | 2026-03-30 | CIPHER | **indexed** | 06360aba |
| `recon-echo-pulse-mastery-how-signal-jammer-changes-transform-intel-met-c68t` | 2026-04-17 | MIRANDA | **indexed** | 5d02c000 |
| `recon-cluster-payload-drone-build-dire-marsh-experimental-meta-dominan-nh9i` | 2026-04-23 | DEXTER | **indexed** | 449ee85a |
| `recon-shell-complete-intel-guide-a-tier-squad-information-mastery-uev5` | 2026-04-25 | MIRANDA | **indexed** | ae2bc9ca |
| `recon-shell-complete-intel-guide-a-tier-squad-information-mastery-50ek` | 2026-05-05 | MIRANDA | **indexed** | 01aba67a |
| `recon-shell-intelligence-revolution-echo-pulse-meta-transforms-ranked--gycf` | 2026-05-08 | NEXUS | **indexed** | 36595628 |
| `complete-marathon-recon-shell-intel-guide-a-tier-squad-information-mas-bfg0` | 2026-05-08 | MIRANDA | **indexed** | f486644a |
| `recon-shell-intel-surge-echo-pulse-meta-dominates-squad-ranked-as-secu-sojp` | 2026-05-11 | NEXUS | **indexed** | d1bdc7ad |
| `complete-recon-shell-intel-guide-a-tier-squad-information-mastery-id2d` | 2026-05-11 | MIRANDA | **indexed** | 4cc05cd6 |
| `recon-shell-intel-dominance-echo-pulse-meta-surges-to-a-tier-solo-as-s-9etk` | 2026-05-13 | NEXUS | **indexed** | 41faf2a2 |
| `complete-recon-shell-intel-guide-a-tier-squad-information-specialist-otn0` | 2026-05-14 | MIRANDA | **indexed** | 174cb06e |
| `recon-echo-chamber-engine-season-2-squad-intelligence-meta-p29z` | 2026-05-16 | DEXTER | **indexed** | 29f3b22f |
| `complete-recon-shell-intel-guide-a-tier-squad-information-specialist-uw7h` | 2026-05-18 | MIRANDA | **indexed** | 9e8a1b90 |
| `recon-echo-pulse-engine-the-season-2-intelligence-meta-that-turns-posi-wkhx` | 2026-05-23 | DEXTER | **indexed** | a1d7f3bc |
| `recon-early-warning-system-engine-the-proximity-alert-meta-that-turns--npd6` | 2026-05-25 | DEXTER | **indexed** | ef693289 |
| `recon-early-warning-system-engine-the-squad-intel-meta-that-turns-prox-h0t9` | 2026-05-29 | DEXTER | **indexed** | 3dbfc4e7 |
| `thief-hideout-engine-the-season-2-drone-invisibility-meta-that-turns-p-5kic` | 2026-05-30 | DEXTER | **indexed** | d9d1817a |
| `recon-echo-chamber-engine-the-season-2-intel-meta-that-survived-the-se-my4q` | 2026-06-03 | DEXTER | **indexed** | 25ce35d8 |
| `best-recon-ranked-solo-build-br33-intel-control-meta-yrop` | 2026-06-06 | CIPHER | **indexed** | b7d5ea18 |
| `recon-echo-chamber-engine-the-season-2-intel-meta-that-turns-echo-puls-4iu9` | 2026-06-08 | DEXTER | **indexed** | 7a3ae877 |

#### holotag - tier/meta (23 articles, 15 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `ranked-mode-shell-selection-guide-tier-list-and-holotag-strategies-3se3` | 2026-03-07 | MIRANDA | noindex | 053a8379 |
| `complete-ranked-shell-guide-best-shells-for-each-holotag-tier-4t00` | 2026-03-07 | MIRANDA | **indexed** | c0fe3101 |
| `ranked-mode-preparation-shell-tier-list-holotag-target-strategies-br4i` | 2026-03-10 | MIRANDA | noindex | 27e28cf8 |
| `holotag-theft-meta-ranked-distraction-tactics-hit-different-0pcn` | 2026-04-01 | CIPHER | **indexed** | 3069a33d |
| `staycation-shows-ranked-holotag-psychology-b-tier-distraction-play-mzqc` | 2026-04-03 | CIPHER | **indexed** | 4dac7567 |
| `marathon-holotag-tier-requirements-what-each-rank-actually-demands-7jwu` | 2026-05-10 | CIPHER | **indexed** | a888af3f |
| `season-2-holotag-tier-requirements-what-each-rank-actually-takes-os9v` | 2026-05-14 | CIPHER | **indexed** | 1b75d088 |
| `marathon-holotag-tier-benchmarks-season-2-skill-gates-breakdown-9yl8` | 2026-05-17 | CIPHER | **indexed** | 039025b1 |
| `marathon-holotag-tier-benchmarks-what-each-rank-actually-requires-lq3p` | 2026-05-20 | CIPHER | noindex | 988759ba |
| `marathon-holotag-skill-benchmarks-what-separates-each-tier-qw53` | 2026-05-21 | CIPHER | **indexed** | 893f5a81 |
| `marathon-holotag-tier-benchmarks-what-each-tier-actually-requires-bogs` | 2026-05-22 | CIPHER | noindex | 0157570e |
| `marathon-holotag-tier-benchmarks-what-each-tier-actually-requires-ciqm` | 2026-05-24 | CIPHER | noindex | 229e1e81 |
| `marathon-holotag-tier-skill-requirements-the-build-thresholds-that-act-nkz2` | 2026-05-25 | CIPHER | **indexed** | 3ba18f92 |
| `marathon-holotag-tier-benchmarks-what-each-rank-actually-requires-gx91` | 2026-05-29 | CIPHER | noindex | 01367580 |
| `marathon-ranked-progression-guide-build-requirements-for-each-holotag--rgjf` | 2026-06-01 | CIPHER | **indexed** | 78672e87 |
| `marathon-season-2-holotag-tier-requirements-what-each-rank-actually-ta-htjj` | 2026-06-05 | CIPHER | **indexed** | ba1e5bec |
| `marathon-holotag-tier-benchmarks-the-builds-that-define-each-rank-ubx5` | 2026-06-08 | CIPHER | noindex | 424d4268 |
| `marathon-holotag-tier-benchmarks-the-skills-that-define-each-rank-kybn` | 2026-06-12 | CIPHER | noindex | 58ceeacd |
| `marathon-holotag-ranks-what-each-tier-actually-requires-yewz` | 2026-06-15 | CIPHER | **indexed** | 8503759a |
| `marathon-holotag-tier-benchmarks-what-each-rank-actually-requires-r4lm` | 2026-06-26 | CIPHER | **indexed** | b1d235bd |
| `marathon-holotag-benchmarks-the-builds-that-break-each-tier-2oke` | 2026-06-29 | CIPHER | **indexed** | 2936b18d |
| `marathon-holotag-benchmarks-what-each-tier-actually-demands-fhwm` | 2026-07-02 | CIPHER | **indexed** | 2b5e4344 |
| `marathon-holotag-tiers-the-shell-benchmarks-that-define-each-rank-ixc7` | 2026-07-09 | CIPHER | **indexed** | f30886c6 |

#### Vandal - tier/meta (21 articles, 21 still indexed)

Competing with DB-backed canonical: `/shells/vandal`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `vandal-wstr-shotgun-meta-combo-analysis-me34` | 2026-03-22 | CIPHER | **indexed** | ed8303f4 |
| `vandal-meta-analysis-why-slickfrees-undefeated-streak-proves-the-shell-jou1` | 2026-03-22 | DEXTER | **indexed** | 4a8a974f |
| `vandal-domination-build-why-this-shell-rules-marathons-meta-dvl6` | 2026-03-22 | DEXTER | **indexed** | 3fce8673 |
| `perfect-game-whatever-dissects-vandal-meta-solo-s-tier-analysis-3t3h` | 2026-03-26 | CIPHER | **indexed** | 8e122282 |
| `vandal-ranked-domination-why-a-tier-across-all-holotag-brackets-v72a` | 2026-04-01 | MIRANDA | **indexed** | d62c9920 |
| `youtube-meta-surge-vandal-renaissance-stealth-build-revolution-u488` | 2026-04-05 | NEXUS | **indexed** | 1abf16e3 |
| `vandal-combat-flow-meta-build-analysis-high-rpm-assault-dominance-uzpy` | 2026-04-05 | DEXTER | **indexed** | 265bfa67 |
| `vandal-shell-complete-mobility-guide-a-tier-multi-role-mastery-g033` | 2026-05-06 | MIRANDA | **indexed** | 94e921c3 |
| `vandal-shell-dominates-early-access-combat-flow-passive-creates-ranked-vys2` | 2026-05-07 | NEXUS | **indexed** | 4d6c08e5 |
| `complete-vandal-shell-combat-guide-a-tier-all-around-combat-mastery-mgnn` | 2026-05-09 | MIRANDA | **indexed** | fc307273 |
| `vandal-shell-tactical-uprising-disrupt-cannon-meta-surges-as-security--8n9e` | 2026-05-12 | NEXUS | **indexed** | 8eacb709 |
| `complete-vandal-shell-combat-guide-a-tier-versatile-mastery-tgp6` | 2026-05-12 | MIRANDA | **indexed** | c47fc245 |
| `vandal-shell-ranked-supremacy-disrupt-cannon-control-defines-season-2--zo02` | 2026-05-16 | NEXUS | **indexed** | 876b5435 |
| `complete-vandal-shell-guide-a-tier-combat-specialist-for-ranked-succes-u8ed` | 2026-05-16 | MIRANDA | **indexed** | cebc8757 |
| `vandal-combat-flow-engine-the-season-2-microjets-movement-meta-that-tu-br0n` | 2026-05-22 | DEXTER | **indexed** | 4d09f6bc |
| `this-weeks-ranked-solo-meta-vandal-m77-tempo-build-beats-server-issues-1mr9` | 2026-05-23 | CIPHER | **indexed** | 6b6dcd00 |
| `vandal-microjet-engine-the-season-2-aerial-superiority-meta-that-turns-2i5l` | 2026-05-24 | DEXTER | **indexed** | c7fcd1e3 |
| `vandal-adrenal-core-engine-the-amplify-extension-meta-that-turns-cardi-u42y` | 2026-05-27 | DEXTER | **indexed** | 49a16842 |
| `vandal-microjet-efficiency-engine-the-season-2-triple-jump-meta-that-t-1ar7` | 2026-06-01 | DEXTER | **indexed** | dbd5be00 |
| `the-vandal-week-how-marathons-best-all-around-shell-masters-this-meta-jqas` | 2026-06-09 | CIPHER | **indexed** | b99930f3 |
| `vandal-amplify-engine-the-season-2-movement-meta-that-turns-micro-jets-zty3` | 2026-06-10 | DEXTER | **indexed** | 6d6d5123 |

#### Assassin - tier/meta (20 articles, 20 still indexed)

Competing with DB-backed canonical: `/shells/assassin`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `perfect-games-assassin-guide-a-tier-analysis-despite-missing-the-funda-rbrb` | 2026-04-01 | CIPHER | **indexed** | 47d6fb48 |
| `perfect-game-breaks-down-assassin-mechanics-meta-knowledge-for-squad-r-h8fg` | 2026-04-02 | CIPHER | **indexed** | 8d40eff4 |
| `assassin-shell-complete-stealth-guide-a-tier-solo-specialist-mastery-vqai` | 2026-05-07 | MIRANDA | **indexed** | 07d35f90 |
| `assassin-shell-meta-ascension-shadow-strike-core-transforms-stealth-co-czbn` | 2026-05-10 | NEXUS | **indexed** | f8573d42 |
| `assassin-shell-stealth-crisis-shadow-strike-meta-collapses-as-enhanced-3ofl` | 2026-05-12 | NEXUS | **indexed** | 53153d5b |
| `complete-assassin-shell-stealth-guide-high-risk-a-tier-solo-specialist-8z07` | 2026-05-13 | MIRANDA | **indexed** | bce27520 |
| `assassin-shell-stealth-resurgence-shadow-strike-meta-climbs-to-s-tier--uadx` | 2026-05-14 | NEXUS | **indexed** | 279622b1 |
| `assassin-shell-stealth-revival-shadow-strike-core-drives-a-tier-solo-s-kfzn` | 2026-05-16 | NEXUS | **indexed** | be733ee5 |
| `complete-assassin-shell-stealth-guide-high-risk-a-tier-solo-specialist-f0td` | 2026-05-17 | MIRANDA | **indexed** | 19dca5ce |
| `season-2-eve-ranked-climb-assassin-meta-window-opens-this-week-awz4` | 2026-05-19 | CIPHER | **indexed** | 181da523 |
| `best-assassin-ranked-solo-build-brrt-smg-stealth-meta-axsg` | 2026-05-20 | CIPHER | **indexed** | df82f0ad |
| `compilation-killer-thief-emerges-short-form-content-reveals-stealth-sh-hbr2` | 2026-05-24 | NEXUS | **indexed** | 47a23663 |
| `assassin-shadow-dive-engine-the-phase-shift-combat-meta-that-turns-ste-7he2` | 2026-05-24 | DEXTER | **indexed** | 47409007 |
| `best-assassin-ranked-solo-build-longshot-stealth-sniper-meta-28lh` | 2026-05-24 | CIPHER | **indexed** | d464219e |
| `assassin-guerrilla-engine-the-season-2-smoke-meta-that-turns-active-ca-pt9x` | 2026-05-29 | DEXTER | **indexed** | 3cc966b3 |
| `assassin-minus-sights-engine-the-season-2-ads-invisibility-meta-that-t-x6w2` | 2026-06-03 | DEXTER | **indexed** | 60485e4a |
| `assassin-shadow-step-engine-the-season-2-stealth-meta-that-turns-phase-ewxg` | 2026-06-07 | DEXTER | **indexed** | a3f021cf |
| `thief-hideout-engine-the-season-2-drone-meta-that-turns-pickpocket-int-udl3` | 2026-06-08 | DEXTER | **indexed** | 1d8baeb1 |
| `best-assassin-ranked-solo-build-kkv-9sd-stealth-aggression-meta-fbar` | 2026-06-11 | CIPHER | **indexed** | af30f3a9 |
| `assassin-shadow-strike-engine-the-season-2-invisibility-meta-that-turn-l143` | 2026-06-12 | DEXTER | **indexed** | cc8332dc |

#### Thief - news/patch (18 articles, 17 still indexed)

Competing with DB-backed canonical: `/shells/thief`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `post-patch-thief-fixed-drone-stronger-stealth-builds-1wxo` | 2026-03-27 | DEXTER | **indexed** | 070259ce |
| `marathons-thief-shell-exploit-patched-analysis-of-competitive-impact-u7em` | 2026-03-27 | CIPHER | **indexed** | e6ecb163 |
| `thief-exploit-patched-schedule-changes-reshape-meta-priorities-w1h9` | 2026-03-30 | NEXUS | **indexed** | 26320195 |
| `patch-1051-fixes-thief-drone-exploit-community-focuses-on-schedule-cha-xn8a` | 2026-03-30 | GHOST | noindex | 0b8ec44e |
| `thief-drone-clips-surface-as-knife-nerfs-hit-ranked-meta-dyey` | 2026-04-07 | CIPHER | **indexed** | 7c1c0f63 |
| `post-patch-thief-shell-ranked-solo-domination-after-knife-nerf-rzap` | 2026-04-09 | DEXTER | **indexed** | 18effab5 |
| `thief-bug-crashes-into-knife-nerf-as-technical-issues-mount-iny7` | 2026-04-09 | GHOST | **indexed** | f37c6153 |
| `thief-shell-speed-build-wstr-nerf-forces-light-carry-mobility-meta-qbou` | 2026-04-18 | DEXTER | **indexed** | 09768ae0 |
| `thief-shell-economy-build-post-1061-free-consumable-meta-797a` | 2026-04-22 | DEXTER | **indexed** | dd7a0890 |
| `thief-shell-solo-queue-build-post-wstr-nerf-speed-meta-dominance-svze` | 2026-04-25 | DEXTER | **indexed** | ce3b588d |
| `thief-shell-speed-meta-post-1062-escape-artist-analysis-p5tf` | 2026-05-04 | DEXTER | **indexed** | e2fff0a2 |
| `thief-shell-prestige-salvage-hunter-post-1063-exploitation-build-fquc` | 2026-05-06 | DEXTER | **indexed** | 1e24ff89 |
| `thief-light-carry-engine-post-1063-prestige-salvage-speed-theory-6dub` | 2026-05-08 | DEXTER | **indexed** | f51e0741 |
| `best-thief-ranked-solo-build-post-patch-volt-battery-dominance-0z6p` | 2026-05-08 | CIPHER | **indexed** | 8d12e777 |
| `thief-x-ray-vision-engine-post-1063-prestige-salvage-revolution-xcy2` | 2026-05-10 | DEXTER | **indexed** | 15df9975 |
| `thief-hideout-engine-post-self-revive-nerf-solo-extraction-revolution-o5ns` | 2026-05-13 | DEXTER | **indexed** | 902943e2 |
| `thief-x-ray-warden-hunt-engine-marathon-update-109s-ultimate-loot-meta-w603` | 2026-05-19 | DEXTER | **indexed** | 41bba733 |
| `marathon-thief-build-grapple-knife-engine-after-economy-patch-yjz9` | 2026-06-19 | DEXTER | **indexed** | 9a53478d |

#### Recon - news/patch (18 articles, 17 still indexed)

Competing with DB-backed canonical: `/shells/recon`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `ranked-recon-guide-echo-pulse-buffs-make-intel-shell-tier-s-squad-pick-0rwg` | 2026-04-03 | MIRANDA | **indexed** | 472e8989 |
| `devs-tease-recon-buffs-as-community-splits-on-solo-pain-vs-team-glory-v20i` | 2026-04-03 | GHOST | noindex | 609809dc |
| `mid-season-update-april-14-recon-echo-pulse-buffs-audio-fix-guide-qkym` | 2026-04-03 | MIRANDA | **indexed** | 73deb866 |
| `recon-squad-support-build-echo-intelligence-dominance-post-1053-n4oz` | 2026-04-09 | DEXTER | **indexed** | 263bdf0e |
| `recon-buffs-signal-major-ranked-intel-meta-shift-qqkf` | 2026-04-14 | CIPHER | **indexed** | 21d0d585 |
| `recon-shell-echo-pulse-build-post-buff-intelligence-dominance-guide-ti9m` | 2026-04-14 | DEXTER | **indexed** | e67390ea |
| `recon-mid-season-buff-guide-echo-pulse-and-tracker-drone-optimization-ldqo` | 2026-04-14 | MIRANDA | **indexed** | fc9e0daa |
| `mid-season-update-brings-recon-buffs-as-technical-issues-persist-f2mc` | 2026-04-15 | GHOST | **indexed** | c8066b14 |
| `mid-season-update-106-br33-victory-lap-unique-and-recon-buffs-guide-g3eg` | 2026-04-15 | MIRANDA | **indexed** | 062d26d8 |
| `recon-tracker-drone-mastery-how-the-mid-season-buffs-transform-intel-14ea` | 2026-04-15 | MIRANDA | **indexed** | 5ed43d8f |
| `recon-shell-echo-pulse-build-mid-season-buffs-transform-intel-meta-fnfa` | 2026-04-16 | DEXTER | **indexed** | 1b3d5c42 |
| `cooperation-revolution-echo-pulse-buffs-make-recon-s-tier-intel-king-zc59` | 2026-04-17 | NEXUS | **indexed** | 7a4e2e28 |
| `community-buzzes-over-recon-buffs-and-carri-cooperation-push-0yxo` | 2026-04-17 | GHOST | **indexed** | 629cf6fc |
| `mid-season-recon-guide-echo-pulse-and-tracker-drone-buff-complete-anal-21h7` | 2026-04-17 | MIRANDA | **indexed** | f30a9e1f |
| `recon-shell-intel-dominance-build-post-wstr-nerf-information-control-wnvr` | 2026-04-21 | DEXTER | **indexed** | a39cf547 |
| `recon-shell-echo-pulse-engine-post-1062-intel-superiority-build-f1xh` | 2026-05-04 | DEXTER | **indexed** | 5dc0c7ef |
| `recon-echo-chamber-engine-post-1063-prestige-salvage-intel-specialist-5q1w` | 2026-05-06 | DEXTER | **indexed** | 43b788df |
| `post-109-recon-echo-chamber-engine-tactical-recovery-revolution-dw52` | 2026-05-13 | DEXTER | **indexed** | 5a31927c |

#### cryo archive - news/patch (16 articles, 15 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `patch-105-meta-shift-cryo-archive-changes-ranked-power-dynamic-ifxi` | 2026-03-24 | CIPHER | **indexed** | 71bcf75b |
| `cryo-archive-hype-meets-technical-reality-bungie-patches-anteater-erro-0u1u` | 2026-03-25 | GHOST | **indexed** | 02b934bc |
| `marathon-update-1051-thief-exploit-fix-cryo-archive-improvements-mfp1` | 2026-03-26 | MIRANDA | **indexed** | 177fdf2d |
| `thief-drone-exploit-patched-m77-no-recoil-builds-surge-in-cryo-archive-qg8g` | 2026-03-27 | NEXUS | **indexed** | fe437f28 |
| `marathon-update-1051-fixed-thief-exploits-and-cryo-archive-improvement-nx0w` | 2026-03-29 | MIRANDA | **indexed** | 30ad4da2 |
| `schedule-separation-fixes-cryo-archive-access-crisis-but-thief-pickpoc-q6kp` | 2026-03-31 | CIPHER | **indexed** | 7183584e |
| `patch-1051-fixes-thief-drone-exploit-as-cryo-archive-schedule-separate-rsii` | 2026-03-31 | NEXUS | **indexed** | a2723cab |
| `thief-movement-nerf-shakes-meta-cryo-archive-schedule-split-creates-fo-7cxv` | 2026-04-01 | NEXUS | **indexed** | 6ef4133e |
| `cryo-archive-weekend-movement-nerfs-shake-ranked-meta-20nq` | 2026-04-01 | NEXUS | **indexed** | 9714ae56 |
| `cryo-archive-weekend-2-thief-nerf-reshapes-extraction-meta-x2n8` | 2026-04-01 | NEXUS | noindex | 10023edd |
| `cryo-archive-weekend-2-thief-movement-nerf-reshapes-ranked-meta-sxo4` | 2026-04-01 | NEXUS | **indexed** | ee6901c3 |
| `movement-nerf-hits-thief-meta-as-cryo-archive-weekend-2-opens-nmd4` | 2026-04-02 | NEXUS | **indexed** | e794da4f |
| `cryo-archive-returns-recon-buffs-knife-nerf-incoming-tlgw` | 2026-04-03 | NEXUS | **indexed** | 586ad309 |
| `cryo-archive-content-drop-shifts-meta-as-balance-nerfs-loom-ogdb` | 2026-04-03 | NEXUS | **indexed** | cf4e8d24 |
| `cryo-archive-nerfs-hit-while-ranked-rewards-drive-destroyer-surge-kx8n` | 2026-04-07 | NEXUS | **indexed** | 118587fa |
| `wstr-nerf-drama-overshadows-technical-issues-as-cryo-archive-bugs-pers-lwwk` | 2026-04-18 | GHOST | **indexed** | 21103670 |

#### Assassin - news/patch (16 articles, 16 still indexed)

Competing with DB-backed canonical: `/shells/assassin`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `assassin-phase-shift-builds-dominate-new-outpost-meta-after-movement-n-twtt` | 2026-04-01 | DEXTER | **indexed** | 68b663de |
| `stealth-meta-surge-assassin-thief-dominate-as-nerfs-target-snipers-a0f2` | 2026-04-06 | NEXUS | **indexed** | 522e6145 |
| `post-nerf-assassin-knife-build-shadow-strike-still-dominates-close-com-gk7f` | 2026-04-07 | DEXTER | **indexed** | f1646fdc |
| `melee-damage-stat-nerf-forces-assassin-build-rethink-6v5u` | 2026-04-08 | DEXTER | **indexed** | 5b1bb170 |
| `knife-nerfs-hit-console-players-hardest-assassin-struggles-in-new-meta-zj66` | 2026-04-08 | CIPHER | **indexed** | af49214b |
| `assassin-shell-active-camo-build-wstr-nerf-opens-stealth-knife-meta-ld07` | 2026-04-18 | DEXTER | **indexed** | 45424696 |
| `solo-stealth-build-guide-exploits-assassins-post-wstr-nerf-meta-window-8e3p` | 2026-04-18 | CIPHER | **indexed** | 44271dcb |
| `assassin-shell-solo-loadout-post-1061-free-kit-economy-dominance-hk24` | 2026-04-22 | DEXTER | **indexed** | e1ee2daf |
| `assassin-shell-stealth-build-shadow-strike-exploit-analysis-post-1061-8zz9` | 2026-04-24 | DEXTER | **indexed** | 2328ceb9 |
| `assassin-shadow-strike-engine-post-1062-stealth-assassination-meta-uz89` | 2026-05-05 | DEXTER | **indexed** | 8f6670ba |
| `assassin-minus-sights-engine-post-1063-ads-invisibility-theory-lnh9` | 2026-05-07 | DEXTER | **indexed** | f6474b18 |
| `best-assassin-ranked-solo-build-post-1063-one-shot-counter-meta-mkzj` | 2026-05-09 | CIPHER | **indexed** | f0f8d3e5 |
| `how-to-counter-assassins-one-shot-meta-in-post-1063-ranked-hh4f` | 2026-05-09 | CIPHER | **indexed** | 1d764bfe |
| `best-assassin-season-2-build-shadow-strike-dominance-post-nerf-meta-4etg` | 2026-05-15 | CIPHER | **indexed** | d3d45b19 |
| `marathon-assassin-build-shadow-strike-knife-engine-after-economy-patch-je7u` | 2026-06-18 | DEXTER | **indexed** | 57f6f3d1 |
| `marathon-assassin-build-smoke-melee-engine-and-the-1103-patch-5r78` | 2026-06-24 | DEXTER | **indexed** | ec3e6d79 |

#### Recon - other (14 articles, 13 still indexed)

Competing with DB-backed canonical: `/shells/recon`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `marathon-advanced-tracking-when-to-deploy-recon-drone-for-maximum-inte-aia9` | 2026-03-19 | MIRANDA | **indexed** | 48aa0f9d |
| `perfect-game-whatever-delivers-elite-recon-mastery-tutorial-gm6w` | 2026-03-20 | CIPHER | **indexed** | 7272ac0e |
| `recon-intel-domination-early-warning-system-core-analysis-7hpd` | 2026-03-30 | DEXTER | **indexed** | 1546c8d4 |
| `recon-echo-pulse-changes-mid-season-balance-reshapes-intel-shell-5pq5` | 2026-04-03 | MIRANDA | **indexed** | 85102a03 |
| `mid-season-update-teases-recon-changes-while-community-hunts-bugs-pv9x` | 2026-04-03 | GHOST | noindex | 3ce6c3f5 |
| `community-awaits-mid-season-balance-shake-up-as-recon-changes-preview-l829` | 2026-04-04 | GHOST | **indexed** | 8f0bb796 |
| `recon-echo-pulse-changes-mid-season-update-preview-analysis-rz1l` | 2026-04-07 | MIRANDA | **indexed** | 11b78455 |
| `community-silent-on-recon-changes-while-devs-focus-mid-season-teases-7fta` | 2026-04-08 | GHOST | **indexed** | 995694b5 |
| `carri-protocol-reshapes-cooperation-recon-echo-pulse-dominates-intel-in7c` | 2026-04-14 | NEXUS | **indexed** | c8400221 |
| `recon-echo-pulse-engine-post-security-update-intel-dominance-wmdu` | 2026-05-09 | DEXTER | **indexed** | 92dd2f7f |
| `recon-echo-chamber-engine-post-security-update-intel-dominance-revolut-ner7` | 2026-05-11 | DEXTER | **indexed** | 8b12fcba |
| `recon-echo-chamber-engine-the-season-1-warden-hunt-intel-dominator-5yjc` | 2026-05-21 | DEXTER | **indexed** | 070e4deb |
| `marathon-recon-shell-early-warning-systems-ranked-edge-mtz7` | 2026-06-28 | NEXUS | **indexed** | 2687feaa |
| `marathon-recon-shell-why-early-warning-system-wins-ranked-jiyi` | 2026-07-09 | NEXUS | **indexed** | 02b063bb |

#### Destroyer - news/patch (14 articles, 14 still indexed)

Competing with DB-backed canonical: `/shells/destroyer`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `destroyer-shell-tank-build-carri-protocol-squad-dominance-after-106-pp2g` | 2026-04-16 | DEXTER | **indexed** | 0f0f05c5 |
| `destroyer-shell-post-wstr-nerf-riot-barricade-tank-build-dominance-g8mj` | 2026-04-18 | DEXTER | **indexed** | 78374066 |
| `destroyer-solo-tank-build-post-1061-free-kit-meta-exploitation-2jpt` | 2026-04-22 | DEXTER | **indexed** | f86adc73 |
| `checktheereplays-destroyer-triple-kill-post-wstr-nerf-timing-analysis-4qm3` | 2026-04-24 | CIPHER | **indexed** | a0a08705 |
| `destroyer-triple-barrel-build-post-1061-sponsored-kit-meta-adaptation-7hc9` | 2026-04-24 | DEXTER | **indexed** | 19be5365 |
| `destroyer-grenade-spam-counter-post-1062-anti-explosive-tank-build-jyb7` | 2026-05-04 | DEXTER | **indexed** | 12f8a5ea |
| `destroyer-iron-frame-tank-post-1063-prestige-salvage-farm-build-arqp` | 2026-05-06 | DEXTER | **indexed** | b92c1719 |
| `destroyer-shell-squad-supremacy-update-1063-security-changes-favor-def-6tzr` | 2026-05-08 | NEXUS | **indexed** | 8b7e2d9c |
| `best-destroyer-ranked-solo-build-post-1063-tank-meta-ne6q` | 2026-05-11 | CIPHER | **indexed** | a0604e7d |
| `destroyer-shell-fortress-meta-riot-barricade-control-surges-to-s-tier--eg6h` | 2026-05-13 | NEXUS | **indexed** | 2aa8842d |
| `destroyer-impact-siphons-engine-post-109-tank-revolution-8wx7` | 2026-05-13 | DEXTER | **indexed** | cf0a6363 |
| `destroyer-ranked-engine-marathon-update-109s-warden-hunt-fortress-meta-gmg9` | 2026-05-20 | DEXTER | **indexed** | f2135c06 |
| `marathon-destroyer-build-carri-squad-anchor-after-update-1102-2i9z` | 2026-06-17 | DEXTER | **indexed** | 0d31fd32 |
| `marathon-destroyer-build-deepening-your-tech-after-update-1105-xsbq` | 2026-07-10 | DEXTER | **indexed** | 1e15d61c |

#### cryo archive - build-guide (13 articles, 13 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `cryo-archive-thief-build-speed-vault-extraction-specialist-pzsr` | 2026-03-24 | DEXTER | **indexed** | 0f6bb5db |
| `cryo-archive-thief-speed-stealth-build-for-high-risk-extraction-fodp` | 2026-03-24 | DEXTER | **indexed** | 3c120c6e |
| `cryo-archive-thief-high-risk-vault-raiding-build-07v8` | 2026-03-25 | DEXTER | **indexed** | fef8ceb0 |
| `cryo-archive-thief-build-high-risk-loot-hunting-in-bungies-endgame-v9lr` | 2026-03-25 | DEXTER | **indexed** | 4c7bc5e6 |
| `thief-cryo-archive-infiltration-build-speed-demon-loot-extraction-qdcw` | 2026-03-25 | DEXTER | **indexed** | af568d50 |
| `cryo-archive-triage-build-the-squad-extraction-specialist-l7xs` | 2026-03-26 | DEXTER | **indexed** | 8c91a969 |
| `cryo-archive-thief-the-ultimate-high-stakes-extraction-build-bbce` | 2026-03-26 | DEXTER | **indexed** | 225e15f6 |
| `assassin-shell-guide-shadow-strike-core-builds-for-cryo-archive-omnm` | 2026-04-02 | DEXTER | **indexed** | 34cc8441 |
| `cryo-archive-recon-build-early-warning-system-dominates-new-map-ze86` | 2026-04-03 | DEXTER | **indexed** | 645ca4dd |
| `cryo-archive-survival-build-high-durability-destroyer-for-pve-endgame-qphi` | 2026-04-07 | DEXTER | **indexed** | 7af2c657 |
| `cryo-archive-vandal-build-vault-clearing-combat-flow-optimization-whqb` | 2026-04-08 | DEXTER | **indexed** | d92203cc |
| `vandal-shell-anti-virus-build-cryo-archives-data-corruption-immunity-t-lrx9` | 2026-04-20 | DEXTER | **indexed** | dc7f529e |
| `marathon-cryo-archive-build-survive-and-thrive-in-the-endgame-6ghj` | 2026-07-06 | DEXTER | **indexed** | e1f699e1 |

#### Triage - news/patch (13 articles, 13 still indexed)

Competing with DB-backed canonical: `/shells/triage`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `patch-1051-tackles-thief-exploits-as-community-splits-on-triage-suppor-gogj` | 2026-03-26 | GHOST | **indexed** | 90761e7b |
| `dev-nerfs-target-knifesniper-meta-while-triage-support-rises-9gcr` | 2026-04-04 | NEXUS | **indexed** | fc4f26cd |
| `triage-ultimate-shows-potential-as-melee-nerfs-reshape-ranked-meta-4k2j` | 2026-04-08 | CIPHER | **indexed** | 7653726e |
| `carri-protocol-triage-build-crew-support-meta-after-update-106-ehvk` | 2026-04-15 | DEXTER | **indexed** | 25c46548 |
| `triage-shell-carri-squad-build-post-wstr-nerf-team-support-meta-w1xo` | 2026-04-19 | DEXTER | **indexed** | fb5e5cbb |
| `triage-support-build-post-1061-enhanced-consumable-stack-meta-dq0n` | 2026-04-24 | DEXTER | **indexed** | e4588054 |
| `triage-shell-support-build-post-1061-free-kit-med-stack-revolution-6dri` | 2026-04-26 | DEXTER | **indexed** | 4b5126ea |
| `triage-shell-support-engine-post-1062-squad-ranked-domination-4zvu` | 2026-05-05 | DEXTER | **indexed** | 43fc75c7 |
| `triage-ranked-solo-build-post-1063-med-drone-control-meta-xb4f` | 2026-05-10 | CIPHER | **indexed** | d7701911 |
| `triage-sponsored-kit-revolution-post-1063-free-green-tier-meta-engine-i84w` | 2026-05-11 | DEXTER | **indexed** | 3888cc02 |
| `self-revive-kit-nerf-incoming-triage-shell-meta-shifts-as-bungie-targe-oqey` | 2026-05-13 | NEXUS | **indexed** | 1ae8a50e |
| `best-triage-ranked-solo-build-post-self-revive-nerf-meta-ts6y` | 2026-05-14 | CIPHER | **indexed** | 6757a3f4 |
| `triage-ranked-solo-build-self-revive-nerf-creates-new-win-condition-pund` | 2026-05-18 | CIPHER | **indexed** | df3d68f8 |

#### Rook - tier/meta (13 articles, 13 still indexed)

Competing with DB-backed canonical: `/shells/rook`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `carri-protocol-shifts-rook-meta-solo-extraction-now-viable-gyfw` | 2026-04-14 | CIPHER | **indexed** | 231d3c18 |
| `pixelbros-zero-risk-rook-strategy-exposes-mid-season-extraction-meta-wvh2` | 2026-04-15 | CIPHER | **indexed** | 064bc12a |
| `rook-shell-overclock-build-post-wstr-meta-disruption-analysis-asdb` | 2026-04-18 | DEXTER | **indexed** | f801ef68 |
| `rook-outpost-meta-credit-banking-strategy-reshapes-solo-queue-economic-6x09` | 2026-04-26 | NEXUS | **indexed** | 43bda2fb |
| `best-rook-ranked-solo-build-season-2-weapon-balance-meta-8xrl` | 2026-05-13 | CIPHER | **indexed** | 61d14ebe |
| `rook-shell-adaptive-uprising-community-abandons-specialist-shells-as-s-4czy` | 2026-05-14 | NEXUS | **indexed** | fe11ca9d |
| `rook-adaptive-frame-engine-season-2-preparation-meta-theory-yvsl` | 2026-05-14 | DEXTER | **indexed** | 85e2931a |
| `best-rook-build-for-season-2-ranked-solo-new-weapon-balance-meta-eosw` | 2026-05-15 | CIPHER | **indexed** | d3b2c365 |
| `rook-adaptive-frame-engine-season-2-nightfall-flex-meta-revolution-a1p1` | 2026-05-17 | DEXTER | **indexed** | eac56492 |
| `slickfrees-solo-cryo-crew-fill-engine-the-rook-adaptive-frame-meta-for-qytp` | 2026-05-21 | DEXTER | **indexed** | d33b41bb |
| `rook-overclock-engine-the-season-2-adaptive-frame-meta-that-turns-vers-hiiw` | 2026-05-24 | DEXTER | **indexed** | 3bc6ed65 |
| `rook-glass-cannon-engine-the-overclock-burst-meta-that-turns-near-deat-yeg6` | 2026-05-26 | DEXTER | **indexed** | dfe47dcb |
| `marathon-rook-flex-build-m77-adaptive-loadout-meta-sdtt` | 2026-06-14 | CIPHER | **indexed** | 00d3b984 |

#### Recon - build-guide (12 articles, 12 still indexed)

Competing with DB-backed canonical: `/shells/recon`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `recon-intel-build-echo-chamber-core-dominates-solo-ranked-nr3c` | 2026-03-20 | DEXTER | **indexed** | 1685fe5d |
| `perfect-games-recon-intel-build-echo-pulse-mastery-for-ranked-iupn` | 2026-03-20 | DEXTER | **indexed** | 4ff5ac51 |
| `recon-shell-intel-build-post-recon-tuning-battlefield-dominance-6220` | 2026-04-19 | DEXTER | **indexed** | aa9b5682 |
| `recon-shell-complete-build-guide-echo-pulse-mastery-for-squad-intel-j9cy` | 2026-04-22 | MIRANDA | **indexed** | a421689e |
| `recon-drone-build-post-dire-marsh-crew-reduction-intel-dominance-ixip` | 2026-04-25 | DEXTER | **indexed** | ec72bfa1 |
| `marathon-recon-ranked-solo-build-br33-long-range-intel-0rfn` | 2026-06-13 | CIPHER | **indexed** | b3179f68 |
| `marathon-recon-echo-chamber-build-intel-mastery-guide-sl00` | 2026-06-14 | DEXTER | **indexed** | a1735d1a |
| `marathon-recon-build-echo-pulse-intel-engine-for-ranked-s2-og5a` | 2026-06-19 | DEXTER | **indexed** | f6e2878c |
| `marathon-recon-build-why-solos-should-run-echo-pulse-qjnc` | 2026-06-23 | DEXTER | **indexed** | 18257d0c |
| `marathon-ranked-tips-recons-solo-case-is-building-r7j2` | 2026-06-23 | NEXUS | **indexed** | e290b732 |
| `marathon-recon-build-echo-pulse-intel-engine-for-ranked-ayf9` | 2026-07-04 | DEXTER | **indexed** | 8c6efc54 |
| `marathon-recon-build-early-warning-system-solo-ranked-guide-9cx5` | 2026-07-13 | DEXTER | **indexed** | 08c6c8d8 |

#### Vandal - build-guide (12 articles, 12 still indexed)

Competing with DB-backed canonical: `/shells/vandal`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `vandal-solo-ranked-domination-disrupt-cannon-wstr-combat-build-64ug` | 2026-03-26 | DEXTER | **indexed** | dd98f7b5 |
| `vandal-shell-complete-build-guide-best-starting-ranked-shell-mastery-u9hv` | 2026-04-23 | MIRANDA | **indexed** | 4f98f5dc |
| `marathon-vandal-disrupt-cannon-build-calling-card-hack-engine-s2-71in` | 2026-06-15 | DEXTER | **indexed** | dd97b617 |
| `marathon-vandal-shell-guide-best-starting-build-for-ranked-7ynj` | 2026-06-18 | MIRANDA | **indexed** | d2adfe2e |
| `marathon-vandal-build-amplify-movement-engine-for-solo-ranked-46s8` | 2026-06-20 | DEXTER | **indexed** | 32a94fd7 |
| `marathon-vandal-build-the-season-2-pvp-disrupt-engine-bkmt` | 2026-06-25 | DEXTER | **indexed** | 11d02c7c |
| `marathon-vandal-shell-amplify-build-for-ranked-climbing-r1j5` | 2026-06-26 | NEXUS | **indexed** | 0a573cc5 |
| `marathon-vandal-build-the-amplify-ranked-climb-guide-s2-hb5a` | 2026-06-27 | DEXTER | **indexed** | 07d4909b |
| `marathon-vandal-build-amplify-movement-engine-for-ranked-u4lg` | 2026-07-03 | DEXTER | **indexed** | 165f05fb |
| `marathon-vandal-build-movement-mods-and-cradle-priorities-ati9` | 2026-07-04 | MIRANDA | **indexed** | 7dced512 |
| `marathon-vandal-build-amplify-movement-engine-for-ranked-tj6f` | 2026-07-12 | DEXTER | **indexed** | f797a93f |
| `marathon-vandal-build-why-amplify-is-the-ranked-underdog-u2pp` | 2026-07-12 | NEXUS | **indexed** | fa5f49f3 |

#### Assassin - other (12 articles, 12 still indexed)

Competing with DB-backed canonical: `/shells/assassin`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `console-assassin-shows-promise-in-extract-heavy-gameplay-z77r` | 2026-03-27 | CIPHER | **indexed** | b4449c9a |
| `gold-boss-controller-clutch-shows-assassin-shell-promise-77cu` | 2026-04-02 | CIPHER | **indexed** | 30cf46fe |
| `assassin-shell-gets-console-treatment-still-waiting-for-tech-ocz3` | 2026-04-07 | CIPHER | **indexed** | 9f93aacb |
| `assassin-shadow-strike-engine-post-security-update-knife-damage-revolu-cert` | 2026-05-10 | DEXTER | **indexed** | 7d9b166e |
| `assassin-shadow-strike-engine-post-security-update-invisibility-assass-36kx` | 2026-05-12 | DEXTER | **indexed** | b0b19e47 |
| `assassin-shadow-strike-engine-season-2-nightfall-stealth-revolution-jwau` | 2026-05-16 | DEXTER | **indexed** | dd067924 |
| `marathons-assassin-shell-sits-on-the-bench-tied-with-rook-for-6th-plac-y1y2` | 2026-05-26 | GHOST | **indexed** | 6af0bbe9 |
| `this-weeks-ranked-climb-why-assassin-is-the-solo-queue-answer-5bh8` | 2026-05-30 | CIPHER | **indexed** | 3647ed66 |
| `marathon-ranked-climb-playbook-the-assassin-thief-solo-strategy-9inb` | 2026-06-22 | CIPHER | **indexed** | b26f6d0f |
| `marathon-ranked-climb-playbook-thief-and-assassin-lead-this-week-h2y3` | 2026-06-27 | CIPHER | **indexed** | d359fac9 |
| `marathon-assassin-shell-master-stealth-and-solo-ranked-7d9r` | 2026-06-27 | MIRANDA | **indexed** | 00532404 |
| `marathon-assassin-shell-active-camo-in-pvp-explained-9z85` | 2026-07-13 | NEXUS | **indexed** | 32c465a7 |

#### WSTR Combat Shotgun - news/patch (12 articles, 12 still indexed)

Competing with DB-backed canonical: `/weapons/wstr-combat-shotgun`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `wstr-combat-shotgun-still-dominates-cqb-despite-106-weapon-adjustments-7pec` | 2026-04-17 | CIPHER | **indexed** | 599c50ec |
| `wstr-combat-shotgun-nerf-guide-what-changes-and-your-new-cqb-options-rze8` | 2026-04-18 | MIRANDA | **indexed** | ff7c7157 |
| `wstr-combat-shotgun-complete-build-guide-post-nerf-power-analysis-8vxq` | 2026-04-22 | MIRANDA | **indexed** | 058b6349 |
| `wstr-combat-shotgun-buff-changes-everything-patch-1062-ranked-impact-97og` | 2026-05-03 | CIPHER | **indexed** | f7d17e3e |
| `wstr-combat-shotgun-revival-post-1062-assassin-cqb-devastation-43ur` | 2026-05-03 | DEXTER | **indexed** | 4fbe7bcd |
| `wstr-combat-shotgun-comeback-marathon-1062-resurrects-cqb-meta-zz8d` | 2026-05-05 | CIPHER | **indexed** | 2b87bec9 |
| `wstr-combat-shotgun-renaissance-post-nerf-recovery-sparks-cqb-meta-rev-0clz` | 2026-05-05 | NEXUS | **indexed** | 37798887 |
| `marathon-1063-wstr-combat-shotgun-meta-solidifies-destroyer-dominance-5mki` | 2026-05-06 | CIPHER | **indexed** | b28c75eb |
| `wstr-combat-shotgun-meta-theory-post-1063-close-range-domination-0s5e` | 2026-05-07 | DEXTER | **indexed** | 7efcc42f |
| `wstr-combat-shotgun-theory-the-post-nerf-persistence-engine-still-deli-mg6f` | 2026-05-09 | DEXTER | **indexed** | 2ca0c46c |
| `wstr-combat-shotgun-nerfed-what-ranked-solo-players-should-swap-to-d608` | 2026-05-11 | CIPHER | **indexed** | 8cbe6904 |
| `wstr-combat-shotgun-nerf-changes-ranked-cqb-meta-winners-and-losers-ypdd` | 2026-05-14 | CIPHER | **indexed** | 87a83a46 |

#### Biotoxic Disinjector - news/patch (11 articles, 10 still indexed)

Competing with DB-backed canonical: `/weapons/biotoxic-disinjector`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `biotoxic-disinjector-nerf-hits-live-as-community-celebrates-exploit-fi-5juh` | 2026-04-04 | GHOST | noindex | 11f81763 |
| `biotoxic-disinjector-nerf-sparks-relief-as-bugs-plague-early-access-0rx0` | 2026-04-05 | GHOST | **indexed** | 2393e94d |
| `biotoxic-disinjector-nerf-guide-post-balance-weapon-tier-shifts-1ir9` | 2026-04-05 | MIRANDA | **indexed** | 31ad6e09 |
| `biotoxic-disinjector-emergency-nerf-hits-live-servers-after-community--qld9` | 2026-04-05 | GHOST | **indexed** | c83c71cd |
| `biotoxic-disinjector-35-damage-nerf-shakes-endgame-meta-knife-nerfs-ne-jzme` | 2026-04-05 | NEXUS | **indexed** | d4edd9e0 |
| `biotoxic-disinjector-nerf-sparks-relief-as-performance-issues-persist-ld3w` | 2026-04-05 | GHOST | **indexed** | cefe9963 |
| `biotoxic-disinjector-nerf-divides-community-after-35-damage-cut-bgxw` | 2026-04-06 | GHOST | **indexed** | 0d783f58 |
| `biotoxic-disinjector-emergency-nerf-divides-marathon-community-69nw` | 2026-04-06 | GHOST | **indexed** | 271ade05 |
| `biotoxic-disinjector-emergency-nerf-divides-community-on-power-fantasy-wlbo` | 2026-04-07 | GHOST | **indexed** | 9e80504b |
| `post-nerf-biotoxic-disinjector-build-red-tier-reality-check-24eo` | 2026-04-08 | DEXTER | **indexed** | 152d25c2 |
| `biotoxic-disinjector-hybrid-build-post-nerf-tactical-poison-meta-0brd` | 2026-04-17 | DEXTER | **indexed** | b8a5bebb |

#### Assassin - benchmark (10 articles, 10 still indexed)

Competing with DB-backed canonical: `/shells/assassin`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `marathon-ranked-holotag-theft-assassin-vs-thief-specialist-breakdown-kb3n` | 2026-03-18 | MIRANDA | **indexed** | 7e8aba61 |
| `assassin-phase-shift-build-ranked-holotag-theft-specialist-analysis-8uid` | 2026-03-23 | DEXTER | **indexed** | 45d74278 |
| `shadow-strike-assassin-the-solo-ranked-holotag-theft-build-jujz` | 2026-04-02 | DEXTER | **indexed** | 34b40885 |
| `assassin-ranked-mastery-phase-shift-timing-and-holotag-theft-technique-3319` | 2026-04-06 | MIRANDA | **indexed** | 6e68978e |
| `assassin-shell-mastery-holotag-theft-and-stealth-positioning-guide-39g3` | 2026-04-21 | MIRANDA | **indexed** | aedc16e9 |
| `assassin-shell-complete-stealth-guide-high-risk-holotag-theft-mastery-atv7` | 2026-04-24 | MIRANDA | **indexed** | 3db7f9fc |
| `complete-assassin-shell-stealth-guide-high-risk-holotag-theft-mastery-p7j4` | 2026-05-04 | MIRANDA | **indexed** | e5551172 |
| `complete-assassin-shell-stealth-guide-high-risk-high-reward-holotag-sp-2h0p` | 2026-05-10 | MIRANDA | **indexed** | cc4e0c0b |
| `assassin-shadow-dive-ranked-engine-the-season-2-solo-queue-holotag-hun-0pyg` | 2026-05-21 | DEXTER | **indexed** | 2b96392f |
| `marathon-assassin-shell-stealth-holotag-theft-and-solo-ranked-17ky` | 2026-07-08 | MIRANDA | **indexed** | 6cdd485e |

#### cryo archive - beginner-guide (10 articles, 10 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `cryo-archive-complete-vault-guide-secret-cryo-locations-compiler-boss-dpmg` | 2026-03-30 | MIRANDA | **indexed** | 171dece6 |
| `marathon-cryo-archive-secret-wallpapers-x-ray-visor-hunting-guide-u1jq` | 2026-03-31 | MIRANDA | **indexed** | b79c3e64 |
| `cryo-archive-complete-guide-7-vaults-compiler-boss-and-extract-routes-vrjk` | 2026-04-03 | MIRANDA | **indexed** | 033c19a0 |
| `cryo-archive-vault-order-guide-maximize-loot-before-extract-window-glag` | 2026-04-04 | MIRANDA | **indexed** | 1e62ffa6 |
| `vault-priority-guide-which-cryo-archive-vaults-to-hit-before-extract-m4hf` | 2026-04-05 | MIRANDA | **indexed** | 3e6a7c0d |
| `cryo-archive-complete-guide-vault-route-and-compiler-boss-strategy-owgv` | 2026-04-09 | MIRANDA | **indexed** | 51a46dc8 |
| `cryo-archive-247-the-complete-permanent-game-mode-guide-r66h` | 2026-05-21 | MIRANDA | **indexed** | 88b817a1 |
| `marathon-cryo-archive-guide-first-steps-into-the-endgame-2urw` | 2026-06-29 | MIRANDA | **indexed** | ac8fc3bf |
| `marathon-cryo-archive-guide-learning-the-endgame-before-mid-season-qy7a` | 2026-07-05 | NEXUS | **indexed** | 253c3e04 |
| `marathon-cryo-archive-guide-how-to-survive-your-first-raid-run-p2vh` | 2026-07-14 | MIRANDA | **indexed** | e9d294e7 |

#### Vandal - news/patch (10 articles, 10 still indexed)

Competing with DB-backed canonical: `/shells/vandal`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `vandal-shell-assault-rifle-build-carri-protocol-meta-after-update-106-4ijq` | 2026-04-15 | DEXTER | **indexed** | f59fc974 |
| `vandal-shell-combat-flow-build-post-106-carri-solo-dominance-vhso` | 2026-04-17 | DEXTER | **indexed** | 5a3bcf35 |
| `vandal-disrupt-cannon-build-post-1061-emp-support-meta-analysis-3zuo` | 2026-04-24 | DEXTER | **indexed** | 895aea15 |
| `vandal-combat-flow-build-post-1062-aggressive-positioning-meta-u3s2` | 2026-05-03 | DEXTER | **indexed** | 16a09f8a |
| `vandal-ascends-disrupt-cannon-buffs-drive-combat-shell-renaissance-fp8g` | 2026-05-04 | NEXUS | **indexed** | 5516965b |
| `vandal-disrupt-cannon-engine-post-1063-prestige-salvage-meta-kuvq` | 2026-05-06 | DEXTER | **indexed** | e6909e93 |
| `vandal-disrupt-cannon-engine-post-1063-prestige-salvage-hunt-theory-bim5` | 2026-05-08 | DEXTER | **indexed** | b160338d |
| `vandal-shell-tactical-mastery-disrupt-cannon-combo-meta-emerges-as-upd-hu87` | 2026-05-09 | NEXUS | **indexed** | 9689a3ba |
| `vandal-disrupt-cannon-engine-post-109-self-revive-counter-revolution-ousz` | 2026-05-14 | DEXTER | **indexed** | 63c4340e |
| `vandal-microjet-chain-engine-the-update-109-warden-hunt-dominator-lt3l` | 2026-05-20 | DEXTER | **indexed** | 52568737 |

#### Triage - build-guide (9 articles, 9 still indexed)

Competing with DB-backed canonical: `/shells/triage`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `loony-lemons-triage-build-shows-promise-for-aim-challenged-players-iubm` | 2026-03-26 | CIPHER | **indexed** | cf5d30c0 |
| `triage-shell-guide-med-drone-support-build-analysis-lx15` | 2026-04-07 | DEXTER | **indexed** | 2a0179e7 |
| `marathon-triage-build-volt-anchor-support-guide-for-ranked-squads-e4l9` | 2026-06-20 | DEXTER | **indexed** | 2558af68 |
| `marathon-triage-solo-build-best-ranked-loadout-right-now-f8ks` | 2026-06-23 | CIPHER | **indexed** | 5db9f1d0 |
| `marathon-triage-build-the-squad-support-engine-for-ranked-lqsa` | 2026-06-25 | DEXTER | **indexed** | 9b6445a3 |
| `marathon-triage-build-squad-anchor-loadout-for-ranked-2ztt` | 2026-06-29 | DEXTER | **indexed** | 0fdfe96f |
| `marathon-triage-shell-squad-support-build-and-ranked-guide-qmk2` | 2026-07-05 | MIRANDA | **indexed** | b84228fe |
| `marathon-triage-build-best-ranked-solo-loadout-for-climbing-66b3` | 2026-07-06 | CIPHER | **indexed** | 1c5c8dde |
| `marathon-triage-build-battery-overcharge-volt-combat-guide-67iv` | 2026-07-15 | DEXTER | **indexed** | 891cfa45 |

#### Rook - other (9 articles, 9 still indexed)

Competing with DB-backed canonical: `/shells/rook`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `rook-1v3-clutch-shows-shell-versatility-despite-shotgun-crutch-nq8i` | 2026-04-05 | CIPHER | **indexed** | 3d3a8ee2 |
| `rook-double-barrel-dominance-why-this-shell-excels-in-1v3-clutches-q1fu` | 2026-04-05 | DEXTER | **indexed** | c45654f3 |
| `rook-adaptive-frame-engine-post-security-update-control-theory-d9cf` | 2026-05-11 | DEXTER | **indexed** | dedad630 |
| `rook-overclock-engine-post-security-update-adaptive-frame-revolution-th5a` | 2026-05-12 | DEXTER | **indexed** | 7b128436 |
| `rook-adaptive-frame-engine-the-season-2-accessibility-solution-bungie--0w59` | 2026-05-19 | DEXTER | **indexed** | 3ca860d4 |
| `rook-week-the-ranked-climb-strategy-built-for-marathons-retention-cris-db15` | 2026-05-26 | CIPHER | **indexed** | cae95940 |
| `marathon-rook-shell-learn-ranked-before-you-specialize-y38m` | 2026-06-28 | MIRANDA | **indexed** | c60d23da |
| `marathons-community-health-bug-reports-friendly-rooks-and-the-retentio-akkk` | 2026-07-04 | GHOST | **indexed** | d29072d3 |
| `marathon-rook-shell-learn-the-game-before-it-punishes-you-9cql` | 2026-07-13 | MIRANDA | **indexed** | b79642d5 |

#### Rook - beginner-guide (9 articles, 9 still indexed)

Competing with DB-backed canonical: `/shells/rook`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `rook-shell-mastery-complete-beginners-guide-to-marathons-ultimate-star-tjgr` | 2026-04-09 | MIRANDA | **indexed** | b4b02935 |
| `new-player-shell-progression-guide-rook-to-specialist-path-nhg2` | 2026-04-20 | MIRANDA | **indexed** | 7e4bc8c0 |
| `rook-shell-complete-mastery-guide-best-beginner-shell-for-new-runners-kd00` | 2026-04-23 | MIRANDA | **indexed** | e4c61dd5 |
| `complete-rook-shell-guide-your-first-marathon-shell-mastery-zas5` | 2026-05-03 | MIRANDA | **indexed** | 26b8484b |
| `complete-rook-shell-flex-guide-master-the-learning-shell-for-ranked-su-5wft` | 2026-05-06 | MIRANDA | **indexed** | f1599f91 |
| `marathon-rook-shell-complete-guide-master-the-flexible-foundation-clj3` | 2026-05-10 | MIRANDA | **indexed** | 8367007b |
| `complete-rook-shell-guide-master-the-beginner-friendly-all-rounder-ixpw` | 2026-05-13 | MIRANDA | **indexed** | 3a08b5f0 |
| `complete-rook-shell-guide-the-essential-learning-platform-for-new-rank-p78h` | 2026-05-16 | MIRANDA | **indexed** | b1f9c60b |
| `marathon-rook-shell-guide-the-best-first-shell-for-new-players-v70a` | 2026-06-21 | MIRANDA | **indexed** | 17be754e |

#### Rook - build-guide (9 articles, 9 still indexed)

Competing with DB-backed canonical: `/shells/rook`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `dire-marsh-free-kit-experiment-rook-shell-poverty-build-optimization-yoju` | 2026-04-14 | DEXTER | **indexed** | 8827695d |
| `rook-shell-sponsored-kit-build-carri-protocols-team-multiplier-tank-1m58` | 2026-04-21 | DEXTER | **indexed** | b59459ab |
| `rook-shell-experimental-dire-marsh-build-overclock-adaptation-for-redu-sq6e` | 2026-04-23 | DEXTER | **indexed** | da1c4b6e |
| `marathon-rook-build-best-ranked-solo-loadout-with-the-m77-ar-uufq` | 2026-06-21 | CIPHER | **indexed** | b1dddc10 |
| `marathon-rook-build-the-solo-survival-anchor-for-season-2-v1ku` | 2026-06-21 | DEXTER | **indexed** | 2c97bc57 |
| `marathon-rook-build-the-solo-survivor-loadout-youre-sleeping-on-1cyl` | 2026-06-26 | DEXTER | **indexed** | 1ea362d9 |
| `marathon-rook-build-the-underrated-solo-survivor-loadout-z5m0` | 2026-07-01 | DEXTER | **indexed** | 370b5441 |
| `marathon-rook-build-the-solo-survivalist-guide-for-season-2-dlcf` | 2026-07-11 | DEXTER | **indexed** | 065c3277 |
| `marathon-rook-build-best-ranked-solo-loadout-right-now-99bm` | 2026-07-13 | CIPHER | **indexed** | fa74d691 |

#### Rook - news/patch (9 articles, 9 still indexed)

Competing with DB-backed canonical: `/shells/rook`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `rook-shell-sponsored-kit-build-free-equipment-meta-after-106-kj0p` | 2026-04-16 | DEXTER | **indexed** | f036619b |
| `rook-outpost-banking-build-overclock-credit-farming-post-1061-ye4z` | 2026-04-24 | DEXTER | **indexed** | 567caf43 |
| `irons-rook-outpost-banking-post-patch-sponsored-kit-economy-revolution-67ye` | 2026-04-26 | CIPHER | **indexed** | 2eccc8bf |
| `rook-shell-versatility-build-post-1062-adaptive-loadout-meta-z8i9` | 2026-05-03 | DEXTER | **indexed** | 5fb823f6 |
| `rook-adaptive-frame-engine-post-1063-flex-shell-optimization-pvf2` | 2026-05-05 | DEXTER | **indexed** | a6ea5523 |
| `rook-overclock-engine-post-1063-enhanced-sponsored-kit-meta-gbht` | 2026-05-08 | DEXTER | **indexed** | d591efff |
| `best-rook-ranked-solo-build-post-1063-grenade-spam-counter-cemi` | 2026-05-10 | CIPHER | **indexed** | e5851ab3 |
| `rook-overclock-engine-post-1063-free-green-kit-revolution-7gmg` | 2026-05-10 | DEXTER | **indexed** | 2367cb4b |
| `best-rook-ranked-solo-build-post-1063-adaptive-weapon-meta-xzeo` | 2026-05-12 | CIPHER | **indexed** | 8415a4ae |

#### Vandal - other (8 articles, 7 still indexed)

Competing with DB-backed canonical: `/shells/vandal`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `vandal-vs-thief-best-starter-shells-for-ranked-mode-awec` | 2026-03-08 | MIRANDA | noindex | 06b6cf1f |
| `vandal-undefeated-claims-ring-hollow-without-context-hakt` | 2026-03-22 | CIPHER | **indexed** | fe589ad4 |
| `vandal-movement-mastery-arm-cannon-positioning-and-micro-jets-manageme-71ho` | 2026-04-06 | MIRANDA | **indexed** | 65ecf883 |
| `vandal-disrupt-cannon-engine-post-security-update-tactical-artillery-t-2jzh` | 2026-05-10 | DEXTER | **indexed** | 503e5ca6 |
| `vandal-jump-jet-combo-engine-season-2-nightfall-mobility-revolution-ew1h` | 2026-05-17 | DEXTER | **indexed** | 0a55a0c8 |
| `vandal-anti-sweat-engine-season-2s-answer-to-marathons-hardcore-proble-5yxw` | 2026-05-19 | DEXTER | **indexed** | 025035f6 |
| `marathon-ranked-climb-playbook-vandal-gunfight-strategy-this-week-qbjj` | 2026-06-23 | CIPHER | **indexed** | e0c944ae |
| `marathon-vandal-shell-why-amplify-wins-the-mid-season-shift-umjd` | 2026-07-03 | NEXUS | **indexed** | a0b55041 |

#### Triage - other (8 articles, 8 still indexed)

Competing with DB-backed canonical: `/shells/triage`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `triage-squad-support-mastery-reboot-timing-and-medical-consumable-syne-c8o5` | 2026-04-06 | MIRANDA | **indexed** | 18a9ef12 |
| `triage-med-drone-engine-post-security-update-support-revolution-rj2r` | 2026-05-09 | DEXTER | **indexed** | f86c1e80 |
| `triage-echo-pulse-engine-season-2-squad-support-revolution-3zd2` | 2026-05-14 | DEXTER | **indexed** | 33b7f1e5 |
| `triage-squad-lock-engine-season-2-nightfall-end-game-preparation-u33p` | 2026-05-16 | DEXTER | **indexed** | 33d0a03a |
| `triage-support-engine-season-2-nightfall-accessibility-revolution-kjlq` | 2026-05-18 | DEXTER | **indexed** | 34b18477 |
| `shell-experimentation-wave-triage-cinematic-triggers-cross-shell-explo-gjni` | 2026-05-22 | NEXUS | **indexed** | 0f19ad87 |
| `marathon-triage-battery-overcharge-volt-weapon-emp-engine-h8ud` | 2026-06-14 | DEXTER | **indexed** | 53952dff |
| `marathon-triage-shell-the-squad-anchor-nobody-debates-hpj8` | 2026-06-27 | NEXUS | **indexed** | 4e7df6ec |

#### Conquest LMG - tier/meta (8 articles, 8 still indexed)

Competing with DB-backed canonical: `/weapons/conquest-lmg`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `conquest-lmg-supremacy-light-machine-gun-meta-defines-squad-ranked-dom-5bmb` | 2026-05-05 | NEXUS | **indexed** | aee5a655 |
| `conquest-lmg-ranked-revolution-light-round-suppression-meta-emerges-as-84i0` | 2026-05-10 | NEXUS | **indexed** | 9ed0f546 |
| `conquest-lmg-power-surge-light-round-suppression-meta-climbs-three-tie-yib3` | 2026-05-12 | NEXUS | **indexed** | 26891406 |
| `best-rook-build-for-season-2-ranked-solo-conquest-lmg-meta-zoyg` | 2026-05-17 | CIPHER | **indexed** | c040c483 |
| `best-triage-ranked-solo-build-conquest-lmg-support-carry-meta-ib6a` | 2026-05-25 | CIPHER | **indexed** | 7aa343fb |
| `best-rook-ranked-solo-build-conquest-lmg-flex-meta-l8pl` | 2026-05-31 | CIPHER | **indexed** | 89c7d160 |
| `this-weeks-ranked-climb-conquest-lmg-meta-makes-december-the-easy-seas-gy9d` | 2026-06-02 | CIPHER | **indexed** | cc7f81e5 |
| `conquest-lmg-stranglehold-heavy-sustained-fire-dominates-squad-ranked--xfmp` | 2026-06-03 | NEXUS | **indexed** | e1bef961 |

#### V75 Scar - tier/meta (8 articles, 8 still indexed)

Competing with DB-backed canonical: `/weapons/v75-scar`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `v75-scar-voltage-surge-charge-based-ar-claims-ranked-crown-as-volt-bat-1o0f` | 2026-05-08 | NEXUS | **indexed** | 824ff58c |
| `v75-scar-voltage-meta-this-weeks-solo-ranked-express-lane-wk2k` | 2026-05-09 | CIPHER | **indexed** | a793ffeb |
| `v75-scar-voltage-surge-volt-battery-meta-dominates-mid-range-as-season-io32` | 2026-05-11 | NEXUS | **indexed** | 8d89075f |
| `best-vandal-build-for-season-2-ranked-solo-v75-scar-meta-ex3w` | 2026-05-17 | CIPHER | **indexed** | 01341175 |
| `triage-ranked-solo-build-v75-scar-energy-meta-vsz2` | 2026-05-21 | CIPHER | **indexed** | bf23576f |
| `best-vandal-ranked-solo-build-v75-scar-energy-weapon-meta-6njy` | 2026-05-22 | CIPHER | **indexed** | 0a9a8996 |
| `energy-weapon-revolution-volt-battery-meta-reshapes-marathons-power-ec-xfc1` | 2026-05-25 | NEXUS | **indexed** | b19ca6ed |
| `rook-overclock-engine-the-season-2-adaptive-meta-that-turns-v75-scar-i-bggg` | 2026-05-31 | DEXTER | **indexed** | e2b04f6a |

#### Vandal - counter-guide (8 articles, 7 still indexed)

Competing with DB-backed canonical: `/shells/vandal`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `the-range-counter-to-vandal-that-won-ranked-this-week-rek0` | 2026-05-09 | CIPHER | **indexed** | c2aff172 |
| `the-vandal-counter-most-players-miss-long-range-precision-control-32o9` | 2026-05-12 | CIPHER | **indexed** | 8d681f26 |
| `the-counter-to-vandal-most-players-miss-range-control-strategy-jzmx` | 2026-05-15 | CIPHER | **indexed** | 9ec5d332 |
| `the-counter-to-vandal-most-players-miss-extreme-range-denial-622z` | 2026-05-19 | CIPHER | **indexed** | b52cbace |
| `the-counter-to-vandal-most-players-miss-recon-echo-pulse-strategy-mfno` | 2026-05-23 | CIPHER | **indexed** | c048793e |
| `the-counter-to-vandal-most-players-miss-recons-hard-answer-pkd9` | 2026-05-29 | CIPHER | **indexed** | 8ab3eae9 |
| `marathon-vandal-counter-guide-how-to-beat-it-in-ranked-solo-13ts` | 2026-06-26 | CIPHER | noindex | 28326aa9 |
| `marathon-vandal-counter-guide-how-to-beat-it-in-ranked-solo-akx6` | 2026-07-04 | CIPHER | **indexed** | 9494c13e |

#### Assassin - counter-guide (8 articles, 8 still indexed)

Competing with DB-backed canonical: `/shells/assassin`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `how-to-counter-assassins-phase-shift-the-range-control-strategy-tbjj` | 2026-05-12 | CIPHER | **indexed** | 6e869089 |
| `the-real-counter-to-assassin-distance-control-strategy-jsmz` | 2026-05-16 | CIPHER | **indexed** | 88f957e5 |
| `how-to-beat-assassin-in-ranked-solo-the-hard-counter-most-players-miss-jz8j` | 2026-05-27 | CIPHER | **indexed** | fef3e56a |
| `the-counter-to-assassin-most-players-miss-range-control-eti0` | 2026-06-07 | CIPHER | **indexed** | 22419223 |
| `marathon-assassin-counter-vandal-mid-range-control-h382` | 2026-06-14 | CIPHER | **indexed** | e181582f |
| `marathon-assassin-counter-how-to-beat-it-with-recon-y50h` | 2026-06-19 | CIPHER | **indexed** | 2ec2a58c |
| `marathon-assassin-counter-guide-how-to-beat-it-in-ranked-solo-mvdf` | 2026-06-28 | CIPHER | **indexed** | 8480f407 |
| `marathon-assassin-counter-how-to-beat-it-in-ranked-solo-ow4i` | 2026-07-14 | CIPHER | **indexed** | ceb0cec1 |

#### Thief - other (7 articles, 6 still indexed)

Competing with DB-backed canonical: `/shells/thief`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `thief-shell-mastery-or-basic-loot-run-slashertoms-54-second-mystery-xxnb` | 2026-03-23 | CIPHER | **indexed** | 3f70d48b |
| `thief-hype-drowns-out-matchmaking-fix-complaints-and-technical-woes-6pj7` | 2026-03-26 | GHOST | noindex | cc306d21 |
| `thief-x-ray-visor-advanced-techniques-finding-high-value-targets-in-ra-34a9` | 2026-03-28 | MIRANDA | **indexed** | 49a0e188 |
| `thief-pickpocket-drone-exploit-fixed-master-the-new-cooldown-system-xt4x` | 2026-03-29 | MIRANDA | **indexed** | 75386ad3 |
| `thief-speed-stack-engine-season-2-nightfall-preparation-theory-el6d` | 2026-05-15 | DEXTER | **indexed** | 85636aed |
| `marathon-ranked-this-week-thief-dominance-strategy-arjk` | 2026-06-13 | CIPHER | **indexed** | da7d3713 |
| `marathon-thief-shell-loot-fast-extract-clean-win-solo-fm0l` | 2026-07-02 | MIRANDA | **indexed** | 2978ef4d |

#### Assassin - build-guide (7 articles, 7 still indexed)

Competing with DB-backed canonical: `/shells/assassin`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `assassin-gold-boss-survival-high-risk-cqb-build-for-controller-players-9p3b` | 2026-04-02 | DEXTER | **indexed** | f2f3842a |
| `assassin-phase-shift-engine-the-season-2-beginner-friendly-stealth-bui-b0ib` | 2026-05-19 | DEXTER | **indexed** | e446a7bd |
| `marathon-assassin-build-smoke-screen-ranged-engine-for-ranked-9up4` | 2026-06-22 | DEXTER | **indexed** | 413ba09d |
| `marathon-assassin-knife-build-shadow-strike-season-2-deep-dive-j8ae` | 2026-06-30 | DEXTER | **indexed** | 074f2ab9 |
| `marathon-knife-build-shadow-strike-assassin-is-the-move-jlei` | 2026-06-30 | NEXUS | **indexed** | a0a43380 |
| `marathon-assassin-build-best-ranked-solo-loadout-right-now-qecg` | 2026-07-05 | CIPHER | **indexed** | 0e933591 |
| `marathon-assassin-build-shadow-strike-knife-engine-guide-j2op` | 2026-07-09 | DEXTER | **indexed** | f0a94fa7 |

#### Knife - news/patch (7 articles, 7 still indexed)

Competing with DB-backed canonical: `/weapons/knife`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `pre-nerf-meta-snapshot-developers-target-knife-lethality-and-sniper-do-jjra` | 2026-04-04 | NEXUS | **indexed** | e1bdbb41 |
| `budget-brrt-builds-dominate-as-knife-nerfs-and-secret-items-reshape-me-eyak` | 2026-04-06 | NEXUS | **indexed** | 18d4f321 |
| `knife-nerf-lands-as-community-splits-on-bubble-shield-changes-h45x` | 2026-04-07 | GHOST | **indexed** | 7e75ce68 |
| `knife-nerf-analysis-update-1053-reshapes-close-quarter-combat-meta-huwx` | 2026-04-07 | MIRANDA | **indexed** | ff762058 |
| `heavy-rounds-surge-knife-nerfs-bubble-shield-weakness-reshapes-combat-qz9t` | 2026-04-09 | NEXUS | **indexed** | e4dc01be |
| `knife-to-kit-progression-shows-post-patch-depleted-med-scaling-vlsc` | 2026-04-24 | CIPHER | **indexed** | 54e7a0a4 |
| `tower-casuals-marathon-chaos-shows-post-wstr-nerf-knife-meta-rising-bd3w` | 2026-04-25 | CIPHER | **indexed** | 6b7b4d77 |

#### Destroyer - build-guide (7 articles, 7 still indexed)

Competing with DB-backed canonical: `/shells/destroyer`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `brrt-smg-destroyer-build-cqb-domination-through-superior-firepower-0a9h` | 2026-04-05 | DEXTER | **indexed** | 337376f0 |
| `marathon-destroyer-solo-build-best-ranked-loadout-right-now-3so6` | 2026-06-20 | CIPHER | **indexed** | 0f437da7 |
| `marathon-destroyer-build-riot-barricade-frontline-guide-s2-jxnl` | 2026-06-21 | DEXTER | **indexed** | 9ae03fd2 |
| `marathon-destroyer-build-the-search-destroy-squad-anchor-rf30` | 2026-06-26 | DEXTER | **indexed** | 84a33f05 |
| `marathon-destroyer-build-best-ranked-solo-loadout-right-now-y2c6` | 2026-06-28 | CIPHER | **indexed** | f7a8dad5 |
| `marathon-destroyer-build-the-riot-barricade-squad-carry-guide-fom2` | 2026-07-02 | DEXTER | **indexed** | a2c9ed8b |
| `marathon-destroyer-build-best-ranked-solo-loadout-right-now-5y5g` | 2026-07-15 | CIPHER | **indexed** | d65c617a |

#### Demolition HMG - news/patch (7 articles, 7 still indexed)

Competing with DB-backed canonical: `/weapons/demolition-hmg`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `demolition-hmg-shows-promise-post-bubble-shield-nerf-in-1053-k9qf` | 2026-04-09 | CIPHER | **indexed** | f78f9c22 |
| `mukeworlds-demolition-hmg-play-shows-post-nerf-heavy-weapon-viability-f7ux` | 2026-04-09 | CIPHER | **indexed** | 4977f4a7 |
| `destroyer-demolition-hmg-build-the-new-post-patch-ranked-powerhouse-i1ev` | 2026-04-09 | DEXTER | **indexed** | fa884c4d |
| `demolition-hmg-destroyer-build-post-wstr-nerf-heavy-weapons-resurgence-c7mx` | 2026-04-20 | DEXTER | **indexed** | 0bbe2e03 |
| `demolition-hmg-emerges-heavy-rounds-meta-defines-post-patch-combat-lan-pjn1` | 2026-05-04 | NEXUS | **indexed** | c2507ca9 |
| `post-1062-demolition-hmg-terror-the-new-anti-grenade-tank-meta-aaas` | 2026-05-04 | DEXTER | **indexed** | 4b490b89 |
| `demolition-hmg-warden-hunt-engine-update-109s-heavy-armor-counter-meta-qq0w` | 2026-05-20 | DEXTER | **indexed** | 60173aad |

#### Destroyer - counter-guide (7 articles, 7 still indexed)

Competing with DB-backed canonical: `/shells/destroyer`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `destroyer-counter-attack-engine-season-2-nightfall-anti-rush-meta-pxpl` | 2026-05-18 | DEXTER | **indexed** | 9c92cc1f |
| `how-to-beat-assassin-the-destroyer-counter-strategy-most-players-miss-wk9q` | 2026-05-23 | CIPHER | **indexed** | b543db86 |
| `the-counter-to-rook-most-players-miss-destroyers-answer-to-flexibility-84o4` | 2026-05-26 | CIPHER | **indexed** | 6561828f |
| `the-counter-to-thief-most-players-miss-destroyers-hard-answer-y353` | 2026-05-26 | CIPHER | **indexed** | d53e6765 |
| `how-to-beat-thief-in-ranked-solo-the-destroyer-hard-counter-ba3j` | 2026-05-31 | CIPHER | **indexed** | 0e6dd2b4 |
| `best-rook-ranked-solo-build-the-destroyer-counter-meta-586n` | 2026-06-11 | CIPHER | **indexed** | 2cac6341 |
| `the-counter-to-thief-most-players-miss-destroyer-barricade-control-v3ps` | 2026-06-12 | CIPHER | **indexed** | cf06499c |

#### Sentinel - build-guide (7 articles, 7 still indexed)

Competing with DB-backed canonical: `/shells/sentinel`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `marathon-sentinel-build-castle-doctrine-smg-anchor-guide-s2-84hk` | 2026-06-18 | DEXTER | **indexed** | 63de53b9 |
| `marathon-sentinel-build-castle-doctrine-cqb-guide-s2-fhiq` | 2026-06-23 | DEXTER | **indexed** | 070d05b7 |
| `marathon-sentinel-build-high-rank-playstyle-and-kit-breakdown-fl0n` | 2026-06-23 | MIRANDA | **indexed** | a3a40f68 |
| `marathon-sentinel-build-castle-doctrine-smg-guide-s2-y9mt` | 2026-06-28 | DEXTER | **indexed** | 6c6bcbc5 |
| `marathon-sentinel-build-castle-doctrine-shotgun-dominance-guide-qo5r` | 2026-07-05 | DEXTER | **indexed** | 7e9d45c7 |
| `marathon-sentinel-build-castle-doctrine-shotgun-guide-p3sl` | 2026-07-14 | DEXTER | **indexed** | 2c47f2f6 |
| `marathon-sentinel-shell-zone-control-build-and-squad-guide-65df` | 2026-07-15 | MIRANDA | **indexed** | 6ff32e98 |

#### extraction - other (6 articles, 6 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `marathon-extraction-route-mastery-securing-your-ranked-progress-y6a8` | 2026-03-14 | MIRANDA | **indexed** | e0bb5a81 |
| `marathon-solo-extraction-strategy-map-zones-and-early-exit-timing-zwah` | 2026-03-18 | MIRANDA | **indexed** | b100361b |
| `waxs-clutch-extraction-shows-why-millisecond-timing-separates-ranks-bz3p` | 2026-04-15 | CIPHER | **indexed** | 14d770e1 |
| `steam-reviews-reveal-marathons-core-problem-amazing-gunplay-wrapped-in-eqpj` | 2026-05-04 | GHOST | **indexed** | 2be53ee9 |
| `steam-reviews-expose-marathons-hidden-divide-extraction-magic-vs-multi-lelb` | 2026-05-07 | GHOST | **indexed** | 914fa3e1 |
| `marathon-community-goes-silent-as-season-2-details-remain-vague-reddit-3tfl` | 2026-05-14 | GHOST | **indexed** | fe5e7a1c |

#### Recon - beginner-guide (6 articles, 6 still indexed)

Competing with DB-backed canonical: `/shells/recon`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `sheaffers-recon-guide-intelligence-warfare-in-15-minutes-kykm` | 2026-03-31 | CIPHER | **indexed** | 0ce0817d |
| `recon-solo-queue-guide-how-to-win-ranked-without-a-squad-w49t` | 2026-04-16 | MIRANDA | **indexed** | 0d9779ca |
| `recon-shell-mastery-guide-intelligence-dominance-for-squad-support-8gmg` | 2026-04-20 | MIRANDA | **indexed** | d08f4e8f |
| `marathon-recon-shell-guide-win-fights-before-they-start-ob7m` | 2026-06-19 | MIRANDA | **indexed** | c677197e |
| `marathon-recon-shell-guide-map-control-and-squad-intel-rd86` | 2026-06-26 | MIRANDA | **indexed** | f58f75cf |
| `marathon-recon-shell-map-control-and-ranked-squad-guide-6efy` | 2026-07-06 | MIRANDA | **indexed** | 006dccce |

#### sponsored kit - other (6 articles, 6 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `free-railgun-access-sponsored-kits-eliminate-faction-lock-barriers-ojjj` | 2026-04-16 | NEXUS | **indexed** | b66526b7 |
| `faction-economy-collapse-sponsored-kit-revolution-destroys-gear-barrie-kez0` | 2026-04-18 | NEXUS | **indexed** | 16707547 |
| `community-celebrates-sponsored-kit-overhaul-as-med-economy-gets-long-a-9rhx` | 2026-04-24 | GHOST | **indexed** | fc85dd07 |
| `free-weekly-sponsored-kits-break-ranked-economy-what-to-prioritize-u289` | 2026-05-03 | CIPHER | **indexed** | 3b5f2790 |
| `community-shrugs-at-major-security-push-while-enhanced-sponsored-kit-r-g9hj` | 2026-05-08 | GHOST | **indexed** | 32139ce2 |
| `marathon-steam-players-celebrate-anti-cheat-progress-while-sponsored-k-7xd6` | 2026-05-12 | GHOST | **indexed** | 6f67396b |

#### V99 Channel Rifle - tier/meta (6 articles, 6 still indexed)

Competing with DB-backed canonical: `/weapons/v99-channel-rifle`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `cryo-archive-compiler-hunt-v99-channel-rifle-sniper-build-meta-analysi-xigk` | 2026-04-23 | DEXTER | **indexed** | aa710e87 |
| `sniper-rifle-meta-shift-outland-and-v99-channel-rifle-define-season-2--5d7g` | 2026-05-17 | NEXUS | **indexed** | 2a534c46 |
| `sniper-supremacy-surge-longshot-and-v99-channel-rifle-break-range-meta-m4b4` | 2026-05-20 | NEXUS | **indexed** | 5cb9d31e |
| `cryo-archive-meta-the-v99-channel-rifle-long-range-assassination-build-ielf` | 2026-05-25 | DEXTER | **indexed** | d5729ab1 |
| `v99-channel-rifle-breakout-nextlevel-jj-spotlight-signals-energy-snipe-7vcq` | 2026-05-26 | NEXUS | **indexed** | ca1af6b2 |
| `v99-channel-rifle-volt-engine-the-charge-accumulation-meta-that-turns--8dqi` | 2026-05-26 | DEXTER | **indexed** | ece7e9bf |

#### tau ceti - tier/meta (5 articles, 5 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `tau-ceti-cup-results-tournament-meta-reveals-new-ranked-strategies-pl2d` | 2026-03-16 | MIRANDA | **indexed** | 441c8783 |
| `tau-ceti-cup-breakdown-team-shrouds-victory-reveals-ranked-meta-shifts-jxrh` | 2026-03-17 | MIRANDA | **indexed** | 4b79cc7f |
| `tau-ceti-cup-champion-meta-team-shrouds-winning-strategies-decoded-evnt` | 2026-03-17 | MIRANDA | **indexed** | 576453cd |
| `tau-ceti-cup-victory-lap-post-tournament-meta-analysis-and-lessons-b64a` | 2026-04-15 | MIRANDA | **indexed** | 0c2d2ff5 |
| `tau-ceti-cup-victory-lap-tournament-meta-lessons-for-ranked-success-hvs7` | 2026-04-18 | MIRANDA | **indexed** | a1bbe764 |

#### extraction - tier/meta (5 articles, 5 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `marathon-ranked-explained-holotag-system-tier-rewards-extraction-strat-d04h` | 2026-03-19 | MIRANDA | **indexed** | 02dcc852 |
| `northernranger-attempts-meta-analysis-tier-lists-dont-win-extractions-tcie` | 2026-04-07 | CIPHER | **indexed** | 2680bd9b |
| `waxs-sub-second-extraction-shows-free-kit-experimental-meta-shift-xjrj` | 2026-04-17 | CIPHER | **indexed** | 17f3dc07 |
| `depleted-kit-economy-overhaul-reshapes-low-risk-extraction-meta-k4nd` | 2026-04-21 | CIPHER | **indexed** | 47607ca6 |
| `faction-power-balance-the-season-2-progression-meta-that-reveals-which-fag7` | 2026-06-11 | DEXTER | **indexed** | 18b0a188 |

#### Thief - benchmark (5 articles, 5 still indexed)

Competing with DB-backed canonical: `/shells/thief`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `thief-scan-drone-mastery-intelligence-vs-speed-in-ranked-holotag-hunts-t9vt` | 2026-03-29 | MIRANDA | **indexed** | ca4a937f |
| `thief-ranked-mastery-grapple-device-holotag-steal-timing-and-escape-ro-da6n` | 2026-04-08 | MIRANDA | **indexed** | 42ffce08 |
| `thief-case-the-joint-engine-the-x-ray-vision-solo-ranked-build-that-hu-cmsx` | 2026-05-24 | DEXTER | **indexed** | 1c40a6cf |
| `marathon-thief-build-solo-ranked-holotag-extraction-guide-d2h8` | 2026-06-29 | DEXTER | **indexed** | 4f39ef95 |
| `marathon-thief-shell-grapple-holotag-dominance-wont-last-dkkj` | 2026-06-29 | NEXUS | **indexed** | 4789b61f |

#### Repeater HPR - tier/meta (5 articles, 5 still indexed)

Competing with DB-backed canonical: `/weapons/repeater-hpr`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `pray2play-identifies-meta-shift-repeater-hpr-overtaking-snipers-2sue` | 2026-04-04 | CIPHER | **indexed** | 0358efd7 |
| `repeater-hpr-meta-analysis-the-new-sniper-king-4zz5` | 2026-04-04 | DEXTER | **indexed** | bb168915 |
| `repeater-hpr-precision-revival-long-range-meta-shifts-as-community-cha-jd08` | 2026-05-13 | NEXUS | **indexed** | 250519a3 |
| `repeater-hpr-engine-season-2-long-range-meta-revolution-9lcw` | 2026-05-15 | DEXTER | **indexed** | cf16a5d6 |
| `repeater-hpr-build-optimization-youtube-creator-analysis-reveals-preci-53b1` | 2026-05-15 | NEXUS | **indexed** | c18e968f |

#### BRRT SMG - news/patch (5 articles, 5 still indexed)

Competing with DB-backed canonical: `/weapons/brrt-smg`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `brrt-smg-surge-biotoxic-nerf-reshapes-cqb-meta-zd2k` | 2026-04-05 | NEXUS | **indexed** | 8551e4ce |
| `biotox-nerf-opens-door-for-brrt-smg-meta-youtube-surge-shows-wrong-gam-4w1x` | 2026-04-06 | NEXUS | **indexed** | 5dbf7c52 |
| `brrt-smg-and-thief-shell-dominate-ranked-meta-after-biotoxic-nerf-0k4k` | 2026-04-06 | NEXUS | **indexed** | 4962d7d7 |
| `brrt-smg-unique-shotgun-mode-creates-new-cqb-meta-post-wstr-nerf-e5tf` | 2026-04-20 | CIPHER | **indexed** | 2b53db2b |
| `thief-shell-brrt-smg-build-post-wstr-nerf-speed-demon-dominance-gplo` | 2026-04-20 | DEXTER | **indexed** | e257c5b8 |

#### Stryder M1T - tier/meta (5 articles, 5 still indexed)

Competing with DB-backed canonical: `/weapons/stryder-m1t`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `rook-ranked-solo-build-stryder-m1t-precision-meta-5tfj` | 2026-05-21 | CIPHER | **indexed** | 0a65cb42 |
| `best-recon-ranked-solo-build-stryder-m1t-precision-meta-rg1f` | 2026-05-23 | CIPHER | **indexed** | 6a57f903 |
| `best-recon-ranked-solo-build-stryder-m1t-mid-range-control-meta-tzwv` | 2026-05-27 | CIPHER | **indexed** | a09905ac |
| `best-assassin-ranked-solo-build-stryder-m1t-precision-meta-6zga` | 2026-06-02 | CIPHER | **indexed** | 63083d41 |
| `best-recon-mid-range-build-stryder-m1t-intel-control-meta-zkgf` | 2026-06-10 | CIPHER | **indexed** | 7191d3e2 |

#### Sentinel - other (5 articles, 5 still indexed)

Competing with DB-backed canonical: `/shells/sentinel`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `marathon-sentinel-shell-the-underrated-pick-rising-in-s2-3q4a` | 2026-06-20 | NEXUS | **indexed** | bf5c9a95 |
| `marathon-sentinel-shell-the-underrated-pick-ready-to-rise-1k84` | 2026-06-26 | NEXUS | **indexed** | fda203a6 |
| `marathon-sentinel-shell-zone-control-and-exfil-defense-jc3r` | 2026-06-30 | MIRANDA | **indexed** | c462efe1 |
| `marathon-sentinel-shell-is-it-worth-running-in-season-2-zk36` | 2026-07-01 | NEXUS | **indexed** | a1ee66a4 |
| `marathon-sentinel-shell-the-underrated-squad-pick-rising-e5a4` | 2026-07-11 | NEXUS | **indexed** | 7d942e3c |

#### holotag - benchmark (4 articles, 2 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `ranked-shell-selection-your-first-holotag-climb-guide-ecc2` | 2026-03-07 | MIRANDA | noindex | c9fdc1fa |
| `essential-ranked-mode-preparation-shell-selection-and-holotag-strategy-rnk2` | 2026-03-11 | MIRANDA | noindex | 76d2d34b |
| `holotag-hunt-strategy-high-value-target-priority-for-ranked-v5f7` | 2026-03-13 | MIRANDA | **indexed** | 715e5637 |
| `marathon-ranked-holotag-requirements-season-2-skill-gates-defined-9oeh` | 2026-05-15 | CIPHER | **indexed** | c2694f86 |

#### Destroyer - other (4 articles, 4 still indexed)

Competing with DB-backed canonical: `/shells/destroyer`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `hoshiinotv-showcases-destroyers-raw-combat-power-in-68-seconds-nslh` | 2026-03-25 | CIPHER | **indexed** | 523024f6 |
| `destroyer-prime-ability-timing-thruster-cooldown-management-in-ranked-r9y5` | 2026-04-05 | MIRANDA | **indexed** | 0f3b67d6 |
| `vandal-vs-destroyer-which-shell-wins-more-ranked-games-5y1t` | 2026-05-19 | MIRANDA | **indexed** | 69b58595 |
| `marathon-destroyer-shell-why-barricade-is-the-wrong-read-2r7w` | 2026-06-29 | NEXUS | **indexed** | e33d76f8 |

#### Vandal - beginner-guide (4 articles, 4 still indexed)

Competing with DB-backed canonical: `/shells/vandal`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `vandal-guide-misses-ranked-context-solo-shell-needs-squad-analysis-8uxf` | 2026-03-26 | CIPHER | **indexed** | 1836f11f |
| `vandal-shell-complete-combat-guide-best-starting-ranked-shell-mastery-97vr` | 2026-05-03 | MIRANDA | **indexed** | 39b4651f |
| `vandal-shell-complete-guide-why-its-marathons-best-starting-ranked-she-gqxy` | 2026-05-20 | MIRANDA | **indexed** | 9401b39d |
| `marathon-vandal-shell-guide-movement-heat-and-ranked-climbing-blny` | 2026-06-25 | MIRANDA | **indexed** | 15f623a1 |

#### Destroyer - beginner-guide (4 articles, 4 still indexed)

Competing with DB-backed canonical: `/shells/destroyer`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `destroyer-shell-advanced-combat-guide-squad-domination-tactics-tkpu` | 2026-04-21 | MIRANDA | **indexed** | fe1b7414 |
| `marathon-destroyer-shell-guide-squad-ranked-dominance-e338` | 2026-06-20 | MIRANDA | **indexed** | 8304c279 |
| `marathon-destroyer-shell-squad-ranked-domination-guide-hch2` | 2026-06-27 | MIRANDA | **indexed** | 79f47ec0 |
| `marathon-destroyer-shell-squad-dominance-and-ranked-guide-l7j1` | 2026-07-07 | MIRANDA | **indexed** | 69233d07 |

#### Ares RG - news/patch (4 articles, 4 still indexed)

Competing with DB-backed canonical: `/weapons/ares-rg`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `ares-rg-one-shot-crisis-marathon-1062-nerf-reshapes-ranked-sniping-44rl` | 2026-05-03 | CIPHER | **indexed** | 06bbf9d1 |
| `ares-rg-anti-one-shot-build-post-1062-railgun-counter-theory-zzln` | 2026-05-05 | DEXTER | **indexed** | 97152457 |
| `ares-rg-one-shot-prevention-marathon-patch-reshapes-long-range-meta-vitv` | 2026-05-07 | CIPHER | **indexed** | cfaa5c02 |
| `ares-rg-post-nerf-theory-the-123-damage-precision-engine-still-dominat-qioy` | 2026-05-07 | DEXTER | **indexed** | bac1c519 |

#### Magnum MC - tier/meta (4 articles, 4 still indexed)

Competing with DB-backed canonical: `/weapons/magnum-mc`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `magnum-mc-breakout-heavy-pistol-defines-close-range-dueling-meta-anop` | 2026-05-04 | NEXUS | **indexed** | ecca46c0 |
| `magnum-mc-precision-surge-heavy-round-meta-climbs-two-tiers-as-securit-dot4` | 2026-05-11 | NEXUS | **indexed** | f7f9d67d |
| `pistol-precision-surge-magnum-mc-and-ce-tactical-define-season-2-night-vahp` | 2026-05-18 | NEXUS | **indexed** | 2765d0e5 |
| `marathon-magnum-mc-guide-the-pistol-meta-hiding-in-plain-sight-qkkh` | 2026-06-23 | MIRANDA | **indexed** | b7ddbb9d |

#### V22 Volt Thrower - tier/meta (4 articles, 4 still indexed)

Competing with DB-backed canonical: `/weapons/v22-volt-thrower`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `v22-volt-thrower-engine-post-security-update-sponsored-kit-meta-revolu-y4d0` | 2026-05-12 | DEXTER | **indexed** | 13e6cfec |
| `smg-speed-revolution-brrt-and-v22-volt-thrower-lead-cqb-meta-surge-as--geid` | 2026-05-18 | NEXUS | **indexed** | 3150655c |
| `best-assassin-ranked-solo-build-v22-volt-thrower-silent-meta-gr0l` | 2026-05-22 | CIPHER | **indexed** | eddb7eeb |
| `volt-weapons-surge-as-energy-meta-reshapes-extraction-v75-scar-and-v22-powl` | 2026-05-29 | NEXUS | **indexed** | 57806d64 |

#### Thief - counter-guide (4 articles, 4 still indexed)

Competing with DB-backed canonical: `/shells/thief`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `how-to-beat-thief-in-ranked-solo-the-range-control-strategy-dv5q` | 2026-05-13 | CIPHER | **indexed** | 4c86abf8 |
| `the-counter-to-thief-most-players-miss-railgun-range-denial-gjuu` | 2026-05-20 | CIPHER | **indexed** | badf02a3 |
| `marathon-thief-counter-guide-beat-it-in-ranked-solo-jlpz` | 2026-06-21 | CIPHER | **indexed** | 8d382d19 |
| `marathon-thief-counter-guide-how-to-beat-it-in-ranked-solo-izvk` | 2026-06-30 | CIPHER | **indexed** | 33420c0c |

#### BRRT SMG - tier/meta (4 articles, 4 still indexed)

Competing with DB-backed canonical: `/weapons/brrt-smg`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `brrt-smg-engine-end-of-season-meta-disruption-k1bh` | 2026-05-15 | DEXTER | **indexed** | 9c9c8d15 |
| `brrt-smg-flechette-revolution-1000-rpm-cqb-monster-climbs-meta-as-seas-pp5t` | 2026-05-16 | NEXUS | **indexed** | ebdc3a25 |
| `best-thief-ranked-solo-build-brrt-smg-speed-meta-hg9k` | 2026-05-24 | CIPHER | **indexed** | 25732811 |
| `best-vandal-ranked-solo-build-brrt-smg-aggro-meta-zwxa` | 2026-05-28 | CIPHER | **indexed** | 236be852 |

#### Triage - event/stream (4 articles, 4 still indexed)

Competing with DB-backed canonical: `/shells/triage`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `triage-shell-renaissance-bungies-season-2-launch-admission-sparks-supp-0c4o` | 2026-05-17 | NEXUS | **indexed** | 087734d8 |
| `triage-cinematic-drops-as-support-meta-solidifies-community-spotlight--d4l5` | 2026-05-26 | NEXUS | **indexed** | b89776bc |
| `marathon-triage-shell-guide-keep-your-squad-alive-in-s2-ydjg` | 2026-06-19 | MIRANDA | **indexed** | e5975d8e |
| `marathon-triage-shell-guide-keep-your-squad-alive-and-extracting-1czk` | 2026-06-26 | MIRANDA | **indexed** | 7740cd1d |

#### Sentinel - tier/meta (4 articles, 4 still indexed)

Competing with DB-backed canonical: `/shells/sentinel`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `sentinel-hype-fractures-community-season-2-bubble-shell-speculation-dr-9odj` | 2026-05-28 | NEXUS | **indexed** | 9c060a13 |
| `sentinel-defensive-engine-the-season-2-castle-doctrine-meta-that-turns-9v2w` | 2026-05-28 | DEXTER | **indexed** | 3b70c1e7 |
| `sentinel-hype-overshadows-shell-reality-new-defensive-runner-generates-hdvt` | 2026-06-02 | NEXUS | **indexed** | 3c10ea78 |
| `sentinel-castle-doctrine-engine-the-season-2-defensive-meta-that-turns-a05z` | 2026-06-09 | DEXTER | **indexed** | d02421d1 |

#### Knife - tier/meta (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/weapons/knife`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `rook-dominates-tutorial-phase-as-knife-builds-rise-in-early-marathon-m-cz36` | 2026-03-21 | NEXUS | **indexed** | b6e22815 |
| `xi-shows-knife-meta-is-broken-100-melee-damage-build-analysis-49dw` | 2026-03-28 | CIPHER | **indexed** | a5fd6c07 |
| `rebecalamitys-knife-meta-claims-need-scrutiny-melee-isnt-s-tier-5v6y` | 2026-04-01 | CIPHER | **indexed** | 304c407e |

#### WSTR Combat Shotgun - tier/meta (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/weapons/wstr-combat-shotgun`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `vandal-wstr-combat-shotgun-the-extraction-meta-that-actually-works-oq6f` | 2026-03-22 | DEXTER | **indexed** | 174e92ac |
| `wstr-combat-shotgun-cryo-archive-meta-analysis-24sz` | 2026-03-30 | DEXTER | **indexed** | 0a0ee744 |
| `wstr-combat-shotgun-engine-the-season-2-mips-slug-meta-that-turns-clos-va2u` | 2026-06-12 | DEXTER | **indexed** | 70106176 |

#### Thief - beginner-guide (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/shells/thief`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `thief-shell-guide-extraction-specialist-for-ranked-solo-carry-6zkj` | 2026-03-25 | MIRANDA | **indexed** | 98dfd937 |
| `marathon-thief-shell-guide-solo-ranked-extraction-mastery-s97v` | 2026-06-17 | MIRANDA | **indexed** | 351398ff |
| `marathon-thief-shell-guide-solo-ranked-loot-and-survival-vrs2` | 2026-06-24 | MIRANDA | **indexed** | 87ba29da |

#### V85 Circuit Breaker - tier/meta (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/weapons/v85-circuit-breaker`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `outpost-duos-meta-v85-circuit-breaker-shotgun-dominance-analysis-89v6` | 2026-04-01 | DEXTER | **indexed** | 2801758e |
| `shotgun-meta-revolution-v85-circuit-breaker-and-wstr-combat-rise-as-se-keae` | 2026-05-15 | NEXUS | **indexed** | 85f052e2 |
| `marathon-v85-circuit-breaker-clips-shotgun-meta-signal-6y5g` | 2026-06-15 | GHOST | **indexed** | 768af745 |

#### Assassin - beginner-guide (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/shells/assassin`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `perfect-game-whatever-assassin-guide-technical-but-not-tactical-enough-mc38` | 2026-04-02 | CIPHER | **indexed** | 386208f7 |
| `assassin-shadow-strike-engine-season-2-nightfall-preparation-guide-tu18` | 2026-05-14 | DEXTER | **indexed** | 1c561779 |
| `marathon-assassin-shell-guide-solo-ranked-stealth-mechanics-3wz1` | 2026-06-20 | MIRANDA | **indexed** | 605c4da4 |

#### cryo archive - benchmark (3 articles, 3 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `cryo-archive-thief-speed-based-holotag-extraction-for-new-environment-uhuw` | 2026-04-03 | DEXTER | **indexed** | ec0bd9ac |
| `cryo-archive-holotag-banking-strategy-shows-pre-raid-economic-prep-cqk4` | 2026-04-16 | CIPHER | **indexed** | a7ec3a19 |
| `cryo-archive-accessibility-crisis-holotag-gear-ante-blocks-casual-play-9e4d` | 2026-04-17 | NEXUS | **indexed** | 71582ae6 |

#### Misriah 2442 - news/patch (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/weapons/misriah-2442`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `misriah-2442-assassin-build-post-wstr-nerf-cqb-shotgun-dominance-r16j` | 2026-04-19 | DEXTER | **indexed** | 6133a09b |
| `wstr-nerf-forces-cqb-meta-evolution-misriah-2442-time-9ucr` | 2026-04-22 | CIPHER | **indexed** | d7d09483 |
| `post-wstr-nerf-misriah-2442-shotgun-destroyer-build-analysis-bgv4` | 2026-04-25 | DEXTER | **indexed** | 8f4efb56 |

#### BR33 Volley Rifle - tier/meta (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/weapons/br33-volley-rifle`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `br33-volley-rifle-victory-lap-build-mid-seasons-precision-rifle-meta-d-rvu8` | 2026-04-21 | DEXTER | **indexed** | 463bb730 |
| `precision-rifle-meta-explosion-br33-volley-rifle-ascends-as-chloeglorp-16n1` | 2026-05-07 | NEXUS | **indexed** | 8c112776 |
| `br33-volley-rifle-meta-revolution-pre-season-2-precision-build-zsb0` | 2026-05-17 | DEXTER | **indexed** | 1c7d6ada |

#### Knife - other (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/weapons/knife`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `knife-run-renaissance-zero-to-hero-strategy-exploits-depleted-med-surp-xcru` | 2026-04-24 | NEXUS | **indexed** | dfbcfeaf |
| `steam-reviews-reveal-marathons-knife-problem-while-celebrating-wstr-co-uqfv` | 2026-05-05 | GHOST | **indexed** | 98235292 |
| `knife-controversy-ignites-melee-combat-inconsistency-exposes-core-syst-qttd` | 2026-05-21 | NEXUS | **indexed** | 5b9d3c7e |

#### Hardline PR - tier/meta (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/weapons/hardline-pr`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `precision-rifle-revolution-hardline-pr-and-br33-volley-drive-mid-range-rx56` | 2026-05-09 | NEXUS | **indexed** | 3cd2b985 |
| `precision-rifle-triangle-emerges-br33-volley-hardline-pr-and-twin-tap--qfdh` | 2026-05-18 | NEXUS | **indexed** | 5e3130b1 |
| `hardline-precision-rifle-defines-holotag-meta-23-damage-mid-range-spec-h38s` | 2026-05-29 | NEXUS | **indexed** | 60bb77ee |

#### Conquest LMG - counter-guide (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/weapons/conquest-lmg`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `the-thief-counter-most-players-miss-conquest-lmg-range-control-290v` | 2026-05-10 | CIPHER | **indexed** | c596f288 |
| `conquest-lmg-squad-control-light-round-suppression-fire-emerges-as-sea-p6wn` | 2026-05-14 | NEXUS | **indexed** | 541d86d0 |
| `the-counter-to-thief-most-players-miss-conquest-lmg-hard-counter-4tns` | 2026-05-17 | CIPHER | **indexed** | d1acb0eb |

#### Thief - build-guide (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/shells/thief`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `thief-pickpocket-drone-engine-the-silver-to-gold-ranked-climbing-build-lsft` | 2026-05-22 | DEXTER | **indexed** | 0f625b75 |
| `marathon-thief-build-grapple-loot-engine-for-solo-ranked-vtln` | 2026-06-24 | DEXTER | **indexed** | c8de4de2 |
| `marathon-thief-build-grapple-strike-loot-engine-guide-le0m` | 2026-07-07 | DEXTER | **indexed** | 10e5853e |

#### D54 Battle Pistol - tier/meta (3 articles, 3 still indexed)

Competing with DB-backed canonical: `/weapons/d54-battle-pistol`

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `d54-battle-pistol-breaks-out-of-c-tier-prison-ciggaris-1v2-clutch-sign-js1g` | 2026-06-09 | NEXUS | **indexed** | 1e03a73a |
| `d54-battle-pistol-engine-the-season-2-sidearm-meta-that-turns-precisio-jtow` | 2026-06-09 | DEXTER | **indexed** | 216c1597 |
| `marathon-d54-battle-pistol-enhanced-weapon-meta-s2-ybj7` | 2026-06-15 | DEXTER | **indexed** | 7780f82c |

#### night marsh - other (3 articles, 3 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `marathon-night-marsh-mode-community-split-on-survival-horror-direction-y24v` | 2026-06-15 | GHOST | **indexed** | 578d907c |
| `marathon-assassin-shell-night-marsh-pvp-breakdown-vi1r` | 2026-06-24 | NEXUS | **indexed** | fe08afbf |
| `marathon-night-marsh-first-impressions-what-the-lobby-really-thinks-mv15` | 2026-06-28 | GHOST | **indexed** | 405f6026 |

#### cradle - beginner-guide (3 articles, 3 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `marathon-cradle-guide-which-tracks-to-prioritize-first-j8ar` | 2026-06-18 | MIRANDA | **indexed** | 959d0b24 |
| `marathon-cradle-guide-level-up-fast-and-spend-smart-ln8l` | 2026-06-25 | MIRANDA | **indexed** | 7bac05c7 |
| `marathon-cradle-guide-level-up-fast-as-a-beginner-tz0l` | 2026-07-03 | MIRANDA | **indexed** | 0819d735 |

#### vault breaker - other (3 articles, 3 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `marathon-vault-breaker-mode-big-week-but-the-lobby-has-notes-lkra` | 2026-06-25 | GHOST | **indexed** | b2bf99ea |
| `marathon-vault-breaker-mode-players-react-to-the-mid-season-reveal-2ngv` | 2026-06-29 | GHOST | **indexed** | 59e893d7 |
| `marathon-cryo-archive-learning-the-map-before-vault-breaker-lands-6nf8` | 2026-07-06 | NEXUS | **indexed** | d6e1701b |

#### night marsh - build-guide (3 articles, 3 still indexed)

| slug | created | editor | index state | id |
|---|---|---|---|---|
| `marathon-night-marsh-budget-loadout-what-actually-works-6z9u` | 2026-06-27 | NEXUS | **indexed** | 901216bc |
| `marathon-recon-build-budget-night-marsh-intel-engine-7804` | 2026-06-27 | DEXTER | **indexed** | 9187639a |
| `marathon-assassin-build-budget-night-marsh-stealth-guide-n45v` | 2026-06-28 | DEXTER | **indexed** | 8ac417a3 |

## Step 4 - Hard cases (surfaced, NOT resolved)

- **Same-subject / different-intent - do NOT merge.** The method separates these on the intent axis: a shell `build-guide`, a `news/patch` nerf piece, and a `discourse` take on the same shell are three distinct topics. Consolidation must respect intent, not just subject.
- **Genuinely distinct angles worth keeping.** The `-no19` shell-role framing (kept in the Phase-2 cleanup) and the per-weapon Rook build variants (M77 / Repeater HPR / Twin Tap HBR) are distinct content sharing a template. The subject-weighted dedup guard (`f134fc3`) was refined specifically to protect these - a count-based cut would destroy them.
- **News / dated series are legitimately sequential, not duplicate.** The `cryo archive / event-stream` cluster is dated launch-event journalism (day-1 / day-2 / weekend coverage), and real per-version patch pieces are sequential by nature. Size here is not evidence of redundancy.
- **`cryo archive` is a real, heavy-coverage subject, not an artifact.** 184 articles carry it in the headline and are genuinely about it (launch, map tactics, meta shifts, performance). It spans several *legitimately different* intents - do not collapse it on subject alone.
- **Intent classification is heuristic.** Headline-pattern based; a mislabelled intent wrongly splits or merges a topic. Spot-check before acting.
- **The unclassified bucket (632) is not a finding.** It is where the method has no opinion. Some are genuinely general (shell-selection guides naming no specific shell); some need vocab additions (modes, mechanics not in the entity tables).

## Not determinable from here

- **The 378 "crawled/discovered - currently not indexed" set.** GSC data is NOT accessible from this repo: no Search Console API or credential is wired, and `seo_keywords` is human-curated + read-only in code. Cross-referencing which of these clusters Google already rejected requires a GSC export pasted in. Flagged rather than guessed.

## What this drives next (proposed only - nothing executed)

1. **Dedup-guard design**: a topic registry keyed on **subject+intent** (not headline tokens) is the natural upgrade to the current Jaccard guard - the cluster table shows which (subject, intent) pairs are already saturated.
2. **Consolidation keep/cut**: per cluster, pick a canonical and noindex the rest - but only after a spot-check, respecting the Step-4 flags.
3. **Coverage registry**: place/mechanic subjects (e.g. `cryo archive`) have no DB-backed reference page; shells/weapons do. That asymmetry is the registry gap.
