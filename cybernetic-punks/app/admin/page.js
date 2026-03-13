'use client';
import { useState, useEffect, useCallback } from 'react';

const SCHEMAS = {
  weapon_stats: [
    { key: 'name',                label: 'Name',                 type: 'text',    required: true,  group: 'Identity' },
    { key: 'weapon_type',         label: 'Weapon Type',          type: 'select',  group: 'Identity', options: ['AR', 'SMG', 'Shotgun', 'Sniper Rifle', 'Precision Rifle', 'LMG', 'Pistol', 'Melee', 'Railgun'] },
    { key: 'ammo_type',           label: 'Ammo Type',            type: 'select',  group: 'Identity', options: ['Light Rounds', 'Heavy Rounds', 'MIPS', 'Volt Cells', 'Volt Battery', 'None'] },
    { key: 'firing_mode',         label: 'Firing Mode',          type: 'select',  group: 'Identity', options: ['Full Auto', 'Semi-Auto', 'Single Shot', 'Burst', 'Melee'] },
    { key: 'rarity',              label: 'Rarity',               type: 'select',  group: 'Identity', options: ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'] },
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
    { key: 'stat_name',   label: 'Stat Name',   type: 'select', required: true, options: ['Heat Capacity', 'Agility', 'Loot Speed', 'Melee Damage', 'Prime Recovery', 'Tactical Recovery', 'Self-Repair Speed', 'Finisher Siphon', 'Revive Speed', 'Hardware', 'Firewall', 'Fall Resistance', 'Ping Duration'] },
    { key: 'stat_value',  label: 'Stat Value',  type: 'number', required: true },
  ],

  mod_stats: [
    { key: 'name',          label: 'Name',               type: 'text',    required: true },
    { key: 'slot_type',     label: 'Slot Type',          type: 'select',  options: ['Barrel', 'Chip', 'Optic', 'Magazine', 'Grip', 'Generator', 'Shield'] },
    { key: 'rarity',        label: 'Rarity',             type: 'select',  options: ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'] },
    { key: 'effect_desc',   label: 'Effect Description', type: 'textarea' },
    { key: 'credit_value',  label: 'Credit Value',       type: 'number' },
    { key: 'ranked_viable', label: 'Ranked Viable',      type: 'boolean' },
  ],

  implant_stats: [
    { key: 'name',               label: 'Name',           type: 'text',    required: true },
    { key: 'slug',               label: 'Slug',           type: 'text' },
    { key: 'slot_type',          label: 'Slot Type',      type: 'select',  required: true, options: ['Head', 'Torso', 'Legs', 'Shield'] },
    { key: 'rarity',             label: 'Rarity',         type: 'select',  required: true, options: ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'] },
    { key: 'compatible_with',    label: 'Compatible With',type: 'select',  options: ['Shell', 'Weapon', 'Both'] },
    { key: 'required_runner',    label: 'Required Runner',type: 'select',  options: ['', 'Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'] },
    { key: 'description',        label: 'Description',    type: 'textarea' },
    { key: 'passive_name',       label: 'Passive Name',   type: 'text' },
    { key: 'passive_desc',       label: 'Passive Desc',   type: 'textarea' },
    { key: 'stat_1_label',       label: 'Stat 1 Label',   type: 'text' },
    { key: 'stat_1_value',       label: 'Stat 1 Value',   type: 'text' },
    { key: 'stat_2_label',       label: 'Stat 2 Label',   type: 'text' },
    { key: 'stat_2_value',       label: 'Stat 2 Value',   type: 'text' },
    { key: 'stat_3_label',       label: 'Stat 3 Label',   type: 'text' },
    { key: 'stat_3_value',       label: 'Stat 3 Value',   type: 'text' },
    { key: 'stat_4_label',       label: 'Stat 4 Label',   type: 'text' },
    { key: 'stat_4_value',       label: 'Stat 4 Value',   type: 'text' },
    { key: 'credit_value',       label: 'Credit Value',   type: 'number' },
    { key: 'ranked_viable',      label: 'Ranked Viable',  type: 'boolean' },
    { key: 'verified',           label: 'Verified',       type: 'boolean' },
    { key: 'notes',              label: 'Notes',          type: 'textarea' },
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
    { key: 'required_runner',    label: 'Required Runner',    type: 'select',  options: ['', 'Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'] },
    { key: 'effect_desc',        label: 'Effect Description', type: 'textarea' },
    { key: 'ability_type',       label: 'Ability Type',       type: 'select',  options: ['', 'Prime', 'Tactical', 'Passive', 'Grapple', 'Universal'] },
    { key: 'is_shell_exclusive', label: 'Shell Exclusive',    type: 'boolean' },
    { key: 'credit_value',       label: 'Credit Value',       type: 'number' },
    { key: 'ranked_viable',      label: 'Ranked Viable',      type: 'boolean' },
    { key: 'meta_rating',        label: 'Meta Rating',        type: 'select',  options: ['', 'S', 'A', 'B', 'C', 'D'] },
    { key: 'verified',           label: 'Verified',           type: 'boolean' },
    { key: 'notes',              label: 'Notes',              type: 'textarea' },
  ],
};

const TABS = [
  { key: 'weapon_stats',      label: 'WEAPONS',     color: '#ff8800' },
  { key: 'shell_stats',       label: 'SHELLS',      color: '#00f5ff' },
  { key: 'shell_stat_values', label: 'SHELL STATS', color: '#00ff88' },
  { key: 'mod_stats',         label: 'MODS',        color: '#ff0000' },
  { key: 'core_stats',        label: 'CORES',       color: '#ffd700' },
  { key: 'implant_stats',     label: 'IMPLANTS',    color: '#9b5de5' },
  { key: 'ammo_stats',        label: 'AMMO',        color: '#00ff88' },
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
  Identity:     '#ffffff',
  Firepower:    '#ff0000',
  Accuracy:     '#00f5ff',
  Handling:     '#ff8800',
  'Range & Mag':'#9b5de5',
  Flags:        '#00ff88',
};

export default function AdminPage() {
  const [password, setPassword]         = useState('');
  const [authed, setAuthed]             = useState(false);
  const [authError, setAuthError]       = useState('');
  const [activeTab, setActiveTab]       = useState('weapon_stats');
  const [rows, setRows]                 = useState([]);
  const [loading, setLoading]           = useState(false);
  const [editingRow, setEditingRow]     = useState(null);
  const [showAddForm, setShowAddForm]   = useState(false);
  const [formData, setFormData]         = useState({});
  const [saving, setSaving]             = useState(false);
  const [toast, setToast]               = useState(null);
  const [search, setSearch]             = useState('');
  const [filterRunner, setFilterRunner] = useState('');

  function showToast(msg, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
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
    setLoading(true);
    setRows([]);
    setSearch('');
    setFilterRunner('');
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
    setFormData({ ...row });
    setShowAddForm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startAdd() {
    setShowAddForm(true);
    setEditingRow(null);
    const defaults = {};
    (SCHEMAS[activeTab] || []).forEach(f => { defaults[f.key] = f.type === 'boolean' ? true : ''; });
    setFormData(defaults);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelForm() { setEditingRow(null); setShowAddForm(false); setFormData({}); }

  async function saveEdit() {
    setSaving(true);
    try {
      const updates = { ...formData };
      delete updates.id; delete updates.updated_at; delete updates.created_at;
      const res = await fetch('/api/admin', { method: 'PATCH', headers: apiHeaders(), body: JSON.stringify({ table: activeTab, id: editingRow, updates }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRows(rows.map(r => r.id === editingRow ? json.data : r));
      cancelForm();
      showToast('Saved successfully');
    } catch (e) { showToast(e.message, false); }
    setSaving(false);
  }

  async function saveNew() {
    setSaving(true);
    try {
      const row = { ...formData };
      delete row.id; delete row.updated_at; delete row.created_at;
      (SCHEMAS[activeTab] || []).forEach(f => {
        if (f.type === 'number' && row[f.key] !== '' && row[f.key] !== null && row[f.key] !== undefined) row[f.key] = Number(row[f.key]);
        if (f.type === 'boolean') row[f.key] = row[f.key] === true || row[f.key] === 'true';
        if (row[f.key] === '') row[f.key] = null;
      });
      const res = await fetch('/api/admin', { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ table: activeTab, row }) });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRows([json.data, ...rows]);
      cancelForm();
      showToast('Row added');
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

  var activeTabConfig = TABS.find(t => t.key === activeTab);
  var schema = SCHEMAS[activeTab] || [];
  var isWeapons = activeTab === 'weapon_stats';
  var isCoresOrImplants = activeTab === 'core_stats' || activeTab === 'implant_stats';

  var filtered = rows.filter(r => {
    var matchSearch = !search || Object.values(r).some(v => v && String(v).toLowerCase().includes(search.toLowerCase()));
    var matchRunner = !filterRunner || r.required_runner === filterRunner || r.shell_name === filterRunner;
    return matchSearch && matchRunner;
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
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {schema.map(field => renderField(field))}
      </div>
    );
  }

  function renderField(field) {
    return (
      <div key={field.key}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: S.muted, letterSpacing: 2, marginBottom: 5 }}>
          {field.label}{field.required ? ' *' : ''}
        </div>
        {field.type === 'textarea' ? (
          <textarea value={formData[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} rows={3} style={{ ...S.input, resize: 'vertical' }} />
        ) : field.type === 'select' ? (
          <select value={formData[field.key] || ''} onChange={e => updateField(field.key, e.target.value)} style={{ ...S.input }}>
            <option value="">— Select —</option>
            {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
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
                <img src={`/images/${activeTab === 'shell_stats' ? 'shells' : 'weapons'}/${formData[field.key]}`} alt={formData.name || 'preview'} style={{ height: 48, objectFit: 'contain', background: 'rgba(255,255,255,0.04)', borderRadius: 4, border: '1px solid rgba(255,255,255,0.08)', padding: 4 }} onError={e => { e.target.style.display = 'none'; }} />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function rowPreview(row) {
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
          {row.required_runner && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: activeTabConfig?.color }}>{row.required_runner}</span>}
          {row.rarity && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{row.rarity}</span>}
          {row.ability_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800' }}>{row.ability_type}</span>}
          {row.meta_rating && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700' }}>META {row.meta_rating}</span>}
          {row.verified && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88' }}>✓</span>}
        </div>
      );
    }
    if (activeTab === 'implant_stats') {
      return (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff' }}>{row.name}</span>
          {row.slot_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: activeTabConfig?.color }}>{row.slot_type}</span>}
          {row.rarity && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{row.rarity}</span>}
          {row.passive_name && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>{row.passive_name}</span>}
          {row.verified && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88' }}>✓</span>}
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff' }}>
          {row.name || (row.shell_name + ' — ' + row.stat_name)}
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

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid ' + S.border, padding: '0 32px', overflowX: 'auto', position: 'sticky', top: 65, background: S.bg, zIndex: 99 }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); cancelForm(); }} style={{ padding: '14px 18px', background: 'transparent', border: 'none', borderBottom: activeTab === tab.key ? '2px solid ' + tab.color : '2px solid transparent', color: activeTab === tab.key ? tab.color : S.muted, fontFamily: 'Share Tech Mono, monospace', fontSize: 11, letterSpacing: 2, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: activeTabConfig?.color }}>{activeTabConfig?.label}</div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: S.muted }}>{filtered.length} / {rows.length} ROWS</div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...S.input, width: 180 }} />
            {isCoresOrImplants && (
              <select value={filterRunner} onChange={e => setFilterRunner(e.target.value)} style={{ ...S.input, width: 140 }}>
                <option value="">All Runners</option>
                {['Assassin','Destroyer','Recon','Rook','Thief','Triage','Vandal'].map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            )}
            <button onClick={() => loadTable(activeTab)} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid ' + S.border, borderRadius: 4, color: S.muted, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, cursor: 'pointer' }}>↺ REFRESH</button>
            <button onClick={startAdd} style={{ padding: '8px 18px', background: activeTabConfig?.color, border: 'none', borderRadius: 4, color: '#000', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ ADD ROW</button>
          </div>
        </div>

        {(showAddForm || editingRow) && (
          <div style={{ background: S.surface, border: '1px solid ' + (activeTabConfig?.color + '33'), borderRadius: 8, padding: 24, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: activeTabConfig?.color, letterSpacing: 2, marginBottom: 20 }}>
              {showAddForm ? '+ NEW ' + (activeTabConfig?.label || 'ROW') : '✎ EDITING — ' + (formData.name || formData.shell_name || '')}
            </div>
            {renderForm()}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={showAddForm ? saveNew : saveEdit} disabled={saving} style={{ padding: '10px 28px', background: activeTabConfig?.color, border: 'none', borderRadius: 4, color: '#000', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'SAVING...' : 'SAVE'}
              </button>
              <button onClick={cancelForm} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid ' + S.border, borderRadius: 4, color: S.muted, fontFamily: 'Share Tech Mono, monospace', fontSize: 11, cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: S.muted, letterSpacing: 2, padding: '60px 0', textAlign: 'center' }}>LOADING...</div>
        ) : filtered.length === 0 ? (
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: S.muted, letterSpacing: 2, padding: '60px 0', textAlign: 'center' }}>NO ROWS FOUND</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(row => (
              <div key={row.id} style={{ background: editingRow === row.id ? activeTabConfig?.color + '08' : S.surface, border: '1px solid ' + (editingRow === row.id ? activeTabConfig?.color + '44' : S.border), borderLeft: '3px solid ' + (editingRow === row.id ? activeTabConfig?.color : activeTabConfig?.color + '33'), borderRadius: 6, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>{rowPreview(row)}</div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => startEdit(row)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid ' + activeTabConfig?.color + '44', borderRadius: 4, color: activeTabConfig?.color, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>EDIT</button>
                  <button onClick={() => deleteRow(row.id, row.name || row.shell_name)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 4, color: '#ff4444', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>DEL</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}