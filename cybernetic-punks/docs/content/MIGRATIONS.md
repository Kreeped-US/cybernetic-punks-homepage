# Content Pipeline Migration Log

In-repo record of production schema changes for the content pipeline (the assignment
gate + warranted-candidate queue). **There is no migrations framework in this repo** --
these SQL statements are applied **directly in the Supabase SQL editor**. This file is
the durable trail. See docs/CONTENT_PIPELINE_ARCHITECTURE.md for the architecture.

---

## content_candidate -- warranted-candidate queue + gap ledger (HELD -- run in Supabase SQL editor)

Increment 1 of the assignment gate (build-order step 1). ONE table, status-discriminated:
the QUEUE (`status='queued'`) and the GAP LEDGER (`status='gap'`) are the same row shape at
different lifecycle stages -- a gap row flips to queued when substance later lands, no copy,
no second table. A candidate is `(game_slug, entity, facet)`. Topics enter ONLY BY WARRANT
(`warrant_source` = substance / event); demand ANNOTATES and RANKS (`priority`, `target_phrase`,
`keyword_ref`) but can NEVER create a row and NEVER veto one -- that firewall is the whole point
(it is what the 139-near-dup glut violated). RLS service-role-only (same posture as `saved_build`
and `network_account`; anon reads 0 by construction from row zero).

**STATUS: HELD (not yet applied). Operator to run in the Supabase SQL editor.**

### The DDL

```sql
-- content_candidate: the warranted-candidate queue + gap ledger (status-discriminated).
CREATE TABLE public.content_candidate (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_slug              text NOT NULL,

  -- the candidate identity (the structured primitive the gate checks)
  entity                 text NOT NULL,       -- e.g. 'Destroyer', 'Twin Tap HBR', 'Overclock'
  facet                  text NOT NULL,       -- 'weapon'|'shell'|'mod'|'cradle'|'map'|... (facet->table map)

  -- WARRANT (why this may be written) -- substance or event; NEVER demand
  warrant_source         text NOT NULL,       -- 'substance_floor' | 'event_trigger' | 'seed_reinforce'
  substance_count        int,                 -- resolved verified-row count at enqueue (check a)

  -- DISPOSITION (novelty/cannibalization routing; increment 1 = a LOGGED MARKER only)
  disposition            text NOT NULL DEFAULT 'new',   -- 'new' | 'reinforce' | 'verify'
  reinforce_target_slug  text,                -- set when disposition='reinforce' (the owning page)

  -- DEMAND (annotation + ranking ONLY -- the firewall; see COMMENTs below)
  priority               int NOT NULL DEFAULT 0,
  target_phrase          text,                -- framing metadata (winnable angle / phrasing)
  keyword_ref            uuid,                -- -> keyword_targets, nullable (no keyword = still warranted)

  -- STATUS = queue vs ledger vs lifecycle
  status                 text NOT NULL DEFAULT 'queued',
    -- 'queued'   = warranted, awaiting a cycle   (THE QUEUE)
    -- 'gap'      = demand present, NO warrant yet (THE GAP LEDGER)
    -- 'assigned' = handed to an editor this cycle
    -- 'done'     = generated (new) or reinforced
    -- 'blocked'  = failed a check, converted/parked
  assigned_editor        text,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  -- enum guards (junk out of the table)
  CONSTRAINT content_candidate_warrant_chk
    CHECK (warrant_source IN ('substance_floor','event_trigger','seed_reinforce')),
  CONSTRAINT content_candidate_disposition_chk
    CHECK (disposition IN ('new','reinforce','verify')),
  CONSTRAINT content_candidate_status_chk
    CHECK (status IN ('queued','gap','assigned','done','blocked')),

  UNIQUE (game_slug, entity, facet)           -- one live candidate per tuple (the dedup spine)
);

-- the pick index: cheapest to pull the top-priority queued rows for a game.
CREATE INDEX content_candidate_pick_idx
  ON public.content_candidate (game_slug, status, priority DESC);

-- RLS: service-role-only, no anon/authenticated. Same posture as saved_build.
ALTER TABLE public.content_candidate ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_candidate_service_all ON public.content_candidate
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- COMMENTs: the table's role + the firewall on the demand columns.
COMMENT ON TABLE public.content_candidate IS
  'Warranted-candidate queue + gap ledger (status-discriminated). Topics enter ONLY by warrant (warrant_source = substance_floor/event_trigger). status=queued is the QUEUE; status=gap is the GAP LEDGER (demand present, warrant absent). See docs/CONTENT_PIPELINE_ARCHITECTURE.md.';
COMMENT ON COLUMN public.content_candidate.priority IS
  'FIREWALL: demand ANNOTATES and RANKS only. A keyword/GSC signal may set priority but can NEVER create a row (no keyword manufactures a topic) and NEVER remove one (no veto). Default 0 = written on rotation.';
COMMENT ON COLUMN public.content_candidate.keyword_ref IS
  'FIREWALL: nullable link to keyword_targets, for ranking/framing only. NULL = warranted with no keyword (still written on rotation). Demand annotates; verified substance is the warrant.';
```

### Verify SELECTs (run after the DDL)

```sql
-- 1. columns + types + not-null + defaults
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'content_candidate'
ORDER BY ordinal_position;

-- 2. the UNIQUE (game_slug, entity, facet) + the pick index both present
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'content_candidate'
ORDER BY indexname;

-- 3. the three CHECK constraints present
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.content_candidate'::regclass AND contype = 'c'
ORDER BY conname;

-- 4. RLS enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE oid = 'public.content_candidate'::regclass;      -- expect relrowsecurity = true

-- 5. exactly one policy, service_role, FOR ALL, no anon/authenticated
SELECT polname, roles::regrole[] AS roles, cmd
FROM pg_policy
WHERE polrelid = 'public.content_candidate'::regclass;  -- expect content_candidate_service_all / {service_role} / ALL

-- 6. the two COMMENTs landed
SELECT obj_description('public.content_candidate'::regclass) AS table_comment;
SELECT col_description('public.content_candidate'::regclass, ordinal_position) AS col_comment, column_name
FROM information_schema.columns
WHERE table_schema='public' AND table_name='content_candidate' AND column_name IN ('priority','keyword_ref');
```

### Anon-reads-0 check (RLS proof)

```sql
-- prove the anon role can read nothing (service-role-only from row zero)
SET ROLE anon;
SELECT count(*) FROM public.content_candidate;   -- expect 0 (RLS blocks anon; no anon policy)
RESET ROLE;
```

---
