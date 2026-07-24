// components/GscReviewPanel.js
// Admin panel: the Consumer B two-lane GSC review list, per game. READ-ONLY v1 --
// it displays ranked candidates; accept/decline write ergonomics are a fast-follow.
// Usage: <GscReviewPanel password={adminPassword} />
//
// The operator reviews per game and, for each candidate, adds a keyword_targets row by
// hand (accept = active; decline = is_active=false + notes) through the KEYWORD TARGETS
// tab. Doing so removes the candidate from this list on the next load -- the list is
// self-clearing because it excludes anything already in keyword_targets.

'use client';

import { useState, useEffect, useCallback } from 'react';

const GAMES = ['marathon', 'dmz'];
const DISPLAY_DEFAULT = 25; // a DISPLAY limit, not a query filter -- the full set is always returned
const GAME_ACCENT = { marathon: '#00ff41', dmz: '#3f7d44' };

function Lane({ title, subtitle, accent, rows }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? rows : rows.slice(0, DISPLAY_DEFAULT);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 800, color: accent, letterSpacing: 1 }}>{title}</span>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{subtitle} · {rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '6px 0' }}>no candidates</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'Share Tech Mono, monospace', fontSize: 11 }}>
          <thead>
            <tr style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'left' }}>
              <th style={{ padding: '3px 8px 3px 0' }}>impr</th>
              <th style={{ padding: '3px 8px' }}>pos</th>
              <th style={{ padding: '3px 8px' }}>clicks</th>
              <th style={{ padding: '3px 8px' }}>query</th>
              <th style={{ padding: '3px 8px' }}>best page</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)' }}>
                <td style={{ padding: '3px 8px 3px 0', color: accent }}>{r.impressions}</td>
                <td style={{ padding: '3px 8px' }}>{r.position != null ? r.position.toFixed(1) : '-'}</td>
                <td style={{ padding: '3px 8px' }}>{r.clicks}</td>
                <td style={{ padding: '3px 8px', color: '#fff' }}>{r.query}</td>
                <td style={{ padding: '3px 8px', color: 'rgba(255,255,255,0.45)' }}>{(r.best_page || '').replace('https://cyberneticpunks.com', '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {rows.length > DISPLAY_DEFAULT && (
        <button onClick={() => setShowAll(!showAll)} style={{ marginTop: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, padding: '4px 10px', borderRadius: 3, cursor: 'pointer', letterSpacing: 1 }}>
          {showAll ? 'SHOW TOP ' + DISPLAY_DEFAULT : 'SHOW ALL ' + rows.length}
        </button>
      )}
    </div>
  );
}

export default function GscReviewPanel({ password }) {
  const [game, setGame] = useState('marathon');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);

  const load = useCallback(async (g) => {
    if (!password) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/gsc-review?game=' + g, { headers: { 'x-admin-password': password } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setData(json);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [password]);

  useEffect(() => { if (open) load(game); }, [open, game, load]);

  const accent = GAME_ACCENT[game] || '#00ff41';

  return (
    <div style={{ marginBottom: 24, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '14px 18px', background: '#070707' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: accent, letterSpacing: 2 }}>
          {open ? '▾' : '▸'} GSC REVIEW — KEYWORD CANDIDATES
        </div>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          {data ? data.counts.framing + ' framing · ' + data.counts.weak_position + ' weak-position' : ''}
        </span>
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            {GAMES.map((g) => (
              <button key={g} onClick={() => setGame(g)} style={{ background: game === g ? (GAME_ACCENT[g] + '22') : 'transparent', border: '1px solid ' + (game === g ? GAME_ACCENT[g] : 'rgba(255,255,255,0.15)'), color: game === g ? GAME_ACCENT[g] : 'rgba(255,255,255,0.5)', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, padding: '4px 12px', borderRadius: 3, cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase' }}>{g}</button>
            ))}
            {data && (
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                {data.window_days}d window · impr ≥ {data.min_impressions} · {data.counts.query_rows} query rows
              </span>
            )}
          </div>

          {loading && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>computing…</div>}
          {error && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#ff4444' }}>{error}</div>}
          {data && !loading && (
            <>
              <Lane title="FRAMING" subtitle={'reframe a page ranking ' + data.framing_band[0] + '–' + data.framing_band[1]} accent={accent} rows={data.framing} />
              <Lane title="WEAK-POSITION" subtitle={'entity-page candidates (best rank > ' + data.framing_band[1] + ')'} accent="#9b5de5" rows={data.weak_position} />
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                Reviewing a candidate = add a keyword_targets row by hand (accept = active; decline = is_active off + notes). It then drops off this list.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
