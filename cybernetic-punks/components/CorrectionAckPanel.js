// components/CorrectionAckPanel.js
// Admin-only review box for the approve route's CORRECTION GUARD (409 gate:'correction-warning').
// Shown inside VantageDraftsPanel under the draft whose approve was refused. It lays out each matched
// correction record (id, date, the correction text, its source, the matched entity + keywords, and the
// sentence hits) so the operator can judge assert-vs-mention, then offers Cancel or an explicit
// "approve anyway" that stays DISABLED until the unchecked-by-default checkbox is ticked.
// Pure presentational: no state, no fetch -- the panel owns state and the resend
// ({ id, overrideHolds, acknowledgeCorrections: true }). Never rendered on a public page.

var mono = 'Share Tech Mono, monospace';
var heading = 'Orbitron, monospace';
var AMBER = '#ffb000';

export var ACK_CHECKBOX_LABEL = 'I have checked the draft does not assert the corrected claim';
export var ACK_BUTTON_LABEL = 'I reviewed this - approve anyway';
export var NO_SENTENCE_HIT = 'No sentence contains both the entity and a keyword (document-level co-occurrence only).';

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', margin: '3px 0' }}>
      <span style={{ fontFamily: mono, fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', minWidth: 74, flexShrink: 0 }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

export default function CorrectionAckPanel({ headline, corrections, checked, busy, onToggleChecked, onCancel, onConfirm }) {
  var list = Array.isArray(corrections) ? corrections : [];
  var canConfirm = !!checked && !busy;
  return (
    <div data-testid="correction-ack" style={{ margin: '12px 0 0', padding: '12px 14px', background: 'rgba(255,176,0,0.05)', border: '1px solid rgba(255,176,0,0.4)', borderRadius: 4 }}>
      <div style={{ fontFamily: heading, fontSize: 11, fontWeight: 800, color: AMBER, letterSpacing: 2, marginBottom: 4 }}>CORRECTION WARNING &middot; NOT PUBLISHED</div>
      <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, lineHeight: 1.5, marginBottom: 10 }}>
        &quot;{headline}&quot; co-occurs {list.length === 1 ? 'a recorded correction' : list.length + ' recorded corrections'}. The guard is high-recall: a match is a candidate, not a verdict. Check whether the draft ASSERTS the corrected-away claim or only mentions the topic.
      </div>
      {list.map(function (c) {
        var hits = Array.isArray(c.sentenceHits) ? c.sentenceHits : (c.snippet ? [c.snippet] : []);
        return (
          <div key={c.id} style={{ padding: '8px 10px', margin: '0 0 8px', background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
            <Field label="ID">{c.id}</Field>
            <Field label="DATE">{c.date || '--'}</Field>
            <Field label="CORRECTION">{c.correction}</Field>
            <Field label="SOURCE">{c.source || '--'}</Field>
            <Field label="ENTITY">{c.entity || '--'}</Field>
            <Field label="KEYWORDS">{(c.keywordsFound || []).join(', ') || '--'}</Field>
            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', margin: '6px 0 3px' }}>SENTENCE HITS ({hits.length})</div>
            {hits.length === 0 ? (
              <div style={{ fontFamily: mono, fontSize: 11, color: AMBER, lineHeight: 1.5 }}>{NO_SENTENCE_HIT}</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {hits.map(function (s, i) {
                  return <li key={i} style={{ fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{s}</li>;
                })}
              </ul>
            )}
          </div>
        );
      })}
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.8)', margin: '6px 0 10px', cursor: busy ? 'default' : 'pointer' }}>
        <input type="checkbox" checked={!!checked} disabled={!!busy} onChange={function (e) { if (onToggleChecked) onToggleChecked(e.target.checked); }} />
        {ACK_CHECKBOX_LABEL}
      </label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={onCancel} disabled={!!busy} style={{ fontFamily: mono, fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,0.6)', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 3, padding: '5px 14px', cursor: busy ? 'default' : 'pointer' }}>CANCEL</button>
        <button type="button" onClick={onConfirm} disabled={!canConfirm} style={{ fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: AMBER, background: 'rgba(255,176,0,0.1)', border: '1px solid rgba(255,176,0,0.5)', borderRadius: 3, padding: '5px 14px', cursor: canConfirm ? 'pointer' : 'default', opacity: canConfirm ? 1 : 0.45 }}>{busy ? 'PUBLISHING...' : ACK_BUTTON_LABEL}</button>
      </div>
    </div>
  );
}
