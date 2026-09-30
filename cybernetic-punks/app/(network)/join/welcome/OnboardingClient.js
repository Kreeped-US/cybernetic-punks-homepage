'use client';
// app/join/welcome/OnboardingClient.js
// Ruling 3 Stage 3b: the confirm-don't-interrogate game pick (client).
//   - Options come from ROOT_GAMES (via the server) -- never hardcoded here.
//   - Pre-checks the games the account already has (the Stage-2-captured intent): a DMZ-arrival
//     user sees DMZ already checked, so the act is CONFIRM, not interrogate.
//   - Multi-select (both, one, or none).
//   - Genuinely, visibly skippable: Skip is a real button, not grey fine print.
//   - Confirm POSTs the selection; Skip POSTs nothing (leaves the capture). Both stamp
//     onboarded_at server-side via /api/account/onboarding, then land on '/'.
//   - Network-branded (the CP red accent + design tokens), NOT game-branded. Anti-hype copy:
//     states what is true, honest pre-launch labels, no founding/revolution/urgency theater.

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingClient({ options, preselected }) {
  var router = useRouter();

  // Seed the selection from the captured intent, intersected with real option slugs (drop any
  // stale value so a removed game can never sit checked).
  var slugs = options.map(function (o) { return o.slug; });
  var seed = (preselected || []).filter(function (s) { return slugs.indexOf(s) !== -1; });
  var [selected, setSelected] = useState(seed);
  var [busy, setBusy] = useState(false);

  var anyPreLaunch = options.some(function (o) { return !o.live; });

  function toggle(slug) {
    if (busy) return;
    setSelected(function (cur) {
      return cur.indexOf(slug) !== -1
        ? cur.filter(function (s) { return s !== slug; })
        : cur.concat([slug]);
    });
  }

  // withSelection=true  -> Confirm: write games_interested (may be [] = explicit "no games").
  // withSelection=false -> Skip: send nothing; onboarded_at still stamps server-side.
  async function submit(withSelection) {
    if (busy) return;
    setBusy(true);
    var payload = withSelection ? { games_interested: selected } : {};
    try {
      await fetch('/api/account/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (_) {
      // Non-blocking: if the stamp fails the guard would re-show once (recoverable). Navigate
      // regardless so the user is never stuck on this screen.
    }
    router.push('/');
  }

  return (
    <main style={S.page}>
      <div style={S.wrap}>

        {/* Header -- network-branded, anti-hype. */}
        <div style={S.eyebrow}>
          <span style={S.eyebrowDot} aria-hidden="true" />
          ACCOUNT READY
        </div>
        <h1 style={S.h1}>Which games are you here for?</h1>
        <p style={S.sub}>
          Pick the games you want intel on and we will point you at the right coverage. You can
          change this anytime, or skip and browse everything.
        </p>

        {/* Options -- one per ROOT_GAMES entry. */}
        <div style={S.list} role="group" aria-label="Games">
          {options.map(function (o) {
            var isSel = selected.indexOf(o.slug) !== -1;
            return (
              <button
                key={o.slug}
                type="button"
                role="checkbox"
                aria-checked={isSel}
                disabled={busy}
                onClick={function () { toggle(o.slug); }}
                style={Object.assign({}, S.option, isSel ? S.optionSel : null)}
              >
                <span
                  style={Object.assign({}, S.dot, { background: o.accent || 'var(--text-tertiary)' })}
                  aria-hidden="true"
                />
                <span style={S.optBody}>
                  <span style={S.optLabel}>{o.label}</span>
                  <span style={Object.assign({}, S.optStatus, o.live ? S.optStatusLive : null)}>
                    {o.live ? o.status : ('Pre-launch - ' + o.status)}
                  </span>
                </span>
                <span
                  style={Object.assign({}, S.check, isSel ? S.checkSel : null)}
                  aria-hidden="true"
                >
                  {isSel ? <span style={S.checkMark} /> : null}
                </span>
              </button>
            );
          })}
        </div>

        {/* Honest pre-launch note -- only when a shown game is not live. */}
        {anyPreLaunch ? (
          <p style={S.note}>
            Pre-launch games have not deployed yet. Picking one means we will point you at its
            intel the moment it lands -- no early access is being promised.
          </p>
        ) : null}

        {/* Two real actions. Skip is a full, visible button -- not fine print. */}
        <div style={S.actions}>
          <button
            type="button"
            disabled={busy}
            onClick={function () { submit(true); }}
            style={Object.assign({}, S.btn, S.btnPrimary, busy ? S.btnBusy : null)}
          >
            Confirm
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={function () { submit(false); }}
            style={Object.assign({}, S.btn, S.btnGhost, busy ? S.btnBusy : null)}
          >
            Skip for now
          </button>
        </div>

        <p style={S.foot}>You can change this anytime in your profile.</p>
      </div>
    </main>
  );
}

// ---- styles (design tokens; network red accent, not a game color) ----
var S = {
  page: {
    minHeight: '100vh', background: 'var(--bg-page)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', padding: '48px 24px',
    fontFamily: 'system-ui, sans-serif',
  },
  wrap: { width: '100%', maxWidth: 520 },
  eyebrow: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
    fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3,
    color: 'var(--text-secondary)',
  },
  eyebrowDot: {
    width: 6, height: 6, borderRadius: '50%', background: 'var(--red)',
    boxShadow: '0 0 6px var(--red)',
  },
  h1: {
    margin: '0 0 12px', fontFamily: 'Orbitron, monospace', fontSize: 28, fontWeight: 800,
    letterSpacing: '-0.5px', lineHeight: 1.15, color: 'var(--text-primary)',
  },
  sub: { margin: '0 0 28px', fontSize: 14, lineHeight: 1.6, color: 'var(--text-secondary)' },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  option: {
    display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left',
    padding: '16px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)',
    borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', color: 'inherit',
    transition: 'border-color 0.12s, background 0.12s',
  },
  optionSel: { borderColor: 'var(--red)', background: 'var(--bg-card-hover)' },
  dot: { width: 9, height: 9, borderRadius: '50%', flexShrink: 0 },
  optBody: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 },
  optLabel: {
    fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, letterSpacing: 0.5,
    color: 'var(--text-primary)',
  },
  optStatus: {
    fontSize: 11, letterSpacing: 0.5, color: 'var(--text-secondary)', fontFamily: 'monospace',
  },
  optStatusLive: { color: 'var(--green)' },
  check: {
    width: 22, height: 22, flexShrink: 0, borderRadius: 3, border: '1.5px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent',
  },
  checkSel: { borderColor: 'var(--red)', background: 'var(--red)' },
  // CSS-drawn checkmark (no glyph): a rotated span with two white borders.
  checkMark: {
    width: 5, height: 10, marginTop: -2, borderRight: '2px solid #fff', borderBottom: '2px solid #fff',
    transform: 'rotate(45deg)',
  },
  note: {
    margin: '16px 0 0', fontSize: 11, lineHeight: 1.6, color: 'var(--text-tertiary)',
    fontFamily: 'monospace',
  },
  actions: { display: 'flex', gap: 10, marginTop: 28 },
  btn: {
    flex: 1, padding: '13px 20px', borderRadius: 2, fontFamily: 'inherit', fontSize: 12,
    fontWeight: 800, letterSpacing: 1, cursor: 'pointer', transition: 'opacity 0.12s',
  },
  btnPrimary: { background: 'var(--red)', color: '#fff', border: '1px solid var(--red)' },
  btnGhost: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)' },
  btnBusy: { opacity: 0.5, cursor: 'default' },
  foot: {
    margin: '18px 0 0', textAlign: 'center', fontSize: 10, letterSpacing: 1,
    color: 'var(--text-tertiary)', fontFamily: 'monospace',
  },
};
