'use client';
// components/dmz/SaveBuildButton.js
// Save/unsave toggle for a canonical DMZ build, on /dmz/builds/[weapon]. CLIENT-ONLY state so the
// build page's SERVER render stays session-independent (SEO/cache-safe): the button fetches its OWN
// isSaved on mount (GET /api/dmz/saved-builds?weapon=<slug>). A 401 -> logged out -> a "Sign in to
// save" link to /join. Logged in -> a save/saved toggle (POST/DELETE the same endpoint).
//
// The account is derived server-side from the session (never sent from here), so this component only
// carries the weapon_slug. Optimistic toggle with revert-on-failure.

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SaveBuildButton({ weaponSlug }) {
  // 'loading' | 'out' (logged out) | 'in' (logged in; `saved` holds the state)
  var [status, setStatus] = useState('loading');
  var [saved, setSaved] = useState(false);
  var [busy, setBusy] = useState(false);

  useEffect(function () {
    var cancelled = false;
    fetch('/api/dmz/saved-builds?weapon=' + encodeURIComponent(weaponSlug), { cache: 'no-store' })
      .then(function (r) {
        if (r.status === 401) { if (!cancelled) setStatus('out'); return null; }
        return r.ok ? r.json() : null;
      })
      .then(function (j) {
        if (cancelled || j === null) return;
        setSaved(!!j.saved);
        setStatus('in');
      })
      .catch(function () { if (!cancelled) setStatus('out'); });
    return function () { cancelled = true; };
  }, [weaponSlug]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    var next = !saved;
    setSaved(next); // optimistic
    try {
      var res = await fetch('/api/dmz/saved-builds', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ build_ref: weaponSlug }),
      });
      if (!res.ok) {
        setSaved(!next); // revert
        if (res.status === 401) setStatus('out');
      }
    } catch (e) {
      setSaved(!next); // revert
    } finally {
      setBusy(false);
    }
  }

  var base = {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 3,
    fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace',
    textDecoration: 'none', cursor: 'pointer', border: '1px solid var(--border)', background: 'var(--bg-card)',
  };

  if (status === 'loading') {
    return <span aria-hidden="true" style={Object.assign({}, base, { color: 'var(--text-tertiary)', cursor: 'default', opacity: 0.6 })}>...</span>;
  }

  if (status === 'out') {
    return (
      <Link href="/join" style={Object.assign({}, base, { color: 'var(--text-secondary)' })}>
        <span aria-hidden="true">+</span> Sign in to save
      </Link>
    );
  }

  // logged in -> toggle
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      style={Object.assign({}, base, {
        color: saved ? 'var(--green)' : 'var(--text-secondary)',
        borderColor: saved ? 'var(--green)' : 'var(--border)',
        opacity: busy ? 0.7 : 1,
      })}
    >
      <span aria-hidden="true">{saved ? '✓' : '+'}</span>
      {saved ? 'Saved' : 'Save build'}
    </button>
  );
}
