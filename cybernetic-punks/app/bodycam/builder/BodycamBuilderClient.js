'use client';
// app/bodycam/builder/BodycamBuilderClient.js
// The interactive Bodycam attachment builder -- the ENHANCEMENT that mounts over the SSR frame's
// placeholder (phase 3, build-order #3). Mirrors the Marathon BuildRefiner discipline:
//   - 'use client', useState ONLY. NO useEffect / NO fetch on load. NO URL writes, NO localStorage.
//   - the server passes data IN as props (empty now; the widget auto-fills when parts are seeded).
//
// CRITICAL SEPARATION: this widget owns UI STATE + RENDERING only. It NEVER re-derives a
// mountability decision -- every gate answer comes from resolveMountable (lib/bodycam/mountability.js,
// 17 tests). The widget calls the resolver and renders what it returns; it does not reimplement the
// requires/provides / compat / slot-free logic.
//
// EMPTY-SKELETON (zero parts today): the slot frame renders with "parts pending" per slot, and a
// LIVE dependency-lock DEMO shows the confirmed rail->optic rule working -- driven THROUGH the
// resolver over the sourced SLOT STRUCTURE (not fabricated parts). Honest, not broken.

import { useState } from 'react';
import { resolveMountable, REASON } from '@/lib/bodycam/mountability';
import { BODYCAM_SLOTS } from '@/lib/bodycam/slots';

// Human-readable text for a resolver reason code (the resolver decides; this only phrases it).
function reasonText(row) {
  switch (row && row.reason) {
    case REASON.REQUIRES_SLOTS: return 'Needs ' + ((row.missing || []).join(', ') || 'a provider slot') + ' first';
    case REASON.INCOMPATIBLE:   return 'Not compatible with this weapon';
    case REASON.SLOT_OCCUPIED:  return 'Slot already filled';
    case REASON.NO_WEAPON:      return 'Select a weapon first';
    case REASON.ALREADY_MOUNTED:return 'Mounted';
    default:                    return '';
  }
}

// The rail->optic DEPENDENCY DEMO fixtures. These are the sourced SLOT CATEGORIES (Optic Mount,
// Optic), used ONLY to demonstrate the confirmed mounting rule through the resolver. They are NOT
// the parts roster and NOT fabricated product parts -- ephemeral, in-component, clearly labelled,
// never seeded, never rendered as "parts".
const DEMO_WEAPON = 'demo';
const DEMO_OPTIC_MOUNT = { slug: 'demo-optic-mount', name: 'Optic Mount', slot_type: 'optic-mount', requires_slots: [], provides_slots: ['optic-mount'] };
const DEMO_OPTIC = { slug: 'demo-optic', name: 'Optic', slot_type: 'optic', requires_slots: ['optic-mount'], provides_slots: [] };
const DEMO_ATTACHMENTS = [DEMO_OPTIC_MOUNT, DEMO_OPTIC];
const DEMO_COMPAT = [
  { weapon_name: DEMO_WEAPON, attachment_slug: 'demo-optic-mount', compatible: true },
  { weapon_name: DEMO_WEAPON, attachment_slug: 'demo-optic', compatible: true },
];

export default function BodycamBuilderClient({ weapons = [], attachments = [], compatibility = [], accent = '#3d97b8' }) {
  const [selectedWeapon, setSelectedWeapon] = useState('');
  const [mounted, setMounted] = useState([]); // current build: array of attachment objects
  const [demoRail, setDemoRail] = useState(false);

  const hasParts = attachments.length > 0;

  // === ALL gate logic delegated to the resolver (never re-derived here) ===
  const resolved = resolveMountable({
    weapon: selectedWeapon || null,
    attachments,
    compatibility,
    mountedParts: mounted,
  });
  // Group the resolver's per-attachment verdicts by slot_type for the frame.
  const bySlot = {};
  for (const row of resolved) {
    (bySlot[row.slot_type] = bySlot[row.slot_type] || []).push(row);
  }
  const mountedBySlot = {};
  for (const m of mounted) mountedBySlot[m.slot_type] = m;
  const attBySlug = {};
  for (const a of attachments) attBySlug[a.slug] = a;

  function mount(slug) {
    const part = attBySlug[slug];
    if (part) setMounted((prev) => prev.concat([part]));
  }
  function unmount(slug) {
    setMounted((prev) => prev.filter((m) => m.slug !== slug));
  }
  function reset() {
    setMounted([]);
  }

  // === the dependency DEMO -- lock decision comes from the resolver, not from the widget ===
  const demoResolved = resolveMountable({
    weapon: DEMO_WEAPON,
    attachments: DEMO_ATTACHMENTS,
    compatibility: DEMO_COMPAT,
    mountedParts: demoRail ? [DEMO_OPTIC_MOUNT] : [],
  });
  const demoOptic = demoResolved.find((r) => r.slug === 'demo-optic') || {};

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 };
  const chipBtn = (on) => ({
    fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 3, cursor: 'pointer',
    border: '1px solid ' + (on ? accent : 'var(--border)'), background: on ? accent : 'transparent',
    color: on ? '#00121a' : 'var(--text-secondary)', fontFamily: 'inherit',
  });

  return (
    <div>
      {/* Empty-roster notice (honest). */}
      {!hasParts && (
        <div style={{ ...card, padding: '13px 15px', marginBottom: 14, fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          The parts roster is pending publication. The slot frame and the mounting rule below are
          live now; weapon selection and per-slot parts activate automatically when the verified
          roster is seeded &mdash; no rebuild.
        </div>
      )}

      {/* Weapon selector -- populated from props (empty now). */}
      {weapons.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 7 }}>Weapon</label>
          <select
            value={selectedWeapon}
            onChange={(e) => { setSelectedWeapon(e.target.value); setMounted([]); }}
            style={{ background: 'var(--bg-page)', color: '#fff', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px', fontSize: 14, minWidth: 220 }}
          >
            <option value="">Select a weapon...</option>
            {weapons.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      )}

      {/* The slot frame -- rendered from the sourced taxonomy; parts come from the resolver. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 12px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
          Slot frame{hasParts ? '' : ' — parts pending'}
        </div>
        {mounted.length > 0 && (
          <button onClick={reset} style={chipBtn(false)}>Reset build</button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(180px, 100%), 1fr))', gap: 8 }}>
        {BODYCAM_SLOTS.map((s) => {
          const rows = bySlot[s.type] || [];
          const mountable = rows.filter((r) => r.mountable);
          const lockedExample = rows.find((r) => !r.mountable && r.reason !== REASON.ALREADY_MOUNTED);
          const inSlot = mountedBySlot[s.type];
          return (
            <div key={s.type} style={{ ...card, padding: '12px 12px', background: 'var(--bg-page)' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{s.slot}</div>
              {inSlot ? (
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: accent, fontWeight: 700 }}>{inSlot.name}</span>
                  <button onClick={() => unmount(inSlot.slug)} style={{ ...chipBtn(false), padding: '2px 8px', fontSize: 11 }}>remove</button>
                </div>
              ) : !hasParts ? (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 5 }}>Parts pending</div>
              ) : mountable.length > 0 ? (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {mountable.map((r) => (
                    <button key={r.slug} onClick={() => mount(r.slug)} style={{ ...chipBtn(false), padding: '3px 9px', fontSize: 11 }}>{r.name}</button>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 5 }}>
                  {lockedExample ? reasonText(lockedExample) : (selectedWeapon ? 'No compatible parts' : 'Select a weapon')}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* LIVE dependency-lock demo -- the confirmed rail->optic rule, decided by the resolver. */}
      <div style={{ ...card, padding: '18px 18px', marginTop: 20, borderLeft: '2px solid ' + accent }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: accent, marginBottom: 10 }}>
          How the mounting rule works
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <button onClick={() => setDemoRail((v) => !v)} style={chipBtn(demoRail)}>
            {demoRail ? 'Rail mounted ✓' : 'Add a rail (provides optic-mount)'}
          </button>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Optic slot:{' '}
            {demoOptic.mountable
              ? <strong style={{ color: accent }}>UNLOCKED</strong>
              : <strong style={{ color: 'var(--text-tertiary)' }}>LOCKED &mdash; {reasonText(demoOptic)}</strong>}
          </div>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.6 }}>
          A demonstration of the confirmed rail-before-sight rule using the slot structure &mdash; not
          the parts roster (parts pending). The lock/unlock decision is computed by the shared
          mountability resolver.
        </p>
      </div>
    </div>
  );
}
