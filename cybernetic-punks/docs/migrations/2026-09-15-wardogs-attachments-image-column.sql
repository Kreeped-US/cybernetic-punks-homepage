-- 2026-09-15-wardogs-attachments-image-column.sql
-- HELD. Operator-run (rule 2). Additive ALTER: adds the image_filename SLOT to the already-created
-- wardogs_attachments table (the base schema, 2026-09-15-wardogs-attachments-schema.sql, was already
-- run WITHOUT this column). Fresh rebuilds get it from the CREATE (the schema file now includes it);
-- this ALTER covers the DB that is already provisioned.
--
-- READY-BUT-NULL (same discipline as the effect columns): this is only the COLUMN (the slot). It is
-- NOT populated here -- the 108 attachment .webp files in public/images/wardogs/ do NOT cleanly
-- auto-map to attachment names, so the operator MATCHES names -> image_filename MANUALLY in a later
-- pass. Auto-guessing a filename would be fabrication. Image DISPLAY stays DORMANT until this column
-- is populated AND a render is wired (a separate future task) -- adding the column changes nothing
-- user-visible.
--
-- SAFE: additive, nullable, IF NOT EXISTS -> re-runnable no-op if already added. No data touched.
-- No effect on the load migration: the load (2026-09-15-wardogs-attachments-load.sql) omits
-- image_filename from its INSERT column list, so every loaded row simply gets image_filename = NULL.

ALTER TABLE wardogs_attachments
  ADD COLUMN IF NOT EXISTS image_filename text;

-- VERIFY (read-only):
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--     WHERE table_name = 'wardogs_attachments' AND column_name = 'image_filename';
--     -- expect: image_filename | text | YES
--   SELECT count(*) FILTER (WHERE image_filename IS NOT NULL) AS with_image,
--          count(*) AS total FROM wardogs_attachments;   -- expect with_image = 0 (dormant)
