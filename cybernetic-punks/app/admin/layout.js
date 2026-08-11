'use client';
// app/admin/layout.js
// SHARED ADMIN SHELL. Wraps every app/admin/** page with: the auth provider (one
// instance, sessionStorage-backed -- see adminShell.js), the login gate, and a slim top
// nav linking every admin surface. Presentational + auth only; it never replaces a
// page's own body, so no existing admin page is broken by it.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AdminAuthProvider, AdminGate, useAdminAuth, S, FONTS, ADMIN_NAV } from './adminShell';

function TopNav() {
  const auth = useAdminAuth();
  const pathname = usePathname();
  // No nav on the login screen -- the gate owns the whole viewport until authed.
  if (!auth || !auth.authed) return null;

  function isActive(href) {
    const base = href.split('?')[0];
    if (base === '/admin') return pathname === '/admin';
    return pathname === base || pathname.startsWith(base + '/');
  }

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 200, display: 'flex', alignItems: 'center', gap: 4, padding: '0 20px', height: 49, background: 'rgba(3,3,3,0.94)', borderBottom: '1px solid ' + S.border, backdropFilter: 'blur(6px)', overflowX: 'auto', whiteSpace: 'nowrap' }}>
      <Link href="/admin" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', marginRight: 12, flexShrink: 0 }}>
        <span style={{ color: S.accent, fontSize: 14 }}>◆</span>
        <span style={{ fontFamily: FONTS.display, fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: 2 }}>BRIDGE</span>
      </Link>
      {ADMIN_NAV.filter((n) => n.key !== 'bridge').map((n) => {
        const active = isActive(n.href);
        return (
          <Link key={n.key} href={n.href} style={{ textDecoration: 'none', padding: '7px 12px', borderRadius: 4, fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 1, color: active ? '#000' : S.muted, background: active ? n.color : 'transparent', flexShrink: 0 }}>
            {n.label}
          </Link>
        );
      })}
      <div style={{ flex: 1 }} />
      <button
        onClick={() => auth.logout()}
        style={{ background: 'transparent', border: '1px solid ' + S.border, borderRadius: 4, color: S.muted, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, padding: '6px 10px', cursor: 'pointer', flexShrink: 0, marginRight: 8 }}
      >
        SIGN OUT
      </button>
      <Link href="/" style={{ fontFamily: FONTS.mono, fontSize: 10, color: S.muted, textDecoration: 'none', letterSpacing: 1, flexShrink: 0 }}>BACK TO SITE ↗</Link>
    </nav>
  );
}

export default function AdminLayout({ children }) {
  return (
    <AdminAuthProvider>
      <div style={{ minHeight: '100vh', background: S.bg, color: S.text, fontFamily: FONTS.body }}>
        <TopNav />
        <AdminGate>{children}</AdminGate>
      </div>
    </AdminAuthProvider>
  );
}
