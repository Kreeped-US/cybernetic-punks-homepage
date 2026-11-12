-- 2026-11-11-wardogs-season3-article-strip-cr.sql
-- Brief 361. Removes the 103 carriage returns stored in the Season 3 article body (feed_items 5a4d5cf6-0c4e-4028-952a-33895dbba480).
-- NOT RUN by the executor. The operator runs each block alone in the Supabase SQL editor, in order: BEFORE, UPDATE, VERIFY.
-- Each statement is on ONE line, so no multi-line text is pasted. Only body and updated_at change.
-- Guard: the row is still unpublished and not rejected, and its body is exactly the CRLF copy (12941 chars, md5 2ba9089f43c20e048fa9c1a8266b6286).
-- Expected after: 12838 chars, md5 21f90201130ab2b1662865401528db9e, body_cr_pos 0, everything else unchanged. A second run updates 0 rows.
-- Editor safety: no dollar quotes, no semicolons inside quoted strings, a semicolon only at the end of each statement. LF line endings.

-- BEFORE: run this alone. Expect 1 row: 12941 chars, md5 2ba9089f43c20e048fa9c1a8266b6286, cr_pos 33, is_published false, rejected false.
SELECT id, slug, char_length(body) AS body_chars, md5(body) AS body_md5, position(chr(13) in body) AS body_cr_pos, is_published, rejected, updated_at FROM feed_items WHERE id = '5a4d5cf6-0c4e-4028-952a-33895dbba480';

-- UPDATE: run this alone. Expect UPDATE 1 (UPDATE 0 means a guard failed: stop and report).
UPDATE feed_items SET body = replace(body, chr(13), ''), updated_at = now() WHERE id = '5a4d5cf6-0c4e-4028-952a-33895dbba480' AND game_slug = 'wardogs' AND patch_key = 'steam:1867240:1794419963' AND is_published = false AND rejected = false AND char_length(body) = 12941 AND md5(body) = '2ba9089f43c20e048fa9c1a8266b6286';

-- VERIFY: run this alone. Expect 1 row: body_chars 12838, body_md5 21f90201130ab2b1662865401528db9e, body_cr_pos 0, is_published false, rejected false, noindex false, gate_status clear, patch_key steam:1867240:1794419963, updated_at moved.
SELECT id, slug, char_length(body) AS body_chars, md5(body) AS body_md5, position(chr(13) in body) AS body_cr_pos, is_published, rejected, noindex, gate_status, patch_key, updated_at FROM feed_items WHERE id = '5a4d5cf6-0c4e-4028-952a-33895dbba480';
