// components/marathon/BuildLabelNote.js
// The Marathon build confidence label (Brief 282), shared by the stored build pages (BuildView.js) and the
// Advisor result (AdvisorClient.js, Brief 293) so the two can never word it differently. Pure display: no
// state, no fetch. The label itself ({ tier, verified, total, checkedOn }) comes from loadBuildLabel in
// lib/marathon/buildLabel.js; the tier label and colour come from the shared CONFIDENCE_TIERS
// (Verified / Reported / Unconfirmed). Only the date phrase differs by surface:
//   stored pages:   "when this page was built"
//   Advisor result: "when this build was generated"
// No label in -> nothing rendered (callers pass null when the label could not be computed). No checkedPhrase
// -> no date sentence at all (operator ruling, Brief 293), so one surface's wording can never appear on another.

import { CONFIDENCE_TIERS, TierIcon } from '@/components/network/confidenceTiers';

export default function BuildLabelNote({ label, checkedPhrase }) {
  if (!label) return null;
  const t = CONFIDENCE_TIERS.find((x) => x.key === label.tier) || CONFIDENCE_TIERS.find((x) => x.key === 'pending');
  return (
    <div role="note" style={{ background: '#16181e', border: '1px solid #22252e', borderLeft: '3px solid ' + t.color, borderRadius: 3, padding: '12px 16px', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 13 }}>
        <span style={{ color: t.color, display: 'inline-flex' }}><TierIcon tier={t.key} size={14} /></span>
        <span style={{ color: t.color, fontWeight: 700 }}>{t.label}</span>
        <span style={{ color: 'rgba(255,255,255,0.75)' }}>- {label.verified} of {label.total} parts verified</span>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginTop: 6 }}>
        The label shows the lowest confidence among the shell, weapons, mods, cores and implants in this build.
        {' '}The Cradle stat plan is not covered by this label.
        {label.checkedOn && checkedPhrase ? ' Checked against our data ' + checkedPhrase + ': ' + label.checkedOn + '.' : ''}
      </div>
    </div>
  );
}
