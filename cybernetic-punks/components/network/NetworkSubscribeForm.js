'use client';
// components/network/NetworkSubscribeForm.js
// Network-wide email capture for the front door. Posts to /api/network-notify with
// { email, honeypot, source:'network-home' } -> the shared email_signups table
// (game_slug='network'). Mirrors the DMZ form's pattern (visually-hidden honeypot,
// idle/submitting/success/error states, honest copy -- no fake counts). The submit
// button uses the network red accent (var(--red)) to match the rest of the network
// chrome; the success line uses the neutral silver (--nr-vantage). Rendered inside
// .nr-page, so both tokens cascade.

import { useState } from 'react';

var SUCCESS_MSG = "You're on the list -- intel drops land in your inbox.";
var ERROR_MSG = 'Something went wrong. Please try again.';

export default function NetworkSubscribeForm() {
  var [email, setEmail] = useState('');
  var [honeypot, setHoneypot] = useState('');
  var [status, setStatus] = useState('idle'); // idle | submitting | success | error
  var submitting = status === 'submitting';

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setStatus('submitting');
    try {
      var res = await fetch('/api/network-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, honeypot: honeypot, source: 'network-home' }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch (err) {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <p role="status" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--nr-vantage)', lineHeight: 1.5 }}>
        {SUCCESS_MSG}
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', width: '100%', maxWidth: 480 }}
    >
      {/* Honeypot -- visually hidden, off the tab order, no autofill. */}
      <input
        id="nr-sub-company"
        type="text"
        name="company"
        value={honeypot}
        onChange={function (e) { setHoneypot(e.target.value); }}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      <div style={{ flex: '1 1 200px', minWidth: 0 }}>
        <label htmlFor="nr-sub-email" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
          Email address
        </label>
        <input
          id="nr-sub-email"
          type="email"
          required
          value={email}
          onChange={function (e) { setEmail(e.target.value); }}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={submitting}
          style={{
            width: '100%', boxSizing: 'border-box', background: 'var(--bg-page)',
            border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)',
            fontSize: 14, padding: '11px 13px', outline: 'none',
          }}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        style={{
          background: 'var(--red)', border: '1px solid var(--red)', borderRadius: 4,
          color: 'var(--text-primary)', fontWeight: 800, fontSize: 12, letterSpacing: 1.5,
          textTransform: 'uppercase', fontFamily: 'var(--font-mono)', padding: '11px 20px',
          cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1, whiteSpace: 'nowrap',
        }}
      >
        {submitting ? 'Joining...' : 'Subscribe'}
      </button>

      {status === 'error' && (
        <span role="alert" style={{ flexBasis: '100%', fontSize: 12.5, color: 'var(--red)', fontWeight: 600 }}>
          {ERROR_MSG}
        </span>
      )}
    </form>
  );
}
