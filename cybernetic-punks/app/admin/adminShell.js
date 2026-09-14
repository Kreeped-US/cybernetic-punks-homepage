'use client';
// app/admin/adminShell.js
// SHARED ADMIN SHELL primitives: theme tokens, the nav surface list, and the auth
// context. Imported by app/admin/layout.js (the shell), app/admin/page.js (the Bridge
// home), and app/admin/content/page.js (the CRUD editor). One place so the three admin
// surfaces stay visually + behaviourally identical.

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

// ── THEME ────────────────────────────────────────────────────────────────────
// Same tokens the CRUD page has always used (dark, Orbitron/Share-Tech-Mono/Rajdhani).
export const S = {
  bg: '#030303',
  surface: '#0a0a0a',
  border: 'rgba(255,255,255,0.07)',
  text: '#ffffff',
  muted: 'rgba(255,255,255,0.35)',
  accent: '#9b5de5',
  input: {
    background: '#111',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    padding: '10px 12px',
    borderRadius: 4,
    fontFamily: 'Share Tech Mono, monospace',
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
  },
};

export const FONTS = {
  display: 'Orbitron, monospace',
  mono: 'Share Tech Mono, monospace',
  body: 'Rajdhani, sans-serif',
};

// ── NAV SURFACE LIST ───────────────────────────────────────────────────────────
// The single source of truth for BOTH the shell top-nav AND the Bridge "GO TO"
// launcher grid. Reorg (2026-09-14): the old /admin/content mega-page was split into
// three PURPOSE-BUILT routes so every card deep-links to ONE real destination -- no more
// bare-/admin/content collisions where "Drafts", "GSC Review", etc. all dumped you at the
// top of a 1,243-line page to scroll-and-hunt.
//   /admin/review -- the DAILY loop: draft review + approve, source review, generate.
//   /admin/content -- reference-data CRUD (weapons/shells/mods/factions/world + directives
//                     + keywords), used rarely; Editorial QA folded in (collapsed).
//   /admin/seo    -- periodic SEO tools: GSC review + demand check (+ keywords link).
// Sub-tools (Directives, Keywords, Drafts, GSC, Demand, Stats) are now sections of these
// three pages, not separate cards -- fewer, clearer surfaces.
export const ADMIN_NAV = [
  { key: 'bridge',  label: 'Bridge',         href: '/admin',               desc: 'Steering overview -- attention + vitals', color: '#9b5de5' },
  { key: 'review',  label: 'Review',         href: '/admin/review',        desc: 'The daily loop -- review + approve drafts, source review, generate', color: '#00ff88' },
  { key: 'content', label: 'Content & Data', href: '/admin/content',       desc: 'Reference-data CRUD -- weapons, shells, mods, factions, world, directives, keywords', color: '#00f5ff' },
  { key: 'seo',     label: 'SEO Tools',      href: '/admin/seo',           desc: 'GSC review, demand check, keyword targets', color: '#ff8c00' },
  { key: 'emails',  label: 'Email Signups',  href: '/admin/email-signups', desc: 'Launch-email capture -- view + CSV export (read-only)', color: '#00ff88' },
];

// ── AUTH ─────────────────────────────────────────────────────────────────────
// Preserves the EXISTING mechanism exactly: a password sent as the x-admin-password
// header, validated server-side against ADMIN_PASSWORD (the real gate, with the per-IP
// lockout, lives in app/api/admin/route.js and every other admin route). The ONLY change
// vs the old per-page useState gate is PERSISTENCE + centralisation: one instance lives
// in the layout's provider and the validated password is cached in sessionStorage, so
// navigating between admin pages does not re-prompt (cleared on tab close). No cookie, no
// new server surface, no weakening. A wrong/edited cached value still 401s on use.
const SESSION_KEY = 'cp_admin_pw';
const AdminAuthContext = createContext(null);

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}

export function AdminAuthProvider({ children }) {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');

  const validate = useCallback(async (pw) => {
    try {
      const res = await fetch('/api/admin?table=ammo_stats', { headers: { 'x-admin-password': pw } });
      return res.ok;
    } catch (e) {
      return false;
    }
  }, []);

  // On mount: restore any cached password and RE-VALIDATE it (a wrong cached value must
  // never grant access). Cheap GET against a tiny table, same call the login uses. All
  // state is set inside the async callback (post-await), never synchronously in the body.
  useEffect(() => {
    let cancelled = false;
    let saved = '';
    try { saved = sessionStorage.getItem(SESSION_KEY) || ''; } catch (e) { saved = ''; }
    if (!saved) return undefined;
    validate(saved).then((ok) => {
      if (cancelled) return;
      if (ok) { setPassword(saved); setAuthed(true); }
      else { try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {} }
    });
    return () => { cancelled = true; };
  }, [validate]);

  const login = useCallback(async () => {
    setAuthError('');
    const ok = await validate(password);
    if (ok) {
      setAuthed(true);
      try { sessionStorage.setItem(SESSION_KEY, password); } catch (e) {}
    } else {
      setAuthError('Incorrect password.');
    }
  }, [password, validate]);

  const logout = useCallback(() => {
    setAuthed(false);
    setPassword('');
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }, []);

  const value = { password, setPassword, authed, authError, login, logout };
  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

// The shared login gate. Renders children only once authed; otherwise the AUTHENTICATE
// screen. Lives in the layout so every admin page inherits it identically.
export function AdminGate({ children }) {
  const auth = useAdminAuth();
  if (auth && auth.authed) return children;
  return (
    <div style={{ minHeight: '75vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 360, padding: 40, border: '1px solid rgba(155,93,229,0.3)', borderRadius: 8, background: S.surface }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 20, fontWeight: 900, color: S.accent, marginBottom: 8, letterSpacing: 2 }}>ADMIN ACCESS</div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: S.muted, letterSpacing: 2, marginBottom: 28 }}>CYBERNETICPUNKS DATA PANEL</div>
        <input
          type="password"
          placeholder="Enter admin password"
          value={auth ? auth.password : ''}
          onChange={(e) => auth && auth.setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && auth && auth.login()}
          style={{ ...S.input, marginBottom: 12 }}
        />
        {auth && auth.authError && <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: '#ff4444', marginBottom: 12 }}>{auth.authError}</div>}
        <button
          onClick={() => auth && auth.login()}
          style={{ width: '100%', padding: '10px', background: S.accent, border: 'none', borderRadius: 4, color: '#fff', fontFamily: FONTS.display, fontSize: 12, fontWeight: 700, letterSpacing: 2, cursor: 'pointer' }}
        >
          AUTHENTICATE
        </button>
      </div>
    </div>
  );
}
