'use client';
// components/dmz/TraitEmptyBoard.js
// Designed EMPTY STATE for /dmz/traits (zero VERIFIED trait rows). Client island for interaction only:
// every string is a prop from app/dmz/traits/page.js (the FACTS, the "Not yet confirmed" list, the three
// official tree names and the tree-name note, the layout caption and the Reported facts), and every string
// renders in the server HTML. The tree drawers are <details> elements, so with JS off all three are present
// and can be opened natively; with JS on the panels drive them and the summaries are hidden.
//
// HONESTY: no trait names, no costs, no point numbers, no rates, no Operator limits, no sample traits. Each
// tree is a PLATE (components/dmz/TraitPlates.js) showing its STRUCTURE only (lib/dmz/traitLayout.js,
// attributed to published screenshots): unnamed Major nodes, "?" Minor nodes and one Start node, plus an
// illustrative example path on activation, captioned as not yet confirmed in our own capture.
// The status header counts the lists it is given; nothing is hardcoded.

import { useEffect, useRef, useState } from 'react';
import TraitPlates from '@/components/dmz/TraitPlates';

// Points come one per Dog Tag level (the FOB Station Intel graphic); how much XP a level takes is not published.
var NOT_CONFIRMED_STEP = 'XP per Dog Tag level: not confirmed';

function SourceLink({ src, children }) {
  // A source with no public URL (the observed FOB graphic) renders as plain text.
  if (!src.href) return <span>{children || src.label}</span>;
  return <a href={src.href} rel="noopener" target="_blank" className="teb-src">{children || src.label}</a>;
}

export default function TraitEmptyBoard({ trees, treeNote, layoutCaption, attributed, focusFact, loopFact, dogTagFact, facts, unconfirmed, treeUnconfirmed, emptyNote }) {
  var [selected, setSelected] = useState(null);
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

  // Activating a plate selects its tree (the drawer follows) and replays its example path; activating the
  // selected plate again keeps it selected and replays. Esc closes the drawer.
  function select(slug) { setSelected(slug); }

  return (
    <div className={'teb-root' + (js ? ' teb-js' : '')}>
      <style>{`
        .teb-drawer { position: relative; background: var(--hk-card); box-shadow: inset 0 0 0 1px var(--hk-line); clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 0 100%); padding: 0 20px 0 23px; margin-top: 12px; max-width: 760px; }
        .teb-drawer::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--tree-accent); }
        .teb-drawer[open] { padding-bottom: 16px; }
        .teb-drawer > summary { cursor: pointer; display: flex; align-items: center; min-height: 44px; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--hk-soft); }
        .teb-js .teb-drawer > summary { display: none; }
        .teb-js .teb-drawer:not([open]) { display: none; }
        .teb-js .teb-drawer[open] { padding-top: 16px; }
        .teb-drawer-name { font-size: 16px; font-weight: 800; color: var(--tree-accent); margin-bottom: 6px; }
        .teb-drawer-fact { font-size: 15px; color: var(--hk-soft); line-height: 1.6; margin: 0 0 10px; }
        .teb-drawer-lbl { font: 700 12px/1.4 monospace; letter-spacing: 1.5px; text-transform: uppercase; color: var(--hk-mute); margin-bottom: 4px; }
        .teb-drawer-list { margin: 0; padding-left: 18px; font-size: 14px; color: var(--hk-soft); line-height: 1.7; }
        .teb-srcl { font-size: 13px; }
        .teb-root .teb-src { padding: 14px 0; color: var(--hk-text); text-decoration: underline; text-decoration-color: var(--hk-accent); text-underline-offset: 3px; }
        .teb-root .teb-src:focus-visible { outline: 2px solid var(--hk-accent); outline-offset: 2px; }
        .teb-note { font-size: 13px; color: var(--hk-soft); line-height: 1.6; margin: 18px 0 0; max-width: 760px; }
        .teb-layout-caption { font-size: 13px; color: #e0a13a; line-height: 1.6; margin: 6px 0 0; max-width: 760px; }
        .teb-await { padding: 16px 20px; margin: 20px 0 32px; max-width: 760px; }
        .teb-await-lbl { font: 700 12px/1.4 monospace; letter-spacing: 2px; text-transform: uppercase; color: var(--hk-mute); margin-bottom: 6px; }
        .teb-await p { font-size: 15px; color: var(--hk-soft); margin: 0; line-height: 1.6; }
        .teb-h2 { margin: 0 0 12px; font-size: clamp(20px, 3vw, 24px); font-weight: 800; color: var(--hk-text); }
        .teb-loop { display: flex; align-items: stretch; gap: 8px; flex-wrap: nowrap; }
        .teb-step { flex: 1; min-width: 0; padding: 12px 16px 18px; }
        .teb-step-title { display: block; font-size: 15px; font-weight: 800; color: var(--hk-text); margin-bottom: 4px; }
        .teb-step-src { display: block; font-size: 13px; color: var(--hk-soft); }
        .teb-arrow { flex: 0 0 auto; align-self: center; font-family: monospace; font-size: 14px; color: var(--hk-mute); }
        .teb-step-unknown { background: transparent; border: 1px dashed var(--hk-mute); }
        .teb-step-unknown .teb-step-title { color: var(--hk-mute); margin: 0; }
        .teb-board-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
        .teb-board-head .teb-h2 { margin: 0; }
        .teb-status-count { font: 13px/1.4 monospace; color: var(--hk-soft); }
        .teb-board { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .teb-col { position: relative; padding: 19px 20px 16px; }
        .teb-col::before { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--teb-tier); }
        .teb-col-yes { --teb-tier: #6cc97e; --teb-tier-text: #8fe0a8; }
        .teb-col-rep { --teb-tier: #e0a13a; --teb-tier-text: #e0a13a; }
        .teb-col-no { --teb-tier: #ffb400; --teb-tier-text: #ffb400; }
        .teb-col h3 { font: 700 12px/1.4 monospace; letter-spacing: 2px; text-transform: uppercase; color: var(--teb-tier-text); margin: 0 0 10px; }
        .teb-col ul { margin: 0; padding: 0; list-style: none; font-size: 15px; color: var(--hk-soft); line-height: 1.7; }
        .teb-col li { margin-bottom: 10px; }
        .teb-stamp { display: inline-block; font-family: monospace; font-size: 12px; font-weight: 800; letter-spacing: 1.2px; line-height: 1.4; text-transform: uppercase; padding: 1px 6px; margin-right: 8px; vertical-align: 1px; }
        .teb-stamp-yes { color: #8fe0a8; border: 1px solid #6cc97e; }
        .teb-stamp-rep { color: #e0a13a; border: 1px solid rgba(224,161,58,0.6); }
        .teb-stamp-no { color: #ffb400; border: 1px solid rgba(255,180,0,0.6); }
        @media (max-width: 899px) {
          .teb-board { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .teb-loop { flex-direction: column; }
          .teb-arrow { transform: rotate(90deg); }
        }
      `}</style>

      {/* 1. Three tree plates, one per official tree (TraitPlates: structure plus an example path). */}
      <section aria-label="Trait trees" style={{ marginBottom: 12 }}>
        <TraitPlates trees={trees} selected={selected} onSelect={select} panelRefs={panelRefs} />
        <p className="teb-note">
          {treeNote}
        </p>
        <p className="teb-layout-caption">
          {layoutCaption}
        </p>

        {/* 2. Tree drawers. All three are in the HTML; JS shows only the selected one. */}
        <div aria-live="polite">
          {trees.map(function (t) {
            return (
              <details key={t.slug} id={'trait-tree-drawer-' + t.slug} className="teb-drawer" open={selected === t.slug} style={{ '--tree-accent': t.accent }}>
                <summary>{t.label + ': tree status'}</summary>
                <div className="teb-drawer-name">{t.label}</div>
                <p className="teb-drawer-fact">
                  {focusFact.text + ' '}<span className="teb-srcl">(Source: <SourceLink src={focusFact.src} />)</span>
                </p>
                <div className="teb-drawer-lbl">Still unconfirmed for this tree</div>
                <ul className="teb-drawer-list">
                  {treeUnconfirmed.map(function (u) { return <li key={u}>{u}</li>; })}
                </ul>
              </details>
            );
          })}
        </div>
      </section>

      {/* Empty note (our own data status, not a game fact). */}
      <div className="hk-cut teb-await">
        <div className="teb-await-lbl">Awaiting verification</div>
        <p>{emptyNote}</p>
      </div>

      {/* 3. The loop: confirmed steps only, each citing its fact's source. */}
      <section aria-labelledby="teb-loop-h" style={{ marginBottom: 28 }}>
        <h2 id="teb-loop-h" className="teb-h2">The trait loop</h2>
        <div className="teb-loop">
          <div className="hk-cut teb-step"><span className="teb-step-title">Mission</span><span className="teb-step-src">per <SourceLink src={loopFact.src} /></span></div>
          <span className="teb-arrow" aria-hidden="true">--&gt;</span>
          <div className="hk-cut teb-step"><span className="teb-step-title">Trait Points earned</span><span className="teb-step-src">per <SourceLink src={loopFact.src} /></span></div>
          <span className="teb-arrow" aria-hidden="true">--&gt;</span>
          <div className="hk-cut teb-step"><span className="teb-step-title">Spent on that Operator only</span><span className="teb-step-src">per <SourceLink src={loopFact.src} /></span></div>
        </div>
        <div className="teb-loop" style={{ marginTop: 8 }}>
          <div className="teb-step teb-step-unknown"><span className="teb-step-title">{NOT_CONFIRMED_STEP}</span></div>
        </div>
        <div className="teb-loop" style={{ marginTop: 8 }}>
          <div className="hk-cut teb-step"><span className="teb-step-title">Dog Tag level</span><span className="teb-step-src">per <SourceLink src={dogTagFact.src} /></span></div>
          <span className="teb-arrow" aria-hidden="true">--&gt;</span>
          <div className="hk-cut teb-step"><span className="teb-step-title">Operator Traits</span><span className="teb-step-src">per <SourceLink src={dogTagFact.src} /></span></div>
        </div>
      </section>

      {/* 4. Intel status board. Header counts come from the three lists. */}
      <section aria-labelledby="teb-board-h">
        <div className="teb-board-head">
          <h2 id="teb-board-h" className="teb-h2">Intel status</h2>
          <span className="teb-status-count">{facts.length + ' confirmed, ' + attributed.length + ' reported, ' + unconfirmed.length + ' unconfirmed'}</span>
        </div>
        <div className="teb-board">
          <div className="hk-cut teb-col teb-col-yes">
            <h3>Confirmed</h3>
            <ul>
              {facts.map(function (f) {
                return <li key={f.text}><span className="teb-stamp teb-stamp-yes">Confirmed</span>{f.text + ' '}<span className="teb-srcl">(Source: <SourceLink src={f.src} />)</span></li>;
              })}
            </ul>
          </div>
          {/* Reported (the network "attributed" tier): structure from published screenshots, below confirmed. */}
          <div className="hk-cut teb-col teb-col-rep">
            <h3>Reported, not yet confirmed by us</h3>
            <ul>
              {attributed.map(function (f) {
                return <li key={f.text}><span className="teb-stamp teb-stamp-rep">Reported</span>{f.text + ' '}<span className="teb-srcl">(Source: <SourceLink src={f.src} />)</span></li>;
              })}
            </ul>
          </div>
          <div className="hk-cut teb-col teb-col-no">
            <h3>Waiting on</h3>
            <ul>
              {unconfirmed.map(function (u) {
                return <li key={u}><span className="teb-stamp teb-stamp-no">Unconfirmed</span>{u}</li>;
              })}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
