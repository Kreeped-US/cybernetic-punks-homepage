// components/DirectivesGeneratePanel.js
// Compact "seed a draft" panel for /admin/review -- the DAILY generate action in the same
// place as draft review (no multi-page hunt). Lists PENDING VANTAGE discourse directives
// (the ones that produce a draft) and a GENERATE button per row that runs the SAME flow the
// CRUD directives tab used: POST /api/admin/drafts/generate { directiveId } -> the shared gen
// core -> an is_published=false DRAFT that appears in the Drafts panel above. Creating /
// managing directives (the full form) stays on /admin/content?tab=editor_directives -- linked
// below. Reuses existing APIs only (GET /api/admin?table=editor_directives + the generate route).
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

var mono = 'Share Tech Mono, monospace';
var heading = 'Orbitron, monospace';

function when(ts) {
  if (!ts) return '';
  try { return new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; }
}

export default function DirectivesGeneratePanel({ password }) {
  var [rows, setRows] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [nonce, setNonce] = useState(0);
  var [genId, setGenId] = useState(null);
  var [note, setNote] = useState(null);

  var load = useCallback(async function () {
    if (!password) return;
    setLoading(true);
    try {
      var res = await fetch('/api/admin?table=editor_directives', { headers: { 'x-admin-password': password } });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Failed (' + res.status + ')'));
      // Only PENDING discourse directives are generatable (the shared gen core requires
      // editor=VANTAGE, directive_type=discourse, status=pending).
      var pend = (data.data || []).filter(function (r) {
        return r.status === 'pending' && r.directive_type === 'discourse' && r.editor === 'VANTAGE';
      });
      setRows(pend); setError(null);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [password]);

  useEffect(function () { load(); }, [load, nonce]);

  async function generate(row) {
    if (genId) return;
    setGenId(row.id); setNote(null);
    try {
      var res = await fetch('/api/admin/drafts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ directiveId: row.id }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Failed (' + res.status + ')'));
      if (data.skipped) setNote('VANTAGE skipped (source insufficient): directive left pending.');
      else setNote((data.existed ? 'Draft already existed: ' : 'Draft generated: ') + (data.slug || '') + ' -- review it in DRAFTS above.');
      setNonce(function (n) { return n + 1; }); // refresh: a generated directive drops to consumed
    } catch (e) {
      setNote('Generate failed: ' + e.message);
    } finally {
      setGenId(null);
    }
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: heading, fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 3, marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
        DIRECTIVES <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>&middot; SEED A DRAFT &middot; GENERATE</span>
        <Link href="/admin/content?tab=editor_directives" style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, letterSpacing: 1, color: '#ff2d55', background: 'transparent', border: '1px solid rgba(255,45,85,0.35)', borderRadius: 4, padding: '4px 10px', textDecoration: 'none' }}>+ QUEUE / MANAGE DIRECTIVES</Link>
        <button onClick={function () { setNonce(function (n) { return n + 1; }); }} style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>REFRESH</button>
      </div>
      <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, margin: '8px 0 14px', lineHeight: 1.5 }}>
        Pending VANTAGE discourse directives. GENERATE runs the article from the vetted source into a DRAFT (is_published=false) that appears in DRAFTS above for review + approve. Nothing publishes here.
      </div>
      {note && (
        <div style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1, margin: '0 0 12px', padding: '7px 10px', borderRadius: 4, color: note.indexOf('failed') !== -1 ? '#ff4444' : '#00ff88', background: note.indexOf('failed') !== -1 ? 'rgba(255,68,68,0.08)' : 'rgba(0,255,136,0.08)', border: '1px solid ' + (note.indexOf('failed') !== -1 ? 'rgba(255,68,68,0.3)' : 'rgba(0,255,136,0.3)') }}>{note}</div>
      )}
      {loading ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>LOADING DIRECTIVES...</div>
      ) : error ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 11, color: '#ff4444', letterSpacing: 1 }}>ERROR: {error}</div>
      ) : rows.length === 0 ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>NO PENDING DISCOURSE DIRECTIVES -- queue one via the button above.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rows.map(function (r) {
            return (
              <div key={r.id} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid #c8d4e0', borderRadius: 4, padding: '10px 12px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: 1, color: '#c8d4e0', border: '1px solid #c8d4e055', borderRadius: 2, padding: '2px 6px' }}>{r.editor}</span>
                    <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: 1, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 2, padding: '2px 6px' }}>{r.directive_type}</span>
                    {r.creator_info && r.creator_info.name && <span style={{ fontFamily: mono, fontSize: 9, color: '#c8d4e0' }}>creator: {r.creator_info.name}</span>}
                    <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{when(r.created_at)}</span>
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{r.instruction || (r.source_text ? (String(r.source_text).slice(0, 120) + '...') : '(no instruction)')}</div>
                </div>
                <button onClick={function () { generate(r); }} disabled={genId === r.id} style={{ flexShrink: 0, fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#c8d4e0', background: 'rgba(200,212,224,0.08)', border: '1px solid #c8d4e055', borderRadius: 3, padding: '6px 14px', cursor: genId === r.id ? 'default' : 'pointer', opacity: genId === r.id ? 0.6 : 1 }}>{genId === r.id ? 'GENERATING...' : 'GENERATE'}</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
