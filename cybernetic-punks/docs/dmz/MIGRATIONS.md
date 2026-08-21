# DMZ Migration Log

In-repo record of production schema changes applied for the DMZ multi-game refactor.
**There is no migrations framework in this repo** — these SQL statements were applied
**directly in the Supabase SQL editor**. This file is the durable trail.

---

## network_account.games_interested -- Ruling 3 onboarding intent column (APPLIED 2026-08-21, Supabase SQL editor)

Ruling 3 (onboarding) Stage 1: a lightweight cross-game signup-intent column on the identity
spine -- which games a new user is here for, captured at signup. ADDITIVE (one ALTER, no
existing column touched). Multi-select and fully skippable: default '{}' (empty array) IS the
"skipped / not yet set" state. Bare text[] with NO CHECK / NO FK -- matches the network-wide
convention that game_slug is an unconstrained text discriminator (feed_items.game_slug and
game_profile.game_slug are bare text; there is no games table to FK to). Allowed values
('marathon' | 'dmz') are validated at the app write path, the same discipline as
player_profiles.signup_intent's validIntents check -- so adding a game stays a one-line
ROOT_GAMES change, never a CHECK-constraint ALTER. This is the LIGHTWEIGHT intent signal, NOT
the per-game career: game_profile remains the future home for per-game presence/progression.
Design: docs/network/network-identity-schema-design.md (section 1).

**STATUS: APPLIED 2026-08-21 (operator-run, Supabase SQL editor). Column verified live:
`games_interested | ARRAY | NO | '{}'::text[]`. Read/write code is DEFERRED to Ruling 3
Stage 3 -- nothing reads or writes it yet; the column is inert on apply.**

```sql
-- network_account.games_interested: cross-game signup intent (Ruling 3 onboarding).
ALTER TABLE public.network_account
  ADD COLUMN IF NOT EXISTS games_interested text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.network_account.games_interested IS
  'Ruling 3 onboarding: cross-game signup intent (which games the user is here for). Multi-select, fully skippable; default {} = skipped/not-set. Bare text[]; allowed values (marathon|dmz) validated at the app write path, unconstrained at the DB to match the game_slug discriminator convention.';
```

**Verify SELECTs (run after):**
```sql
-- column shape (expect: games_interested | ARRAY | NO | '{}'::text[])
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'network_account' AND column_name = 'games_interested';
-- column comment landed
SELECT col_description('public.network_account'::regclass, ordinal_position) AS col_comment, column_name
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'network_account' AND column_name = 'games_interested';
```

---

## saved_build -- thin per-account build bookmarks (APPLIED 2026-08-07, Supabase SQL editor)

The premium substrate (docs/MONETIZATION_AND_IDENTITY_STRATEGY.md), the last launch-critical
identity item. A saved build is a THIN bookmark of a canonical build by `weapon_slug` -- keyed on
`(account_id, game_slug, build_ref)`, NOT a `game_profile` row, NOT a custom loadout/payload, NO
premium logic. Game-agnostic (a `game_slug` column) though DMZ is the only writer today.
`saved_source_version` snapshots the build's `source_updated_at` at save time so a future premium
desk can re-resolve `build_ref` and detect "your saved build changed since you saved it" -- without
any premium code existing now. RLS service-role-only (private saves; anon reads 0, same posture as
`network_account`). This also sets RLS explicitly from row zero, closing the audit's "verify
`build`/`game_profile`/`subscription` RLS before they hold data" for this new table.

**STATUS: APPLIED 2026-08-07 (operator-run, Supabase SQL editor). Feature merged (6f1f89d):
app/api/dmz/saved-builds, SaveBuildButton, /dmz/builds/saved -- live.**

**VERIFIED PRIVATE (RLS):** `relrowsecurity = true`; the only policy is `saved_build_service_all`
(FOR ALL, role `service_role`, no anon/authenticated policy); the ANON role reads 0 rows
(`SET ROLE anon` -> count 0); both COMMENTs (table + `saved_source_version`) landed. So `saved_build`
is service-role-only by construction from row zero -- this closes the auth audit's "verify
`build`/`game_profile`/`subscription` RLS before they hold data" for THIS table. (The other three
empty identity tables still merit the same check before they hold data -- unchanged.)

```sql
-- saved_build: thin per-account build bookmarks (the premium substrate).
CREATE TABLE public.saved_build (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES public.network_account(id) ON DELETE CASCADE,
  game_slug             text NOT NULL,
  build_ref             text NOT NULL,                 -- the weapon_slug (re-resolvable canonical build)
  saved_at              timestamptz NOT NULL DEFAULT now(),
  saved_source_version  timestamptz,                   -- snapshot of dmz_weapon_builds.source_updated_at at save time
  UNIQUE (account_id, game_slug, build_ref)            -- no dup saves; POST is idempotent on this
);

CREATE INDEX saved_build_account_game_idx ON public.saved_build (account_id, game_slug);

COMMENT ON TABLE public.saved_build IS
  'Thin per-account build bookmarks (the premium substrate). (account_id, game_slug, build_ref=weapon_slug); NOT a game_profile row and NOT a custom loadout. RLS service-role-only (private). Free with a server-enforced cap (100/account/game).';
COMMENT ON COLUMN public.saved_build.saved_source_version IS
  'Snapshot of dmz_weapon_builds.source_updated_at at save time. Substrate for premium change-detection: re-resolve build_ref and compare to detect that a saved build changed. No premium logic today.';

-- RLS: service-role-only. The app reads/writes with the SERVICE key (session-derived account_id in
-- the WHERE -> IDOR-safe). No anon/authenticated policy -> the anon (browser) key reads 0 rows.
-- (service_role bypasses RLS; the explicit policy documents intent.)
ALTER TABLE public.saved_build ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_build_service_all ON public.saved_build
  FOR ALL TO service_role USING (true) WITH CHECK (true);
```

**Verify SELECTs (run after):**
```sql
-- columns
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns WHERE table_name = 'saved_build' ORDER BY ordinal_position;
-- unique + index
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'saved_build';
-- RLS on (expect relrowsecurity = true)
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'saved_build';
-- policies (expect the service-role policy)
SELECT policyname, roles, cmd FROM pg_policies WHERE tablename = 'saved_build';
-- table comment
SELECT obj_description('public.saved_build'::regclass) AS table_comment;
-- anon-read must be 0: run this with the ANON key (not service) after inserting a test row ->
-- expect 0 rows (RLS blocks anon). (Same check the auth audit ran on the identity tables.)
```

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

---

## Network-identity additive tables (applied 2026-06-16, Supabase SQL editor)

Groundwork for the profile/premium vision. Design:
[network-identity-schema-design.md](../network/network-identity-schema-design.md);
vision: [profile-premium-vision.md](../network/profile-premium-vision.md). **Pure additive +
INERT** — 6 NEW tables alongside the existing `bungie_*` auth; **zero `ALTER`** to any
existing table; nothing in the live site reads or writes them yet (same discipline as the
inert `game_slug` column). Identity is **multi-provider** via `linked_identity` (no
`bungie_ref` column — superseded the earlier 5-table brief). The live-auth cutover, the
per-provider OAuth sign-in flows, and billing wiring are all **DEFERRED** (not in this work).

**Step 0 (read-first):** confirmed the Bungie identity PK from the live OpenAPI spec —
`player_profiles.id` is `uuid` (`gen_random_uuid()`), `bungie_membership_id` is `text`.
Because identity moved to `linked_identity.external_id` (`text`, provider-agnostic), no
type-matching column was needed; the uuid/text facts are noted only for the DEFERRED mapping
of existing Bungie users into a `linked_identity` row.

```sql
-- 1) network_account  (the cross-game identity spine)
CREATE TABLE network_account (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle      text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 1b) linked_identity  (one account -> many sign-in providers)
CREATE TABLE linked_identity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES network_account(id),
  provider    text NOT NULL,               -- 'bungie' | 'activision' | 'xbox' | 'psn' | 'steam' | future
  external_id text NOT NULL,               -- provider-agnostic id (text holds any format)
  linked_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
CREATE INDEX idx_linked_identity_account ON linked_identity(account_id);

-- 2) game_profile  (a network_account's slice within one game)
CREATE TABLE game_profile (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL REFERENCES network_account(id),
  game_slug   text NOT NULL,
  progression jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, game_slug)
);

-- 3) build  (saved build/loadout, per-account per-game)
CREATE TABLE build (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_profile_id uuid NOT NULL REFERENCES game_profile(id),
  game_slug       text NOT NULL,
  name            text NOT NULL,
  payload         jsonb NOT NULL,
  is_public       boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- 4) build_grade  (AI Coach grade history; one build -> many grades)
CREATE TABLE build_grade (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id  uuid NOT NULL REFERENCES build(id),
  grade     text,
  analysis  jsonb,
  graded_at timestamptz NOT NULL DEFAULT now()
);

-- 5) subscription  (one row per account = CURRENT tier; billing-ready, inert)
CREATE TABLE subscription (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         uuid NOT NULL UNIQUE REFERENCES network_account(id),
  tier               text NOT NULL DEFAULT 'free',
  status             text,
  current_period_end timestamptz
);

-- Indexes (minimal; uniques on (account_id, game_slug), (provider, external_id),
-- and subscription.account_id are auto-indexed by their constraints)
CREATE INDEX idx_game_profile_account ON game_profile(account_id);
CREATE INDEX idx_game_profile_game    ON game_profile(game_slug);
CREATE INDEX idx_build_game_profile   ON build(game_profile_id);
CREATE INDEX idx_build_game           ON build(game_slug);
CREATE INDEX idx_build_grade_build    ON build_grade(build_id);
```

**Verification (post-apply):**
- **All 6 tables exist** with the expected columns (confirmed via PostgREST OpenAPI spec).
- **5 FKs present:** `linked_identity.account_id`, `game_profile.account_id`,
  `subscription.account_id` → `network_account.id`; `build.game_profile_id` →
  `game_profile.id`; `build_grade.build_id` → `build.id`. FKs default `ON DELETE RESTRICT`.
- **3 uniques enforced** (empirical — duplicate insert returned Postgres `23505`):
  `game_profile(account_id, game_slug)`, `linked_identity(provider, external_id)`,
  `subscription.account_id`. `subscription.tier` defaults to `'free'`.
- **Zero existing tables altered:** `player_profiles` unchanged vs the Step-0 snapshot
  (`id` still `uuid`; required-column list identical). DDL was `CREATE` only — cannot alter
  existing tables by construction.
- **Live site unchanged:** no app code changed (pure DDL); `npm run build` green; the new
  tables are inert (nothing reads/writes them). Probe rows used for the unique tests were
  deleted — all 6 tables back to 0 rows.
