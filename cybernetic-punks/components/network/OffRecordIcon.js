// components/network/OffRecordIcon.js
// The OFF THE RECORD glyph (Brief 2c) -- a speech-bubble-with-ellipsis, the personality/aside mark.
// DELIBERATELY NOT a TierIcon: OFF THE RECORD is the FUN register (our take), NOT a provenance claim,
// so it must never reuse a confidence-tier shape. Server-safe, no state; inherits its color from the
// `color` prop (the callout passes its warm-amber accent). A 16x16 viewBox scaled to `size`.

export default function OffRecordIcon({ size = 12, color = 'currentColor', title }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16" fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? 'img' : undefined} aria-hidden={title ? undefined : 'true'}
    >
      {title ? <title>{title}</title> : null}
      {/* rounded speech bubble with a small tail */}
      <path d="M2.4 3.2h11.2v6.9H7.6l-2.8 2.5v-2.5H2.4z" fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
      {/* ellipsis -- "an aside / a take" */}
      <circle cx="5.6" cy="6.6" r="0.85" fill={color} />
      <circle cx="8" cy="6.6" r="0.85" fill={color} />
      <circle cx="10.4" cy="6.6" r="0.85" fill={color} />
    </svg>
  );
}
