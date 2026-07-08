// components/SourceReviewPanel.js
// Admin source-review queue for the X adapter (Stage 1, revised). PENDING x_sources
// rows are COLLAPSED to ONE CARD PER ACCOUNT, even when an account is pending for BOTH
// games -- each game's triggering post shows as its own badged post-block inside the
// card. Cards sort by follower reach (reach orders what is seen; the gate decides what
// qualifies). Actions split by scope:
//   APPROVE -> account-wide 'trusted' (all the account's rows, every game).
//   BLOCK   -> account-wide 'blocked' (all the account's rows).
//   DECLINE -> PER-POST: passes THAT game's post only (remembered so it never
//              resurfaces); the account stays eligible and can reappear on a new take.
// Read via /api/admin/x-sources?state=pending (one row per (handle, game)); approve/
// block via POST /api/admin/x-sources { account_handle, state }; decline via
// POST /api/admin/x-sources/decline { id } (the specific pending row).
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

// Collapse flat per-(handle,game) rows into one entry per account_handle.
function groupByAccount(rows) {
  var acc = {};
  (rows || []).forEach(function (r) {
    var h = r.account_handle;
    if (!acc[h]) acc[h] = { handle: h, followers: r.sample_followers || 0, origin: r.origin, created_at: r.created_at, posts: [] };
    if ((r.sample_followers || 0) > (acc[h].followers || 0)) acc[h].followers = r.sample_followers || 0;
    acc[h].posts.push(r);
  });
  return Object.keys(acc).map(function (k) { return acc[k]; })
    .sort(function (a, b) { return (b.followers || 0) - (a.followers || 0); });
}

export default function SourceReviewPanel({ password }) {
  var [rows, setRows] = useState([]);        // flat per-(handle,game) pending rows
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [nonce, setNonce] = useState(0);
  var [busy, setBusy] = useState(null);      // busy key: account handle OR post row id
  var [note, setNote] = useState(null);

  // Account-wide APPROVE / BLOCK: one POST by handle -> drop ALL of the account's rows.
  async function accountAction(account, state) {
    if (busy) return;
    var verb = state === 'trusted' ? 'Approve @' + account.handle + ' as TRUSTED (all games)?' : 'BLOCK @' + account.handle + ' (all games)?';
    var detail = state === 'trusted' ? 'The account is trusted across every game; its posts flow to the gates.' : 'The account never surfaces again, for any game (revocable later).';
    if (typeof window !== 'undefined' && !window.confirm(verb + '\n\n' + detail)) return;
    setBusy(account.handle); setNote(null);
    try {
      var res = await fetch('/api/admin/x-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ account_handle: account.handle, state: state }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Failed (' + res.status + ')'));
      setRows(function (list) { return list.filter(function (x) { return x.account_handle !== account.handle; }); });
      setNote((state === 'trusted' ? 'Trusted' : 'Blocked') + ' (account-wide): @' + account.handle);
    } catch (err) {
      setNote('Action failed: ' + err.message);
    } finally {
      setBusy(null);
    }
  }

  // Per-POST DECLINE: passes THAT game's post; the account (other games) is untouched.
  async function declinePost(post) {
    if (busy) return;
    if (typeof window !== 'undefined' && !window.confirm('Decline this ' + (post.game_slug || '') + ' post?\n\nThis tweet will not resurface; @' + post.account_handle + ' stays eligible and can reappear on a different post.')) return;
    setBusy(post.id); setNote(null);
    try {
      var res = await fetch('/api/admin/x-sources/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ id: post.id }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Failed (' + res.status + ')'));
      setRows(function (list) { return list.filter(function (x) { return x.id !== post.id; }); });
      setNote('Declined this ' + (post.game_slug || '') + ' post: @' + post.account_handle + ' stays eligible');
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
  function btn(color) {
    return { fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: color, background: color === '#00ff88' ? 'rgba(0,255,136,0.08)' : color === '#ff4444' ? 'rgba(255,68,68,0.08)' : 'rgba(255,136,0,0.08)', border: '1px solid ' + color + '66', borderRadius: 3, padding: '3px 12px', cursor: 'pointer' };
  }

  var accounts = groupByAccount(rows);

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: heading, fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 3, marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        SOURCE REVIEW <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>&middot; X DISCOURSE &middot; APPROVE / DECLINE / BLOCK</span>
        <button onClick={function () { setNonce(function (n) { return n + 1; }); }} style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>REFRESH</button>
      </div>
      <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, margin: '8px 0 14px', lineHeight: 1.5 }}>
        One card per account (both games shown if the account surfaced in both), sorted by follower reach. APPROVE / BLOCK are account-wide (all games). DECLINE passes a single game&apos;s post -- the account stays eligible.
      </div>
      {note && (
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1, margin: '0 0 12px', padding: '7px 10px', borderRadius: 4, color: note.indexOf('failed') !== -1 ? '#ff4444' : '#00ff88', background: note.indexOf('failed') !== -1 ? 'rgba(255,68,68,0.08)' : 'rgba(0,255,136,0.08)', border: '1px solid ' + (note.indexOf('failed') !== -1 ? 'rgba(255,68,68,0.3)' : 'rgba(0,255,136,0.3)') }}>{note}</div>
      )}

      {loading ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>LOADING SOURCES...</div>
      ) : error ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 11, color: '#ff4444', letterSpacing: 1 }}>ERROR: {error}</div>
      ) : accounts.length === 0 ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>NO PENDING SOURCES</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 2 }}>{accounts.length} ACCOUNT{accounts.length === 1 ? '' : 'S'} &middot; {rows.length} POST{rows.length === 1 ? '' : 'S'}</div>
          {accounts.map(function (a) {
            var acctBusy = busy === a.handle;
            return (
              <div key={a.handle} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid #ff8800', borderRadius: 4, padding: '10px 12px' }}>
                {/* Account header + account-wide actions */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                  <a href={'https://x.com/' + a.handle} target="_blank" rel="noreferrer" style={{ fontFamily: heading, fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none' }}>@{a.handle}</a>
                  <span style={{ ...chip, color: '#00d4ff', border: '1px solid rgba(0,212,255,0.4)' }}>{fmtNum(a.followers)} followers</span>
                  <span style={{ ...chip, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>{a.origin}</span>
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{when(a.created_at)}</span>
                  <button onClick={function () { accountAction(a, 'blocked'); }} disabled={acctBusy} style={{ ...btn('#ff4444'), marginLeft: 'auto', opacity: acctBusy ? 0.6 : 1 }}>{acctBusy ? '...' : 'BLOCK'}</button>
                  <button onClick={function () { accountAction(a, 'trusted'); }} disabled={acctBusy} style={{ ...btn('#00ff88'), opacity: acctBusy ? 0.6 : 1 }}>{acctBusy ? '...' : 'APPROVE'}</button>
                </div>
                {/* One post-block per game the account is pending for */}
                {a.posts.map(function (p) {
                  var m = p.sample_metrics || {};
                  var postBusy = busy === p.id;
                  return (
                    <div key={p.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: '8px 10px', marginTop: 6 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ ...chip, color: '#ff8800', border: '1px solid rgba(255,136,0,0.5)' }}>{p.game_slug || 'game'}</span>
                        <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>replies {m.replies || 0} &middot; quotes {m.quotes || 0} &middot; likes {m.likes || 0}</span>
                        {p.sample_url && <a href={p.sample_url} target="_blank" rel="noreferrer" style={{ fontFamily: mono, fontSize: 9, color: 'rgba(0,245,255,0.6)', textDecoration: 'none' }}>VIEW POST</a>}
                        <button onClick={function () { declinePost(p); }} disabled={postBusy} style={{ ...btn('#ff8800'), marginLeft: 'auto', opacity: postBusy ? 0.6 : 1 }}>{postBusy ? '...' : 'DECLINE'}</button>
                      </div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.sample_text || '(no post text captured)'}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
