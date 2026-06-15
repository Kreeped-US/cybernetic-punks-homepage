# DMZ Migration Log

In-repo record of production schema changes applied for the DMZ multi-game refactor.
**There is no migrations framework in this repo** — these SQL statements were applied
**directly in the Supabase SQL editor**. This file is the durable trail.

---

## Step 2 — `feed_items.game_slug` (applied 2026-06-15, Supabase SQL editor)

Adds the game discriminator to `feed_items` and backfills all existing rows to
`'marathon'`. The column is **inert** at this step — no consumer reads `game_slug` yet and
no non-marathon rows exist, so Marathon behavior is unchanged. Reference:
[FEED_ITEMS_AUDIT.md](FEED_ITEMS_AUDIT.md).

```sql
-- (a) add column: NOT NULL + DEFAULT 'marathon' (fills all existing rows atomically)
ALTER TABLE feed_items ADD COLUMN game_slug text NOT NULL DEFAULT 'marathon';

-- (b) explicit backfill (belt-and-suspenders; affected 0 rows because (a) already set them)
UPDATE feed_items SET game_slug = 'marathon' WHERE game_slug IS DISTINCT FROM 'marathon';

-- (c) index for Step 3 game_slug filters
CREATE INDEX IF NOT EXISTS idx_feed_items_game_slug ON feed_items (game_slug);
```

**Pre-write backup:** full JSON snapshot of `feed_items` (1756 rows) at
`C:/Users/justi/feed_items_backup_step2_20260615.json` (count-verified == live before the
write).

**Verification (post-apply):**
- total rows = **1756**; `game_slug='marathon'` = **1756** (== total); `IS NULL` = **0**;
  `!= 'marathon'` = **0**.
- column present, type `text`, **DEFAULT `'marathon'`** (confirmed via PostgREST OpenAPI);
  **NOT NULL**; index **`idx_feed_items_game_slug`** confirmed present (1 row in the SQL
  editor).
- Marathon-unchanged: `/intel` (latest 100) and homepage (latest 25) return the same rows,
  all `game_slug='marathon'`; total `is_published` = 1349 (baseline intact).

**Step-3 open item (do NOT do yet):** once the cron writes `game_slug` explicitly,
**drop the `DEFAULT 'marathon'`** (keep NOT NULL) so a future DMZ insert that omits
`game_slug` **errors** instead of being silently mis-tagged `'marathon'`.
