// components/dmz/DmzDisclaimer.js
// Small, always-visible legal notice for the /dmz subtree. Rendered by
// app/dmz/layout.js AFTER {children}, so it appears on every /dmz page (landing,
// sections, articles). DMZ is Call of Duty (Activision) -- the Bungie/Marathon
// notice in components/Footer.js does not apply here and does not render on /dmz.
//
// Server component (no client directive, no data). TOKEN DISCIPLINE: colors come
// ONLY from the .dmz-theme design tokens (the layout wraps this in .dmz-theme) --
// no hardcoded hex, no Marathon accent. Muted "legal furniture" register, parallel
// to the Bungie notice's small-caps monospace styling. Full-width; sits below page
// content (no sticky positioning -- bottom-of-content is fine on short pages).

export default function DmzDisclaimer() {
  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        background: 'var(--bg-nav)',
        padding: '20px 16px',
      }}
    >
      <p
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          fontFamily: 'monospace',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          lineHeight: 1.8,
          color: 'var(--text-tertiary)',
          textAlign: 'center',
        }}
      >
        CYBERNETIC PUNKS IS AN UNOFFICIAL FAN SITE - NOT AFFILIATED WITH OR ENDORSED BY ACTIVISION.<br />
        CALL OF DUTY AND MODERN WARFARE ARE TRADEMARKS OF ACTIVISION PUBLISHING, INC.
      </p>
    </div>
  );
}
