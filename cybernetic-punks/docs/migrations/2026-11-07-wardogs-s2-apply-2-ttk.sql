-- ============================================================================
-- WARDOGS SEASON 2 COMBAT APPLY 2: wardogs_ttk (recomputed rows + new weapons)
-- STAGED, NOT RUN. Brief 318. Justin runs this in the Supabase SQL editor after review.
-- ============================================================================
-- Updates the 221 TTK rows the Brief 315 preview marks "recomputed" (CHEST shots-to-kill changed, ttk_ms =
-- (chest STK - 1) x 60000 / rpm with the stored weapon_stats.fire_rate) and inserts the 60 rows of the four new
-- weapons (rpm from the workbook Weapon Base Stats tab, see apply-3). ttk_ms changes value on 206 of the 221
-- updated rows, the other 15 recompute to the same number and change only their attribution (verified_source).
-- Run AFTER apply-1. Not touched: the 229 "kept baseline" rows (incl. every AMR 50, MP43, M500 and Compound Bow row).
--
-- EXPECTED COUNTS (each statement asserts its count and RAISES EXCEPTION on any mismatch, which aborts
-- the whole transaction, so nothing is half-applied):
--   statement 1 UPDATE wardogs_ttk: 221 rows
--   statement 2 INSERT wardogs_ttk: 60 rows
--   after: 510 wardogs rows (450 + 60), 281 with the Evo4Fun TTK attribution (221 + 60)
--
-- ATTRIBUTION written by the apply files (source_kind creator, confidence_tier attributed, verified false):
--   wardogs_ballistics verified_source:
--     Evo4Fun in-game testing workbook (EVA WARDOGS), sheet dated 30/10/2026, used with the author's permission (reported by operator), Season 2 per operator, attributed, not owner-verified
--   wardogs_ttk verified_source (updated rows), the new-weapon rows append the fire-rate clause:
--     Evo4Fun workbook shots-to-kill (sheet dated 30/10/2026, Season 2 per operator) [semicolon]  ttk_ms computed by Cybernetic Punks as (chest shots to kill - 1) x 60000 / fire rate, attributed, not owner-verified
--     ... + ", fire rate from the workbook Weapon Base Stats tab (nominal)"
--   weapon_stats verified_source: not changed (it holds the price provenance).
--   game_data_changes.note on every history row: Evo4Fun workbook, sheet dated 30/10/2026, Season 2 per operator, not matched to a patch by the sheet itself
--
-- INPUTS (sha256, all verified against their manifests before generation):
--   d7bff28b32d541ba113cf286dc97c54dcf45f30d1290017750861df1c1235957  proposals/2026-11-07-evo4fun-main-tabs/MANIFEST.txt
--   316be04993a1af1381a255f84e54c257f0e9c3dd11e9effdb5b36a47ea5060c9  proposals/2026-11-07-ttk-preview/MANIFEST.txt
--   b04d2761cfa0d797f7c1e6576bd5de3d391fabb0b0509b391ac2be37b259871d  2026-11-07-wardogs-baseline/MANIFEST.json
--   8e9d0314b981bebbea2695b2f710e96638d61822f80bc45014b06dfe2bdbf871  sources/swoleguy-2026-10-30/MANIFEST.txt
--   e2b319d63f8b3aab639eb5fde1a7c4ed4bc4ecf20436c7b2de76813ccecfc631  proposed_ballistics.csv
--   81a29dd330789ae1acd095d27e447678c49e354c9848345bd5815a0147c11081  classification.csv
--   3acdaccf83d16a6e769e0b760365861bba94ad192f6e5fa9076f9b5467fdaa93  proposed_ttk.csv
--
-- RUN ORDER (apply): apply-1-ballistics.sql, apply-2-ttk.sql, apply-3-fire-rate.sql, apply-4a-ledger-ballistics.sql, apply-4b-ledger-ballistics.sql, apply-4c-ledger-ballistics.sql, apply-4d-ledger-ttk-fire-rate.sql
-- RUN ORDER (full rollback): rollback-4d-ledger-ttk-fire-rate.sql, rollback-4c-ledger-ballistics.sql, rollback-4b-ledger-ballistics.sql, rollback-4a-ledger-ballistics.sql, rollback-3-fire-rate.sql, rollback-2-ttk.sql, rollback-1-ballistics.sql
-- RE-RUN: every UPDATE matches on the OLD (baseline 2026-11-07) values and every INSERT is pre-checked, so a
-- second run matches nothing and aborts on its count assertion or precheck. Nothing is applied twice.
-- ROLLBACK FILE: 2026-11-07-wardogs-s2-rollback-2-ttk.sql
-- ============================================================================
BEGIN;

DO $$
DECLARE n integer;
BEGIN
  UPDATE wardogs_ttk t SET
    ttk_ms = v.new_ttk, source_kind = 'creator', confidence_tier = 'attributed', verified = false,
    verified_source = 'Evo4Fun workbook shots-to-kill (sheet dated 30/10/2026, Season 2 per operator); ttk_ms computed by Cybernetic Punks as (chest shots to kill - 1) x 60000 / fire rate, attributed, not owner-verified',
    updated_at = now()
  FROM (VALUES
    ('A-91'::text, 'AP'::text, 1::smallint, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 416::numeric),
    ('A-91'::text, 'AP'::text, 2::smallint, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 499::numeric),
    ('A-91'::text, 'AP'::text, 4::smallint, 508::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 583::numeric),
    ('A-91'::text, 'FMJ'::text, 1::smallint, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 416::numeric),
    ('A-91'::text, 'FMJ'::text, 2::smallint, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 499::numeric),
    ('A-91'::text, 'HP'::text, 1::smallint, 846::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 999::numeric),
    ('A-91'::text, 'HP'::text, 2::smallint, 1185::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1331::numeric),
    ('A-91'::text, 'HP'::text, 3::smallint, 2708::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2247::numeric),
    ('A-91'::text, 'HP'::text, 4::smallint, 3385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 5576::numeric),
    ('AK74'::text, 'AP'::text, 1::smallint, 451::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 541::numeric),
    ('AK74'::text, 'AP'::text, 2::smallint, 451::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 541::numeric),
    ('AK74'::text, 'AP'::text, 3::smallint, 541::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 632::numeric),
    ('AK74'::text, 'FMJ'::text, 1::smallint, 361::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 451::numeric),
    ('AK74'::text, 'FMJ'::text, 2::smallint, 451::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 541::numeric),
    ('AK74'::text, 'FMJ'::text, 4::smallint, 812::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 812::numeric),
    ('AK74'::text, 'HP'::text, 1::smallint, 992::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1173::numeric),
    ('AK74'::text, 'HP'::text, 2::smallint, 1444::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1624::numeric),
    ('AK74'::text, 'HP'::text, 3::smallint, 3159::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2617::numeric),
    ('AK74'::text, 'HP'::text, 4::smallint, 3890::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 6406::numeric),
    ('AMP-9'::text, 'AP'::text, 3::smallint, 444::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 444::numeric),
    ('AMP-9'::text, 'AP'::text, 4::smallint, 508::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 508::numeric),
    ('AMP-9'::text, 'FMJ'::text, 3::smallint, 508::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 444::numeric),
    ('AMP-9'::text, 'FMJ'::text, 4::smallint, 698::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 571::numeric),
    ('AMP-9'::text, 'HP'::text, 3::smallint, 2603::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1778::numeric),
    ('AMP-9'::text, 'HP'::text, 4::smallint, 3175::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 4508::numeric),
    ('BMR-308'::text, 'AP'::text, 0::smallint, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 256::numeric),
    ('BMR-308'::text, 'AP'::text, 1::smallint, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 385::numeric),
    ('BMR-308'::text, 'AP'::text, 2::smallint, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 385::numeric),
    ('BMR-308'::text, 'AP'::text, 3::smallint, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 385::numeric),
    ('BMR-308'::text, 'AP'::text, 4::smallint, 256::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 385::numeric),
    ('BMR-308'::text, 'FMJ'::text, 0::smallint, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 256::numeric),
    ('BMR-308'::text, 'FMJ'::text, 1::smallint, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 385::numeric),
    ('BMR-308'::text, 'FMJ'::text, 2::smallint, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 385::numeric),
    ('BMR-308'::text, 'FMJ'::text, 3::smallint, 256::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 513::numeric),
    ('BMR-308'::text, 'FMJ'::text, 4::smallint, 385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 641::numeric),
    ('BMR-308'::text, 'HP'::text, 0::smallint, 0::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 128::numeric),
    ('BMR-308'::text, 'HP'::text, 1::smallint, 385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 897::numeric),
    ('BMR-308'::text, 'HP'::text, 2::smallint, 641::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1282::numeric),
    ('BMR-308'::text, 'HP'::text, 3::smallint, 1538::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2051::numeric),
    ('BMR-308'::text, 'HP'::text, 4::smallint, 2308::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 5128::numeric),
    ('Bushmaster M17S'::text, 'AP'::text, 1::smallint, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 423::numeric),
    ('Bushmaster M17S'::text, 'AP'::text, 2::smallint, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 508::numeric),
    ('Bushmaster M17S'::text, 'AP'::text, 4::smallint, 508::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 592::numeric),
    ('Bushmaster M17S'::text, 'FMJ'::text, 1::smallint, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 423::numeric),
    ('Bushmaster M17S'::text, 'FMJ'::text, 2::smallint, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 508::numeric),
    ('Bushmaster M17S'::text, 'HP'::text, 1::smallint, 846::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1016::numeric),
    ('Bushmaster M17S'::text, 'HP'::text, 2::smallint, 1185::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1354::numeric),
    ('Bushmaster M17S'::text, 'HP'::text, 3::smallint, 2708::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2285::numeric),
    ('Bushmaster M17S'::text, 'HP'::text, 4::smallint, 3385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 5670::numeric),
    ('Deagle'::text, 'FMJ'::text, 3::smallint, 650::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 433::numeric),
    ('Deagle'::text, 'HP'::text, 3::smallint, 3032::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2166::numeric),
    ('Deagle'::text, 'HP'::text, 4::smallint, 3899::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 5415::numeric),
    ('FAL'::text, 'AP'::text, 0::smallint, 85::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 255::numeric),
    ('FAL'::text, 'AP'::text, 1::smallint, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 340::numeric),
    ('FAL'::text, 'AP'::text, 2::smallint, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 340::numeric),
    ('FAL'::text, 'AP'::text, 3::smallint, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 425::numeric),
    ('FAL'::text, 'AP'::text, 4::smallint, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 425::numeric),
    ('FAL'::text, 'FMJ'::text, 0::smallint, 85::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 255::numeric),
    ('FAL'::text, 'FMJ'::text, 1::smallint, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 340::numeric),
    ('FAL'::text, 'FMJ'::text, 2::smallint, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 425::numeric),
    ('FAL'::text, 'FMJ'::text, 3::smallint, 255::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 510::numeric),
    ('FAL'::text, 'FMJ'::text, 4::smallint, 340::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 595::numeric),
    ('FAL'::text, 'HP'::text, 0::smallint, 0::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 85::numeric),
    ('FAL'::text, 'HP'::text, 1::smallint, 425::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 850::numeric),
    ('FAL'::text, 'HP'::text, 2::smallint, 510::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1190::numeric),
    ('FAL'::text, 'HP'::text, 3::smallint, 1275::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1870::numeric),
    ('FAL'::text, 'HP'::text, 4::smallint, 1530::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 4674::numeric),
    ('Galil'::text, 'AP'::text, 1::smallint, 361::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 452::numeric),
    ('Galil'::text, 'AP'::text, 2::smallint, 451::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 542::numeric),
    ('Galil'::text, 'AP'::text, 4::smallint, 541::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 633::numeric),
    ('Galil'::text, 'FMJ'::text, 1::smallint, 361::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 452::numeric),
    ('Galil'::text, 'FMJ'::text, 2::smallint, 451::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 542::numeric),
    ('Galil'::text, 'HP'::text, 1::smallint, 902::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1084::numeric),
    ('Galil'::text, 'HP'::text, 2::smallint, 1263::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1446::numeric),
    ('Galil'::text, 'HP'::text, 3::smallint, 2887::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2440::numeric),
    ('Galil'::text, 'HP'::text, 4::smallint, 3609::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 6054::numeric),
    ('GGX 17'::text, 'AP'::text, 3::smallint, 802::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 802::numeric),
    ('GGX 17'::text, 'AP'::text, 4::smallint, 916::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 916::numeric),
    ('GGX 17'::text, 'FMJ'::text, 3::smallint, 916::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 802::numeric),
    ('GGX 17'::text, 'FMJ'::text, 4::smallint, 1260::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1031::numeric),
    ('GGX 17'::text, 'HP'::text, 3::smallint, 4695::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 3206::numeric),
    ('GGX 17'::text, 'HP'::text, 4::smallint, 5725::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 8130::numeric),
    ('GGX 18'::text, 'AP'::text, 3::smallint, 335::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 335::numeric),
    ('GGX 18'::text, 'AP'::text, 4::smallint, 383::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 383::numeric),
    ('GGX 18'::text, 'FMJ'::text, 3::smallint, 383::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 335::numeric),
    ('GGX 18'::text, 'FMJ'::text, 4::smallint, 527::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 431::numeric),
    ('GGX 18'::text, 'HP'::text, 3::smallint, 1963::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1341::numeric),
    ('GGX 18'::text, 'HP'::text, 4::smallint, 2394::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 3400::numeric),
    ('Judge'::text, 'FMJ'::text, 3::smallint, 1132::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 849::numeric),
    ('Judge'::text, 'FMJ'::text, 4::smallint, 1415::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1132::numeric),
    ('Judge'::text, 'HP'::text, 3::smallint, 5660::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 3962::numeric),
    ('Judge'::text, 'HP'::text, 4::smallint, 6792::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 9906::numeric),
    ('KH-2002'::text, 'AP'::text, 1::smallint, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 422::numeric),
    ('KH-2002'::text, 'AP'::text, 2::smallint, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 506::numeric),
    ('KH-2002'::text, 'AP'::text, 4::smallint, 508::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 591::numeric),
    ('KH-2002'::text, 'FMJ'::text, 1::smallint, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 422::numeric),
    ('KH-2002'::text, 'FMJ'::text, 2::smallint, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 506::numeric),
    ('KH-2002'::text, 'HP'::text, 1::smallint, 846::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1013::numeric),
    ('KH-2002'::text, 'HP'::text, 2::smallint, 1185::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1350::numeric),
    ('KH-2002'::text, 'HP'::text, 3::smallint, 2708::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2278::numeric),
    ('KH-2002'::text, 'HP'::text, 4::smallint, 3385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 5654::numeric),
    ('M1911'::text, 'AP'::text, 4::smallint, 638::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 511::numeric),
    ('M1911'::text, 'FMJ'::text, 4::smallint, 766::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 638::numeric),
    ('M1911'::text, 'HP'::text, 3::smallint, 2936::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2043::numeric),
    ('M1911'::text, 'HP'::text, 4::smallint, 4596::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 5106::numeric),
    ('M249 SAW'::text, 'AP'::text, 0::smallint, 204::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 271::numeric),
    ('M249 SAW'::text, 'AP'::text, 1::smallint, 271::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 339::numeric),
    ('M249 SAW'::text, 'AP'::text, 2::smallint, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 407::numeric),
    ('M249 SAW'::text, 'AP'::text, 3::smallint, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 407::numeric),
    ('M249 SAW'::text, 'AP'::text, 4::smallint, 407::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 475::numeric),
    ('M249 SAW'::text, 'FMJ'::text, 1::smallint, 271::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 339::numeric),
    ('M249 SAW'::text, 'FMJ'::text, 2::smallint, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 407::numeric),
    ('M249 SAW'::text, 'FMJ'::text, 3::smallint, 407::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 475::numeric),
    ('M249 SAW'::text, 'FMJ'::text, 4::smallint, 543::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 611::numeric),
    ('M249 SAW'::text, 'HP'::text, 1::smallint, 679::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 814::numeric),
    ('M249 SAW'::text, 'HP'::text, 2::smallint, 950::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1086::numeric),
    ('M249 SAW'::text, 'HP'::text, 3::smallint, 2172::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1833::numeric),
    ('M249 SAW'::text, 'HP'::text, 4::smallint, 2715::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 4548::numeric),
    ('M4'::text, 'AP'::text, 1::smallint, 290::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 363::numeric),
    ('M4'::text, 'AP'::text, 2::smallint, 363::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 435::numeric),
    ('M4'::text, 'AP'::text, 4::smallint, 435::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 508::numeric),
    ('M4'::text, 'FMJ'::text, 1::smallint, 290::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 363::numeric),
    ('M4'::text, 'FMJ'::text, 2::smallint, 363::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 435::numeric),
    ('M4'::text, 'HP'::text, 1::smallint, 725::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 871::numeric),
    ('M4'::text, 'HP'::text, 2::smallint, 1016::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1161::numeric),
    ('M4'::text, 'HP'::text, 3::smallint, 2322::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1959::numeric),
    ('M4'::text, 'HP'::text, 4::smallint, 2902::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 4861::numeric),
    ('MK22'::text, 'HP'::text, 3::smallint, 10667::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 8000::numeric),
    ('MK22'::text, 'HP'::text, 4::smallint, 24000::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 20000::numeric),
    ('Mosin Nagant'::text, 'FMJ'::text, 3::smallint, 1250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1250::numeric),
    ('Mosin Nagant'::text, 'HP'::text, 1::smallint, 3750::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2500::numeric),
    ('Mosin Nagant'::text, 'HP'::text, 2::smallint, 5000::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 3750::numeric),
    ('Mosin Nagant'::text, 'HP'::text, 3::smallint, 11250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 7500::numeric),
    ('Mosin Nagant'::text, 'HP'::text, 4::smallint, 25000::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 18750::numeric),
    ('MP5'::text, 'AP'::text, 3::smallint, 502::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 502::numeric),
    ('MP5'::text, 'AP'::text, 4::smallint, 574::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 574::numeric),
    ('MP5'::text, 'FMJ'::text, 3::smallint, 574::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 502::numeric),
    ('MP5'::text, 'FMJ'::text, 4::smallint, 789::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 646::numeric),
    ('MP5'::text, 'HP'::text, 3::smallint, 2943::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2010::numeric),
    ('MP5'::text, 'HP'::text, 4::smallint, 3589::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 5096::numeric),
    ('PKM'::text, 'AP'::text, 0::smallint, 100::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 298::numeric),
    ('PKM'::text, 'AP'::text, 1::smallint, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 397::numeric),
    ('PKM'::text, 'AP'::text, 2::smallint, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 397::numeric),
    ('PKM'::text, 'AP'::text, 3::smallint, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 496::numeric),
    ('PKM'::text, 'AP'::text, 4::smallint, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 496::numeric),
    ('PKM'::text, 'FMJ'::text, 0::smallint, 100::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 298::numeric),
    ('PKM'::text, 'FMJ'::text, 1::smallint, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 397::numeric),
    ('PKM'::text, 'FMJ'::text, 2::smallint, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 496::numeric),
    ('PKM'::text, 'FMJ'::text, 3::smallint, 300::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 595::numeric),
    ('PKM'::text, 'FMJ'::text, 4::smallint, 400::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 694::numeric),
    ('PKM'::text, 'HP'::text, 0::smallint, 0::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 99::numeric),
    ('PKM'::text, 'HP'::text, 1::smallint, 500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 992::numeric),
    ('PKM'::text, 'HP'::text, 2::smallint, 700::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1388::numeric),
    ('PKM'::text, 'HP'::text, 3::smallint, 1600::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2182::numeric),
    ('PKM'::text, 'HP'::text, 4::smallint, 1983::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 5653::numeric),
    ('PP-19 Vityaz'::text, 'AP'::text, 3::smallint, 480::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 480::numeric),
    ('PP-19 Vityaz'::text, 'AP'::text, 4::smallint, 549::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 549::numeric),
    ('PP-19 Vityaz'::text, 'FMJ'::text, 3::smallint, 549::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 480::numeric),
    ('PP-19 Vityaz'::text, 'FMJ'::text, 4::smallint, 754::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 617::numeric),
    ('PP-19 Vityaz'::text, 'HP'::text, 3::smallint, 2811::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1920::numeric),
    ('PP-19 Vityaz'::text, 'HP'::text, 4::smallint, 3429::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 4869::numeric),
    ('Scout Rifle TD'::text, 'AP'::text, 0::smallint, 7500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 3750::numeric),
    ('Scout Rifle TD'::text, 'AP'::text, 2::smallint, 7500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 7500::numeric),
    ('Scout Rifle TD'::text, 'AP'::text, 3::smallint, 11250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 7500::numeric),
    ('Scout Rifle TD'::text, 'AP'::text, 4::smallint, 11250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 7500::numeric),
    ('Scout Rifle TD'::text, 'FMJ'::text, 1::smallint, 7500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 3750::numeric),
    ('Scout Rifle TD'::text, 'FMJ'::text, 2::smallint, 7500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 7500::numeric),
    ('Scout Rifle TD'::text, 'FMJ'::text, 3::smallint, 11250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 7500::numeric),
    ('Scout Rifle TD'::text, 'FMJ'::text, 4::smallint, 18750::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 11250::numeric),
    ('Scout Rifle TD'::text, 'HP'::text, 1::smallint, 22500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 15000::numeric),
    ('Scout Rifle TD'::text, 'HP'::text, 2::smallint, 30000::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 22500::numeric),
    ('Scout Rifle TD'::text, 'HP'::text, 3::smallint, 71250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 33750::numeric),
    ('Scout Rifle TD'::text, 'HP'::text, 4::smallint, 146250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 90000::numeric),
    ('SKS'::text, 'AP'::text, 0::smallint, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 433::numeric),
    ('SKS'::text, 'AP'::text, 1::smallint, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 433::numeric),
    ('SKS'::text, 'AP'::text, 2::smallint, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 433::numeric),
    ('SKS'::text, 'AP'::text, 3::smallint, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 577::numeric),
    ('SKS'::text, 'AP'::text, 4::smallint, 433::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 577::numeric),
    ('SKS'::text, 'FMJ'::text, 0::smallint, 144::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 288::numeric),
    ('SKS'::text, 'FMJ'::text, 1::smallint, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 433::numeric),
    ('SKS'::text, 'FMJ'::text, 2::smallint, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 577::numeric),
    ('SKS'::text, 'FMJ'::text, 3::smallint, 433::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 577::numeric),
    ('SKS'::text, 'FMJ'::text, 4::smallint, 577::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 865::numeric),
    ('SKS'::text, 'HP'::text, 0::smallint, 0::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 144::numeric),
    ('SKS'::text, 'HP'::text, 1::smallint, 721::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1154::numeric),
    ('SKS'::text, 'HP'::text, 2::smallint, 1010::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1587::numeric),
    ('SKS'::text, 'HP'::text, 3::smallint, 2452::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2596::numeric),
    ('SKS'::text, 'HP'::text, 4::smallint, 3750::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 6635::numeric),
    ('Super-45'::text, 'FMJ'::text, 3::smallint, 287::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 239::numeric),
    ('Super-45'::text, 'FMJ'::text, 4::smallint, 382::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 335::numeric),
    ('Super-45'::text, 'HP'::text, 3::smallint, 1434::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1004::numeric),
    ('Super-45'::text, 'HP'::text, 4::smallint, 1769::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2534::numeric),
    ('SV98'::text, 'FMJ'::text, 3::smallint, 1154::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1154::numeric),
    ('SV98'::text, 'HP'::text, 1::smallint, 3462::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2308::numeric),
    ('SV98'::text, 'HP'::text, 2::smallint, 4615::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 3462::numeric),
    ('SV98'::text, 'HP'::text, 3::smallint, 10385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 6923::numeric),
    ('SV98'::text, 'HP'::text, 4::smallint, 23076::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 17308::numeric),
    ('SVD'::text, 'AP'::text, 0::smallint, 117::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 352::numeric),
    ('SVD'::text, 'AP'::text, 1::smallint, 117::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 352::numeric),
    ('SVD'::text, 'AP'::text, 2::smallint, 117::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 352::numeric),
    ('SVD'::text, 'AP'::text, 3::smallint, 234::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 469::numeric),
    ('SVD'::text, 'AP'::text, 4::smallint, 234::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 469::numeric),
    ('SVD'::text, 'FMJ'::text, 0::smallint, 117::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 234::numeric),
    ('SVD'::text, 'FMJ'::text, 1::smallint, 117::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 352::numeric),
    ('SVD'::text, 'FMJ'::text, 2::smallint, 234::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 469::numeric),
    ('SVD'::text, 'FMJ'::text, 3::smallint, 234::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 469::numeric),
    ('SVD'::text, 'FMJ'::text, 4::smallint, 352::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 703::numeric),
    ('SVD'::text, 'HP'::text, 0::smallint, 0::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 117::numeric),
    ('SVD'::text, 'HP'::text, 1::smallint, 469::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 938::numeric),
    ('SVD'::text, 'HP'::text, 2::smallint, 586::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1289::numeric),
    ('SVD'::text, 'HP'::text, 3::smallint, 1523::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1992::numeric),
    ('SVD'::text, 'HP'::text, 4::smallint, 2344::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 5156::numeric),
    ('T-21'::text, 'AP'::text, 1::smallint, 308::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 385::numeric),
    ('T-21'::text, 'AP'::text, 2::smallint, 385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 462::numeric),
    ('T-21'::text, 'AP'::text, 4::smallint, 462::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 538::numeric),
    ('T-21'::text, 'FMJ'::text, 1::smallint, 308::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 385::numeric),
    ('T-21'::text, 'FMJ'::text, 2::smallint, 385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 462::numeric),
    ('T-21'::text, 'HP'::text, 1::smallint, 769::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 923::numeric),
    ('T-21'::text, 'HP'::text, 2::smallint, 1077::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 1231::numeric),
    ('T-21'::text, 'HP'::text, 3::smallint, 2462::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 2077::numeric),
    ('T-21'::text, 'HP'::text, 4::smallint, 3077::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, 5154::numeric)
  ) AS v(weapon_name, ammo_type, armor_tier, old_ttk, old_vs, new_ttk)
  WHERE t.game_slug = 'wardogs' AND t.weapon_name = v.weapon_name AND t.ammo_type = v.ammo_type AND t.armor_tier = v.armor_tier
    AND t.ttk_ms IS NOT DISTINCT FROM v.old_ttk AND t.verified_source IS NOT DISTINCT FROM v.old_vs
    AND t.source_kind = 'creator' AND t.confidence_tier = 'attributed' AND t.verified = false;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 221 THEN RAISE EXCEPTION 'wardogs_ttk update: expected 221 rows, got %', n; END IF;
  RAISE NOTICE 'wardogs_ttk update: % rows', n;
END $$;

DO $$
DECLARE n integer;
BEGIN
  IF EXISTS (SELECT 1 FROM wardogs_ttk WHERE game_slug = 'wardogs' AND weapon_name IN ('TCX-SPR', 'PP-19 Bizon', 'M14', 'Evo-3 Ultra')) THEN
    RAISE EXCEPTION 'wardogs_ttk: rows for the four new weapons already exist, nothing inserted';
  END IF;
  INSERT INTO wardogs_ttk (game_slug, weapon_name, ammo_type, armor_tier, ttk_ms, source_kind, confidence_tier, verified, verified_source)
  SELECT 'wardogs', v.weapon_name, v.ammo_type, v.armor_tier, v.ttk_ms, 'creator', 'attributed', false,
    'Evo4Fun workbook shots-to-kill (sheet dated 30/10/2026, Season 2 per operator); ttk_ms computed by Cybernetic Punks as (chest shots to kill - 1) x 60000 / fire rate, attributed, not owner-verified, fire rate from the workbook Weapon Base Stats tab (nominal)'
  FROM (VALUES
    ('Evo-3 Ultra'::text, 'AP'::text, 0::smallint, 257::numeric),
    ('Evo-3 Ultra'::text, 'AP'::text, 1::smallint, 343::numeric),
    ('Evo-3 Ultra'::text, 'AP'::text, 2::smallint, 343::numeric),
    ('Evo-3 Ultra'::text, 'AP'::text, 3::smallint, 429::numeric),
    ('Evo-3 Ultra'::text, 'AP'::text, 4::smallint, 429::numeric),
    ('Evo-3 Ultra'::text, 'FMJ'::text, 0::smallint, 257::numeric),
    ('Evo-3 Ultra'::text, 'FMJ'::text, 1::smallint, 343::numeric),
    ('Evo-3 Ultra'::text, 'FMJ'::text, 2::smallint, 429::numeric),
    ('Evo-3 Ultra'::text, 'FMJ'::text, 3::smallint, 514::numeric),
    ('Evo-3 Ultra'::text, 'FMJ'::text, 4::smallint, 600::numeric),
    ('Evo-3 Ultra'::text, 'HP'::text, 0::smallint, 86::numeric),
    ('Evo-3 Ultra'::text, 'HP'::text, 1::smallint, 857::numeric),
    ('Evo-3 Ultra'::text, 'HP'::text, 2::smallint, 1200::numeric),
    ('Evo-3 Ultra'::text, 'HP'::text, 3::smallint, 1886::numeric),
    ('Evo-3 Ultra'::text, 'HP'::text, 4::smallint, 4714::numeric),
    ('M14'::text, 'AP'::text, 0::smallint, 171::numeric),
    ('M14'::text, 'AP'::text, 1::smallint, 257::numeric),
    ('M14'::text, 'AP'::text, 2::smallint, 257::numeric),
    ('M14'::text, 'AP'::text, 3::smallint, 257::numeric),
    ('M14'::text, 'AP'::text, 4::smallint, 257::numeric),
    ('M14'::text, 'FMJ'::text, 0::smallint, 171::numeric),
    ('M14'::text, 'FMJ'::text, 1::smallint, 257::numeric),
    ('M14'::text, 'FMJ'::text, 2::smallint, 257::numeric),
    ('M14'::text, 'FMJ'::text, 3::smallint, 343::numeric),
    ('M14'::text, 'FMJ'::text, 4::smallint, 429::numeric),
    ('M14'::text, 'HP'::text, 0::smallint, 86::numeric),
    ('M14'::text, 'HP'::text, 1::smallint, 600::numeric),
    ('M14'::text, 'HP'::text, 2::smallint, 857::numeric),
    ('M14'::text, 'HP'::text, 3::smallint, 1371::numeric),
    ('M14'::text, 'HP'::text, 4::smallint, 3429::numeric),
    ('PP-19 Bizon'::text, 'AP'::text, 0::smallint, 343::numeric),
    ('PP-19 Bizon'::text, 'AP'::text, 1::smallint, 514::numeric),
    ('PP-19 Bizon'::text, 'AP'::text, 2::smallint, 514::numeric),
    ('PP-19 Bizon'::text, 'AP'::text, 3::smallint, 600::numeric),
    ('PP-19 Bizon'::text, 'AP'::text, 4::smallint, 686::numeric),
    ('PP-19 Bizon'::text, 'FMJ'::text, 0::smallint, 257::numeric),
    ('PP-19 Bizon'::text, 'FMJ'::text, 1::smallint, 429::numeric),
    ('PP-19 Bizon'::text, 'FMJ'::text, 2::smallint, 514::numeric),
    ('PP-19 Bizon'::text, 'FMJ'::text, 3::smallint, 600::numeric),
    ('PP-19 Bizon'::text, 'FMJ'::text, 4::smallint, 771::numeric),
    ('PP-19 Bizon'::text, 'HP'::text, 0::smallint, 86::numeric),
    ('PP-19 Bizon'::text, 'HP'::text, 1::smallint, 1114::numeric),
    ('PP-19 Bizon'::text, 'HP'::text, 2::smallint, 1543::numeric),
    ('PP-19 Bizon'::text, 'HP'::text, 3::smallint, 2400::numeric),
    ('PP-19 Bizon'::text, 'HP'::text, 4::smallint, 6086::numeric),
    ('TCX-SPR'::text, 'AP'::text, 0::smallint, 300::numeric),
    ('TCX-SPR'::text, 'AP'::text, 1::smallint, 375::numeric),
    ('TCX-SPR'::text, 'AP'::text, 2::smallint, 375::numeric),
    ('TCX-SPR'::text, 'AP'::text, 3::smallint, 375::numeric),
    ('TCX-SPR'::text, 'AP'::text, 4::smallint, 450::numeric),
    ('TCX-SPR'::text, 'FMJ'::text, 0::smallint, 225::numeric),
    ('TCX-SPR'::text, 'FMJ'::text, 1::smallint, 300::numeric),
    ('TCX-SPR'::text, 'FMJ'::text, 2::smallint, 375::numeric),
    ('TCX-SPR'::text, 'FMJ'::text, 3::smallint, 450::numeric),
    ('TCX-SPR'::text, 'FMJ'::text, 4::smallint, 600::numeric),
    ('TCX-SPR'::text, 'HP'::text, 0::smallint, 75::numeric),
    ('TCX-SPR'::text, 'HP'::text, 1::smallint, 825::numeric),
    ('TCX-SPR'::text, 'HP'::text, 2::smallint, 1125::numeric),
    ('TCX-SPR'::text, 'HP'::text, 3::smallint, 1875::numeric),
    ('TCX-SPR'::text, 'HP'::text, 4::smallint, 4650::numeric)
  ) AS v(weapon_name, ammo_type, armor_tier, ttk_ms);
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 60 THEN RAISE EXCEPTION 'wardogs_ttk insert: expected 60 rows, got %', n; END IF;
  RAISE NOTICE 'wardogs_ttk insert: % rows', n;
END $$;

COMMIT;

-- VERIFY (read-only): expect total 510, evo_rows 281, new_weapon_rows 60.
SELECT count(*) AS total,
  count(*) FILTER (WHERE verified_source LIKE 'Evo4Fun workbook shots-to-kill%') AS evo_rows,
  count(*) FILTER (WHERE weapon_name IN ('TCX-SPR', 'PP-19 Bizon', 'M14', 'Evo-3 Ultra')) AS new_weapon_rows
FROM wardogs_ttk WHERE game_slug = 'wardogs';
