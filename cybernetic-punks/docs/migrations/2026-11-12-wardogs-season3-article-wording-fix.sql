-- 2026-11-12-wardogs-season3-article-wording-fix.sql
-- Brief 364. Replaces one stale sentence pair in the live Season 3 article body (feed_items 5a4d5cf6-0c4e-4028-952a-33895dbba480).
-- NOT RUN by the executor. The operator runs each block alone in the Supabase SQL editor, in order: BEFORE, UPDATE, VERIFY.
-- Each statement is on ONE line, so no multi-line text is pasted. Only body and updated_at change.
-- Guard: the row is live (is_published true), not rejected, and its body is exactly 12838 chars with md5 21f90201130ab2b1662865401528db9e.
-- Expected after: 12829 chars, md5 7f9c0d635a591595a26983cbf8d144d2, body_cr_pos 0, everything else unchanged. A second run updates 0 rows.
-- Editor safety: no dollar quotes, no semicolons inside quoted strings, a semicolon only at the end of each statement. LF line endings.

-- BEFORE: run this alone. Expect 1 row: 12838 chars, md5 21f90201130ab2b1662865401528db9e, cr_pos 0, is_published true, rejected false, noindex false.
SELECT id, slug, char_length(body) AS body_chars, md5(body) AS body_md5, position(chr(13) in body) AS body_cr_pos, is_published, rejected, noindex, operator_approved_at, updated_at FROM feed_items WHERE id = '5a4d5cf6-0c4e-4028-952a-33895dbba480';

-- UPDATE: run this alone. Expect UPDATE 1 (UPDATE 0 means a guard failed: stop and report).
UPDATE feed_items SET body = replace(body, 'Season 3 goes live on November 12 after a scheduled maintenance window from 13:00 to 15:00 UTC, which Bulkhead estimates at roughly 2 hours of downtime. Everything below is what the notes say, and none of it is in the game until the update goes live.', 'Bulkhead scheduled Season 3 to go live on November 12 after a maintenance window from 13:00 to 15:00 UTC, which it estimated at roughly 2 hours of downtime. Everything below is what the notes say, and we have not checked each change in game.'), updated_at = now() WHERE id = '5a4d5cf6-0c4e-4028-952a-33895dbba480' AND game_slug = 'wardogs' AND patch_key = 'steam:1867240:1794419963' AND is_published = true AND rejected = false AND char_length(body) = 12838 AND md5(body) = '21f90201130ab2b1662865401528db9e';

-- VERIFY: run this alone. Expect 1 row: body_chars 12829, body_md5 7f9c0d635a591595a26983cbf8d144d2, body_cr_pos 0, is_published true, noindex false, patch_key steam:1867240:1794419963, updated_at moved, has_new above 0, has_old 0.
SELECT id, slug, char_length(body) AS body_chars, md5(body) AS body_md5, position(chr(13) in body) AS body_cr_pos, is_published, noindex, patch_key, updated_at, position('scheduled Season 3 to go live' in body) AS has_new, position('none of it is in the game' in body) AS has_old FROM feed_items WHERE id = '5a4d5cf6-0c4e-4028-952a-33895dbba480';
