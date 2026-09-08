-- 2026-09-08-wardogs-caliber-backfill.sql
-- Wardogs weapon caliber (ammo_type) backfill -- STRUCTURE only, honest-null discipline. THE
-- OPERATOR RUNS THIS in Supabase after review. Claude runs no DB writes.
--
-- WHAT THIS IS: caliber is observable STRUCTURE (a weapon's cartridge is a fact, not a modeled
-- stat). This backfills ammo_type on the existing 33 wardogs weapon_stats rows. It does NOT touch
-- any STAT column (damage / fire_rate / ttk / scores / price) -- those stay NULL and flip only from
-- the LIVE GAME post-launch, verified, never from competitor cards. It does NOT set verified=true.
--
-- SOURCING (Tier 2): these calibers are community-catalogued from the Beta 02 vendor cards -- NOT
-- Bulkhead-published, NOT verified in-game by us. Beta-observed, subject to launch confirmation. A
-- post-launch pass confirms calibers in-game and can promote them.
--
-- READ-CONFIRMED 2026-09-08: 33 rows, all ammo_type NULL, all verified=false; every name below
-- matches a DB row EXACTLY (no name mismatches in either direction).
--
-- MILD RECONCILIATION FLAGS (sourced beta-observed, NOT forced -- left as catalogued; verify at launch):
--   * Scout Rifle TD is classed Sniper Rifle but catalogued 5.56x45mm (light for a sniper; plausible
--     for a scout/DMR-style rifle).
--   * MK22 is catalogued .308 Win (the real MK22/MRAD is multi-caliber, often .300/.338; .308 is the
--     lighter end). Both are beta-card values, included as observed.
--   * Compound Bow ammo_type = "Standard Arrows" (a projectile type, not a cartridge -- correct for a bow).
--
-- IDEMPOTENT: re-running sets the same values; safe to run more than once.
--
-- Run the whole file at once.

-- ---------------------------------------------------------------------------
-- (1) Backfill ammo_type by exact name (game_slug='wardogs'). CASE ... ELSE ammo_type END preserves
-- any wardogs row not listed here (none today), so only the 33 named rows change; no other column
-- is touched.
-- ---------------------------------------------------------------------------
update weapon_stats set ammo_type = case name
  -- Assault Rifles
  when 'A-91'            then '5.56x45mm'
  when 'Bushmaster M17S' then '5.56x45mm'
  when 'KH-2002'         then '5.56x45mm'
  when 'T-21'            then '5.56x45mm'
  when 'AK74'            then '5.45x39mm'
  when 'Galil'           then '5.56x45mm'
  when 'M4'              then '5.56x45mm'
  when 'FAL'             then '.308 Win'
  -- Submachine Guns
  when 'AMP-9'           then '9x19mm'
  when 'PP-19 Vityaz'    then '9x19mm'
  when 'MP5'             then '9x19mm'
  when 'Super-45'        then '.45 ACP'
  -- Shotguns
  when 'MP43'            then '12 Gauge'
  when 'M500'            then '12 Gauge'
  -- Light Machine Guns
  when 'M249 SAW'        then '5.56x45mm'
  when 'PKM'             then '7.62x54mm'
  -- Marksman Rifles
  when 'SKS'             then '7.62x39mm'
  when 'SVD'             then '7.62x54mm'
  when 'BMR-308'         then '.308 Win'
  -- Sniper Rifles
  when 'Scout Rifle TD'  then '5.56x45mm'
  when 'Mosin Nagant'    then '7.62x54mm'
  when 'SV98'            then '7.62x54mm'
  when 'MK22'            then '.308 Win'
  when 'AMR 50'          then '.50 Cal'
  -- Sidearms
  when 'GGX 17'          then '9x19mm'
  when 'GGX 18'          then '9x19mm'
  when 'Judge'           then '.45 Colt'
  when 'M1911'           then '.45 ACP'
  when 'Deagle'          then '.50 AE'
  -- Launchers
  when 'RPG-7'           then '93mm rocket'
  when 'MAAWS'           then '84mm anti-tank'
  when 'MGL-40'          then '40mm grenade'
  -- Bow
  when 'Compound Bow'    then 'Standard Arrows'
  else ammo_type
end
where game_slug = 'wardogs';

-- ---------------------------------------------------------------------------
-- (2) OPTIONAL -- provenance precision for the 3 OFFICIAL starters (RECOMMENDED). Their
-- verified_source is "Official Bulkhead reveal ..." -- which is true for the NAME/existence, but the
-- CALIBER is community-catalogued (Beta 02), NOT Bulkhead-published. Appending the caliber source
-- keeps that honest (otherwise the row implies Bulkhead confirmed the caliber). The other 30 rows'
-- verified_source ("Closed Alpha/Beta playtest capture ...") ALREADY covers beta-observed structure
-- including caliber, so they are intentionally NOT touched.
-- Run this block only if you want the precise provenance (operator's call). It does NOT set verified=true.
-- ---------------------------------------------------------------------------
update weapon_stats
set verified_source = verified_source || '; caliber community-catalogued Beta 02, subject to launch confirmation'
where game_slug = 'wardogs'
  and name in ('A-91', 'Bushmaster M17S', 'KH-2002')
  and verified_source not like '%caliber community-catalogued%';  -- idempotent guard: do not double-append

-- ---------------------------------------------------------------------------
-- VERIFY after running:
-- ---------------------------------------------------------------------------
--   select name, category, ammo_type, verified, verified_source
--     from weapon_stats where game_slug = 'wardogs' order by category, name;
--   -- expect: all 33 ammo_type populated; verified still false everywhere; stat columns untouched
--   -- (still NULL). If block (2) was run, the 3 starters' verified_source carries the appended
--   -- caliber note.
