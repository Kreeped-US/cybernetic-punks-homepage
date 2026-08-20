'use client';
// app/tools/build/[shell]/BuildRefiner.js
// Slice B -- the LIVE-REFINEMENT interactive layer for the build pages. Mounts over the SSR
// canonical build (which stays the crawlable default) and lets an authenticated user refine
// goal / rank / experience / weapon / team, re-running the live advisor and showing the
// refined loadout CLIENT-SIDE. Fable's disciplines are structural here:
//
//   1. PURE CLIENT-STATE. useState only -- NO next/navigation, NO URL writes, NO query params.
//      Refinements never mint a URL and are never an indexing surface (v1; shareable state is
//      a deferred v2). Nothing here is crawlable beyond the SSR canonical rendered by BuildView.
//
//   2. AIRTIGHT NO-PAID-CALL-ON-LOAD. There is exactly ONE path to the paid POST /api/advisor:
//      the refine() handler, bound ONLY to the Refine button's onClick. There is NO useEffect
//      in this file -- nothing on mount/hydration/state-init fetches. A crawler (no clicks)
//      renders the SSR canonical and fires ZERO advisor calls, by construction.
//
//   3. SINGLE refine() CHOKE POINT + a distinct, data-driven GATE POINT. Every refinement flows
//      through refine(); the REFINEMENT_GATED check at its top is the nameable free/premium seam
//      -- free today (false), and the future gate is a one-line flip there (plus the server's own
//      402, which refine() already handles). No refactor needed to monetize.
//
//   4. REFINED BUILD = EPHEMERAL VIEW-STATE. `displayedBuild` is client state only; refining
//      NEVER writes build_json, NEVER mutates the immutable `canonicalBuild` prop, NEVER persists.
//      reset() always returns to the SSR canonical. The crawler always gets the canonical.

import { useState } from 'react';
import BuildView from './BuildView';

// Control option sets -- ids MATCH the advisor engine's vocab (lib/advisor/generateBuild.js /
// AdvisorClient) so POST /api/advisor understands them. "Goal" maps to the engine's `priority`.
const GOALS = [
  { id: 'combat', label: 'Combat' }, { id: 'extraction', label: 'Extraction' },
  { id: 'survival', label: 'Survival' }, { id: 'speed', label: 'Speed' },
];
const RANKS = [
  { id: 'unranked', label: 'Unranked' }, { id: 'bronze', label: 'Bronze' },
  { id: 'silver', label: 'Silver' }, { id: 'gold', label: 'Gold' },
  { id: 'platinum', label: 'Platinum' }, { id: 'diamond', label: 'Diamond' },
  { id: 'pinnacle', label: 'Pinnacle' },
];
const EXPERIENCE = [
  { id: 'new', label: 'New' }, { id: 'learning', label: 'Learning' },
  { id: 'experienced', label: 'Experienced' }, { id: 'veteran', label: 'Veteran' },
];
const WEAPONS = [
  { id: '', label: 'Any' }, { id: 'AR', label: 'AR' }, { id: 'SMG', label: 'SMG' },
  { id: 'Shotgun', label: 'Shotgun' }, { id: 'Sniper', label: 'Sniper' },
  { id: 'LMG', label: 'LMG' }, { id: 'Railgun', label: 'Railgun' },
];
const TEAMS = [{ id: 'Solo', label: 'Solo' }, { id: 'Squad', label: 'Squad' }];

// FREE/PREMIUM SEAM -- the single, data-driven gate point (Fable). FALSE today: refinement is
// free (mirrors the server's inert override_all_free gate). When monetization arms, flip this
// to true (or source it from a passed entitlement prop) to short-circuit a gated user into the
// upgrade prompt BEFORE any paid call. The authoritative gate stays server-side (the 402 branch
// in refine()); this is the pre-emptive client seam. One-line flip, no refactor.
const REFINEMENT_GATED = false;

export default function BuildRefiner({ canonicalBuild, accent }) {
  const accentColor = accent || '#ff8800';
  const shellName = (canonicalBuild && canonicalBuild.shell) || 'Runner';

  // `displayedBuild` starts as the SSR canonical (crawlable on first paint) and only ever
  // changes on an explicit refine(); reset() restores the immutable canonicalBuild prop.
  const [displayedBuild, setDisplayedBuild] = useState(canonicalBuild);
  const [isRefined, setIsRefined] = useState(false);

  const [goal, setGoal] = useState('combat');
  const [rankTarget, setRankTarget] = useState('gold');
  const [experienceLevel, setExperienceLevel] = useState('learning');
  const [weaponPreference, setWeaponPreference] = useState('');
  const [teamSize, setTeamSize] = useState('Solo');

  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null); // 'signin' | 'premium' | 'failed' | null

  // ── THE SINGLE refine() CHOKE POINT ──────────────────────────────────────────
  // Bound ONLY to the Refine button onClick (see below). No effect, no auto-call. The paid
  // POST /api/advisor is reachable ONLY through this explicit gesture.
  async function refine() {
    if (loading) return;
    // GATE POINT (free/premium seam). Inert today (REFINEMENT_GATED === false).
    if (REFINEMENT_GATED) { setNotice('premium'); return; }

    setLoading(true);
    setNotice(null);
    try {
      const res = await fetch('/api/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // `goal` is the engine's `priority`. Shell is fixed to this page's shell.
        body: JSON.stringify({
          shell: shellName,
          priority: goal,
          rankTarget,
          experienceLevel,
          weaponPreference,
          teamSize,
        }),
      });
      if (res.status === 401) { setNotice('signin'); return; }   // auth is the first gate
      if (res.status === 402) { setNotice('premium'); return; }  // server entitlement gate (inert today)
      if (!res.ok) { setNotice('failed'); return; }
      const data = await res.json();
      if (data && data.build) {
        setDisplayedBuild(data.build); // EPHEMERAL view-state -- never persisted
        setIsRefined(true);
      } else {
        setNotice('failed');
      }
    } catch (_) {
      setNotice('failed');
    } finally {
      setLoading(false);
    }
  }

  // Reset to the immutable SSR canonical. Never mutates canonicalBuild; just re-points the view.
  function reset() {
    setDisplayedBuild(canonicalBuild);
    setIsRefined(false);
    setNotice(null);
  }

  const tileRow = (label, options, value, setValue) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace', marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {options.map((o) => {
          const on = value === o.id;
          return (
            <button
              key={o.id + '-' + o.label}
              type="button"
              onClick={() => setValue(o.id)}
              style={{
                padding: '6px 12px', fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
                letterSpacing: 0.5, borderRadius: 2, cursor: 'pointer',
                background: on ? accentColor : 'transparent',
                color: on ? '#000' : 'rgba(255,255,255,0.7)',
                border: '1px solid ' + (on ? accentColor : '#2a2e38'),
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ background: '#121418', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        {/* ── REFINEMENT PANEL ─────────────────────────────────────────────── */}
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '3px solid ' + accentColor, borderRadius: '0 0 3px 3px', padding: '18px 20px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ fontSize: 10, color: accentColor, letterSpacing: 2, fontWeight: 800, fontFamily: 'monospace' }}>
              ⟳ REFINE THIS BUILD
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
              {isRefined ? 'SHOWING REFINED LOADOUT' : 'SHOWING VERIFIED CANONICAL'}
            </div>
          </div>

          {tileRow('GOAL', GOALS, goal, setGoal)}
          {tileRow('RANK TARGET', RANKS, rankTarget, setRankTarget)}
          {tileRow('EXPERIENCE', EXPERIENCE, experienceLevel, setExperienceLevel)}
          {tileRow('WEAPON PREFERENCE', WEAPONS, weaponPreference, setWeaponPreference)}
          {tileRow('TEAM', TEAMS, teamSize, setTeamSize)}

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
            <button
              type="button"
              onClick={refine}
              disabled={loading}
              style={{
                padding: '10px 20px', fontSize: 11, fontWeight: 800, letterSpacing: 1, fontFamily: 'monospace',
                borderRadius: 2, border: 'none', cursor: loading ? 'wait' : 'pointer',
                background: accentColor, color: '#000', opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'ENGINEERING…' : 'REFINE →'}
            </button>
            {isRefined && (
              <button
                type="button"
                onClick={reset}
                style={{
                  padding: '10px 18px', fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace',
                  borderRadius: 2, cursor: 'pointer', background: 'transparent',
                  color: 'rgba(255,255,255,0.7)', border: '1px solid #2a2e38',
                }}
              >
                ↺ RESET TO CANONICAL
              </button>
            )}
            {notice === 'signin' && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                Sign in to refine live. The verified {shellName} build above is always free.
              </span>
            )}
            {notice === 'premium' && (
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: 'monospace' }}>
                Live refinement is a premium feature.
              </span>
            )}
            {notice === 'failed' && (
              <span style={{ fontSize: 11, color: '#ff6666', fontFamily: 'monospace' }}>
                Refinement failed. Try again.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── THE BUILD DISPLAY ─────────────────────────────────────────────────
          SSR canonical on first paint (crawlable); a refined result swaps client-side.
          Same renderer for both -- no divergence. */}
      <BuildView build={displayedBuild} accent={accentColor} />
    </div>
  );
}
