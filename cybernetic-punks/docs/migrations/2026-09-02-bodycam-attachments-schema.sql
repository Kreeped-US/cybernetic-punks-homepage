-- 2026-09-02-bodycam-attachments-schema.sql
-- Bodycam attachment schema (LARGE attachment arc, phase 1) -- BESPOKE tables the flat mod_stats
-- cannot express (hierarchical mounting DAG). DESIGN doc: docs/bodycam/ATTACHMENT_SCHEMA_DESIGN.md
--
-- THE OPERATOR RUNS THIS in Supabase after review. Claude does not run DDL. DDL ONLY -- no data is
-- seeded (values are honest-null and unsourced; seeding now would be fabrication). No existing
-- table is touched (weapon_stats / mod_stats unchanged).
--
-- CONVENTIONS (Gen-2, per docs/dmz/WEAPON_BUILD_SCHEMA_DESIGN.md + HANDOFF): bigint identity PK;
-- game_slug text NOT NULL, NO default (a forgotten value ERRORS, never silently the wrong game);
-- UNIQUE(game_slug, slug); verified + verified_source (NO patch_verified -- retired this session;
-- patch folds into verified_source per A11/A4); REUSE the existing set_updated_at() function; a
-- game_slug immutability guard mirroring dmz_guard_game_slug(); RLS enabled + public-read.
--
-- PRE-FLIGHT for the operator (verify-before-run):
--   1. set_updated_at() exists with body `NEW.updated_at = now(); RETURN NEW;` -- REUSE it (the
--      block below does NOT recreate it). If your project names it differently, adjust the trigger.
--   2. weapon_stats has UNIQUE(game_slug, name) (weapon_stats_game_slug_name_key, added this
--      session) -- the FK target for bodycam_attachment_weapon.weapon_name. Confirm before running.
--   3. Confirm the exact public-read RLS policy shape on weapon_stats (policy name + roles) and
--      match it; the policy below is the standard anon+authenticated SELECT.

begin;

-- ---------------------------------------------------------------------------
-- game_slug immutability guard (mirrors dmz_guard_game_slug's confirmed body).
-- Generic: rejects any UPDATE that changes game_slug. If a shared generic guard
-- already exists in your project, use it instead and skip this CREATE.
-- ---------------------------------------------------------------------------
create or replace function bodycam_guard_game_slug()
returns trigger
language plpgsql
as $$
begin
  if new.game_slug is distinct from old.game_slug then
    raise exception 'game_slug is immutable (attempted % -> %)', old.game_slug, new.game_slug;
  end if;
  return new;
end;
$$;

-- ===========================================================================
-- Table 1: bodycam_attachments -- the attachment entities + the mounting DAG.
-- ===========================================================================
create table if not exists bodycam_attachments (
  id              bigint generated always as identity primary key,
  game_slug       text        not null,                 -- 'bodycam'; immutable (trigger); no default
  slug            text        not null,                 -- stable join key; refs use this, never name
  name            text        not null,                 -- display name
  slot_type       text        not null,                 -- slot OCCUPIED (free-text vocab, no CHECK enum -- poi_type lesson)
  slot_subtype    text,                                 -- Short/Long, Suppressor/Flash Hider/Compensator, etc. (nullable)
  requires_slots  text[]      not null default '{}',    -- DAG in-edges: slot-types that must be provided first ({} = base slot)
  provides_slots  text[]      not null default '{}',    -- DAG out-edges: slot-types this exposes once mounted ({} = leaf)
  -- effects: the 8 axes, honest-null. SHAPE CONTRACT (documented, not enforced -- dmz question 2):
  --   { "ads_speed": num|null, "switch_speed": num|null, "reload_speed": num|null,
  --     "recoil_h": num|null, "recoil_v": num|null, "spread": num|null,
  --     "kick": num|null, "ammo_capacity": num|null }
  -- All null until published/verified. Mirrors mod_stats.stat_changes (flat {axis:value}).
  effects         jsonb,
  is_cosmetic     boolean     not null default false,   -- stickers/skins; excluded from the effect roll-up
  toggle_group    text,                                 -- canted-optic mutual-toggle grouping (nullable)
  rp_cost         integer,                              -- RP unlock cost (honest-null)
  rarity          text,                                 -- rarity tier (free text, no CHECK; honest-null)
  notes           text,                                 -- aliases / caveats
  verified        boolean     not null default false,   -- honest-null gate; false until confirmed in-game
  verified_source text,                                 -- names the source; patch folded in (NO patch_verified)
  updated_at      timestamptz not null default now(),
  constraint bodycam_attachments_game_slug_slug_key unique (game_slug, slug)
);

create index if not exists bodycam_attachments_slot_type_idx
  on bodycam_attachments (game_slug, slot_type);
create index if not exists bodycam_attachments_requires_slots_gin
  on bodycam_attachments using gin (requires_slots);   -- serves the DAG `<@` / `&&` traversal
create index if not exists bodycam_attachments_provides_slots_gin
  on bodycam_attachments using gin (provides_slots);

drop trigger if exists bodycam_attachments_guard_game_slug on bodycam_attachments;
create trigger bodycam_attachments_guard_game_slug
  before update on bodycam_attachments
  for each row execute function bodycam_guard_game_slug();

drop trigger if exists bodycam_attachments_set_updated_at on bodycam_attachments;
create trigger bodycam_attachments_set_updated_at
  before update on bodycam_attachments
  for each row execute function set_updated_at();

-- ===========================================================================
-- Table 2: bodycam_attachment_weapon -- per-weapon compatibility (many-to-many).
-- ===========================================================================
create table if not exists bodycam_attachment_weapon (
  id               bigint generated always as identity primary key,
  game_slug        text        not null,                -- 'bodycam'; immutable; no default
  attachment_slug  text        not null,                -- -> bodycam_attachments(game_slug, slug)
  weapon_name      text        not null,                -- -> weapon_stats(game_slug, name)  [UNIQUE(game_slug,name)]
  compatible       boolean     not null default false,  -- mounts on this weapon (subset gate; blocked = false)
  tested           boolean     not null default false,  -- compatibility VERIFIED in-game (vs inferred)
  audio_note       text,                                -- per-weapon suppressor audio note
  -- effect_overrides: per-weapon deltas, same 8-axis shape as bodycam_attachments.effects,
  -- honest-null. NULL = use the base effects.
  effect_overrides jsonb,
  verified         boolean     not null default false,  -- honest-null provenance
  verified_source  text,                                -- names the source; NO patch_verified
  updated_at       timestamptz not null default now(),
  constraint bodycam_attachment_weapon_uniq unique (game_slug, attachment_slug, weapon_name),
  constraint bodycam_attachment_weapon_attachment_fk
    foreign key (game_slug, attachment_slug)
    references bodycam_attachments (game_slug, slug)
    on update cascade on delete cascade,               -- compat row is meaningless without its attachment
  constraint bodycam_attachment_weapon_weapon_fk
    foreign key (game_slug, weapon_name)
    references weapon_stats (game_slug, name)
    on update cascade on delete restrict               -- never silently drop a compat fact
);

create index if not exists bodycam_attachment_weapon_weapon_idx
  on bodycam_attachment_weapon (game_slug, weapon_name);   -- the builder's primary lookup
create index if not exists bodycam_attachment_weapon_attachment_idx
  on bodycam_attachment_weapon (game_slug, attachment_slug);

drop trigger if exists bodycam_attachment_weapon_guard_game_slug on bodycam_attachment_weapon;
create trigger bodycam_attachment_weapon_guard_game_slug
  before update on bodycam_attachment_weapon
  for each row execute function bodycam_guard_game_slug();

drop trigger if exists bodycam_attachment_weapon_set_updated_at on bodycam_attachment_weapon;
create trigger bodycam_attachment_weapon_set_updated_at
  before update on bodycam_attachment_weapon
  for each row execute function set_updated_at();

-- ===========================================================================
-- RLS: enable + public-read (SELECT to anon + authenticated). Writes use the
-- service-role key, which bypasses RLS. Match weapon_stats/mod_stats exposure;
-- confirm the exact house policy name/roles and adjust if different.
-- ===========================================================================
alter table bodycam_attachments        enable row level security;
alter table bodycam_attachment_weapon  enable row level security;

drop policy if exists bodycam_attachments_public_read on bodycam_attachments;
create policy bodycam_attachments_public_read
  on bodycam_attachments for select to anon, authenticated using (true);

drop policy if exists bodycam_attachment_weapon_public_read on bodycam_attachment_weapon;
create policy bodycam_attachment_weapon_public_read
  on bodycam_attachment_weapon for select to anon, authenticated using (true);

commit;

-- VERIFY after running:
--   -- both tables exist, empty:
--   select count(*) from bodycam_attachments;         -- expect 0
--   select count(*) from bodycam_attachment_weapon;   -- expect 0
--   -- FK targets resolve:
--   select conname, pg_get_constraintdef(oid) from pg_constraint
--     where conrelid = 'bodycam_attachment_weapon'::regclass and contype = 'f';
--   -- RLS on + policy present:
--   select relname, relrowsecurity from pg_class where relname in
--     ('bodycam_attachments','bodycam_attachment_weapon');
