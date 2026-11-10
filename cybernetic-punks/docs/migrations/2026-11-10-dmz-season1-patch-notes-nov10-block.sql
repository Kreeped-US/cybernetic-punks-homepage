-- docs/migrations/2026-11-10-dmz-season1-patch-notes-nov10-block.sql
-- Brief 342. Prepared by Claude, NOT run. Justin runs this in the Supabase SQL editor.
-- dmz-season-1-patch-notes-what-changed (feed_items f64ab2b7-82b5-48c4-8fad-782d9e53cd1b): prepend the November 10 Update block
-- (source: operator-pasted text of the official Nov 10 patch notes, summarized) and reword one intro sentence. Nothing else changes.
-- Method: prepend to the stored body plus a targeted replace() of one sentence, not a full-body rewrite.
-- The stored body has 45 carriage returns (CRLF on every line except lines 9 and 10); all of them are kept.
-- The new block is written with CRLF line breaks, like the November 6 block it sits above:
--   replace(..., chr(13), '') strips any carriage return a CRLF checkout or copy adds inside the dollar quotes,
--   then replace(..., chr(10), chr(13) || chr(10)) makes every line break CRLF. One blank line (CRLF CRLF) follows the block.
-- Intro sentence (appears exactly once):
--   old: Everything below the Update is taken from those notes, and we mark where the notes stop short.
--   new: Everything below the November 6 update block is taken from the November 5 notes, and we mark where the notes stop short.
-- The sentence inside the November 6 block ("The rest of this page is taken from the patch notes.") is NOT changed.
-- Guard: id + slug + md5 of the current body. If the body has changed since 2026-11-10 the UPDATE matches 0 rows and changes nothing.
-- feed_items has a BEFORE UPDATE trigger on body, so updated_at moves on its own; it is not set here. verified_source is not changed.
-- Expected before: 4738 characters, md5 3fc0eec1ff8ed47ed3fc8932b71f589f.
-- Expected after:  6437 characters, md5 2203e04ea80d0de2441f138cab84639c.
-- Editor safety (Brief 336): run each of the three statements below ALONE (select only that statement, then Run).

-- BEFORE: run this alone. Expected: 1 row, body_chars 4738, body_md5 3fc0eec1ff8ed47ed3fc8932b71f589f, old_intro_present true, has_nov10 false.
SELECT id, slug, char_length(body) AS body_chars, md5(body) AS body_md5, updated_at, body LIKE '%Everything below the Update is taken%' AS old_intro_present, body LIKE '%Update, November 10, 2026%' AS has_nov10 FROM feed_items WHERE id = 'f64ab2b7-82b5-48c4-8fad-782d9e53cd1b';

-- UPDATE: run this alone. Expected: UPDATE 1
UPDATE feed_items SET body = replace(replace($s1pn_nov10_20261110$**Update, November 10, 2026: what the November 10 notes change in DMZ**

Call of Duty's November 10 patch notes include a DMZ section. This summary is based on the notes' text; we have not tested any of it in game.

- Scavenger Bonus: the notes say players who fail to exfil now get cash based on the value of the items they looted and their total deployment time. The notes say it does not apply to Story Missions. They give no rate or formula, so we cannot say how much cash it pays.
- UAVs and Advanced UAVs: in the X01 adjustments, the notes say their duration and range are significantly reduced. The notes also say the Mini Tracker Trait's radius is slightly reduced. No numbers are given for any of these.
- Gameplay fixes listed: a floating Crude Diethyl Ether component in the Chemical Denial Dynamic Operation; enemy AI getting stuck in a vehicle's passenger seat; explosions under a departing Exfil Helicopter sometimes damaging players onboard; a Wheelson Commander turret that kept tracking its target after being DDoS'd; and three X01 issues (exfil blocked through the crank gate elevator shaft in the Power Generators area, players getting stuck in the Vault Elevator, and eliminated players' bodies falling through the ground in the Deep Vault).
- Also addressed: Platinum camo challenges not tracking for the Cronen Osprey and CSG-35, a Map Voting problem when only two maps were available, and headshots not tracking for the Sniper BlackCell camo challenge.

Source: Call of Duty, Modern Warfare 4 Season 1 patch notes, November 10, 2026 update: https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes$s1pn_nov10_20261110$, chr(13), ''), chr(10), chr(13) || chr(10)) || chr(13) || chr(10) || chr(13) || chr(10) || replace(body, $s1pn_nov10_20261110$Everything below the Update is taken from those notes, and we mark where the notes stop short.$s1pn_nov10_20261110$, $s1pn_nov10_20261110$Everything below the November 6 update block is taken from the November 5 notes, and we mark where the notes stop short.$s1pn_nov10_20261110$)
WHERE id = 'f64ab2b7-82b5-48c4-8fad-782d9e53cd1b' AND slug = 'dmz-season-1-patch-notes-what-changed' AND md5(body) = '3fc0eec1ff8ed47ed3fc8932b71f589f';

-- VERIFY: run this alone. Expected: body_chars 6437, body_md5 2203e04ea80d0de2441f138cab84639c, has_nov10 true, intro_new true, intro_old_gone true, updated_at later than 2026-11-06T14:19:22Z.
SELECT id, char_length(body) AS body_chars, md5(body) AS body_md5, updated_at, body LIKE '%Update, November 10, 2026%' AS has_nov10, body LIKE '%below the November 6 update block%' AS intro_new, body NOT LIKE '%below the Update is taken%' AS intro_old_gone FROM feed_items WHERE id = 'f64ab2b7-82b5-48c4-8fad-782d9e53cd1b';
