'use client';
import { useState, useEffect, useCallback } from 'react';

// ─── TABLE SCHEMAS ───────────────────────────────────────────────────────────
// Defines which fields show in the form for each table
const SCHEMAS = {
  weapon_stats: [
    { key: 'name',            label: 'Name',           type: 'text',     required: true },
    { key: 'damage',          label: 'Damage',         type: 'number' },
    { key: 'fire_rate',       label: 'Fire Rate (RPM)', type: 'number' },
    { key: 'magazine_size',   label: 'Magazine Size',  type: 'number' },
    { key: 'range_rating',    label: 'Range Rating',   type: 'select', options: ['CQB', 'Mid', 'Long', 'Flex'] },
    { key: 'ranked_viable',   label: 'Ranked Viable',  type: 'boolean' },
  ],
  shell_stats: [
    { key: 'name',                       label: 'Name',              type: 'text', required: true },
    { key: 'role',                       label: 'Role',              type: 'text' },
    { key: 'difficulty',                 label: 'Difficulty',        type: 'select', options: ['Low', 'Medium', 'High'] },
    { key: 'base_health',                label: 'Base Health',       type: 'number' },
    { key: 'base_shield',                label: 'Base Shield',       type: 'number' },
    { key: 'base_speed',                 label: 'Speed Label',       type: 'text' },
    { key: 'prime_ability_name',         label: 'Prime Ability',     type: 'text' },
    { key: 'prime_ability_description',  label: 'Prime Ability Desc',type: 'textarea' },
    { key: 'tactical_ability_name',      label: 'Tactical Ability',  type: 'text' },
    { key: 'tactical_ability_description', label: 'Tactical Ability Desc', type: 'textarea' },
    { key: 'trait_1_name',               label: 'Trait 1',           type: 'text' },
    { key: 'trait_1_description',        label: 'Trait 1 Desc',      type: 'textarea' },
    { key: 'trait_2_name',               label: 'Trait 2',           type: 'text' },
    { key: 'trait_2_description',        label: 'Trait 2 Desc',      type: 'textarea' },
    { key: 'ranked_tier_solo',           label: 'Ranked Solo Tier',  type: 'select', options: ['S', 'A', 'B', 'C', 'D'] },
    { key: 'ranked_tier_squad',          label: 'Ranked Squad Tier', type: 'select', options: ['S', 'A', 'B', 'C', 'D'] },
    { key: 'best_for',                   label: 'Best For',          type: 'text' },
    { key: 'recommended_playstyle',      label: 'Playstyle',         type: 'textarea' },
  ],
  shell_stat_values: [
    { key: 'shell_name',  label: 'Shell Name',  type: 'select', options: ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'], required: true },
    { key: 'stat_name',   label: 'Stat Name',   type: 'select', options: ['Heat Capacity', 'Agility', 'Loot Speed', 'Melee Damage', 'Prime Recovery', 'Tactical Recovery', 'Self-Repair Speed', 'Finisher Siphon', 'Revive Speed', 'Hardware', 'Firewall', 'Fall Resistance', 'Ping Duration'], required: true },
    { key: 'stat_value',  label: 'Stat Value',  type: 'number', required: true },
  ],
  mod_stats: [
    { key: 'name',               label: 'Name',               type: 'text', required: true },
    { key: 'slot_type',          label: 'Slot Type',          type: 'select', options: ['Barrel', 'Chip', 'Optic', 'Magazine', 'Grip', 'Generator', 'Shield'] },
    { key: 'rarity',             label: 'Rarity',             type: 'select', options: ['Standard', 'Enhanced', 'Deluxe', 'Superior'] },
    { key: 'effect_desc',        label: 'Effect Description', type: 'textarea' },
    { key: 'credit_value',       label: 'Credit Value',       type: 'number' },
    { key: 'ranked_viable',      label: 'Ranked Viable',      type: 'boolean' },
  ],
  implant_stats: [
    { key: 'name',           label: 'Name',           type: 'text', required: true },
    { key: 'slot_type',      label: 'Slot Type',      type: 'select', options: ['Head', 'Torso', 'Legs', 'Shield'], required: true },
    { key: 'rarity',         label: 'Rarity',         type: 'select', options: ['Standard', 'Enhanced', 'Deluxe', 'Superior', 'Prestige'], required: true },
    { key: 'compatible_with',label: 'Compatible With',type: 'select', options: ['Shell', 'Weapon', 'Both'] },
    { key: 'passive_name',   label: 'Passive Name',   type: 'text' },
    { key: 'passive_desc',   label: 'Passive Desc',   type: 'textarea' },
    { key: 'stat_1_label',   label: 'Stat 1 Label',   type: 'text' },
    { key: 'stat_1_value',   label: 'Stat 1 Value',   type: 'text' },
    { key: 'stat_2_label',   label: 'Stat 2 Label',   type: 'text' },
    { key: 'stat_2_value',   label: 'Stat 2 Value',   type: 'text' },
    { key: 'stat_3_label',   label: 'Stat 3 Label',   type: 'text' },
    { key: 'stat_3_value',   label: 'Stat 3 Value',   type: 'text' },
    { key: 'credit_value',   label: 'Credit Value',   type: 'number' },
    { key: 'ranked_viable',  label: 'Ranked Viable',  type: 'boolean' },
    { key: 'notes',          label: 'Notes',          type: 'textarea' },
  ],
  ammo_stats: [
    { key: 'name',                  label: 'Name',             type: 'text', required: true },
    { key: 'damage_type',           label: 'Damage Type',      type: 'select', options: ['Kinetic', 'Volt'] },
    { key: 'damage_modifier_pct',   label: 'Damage Modifier %',type: 'number' },
    { key: 'special_effect',        label: 'Special Effect',   type: 'textarea' },
    { key: 'notes',                 label: 'Notes',            type: 'textarea' },
  ],
};

const TABS = [
  { key: 'weapon_stats',      label: 'WEAPONS',  color: '#ff8800' },
  { key: 'shell_stats',       label: 'SHELLS',   color: '#00f5ff' },
  { key: 'shell_stat_values', label: 'SHELL STATS', color: '#00ff88' },
  { key: 'mod_stats',         label: 'MODS',     color: '#ff0000' },
  { key: 'implant_stats',     label: 'IMPLANTS', color: '#9b5de5' },
  { key: 'ammo_stats',        label: 'AMMO',     color: '#ffd700' },
];

const S = {
  bg: '#030303',
  surface: '#0a0a0a',
  border: 'rgba(255,255,255,0.07)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.35)',
  input: { background: '#111', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 4, padding: '8px 12px', fontFamily: 'Share Tech Mono, monospace', fontSize: 13, width: '100%', boxSizing: 'border-box' },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [password, setPassword]     = useState('');
  const [authed, setAuthed]         = useState(false);
  const [authError, setAuthError]   = useState('');
  const [activeTab, setActiveTab]   = useState('weapon_stats');
  const [rows, setRows]             = useState([]);
  const [loading, setLoading]       = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData]     = useState({});
  const [saving, setSaving]         = useState(false);
  const [toast, setToast]           = useState(null);
  const [search, setSearch]         = useState('');

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
    if (res.ok) {
      setAuthed(true);
    } else {
      setAuthError('Incorrect password.');
    }
  }

  const loadTable = useCallback(async (table) => {
    setLoading(true);
    setRows([]);
    setSearch('');
    try {
      const res = await fetch('/api/admin?table=' + table, { headers: apiHeaders() });
      const json = await res.json();
      if (json.data) setRows(json.data);
    } catch (e) {
      showToast('Failed to load data', false);
    }
    setLoading(false);
  }, [password]);

  useEffect(() => {
    if (authed) loadTable(activeTab);
  }, [authed, activeTab, loadTable]);

  function startEdit(row) {
    setEditingRow(row.id);
    setFormData({ ...row });
    setShowAddForm(false);
  }

  function startAdd() {
    setShowAddForm(true);
    setEditingRow(null);
    const defaults = {};
    SCHEMAS[activeTab].forEach(f => { defaults[f.key] = f.type === 'boolean' ? true : ''; });
    setFormData(defaults);
  }

  function cancelForm() {
    setEditingRow(null);
    setShowAddForm(false);
    setFormData({});
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const updates = { ...formData };
      delete updates.id;
      delete updates.updated_at;
      const res = await fetch('/api/admin', {
        method: 'PATCH',
        headers: apiHeaders(),
        body: JSON.stringify({ table: activeTab, id: editingRow, updates }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRows(rows.map(r => r.id === editingRow ? json.data : r));
      cancelForm();
      showToast('Saved successfully');
    } catch (e) {
      showToast(e.message, false);
    }
    setSaving(false);
  }

  async function saveNew() {
    setSaving(true);
    try {
      const row = { ...formData };
      delete row.id;
      delete row.updated_at;
      // Convert number fields
      SCHEMAS[activeTab].forEach(f => {
        if (f.type === 'number' && row[f.key] !== '' && row[f.key] !== null) {
          row[f.key] = Number(row[f.key]);
        }
        if (f.type === 'boolean') row[f.key] = row[f.key] === true || row[f.key] === 'true';
        if (row[f.key] === '') row[f.key] = null;
      });
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ table: activeTab, row }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRows([json.data, ...rows]);
      cancelForm();
      showToast('Row added');
    } catch (e) {
      showToast(e.message, false);
    }
    setSaving(false);
  }

  async function deleteRow(id, name) {
    if (!confirm('Delete "' + name + '"? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin?table=' + activeTab + '&id=' + id, {
        method: 'DELETE',
        headers: apiHeaders(),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setRows(rows.filter(r => r.id !== id));
      showToast('Deleted');
    } catch (e) {
      showToast(e.message, false);
    }
  }

  function updateField(key, value) {
    setFormData(prev => ({ ...prev, [key]: value }));
  }

  var activeTabConfig = TABS.find(t => t.key === activeTab);
  var schema = SCHEMAS[activeTab] || [];
  var filtered = rows.filter(r => {
    if (!search) return true;
    var s = search.toLowerCase();
    return Object.values(r).some(v => v && String(v).toLowerCase().includes(s));
  });

  // ─── LOGIN SCREEN ──────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', background: S.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 360, padding: 40, border: '1px solid rgba(155,93,229,0.3)', borderRadius: 8, background: S.surface }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, color: '#9b5de5', marginBottom: 8, letterSpacing: 2 }}>
            ◎ ADMIN ACCESS
          </div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: S.muted, letterSpacing: 2, marginBottom: 28 }}>
            CYBERNETICPUNKS DATA PANEL
          </div>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
            style={{ ...S.input, marginBottom: 12 }}
          />
          {authError && (
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#ff4444', marginBottom: 12 }}>
              {authError}
            </div>
          )}
          <button onClick={login} style={{ width: '100%', padding: '10px', background: '#9b5de5', border: 'none', borderRadius: 4, color: '#fff', fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}>
            AUTHENTICATE
          </button>
        </div>
      </div>
    );
  }

  // ─── ADMIN PANEL ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: S.bg, color: S.text, fontFamily: 'Rajdhani, sans-serif' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', background: toast.ok ? '#00ff8820' : '#ff444420', border: '1px solid ' + (toast.ok ? '#00ff88' : '#ff4444'), borderRadius: 6, fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: toast.ok ? '#00ff88' : '#ff4444' }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid ' + S.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#9b5de5', letterSpacing: 2 }}>◎ DATA ADMIN</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: S.muted, letterSpacing: 2, marginTop: 2 }}>CYBERNETICPUNKS.COM</div>
        </div>
        <a href="/" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: S.muted, textDecoration: 'none', letterSpacing: 2 }}>← BACK TO SITE</a>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid ' + S.border, padding: '0 32px', overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); cancelForm(); }} style={{
            padding: '14px 20px',
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === tab.key ? '2px solid ' + tab.color : '2px solid transparent',
            color: activeTab === tab.key ? tab.color : S.muted,
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            letterSpacing: 2,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* Table header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: activeTabConfig?.color }}>
              {activeTabConfig?.label}
            </div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: S.muted }}>
              {filtered.length} ROWS
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...S.input, width: 200 }}
            />
            <button onClick={startAdd} style={{ padding: '8px 18px', background: activeTabConfig?.color, border: 'none', borderRadius: 4, color: '#000', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + ADD ROW
            </button>
          </div>
        </div>

        {/* Add / Edit Form */}
        {(showAddForm || editingRow) && (
          <div style={{ background: S.surface, border: '1px solid ' + (activeTabConfig?.color + '33'), borderRadius: 8, padding: 24, marginBottom: 24 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: activeTabConfig?.color, letterSpacing: 2, marginBottom: 20 }}>
              {showAddForm ? '+ NEW ROW' : '✎ EDITING ROW'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
              {schema.map(field => (
                <div key={field.key}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: S.muted, letterSpacing: 2, marginBottom: 5 }}>
                    {field.label}{field.required ? ' *' : ''}
                  </div>
                  {field.type === 'textarea' ? (
                    <textarea
                      value={formData[field.key] || ''}
                      onChange={e => updateField(field.key, e.target.value)}
                      rows={3}
                      style={{ ...S.input, resize: 'vertical' }}
                    />
                  ) : field.type === 'select' ? (
                    <select
                      value={formData[field.key] || ''}
                      onChange={e => updateField(field.key, e.target.value)}
                      style={{ ...S.input }}
                    >
                      <option value="">— Select —</option>
                      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <select
                      value={String(formData[field.key])}
                      onChange={e => updateField(field.key, e.target.value === 'true')}
                      style={{ ...S.input }}
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={formData[field.key] ?? ''}
                      onChange={e => updateField(field.key, e.target.value)}
                      style={{ ...S.input }}
                    />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button
                onClick={showAddForm ? saveNew : saveEdit}
                disabled={saving}
                style={{ padding: '10px 24px', background: activeTabConfig?.color, border: 'none', borderRadius: 4, color: '#000', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'SAVING...' : 'SAVE'}
              </button>
              <button onClick={cancelForm} style={{ padding: '10px 24px', background: 'transparent', border: '1px solid ' + S.border, borderRadius: 4, color: S.muted, fontFamily: 'Share Tech Mono, monospace', fontSize: 11, cursor: 'pointer' }}>
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: S.muted, letterSpacing: 2, padding: '40px 0', textAlign: 'center' }}>
            LOADING...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: S.muted, letterSpacing: 2, padding: '40px 0', textAlign: 'center' }}>
            NO ROWS FOUND
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map(row => (
              <div key={row.id} style={{
                background: editingRow === row.id ? activeTabConfig?.color + '08' : S.surface,
                border: '1px solid ' + (editingRow === row.id ? activeTabConfig?.color + '33' : S.border),
                borderLeft: '3px solid ' + (editingRow === row.id ? activeTabConfig?.color : activeTabConfig?.color + '33'),
                borderRadius: 6,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                flexWrap: 'wrap',
              }}>
                {/* Primary fields preview */}
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 3 }}>
                    {row.name || row.shell_name + ' — ' + row.stat_name}
                  </div>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {schema.slice(1, 4).map(f => row[f.key] !== null && row[f.key] !== undefined && row[f.key] !== '' && (
                      <span key={f.key} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: S.muted }}>
                        {f.label}: <span style={{ color: activeTabConfig?.color }}>{String(row[f.key])}</span>
                      </span>
                    ))}
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => startEdit(row)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid ' + activeTabConfig?.color + '44', borderRadius: 4, color: activeTabConfig?.color, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>
                    EDIT
                  </button>
                  <button onClick={() => deleteRow(row.id, row.name || row.shell_name)} style={{ padding: '6px 14px', background: 'transparent', border: '1px solid rgba(255,68,68,0.3)', borderRadius: 4, color: '#ff4444', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, cursor: 'pointer', letterSpacing: 1 }}>
                    DEL
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}