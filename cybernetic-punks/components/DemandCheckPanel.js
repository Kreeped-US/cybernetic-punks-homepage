// components/DemandCheckPanel.js
// Admin panel: the DEMAND CHECK decision-support view -- "is a target query demand-authorized
// AND unserved?" per game, plus a single-query lookup. Usage: <DemandCheckPanel password={pw} />
//
// It reads GET /api/admin/demand-check (which joins keyword_targets <- gsc_query_metrics). It
// is PURE DISPLAY: no ACCEPT/DECLINE, no write, no mutation button. The operator reads the
// verdict (build / already-served / no-demand) and decides; creating a keyword_targets row
// still happens in the existing validated entry form / GSC review panel. Nothing here writes,
// and nothing here enters a prompt -- decision-support, on the operator's side of the firewall.

'use client';

import { useState, useEffect, useCallback } from 'react';

const GAMES = ['marathon', 'dmz', 'wardogs', 'pubg-dednet'];
const GAME_ACCENT = { marathon: '#00ff41', dmz: '#3f7d44', wardogs: '#e0a13a', 'pubg-dednet': '#cc2936' };
const DISPLAY_DEFAULT = 25;

// Verdict presentation -- the three build/don't-build buckets.
const VERDICTS = {
  'build':          { label: 'BUILD',          color: '#00ff88', hint: 'committed demand, not served -> authorized + unserved' },
  'already-served': { label: 'ALREADY-SERVED', color: '#e0a13a', hint: 'a page already ranks page-1 -> do not fork (cannibalization)' },
  'no-demand':      { label: 'NO-DEMAND',      color: '#888888', hint: 'no committed demand -> do not build on intuition' },
};
const COMMITTED_LABEL = { accepted: 'accepted', 'page-gap': 'page-gap', unreviewed: 'unreviewed' };

const MONO = 'Share Tech Mono, monospace';
const DISPLAY = 'Orbitron, monospace';

function fmtNum(n) { return n == null ? '-' : String(n); }
function fmtPos(p) { return p == null ? '-' : p.toFixed(1); }
function shortPage(u) { return (u || '').replace('https://cyberneticpunks.com', '') || '-'; }

function VerdictChip({ v }) {
  const cfg = VERDICTS[v] || VERDICTS['no-demand'];
  return (
    <span title={cfg.hint} style={{ display: 'inline-block', fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: cfg.color, border: '1px solid ' + cfg.color + '66', background: cfg.color + '14', padding: '1px 6px', borderRadius: 3, whiteSpace: 'nowrap' }}>{cfg.label}</span>
  );
}

function VerdictCard({ row }) {
  const cfg = VERDICTS[row.verdict] || VERDICTS['no-demand'];
  return (
    <div style={{ border: '1px solid ' + cfg.color + '55', background: cfg.color + '0d', borderRadius: 5, padding: '10px 14px', marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 6 }}>
        <VerdictChip v={row.verdict} />
        <span style={{ fontFamily: MONO, fontSize: 12, color: '#fff' }}>{row.query}</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
        committed: <b style={{ color: 'rgba(255,255,255,0.8)' }}>{COMMITTED_LABEL[row.committed] || row.committed}</b>
        {'  |  '}forecast vol: <b style={{ color: 'rgba(255,255,255,0.8)' }}>{fmtNum(row.volume)}</b>
        {row.difficulty != null ? '  |  kd: ' + row.difficulty : ''}
        <br />
        GSC: impr <b style={{ color: 'rgba(255,255,255,0.8)' }}>{row.impressions}</b>, clicks {row.clicks}, best pos <b style={{ color: 'rgba(255,255,255,0.8)' }}>{fmtPos(row.position)}</b>
        <br />
        already served by: <b style={{ color: row.served ? cfg.color : 'rgba(255,255,255,0.5)' }}>{row.served ? shortPage(row.best_page) + ' (pos ' + fmtPos(row.position) + ')' : 'no page ranks page-1'}</b>
      </div>
      <div style={{ fontFamily: MONO, fontSize: 9, color: cfg.color, marginTop: 6 }}>{cfg.hint}</div>
      {row.notes ? <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>note: {row.notes}</div> : null}
    </div>
  );
}

export default function DemandCheckPanel({ password }) {
  const [game, setGame] = useState('marathon');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');        // all | build | already-served | no-demand
  const [sortKey, setSortKey] = useState('demand');   // demand | impressions | position | clicks | volume
  const [showAll, setShowAll] = useState(false);
  // single-query lookup
  const [lookupQ, setLookupQ] = useState('');
  const [lookup, setLookup] = useState(null);
  const [lookupBusy, setLookupBusy] = useState(false);

  const load = useCallback(async (g) => {
    if (!password) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/demand-check?game=' + g, { headers: { 'x-admin-password': password } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setData(json);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [password]);

  useEffect(() => { if (open) { setShowAll(false); load(game); } }, [open, game, load]);

  const runLookup = useCallback(async () => {
    if (!password || !lookupQ.trim()) return;
    setLookupBusy(true); setLookup(null);
    try {
      const res = await fetch('/api/admin/demand-check?game=' + game + '&query=' + encodeURIComponent(lookupQ.trim()), { headers: { 'x-admin-password': password } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setLookup(json.result);
    } catch (e) { setLookup({ error: e.message }); } finally { setLookupBusy(false); }
  }, [password, game, lookupQ]);

  const accent = GAME_ACCENT[game] || '#00ff41';
  const allRows = (data && data.rows) || [];
  const filtered = filter === 'all' ? allRows : allRows.filter((r) => r.verdict === filter);
  const sorted = filtered.slice().sort((a, b) => {
    if (sortKey === 'position') return (a.position == null ? Infinity : a.position) - (b.position == null ? Infinity : b.position);
    if (sortKey === 'impressions') return b.impressions - a.impressions;
    if (sortKey === 'clicks') return b.clicks - a.clicks;
    if (sortKey === 'volume') return (b.volume || 0) - (a.volume || 0);
    return (Math.max(b.volume || 0, b.impressions || 0)) - (Math.max(a.volume || 0, a.impressions || 0)); // demand
  });
  const shown = showAll ? sorted : sorted.slice(0, DISPLAY_DEFAULT);
  const counts = data && data.counts;

  const SortTh = ({ label, k }) => (
    <th onClick={() => setSortKey(k)} title="sort" style={{ padding: '3px 8px', cursor: 'pointer', color: sortKey === k ? accent : 'rgba(255,255,255,0.35)' }}>{label}{sortKey === k ? ' v' : ''}</th>
  );

  return (
    <div style={{ marginBottom: 24, border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '14px 18px', background: '#070707' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setOpen(!open)}>
        <div style={{ fontFamily: DISPLAY, fontSize: 13, fontWeight: 800, color: accent, letterSpacing: 2 }}>
          {open ? 'v' : '>'} DEMAND CHECK - AUTHORIZE BEFORE BUILDING
        </div>
        <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
          {counts ? counts.build + ' build / ' + counts.already_served + ' served / ' + counts.no_demand + ' no-demand' : ''}
        </span>
      </div>

      {open && (
        <div style={{ marginTop: 12 }}>
          {/* game selector */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {GAMES.map((g) => (
              <button key={g} onClick={() => { setGame(g); setLookup(null); }} style={{ background: game === g ? (GAME_ACCENT[g] + '22') : 'transparent', border: '1px solid ' + (game === g ? GAME_ACCENT[g] : 'rgba(255,255,255,0.15)'), color: game === g ? GAME_ACCENT[g] : 'rgba(255,255,255,0.5)', fontFamily: MONO, fontSize: 10, padding: '4px 12px', borderRadius: 3, cursor: 'pointer', letterSpacing: 1, textTransform: 'uppercase' }}>{g}</button>
            ))}
            {data && (
              <span style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                {data.window_days + 'd window - impr floor ' + data.min_impressions + ' - served pos <= ' + data.served_position_max + ' - ' + data.keyword_targets + ' committed targets'}
              </span>
            )}
          </div>

          {/* single-query lookup */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>CHECK THIS QUERY:</span>
            <input
              value={lookupQ}
              onChange={(e) => setLookupQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runLookup()}
              placeholder={'e.g. ' + game + ' tier list'}
              style={{ background: '#111', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontFamily: MONO, fontSize: 12, padding: '6px 10px', borderRadius: 4, minWidth: 260 }}
            />
            <button onClick={runLookup} disabled={lookupBusy || !lookupQ.trim()} style={{ background: 'transparent', border: '1px solid ' + accent + '88', color: accent, fontFamily: MONO, fontSize: 10, padding: '6px 14px', borderRadius: 3, cursor: 'pointer', letterSpacing: 1 }}>{lookupBusy ? '...' : 'CHECK'}</button>
          </div>
          {lookup && (lookup.error
            ? <div style={{ fontFamily: MONO, fontSize: 11, color: '#ff4444' }}>{lookup.error}</div>
            : <VerdictCard row={lookup} />)}

          <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '16px 0' }} />

          {/* verdict filter chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {[['all', 'ALL', allRows.length], ['build', 'BUILD', counts ? counts.build : 0], ['already-served', 'SERVED', counts ? counts.already_served : 0], ['no-demand', 'NO-DEMAND', counts ? counts.no_demand : 0]].map(([k, lbl, n]) => {
              const c = k === 'all' ? '#ffffff' : (VERDICTS[k] ? VERDICTS[k].color : '#fff');
              const active = filter === k;
              return (
                <button key={k} onClick={() => { setFilter(k); setShowAll(false); }} style={{ background: active ? c + '22' : 'transparent', border: '1px solid ' + (active ? c : 'rgba(255,255,255,0.15)'), color: active ? c : 'rgba(255,255,255,0.5)', fontFamily: MONO, fontSize: 9, padding: '3px 10px', borderRadius: 3, cursor: 'pointer', letterSpacing: 1 }}>{lbl} {n}</button>
              );
            })}
          </div>

          {loading && <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>computing...</div>}
          {error && <div style={{ fontFamily: MONO, fontSize: 11, color: '#ff4444' }}>{error}</div>}
          {data && !loading && (
            <>
              {sorted.length === 0 ? (
                <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(255,255,255,0.25)', padding: '6px 0' }}>no demand rows for this filter</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: MONO, fontSize: 11 }}>
                  <thead>
                    <tr style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'left' }}>
                      <th style={{ padding: '3px 8px 3px 0' }}>verdict</th>
                      <th style={{ padding: '3px 8px' }}>query</th>
                      <th style={{ padding: '3px 8px' }}>committed</th>
                      <SortTh label="vol" k="volume" />
                      <SortTh label="impr" k="impressions" />
                      <SortTh label="clk" k="clicks" />
                      <SortTh label="pos" k="position" />
                      <th style={{ padding: '3px 8px' }}>already served by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)' }}>
                        <td style={{ padding: '3px 8px 3px 0' }}><VerdictChip v={r.verdict} /></td>
                        <td style={{ padding: '3px 8px', color: '#fff' }}>{r.query}</td>
                        <td style={{ padding: '3px 8px', color: r.committed === 'accepted' ? '#00ff88' : r.committed === 'page-gap' ? '#e0a13a' : 'rgba(255,255,255,0.4)' }}>{COMMITTED_LABEL[r.committed] || r.committed}</td>
                        <td style={{ padding: '3px 8px' }}>{fmtNum(r.volume)}</td>
                        <td style={{ padding: '3px 8px', color: accent }}>{r.impressions}</td>
                        <td style={{ padding: '3px 8px' }}>{r.clicks}</td>
                        <td style={{ padding: '3px 8px' }}>{fmtPos(r.position)}</td>
                        <td style={{ padding: '3px 8px', color: r.served ? '#e0a13a' : 'rgba(255,255,255,0.3)' }}>{r.served ? shortPage(r.best_page) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {sorted.length > DISPLAY_DEFAULT && (
                <button onClick={() => setShowAll(!showAll)} style={{ marginTop: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.5)', fontFamily: MONO, fontSize: 10, padding: '4px 10px', borderRadius: 3, cursor: 'pointer', letterSpacing: 1 }}>
                  {showAll ? 'SHOW TOP ' + DISPLAY_DEFAULT : 'SHOW ALL ' + sorted.length}
                </button>
              )}
              <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>
                Read-only decision-support. BUILD = committed demand not yet served. ALREADY-SERVED = a page ranks page-1 (do not fork). NO-DEMAND = intuition only. Creating a target still happens in the keyword form / GSC review.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
