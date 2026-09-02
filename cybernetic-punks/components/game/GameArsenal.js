// components/game/GameArsenal.js
// SHARED honest-null ARSENAL roster for the game-section template -- a LIST, never a tier list.
// Renders weapon_stats rows (grouped by category) with NAMES + CLASSES only; stat values are not
// shown because they are null (structure-known, values-pending). Mirrors the DMZ/Wardogs honesty
// pattern: an "unconfirmed" banner, a per-weapon tier marker derived HONESTLY from verified_source
// (an attributed gun reads "Attributed", never "Confirmed"), and NO asserted numbers / no JSON-LD
// fact. First used by Bodycam via the shared GameSectionPage.

import Link from 'next/link';

var FONT = 'Exo_2, system-ui, sans-serif';
var AMBER = '#ffb400'; // the site-wide "unconfirmed" honesty marker

// Honest tier from verified_source. Order matters: 'attributed' and 'reworked' win over 'patch'
// (a reworked gun's source also mentions the patch). Never upgrades an attributed gun to confirmed.
function tier(w) {
  var s = String(w.verified_source || '').toLowerCase();
  if (s.indexOf('attributed') !== -1 || s.indexOf('devlog') !== -1) return { label: 'Attributed', color: AMBER };
  if (s.indexOf('reworked') !== -1 || s.indexOf('present in-game') !== -1) return { label: 'Reworked', color: 'var(--text-tertiary)' };
  if (s.indexOf('patch') !== -1 || s.indexOf('locked') !== -1) return { label: 'Patch-confirmed', color: 'var(--accent)' };
  return { label: 'Unconfirmed', color: AMBER };
}

function groupByCategory(weapons) {
  var order = [];
  var map = {};
  (weapons || []).forEach(function (w) {
    var c = w.category || 'Other';
    if (!map[c]) { map[c] = []; order.push(c); }
    map[c].push(w);
  });
  return order.map(function (c) { return { category: c, guns: map[c] }; });
}

export default function GameArsenal({ config, section, weapons }) {
  var groups = groupByCategory(weapons);
  var total = (weapons || []).length;

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 16px 80px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href={config.basePath} style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>{config.displayName}</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{section.label}</span>
      </nav>

      <h1 style={{ fontFamily: FONT, fontSize: 30, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>{section.label}</h1>
      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: '0 0 20px', maxWidth: 680, lineHeight: 1.6 }}>
        The weapon roster - {total} {total === 1 ? 'weapon' : 'weapons'} across {groups.length} {groups.length === 1 ? 'class' : 'classes'}. Names and classes only; stat values are not shown because none are published yet.
      </p>

      {/* Honest-null banner: no numbers are asserted; the tier of each entry is shown honestly. */}
      <div style={{ background: 'rgba(255,180,0,0.06)', border: '1px solid ' + AMBER, borderRadius: 4, padding: '14px 16px', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: AMBER, marginBottom: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: AMBER }} />
          Structure confirmed - values pending
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
          The roster below is sourced from the official patch notes and devlogs. Damage, rate of fire, magazine sizes, and every other number stay unpublished and are NOT stated here - they are added only once verified in-game. Each entry carries its source tier: patch-confirmed, reworked-existing, or attributed (devlog, not yet in a patch).
        </p>
      </div>

      {groups.map(function (grp) {
        return (
          <div key={grp.category} style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
              <h2 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>{grp.category}</h2>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>{grp.guns.length}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: 8 }}>
              {grp.guns.map(function (w) {
                var t = tier(w);
                return (
                  <div key={w.name} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '2px solid ' + t.color, borderRadius: '0 3px 3px 0', padding: '13px 15px' }}>
                    <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{w.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: t.color }}>{t.label}</span>
                      {w.notes ? <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{w.notes}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 28 }}>
        <Link href={config.basePath} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px' }}>
          &larr; All {config.displayName} sections
        </Link>
      </div>
    </main>
  );
}
