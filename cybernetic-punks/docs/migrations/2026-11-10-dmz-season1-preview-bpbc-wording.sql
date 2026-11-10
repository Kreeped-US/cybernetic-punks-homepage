-- docs/migrations/2026-11-10-dmz-season1-preview-bpbc-wording.sql
-- Brief 336 (with amendment). Prepared by Claude, NOT run. Justin runs this in the Supabase SQL editor.
-- dmz-season-1-what-has-been-announced: replace the Battle Pass and BlackCell carry sentence under What carries across. Nothing else changes.
-- Method: a targeted replace() of that one sentence, not a full-body rewrite. The current body contains 10 carriage returns
-- (mixed line endings); a full body pasted from a CRLF checkout could not reproduce them, so every other character is left as stored.
-- Old sentence (appears exactly once): The Warzone post says Battle Pass and BlackCell progress carries into Warzone.
-- New text: The post mentions Battle Pass and BlackCell progress in the context of earning rewards across Multiplayer, DMZ and Warzone; it does not state which way progress carries. (Corrected November 10, 2026: an earlier version said this progress carries into Warzone, which the post does not say.)
-- Guard: id + slug + md5 of the current body. If the body has changed since 2026-11-10 the UPDATE matches 0 rows and changes nothing.
-- feed_items has a BEFORE UPDATE trigger on body, so updated_at moves on its own; it is not set here. verified_source is not changed.
-- No dated Update line is added: this article uses a bold Update block (**Update, November 5, 2026**), not Update (date): lines.
-- The correction note is carried inside the new text instead.

-- BEFORE (expected: 1 row, body_chars 3698, body_md5 b1c6e27bc1e686f58ea99f6ae9c41f50, old_count 1, corrected_count 0)
SELECT id, slug, char_length(body) AS body_chars, md5(body) AS body_md5, (char_length(body) - char_length(replace(body, $s1_bpbc_20261110$The Warzone post says Battle Pass and BlackCell progress carries into Warzone.$s1_bpbc_20261110$, ''))) / char_length($s1_bpbc_20261110$The Warzone post says Battle Pass and BlackCell progress carries into Warzone.$s1_bpbc_20261110$) AS old_count, (char_length(body) - char_length(replace(body, $s1_bpbc_20261110$(Corrected November 10, 2026$s1_bpbc_20261110$, ''))) / char_length($s1_bpbc_20261110$(Corrected November 10, 2026$s1_bpbc_20261110$) AS corrected_count, updated_at FROM feed_items WHERE id = 'edea9395-68c9-4385-9d06-76cd69b300e0';

UPDATE feed_items SET body = replace(body, $s1_bpbc_20261110$The Warzone post says Battle Pass and BlackCell progress carries into Warzone.$s1_bpbc_20261110$, $s1_bpbc_20261110$The post mentions Battle Pass and BlackCell progress in the context of earning rewards across Multiplayer, DMZ and Warzone; it does not state which way progress carries. (Corrected November 10, 2026: an earlier version said this progress carries into Warzone, which the post does not say.)$s1_bpbc_20261110$)
WHERE id = 'edea9395-68c9-4385-9d06-76cd69b300e0' AND slug = 'dmz-season-1-what-has-been-announced' AND md5(body) = 'b1c6e27bc1e686f58ea99f6ae9c41f50';
-- expected: UPDATE 1

-- VERIFY (expected: body_chars 3909, body_md5 3f3cab0b0589ec9625dae956af477c27, old_gone true, new_present true, corrected_count 1, prestige_kept true, updated_at later than 2026-11-06T15:46:58Z)
SELECT id, char_length(body) AS body_chars, md5(body) AS body_md5, updated_at, body NOT LIKE '%progress carries into Warzone.%' AS old_gone, strpos(body, $s1_bpbc_20261110$The post mentions Battle Pass and BlackCell progress in the context of earning rewards across Multiplayer, DMZ and Warzone; it does not state which way progress carries. (Corrected November 10, 2026: an earlier version said this progress carries into Warzone, which the post does not say.)$s1_bpbc_20261110$) > 0 AS new_present, (char_length(body) - char_length(replace(body, $s1_bpbc_20261110$(Corrected November 10, 2026$s1_bpbc_20261110$, ''))) / char_length($s1_bpbc_20261110$(Corrected November 10, 2026$s1_bpbc_20261110$) AS corrected_count, body LIKE '%Player Level resets with optional Prestige across Multiplayer, DMZ, and Warzone.%' AS prestige_kept FROM feed_items WHERE id = 'edea9395-68c9-4385-9d06-76cd69b300e0';
