// components/GscReviewPanel.js
// Admin panel: the Consumer B two-lane GSC review list, per game, with ACCEPT / DECLINE.
// Usage: <GscReviewPanel password={adminPassword} onAccept={fn} />
//
// The list is live-computed (GET /api/admin/gsc-review) and self-clearing: it excludes any
// query already in keyword_targets, so BOTH outcomes remove the candidate on reload.
//   ACCEPT  -> hands off to the existing keyword_targets entry form, PREFILLED (parent's
//              onAccept). It does NOT write here. GSC supplies query text and the game, but a
//              matchable keyword_targets row needs entity_type + entity_slug + facet (the
//              matcher requires facet equality), and GSC supplies none of those -- so a human
//              completes them in the validated form. Writing directly would create rows that
//              look accepted and are structurally inert (can never match).
//   DECLINE -> writes is_active=false + a notes reason directly (a declined row needs no
//              entity, so the entry validator passes on empty entity_slug). A decline with no
//              reason is a row nobody can interpret later, so a reason is REQUIRED.
//
// BOTH ARE HUMAN-INITIATED: nothing writes without an explicit button click. Nothing here
// enters a prompt -- this feeds the review surface, not the editor.

'use client';

import { useState, useEffect, useCallback } from 'react';

const GAMES = ['marathon', 'dmz'];
const DISPLAY_DEFAULT = 25; // a DISPLAY limit, not a query filter -- the full set is always returned
const GAME_ACCENT = { marathon: '#00ff41', dmz: '#3f7d44' };

function gscNote(r, reason) {
  const page = (r.best_page || '').replace('https://cyberneticpunks.com', '');
  const pos = r.position != null ? r.position.toFixed(1) : '-';
  const base = '[GSC review] pos=' + pos + ' impr=' + r.impressions + ' page=' + page;
  return reason ? base + ' — ' + reason : base;
}

function Lane({ title, subtitle, accent, rows, onAccept, onDecline, busy }) {
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
              <th style={{ padding: '3px 8px' }} />
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
                <td style={{ padding: '3px 8px', whiteSpace: 'nowrap' }}>
                  <button disabled={busy === r.query} onClick={() => onAccept(r)} title="prefill a keyword_targets row (you complete the entity fields)"
                    style={{ background: 'transparent', border: '1px solid #00ff8855', color: '#00ff88', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, padding: '2px 8px', borderRadius: 3, cursor: 'pointer', marginRight: 6 }}>ACCEPT</button>
                  <button disabled={busy === r.query} onClick={() => onDecline(r)} title="record is_active=false + a reason"
                    style={{ background: 'transparent', border: '1px solid #ff444455', color: '#ff6666', fontFamily: 'Share Tech Mono, monospace', fontSize: 9, padding: '2px 8px', borderRadius: 3, cursor: 'pointer' }}>{busy === r.query ? '…' : 'DECLINE'}</button>
                </td>
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

export default function GscReviewPanel({ password, onAccept, refreshKey }) {
  const [game, setGame] = useState('marathon');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null); // query currently being written

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

  // refreshKey is bumped by the parent after any keyword_targets write (accept/edit/delete),
  // so an accepted candidate leaves the list the moment its row saves -- the same self-clearing
  // Decline already gets by calling load() directly. Reloads only when the panel is open.
  useEffect(() => { if (open) load(game); }, [open, game, load, refreshKey]);

  // ACCEPT: hand the candidate to the parent, which switches to the keyword_targets tab and
  // prefills the entry form. No write happens here.
  function accept(r) {
    if (onAccept) onAccept({ query: r.query, game_slug: r.game_slug, position: r.position, impressions: r.impressions, best_page: r.best_page, note: gscNote(r) });
  }

  // DECLINE: a reason is REQUIRED (no write on cancel/empty). Writes a minimal, valid,
  // inactive keyword_targets row via the existing insert path; the list self-clears on reload.
  async function decline(r) {
    const reason = window.prompt('Reason for declining "' + r.query + '"? (required)');
    if (!reason || !reason.trim()) return; // human-initiated; no reason -> no write
    setBusy(r.query);
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({
          table: 'keyword_targets',
          row: {
            keyword: r.query, game_slug: r.game_slug, is_active: false,
            notes: gscNote(r, reason.trim()),
            studied_at: new Date().toISOString().slice(0, 10), source: 'gsc-review',
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'decline failed');
      await load(game); // candidate now in keyword_targets -> excluded on this reload
    } catch (e) {
      window.alert('Decline failed: ' + e.message);
    } finally { setBusy(null); }
  }

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
              <Lane title="FRAMING" subtitle={'reframe a page ranking ' + data.framing_band[0] + '–' + data.framing_band[1]} accent={accent} rows={data.framing} onAccept={accept} onDecline={decline} busy={busy} />
              <Lane title="WEAK-POSITION" subtitle={'entity-page candidates (best rank > ' + data.framing_band[1] + ')'} accent="#9b5de5" rows={data.weak_position} onAccept={accept} onDecline={decline} busy={busy} />
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 4 }}>
                ACCEPT prefills the keyword_targets form (you complete entity_type / entity_slug / facet). DECLINE records is_active=off + your reason. Either way the candidate drops off this list.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
