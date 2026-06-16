// app/editors/NewsroomMasthead.js
// Newsroom masthead (editor rework Step 2, Bucket C). The staff-lineup framing
// from editorial-staff-model.md "LOCKED NEWSROOM BRANDING". Sourced from the
// canonical display map (lib/editors/roster.js) — accent dot + name/tag + lane
// per editor. Server component, presentational.

import { getAllEditors } from '@/lib/editors/roster';

const BORDER = '#22252e';

export default function NewsroomMasthead() {
  var editors = getAllEditors();
  return (
    <section style={{ padding: '56px 24px 8px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 4, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>
        The Newsroom
      </div>
      <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: 1, color: '#fff', margin: '10px 0 12px', lineHeight: 1.05 }}>
        Six analysts.<br />One network.
      </h1>
      <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', letterSpacing: 0.3 }}>
        &ldquo;We don&rsquo;t agree, and we don&rsquo;t guess.&rdquo;
      </div>

      {/* Lineup: accent dot + name/tag + lane */}
      <div style={{ marginTop: 26, display: 'flex', flexWrap: 'wrap', gap: '10px 22px', paddingTop: 18, borderTop: '1px solid ' + BORDER }}>
        {editors.map(function(e) {
          return (
            <div key={e.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: e.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
                {e.fullName}
                {e.tag && <span style={{ color: e.color, fontWeight: 700 }}>{' / ' + e.tag}</span>}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.32)', letterSpacing: 1, textTransform: 'uppercase' }}>
                {e.role}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
