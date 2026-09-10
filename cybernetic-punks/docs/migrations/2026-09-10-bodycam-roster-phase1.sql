-- 2026-09-10-bodycam-roster-phase1.sql
-- Bodycam roster reconciliation PHASE 1 -- NAMES + CALIBERS + REAL-WORLD BASIS ONLY. THE OPERATOR
-- RUNS THIS. Executor runs no DB writes.
--
-- SCOPE (operator-locked): Phase 1 is names/calibers/basis. STATS ARE DEFERRED -- the community-tested
-- stat values go in a LATER pass as ATTRIBUTED (community-tested, verified=false); NONE are added
-- here. Every row stays verified=false with all stat columns NULL. Only name / ammo_type / notes /
-- verified_source (+ neutral identity defaults on new rows) change.
--
-- SOURCE: an in-game roster video (YouTube zdJ7A-n6MG8), owner-observed 2026-09-10 -- in-game name =
-- real-world gun. Caliber is per the REAL-WORLD BASIS (the real gun's caliber is a fact; whether
-- Bodycam chambers it exactly is inferred from the model, NOT game-stat-confirmed) -- said in each note.
--
-- NO DDL: caliber -> ammo_type (was NULL); real-world basis + provenance -> notes (APPENDED, existing
-- notes preserved via ||).
--
-- NOT-NULL PROBE (2026-09-10): weapon_type / rarity / ranked_viable / shield_compatible have ZERO
-- NULLs across all weapon_stats -> treated as possibly NOT NULL, so new-row INSERTs supply neutral
-- defaults matching every existing bodycam row: weapon_type = category, rarity 'Standard',
-- ranked_viable true, shield_compatible false. (If they are in fact nullable, these defaults are
-- still correct/consistent with the seed.)
--
-- RESOLUTIONS this pass (from the stat screenshots):
--   * Rivington 700 + TAC Rivington are TWO separate weapons. So the existing "Rivington" row ->
--     RENAME to "Rivington 700" + enrich (Rem 700, 7.62x51mm) [1A]; TAC Rivington stays a NEW add
--     [1C]. The prior UNVERIFIED flag on Rivington is RESOLVED.
--   * M16 in-game name is "M16-1A" (screenshot), not "M16-A1" -- new row uses "M16-1A".
--   * UZ-1 is confirmed the in-game name for "Mini Uzi", but that rename is PHASE 2 (not done here).
--
-- STILL UNRESOLVED:
--   * R-12: the roster video maps R-12 -> Benelli M4 Super 90, but BK-101's note claims "R-12" as an
--     alias (historically Remington 870). NOT added as a new row (duplicate risk) and NOT assumed to
--     be BK-101. Flagged on BK-101's note (1B) as pending confirmation. Resolve in-game before adding.
--
-- COLLISIONS: checked 2026-09-10 -- "Rivington 700" and "M16-1A" and all new names are absent; no
-- rename target collides.
--
-- IDEMPOTENCY: run ONCE. The UPDATEs append to notes (re-running double-appends); the INSERTs
-- duplicate (no upsert).

-- =====================================================================================
-- 1A -- RENAME (real-world / generic name -> confirmed in-game name) + ENRICH (caliber + basis)
-- =====================================================================================
update weapon_stats set name='SKR-H', ammo_type='7.62x51mm',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: FN SCAR-H. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' else notes || ' | Basis: FN SCAR-H. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' end
  where game_slug='bodycam' and name='SCAR';

update weapon_stats set name='LAR', ammo_type='7.62x51mm',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: FN FAL. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' else notes || ' | Basis: FN FAL. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' end
  where game_slug='bodycam' and name='FN FAL';

update weapon_stats set name='VSD', ammo_type='7.62x54mmR',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: SVD (Dragunov). Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' else notes || ' | Basis: SVD (Dragunov). Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' end
  where game_slug='bodycam' and name='Dragunov';

update weapon_stats set name='Deagle', ammo_type='.50 AE',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: Desert Eagle Mark XIX. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' else notes || ' | Basis: Desert Eagle Mark XIX. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' end
  where game_slug='bodycam' and name='Desert Eagle';

update weapon_stats set name='M1914', ammo_type='.45 ACP',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: M1911A1 (in-game name M1914 per the roster video). Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' else notes || ' | Basis: M1911A1 (in-game name M1914 per the roster video). Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' end
  where game_slug='bodycam' and name='M1911';

-- RESOLVED: existing "Rivington" -> "Rivington 700" (two Rivingtons confirmed distinct in the stat
-- screenshots). Its note already said "Remington 700", so this just makes it explicit.
update weapon_stats set name='Rivington 700', ammo_type='7.62x51mm',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: Remington 700. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' else notes || ' | Basis: Remington 700. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' end
  where game_slug='bodycam' and name='Rivington';

-- =====================================================================================
-- 1B -- ENRICH IN PLACE (in-game name already correct; add caliber + basis)
-- =====================================================================================
update weapon_stats set ammo_type='7.62x39mm',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: Draco AK Pistol. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' else notes || ' | Basis: Draco AK Pistol. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' end
  where game_slug='bodycam' and name='Draco';

update weapon_stats set ammo_type='.45 ACP',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: KRISS Vector. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' else notes || ' | Basis: KRISS Vector. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' end
  where game_slug='bodycam' and name='Veaper';

update weapon_stats set ammo_type='9x19mm',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: B&T TP9-US. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' else notes || ' | Basis: B&T TP9-US. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' end
  where game_slug='bodycam' and name='SG9-X';

-- BK-101 enrich + ALIAS FLAG for the unresolved R-12 (its note claims "R12" as an alias).
update weapon_stats set ammo_type='12 gauge',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: Remington 870 Express Tactical. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed. | ALIAS FLAG (2026-09-10): this row''s prior note claimed "R12" as an alias (historically Rem 870); the roster video maps R-12 -> Benelli M4 Super 90. R-12 is NOT added pending confirmation it is a distinct weapon vs a BK-101 alias -- UNVERIFIED.' else notes || ' | Basis: Remington 870 Express Tactical. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed. | ALIAS FLAG (2026-09-10): this row''s prior note claimed "R12" as an alias (historically Rem 870); the roster video maps R-12 -> Benelli M4 Super 90. R-12 is NOT added pending confirmation it is a distinct weapon vs a BK-101 alias -- UNVERIFIED.' end
  where game_slug='bodycam' and name='BK-101';

update weapon_stats set ammo_type='9x19mm',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: CZ P-07. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' else notes || ' | Basis: CZ P-07. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.' end
  where game_slug='bodycam' and name='CR-75';

-- M4A1 -- ENRICH IN PLACE but DO NOT RENAME (video parse "M4A1-AR" ambiguous; name pending Phase 2).
update weapon_stats set ammo_type='5.56x45mm',
  verified_source='in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10',
  notes = case when notes is null or notes='' then 'Basis: M4/M4A1. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed. | PENDING (2026-09-10): exact in-game name unresolved (video parse "M4A1-AR" ambiguous) - name confirmation deferred to Phase 2.' else notes || ' | Basis: M4/M4A1. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed. | PENDING (2026-09-10): exact in-game name unresolved (video parse "M4A1-AR" ambiguous) - name confirmation deferred to Phase 2.' end
  where game_slug='bodycam' and name='M4A1';

-- =====================================================================================
-- 1C -- ADD NEW (in the video, not in the DB, no overlap with an ambiguous existing row). R-12 is
-- NOT here (held, unresolved -- see BK-101 alias flag). Neutral identity defaults per the NOT-NULL
-- probe; stats stay NULL (deferred).
-- Columns: game_slug, name, category, weapon_type, ammo_type, rarity, ranked_viable, shield_compatible, notes, verified, verified_source
-- =====================================================================================
insert into weapon_stats (game_slug, name, category, weapon_type, ammo_type, rarity, ranked_viable, shield_compatible, notes, verified, verified_source) values
  ('bodycam','KA-74M','Assault Rifle','Assault Rifle','5.45x39mm','Standard',true,false,'Basis: AK-74M. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.',false,'in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10'),
  ('bodycam','KA-US','Assault Rifle','Assault Rifle','5.45x39mm','Standard',true,false,'Basis: AKS-74U. Category per real-world type (compact AK), verify in-game. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.',false,'in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10'),
  ('bodycam','M16-1A','Assault Rifle','Assault Rifle','5.56x45mm','Standard',true,false,'Basis: M16A1 (in-game name M16-1A per the roster video). Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.',false,'in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10'),
  ('bodycam','Vaiga','Shotgun','Shotgun','12 gauge','Standard',true,false,'Basis: Origin 12. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.',false,'in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10'),
  ('bodycam','TAC Rivington','Sniper Rifle','Sniper Rifle','7.62x51mm','Standard',true,false,'Basis: Remington M24A2. Distinct from Rivington 700 (Rem 700) - both confirmed in the stat screenshots. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.',false,'in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10'),
  ('bodycam','Revolver','Pistol','Pistol','.357 Magnum','Standard',true,false,'Basis: S&W TRR8. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.',false,'in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10'),
  ('bodycam','FX-45','Pistol','Pistol','.45 ACP','Standard',true,false,'Basis: FNX-45 Tactical. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.',false,'in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10'),
  ('bodycam','Mlock19','Pistol','Pistol','9x19mm','Standard',true,false,'Basis: Glock 19 Gen5. Caliber per real-world basis (video-identified) - real gun caliber is fact, Bodycam chambering inferred from the model, NOT game-stat-confirmed.',false,'in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10'),
  ('bodycam','KARPM','Submachine Gun','Submachine Gun',null,'Standard',true,false,'Basis: Pistol Mitraliera (model unconfirmed - generic term; category per real-world type, verify in-game); caliber PENDING (honest-null until the model is pinned). In-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10.',false,'in-game roster confirmed via roster video (zdJ7A-n6MG8), owner-observed 2026-09-10');

-- DELIBERATELY NOT ADDED (overlap ambiguities -- may BE an existing row; resolved in Phase 2):
--   KA-74 (may = DB "AK-47") ; SG5-K / SG5-KF (may = DB "MP5" / "SG5-X") ; BK-102s (may = DB
--   "Remington 870") ; R-12 (alias conflict w/ BK-101 -- see BK-101 note; held UNVERIFIED).

-- =====================================================================================
-- 1D -- MARK UNVERIFIED (ambiguous / not-in-video existing rows -- notes flag ONLY; no rename, no
-- delete, no ammo_type change; verified stays false). Rivington REMOVED (resolved to Rivington 700).
-- =====================================================================================
update weapon_stats set notes = case when notes is null or notes='' then 'UNVERIFIED pending (2026-09-10): not observed in the roster video (video has KA-74/KA-74M/KA-US); confirm exact in-game name or removal.' else notes || ' | UNVERIFIED pending (2026-09-10): not observed in the roster video (video has KA-74/KA-74M/KA-US); confirm exact in-game name or removal.' end
  where game_slug='bodycam' and name='AK-47';

update weapon_stats set notes = case when notes is null or notes='' then 'UNVERIFIED pending (2026-09-10): video shows "Mlock19" (Glock 19); confirm if this Glock 17 row is the same weapon (rename) or separate.' else notes || ' | UNVERIFIED pending (2026-09-10): video shows "Mlock19" (Glock 19); confirm if this Glock 17 row is the same weapon (rename) or separate.' end
  where game_slug='bodycam' and name='Glock 17';

update weapon_stats set notes = case when notes is null or notes='' then 'UNVERIFIED pending (2026-09-10): video shows SG5-K (MP5K) + SG5-KF (MP5SD); confirm which this row maps to.' else notes || ' | UNVERIFIED pending (2026-09-10): video shows SG5-K (MP5K) + SG5-KF (MP5SD); confirm which this row maps to.' end
  where game_slug='bodycam' and name='MP5';

update weapon_stats set notes = case when notes is null or notes='' then 'UNVERIFIED pending (2026-09-10): video shows SG5-K (MP5K) + SG5-KF (MP5SD); confirm which this row maps to.' else notes || ' | UNVERIFIED pending (2026-09-10): video shows SG5-K (MP5K) + SG5-KF (MP5SD); confirm which this row maps to.' end
  where game_slug='bodycam' and name='SG5-X';

update weapon_stats set notes = case when notes is null or notes='' then 'UNVERIFIED pending (2026-09-10): video shows BK-102s (Rem 870 TAC-14); confirm if this Remington 870 row is that weapon.' else notes || ' | UNVERIFIED pending (2026-09-10): video shows BK-102s (Rem 870 TAC-14); confirm if this Remington 870 row is that weapon.' end
  where game_slug='bodycam' and name='Remington 870';

update weapon_stats set notes = case when notes is null or notes='' then 'UNVERIFIED pending (2026-09-10): not in the roster video; confirm still in-game or removed.' else notes || ' | UNVERIFIED pending (2026-09-10): not in the roster video; confirm still in-game or removed.' end
  where game_slug='bodycam' and name='Kobra';

update weapon_stats set notes = case when notes is null or notes='' then 'UNVERIFIED pending (2026-09-10): not in the roster video (video has FX-45=FNX-45, a different gun); confirm still in-game or removed.' else notes || ' | UNVERIFIED pending (2026-09-10): not in the roster video (video has FX-45=FNX-45, a different gun); confirm still in-game or removed.' end
  where game_slug='bodycam' and name='UMP-45';

-- =====================================================================================
-- VERIFY after running:
-- =====================================================================================
--   select name, category, ammo_type, verified, notes from weapon_stats
--     where game_slug='bodycam' order by category, name;
--   -- expect: 20 existing (6 renamed/enriched incl. Rivington 700, 6 enriched in place, 7 flagged
--   -- UNVERIFIED, + Mini Uzi untouched) + 9 NEW = 29 rows. ammo_type populated on enriched + new
--   -- (KARPM null); verified=false everywhere; NO stat columns set (deferred to a later attributed pass).
