'use client';

// components/SignOutButton.js
// Reusable sign-out button. Renders as a real <form> POST to /api/auth/signout
// for CSRF resistance. Style matches existing site design system —
// monospace label, no glow, 2px border radius, subtle hover.
//
// Usage:
//   import SignOutButton from '@/components/SignOutButton';
//   <SignOutButton />               // default styling
//   <SignOutButton variant="text" /> // minimal text-only variant for nav
//
// Drop into Nav.js (when signed in), /me page header, or anywhere else.

export default function SignOutButton({ variant = 'default' }) {
  if (variant === 'text') {
    return (
      <form action="/api/auth/signout" method="POST" style={{ display: 'inline' }}>
        <button
          type="submit"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            margin: 0,
            color: 'rgba(255,255,255,0.45)',
            fontSize: 11,
            letterSpacing: 2,
            fontFamily: 'monospace',
            fontWeight: 700,
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#ff4555'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          Sign Out
        </button>
      </form>
    );
  }

  return (
    <form action="/api/auth/signout" method="POST" style={{ display: 'inline-block' }}>
      <button
        type="submit"
        style={{
          background: '#1a1d24',
          border: '1px solid #22252e',
          borderLeft: '3px solid #ff2d55',
          borderRadius: '0 2px 2px 0',
          padding: '8px 14px',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 11,
          letterSpacing: 2,
          fontFamily: 'monospace',
          fontWeight: 700,
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'background 0.15s, color 0.15s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1e2228';
          e.currentTarget.style.color = '#ff4555';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#1a1d24';
          e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
        }}
      >
        Sign Out
      </button>
    </form>
  );
}