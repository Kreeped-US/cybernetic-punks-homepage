// components/marathon/ProvenanceBadge.js
// Presentational provenance badge for Marathon's OWN entity pages (weapon/shell detail). Renders a
// CLEAN, already-derived badge ({ label, tier }) next to the stat block -- the visible "surface the
// moat" trust signal promised on /methodology.
//
// IMPORTANT: the badge is derived in the SERVER component (page.js) via lib/marathon/provenanceBadge
// and passed in pre-derived; the raw verified_source string is NOT passed to this client component.
// That keeps the internal string ("(Justin)", "docs/HANDOFF.md", correction-history) out of the
// serialized client-prop payload in the page HTML entirely -- not just out of the visible render.
//
// This is Marathon-scoped and is NOT the shared game template (components/game/GameArsenal.js) used
// by bodycam/wardogs -- editing here cannot affect those. Visual mirrors the site honesty pattern:
// the low-confidence "Partially verified" state uses GameArsenal's exact site-wide amber (#ffb400);
// full "Verified" uses the site's confirmed green. Styling matches Marathon's existing status pills
// (mono, 9px, uppercase) so it belongs on the page. Pure render, no state, no DB.

// The per-tier ICON comes from the SHARED confidence-tier source (components/network/confidenceTiers)
// -- the SAME mark the /methodology legend explains, so the badge and its explanation can't drift.
// It inherits the badge's text color (currentColor), so verified reads green and partial reads amber.
import { TierIcon } from '@/components/network/confidenceTiers';

var TONES = {
  verified: { fg: '#00ff88', bg: 'rgba(0,255,136,0.10)', bd: 'rgba(0,255,136,0.28)' },
  partial:  { fg: '#ffb400', bg: 'rgba(255,180,0,0.10)', bd: 'rgba(255,180,0,0.30)' }, // GameArsenal amber
};

export default function ProvenanceBadge({ badge }) {
  if (!badge || !badge.label) return null; // honest-null: nothing to show when the row isn't verified

  var tone = TONES[badge.tier] || TONES.verified;
  return (
    <span
      title={badge.label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2,
        textTransform: 'uppercase', color: tone.fg,
        background: tone.bg, border: '1px solid ' + tone.bd, borderRadius: 2,
        padding: '4px 10px', whiteSpace: 'nowrap',
      }}
    >
      <TierIcon tier={badge.tier} size={11} />
      {badge.label}
    </span>
  );
}
