'use client';
// components/dmz/DmzNotifyForm.js
// Email-only capture form for the DMZ launch list. Posts to /api/dmz-notify with
// { email, honeypot, source }. Shared by the landing block (layout='block') and
// the article strip (layout='strip'). source ('landing' | 'article-strip') tags
// which surface converts.
//
// TOKEN DISCIPLINE: colors are DMZ .dmz-theme tokens ONLY (var(--green) forest,
// var(--border), var(--bg-card), var(--text-*)) -- no hardcoded hex except #fff
// for text on the forest button, no Marathon neon. Honest copy, no fake counts.
//
// SPAM: a visually-hidden honeypot field ('company'). Real users leave it empty;
// the API silently drops any submission where it is filled.
//
// onSuccess (optional): called after a successful submit -- the strip uses it to
// persist its dismissal cookie so it does not reappear on the next visit.

import { useState } from 'react';

var SUCCESS_MSG = "You're on the list -- we'll email you when DMZ coverage goes live October 23.";
var ERROR_MSG = 'Something went wrong. Please try again.';

export default function DmzNotifyForm({ source, layout, onSuccess }) {
  var strip = layout === 'strip';
  var [email, setEmail] = useState('');
  var [honeypot, setHoneypot] = useState('');
  var [status, setStatus] = useState('idle'); // idle | submitting | success | error
  var submitting = status === 'submitting';

  var emailId = 'dmz-notify-email-' + (source || 'x');
  var honeyId = 'dmz-notify-company-' + (source || 'x');

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setStatus('submitting');
    try {
      var res = await fetch('/api/dmz-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, honeypot: honeypot, source: source }),
      });
      if (res.ok) {
        setStatus('success');
        if (onSuccess) onSuccess();
      } else {
        setStatus('error');
      }
    } catch (err) {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <p
        role="status"
        style={{
          margin: 0,
          fontSize: strip ? 12.5 : 13.5,
          fontWeight: 600,
          color: 'var(--green)',
          lineHeight: 1.5,
        }}
      >
        {SUCCESS_MSG}
      </p>
    );
  }

  var inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    background: 'var(--bg-input)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 14,
    padding: strip ? '8px 11px' : '10px 13px',
    outline: 'none',
  };

  var buttonStyle = {
    flex: strip ? '0 0 auto' : '0 0 auto',
    background: 'var(--green)',
    border: '1px solid var(--green)',
    borderRadius: 6,
    color: '#fff',
    fontWeight: 700,
    fontSize: strip ? 12.5 : 13.5,
    letterSpacing: 0.5,
    padding: strip ? '8px 14px' : '10px 18px',
    cursor: submitting ? 'default' : 'pointer',
    opacity: submitting ? 0.7 : 1,
    whiteSpace: 'nowrap',
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start', width: '100%' }}
    >
      {/* Honeypot -- visually hidden, off the tab order, no autofill. Bots fill it;
          real users never see it. */}
      <input
        id={honeyId}
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
        <label htmlFor={emailId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
          Email address
        </label>
        <input
          id={emailId}
          type="email"
          required
          value={email}
          onChange={function (e) { setEmail(e.target.value); }}
          placeholder="you@example.com"
          autoComplete="email"
          disabled={submitting}
          style={inputStyle}
        />
      </div>

      <button type="submit" disabled={submitting} style={buttonStyle}>
        {submitting ? 'Submitting...' : 'Notify me'}
      </button>

      {status === 'error' && (
        <span role="alert" style={{ flexBasis: '100%', fontSize: 12.5, color: 'var(--red)', fontWeight: 600 }}>
          {ERROR_MSG}
        </span>
      )}
    </form>
  );
}
