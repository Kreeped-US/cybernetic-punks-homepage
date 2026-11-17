-- docs/migrations/2026-11-16-dmz-season1-patch-notes-nov16-block.sql
-- Brief 395 (prepared 2026-11-16). OPERATOR-RUN in the Supabase SQL editor. NOT run by the executor.
--
-- DMZ Season 1 patch notes article: prepend a dated November 16 Update block and scope one sentence.
-- Row: feed_items f64ab2b7-82b5-48c4-8fad-782d9e53cd1b, slug dmz-season-1-patch-notes-what-changed (game_slug dmz).
-- Source for the new block: the November 16, 2026 entry of the official Call of Duty Modern Warfare 4
-- Season 1 patch notes, https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes
-- (text pasted by the operator on 2026-11-16 at 15:35 PT. The executor did not fetch the page.)
--
-- ONE UPDATE, two changes:
--   (1) prepend the new block (header, intro, seven bullets, inline Source line), then one blank line,
--       before the existing first line (the bold November 10 Update header).
--   (2) scope one sentence in the Events section (it occurs exactly once):
--       old: The one DMZ event named in the notes is Threat Briefing: Battle Tank.
--       new: The one DMZ event named in the November 5 notes is Threat Briefing: Battle Tank.
-- Nothing else in the body changes: the November 10 and November 6 blocks, the intro paragraph, every
-- other section and the Sources paragraph stay byte-identical.
--
-- HOW TO RUN: three blocks, BEFORE, UPDATE, VERIFY. Run each block on its own (select it, then Run).
-- The UPDATE must return exactly 1 row. If it returns 0 rows, STOP: the body is not the reviewed one,
-- the row is not published, or the edit is already applied. Running the UPDATE a second time returns 0 rows.
--
-- RULES THIS FILE FOLLOWS: ASCII only, LF line endings, no dollar quotes, no semicolon inside any quoted
-- string, no apostrophe inside any literal. Every literal sits on one line. Line breaks in the stored
-- text are built only from chr(13) || chr(10) (CRLF), never copied from this file, so a CRLF checkout
-- of this file cannot change the result. CRLF is intended: the stored body is CRLF everywhere except
-- one LF-only blank line (offsets 3156-3157 today), which this file does not touch. VERIFY shows cr_pos > 0.
--
-- GUARDS on the UPDATE: id, slug, md5(body) equal to the body read on 2026-11-16 (Briefs 394 and 395),
-- is_published, the November 16 block not already present, and the unscoped sentence still present.
-- updated_at is set to now() explicitly (the feed_items set_updated_at trigger also fires on a body
-- change). Nothing else changes: created_at, headline, slug, tags, source, source_url, verified_source,
-- verified_source_url, provenance_tier, noindex, gate_status and operator_approved_at stay as they are.
--
-- EFFECT: the visible article date (created_at, November 5, 2026) does not change. updated_at, JSON-LD
-- dateModified and the sitemap-dmz.xml lastmod move for this one URL only.
--
-- Expected values below come from the executor PGlite replay (Brief 395) on a copy of the live row.


-- BEFORE  (expect: 1 row, md5 2203e04ea80d0de2441f138cab84639c, len 6437, is_published true, cr_pos 72,
--          n_old_sentence 1, n_update_nov16 0, n_nov5_scoped 0, starts_nov10 true)
SELECT id, slug, md5(body) AS md5, char_length(body) AS len, is_published,
       position(chr(13) in body) AS cr_pos,
       (char_length(body) - char_length(replace(body, 'The one DMZ event named in the notes is Threat Briefing: Battle Tank.', ''))) / 69 AS n_old_sentence,
       (char_length(body) - char_length(replace(body, 'Update, November 16, 2026', ''))) / 25 AS n_update_nov16,
       (char_length(body) - char_length(replace(body, 'named in the November 5 notes', ''))) / 29 AS n_nov5_scoped,
       left(body, 71) = '**Update, November 10, 2026: what the November 10 notes change in DMZ**' AS starts_nov10,
       updated_at
FROM feed_items
WHERE id = 'f64ab2b7-82b5-48c4-8fad-782d9e53cd1b';

-- UPDATE  (expect: 1 row returned, new_md5 5e9816aee67da5ba48c6cd31f282e660, new_len 8443)
UPDATE feed_items
SET body =
      '**Update, November 16, 2026: what the November 16 notes change in DMZ**'
      || chr(13) || chr(10) || chr(13) || chr(10)
      || 'The Call of Duty November 16 patch notes entry includes DMZ and Global sections. This summary is based on the text of the notes. We have not tested any of it in game.'
      || chr(13) || chr(10) || chr(13) || chr(10)
      || '- Lieutenant Dog Tag cash: the notes say Lieutenant Dog Tag cash rewards are now awarded to all squad members. They give no amounts.'
      || chr(13) || chr(10)
      || '- UAV Upgrade Pro Trait: the notes say its Minimap zoom-out effect is reduced from 3x to 1.5x.'
      || chr(13) || chr(10)
      || '- Wheelson and Viper Sense: the notes list as fixed an issue where the Wheelson in X01 could target players protected by the Viper Sense Trait.'
      || chr(13) || chr(10)
      || '- Plate Pouch and Plate Organization: the notes list as fixed an issue where the two Traits stacked could show nine plates instead of the expected ten.'
      || chr(13) || chr(10)
      || '- Other DMZ fixes listed: loot from destroyed Death Stalker wreckage that could not be pinged, a weapon exfilled in the Backpack Weapon slot that could fail to equip on the next deployment, bomb sites in Dynamic Operations that could stay interactable, weapon stats hidden in the Gunsmith and weapon-select screens, wrong Blueprint names in the Backpack, Operators briefly appearing to fall out of the Exfil Helicopter before the After Action Report, Threat Briefing event rewards showing the wrong rarity colors, and the Chained camo challenge showing a zero-kill requirement.'
      || chr(13) || chr(10)
      || '- Global: the notes list as fixed execution previews missing elements in DMZ or Warzone. They also list Joint Fire under Global events, running 24 hours every Friday through Season 1, with an incorrect end time display fixed. We have not treated Joint Fire as a DMZ event.'
      || chr(13) || chr(10)
      || '- Live issue: the notes say the studio has received many reports of Loadouts resetting match over match or between logins, and that it is investigating. They give no cause or fix.'
      || chr(13) || chr(10) || chr(13) || chr(10)
      || 'Source: Call of Duty, Modern Warfare 4 Season 1 patch notes, November 16, 2026 entry: https://www.callofduty.com/patchnotes/2026/11/call-of-duty-modern-warfare-4-season-1-patch-notes'
      || chr(13) || chr(10) || chr(13) || chr(10)
      || replace(body,
           'The one DMZ event named in the notes is Threat Briefing: Battle Tank.',
           'The one DMZ event named in the November 5 notes is Threat Briefing: Battle Tank.'),
    updated_at = now()
WHERE id = 'f64ab2b7-82b5-48c4-8fad-782d9e53cd1b'
  AND slug = 'dmz-season-1-patch-notes-what-changed'
  AND md5(body) = '2203e04ea80d0de2441f138cab84639c'
  AND is_published
  AND position('Update, November 16, 2026' in body) = 0
  AND position('The one DMZ event named in the notes is' in body) > 0
RETURNING id, md5(body) AS new_md5, char_length(body) AS new_len;

-- VERIFY  (expect: md5 5e9816aee67da5ba48c6cd31f282e660, len 8443, cr_pos 72 (> 0, CRLF is intended),
--          n_update_nov16 1, n_nov5_scoped 1, n_unscoped 0, updated_at = the time of the run)
SELECT id, md5(body) AS md5, char_length(body) AS len,
       position(chr(13) in body) AS cr_pos,
       (char_length(body) - char_length(replace(body, 'Update, November 16, 2026', ''))) / 25 AS n_update_nov16,
       (char_length(body) - char_length(replace(body, 'named in the November 5 notes', ''))) / 29 AS n_nov5_scoped,
       (char_length(body) - char_length(replace(body, 'named in the notes is', ''))) / 21 AS n_unscoped,
       updated_at
FROM feed_items
WHERE id = 'f64ab2b7-82b5-48c4-8fad-782d9e53cd1b';
