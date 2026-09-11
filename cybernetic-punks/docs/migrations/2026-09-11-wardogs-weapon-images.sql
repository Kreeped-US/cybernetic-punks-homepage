-- Wardogs weapon-image wiring (operator-run, AFTER verifying the mapping below).
-- Sets weapon_stats.image_filename to a BARE filename; the shared WeaponImage component builds
-- /images/wardogs/<image_filename>. Per-weapon, scoped (game_slug=wardogs + exact name),
-- semicolon-safe (no semicolons in strings), cross-game-safe. EDIT any wrong mapping before running.
-- Confidence: EXACT = filename normalizes to the weapon name; VERIFY = fuzzy (double-check).

-- a-91.webp -> A-91  [EXACT]
update weapon_stats set image_filename = 'a-91.webp' where game_slug = 'wardogs' and name = 'A-91';
-- ak74.webp -> AK74  [EXACT]
update weapon_stats set image_filename = 'ak74.webp' where game_slug = 'wardogs' and name = 'AK74';
-- amp-9.webp -> AMP-9  [EXACT]
update weapon_stats set image_filename = 'amp-9.webp' where game_slug = 'wardogs' and name = 'AMP-9';
-- amr-50.webp -> AMR 50  [EXACT]
update weapon_stats set image_filename = 'amr-50.webp' where game_slug = 'wardogs' and name = 'AMR 50';
-- bmr-308.webp -> BMR-308  [EXACT]
update weapon_stats set image_filename = 'bmr-308.webp' where game_slug = 'wardogs' and name = 'BMR-308';
-- bushmaster-m17s.webp -> Bushmaster M17S  [EXACT]
update weapon_stats set image_filename = 'bushmaster-m17s.webp' where game_slug = 'wardogs' and name = 'Bushmaster M17S';
-- compound-bow.webp -> Compound Bow  [EXACT]
update weapon_stats set image_filename = 'compound-bow.webp' where game_slug = 'wardogs' and name = 'Compound Bow';
-- deagle.webp -> Deagle  [EXACT]
update weapon_stats set image_filename = 'deagle.webp' where game_slug = 'wardogs' and name = 'Deagle';
-- fal.webp -> FAL  [EXACT]
update weapon_stats set image_filename = 'fal.webp' where game_slug = 'wardogs' and name = 'FAL';
-- galil.webp -> Galil  [EXACT]
update weapon_stats set image_filename = 'galil.webp' where game_slug = 'wardogs' and name = 'Galil';
-- ggx-17.webp -> GGX 17  [EXACT]
update weapon_stats set image_filename = 'ggx-17.webp' where game_slug = 'wardogs' and name = 'GGX 17';
-- ggx-18.webp -> GGX 18  [EXACT]
update weapon_stats set image_filename = 'ggx-18.webp' where game_slug = 'wardogs' and name = 'GGX 18';
-- judge.webp -> Judge  [EXACT]
update weapon_stats set image_filename = 'judge.webp' where game_slug = 'wardogs' and name = 'Judge';
-- kh-2002.webp -> KH-2002  [EXACT]
update weapon_stats set image_filename = 'kh-2002.webp' where game_slug = 'wardogs' and name = 'KH-2002';
-- m1911.webp -> M1911  [EXACT]
update weapon_stats set image_filename = 'm1911.webp' where game_slug = 'wardogs' and name = 'M1911';
-- m249-saw.webp -> M249 SAW  [EXACT]
update weapon_stats set image_filename = 'm249-saw.webp' where game_slug = 'wardogs' and name = 'M249 SAW';
-- m4.webp -> M4  [EXACT]
update weapon_stats set image_filename = 'm4.webp' where game_slug = 'wardogs' and name = 'M4';
-- m500.webp -> M500  [EXACT]
update weapon_stats set image_filename = 'm500.webp' where game_slug = 'wardogs' and name = 'M500';
-- maaws.webp -> MAAWS  [EXACT]
update weapon_stats set image_filename = 'maaws.webp' where game_slug = 'wardogs' and name = 'MAAWS';
-- mgl-40.webp -> MGL-40  [EXACT]
update weapon_stats set image_filename = 'mgl-40.webp' where game_slug = 'wardogs' and name = 'MGL-40';
-- mk-22.webp -> MK22  [EXACT]
update weapon_stats set image_filename = 'mk-22.webp' where game_slug = 'wardogs' and name = 'MK22';
-- mosin-nagant.webp -> Mosin Nagant  [EXACT]
update weapon_stats set image_filename = 'mosin-nagant.webp' where game_slug = 'wardogs' and name = 'Mosin Nagant';
-- mp-43.webp -> MP43  [EXACT]
update weapon_stats set image_filename = 'mp-43.webp' where game_slug = 'wardogs' and name = 'MP43';
-- mp5.webp -> MP5  [EXACT]
update weapon_stats set image_filename = 'mp5.webp' where game_slug = 'wardogs' and name = 'MP5';
-- pkm.webp -> PKM  [EXACT]
update weapon_stats set image_filename = 'pkm.webp' where game_slug = 'wardogs' and name = 'PKM';
-- pp-19.webp -> PP-19 Vityaz  [VERIFY -- CONFIRM THIS IS THE RIGHT WEAPON]
update weapon_stats set image_filename = 'pp-19.webp' where game_slug = 'wardogs' and name = 'PP-19 Vityaz';
-- rpg-7.webp -> RPG-7  [EXACT]
update weapon_stats set image_filename = 'rpg-7.webp' where game_slug = 'wardogs' and name = 'RPG-7';
-- scout-rifle-td.webp -> Scout Rifle TD  [EXACT]
update weapon_stats set image_filename = 'scout-rifle-td.webp' where game_slug = 'wardogs' and name = 'Scout Rifle TD';
-- sks.webp -> SKS  [EXACT]
update weapon_stats set image_filename = 'sks.webp' where game_slug = 'wardogs' and name = 'SKS';
-- super-45.webp -> Super-45  [EXACT]
update weapon_stats set image_filename = 'super-45.webp' where game_slug = 'wardogs' and name = 'Super-45';
-- sv98.webp -> SV98  [EXACT]
update weapon_stats set image_filename = 'sv98.webp' where game_slug = 'wardogs' and name = 'SV98';
-- svd.webp -> SVD  [EXACT]
update weapon_stats set image_filename = 'svd.webp' where game_slug = 'wardogs' and name = 'SVD';
-- t-21.webp -> T-21  [EXACT]
update weapon_stats set image_filename = 't-21.webp' where game_slug = 'wardogs' and name = 'T-21';

-- Unmatched image files (attachments/optics/ammo, NOT weapons -- no UPDATE): .45-acp-pistol-compensator.webp, 10x.webp, 12-gauge-suppressor.webp, 50-cal-heavy-suppressor.webp, 9k333-verba.webp
