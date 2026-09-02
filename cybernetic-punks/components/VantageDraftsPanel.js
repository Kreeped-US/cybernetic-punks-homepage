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
    // A11 gate (client-side, for UX) -- the approve route re-runs it authoritatively.
    // A hard-block never publishes (refuse here, do not hit the server). A review-hold is
    // overridable: the human confirms, and we send overrideHolds:true so the route publishes.
    var verdict = runA11Gate(d);
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
            // A11 verdict (row-only, same gate the approve route enforces): PASS / HARD-BLOCK
            // (stat-shaped sentence, never publishes) / REVIEW-HOLD (overridable). Surfaced so
            // the human sees WHY before approving. Only meaningful for VANTAGE discourse.
            var gate = isVantage ? runA11Gate(d) : null;
            var gateBadge = !gate ? null
              : gate.hardBlock ? { label: 'A11 BLOCK: ' + gate.hardBlockCheck, color: '#ff4444' }
              : gate.reviewHolds.length > 0 ? { label: 'A11 HOLD: ' + gate.reviewHolds.join(', '), color: '#ff8800' }
              : { label: 'A11 PASS', color: '#00ff88' };
            return (
              <div key={d.id} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid ' + accent, borderRadius: 4, padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ ...chip, color: accent, border: '1px solid ' + accent + '55' }}>{d.editor || '--'}</span>
                  {d.directive_type && <span style={{ ...chip, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>{d.directive_type}</span>}
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>{d.game_slug}</span>
                  <span style={{ ...chip, color: '#ff8800', border: '1px solid rgba(255,136,0,0.4)' }}>DRAFT</span>
                  {gateBadge && <span style={{ ...chip, color: gateBadge.color, border: '1px solid ' + gateBadge.color + '66' }}>{gateBadge.label}</span>}
                  {d.noindex && <span style={{ ...chip, color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>noindex</span>}
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>{when(d.created_at)}</span>
                </div>
                <div style={{ fontFamily: heading, fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.35, marginBottom: 4 }}>{d.headline}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  {d.creator_info && d.creator_info.name && <span style={{ fontFamily: mono, fontSize: 9, color: accent }}>creator: {d.creator_info.name}</span>}
                  {d.source_url && <a href={d.source_url} target="_blank" rel="noreferrer" style={{ fontFamily: mono, fontSize: 9, color: 'rgba(0,245,255,0.6)', textDecoration: 'none' }}>SOURCE URL</a>}
                  <button onClick={function () { setOpen(function (o) { var n = { ...o }; n[d.id] = !n[d.id]; return n; }); }} style={{ fontFamily: mono, fontSize: 9, letterSpacing: 1, color: accent, background: 'transparent', border: '1px solid ' + accent + '44', borderRadius: 3, padding: '2px 10px', cursor: 'pointer' }}>{isOpen ? 'HIDE BODY' : 'READ BODY'}</button>
                  <button onClick={function () { reject(d); }} disabled={busy === d.id} style={{ marginLeft: 'auto', fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#ff4444', background: 'rgba(255,68,68,0.08)', border: '1px solid rgba(255,68,68,0.4)', borderRadius: 3, padding: '3px 12px', cursor: busy === d.id ? 'default' : 'pointer', opacity: busy === d.id ? 0.6 : 1 }}>{busy === d.id ? '...' : 'REJECT'}</button>
                  <button onClick={function () { approve(d); }} disabled={busy === d.id} style={{ fontFamily: mono, fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#00ff88', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.4)', borderRadius: 3, padding: '3px 12px', cursor: busy === d.id ? 'default' : 'pointer', opacity: busy === d.id ? 0.6 : 1 }}>{busy === d.id ? 'PUBLISHING...' : 'APPROVE + PUBLISH'}</button>
                </div>
                {isOpen && <DraftPreview draft={d} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
