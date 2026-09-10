-- 2026-09-10-wardogs-firerate-swoleguy.sql
-- Wardogs FIRE-RATE flat extract from Swoleguy community ballistics testing. THE OPERATOR RUNS THIS.
-- Executor runs no DB writes.
--
-- SCOPE: ONLY fire_rate (RPM) for 30 weapons. The full ballistics matrix is reserved as Build Advisor
-- fuel (internal-data-store doctrine) and is NOT flattened here. verified STAYS false (attributed).
--
-- PROVENANCE (field-scoped -- IMPORTANT): every wardogs row ALREADY carries caliber/roster provenance in
-- verified_source (e.g. "Official Bulkhead reveal ... caliber community-catalogued Beta 02" / "Closed
-- Alpha/Beta playtest capture"). Overwriting would CLOBBER that and misattribute the caliber to Swoleguy.
-- So this APPENDS a field-scoped fire_rate provenance ( | fire_rate: <source>) instead -- same pattern as
-- Marathon field-scoped verified_source. (If you prefer a hard overwrite, say so and I will reissue.)
--
-- SPLIT FIRE-RATES: 3 weapons have semi/burst -- the BURST RPM is the headline fire_rate, the split is in
-- notes. BMR-308 is semi-only (468 semi), noted as such.
--
-- NAME MAPPINGS applied: Swoleguy BMR -> BMR-308 (468 semi), SV-98 -> SV98.
--
-- NOT TESTED (stay honest-null, expected -- launchers, no RPM): MAAWS, MGL-40, RPG-7.
-- COUNT: 33 roster = 30 with fire_rate + 3 launchers (null).
--
-- SEMICOLON-SAFE: no in-string semicolons in any literal (commas/dashes only) -- Supabase splitter lesson.
-- Each UPDATE scoped WHERE game_slug='wardogs' AND name='<roster name>' (per-weapon). Run once (notes append).

-- =====================================================================================
-- FIRE-RATE (RPM) -- 30 weapons, Swoleguy ballistics, attributed (verified stays false)
-- =====================================================================================
update weapon_stats set fire_rate=709,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed) -- 513 semi / 709 burst, burst RPM recorded.' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed) -- 513 semi / 709 burst, burst RPM recorded.' end
  where game_slug='wardogs' and name='Bushmaster M17S';

update weapon_stats set fire_rate=721,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed) -- 512 semi / 721 burst, burst RPM recorded.' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed) -- 512 semi / 721 burst, burst RPM recorded.' end
  where game_slug='wardogs' and name='A-91';

update weapon_stats set fire_rate=711,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed) -- 518 semi / 711 burst, burst RPM recorded.' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed) -- 518 semi / 711 burst, burst RPM recorded.' end
  where game_slug='wardogs' and name='KH-2002';

update weapon_stats set fire_rate=780,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='T-21';

update weapon_stats set fire_rate=664,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Galil';

update weapon_stats set fire_rate=827,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='M4';

update weapon_stats set fire_rate=665,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='AK74';

update weapon_stats set fire_rate=706,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='FAL';

update weapon_stats set fire_rate=945,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='AMP-9';

update weapon_stats set fire_rate=875,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='PP-19 Vityaz';

update weapon_stats set fire_rate=836,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='MP5';

update weapon_stats set fire_rate=524,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='GGX 17';

update weapon_stats set fire_rate=1253,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='GGX 18';

update weapon_stats set fire_rate=1255,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Super-45';

update weapon_stats set fire_rate=670,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='MP43';

update weapon_stats set fire_rate=95,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='M500';

update weapon_stats set fire_rate=884,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='M249 SAW';

update weapon_stats set fire_rate=605,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='PKM';

update weapon_stats set fire_rate=416,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='SKS';

update weapon_stats set fire_rate=512,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='SVD';

update weapon_stats set fire_rate=468,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed) -- 468 semi.' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed) -- 468 semi.' end
  where game_slug='wardogs' and name='BMR-308';

update weapon_stats set fire_rate=16,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Scout Rifle TD';

update weapon_stats set fire_rate=48,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Mosin Nagant';

update weapon_stats set fire_rate=52,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='SV98';

update weapon_stats set fire_rate=45,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='MK22';

update weapon_stats set fire_rate=55,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='AMR 50';

update weapon_stats set fire_rate=41,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Compound Bow';

update weapon_stats set fire_rate=212,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Judge';

update weapon_stats set fire_rate=470,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='M1911';

update weapon_stats set fire_rate=277,
  verified_source = case when verified_source is null or verified_source='' then 'fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' else verified_source || ' | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified' end,
  notes = case when notes is null or notes='' then 'Fire rate per Swoleguy ballistics testing (attributed).' else notes || ' | Fire rate per Swoleguy ballistics testing (attributed).' end
  where game_slug='wardogs' and name='Deagle';

-- =====================================================================================
-- VERIFY after running:
-- =====================================================================================
--   select name, fire_rate, verified, verified_source from weapon_stats
--     where game_slug='wardogs' order by name;
--   -- expect: 30 rows with fire_rate set (verified still false), the 3 launchers (MAAWS/MGL-40/RPG-7) still null.
