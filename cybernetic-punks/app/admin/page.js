'use client';
import { useState, useEffect, useCallback } from 'react';
import UsageStats from '@/components/UsageStats';

const FACTION_NAMES = ['Cyberacme', 'Nucaloric', 'Traxus', 'Mida', 'Arachne', 'Sekiguchi'];
const STAT_NAMES = ['Heat Capacity', 'Agility', 'Loot Speed', 'Melee Damage', 'Prime Recovery', 'Tactical Recovery', 'Self-Repair Speed', 'Finisher Siphon', 'Revive Speed', 'Hardware', 'Firewall', 'Fall Resistance', 'Ping Duration', 'DBNO', 'TAD'];

const SCHEMAS = {
  weapon_stats: [
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
    { key: 'shell_name',  label: 'Shell Name',  type: 'select', required: true, options: ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'] },
    { key: 'stat_name',   label: 'Stat Name',   type: 'select', required: true, options: STAT_NAMES },
    { key: 'stat_value',  label: 'Stat Value',  type: 'number', required: true },
  ],

  mod_stats: [
    { key: 'name',           label: 'Name',               type: 'text',    required: true },
    { key: 'slot_type',      label: 'Slot Type',          type: 'select',  options: ['Barrel', 'Chip', 'Optic', 'Magazine', 'Grip', 'Generator', 'Shield'] },
    { key: 'rarity',         label: 'Rarity',             type: 'select',  options: ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'] },
    { key: 'effect_desc',    label: 'Effect Description', type: 'textarea' },
    { key: 'faction_source', label: 'Faction Source',     type: 'select',  nullableSelect: true, options: ['None', ...FACTION_NAMES] },
    { key: 'credit_value',   label: 'Credit Value',       type: 'number' },
    { key: 'ranked_viable',  label: 'Ranked Viable',      type: 'boolean' },
    { key: 'image_filename', label: 'Image Filename',     type: 'text',    placeholder: 'e.g. barrel-mod.webp' },
  ],

  implant_stats: [
    { key: 'name',               label: 'Name',           type: 'text',    required: true },
    { key: 'slug',               label: 'Slug',           type: 'text' },
    { key: 'slot_type',          label: 'Slot Type',      type: 'select',  required: true, options: ['Head', 'Torso', 'Legs', 'Shield'] },
    { key: 'rarity',             label: 'Rarity',         type: 'select',  required: true, options: ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'] },
    { key: 'required_runner',    label: 'Required Runner',type: 'select',  nullableSelect: true, options: ['Universal', 'Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'] },
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
    { key: 'notes',              label: 'Notes',          type: 'textarea' },
    { key: 'image_filename',     label: 'Image Filename', type: 'text',    placeholder: 'e.g. implant-name.webp' },
  ],

  ammo_stats: [
    { key: 'name',                label: 'Name',              type: 'text',    required: true },
    { key: 'damage_type',         label: 'Damage Type',       type: 'select',  options: ['Kinetic', 'Volt'] },
    { key: 'damage_modifier_pct', label: 'Damage Modifier %', type: 'number' },
    { key: 'special_effect',      label: 'Special Effect',    type: 'textarea' },
    { key: 'notes',               label: 'Notes',             type: 'textarea' },
  ],

  core_stats: [
    { key: 'name',               label: 'Name',               type: 'text',    required: true },
    { key: 'slug',               label: 'Slug',               type: 'text' },
    { key: 'rarity',             label: 'Rarity',             type: 'select',  required: true, options: ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'] },
    { key: 'required_runner',    label: 'Required Runner',    type: 'select',  nullableSelect: true, options: ['Universal', 'Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'] },
    { key: 'effect_desc',        label: 'Effect Description', type: 'textarea' },
    { key: 'ability_type',       label: 'Ability Type',       type: 'select',  options: ['', 'Prime', 'Tactical', 'Passive', 'Grapple', 'Universal'] },
    { key: 'is_shell_exclusive', label: 'Shell Exclusive',    type: 'boolean' },
    { key: 'credit_value',       label: 'Credit Value',       type: 'number' },
    { key: 'ranked_viable',      label: 'Ranked Viable',      type: 'boolean' },
    { key: 'meta_rating',        label: 'Meta Rating',        type: 'select',  options: ['', 'S', 'A', 'B', 'C', 'D'] },
    { key: 'verified',           label: 'Verified',           type: 'boolean' },
    { key: 'notes',              label: 'Notes',              type: 'textarea' },
    { key: 'image_filename',     label: 'Image Filename',     type: 'text',    placeholder: 'e.g. core-name.webp' },
  ],

  editor_directives: [
    { key: 'editor',      label: 'Editor',      type: 'select',   required: true, options: ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'] },
    { key: 'instruction', label: 'Instruction', type: 'textarea', required: true, placeholder: 'e.g. Cover the April 14 balance patch — Longshot nerf, Recon Echo Pulse buffs.' },
    { key: 'url',         label: 'Source URL',  type: 'text',     placeholder: 'e.g. https://x.com/BungieHelp/status/...' },
    { key: 'status',      label: 'Status',      type: 'select',   options: ['pending', 'consumed'] },
  ],

  // ── FACTION SCHEMAS ──────────────────────────────────────────
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
};

const NULLABLE_SELECT_NULL_VALUE = 'Universal';
const NULLABLE_SELECT_FACTION_NULL = 'None';

const TABS = [
  { key: 'editor_directives',    label: 'DIRECTIVES',   color: '#ff2d55' },
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

function rowToFormData(row, schema) {
  const formData = { ...row };
  schema.forEach(field => {
    if (field.nullableSelect) {
      var nullVal = field.options && field.options[0] === 'None' ? NULLABLE_SELECT_FACTION_NULL : NULLABLE_SELECT_NULL_VALUE;
      if (formData[field.key] === null || formData[field.key] === undefined || formData[field.key] === '') {
        formData[field.key] = nullVal;
      }
    }
  });
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
    if (row[field.key] === '') row[field.key] = null;
  });
  return row;
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
    try {
      const res = await fetch('/api/admin?table=' + table, { headers: apiHeaders() });
      const json = await res.json();
      if (json.data) setRows(json.data);
    } catch (e) { showToast('Failed to load data', false); }
    setLoading(false);
  }, [password]);

  useEffect(() => { if (authed) loadTable(activeTab); }, [authed, activeTab, loadTable]);

  function startEdit(row) {
    setEditingRow(row.id);
    setFormData(rowToFormData(row, SCHEMAS[activeTab] || []));
    setShowAddForm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startAdd() {
    setShowAddForm(true); setEditingRow(null);
    const defaults = {};
    (SCHEMAS[activeTab] || []).forEach(f => {
      if (f.type === 'boolean') defaults[f.key] = true;
      else if (f.nullableSelect) defaults[f.key] = f.options && f.options[0] === 'None' ? NULLABLE_SELECT_FACTION_NULL : NULLABLE_SELECT_NULL_VALUE;
      else defaults[f.key] = '';
    });
    if (activeTab === 'editor_directives') defaults.status = 'pending';
    setFormData(defaults);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  async function saveNew() {
    setSaving(true);
    try {
      const schema = SCHEMAS[activeTab] || [];
      const row = formDataToRow({ ...formData }, schema);
      delete row.id; delete row.updated_at; delete row.created_at; delete row.consumed_at;
      const res = await fetch('/api/admin', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ table: activeTab, row }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRows([json.data, ...rows]);
      cancelForm();
      showToast(activeTab === 'editor_directives' ? 'Directive queued — fires on next cron cycle' : 'Row added');
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

  function updateField(key, value) { setFormData(prev => ({ ...prev, [key]: value })); }

  var activeTabConfig   = TABS.find(t => t.key === activeTab);
  var schema            = SCHEMAS[activeTab] || [];
  var isWeapons         = activeTab === 'weapon_stats';
  var isDirectives      = activeTab === 'editor_directives';
  var isFactionTab      = ['factions', 'faction_stat_bonuses', 'faction_unlocks', 'faction_materials'].includes(activeTab);
  var isCoresOrImplants = activeTab === 'core_stats' || activeTab === 'implant_stats';
  var pendingCount      = activeTab === 'editor_directives' ? rows.filter(r => r.status === 'pending').length : 0;

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
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, color: '#9b5de5', marginBottom: 8, letterSpacing: 2 }}>◎ ADMIN ACCESS</div>
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
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {schema.filter(f => f.key === 'editor' || f.key === 'status').map(field => renderField(field))}
          </div>
          {schema.filter(f => f.key === 'instruction' || f.key === 'url').map(field => renderField(field))}
          <div style={{ background: 'rgba(255,45,85,0.05)', border: '1px solid rgba(255,45,85,0.15)', borderLeft: '3px solid #ff2d55', borderRadius: 6, padding: '12px 16px' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff2d55', letterSpacing: 2, marginBottom: 6 }}>HOW THIS WORKS</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Set status to <strong style={{ color: '#ff2d55' }}>pending</strong>. The selected editor picks up your directive on the next cron cycle and writes an article about it. Status auto-updates to <strong style={{ color: '#00ff88' }}>consumed</strong> after use.
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
    return (
      <div key={field.key}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: S.muted, letterSpacing: 2, marginBottom: 5 }}>
          {field.label}{field.required ? ' *' : ''}
        </div>
        {field.type === 'textarea' ? (
          <textarea value={formData[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} rows={field.key === 'instruction' || field.key === 'description' || field.key === 'max_cost_summary' ? 5 : 3} placeholder={field.placeholder || ''} style={{ ...S.input, resize: 'vertical' }} />
        ) : field.type === 'select' ? (
          <select value={formData[field.key] ?? (field.nullableSelect ? nullVal : '')} onChange={e => updateField(field.key, e.target.value)} style={{ ...S.input }}>
            {!field.nullableSelect && <option value="">— Select —</option>}
            {(field.options || []).map(o => (
              <option key={o} value={o}>{o === '' ? '— None —' : o}</option>
            ))}
          </select>
        ) : field.type === 'boolean' ? (
          <select value={String(formData[field.key] ?? true)} onChange={e => updateField(field.key, e.target.value === 'true')} style={{ ...S.input }}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        ) : (
          <>
            <input type={field.type === 'number' ? 'number' : 'text'} value={formData[field.key] ?? ''} onChange={e => updateField(field.key, e.target.value)} placeholder={field.placeholder || ''} style={{ ...S.input }} />
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
      return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: ec, flexShrink: 0, minWidth: 60 }}>{row.editor}</span>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: sc, background: sc + '18', border: '1px solid ' + sc + '44', borderRadius: 3, padding: '2px 8px', letterSpacing: 1, flexShrink: 0 }}>{(row.status || 'pending').toUpperCase()}</span>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.4 }}>{(row.instruction || '').slice(0, 100)}{(row.instruction || '').length > 100 ? '...' : ''}</span>
          {row.url && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(0,245,255,0.5)', flexShrink: 0 }}>URL ↗</span>}
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
          {row.verified && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88' }}>✓ VERIFIED</span>}
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
          {row.name || (row.shell_name + ' — ' + row.stat_name) || row.material_name || '—'}
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
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#9b5de5', letterSpacing: 2 }}>◎ DATA ADMIN</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: S.muted, letterSpacing: 2, marginTop: 2 }}>CYBERNETICPUNKS.COM</div>
        </div>
        <a href="/" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: S.muted, textDecoration: 'none', letterSpacing: 2 }}>← BACK TO SITE</a>
      </div>

      <div style={{ padding: '24px 32px 0', borderBottom: '1px solid ' + S.border }}>
        <UsageStats password={password} />
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid ' + S.border, padding: '0 32px', overflowX: 'auto', position: 'sticky', top: 65, background: S.bg, zIndex: 99 }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); cancelForm(); }} style={{ padding: '14px 16px', background: activeTab === tab.key && tab.group === 'faction' ? 'rgba(255,215,0,0.04)' : 'transparent', border: 'none', borderBottom: activeTab === tab.key ? '2px solid ' + tab.color : '2px solid transparent', borderTop: tab.group === 'faction' && activeTab !== tab.key ? '2px solid rgba(255,215,0,0.12)' : '2px solid transparent', color: activeTab === tab.key ? tab.color : tab.group === 'faction' ? 'rgba(255,215,0,0.4)' : S.muted, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap', position: 'relative' }}>
            {tab.label}
            {tab.key === 'editor_directives' && pendingCount > 0 && activeTab !== 'editor_directives' && (
              <span style={{ position: 'absolute', top: 8, right: 4, width: 7, height: 7, borderRadius: '50%', background: '#ff2d55', boxShadow: '0 0 6px #ff2d55' }} />
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Faction tab header */}
        {isFactionTab && (
          <div style={{ background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.12)', borderLeft: '3px solid #ffd700', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ffd700', letterSpacing: 1, marginBottom: 6 }}>FACTION SYSTEM</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              6 factions: <span style={{ color: '#00ff41' }}>Cyberacme</span> · <span style={{ color: '#ff2d78' }}>Nucaloric</span> · <span style={{ color: '#ff6600' }}>Traxus</span> · <span style={{ color: '#cc44ff' }}>Mida</span> · <span style={{ color: '#ff1a1a' }}>Arachne</span> · <span style={{ color: '#c8b400' }}>Sekiguchi</span>. Add faction info first, then stat bonuses and unlocks with rank requirements. Editors will reference rank requirements when recommending builds.
            </div>
          </div>
        )}

        {/* Directives header */}
        {isDirectives && (
          <div style={{ background: 'rgba(255,45,85,0.03)', border: '1px solid rgba(255,45,85,0.12)', borderLeft: '3px solid #ff2d55', borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ff2d55', letterSpacing: 1, marginBottom: 6 }}>EDITOR DIRECTIVES</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Queue a topic for any editor. On the next cron cycle the selected editor prioritizes your directive. Status auto-updates to <span style={{ color: '#00ff88' }}>consumed</span> after use.
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
                {['Assassin','Destroyer','Recon','Rook','Thief','Triage','Vandal'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <button onClick={() => loadTable(activeTab)} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid ' + S.border, borderRadius: 4, color: S.muted, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, cursor: 'pointer' }}>↺ REFRESH</button>
            <button onClick={startAdd} style={{ padding: '8px 18px', background: activeTabConfig?.color, border: 'none', borderRadius: 4, color: isDirectives ? '#fff' : '#000', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {isDirectives ? '+ QUEUE DIRECTIVE' : '+ ADD ROW'}
            </button>
          </div>
        </div>

        {(showAddForm || editingRow) && (
          <div style={{ background: S.surface, border: '1px solid ' + (activeTabConfig?.color + '33'), borderRadius: 8, padding: 24, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: activeTabConfig?.color, letterSpacing: 2, marginBottom: 20 }}>
              {showAddForm ? (isDirectives ? '+ NEW DIRECTIVE' : '+ NEW ' + activeTabConfig?.label) : '✎ EDITING — ' + (formData.name || formData.faction_name || formData.shell_name || formData.editor || formData.material_name || '')}
            </div>
            {renderForm()}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={showAddForm ? saveNew : saveEdit} disabled={saving} style={{ padding: '10px 28px', background: activeTabConfig?.color, border: 'none', borderRadius: 4, color: isDirectives ? '#fff' : '#000', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'SAVING...' : (isDirectives && showAddForm ? 'QUEUE DIRECTIVE' : 'SAVE')}
              </button>
              <button onClick={cancelForm} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid ' + S.border, borderRadius: 4, color: S.muted, fontFamily: 'Share Tech Mono, monospace', fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: S.muted, letterSpacing: 2, padding: '60px 0', textAlign: 'center' }}>LOADING...</div>
        ) : filtered.length === 0 ? (
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: S.muted, letterSpacing: 2, padding: '60px 0', textAlign: 'center' }}>
            {isFactionTab ? 'NO DATA YET — ADD YOUR FIRST ROW ABOVE' : isDirectives ? 'NO DIRECTIVES QUEUED' : 'NO ROWS FOUND'}
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
                    <button onClick={() => deleteRow(row.id, row.name || row.item_name || row.material_name || (row.instruction || '').slice(0, 30) || row.shell_name)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 4, color: '#ff4444', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>DEL</button>
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
