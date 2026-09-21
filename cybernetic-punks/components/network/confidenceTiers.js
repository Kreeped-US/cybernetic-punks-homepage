// components/network/confidenceTiers.js
// SINGLE SOURCE for the provenance-confidence visual language: the ordered tier gradient + its
// per-tier icon. Used by BOTH the entity-page badge (components/marathon/ProvenanceBadge.js) and
// the /methodology legend, so the mark on a weapon page and the mark that explains it can never
// drift (same discipline as the shared correction-matcher).
//
// THE GRADIENT (most -> least confident) -- shape encodes confidence, color reinforces it. The
// LABELS + COLORS are the locked Chain of Custody vocabulary (Brief 2b):
//   verified   solid disc + check   "Verified"     green  -- confirmed in-game or in patch notes
//   partial    half-filled disc     "Mixed"        blue   -- row confirmed, a field still pending
//   attributed hollow ring          "Reported"     amber  -- reported (devlog/beta/community), not confirmed by us
//   pending    dash                 "Unconfirmed"  slate  -- structure known, numbers not published (honest-null)
//
// REAL-TIER MAPPING (not invented): lib/marathon/provenanceBadge.js emits only 'verified' and
// 'partial' (honest-null returns no badge), so Marathon entity pages show the top two marks. The
// lower two ('attributed', 'pending') are real NETWORK states (the bodycam/wardogs arsenal +
// values-pending banners), so the /methodology legend -- which explains the whole network's system
// -- documents all four. Every tier a page can actually show has a mark here.
//
// Icons take `color` from currentColor so a consumer sets it once on the wrapper (the badge already
// colors its text per tone; the legend sets it per row). Server-safe, no state.

// CHAIN OF CUSTODY -- the LOCKED label vocabulary + semantic colors (Brief 2b, 2026-09-21).
// ONE vocabulary everywhere (article badge, entity/in-prose confidence marks, tooltips, /about,
// /methodology): verified->"Verified", partial->"Mixed", attributed->"Reported",
// pending->"Unconfirmed", analysis->"Our Read". Semantic color per tier:
//   Verified=green, Mixed=blue, Reported=amber, Unconfirmed=slate, Our Read=violet.
// Each carries a short plain-language `caption` (shown inline on the badge) AND a longer `desc`
// (tooltip / legend copy). Icon keys are UNCHANGED (TierIcon still switches on key), so the shapes
// are stable; only the label/color/caption vocabulary is locked here.
export const CONFIDENCE_TIERS = [
  { key: 'verified',   label: 'Verified',    color: '#00ff88', caption: 'primary-source confirmed', desc: 'Confirmed in-game or in official patch notes - a primary source.' },
  { key: 'partial',    label: 'Mixed',       color: '#4ea3ff', caption: 'some fields still pending', desc: 'The row is confirmed, but one or more fields are still pending.' },
  { key: 'attributed', label: 'Reported',    color: '#e0a13a', caption: 'community-reported', desc: 'Reported in a devlog, a beta build, or by the community - usable, but not confirmed by us and subject to change.' },
  { key: 'pending',    label: 'Unconfirmed', color: '#8b95a7', caption: 'not yet published', desc: 'Structure is known but the numbers are not published yet - shown blank, never guessed.' },
  // ANALYSIS is a DIFFERENT AXIS from the confidence gradient above (like 'structure'): it does not
  // rate how confirmed a FACT is -- it marks editorial JUDGMENT/opinion ("our read"), which is not a
  // fact claim at all. Distinct violet (not Reported's amber) so opinion never reads as sourced
  // data. Used by the article-level provenance badge + the OUR READ callout (lib/articleBody.js).
  { key: 'analysis',   label: 'Our Read',    color: '#a78bfa', caption: 'our reasoned call, not fact', desc: 'Editorial analysis and judgment - our read, not a confirmed fact.' },
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
  if (tier === 'analysis') {
    // EDITORIAL-JUDGMENT mark -- a diamond (deliberately NOT a circle like the confidence tiers
    // and NOT the green check) with a center dot: "a considered point / our read", clearly not a
    // verified fact. Inherits currentColor (the badge/callout sets the violet analysis tone).
    return (
      <svg {...common}>{t}
        <path d="M8 1.6 L14.4 8 L8 14.4 L1.6 8 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="8" cy="8" r="1.7" fill="currentColor" />
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
