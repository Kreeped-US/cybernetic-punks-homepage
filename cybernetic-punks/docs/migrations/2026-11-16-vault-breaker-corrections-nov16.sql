-- docs/migrations/2026-11-16-vault-breaker-corrections-nov16.sql
-- Brief 386 (prepared 2026-11-16). OPERATOR-RUN in the Supabase SQL editor. NOT run by the executor.
--
-- Vault Breaker corrections in four published Marathon articles (feed_items, game_slug marathon).
-- Source for the new facts: Bungie, Marathon Update 1.1.9.5,
-- https://www.bungie.net/7/en/News/Article/marathon_update_1_1_9_5 (text pasted by the operator,
-- publish date not known, checked 2026-11-13). Update 1.1.9.5 lists Vault Breaker as available
-- October 20 - November 10. Update 1.1.9.2 (October 6) had listed October 20 - November 9.
--
--   S1 k3uq 89392498-d3d6-4dbf-ad41-e961a421e8e7  append a dated Update paragraph before Sources,
--                                                  add Update 1.1.9.5 to the Sources line
--   S2 x2nt 9f4d78d3-fd64-40f4-853f-befc30c0f362  same as S1 (identical texts)
--   S3 xcs4 5cdbf12c-2389-4ae0-9622-3a1aedf579cb  one-phrase tense fix, no Update paragraph
--   S4 rq2i d65aee0d-2795-45dd-8332-e965c6937238  append a dated Update paragraph at the end
--
-- HOW TO RUN: each statement has three blocks: BEFORE, UPDATE, VERIFY. Run each block on its own
-- (select it, then Run). Run the statements in any order. Each UPDATE must return exactly 1 row.
-- If an UPDATE returns 0 rows, STOP: the body is not the reviewed one, the row is not published,
-- or the edit is already applied. Running an UPDATE a second time returns 0 rows.
--
-- RULES THIS FILE FOLLOWS: ASCII only, LF line endings, no dollar quotes, no semicolon inside any
-- quoted string (chr(59) instead), no apostrophe inside any literal, newlines as chr(10). Every
-- literal sits on one line, so a CRLF checkout of this file cannot put a carriage return into a
-- stored body (VERIFY shows cr_pos, expect 0).
--
-- GUARDS on every UPDATE: id, md5(body) equal to the body read on 2026-11-16 (Briefs 385 and 386),
-- is_published, and a not-already-applied check. updated_at is set to now() explicitly (the
-- feed_items set_updated_at trigger also fires on a body change). Nothing else changes: created_at,
-- headline, slug, tags, verified_source, verified_source_url, noindex and gate_status stay as they are.
--
-- EFFECT: the visible article date (created_at) does not change. updated_at, JSON-LD dateModified
-- and the sitemap lastmod move for these four URLs only.
--
-- Expected values below come from the executor PGlite replay (Brief 386) on copies of the live rows.


-- =====================================================================================
-- S1 k3uq  marathon-mid-season-2-update-vault-breaker-wstr-buff-grenade-limits-k3uq
-- The stale sentence (Vault Breaker returns from October 20 to November 9, per Update 1.1.9.2
-- of October 6) is inside our own dated "Update (October 15, 2026)" paragraph. It is kept
-- as written, as the record. A new dated Update paragraph goes between it and the Sources paragraph,
-- and Update 1.1.9.5 is added as the last Sources entry.
-- =====================================================================================

-- S1.BEFORE  (expect: 1 row, md5 f2588999900dd931ee9ef073f550008f, len 5129, is_published true,
--             n_sources_sep 1, n_1192_end 1, n_update_nov16 0, cr_pos 0)
SELECT id, md5(body) AS md5, char_length(body) AS len, is_published,
       (char_length(body) - char_length(replace(body, chr(10) || chr(10) || 'Sources:', ''))) / 10 AS n_sources_sep,
       (char_length(body) - char_length(replace(body, '1845383656396920.', ''))) / 17 AS n_1192_end,
       (char_length(body) - char_length(replace(body, 'Update (November 16, 2026)', ''))) / 26 AS n_update_nov16,
       position(chr(13) in body) AS cr_pos, updated_at
FROM feed_items
WHERE id = '89392498-d3d6-4dbf-ad41-e961a421e8e7';

-- S1.UPDATE  (expect: 1 row returned)
UPDATE feed_items
SET body = replace(
      replace(
        body,
        chr(10) || chr(10) || 'Sources:',
        chr(10) || chr(10)
          || 'Update (November 16, 2026): Update 1.1.9.5 from Bungie (checked November 13, 2026) lists the Vault Breaker return run as October 20 to November 10, one day later than the November 9 end date in Update 1.1.9.2. Both listed runs, July 21 to August 4 and October 20 to November 10, have passed. The October 15 update above is left as written for the record.'
          || chr(10) || chr(10) || 'Sources:'
      ),
      '1845383656396920.',
      '1845383656396920' || chr(59) || ' Bungie, "Marathon Update 1.1.9.5" (publish date not known' || chr(59) || ' checked November 13, 2026): https://www.bungie.net/7/en/News/Article/marathon_update_1_1_9_5.'
    ),
    updated_at = now()
WHERE id = '89392498-d3d6-4dbf-ad41-e961a421e8e7'
  AND md5(body) = 'f2588999900dd931ee9ef073f550008f'
  AND is_published
  AND position('Update (November 16, 2026)' in body) = 0
RETURNING id, md5(body) AS new_md5, char_length(body) AS new_len;

-- S1.VERIFY  (expect: md5 50c591355c81a22cda6e5db3a2a12957, len 5638, cr_pos 0, n_update_nov16 1,
--             updated_at = the time of the run)
SELECT id, md5(body) AS md5, char_length(body) AS len,
       position(chr(13) in body) AS cr_pos,
       (char_length(body) - char_length(replace(body, 'Update (November 16, 2026)', ''))) / 26 AS n_update_nov16,
       updated_at
FROM feed_items
WHERE id = '89392498-d3d6-4dbf-ad41-e961a421e8e7';


-- =====================================================================================
-- S2 x2nt  marathon-director-joe-ziegler-out-what-it-means-for-the-meta-x2nt
-- Same edit as S1, same texts. The stale sentence is inside our own "Update (October 15, 2026)"
-- paragraph and is kept as the record.
-- =====================================================================================

-- S2.BEFORE  (expect: 1 row, md5 6fe263c57f31573671a2bcbe53724deb, len 5576, is_published true,
--             n_sources_sep 1, n_1192_end 1, n_update_nov16 0, cr_pos 0)
SELECT id, md5(body) AS md5, char_length(body) AS len, is_published,
       (char_length(body) - char_length(replace(body, chr(10) || chr(10) || 'Sources:', ''))) / 10 AS n_sources_sep,
       (char_length(body) - char_length(replace(body, '1845383656396920.', ''))) / 17 AS n_1192_end,
       (char_length(body) - char_length(replace(body, 'Update (November 16, 2026)', ''))) / 26 AS n_update_nov16,
       position(chr(13) in body) AS cr_pos, updated_at
FROM feed_items
WHERE id = '9f4d78d3-fd64-40f4-853f-befc30c0f362';

-- S2.UPDATE  (expect: 1 row returned)
UPDATE feed_items
SET body = replace(
      replace(
        body,
        chr(10) || chr(10) || 'Sources:',
        chr(10) || chr(10)
          || 'Update (November 16, 2026): Update 1.1.9.5 from Bungie (checked November 13, 2026) lists the Vault Breaker return run as October 20 to November 10, one day later than the November 9 end date in Update 1.1.9.2. Both listed runs, July 21 to August 4 and October 20 to November 10, have passed. The October 15 update above is left as written for the record.'
          || chr(10) || chr(10) || 'Sources:'
      ),
      '1845383656396920.',
      '1845383656396920' || chr(59) || ' Bungie, "Marathon Update 1.1.9.5" (publish date not known' || chr(59) || ' checked November 13, 2026): https://www.bungie.net/7/en/News/Article/marathon_update_1_1_9_5.'
    ),
    updated_at = now()
WHERE id = '9f4d78d3-fd64-40f4-853f-befc30c0f362'
  AND md5(body) = '6fe263c57f31573671a2bcbe53724deb'
  AND is_published
  AND position('Update (November 16, 2026)' in body) = 0
RETURNING id, md5(body) AS new_md5, char_length(body) AS new_len;

-- S2.VERIFY  (expect: md5 bb6e9bc17cbdc2b30a27ed777b493668, len 6085, cr_pos 0, n_update_nov16 1,
--             updated_at = the time of the run)
SELECT id, md5(body) AS md5, char_length(body) AS len,
       position(chr(13) in body) AS cr_pos,
       (char_length(body) - char_length(replace(body, 'Update (November 16, 2026)', ''))) / 26 AS n_update_nov16,
       updated_at
FROM feed_items
WHERE id = '9f4d78d3-fd64-40f4-853f-befc30c0f362';


-- =====================================================================================
-- S3 xcs4  marathon-1196-sponsored-perimeter-and-solo-rep-fix-xcs4
-- Silent tense fix (precedent: ef066ef4, HANDOFF 2026-10-15 18:33Z). The sentence cites Update
-- 1.1.9.5, whose date it already matches. Only "runs" read as current. No Update paragraph.
-- =====================================================================================

-- S3.BEFORE  (expect: 1 row, md5 ff39a8836106f1d47f6a820ffa2bd767, len 2746, is_published true,
--             n_old 1, n_new 0, cr_pos 0)
SELECT id, md5(body) AS md5, char_length(body) AS len, is_published,
       (char_length(body) - char_length(replace(body, 'which runs through November 10.', ''))) / 31 AS n_old,
       (char_length(body) - char_length(replace(body, 'which the notes list as running', ''))) / 31 AS n_new,
       position(chr(13) in body) AS cr_pos, updated_at
FROM feed_items
WHERE id = '5cdbf12c-2389-4ae0-9622-3a1aedf579cb';

-- S3.UPDATE  (expect: 1 row returned)
UPDATE feed_items
SET body = replace(body, 'which runs through November 10.', 'which the notes list as running through November 10.'),
    updated_at = now()
WHERE id = '5cdbf12c-2389-4ae0-9622-3a1aedf579cb'
  AND md5(body) = 'ff39a8836106f1d47f6a820ffa2bd767'
  AND is_published
  AND position('which the notes list as running' in body) = 0
RETURNING id, md5(body) AS new_md5, char_length(body) AS new_len;

-- S3.VERIFY  (expect: md5 0f54a53635d06c842facccdecad63f4e, len 2767, cr_pos 0, n_update_nov16 0,
--             updated_at = the time of the run)
SELECT id, md5(body) AS md5, char_length(body) AS len,
       position(chr(13) in body) AS cr_pos,
       (char_length(body) - char_length(replace(body, 'Update (November 16, 2026)', ''))) / 26 AS n_update_nov16,
       updated_at
FROM feed_items
WHERE id = '5cdbf12c-2389-4ae0-9622-3a1aedf579cb';


-- =====================================================================================
-- S4 rq2i  marathon-update-1194-fixes-only-wipe-meta-next-rq2i
-- The last paragraph says "Check back after Vault Breaker returns on October 20." The original is
-- kept as the record. A dated Update paragraph is appended as the new last paragraph (the body has
-- no Sources paragraph and does not end in whitespace. Paragraphs are separated by two LFs).
-- =====================================================================================

-- S4.BEFORE  (expect: 1 row, md5 44d9883bd7bf3810f5806a8b79c28ca4, len 3384, is_published true,
--             n_update_nov16 0, cr_pos 0, last_char_is_space false)
SELECT id, md5(body) AS md5, char_length(body) AS len, is_published,
       (char_length(body) - char_length(replace(body, 'Update (November 16, 2026)', ''))) / 26 AS n_update_nov16,
       position(chr(13) in body) AS cr_pos,
       right(body, 1) ~ '\s' AS last_char_is_space, updated_at
FROM feed_items
WHERE id = 'd65aee0d-2795-45dd-8332-e965c6937238';

-- S4.UPDATE  (expect: 1 row returned)
UPDATE feed_items
SET body = body || chr(10) || chr(10)
      || 'Update (November 16, 2026): Update 1.1.9.5 from Bungie (checked November 13, 2026) lists the Vault Breaker return run as October 20 to November 10, and that window has passed. For our current placements, see the [meta tier list](/marathon/meta).',
    updated_at = now()
WHERE id = 'd65aee0d-2795-45dd-8332-e965c6937238'
  AND md5(body) = '44d9883bd7bf3810f5806a8b79c28ca4'
  AND is_published
  AND position('Update (November 16, 2026)' in body) = 0
RETURNING id, md5(body) AS new_md5, char_length(body) AS new_len;

-- S4.VERIFY  (expect: md5 9c1262832e54b8acb481d781d0e06ea2, len 3631, cr_pos 0, n_update_nov16 1,
--             updated_at = the time of the run)
SELECT id, md5(body) AS md5, char_length(body) AS len,
       position(chr(13) in body) AS cr_pos,
       (char_length(body) - char_length(replace(body, 'Update (November 16, 2026)', ''))) / 26 AS n_update_nov16,
       updated_at
FROM feed_items
WHERE id = 'd65aee0d-2795-45dd-8332-e965c6937238';
