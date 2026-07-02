// components/dmz/DmzNotifyBlock.js
// Dedicated launch-email capture section for the /dmz LANDING. A real content
// block (heading + one honest sentence + the form, source='landing'), placed
// after the coverage grid so it never shoves the intel down the page.
//
// Server component -- static markup wrapping the client DmzNotifyForm. TOKEN
// DISCIPLINE: .dmz-theme tokens only (var(--green) forest, var(--bg-card),
// var(--border), var(--text-*)); no hardcoded hex, no Marathon neon. Renders
// inside <main className={exo2.variable}>, so var(--font-exo2) is available.

import DmzNotifyForm from './DmzNotifyForm';

var EXO = 'var(--font-exo2), system-ui, sans-serif';

export default function DmzNotifyBlock() {
  return (
    <section
      aria-labelledby="dmz-notify-heading"
      style={{
        marginTop: 40,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--green)',
        borderRadius: 8,
        padding: '24px 24px 26px',
      }}
    >
      <h2
        id="dmz-notify-heading"
        style={{ fontFamily: EXO, fontSize: 20, fontWeight: 800, letterSpacing: 0.3, color: '#fff', margin: '0 0 8px' }}
      >
        Get notified when DMZ coverage goes live
      </h2>
      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 18px', maxWidth: 560 }}>
        One email when our DMZ meta, loadout tools, and region guides go live on October 23, 2026. Nothing else -- we will not share your address.
      </p>
      <div style={{ maxWidth: 460 }}>
        <DmzNotifyForm source="landing" layout="block" />
      </div>
    </section>
  );
}
