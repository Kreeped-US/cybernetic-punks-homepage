'use client';
// components/dmz/TraitPlates.js
// The three trait tree PLATES on the /dmz/traits empty board (Brief 104). Client component for interaction
// only; the page stays a server component and TraitEmptyBoard renders these plates.
//
// REST STATE (the server HTML, identical for crawlers and no-JS): every node outlined, no connectors, the
// status line "Select to trace an example path". Nothing is drawn between nodes unless a run is active.
//
// RUN: activating a plate selects its tree (the drawer below follows, via onSelect) and traces that tree's
// EXAMPLE PATH (lib/dmz/traitLayout.js; illustrative only, not data) from the Start node up, one pick per
// row. Every node and connector of a run is rendered in its FINAL lit state; the climb is CSS animation
// layered on top inside @media (prefers-reduced-motion: no-preference), so with reduced motion the final
// state shows at once and the status reads complete. Activating again clears the run and restarts it after
// ~60ms; only one plate runs at a time; all timers are cleared on unmount.
//
// HONESTY: no trait names, no costs, no point numbers. The row shape is DERIVED from TRAIT_TREE_ROWS; only
// the drawing geometry (pixel positions and sizes) lives here.

import { useEffect, useRef, useState } from 'react';
import { TRAIT_TREE_ROWS, traitTreeSlots, EXAMPLE_PATHS } from '@/lib/dmz/traitLayout';

// Drawing geometry (px, inside the 300 x 540 stage): node center x by column, y by row (top to bottom),
// node size by kind. Start is always a circle.
var X_BY_COL = [66, 150, 234];
var Y_BY_ROW = [50, 110, 156, 216, 276, 322, 382, 442, 500];
var SIZE = { major: 42, minor: 26, start: 30 };
var ROWS = TRAIT_TREE_ROWS.length;
var SLOTS = traitTreeSlots();

// Plate silhouette and node shape per tree. Unknown slugs fall back to the Scout look.
var LOOK = {
  warfighter: { plate: 'chamfer', node: 'hex' },
  scout: { plate: 'arch', node: 'circle' },
  survivalist: { plate: 'cut', node: 'square' },
};

var STATUS_REST = 'Select to trace an example path';
var STATUS_START = 'Tracing from the Start node';
var STATUS_DONE = 'Example path complete: ' + ROWS + ' picks';

// Seconds: when the pick k rows above the Start node (k = 0 is the Start node) lights up.
function igniteAt(k) { return 0.35 + 0.6 * k; }

// The example path as slots, Start first (k = 0) up to row 1 (k = ROWS - 1). Null if the tree has none.
function pathSlots(slug) {
  var path = EXAMPLE_PATHS[slug];
  if (!path) return null;
  var out = [];
  for (var row = ROWS; row >= 1; row--) {
    var pick = path[row - 1];
    var slot = SLOTS.filter(function (s) { return s.row === row && s.index === pick; })[0];
    if (!slot) return null;
    out.push(slot);
  }
  return out;
}

function at(s) { return { x: X_BY_COL[s.col], y: Y_BY_ROW[s.row - 1] }; }

// Right-angled connector from the lower pick to the upper pick, as 3px bars (centered on the line).
function connectorBars(lower, upper, k) {
  var a = at(lower);
  var b = at(upper);
  var t0 = igniteAt(k) - 0.42;
  if (a.x === b.x) {
    return [{ dir: 'v', left: a.x - 1.5, top: b.y, width: 3, height: a.y - b.y, dur: 0.3, delay: t0 }];
  }
  var mid = (a.y + b.y) / 2;
  return [
    { dir: 'v', left: a.x - 1.5, top: mid - 1.5, width: 3, height: a.y - mid + 1.5, dur: 0.14, delay: t0 },
    { dir: b.x > a.x ? 'r' : 'l', left: Math.min(a.x, b.x) - 1.5, top: mid - 1.5, width: Math.abs(b.x - a.x) + 3, height: 3, dur: 0.14, delay: t0 + 0.14 },
    { dir: 'v', left: b.x - 1.5, top: b.y, width: 3, height: mid - b.y + 1.5, dur: 0.14, delay: t0 + 0.28 },
  ];
}

function Plate({ tree, pressed, run, status, onActivate, buttonRef }) {
  var look = LOOK[tree.slug] || LOOK.scout;
  var picks = run ? pathSlots(tree.slug) : null;
  var pickKey = {};
  var rowDelay = {};
  if (picks) {
    picks.forEach(function (s, k) { pickKey[s.row + '-' + s.col] = true; rowDelay[s.row] = igniteAt(k); });
  }
  var bars = [];
  if (picks) {
    for (var k = 1; k < picks.length; k++) bars = bars.concat(connectorBars(picks[k - 1], picks[k], k));
  }
  return (
    <button type="button" className="teb-panel" ref={buttonRef}
      data-plate={look.plate} data-node={look.node}
      aria-pressed={pressed} aria-expanded={pressed} aria-controls={'trait-tree-drawer-' + tree.slug}
      aria-label={'Trace an example path on the ' + tree.label + ' tree'}
      onClick={onActivate}
      style={{ '--tree': tree.accent }}>
      <span className="tpl-sil" aria-hidden="true" />
      <span className="tpl-face" aria-hidden="true" />
      <span className="tpl-head">
        <span className="teb-label">{tree.label}</span>
        <span className="tpl-status" aria-live="polite">{status}</span>
      </span>
      <span className="tpl-stage" aria-hidden="true" key={run ? 'run-' + run.id : 'rest'}>
        {bars.map(function (b, i) {
          return <span key={'b' + i} className={'tpl-bar tpl-bar-' + b.dir} style={{ left: b.left, top: b.top, width: b.width, height: b.height, '--dur': b.dur + 's', '--d': b.delay.toFixed(2) + 's' }} />;
        })}
        {SLOTS.map(function (s) {
          var key = s.row + '-' + s.col;
          var size = SIZE[s.kind];
          var p = at(s);
          var state = picks ? (pickKey[key] ? ' tpl-lit' : ' tpl-dim') : '';
          var style = { left: p.x - size / 2, top: p.y - size / 2, width: size, height: size };
          if (picks) style['--d'] = rowDelay[s.row].toFixed(2) + 's';
          return (
            <span key={key} className={'teb-slot teb-slot-' + s.kind + ' tpl-node' + state} style={style}>
              <span className="tpl-ping" />
              <span className="tpl-shape"><span className="tpl-edge" /><span className="tpl-core" /></span>
              <span className="tpl-mark">{s.kind === 'minor' ? '?' : ''}</span>
            </span>
          );
        })}
      </span>
    </button>
  );
}

export default function TraitPlates({ trees, selected, onSelect, panelRefs }) {
  var [run, setRun] = useState(null);
  var [status, setStatus] = useState(STATUS_REST);
  var timers = useRef([]);
  var nextId = useRef(1);

  function clearTimers() {
    timers.current.forEach(function (t) { clearTimeout(t); });
    timers.current = [];
  }
  useEffect(function () { return clearTimers; }, []);

  function later(ms, fn) { timers.current.push(setTimeout(fn, ms)); }

  function activate(slug) {
    onSelect(slug);
    clearTimers();
    setRun(null);
    setStatus(STATUS_REST);
    var reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    later(60, function () {
      setRun({ slug: slug, id: nextId.current++ });
      if (reduced) { setStatus(STATUS_DONE); return; }
      setStatus(STATUS_START);
      for (var k = 0; k < ROWS; k++) {
        (function (n) { later(Math.round((igniteAt(n) + 0.15) * 1000), function () { setStatus('Branch ' + (n + 1) + ' of ' + ROWS); }); })(k);
      }
      later(Math.round((igniteAt(ROWS - 1) + 0.75) * 1000), function () { setStatus(STATUS_DONE); });
    });
  }

  return (
    <div className="tpl-root">
      <style>{`
        .tpl-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 28px; }
        .tpl-root .teb-panel { position: relative; flex: none; width: 300px; height: 612px; padding: 0; margin: 0; border: 0; background: transparent; color: #fff; font: inherit; cursor: pointer; text-align: center; --plate-dark: var(--bg-card); --edge: color-mix(in srgb, var(--tree) 40%, transparent); }
        .tpl-root .teb-panel:hover, .tpl-root .teb-panel[aria-pressed="true"] { --edge: color-mix(in srgb, var(--tree) 95%, transparent); }
        .tpl-root .teb-panel:focus-visible { outline: 2px solid var(--tree); outline-offset: 6px; }
        .tpl-sil, .tpl-face { position: absolute; pointer-events: none; }
        .tpl-sil { inset: 0; background: var(--edge); }
        .tpl-face { inset: 2px; background-color: var(--plate-dark); background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px); }
        [data-plate="chamfer"] .tpl-sil { clip-path: polygon(28px 0, calc(100% - 28px) 0, 100% 28px, 100% 100%, 0 100%, 0 28px); }
        [data-plate="chamfer"] .tpl-face { clip-path: polygon(27px 0, calc(100% - 27px) 0, 100% 27px, 100% 100%, 0 100%, 0 27px); }
        [data-plate="arch"] .tpl-sil { border-radius: 150px 150px 6px 6px; }
        [data-plate="arch"] .tpl-face { border-radius: 148px 148px 4px 4px; }
        [data-plate="cut"] .tpl-sil { clip-path: polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 24px 100%, 0 calc(100% - 24px)); }
        [data-plate="cut"] .tpl-face { clip-path: polygon(0 0, calc(100% - 23px) 0, 100% 23px, 100% 100%, 23px 100%, 0 calc(100% - 23px)); }
        .tpl-head { position: absolute; top: 20px; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }
        .tpl-root .teb-label { font-family: Orbitron, monospace; font-size: 32px; font-weight: 800; line-height: 1.1; color: var(--tree); }
        .tpl-status { font-size: 13px; line-height: 1.2; color: rgba(255,255,255,0.62); }
        .tpl-stage { position: absolute; top: 76px; left: 0; width: 300px; height: 540px; }
        .tpl-node { position: absolute; z-index: 1; display: block; --mark-rest: color-mix(in srgb, var(--tree) 50%, transparent); }
        .tpl-node.teb-slot-minor { --mark-rest: rgba(255,255,255,0.45); }
        .tpl-shape, .tpl-edge, .tpl-core, .tpl-ping { position: absolute; display: block; }
        .tpl-shape, .tpl-edge, .tpl-ping { inset: 0; }
        .tpl-core { inset: 2px; background: var(--plate-dark); }
        .tpl-edge { background: color-mix(in srgb, var(--tree) 50%, transparent); }
        [data-node="hex"] .tpl-node:not(.teb-slot-start) .tpl-edge, [data-node="hex"] .tpl-node:not(.teb-slot-start) .tpl-core { clip-path: polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%); }
        [data-node="circle"] .tpl-edge, [data-node="circle"] .tpl-core, .teb-slot-start .tpl-edge, .teb-slot-start .tpl-core, .teb-slot-start .tpl-ping, [data-node="hex"] .tpl-ping, [data-node="circle"] .tpl-ping { border-radius: 50%; }
        [data-node="square"] .tpl-node:not(.teb-slot-start) .tpl-edge, [data-node="square"] .tpl-node:not(.teb-slot-start) .tpl-ping { border-radius: 4px; }
        [data-node="square"] .tpl-node:not(.teb-slot-start) .tpl-core { border-radius: 3px; }
        .tpl-ping { display: none; border: 2px solid var(--tree); pointer-events: none; }
        .tpl-mark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 11px; font-weight: 700; color: var(--mark-rest); }
        .teb-slot-major .tpl-mark::before { content: ''; width: 9px; height: 9px; background: currentColor; transform: rotate(45deg); }
        .teb-slot-start .tpl-mark::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
        .tpl-lit .tpl-edge { background: var(--tree); }
        .tpl-lit .tpl-core { background: color-mix(in srgb, var(--tree) 70%, var(--plate-dark)); }
        .tpl-lit .tpl-mark { color: #fff; }
        .tpl-dim { opacity: 0.16; }
        .tpl-bar { position: absolute; z-index: 0; display: block; background: var(--tree); box-shadow: 0 0 10px var(--tree); }
        .tpl-bar-v { transform-origin: 50% 100%; }
        .tpl-bar-r { transform-origin: 0 50%; }
        .tpl-bar-l { transform-origin: 100% 50%; }
        @media (prefers-reduced-motion: no-preference) {
          .tpl-sil { transition: background-color 200ms ease; }
          .tpl-lit .tpl-edge { animation: tpl-edge-on 0.3s ease-out var(--d) both; }
          .tpl-lit .tpl-core { animation: tpl-core-on 0.3s ease-out var(--d) both; }
          .tpl-lit .tpl-mark { animation: tpl-mark-on 0.3s ease-out var(--d) both; }
          .tpl-lit .tpl-ping { display: block; opacity: 0; animation: tpl-ping 0.75s ease-out var(--d) forwards; }
          .tpl-dim { animation: tpl-dim 0.45s ease-out var(--d) both; }
          .tpl-bar-v { animation: tpl-grow-y var(--dur) linear var(--d) both; }
          .tpl-bar-r, .tpl-bar-l { animation: tpl-grow-x var(--dur) linear var(--d) both; }
          @keyframes tpl-edge-on { from { background: color-mix(in srgb, var(--tree) 50%, transparent); } to { background: var(--tree); } }
          @keyframes tpl-core-on { from { background: var(--plate-dark); } to { background: color-mix(in srgb, var(--tree) 70%, var(--plate-dark)); } }
          @keyframes tpl-mark-on { from { color: var(--mark-rest); } to { color: #fff; } }
          @keyframes tpl-ping { from { transform: scale(1); opacity: 0.9; } to { transform: scale(2.3); opacity: 0; } }
          @keyframes tpl-dim { from { opacity: 1; } to { opacity: 0.16; } }
          @keyframes tpl-grow-y { from { transform: scaleY(0); } to { transform: scaleY(1); } }
          @keyframes tpl-grow-x { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        }
        .tpl-legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 22px; margin: 18px 0 0; padding: 0; list-style: none; font-size: 12px; color: var(--text-secondary); }
        .tpl-legend li { display: flex; align-items: center; gap: 8px; }
        .tpl-key { display: inline-flex; align-items: center; justify-content: center; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.4); font-family: monospace; font-size: 10px; font-weight: 700; color: rgba(255,255,255,0.6); }
        .tpl-key-major::before { content: ''; width: 5px; height: 5px; background: rgba(255,255,255,0.6); transform: rotate(45deg); }
        .tpl-key-start { border-radius: 50%; }
        .tpl-key-start::before { content: ''; width: 4px; height: 4px; border-radius: 50%; background: rgba(255,255,255,0.6); }
      `}</style>
      <div className="tpl-row">
        {trees.map(function (t) {
          var running = run && run.slug === t.slug ? run : null;
          return (
            <Plate key={t.slug} tree={t} pressed={selected === t.slug} run={running}
              status={running ? status : STATUS_REST}
              onActivate={function () { activate(t.slug); }}
              buttonRef={function (el) { if (panelRefs) panelRefs.current[t.slug] = el; }} />
          );
        })}
      </div>
      <ul className="tpl-legend">
        <li><span className="tpl-key tpl-key-major" aria-hidden="true" />Major: visible from the start</li>
        <li><span className="tpl-key" aria-hidden="true">?</span>Minor: hidden until its branch opens</li>
        <li><span className="tpl-key tpl-key-start" aria-hidden="true" />Start: the first pick</li>
      </ul>
    </div>
  );
}
