-- docs/migrations/2026-11-10-dmz-survival-scavenger-bonus-update.sql
-- Brief 342. Prepared by Claude, NOT run. Justin runs this in the Supabase SQL editor.
-- dmz-survival (feed_items 18f04b28-71c0-4603-b5a5-1fed5c9e05b7): add one dated Update line (Nov 10 patch notes, Scavenger Bonus). Nothing else changes.
-- The article has no Update lines yet. Placement follows the convention on dmz-vs-warzone: after the last body paragraph
-- ("DMZ launched October 23, 2026 ... Vault Edition.") and before the Sources line, separated by blank lines.
-- Method: a targeted replace() at the unique anchor "Vault Edition." + blank line + "Sources: ", not a full-body rewrite.
-- The stored body has 0 carriage returns (LF only); the inserted line breaks are chr(10), so it stays LF-only.
-- Guard: id + slug + md5 of the current body. If the body has changed since 2026-11-10 the UPDATE matches 0 rows and changes nothing.
-- feed_items has a BEFORE UPDATE trigger on body, so updated_at moves on its own; it is not set here. verified_source is not changed.
-- Expected before: 3526 characters, md5 7353a246d1fd23b2d87ee0256d1e5697.
-- Expected after:  3834 characters, md5 374360b214319e2de53bf14bbc501ac5.
-- Editor safety (Brief 336): run each of the three statements below ALONE (select only that statement, then Run).

-- BEFORE: run this alone. Expected: 1 row, body_chars 3526, body_md5 7353a246d1fd23b2d87ee0256d1e5697, has_update false.
SELECT id, slug, char_length(body) AS body_chars, md5(body) AS body_md5, updated_at, body LIKE '%Update (November 10, 2026)%' AS has_update FROM feed_items WHERE id = '18f04b28-71c0-4603-b5a5-1fed5c9e05b7';

-- UPDATE: run this alone. Expected: UPDATE 1
UPDATE feed_items SET body = replace(body, 'Vault Edition.' || chr(10) || chr(10) || 'Sources: ', 'Vault Edition.' || chr(10) || chr(10) || $surv_nov10_20261110$Update (November 10, 2026): Call of Duty's November 10 patch notes say players who fail to exfil now get cash based on the value of the items they looted and their total deployment time, and that this does not apply to Story Missions. No rate is given. The rest of this page was written before that change.$surv_nov10_20261110$ || chr(10) || chr(10) || 'Sources: ')
WHERE id = '18f04b28-71c0-4603-b5a5-1fed5c9e05b7' AND slug = 'dmz-survival' AND md5(body) = '7353a246d1fd23b2d87ee0256d1e5697';

-- VERIFY: run this alone. Expected: body_chars 3834, body_md5 374360b214319e2de53bf14bbc501ac5, has_update true, has_no_rate true, updated_at later than 2026-10-23T22:11:35Z.
SELECT id, char_length(body) AS body_chars, md5(body) AS body_md5, updated_at, body LIKE '%Update (November 10, 2026)%' AS has_update, body LIKE '%No rate is given.%' AS has_no_rate FROM feed_items WHERE id = '18f04b28-71c0-4603-b5a5-1fed5c9e05b7';
