-- 2026-09-10-wardogs-firerate-swoleguy-rerun.sql
-- RE-RUN of the Wardogs Swoleguy fire-rate extract for the 29 weapons that DID NOT apply on the first
-- run (only BMR-308 landed -- the full file was not executed). THE OPERATOR RUNS THIS. No DB writes by executor.
--
-- STATE CONFIRMED 2026-09-10: wardogs 33 rows, only BMR-308 has fire_rate (468). The 29 below are still
-- NULL. The 3 launchers (MAAWS/MGL-40/RPG-7) correctly stay NULL. BMR-308 is EXCLUDED here (already done,
-- excluding it avoids double-appending its provenance).
--
-- IDEMPOTENCY GUARD: each UPDATE WHERE carries  coalesce(verified_source,'') not like '%Swoleguy%'  so a row
-- that already has the Swoleguy fire_rate provenance is SKIPPED -- re-running this file cannot double-append.
-- (Confirmed 2026-09-10: none of the 29 currently carry Swoleguy, so all 29 will fire on the first re-run.)
--
-- Conventions match the original: fire_rate set, provenance field-scoped APPEND (not overwrite), verified
-- stays false, per-weapon WHERE, semicolon-safe (commas only). Run once.

-- =====================================================================================
-- FIRE-RATE (RPM) -- 29 weapons (re-run), Swoleguy ballistics, attributed (verified stays false)
-- =====================================================================================
update weapon_stats set fire_rate=709,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed) -- 513 semi / 709 burst, burst RPM recorded.' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed) -- 513 semi / 709 burst, burst RPM recorded.' end
  where game_slug='wardogs' and name='Bushmaster M17S' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=721,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed) -- 512 semi / 721 burst, burst RPM recorded.' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed) -- 512 semi / 721 burst, burst RPM recorded.' end
  where game_slug='wardogs' and name='A-91' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=711,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed) -- 518 semi / 711 burst, burst RPM recorded.' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed) -- 518 semi / 711 burst, burst RPM recorded.' end
  where game_slug='wardogs' and name='KH-2002' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=780,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='T-21' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=664,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Galil' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=827,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='M4' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=665,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='AK74' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=706,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='FAL' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=945,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='AMP-9' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=875,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='PP-19 Vityaz' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=836,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='MP5' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=524,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='GGX 17' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=1253,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='GGX 18' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=1255,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Super-45' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=670,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='MP43' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=95,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='M500' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=884,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='M249 SAW' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=605,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='PKM' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=416,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='SKS' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=512,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='SVD' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=16,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Scout Rifle TD' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=48,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Mosin Nagant' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=52,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='SV98' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=45,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='MK22' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=55,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='AMR 50' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=41,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Compound Bow' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=212,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Judge' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=470,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='M1911' and coalesce(verified_source,'') not like '%Swoleguy%';

update weapon_stats set fire_rate=277,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Deagle' and coalesce(verified_source,'') not like '%Swoleguy%';

-- =====================================================================================
-- VERIFY after running:
-- =====================================================================================
--   select name, fire_rate from weapon_stats where game_slug='wardogs' order by name;
--   -- expect: 30 rows with fire_rate set (the 29 here + BMR-308), the 3 launchers (MAAWS/MGL-40/RPG-7) NULL.
