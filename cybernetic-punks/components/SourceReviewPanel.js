// components/SourceReviewPanel.js
// Admin source-review queue for the X adapter (Stage 1, revised). Lists PENDING
// x_sources accounts surfaced by search, each shown WITH the specific TRIGGERING POST
// (text + post URL + author + follower count + metrics) so Justin vets WHAT was said,
// not a blind account link. Sorted by follower count (higher-reach takes first -- reach
// prioritizes what is seen, it never gates). THREE actions:
//   APPROVE -> account state='trusted' (future posts flow automatically).
//   DECLINE -> pass THIS post only (remembered so it never resurfaces); account stays
//              eligible and can resurface on a DIFFERENT post. Forgiving, not a block.
//   BLOCK   -> account state='blocked', never surfaces again (revocable later).
// Read via /api/admin/x-sources?state=pending; act via the narrow POST routes.
'use client';

import { useState, useEffect } from 'react';

var mono = 'Share Tech Mono, monospace';
var heading = 'Orbitron, monospace';

function when(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch (e) { return ''; }
}

function fmtNum(n) {
  if (n == null) return '--';
  if (n < 1000) return String(n);
  if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K';
  return (n / 1000000).toFixed(1) + 'M';
}

export default function SourceReviewPanel({ password }) {
  var [rows, setRows] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [nonce, setNonce] = useState(0);
  var [busy, setBusy] = useState(null);
  var [note, setNote] = useState(null);

  // Shared POST helper for the three actions. `path` is the endpoint, `payload` the body.
  async function act(row, path, payload, okMsg) {
    if (busy) return;
    setBusy(row.id); setNote(null);
    try {
      var res = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Failed (' + res.status + ')'));
      setRows(function (list) { return list.filter(function (x) { return x.id !== row.id; }); });
      setNote(okMsg);
    } catch (err) {
      setNote('Action failed: ' + err.message);
    } finally {
      setBusy(null);
    }
  }

  function approve(row) {
    if (typeof window !== 'undefined' && !window.confirm('Approve @' + row.account_handle + ' as TRUSTED?\n\nFuture posts flow to the discourse gates automatically.')) return;
    act(row, '/api/admin/x-sources', { id: row.id, state: 'trusted' }, 'Trusted: @' + row.account_handle);
  }
  function block(row) {
    if (typeof window !== 'undefined' && !window.confirm('BLOCK @' + row.account_handle + '?\n\nThe account never surfaces again (revocable later).')) return;
    act(row, '/api/admin/x-sources', { id: row.id, state: 'blocked' }, 'Blocked: @' + row.account_handle);
  }
  function decline(row) {
    if (typeof window !== 'undefined' && !window.confirm('Decline THIS post?\n\nThis tweet will not resurface, but @' + row.account_handle + ' stays eligible and can reappear on a different post.')) return;
    act(row, '/api/admin/x-sources/decline', { id: row.id }, 'Declined this post: @' + row.account_handle + ' stays eligible');
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
  function btn(color) {
    return { fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: color, background: color === '#00ff88' ? 'rgba(0,255,136,0.08)' : color === '#ff4444' ? 'rgba(255,68,68,0.08)' : 'rgba(255,136,0,0.08)', border: '1px solid ' + color + '66', borderRadius: 3, padding: '3px 12px', cursor: 'pointer' };
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: heading, fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 3, marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        SOURCE REVIEW <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>&middot; X DISCOURSE &middot; APPROVE / DECLINE / BLOCK</span>
        <button onClick={function () { setNonce(function (n) { return n + 1; }); }} style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>REFRESH</button>
      </div>
      <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, margin: '8px 0 14px', lineHeight: 1.5 }}>
        Pending X takes discovered by search, sorted by follower reach (reach only orders what you see -- the gate decides what qualifies). APPROVE -&gt; trust the account. DECLINE -&gt; pass this post only (account stays eligible). BLOCK -&gt; banish the account.
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
            var m = r.sample_metrics || {};
            return (
              <div key={r.id} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid #ff8800', borderRadius: 4, padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <a href={'https://x.com/' + r.account_handle} target="_blank" rel="noreferrer" style={{ fontFamily: heading, fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none' }}>@{r.account_handle}</a>
                  <span style={{ ...chip, color: '#00d4ff', border: '1px solid rgba(0,212,255,0.4)' }}>{fmtNum(r.sample_followers)} followers</span>
                  <span style={{ ...chip, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>{r.origin}</span>
                  {r.game_slug && <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>{r.game_slug}</span>}
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{when(r.created_at)}</span>
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, margin: '8px 0', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.sample_text || '(no post text captured)'}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>replies {m.replies || 0} &middot; quotes {m.quotes || 0} &middot; likes {m.likes || 0}</span>
                  {r.sample_url && <a href={r.sample_url} target="_blank" rel="noreferrer" style={{ fontFamily: mono, fontSize: 9, color: 'rgba(0,245,255,0.6)', textDecoration: 'none' }}>VIEW POST</a>}
                  <button onClick={function () { block(r); }} disabled={busy === r.id} style={{ ...btn('#ff4444'), marginLeft: 'auto', opacity: busy === r.id ? 0.6 : 1 }}>{busy === r.id ? '...' : 'BLOCK'}</button>
                  <button onClick={function () { decline(r); }} disabled={busy === r.id} style={{ ...btn('#ff8800'), opacity: busy === r.id ? 0.6 : 1 }}>{busy === r.id ? '...' : 'DECLINE'}</button>
                  <button onClick={function () { approve(r); }} disabled={busy === r.id} style={{ ...btn('#00ff88'), opacity: busy === r.id ? 0.6 : 1 }}>{busy === r.id ? '...' : 'APPROVE'}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
