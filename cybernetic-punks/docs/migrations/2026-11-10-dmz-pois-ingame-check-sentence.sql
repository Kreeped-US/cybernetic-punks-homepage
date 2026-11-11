-- docs/migrations/2026-11-10-dmz-pois-ingame-check-sentence.sql
-- Brief 352. Prepared by Claude, NOT run. Justin runs this in the Supabase SQL editor.
-- dmz_pois: append one dated in-game check sentence to the description of exactly 13 location rows
-- (operator in-game check of region, territory and threat levels, 2026-11-10, Brief 350). hajin-city and every other row are NOT touched.
-- Each addition is appended after one space. Three rows (songdo-wharf, wolves-stadium, hajin-river-heights) also get a
-- "Not individually checked in game" sentence naming the sub-location threat rows that were not checked.
-- Only description and updated_at change. verified, verified_source, source_label and source_url are NOT changed.
-- dmz_pois has no updated_at trigger (HANDOFF), so updated_at = now() is set explicitly.
-- Guard: id + slug + md5 of the current description per row. A changed description matches 0 rows for that id.
-- All 13 current descriptions end with a period and contain no carriage returns, no line feeds and no non-ASCII characters.
-- Plain single-quoted strings, the apostrophe written doubled. No dollar quotes. No semicolons inside any quoted string.
-- Expected per row (after = before || ' ' || addition, simulated offline against the stored descriptions read 2026-11-10):
--   id  slug                    before_chars before_md5                        after_chars after_md5
--   14  chang-san-air-base      400          4db6a67cf6952f68b818d73790102944  629         ccfe71fa526ad5e622cb1bdb09bb23ee
--   21  cheongun-village        448          195b41e7315d6e9e12559bf41a181323  677         3962de2a73764064c7c376b4adad4b49
--   12  haneul-nuclear-reactor  371          57a03fb5e3d98929db0fb4be8ccced56  600         707fb4a7bd0229e831ba99443cc30d38
--   19  deadtown                337          3036283941f370fc8d3027b5297c462e  566         3a6055ba776ededef8c18373663774b4
--   16  14th-political-prison   392          2067c4b962f164f601d5f986af177fd2  621         da1c6ef6b1beae510fd32a081dfa3d5b
--   20  imjin-farmland          340          998da49b0c41d5eaacdf42035ecaec83  569         7d37581a0195159457db654ea69cce86
--   22  mirae-general-hospital  381          dd86d1861a242ccf3515647213bb585f  610         42153f958f2bd878c0b6e03a1b2488ae
--   23  cheonwang-peak-array    259          e1838d9334b0c06227d682a868378b0f  488         4298d1512a6b8b17b5ddf71411fb26a6
--   24  nurigo-mall             359          b4c45b5b7363b82735b20a5a0544a2b0  588         403c4f72f9b1fd287dc2c4d90655502a
--   25  the-grid                463          7f44963e90e48e3ab976c5c2da188de4  692         dd46a67af57f2ea7ebcf51345b9bdfb3
--   26  songdo-wharf            498          34f993950deab657447df70b0a8429de  805         9c65112681194fac160414a700c36221
--   27  wolves-stadium          365          9d76ac15c80f72bedc2be4935ae63f18  637         c91ba09b73b564367c2c90335bc535dd
--   28  hajin-river-heights     382          f53493e42301668bd56a29d080bfdebc  682         892373d0da164c123819db812fdf8521
-- Editor safety (Briefs 336 and 342): run each of the three statements below ALONE (select only that statement, then Run).

-- BEFORE: run this alone. Expected: 13 rows with the before_chars and before_md5 values above.
SELECT id, slug, char_length(description) AS desc_chars, md5(description) AS desc_md5, updated_at FROM dmz_pois WHERE id IN (14, 21, 12, 19, 16, 20, 22, 23, 24, 25, 26, 27, 28) ORDER BY id;

-- UPDATE: run this alone. Expected: UPDATE 13
UPDATE dmz_pois p SET description = p.description || ' ' || v.addition, updated_at = now()
FROM (VALUES
  (14, 'chang-san-air-base', '4db6a67cf6952f68b818d73790102944', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1.'),
  (21, 'cheongun-village', '195b41e7315d6e9e12559bf41a181323', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1.'),
  (12, 'haneul-nuclear-reactor', '57a03fb5e3d98929db0fb4be8ccced56', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1.'),
  (19, 'deadtown', '3036283941f370fc8d3027b5297c462e', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1.'),
  (16, '14th-political-prison', '2067c4b962f164f601d5f986af177fd2', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1.'),
  (20, 'imjin-farmland', '998da49b0c41d5eaacdf42035ecaec83', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1.'),
  (22, 'mirae-general-hospital', 'dd86d1861a242ccf3515647213bb585f', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1.'),
  (23, 'cheonwang-peak-array', 'e1838d9334b0c06227d682a868378b0f', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1.'),
  (24, 'nurigo-mall', 'b4c45b5b7363b82735b20a5a0544a2b0', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1.'),
  (25, 'the-grid', '7f44963e90e48e3ab976c5c2da188de4', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1.'),
  (26, 'songdo-wharf', '34f993950deab657447df70b0a8429de', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1. Not individually checked in game: Oamsik Turtle Island and Shoreline Station.'),
  (27, 'wolves-stadium', '9d76ac15c80f72bedc2be4935ae63f18', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1. Not individually checked in game: Theatre.'),
  (28, 'hajin-river-heights', 'f53493e42301668bd56a29d080bfdebc', 'The site operator checked this location''s region, territory and threat levels in game on November 10, 2026 and found them matching the figures shown here. The description and features on this page are still per Deep Dive Part 1. Not individually checked in game: South Island and Jinseo Park Towers.')
) AS v(id, slug, before_md5, addition)
WHERE p.id = v.id AND p.slug = v.slug AND p.game_slug = 'dmz' AND md5(p.description) = v.before_md5;

-- VERIFY: run this alone. Expected: 13 rows with the after_chars and after_md5 values above, has_check true on all 13, updated_at later than 2026-10-23T16:46:12Z.
SELECT id, slug, char_length(description) AS desc_chars, md5(description) AS desc_md5, updated_at, description LIKE '%in game on November 10, 2026%' AS has_check FROM dmz_pois WHERE id IN (14, 21, 12, 19, 16, 20, 22, 23, 24, 25, 26, 27, 28) ORDER BY id;
