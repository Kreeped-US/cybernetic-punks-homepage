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

---

## Step 3 / Batch C2 — game-aware `get_related_articles` RPC (applied 2026-06-15, Supabase SQL editor)

Makes the related-articles DB function game-aware so a Marathon article surfaces only
Marathon suggestions (and later a DMZ article surfaces DMZ ones). Called from
`app/intel/[slug]/page.js:1304`; the app-side fallback read there was already game-scoped in
Batch A. Two DDL statements were applied, in order:

**(1) `CREATE OR REPLACE FUNCTION` — add the game scope.** Exactly two additions to the
existing function body, everything else verbatim (`LANGUAGE plpgsql`, `ce_score real`,
`p_limit` keeps its default, the original relevance expression / ordering / `is_published`
+ self-exclusion + `tags && p_tags` overlap filter all unchanged):
- new **last** parameter `p_game_slug text DEFAULT 'marathon'` (Option A — keeps existing
  call shapes working; the default is a rollout/safety net only);
- new `WHERE` predicate `AND <feed_items alias>.game_slug = p_game_slug`.

**(2) `DROP FUNCTION` — remove the stale overload (REQUIRED).** `CREATE OR REPLACE` with a
new 4th parameter does **not** replace the old function — it creates a *second* overload.
The old 3-arg signature lingered, so any 3-named-arg call (`p_article_id, p_tags, p_limit`)
matched **both** the old function and the new one (via its default) → PostgREST
`Could not choose the best candidate function`. This briefly degraded production
related-articles (the deployed 3-arg caller errored and fell through to the generic recent
fallback). Dropping the old overload resolves it.

**Verbatim applied SQL** (full record — the two NEW lines are `p_game_slug` in the signature
and `f.game_slug = p_game_slug` in the `WHERE`; everything else is the original body):

```sql
-- (1) applied first -- add the game scope (two additions, body otherwise verbatim)
CREATE OR REPLACE FUNCTION public.get_related_articles(p_article_id uuid, p_tags text[], p_limit integer DEFAULT 4, p_game_slug text DEFAULT 'marathon')
 RETURNS TABLE(id uuid, headline text, slug text, editor text, tags text[], ce_score real, created_at timestamp with time zone, thumbnail text, relevance_score integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT f.id, f.headline, f.slug, f.editor, f.tags, f.ce_score, f.created_at, f.thumbnail,
    (SELECT COUNT(*)::int FROM unnest(f.tags) t WHERE t = ANY(p_tags)) AS relevance_score
  FROM feed_items f
  WHERE f.id != p_article_id AND f.is_published = true AND f.game_slug = p_game_slug AND f.tags && p_tags
  ORDER BY relevance_score DESC, f.created_at DESC
  LIMIT p_limit;
END;
$function$;

-- (2) applied second -- drop the stale 3-arg overload left behind by (1)
DROP FUNCTION IF EXISTS public.get_related_articles(uuid, text[], integer);
```

**Coupled app-side edit:** `app/intel/[slug]/page.js:1304` now passes `p_game_slug:
'marathon'` explicitly (committed in the C2 commit). Constant now → cron's per-game target
later (see HANDOFF parameterization-pending list).

**Verification (post-apply, both DDLs):**
- **Exactly one definition remains** — a 3-arg call resolves cleanly (no ambiguity error).
- **3-arg (old shape, via default) and 4-arg (explicit) both work and are identical** across
  6 test articles (6/6/6/0/6/6 rows; the 0 is a legit no-tag-overlap article).
- **Baseline reproduced by both shapes** — article `0c8d6864…` → 6 rows, first row
  `490a255c…`, `relevance_score=4`, columns unchanged (`id, headline, slug, editor, tags,
  ce_score, created_at, thumbnail, relevance_score`).
- **Production restored** — the deployed 3-arg caller returns 6 tag-relevant rows (top
  relevance 4) instead of falling through to the generic fallback.
