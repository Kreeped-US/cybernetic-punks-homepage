# Wardogs Attachments -- Load Mapping (for review)

STATUS: REVIEW. Parsed from `public/images/wardogs/wardogsstats.txt`. No DB writes. Held load migration: `docs/migrations/2026-09-15-wardogs-attachments-load.sql`.

- rows: **207** (distinct names 204) | priced **95** | unpriced/honest-null **112**
- by slot: muzzle 49, magazine 42, optic 28, stock 17, grip 15, barrel 14, handguard 14, foregrip 11, bipod 6, dust_cover 3, trigger 3, accessory 3, receiver 1, other 1
- DUPLICATES (operator resolve -- keep one or distinct variants?): AK74 Grip; MMGL Barrel; SV98 Extended Mag
- AMBIGUOUS SLOT (mapped `other` -- confirm): RS2 Slim
- UNMATCHED weapon tokens (weapon-specific but not in our 33-gun roster): AGS-74 PRO Sniper Pistol Grip; AK-12 Pistol Grip; AK-47 HERA CQR Stock; AK47N EXTENDED MAG 45RD; AK74N EXTENDED MAG 120RD; AK74N EXTENDED MAG 60RD; AK74u Dust Cover; AK74u Polymer Handguard; AK74u Steel Folding Stock; AK74u Wooden Handguard; AKS74u Barrel + Gas Block; Glock Extended 27RD; MP9 Extended Mag 30RD; RFB 20RD MAGPUL; RPK74 Barrel + Gas Block; RPK74 Dust Cover; RPK74 Polymer Handguard; RPK74 Wooden Handguard; RPK74 Wooden Stock; SVDM Barrel; SVDM Handguard; SVDM Stock; LVOA Handguard

Provenance for every row: tier=attributed, verified=false, verified_source="community-aggregated attachment catalog, in-game tested (attributed)". Effect columns stay NULL (Phase 2).

| # | name | slot | subtype | price | weight | compat | compatible_weapons | flags |
|---|---|---|---|---|---|---|---|---|
| 1 | .45 ACP Pistol Compensator | muzzle | compensator | 1030 | 0.1 | generic |  |  |
| 2 | .50 Cal Heavy Suppressor | muzzle | suppressor | 1420 | 1.2 | generic |  |  |
| 3 | 12 Gauge Suppressor | muzzle | suppressor | 1040 | 0.8 | generic |  |  |
| 4 | 2.5x Combat Optic | optic |  | 690 | 0.4 | generic |  |  |
| 5 | 3 Prong Flash Hider | muzzle | flash-hider | 1000 | 0.1 | generic |  |  |
| 6 | 3-Chamber Brake | muzzle | brake | 1080 | 0.1 | generic |  |  |
| 7 | 3x Tactical Prism Scope | optic | prism | 740 | 0.4 | generic |  |  |
| 8 | 3x-6x LPVO Short Dot | optic | reflex | 860 | 0.6 | generic |  |  |
| 9 | 45° Angled Foregrip | foregrip | angled | 680 | 0.1 | generic |  |  |
| 10 | 4x Combat Prism Scope with Reflex | optic | reflex | 880 | 0.4 | generic |  |  |
| 11 | 6-10x Scope MOA | optic | scope | 1050 | 1 | generic |  |  |
| 12 | 6-10x Scope MRAD | optic | scope | 1200 | 1 | generic |  |  |
| 13 | 6x Marksman Scope + Reflex | optic | reflex | 1650 | 0.7 | generic |  |  |
| 14 | 6x Precision Rifle Scope | optic | scope | 680 | 0.7 | generic |  |  |
| 15 | AFG Angled Foregrip | foregrip | angled | 820 | 0.1 | generic |  |  |
| 16 | AMP-9 50 RND Drum Magazine | magazine | drum | 180 | 1.5 | weapon-specific | AMP-9 |  |
| 17 | AMP-9 9x19 Suppressor | muzzle | suppressor | 1130 | 0.4 | weapon-specific | AMP-9 |  |
| 18 | AMP-9 Tactical Flash Hider | muzzle | flash-hider | 550 | 0.1 | weapon-specific | AMP-9 |  |
| 19 | AMR 50 Cal Muzzle Brake | muzzle | brake | 1600 | 0.5 | weapon-specific | AMR 50 |  |
| 20 | Angled Tactical Foregrip | foregrip | angled | 650 | 0.1 | generic |  |  |
| 21 | AR Multi-Caliber Suppressor | muzzle | suppressor | 1350 | 0.7 | generic |  |  |
| 22 | Ballista Brake | muzzle | brake | 380 | 0.1 | generic |  |  |
| 23 | Birdcage Flash Hider | muzzle | flash-hider | 900 | 0.1 | generic |  |  |
| 24 | BMR-308 Flash Hider | muzzle | flash-hider | 1280 | 0.1 | weapon-specific | BMR-308 |  |
| 25 | BMR-308 Suppressor | muzzle | suppressor | 1200 | 0.7 | weapon-specific | BMR-308 |  |
| 26 | Compact T-2 Red Dot | optic | reflex | 340 | 0.1 | generic |  |  |
| 27 | Constrictor Brake | muzzle | brake | 760 | 0.1 | generic |  |  |
| 28 | CQ-2x Prism Combat Scope | optic | prism | 640 | 0.3 | generic |  |  |
| 29 | CQB 74 Brake | muzzle | brake | 680 | 0.2 | generic |  |  |
| 30 | CQR Tactical Front Rail Grip | foregrip |  | 1100 | 0.1 | generic |  |  |
| 31 | Deadeye Flash Hider | muzzle | flash-hider | 400 | 0.1 | generic |  |  |
| 32 | Deagle 7 RND Magazine | magazine |  | 50 | 0.4 | weapon-specific | Deagle |  |
| 33 | DTK-1 Brake | muzzle | brake | 820 | 0.2 | generic |  |  |
| 34 | Dual Port Brake | muzzle | brake | 720 | 0.1 | generic |  |  |
| 35 | Eclipse Flash Hider | muzzle | flash-hider | 700 | 0.1 | generic |  |  |
| 36 | FAL 20 RND Magazine | magazine |  | 150 | 0.8 | weapon-specific | FAL |  |
| 37 | FAL Flash Hider | muzzle | flash-hider | 1250 | 0.2 | weapon-specific | FAL |  |
| 38 | Flow-Through .308 Suppressor | muzzle | suppressor | 1120 | 0.3 | generic |  |  |
| 39 | Four Reticle Reflex | optic | reflex | 580 | 0.1 | generic |  |  |
| 40 | Frontier 2.5x-10x Precision Scope | optic | scope | 1800 | 0.7 | generic |  |  |
| 41 | Full Choke | muzzle | choke | 1400 | _null_ | generic |  |  |
| 42 | Galil 35 RND Magazine | magazine |  | 60 | 0.7 | weapon-specific | Galil |  |
| 43 | Ghost LITE Muzzle Brake | muzzle | brake | 970 | 0.1 | generic |  |  |
| 44 | GOL Multi-Caliber Suppressor | muzzle | suppressor | 1800 | 0.8 | generic |  |  |
| 45 | Hexagon 762 Suppressor | muzzle | suppressor | 1210 | 0.6 | generic |  |  |
| 46 | Hexagon Brake | muzzle | brake | 350 | 0.1 | generic |  |  |
| 47 | Holographic Sight | optic | reflex | 620 | 0.3 | generic |  |  |
| 48 | Hybrid Grip Pod | foregrip |  | 1500 | 0.3 | generic |  |  |
| 49 | Improved Cylinder Choke | muzzle | choke | 540 | _null_ | generic |  |  |
| 50 | Kobra Reflex | optic | reflex | 520 | 0.4 | generic |  |  |
| 51 | M1911 7 RND Magazine | magazine |  | 20 | 0.2 | weapon-specific | M1911 |  |
| 52 | M249 Bipod | bipod |  | 1050 | 0.7 | weapon-specific | M249 SAW |  |
| 53 | M500 Sabre Brake | muzzle | brake | 740 | 0.1 | weapon-specific | M500 |  |
| 54 | Mini Angled Foregrip | foregrip | angled | 720 | 0.1 | generic |  |  |
| 55 | Mini Reflex Sight | optic | reflex | 200 | _null_ | generic |  |  |
| 56 | MP5 20 RND Magazine | magazine |  | 70 | 0.3 | weapon-specific | MP5 |  |
| 57 | MP5 30 RND Magazine | magazine |  | 100 | 0.5 | weapon-specific | MP5 |  |
| 58 | MP5 50 RND Drum Magazine | magazine | drum | 230 | 1.5 | weapon-specific | MP5 |  |
| 59 | MP5 Flash Hider | muzzle | flash-hider | 1150 | 0.2 | weapon-specific | MP5 |  |
| 60 | OKP 7 Reflex | optic | reflex | 840 | 0.5 | generic |  |  |
| 61 | Orpheus Max Brake | muzzle | brake | 1020 | 0.2 | generic |  |  |
| 62 | PBS-4 Suppressor | muzzle | suppressor | 1300 | 0.8 | generic |  |  |
| 63 | PGO-7 | optic |  | 850 | 0.6 | generic |  |  |
| 64 | PKM Bipod | bipod |  | 1350 | 0.7 | weapon-specific | PKM |  |
| 65 | PP-19 50 RND Vityaz Drum Magazine | magazine | drum | 200 | 1.3 | weapon-specific | PP-19 Vityaz |  |
| 66 | PP-19 Vityaz Flash Hider | muzzle | flash-hider | 800 | 0.1 | weapon-specific | PP-19 Vityaz |  |
| 67 | PP-19-01 Vityaz 9x19 Suppressor | muzzle | suppressor | 1450 | 0.5 | weapon-specific | PP-19 Vityaz |  |
| 68 | Pro Tilt Bipod | bipod |  | 1400 | 0.6 | generic |  |  |
| 69 | QD-5 Suppressor | muzzle | suppressor | 1170 | 0.4 | generic |  |  |
| 70 | RC-556 Suppressor | muzzle | suppressor | 1550 | 0.5 | generic |  |  |
| 71 | RK6 Tactical Foregrip | foregrip |  | 380 | 1.1 | generic |  |  |
| 72 | Rubberized Ergonomic Foregrip | foregrip |  | 540 | 0.1 | generic |  |  |
| 73 | RVG Vertical Foregrip | foregrip | vertical | 770 | 0.1 | generic |  |  |
| 74 | SG Multi-Caliber Suppressor | muzzle | suppressor | 1220 | 0.6 | generic |  |  |
| 75 | Shift Foregrip | foregrip |  | 1150 | 0.1 | generic |  |  |
| 76 | SKS Bipod | bipod |  | 800 | 0.5 | weapon-specific | SKS |  |
| 77 | Slicktap Brake | muzzle | brake | 940 | 0.1 | generic |  |  |
| 78 | Slotted Flash Hider | muzzle | flash-hider | 960 | 0.1 | generic |  |  |
| 79 | Spectr 4x | optic | scope | 800 | 0.7 | generic |  |  |
| 80 | Spitfire 3X | optic | scope | 790 | 0.3 | generic |  |  |
| 81 | SRVV Brake | muzzle | brake | 1470 | 0.5 | generic |  |  |
| 82 | STRELIX Suppressor | muzzle | suppressor | 1000 | 0.6 | generic |  |  |
| 83 | Super-45 Flash Hider | muzzle | flash-hider | 1050 | 0.1 | weapon-specific | Super-45 |  |
| 84 | Suppressor T8L1 Scout | muzzle | suppressor | 1000 | 0.6 | generic |  |  |
| 85 | SV98 Bipod | bipod |  | 1250 | 0.5 | weapon-specific | SV98 |  |
| 86 | SVD 5 RND Magazine | magazine |  | 20 | 0.2 | weapon-specific | SVD |  |
| 87 | SVD 7.62x54R Brake | muzzle | brake | 650 | 0.2 | weapon-specific | SVD |  |
| 88 | SVD Bipod | bipod |  | 1120 | 0.5 | weapon-specific | SVD |  |
| 89 | TDG Vertical Foregrip | foregrip | vertical | 1000 | 0.1 | generic |  |  |
| 90 | TGP-A Suppressor 5.45 | muzzle | suppressor | 1190 | 0.7 | generic |  |  |
| 91 | Three Port Brake | muzzle | brake | 1180 | 0.1 | generic |  |  |
| 92 | TopComp Brake | muzzle | brake | 770 | 0.1 | generic |  |  |
| 93 | Tread Brake | muzzle | brake | 620 | 0.1 | generic |  |  |
| 94 | Tricon 1.5x Compact Prism Scope | optic | prism | 650 | 0.2 | generic |  |  |
| 95 | Vektor Frenix-X Micro Reflex Sight | optic | reflex | 820 | 0 | generic |  |  |
| 96 | 10x | optic | scope | _null_ | _null_ | generic |  |  |
| 97 | 10x Thermal Scope | optic | thermal | _null_ | _null_ | generic |  |  |
| 98 | 4X Hybrid | optic | scope | _null_ | _null_ | generic |  |  |
| 99 | 9RD SHELL | magazine |  | _null_ | _null_ | generic |  |  |
| 100 | A91 Barrel | barrel |  | _null_ | _null_ | weapon-specific | A-91 |  |
| 101 | AGS-74 PRO Sniper Pistol Grip | grip | pistol | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "AGS-74" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 102 | AK-12 Pistol Grip | grip | pistol | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "AK-12" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 103 | AK-47 HERA CQR Stock | stock |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "AK-47" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 104 | AK47N EXTENDED MAG 45RD | magazine | extended | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "AK47N" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 105 | AK74 Barrel | barrel |  | _null_ | _null_ | weapon-specific | AK74 |  |
| 106 | AK74 Grip | grip | pistol | _null_ | _null_ | weapon-specific | AK74 |  |
| 107 | AK74 Grip | grip | pistol | _null_ | _null_ | weapon-specific | AK74 | DUPLICATE |
| 108 | AK74 Handguard | handguard |  | _null_ | _null_ | weapon-specific | AK74 |  |
| 109 | AK74 Receiver | receiver |  | _null_ | _null_ | weapon-specific | AK74 |  |
| 110 | AK74 Stock | stock |  | _null_ | _null_ | weapon-specific | AK74 |  |
| 111 | AK74N EXTENDED MAG 120RD | magazine | extended | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "AK74N" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 112 | AK74N EXTENDED MAG 60RD | magazine | extended | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "AK74N" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 113 | AK74u Dust Cover | dust_cover |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "AK74u" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 114 | AK74u Polymer Handguard | handguard |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "AK74u" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 115 | AK74u Steel Folding Stock | stock | folding | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "AK74u" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 116 | AK74u Wooden Handguard | handguard |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "AK74u" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 117 | AKS74u Barrel + Gas Block | barrel |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "AKS74u" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 118 | Alpha Folding Stock | stock | folding | _null_ | _null_ | generic |  |  |
| 119 | Archangel OPFOR Forend | handguard |  | _null_ | _null_ | generic |  |  |
| 120 | Archangel OPFOR Pistol Grip | grip | pistol | _null_ | _null_ | generic |  |  |
| 121 | Archangel OPFOR Stock | stock |  | _null_ | _null_ | generic |  |  |
| 122 | Basic Muzzle | muzzle |  | _null_ | _null_ | generic |  |  |
| 123 | Buffertube Stock | stock |  | _null_ | _null_ | generic |  |  |
| 124 | Canted Irons | optic | irons | _null_ | _null_ | generic |  |  |
| 125 | CGM4 Scope | optic | scope | _null_ | 0.1 | generic |  |  |
| 126 | CMC Flat Trigger | trigger |  | _null_ | _null_ | generic |  |  |
| 127 | Glock Extended 27RD | magazine | extended | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "Glock" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 128 | HOMEMADE 50RD DRUM MAG | magazine | drum | _null_ | _null_ | generic |  |  |
| 129 | KGB MG47 Grip | grip | pistol | _null_ | _null_ | generic |  |  |
| 130 | KH2002 Barrel | barrel |  | _null_ | _null_ | weapon-specific | KH-2002 |  |
| 131 | M-LOK Dong Grip | grip | pistol | _null_ | _null_ | generic |  |  |
| 132 | M4 Barrel | barrel |  | _null_ | _null_ | weapon-specific | M4 |  |
| 133 | M4 Handguard | handguard |  | _null_ | _null_ | weapon-specific | M4 |  |
| 134 | M4 Pistol Grip | grip | pistol | _null_ | _null_ | weapon-specific | M4 |  |
| 135 | M4 Stock | stock |  | _null_ | _null_ | weapon-specific | M4 |  |
| 136 | MAGPUL D60 | magazine |  | _null_ | _null_ | generic |  |  |
| 137 | Magpul MBUS Iron Sights | magazine |  | _null_ | _null_ | generic |  |  |
| 138 | MI Universal Handguard | handguard |  | _null_ | _null_ | generic |  |  |
| 139 | MK22 10RD | magazine |  | _null_ | _null_ | weapon-specific | MK22 |  |
| 140 | MMGL Barrel | barrel |  | _null_ | _null_ | generic |  |  |
| 141 | MMGL Barrel | barrel |  | _null_ | _null_ | generic |  | DUPLICATE |
| 142 | MMGL Handguard | handguard |  | _null_ | _null_ | generic |  |  |
| 143 | MMGL Pistol Grip | grip | pistol | _null_ | _null_ | generic |  |  |
| 144 | MMGL Sight | optic |  | _null_ | 0.1 | generic |  |  |
| 145 | MMGL Stock | stock |  | _null_ | _null_ | generic |  |  |
| 146 | MOSIN 10RD Extended | magazine | extended | _null_ | _null_ | weapon-specific | Mosin Nagant |  |
| 147 | MOSIN 20RD Extended | magazine | extended | _null_ | _null_ | weapon-specific | Mosin Nagant |  |
| 148 | MOSIN Stripper Clip | magazine |  | _null_ | _null_ | weapon-specific | Mosin Nagant |  |
| 149 | MOSS EXT MAG | magazine | extended | _null_ | _null_ | generic |  |  |
| 150 | MP9 Extended Mag 30RD | magazine | extended | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "MP9" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 151 | NcSTAR Blue Laser | accessory | laser | _null_ | _null_ | generic |  |  |
| 152 | Polymer Handguard | handguard |  | _null_ | _null_ | generic |  |  |
| 153 | Polymer Pistol Grip | grip | pistol | _null_ | _null_ | generic |  |  |
| 154 | Polymer Stock | stock |  | _null_ | _null_ | generic |  |  |
| 155 | Railed Dust Cover | dust_cover |  | _null_ | _null_ | generic |  |  |
| 156 | RAK-1 Enhanced Trigger | trigger |  | _null_ | _null_ | generic |  |  |
| 157 | RFB 20RD MAGPUL | magazine |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "RFB" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 158 | RPK74 Barrel + Gas Block | barrel |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "RPK74" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 159 | RPK74 Dust Cover | dust_cover |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "RPK74" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 160 | RPK74 Polymer Handguard | handguard |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "RPK74" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 161 | RPK74 Wooden Handguard | handguard |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "RPK74" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 162 | RPK74 Wooden Stock | stock |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "RPK74" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 163 | SAW-MAG 150 RD TWIN DRUM | magazine | drum | _null_ | _null_ | generic |  |  |
| 164 | Sharkfin Dong Grip | grip | pistol | _null_ | _null_ | generic |  |  |
| 165 | SKS EXT MAG 20RD | magazine | extended | _null_ | _null_ | weapon-specific | SKS |  |
| 166 | SKS EXTENDED MAG 30RD | magazine | extended | _null_ | _null_ | weapon-specific | SKS |  |
| 167 | SKS EXTENDED MAG 40RD | magazine | extended | _null_ | _null_ | weapon-specific | SKS |  |
| 168 | Smoke Shell | magazine |  | _null_ | _null_ | generic |  |  |
| 169 | Sniper Muzzle | muzzle |  | _null_ | _null_ | generic |  |  |
| 170 | SUREFIRE 60 RD | magazine |  | _null_ | _null_ | generic |  |  |
| 171 | SV98 20RD MAG | magazine |  | _null_ | _null_ | weapon-specific | SV98 |  |
| 172 | SV98 Stock | stock |  | _null_ | _null_ | weapon-specific | SV98 |  |
| 173 | SVD MAG 20RD | magazine |  | _null_ | _null_ | weapon-specific | SVD |  |
| 174 | SVDM Barrel | barrel |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "SVDM" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 175 | SVDM Handguard | handguard |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "SVDM" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 176 | SVDM Stock | stock |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "SVDM" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 177 | TI Battlerail | accessory | mount | _null_ | _null_ | generic |  |  |
| 178 | Timney Drop-in Trigger | trigger |  | _null_ | _null_ | generic |  |  |
| 179 | Wooden Dong Grip | grip | pistol | _null_ | _null_ | generic |  |  |
| 180 | Wooden Pistol Grip | grip | pistol | _null_ | _null_ | generic |  |  |
| 181 | Zenit Handguard | handguard |  | _null_ | _null_ | generic |  |  |
| 182 | Zenit Stock | stock |  | _null_ | _null_ | generic |  |  |
| 183 | ZenitCo B-13 Side Mount | accessory | mount | _null_ | _null_ | generic |  |  |
| 184 | 3-6x Scope | optic | scope | _null_ | _null_ | generic |  |  |
| 185 | AK74-M Extended Mag | magazine | extended | _null_ | _null_ | generic |  |  |
| 186 | AR Extended Mag | magazine | extended | _null_ | _null_ | generic |  |  |
| 187 | Combat Bow Standard Mag | magazine |  | _null_ | _null_ | generic |  |  |
| 188 | Deagle Barrel | barrel |  | _null_ | _null_ | weapon-specific | Deagle |  |
| 189 | FAL Pistol Grip | grip | pistol | _null_ | _null_ | weapon-specific | FAL |  |
| 190 | FAL Stock | stock |  | _null_ | _null_ | weapon-specific | FAL |  |
| 191 | Galil Barrel | barrel |  | _null_ | _null_ | weapon-specific | Galil |  |
| 192 | Galil Pistol Grip | grip | pistol | _null_ | _null_ | weapon-specific | Galil |  |
| 193 | Galil Stock | stock |  | _null_ | _null_ | weapon-specific | Galil |  |
| 194 | Launcher_04 Standard Mag | magazine |  | _null_ | _null_ | generic |  |  |
| 195 | LVOA Handguard | handguard |  | _null_ | _null_ | weapon-specific |  | UNMATCHED weapon token "LVOA" (variant of a roster gun, or a weapon we do not stock -- operator resolve) |
| 196 | M1911 Barrel | barrel |  | _null_ | _null_ | weapon-specific | M1911 |  |
| 197 | M4 Extended Mag | magazine | extended | _null_ | _null_ | weapon-specific | M4 |  |
| 198 | M500 Internal Mag | magazine |  | _null_ | _null_ | weapon-specific | M500 |  |
| 199 | MP43 Internal Mag | magazine |  | _null_ | _null_ | weapon-specific | MP43 |  |
| 200 | MP5 Barrel | barrel |  | _null_ | _null_ | weapon-specific | MP5 |  |
| 201 | MP5 Handguard | handguard |  | _null_ | _null_ | weapon-specific | MP5 |  |
| 202 | MP5 Stock | stock |  | _null_ | _null_ | weapon-specific | MP5 |  |
| 203 | RS2 Slim | other |  | _null_ | _null_ | generic |  | AMBIGUOUS-SLOT |
| 204 | Scout Rifle Standard Barrel | barrel |  | _null_ | _null_ | weapon-specific | Scout Rifle TD |  |
| 205 | Scout Rifle Stock | stock |  | _null_ | _null_ | weapon-specific | Scout Rifle TD |  |
| 206 | SV98 Extended Mag | magazine | extended | _null_ | _null_ | weapon-specific | SV98 |  |
| 207 | SV98 Extended Mag | magazine | extended | _null_ | _null_ | weapon-specific | SV98 | DUPLICATE |
