'use client';
// components/dmz/DmzWeaponsTable.js
// The /dmz/weapons comparison table: every listed weapon in one table, in post order (grouped by class), with
// sortable columns. Rows are plain values from lib/dmz/weapons.js weaponTableRows (no functions cross the
// server/client boundary). A missing value renders as an empty cell, never "TBD" or 0, and sorts last.
// The table scrolls sideways inside its own box on narrow screens; the page never does.
// Brief 211: hub-kit colors (the --hk-* properties the page sets), no text under 12px, 44px sort buttons.

import Link from 'next/link';
import { useState } from 'react';

var COLUMNS = [
  { key: 'order', label: 'Weapon', numeric: false },
  { key: 'className', label: 'Class', numeric: false },
  { key: 'levels', label: 'Levels to max', numeric: true },
  { key: 'rounds', label: 'Rounds', numeric: true },
  { key: 'reserve', label: 'Reserve', numeric: true },
  { key: 'fireRpm', label: 'Fire rate', numeric: true },
];

// Sort a copy. Numeric columns start highest-first; missing values always go last; ties keep post order. The
// Weapon column sorts by post order (the default view, grouped by class).
export function sortRows(rows, key, dir) {
  var mult = dir === 'asc' ? 1 : -1;
  return rows.slice().sort(function (a, b) {
    var va = a[key], vb = b[key];
    var na = va === null || va === undefined || va === '', nb = vb === null || vb === undefined || vb === '';
    if (na !== nb) return na ? 1 : -1;
    if (!na && va !== vb) return (typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb))) * mult;
    return a.order - b.order;
  });
}

var TH = { textAlign: 'left', padding: 0, borderBottom: '1px solid var(--hk-line)', fontFamily: 'monospace', fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--hk-mute)', fontWeight: 700, whiteSpace: 'nowrap' };
var BTN = { display: 'inline-flex', alignItems: 'center', minHeight: 44, background: 'none', border: 0, padding: '0 10px', font: 'inherit', color: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap' };
var TD = { padding: '10px 10px', borderBottom: '1px solid var(--hk-line)', fontSize: 14, color: 'var(--hk-soft)', whiteSpace: 'nowrap' };
// The weapon link fills its cell: a 44px tap target.
var NAME = { display: 'flex', alignItems: 'center', minHeight: 44, padding: '0 10px', color: 'var(--hk-text)', fontWeight: 600, textDecoration: 'none' };

export default function DmzWeaponsTable({ rows, routeBase }) {
  var [sort, setSort] = useState({ key: 'order', dir: 'asc' });
  var sorted = sortRows(rows || [], sort.key, sort.dir);
  function onSort(col) {
    setSort(function (s) {
      if (s.key === col.key) return { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' };
      return { key: col.key, dir: col.numeric ? 'desc' : 'asc' };
    });
  }
  return (
    <div style={{ overflowX: 'auto', border: '1px solid var(--hk-line)', background: 'var(--hk-card)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
        <thead>
          <tr>
            {COLUMNS.map(function (c) {
              var active = sort.key === c.key;
              return (
                <th key={c.key} style={Object.assign({}, TH, c.numeric ? { textAlign: 'right' } : null)} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={function () { onSort(c); }} style={Object.assign({}, BTN, active ? { color: 'var(--hk-text)' } : null)}>
                    {c.label}{active ? (sort.dir === 'asc' ? ' \u2191' : ' \u2193') : ''}
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map(function (r) {
            return (
              <tr key={r.slug}>
                <td style={Object.assign({}, TD, { padding: 0 })}><Link href={routeBase + '/' + r.slug} style={NAME}>{r.name}</Link></td>
                <td style={TD}>{r.className}</td>
                <td style={Object.assign({}, TD, { textAlign: 'right' })}>{r.levels == null ? '' : r.levels}</td>
                <td style={Object.assign({}, TD, { textAlign: 'right' })}>{r.rounds == null ? '' : r.rounds}</td>
                <td style={Object.assign({}, TD, { textAlign: 'right' })}>{r.reserve == null ? '' : r.reserve}</td>
                <td style={Object.assign({}, TD, { textAlign: 'right' })}>{r.fire || ''}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
