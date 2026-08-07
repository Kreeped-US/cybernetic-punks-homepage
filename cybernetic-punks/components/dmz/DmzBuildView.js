// components/dmz/DmzBuildView.js
// Presentational render of a resolved DMZ weapon build (B1). SERVER component -- no state, no
// fetch, no paid path. Renders the slug-resolved weapon + standard attachments (by slot) +
// apex from `resolved` (build_json + the store rows fetchWeaponBuild joined by slug).
//
// HONESTY: if any cited component is unverified (the derived gate is false), an UNCONFIRMED
// banner is shown -- mirrors DmzEntityDetail's posture. The route separately sets robots
// noindex when the gate is false; this component makes the provisional state visible to a human.

import Link from 'next/link';
import { isBuildIndexable } from '@/lib/dmz/weaponBuilds';

const GRADE_COLORS = { S: '#ffd700', A: '#00ff41', B: '#00d4ff', C: '#ff8800', D: '#ff2222' };
const ACCENT = '#ff8800';

export default function DmzBuildView({ resolved, weaponName, weaponSlug }) {
  if (!resolved || !resolved.build_json) return null;
  const bj = resolved.build_json;
  const attach = resolved.attachmentsBySlug || {};
  const confirmed = isBuildIndexable(resolved);

  const grade = bj.loadout_grade || 'A';
  const gradeColor = GRADE_COLORS[grade] || ACCENT;
  const std = bj.standard_attachments || [];
  const apex = bj.apex_attachment || null;

  const label = { fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' };

  return (
    <div style={{ background: '#121418', color: '#fff', paddingBottom: 60, fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px 40px' }}>

        {/* breadcrumb + H1 */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12, fontFamily: 'monospace', letterSpacing: 1 }}>
          <Link href="/dmz" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>DMZ</Link>
          {' / '}<Link href="/dmz/builds" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Builds</Link>
          {' / '}<span style={{ color: ACCENT }}>{weaponName} Build</span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1, margin: '0 0 14px' }}>
          Best MW4 DMZ {weaponName} Build - FOB Gunsmith Loadout
        </h1>

        {/* UNCONFIRMED banner when the derived gate is false (a component is unverified) */}
        {!confirmed && (
          <div style={{ background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.35)', borderRadius: 3, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#ffb454', fontFamily: 'monospace' }}>
            UNCONFIRMED - one or more components are not yet verified in-game. This page is
            noindexed until every part is confirmed (or at launch).
          </div>
        )}

        {/* build card */}
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '3px solid ' + ACCENT, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '20px 24px', borderBottom: '1px solid #22252e' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...label, color: ACCENT + 'aa', marginBottom: 8 }}>DMZ BUILD REPORT</div>
              <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.5, marginBottom: 6 }}>
                &ldquo;{bj.build_name || (weaponName + ' Build')}&rdquo;
              </div>
              {bj.summary && <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{bj.summary}</div>}
            </div>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ background: gradeColor, color: '#000', fontSize: 44, fontWeight: 900, padding: '6px 20px', borderRadius: 2, fontFamily: 'monospace', lineHeight: 1 }}>{grade}</div>
              <div style={{ ...label, marginTop: 6 }}>LOADOUT GRADE</div>
            </div>
          </div>

          {/* weapon */}
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #22252e' }}>
            <div style={{ ...label, marginBottom: 6 }}>WEAPON</div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>{weaponName}</div>
            {bj.weapon && bj.weapon.reason && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginTop: 6 }}>{bj.weapon.reason}</div>}
          </div>

          {/* standard attachments, by slot */}
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #22252e' }}>
            <div style={{ ...label, marginBottom: 10 }}>STANDARD ATTACHMENTS ({std.length}/5)</div>
            {std.map((a, i) => {
              const row = attach[a.attachment_slug] || {};
              return (
                <div key={a.attachment_slug || i} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: ACCENT, letterSpacing: 1, fontFamily: 'monospace', textTransform: 'uppercase' }}>{a.slot_slug}</div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{a.name || row.name || a.attachment_slug}</div>
                  {a.reason && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginTop: 2 }}>{a.reason}</div>}
                </div>
              );
            })}
          </div>

          {/* apex (+1) */}
          {apex && (
            <div style={{ padding: '18px 24px' }}>
              <div style={{ ...label, marginBottom: 6, color: '#cc44ff' }}>APEX (+1, BEHAVIOR-CHANGING)</div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{apex.name || (attach[apex.attachment_slug] && attach[apex.attachment_slug].name) || apex.attachment_slug}</div>
              {attach[apex.attachment_slug] && attach[apex.attachment_slug].behavior &&
                <div style={{ fontSize: 13, color: 'rgba(204,68,255,0.8)', lineHeight: 1.6, marginTop: 4 }}>{attach[apex.attachment_slug].behavior}</div>}
              {apex.reason && <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginTop: 2 }}>{apex.reason}</div>}
            </div>
          )}
        </div>

        {/* strengths / weaknesses */}
        {(Array.isArray(bj.strengths) && bj.strengths.length > 0) || (Array.isArray(bj.weaknesses) && bj.weaknesses.length > 0) ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginTop: 12 }}>
            {Array.isArray(bj.strengths) && bj.strengths.length > 0 && (
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '14px 18px' }}>
                <div style={{ ...label, color: '#00ff41', marginBottom: 8 }}>STRENGTHS</div>
                {bj.strengths.map((s, i) => <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>+ {s}</div>)}
              </div>
            )}
            {Array.isArray(bj.weaknesses) && bj.weaknesses.length > 0 && (
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '14px 18px' }}>
                <div style={{ ...label, color: '#ff8800', marginBottom: 8 }}>WEAKNESSES</div>
                {bj.weaknesses.map((s, i) => <div key={i} style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>- {s}</div>)}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
