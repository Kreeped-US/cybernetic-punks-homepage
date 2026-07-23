-- scripts/backfill-noindexed-at.sql
-- ============================================================
-- BACKFILL noindexed_at FOR THE 2026-07-23 /intel PRUNE COHORTS
-- ============================================================
-- Operator-run. One-off. Paste into the Supabase SQL editor.
--
-- WHY: 153 pages were noindexed on 2026-07-23 (12 duplicates in Phase 1, 141
-- news-shaped in Phase 2), but feed_items holds 821 rows at noindex = true --
-- 668 of which predate that day -- and nothing separated the cohorts. Consumer C's
-- first job is verifying exactly this cohort leaves Google's index, so it has to be
-- selectable. This stamps the marker.
--
-- SOURCE OF TRUTH: the two reverse-operation UUID lists recorded in docs/HANDOFF.md
-- (Phase 2 list at the "REVERSE OPERATION -- 141 UUIDs" heading; Phase 1 list under
-- "Reverse (full statement -- no re-derivation needed)"). Extracted programmatically
-- and validated: 12 + 141 = 153 distinct ids, 0 overlap between the lists.
--
-- THERE IS NO INSERT IN THIS FILE, DELIBERATELY. All 153 rows already exist; the
-- backfill only sets a column on them. An INSERT ... ON CONFLICT would be the wrong
-- shape -- it would attempt to create rows and, on conflict, could touch columns that
-- must not change. UPDATE is the correct and only operation here.
--
-- PRE-CHECK PERFORMED (read-only, 2026-07-23, before this file was written):
--   * all 153 ids found in feed_items          (0 missing)
--   * all 153 still noindex = true             (0 reverted)
--   * noindexed_at column present, 0 rows stamped
--
-- GUARD: each statement requires `noindex = true AND noindexed_at IS NULL`, so a
-- re-run is a no-op and a row that has since been reverted is SKIPPED rather than
-- stamped with a claim that is no longer true.
--
-- NOTE ON TYPE: noindexed_at is timestamptz, so '2026-07-23' casts to
-- 2026-07-23 00:00:00+00. It is a DAY-LEVEL cohort marker, not the literal moment
-- the prune ran. Do not read precision into it that is not there.


-- ------------------------------------------------------------
-- Phase 1 -- 12 duplicates
-- ------------------------------------------------------------
UPDATE feed_items SET noindexed_at = '2026-07-23'
 WHERE noindex = true AND noindexed_at IS NULL AND id IN (
  'b79642d5-0f75-465a-928d-c2298b99af10','60f7eb14-58fe-4006-b20a-0e8ff4fe6c58','181b7d0d-899c-415e-8922-f89d1c6c9799',
  '79f47ec0-475f-4e4d-ae54-3f70551e170d','fe1b7414-df7b-4819-b3ba-7d0d5f595d67','c0596575-404e-4251-ad41-a959ec82c409',
  '12d4b6ae-5848-409f-a2c9-ac03782ff27a','baa6cda2-b7aa-4588-bba3-3d17ab6ec1f0','fc9e0daa-629e-4e20-8f75-ee6ae650c6b6',
  'b0a4faeb-76a3-437b-8664-4aedea22e407','9e80504b-a1d7-4a6f-8730-ef5c7a789677','271ade05-2ab4-48e0-8fa4-2c37481fb165'
);


-- ------------------------------------------------------------
-- Phase 2 -- 141 news-shaped
-- ------------------------------------------------------------
UPDATE feed_items SET noindexed_at = '2026-07-23'
 WHERE noindex = true AND noindexed_at IS NULL AND id IN (
  'f7b8c852-98c2-4acb-9682-c6bd17b7a8e1','bfc480f6-f9ea-4fe9-aabb-750edac6a469','abb9fc6f-42ec-40e9-93c5-258fd6104587',
  'eeb38f23-382e-4fb4-9738-ecf050919c24','0f19ad87-4170-4e5b-bb50-4ac6b6b43891','5b9d3c7e-acc4-40de-8799-2fdbeaeea9b3',
  '6ae60de6-7284-45cc-b966-02e5d3301358','e4ed6d2d-5269-4639-8d7d-d20e38ba2993','f9da152e-e5e6-46f4-9c4b-0e1882e9f488',
  '1eaba451-fd8c-403a-a1a9-658b6a2e268d','0b947a35-c71a-448d-add4-6c2c8d07c867','7259b673-8ee7-4b8c-a00b-c4fee1129977',
  'f81b204f-d84c-41b0-86dc-c72bf75ab0cb','603b6e93-f16f-4b2e-ad03-f59f68723ef3','0c8d6864-11e2-45bb-a25b-15b5c4e99596',
  '6e591a0e-306d-4f34-8272-193fb23a8bae','64021f5d-d823-40e5-8fa2-065e5f8b7551','1336cc98-c919-4a91-aaee-d3a07c0257dd',
  '9d506553-b83f-4689-8677-7eec5c4f7e4a','3f3926b0-f9d0-4ae1-9f8d-58616d2eebf3','fe5e7a1c-83e5-4bfe-836d-dc6cb20747aa',
  'c635c12a-7d8e-4f92-a3f6-8fa84dcede9b','8cbe6904-a3c8-4cbd-8ab1-ccce3a73f55f','4773b552-e31a-4a97-b58b-dc684c039b82',
  '13490730-3830-4bc8-92bf-e2405d50f9a0','bd43b555-d391-4a6b-89d6-06b2fc2eb909','5c564f27-6dc1-41fa-ba95-3ef46d93b5e5',
  '914fa3e1-be15-48e1-a376-a466d82028ba','988e3600-a128-44f9-adeb-9b39e70bbc52','03b2c326-d52e-4609-9094-8471052ae581',
  'a5a89925-c4d8-48bd-8ee8-5350f00181db','a94717e7-5e52-4bf9-b4a7-facd0cec0982','971f3cd4-955f-42ab-8fb3-e473e6b260f0',
  '98235292-4c40-4335-a71f-560f59ddaf7b','c7aae8f8-e1ed-48d8-9e34-2d617602f832','5516965b-4047-4940-8c00-3c649599fb23',
  '2be53ee9-cbe0-4eb0-809d-a285c82fe573','c269a581-ff82-4f3a-80a4-6f3c368859a4','1ba55769-3527-4de5-8561-fd4440c82bbe',
  '1069258a-c9b8-4818-aa5b-7af70cac1299','8f1192ac-0285-458d-9272-2fc593f3ed5e','604c921b-2f5e-4861-8f92-96ea1ab41dc1',
  '368f0adc-c391-44c1-b224-52b694c38714','06bbf9d1-42ab-4c52-80e8-00b2c2a85b63','3446c973-02ac-4420-9230-cdaddcf71ed0',
  '2eccc8bf-1a76-4532-bc63-f68168f22df8','30b30549-4611-47ea-b78e-9000e40c436b','59679d11-7758-43aa-9298-79b120b6853c',
  '778bf41b-28e8-4599-b517-dfc92850a30b','aefba375-fa12-4e43-a824-d4a48661ed5d','c22dd92b-a149-426e-80ce-3076eb626f5f',
  'a0a08705-316d-4f62-9b76-1f26ba1ba8ff','54e7a0a4-9b3b-485e-9db1-21a03b22416a','f22067c9-1477-451f-b868-db650317be8f',
  '4111e079-f165-411d-8cdb-2f5fee6c91a3','8c29ed4c-c496-4905-8a41-476f488b1444','9b2531a7-204f-4fbe-9299-a35954d5edc1',
  'bd818125-39a5-429c-8852-c99bb821eab1','a206a163-613f-40ec-8a06-6d45c39469c1','9a48f11e-23f3-4f52-9f1b-fcbd85502343',
  '11911720-aef9-432f-9184-7771ff3c7e59','ea86f725-e231-468c-9490-5eab092a2224','69ca3f13-f4e6-4a9d-a031-f92d04587085',
  'f69e50fc-2d71-41bf-8bd8-4c99c6abf0a7','4abf8266-e176-48c4-bbd6-a300cfbf3cc7','9f258e87-d5a4-4dd7-a937-aadac10371a5',
  '9f0eb30c-cd72-4714-9a75-d17ecd584696','25d2063f-71d3-40d2-b9e0-4f83c04d20cb','09a4a36c-51f1-4dd3-8785-dd43708a0e7d',
  '679bdd5d-79d0-43be-bd53-0932d08b3b74','e647a0da-8d63-41c7-bc91-bffb42477649','3221b0d8-e7d2-4015-a5d0-0598dcd9aede',
  'bc9a3ebb-137a-48f1-921d-a18f6c31490b','5f694a3e-15f8-437f-8f24-6f603b11cf3f','2ad1f149-9479-4d44-9a9d-46121a252e3d',
  '21103670-d00f-4dfc-8331-3a9d0470414a','16707547-eaeb-4108-a76b-0c4bc7caa184','fd78f62f-2428-42a5-b4f4-d7ca564848a5',
  '12cc966a-e23c-4b4f-9586-2256d0475950','629cf6fc-a20d-42ca-8f45-b92d4d56e132','01f28e68-dc88-49a7-9826-5b8260011c14',
  'bb870595-fab2-464f-b538-b06d2592e8f7','71582ae6-f76c-4dba-ae78-dcbcc192b910','599c50ec-7e92-4ad1-b250-1b858276c843',
  'a3aa6478-4243-469f-b02a-e57d06461935','9cfc04fd-6471-418b-b243-562ac3e35a06','8bd00efe-4252-4a3d-a4fb-80b69746adaf',
  '3166527d-2897-472d-b734-e299d42cda9c','c0794686-6929-42dc-96e4-51cad27c083c','02530e0a-b65c-4020-b571-594ca67b45ab',
  'f37c6153-f5ed-41f6-b7cb-4f69a07dae78','696b8f8e-df8b-441e-b340-0705e6a2043b','f78f9c22-4f1e-4450-9f98-ed29374d7df7',
  'e4dc01be-c6e8-42a0-8d34-6c2bd1a1a177','84f27e83-37f6-4294-8625-44c2b526ec86','f7a3bacd-a938-4612-b069-29cd48741645',
  '41915991-9642-4871-97f9-78296417261a','118587fa-4d0d-4d3c-842e-dda8644c16b5','be6cb39c-df42-45bd-b3ff-f60ff8e1f12d',
  '0ef2bad8-2400-407f-a00f-25eba7f9e326','cefe9963-f316-4a31-8c44-236838a28b94','c83c71cd-5a8a-4a24-9809-5c967b3bfcef',
  'ecaa1bf8-02fc-47e1-8eaf-12fd70f6f6c7','2393e94d-1a47-490e-96cf-21b53dbf4322','8f0bb796-e112-4eb9-b9b6-5fda6c4f58c5',
  'cd49aa79-2963-49eb-bbe1-44ff07fbe717','340b0887-5bfc-46b8-8426-66401c340026','b9a475af-58de-4d9f-855e-5da277a3444a',
  '474553fa-b4d9-4653-a7d8-ae6e24d5d0d0','7183584e-f417-420c-a66d-79b5e91d5549','ddf7d122-06c3-4aca-8c44-509f645b85ad',
  '28d0ecb4-c526-4f8b-8cab-c4c15a1a0de5','fe437f28-ceff-4eb7-8615-c29bea77f7cd','e6ecb163-8199-4751-9c0a-5a604da83ec4',
  '90761e7b-ab43-4bc5-9d96-8c29e21eb59d','3ad69f1f-d7c0-4244-a35a-84698a926ba3','4b756c53-ea99-49d7-a75d-efa404e5b2a3',
  '04173f62-7779-449e-aa6a-f886b37b89be','e59eb450-2049-45ba-814a-e7969b259f82','d91a3e5a-fa6b-48b1-a638-72436322d4f4',
  'e4b55b59-c11d-4a28-b9f2-2926222d13f0','3d78e445-2965-4d80-889a-5e3f42fb255a','63eaa5cb-bb38-4810-b719-a008e776d34b',
  'd2fb8847-a249-4b4b-888d-a4a43ba543f8','759df7f9-15bc-4e78-9ef5-d5dbeebd9354','cb9a4377-fe05-47a2-8c62-e4ae93682b41',
  'd2d87cd6-4a05-4ec3-a2a5-1568a2744c9c','1df0c8ad-9b1b-4d58-8174-f1267843d3dc','16006f73-f596-44b9-93f0-1ea03b953167',
  '1c33174f-779a-4b27-be3c-bd3cc5607b19','5cb9d31e-ded2-4828-8095-dc70748147db','5e3130b1-c9ab-4371-b608-a248f379bb4f',
  '2a534c46-e931-42c2-b395-d89d21da1fbe','ebdc3a25-daff-4348-8827-ddab309b0ad8','85f052e2-5270-4647-8587-b4fe690cad2a',
  '8d89075f-3e7a-4134-92f0-fc42337b6a71','d1bdc7ad-3c0a-4c5c-9847-96ee1bfe358f','3cd2b985-ef93-4820-8c35-f6c3624676c3',
  '824ff58c-b9d0-43ca-ba0c-7fa3e1c2c188','d4edd9e0-be39-4851-86b3-89246ad8f979','8551e4ce-299a-4047-a149-f9b443f48907'
);


-- ============================================================
-- ASSERTIONS -- run after the two statements above
-- ============================================================

-- 1. Total stamped. EXPECT: 153
--    This is the whole test. A lower number means the guard skipped rows, which
--    means something changed since the pre-check -- stop and investigate rather
--    than re-running.
select count(*) as stamped_total
from feed_items
where noindexed_at = '2026-07-23';


-- 2. Every stamped row is still noindexed.
--    EXPECT: still_noindex = 153, contradictions = 0
--    A contradiction would be a row marked "pruned on 2026-07-23" that is not
--    actually noindexed -- the exact state Consumer C must never be handed.
select count(*) filter (where noindex is true)               as still_noindex,
       count(*) filter (where noindex is distinct from true) as contradictions
from feed_items
where noindexed_at is not null;


-- 3. Nothing outside the cohort got stamped.
--    EXPECT: total_stamped = 153, distinct_stamps = 1, only_date = 2026-07-23 00:00:00+00
--    distinct_stamps = 1 is the over-reach check: the table held 0 stamps before
--    this file ran, so more than one distinct value means something else was caught.
select count(*)                     as total_stamped,
       count(distinct noindexed_at) as distinct_stamps,
       min(noindexed_at)            as only_date
from feed_items
where noindexed_at is not null;


-- ============================================================
-- TWO RELATED GAPS -- reported, NOT fixed here
-- ============================================================
-- 1. FUTURE PRUNES should stamp inline rather than need a backfill. There is no prune
--    SCRIPT in this repo (every prune to date has been operator-run SQL), so the
--    change is to the standing pattern:
--        UPDATE feed_items SET noindex = true, noindexed_at = now()
--         WHERE id IN (...) AND noindex = false;
--    This keeps the existing recompute-and-refuse guard and adds the stamp in the
--    SAME statement, so the two cannot half-apply.
--
-- 2. THE REVERSE OPERATION MUST CLEAR THE STAMP -- *** CLOSED, see below. ***
--    If noindexed_at survives an un-prune, that page reads as pruned forever and
--    Consumer C keeps watching a URL that is back in the index. The correct pattern is:
--        UPDATE feed_items SET noindex = false, noindexed_at = NULL WHERE id IN (...);
--    FIXED at every site that sets noindex = false:
--      * both reverse blocks in docs/HANDOFF.md (Phase 1 12-UUID, Phase 2 141-UUID)
--      * app/api/admin/drafts/approve/route.js (the only code path that un-noindexes)
--    Gap (1) above -- stamping inline on future prunes -- REMAINS OPEN.
