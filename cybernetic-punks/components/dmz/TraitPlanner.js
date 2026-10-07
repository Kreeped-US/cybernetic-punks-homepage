'use client';
// components/dmz/TraitPlanner.js
// Interactive DMZ trait planner (client island for app/dmz/traits/page.js).
//
// Renders ONLY the columns/nodes it is given (lib/dmz/traits.js buildColumns). Unverified nodes arrive
// already redacted to their position and render as "Unconfirmed" placeholders that cannot be picked;
// their name, effect or cost never reach this component. All planner logic is the pure state in
// lib/dmz/traitBuild.js: one budget + one set of picks PER OPERATOR (points never move between
// Operators), undo/redo, reset. State lives in memory only -- no URL, no storage, no share UI.

import { useMemo, useState } from 'react';
import {
  createHistory, commit, undo, redo, reset, togglePick, setBudget, addOperator, removeOperator,
  setActive, operatorTotals, pickBlocker, isSelectable,
} from '@/lib/dmz/traitBuild';

var UNCONFIRMED = '#ffb400';

function nodeTitle(n) {
  if (!n.verified) return 'Unconfirmed';
  return n.name || 'Unnamed (verified row without a name)';
}

export default function TraitPlanner({ columns, tierRule }) {
  var [history, setHistory] = useState(function () { return createHistory(); });
  var [focus, setFocus] = useState(null);
  var state = history.present;
  var op = state.operators[state.active];

  // slug -> node, with its tree slug so per-row rules can compare rows.
  var nodes = useMemo(function () {
    var map = {};
    (columns || []).forEach(function (col) {
      col.nodes.forEach(function (n) { map[n.slug] = Object.assign({ tree: col.slug }, n); });
    });
    return map;
  }, [columns]);

  var totals = operatorTotals(op, nodes);
  var focused = focus ? nodes[focus] : null;

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

  var btn = { fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 2, padding: '7px 12px', cursor: 'pointer' };

  return (
    <section aria-label="Trait planner" className="tp-root">
      <style>{`
        .tp-node { transition: box-shadow 220ms ease, border-color 220ms ease; }
        .tp-node.tp-picked { border-color: var(--green) !important; box-shadow: 0 0 0 1px var(--green), 0 0 14px rgba(0, 255, 140, 0.35); animation: tp-glow 420ms ease-out; }
        @keyframes tp-glow { 0% { box-shadow: 0 0 0 1px var(--green), 0 0 0 rgba(0, 255, 140, 0); } 50% { box-shadow: 0 0 0 1px var(--green), 0 0 22px rgba(0, 255, 140, 0.6); } 100% { box-shadow: 0 0 0 1px var(--green), 0 0 14px rgba(0, 255, 140, 0.35); } }
        .tp-node:focus-visible, .tp-btn:focus-visible { outline: 2px solid var(--green); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { .tp-node, .tp-node.tp-picked { transition: none; animation: none; } }
      `}</style>

      {/* Operators: each has its own budget and picks. No cap on how many (the real limit is unconfirmed). */}
      <div role="tablist" aria-label="Operators" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {state.operators.map(function (o, i) {
          var on = i === state.active;
          return (
            <button key={o.id} type="button" role="tab" aria-selected={on} className="tp-btn"
              onClick={function () { apply(function (s) { return setActive(s, i); }); }}
              style={Object.assign({}, btn, on ? { color: '#fff', borderColor: 'var(--green)' } : {})}>
              {'Operator ' + o.id}
            </button>
          );
        })}
        <button type="button" className="tp-btn" style={btn} onClick={function () { apply(addOperator); }}>+ Add Operator</button>
        {state.operators.length > 1 && (
          <button type="button" className="tp-btn" style={btn} onClick={function () { apply(function (s) { return removeOperator(s, s.active); }); }}>Remove this Operator</button>
        )}
      </div>

      {/* Points for the ACTIVE Operator only. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '12px 14px', marginBottom: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
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

      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <button type="button" className="tp-btn" style={btn} disabled={!history.past.length} onClick={function () { setHistory(undo); }}>Undo</button>
        <button type="button" className="tp-btn" style={btn} disabled={!history.future.length} onClick={function () { setHistory(redo); }}>Redo</button>
        <button type="button" className="tp-btn" style={btn} onClick={function () { setHistory(reset); setFocus(null); }}>Reset all</button>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          {tierRule === 'pick_one' ? 'Pick rule: one trait per row.' : tierRule === 'buy_all' ? 'Pick rule: any number of traits per row.' : 'Pick rule: not yet confirmed. The planner does not limit picks per row.'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {columns.map(function (col) {
          return (
            <div key={col.slug || 'unassigned'} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: col.label ? '#fff' : UNCONFIRMED }}>
                  {col.slug == null ? 'Tree not yet known' : (col.label || 'Unconfirmed tree')}
                </span>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>{col.verifiedCount + ' of ' + col.total + ' verified'}</span>
              </div>
              {rowsOf(col).map(function (row) {
                return (
                  <div key={row.key} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                    {row.nodes.map(function (n) {
                      var picked = op.picks.indexOf(n.slug) !== -1;
                      var blocker = picked ? null : pickBlocker(state, n.slug, nodes, tierRule);
                      var selectable = isSelectable(n);
                      return (
                        <button key={n.slug} type="button"
                          className={'tp-node' + (picked ? ' tp-picked' : '')}
                          aria-pressed={selectable ? picked : undefined}
                          aria-disabled={!picked && blocker ? true : undefined}
                          data-verified={n.verified ? 'true' : 'false'}
                          onClick={function () {
                            setFocus(n.slug);
                            if (picked || !blocker) apply(function (s) { return togglePick(s, n.slug, nodes, tierRule); });
                          }}
                          style={{ flex: 1, minWidth: 0, minHeight: 54, textAlign: 'left', cursor: 'pointer', background: 'var(--bg-page)', color: n.verified ? '#fff' : UNCONFIRMED, border: '1px ' + (n.verified ? 'solid var(--border)' : 'dashed ' + UNCONFIRMED), borderRadius: 3, padding: '7px 8px', opacity: !picked && blocker && n.verified ? 0.6 : 1 }}>
                          <span style={{ display: 'block', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.verified ? nodeTitle(n) : '?'}</span>
                          <span style={{ display: 'block', fontSize: 10, fontFamily: 'monospace', marginTop: 3, color: n.verified ? 'var(--text-tertiary)' : UNCONFIRMED }}>
                            {!n.verified ? 'Unconfirmed' : selectable ? n.cost + (n.cost === 1 ? ' pt' : ' pts') : 'Cost unknown'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Detail panel for the last node clicked. */}
      <div aria-live="polite" style={{ marginTop: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '14px 16px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        {!focused && <span style={{ color: 'var(--text-tertiary)' }}>Select a trait to see its details.</span>}
        {focused && !focused.verified && (
          <span><strong style={{ color: UNCONFIRMED }}>Unconfirmed.</strong> This slot has not been verified yet, so its name, effect and cost are not shown.</span>
        )}
        {focused && focused.verified && (
          <div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{nodeTitle(focused)}</div>
            <div>{focused.effect || 'Effect not yet documented.'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {'Cost: ' + (Number.isInteger(focused.cost) ? focused.cost : 'unknown') + ' | Level required: ' + (Number.isInteger(focused.level) ? focused.level : 'unknown')}
            </div>
            {(focused.source || focused.sourceUrl) && (
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
                {'Verified: '}
                {focused.sourceUrl
                  ? <a href={focused.sourceUrl} rel="nofollow noopener" target="_blank" style={{ color: 'var(--green)' }}>{focused.source || 'source'}</a>
                  : focused.source}
              </div>
            )}
            {pickBlocker(state, focused.slug, nodes, tierRule) === 'over-budget' && (
              <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 4 }}>Not enough points left for this Operator.</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
