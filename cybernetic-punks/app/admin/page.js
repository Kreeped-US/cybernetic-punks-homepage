'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import UsageStats from '@/components/UsageStats';
import QualityMetricsPanel from '@/components/QualityMetricsPanel';
import QualityAlertsPanel from '@/components/QualityAlertsPanel';
import VantageDraftsPanel from '@/components/VantageDraftsPanel';
import SourceReviewPanel from '@/components/SourceReviewPanel';

const FACTION_NAMES = ['Cyberacme', 'Nucaloric', 'Traxus', 'Mida', 'Arachne', 'Sekiguchi'];
const STAT_NAMES = ['Heat Capacity', 'Agility', 'Loot Speed', 'Melee Damage', 'Prime Recovery', 'Tactical Recovery', 'Self-Repair Speed', 'Finisher Siphon', 'Revive Speed', 'Hardware', 'Firewall', 'Fall Resistance', 'Ping Duration', 'DBNO', 'TAD'];
const SHELL_NAMES = ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Sentinel', 'Thief', 'Triage', 'Vandal'];

const STICKY_FIELDS = {
  faction_stat_bonuses: ['faction_name'],
  faction_unlocks:      ['faction_name'],
  faction_materials:    ['faction_name'],
  shell_stat_values:    ['shell_name'],
  editor_directives:    ['editor'],
  // game_slug is sticky on the 10 tables that gained an explicit Game select
  // (Phase 1 of the game_slug default-removal). Precedent: editor_directives.editor
  // is already a sticky SELECT. Sticky, NOT a buildFormDefaults default -- a default
  // would relocate the silent DB default into the UI, the exact hazard being removed.
  weapon_stats:         ['game_slug'],
  shell_stats:          ['game_slug'],
  mod_stats:            ['game_slug'],
  core_stats:           ['game_slug'],
  implant_stats:        ['game_slug'],
  game_maps:            ['game_slug'],
  game_zones:           ['map_slug', 'game_slug'],
  game_bosses:          ['game_slug'],
  game_events:          ['game_slug'],
  game_modes:           ['game_slug'],
};

const SCHEMAS = {
  weapon_stats: [
    { key: 'game_slug',           label: 'Game',                 type: 'select',  required: true, options: ['marathon'], group: 'Identity' },
    { key: 'name',                label: 'Name',                 type: 'text',    required: true,  group: 'Identity' },
    { key: 'weapon_type',         label: 'Weapon Type',          type: 'select',  group: 'Identity', options: ['AR', 'SMG', 'Shotgun', 'Sniper Rifle', 'Precision Rifle', 'LMG', 'Pistol', 'Melee', 'Railgun', 'Hybrid'] },
    { key: 'ammo_type',           label: 'Ammo Type',            type: 'select',  group: 'Identity', options: ['Light Rounds', 'Heavy Rounds', 'MIPS', 'Volt Cells', 'Volt Battery', 'Hyphatic Gel', 'None'] },
    { key: 'firing_mode',         label: 'Firing Mode',          type: 'select',  group: 'Identity', options: ['Full Auto', 'Semi-Auto', 'Single Shot', 'Burst', 'Melee'] },
    { key: 'rarity',              label: 'Rarity',               type: 'select',  group: 'Identity', options: ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige', 'Contraband'] },
    { key: 'firepower_score',     label: 'Firepower Score',      type: 'number',  group: 'Firepower' },
    { key: 'damage',              label: 'Damage (Body)',         type: 'number',  group: 'Firepower' },
    { key: 'precision_multiplier',label: 'Precision Multiplier', type: 'number',  group: 'Firepower' },
    { key: 'fire_rate',           label: 'Fire Rate (RPM)',       type: 'number',  group: 'Firepower' },
    { key: 'accuracy_score',      label: 'Accuracy Score',       type: 'number',  group: 'Accuracy' },
    { key: 'hipfire_spread',      label: 'Hipfire Spread',       type: 'number',  group: 'Accuracy' },
    { key: 'crouch_spread_bonus', label: 'Crouch Spread Bonus %',type: 'number',  group: 'Accuracy' },
    { key: 'moving_inaccuracy',   label: 'Moving Inaccuracy %',  type: 'number',  group: 'Accuracy' },
    { key: 'handling_score',      label: 'Handling Score',       type: 'number',  group: 'Handling' },
    { key: 'equip_speed',         label: 'Equip Speed (s)',       type: 'number',  group: 'Handling' },
    { key: 'ads_speed',           label: 'ADS Speed (s)',         type: 'number',  group: 'Handling' },
    { key: 'weight',              label: 'Weight %',             type: 'number',  group: 'Handling' },
    { key: 'recoil',              label: 'Recoil %',             type: 'number',  group: 'Handling' },
    { key: 'aim_assist',          label: 'Aim Assist',           type: 'number',  group: 'Handling' },
    { key: 'reload_speed',        label: 'Reload Speed (s)',      type: 'number',  group: 'Handling' },
    { key: 'range_meters',        label: 'Range (m)',             type: 'number',  group: 'Range & Mag' },
    { key: 'range_rating',        label: 'Range Rating',          type: 'select',  group: 'Range & Mag', options: ['CQB', 'Mid', 'Long', 'Flex'] },
    { key: 'magazine_size',       label: 'Magazine Size',         type: 'number',  group: 'Range & Mag' },
    { key: 'zoom',                label: 'Zoom (x)',              type: 'number',  group: 'Range & Mag' },
    { key: 'ranked_viable',       label: 'Ranked Viable',         type: 'boolean', group: 'Flags' },
    { key: 'shield_compatible',   label: 'Shield Compatible',     type: 'boolean', group: 'Flags' },
    { key: 'verified',            label: 'Verified',              type: 'boolean', group: 'Flags' },
    { key: 'verified_source',     label: 'Verified Source',       type: 'select',  group: 'Flags', options: ['in-game', 'tauceti.gg', 'both'] },
    { key: 'image_filename',      label: 'Image Filename',        type: 'text',    group: 'Flags', placeholder: 'e.g. longshot.webp' },
  ],

  shell_stats: [
    { key: 'game_slug',                     label: 'Game',                    type: 'select',   required: true, options: ['marathon'] },
    { key: 'name',                          label: 'Name',                    type: 'text',     required: true },
    { key: 'role',                          label: 'Role',                    type: 'text' },
    { key: 'difficulty',                    label: 'Difficulty',              type: 'select',   options: ['Low', 'Medium', 'High'] },
    { key: 'base_health',                   label: 'Base Health',             type: 'number' },
    { key: 'base_shield',                   label: 'Base Shield',             type: 'number' },
    { key: 'base_speed',                    label: 'Speed Label',             type: 'text' },
    { key: 'prime_ability_name',            label: 'Prime Ability',           type: 'text' },
    { key: 'prime_ability_description',     label: 'Prime Ability Desc',      type: 'textarea' },
    { key: 'tactical_ability_name',         label: 'Tactical Ability',        type: 'text' },
    { key: 'tactical_ability_description',  label: 'Tactical Ability Desc',   type: 'textarea' },
    { key: 'trait_1_name',                  label: 'Trait 1',                 type: 'text' },
    { key: 'trait_1_description',           label: 'Trait 1 Desc',            type: 'textarea' },
    { key: 'trait_2_name',                  label: 'Trait 2',                 type: 'text' },
    { key: 'trait_2_description',           label: 'Trait 2 Desc',            type: 'textarea' },
    { key: 'ranked_tier_solo',              label: 'Ranked Solo Tier',        type: 'select',   options: ['S', 'A', 'B', 'C', 'D'] },
    { key: 'ranked_tier_squad',             label: 'Ranked Squad Tier',       type: 'select',   options: ['S', 'A', 'B', 'C', 'D'] },
    { key: 'best_for',                      label: 'Best For',                type: 'text' },
    { key: 'recommended_playstyle',         label: 'Playstyle',               type: 'textarea' },
    { key: 'image_filename',                label: 'Image Filename',          type: 'text',     placeholder: 'e.g. thief.webp' },
  ],

  shell_stat_values: [
    { key: 'shell_name',  label: 'Shell Name',  type: 'select', required: true, options: SHELL_NAMES },
    { key: 'stat_name',   label: 'Stat Name',   type: 'select', required: true, options: STAT_NAMES },
    { key: 'stat_value',  label: 'Stat Value',  type: 'number', required: true },
  ],

  mod_stats: [
    { key: 'game_slug',      label: 'Game',               type: 'select',  required: true, options: ['marathon'] },
    { key: 'name',           label: 'Name',               type: 'text',    required: true },
    { key: 'slot_type',      label: 'Slot Type',          type: 'select',  options: ['Barrel', 'Chip', 'Optic', 'Magazine', 'Grip', 'Generator', 'Shield'] },
    { key: 'rarity',         label: 'Rarity',             type: 'select',  options: ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige', 'Contraband'] },
    { key: 'effect_desc',    label: 'Effect Description', type: 'textarea' },
    { key: 'faction_source', label: 'Faction Source',     type: 'select',  nullableSelect: true, options: ['None', ...FACTION_NAMES] },
    { key: 'credit_value',   label: 'Credit Value',       type: 'number' },
    { key: 'ranked_viable',  label: 'Ranked Viable',      type: 'boolean' },
    { key: 'image_filename', label: 'Image Filename',     type: 'text',    placeholder: 'e.g. barrel-mod.webp' },
  ],

  implant_stats: [
    { key: 'game_slug',          label: 'Game',           type: 'select',  required: true, options: ['marathon'] },
    { key: 'name',               label: 'Name',           type: 'text',    required: true },
    { key: 'slug',               label: 'Slug',           type: 'text' },
    { key: 'slot_type',          label: 'Slot Type',      type: 'select',  required: true, options: ['Head', 'Torso', 'Legs', 'Shield'] },
    { key: 'rarity',             label: 'Rarity',         type: 'select',  required: true, options: ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'] },
    { key: 'required_runner',    label: 'Required Runner',type: 'select',  nullableSelect: true, options: ['Universal', ...SHELL_NAMES] },
    { key: 'faction_source',     label: 'Faction Source', type: 'select',  nullableSelect: true, options: ['None', ...FACTION_NAMES] },
    { key: 'description',        label: 'Description',    type: 'textarea' },
    { key: 'passive_name',       label: 'Passive Name',   type: 'text' },
    { key: 'passive_desc',       label: 'Passive Desc',   type: 'textarea' },
    { key: 'stat_1_label',       label: 'Stat 1',         type: 'select',  options: ['', ...STAT_NAMES] },
    { key: 'stat_1_value',       label: 'Stat 1 Value',   type: 'text',    placeholder: 'e.g. -10 or 30%' },
    { key: 'stat_2_label',       label: 'Stat 2',         type: 'select',  options: ['', ...STAT_NAMES] },
    { key: 'stat_2_value',       label: 'Stat 2 Value',   type: 'text',    placeholder: 'e.g. -10 or 30%' },
    { key: 'stat_3_label',       label: 'Stat 3',         type: 'select',  options: ['', ...STAT_NAMES] },
    { key: 'stat_3_value',       label: 'Stat 3 Value',   type: 'text',    placeholder: 'e.g. -10 or 30%' },
    { key: 'stat_4_label',       label: 'Stat 4',         type: 'select',  options: ['', ...STAT_NAMES] },
    { key: 'stat_4_value',       label: 'Stat 4 Value',   type: 'text',    placeholder: 'e.g. -10 or 30%' },
    { key: 'credit_value',       label: 'Credit Value',   type: 'number' },
    { key: 'ranked_viable',      label: 'Ranked Viable',  type: 'boolean' },
    { key: 'verified',           label: 'Verified',       type: 'boolean' },
    // Sits DIRECTLY under `verified` on purpose: the source field has to be in
    // the eye-line of the click that ticks the box. TEXT, not a select like
    // weapon_stats -- this column already holds long-form attested prose, and a
    // fixed select would render those values as blank while the string survived
    // in formData, so one stray interaction would silently replace attested
    // provenance with a three-word token. See docs/HANDOFF.md 2026-07-21 (C1).
    { key: 'verified_source',    label: 'Verified Source', type: 'text',
      placeholder: 'e.g. owner in-game entry, March 2026 (attested 2026-07-21)' },
    { key: 'notes',              label: 'Notes',          type: 'textarea' },
    { key: 'image_filename',     label: 'Image Filename', type: 'text',    placeholder: 'e.g. implant-name.webp' },
  ],

  // KEYWORD FRAMING store (commit d). See docs/KEYWORD_SYSTEM_CONSOLIDATED.md Part 4.
  // entity_slug is PLAIN TEXT, validated SERVER-SIDE on save (lib/keywordEntry.js) --
  // the renderer has no dynamic-option support, so a live entity dropdown does not
  // exist. Validation-on-save gives the identical correctness guarantee: a wrong
  // entity is un-SAVEABLE rather than un-PICKABLE.
  //
  // match_count / last_matched_at are DELIBERATELY NOT EXPOSED -- they are machine-
  // maintained rotation state (commits e/f). A human editing them would burn or reset
  // the cap-at-1 by hand.
  keyword_targets: [
    { key: 'keyword',           label: 'Keyword',            type: 'text',     required: true, placeholder: 'the studied search phrase, verbatim' },
    { key: 'game_slug',         label: 'Game',               type: 'select',   required: true, options: ['marathon'] },
    { key: 'entity_type',       label: 'Entity Type',        type: 'select',   options: ['', 'shell', 'weapon', 'mod_slot', 'map', 'mode', 'event'] },
    { key: 'entity_slug',       label: 'Entity Slug',        type: 'text',     placeholder: 'e.g. vandal, twin-tap-hbr -- validated on save' },
    { key: 'facet',             label: 'Facet',              type: 'select',   options: ['', 'counter', 'build', 'tier', 'guide', 'news', 'community', 'economy', 'lore'] },
    { key: 'intent',            label: 'Search Intent',      type: 'select',   options: ['', 'informational', 'comparison', 'transactional', 'navigational'] },
    { key: 'volume',            label: 'Volume (12mo avg)',  type: 'number',   placeholder: 'the OPERATIVE figure' },
    { key: 'last_known_volume', label: 'Volume (last known)',type: 'number',   placeholder: 'kept separate -- can be a spike' },
    { key: 'difficulty',        label: 'Difficulty (KD)',    type: 'number' },
    { key: 'studied_at',        label: 'Studied At (date the KWFinder data was pulled)', type: 'date', required: true },
    { key: 'source',            label: 'Source',             type: 'text',     placeholder: 'kwfinder' },
    { key: 'priority',          label: 'Priority',           type: 'number',   placeholder: 'lower = sooner (default 100)' },
    { key: 'is_active',         label: 'Active',             type: 'boolean' },
    { key: 'notes',             label: 'Notes',              type: 'textarea' },
  ],

  ammo_stats: [
    { key: 'name',                label: 'Name',              type: 'text',    required: true },
    { key: 'damage_type',         label: 'Damage Type',       type: 'select',  options: ['Kinetic', 'Volt'] },
    { key: 'damage_modifier_pct', label: 'Damage Modifier %', type: 'number' },
    { key: 'special_effect',      label: 'Special Effect',    type: 'textarea' },
    { key: 'notes',               label: 'Notes',             type: 'textarea' },
  ],

  core_stats: [
    { key: 'game_slug',          label: 'Game',               type: 'select',  required: true, options: ['marathon'] },
    { key: 'name',               label: 'Name',               type: 'text',    required: true },
    { key: 'slug',               label: 'Slug',               type: 'text' },
    { key: 'rarity',             label: 'Rarity',             type: 'select',  required: true, options: ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'] },
    { key: 'required_runner',    label: 'Required Runner',    type: 'select',  nullableSelect: true, options: ['Universal', ...SHELL_NAMES] },
    { key: 'effect_desc',        label: 'Effect Description', type: 'textarea' },
    { key: 'ability_type',       label: 'Ability Type',       type: 'select',  options: ['', 'Prime', 'Tactical', 'Passive', 'Grapple', 'Universal'] },
    { key: 'is_shell_exclusive', label: 'Shell Exclusive',    type: 'boolean' },
    { key: 'credit_value',       label: 'Credit Value',       type: 'number' },
    { key: 'ranked_viable',      label: 'Ranked Viable',      type: 'boolean' },
    { key: 'meta_rating',        label: 'Meta Rating',        type: 'select',  options: ['', 'S', 'A', 'B', 'C', 'D'] },
    { key: 'verified',           label: 'Verified',           type: 'boolean' },
    // Directly under `verified`, same reasoning as implant_stats above: text
    // rather than a select, because the backfilled prose in this column cannot
    // be represented by a fixed option set and a select would risk destroying it.
    { key: 'verified_source',    label: 'Verified Source',    type: 'text',
      placeholder: 'e.g. owner in-game entry, March 2026 (attested 2026-07-21)' },
    { key: 'notes',              label: 'Notes',              type: 'textarea' },
    { key: 'image_filename',     label: 'Image Filename',     type: 'text',    placeholder: 'e.g. core-name.webp' },
  ],

  editor_directives: [
    { key: 'editor',        label: 'Editor',          type: 'select',         required: true, options: ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA', 'VANTAGE'] },
    { key: 'directive_type',label: 'Directive Type',  type: 'select',         required: true, options: ['standard', 'creator_spotlight', 'discourse'] },
    { key: 'instruction',   label: 'Instruction',     type: 'textarea',       required: true, placeholder: 'e.g. Cover the April 14 balance patch -- Longshot nerf, Recon Echo Pulse buffs.' },
    { key: 'url',           label: 'Source URL',      type: 'text',           placeholder: 'e.g. https://x.com/BungieHelp/status/...' },
    { key: 'source_text',     label: 'Vetted Source Text', type: 'textarea',  creatorOnly: true, placeholder: 'Paste the VETTED facts the article must be built from. The editor writes ONLY from this -- it will not add or invent anything beyond what you put here.' },
    { key: 'creator_name',    label: 'Creator Name',       type: 'text',      creatorOnly: true, placeholder: 'e.g. Marshyy' },
    { key: 'creator_youtube', label: 'Creator YouTube URL',type: 'text',      creatorOnly: true, placeholder: 'https://youtube.com/@...' },
    { key: 'creator_x',       label: 'Creator X/Twitter URL', type: 'text',   creatorOnly: true, placeholder: 'https://x.com/...' },
    { key: 'creator_twitch',  label: 'Creator Twitch URL', type: 'text',      creatorOnly: true, placeholder: 'https://twitch.tv/...' },
    { key: 'creator_other',   label: 'Creator Other URL',  type: 'text',      creatorOnly: true, placeholder: 'Any other canonical profile (optional)' },
    { key: 'creator_game',    label: 'Game Slug (discourse)', type: 'text',    creatorOnly: true, placeholder: 'e.g. dmz (defaults to dmz for VANTAGE discourse drafts)' },
    { key: 'scheduled_for', label: 'Scheduled For',   type: 'datetime-local', placeholder: 'Leave blank to fire on next cycle' },
    { key: 'status',        label: 'Status',          type: 'select',         options: ['pending', 'consumed'] },
  ],

  factions: [
    { key: 'name',             label: 'Faction Name',    type: 'select',   required: true, options: FACTION_NAMES },
    { key: 'leader',           label: 'Leader',          type: 'text',     placeholder: 'e.g. CHIMERA' },
    { key: 'focus',            label: 'Focus',           type: 'text',     placeholder: 'e.g. Melee / Combat' },
    { key: 'description',      label: 'Description',     type: 'textarea', placeholder: 'What this faction specializes in and how to gain reputation' },
    { key: 'image_filename',   label: 'Image Filename',  type: 'text',     placeholder: 'e.g. arachne.webp' },
    { key: 'max_credit_cost',  label: 'Max Credit Cost', type: 'number',   placeholder: 'e.g. 200000' },
    { key: 'max_cost_summary', label: 'Max Materials',   type: 'textarea', placeholder: 'e.g. Unstable Diode x141, Unstable Gel x78, Unstable Gunmetal x75...' },
  ],

  faction_stat_bonuses: [
    { key: 'faction_name',  label: 'Faction',        type: 'select',   required: true, options: FACTION_NAMES },
    { key: 'stat_name',     label: 'Stat Boosted',   type: 'select',   required: true, options: STAT_NAMES },
    { key: 'stat_value',    label: 'Boost Amount',   type: 'number',   required: true, placeholder: 'e.g. 20' },
    { key: 'rank_required', label: 'Rank Required',  type: 'number',   placeholder: 'e.g. 15' },
    { key: 'credit_cost',   label: 'Credit Cost',    type: 'number',   placeholder: 'e.g. 2500' },
    { key: 'material_cost', label: 'Material Cost',  type: 'text',     placeholder: 'e.g. 10 Unstable Gel, 2 Drone Node' },
    { key: 'notes',         label: 'Notes',          type: 'textarea', placeholder: 'Any additional context' },
  ],

  faction_unlocks: [
    { key: 'faction_name',  label: 'Faction',        type: 'select',   required: true, options: FACTION_NAMES },
    { key: 'unlock_type',   label: 'Unlock Type',     type: 'select',   required: true, options: ['weapon', 'implant', 'mod', 'consumable', 'upgrade', 'function'] },
    { key: 'item_name',     label: 'Item Name',       type: 'text',     required: true, placeholder: 'e.g. TAC_AMP.EXE' },
    { key: 'tier',          label: 'Tier',            type: 'number',   placeholder: '1 or 2' },
    { key: 'rank_required', label: 'Rank Required',   type: 'number',   placeholder: 'e.g. 12' },
    { key: 'credit_cost',   label: 'Credit Cost',     type: 'number',   placeholder: 'e.g. 1500' },
    { key: 'material_cost', label: 'Material Cost',   type: 'text',     placeholder: 'e.g. Storage Drive x10, Unstable Diode x10' },
    { key: 'notes',         label: 'Notes/Effect',    type: 'textarea', placeholder: 'e.g. Partially fills tactical ability charge at start of run' },
  ],

  faction_materials: [
    { key: 'faction_name',   label: 'Faction',         type: 'select',  required: true, options: FACTION_NAMES },
    { key: 'material_name',  label: 'Material Name',   type: 'text',    required: true, placeholder: 'e.g. Unstable Gel' },
    { key: 'rarity',         label: 'Rarity',          type: 'select',  options: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'] },
    { key: 'image_filename', label: 'Image Filename',  type: 'text',    placeholder: 'e.g. unstable-gel.webp' },
  ],

  game_maps: [
    { key: 'game_slug',        label: 'Game',             type: 'select',   required: true, options: ['marathon'] },
    { key: 'slug',             label: 'Slug',             type: 'text',     required: true, placeholder: 'e.g. perimeter' },
    { key: 'name',             label: 'Name',             type: 'text',     required: true, placeholder: 'e.g. Perimeter' },
    { key: 'difficulty',       label: 'Difficulty',       type: 'select',   options: ['', 'Beginner', 'Intermediate', 'Advanced', 'Endgame'] },
    { key: 'player_structure', label: 'Player Structure', type: 'text',     placeholder: 'e.g. ~5 teams of 3 + Rooks' },
    { key: 'style',            label: 'Style',            type: 'textarea', placeholder: 'Terrain / vibe' },
    { key: 'summary',          label: 'Summary (editor-facing)', type: 'textarea', placeholder: 'The 1-2 sentence verified description editors cite.' },
    { key: 'best_for',         label: 'Best For',         type: 'text' },
    { key: 'variant_of',       label: 'Variant Of (slug)',type: 'text',     placeholder: 'e.g. dire-marsh (leave blank if not a variant)' },
    { key: 'verified',         label: 'Verified',         type: 'boolean' },
  ],

  game_zones: [
    { key: 'game_slug', label: 'Game',      type: 'select',   required: true, options: ['marathon'] },
    { key: 'map_slug',  label: 'Map Slug',  type: 'text',     required: true, placeholder: 'e.g. perimeter' },
    { key: 'zone_name', label: 'Zone Name', type: 'text',     required: true, placeholder: 'e.g. North Relay' },
    { key: 'zone_type', label: 'Zone Type', type: 'text',     placeholder: 'e.g. relay hub / boss arena / connector' },
    { key: 'summary',   label: 'Summary (editor-facing)', type: 'textarea', placeholder: 'The verified 1-2 sentence zone description editors cite.' },
    { key: 'verified',  label: 'Verified',  type: 'boolean' },
  ],

  game_bosses: [
    { key: 'game_slug', label: 'Game',      type: 'select',   required: true, options: ['marathon'] },
    { key: 'boss_name', label: 'Boss Name', type: 'text',     required: true, placeholder: 'e.g. Wraith Warden' },
    { key: 'map_slug',  label: 'Map Slug',  type: 'text',     placeholder: 'e.g. perimeter' },
    { key: 'summary',   label: 'Summary (editor-facing)', type: 'textarea', placeholder: 'The verified boss description editors cite.' },
    { key: 'verified',  label: 'Verified',  type: 'boolean' },
  ],

  game_events: [
    { key: 'game_slug',   label: 'Game',        type: 'select',   required: true, options: ['marathon'] },
    { key: 'event_name',  label: 'Event Name',  type: 'text',     required: true, placeholder: 'e.g. Intercept' },
    { key: 'event_type',  label: 'Event Type',  type: 'text',     placeholder: 'e.g. profit / lockdown / convoy' },
    { key: 'available_on',label: 'Available On',type: 'text',     placeholder: 'map slug(s) or "all"' },
    { key: 'summary',     label: 'Summary (editor-facing)', type: 'textarea', placeholder: 'The verified event description editors cite.' },
    { key: 'verified',    label: 'Verified',    type: 'boolean' },
  ],

  game_modes: [
    { key: 'game_slug',      label: 'Game',         type: 'select',   required: true, options: ['marathon'] },
    { key: 'mode_name',      label: 'Mode Name',    type: 'text',     required: true, placeholder: 'e.g. Sponsored Survival' },
    { key: 'mode_type',      label: 'Mode Type',    type: 'select',   options: ['', 'core', 'experimental', 'ranked', 'endgame'] },
    { key: 'available_on',   label: 'Available On', type: 'text',     placeholder: 'map slug(s) or "all"' },
    { key: 'summary',        label: 'Summary (editor-facing)', type: 'textarea', placeholder: 'The verified mode description editors cite.' },
    { key: 'is_limited_time',label: 'Limited Time', type: 'boolean' },
    { key: 'verified',       label: 'Verified',     type: 'boolean' },
  ],

  // ---- DMZ LAUNCH ENTITY TABLES ----------------------------------
  // Order: identity (name -> slug) first, then the type-specific facts, then
  // provenance/verification last. game_slug is omitted -- the DB defaults it to
  // 'dmz'. id/created_at/updated_at are DB defaults (the form strips them).
  // `verified` defaults to FALSE for every table (see buildFormDefaults) so a new
  // row is never silently confirmed. `autoSlug` derives the slug from the name.
  dmz_keys: [
    { key: 'name',               label: 'Name',               type: 'text',     required: true, placeholder: 'e.g. Crane Control Room Key' },
    { key: 'slug',               label: 'Slug',               type: 'text',     required: true, autoSlug: true, placeholder: 'auto from name; edit if needed' },
    { key: 'location',           label: 'Location (POI)',     type: 'text',     placeholder: 'e.g. Al Mazrah, Crane' },
    { key: 'unlocks',            label: 'Unlocks',            type: 'text',     placeholder: 'what the key opens' },
    { key: 'map_region',         label: 'Map Region',         type: 'text',     placeholder: 'e.g. Hajin - Northeast' },
    { key: 'description',        label: 'Description',        type: 'textarea', placeholder: 'What this key is, in one or two sentences.' },
    { key: 'acquisition_source', label: 'Acquisition Source', type: 'text',     placeholder: 'e.g. HVT drop, mission reward' },
    { key: 'acquisition_detail', label: 'Acquisition Detail', type: 'text' },
    { key: 'verified',           label: 'Verified in-game',   type: 'boolean' },
    { key: 'verified_source',    label: 'Verified Source',    type: 'text',     placeholder: 'e.g. owner-verified in-game' },
    { key: 'patch_verified',     label: 'Patch Verified',     type: 'text',     placeholder: 'e.g. S1' },
    { key: 'source_url',         label: 'Source URL',         type: 'text' },
    { key: 'notes',              label: 'Notes (internal)',   type: 'textarea' },
  ],
  dmz_missions: [
    { key: 'name',               label: 'Name',               type: 'text',     required: true, placeholder: 'e.g. Konni Secrets' },
    { key: 'slug',               label: 'Slug',               type: 'text',     required: true, autoSlug: true, placeholder: 'auto from name; edit if needed' },
    { key: 'faction',            label: 'Faction',            type: 'text',     placeholder: 'e.g. Legion' },
    { key: 'tier',               label: 'Tier',               type: 'text',     placeholder: 'e.g. Tier 3' },
    { key: 'objectives',         label: 'Objectives',         type: 'array',    placeholder: 'One objective per line' },
    { key: 'reward',             label: 'Reward',             type: 'text' },
    { key: 'description',        label: 'Description',        type: 'textarea', placeholder: 'What the mission is, in one or two sentences.' },
    { key: 'acquisition_source', label: 'Acquisition Source', type: 'text',     placeholder: 'e.g. faction board' },
    { key: 'acquisition_detail', label: 'Acquisition Detail', type: 'text' },
    { key: 'verified',           label: 'Verified in-game',   type: 'boolean' },
    { key: 'verified_source',    label: 'Verified Source',    type: 'text' },
    { key: 'patch_verified',     label: 'Patch Verified',     type: 'text' },
    { key: 'source_url',         label: 'Source URL',         type: 'text' },
    { key: 'notes',              label: 'Notes (internal)',   type: 'textarea' },
  ],
  dmz_items: [
    { key: 'name',               label: 'Name',               type: 'text',     required: true, placeholder: 'e.g. Gold Skull' },
    { key: 'slug',               label: 'Slug',               type: 'text',     required: true, autoSlug: true, placeholder: 'auto from name; edit if needed' },
    { key: 'category',           label: 'Category',           type: 'text',     placeholder: 'e.g. Valuable, Key Item' },
    { key: 'sell_value',         label: 'Sell Value',         type: 'text',     placeholder: 'e.g. 5000 (text -- ranges allowed)' },
    { key: 'use',                label: 'Use',                type: 'text',     placeholder: 'what it is for' },
    { key: 'description',        label: 'Description',        type: 'textarea', placeholder: 'What this item is, in one or two sentences.' },
    { key: 'acquisition_source', label: 'Acquisition Source', type: 'text' },
    { key: 'acquisition_detail', label: 'Acquisition Detail', type: 'text' },
    { key: 'verified',           label: 'Verified in-game',   type: 'boolean' },
    { key: 'verified_source',    label: 'Verified Source',    type: 'text' },
    { key: 'patch_verified',     label: 'Patch Verified',     type: 'text' },
    { key: 'source_url',         label: 'Source URL',         type: 'text' },
    { key: 'notes',              label: 'Notes (internal)',   type: 'textarea' },
  ],
};

const NULLABLE_SELECT_NULL_VALUE = 'Universal';
const NULLABLE_SELECT_FACTION_NULL = 'None';

// Maps the flat creator_* form fields to/from the creator_info jsonb column.
const CREATOR_FIELD_MAP = {
  creator_name:    'name',
  creator_youtube: 'youtube',
  creator_x:       'x',
  creator_twitch:  'twitch',
  creator_other:   'other',
  creator_game:    'game_slug',
};

// Directive types that carry a vetted source_text + creator_info block (the
// source-strict flows): creator_spotlight (published by the cron) and discourse
// (drafted by scripts/gen-vantage-discourse.mjs). Both surface the creatorOnly
// fields and pack creator_info; standard directives do neither.
const SOURCE_DIRECTIVE_TYPES = ['creator_spotlight', 'discourse'];

const TABS = [
  { key: 'editor_directives',    label: 'DIRECTIVES',   color: '#ff2d55' },
  { key: 'keyword_targets',      label: 'KEYWORD TARGETS', color: '#ff8c00' },
  { key: 'factions',             label: 'FACTIONS',     color: '#ffd700', group: 'faction' },
  { key: 'faction_stat_bonuses', label: 'FACTION STATS',color: '#ffd700', group: 'faction' },
  { key: 'faction_unlocks',      label: 'F. UNLOCKS',   color: '#ffd700', group: 'faction' },
  { key: 'faction_materials',    label: 'F. MATERIALS', color: '#ffd700', group: 'faction' },
  { key: 'weapon_stats',         label: 'WEAPONS',      color: '#ff8800' },
  { key: 'shell_stats',          label: 'SHELLS',       color: '#00f5ff' },
  { key: 'shell_stat_values',    label: 'SHELL STATS',  color: '#00ff88' },
  { key: 'mod_stats',            label: 'MODS',         color: '#ff0000' },
  { key: 'core_stats',           label: 'CORES',        color: '#ffd700' },
  { key: 'implant_stats',        label: 'IMPLANTS',     color: '#9b5de5' },
  { key: 'ammo_stats',           label: 'AMMO',         color: '#00ff88' },
  { key: 'game_maps',            label: 'MAPS',         color: '#00f5ff', group: 'world' },
  { key: 'game_zones',           label: 'ZONES',        color: '#00f5ff', group: 'world' },
  { key: 'game_bosses',          label: 'BOSSES',       color: '#00f5ff', group: 'world' },
  { key: 'game_events',          label: 'EVENTS',       color: '#00f5ff', group: 'world' },
  { key: 'game_modes',           label: 'MODES',        color: '#00f5ff', group: 'world' },
  { key: 'dmz_keys',             label: 'DMZ KEYS',     color: '#00ff88', group: 'dmz' },
  { key: 'dmz_missions',         label: 'DMZ MISSIONS', color: '#00ff88', group: 'dmz' },
  { key: 'dmz_items',            label: 'DMZ ITEMS',    color: '#00ff88', group: 'dmz' },
];

const S = {
  bg: '#030303',
  surface: '#0a0a0a',
  border: 'rgba(255,255,255,0.07)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.35)',
  input: {
    background: '#111',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    borderRadius: 4,
    padding: '8px 12px',
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
  },
};

const WEAPON_GROUPS = ['Identity', 'Firepower', 'Accuracy', 'Handling', 'Range & Mag', 'Flags'];
const GROUP_COLORS = {
  Identity: '#ffffff', Firepower: '#ff0000', Accuracy: '#00f5ff',
  Handling: '#ff8800', 'Range & Mag': '#9b5de5', Flags: '#00ff88',
};

const EDITOR_COLORS = { CIPHER: '#ff0000', NEXUS: '#00f5ff', DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5' };
const STATUS_COLORS = { pending: '#ff2d55', consumed: '#00ff88' };
const FACTION_COLORS = { Cyberacme: '#00ff41', Nucaloric: '#ff2d78', Traxus: '#ff6600', Mida: '#cc44ff', Arachne: '#ff1a1a', Sekiguchi: '#c8b400' };

function toDatetimeLocal(timestampStr) {
  if (!timestampStr) return '';
  try {
    var d = new Date(timestampStr);
    if (isNaN(d.getTime())) return '';
    var pad = function(n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
      + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  } catch (e) {
    return '';
  }
}

function datetimeLocalToISO(value) {
  if (!value || typeof value !== 'string') return null;
  var match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return null;
  var year = Number(match[1]);
  var month = Number(match[2]) - 1;
  var day = Number(match[3]);
  var hour = Number(match[4]);
  var minute = Number(match[5]);
  var d = new Date(year, month, day, hour, minute, 0, 0);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function rowToFormData(row, schema) {
  const formData = { ...row };
  schema.forEach(field => {
    if (field.nullableSelect) {
      var nullVal = field.options && field.options[0] === 'None' ? NULLABLE_SELECT_FACTION_NULL : NULLABLE_SELECT_NULL_VALUE;
      if (formData[field.key] === null || formData[field.key] === undefined || formData[field.key] === '') {
        formData[field.key] = nullVal;
      }
    }
    if (field.type === 'datetime-local' && formData[field.key]) {
      formData[field.key] = toDatetimeLocal(formData[field.key]);
    }
    // 'array' column -> newline-joined string for the textarea when editing.
    if (field.type === 'array' && Array.isArray(formData[field.key])) {
      formData[field.key] = formData[field.key].join(String.fromCharCode(10));
    }
  });
  // Unpack creator_info jsonb into flat creator_* fields for the form.
  if (row && row.creator_info && typeof row.creator_info === 'object') {
    Object.keys(CREATOR_FIELD_MAP).forEach(function(formKey) {
      var jsonKey = CREATOR_FIELD_MAP[formKey];
      if (row.creator_info[jsonKey]) formData[formKey] = row.creator_info[jsonKey];
    });
  }
  return formData;
}

function formDataToRow(formData, schema) {
  const row = { ...formData };
  schema.forEach(field => {
    if (field.nullableSelect) {
      var nullVal = field.options && field.options[0] === 'None' ? NULLABLE_SELECT_FACTION_NULL : NULLABLE_SELECT_NULL_VALUE;
      if (row[field.key] === nullVal) row[field.key] = null;
    }
    if (field.type === 'number' && row[field.key] !== '' && row[field.key] !== null && row[field.key] !== undefined) {
      row[field.key] = Number(row[field.key]);
    }
    if (field.type === 'boolean') {
      row[field.key] = row[field.key] === true || row[field.key] === 'true';
    }
    // 'array' (Postgres text[]): the textarea holds one entry per line. Split,
    // trim, drop blanks -> a real array. Empty -> null (not an empty string,
    // which Postgres would reject as a malformed array literal).
    if (field.type === 'array') {
      var parts = String(row[field.key] || '').split(String.fromCharCode(10)).map(function (x) { return x.trim(); }).filter(Boolean);
      row[field.key] = parts.length > 0 ? parts : null;
    }
    if (field.type === 'datetime-local') {
      if (row[field.key] === '' || row[field.key] === undefined || row[field.key] === null) {
        row[field.key] = null;
      } else {
        row[field.key] = datetimeLocalToISO(row[field.key]);
      }
    }
    if (row[field.key] === '') row[field.key] = null;
  });
  // Pack flat creator_* fields back into the creator_info jsonb column, then
  // strip the flat keys (they are form-only, not real columns).
  var creatorInfo = {};
  var hasCreator = false;
  Object.keys(CREATOR_FIELD_MAP).forEach(function(formKey) {
    var jsonKey = CREATOR_FIELD_MAP[formKey];
    if (row[formKey]) { creatorInfo[jsonKey] = row[formKey]; hasCreator = true; }
    delete row[formKey];
  });
  // Attach creator_info on the source-strict directive types (creator_spotlight,
  // discourse); standard directives leave it empty and null their source_text.
  if (SOURCE_DIRECTIVE_TYPES.includes(row.directive_type) && hasCreator) {
    row.creator_info = creatorInfo;
  } else if ('directive_type' in row && !SOURCE_DIRECTIVE_TYPES.includes(row.directive_type)) {
    row.creator_info = {};
    row.source_text = row.source_text || null;
  }
  return row;
}

function buildFormDefaults(activeTab, stickyValues) {
  const schema = SCHEMAS[activeTab] || [];
  const stickyKeys = STICKY_FIELDS[activeTab] || [];
  const defaults = {};
  schema.forEach(f => {
    if (stickyKeys.includes(f.key) && stickyValues && stickyValues[f.key] !== undefined && stickyValues[f.key] !== '') {
      defaults[f.key] = stickyValues[f.key];
      return;
    }
    // `verified` defaults FALSE on EVERY table -- a new row must never arrive
    // pre-ticked. It is a claim about evidence, not a convenience default
    // (the honesty gate + the index gate).
    // Scoped by FIELD NAME, not by table prefix: the old game_/dmz_ prefix guard
    // left core_stats, implant_stats and weapon_stats pre-ticking it. The
    // 2026-07-21 audit found 204 verified rows across the first two, of which the
    // individually-timestamped majority match this mechanism (a microsecond-
    // clustered minority came from somewhere else and is NOT explained by the
    // form). Other boolean fields keep their true default.
    if (f.type === 'boolean') defaults[f.key] = f.key === 'verified' ? false : true;
    else if (f.nullableSelect) defaults[f.key] = f.options && f.options[0] === 'None' ? NULLABLE_SELECT_FACTION_NULL : NULLABLE_SELECT_NULL_VALUE;
    else defaults[f.key] = '';
  });
  if (activeTab === 'editor_directives') {
    if (!defaults.status) defaults.status = 'pending';
    if (!defaults.directive_type) defaults.directive_type = 'standard';
  }
  return defaults;
}

export default function AdminPage() {
  const [password, setPassword]           = useState('');
  const [authed, setAuthed]               = useState(false);
  const [authError, setAuthError]         = useState('');
  const [activeTab, setActiveTab]         = useState('editor_directives');
  const [rows, setRows]                   = useState([]);
  const [loading, setLoading]             = useState(false);
  const [editingRow, setEditingRow]       = useState(null);
  const [showAddForm, setShowAddForm]     = useState(false);
  const [formData, setFormData]           = useState({});
  const [saving, setSaving]               = useState(false);
  const [toast, setToast]                 = useState(null);
  const [search, setSearch]               = useState('');
  const [filterFaction, setFilterFaction] = useState('');
  const [filterRunner, setFilterRunner]   = useState('');
  const [stickyValues, setStickyValues]   = useState({});

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  function apiHeaders() {
    return { 'Content-Type': 'application/json', 'x-admin-password': password };
  }

  async function login() {
    setAuthError('');
    const res = await fetch('/api/admin?table=ammo_stats', { headers: { 'x-admin-password': password } });
    if (res.ok) { setAuthed(true); } else { setAuthError('Incorrect password.'); }
  }

  const loadTable = useCallback(async (table) => {
    setLoading(true); setRows([]); setSearch(''); setFilterFaction(''); setFilterRunner('');
    setStickyValues({});
    try {
      const res = await fetch('/api/admin?table=' + table, { headers: apiHeaders() });
      const json = await res.json();
      if (json.data) setRows(json.data);
    } catch (e) { showToast('Failed to load data', false); }
    setLoading(false);
  }, [password]);

  useEffect(() => { if (authed) loadTable(activeTab); }, [authed, activeTab, loadTable]);

  // Bring the add/edit form INTO view when it opens, without yanking to the
  // absolute page top. This runs in an effect, not in startAdd/startEdit, on
  // purpose: those handlers set showAddForm/editingRow, and the form
  // ({(showAddForm || editingRow) && ...}) is not in the DOM until React commits
  // the re-render -- so formRef.current is still null if scrollIntoView is called
  // synchronously in the handler. The effect fires after the commit, when the node
  // exists. block:'nearest' means an already-visible form does not move.
  const formRef = useRef(null);
  useEffect(() => {
    if (showAddForm || editingRow) {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [showAddForm, editingRow]);

  function startEdit(row) {
    setEditingRow(row.id);
    setFormData(rowToFormData(row, SCHEMAS[activeTab] || []));
    setShowAddForm(false);
  }

  function startAdd() {
    setShowAddForm(true); setEditingRow(null);
    setFormData(buildFormDefaults(activeTab, stickyValues));
  }

  function cancelForm() { setEditingRow(null); setShowAddForm(false); setFormData({}); }

  async function saveEdit() {
    setSaving(true);
    try {
      const schema = SCHEMAS[activeTab] || [];
      const updates = formDataToRow({ ...formData }, schema);
      delete updates.id; delete updates.updated_at; delete updates.created_at; delete updates.consumed_at;
      const res = await fetch('/api/admin', { method: 'PATCH', headers: apiHeaders(), body: JSON.stringify({ table: activeTab, id: editingRow, updates }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRows(rows.map(r => r.id === editingRow ? json.data : r));
      cancelForm(); showToast('Saved successfully');
    } catch (e) { showToast(e.message, false); }
    setSaving(false);
  }

  async function saveNew(stayOpen) {
    setSaving(true);
    try {
      const schema = SCHEMAS[activeTab] || [];
      const row = formDataToRow({ ...formData }, schema);
      delete row.id; delete row.updated_at; delete row.created_at; delete row.consumed_at;
      const res = await fetch('/api/admin', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ table: activeTab, row }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRows([json.data, ...rows]);

      const stickyKeys = STICKY_FIELDS[activeTab] || [];
      const newStickyValues = {};
      stickyKeys.forEach(key => {
        if (formData[key] !== undefined && formData[key] !== '' && formData[key] !== null) {
          newStickyValues[key] = formData[key];
        }
      });
      setStickyValues(newStickyValues);

      if (stayOpen) {
        setFormData(buildFormDefaults(activeTab, newStickyValues));
        showToast(activeTab === 'editor_directives' ? 'Directive queued -- enter next' : 'Saved -- enter next');
      } else {
        cancelForm();
        showToast(activeTab === 'editor_directives' ? (row.scheduled_for ? 'Directive scheduled' : 'Directive queued -- fires on next cron cycle') : 'Row added');
      }
    } catch (e) { showToast(e.message, false); }
    setSaving(false);
  }

  async function deleteRow(id, name) {
    if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin?table=' + activeTab + '&id=' + id, { method: 'DELETE', headers: apiHeaders() });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRows(rows.filter(r => r.id !== id));
      showToast('Deleted');
    } catch (e) { showToast(e.message, false); }
  }

  // Slug auto-derivation: when the operator types the NAME and the active table
  // has an autoSlug slug field, keep slug = slugify(name) UNLESS the operator has
  // manually overridden it (detected by comparing the current slug to the slug
  // derived from the previous name). Prevents at-speed typos that the unique
  // index would silently turn into duplicate rows.
  function slugify(v) {
    return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }
  function updateField(key, value) {
    setFormData(function (prev) {
      var next = { ...prev, [key]: value };
      if (key === 'name') {
        var schema = SCHEMAS[activeTab] || [];
        var slugField = schema.find(function (f) { return f.key === 'slug' && f.autoSlug; });
        if (slugField) {
          var currentSlug = prev.slug || '';
          var wasAuto = currentSlug === '' || currentSlug === slugify(prev.name || '');
          if (wasAuto) next.slug = slugify(value);
        }
      }
      return next;
    });
  }

  var activeTabConfig   = TABS.find(t => t.key === activeTab);
  var schema            = SCHEMAS[activeTab] || [];
  var isWeapons         = activeTab === 'weapon_stats';
  var isDirectives      = activeTab === 'editor_directives';
  var isFactionTab      = ['factions', 'faction_stat_bonuses', 'faction_unlocks', 'faction_materials'].includes(activeTab);
  var isWorldTab        = activeTab.indexOf('game_') === 0;
  var isCoresOrImplants = activeTab === 'core_stats' || activeTab === 'implant_stats';
  var pendingCount      = activeTab === 'editor_directives' ? rows.filter(r => r.status === 'pending').length : 0;
  var isCreatorDirective = isDirectives && formData.directive_type === 'creator_spotlight';

  var supportsBatchEntry = (STICKY_FIELDS[activeTab] || []).length > 0;

  var filtered = rows.filter(r => {
    var matchSearch  = !search        || Object.values(r).some(v => v && String(v).toLowerCase().includes(search.toLowerCase()));
    var matchFaction = !filterFaction || r.faction_name === filterFaction;
    var matchRunner  = !filterRunner
      || (filterRunner === 'Universal' && (r.required_runner === null || r.required_runner === '' || r.required_runner === undefined))
      || r.required_runner === filterRunner
      || r.shell_name === filterRunner;
    return matchSearch && matchFaction && matchRunner;
  });

  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 360, padding: 40, border: '1px solid rgba(155,93,229,0.3)', borderRadius: 8, background: S.surface }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, color: '#9b5de5', marginBottom: 8, letterSpacing: 2 }}>ADMIN ACCESS</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: S.muted, letterSpacing: 2, marginBottom: 28 }}>CYBERNETICPUNKS DATA PANEL</div>
          <input type="password" placeholder="Enter admin password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && login()} style={{ ...S.input, marginBottom: 12 }} />
          {authError && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#ff4444', marginBottom: 12 }}>{authError}</div>}
          <button onClick={login} style={{ width: '100%', padding: '10px', background: '#9b5de5', border: 'none', borderRadius: 4, color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>AUTHENTICATE</button>
        </div>
      </div>
    );
  }

  function renderForm() {
    if (isWeapons) {
      return (
        <div>
          {WEAPON_GROUPS.map(group => {
            var groupFields = schema.filter(f => f.group === group);
            return (
              <div key={group} style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: GROUP_COLORS[group], letterSpacing: 3, marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid ' + GROUP_COLORS[group] + '22' }}>{group.toUpperCase()}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {groupFields.map(field => renderField(field))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    if (isDirectives) {
      var needsSource = SOURCE_DIRECTIVE_TYPES.includes(formData.directive_type);
      var isDiscourse = formData.directive_type === 'discourse';
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            {schema.filter(f => f.key === 'editor' || f.key === 'directive_type' || f.key === 'status').map(field => renderField(field))}
          </div>
          {schema.filter(f => f.key === 'instruction' || f.key === 'url').map(field => renderField(field))}
          {needsSource && (
            <div style={{ background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.18)', borderLeft: '3px solid #00f5ff', borderRadius: 6, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', letterSpacing: 2 }}>
                {isDiscourse ? 'DISCOURSE -- VETTED SOURCE + CREATOR IDENTITY' : 'CREATOR SPOTLIGHT -- VETTED SOURCE + CREATOR IDENTITY'}
              </div>
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                {isDiscourse
                  ? 'VANTAGE writes a discourse DRAFT (is_published=false -- nothing publishes in Phase 1) STRICTLY from the vetted source text below. She characterizes what the creator SAID and never asserts game facts herself. Set Game Slug for the game the discourse is about (defaults to dmz). Run scripts/gen-vantage-discourse.mjs to generate the draft.'
                  : 'The editor writes the article STRICTLY from the vetted source text below -- it will not add, infer, or invent anything beyond it. The creator URLs power the article\'s tagging and Person/sameAs SEO schema.'}
              </div>
              {schema.filter(f => f.creatorOnly).map(field => renderField(field))}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
            {schema.filter(f => f.key === 'scheduled_for').map(field => renderField(field))}
          </div>
          <div style={{ background: 'rgba(255,45,85,0.05)', border: '1px solid rgba(255,45,85,0.15)', borderLeft: '3px solid #ff2d55', borderRadius: 6, padding: '12px 16px' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff2d55', letterSpacing: 2, marginBottom: 6 }}>HOW THIS WORKS</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Set status to <strong style={{ color: '#ff2d55' }}>pending</strong>. If <strong style={{ color: '#00f5ff' }}>Scheduled For</strong> is set, the directive fires on the first cron cycle on or after that local time. If blank, fires on the next cron cycle immediately. Status auto-updates to <strong style={{ color: '#00ff88' }}>consumed</strong> after use.
            </div>
          </div>
        </div>
      );
    }
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {schema.map(field => renderField(field))}
      </div>
    );
  }

  function renderField(field) {
    var nullVal = field.options && field.options[0] === 'None' ? NULLABLE_SELECT_FACTION_NULL : NULLABLE_SELECT_NULL_VALUE;
    var stickyKeys = STICKY_FIELDS[activeTab] || [];
    var isSticky = stickyKeys.includes(field.key) && showAddForm;
    return (
      <div key={field.key}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: S.muted, letterSpacing: 2, marginBottom: 5, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{field.label}{field.required ? ' *' : ''}</span>
          {isSticky && (
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#00f5ff', background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', borderRadius: 2, padding: '1px 5px', letterSpacing: 1 }}>STICKY</span>
          )}
        </div>
        {field.type === 'textarea' || field.type === 'array' ? (
          <textarea value={formData[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} rows={field.key === 'instruction' || field.key === 'description' || field.key === 'max_cost_summary' || field.key === 'source_text' || field.key === 'summary' || field.key === 'style' ? 5 : 3} placeholder={field.placeholder || ''} style={{ ...S.input, resize: 'vertical' }} />
        ) : field.type === 'select' ? (
          <select value={formData[field.key] ?? (field.nullableSelect ? nullVal : '')} onChange={e => updateField(field.key, e.target.value)} style={{ ...S.input }}>
            {!field.nullableSelect && <option value="">-- Select --</option>}
            {(field.options || []).map(o => (
              <option key={o} value={o}>{o === '' ? '-- None --' : o}</option>
            ))}
          </select>
        ) : field.type === 'boolean' ? (
          <select value={String(formData[field.key] ?? true)} onChange={e => updateField(field.key, e.target.value === 'true')} style={{ ...S.input }}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : (
          <>
            <input
              type={field.type === 'number' ? 'number' : field.type === 'datetime-local' ? 'datetime-local' : field.type === 'date' ? 'date' : 'text'}
              value={formData[field.key] ?? ''}
              onChange={e => updateField(field.key, e.target.value)}
              placeholder={field.placeholder || ''}
              style={{ ...S.input }}
            />
            {field.key === 'image_filename' && formData[field.key] && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={`/images/${activeTab === 'shell_stats' ? 'shells' : activeTab === 'mod_stats' ? 'mods' : activeTab === 'core_stats' ? 'cores' : activeTab === 'implant_stats' ? 'implants' : activeTab === 'factions' ? 'factions' : activeTab === 'faction_materials' ? 'materials' : 'weapons'}/${formData[field.key]}`}
                  alt={formData.name || 'preview'}
                  style={{ height: 48, objectFit: 'contain', background: 'rgba(255,255,255,0.04)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', padding: 4 }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function rowPreview(row) {
    if (activeTab === 'editor_directives') {
      var ec = EDITOR_COLORS[row.editor] || '#888';
      var sc = STATUS_COLORS[row.status] || '#888';
      var isCreatorRow = row.directive_type === 'creator_spotlight';
      var scheduledLabel = null;
      if (row.scheduled_for) {
        try {
          var dt = new Date(row.scheduled_for);
          if (!isNaN(dt.getTime())) {
            scheduledLabel = dt.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
          }
        } catch (e) {}
      }
      return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: ec, flexShrink: 0, minWidth: 60 }}>{row.editor}</span>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: sc, background: sc + '18', border: '1px solid ' + sc + '44', borderRadius: 3, padding: '2px 8px', letterSpacing: 1, flexShrink: 0 }}>{(row.status || 'pending').toUpperCase()}</span>
          {isCreatorRow && (
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', background: 'rgba(0,245,255,0.12)', border: '1px solid rgba(0,245,255,0.35)', borderRadius: 3, padding: '2px 8px', letterSpacing: 1, flexShrink: 0 }}>CREATOR{row.creator_info && row.creator_info.name ? ': ' + row.creator_info.name : ''}</span>
          )}
          {scheduledLabel && (
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', borderRadius: 3, padding: '2px 8px', letterSpacing: 1, flexShrink: 0 }}>{scheduledLabel}</span>
          )}
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.4 }}>{(row.instruction || '').slice(0, 100)}{(row.instruction || '').length > 100 ? '...' : ''}</span>
          {row.url && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(0,245,255,0.5)', flexShrink: 0 }}>URL</span>}
        </div>
      );
    }
    if (isWorldTab) {
      var wc = '#00f5ff';
      var title = row.name || row.zone_name || row.boss_name || row.event_name || row.mode_name || '--';
      var sub = row.map_slug || row.slug || row.available_on || row.mode_type || row.zone_type || '';
      return (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff' }}>{title}</span>
          {sub && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: wc }}>{sub}</span>}
          {row.variant_of && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#9b5de5', background: 'rgba(155,93,229,0.12)', border: '1px solid rgba(155,93,229,0.3)', borderRadius: 3, padding: '2px 7px' }}>VARIANT OF {row.variant_of}</span>}
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: row.verified ? '#00ff88' : '#ff8800' }}>{row.verified ? 'VERIFIED' : 'UNVERIFIED'}</span>
          {row.summary && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)', flex: 1, minWidth: 200 }}>{row.summary.slice(0, 80)}{row.summary.length > 80 ? '...' : ''}</span>}
        </div>
      );
    }
    if (activeTab === 'factions') {
      var fc = FACTION_COLORS[row.name] || '#ffd700';
      return (
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: fc }}>{row.name}</span>
          {row.leader && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>LEADER: {row.leader}</span>}
          {row.focus && <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{row.focus}</span>}
          {row.max_credit_cost && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700' }}>MAX: {row.max_credit_cost.toLocaleString()} CR</span>}
        </div>
      );
    }
    if (activeTab === 'faction_stat_bonuses') {
      var fc2 = FACTION_COLORS[row.faction_name] || '#ffd700';
      return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: fc2, minWidth: 80 }}>{row.faction_name}</span>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#fff' }}>{row.stat_name}</span>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, color: '#00ff88' }}>+{row.stat_value}</span>
          {row.rank_required && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 3, padding: '2px 7px' }}>RANK {row.rank_required}</span>}
          {row.credit_cost && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{row.credit_cost.toLocaleString()} CR</span>}
        </div>
      );
    }
    if (activeTab === 'faction_unlocks') {
      var fc3 = FACTION_COLORS[row.faction_name] || '#ffd700';
      var typeColors = { weapon: '#ff0000', implant: '#9b5de5', mod: '#ff8800', consumable: '#00ff88', upgrade: '#00f5ff' };
      var tc = typeColors[row.unlock_type] || '#888';
      return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: fc3, minWidth: 80 }}>{row.faction_name}</span>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: tc, background: tc + '14', border: '1px solid ' + tc + '30', borderRadius: 3, padding: '2px 7px', letterSpacing: 1 }}>{(row.unlock_type || '').toUpperCase()}</span>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#fff' }}>{row.item_name}</span>
          {row.rank_required && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 3, padding: '2px 7px' }}>RANK {row.rank_required}</span>}
          {row.credit_cost && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{row.credit_cost.toLocaleString()} CR</span>}
        </div>
      );
    }
    if (activeTab === 'faction_materials') {
      var fc4 = FACTION_COLORS[row.faction_name] || '#ffd700';
      return (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: fc4, minWidth: 80 }}>{row.faction_name}</span>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#fff' }}>{row.material_name}</span>
          {row.rarity && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{row.rarity}</span>}
        </div>
      );
    }
    if (activeTab === 'weapon_stats') {
      return (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff' }}>{row.name}</span>
          {row.weapon_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: activeTabConfig?.color }}>{row.weapon_type}</span>}
          {row.ammo_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{row.ammo_type}</span>}
          {row.damage && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff0000' }}>DMG {row.damage}</span>}
          {row.fire_rate && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800' }}>{row.fire_rate} RPM</span>}
          {row.verified && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88' }}>VERIFIED</span>}
        </div>
      );
    }
    if (activeTab === 'core_stats') {
      return (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff' }}>{row.name}</span>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: activeTabConfig?.color }}>{row.required_runner || 'UNIVERSAL'}</span>
          {row.rarity && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{row.rarity}</span>}
          {row.ability_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800' }}>{row.ability_type}</span>}
          {row.meta_rating && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700' }}>META {row.meta_rating}</span>}
        </div>
      );
    }
    if (activeTab === 'implant_stats') {
      return (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff' }}>{row.name}</span>
          {row.slot_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: activeTabConfig?.color }}>{row.slot_type}</span>}
          {row.rarity && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{row.rarity}</span>}
          {row.faction_source && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: FACTION_COLORS[row.faction_source] || '#888' }}>{row.faction_source}</span>}
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff' }}>
          {row.name || row.keyword || (row.shell_name && row.stat_name ? row.shell_name + ' -- ' + row.stat_name : null) || row.material_name || '--'}
        </span>
        {schema.slice(1, 4).map(f => row[f.key] !== null && row[f.key] !== undefined && row[f.key] !== '' && (
          <span key={f.key} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: S.muted }}>
            {f.label}: <span style={{ color: activeTabConfig?.color }}>{String(row[f.key])}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.text, fontFamily: 'Rajdhani, sans-serif' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', background: toast.ok ? '#00ff8820' : '#ff444420', border: '1px solid ' + (toast.ok ? '#00ff88' : '#ff4444'), borderRadius: 6, fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: toast.ok ? '#00ff88' : '#ff4444' }}>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: '20px 32px', borderBottom: '1px solid ' + S.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: S.bg, zIndex: 100 }}>
        <div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#9b5de5', letterSpacing: 2 }}>DATA ADMIN</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: S.muted, letterSpacing: 2, marginTop: 2 }}>CYBERNETICPUNKS.COM</div>
        </div>
        <a href="/" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: S.muted, textDecoration: 'none', letterSpacing: 2 }}>BACK TO SITE</a>
      </div>

      <div style={{ padding: '24px 32px 0', borderBottom: '1px solid ' + S.border }}>
        <UsageStats password={password} />
        <QualityMetricsPanel password={password} />
        <QualityAlertsPanel password={password} />
        <VantageDraftsPanel password={password} />
        <SourceReviewPanel password={password} />
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid ' + S.border, padding: '0 32px', overflowX: 'auto', position: 'sticky', top: 65, background: S.bg, zIndex: 99 }}>
        {TABS.map(tab => {
          var isActive = activeTab === tab.key;
          var groupTint = tab.group === 'faction' ? 'rgba(255,215,0,' : tab.group === 'world' ? 'rgba(0,245,255,' : null;
          return (
            <button key={tab.key} onClick={() => { setActiveTab(tab.key); cancelForm(); }} style={{ padding: '14px 16px', background: isActive && groupTint ? groupTint + '0.04)' : 'transparent', border: 'none', borderBottom: isActive ? '2px solid ' + tab.color : '2px solid transparent', borderTop: groupTint && !isActive ? '2px solid ' + groupTint + '0.12)' : '2px solid transparent', color: isActive ? tab.color : groupTint ? groupTint + '0.4)' : S.muted, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap', position: 'relative' }}>
              {tab.label}
              {tab.key === 'editor_directives' && pendingCount > 0 && activeTab !== 'editor_directives' && (
                <span style={{ position: 'absolute', top: 8, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#ff2d55' }} />
              )}
            </button>
          );
        })}
      </div>

      <div style={{ padding: '28px 32px' }}>

        {isFactionTab && (
          <div style={{ background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.12)', borderLeft: '3px solid #ffd700', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ffd700', letterSpacing: 1, marginBottom: 6 }}>FACTION SYSTEM</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              6 factions: <span style={{ color: '#00ff41' }}>Cyberacme</span> · <span style={{ color: '#ff2d78' }}>Nucaloric</span> · <span style={{ color: '#ff6600' }}>Traxus</span> · <span style={{ color: '#cc44ff' }}>Mida</span> · <span style={{ color: '#ff1a1a' }}>Arachne</span> · <span style={{ color: '#c8b400' }}>Sekiguchi</span>. Add faction info first, then stat bonuses and unlocks with rank requirements. Editors will reference rank requirements when recommending builds.
            </div>
          </div>
        )}

        {isWorldTab && (
          <div style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.12)', borderLeft: '3px solid #00f5ff', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#00f5ff', letterSpacing: 1, marginBottom: 6 }}>GAME WORLD GROUND TRUTH</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Maps, zones, bosses, events, and modes the editors cite. Zones/bosses/events reference a map by its <strong style={{ color: '#00f5ff' }}>slug</strong>. Only rows marked <strong style={{ color: '#00ff88' }}>Verified</strong> reach the editors -- new rows default to unverified so nothing unconfirmed is published. Variants (e.g. Night Marsh) inherit their parent map's zones; only add variant-specific zones.
            </div>
          </div>
        )}

        {isDirectives && (
          <div style={{ background: 'rgba(255,45,85,0.03)', border: '1px solid rgba(255,45,85,0.12)', borderLeft: '3px solid #ff2d55', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ff2d55', letterSpacing: 1, marginBottom: 6 }}>EDITOR DIRECTIVES</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Queue a topic for any editor. Use <span style={{ color: '#00f5ff' }}>creator_spotlight</span> type to feed vetted creator/community news the editor writes up and tags. Use <span style={{ color: '#c8d4e0' }}>discourse</span> (editor <span style={{ color: '#c8d4e0' }}>VANTAGE</span>) to queue a curated take for a discourse DRAFT -- generated by running scripts/gen-vantage-discourse.mjs, reviewed in the DRAFTS panel above; nothing publishes in Phase 1. Set <span style={{ color: '#00f5ff' }}>Scheduled For</span> to fire on a future date (your local time), or leave blank for the next cron cycle. Status auto-updates to <span style={{ color: '#00ff88' }}>consumed</span> after use.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: activeTabConfig?.color }}>{activeTabConfig?.label}</div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: S.muted }}>{filtered.length} / {rows.length} ROWS</div>
            {isDirectives && pendingCount > 0 && (
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff2d55', background: 'rgba(255,45,85,0.1)', border: '1px solid rgba(255,45,85,0.3)', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>{pendingCount} PENDING</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, width: 180 }} />
            {(activeTab === 'faction_stat_bonuses' || activeTab === 'faction_unlocks' || activeTab === 'faction_materials') && (
              <select value={filterFaction} onChange={e => setFilterFaction(e.target.value)} style={{ ...S.input, width: 140 }}>
                <option value="">All Factions</option>
                {FACTION_NAMES.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            )}
            {isCoresOrImplants && (
              <select value={filterRunner} onChange={e => setFilterRunner(e.target.value)} style={{ ...S.input, width: 140 }}>
                <option value="">All Runners</option>
                <option value="Universal">Universal</option>
                {SHELL_NAMES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <button onClick={() => loadTable(activeTab)} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid ' + S.border, borderRadius: 4, color: S.muted, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, cursor: 'pointer' }}>REFRESH</button>
            <button onClick={startAdd} style={{ padding: '8px 18px', background: activeTabConfig?.color, border: 'none', borderRadius: 4, color: isDirectives ? '#fff' : '#000', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {isDirectives ? '+ QUEUE DIRECTIVE' : '+ ADD ROW'}
            </button>
          </div>
        </div>

        {(showAddForm || editingRow) && (
          <div ref={formRef} style={{ background: S.surface, border: '1px solid ' + (activeTabConfig?.color + '33'), borderRadius: 8, padding: 24, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: activeTabConfig?.color, letterSpacing: 2, marginBottom: 20 }}>
              {showAddForm ? (isDirectives ? '+ NEW DIRECTIVE' : '+ NEW ' + activeTabConfig?.label) : 'EDITING -- ' + (formData.name || formData.faction_name || formData.shell_name || formData.editor || formData.material_name || formData.zone_name || formData.boss_name || formData.event_name || formData.mode_name || formData.slug || '')}
            </div>
            {renderForm()}
            <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                onClick={() => showAddForm ? saveNew(false) : saveEdit()}
                disabled={saving}
                style={{ padding: '10px 28px', background: activeTabConfig?.color, border: 'none', borderRadius: 4, color: isDirectives ? '#fff' : '#000', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'SAVING...' : (isDirectives && showAddForm ? 'QUEUE DIRECTIVE' : 'SAVE')}
              </button>
              {showAddForm && supportsBatchEntry && (
                <button
                  onClick={() => saveNew(true)}
                  disabled={saving}
                  style={{ padding: '10px 22px', background: 'transparent', border: '1px solid ' + activeTabConfig?.color, borderRadius: 4, color: activeTabConfig?.color, fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                  SAVE & ADD ANOTHER
                </button>
              )}
              <button onClick={cancelForm} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid ' + S.border, borderRadius: 4, color: S.muted, fontFamily: 'Share Tech Mono, monospace', fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
              {showAddForm && supportsBatchEntry && Object.keys(stickyValues).length > 0 && (
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(0,245,255,0.6)', letterSpacing: 1, marginLeft: 'auto' }}>
                  STICKY: {Object.entries(stickyValues).map(function(e) { return e[0] + '=' + e[1]; }).join(', ')}
                </div>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: S.muted, letterSpacing: 2, padding: '60px 0', textAlign: 'center' }}>LOADING...</div>
        ) : filtered.length === 0 ? (
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: S.muted, letterSpacing: 2, padding: '60px 0', textAlign: 'center' }}>
            {isFactionTab ? 'NO DATA YET -- ADD YOUR FIRST ROW ABOVE' : isDirectives ? 'NO DIRECTIVES QUEUED' : isWorldTab ? 'NO ROWS YET -- ADD ABOVE' : 'NO ROWS FOUND'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(row => {
              var rowAccent = isDirectives
                ? (row.status === 'pending' ? '#ff2d55' : '#00ff88')
                : isFactionTab
                ? (FACTION_COLORS[row.faction_name || row.name] || '#ffd700')
                : activeTabConfig?.color;
              return (
                <div key={row.id} style={{ background: editingRow === row.id ? rowAccent + '08' : S.surface, border: '1px solid ' + (editingRow === row.id ? rowAccent + '44' : S.border), borderLeft: '3px solid ' + (editingRow === row.id ? rowAccent : rowAccent + '55'), borderRadius: 6, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>{rowPreview(row)}</div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => startEdit(row)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid ' + rowAccent + '44', borderRadius: 4, color: rowAccent, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>EDIT</button>
                    <button onClick={() => deleteRow(row.id, row.name || row.item_name || row.material_name || row.zone_name || row.boss_name || row.event_name || row.mode_name || (row.instruction || '').slice(0, 30) || row.shell_name)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 4, color: '#ff4444', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>DEL</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
