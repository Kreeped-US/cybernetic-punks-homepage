'use client';
// components/dmz/TraitEmptyBoard.js
// Designed EMPTY STATE for /dmz/traits (zero VERIFIED trait rows). Client island for interaction only:
// every string is a prop from app/dmz/traits/page.js (the FACTS, the "Not yet confirmed" list, the three
// official tree names and the tree-name note, the layout caption and the Reported facts), and every string
// renders in the server HTML. The tree drawers are <details> elements, so with JS off all three are present
// and can be opened natively; with JS on the panels drive them and the summaries are hidden.
//
// HONESTY: no trait names, no costs, no point numbers, no rates, no Operator limits, no sample traits. Each
// tree shows its STRUCTURE only (lib/dmz/traitLayout.js, attributed to published screenshots): unnamed
// "Major" slots, "?" Minor slots and one "Start" slot, captioned as not yet confirmed in our own capture.
// The status header counts the lists it is given; nothing is hardcoded.

import { useEffect, useRef, useState } from 'react';
import { traitTreeSlots } from '@/lib/dmz/traitLayout';

// Points come one per Dog Tag level (the FOB Station Intel graphic); how much XP a level takes is not published.
var NOT_CONFIRMED_STEP = 'XP per Dog Tag level: not confirmed';
var SLOT_TEXT = { major: 'Major', minor: '?', start: 'Start' };

function TreeShape() {
  // The tree's slot layout, one shared shape for all three trees. Decorative: the caption and the Reported
  // facts below carry the meaning in text.
  return (
    <span className="teb-shape" aria-hidden="true">
      {traitTreeSlots().map(function (s) {
        return <span key={s.row + '-' + s.col} className={'teb-slot teb-slot-' + s.kind} style={{ gridRow: s.row, gridColumn: s.col + 1 }}>{SLOT_TEXT[s.kind]}</span>;
      })}
    </span>
  );
}

function SourceLink({ src, children }) {
  // A source with no public URL (the observed FOB graphic) renders as plain text.
  if (!src.href) return <span>{children || src.label}</span>;
  return <a href={src.href} rel="noopener" target="_blank" className="teb-src">{children || src.label}</a>;
}

export default function TraitEmptyBoard({ trees, treeNote, layoutCaption, attributed, focusFact, loopFact, dogTagFact, facts, unconfirmed, treeUnconfirmed, emptyNote }) {
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
        .teb-step-src { display: block; font-size: 13px; color: var(--text-tertiary); }
        .teb-arrow { flex: 0 0 auto; align-self: center; font-family: monospace; font-size: 14px; color: var(--text-tertiary); }
        .teb-step-unknown { background: transparent; border: 1px dashed var(--text-tertiary); color: var(--text-tertiary); opacity: 0.8; }
        .teb-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .teb-shape { display: grid; grid-template-columns: repeat(3, 40px); grid-auto-rows: 20px; gap: 5px 8px; justify-content: center; margin: 4px 0; }
        .teb-slot { display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 8px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--text-tertiary); border: 1px dashed var(--tree-accent); border-radius: 3px; background: rgba(0,0,0,0.2); }
        .teb-slot-major { border-style: solid; border-width: 2px; color: #fff; }
        .teb-slot-start { border-style: solid; border-radius: 10px; color: var(--tree-accent); }
        .teb-stamp-rep { color: #e0a13a; border: 1px solid rgba(224,161,58,0.5); }
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
                <TreeShape />
                <span className="teb-chip">Layout unconfirmed</span>
              </button>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, margin: '10px 0 0' }}>
          {treeNote}
        </p>
        <p className="teb-layout-caption" style={{ fontSize: 12, color: '#e0a13a', lineHeight: 1.6, margin: '4px 0 0' }}>
          {layoutCaption}
        </p>

        {/* 2. Tree drawers. All three are in the HTML; JS shows only the selected one. */}
        <div aria-live="polite">
          {trees.map(function (t) {
            return (
              <details key={t.slug} id={'trait-tree-drawer-' + t.slug} className="teb-drawer" open={selected === t.slug} style={{ '--tree-accent': t.accent }}>
                <summary>{t.label + ': tree status'}</summary>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: t.accent, marginBottom: 6 }}>{t.label}</div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 10px' }}>
                  {focusFact.text + ' '}<span style={{ fontSize: 13 }}>(Source: <SourceLink src={focusFact.src} />)</span>
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

      {/* 4. Intel status board. Header counts come from the three lists. */}
      <section aria-labelledby="teb-board-h">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <h2 id="teb-board-h" style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, letterSpacing: 1, color: '#fff', margin: 0 }}>Intel status</h2>
          <span className="teb-status-count" style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>{facts.length + ' confirmed, ' + attributed.length + ' reported, ' + unconfirmed.length + ' unconfirmed'}</span>
        </div>
        <div className="teb-board">
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '16px 18px' }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--green)', margin: '0 0 10px' }}>Confirmed</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {facts.map(function (f) {
                return <li key={f.text} style={{ marginBottom: 8 }}><span className="teb-stamp teb-stamp-yes">Confirmed</span>{f.text + ' '}<span style={{ fontSize: 13 }}>(Source: <SourceLink src={f.src} />)</span></li>;
              })}
            </ul>
          </div>
          {/* Reported (the network "attributed" tier): structure from published screenshots, below confirmed. */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '16px 18px' }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#e0a13a', margin: '0 0 10px' }}>Reported, not yet confirmed by us</h3>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {attributed.map(function (f) {
                return <li key={f.text} style={{ marginBottom: 8 }}><span className="teb-stamp teb-stamp-rep">Reported</span>{f.text + ' '}<span style={{ fontSize: 13 }}>(Source: <SourceLink src={f.src} />)</span></li>;
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
