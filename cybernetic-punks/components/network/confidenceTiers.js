// components/network/confidenceTiers.js
// SINGLE SOURCE for the provenance-confidence visual language: the ordered tier gradient + its
// per-tier icon. Used by BOTH the entity-page badge (components/marathon/ProvenanceBadge.js) and
// the /methodology legend, so the mark on a weapon page and the mark that explains it can never
// drift (same discipline as the shared correction-matcher).
//
// THE GRADIENT (most -> least confident) -- shape encodes confidence, color reinforces it:
//   verified   solid disc + check   green   -- confirmed in-game or in patch notes
//   partial    half-filled disc     amber   -- row confirmed, a field still pending
//   attributed hollow ring          bronze  -- reported (devlog/beta), not confirmed by us
//   pending    dash                 dim     -- structure known, numbers not published (honest-null)
//
// REAL-TIER MAPPING (not invented): lib/marathon/provenanceBadge.js emits only 'verified' and
// 'partial' (honest-null returns no badge), so Marathon entity pages show the top two marks. The
// lower two ('attributed', 'pending') are real NETWORK states (the bodycam/wardogs arsenal +
// values-pending banners), so the /methodology legend -- which explains the whole network's system
// -- documents all four. Every tier a page can actually show has a mark here.
//
// Icons take `color` from currentColor so a consumer sets it once on the wrapper (the badge already
// colors its text per tone; the legend sets it per row). Server-safe, no state.

export const CONFIDENCE_TIERS = [
  { key: 'verified',   label: 'Verified',              color: '#00ff88', desc: 'Confirmed in-game or in official patch notes.' },
  { key: 'partial',    label: 'Partially verified',    color: '#ffb400', desc: 'The row is confirmed, but one or more fields are still pending.' },
  { key: 'attributed', label: 'Attributed / beta-observed', color: '#c2933f', desc: 'Reported in a devlog or a beta build - usable, but not confirmed by us and subject to change at launch.' },
  { key: 'pending',    label: 'Pending',               color: '#9c908c', desc: 'Structure is known but the numbers are not published yet - shown blank, never guessed.' },
];

// tier -> icon. A 16x16 viewBox scaled to `size`; fill/stroke inherit currentColor. The check on the
// solid disc uses a dark punch-out so it reads on the bright fill in both themes.
export function TierIcon({ tier, size = 12, title }) {
  var s = size;
  var common = { width: s, height: s, viewBox: '0 0 16 16', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': title ? undefined : 'true', role: title ? 'img' : undefined };
  var t = title ? <title>{title}</title> : null;
  if (tier === 'verified') {
    return (
      <svg {...common}>{t}
        <circle cx="8" cy="8" r="7" fill="currentColor" />
        <path d="M4.6 8.3l2.2 2.2 4.6-5" stroke="#0d0a0b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }
  if (tier === 'partial') {
    return (
      <svg {...common}>{t}
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        {/* left half filled -> "half" */}
        <path d="M8 1.5 A6.5 6.5 0 0 0 8 14.5 Z" fill="currentColor" />
      </svg>
    );
  }
  if (tier === 'attributed') {
    return (
      <svg {...common}>{t}
        <circle cx="8" cy="8" r="6.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  if (tier === 'structure') {
    // STRUCTURE-CONFIRMED mark -- a DIFFERENT AXIS from the confidence gradient above. Used by the
    // pre-launch arsenal (GameArsenal) where a weapon's EXISTENCE/structure is sourced but its stat
    // VALUES are pending by design. A framed square (deliberately NOT a circle and NOT the green
    // "verified" check) so it never reads as "the data is verified". Inherits currentColor (the
    // arsenal keeps its own per-label color). NOT a member of CONFIDENCE_TIERS -- it is not a
    // confidence level, it is a provenance note on the structure axis.
    return (
      <svg {...common}>{t}
        <rect x="2.6" y="2.6" width="10.8" height="10.8" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x="5.6" y="5.6" width="4.8" height="4.8" rx="1" fill="currentColor" />
      </svg>
    );
  }
  // pending / honest-null -> a dash
  return (
    <svg {...common}>{t}
      <line x1="3.5" y1="8" x2="12.5" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
