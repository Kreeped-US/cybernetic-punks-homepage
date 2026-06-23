// components/Sep.js
// Visually-hidden text separator. Shared site-wide.
//
// WHY: cards lay their parts out as adjacent flex/grid spans (icon / name / type
// / rarity) with only CSS gap between them, so when the DOM is flattened to plain
// text (search crawlers, copy-paste, screen readers) the parts glue together
// ("V22 Volt ThrowerSMG", "M77 Assault RifleAR"). A zero-footprint Sep sits
// BETWEEN the parts so the flattened text reads "Name - Type - Rarity".
// Absolutely-positioned + clipped, so it takes no layout space and is never
// painted -- visual output is unchanged; only the flattened/accessible text gains
// the separator.
//
// Pure presentational (no client hooks), so it is safe to import into both server
// and client components. Extracted from app/intel/[slug]/page.js so every card
// across the site can reuse the one canonical separator.

export const SR_ONLY = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export function Sep({ text }) {
  return <span style={SR_ONLY}>{text}</span>;
}
