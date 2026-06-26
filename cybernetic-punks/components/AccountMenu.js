'use client';
// components/AccountMenu.js
// Self-contained account affordance for the nav headers. Fetches /api/account/me
// on mount (so pages stay static -- no server-layout session read), then renders
// one of three states: loading (neutral skeleton, no layout shift / no JOIN-FREE
// flash), logged out (green JOIN FREE pill -> /join), or logged in (avatar + name
// button with a click-toggle dropdown: Profile [if Marathon] + Sign out).
//
// Styling mirrors Nav.js: inline styles, token hex (#1a1d24 card, #22252e border,
// #00ff41 green, #5865f2 blurple), fontFamily inherit, hover via onMouseEnter/Leave.
// Client component, so onError on the avatar <img> is allowed (graceful fallback to
// initials). Sign out is a POST <form> to the (now dual-cookie) /api/auth/signout.
//
// PROPS: align ('right' default | 'left') -- which edge the dropdown aligns to.
// The menu sits at the right of both headers, so it defaults to right-aligned.
// Otherwise self-contained (fetches its own data).

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

var JOIN_PILL = {
  display: 'inline-block', padding: '7px 14px', background: '#00ff41', color: '#000',
  fontSize: 10, fontWeight: 800, letterSpacing: '1px', borderRadius: 2,
  textDecoration: 'none', fontFamily: 'inherit', transition: 'background 0.12s',
};

var TRIGGER = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 6px',
  background: 'transparent', border: '1px solid #22252e', borderRadius: 2,
  color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
  cursor: 'pointer', fontFamily: 'inherit', transition: 'border-color 0.12s',
};

var AVATAR_FALLBACK = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 22, height: 22, borderRadius: '50%', background: '#5865f2', color: '#fff',
  fontSize: 9, fontWeight: 800,
};

var DROPDOWN = {
  position: 'absolute', top: '100%', marginTop: 6, minWidth: 160, background: '#1a1d24',
  border: '1px solid #22252e', borderRadius: 3, zIndex: 200, overflow: 'hidden',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
};

var ITEM_LINK = {
  display: 'block', padding: '10px 16px', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px',
  color: 'rgba(255,255,255,0.7)', textDecoration: 'none', borderBottom: '1px solid #22252e',
  background: 'transparent', transition: 'background 0.1s', fontFamily: 'inherit',
};

var ITEM_BUTTON = {
  display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 11,
  fontWeight: 600, letterSpacing: '0.5px', color: 'rgba(255,255,255,0.7)', border: 'none',
  background: 'transparent', cursor: 'pointer', transition: 'background 0.1s', fontFamily: 'inherit',
};

// Mobile-variant rows -- mirror Nav.js's mobile leaf-row style (padding 14px 20px,
// borderBottom #1e2028, uppercase, left accent gutter) so they look native in the
// hamburger panel.
var M_IDENTITY = {
  display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px',
  borderBottom: '1px solid #1e2028',
};
var M_NAME = {
  fontSize: 12, fontWeight: 700, letterSpacing: '1px', color: 'rgba(255,255,255,0.85)',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
var M_AVATAR_IMG = { width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 };
var M_AVATAR_FALLBACK = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24,
  borderRadius: '50%', background: '#5865f2', color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0,
};
var M_ROW = {
  display: 'block', padding: '14px 20px', fontSize: 11, fontWeight: 600, letterSpacing: '2px',
  textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
  borderBottom: '1px solid #1e2028', borderLeft: '2px solid transparent', background: 'none',
  fontFamily: 'inherit',
};
var M_ROW_BUTTON = Object.assign({}, M_ROW, { width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer' });

function initialsOf(name) {
  var s = (name || '').trim();
  if (!s) return '?';
  var parts = s.split(/\s+/);
  var a = parts[0] ? parts[0][0] : '';
  var b = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return ((a + b) || s[0]).toUpperCase();
}

export default function AccountMenu({ align, variant, onResolved }) {
  var alignRight = align !== 'left';
  var [status, setStatus] = useState('loading'); // 'loading' | 'in' | 'out'
  var [data, setData] = useState(null);
  var [open, setOpen] = useState(false);
  var [avatarBroken, setAvatarBroken] = useState(false);
  var rootRef = useRef(null);

  // Fetch identity once on mount.
  useEffect(function() {
    var cancelled = false;
    fetch('/api/account/me', { cache: 'no-store' })
      .then(function(r) { return r.ok ? r.json() : { authenticated: false }; })
      .then(function(j) {
        if (cancelled) return;
        var authed = !!(j && j.authenticated);
        setData(j || null);
        setStatus(authed ? 'in' : 'out');
        if (onResolved) onResolved(authed);
      })
      .catch(function() {
        if (cancelled) return;
        setStatus('out');
        if (onResolved) onResolved(false);
      });
    return function() { cancelled = true; };
  }, []);

  // Close on outside click / Escape (only while open).
  useEffect(function() {
    if (!open) return undefined;
    function onDown(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return function() {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // MOBILE VARIANT: flat rows inside the already-open hamburger panel -- NO dropdown,
  // NO click-toggle. Renders the account section ONLY when logged in; loading /
  // logged out -> null (the panel's existing JOIN FREE pill is the logged-out
  // affordance, and onResolved tells Nav to hide it once logged in).
  if (variant === 'mobile') {
    if (status !== 'in' || !data) return null;
    var mName = data.displayName || data.handle || 'Account';
    var mShowAvatar = data.avatarUrl && !avatarBroken;
    return (
      <div>
        <div style={M_IDENTITY}>
          {mShowAvatar ? (
            <img
              src={data.avatarUrl}
              alt=""
              width={24}
              height={24}
              onError={function() { setAvatarBroken(true); }}
              style={M_AVATAR_IMG}
            />
          ) : (
            <span style={M_AVATAR_FALLBACK}>{initialsOf(mName)}</span>
          )}
          <span style={M_NAME}>{mName}</span>
        </div>
        {data.hasMarathonProfile && (
          <Link href="/me" style={M_ROW}>Profile</Link>
        )}
        <form method="POST" action="/api/auth/signout" style={{ margin: 0 }}>
          <button type="submit" style={M_ROW_BUTTON}>Sign out</button>
        </form>
      </div>
    );
  }

  // LOADING: neutral skeleton sized like the pill -- no layout shift, no flash.
  if (status === 'loading') {
    return <span aria-hidden="true" style={{ display: 'inline-block', width: 74, height: 28, borderRadius: 2, background: 'rgba(255,255,255,0.04)' }} />;
  }

  // LOGGED OUT: the real signup page (/join), not the community Discord invite.
  if (status === 'out') {
    return (
      <Link
        href="/join"
        style={JOIN_PILL}
        onMouseEnter={function(e) { e.currentTarget.style.background = '#33ff66'; }}
        onMouseLeave={function(e) { e.currentTarget.style.background = '#00ff41'; }}
      >
        JOIN FREE
      </Link>
    );
  }

  // LOGGED IN.
  var name = (data && (data.displayName || data.handle)) || 'Account';
  var showAvatar = data && data.avatarUrl && !avatarBroken;

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        type="button"
        onClick={function() { setOpen(function(o) { return !o; }); }}
        aria-haspopup="menu"
        aria-expanded={open}
        style={TRIGGER}
        onMouseEnter={function(e) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.28)'; }}
        onMouseLeave={function(e) { e.currentTarget.style.borderColor = '#22252e'; }}
      >
        {showAvatar ? (
          <img
            src={data.avatarUrl}
            alt=""
            width={22}
            height={22}
            onError={function() { setAvatarBroken(true); }}
            style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <span style={AVATAR_FALLBACK}>{initialsOf(name)}</span>
        )}
        <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ fontSize: 8, opacity: 0.5, display: 'inline-block', transition: 'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
      </button>

      {open && (
        <div role="menu" style={Object.assign({}, DROPDOWN, alignRight ? { right: 0 } : { left: 0 })}>
          {data && data.hasMarathonProfile && (
            <Link
              href="/me"
              role="menuitem"
              onClick={function() { setOpen(false); }}
              style={ITEM_LINK}
              onMouseEnter={function(e) { e.currentTarget.style.background = '#1e2228'; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
            >
              Profile
            </Link>
          )}
          <form method="POST" action="/api/auth/signout" style={{ margin: 0 }}>
            <button
              type="submit"
              role="menuitem"
              style={ITEM_BUTTON}
              onMouseEnter={function(e) { e.currentTarget.style.background = '#1e2228'; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
