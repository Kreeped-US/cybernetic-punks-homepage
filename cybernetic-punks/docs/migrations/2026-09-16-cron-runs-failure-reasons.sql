-- Migration: cron_runs.failure_reasons (Phase 1 editor-pipeline observability)
-- Date: 2026-09-16
--
-- OPERATOR RUNS THIS IN SUPABASE (SQL editor). It is NOT run by the executor.
--
-- WHY: until now, WHICH editor failed and WHY was console-only (Vercel function logs) --
-- the root enabler of MIRANDA dying silently for two weeks. cron_runs stored counts and a
-- single run-level error, but no per-editor reasons. This column persists them so they are
-- queryable alongside the existing counts.
--
-- SHAPE: nullable jsonb. Null on clean runs and on pre-migration rows; an array of
-- { editor, reason } objects on a run that had editor failures, e.g.
--   [{ "editor": "MIRANDA", "reason": "near-duplicate vs surviving corpus (...)" }]
--
-- SAFETY: idempotent (add column if not exists) -- safe to run once or re-run. The app code
-- (lib/cronRunLog.js) already degrades gracefully when this column is absent (it retries the
-- insert without failure_reasons), so the code can be deployed BEFORE or AFTER this runs.

alter table public.cron_runs
  add column if not exists failure_reasons jsonb;

comment on column public.cron_runs.failure_reasons is
  'Per-editor failure reasons for this run as [{ editor, reason }]. Null when no editor failed or on pre-2026-09-16 rows. Phase 1 observability: reasons were previously console-only.';
