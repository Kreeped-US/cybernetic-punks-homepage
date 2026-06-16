# Network Identity Schema — Design (on paper, pre-migration)

## Status
DESIGN doc — review BEFORE any CREATE TABLE. Turns the profile/premium
vision (profile-premium-vision.md) into concrete table structure. Designed
to be ADDITIVE + INERT: new tables sit ALONGSIDE the current bungie_* auth,
nothing existing is altered or ripped out. The live-auth cutover stays
DEFERRED (not in this work). Principle: additive + inert before
load-bearing.

## Identity model (locked — multi-provider)
A new network-account spine that links to one OR MORE external sign-in
providers via a separate `linked_identity` table — additive, requires
nothing, disturbs nothing existing:
- DMZ is a Call of Duty game (Xbox/PSN/Battle.net/Steam via ACTIVISION
  identity); Marathon is Bungie. A network account must be able to link
  ANY provider — a DMZ player has no Bungie login, and the cross-game
  career means ONE account may link MULTIPLE providers (e.g. Bungie for
  Marathon + Activision for DMZ).
- So identity is NOT a column on the account — it's a `linked_identity`
  table (one account -> many provider links). Providers: 'bungie',
  'activision', 'xbox', 'psn', 'steam', extensible.
- Current users keep authenticating via bungie_* exactly as today. The new
  tables are written/read only by NEW profile features; they do not touch
  the live auth flow.
- SAFE NOW: DESIGNING the multi-provider structure (the table) is additive
  + inert. DEFERRED: actually building the OAuth sign-in flows for each
  provider (Xbox/PSN/Activision/Bungie) — that's the load-bearing auth
  work, arguably bigger than the Bungie cutover (each provider is its own
  OAuth integration). Design the structure; defer the plumbing.

## Tables (proposed)

### 1. network_account
The network-level identity spine (the cross-game "career" owner).
- id (uuid, pk, default gen_random_uuid())
- handle (text, unique, not null) — public display name / profile slug
- created_at (timestamptz)
- (NO provider column — identity links live in linked_identity. NO auth/
  email columns; auth stays on bungie_* until the deferred cutover.)
NOTE: design only — does NOT replace bungie auth; nothing reads this for
login.

### 1b. linked_identity
The sign-in providers linked to a network account (one account -> many).
- id (uuid, pk)
- account_id (fk -> network_account.id)
- provider (text) — 'bungie' | 'activision' | 'xbox' | 'psn' | 'steam' |
  future
- external_id (text) — that platform's identifier for the user. TEXT =
  provider-agnostic (holds any provider's id format); so no need to match
  player_profiles.id type. Mapping EXISTING Bungie users (player_profiles)
  into a linked_identity row is DEFERRED cutover work.
- linked_at (timestamptz)
- unique (provider, external_id) — one external identity maps to one
  account.
- index on account_id.

### 2. game_profile
A network_account's presence WITHIN one game (the per-game career slice).
One row per (account, game).
- id (uuid, pk)
- account_id (fk -> network_account.id)
- game_slug (text) — 'marathon' | 'dmz' | future (same dimension as the
  rest of the network; ties profiles into the existing game model)
- created_at (timestamptz)
- progression (jsonb, nullable) — per-game progression state, game-shaped
  (Marathon Cradle / DMZ FOB-traits). jsonb because each game's progression
  is differently-shaped — keeps the table game-agnostic (same content-
  agnostic discipline as the game template; the column holds a game's shape
  without the schema hardcoding it).
- unique (account_id, game_slug) — one profile per game per account.

### 3. build
A saved build/loadout, owned by a game_profile (so it's per-account,
per-game). This is the catalogued, shareable content.
- id (uuid, pk)
- game_profile_id (fk -> game_profile.id)
- game_slug (text, denormalized for easy game-scoped queries — matches the
  network's filter-by-game pattern)
- name (text)
- payload (jsonb) — the build's actual contents, game-shaped (Marathon
  shell+mods / DMZ loadout). jsonb for the same game-agnostic reason.
- created_at / updated_at (timestamptz)
- is_public (boolean, default false) — whether it appears on the shareable
  profile. (Free tier can have public builds — share-worthiness is NOT
  gated.)

### 4. build_grade
The AI Coach grade history — the coaching RELATIONSHIP over time. This is
the table that powers the free-snapshot vs premium-history split.
- id (uuid, pk)
- build_id (fk -> build.id)
- grade (text or numeric — the hero brag; exact grade model still open per
  vision doc)
- analysis (jsonb, nullable) — the coach's breakdown
- graded_at (timestamptz)
- One build can have MANY grades over time (history). FREE shows the
  LATEST (snapshot); PREMIUM shows the full series (the relationship). The
  split is a query/gating concern, not a schema one — the schema holds the
  full history regardless; the tier decides how much is shown.

### 5. subscription (or account_tier)
Tiered/gated features — billing-ready, but inert until there's billing.
- id (uuid, pk)
- account_id (fk -> network_account.id), UNIQUE — ONE subscription row per
  account (this table holds CURRENT tier, not billing history; billing
  history lives with the billing provider, e.g. Stripe records).
- tier (text, default 'free') — 'free' | 'premium' (extensible)
- status / current_period_end (nullable) — billing fields, designed but
  unused until billing exists
- Lets feature-gating read a tier without the gating logic being built yet.
  Additive + inert: present so the profile front-end can BRANCH on tier
  (even against mock data), real billing wired later.

## Cross-game "career" rollup
NOT a table — it's a QUERY/VIEW over the above: a network_account's
game_profiles + their builds + latest grades, aggregated. The "career" is
derived, not stored, so it stays correct as games/builds are added. (Can
formalize as a VIEW later; design intent noted now.)

## Why this is safe (additive + inert)
- Every table is NEW. Nothing alters bungie_* or any existing table.
- Nothing in the live auth flow reads these. They're written/read only by
  NEW profile features (which themselves start against mock data).
- bungie_ref is nullable — the future-cutover seam exists but bears no
  load now.
- jsonb for game-shaped data (progression, build payload) keeps the schema
  game-agnostic — adding a game needs no schema change, same discipline as
  the game template.

## Sequencing (this chore)
1. THIS DOC reviewed/approved (paper first — changing the design is free
   now, costly after tables exist).
2. -> additive migration brief for Claude Code: CREATE these tables (no
   alters to existing tables; run in Supabase like prior DDL). Inert on
   creation.
3. -> mock-data profile page front-end (can be built in PARALLEL — runs on
   fake data, zero dependency on whether the real tables exist; proves the
   premium UX, the shareable card, the free/premium branching).
DEFERRED (NOT this chore): live-auth cutover (bungie_* -> network_account
as the real login), the OAuth SIGN-IN FLOWS for each provider (Xbox / PSN /
Activision / Bungie / Steam — each its own integration), real billing
wiring, real data population. The schema is DESIGNED to hold multi-provider
identity now; building the actual platform sign-ins is the deferred,
post-go-live, deliberate work.

## Open / decide at review
- Exact grade model (numeric scale vs letter) — flagged open in the vision
  doc; build_grade.grade column type follows from it. (DECIDED: leave grade
  column flexible `text` for now; add a numeric companion column if/when
  sorting/comparison is needed.)
- Whether to formalize the career rollup as a VIEW now or just query it.
  (LEAN: query for now, formalize as VIEW only when reused enough.)
- Mapping EXISTING Bungie users (player_profiles.id, uuid) into a
  linked_identity row (provider='bungie') — DEFERRED cutover work; not in
  this additive phase. (player_profiles PK confirmed uuid; bungie key
  bungie_membership_id text — noted for that later mapping.)
RESOLVED: subscription = one-per-account (current tier). Identity =
multi-provider linked_identity table (no bungie_ref column).
