'use client';
// components/dmz/TraitPlanner.js
// Interactive DMZ trait planner (client island for app/dmz/traits/page.js; renders only when at least
// one VERIFIED trait row exists).
//
// Renders ONLY the columns/nodes it is given (lib/dmz/traits.js buildColumns). Unverified nodes arrive
// already redacted to their position and render as hatched "?" octagons marked "Unconfirmed" that
// cannot be picked; their name, effect or cost never reach this component. No connector lines and no
// prerequisite logic (prerequisites are unconfirmed). No art that implies what a trait does: a node's
// face is its verified name, or "?". All planner logic is the pure state in lib/dmz/traitBuild.js:
// one budget + one set of picks PER OPERATOR (points never move between Operators), undo/redo, reset.
// State lives in memory only -- no URL, no storage, no share UI.
//
// Tree colours follow column ORDER (1st red, 2nd gold, 3rd teal, extras neutral), never a tree name.
// Glow, burst and transitions run only under prefers-reduced-motion: no-preference; the focus ring is
// always visible. Phones (<= 640px) show one tree at a time behind tree tabs.

import { useMemo, useState } from 'react';
import {
  createHistory, createPlannerState, commit, undo, redo, reset, togglePick, setBudget, addOperator,
  removeOperator, setActive, operatorTotals, pickBlocker, isSelectable, picksByTree, compareOperators,
} from '@/lib/dmz/traitBuild';

export var TREE_COLOURS = ['#e8604a', '#d9a947', '#3fbfae'];
export var NEUTRAL_COLOUR = '#8b95a5';
var UNCONFIRMED = '#ffb400';

export function treeColour(index) {
  return index >= 0 && index < TREE_COLOURS.length ? TREE_COLOURS[index] : NEUTRAL_COLOUR;
}

function treeTitle(col) {
  if (col.slug == null) return 'Tree not yet known';
  return col.label || 'Unconfirmed tree';
}

function nodeName(n) {
  return n.name || 'Unnamed (verified row without a name)';
}

// Detail-panel stamp for a verified node: says so when no source was recorded on the row.
export function verifiedStamp(n) {
  return n.source || n.sourceUrl ? 'Verified' : 'Verified, source not recorded';
}

var CSS = `
.tp-root { --tp-gap: 12px; }
.tp-btn { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background: transparent; color: var(--text-secondary); border: 1px solid var(--border); border-radius: 2px; padding: 7px 12px; cursor: pointer; }
.tp-btn[aria-selected="true"] { color: #fff; border-color: var(--green); }
.tp-btn:disabled { opacity: 0.45; cursor: default; }
.tp-btn:focus-visible, .tp-node:focus-visible, .tp-treetab:focus-visible { outline: 2px solid var(--tp-accent, var(--green)); outline-offset: 2px; }
.tp-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 4px; padding: 14px 16px; }
.tp-kicker { font-family: monospace; font-size: 10px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text-tertiary); }
.tp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--tp-gap); }
.tp-col { background: var(--bg-card); background-image: repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px); border: 1px solid var(--border); border-top: 2px solid var(--tp-accent); border-radius: 6px; padding: 12px; }
.tp-col-head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 4px; }
.tp-col-title { font-family: Orbitron, monospace; font-size: 14px; font-weight: 800; color: var(--tp-accent); }
.tp-col-title.tp-unconfirmed { color: ${UNCONFIRMED}; }
.tp-col-meta { font-family: monospace; font-size: 10px; color: var(--text-tertiary); }
.tp-tier { display: flex; align-items: flex-start; gap: 8px; margin-top: 10px; }
.tp-tier-label { flex: 0 0 auto; width: 34px; padding-top: 30px; font-family: monospace; font-size: 10px; font-weight: 700; color: var(--text-tertiary); }
.tp-tier-nodes { display: flex; flex-wrap: wrap; gap: 8px; }
.tp-node { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; width: 84px; padding: 0; background: transparent; border: 0; color: #fff; cursor: pointer; font: inherit; }
.tp-node[aria-disabled="true"] { cursor: default; }
.tp-oct { position: relative; display: block; width: 76px; height: 76px; }
.tp-oct svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.tp-oct-shape { fill: var(--bg-page); stroke: var(--border); stroke-width: 3; }
.tp-node.tp-picked .tp-oct-shape { fill: color-mix(in srgb, var(--tp-accent) 28%, var(--bg-page)); stroke: var(--tp-accent); }
.tp-node.tp-nocost .tp-oct-shape { stroke-dasharray: 7 5; }
.tp-node.tp-blocked .tp-oct { opacity: 0.55; }
.tp-node.tp-unverified .tp-oct-shape { fill: url(#tp-hatch); stroke: ${UNCONFIRMED}; stroke-dasharray: 7 5; }
.tp-face { position: absolute; inset: 14px 10px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 9.5px; font-weight: 700; line-height: 1.15; overflow: hidden; word-break: break-word; }
.tp-node.tp-unverified .tp-face { font-size: 22px; color: ${UNCONFIRMED}; }
.tp-sub { font-family: monospace; font-size: 10px; color: var(--text-tertiary); text-align: center; }
.tp-node.tp-unverified .tp-sub { color: ${UNCONFIRMED}; }
.tp-burst { display: none; }
.tp-treetabs { display: none; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
.tp-treetab { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; background: transparent; color: var(--text-secondary); border: 1px solid var(--border); border-bottom: 2px solid transparent; border-radius: 2px; padding: 7px 10px; cursor: pointer; }
.tp-treetab[aria-selected="true"] { color: #fff; border-bottom-color: var(--tp-accent); }
.tp-stamp { display: inline-block; font-family: monospace; font-size: 9px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; border-radius: 2px; padding: 2px 6px; margin-right: 8px; }
.tp-stamp-yes { color: var(--green); border: 1px solid var(--green); }
.tp-stamp-no { color: ${UNCONFIRMED}; border: 1px solid rgba(255,180,0,0.5); }
.tp-table { width: 100%; border-collapse: collapse; font-size: 13px; color: var(--text-secondary); }
.tp-table th, .tp-table td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--border); }
.tp-table th { font-family: monospace; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-tertiary); font-weight: 700; }
@media (prefers-reduced-motion: no-preference) {
  .tp-oct svg { transition: filter 200ms ease; }
  .tp-node:hover .tp-oct svg, .tp-node:focus-visible .tp-oct svg { filter: drop-shadow(0 0 7px var(--tp-accent)); }
  .tp-node.tp-picked .tp-oct svg { filter: drop-shadow(0 0 5px var(--tp-accent)); }
  .tp-burst { display: block; position: absolute; inset: 0; border-radius: 50%; border: 2px solid var(--tp-accent); pointer-events: none; animation: tp-burst 560ms ease-out forwards; }
  @keyframes tp-burst { 0% { transform: scale(0.7); opacity: 0.9; } 100% { transform: scale(1.9); opacity: 0; } }
}
@media (max-width: 640px) {
  .tp-treetabs { display: flex; }
  .tp-grid { grid-template-columns: 1fr; }
  .tp-col { display: none; }
  .tp-col.tp-col-on { display: block; }
}
`;

export default function TraitPlanner({ columns, tierRule, initialState }) {
  var [history, setHistory] = useState(function () { return createHistory(initialState || createPlannerState()); });
  var [focus, setFocus] = useState(null);
  var [activeTree, setActiveTree] = useState(0);
  var [burst, setBurst] = useState(null);
  var state = history.present;
  var op = state.operators[state.active];
  var cols = columns || [];

  // slug -> node, with its tree slug so per-row rules can compare rows; plus tree order and colours.
  var nodes = useMemo(function () {
    var map = {};
    cols.forEach(function (col) {
      col.nodes.forEach(function (n) { map[n.slug] = Object.assign({ tree: col.slug }, n); });
    });
    return map;
  }, [cols]);
  var treeOrder = cols.map(function (c) { return c.slug; });

  var totals = operatorTotals(op, nodes);
  var focused = focus ? nodes[focus] : null;
  var focusedIndex = focused ? treeOrder.indexOf(focused.tree) : -1;

  function apply(fn) { setHistory(function (h) { return commit(h, fn(h.present)); }); }

  function rowsOf(col) {
    var tiers = [];
    var byTier = {};
    col.nodes.forEach(function (n) {
      var key = n.tier == null ? 'unknown' : String(n.tier);
      if (!byTier[key]) { byTier[key] = []; tiers.push(key); }
      byTier[key].push(n);
    });
    return tiers.map(function (k) { return { key: k, nodes: byTier[k] }; });
  }

  function onNode(n, picked, blocker) {
    setFocus(n.slug);
    if (!picked && blocker) return;
    apply(function (s) { return togglePick(s, n.slug, nodes, tierRule); });
    if (!picked) setBurst(function (b) { return { slug: n.slug, n: b ? b.n + 1 : 1 }; });
  }

  var route = picksByTree(op, nodes, treeOrder);
  var compare = state.operators.length >= 2 ? compareOperators(state.operators, nodes, treeOrder) : null;

  return (
    <section aria-label="Trait planner" className="tp-root">
      <style>{CSS}</style>
      {/* Hatch fill for unverified octagons (stripes are rects: no lines anywhere in the planner). */}
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: 'absolute' }}>
        <defs>
          <pattern id="tp-hatch" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <rect x="0" y="0" width="3" height="8" fill="rgba(255,180,0,0.32)" />
          </pattern>
        </defs>
      </svg>

      {/* 4. Operator file card: each Operator has its own budget and picks. No cap on how many. */}
      <div className="tp-card" style={{ marginBottom: 12 }}>
        <div className="tp-kicker" style={{ marginBottom: 8 }}>Operator file</div>
        <div role="tablist" aria-label="Operators" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {state.operators.map(function (o, i) {
            return (
              <button key={o.id} type="button" role="tab" aria-selected={i === state.active} className="tp-btn"
                onClick={function () { apply(function (s) { return setActive(s, i); }); }}>
                {'Operator ' + o.id}
              </button>
            );
          })}
          <button type="button" className="tp-btn" onClick={function () { apply(addOperator); }}>+ Add Operator</button>
          {state.operators.length > 1 && (
            <button type="button" className="tp-btn" onClick={function () { apply(function (s) { return removeOperator(s, s.active); }); }}>Remove this Operator</button>
          )}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', fontSize: 13, color: 'var(--text-secondary)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{'Operator ' + op.id + ' trait points'}</span>
            <input type="text" inputMode="numeric" aria-label="Trait points available for this Operator" placeholder="Your points"
              value={op.budget == null ? '' : String(op.budget)}
              onChange={function (e) { var v = e.target.value; apply(function (s) { return setBudget(s, v); }); }}
              style={{ width: 96, background: 'var(--bg-page)', color: '#fff', border: '1px solid var(--border)', borderRadius: 2, padding: '6px 8px', fontSize: 13 }} />
          </label>
          <span>{'Spent: ' + totals.spent}</span>
          {totals.remaining != null && (
            <span style={{ color: totals.over ? 'var(--red)' : 'var(--text-secondary)' }}>{'Remaining: ' + totals.remaining}</span>
          )}
          {totals.remaining == null && <span style={{ color: 'var(--text-tertiary)' }}>No cap set</span>}
          <span style={{ color: totals.unknownCostPicks ? UNCONFIRMED : 'var(--text-tertiary)' }}>{'Picks with unknown cost: ' + totals.unknownCostPicks}</span>
        </div>
      </div>

      {/* 7. Undo / redo / reset + the pick rule. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <button type="button" className="tp-btn" disabled={!history.past.length} onClick={function () { setHistory(undo); }}>Undo</button>
        <button type="button" className="tp-btn" disabled={!history.future.length} onClick={function () { setHistory(redo); }}>Redo</button>
        <button type="button" className="tp-btn" onClick={function () { setHistory(reset); setFocus(null); }}>Reset all</button>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {tierRule === 'pick_one' ? 'Pick rule: one trait per row.' : tierRule === 'buy_all' ? 'Pick rule: any number of traits per row.' : 'Pick rule: not yet confirmed. The planner does not limit picks per row.'}
        </span>
      </div>

      {/* 1. Phone tree tabs (shown at <= 640px only). */}
      <div role="tablist" aria-label="Trait trees" className="tp-treetabs">
        {cols.map(function (col, i) {
          return (
            <button key={col.slug || 'unassigned'} type="button" role="tab" className="tp-treetab"
              aria-selected={i === activeTree} aria-controls={'tp-col-' + i}
              style={{ '--tp-accent': treeColour(i) }}
              onClick={function () { setActiveTree(i); }}>
              {treeTitle(col)}
            </button>
          );
        })}
      </div>

      {/* 1 + 2. Tree columns with tier rows of octagon nodes. No connectors. */}
      <div className="tp-grid">
        {cols.map(function (col, i) {
          var accent = treeColour(i);
          var pickedHere = op.picks.filter(function (s) { return nodes[s] && nodes[s].tree === col.slug; }).length;
          return (
            <div key={col.slug || 'unassigned'} id={'tp-col-' + i} className={'tp-col' + (i === activeTree ? ' tp-col-on' : '')} data-tree-index={i} style={{ '--tp-accent': accent }}>
              <div className="tp-col-head">
                <span className={'tp-col-title' + (col.label ? '' : ' tp-unconfirmed')}>{treeTitle(col)}</span>
                <span className="tp-col-meta">{col.verifiedCount + ' of ' + col.total + ' verified'}</span>
              </div>
              <div className="tp-col-meta">{'Picked: ' + pickedHere}</div>
              {rowsOf(col).map(function (row) {
                return (
                  <div key={row.key} className="tp-tier">
                    <span className="tp-tier-label">{row.key === 'unknown' ? 'Tier unknown' : 'T' + row.key}</span>
                    <div className="tp-tier-nodes">
                      {row.nodes.map(function (n) {
                        var picked = op.picks.indexOf(n.slug) !== -1;
                        var blocker = picked ? null : pickBlocker(state, n.slug, nodes, tierRule);
                        var selectable = isSelectable(n);
                        var cls = 'tp-node' + (picked ? ' tp-picked' : '') + (!n.verified ? ' tp-unverified' : !selectable ? ' tp-nocost' : '') + (!picked && blocker === 'over-budget' ? ' tp-blocked' : '');
                        return (
                          <button key={n.slug} type="button" className={cls}
                            aria-pressed={selectable ? picked : undefined}
                            aria-disabled={!picked && blocker ? true : undefined}
                            aria-label={n.verified ? nodeName(n) : 'Unconfirmed trait slot'}
                            title={n.verified ? nodeName(n) : undefined}
                            data-verified={n.verified ? 'true' : 'false'}
                            onClick={function () { onNode(n, picked, blocker); }}>
                            <span className="tp-oct">
                              <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
                                <polygon className="tp-oct-shape" points="30,3 70,3 97,30 97,70 70,97 30,97 3,70 3,30" />
                              </svg>
                              <span className="tp-face" aria-hidden="true">{n.verified ? nodeName(n) : '?'}</span>
                              {burst && burst.slug === n.slug && picked && <span key={burst.n} className="tp-burst" aria-hidden="true" />}
                            </span>
                            <span className="tp-sub">
                              {!n.verified ? 'Unconfirmed' : selectable ? n.cost + (n.cost === 1 ? ' pt' : ' pts') : 'Cost unknown'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 3. Detail panel for the last node clicked. */}
      <div aria-live="polite" className="tp-card" style={{ marginTop: 14, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, '--tp-accent': focusedIndex >= 0 ? treeColour(focusedIndex) : 'var(--green)' }}>
        {!focused && <span style={{ color: 'var(--text-tertiary)' }}>Select a trait to see its details.</span>}
        {focused && !focused.verified && (
          <span><span className="tp-stamp tp-stamp-no">Unconfirmed</span>This slot has not been verified yet, so its name, effect and cost are not shown.</span>
        )}
        {focused && focused.verified && (
          <div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: 'var(--tp-accent)', marginBottom: 4 }}>{nodeName(focused)}</div>
            <div>{focused.effect || 'Effect not yet documented.'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {'Cost: ' + (Number.isInteger(focused.cost) ? focused.cost : 'unknown') + ' | Level required: ' + (Number.isInteger(focused.level) ? focused.level : 'unknown')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>
              <span className="tp-stamp tp-stamp-yes">{verifiedStamp(focused)}</span>
              {focused.sourceUrl
                ? <a href={focused.sourceUrl} rel="nofollow noopener" target="_blank" style={{ color: 'var(--green)' }}>{focused.source || 'source'}</a>
                : (focused.source || null)}
            </div>
            {pickBlocker(state, focused.slug, nodes, tierRule) === 'over-budget' && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>Not enough points left for this Operator.</div>
            )}
          </div>
        )}
      </div>

      {/* 5. Route summary for the active Operator. No build code, no share. */}
      <div className="tp-card" style={{ marginTop: 12 }}>
        <div className="tp-kicker" style={{ marginBottom: 8 }}>{'Route summary: Operator ' + op.id}</div>
        {route.every(function (r) { return !r.picks.length; }) ? (
          <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No picks yet.</span>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {route.map(function (r, i) {
              if (!r.picks.length) return null;
              return (
                <li key={r.tree || 'unassigned'} className="tp-route-tree" style={{ '--tp-accent': treeColour(i) }}>
                  <span style={{ color: 'var(--tp-accent)', fontWeight: 700 }}>{treeTitle(cols[i])}</span>
                  {': '}
                  {r.picks.map(function (p, k) {
                    return (
                      <span key={p.slug}>
                        {k > 0 ? ', ' : ''}
                        {nodeName(nodes[p.slug])}
                        {!p.costKnown && <span style={{ color: UNCONFIRMED }}> (cost unknown)</span>}
                      </span>
                    );
                  })}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 6. Compare Operators: only with 2+ Operators. */}
      {compare && (
        <div className="tp-card tp-compare" style={{ marginTop: 12, overflowX: 'auto' }}>
          <div className="tp-kicker" style={{ marginBottom: 8 }}>Compare Operators</div>
          <table className="tp-table">
            <thead>
              <tr>
                <th scope="col">Tree</th>
                {state.operators.map(function (o) { return <th key={o.id} scope="col">{'Operator ' + o.id}</th>; })}
                <th scope="col">Shared</th>
              </tr>
            </thead>
            <tbody>
              {compare.map(function (r, i) {
                return (
                  <tr key={r.tree || 'unassigned'}>
                    <th scope="row" style={{ color: treeColour(i) }}>{treeTitle(cols[i])}</th>
                    {r.counts.map(function (c, k) { return <td key={k}>{c}</td>; })}
                    <td>{r.shared}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
