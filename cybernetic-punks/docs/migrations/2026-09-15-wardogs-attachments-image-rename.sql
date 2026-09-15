-- 2026-09-15-wardogs-attachments-image-rename.sql
-- HELD. Operator-run (rule 2). Repoints 4 attachment image_filename values at RENAMED files.
--
-- WHY: 4 image files had prod-serving-unsafe names that would 404 on Vercel even once committed:
--   ".45 acp pistol compensator.webp"  + ".50 cal heavy suppressor.webp"  -> LEADING DOT (Vercel
--      treats dot-prefixed files as dotfiles and does NOT serve them).
--   "12 gauge suppressor.webp" + "2.5x combat optic.webp"                 -> SPACES (fragile).
-- The files were renamed to safe names (no leading dot, spaces -> hyphens) and committed. This
-- UPDATE points the DB rows at the new names so the render resolves them. Run AFTER deploying the
-- committed images. Idempotent (re-run safe); only these 4 rows change.

UPDATE wardogs_attachments SET image_filename = '45-acp-pistol-compensator.webp'
  WHERE game_slug = 'wardogs' AND name = '.45 ACP Pistol Compensator';
UPDATE wardogs_attachments SET image_filename = '50-cal-heavy-suppressor.webp'
  WHERE game_slug = 'wardogs' AND name = '.50 Cal Heavy Suppressor';
UPDATE wardogs_attachments SET image_filename = '12-gauge-suppressor.webp'
  WHERE game_slug = 'wardogs' AND name = '12 Gauge Suppressor';
UPDATE wardogs_attachments SET image_filename = '2.5x-combat-optic.webp'
  WHERE game_slug = 'wardogs' AND name = '2.5x Combat Optic';

-- VERIFY (read-only):
--   SELECT name, image_filename FROM wardogs_attachments
--     WHERE game_slug='wardogs' AND name IN
--       ('.45 ACP Pistol Compensator','.50 Cal Heavy Suppressor','12 Gauge Suppressor','2.5x Combat Optic');
--   -- expect the 4 hyphenated, no-leading-dot filenames above.
--   -- And confirm NO image_filename still has a leading dot or a space:
--   SELECT name, image_filename FROM wardogs_attachments
--     WHERE game_slug='wardogs' AND (image_filename LIKE '.%' OR image_filename LIKE '% %');  -- expect 0 rows
