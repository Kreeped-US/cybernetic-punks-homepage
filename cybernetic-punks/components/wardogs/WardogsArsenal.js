// components/wardogs/WardogsArsenal.js
// Pre-launch Wardogs ARSENAL roster browser -- a LIST, never a tier list. Renders the
// weapon_stats rows (game_slug='wardogs', all verified=false) grouped by category, using
// the DMZ verified/unconfirmed pattern (amber UNCONFIRMED markers, no verified pill, no
// tier badge). The route noindexes this section while its rows are unverified (data
// sections return sectionHasContent=false), and NO JSON-LD fact is asserted here -- the
// numbers are not in yet, only names + categories + attribution.
//
// Server component, presentational, token-driven. Mirrors components/dmz/DmzEntityHub.js.
import Link from 'next/link';

var AMBER = '#ffb400'; // the DMZ "unconfirmed" marker color

// Group rows by category, preserving first-seen order.
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

function isStarter(w) {
  return typeof w.notes === 'string' && w.notes.indexOf('STARTER') === 0;
}
function starterCamo(w) {
  // 'STARTER: Valkyra camo' -> 'Valkyra camo'
  return isStarter(w) ? w.notes.replace(/^STARTER:\s*/, '') : null;
}

export default function WardogsArsenal({ weapons }) {
  var groups = groupByCategory(weapons);
  var total = (weapons || []).length;
  // One representative attribution for the banner (all rows carry their own verified_source).
  var src = (weapons || []).map(function (w) { return w.verified_source; }).filter(Boolean)[0]
    || 'Closed Alpha/Beta playtest capture (attributed, unconfirmed)';

  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 16px 96px' }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 10 }}>
        Wardogs - Arsenal
      </div>
      <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 30, fontWeight: 800, letterSpacing: 1, color: '#fff', margin: '0 0 6px' }}>
        Arsenal
      </h1>
      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: '0 0 20px', maxWidth: 680, lineHeight: 1.6 }}>
        The pre-launch weapon roster - {total} weapons across {groups.length} categories. Names and
        categories only; combat stats are not in yet.
      </p>

      {/* UNCONFIRMED banner -- the DMZ honesty pattern. Amber, cites the attribution, no verified claim. */}
      <div style={{ background: 'rgba(255,180,0,0.06)', border: '1px solid ' + AMBER, borderRadius: 4, padding: '14px 16px', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: AMBER, marginBottom: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: AMBER }} />
          Unconfirmed - pre-launch
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
          This roster is attributed to playtest captures, not the live vendor. {src}. The final roster,
          calibers, and stats stay unconfirmed until they can be verified in-game at Early Access - none
          of these numbers are stated as fact. The three official starters are marked.
        </p>
      </div>

      {groups.map(function (grp) {
        return (
          <div key={grp.category} style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
              <h2 style={{ fontFamily: 'var(--font-exo2), system-ui, sans-serif', fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>
                {grp.category}
              </h2>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>{grp.guns.length}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: 8 }}>
              {grp.guns.map(function (w) {
                var starter = isStarter(w);
                return (
                  <div key={w.name} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '2px solid ' + AMBER, borderRadius: '0 3px 3px 0', padding: '13px 15px' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{w.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: AMBER }}>
                        {starter ? 'Starter' : 'Playtest'}
                      </span>
                      {starter && (
                        <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--green)' }}>
                          {starterCamo(w)}
                        </span>
                      )}
                      {w.ammo_type && (
                        <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{w.ammo_type}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 28 }}>
        <Link href="/wardogs" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px' }}>
          &larr; All Wardogs sections
        </Link>
      </div>
    </main>
  );
}
