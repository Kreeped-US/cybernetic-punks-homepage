'use client';
// components/dmz/DmzNotifyStrip.js
// Slim, dismissible launch-email strip for DMZ ARTICLE pages -- so indexed search
// traffic (which lands on articles) can convert. source='article-strip'.
//
// NO HYDRATION FLASH: the SERVER (article page) reads the dmz_notify_dismissed
// cookie and does not render this component at all when dismissed. So when it IS
// rendered it is meant to be visible from first paint -- no client-only "show then
// hide". Client state only handles the live X-dismiss and post-success case.
//
// Dismiss / success -> persist a long-lived cookie so the strip stays gone on
// future visits. On success we keep the strip on screen (the form swaps to its
// success message) but still set the cookie; on X we hide immediately.
//
// TOKEN DISCIPLINE: .dmz-theme tokens only; no hardcoded hex, no Marathon neon.

import { useState } from 'react';
import DmzNotifyForm from './DmzNotifyForm';

var COOKIE = 'dmz_notify_dismissed';
var ONE_YEAR = 60 * 60 * 24 * 365;

function persistDismissed() {
  try {
    document.cookie = COOKIE + '=1; path=/; max-age=' + ONE_YEAR + '; samesite=lax';
  } catch (e) {
    // no-op: a blocked cookie just means the strip may reappear next visit
  }
}

export default function DmzNotifyStrip() {
  var [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function dismiss() {
    persistDismissed();
    setHidden(true);
  }
  function handleSuccess() {
    // Keep the success message visible; ensure it does not return next visit.
    persistDismissed();
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '10px 16px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--green)',
        borderRadius: 8,
        padding: '12px 40px 12px 16px',
        marginBottom: 26,
      }}
    >
      <span style={{ flex: '1 1 210px', minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
        Get DMZ coverage the day it lands -- one launch email, nothing else.
      </span>
      <div style={{ flex: '1 1 250px', minWidth: 0 }}>
        <DmzNotifyForm source="article-strip" layout="strip" onSuccess={handleSuccess} />
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 24,
          height: 24,
          padding: 0,
          background: 'transparent',
          border: 'none',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          lineHeight: 0,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
          <path d="M1 1 L11 11 M11 1 L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        </svg>
      </button>
    </div>
  );
}
