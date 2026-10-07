'use client';
// components/dmz/TraitEmptyBoard.js
// Designed EMPTY STATE for /dmz/traits (zero VERIFIED trait rows). Client island for interaction only:
// every string is a prop from app/dmz/traits/page.js (the five FACTS, the "Not yet confirmed" list and
// the three official focus labels), and every string renders in the server HTML. The tree drawers are
// <details> elements, so with JS off all three are present and can be opened natively; with JS on the
// panels drive them and the summaries are hidden.
//
// HONESTY: no node grid, no node or trait counts, no costs, no point numbers, no rates, no Operator
// limits, no sample traits. Each tree shows ONE emblem (not a count). The status header counts the two
// lists it is given; nothing is hardcoded.

import { useEffect, useRef, useState } from 'react';

var NOT_CONFIRMED_STEP = 'How many points per mission: not confirmed';

function Emblem({ accent }) {
  // One octagon with a lock mark. Decorative: the panel label carries the meaning.
  return (
    <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden="true" focusable="false" className="teb-emblem">
      <polygon points="30,4 70,4 96,30 96,70 70,96 30,96 4,70 4,30" fill="rgba(0,0,0,0.25)" stroke={accent} strokeWidth="3" />
      <polygon points="35,16 65,16 84,35 84,65 65,84 35,84 16,65 16,35" fill="none" stroke={accent} strokeOpacity="0.35" strokeWidth="1.5" />
      <path d="M40 48 V40 a10 10 0 0 1 20 0 V48" fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <rect x="35" y="47" width="30" height="22" rx="3" fill={accent} fillOpacity="0.85" />
      <rect x="48.5" y="54" width="3" height="8" rx="1.5" fill="#0b0d10" />
    </svg>
  );
}

function SourceLink({ src, children }) {
  return <a href={src.href} rel="noopener" target="_blank" className="teb-src">{children || src.label}</a>;
}

export default function TraitEmptyBoard({ trees, focusFact, loopFact, dogTagFact, facts, unconfirmed, treeUnconfirmed, emptyNote }) {
  var [selected, setSelected] = useState(null);
  var [burst, setBurst] = useState(0);
  var [js, setJs] = useState(false);
  var panelRefs = useRef({});

  useEffect(function () { setJs(true); }, []);

  // Esc closes the open drawer and returns focus to its panel.
  useEffect(function () {
    if (!selected) return undefined;
    function onKey(e) {
      if (e.key !== 'Escape') return;
      var el = panelRefs.current[selected];
      setSelected(null);
      if (el) el.focus();
    }
    document.addEventListener('keydown', onKey);
    return function () { document.removeEventListener('keydown', onKey); };
  }, [selected]);

  function toggle(slug) {
    setSelected(function (cur) { return cur === slug ? null : slug; });
    setBurst(function (n) { return n + 1; });
  }

  return (
    <div className={'teb-root' + (js ? ' teb-js' : '')}>
      <style>{`
        .teb-panel { position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; gap: 10px; width: 100%; padding: 22px 16px 18px; background-color: var(--bg-card); background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0 1px, transparent 1px 4px); border: 1px solid var(--border); border-top: 2px solid var(--tree-accent); border-radius: 6px; color: #fff; cursor: pointer; font: inherit; text-align: center; }
        .teb-panel[aria-expanded="true"] { border-color: var(--tree-accent); }
        .teb-panel:focus-visible { outline: 2px solid var(--tree-accent); outline-offset: 3px; }
        .teb-label { font-family: Orbitron, monospace; font-size: 16px; font-weight: 800; letter-spacing: 0.5px; color: #fff; }
        .teb-chip { font-family: monospace; font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #ffb400; border: 1px solid rgba(255,180,0,0.4); border-radius: 2px; padding: 3px 8px; }
        .teb-burst-ring { display: none; }
        @media (prefers-reduced-motion: no-preference) {
          .teb-panel { transition: box-shadow 200ms ease, transform 200ms ease; }
          .teb-panel:hover, .teb-panel:focus-visible { box-shadow: 0 0 0 1px var(--tree-accent), 0 0 22px color-mix(in srgb, var(--tree-accent) 45%, transparent); }
          .teb-panel[aria-expanded="true"] { box-shadow: 0 0 0 1px var(--tree-accent), 0 0 28px color-mix(in srgb, var(--tree-accent) 55%, transparent); }
          .teb-burst-ring { display: block; position: absolute; left: 50%; top: 70px; width: 96px; height: 96px; margin-left: -48px; border-radius: 50%; border: 2px solid var(--tree-accent); pointer-events: none; animation: teb-burst 600ms ease-out forwards; }
          @keyframes teb-burst { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(2.4); opacity: 0; } }
        }
        .teb-drawer { background: var(--bg-card); border: 1px solid var(--border); border-left: 2px solid var(--tree-accent); border-radius: 4px; padding: 0 16px; margin-top: 8px; }
        .teb-drawer[open] { padding-bottom: 14px; }
        .teb-drawer > summary { cursor: pointer; padding: 10px 0; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-secondary); }
        .teb-js .teb-drawer > summary { display: none; }
        .teb-js .teb-drawer:not([open]) { display: none; }
        .teb-js .teb-drawer[open] { padding-top: 14px; }
        .teb-src { color: var(--green); text-decoration: underline; text-underline-offset: 2px; }
        .teb-loop { display: flex; align-items: stretch; gap: 8px; flex-wrap: nowrap; }
        .teb-step { flex: 1; min-width: 0; background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; padding: 12px 14px; }
        .teb-step-title { display: block; font-family: Orbitron, monospace; font-size: 13px; font-weight: 800; color: #fff; margin-bottom: 6px; }
        .teb-step-src { display: block; font-size: 11px; color: var(--text-tertiary); }
        .teb-arrow { flex: 0 0 auto; align-self: center; font-family: monospace; font-size: 14px; color: var(--text-tertiary); }
        .teb-step-unknown { background: transparent; border: 1px dashed var(--text-tertiary); color: var(--text-tertiary); opacity: 0.8; }
        .teb-board { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .teb-stamp { display: inline-block; font-family: monospace; font-size: 9px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 2px; padding: 2px 6px; margin-right: 8px; vertical-align: 1px; }
        .teb-stamp-yes { color: var(--green); border: 1px solid var(--green); }
        .teb-stamp-no { color: #ffb400; border: 1px solid rgba(255,180,0,0.5); }
        @media (max-width: 640px) {
          .teb-loop { flex-direction: column; }
          .teb-arrow { transform: rotate(90deg); }
          .teb-board { grid-template-columns: 1fr; }
        }
      `}</style>

      {/* 1. Three tree panels, one per official focus. */}
      <section aria-label="Trait trees" style={{ marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          {trees.map(function (t) {
            var on = selected === t.slug;
            return (
              <button key={t.slug} type="button" className="teb-panel"
                ref={function (el) { panelRefs.current[t.slug] = el; }}
                aria-expanded={on} aria-controls={'trait-tree-drawer-' + t.slug}
                onClick={function () { toggle(t.slug); }}
                style={{ '--tree-accent': t.accent }}>
                {on && <span key={burst} className="teb-burst-ring" aria-hidden="true" />}
                <span className="teb-label">{t.label}</span>
                <Emblem accent={t.accent} />
                <span className="teb-chip">Layout unconfirmed</span>
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, margin: '10px 0 0' }}>
          These are the official descriptions of each tree&apos;s focus, not confirmed in-game tree names.
        </p>

        {/* 2. Tree drawers. All three are in the HTML; JS shows only the selected one. */}
        <div aria-live="polite">
          {trees.map(function (t) {
            return (
              <details key={t.slug} id={'trait-tree-drawer-' + t.slug} className="teb-drawer" open={selected === t.slug} style={{ '--tree-accent': t.accent }}>
                <summary>{t.label + ': tree status'}</summary>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: t.accent, marginBottom: 6 }}>{t.label}</div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>
                  {focusFact.text + ' '}<span style={{ fontSize: 12 }}>(Source: <SourceLink src={focusFact.src} />)</span>
                </p>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>Still unconfirmed for this tree</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  {treeUnconfirmed.map(function (u) { return <li key={u}>{u}</li>; })}
                </ul>
              </details>
            );
          })}
        </div>
      </section>

      {/* Empty note (our own data status, not a game fact). */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '16px 18px', margin: '18px 0 28px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>Awaiting verification</div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{emptyNote}</p>
      </div>

      {/* 3. The loop: confirmed steps only, each citing its fact's source. */}
      <section aria-labelledby="teb-loop-h" style={{ marginBottom: 28 }}>
        <h2 id="teb-loop-h" style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, letterSpacing: 1, color: '#fff', margin: '0 0 10px' }}>The trait loop</h2>
        <div className="teb-loop">
          <div className="teb-step"><span className="teb-step-title">Mission</span><span className="teb-step-src">per <SourceLink src={loopFact.src} /></span></div>
          <span className="teb-arrow" aria-hidden="true">--&gt;</span>
          <div className="teb-step"><span className="teb-step-title">Trait Points earned</span><span className="teb-step-src">per <SourceLink src={loopFact.src} /></span></div>
          <span className="teb-arrow" aria-hidden="true">--&gt;</span>
          <div className="teb-step"><span className="teb-step-title">Spent on that Operator only</span><span className="teb-step-src">per <SourceLink src={loopFact.src} /></span></div>
        </div>
        <div className="teb-loop" style={{ marginTop: 8 }}>
          <div className="teb-step teb-step-unknown"><span className="teb-step-title" style={{ color: 'var(--text-tertiary)' }}>{NOT_CONFIRMED_STEP}</span></div>
        </div>
        <div className="teb-loop" style={{ marginTop: 8 }}>
          <div className="teb-step"><span className="teb-step-title">Dog Tag level</span><span className="teb-step-src">per <SourceLink src={dogTagFact.src} /></span></div>
          <span className="teb-arrow" aria-hidden="true">--&gt;</span>
          <div className="teb-step"><span className="teb-step-title">Operator Traits</span><span className="teb-step-src">per <SourceLink src={dogTagFact.src} /></span></div>
        </div>
      </section>

      {/* 4. Intel status board. Header counts come from the two lists. */}
      <section aria-labelledby="teb-board-h">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <h2 id="teb-board-h" style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, letterSpacing: 1, color: '#fff', margin: 0 }}>Intel status</h2>
          <span className="teb-status-count" style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>{facts.length + ' confirmed, ' + unconfirmed.length + ' unconfirmed'}</span>
        </div>
        <div className="teb-board">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '16px 18px' }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--green)', margin: '0 0 10px' }}>Confirmed</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {facts.map(function (f) {
                return <li key={f.text} style={{ marginBottom: 8 }}><span className="teb-stamp teb-stamp-yes">Confirmed</span>{f.text + ' '}<span style={{ fontSize: 12 }}>(Source: <SourceLink src={f.src} />)</span></li>;
              })}
            </ul>
          </div>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '16px 18px' }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#ffb400', margin: '0 0 10px' }}>Waiting on</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {unconfirmed.map(function (u) {
                return <li key={u} style={{ marginBottom: 8 }}><span className="teb-stamp teb-stamp-no">Unconfirmed</span>{u}</li>;
              })}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
