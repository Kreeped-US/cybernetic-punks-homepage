-- ============================================================================
-- WARDOGS SEASON 2 COMBAT ROLLBACK 2: wardogs_ttk
-- STAGED, NOT RUN. Brief 318. Justin runs this in the Supabase SQL editor after review.
-- ============================================================================
-- Restores the 221 updated rows (ttk_ms, verified_source, updated_at) to the 2026-11-07 baseline and deletes the 60
-- inserted rows. Each statement matches only rows that still hold the applied values.
--
-- EXPECTED COUNTS (each statement asserts its count and RAISES EXCEPTION on any mismatch, which aborts
-- the whole transaction, so nothing is half-applied):
--   statement 1 UPDATE (restore): 221 rows
--   statement 2 DELETE (inserted rows): 60 rows
--   after: 450 wardogs rows, 0 with the Evo4Fun attribution
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
-- RE-RUN: every statement matches only rows that still hold the applied values, so a second run matches
-- nothing and aborts on its count assertion. Nothing is undone twice.
-- UNDOES: 2026-11-07-wardogs-s2-apply-2-ttk.sql
-- ============================================================================
BEGIN;

DO $$
DECLARE n integer;
BEGIN
  UPDATE wardogs_ttk t SET ttk_ms = v.old_ttk, verified_source = v.old_vs, updated_at = v.old_updated_at
  FROM (VALUES
    ('A-91'::text, 'AP'::text, 1::smallint, 416::numeric, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('A-91'::text, 'AP'::text, 2::smallint, 499::numeric, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('A-91'::text, 'AP'::text, 4::smallint, 583::numeric, 508::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('A-91'::text, 'FMJ'::text, 1::smallint, 416::numeric, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('A-91'::text, 'FMJ'::text, 2::smallint, 499::numeric, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('A-91'::text, 'HP'::text, 1::smallint, 999::numeric, 846::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('A-91'::text, 'HP'::text, 2::smallint, 1331::numeric, 1185::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('A-91'::text, 'HP'::text, 3::smallint, 2247::numeric, 2708::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('A-91'::text, 'HP'::text, 4::smallint, 5576::numeric, 3385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AK74'::text, 'AP'::text, 1::smallint, 541::numeric, 451::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AK74'::text, 'AP'::text, 2::smallint, 541::numeric, 451::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AK74'::text, 'AP'::text, 3::smallint, 632::numeric, 541::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AK74'::text, 'FMJ'::text, 1::smallint, 451::numeric, 361::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AK74'::text, 'FMJ'::text, 2::smallint, 541::numeric, 451::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AK74'::text, 'FMJ'::text, 4::smallint, 812::numeric, 812::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AK74'::text, 'HP'::text, 1::smallint, 1173::numeric, 992::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AK74'::text, 'HP'::text, 2::smallint, 1624::numeric, 1444::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AK74'::text, 'HP'::text, 3::smallint, 2617::numeric, 3159::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AK74'::text, 'HP'::text, 4::smallint, 6406::numeric, 3890::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AMP-9'::text, 'AP'::text, 3::smallint, 444::numeric, 444::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AMP-9'::text, 'AP'::text, 4::smallint, 508::numeric, 508::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AMP-9'::text, 'FMJ'::text, 3::smallint, 444::numeric, 508::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AMP-9'::text, 'FMJ'::text, 4::smallint, 571::numeric, 698::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AMP-9'::text, 'HP'::text, 3::smallint, 1778::numeric, 2603::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('AMP-9'::text, 'HP'::text, 4::smallint, 4508::numeric, 3175::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'AP'::text, 0::smallint, 256::numeric, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'AP'::text, 1::smallint, 385::numeric, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'AP'::text, 2::smallint, 385::numeric, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'AP'::text, 3::smallint, 385::numeric, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'AP'::text, 4::smallint, 385::numeric, 256::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'FMJ'::text, 0::smallint, 256::numeric, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'FMJ'::text, 1::smallint, 385::numeric, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'FMJ'::text, 2::smallint, 385::numeric, 128::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'FMJ'::text, 3::smallint, 513::numeric, 256::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'FMJ'::text, 4::smallint, 641::numeric, 385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'HP'::text, 0::smallint, 128::numeric, 0::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'HP'::text, 1::smallint, 897::numeric, 385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'HP'::text, 2::smallint, 1282::numeric, 641::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'HP'::text, 3::smallint, 2051::numeric, 1538::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('BMR-308'::text, 'HP'::text, 4::smallint, 5128::numeric, 2308::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Bushmaster M17S'::text, 'AP'::text, 1::smallint, 423::numeric, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Bushmaster M17S'::text, 'AP'::text, 2::smallint, 508::numeric, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Bushmaster M17S'::text, 'AP'::text, 4::smallint, 592::numeric, 508::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Bushmaster M17S'::text, 'FMJ'::text, 1::smallint, 423::numeric, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Bushmaster M17S'::text, 'FMJ'::text, 2::smallint, 508::numeric, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Bushmaster M17S'::text, 'HP'::text, 1::smallint, 1016::numeric, 846::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Bushmaster M17S'::text, 'HP'::text, 2::smallint, 1354::numeric, 1185::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Bushmaster M17S'::text, 'HP'::text, 3::smallint, 2285::numeric, 2708::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Bushmaster M17S'::text, 'HP'::text, 4::smallint, 5670::numeric, 3385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Deagle'::text, 'FMJ'::text, 3::smallint, 433::numeric, 650::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Deagle'::text, 'HP'::text, 3::smallint, 2166::numeric, 3032::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Deagle'::text, 'HP'::text, 4::smallint, 5415::numeric, 3899::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'AP'::text, 0::smallint, 255::numeric, 85::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'AP'::text, 1::smallint, 340::numeric, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'AP'::text, 2::smallint, 340::numeric, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'AP'::text, 3::smallint, 425::numeric, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'AP'::text, 4::smallint, 425::numeric, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'FMJ'::text, 0::smallint, 255::numeric, 85::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'FMJ'::text, 1::smallint, 340::numeric, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'FMJ'::text, 2::smallint, 425::numeric, 170::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'FMJ'::text, 3::smallint, 510::numeric, 255::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'FMJ'::text, 4::smallint, 595::numeric, 340::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'HP'::text, 0::smallint, 85::numeric, 0::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'HP'::text, 1::smallint, 850::numeric, 425::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'HP'::text, 2::smallint, 1190::numeric, 510::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'HP'::text, 3::smallint, 1870::numeric, 1275::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('FAL'::text, 'HP'::text, 4::smallint, 4674::numeric, 1530::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Galil'::text, 'AP'::text, 1::smallint, 452::numeric, 361::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Galil'::text, 'AP'::text, 2::smallint, 542::numeric, 451::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Galil'::text, 'AP'::text, 4::smallint, 633::numeric, 541::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Galil'::text, 'FMJ'::text, 1::smallint, 452::numeric, 361::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Galil'::text, 'FMJ'::text, 2::smallint, 542::numeric, 451::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Galil'::text, 'HP'::text, 1::smallint, 1084::numeric, 902::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Galil'::text, 'HP'::text, 2::smallint, 1446::numeric, 1263::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Galil'::text, 'HP'::text, 3::smallint, 2440::numeric, 2887::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Galil'::text, 'HP'::text, 4::smallint, 6054::numeric, 3609::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 17'::text, 'AP'::text, 3::smallint, 802::numeric, 802::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 17'::text, 'AP'::text, 4::smallint, 916::numeric, 916::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 17'::text, 'FMJ'::text, 3::smallint, 802::numeric, 916::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 17'::text, 'FMJ'::text, 4::smallint, 1031::numeric, 1260::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 17'::text, 'HP'::text, 3::smallint, 3206::numeric, 4695::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 17'::text, 'HP'::text, 4::smallint, 8130::numeric, 5725::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 18'::text, 'AP'::text, 3::smallint, 335::numeric, 335::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 18'::text, 'AP'::text, 4::smallint, 383::numeric, 383::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 18'::text, 'FMJ'::text, 3::smallint, 335::numeric, 383::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 18'::text, 'FMJ'::text, 4::smallint, 431::numeric, 527::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 18'::text, 'HP'::text, 3::smallint, 1341::numeric, 1963::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('GGX 18'::text, 'HP'::text, 4::smallint, 3400::numeric, 2394::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Judge'::text, 'FMJ'::text, 3::smallint, 849::numeric, 1132::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Judge'::text, 'FMJ'::text, 4::smallint, 1132::numeric, 1415::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Judge'::text, 'HP'::text, 3::smallint, 3962::numeric, 5660::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Judge'::text, 'HP'::text, 4::smallint, 9906::numeric, 6792::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('KH-2002'::text, 'AP'::text, 1::smallint, 422::numeric, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('KH-2002'::text, 'AP'::text, 2::smallint, 506::numeric, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('KH-2002'::text, 'AP'::text, 4::smallint, 591::numeric, 508::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('KH-2002'::text, 'FMJ'::text, 1::smallint, 422::numeric, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('KH-2002'::text, 'FMJ'::text, 2::smallint, 506::numeric, 423::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('KH-2002'::text, 'HP'::text, 1::smallint, 1013::numeric, 846::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('KH-2002'::text, 'HP'::text, 2::smallint, 1350::numeric, 1185::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('KH-2002'::text, 'HP'::text, 3::smallint, 2278::numeric, 2708::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('KH-2002'::text, 'HP'::text, 4::smallint, 5654::numeric, 3385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M1911'::text, 'AP'::text, 4::smallint, 511::numeric, 638::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-23T21:39:02.076505+00:00'::timestamptz),
    ('M1911'::text, 'FMJ'::text, 4::smallint, 638::numeric, 766::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M1911'::text, 'HP'::text, 3::smallint, 2043::numeric, 2936::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M1911'::text, 'HP'::text, 4::smallint, 5106::numeric, 4596::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'AP'::text, 0::smallint, 271::numeric, 204::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'AP'::text, 1::smallint, 339::numeric, 271::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'AP'::text, 2::smallint, 407::numeric, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'AP'::text, 3::smallint, 407::numeric, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'AP'::text, 4::smallint, 475::numeric, 407::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'FMJ'::text, 1::smallint, 339::numeric, 271::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'FMJ'::text, 2::smallint, 407::numeric, 339::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'FMJ'::text, 3::smallint, 475::numeric, 407::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'FMJ'::text, 4::smallint, 611::numeric, 543::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'HP'::text, 1::smallint, 814::numeric, 679::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'HP'::text, 2::smallint, 1086::numeric, 950::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'HP'::text, 3::smallint, 1833::numeric, 2172::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M249 SAW'::text, 'HP'::text, 4::smallint, 4548::numeric, 2715::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M4'::text, 'AP'::text, 1::smallint, 363::numeric, 290::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M4'::text, 'AP'::text, 2::smallint, 435::numeric, 363::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M4'::text, 'AP'::text, 4::smallint, 508::numeric, 435::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M4'::text, 'FMJ'::text, 1::smallint, 363::numeric, 290::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M4'::text, 'FMJ'::text, 2::smallint, 435::numeric, 363::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M4'::text, 'HP'::text, 1::smallint, 871::numeric, 725::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M4'::text, 'HP'::text, 2::smallint, 1161::numeric, 1016::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M4'::text, 'HP'::text, 3::smallint, 1959::numeric, 2322::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('M4'::text, 'HP'::text, 4::smallint, 4861::numeric, 2902::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('MK22'::text, 'HP'::text, 3::smallint, 8000::numeric, 10667::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('MK22'::text, 'HP'::text, 4::smallint, 20000::numeric, 24000::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Mosin Nagant'::text, 'FMJ'::text, 3::smallint, 1250::numeric, 1250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Mosin Nagant'::text, 'HP'::text, 1::smallint, 2500::numeric, 3750::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Mosin Nagant'::text, 'HP'::text, 2::smallint, 3750::numeric, 5000::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Mosin Nagant'::text, 'HP'::text, 3::smallint, 7500::numeric, 11250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Mosin Nagant'::text, 'HP'::text, 4::smallint, 18750::numeric, 25000::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('MP5'::text, 'AP'::text, 3::smallint, 502::numeric, 502::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('MP5'::text, 'AP'::text, 4::smallint, 574::numeric, 574::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('MP5'::text, 'FMJ'::text, 3::smallint, 502::numeric, 574::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('MP5'::text, 'FMJ'::text, 4::smallint, 646::numeric, 789::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('MP5'::text, 'HP'::text, 3::smallint, 2010::numeric, 2943::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('MP5'::text, 'HP'::text, 4::smallint, 5096::numeric, 3589::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'AP'::text, 0::smallint, 298::numeric, 100::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'AP'::text, 1::smallint, 397::numeric, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'AP'::text, 2::smallint, 397::numeric, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'AP'::text, 3::smallint, 496::numeric, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'AP'::text, 4::smallint, 496::numeric, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'FMJ'::text, 0::smallint, 298::numeric, 100::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'FMJ'::text, 1::smallint, 397::numeric, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'FMJ'::text, 2::smallint, 496::numeric, 200::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'FMJ'::text, 3::smallint, 595::numeric, 300::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'FMJ'::text, 4::smallint, 694::numeric, 400::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'HP'::text, 0::smallint, 99::numeric, 0::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-23T21:39:02.076505+00:00'::timestamptz),
    ('PKM'::text, 'HP'::text, 1::smallint, 992::numeric, 500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'HP'::text, 2::smallint, 1388::numeric, 700::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'HP'::text, 3::smallint, 2182::numeric, 1600::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PKM'::text, 'HP'::text, 4::smallint, 5653::numeric, 1983::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PP-19 Vityaz'::text, 'AP'::text, 3::smallint, 480::numeric, 480::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PP-19 Vityaz'::text, 'AP'::text, 4::smallint, 549::numeric, 549::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PP-19 Vityaz'::text, 'FMJ'::text, 3::smallint, 480::numeric, 549::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PP-19 Vityaz'::text, 'FMJ'::text, 4::smallint, 617::numeric, 754::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PP-19 Vityaz'::text, 'HP'::text, 3::smallint, 1920::numeric, 2811::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('PP-19 Vityaz'::text, 'HP'::text, 4::smallint, 4869::numeric, 3429::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'AP'::text, 0::smallint, 3750::numeric, 7500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'AP'::text, 2::smallint, 7500::numeric, 7500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'AP'::text, 3::smallint, 7500::numeric, 11250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'AP'::text, 4::smallint, 7500::numeric, 11250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'FMJ'::text, 1::smallint, 3750::numeric, 7500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'FMJ'::text, 2::smallint, 7500::numeric, 7500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'FMJ'::text, 3::smallint, 7500::numeric, 11250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'FMJ'::text, 4::smallint, 11250::numeric, 18750::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'HP'::text, 1::smallint, 15000::numeric, 22500::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'HP'::text, 2::smallint, 22500::numeric, 30000::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'HP'::text, 3::smallint, 33750::numeric, 71250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Scout Rifle TD'::text, 'HP'::text, 4::smallint, 90000::numeric, 146250::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'AP'::text, 0::smallint, 433::numeric, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'AP'::text, 1::smallint, 433::numeric, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'AP'::text, 2::smallint, 433::numeric, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'AP'::text, 3::smallint, 577::numeric, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'AP'::text, 4::smallint, 577::numeric, 433::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'FMJ'::text, 0::smallint, 288::numeric, 144::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'FMJ'::text, 1::smallint, 433::numeric, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'FMJ'::text, 2::smallint, 577::numeric, 288::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'FMJ'::text, 3::smallint, 577::numeric, 433::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'FMJ'::text, 4::smallint, 865::numeric, 577::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'HP'::text, 0::smallint, 144::numeric, 0::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'HP'::text, 1::smallint, 1154::numeric, 721::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'HP'::text, 2::smallint, 1587::numeric, 1010::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'HP'::text, 3::smallint, 2596::numeric, 2452::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SKS'::text, 'HP'::text, 4::smallint, 6635::numeric, 3750::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Super-45'::text, 'FMJ'::text, 3::smallint, 239::numeric, 287::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Super-45'::text, 'FMJ'::text, 4::smallint, 335::numeric, 382::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Super-45'::text, 'HP'::text, 3::smallint, 1004::numeric, 1434::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('Super-45'::text, 'HP'::text, 4::smallint, 2534::numeric, 1769::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SV98'::text, 'FMJ'::text, 3::smallint, 1154::numeric, 1154::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SV98'::text, 'HP'::text, 1::smallint, 2308::numeric, 3462::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SV98'::text, 'HP'::text, 2::smallint, 3462::numeric, 4615::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SV98'::text, 'HP'::text, 3::smallint, 6923::numeric, 10385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SV98'::text, 'HP'::text, 4::smallint, 17308::numeric, 23076::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'AP'::text, 0::smallint, 352::numeric, 117::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'AP'::text, 1::smallint, 352::numeric, 117::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'AP'::text, 2::smallint, 352::numeric, 117::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'AP'::text, 3::smallint, 469::numeric, 234::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'AP'::text, 4::smallint, 469::numeric, 234::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'FMJ'::text, 0::smallint, 234::numeric, 117::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'FMJ'::text, 1::smallint, 352::numeric, 117::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'FMJ'::text, 2::smallint, 469::numeric, 234::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'FMJ'::text, 3::smallint, 469::numeric, 234::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'FMJ'::text, 4::smallint, 703::numeric, 352::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'HP'::text, 0::smallint, 117::numeric, 0::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'HP'::text, 1::smallint, 938::numeric, 469::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'HP'::text, 2::smallint, 1289::numeric, 586::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'HP'::text, 3::smallint, 1992::numeric, 1523::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('SVD'::text, 'HP'::text, 4::smallint, 5156::numeric, 2344::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('T-21'::text, 'AP'::text, 1::smallint, 385::numeric, 308::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('T-21'::text, 'AP'::text, 2::smallint, 462::numeric, 385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('T-21'::text, 'AP'::text, 4::smallint, 538::numeric, 462::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('T-21'::text, 'FMJ'::text, 1::smallint, 385::numeric, 308::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('T-21'::text, 'FMJ'::text, 2::smallint, 462::numeric, 385::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('T-21'::text, 'HP'::text, 1::smallint, 923::numeric, 769::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('T-21'::text, 'HP'::text, 2::smallint, 1231::numeric, 1077::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('T-21'::text, 'HP'::text, 3::smallint, 2077::numeric, 2462::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz),
    ('T-21'::text, 'HP'::text, 4::smallint, 5154::numeric, 3077::numeric, 'Swoleguy in-game shooting-range ballistics testing (YouTube), released for community use, 2026-09-10, attributed, not owner-verified'::text, '2026-09-10T21:02:38.240572+00:00'::timestamptz)
  ) AS v(weapon_name, ammo_type, armor_tier, new_ttk, old_ttk, old_vs, old_updated_at)
  WHERE t.game_slug = 'wardogs' AND t.weapon_name = v.weapon_name AND t.ammo_type = v.ammo_type AND t.armor_tier = v.armor_tier
    AND t.ttk_ms IS NOT DISTINCT FROM v.new_ttk AND t.verified_source = 'Evo4Fun workbook shots-to-kill (sheet dated 30/10/2026, Season 2 per operator); ttk_ms computed by Cybernetic Punks as (chest shots to kill - 1) x 60000 / fire rate, attributed, not owner-verified';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 221 THEN RAISE EXCEPTION 'wardogs_ttk restore: expected 221 rows, got %', n; END IF;
  RAISE NOTICE 'wardogs_ttk restore: % rows', n;
END $$;

DO $$
DECLARE n integer;
BEGIN
  DELETE FROM wardogs_ttk t USING (VALUES
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
  ) AS v(weapon_name, ammo_type, armor_tier, new_ttk)
  WHERE t.game_slug = 'wardogs' AND t.weapon_name = v.weapon_name AND t.ammo_type = v.ammo_type AND t.armor_tier = v.armor_tier
    AND t.ttk_ms IS NOT DISTINCT FROM v.new_ttk AND t.verified_source = 'Evo4Fun workbook shots-to-kill (sheet dated 30/10/2026, Season 2 per operator); ttk_ms computed by Cybernetic Punks as (chest shots to kill - 1) x 60000 / fire rate, attributed, not owner-verified, fire rate from the workbook Weapon Base Stats tab (nominal)';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> 60 THEN RAISE EXCEPTION 'wardogs_ttk delete inserted: expected 60 rows, got %', n; END IF;
  RAISE NOTICE 'wardogs_ttk delete inserted: % rows', n;
END $$;

COMMIT;

-- VERIFY (read-only): expect total 450, evo_rows 0.
SELECT count(*) AS total, count(*) FILTER (WHERE verified_source LIKE 'Evo4Fun workbook shots-to-kill%') AS evo_rows FROM wardogs_ttk WHERE game_slug = 'wardogs';
