# Player Profile System — Design + Decisions (source of truth)

## Status
LOCKED decisions for the player-profile / network-identity build. This is the
build-time source of truth; it reconciles and SUPERSEDES the earlier paper design
in network-identity-schema-design.md where they differ (noted below). Principle:
additive + inert before load-bearing. Auth/session cutover stays deferred.

## Identity model (locked)
- network_account is the PARENT identity spine (the cross-game player profile).
- player_profiles is REUSED as Marathon's game-slice. It gains a nullable
  account_id FK up to network_account; player_profiles.id stays the existing FK
  spine and nothing existing breaks. We do NOT create a competing game_profile.
- Per-user data already FKs to player_profiles.id (player_audits,
  player_qa_history, loadout_snapshots) and is untouched.

## Providers (multi-provider from day one)
- Schema supports all six from day one via linked_identity (one account -> many):
  bungie, discord, activision, xbox, psn, steam. provider is free text
  (extensible); these are the day-one values.
- OAuth wired incrementally: Bungie (existing) + Discord first in v1; Activision/
  Blizzard near DMZ; the rest on demand. Discord is the default low-friction
  signup.

## Auth + session (direction; NOT built in schema stage)
- KEEP hand-rolled OAuth now. Add Discord by mirroring the existing Bungie flow,
  factored through a shared OAuth-callback helper to stay DRY. Adopt Supabase
  Auth LATER, at a larger userbase, as its own migration.
- Session subject becomes network_account.id going forward, with Bungie's
  existing cp_player_id bridged during transition (Discord-only users have no
  player_profiles row). This is the hardest-gated, later auth stage. The schema
  supports the direction (the account_id FK); Stage 1 changes NO session/auth/
  cookie logic.

## Naming
- "Player profile" / network-neutral. NEVER "Runner" / "Operative" (those are tier
  names and beta placeholders). No game-dialect in profile column/label names.

## v1 profile = identity + customization
- Fields: handle (unique URL-safe slug) + display_name (freeform), bio,
  accent_color, avatar_url (the user's chosen avatar; defaults from a provider).
- Per-provider provider_username + provider_avatar_url live on linked_identity.
- games_played is DERIVED (from linked data / per-game slices), not a stored
  column.
- Game-specific and monetization-gated features are FUTURE tables referencing the
  profile id (network_account.id) -- not in v1.

## Stage 1 scope (schema only; additive + inert)
- network_account: id (uuid pk), handle (unique not null, slug), display_name,
  bio, accent_color, avatar_url, created_at, updated_at. NO tier column
  (monetization deferred).
- linked_identity: id, account_id (fk -> network_account.id, on delete cascade),
  provider, external_id, provider_username, provider_avatar_url, linked_at,
  UNIQUE(provider, external_id), index(account_id).
- player_profiles: ADD account_id (uuid, nullable, fk -> network_account.id).
  Nothing else on player_profiles changes.
- RLS enabled on the new tables (service-role only until profile features exist).
- IMPLEMENTATION NOTE: network_account and linked_identity already existed (empty)
  in the older paper-design shape, so Stage 1 reconciles them with additive
  ALTERs (add the missing columns) rather than CREATE.

## Deferred (NOT Stage 1)
game_profile (the generic per-game slice), build, build_grade, subscription/
account_tier, ALL OAuth plumbing + the shared callback helper, the session-subject
cutover, backfilling existing Bungie users into linked_identity, billing, the
career rollup view.

## Reconciliation with network-identity-schema-design.md (the prior doc)
- AGREE: multi-provider network_account + linked_identity; additive + inert; keep
  current auth now and defer the big auth migration; profile core separate from
  game/monetization tables.
- CHANGED here: reuse player_profiles as Marathon's slice via account_id (do NOT
  mint a competing game_profile); add the v1 customization columns the prior doc
  lacked (display_name, bio, accent_color, avatar_url, updated_at); add Discord as
  a day-one provider; capture per-provider provider_username + provider_avatar_url
  on linked_identity; handle and display_name are SPLIT (slug vs freeform).
- The prior doc's build / build_grade / subscription / game_profile / career-view
  designs remain valid as DEFERRED future work.
