// components/SourceReviewPanel.js
// Admin source-review queue for the X adapter (Stage 1). Lists PENDING x_sources
// accounts (surfaced by the dry runner from games-scoped search) and lets Justin
// APPROVE (-> trusted) or DECLINE (-> blocked). Blocked never resurfaces in search;
// trusted flows to the gates. Mirrors VantageDraftsPanel: read via the auth-gated
// /api/admin/x-sources GET, act via its narrow POST { id, state }.
//
// Tweet text is NOT stored in x_sources (copyright / no-reproduction posture), so each
// row links to the live x.com/<handle> account for vetting; the dry-run console printed
// the sample posts + metrics at discovery time. Usage:
//   <SourceReviewPanel password={adminPassword} />
'use client';

import { useState, useEffect } from 'react';

var mono = 'Share Tech Mono, monospace';
var heading = 'Orbitron, monospace';

function when(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch (e) { return ''; }
}

export default function SourceReviewPanel({ password }) {
  var [rows, setRows] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [nonce, setNonce] = useState(0);
  var [busy, setBusy] = useState(null);
  var [note, setNote] = useState(null);

  async function setState(row, state) {
    if (busy) return;
    var verb = state === 'trusted' ? 'Approve (trust)' : 'Decline (block)';
    if (typeof window !== 'undefined' && !window.confirm(verb + ' @' + row.account_handle + '?\n\n' + (state === 'blocked' ? 'Blocked accounts never resurface in search.' : 'Trusted accounts flow to the discourse gates.'))) return;
    setBusy(row.id); setNote(null);
    try {
      var res = await fetch('/api/admin/x-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ id: row.id, state: state }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Failed (' + res.status + ')'));
      setRows(function (list) { return list.filter(function (x) { return x.id !== row.id; }); });
      setNote((state === 'trusted' ? 'Trusted' : 'Blocked') + ': @' + row.account_handle);
    } catch (err) {
      setNote('Action failed: ' + err.message);
    } finally {
      setBusy(null);
    }
  }

  useEffect(function () {
    if (!password) return;
    var cancelled = false;
    setLoading(true);
    async function run() {
      try {
        var res = await fetch('/api/admin/x-sources?state=pending', { headers: { 'x-admin-password': password } });
        if (!res.ok) throw new Error('Failed to fetch (' + res.status + ')');
        var data = await res.json();
        if (!cancelled) { setRows(data.data || []); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return function () { cancelled = true; };
  }, [password, nonce]);

  var chip = { fontFamily: mono, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 2 };

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: heading, fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 3, marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        SOURCE REVIEW <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>&middot; X ACCOUNTS &middot; APPROVE / DECLINE</span>
        <button onClick={function () { setNonce(function (n) { return n + 1; }); }} style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>REFRESH</button>
      </div>
      <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, margin: '8px 0 14px', lineHeight: 1.5 }}>
        PENDING X accounts discovered by games-scoped search. APPROVE -&gt; trusted (posts flow to the discourse gates). DECLINE -&gt; blocked (never resurfaces in search). Open the account to vet its posts -- tweet text is not stored here.
      </div>
      {note && (
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1, margin: '0 0 12px', padding: '7px 10px', borderRadius: 4, color: note.indexOf('failed') !== -1 ? '#ff4444' : '#00ff88', background: note.indexOf('failed') !== -1 ? 'rgba(255,68,68,0.08)' : 'rgba(0,255,136,0.08)', border: '1px solid ' + (note.indexOf('failed') !== -1 ? 'rgba(255,68,68,0.3)' : 'rgba(0,255,136,0.3)') }}>{note}</div>
      )}

      {loading ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>LOADING SOURCES...</div>
      ) : error ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 11, color: '#ff4444', letterSpacing: 1 }}>ERROR: {error}</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>NO PENDING SOURCES</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 2 }}>{rows.length} PENDING</div>
          {rows.map(function (r) {
            return (
              <div key={r.id} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid #ff8800', borderRadius: 4, padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <a href={'https://x.com/' + r.account_handle} target="_blank" rel="noreferrer" style={{ fontFamily: heading, fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none' }}>@{r.account_handle}</a>
                  <span style={{ ...chip, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>{r.origin}</span>
                  {r.game_slug && <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>{r.game_slug}</span>}
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{when(r.created_at)}</span>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                  <a href={'https://x.com/' + r.account_handle} target="_blank" rel="noreferrer" style={{ fontFamily: mono, fontSize: 9, color: 'rgba(0,245,255,0.6)', textDecoration: 'none' }}>VIEW ACCOUNT</a>
                  <button onClick={function () { setState(r, 'blocked'); }} disabled={busy === r.id} style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#ff4444', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.4)', borderRadius: 3, padding: '3px 12px', cursor: busy === r.id ? 'default' : 'pointer', opacity: busy === r.id ? 0.6 : 1 }}>{busy === r.id ? '...' : 'DECLINE'}</button>
                  <button onClick={function () { setState(r, 'trusted'); }} disabled={busy === r.id} style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#00ff88', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.4)', borderRadius: 3, padding: '3px 12px', cursor: busy === r.id ? 'default' : 'pointer', opacity: busy === r.id ? 0.6 : 1 }}>{busy === r.id ? '...' : 'APPROVE'}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
