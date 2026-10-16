// components/UnsavedEditsPrompt.js
// Admin-only, in-panel confirmation shown when the operator opens EDIT on another draft while the
// open editor has UNSAVED changes (Brief 85). Three explicit outcomes -- never a silent discard:
//   Save and switch     -> persist the open edit, then open the other draft (only if the save works)
//   Discard and switch  -> drop the unsaved buffer, then open the other draft
//   Stay                -> keep editing the current draft
// Pure presentational: the panel owns the state and the save. Mirrors CorrectionAckPanel's style.

var mono = 'Share Tech Mono, monospace';
var heading = 'Orbitron, monospace';
var AMBER = '#ffb000';

export var SAVE_SWITCH_LABEL = 'SAVE AND SWITCH';
export var DISCARD_SWITCH_LABEL = 'DISCARD AND SWITCH';
export var STAY_LABEL = 'STAY';

function btn(color, border, bg, enabled) {
  return { fontFamily: mono, fontSize: 10, fontWeight: 700, letterSpacing: 1, color: color, background: bg, border: '1px solid ' + border, borderRadius: 3, padding: '5px 14px', cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 1 : 0.5 };
}

export default function UnsavedEditsPrompt({ fromHeadline, toHeadline, saving, onSaveSwitch, onDiscardSwitch, onStay }) {
  var idle = !saving;
  return (
    <div data-testid="unsaved-switch" style={{ margin: '12px 0 0', padding: '12px 14px', background: 'rgba(255,176,0,0.05)', border: '1px solid rgba(255,176,0,0.4)', borderRadius: 4 }}>
      <div style={{ fontFamily: heading, fontSize: 11, fontWeight: 800, color: AMBER, letterSpacing: 2, marginBottom: 4 }}>UNSAVED EDITS</div>
      <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, lineHeight: 1.5, marginBottom: 10 }}>
        &quot;{fromHeadline}&quot; has edits that are not saved. APPROVE publishes the saved version, so unsaved text is never published. Save or discard them before editing &quot;{toHeadline}&quot;.
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={onSaveSwitch} disabled={!idle} style={btn('#00ff88', 'rgba(0,255,136,0.5)', 'rgba(0,255,136,0.1)', idle)}>{saving ? 'SAVING...' : SAVE_SWITCH_LABEL}</button>
        <button type="button" onClick={onDiscardSwitch} disabled={!idle} style={btn('#ff4444', 'rgba(255,68,68,0.5)', 'rgba(255,68,68,0.08)', idle)}>{DISCARD_SWITCH_LABEL}</button>
        <button type="button" onClick={onStay} disabled={!idle} style={btn('rgba(255,255,255,0.6)', 'rgba(255,255,255,0.2)', 'transparent', idle)}>{STAY_LABEL}</button>
      </div>
    </div>
  );
}
