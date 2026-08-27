'use client';
// app/me/FollowEditor.js
// Community v1 Piece C -- the /me follow-editor. Inline games multi-select (the toggle/select
// pattern from OnboardingClient, but a widget, not a full-page onboarding flow): pre-populated
// with the account's CURRENT games_interested, a Save action that POSTs the new array to the
// owner-gated /api/account/games (games_interested only, no onboarded_at stamp), then
// router.refresh() so the /me server component re-runs and the personalized feed (Piece B)
// reflects the new follows. Neutral-themed; each option shows that game's accent.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function FollowEditor({ options, current }) {
  var router = useRouter();
  var optionSlugs = (options || []).map(function (o) { return o.slug; });
  // Seed from current follows, intersected with real options (drop any stale slug).
  var seed = (current || []).filter(function (s) { return optionSlugs.indexOf(s) !== -1; });
  var [selected, setSelected] = useState(seed);
  var [busy, setBusy] = useState(false);
  var [msg, setMsg] = useState(null);

  function toggle(slug) {
    if (busy) return;
    setMsg(null);
    setSelected(function (cur) {
      return cur.indexOf(slug) !== -1
        ? cur.filter(function (s) { return s !== slug; })
        : cur.concat([slug]);
    });
  }

  // Dirty check vs the seed, so Save is inert until the selection actually changes.
  var dirty = selected.length !== seed.length || selected.some(function (s) { return seed.indexOf(s) === -1; });

  async function save() {
    if (busy || !dirty) return;
    setBusy(true); setMsg(null);
    try {
      var res = await fetch('/api/account/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ games_interested: selected }),
      });
      if (!res.ok) { setMsg('Could not save. Try again.'); setBusy(false); return; }
      setMsg('Saved.');
      // Re-run the /me server component so the feed below reflects the new follows.
      router.refresh();
    } catch (_) {
      setMsg('Could not save. Try again.');
    }
    setBusy(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {(options || []).map(function (o) {
          var isSel = selected.indexOf(o.slug) !== -1;
          return (
            <button
              key={o.slug}
              type="button"
              role="checkbox"
              aria-checked={isSel}
              disabled={busy}
              onClick={function () { toggle(o.slug); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', borderRadius: 6, cursor: busy ? 'default' : 'pointer',
                fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: '#fff',
                background: isSel ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: '1px solid ' + (isSel ? o.accent : '#2a2d35'),
                transition: 'border-color 0.12s, background 0.12s',
              }}
            >
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: o.accent, flexShrink: 0 }} aria-hidden="true" />
              {o.label}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>{o.live ? 'Live' : 'Pre-launch'}</span>
              <span style={{ marginLeft: 2, fontSize: 12, fontWeight: 800, color: isSel ? o.accent : 'rgba(255,255,255,0.3)' }} aria-hidden="true">{isSel ? '✓' : '+'}</span>
            </button>
          );
        })}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={save}
          style={{
            padding: '8px 16px', borderRadius: 6, fontSize: 12, fontWeight: 800, letterSpacing: 0.5,
            cursor: (busy || !dirty) ? 'default' : 'pointer', color: '#fff', border: 'none',
            background: dirty ? '#9A2740' : '#23262e', opacity: busy ? 0.6 : 1,
          }}
        >
          {busy ? 'Saving...' : 'Save follows'}
        </button>
        {msg ? <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>{msg}</span> : null}
      </div>
    </div>
  );
}
