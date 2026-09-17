// components/VantageDraftsPanel.js
// Internal admin panel: unpublished DRAFTS review (VANTAGE discourse Phase 1).
// Read-only -- lists feed_items where is_published=false via the auth-gated,
// GET-only /api/admin/drafts endpoint. There is NO approve/publish/edit/delete
// control here by design: publishing is Phase 2. Usage:
// <VantageDraftsPanel password={adminPassword} /> -- mirrors QualityAlertsPanel.
'use client';

import { useState, useEffect } from 'react';
import { parseBody } from '@/lib/articleBody';
import { resolveBuildToolCta } from '@/lib/buildToolCta';
import ToolCTAClient from '@/components/ToolCTAClient';
import { runA11Gate } from '@/lib/network/vantageGate';
import { isDiscourseArticle } from '@/lib/discourse';

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

// Paragraph with **inline bold** (mirrors the intel route's ParagraphContent; the item-
// mention cards are intel-only and out of scope for the read-before-approve preview).
function InlineText({ text }) {
  var parts = String(text || '').split(/(\*\*[^*]+\*\*)/);
  return (
    <>
      {parts.map(function (part, i) {
        var b = part.match(/^\*\*([^*]+)\*\*$/);
        if (b) return <strong key={i} style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>{b[1]}</strong>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// Formatted draft preview: the SAME parseBody the public article uses (headers/quotes/
// paragraphs) rendered admin-side, plus the exact contextual CTA the article will show.
// ADMIN-ONLY BY CONSTRUCTION: this renders a draft the panel already fetched via the
// auth-gated /api/admin/drafts; it does NOT touch the public route, whose is_published
// gate is unchanged -> held drafts can never render at their public URL.
function DraftPreview({ draft }) {
  var els = parseBody(draft.body);
  var cta = resolveBuildToolCta(draft);
  return (
    <div style={{ margin: '12px 0 0', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4 }}>
      {els.map(function (el) {
        if (el.type === 'header') {
          return (
            <div key={el.key} style={{ margin: '20px 0 10px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 14, background: '#00f5ff', borderRadius: 1, flexShrink: 0 }} />
              <div style={{ fontFamily: heading, fontSize: 11, fontWeight: 800, color: '#00f5ff', letterSpacing: 2, textTransform: 'uppercase' }}>{el.content}</div>
            </div>
          );
        }
        if (el.type === 'quote') {
          return (
            <blockquote key={el.key} style={{ margin: '16px 0', padding: '2px 0 2px 16px', borderLeft: '3px solid #00f5ff', fontFamily: heading, fontSize: 16, fontWeight: 700, lineHeight: 1.4, color: 'rgba(255,255,255,0.9)' }}>
              &ldquo;{el.content}&rdquo;
            </blockquote>
          );
        }
        return (
          <p key={el.key} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.78)', lineHeight: 1.65, margin: '0 0 1em', maxWidth: '72ch' }}>
            <InlineText text={el.content} />
          </p>
        );
      })}
      {cta.show && (
        <div>
          <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.28)', letterSpacing: 2, margin: '6px 0 2px' }}>CTA PREVIEW (renders on the live article):</div>
          <ToolCTAClient href={cta.href} copy={cta.copy} shell={cta.shell} game={cta.game} sourceSlug={draft.slug} accent={cta.accent} />
        </div>
      )}
    </div>
  );
}

// Honest per-draft GATE PROVENANCE strip. PURE-DERIVED from the row (no fetch; runA11Gate
// runs ONLY for storeless rows, exactly as the old badge did -- store-backed rows are n/a and
// never re-run a gate). It shows what a queued draft GENUINELY passed and is deliberately built
// so corroboration CANNOT render as a pass:
//  - GREEN checks are ONLY substance + dedup (enforcing gates the draft cleared BY EXISTING --
//    a failure returns success:false and no row is inserted) and, for MIRANDA, store-grounding.
//  - CORROBORATION is LOG-ONLY on Marathon (runs, logs to console, CANNOT hold; gate_status is
//    'clear' by mode and gate_findings is null). It is a SEPARATE amber segment worded
//    "measured (log-only)" -- structurally never in the green-check set, never the word "passed".
//  - A11 is scoped to storeless/VANTAGE: store-backed -> gray "n/a (store-backed)"; storeless ->
//    the enforced-on-approve verdict (reusing runA11Gate, as the prior badge did).
function GateStrip({ draft }) {
  var storeless = isDiscourseArticle(draft) || draft.editor === 'VANTAGE';
  var isMarathon = draft.game_slug === 'marathon';
  var GREEN = '#00ff88', AMBER = '#e0a030', GRAY = 'rgba(255,255,255,0.4)', RED = '#ff4444';

  // GREEN segments = enforcing, passed-by-construction (never corroboration).
  var segs = [
    { t: 'substance ✓', c: GREEN },
    { t: 'dedup ✓', c: GREEN },
  ];
  if (draft.editor === 'MIRANDA') segs.push({ t: 'store-grounded ✓', c: GREEN });
  // CORROBORATION -- log-only on Marathon. Amber, never green, never "passed".
  if (isMarathon) segs.push({ t: 'corroboration: measured (log-only)', c: AMBER });
  // A11 -- only run the gate for storeless rows (store-backed = n/a, no re-run).
  if (storeless) {
    var v = runA11Gate(draft);
    segs.push(
      v.hardBlock ? { t: 'A11: BLOCK ' + v.hardBlockCheck + ' (enforced on approve)', c: RED }
      : v.reviewHolds.length > 0 ? { t: 'A11: HOLD ' + v.reviewHolds.join(', ') + ' (enforced on approve)', c: AMBER }
      : { t: 'A11: PASS (enforced on approve)', c: GREEN }
    );
  } else {
    segs.push({ t: 'A11: n/a (store-backed)', c: GRAY });
  }

  return (
    <div style={{ margin: '6px 0 0' }}>
      <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: 1, lineHeight: 1.7 }}>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>GATES</span>
        {segs.map(function (s, i) {
          return (
            <span key={i}>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}> {'·'} </span>
              <span style={{ color: s.c }}>{s.t}</span>
            </span>
          );
        })}
      </div>
      {isMarathon && (
        <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: 0.5, color: 'rgba(255,255,255,0.3)', marginTop: 3, fontStyle: 'italic' }}>
          You are the corroboration checkpoint here - corroboration is measured, not enforced. Read the body.
        </div>
      )}
    </div>
  );
}

export default function VantageDraftsPanel({ password }) {
  var [drafts, setDrafts] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [open, setOpen] = useState({}); // id -> body expanded
  var [nonce, setNonce] = useState(0);
  var [busy, setBusy] = useState(null);   // id currently being approved
  var [note, setNote] = useState(null);   // transient status line
  var [editingId, setEditingId] = useState(null); // draft id in inline-edit mode
  var [editHeadline, setEditHeadline] = useState('');
  var [editBody, setEditBody] = useState('');
  var [editTags, setEditTags] = useState('');           // comma-separated string <-> text[]
  var [editSourceUrl, setEditSourceUrl] = useState(''); // raw URL (not prose)
  var [saving, setSaving] = useState(false);
  var [showDeclined, setShowDeclined] = useState(false); // declined-drafts view toggle
  var [declined, setDeclined] = useState([]);
  var [declinedLoading, setDeclinedLoading] = useState(false);
  var [declinedError, setDeclinedError] = useState(null);

  // Inline EDIT before approve. Opens the body (so the edit form shows) and prefills the
  // current headline/body. Editing does NOT publish -- approve is still separate.
  function startEdit(d) {
    setEditingId(d.id);
    setEditHeadline(d.headline || '');
    setEditBody(d.body || '');
    setEditTags(Array.isArray(d.tags) ? d.tags.join(', ') : ''); // text[] -> comma string
    setEditSourceUrl(d.source_url || '');
    setOpen(function (o) { var n = { ...o }; n[d.id] = true; return n; });
    setNote(null);
  }

  // Save the edit via the narrow /api/admin/drafts/edit endpoint (guarded is_published=false:
  // can only ever edit a DRAFT). On success, patch the draft in-place in the list.
  async function saveEdit(d) {
    if (saving) return;
    if (!editHeadline.trim() || !editBody.trim()) { setNote('Edit failed: headline and body are both required.'); return; }
    setSaving(true); setNote(null);
    try {
      // tags: comma string -> text[] (trim each, drop empties), matching the endpoint's format.
      // source_url: raw string; empty -> null (clears the source), else the endpoint URL-validates.
      var tagsArr = editTags.split(',').map(function (t) { return t.trim(); }).filter(Boolean);
      var srcUrl = editSourceUrl.trim() === '' ? null : editSourceUrl.trim();
      var res = await fetch('/api/admin/drafts/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ id: d.id, headline: editHeadline, body: editBody, tags: tagsArr, source_url: srcUrl }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Failed (' + res.status + ')'));
      setDrafts(function (list) {
        return list.map(function (x) {
          return x.id === d.id ? { ...x, headline: data.data.headline, body: data.data.body, tags: data.data.tags, source_url: data.data.source_url } : x;
        });
      });
      setEditingId(null);
      var extra = data.normalized ? ' (auto-normalized to house style)' : '';
      if (data.warnings && data.warnings.length) extra += ' [warn: ' + data.warnings.join('; ') + ']';
      setNote('Saved: ' + data.data.headline + extra + ' -- still a draft; APPROVE to publish.');
    } catch (err) {
      setNote('Edit failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  // Approve = publish this ONE draft via the narrow endpoint (is_published->true,
  // noindex->false). On success it drops off this list (no longer a draft).
  async function approve(d) {
    if (busy) return;
    // UNSAVED-EDIT GUARD: the edit buffer (editHeadline/editBody) is SEPARATE from d, and
    // approve publishes the SAVED row (server re-reads by id). If an edit form is open for
    // this row, approving would silently publish the PRE-EDIT content and drop the operator's
    // edit. Block it -- Save or Cancel first. (Not a gate change: gates still run on whatever
    // actually publishes; this only stops an open buffer from being silently discarded.)
    if (editingId === d.id) {
      if (typeof window !== 'undefined') window.alert('You have unsaved edits open for this draft.\n\nSAVE EDIT (to persist and re-gate against the edited text) or CANCEL first, then approve.');
      setNote('Approve blocked: unsaved edits open for "' + d.headline + '" -- Save or Cancel first.');
      return;
    }
    // A11 gate (client-side, for UX) -- the approve route re-runs it authoritatively.
    // SCOPED to storeless output to MATCH the server route exactly (approve/route.js:104:
    // storelessOutput = isDiscourseArticle(d) || editor === 'VANTAGE'). A11's stat checks
    // are VANTAGE storeless-honesty checks; store-backed editors (NEXUS/MIRANDA) are exempt
    // server-side, so the client must not block them BEFORE the request is sent. For
    // non-storeless drafts we skip the A11 pre-check entirely (empty verdict) and let the
    // request proceed to the correctly-scoped server route. A hard-block never publishes
    // (refuse here, do not hit the server). A review-hold is overridable: the human
    // confirms, and we send overrideHolds:true so the route publishes.
    var storelessOutput = isDiscourseArticle(d) || d.editor === 'VANTAGE';
    var verdict = storelessOutput ? runA11Gate(d) : { hardBlock: false, hardBlockCheck: null, reviewHolds: [] };
    if (verdict.hardBlock) {
      if (typeof window !== 'undefined') window.alert('A11 HARD BLOCK (' + verdict.hardBlockCheck + ').\n\nVANTAGE is storeless; a stat-shaped number in her voice is disqualifying. Remove the figure(s) and regenerate. This cannot be published.');
      setNote('Blocked (A11 hard-block: ' + verdict.hardBlockCheck + '): ' + d.headline);
      return;
    }
    var confirmMsg = 'Publish this discourse article live?\n\n"' + d.headline + '"\n\nIt becomes public and indexable at its ' + (d.game_slug === 'dmz' ? '/dmz/discourse/' : '/intel/') + d.slug + ' home.';
    if (verdict.reviewHolds.length > 0) {
      confirmMsg = 'A11 REVIEW HOLD (' + verdict.reviewHolds.join(', ') + ').\n\nReview the headline/body, then confirm to publish ANYWAY (override).\n\n' + confirmMsg;
    }
    if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) return;
    setBusy(d.id); setNote(null);
    try {
      var res = await fetch('/api/admin/drafts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ id: d.id, overrideHolds: verdict.reviewHolds.length > 0 }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Failed (' + res.status + ')'));
      setDrafts(function (list) { return list.filter(function (x) { return x.id !== d.id; }); });
      setNote('Published: ' + d.headline + (verdict.reviewHolds.length > 0 ? ' (A11 review-holds overridden)' : ''));
    } catch (err) {
      setNote('Approve failed: ' + err.message);
    } finally {
      setBusy(null);
    }
  }

  // Reject = record this ONE draft as rejected via the narrow endpoint (rejected=true,
  // is_published stays false). Never publishes, never touches a live row. On success it
  // drops off this list -- the queue then shows only drafts awaiting a real decision.
  async function reject(d) {
    if (busy) return;
    if (typeof window !== 'undefined' && !window.confirm('Reject this draft?\n\n"' + d.headline + '"\n\nRecorded as rejected and removed from the queue (not published, not deleted).')) return;
    setBusy(d.id); setNote(null);
    try {
      var res = await fetch('/api/admin/drafts/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ id: d.id }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Failed (' + res.status + ')'));
      setDrafts(function (list) { return list.filter(function (x) { return x.id !== d.id; }); });
      setNote('Rejected: ' + d.headline);
    } catch (err) {
      setNote('Reject failed: ' + err.message);
    } finally {
      setBusy(null);
    }
  }

  // Fetch the DECLINED view via the dedicated rejected-scoped fetch (?rejected=1), which is
  // NOT subject to the active list's limit-100 truncation -- so every declined draft is
  // restorable, however many there are.
  async function fetchDeclined() {
    if (!password) return;
    setDeclinedLoading(true); setDeclinedError(null);
    try {
      var res = await fetch('/api/admin/drafts?rejected=1', { headers: { 'x-admin-password': password } });
      if (!res.ok) throw new Error('Failed to fetch declined (' + res.status + ')');
      var data = await res.json();
      setDeclined((data.data || []).filter(function (x) { return x.rejected; }));
    } catch (err) {
      setDeclinedError(err.message);
    } finally {
      setDeclinedLoading(false);
    }
  }

  // Toggle the declined view. Turning it ON fetches the declined rows; OFF hides them.
  function toggleDeclined() {
    setShowDeclined(function (on) {
      var next = !on;
      if (next) fetchDeclined();
      return next;
    });
    setNote(null);
  }

  // Restore = clear rejected on a declined draft (rejected=false) via the narrow /restore
  // endpoint (guarded is_published=false: can only restore a DRAFT). On success drop it from
  // the declined list and refresh the active queue so the restored draft reappears there.
  async function restore(d) {
    if (busy) return;
    setBusy(d.id); setNote(null);
    try {
      var res = await fetch('/api/admin/drafts/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ id: d.id }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ('Failed (' + res.status + ')'));
      setDeclined(function (list) { return list.filter(function (x) { return x.id !== d.id; }); });
      setNonce(function (n) { return n + 1; }); // refresh the active queue -> restored draft reappears
      setNote('Restored: ' + d.headline + ' -- back in the review queue.');
    } catch (err) {
      setNote('Restore failed: ' + err.message);
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
        // Hide rejected drafts. Before the feed_items.rejected column exists it is
        // undefined -> shown (correct: nothing rejected yet); after, rejected rows drop.
        if (!cancelled) { setDrafts((data.data || []).filter(function (x) { return !x.rejected; })); setError(null); }
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
        <button onClick={toggleDeclined} style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, letterSpacing: 1, color: showDeclined ? '#ff8800' : 'rgba(255,255,255,0.4)', background: showDeclined ? 'rgba(255,136,0,0.08)' : 'transparent', border: '1px solid ' + (showDeclined ? 'rgba(255,136,0,0.4)' : 'rgba(255,255,255,0.12)'), borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>{showDeclined ? 'HIDE DECLINED' : 'SHOW DECLINED'}</button>
        <button onClick={function () { setNonce(function (n) { return n + 1; }); }} style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>REFRESH</button>
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
            // A11 provenance moved into the all-editor GateStrip below (rendered after the
            // headline). The strip reuses runA11Gate ONLY for storeless rows, as this badge did.
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
                <GateStrip draft={d} />
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {d.creator_info && d.creator_info.name && <span style={{ fontFamily: mono, fontSize: 9, color: accent }}>creator: {d.creator_info.name}</span>}
                  {d.source_url && <a href={d.source_url} target="_blank" rel="noreferrer" style={{ fontFamily: mono, fontSize: 9, color: 'rgba(0,245,255,0.6)', textDecoration: 'none' }}>SOURCE URL</a>}
                  <button onClick={function () { setOpen(function (o) { var n = { ...o }; n[d.id] = !n[d.id]; return n; }); }} style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1, color: accent, background: 'transparent', border: '1px solid ' + accent + '44', borderRadius: 3, padding: '2px 10px', cursor: 'pointer' }}>{isOpen ? 'HIDE BODY' : 'READ BODY'}</button>
                  <button onClick={function () { startEdit(d); }} disabled={busy === d.id} style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1, color: '#00f5ff', background: 'transparent', border: '1px solid rgba(0,245,255,0.4)', borderRadius: 3, padding: '2px 10px', cursor: 'pointer' }}>EDIT</button>
                  <button onClick={function () { reject(d); }} disabled={busy === d.id} style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#ff4444', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.4)', borderRadius: 3, padding: '3px 12px', cursor: busy === d.id ? 'default' : 'pointer', opacity: busy === d.id ? 0.6 : 1 }}>{busy === d.id ? '...' : 'REJECT'}</button>
                  <button onClick={function () { approve(d); }} disabled={busy === d.id || editingId === d.id} title={editingId === d.id ? 'Save or Cancel your edits first' : ''} style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#00ff88', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.4)', borderRadius: 3, padding: '3px 12px', cursor: (busy === d.id || editingId === d.id) ? 'default' : 'pointer', opacity: (busy === d.id || editingId === d.id) ? 0.6 : 1 }}>{busy === d.id ? 'PUBLISHING...' : (editingId === d.id ? 'SAVE/CANCEL FIRST' : 'APPROVE + PUBLISH')}</button>
                </div>
                {isOpen && (editingId === d.id ? (
                  <div style={{ margin: '12px 0 0', padding: '14px 16px', background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 4 }}>
                    <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>HEADLINE</div>
                    <input
                      value={editHeadline}
                      onChange={function (e) { setEditHeadline(e.target.value); }}
                      style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontFamily: heading, fontSize: 13, fontWeight: 700, padding: '8px 10px', borderRadius: 4, marginBottom: 12 }}
                    />
                    <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>BODY &middot; markdown: **bold**, &ldquo;quotes&rdquo;, blank line between paragraphs</div>
                    <textarea
                      value={editBody}
                      onChange={function (e) { setEditBody(e.target.value); }}
                      rows={18}
                      style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', fontFamily: mono, fontSize: 12, lineHeight: 1.6, padding: '10px 12px', borderRadius: 4, resize: 'vertical' }}
                    />
                    <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', margin: '12px 0 6px' }}>TAGS &middot; comma-separated (e.g. ranked, meta, pve)</div>
                    <input
                      value={editTags}
                      onChange={function (e) { setEditTags(e.target.value); }}
                      placeholder="ranked, meta, pve"
                      style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.85)', fontFamily: mono, fontSize: 12, padding: '8px 10px', borderRadius: 4, marginBottom: 12 }}
                    />
                    <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>SOURCE URL &middot; http(s):// (blank to clear)</div>
                    <input
                      value={editSourceUrl}
                      onChange={function (e) { setEditSourceUrl(e.target.value); }}
                      placeholder="https://..."
                      style={{ width: '100%', boxSizing: 'border-box', background: '#111', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(0,245,255,0.8)', fontFamily: mono, fontSize: 12, padding: '8px 10px', borderRadius: 4 }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <button onClick={function () { saveEdit(d); }} disabled={saving} style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#00ff88', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.5)', borderRadius: 3, padding: '6px 16px', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>{saving ? 'SAVING...' : 'SAVE EDIT'}</button>
                      <button onClick={function () { setEditingId(null); }} disabled={saving} style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,0.5)', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 3, padding: '6px 16px', cursor: saving ? 'default' : 'pointer' }}>CANCEL</button>
                      <span style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>Saving does NOT publish -- still needs APPROVE. Em-dashes / smart quotes auto-normalized to house style.</span>
                    </div>
                    {/* LIVE PREVIEW of the UNSAVED edit buffer: the SAME parseBody the public
                        article + the saved preview use, driven by editBody (re-renders on every
                        keystroke via editBody state). Catches blob / run-on-list / header issues
                        BEFORE saving. Purely a render of the buffer -- no writes, no gate change. */}
                    <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: 2, color: '#00f5ff', margin: '14px 0 0' }}>LIVE PREVIEW &middot; reflects UNSAVED edits (real article parser)</div>
                    <DraftPreview draft={{ ...d, headline: editHeadline, body: editBody }} />
                  </div>
                ) : (
                  <DraftPreview draft={d} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {showDeclined && (
        <div style={{ marginTop: 22, paddingTop: 14, borderTop: '1px solid rgba(255,136,0,0.2)' }}>
          <div style={{ fontFamily: heading, fontSize: 11, fontWeight: 700, color: '#ff8800', letterSpacing: 2, marginBottom: 8 }}>
            DECLINED <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>&middot; rejected=true &middot; RESTORE returns to the queue</span>
          </div>
          {declinedLoading ? (
            <div style={{ padding: 12, fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>LOADING DECLINED...</div>
          ) : declinedError ? (
            <div style={{ padding: 12, fontFamily: mono, fontSize: 10, color: '#ff4444', letterSpacing: 1 }}>ERROR: {declinedError}</div>
          ) : declined.length === 0 ? (
            <div style={{ padding: 12, fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>NO DECLINED DRAFTS</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 2 }}>{declined.length} DECLINED</div>
              {declined.map(function (d) {
                return (
                  <div key={d.id} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid rgba(255,136,0,0.5)', borderRadius: 4, padding: '10px 12px', opacity: 0.85 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ ...chip, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>{d.editor || '--'}</span>
                      <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>{d.game_slug}</span>
                      <span style={{ ...chip, color: '#ff8800', border: '1px solid rgba(255,136,0,0.4)' }}>DECLINED</span>
                      <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{when(d.created_at)}</span>
                    </div>
                    <div style={{ fontFamily: heading, fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, marginBottom: 6 }}>{d.headline}</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      {d.source_url && <a href={d.source_url} target="_blank" rel="noreferrer" style={{ fontFamily: mono, fontSize: 9, color: 'rgba(0,245,255,0.6)', textDecoration: 'none' }}>SOURCE URL</a>}
                      <button onClick={function () { restore(d); }} disabled={busy === d.id} style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#00ff88', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.4)', borderRadius: 3, padding: '3px 12px', cursor: busy === d.id ? 'default' : 'pointer', opacity: busy === d.id ? 0.6 : 1 }}>{busy === d.id ? '...' : 'RESTORE'}</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
