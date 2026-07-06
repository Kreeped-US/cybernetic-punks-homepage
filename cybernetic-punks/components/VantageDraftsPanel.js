// components/VantageDraftsPanel.js
// Internal admin panel: unpublished DRAFTS review (VANTAGE discourse Phase 1).
// Read-only -- lists feed_items where is_published=false via the auth-gated,
// GET-only /api/admin/drafts endpoint. There is NO approve/publish/edit/delete
// control here by design: publishing is Phase 2. Usage:
// <VantageDraftsPanel password={adminPassword} /> -- mirrors QualityAlertsPanel.
'use client';

import { useState, useEffect } from 'react';

var mono = 'Share Tech Mono, monospace';
var heading = 'Orbitron, monospace';

function when(ts) {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

export default function VantageDraftsPanel({ password }) {
  var [drafts, setDrafts] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [open, setOpen] = useState({}); // id -> body expanded
  var [nonce, setNonce] = useState(0);
  var [busy, setBusy] = useState(null);   // id currently being approved
  var [note, setNote] = useState(null);   // transient status line

  // Approve = publish this ONE draft via the narrow endpoint (is_published->true,
  // noindex->false). On success it drops off this list (no longer a draft).
  async function approve(d) {
    if (busy) return;
    if (typeof window !== 'undefined' && !window.confirm('Publish this discourse article live?\n\n"' + d.headline + '"\n\nIt becomes public and indexable at its ' + (d.game_slug === 'dmz' ? '/dmz/discourse/' : '/intel/') + d.slug + ' home.')) return;
    setBusy(d.id); setNote(null);
    try {
      var res = await fetch('/api/admin/drafts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ id: d.id }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Failed (' + res.status + ')'));
      setDrafts(function (list) { return list.filter(function (x) { return x.id !== d.id; }); });
      setNote('Published: ' + d.headline);
    } catch (err) {
      setNote('Approve failed: ' + err.message);
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
        var res = await fetch('/api/admin/drafts', { headers: { 'x-admin-password': password } });
        if (!res.ok) throw new Error('Failed to fetch (' + res.status + ')');
        var data = await res.json();
        if (!cancelled) { setDrafts(data.data || []); setError(null); }
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
        DRAFTS <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>&middot; INTERNAL &middot; REVIEW + APPROVE</span>
        <button onClick={function () { setNonce(function (n) { return n + 1; }); }} style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>REFRESH</button>
      </div>
      <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, margin: '8px 0 14px', lineHeight: 1.5 }}>
        Unpublished feed_items (is_published=false) -- includes VANTAGE discourse drafts awaiting review. Read the body and verify it is honest and drawn strictly from the source, THEN APPROVE to publish it live (is_published=true, indexable) at its subject-game home. Nothing else here can publish.
      </div>
      {note && (
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1, margin: '0 0 12px', padding: '7px 10px', borderRadius: 4, color: note.indexOf('failed') !== -1 ? '#ff4444' : '#00ff88', background: note.indexOf('failed') !== -1 ? 'rgba(255,68,68,0.08)' : 'rgba(0,255,136,0.08)', border: '1px solid ' + (note.indexOf('failed') !== -1 ? 'rgba(255,68,68,0.3)' : 'rgba(0,255,136,0.3)') }}>{note}</div>
      )}

      {loading ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>LOADING DRAFTS...</div>
      ) : error ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 11, color: '#ff4444', letterSpacing: 1 }}>ERROR: {error}</div>
      ) : drafts.length === 0 ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>NO UNPUBLISHED DRAFTS</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 2 }}>{drafts.length} DRAFT{drafts.length === 1 ? '' : 'S'}</div>
          {drafts.map(function (d) {
            var isOpen = !!open[d.id];
            var isVantage = d.editor === 'VANTAGE';
            var accent = isVantage ? '#c8d4e0' : 'rgba(255,255,255,0.35)';
            return (
              <div key={d.id} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid ' + accent, borderRadius: 4, padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ ...chip, color: accent, border: '1px solid ' + accent + '55' }}>{d.editor || '--'}</span>
                  {d.directive_type && <span style={{ ...chip, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>{d.directive_type}</span>}
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>{d.game_slug}</span>
                  <span style={{ ...chip, color: '#ff8800', border: '1px solid rgba(255,136,0,0.4)' }}>DRAFT</span>
                  {d.noindex && <span style={{ ...chip, color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>noindex</span>}
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{when(d.created_at)}</span>
                </div>
                <div style={{ fontFamily: heading, fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 4 }}>{d.headline}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {d.creator_info && d.creator_info.name && <span style={{ fontFamily: mono, fontSize: 9, color: accent }}>creator: {d.creator_info.name}</span>}
                  {d.source_url && <a href={d.source_url} target="_blank" rel="noreferrer" style={{ fontFamily: mono, fontSize: 9, color: 'rgba(0,245,255,0.6)', textDecoration: 'none' }}>SOURCE URL</a>}
                  <button onClick={function () { setOpen(function (o) { var n = { ...o }; n[d.id] = !n[d.id]; return n; }); }} style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1, color: accent, background: 'transparent', border: '1px solid ' + accent + '44', borderRadius: 3, padding: '2px 10px', cursor: 'pointer' }}>{isOpen ? 'HIDE BODY' : 'READ BODY'}</button>
                  <button onClick={function () { approve(d); }} disabled={busy === d.id} style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#00ff88', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.4)', borderRadius: 3, padding: '3px 12px', cursor: busy === d.id ? 'default' : 'pointer', opacity: busy === d.id ? 0.6 : 1 }}>{busy === d.id ? 'PUBLISHING...' : 'APPROVE + PUBLISH'}</button>
                </div>
                {isOpen && (
                  <pre style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13.5, color: 'rgba(255,255,255,0.72)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '12px 0 0', padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4 }}>{d.body}</pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
