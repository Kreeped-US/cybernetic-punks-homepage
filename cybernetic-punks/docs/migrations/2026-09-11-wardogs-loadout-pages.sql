-- Wardogs advisor Phase 1d Step 1 -- the persistence foundation (operator-run DDL).
-- A NEW wardogs-specific table (operator decision: NOT generalizing the Marathon build_pages, which is
-- shell/weapon-shaped). Stores a SAVED generation (save-on-action) as a stable-slug page that both
-- Channel A (shareable artifacts) and Channel B (crawlable pages) render from -- crawlers cannot run
-- the live SSE stream, and share links need a stable URL. Mirrors the build_pages pattern
-- (persist loadout_json -> SSR render from stored JSON -> is_indexable gate -> freshness metadata).
-- Idempotent (IF NOT EXISTS). No semicolons inside strings/comments (Supabase splitter lesson).
-- Cross-game-safe (new table, game_slug-scoped, defaults to wardogs).

create table if not exists wardogs_loadout_pages (
  id                uuid primary key default gen_random_uuid(),
  game_slug         text not null default 'wardogs',
  slug              text not null,
  page_kind         text not null default 'artifact',   -- artifact (Channel A saved) | hub | leaf (Channel B, later)
  career_level      integer,                              -- the saved inputs (honest-null when not given)
  budget            integer,
  playstyle         text,
  loadout_json      jsonb not null,                       -- the FULL stored generation (the SSR render source)
  provenance_tier   text default 'attributed',            -- inherited floor (attributed = Swoleguy ballistics)
  used_sources      jsonb,
  is_indexable      boolean not null default false,       -- NOINDEX by default -- the Channel B ramp flips this later
  source_updated_at timestamptz,                          -- freshness metadata (snapshot time for artifacts)
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint wardogs_loadout_pages_slug_uq unique (game_slug, slug)
);

create index if not exists wardogs_loadout_pages_slug_idx on wardogs_loadout_pages (game_slug, slug);
create index if not exists wardogs_loadout_pages_kind_idx on wardogs_loadout_pages (game_slug, page_kind, is_indexable);
