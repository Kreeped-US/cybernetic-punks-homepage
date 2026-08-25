// components/wardogs/WardogsDisclaimer.js
// Always-visible fan-site legal notice for the /wardogs subtree. Rendered by
// app/wardogs/layout.js after {children}, so it appears on every /wardogs page.
// Wardogs is a BULKHEAD / Team17 title -- the Bungie/Marathon footer notice and the
// DMZ/Activision notice do not apply here and do not render on /wardogs.
//
// Server component (no client directive, no data). TOKEN DISCIPLINE: colors come
// ONLY from the .wardogs-theme design tokens (the layout wraps this in .wardogs-theme).
// Same muted "legal furniture" register as the DMZ notice.

export default function WardogsDisclaimer() {
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
        CYBERNETIC PUNKS IS AN UNOFFICIAL FAN SITE - NOT AFFILIATED WITH OR ENDORSED BY BULKHEAD OR TEAM17.<br />
        WARDOGS IS A TRADEMARK OF ITS RESPECTIVE OWNER.
      </p>
    </div>
  );
}
