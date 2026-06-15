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
→ **CLOSED** by Step 3 / Batch B2 below.

---

## Step 3 / Batch B2 — drop `feed_items.game_slug` DEFAULT (applied 2026-06-15, Supabase SQL editor)

Removes the column default so a forgotten `game_slug` on insert **fails loud** instead of
silently defaulting to `'marathon'` — protects future DMZ content from being mis-tagged as
Marathon. **NOT NULL is retained.** Safe to apply only because Batch B1 (commit `cfedc66`)
made the sole code insert path (`app/api/cron/route.js:411`) set `game_slug='marathon'`
explicitly; the manual/catch-up insert procedure also sets it. This **closes the Step-2
open item** above.

```sql
-- drop the default; KEEP NOT NULL (do not drop the constraint)
ALTER TABLE feed_items ALTER COLUMN game_slug DROP DEFAULT;
```

**Verification (post-apply):**
- **Deliberate insert omitting `game_slug` → REJECTED** with Postgres `23502`
  *(null value in column "game_slug" ... violates not-null constraint)*. This proves both:
  the **DEFAULT is gone** (no fallback fired) **and NOT NULL is intact** (the null was
  rejected). No row was created (error pre-write); cleanup deleted 0 rows.
- Data integrity unchanged: total = **1756**; `game_slug='marathon'` = **1756**; `IS NULL`
  = **0**; `!= 'marathon'` = **0**. (Dropping a default does not alter stored rows.)
- **B1+B2 consistency proof (pending):** the next real cron insert succeeding — with no
  default present — confirms B1 correctly sets `game_slug` on every produced article.
