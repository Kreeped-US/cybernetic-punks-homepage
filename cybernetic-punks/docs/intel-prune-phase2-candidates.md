# /intel prune — Phase 2 candidates (edge cases, shape-bucketed)

_Read-only, generated 2026-07-23 against the CURRENT DB (post-Phase-1). Cross-refs `docs/intel-prune-candidates.md` §4 (53274fd). No writes, no noindex._

## ⚠️ TWO FINDINGS FIRST

**FINDING 1 — the 4.6-month hypothesis is CONFIRMED. Phase 2 is ENTIRELY news-shaped.** Oldest edge page is **138d** (~4.6mo); **nothing is older than the 152d (~5mo) evergreen window** (count older than 152d = 0). So **CUT — evergreen = 0**: no evergreen page has yet had a fair chance, so none can be confidently cut. Every actionable Phase-2 cut is news-shaped. As predicted.

**FINDING 2 — the shape signals DISAGREE more than they agree (317/532), and here is why.** Two structural causes, both real, not a bucketing bug:
- **73% of the edge set is UNCLASSIFIED** (387/532) — `deriveTuple` returns no facet, so the strongest signal (a) is ABSENT for most pages, leaving only editor + headline.
- **The facet→shape mapping BREAKS for `tier`/`build`.** Patch-driven news is routinely framed as a tier or build piece — e.g. *"Marathon Update 1.1.5: Patch Impact on Rook, Sentinel"* classifies `tier` (→ evergreen by the mapping) but is unambiguously NEWS. So facet contradicts editor+headline on exactly the articles that matter. The mapping holds for `guide`/`counter`/`lore`; it is unreliable for `tier`/`build`/`community` when a patch is involved.
Disagreement breakdown (of the 317 non-confident): facet-vs-headline conflict **42**, CIPHER-unclassified **93**, unclassified + indeterminate headline **199**.

**Consequence for bucketing:** facet alone cannot drive this. **Editor + headline are the reliable pair for this corpus.** The buckets below therefore offer TWO news cuts of different confidence — a strict 3-signal cut, and a larger editor+headline cut — so you choose the aggressiveness. Nothing is force-bucketed.

## Summary

Edge set = **indexed + ≤1 impression + NOT in any duplicate cluster** (the §4 pile). Current count: **532** (unchanged by Phase 1 — those 12 were duplicates, not edge cases).

| bucket | count | rule |
|---|---|---|
| **CUT — news, STRICT** | **129** | all 3 signals agree NEWS (or facet-absent + editor + headline agree) + age > 60d + not protected. **Highest confidence.** |
| **CUT — news, LEAN (editor+headline)** | **12** | editor∈{NEXUS,GHOST} AND headline NEWS + age > 60d + not protected, where facet is absent or (unreliably) says tier/build. **A larger, still-defensible cut — your call.** |
| **CUT — evergreen** | **0** | evergreen + age > 152d — **empty (Finding 1)** |
| HOLD (Phase 3 recheck) | 82 | confident shape but inside its fair-chance window |
| JUDGMENT | 299 | genuine ambiguity: evergreen-facet recent, CIPHER analysis, or shape indeterminate |
| PROTECTED (excluded) | 10 | registry-referenced scaffolding |

**Strict cut alone = 129. Strict + lean = 141.** Both exclude protected and everything inside the fair-chance window.

**Age distribution:** oldest 138d, newest 1d, median 90d. By month: 2026-03:105, 2026-04:181, 2026-05:156, 2026-06:70, 2026-07:20.

**Editor distribution (step 1b):** GHOST:173, CIPHER:121, NEXUS:105, MIRANDA:94, DEXTER:39 — GHOST (community/news) and NEXUS (meta/news) dominate, consistent with a news-shaped edge set; but MIRANDA (evergreen field guide, 94) and CIPHER (ambiguous, 121) are large, so editor alone is also insufficient.

**Method:** shape from facet (news/community→NEWS; guide/build/tier/counter/economy/lore→EVERGREEN), cross-checked against editor (NEXUS/GHOST→NEWS; DEXTER/MIRANDA→EVER; CIPHER/other→ambiguous) and headline pattern. Strict = signals agree; LEAN = editor+headline agree NEWS despite an absent/unreliable facet. Age from created_at vs 2026-07-23. The `facet/editor/headline` column shows all three raw signals per row.

## 1. CUT — news, STRICT (129) — highest confidence

| URL | age (date) | editor | facet | shape | impr/clk | facet/editor/headline |
|---|---|---|---|---|---|---|
| https://cyberneticpunks.com/intel/compiler-speed-kill-evolution-endgame-boss-optimization-signals-power--mb94 | 61d (2026-05-23) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/casual-player-exodus-bungie-director-admits-too-sweaty-meta-forces-sea-1lix | 61d (2026-05-23) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-community-goes-full-help-mode-lfg-threads-flood-reddit-as-sea-1hhy | 61d (2026-05-23) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-hardcore-identity-crisis-gets-official-confirmation-bungie-a-bjdl | 62d (2026-05-22) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/shell-experimentation-wave-triage-cinematic-triggers-cross-shell-explo-gjni | 62d (2026-05-22) | NEXUS | community | NEWS | 1/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/knife-controversy-ignites-melee-combat-inconsistency-exposes-core-syst-qttd | 63d (2026-05-21) | NEXUS | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-season-2-announcement-meets-community-crickets-players-too-b-5qvk | 63d (2026-05-21) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/precision-rifle-dominance-stryder-m1t-and-hardline-pr-define-mid-range-asau | 64d (2026-05-20) | NEXUS | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-community-goes-radio-silent-on-major-patch-109-reddit-activit-gdq1 | 64d (2026-05-20) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/energy-weapon-renaissance-v75-scar-and-circuit-breaker-lead-volt-batte-qska | 64d (2026-05-20) | NEXUS | news | NEWS | 1/0 | NEWS/NEWS/BOTH |
| https://cyberneticpunks.com/intel/marathon-community-stuck-in-cryo-archive-lfg-purgatory-while-steam-pla-qkxx | 64d (2026-05-20) | GHOST | community | NEWS | 0/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-community-ghosts-patch-109-as-performance-woes-hit-peak-frust-vyto | 65d (2026-05-19) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/runner-reactions-how-the-community-is-responding-to-marathons-final-s1-0l5r | 65d (2026-05-19) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/assault-rifle-stability-m77-and-impact-har-rise-to-counter-season-2-ni-6gbg | 65d (2026-05-19) | NEXUS | community | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-steam-loyalists-ignore-bungies-season-2-pivot-we-like-it-hos-fmrg | 66d (2026-05-18) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-lfg-crisis-exposes-the-real-season-1-problem-its-not-balance-eteq | 67d (2026-05-17) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/season-2-hype-check-steam-says-yes-but-nobodys-talking-details-486t | 69d (2026-05-15) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-community-stays-silent-on-season-2-while-steam-veterans-doubl-tkl8 | 70d (2026-05-14) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/volt-weapon-ecosystem-collapse-v-series-arsenal-crashes-to-lowest-tier-zc5r | 70d (2026-05-14) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/steam-marathon-players-quietly-celebrate-core-game-strengths-while-sea-yjn3 | 70d (2026-05-14) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-community-goes-silent-as-season-2-details-remain-vague-reddit-3tfl | 70d (2026-05-14) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-steam-players-celebrate-solo-progress-while-season-2-anticipa-8o2m | 71d (2026-05-13) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/wstr-combat-shotgun-nerfed-what-ranked-solo-players-should-swap-to-d608 | 73d (2026-05-11) | CIPHER | news | NEWS | 1/0 | NEWS/AMB/NEWS |
| https://cyberneticpunks.com/intel/steam-players-say-marathon-1063-fixed-nothing-that-actually-matters-cbv9 | 74d (2026-05-10) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/wstr-shotgun-renaissance-combat-shotgun-defies-one-shot-nerf-trends-as-my1n | 75d (2026-05-09) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/steam-marathon-veterans-are-singing-literally-while-new-player-onboard-0s6m | 76d (2026-05-08) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/ares-railgun-nerf-shockwaves-one-shot-meta-crumbles-as-update-1063-tar-m0uo | 77d (2026-05-07) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/steam-reviews-expose-marathons-hidden-divide-extraction-magic-vs-multi-lelb | 77d (2026-05-07) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-goes-radio-silent-on-cryo-archive-while-steam-reviews-stay-f-vbcz | 77d (2026-05-07) | GHOST | community | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-radio-silence-on-sponsored-queue-changes-while-steam-reviews-0gbu | 77d (2026-05-07) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-silent-treatment-for-carri-while-steam-reviews-split-on-solo-5lew | 78d (2026-05-06) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/prestige-salvage-economy-shift-map-events-drive-late-game-weapon-acces-b5kj | 78d (2026-05-06) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/v-series-energy-weapons-surge-volt-battery-meta-transforms-ranked-comb-q9aj | 79d (2026-05-05) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/steam-reviews-reveal-marathons-knife-problem-while-celebrating-wstr-co-uqfv | 79d (2026-05-05) | GHOST | community | NEWS | 1/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/reddit-goes-silent-on-ares-nerf-while-steam-reviews-reveal-the-real-pr-4pkp | 79d (2026-05-05) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/vandal-ascends-disrupt-cannon-buffs-drive-combat-shell-renaissance-fp8g | 80d (2026-05-04) | NEXUS | news | NEWS | 0/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/steam-reviews-reveal-marathons-core-problem-amazing-gunplay-wrapped-in-eqpj | 80d (2026-05-04) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/precision-rifle-dominance-long-range-meta-capitalizes-on-wstr-shotgun--kesw | 80d (2026-05-04) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/steam-reviews-tell-different-story-than-player-count-headlines-communi-jrgq | 80d (2026-05-04) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/reddit-drowns-in-lfg-posts-while-steam-reviews-question-marathons-long-oxsq | 80d (2026-05-04) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/faction-warfare-sekiguchi-ability-builds-dominate-post-patch-ranked-me-up2n | 81d (2026-05-03) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-quietly-embraces-latest-wstr-buff-while-player-count-concern-z19h | 81d (2026-05-03) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/ares-railgun-nerf-imminent-one-shot-meta-under-fire-as-bungie-targets--4qvw | 81d (2026-05-03) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/ares-rg-one-shot-crisis-marathon-1062-nerf-reshapes-ranked-sniping-44rl | 81d (2026-05-03) | CIPHER | news | NEWS | 1/0 | NEWS/AMB/NEWS |
| https://cyberneticpunks.com/intel/community-split-on-wstr-buff-as-player-count-concerns-dominate-discuss-91zu | 81d (2026-05-03) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/irons-rook-outpost-banking-post-patch-sponsored-kit-economy-revolution-67ye | 88d (2026-04-26) | CIPHER | news | NEWS | 1/0 | NEWS/AMB/NEWS |
| https://cyberneticpunks.com/intel/community-grinds-through-performance-woes-as-lfg-activity-surges-post--jhgo | 89d (2026-04-25) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/volt-weapon-surge-energy-arsenal-exploits-post-wstr-power-vacuum-huv8 | 89d (2026-04-25) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-questions-dire-marsh-experimental-test-as-players-debate-map-ovdp | 89d (2026-04-25) | GHOST | community | NEWS | 0/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/armory-revolution-enhanced-kit-stock-surge-creates-new-loadout-meta-n101 | 89d (2026-04-25) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/precision-weapon-renaissance-post-wstr-nerf-creates-new-meta-hierarchy-rwln | 89d (2026-04-25) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/checktheereplays-destroyer-triple-kill-post-wstr-nerf-timing-analysis-4qm3 | 90d (2026-04-24) | CIPHER | news | NEWS | 0/0 | NEWS/AMB/NEWS |
| https://cyberneticpunks.com/intel/knife-to-kit-progression-shows-post-patch-depleted-med-scaling-vlsc | 90d (2026-04-24) | CIPHER | news | NEWS | 1/0 | NEWS/AMB/NEWS |
| https://cyberneticpunks.com/intel/community-mixed-on-dire-marsh-test-as-players-debate-crowding-vs-actio-ebg5 | 90d (2026-04-24) | GHOST | community | NEWS | 0/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/compiler-loot-revolution-biotoxic-drops-and-depleted-stack-changes-res-hw9d | 91d (2026-04-23) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-cheers-wstr-nerf-while-early-dire-marsh-test-splits-opinion-o1i0 | 91d (2026-04-23) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/dire-marsh-density-crisis-bungie-cuts-crew-size-in-experimental-queue-mgjt | 91d (2026-04-23) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/steam-players-love-solo-friendly-med-buffs-as-x-celebrates-wstr-nerfs-t94u | 91d (2026-04-23) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-splits-on-dire-marsh-test-as-wstr-nerf-relief-meets-map-conc-y3n0 | 91d (2026-04-23) | GHOST | news | NEWS | 1/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-chaos-community-meltdown-over-compiler-difficulty-urug | 91d (2026-04-23) | CIPHER | community | NEWS | 0/0 | NEWS/AMB/UNK |
| https://cyberneticpunks.com/intel/players-embrace-depleted-med-buffs-while-wstr-nerfs-get-mixed-receptio-d4q4 | 92d (2026-04-22) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/steam-players-praise-solo-friendly-updates-while-x-buzzes-over-balance-i65z | 92d (2026-04-22) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/wstr-nerf-lands-as-community-questions-bungies-balance-philosophy-nc9b | 93d (2026-04-21) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/consumable-collapse-cryo-archive-bug-devastates-ranked-supply-lines-lsv6 | 93d (2026-04-21) | NEXUS | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/steam-players-rally-around-marathon-as-mid-season-content-wave-hits-xc1w | 93d (2026-04-21) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/technical-troubles-mar-marathons-mid-season-momentum-as-community-rall-7dye | 94d (2026-04-20) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/anti-virus-economy-shift-cryo-archive-bug-creates-consumable-scarcity-5v3x | 94d (2026-04-20) | NEXUS | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/performance-woes-and-lfg-struggles-overshadow-marathons-mid-season-hig-cslj | 94d (2026-04-20) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-fragments-over-wstr-nerf-as-new-dire-marsh-sponsored-mode-di-hbbs | 94d (2026-04-20) | GHOST | news | NEWS | 1/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/carri-update-drives-lfg-surge-as-players-hunt-for-cryo-archive-teams-mdvf | 94d (2026-04-20) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/mid-season-update-sparks-mixed-reactions-as-new-unique-weapon-drops-rmau | 95d (2026-04-19) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-vault-bugs-frustrate-players-as-lfg-groups-hunt-dna-cards-wq1e | 95d (2026-04-19) | GHOST | community | NEWS | 1/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/post-update-crashes-and-voice-chat-bugs-plague-xbox-players-mid-season-1oru | 95d (2026-04-19) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/game-directors-wtf-wstrs-update-splits-community-ahead-of-tuesday-nerf-6n6w | 95d (2026-04-19) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-splits-on-bungies-heavy-handed-wstr-nerf-as-cryo-bugs-persis-guoc | 96d (2026-04-18) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/wstr-nerf-drama-overshadows-technical-issues-as-cryo-archive-bugs-pers-lwwk | 96d (2026-04-18) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/faction-economy-collapse-sponsored-kit-revolution-destroys-gear-barrie-kez0 | 96d (2026-04-18) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/wstr-nerf-sparks-mixed-reactions-as-players-brace-for-tuesday-changes-qw4y | 96d (2026-04-18) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/wstr-shotgun-massacre-tuesday-nerf-kills-two-shot-meta-dominance-pcct | 96d (2026-04-18) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-buzzes-over-recon-buffs-and-carri-cooperation-push-0yxo | 97d (2026-04-17) | GHOST | news | NEWS | 1/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/community-fragments-over-lfg-surge-as-eu-servers-struggle-post-update-62a8 | 97d (2026-04-17) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-rallies-around-lfg-as-connection-woes-shadow-mid-season-laun-b5mf | 97d (2026-04-17) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-accessibility-crisis-holotag-gear-ante-blocks-casual-play-9e4d | 97d (2026-04-17) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/wstr-combat-shotgun-still-dominates-cqb-despite-106-weapon-adjustments-7pec | 97d (2026-04-17) | CIPHER | news | NEWS | 0/0 | NEWS/AMB/NEWS |
| https://cyberneticpunks.com/intel/community-reacts-warmly-to-armory-bug-fixes-as-mid-season-momentum-bui-g7v4 | 98d (2026-04-16) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/smg-collapse-precision-revolution-leaves-close-range-shells-exposed-jh6c | 98d (2026-04-16) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/precision-surge-carri-protocol-rewards-push-long-range-meta-forward-ti1b | 98d (2026-04-16) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/asia-server-crisis-and-technical-issues-overshadow-mid-season-launch-546w | 99d (2026-04-15) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/carri-protocol-drives-precision-weapon-surge-8lp8 | 99d (2026-04-15) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/carri-protocol-sparks-mixed-reactions-as-steam-players-praise-stabilit-kcsr | 100d (2026-04-14) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/thief-bug-crashes-into-knife-nerf-as-technical-issues-mount-iny7 | 105d (2026-04-09) | GHOST | news | NEWS | 1/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/long-range-revolution-snipers-rise-as-melee-nerfs-reshape-combat-flow-m4zb | 105d (2026-04-09) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/demolition-hmg-shows-promise-post-bubble-shield-nerf-in-1053-k9qf | 105d (2026-04-09) | CIPHER | news | NEWS | 1/0 | NEWS/AMB/NEWS |
| https://cyberneticpunks.com/intel/heavy-rounds-surge-knife-nerfs-bubble-shield-weakness-reshapes-combat-qz9t | 105d (2026-04-09) | NEXUS | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-quietly-navigates-technical-chaos-while-cryo-lfg-scene-emerg-x5jc | 106d (2026-04-08) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/icemanisaacs-8-hour-gold-key-marathon-exposes-cryo-archive-exploit-win-tv55 | 106d (2026-04-08) | CIPHER | news | NEWS | 0/0 | NEWS/AMB/NEWS |
| https://cyberneticpunks.com/intel/med-drone-buff-question-ignites-community-debate-on-support-balance-2q50 | 106d (2026-04-08) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-nerfs-hit-while-ranked-rewards-drive-destroyer-surge-kx8n | 107d (2026-04-07) | NEXUS | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/biotoxic-nerf-hits-live-but-ranked-complaints-and-crashes-persist-29w5 | 108d (2026-04-06) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-cheers-biotoxic-nerf-as-performance-issues-plague-pc-players-gcb4 | 108d (2026-04-06) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-nerf-sparks-relief-as-performance-issues-persist-ld3w | 109d (2026-04-05) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-emergency-nerf-hits-live-servers-after-community--qld9 | 109d (2026-04-05) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/bd-nerf-lands-as-community-splits-on-exploit-warnings-vs-performance-i-vi4b | 109d (2026-04-05) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-nerf-sparks-relief-as-bugs-plague-early-access-0rx0 | 109d (2026-04-05) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-awaits-mid-season-balance-shake-up-as-recon-changes-preview-l829 | 110d (2026-04-04) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/bungie-teases-mid-season-balance-shake-up-while-community-splits-on-up-zzre | 111d (2026-04-03) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/console-controls-crisis-overshadows-patch-fix-praise-p95c | 112d (2026-04-02) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/community-split-on-schedule-changes-as-rankedcryo-archive-overlap-fixe-iz7l | 114d (2026-03-31) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/community-split-on-cryo-archive-schedule-change-steam-stays-positive-nw6d | 114d (2026-03-31) | GHOST | community | NEWS | 0/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/schedule-separation-fixes-cryo-archive-access-crisis-but-thief-pickpoc-q6kp | 114d (2026-03-31) | CIPHER | news | NEWS | 0/0 | NEWS/AMB/NEWS |
| https://cyberneticpunks.com/intel/patch-1051-ships-minor-fixes-while-community-celebrates-schedule-chang-2sgc | 115d (2026-03-30) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/schedule-split-wins-over-community-as-cryo-archive-gets-dedicated-time-c4eu | 117d (2026-03-28) | GHOST | community | NEWS | 0/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/thief-drone-exploit-patched-m77-no-recoil-builds-surge-in-cryo-archive-qg8g | 118d (2026-03-27) | NEXUS | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-thief-shell-exploit-patched-analysis-of-competitive-impact-u7em | 118d (2026-03-27) | CIPHER | news | NEWS | 0/0 | NEWS/AMB/UNK |
| https://cyberneticpunks.com/intel/patch-1051-tackles-thief-exploits-as-community-splits-on-triage-suppor-gogj | 119d (2026-03-26) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-tech-issues-mar-launch-but-community-embraces-challenge-r3xh | 120d (2026-03-25) | GHOST | community | NEWS | 1/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-launch-week-players-hit-technical-walls-despite-high-stak-6994 | 120d (2026-03-25) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/performance-pain-overshadows-cryo-archive-launch-as-community-splits-gbse | 121d (2026-03-24) | GHOST | community | NEWS | 0/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/mixed-patch-reception-performance-gains-offset-by-controversial-map-ch-lh4g | 121d (2026-03-24) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/dev-promises-cryo-subroutine-fix-as-community-fragments-over-performan-qlx1 | 121d (2026-03-24) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-launch-meets-mixed-reception-as-connection-issues-plague--0y0s | 122d (2026-03-23) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-lock-fractures-community-as-ranked-beta-goes-live-7z7l | 122d (2026-03-23) | NEXUS | community | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/truds-hypes-ranked-mode-launch-but-delivers-zero-gameplay-74rd | 122d (2026-03-23) | CIPHER | news | NEWS | 0/0 | NEWS/AMB/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-only-strategy-dividing-community-vandal-wstr-comb-noc9 | 123d (2026-03-22) | NEXUS | community | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-launch-sparks-content-drought-casual-play-dominat-x9ca | 124d (2026-03-21) | NEXUS | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-drops-with-performance-woes-and-movement-exploit-concerns-9agf | 124d (2026-03-21) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-hits-hard-performance-issues-plague-launch-weekend-em06 | 124d (2026-03-21) | GHOST | news | NEWS | 0/0 | NEWS/NEWS/NEWS |
| https://cyberneticpunks.com/intel/budget-weapon-meta-dominates-as-ranked-beta-reveals-economy-crisis-hx8r | 125d (2026-03-20) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/german-ranked-tutorial-signals-pre-weekend-meta-prep-as-community-brac-wx2v | 125d (2026-03-20) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |

## 2. CUT — news, LEAN editor+headline (12) — larger, your call

These have editor∈{NEXUS,GHOST} AND a news headline AND age > 60d, but a facet that is absent or says tier/build (unreliable for patch news — Finding 2). Defensible as news cuts; surfaced separately so you decide whether to include them.

| URL | age (date) | editor | facet | shape | impr/clk | facet/editor/headline |
|---|---|---|---|---|---|---|
| https://cyberneticpunks.com/intel/assault-rifle-convergence-m77-and-impact-har-define-multi-range-flexib-vy9l | 63d (2026-05-21) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/sniper-supremacy-surge-longshot-and-v99-channel-rifle-break-range-meta-m4b4 | 64d (2026-05-20) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/precision-rifle-triangle-emerges-br33-volley-hardline-pr-and-twin-tap--qfdh | 66d (2026-05-18) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/sniper-rifle-meta-shift-outland-and-v99-channel-rifle-define-season-2--5d7g | 67d (2026-05-17) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/brrt-smg-flechette-revolution-1000-rpm-cqb-monster-climbs-meta-as-seas-pp5t | 68d (2026-05-16) | NEXUS | tier | EVER | 1/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/shotgun-meta-revolution-v85-circuit-breaker-and-wstr-combat-rise-as-se-keae | 69d (2026-05-15) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/v75-scar-voltage-surge-volt-battery-meta-dominates-mid-range-as-season-io32 | 73d (2026-05-11) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/recon-shell-intel-surge-echo-pulse-meta-dominates-squad-ranked-as-secu-sojp | 73d (2026-05-11) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/precision-rifle-revolution-hardline-pr-and-br33-volley-drive-mid-range-rx56 | 75d (2026-05-09) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/v75-scar-voltage-surge-charge-based-ar-claims-ranked-crown-as-volt-bat-1o0f | 76d (2026-05-08) | NEXUS | tier | EVER | 1/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-35-damage-nerf-shakes-endgame-meta-knife-nerfs-ne-jzme | 109d (2026-04-05) | NEXUS | tier | EVER | 1/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/brrt-smg-surge-biotoxic-nerf-reshapes-cqb-meta-zd2k | 109d (2026-04-05) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |

## 3. CUT — evergreen (0) — EMPTY (Finding 1: nothing older than ~5mo)

_none — no evergreen page is old enough to have had a fair ranking window._

## 4. HOLD — inside fair-chance window (82) — Phase 3 recheck

| URL | age (date) | editor | facet | shape | impr/clk | facet/editor/headline |
|---|---|---|---|---|---|---|
| https://cyberneticpunks.com/intel/marathon-mid-season-2-update-wstr-d54-and-grenade-meta-shifts-kyfj | 7d (2026-07-16) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-mid-season-2-update-vault-breaker-wstr-buff-grenade-limits-k3uq | 7d (2026-07-16) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-triage-solo-ranked-winning-despite-the-shells-weakest-tier-t7ul | 11d (2026-07-12) | CIPHER | tier | EVER | 1/0 | EVER/AMB/UNK |
| https://cyberneticpunks.com/intel/marathon-season-2-player-sentiment-the-paying-crowd-vs-reddit-t7id | 11d (2026-07-12) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-ranked-mode-whats-actually-broken-and-how-to-climb-xtkw | 13d (2026-07-10) | MIRANDA | guide | EVER | 0/0 | EVER/EVER/EVER |
| https://cyberneticpunks.com/intel/marathon-update-1105-solo-queue-fix-lands-reaction-pending-xdt2 | 13d (2026-07-10) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-steam-reviews-vs-reddit-two-very-different-games-ipc1 | 14d (2026-07-09) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-update-1104-patch-notes-and-ranked-impact-200v | 15d (2026-07-08) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-cradle-evolution-mid-season-reset-and-what-it-changes-ylsy | 25d (2026-06-28) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-sponsored-survival-removal-players-react-to-the-loss-10zq | 27d (2026-06-26) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-season-2-bugs-softlocks-server-drops-and-account-hacks-duv6 | 33d (2026-06-20) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-season-2-progression-nerfs-steam-versus-reddit-o76k | 34d (2026-06-19) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-economy-patch-what-slower-cradle-xp-means-for-progression-y4f1 | 34d (2026-06-19) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-economy-dev-update-how-the-loot-nerf-shifts-the-meta-8db8 | 35d (2026-06-18) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-season-2-tech-issues-the-bugs-players-are-actually-hitting-7t9y | 35d (2026-06-18) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-season-2-economy-nerf-what-the-cradle-xp-cuts-mean-for-you-jupf | 35d (2026-06-18) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-update-1102-carri-returns-what-the-patch-actually-says-s0cb | 36d (2026-06-17) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-update-1102-carri-returns-and-what-it-means-for-ranked-2r7y | 36d (2026-06-17) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-battle-pistol-meta-s2-sidearm-surge-signal-yl4b | 38d (2026-06-15) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-night-marsh-mode-community-split-on-survival-horror-direction-y24v | 38d (2026-06-15) | GHOST | community | NEWS | 0/0 | NEWS/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-energy-weapons-guide-volt-battery-surge-in-s2-meta-sc4e | 39d (2026-06-14) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-update-110-recap-the-s2-changes-you-missed-u8mo | 40d (2026-06-13) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-season-2-performance-divide-steam-reviews-rally-while-reddit-ajcj | 40d (2026-06-13) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/content-drought-exposes-marathons-tutorial-gap-single-youtube-creator--l3a1 | 41d (2026-06-12) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/season-2-wipe-reset-exposes-marathons-retention-crisis-slickfrees-cryo-v5gx | 41d (2026-06-12) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-divided-season-2-start-tech-support-queue-meets-endgame-cele-uyz7 | 41d (2026-06-12) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/season-2-faction-upgrade-trap-community-discovers-most-armory-investme-5c5k | 42d (2026-06-11) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/faction-upgrade-hierarchy-exposed-community-analysis-confirms-which-se-f6wy | 42d (2026-06-11) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-community-goes-silent-this-cycle-reddit-bug-reports-and-posit-f3ft | 42d (2026-06-11) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-40-price-tag-triggers-existential-crisis-a2ny | 44d (2026-06-09) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/toodiffizzle-hits-level-100-as-marathons-season-2-grind-takes-shape-9gdr | 44d (2026-06-09) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-open-play-week-extension-reveals-the-real-season-2-problem-i-4ea1 | 45d (2026-06-08) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/faction-armory-economics-reshape-early-season-meta-credit-scarcity-for-fc6q | 46d (2026-06-07) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-hour-count-divide-gets-deeper-steam-reviews-expose-the-real--evts | 46d (2026-06-07) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-steam-reviews-reveal-the-real-season-2-story-hour-count-tell-ymri | 47d (2026-06-06) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-season-2-launch-week-crashes-into-reality-the-silent-subredd-hfrw | 48d (2026-06-05) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/steam-says-marathon-is-very-positive-while-reddit-goes-silent-the-seas-rncb | 48d (2026-06-05) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-season-2-server-meltdown-exposes-a-bitter-truth-reddit-rages-2rpc | 49d (2026-06-04) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-season-2-launch-disaster-splits-the-community-server-meltdow-mslh | 50d (2026-06-03) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-season-1-endgame-rush-exposes-the-communitys-fomo-addiction--rfpk | 52d (2026-06-01) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/energy-economy-crisis-volt-battery-weapons-create-heat-management-nigh-luu0 | 53d (2026-05-31) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathons-hours-played-tell-two-different-stories-steam-reviews-split--lbth | 53d (2026-05-31) | GHOST | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/faction-upgrade-crisis-season-2-reset-exposes-upgrade-path-dependencie-5go2 | 54d (2026-05-30) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/hardline-precision-rifle-defines-holotag-meta-23-damage-mid-range-spec-h38s | 55d (2026-05-29) | NEXUS | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/free-to-play-week-disrupts-ranked-ecosystem-season-2-launch-creates-tw-08rn | 56d (2026-05-28) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/precision-rifle-renaissance-mid-range-meta-emerges-as-squad-coordinati-y5zl | 58d (2026-05-26) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/post-destiny-migration-wave-new-player-influx-reshapes-accessibility-m-nwi9 | 59d (2026-05-25) | NEXUS | unclassified | NEWS | 0/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-mastery-surge-slickfrees-factory-solo-performance-reveals-s7yu | 59d (2026-05-25) | NEXUS | community | NEWS | 0/0 | NEWS/NEWS/BOTH |
| https://cyberneticpunks.com/intel/marathons-cryo-archive-solo-demand-hits-breaking-point-let-me-run-it-a-74yf | 60d (2026-05-24) | GHOST | unclassified | NEWS | 1/0 | -/NEWS/NEWS |
| https://cyberneticpunks.com/intel/essential-weapon-mod-builds-for-new-runners-start-here-before-you-spec-vvm6 | 63d (2026-05-21) | MIRANDA | unclassified | EVER | 0/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/brrt-smg-engine-end-of-season-meta-disruption-k1bh | 69d (2026-05-15) | DEXTER | build | EVER | 1/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/complete-marathon-optic-mod-guide-essential-magnification-and-precisio-y6pf | 72d (2026-05-12) | MIRANDA | guide | EVER | 0/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/v22-volt-thrower-engine-post-security-update-sponsored-kit-meta-revolu-y4d0 | 72d (2026-05-12) | DEXTER | build | EVER | 0/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/complete-marathon-barrel-mod-guide-essential-range-and-stability-upgra-xdor | 74d (2026-05-10) | MIRANDA | guide | EVER | 0/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/complete-marathon-generator-and-optics-guide-essential-energy-and-sigh-rnji | 75d (2026-05-09) | MIRANDA | unclassified | EVER | 1/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/marathon-free-enhanced-kits-lock-pre-made-crews-into-perimeter-queue-m-lkdz | 77d (2026-05-07) | CIPHER | tier | EVER | 0/0 | EVER/AMB/UNK |
| https://cyberneticpunks.com/intel/complete-weapon-mastery-guide-finding-your-primary-for-every-shell-bui-6f3g | 88d (2026-04-26) | MIRANDA | unclassified | EVER | 1/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/ai-uplink-security-room-trap-squad-positioning-meta-post-dire-marsh-fi-g61w | 89d (2026-04-25) | CIPHER | tier | EVER | 0/0 | EVER/AMB/UNK |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-complete-guide-security-room-5-hybrid-weapon-mast-z4vf | 91d (2026-04-23) | MIRANDA | guide | EVER | 0/0 | EVER/EVER/EVER |
| https://cyberneticpunks.com/intel/cryo-archive-compiler-hunt-v99-channel-rifle-sniper-build-meta-analysi-xigk | 91d (2026-04-23) | DEXTER | build | EVER | 0/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/carri-event-meta-guide-best-solo-builds-for-proxy-chat-survival-n0dd | 96d (2026-04-18) | MIRANDA | unclassified | EVER | 0/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/carri-event-deep-dive-complete-team-strategy-and-loadout-guide-722y | 97d (2026-04-17) | MIRANDA | unclassified | EVER | 0/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/carri-event-complete-guide-proximity-chat-and-sponsored-kits-strategy-mful | 98d (2026-04-16) | MIRANDA | unclassified | EVER | 1/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/dire-marsh-sponsored-queue-complete-knife-only-survival-guide-v8wc | 100d (2026-04-14) | MIRANDA | guide | EVER | 1/0 | EVER/EVER/EVER |
| https://cyberneticpunks.com/intel/thief-ranked-mastery-grapple-device-holotag-steal-timing-and-escape-ro-da6n | 106d (2026-04-08) | MIRANDA | guide | EVER | 0/0 | EVER/EVER/EVER |
| https://cyberneticpunks.com/intel/wstr-combat-shotgun-four-shot-tech-advanced-reload-manipulation-guide-w7iw | 109d (2026-04-05) | MIRANDA | guide | EVER | 0/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/pixelbros-triage-guide-shows-promise-but-lacks-competitive-edge-s363 | 111d (2026-04-03) | CIPHER | guide | EVER | 0/0 | EVER/AMB/UNK |
| https://cyberneticpunks.com/intel/budget-destroyer-low-cost-builds-that-still-force-holotag-kills-xycn | 113d (2026-04-01) | DEXTER | economy | EVER | 0/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/duo-queue-week-2-breakdown-dire-marsh-tactical-shifts-squad-synergies-4ce1 | 113d (2026-04-01) | MIRANDA | guide | EVER | 0/0 | EVER/EVER/BOTH |
| https://cyberneticpunks.com/intel/outpost-duos-meta-v85-circuit-breaker-shotgun-dominance-analysis-89v6 | 113d (2026-04-01) | DEXTER | tier | EVER | 0/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/duo-queue-deep-dive-perimeter-to-dire-marsh-tactical-progression-yev4 | 115d (2026-03-30) | MIRANDA | unclassified | EVER | 0/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/sheaffer-117-promises-recon-anti-ambush-meta-15-minutes-of-pure-theory-54hz | 115d (2026-03-30) | CIPHER | tier | EVER | 1/0 | EVER/AMB/UNK |
| https://cyberneticpunks.com/intel/thief-scan-drone-mastery-intelligence-vs-speed-in-ranked-holotag-hunts-t9vt | 116d (2026-03-29) | MIRANDA | guide | EVER | 1/0 | EVER/EVER/EVER |
| https://cyberneticpunks.com/intel/200-hour-meta-analysis-tayxdcs-weapon-tier-list-deep-dive-rw84 | 116d (2026-03-29) | DEXTER | unclassified | EVER | 0/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/duo-queue-testing-perimeter-to-dire-marsh-progression-guide-hqdk | 117d (2026-03-28) | MIRANDA | guide | EVER | 0/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/icemanisaacs-meta-weapon-tier-list-the-statistical-truth-about-maratho-3tjj | 124d (2026-03-21) | DEXTER | unclassified | EVER | 0/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/marathon-ranked-explained-holotag-system-tier-rewards-extraction-strat-d04h | 126d (2026-03-19) | MIRANDA | unclassified | EVER | 0/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/marathon-heat-weapon-mastery-overheating-strategies-for-ranked-victory-tur3 | 129d (2026-03-16) | MIRANDA | unclassified | EVER | 0/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/marathon-extraction-route-mastery-securing-your-ranked-progress-y6a8 | 131d (2026-03-14) | MIRANDA | unclassified | EVER | 0/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/shell-tier-list-for-marathon-ranked-the-meta-you-need-to-know-g6sg | 134d (2026-03-11) | MIRANDA | unclassified | EVER | 0/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/complete-ranked-shell-tier-guide-launch-day-meta-analysis-mp2z | 134d (2026-03-11) | MIRANDA | unclassified | EVER | 0/0 | -/EVER/EVER |
| https://cyberneticpunks.com/intel/complete-ranked-shell-guide-best-shells-for-each-holotag-tier-4t00 | 138d (2026-03-07) | MIRANDA | unclassified | EVER | 0/0 | -/EVER/EVER |

## 5. JUDGMENT — genuine ambiguity (299)

Evergreen-facet-but-recent, CIPHER analysis pieces, or shape indeterminate. **But note the age split:** 66 of these are ≤ 60d — inside even the SHORT (news) window, so they are **not cut candidates regardless of shape** (de-facto HOLD). Only the **233 that are > 60d** are the actionable ambiguity where resolving shape actually changes the verdict. Focus human review there.

**The 233 judgment rows OLDER than 60d (the ones worth resolving):**

| URL | age (date) | editor | facet | shape | impr/clk | facet/editor/headline |
|---|---|---|---|---|---|---|
| https://cyberneticpunks.com/intel/steam-veterans-double-down-on-marathon-defense-while-destiny-players-s-rb4k | 61d (2026-05-23) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/precision-rifle-meta-why-long-range-dominance-wins-ranked-games-ltw7 | 62d (2026-05-22) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathons-destiny-divorce-gets-bitter-steam-players-defend-the-trade-w-lm2t | 62d (2026-05-22) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-holotag-skill-benchmarks-what-separates-each-tier-qw53 | 63d (2026-05-21) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathons-steam-players-write-love-letters-while-community-goes-missin-vlqa | 63d (2026-05-21) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/the-precision-rifle-meta-why-long-range-dominance-wins-ranked-games-10i2 | 63d (2026-05-21) | MIRANDA | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-steam-veterans-draw-line-in-sand-dont-casualize-our-perfect-g-0jzi | 63d (2026-05-21) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/precision-rifle-meta-guide-long-range-dominance-for-ranked-runners-5x4r | 63d (2026-05-21) | MIRANDA | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/season-2-nightfall-changes-everything-ranked-reset-strategy-guide-fwka | 66d (2026-05-18) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/destroyer-counter-attack-engine-season-2-nightfall-anti-rush-meta-pxpl | 66d (2026-05-18) | DEXTER | counter | EVER | 0/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/season-1-finale-ranked-climb-pre-season-2-positioning-strategy-urfj | 66d (2026-05-18) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-season-2-roadmap-everything-joe-ziegler-just-revealed-may-14--z82m | 68d (2026-05-16) | MIRANDA | unclassified | NEWS | 0/0 | -/EVER/NEWS |
| https://cyberneticpunks.com/intel/demolition-hmg-engine-season-2-tank-meta-preparation-4m88 | 69d (2026-05-15) | DEXTER | build | EVER | 1/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/repeater-hpr-engine-season-2-long-range-meta-revolution-9lcw | 69d (2026-05-15) | DEXTER | build | EVER | 1/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/season-2-holotag-tier-requirements-what-each-rank-actually-takes-os9v | 70d (2026-05-14) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/steam-marathon-players-trust-the-long-game-while-international-server--okn6 | 70d (2026-05-14) | GHOST | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-steam-veterans-push-through-season-fatigue-while-self-revive--dp1c | 71d (2026-05-13) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/repeater-hpr-engine-post-self-revive-nerf-precision-revolution-iz6k | 71d (2026-05-13) | DEXTER | build | EVER | 0/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/post-1063-holotag-requirements-the-skills-that-separate-each-tier-iyxe | 71d (2026-05-13) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-steam-veterans-see-golden-age-potential-while-sony-scrambles--xtqp | 72d (2026-05-12) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/prestige-salvage-drop-changes-just-made-map-event-control-mandatory-83xa | 72d (2026-05-12) | CIPHER | unclassified | ? | 1/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/post-1063-holotag-tier-build-requirements-what-each-rank-demands-icgf | 73d (2026-05-11) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/steam-marathon-players-quietly-satisfied-while-sony-battles-financial--i11a | 73d (2026-05-11) | GHOST | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-community-split-on-performance-vs-cheating-priorities-reddit--n3po | 73d (2026-05-11) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/how-to-climb-ranked-this-week-post-security-update-shell-priority-guid-s9sg | 73d (2026-05-11) | CIPHER | unclassified | ? | 0/0 | -/AMB/BOTH |
| https://cyberneticpunks.com/intel/steam-marathon-players-embrace-learning-curve-reality-while-bungie-bat-s056 | 73d (2026-05-11) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/destroyer-shell-terror-sweep-iron-frame-tank-meta-dominates-ranked-squ-xpuw | 74d (2026-05-10) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/UNK |
| https://cyberneticpunks.com/intel/steam-marathon-players-discover-post-launch-sweet-spot-best-extraction-23j5 | 74d (2026-05-10) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-holotag-tier-requirements-what-each-rank-actually-demands-7jwu | 74d (2026-05-10) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/steam-marathon-community-quietly-celebrates-atmospheric-victory-while--majh | 75d (2026-05-09) | GHOST | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/the-range-counter-to-vandal-that-won-ranked-this-week-rek0 | 75d (2026-05-09) | CIPHER | counter | EVER | 0/0 | EVER/AMB/NEWS |
| https://cyberneticpunks.com/intel/steam-veterans-love-marathon-despite-sonys-765m-loss-players-care-abou-rab5 | 75d (2026-05-09) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/steam-marathon-players-praise-underrated-gem-while-bungie-quietly-figh-wkwo | 75d (2026-05-09) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/v75-scar-voltage-meta-this-weeks-solo-ranked-express-lane-wk2k | 75d (2026-05-09) | CIPHER | tier | EVER | 0/0 | EVER/AMB/NEWS |
| https://cyberneticpunks.com/intel/carri-protocol-salvage-economy-ranked-players-hidden-advantage-bf2d | 76d (2026-05-08) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathon-anti-cheat-update-shakes-ranked-false-positive-risk-vs-clean--gg0h | 76d (2026-05-08) | CIPHER | unclassified | ? | 1/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/community-shrugs-at-major-security-push-while-enhanced-sponsored-kit-r-g9hj | 76d (2026-05-08) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/community-completely-ignores-sponsored-queue-overhaul-while-wrestling--qcjc | 77d (2026-05-07) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/precision-rifle-meta-explosion-br33-volley-rifle-ascends-as-chloeglorp-16n1 | 77d (2026-05-07) | NEXUS | tier | EVER | 1/0 | EVER/NEWS/UNK |
| https://cyberneticpunks.com/intel/free-enhanced-kits-change-ranked-queue-access-perimeter-meta-shift-0jqf | 77d (2026-05-07) | CIPHER | tier | EVER | 0/0 | EVER/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-1063-wstr-combat-shotgun-meta-solidifies-destroyer-dominance-5mki | 78d (2026-05-06) | CIPHER | tier | EVER | 0/0 | EVER/AMB/NEWS |
| https://cyberneticpunks.com/intel/community-fractures-over-carri-launch-reddits-technical-meltdown-vs-st-akti | 78d (2026-05-06) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-1063-implant-bug-fix-hurting-hands-v4-economy-stabilizes-fqke | 78d (2026-05-06) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathons-technical-breakdown-overshadows-latest-patch-community-battl-foih | 78d (2026-05-06) | GHOST | unclassified | ? | 0/0 | -/NEWS/BOTH |
| https://cyberneticpunks.com/intel/community-goes-radio-silent-on-major-update-while-technical-problems-d-km8o | 78d (2026-05-06) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-heat-management-masterclass-advanced-thermal-control-for-rank-pog9 | 79d (2026-05-05) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-shells-power-ranking-meta-analysis-for-every-skill-level-v2hu | 79d (2026-05-05) | MIRANDA | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-1062-grenade-defense-meta-critical-hit-changes-ranked-priorit-urn3 | 79d (2026-05-05) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/wstr-combat-shotgun-comeback-marathon-1062-resurrects-cqb-meta-zz8d | 79d (2026-05-05) | CIPHER | tier | EVER | 1/0 | EVER/AMB/NEWS |
| https://cyberneticpunks.com/intel/community-splits-on-technical-issues-while-remaining-silent-on-balance-zszv | 79d (2026-05-05) | GHOST | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-1062-pve-meta-explosion-ai-damage-bonus-reshapes-ranked-loado-4uuo | 79d (2026-05-05) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/post-1062-demolition-hmg-terror-the-new-anti-grenade-tank-meta-aaas | 80d (2026-05-04) | DEXTER | tier | EVER | 0/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/community-celebrates-grenade-spam-fix-while-ignoring-deeper-matchmakin-a0db | 80d (2026-05-04) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-1062-anti-projectile-meta-shell-mobility-rankings-reshuffled-f1xu | 80d (2026-05-04) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-new-player-weapon-selection-guide-best-primary-for-your-first-u8mf | 81d (2026-05-03) | MIRANDA | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/free-weekly-sponsored-kits-break-ranked-economy-what-to-prioritize-u289 | 81d (2026-05-03) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/community-searches-for-teams-while-ranked-meta-questions-swirl-around--tx0p | 81d (2026-05-03) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/grenade-spam-lockdown-explosive-meta-faces-overhaul-as-bungie-promises-02jc | 81d (2026-05-03) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/wstr-combat-shotgun-revival-post-1062-assassin-cqb-devastation-43ur | 81d (2026-05-03) | DEXTER | news | NEWS | 0/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/wstr-resurrection-combat-shotgun-buffs-shake-cqb-meta-hierarchy-9q9c | 81d (2026-05-03) | NEXUS | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/ares-railgun-post-1062-the-one-shot-king-returns-with-precision-core-s-95bh | 81d (2026-05-03) | DEXTER | unclassified | NEWS | 1/0 | -/EVER/NEWS |
| https://cyberneticpunks.com/intel/community-celebrates-carri-protocol-as-new-endgame-opens-amidst-techni-68ua | 88d (2026-04-26) | GHOST | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/zonex-shock-value-content-misses-post-1061-sponsored-kit-meta-shift-ladx | 89d (2026-04-25) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/community-questions-core-game-direction-as-technical-issues-pile-up-tdzg | 89d (2026-04-25) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/recruits-finally-drop-viable-meds-as-community-debates-pve-vs-pvp-bala-8ao9 | 90d (2026-04-24) | GHOST | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/community-splits-on-destiny-2-resources-as-players-question-marathons--z5lo | 90d (2026-04-24) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/knife-run-renaissance-zero-to-hero-strategy-exploits-depleted-med-surp-xcru | 90d (2026-04-24) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/perkanator-weapon-tier-list-pre-wstr-nerf-analysis-now-obsolete-14n1 | 90d (2026-04-24) | CIPHER | unclassified | ? | 0/0 | -/AMB/BOTH |
| https://cyberneticpunks.com/intel/community-celebrates-sponsored-kit-overhaul-as-med-economy-gets-long-a-9rhx | 90d (2026-04-24) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/perkanators-tier-list-ignores-post-patch-depleted-kit-economy-shift-61vq | 90d (2026-04-24) | CIPHER | unclassified | ? | 0/0 | -/AMB/BOTH |
| https://cyberneticpunks.com/intel/irons-outpost-credit-farm-shows-why-banking-still-beats-rank-climbing-b7wp | 90d (2026-04-24) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/community-rallies-around-trades-and-technical-issues-as-updates-roll-i-jbsp | 91d (2026-04-23) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/bully-smg-meta-analysis-post-wstr-nerf-heavy-round-dominance-irwf | 91d (2026-04-23) | DEXTER | tier | EVER | 0/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/toggle-zoom-persistence-bug-fix-creates-new-sniper-meta-window-g3fl | 91d (2026-04-23) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/boston-marathon-content-floods-x-marathon-game-mentions-buried-in-nois-kqgj | 91d (2026-04-23) | CIPHER | unclassified | ? | 1/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/dire-marsh-crew-reduction-ranked-impact-analysis-prwj | 91d (2026-04-23) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/community-celebrates-anti-virus-pack-fix-while-cheating-concerns-persi-355m | 92d (2026-04-22) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/zonex-teases-wstr-nerf-analysis-but-delivers-no-mechanical-depth-zrvr | 92d (2026-04-22) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/pc-performance-issues-plague-marathon-as-community-searches-for-techni-7vb7 | 92d (2026-04-22) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/slickfrees-squad-wipe-shows-post-wstr-meta-shift-to-sustained-dps-4rk2 | 92d (2026-04-22) | CIPHER | unclassified | NEWS | 1/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/depleted-consumable-revolution-economy-changes-flip-support-shell-tier-gld4 | 92d (2026-04-22) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/imnexusss-weapon-tier-list-ignores-critical-post-1061-balance-changes-evdd | 92d (2026-04-22) | CIPHER | unclassified | ? | 0/0 | -/AMB/BOTH |
| https://cyberneticpunks.com/intel/update-1061-complete-balance-guide-wstr-nerfs-and-meta-shifts-odlz | 93d (2026-04-21) | MIRANDA | unclassified | ? | 1/0 | -/EVER/BOTH |
| https://cyberneticpunks.com/intel/depleted-kit-economy-overhaul-reshapes-low-risk-extraction-meta-k4nd | 93d (2026-04-21) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/br33-victory-lap-rollout-gets-lukewarm-reception-as-content-cycle-fati-sl2o | 93d (2026-04-21) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/voltage-supremacy-energy-weapons-dominate-post-wstr-landscape-quid | 93d (2026-04-21) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/demolition-democracy-carri-kits-democratize-heavy-weapon-access-vsfa | 93d (2026-04-21) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/imnexusss-weapon-tier-list-misses-post-wstr-nerf-meta-realities-tyho | 93d (2026-04-21) | CIPHER | unclassified | ? | 1/0 | -/AMB/BOTH |
| https://cyberneticpunks.com/intel/steam-players-praise-marathons-bold-cyberpunk-vision-amid-population-w-26jh | 93d (2026-04-21) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/precision-dominance-post-wstr-balance-creates-sniper-rifle-meta-0qnj | 93d (2026-04-21) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/victory-lap-tournament-meta-analysis-what-top-runners-used-to-win-dssx | 94d (2026-04-20) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/brrt-smg-unique-shotgun-mode-creates-new-cqb-meta-post-wstr-nerf-e5tf | 94d (2026-04-20) | CIPHER | tier | EVER | 0/0 | EVER/AMB/NEWS |
| https://cyberneticpunks.com/intel/carri-protocol-shifts-ranked-meta-from-solo-aggression-to-crew-coordin-j9g1 | 94d (2026-04-20) | CIPHER | unclassified | NEWS | 1/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/mid-season-update-106-complete-patch-notes-guide-for-every-runner-xq07 | 95d (2026-04-19) | MIRANDA | unclassified | ? | 0/0 | -/EVER/BOTH |
| https://cyberneticpunks.com/intel/carri-event-success-solo-proximity-chat-survival-guide-2pb2 | 95d (2026-04-19) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/heavy-weapon-democracy-carri-kits-break-elite-arsenal-monopoly-01wc | 95d (2026-04-19) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/wstr-nerf-creates-shotgun-power-vacuum-who-benefits-most-yday | 95d (2026-04-19) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/post-carri-solo-queue-guide-how-proximity-chat-changes-everything-7rfl | 95d (2026-04-19) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/precision-revolution-br33-victory-lap-unique-dominates-post-wstr-meta-502n | 95d (2026-04-19) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/solo-players-first-week-survival-guide-shells-builds-and-faction-prep-cjpv | 96d (2026-04-18) | MIRANDA | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-vault-bugs-hit-solo-players-harder-as-carri-pushes-teams-bh8v | 96d (2026-04-18) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/tau-ceti-cup-victory-lap-tournament-meta-lessons-for-ranked-success-hvs7 | 96d (2026-04-18) | MIRANDA | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/sniper-proliferation-crisis-reveals-marathons-long-range-meta-problem-dhd2 | 96d (2026-04-18) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/steam-players-split-on-cryo-vault-bugs-as-lfg-groups-push-endgame-cont-w55i | 97d (2026-04-17) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/unfairlys-pvp-death-analysis-exposes-common-ranked-positioning-errors-soau | 97d (2026-04-17) | CIPHER | unclassified | ? | 1/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/waxs-sub-second-extraction-shows-free-kit-experimental-meta-shift-xjrj | 97d (2026-04-17) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/free-kit-frenzy-railgun-democracy-breaks-faction-weapon-monopolies-4e3e | 97d (2026-04-17) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/carri-protocol-shifts-solo-ranked-meta-toward-objective-play-2oov | 97d (2026-04-17) | CIPHER | unclassified | NEWS | 1/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-holotag-banking-strategy-shows-pre-raid-economic-prep-cqk4 | 98d (2026-04-16) | CIPHER | unclassified | ? | 1/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-accessibility-crisis-exposes-marathons-endgame-wall-hrax | 98d (2026-04-16) | CIPHER | unclassified | NEWS | 1/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/community-applauds-cooperation-push-but-technical-issues-cloud-update-q9hs | 98d (2026-04-16) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/free-railgun-access-sponsored-kits-eliminate-faction-lock-barriers-ojjj | 98d (2026-04-16) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/performance-woes-hit-5090-users-as-community-splits-on-overrun-changes-v0i0 | 98d (2026-04-16) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/markymarks-ambush-play-shows-post-106-team-wipe-potential-rtfr | 98d (2026-04-16) | CIPHER | unclassified | NEWS | 1/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/free-kit-frenzy-revolutionizes-weapon-access-br33-victory-lap-dominate-yl63 | 99d (2026-04-15) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/tau-ceti-cup-victory-lap-post-tournament-meta-analysis-and-lessons-b64a | 99d (2026-04-15) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/free-kit-frenzy-experimental-queue-divides-player-base-on-risk-vs-rewa-a18x | 99d (2026-04-15) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/br33-victory-lap-unique-shows-bungies-mid-season-power-creep-problem-6vzu | 99d (2026-04-15) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/waxs-clutch-extraction-shows-why-millisecond-timing-separates-ranks-bz3p | 99d (2026-04-15) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/carri-protocol-reshapes-cooperation-recon-echo-pulse-dominates-intel-in7c | 100d (2026-04-14) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/free-kit-frenzy-launches-as-community-fragments-over-experimental-queu-u5by | 100d (2026-04-14) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/experimental-queue-live-free-kit-frenzy-changes-everything-sfeu | 100d (2026-04-14) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/duos-queue-dies-wednesday-as-community-splits-on-anti-cheat-response-nqi2 | 105d (2026-04-09) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/ranked-rewards-drive-x-hype-while-reddit-community-quietly-fractures-skub | 105d (2026-04-09) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/post-patch-thief-shell-ranked-solo-domination-after-knife-nerf-rzap | 105d (2026-04-09) | DEXTER | news | NEWS | 1/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/post-nerf-biotoxic-disinjector-build-red-tier-reality-check-24eo | 106d (2026-04-08) | DEXTER | build | EVER | 1/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/knife-nerfs-hit-console-players-hardest-assassin-struggles-in-new-meta-zj66 | 106d (2026-04-08) | CIPHER | tier | EVER | 1/0 | EVER/AMB/NEWS |
| https://cyberneticpunks.com/intel/ranked-anti-cheat-update-security-team-explains-zero-tolerance-policy-838t | 106d (2026-04-08) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/duos-experiment-ends-as-community-debates-anti-cheat-response-cj8v | 106d (2026-04-08) | GHOST | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-farm-complaints-miss-the-real-ranked-meta-shift-9lta | 106d (2026-04-08) | CIPHER | tier | EVER | 1/1 | EVER/AMB/NEWS |
| https://cyberneticpunks.com/intel/community-frustrated-by-technical-issues-while-devs-push-balance-chang-mimr | 107d (2026-04-07) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/shell-guide-videos-flood-market-as-meta-confusion-peaks-jd3a | 107d (2026-04-07) | CIPHER | unclassified | EVER | 0/0 | -/AMB/EVER |
| https://cyberneticpunks.com/intel/recon-echo-pulse-changes-mid-season-update-preview-analysis-rz1l | 107d (2026-04-07) | MIRANDA | news | NEWS | 0/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/bungie-nukes-biotoxic-gun-after-community-revolt-but-audio-issues-pers-r96r | 107d (2026-04-07) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/assassin-shell-gets-console-treatment-still-waiting-for-tech-ocz3 | 107d (2026-04-07) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/med-drone-balance-analysis-why-bungies-community-poll-matters-for-supp-xag8 | 107d (2026-04-07) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/northernranger-attempts-meta-analysis-tier-lists-dont-win-extractions-tcie | 107d (2026-04-07) | CIPHER | unclassified | EVER | 1/0 | -/AMB/EVER |
| https://cyberneticpunks.com/intel/youtube-marathon-content-analysis-zero-game-relevant-build-data-found-5oiw | 108d (2026-04-06) | DEXTER | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marshyys-budget-build-signals-meta-shift-after-biotoxic-nerf-dork | 108d (2026-04-06) | CIPHER | unclassified | NEWS | 1/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/bertii-asks-the-question-everyones-thinking-inx6 | 109d (2026-04-05) | CIPHER | unclassified | ? | 1/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/rook-double-barrel-dominance-why-this-shell-excels-in-1v3-clutches-q1fu | 109d (2026-04-05) | DEXTER | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/rook-1v3-clutch-shows-shell-versatility-despite-shotgun-crutch-nq8i | 109d (2026-04-05) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-nerf-guide-post-balance-weapon-tier-shifts-1ir9 | 109d (2026-04-05) | MIRANDA | tier | EVER | 0/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/garchomps-brrt-smg-clutches-high-octane-cqb-on-outpost-xxcy | 109d (2026-04-05) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/pinwheel-route-optimization-maximize-credits-before-mid-season-changes-6awn | 110d (2026-04-04) | MIRANDA | unclassified | NEWS | 1/0 | -/EVER/NEWS |
| https://cyberneticpunks.com/intel/pray2play-identifies-meta-shift-repeater-hpr-overtaking-snipers-2sue | 110d (2026-04-04) | CIPHER | tier | EVER | 0/0 | EVER/AMB/NEWS |
| https://cyberneticpunks.com/intel/solo-outpost-economy-guide-extract-timing-vs-risk-after-mid-season-bw1j | 110d (2026-04-04) | MIRANDA | unclassified | NEWS | 0/0 | -/EVER/NEWS |
| https://cyberneticpunks.com/intel/tryhxrds-pinnacle-climb-setup-mid-range-versatility-analysis-fbes | 110d (2026-04-04) | DEXTER | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/pinnacle-players-drive-stealth-meta-while-bungie-preps-combat-rebalanc-egxa | 110d (2026-04-04) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/mid-season-update-april-14-recon-echo-pulse-buffs-audio-fix-guide-qkym | 111d (2026-04-03) | MIRANDA | news | NEWS | 1/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/staycation-shows-ranked-holotag-psychology-b-tier-distraction-play-mzqc | 111d (2026-04-03) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-thief-speed-based-holotag-extraction-for-new-environment-uhuw | 111d (2026-04-03) | DEXTER | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/budget-build-meta-loony-lemons-gear-economy-theory-x7jc | 111d (2026-04-03) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/recon-echo-pulse-changes-mid-season-balance-reshapes-intel-shell-5pq5 | 111d (2026-04-03) | MIRANDA | news | NEWS | 0/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/bungie-previews-major-balance-shake-up-knives-snipers-bubble-shields-5098 | 111d (2026-04-03) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/unfairly-breaks-down-ranked-mistakes-b-tier-educational-content-2563 | 111d (2026-04-03) | CIPHER | unclassified | ? | 1/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/gold-boss-controller-clutch-shows-assassin-shell-promise-77cu | 112d (2026-04-02) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/nirvous-partnership-community-growth-what-creator-support-means-for-ma-g5uh | 112d (2026-04-02) | MIRANDA | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/noctuslunae-shows-team-first-mindset-but-lacks-viewership-pull-c62q | 112d (2026-04-02) | CIPHER | unclassified | ? | 1/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/battle-pass-rush-maximize-xp-before-mid-season-update-drops-q0t2 | 112d (2026-04-02) | MIRANDA | unclassified | NEWS | 0/0 | -/EVER/NEWS |
| https://cyberneticpunks.com/intel/budget-meta-analysis-loony-lemons-economy-build-theory-vr1f | 113d (2026-04-01) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/holotag-theft-meta-ranked-distraction-tactics-hit-different-0pcn | 113d (2026-04-01) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/outpost-changes-in-update-1052-navigation-and-loot-route-adjustments-9le9 | 113d (2026-04-01) | MIRANDA | unclassified | NEWS | 0/0 | -/EVER/NEWS |
| https://cyberneticpunks.com/intel/marathon-update-1052-complete-breakdown-slide-cancel-fix-outpost-chang-ei12 | 114d (2026-03-31) | MIRANDA | unclassified | ? | 1/0 | -/EVER/BOTH |
| https://cyberneticpunks.com/intel/slide-cancel-fix-hits-marathon-as-performance-woes-dominate-player-tal-dsb6 | 114d (2026-03-31) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-balance-overhaul-preview-zieglers-big-changes-coming-soon-jpdv | 114d (2026-03-31) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/mixed-signals-steam-players-love-it-reddit-goes-silent-after-schedule--tcel | 114d (2026-03-31) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/combat-shotgun-cryo-archive-play-shows-weapon-potential-but-limited-sc-zzwl | 115d (2026-03-30) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-schedule-changes-pve-vs-ranked-time-management-8u70 | 115d (2026-03-30) | MIRANDA | news | NEWS | 0/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/recon-intel-domination-early-warning-system-core-analysis-7hpd | 115d (2026-03-30) | DEXTER | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/thief-fashion-show-new-shell-styles-hit-cryo-archive-weekend-2-j8lm | 116d (2026-03-29) | MIRANDA | news | NEWS | 0/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/community-celebrates-ranked-archive-schedule-split-after-backlash-ih6h | 116d (2026-03-29) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-schedule-changes-expose-ranked-priority-gap-k74l | 116d (2026-03-29) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/tayxdcs-200-hour-marathon-meta-analysis-data-driven-weapon-truth-phgl | 116d (2026-03-29) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/thief-pickpocket-drone-exploit-fixed-master-the-new-cooldown-system-xt4x | 116d (2026-03-29) | MIRANDA | news | NEWS | 0/0 | NEWS/EVER/UNK |
| https://cyberneticpunks.com/intel/free-loadout-theory-when-default-gear-outplays-premium-builds-wkuz | 116d (2026-03-29) | DEXTER | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/free-loadout-squad-wipe-shows-resource-management-over-gear-dependency-u7sj | 116d (2026-03-29) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/thief-x-ray-visor-advanced-techniques-finding-high-value-targets-in-ra-34a9 | 117d (2026-03-28) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/community-split-as-bungie-adjusts-ranked-cryo-schedule-amid-growing-qu-2doh | 117d (2026-03-28) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/tayxdcs-200-hour-weapon-meta-analysis-shotgun-tier-rankings-1qxm | 117d (2026-03-28) | DEXTER | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/tayxdcs-200-hour-meta-analysis-shows-promise-but-lacks-depth-zbrq | 117d (2026-03-28) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/vozskiis-ranked-break-what-high-tier-runners-do-between-seasons-cswe | 117d (2026-03-28) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/outpost-lobby-wipe-shows-promise-but-needs-technical-execution-985o | 117d (2026-03-28) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/community-celebrates-schedule-split-as-performance-issues-plague-launc-h107 | 117d (2026-03-28) | GHOST | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/200-hour-weapon-meta-analysis-what-actually-works-in-ranked-lxa5 | 118d (2026-03-27) | DEXTER | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-schedule-update-bungie-separates-ranked-and-pve-windows-38ny | 118d (2026-03-27) | MIRANDA | news | NEWS | 0/0 | NEWS/EVER/UNK |
| https://cyberneticpunks.com/intel/matchmaking-fix-backfires-regional-update-creates-latency-nightmare-2it1 | 118d (2026-03-27) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/console-assassin-shows-promise-in-extract-heavy-gameplay-z77r | 118d (2026-03-27) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathon-fixes-matchmaking-woes-but-players-split-on-quality-vs-speed-bzbu | 119d (2026-03-26) | GHOST | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-launch-stream-day-2-elite-runners-push-deeper-into-the-va-hesh | 119d (2026-03-26) | MIRANDA | community | NEWS | 0/0 | NEWS/EVER/UNK |
| https://cyberneticpunks.com/intel/200-hours-means-nothing-without-ranked-context-dtkg | 119d (2026-03-26) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/hoshiinotv-showcases-destroyers-raw-combat-power-in-68-seconds-nslh | 120d (2026-03-25) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-survival-essential-gear-and-extraction-tactics-for-weeken-wlc5 | 120d (2026-03-25) | MIRANDA | news | NEWS | 0/0 | NEWS/EVER/BOTH |
| https://cyberneticpunks.com/intel/dpgg-learns-extract-discipline-the-hard-way-claymore-vision-wasted-sy6m | 120d (2026-03-25) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-hype-meets-technical-reality-bungie-patches-anteater-erro-0u1u | 120d (2026-03-25) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/seraphmaxs-ultimate-item-modifier-guide-textbook-analysis-questionable-8eu4 | 121d (2026-03-24) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathons-new-sfx-update-audio-changes-impact-ranked-play-m9q9 | 121d (2026-03-24) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/cryo-archive-first-contact-idkhuskyy-survives-the-frozen-hell-ngr8 | 121d (2026-03-24) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/shrouds-hour-long-marathon-masterclass-sets-pvp-meta-standard-c88x | 123d (2026-03-22) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/vandal-undefeated-claims-ring-hollow-without-context-hakt | 123d (2026-03-22) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-survival-ice-station-combat-and-weekend-extracti-q3ro | 123d (2026-03-22) | MIRANDA | news | NEWS | 0/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/meta-analysis-icemanisaacs-statistical-best-weapons-for-ranked-season--tjoo | 123d (2026-03-22) | DEXTER | unclassified | NEWS | 1/0 | -/EVER/NEWS |
| https://cyberneticpunks.com/intel/icemanisaacs-31min-weapon-meta-deep-dive-pulls-23k-views-amid-ranked-l-sn4d | 123d (2026-03-22) | NEXUS | unclassified | EVER | 0/0 | -/NEWS/EVER |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-live-first-weekend-zone-drops-with-elite-rewards-zl2x | 124d (2026-03-21) | MIRANDA | news | NEWS | 1/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-weekend-warriors-high-risk-ranked-loadouts-for-limited-ac-y8y8 | 124d (2026-03-21) | DEXTER | news | NEWS | 0/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/icemanisaac-drops-meta-bible-marathons-weapon-tier-list-exposed-1h0o | 124d (2026-03-21) | CIPHER | unclassified | ? | 1/0 | -/AMB/BOTH |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-survival-new-map-tactics-for-ice-station-defense-k91x | 125d (2026-03-20) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-ranked-shell-synergy-building-around-squad-abilities-p1bk | 125d (2026-03-20) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-broadcast-weekend-event-guide-for-friday-launch-z7e6 | 125d (2026-03-20) | MIRANDA | news | NEWS | 0/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/marathon-advanced-tracking-when-to-deploy-recon-drone-for-maximum-inte-aia9 | 126d (2026-03-19) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/german-guide-covers-ranked-basics-analysis-limited-by-language-barrier-72ug | 126d (2026-03-19) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathon-cryo-archive-launch-what-the-march-20th-drop-means-for-runner-5rd7 | 126d (2026-03-19) | MIRANDA | news | NEWS | 0/0 | NEWS/EVER/UNK |
| https://cyberneticpunks.com/intel/bungie-drops-ranked-resource-guide-community-analysis-of-entry-barrier-29zg | 126d (2026-03-19) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-ranked-loadout-priority-what-to-upgrade-first-for-consistent--2f09 | 126d (2026-03-19) | MIRANDA | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-105-arg-update-taucetis-discord-activity-deep-dive-7l8o | 126d (2026-03-19) | MIRANDA | unclassified | ? | 0/0 | -/EVER/BOTH |
| https://cyberneticpunks.com/intel/marathon-ranked-map-control-high-ground-tactics-for-gold-climbing-xszj | 127d (2026-03-18) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-duos-mode-emergency-shell-synergy-guide-for-two-week-event-pr86 | 127d (2026-03-18) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-solo-extraction-strategy-map-zones-and-early-exit-timing-zwah | 127d (2026-03-18) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/tau-ceti-cup-finals-analysis-team-shrouds-shell-synergy-formula-4stb | 128d (2026-03-17) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/tau-ceti-cup-finals-team-shrouds-winning-shell-composition-analysis-9wtd | 128d (2026-03-17) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/tau-ceti-cup-champion-meta-team-shrouds-winning-strategies-decoded-evnt | 128d (2026-03-17) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/tau-ceti-cup-breakdown-team-shrouds-victory-reveals-ranked-meta-shifts-jxrh | 128d (2026-03-17) | MIRANDA | unclassified | ? | 0/0 | -/EVER/BOTH |
| https://cyberneticpunks.com/intel/tau-ceti-cup-results-tournament-meta-reveals-new-ranked-strategies-pl2d | 129d (2026-03-16) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-precision-rifle-guide-long-range-dominance-for-ranked-yt6n | 129d (2026-03-16) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-ranked-point-economics-understanding-loss-mitigation-systems-dxv6 | 130d (2026-03-15) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-shell-switching-strategy-when-to-change-mid-match-iyj1 | 130d (2026-03-15) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-tau-ceti-cup-event-meta-changes-and-competitive-strategy-o3uh | 130d (2026-03-15) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-sound-strategy-guide-audio-cues-for-ranked-advantage-t0fr | 131d (2026-03-14) | MIRANDA | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-squad-composition-guide-building-s-tier-ranked-teams-856v | 131d (2026-03-14) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/holotag-hunt-strategy-high-value-target-priority-for-ranked-v5f7 | 132d (2026-03-13) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-weapon-range-guide-long-range-meta-for-ranked-launch-6d6w | 132d (2026-03-13) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-1004-update-ranked-mode-preparation-guide-c6i1 | 133d (2026-03-12) | MIRANDA | news | NEWS | 0/0 | NEWS/EVER/NEWS |
| https://cyberneticpunks.com/intel/shell-selection-for-ranked-mode-your-first-100-hours-pjzf | 138d (2026-03-07) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |

**The 66 judgment rows ≤ 60d (parked regardless — Phase 3):**

| URL | age (date) | editor | facet | shape | impr/clk | facet/editor/headline |
|---|---|---|---|---|---|---|
| https://cyberneticpunks.com/intel/marathon-sentinel-build-prey-tracker-and-snare-mine-after-115-7yya | 1d (2026-07-22) | NEXUS | build | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-update-115-patch-impact-on-rook-sentinel-and-the-meta-tjbn | 2d (2026-07-21) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/marathon-assassin-build-active-camo-smoke-engine-for-mid-season-2-wetx | 4d (2026-07-19) | DEXTER | build | EVER | 0/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/marathon-ranked-outlook-what-joe-zieglers-exit-means-vysz | 4d (2026-07-19) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathon-mid-season-2-patch-the-wstr-is-back-what-it-means-for-ranked-0eqn | 6d (2026-07-17) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-mid-season-2-patch-ranked-winners-and-losers-k0z5 | 7d (2026-07-16) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-s2-gear-gap-and-server-woes-what-players-are-grinding-through-owa1 | 9d (2026-07-14) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-patch-1105-what-a-bug-fix-means-for-solo-ranked-dads | 12d (2026-07-11) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-holotag-tiers-the-shell-benchmarks-that-define-each-rank-ixc7 | 14d (2026-07-09) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathon-thief-shell-loot-fast-extract-clean-win-solo-fm0l | 21d (2026-07-02) | MIRANDA | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-kkv-9sd-and-high-rpm-guns-the-bullet-eating-problem-yrej | 22d (2026-07-01) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-thief-shell-grapple-holotag-dominance-wont-last-dkkj | 24d (2026-06-29) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-ranked-climb-playbook-the-solo-path-this-week-crtd | 24d (2026-06-29) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathons-best-guns-debate-what-the-lobby-is-actually-running-y1jb | 25d (2026-06-28) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-squad-finding-the-communitys-real-growing-pain-70ud | 26d (2026-06-27) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-ranked-climb-playbook-thief-and-assassin-lead-this-week-h2y3 | 26d (2026-06-27) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-holotag-tier-benchmarks-what-each-rank-actually-requires-r4lm | 27d (2026-06-26) | CIPHER | unclassified | ? | 1/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathon-assassin-shell-night-marsh-pvp-breakdown-vi1r | 29d (2026-06-24) | NEXUS | guide | EVER | 0/0 | EVER/NEWS/EVER |
| https://cyberneticpunks.com/intel/marathon-patch-1103-ranked-impact-breakdown-5ku9 | 29d (2026-06-24) | CIPHER | unclassified | ? | 0/0 | -/AMB/BOTH |
| https://cyberneticpunks.com/intel/marathon-ranked-climb-playbook-vandal-gunfight-strategy-this-week-qbjj | 30d (2026-06-23) | CIPHER | unclassified | NEWS | 1/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-ranked-climb-playbook-the-assassin-thief-solo-strategy-9inb | 31d (2026-06-22) | CIPHER | unclassified | ? | 1/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathon-cradle-guide-which-tracks-to-prioritize-first-j8ar | 35d (2026-06-18) | MIRANDA | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/marathon-patch-1102-carri-returns-and-solo-ranked-implications-s2c4 | 36d (2026-06-17) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-patch-1102-ranked-impact-what-carri-changes-26f2 | 36d (2026-06-17) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-holotag-ranks-what-each-tier-actually-requires-yewz | 38d (2026-06-15) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathon-ranked-this-week-solo-queue-survival-guide-6zxt | 38d (2026-06-15) | CIPHER | guide | EVER | 0/0 | EVER/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-v85-circuit-breaker-clips-shotgun-meta-signal-6y5g | 38d (2026-06-15) | GHOST | tier | EVER | 0/0 | EVER/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathons-solo-queue-bug-frustrates-community-broken-matchmaking-overs-gzp6 | 39d (2026-06-14) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-player-count-drop-sparks-shutdown-fears-solo-queue-frustratio-s4ca | 39d (2026-06-14) | GHOST | unclassified | ? | 1/1 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-meta-coverage-content-signal-shortage-0tvl | 40d (2026-06-13) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-ranked-this-week-thief-dominance-strategy-arjk | 40d (2026-06-13) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-free-trial-analysis-content-drought-exposes-tutorial-gap-ap4h | 40d (2026-06-13) | DEXTER | unclassified | ? | 0/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/faction-power-balance-the-season-2-progression-meta-that-reveals-which-fag7 | 42d (2026-06-11) | DEXTER | unclassified | NEWS | 0/0 | -/EVER/NEWS |
| https://cyberneticpunks.com/intel/marathons-technical-frustration-meets-twitch-weapon-spotlight-communit-qba0 | 43d (2026-06-10) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/d54-battle-pistol-breaks-out-of-c-tier-prison-ciggaris-1v2-clutch-sign-js1g | 44d (2026-06-09) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/aiiygatorz-clutches-impossible-1v3-after-18-hour-marathon-stream-jj4g | 44d (2026-06-09) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/complex-boss-farming-confirms-pve-weapon-hierarchy-seraphmaxs-24k-view-ukyt | 45d (2026-06-08) | NEXUS | economy | EVER | 1/0 | EVER/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-season-2-weapon-mod-priority-what-new-runners-should-chase-fi-ujjt | 45d (2026-06-08) | MIRANDA | unclassified | NEWS | 1/0 | -/EVER/NEWS |
| https://cyberneticpunks.com/intel/this-weeks-ranked-climb-strategy-the-stealth-shell-meta-thats-breaking-4fwu | 45d (2026-06-08) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-vanishes-from-its-own-algorithm-real-runner-videos-dominate-s-4c3m | 45d (2026-06-08) | NEXUS | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/essential-weapon-mod-builds-for-new-runners-start-here-before-you-spec-no19 | 46d (2026-06-07) | MIRANDA | unclassified | ? | 1/0 | -/EVER/UNK |
| https://cyberneticpunks.com/intel/server-apocalypse-confirms-pve-first-weapon-hierarchy-launch-week-disa-i80s | 48d (2026-06-05) | NEXUS | tier | EVER | 1/0 | EVER/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-season-2-launch-crisis-what-ranked-players-need-to-know-clpz | 49d (2026-06-04) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathon-season-2-patch-impact-server-issues-hide-major-ranked-changes-mtwk | 50d (2026-06-03) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/season-2-ranked-reset-how-to-climb-fast-on-day-one-x203 | 50d (2026-06-03) | CIPHER | unclassified | ? | 0/0 | -/AMB/BOTH |
| https://cyberneticpunks.com/intel/season-2-arsenal-builds-essential-weapon-mod-setups-for-new-runners-x13x | 50d (2026-06-03) | MIRANDA | unclassified | ? | 0/0 | -/EVER/BOTH |
| https://cyberneticpunks.com/intel/your-first-season-2-loadout-day-one-build-recommendations-7flq | 51d (2026-06-02) | DEXTER | unclassified | NEWS | 0/0 | -/EVER/NEWS |
| https://cyberneticpunks.com/intel/this-weeks-ranked-climb-conquest-lmg-meta-makes-december-the-easy-seas-gy9d | 51d (2026-06-02) | CIPHER | tier | EVER | 1/0 | EVER/AMB/NEWS |
| https://cyberneticpunks.com/intel/night-marsh-horror-meta-emerges-season-2-environmental-hazards-reshape-r6ec | 52d (2026-06-01) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/NEWS |
| https://cyberneticpunks.com/intel/this-weeks-ranked-climb-why-assassin-is-the-solo-queue-answer-5bh8 | 54d (2026-05-30) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/marathons-destiny-3-protest-vote-backfires-high-hour-players-call-out--gsnk | 55d (2026-05-29) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathons-bungie-fatigue-hits-different-513-hour-player-still-cant-get-9pdp | 56d (2026-05-28) | GHOST | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathons-art-direction-becomes-the-new-marmite-you-will-either-love-i-jwfd | 57d (2026-05-27) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/pvp-spotlight-reveals-gunplay-maturation-one-hour-deep-dive-exposes-ma-tyvi | 57d (2026-05-27) | NEXUS | unclassified | EVER | 1/0 | -/NEWS/EVER |
| https://cyberneticpunks.com/intel/marathons-destiny-baggage-gets-heavy-but-150-hour-players-push-back-ha-tx28 | 57d (2026-05-27) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathons-assassin-shell-sits-on-the-bench-tied-with-rook-for-6th-plac-y1y2 | 58d (2026-05-26) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathons-playtime-warriors-draw-battle-lines-685-hours-vs-7-hours-tel-7yf7 | 58d (2026-05-26) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/v99-channel-rifle-breakout-nextlevel-jj-spotlight-signals-energy-snipe-7vcq | 58d (2026-05-26) | NEXUS | tier | EVER | 0/0 | EVER/NEWS/UNK |
| https://cyberneticpunks.com/intel/rook-week-the-ranked-climb-strategy-built-for-marathons-retention-cris-db15 | 58d (2026-05-26) | CIPHER | unclassified | NEWS | 1/0 | -/AMB/NEWS |
| https://cyberneticpunks.com/intel/destiny-2s-death-throws-marathon-under-the-bus-but-steam-players-fight-d7ha | 58d (2026-05-26) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathon-holotag-tier-skill-requirements-the-build-thresholds-that-act-nkz2 | 59d (2026-05-25) | CIPHER | unclassified | ? | 0/0 | -/AMB/UNK |
| https://cyberneticpunks.com/intel/marathons-performance-war-divides-pc-players-barely-80-fps-on-overkill-x6si | 59d (2026-05-25) | GHOST | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/ranked-mode-split-exposed-solo-climb-vs-squad-coordination-creates-fun-2cot | 60d (2026-05-24) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/marathons-hardcore-wall-splits-steam-community-overwhelming-to-learn-a-24f4 | 60d (2026-05-24) | GHOST | unclassified | ? | 1/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/faction-power-ranking-exposed-sekiguchis-ability-economy-dominance-res-7vx2 | 60d (2026-05-24) | NEXUS | unclassified | ? | 0/0 | -/NEWS/UNK |
| https://cyberneticpunks.com/intel/ranked-cryo-archive-climbing-strategy-for-the-may-24-28-window-7eda | 60d (2026-05-24) | CIPHER | unclassified | NEWS | 0/0 | -/AMB/NEWS |

## 6. PROTECTED — excluded from every cut (10)

| URL | age (date) | editor | facet | shape | impr/clk | facet/editor/headline |
|---|---|---|---|---|---|---|
| https://cyberneticpunks.com/intel/marathon-wstr-combat-shotgun-build-mid-season-buff-guide-k8fq | 7d (2026-07-16) | DEXTER | build | EVER | 0/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-poison-engine-the-season-2-dot-meta-that-turns-st-ddwt | 58d (2026-05-26) | DEXTER | build | EVER | 0/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-meta-the-v99-channel-rifle-long-range-assassination-build-ielf | 59d (2026-05-25) | DEXTER | build | EVER | 1/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/compiler-speed-kill-engine-the-biotoxic-disinjector-dot-meta-that-melt-mhde | 61d (2026-05-23) | DEXTER | build | EVER | 0/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/demolition-hmg-warden-hunt-engine-update-109s-heavy-armor-counter-meta-qq0w | 64d (2026-05-20) | DEXTER | build | EVER | 1/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/vandal-vs-destroyer-which-shell-wins-more-ranked-games-5y1t | 65d (2026-05-19) | MIRANDA | counter | EVER | 1/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/ares-rg-theory-post-security-update-prestige-salvage-engine-hf5s | 75d (2026-05-09) | DEXTER | build | EVER | 1/0 | EVER/EVER/UNK |
| https://cyberneticpunks.com/intel/ares-rg-post-nerf-theory-the-123-damage-precision-engine-still-dominat-qioy | 77d (2026-05-07) | DEXTER | build | EVER | 1/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/biotoxic-disinjector-hybrid-build-post-nerf-tactical-poison-meta-0brd | 97d (2026-04-17) | DEXTER | build | EVER | 0/0 | EVER/EVER/NEWS |
| https://cyberneticpunks.com/intel/cryo-archive-loadout-optimization-best-gear-for-pve-weekend-runs-7x00 | 117d (2026-03-28) | MIRANDA | build | EVER | 1/0 | EVER/EVER/NEWS |

---
_Buckets only. The operator picks the cut. Protected pages excluded from all cut buckets. Regenerate if the DB or GSC window changes._
