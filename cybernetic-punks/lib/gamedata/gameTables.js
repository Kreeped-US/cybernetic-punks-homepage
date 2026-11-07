// lib/gamedata/gameTables.js
// Per-game data-table config for the snapshot diff (Brief 308). One entry per game; each table names its
// natural key (the columns that identify a row across snapshots), the column used for rename suggestions,
// and whether rows must be filtered to the game (weapon_stats is shared by several games).
// The table list must match GAME_TABLES in scripts/snapshot-game-data.mjs (a test checks this).
// Columns confirmed against the 2026-11-07 Wardogs baseline snapshot (MANIFEST.json columns).

// Reported, but never counted as data changes. Applied to every table; a table simply lacks the ones it
// does not have (weapon_stats has no tier; wardogs_ttk has no notes; and so on).
export const PROVENANCE_COLUMNS = [
  'verified', 'verified_source', 'confidence_tier', 'tier', 'gate_tier', 'source_kind', 'patch_verified', 'superseded_by', 'notes',
];

// Never reported: database bookkeeping that changes without the data changing.
export const IGNORED_COLUMNS = ['id', 'created_at', 'updated_at'];

export const GAME_DATA_TABLES = {
  wardogs: [
    { table: 'weapon_stats', key: ['game_slug', 'name'], nameColumn: 'name', filterByGame: true },
    { table: 'wardogs_ttk', key: ['game_slug', 'weapon_name', 'ammo_type', 'armor_tier'], nameColumn: 'weapon_name' },
    { table: 'wardogs_ballistics', key: ['game_slug', 'weapon_name', 'body_part', 'ammo_type', 'armor_tier'], nameColumn: 'weapon_name' },
    { table: 'wardogs_ammo', key: ['game_slug', 'caliber', 'ammo_type'], nameColumn: 'caliber' },
    { table: 'wardogs_economy_items', key: ['game_slug', 'name'], nameColumn: 'name' },
    { table: 'wardogs_attachments', key: ['game_slug', 'name'], nameColumn: 'name' },
  ],
};
