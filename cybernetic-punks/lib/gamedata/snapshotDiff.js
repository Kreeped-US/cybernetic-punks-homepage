// lib/gamedata/snapshotDiff.js
// Compares two game-data snapshots (scripts/snapshot-game-data.mjs output, or the Oct 13 manual export, which
// has the same JSON and MANIFEST shape) on natural keys and returns one record per change, shaped like the
// game_data_changes table. PURE: no file, network or console access. The CLI (scripts/diff-game-snapshots.mjs)
// reads the files and passes their bytes in. Brief 308.
//
// Rules:
//   - Every table file is checked against its MANIFEST sha256; a mismatch stops the run.
//   - A duplicate natural key or a missing key column on either side stops the run.
//   - Only columns present on both sides are compared; extra columns are listed per side.
//   - Strict equality on JSON values. Values that differ only by type (5 versus "5") are still reported,
//     tagged type_only and counted separately.
//   - A row only in the older snapshot is a delete ("missing in newer"), never a safe-to-delete instruction.
//   - Possible renames are listed for a human and never merged.

import { createHash } from 'node:crypto';
import path from 'node:path';
import { PROVENANCE_COLUMNS, IGNORED_COLUMNS } from './gameTables.js';

export const DIFF_TOOL_VERSION = '1.0.0';

export function sha256Hex(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

// The manifest entry for a table's JSON file (the Oct 13 manifest also lists CSV files for the same table).
export function manifestEntry(manifest, table) {
  const files = (manifest && Array.isArray(manifest.files)) ? manifest.files : [];
  const hits = files.filter((f) => f && f.table === table && /\.json$/i.test(String(f.file || '')) && (f.kind == null || f.kind === 'json'));
  if (hits.length !== 1) throw new Error(table + ': expected one JSON entry in MANIFEST.json, found ' + hits.length);
  return hits[0];
}

// side = { label, manifest, files: { [fileName]: Buffer } }. Returns { [table]: rows } after checking each file's
// sha256 against the manifest and filtering game-shared tables to the game.
export function loadSide(side, specs, game) {
  const out = {};
  for (const s of specs) {
    const entry = manifestEntry(side.manifest, s.table);
    const bytes = side.files[entry.file];
    if (bytes == null) throw new Error(side.label + ': ' + entry.file + ' is listed in MANIFEST.json but was not found');
    const actual = sha256Hex(bytes);
    if (actual !== entry.sha256) {
      throw new Error(side.label + ': ' + entry.file + ' sha256 ' + actual + ' does not match MANIFEST.json ' + entry.sha256 + '; refusing to run');
    }
    let rows = JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString('utf8') : String(bytes));
    if (!Array.isArray(rows)) throw new Error(side.label + ': ' + entry.file + ' is not a JSON array');
    if (s.filterByGame) rows = rows.filter((r) => r && r.game_slug === game);
    out[s.table] = rows;
  }
  return out;
}

// Canonical JSON (object keys sorted) so equal objects and arrays compare equal regardless of key order.
export function canonical(v) {
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}

export function valuesEqual(a, b) {
  return canonical(a) === canonical(b);
}

// 5 versus "5", true versus "true": both non-null scalars of different types with the same string form.
export function isTypeOnly(a, b) {
  const scalar = (x) => x !== null && x !== undefined && typeof x !== 'object';
  return scalar(a) && scalar(b) && typeof a !== typeof b && String(a) === String(b);
}

function rowKey(row, keyCols, table, label) {
  const key = {};
  for (const c of keyCols) {
    if (!row || !(c in row) || row[c] === null || row[c] === undefined) {
      throw new Error(label + ': ' + table + ' has a row with no value for key column ' + c);
    }
    key[c] = row[c];
  }
  return key;
}

// Index rows by natural key; throws on a duplicate key, naming the table and the key.
export function indexByKey(rows, keyCols, table, label) {
  const map = new Map();
  for (const r of rows) {
    const key = rowKey(r, keyCols, table, label);
    const k = canonical(key);
    if (map.has(k)) throw new Error(label + ': ' + table + ' has a duplicate natural key ' + k);
    map.set(k, { key, row: r });
  }
  return map;
}

function columnSet(rows) {
  const cols = [];
  const seen = new Set();
  for (const r of rows) for (const c of Object.keys(r || {})) if (!seen.has(c) && !IGNORED_COLUMNS.includes(c)) { seen.add(c); cols.push(c); }
  return cols;
}

function stripIgnored(row) {
  const out = {};
  for (const c of Object.keys(row || {})) if (!IGNORED_COLUMNS.includes(c)) out[c] = row[c];
  return out;
}

// Diff one table. Returns { records, counts, extraColumns, renames }.
export function diffTable(spec, fromRows, toRows) {
  const fromIdx = indexByKey(fromRows, spec.key, spec.table, 'from');
  const toIdx = indexByKey(toRows, spec.key, spec.table, 'to');
  const fromCols = columnSet(fromRows), toCols = columnSet(toRows);
  const shared = fromCols.filter((c) => toCols.includes(c) && !spec.key.includes(c));
  const extraColumns = { from_only: fromCols.filter((c) => !toCols.includes(c)), to_only: toCols.filter((c) => !fromCols.includes(c)) };
  const counts = { rows_from: fromRows.length, rows_to: toRows.length, inserts: 0, deletes: 0, data_updates: 0, provenance_updates: 0, type_only: 0 };
  const records = [];
  const keys = Array.from(new Set([...fromIdx.keys(), ...toIdx.keys()])).sort();
  const deleted = [], inserted = [];
  for (const k of keys) {
    const a = fromIdx.get(k), b = toIdx.get(k);
    if (a && !b) {
      records.push({ table_name: spec.table, row_key: a.key, field: null, change_type: 'delete', old_value: stripIgnored(a.row), new_value: null, kind: 'data', type_only: false });
      counts.deletes++; deleted.push(a);
    } else if (!a && b) {
      records.push({ table_name: spec.table, row_key: b.key, field: null, change_type: 'insert', old_value: null, new_value: stripIgnored(b.row), kind: 'data', type_only: false });
      counts.inserts++; inserted.push(b);
    } else {
      for (const c of shared) {
        const ov = a.row[c] === undefined ? null : a.row[c];
        const nv = b.row[c] === undefined ? null : b.row[c];
        if (valuesEqual(ov, nv)) continue;
        const kind = PROVENANCE_COLUMNS.includes(c) ? 'provenance' : 'data';
        const typeOnly = isTypeOnly(ov, nv);
        records.push({ table_name: spec.table, row_key: a.key, field: c, change_type: 'update', old_value: ov, new_value: nv, kind, type_only: typeOnly });
        if (typeOnly) counts.type_only++;
        else if (kind === 'provenance') counts.provenance_updates++;
        else counts.data_updates++;
      }
    }
  }
  return { records, counts, extraColumns, renames: suggestRenames(spec, deleted, inserted) };
}

// A deleted and an inserted row whose names contain one another (case-insensitive), with every other key
// column equal. Grouped by name pair so a weapon with 120 ballistics rows is listed once with its row count.
export function suggestRenames(spec, deleted, inserted) {
  const col = spec.nameColumn;
  if (!col) return [];
  const others = spec.key.filter((c) => c !== col);
  const pairs = new Map();
  for (const d of deleted) {
    for (const i of inserted) {
      const dn = String(d.key[col]), inn = String(i.key[col]);
      if (dn === inn) continue;
      const dl = dn.toLowerCase().trim(), il = inn.toLowerCase().trim();
      if (!dl || !il || !(dl.includes(il) || il.includes(dl))) continue;
      if (!others.every((c) => valuesEqual(d.key[c], i.key[c]))) continue;
      const k = canonical([dn, inn]);
      const p = pairs.get(k) || { table_name: spec.table, column: col, from_name: dn, to_name: inn, rows: 0 };
      p.rows++;
      pairs.set(k, p);
    }
  }
  return Array.from(pairs.values()).sort((x, y) => canonical([x.from_name, x.to_name]).localeCompare(canonical([y.from_name, y.to_name])));
}

// Diff every configured table. from / to are the loadSide() results.
export function diffSnapshots(specs, from, to) {
  const tables = [];
  for (const s of specs) tables.push(Object.assign({ table: s.table }, diffTable(s, from[s.table] || [], to[s.table] || [])));
  return tables;
}

// --- output (pure: returns strings) ---

// Escape every non-ASCII character as \uXXXX so the report stays ASCII.
export function asciiEscape(text) {
  return String(text).replace(/[^\x00-\x7f]/g, (ch) => '\\u' + ch.charCodeAt(0).toString(16).padStart(4, '0'));
}

function fmtValue(v) {
  return asciiEscape(JSON.stringify(v === undefined ? null : v));
}

function fmtKey(key) {
  return Object.keys(key).map((c) => c + '=' + fmtValue(key[c])).join(', ');
}

export function changesJson(tables) {
  const all = [];
  for (const t of tables) for (const r of t.records) all.push(r);
  return asciiEscape(JSON.stringify(all, null, 2)) + '\n';
}

export function reportMarkdown(tables, meta) {
  const m = meta || {};
  const L = [];
  L.push('# Snapshot diff: ' + asciiEscape(m.game || '') + ', ' + asciiEscape(m.fromName || 'from') + ' -> ' + asciiEscape(m.toName || 'to'));
  L.push('');
  L.push('Tool: lib/gamedata/snapshotDiff.js ' + DIFF_TOOL_VERSION + '. Older: ' + asciiEscape(m.fromName || '') + ' (exported ' + asciiEscape(m.fromExported || 'unknown') + '). Newer: ' + asciiEscape(m.toName || '') + ' (exported ' + asciiEscape(m.toExported || 'unknown') + ').');
  L.push('');
  L.push('Read this as a list of differences, not instructions. Rows "missing in newer" are not safe to delete; possible renames need a human. Both files were checked against their MANIFEST.json sha256.');
  L.push('');
  L.push('## Counts per table');
  L.push('');
  L.push('| table | rows older | rows newer | inserts (new in newer) | deletes (missing in newer) | data updates | provenance updates | type_only |');
  L.push('|---|---|---|---|---|---|---|---|');
  for (const t of tables) {
    const c = t.counts;
    L.push('| ' + t.table + ' | ' + c.rows_from + ' | ' + c.rows_to + ' | ' + c.inserts + ' | ' + c.deletes + ' | ' + c.data_updates + ' | ' + c.provenance_updates + ' | ' + c.type_only + ' |');
  }
  L.push('');
  const extras = tables.filter((t) => t.extraColumns.from_only.length || t.extraColumns.to_only.length);
  L.push('## Columns on one side only (not compared)');
  L.push('');
  if (!extras.length) L.push('None: both sides have the same columns for every table.');
  for (const t of extras) L.push('- ' + t.table + ': older only [' + t.extraColumns.from_only.join(', ') + ']; newer only [' + t.extraColumns.to_only.join(', ') + ']');
  L.push('');
  L.push('## Possible renames, needs a human');
  L.push('');
  const renames = [];
  for (const t of tables) for (const r of t.renames) renames.push(r);
  if (!renames.length) L.push('None found.');
  for (const r of renames) L.push('- ' + r.table_name + ' | ' + r.column + ': ' + fmtValue(r.from_name) + ' (missing in newer) -> ' + fmtValue(r.to_name) + ' (new in newer) | rows: ' + r.rows);
  L.push('');
  L.push('## Changes');
  for (const t of tables) {
    L.push('');
    L.push('### ' + t.table + ' (' + t.records.length + ')');
    L.push('');
    if (!t.records.length) { L.push('No changes.'); continue; }
    for (const r of t.records) {
      if (r.change_type === 'insert') L.push('- ' + r.table_name + ' | ' + fmtKey(r.row_key) + ' | NEW IN NEWER: ' + fmtValue(r.new_value));
      else if (r.change_type === 'delete') L.push('- ' + r.table_name + ' | ' + fmtKey(r.row_key) + ' | MISSING IN NEWER: ' + fmtValue(r.old_value));
      else L.push('- ' + r.table_name + ' | ' + fmtKey(r.row_key) + ' | ' + r.field + ' (' + r.kind + (r.type_only ? ', type_only' : '') + '): ' + fmtValue(r.old_value) + ' -> ' + fmtValue(r.new_value));
    }
  }
  L.push('');
  return L.join('\n');
}

export function summaryLine(tables) {
  const sum = { inserts: 0, deletes: 0, data_updates: 0, provenance_updates: 0, type_only: 0 };
  for (const t of tables) for (const k of Object.keys(sum)) sum[k] += t.counts[k];
  return 'diff: ' + tables.length + ' tables, ' + sum.inserts + ' inserts, ' + sum.deletes + ' missing in newer, ' + sum.data_updates
    + ' data updates, ' + sum.provenance_updates + ' provenance updates, ' + sum.type_only + ' type_only';
}

// --- the output-folder rule (path logic only) ---

export function isInside(child, parent, platform = process.platform) {
  const norm = (p) => { const r = path.resolve(p); return platform === 'win32' ? r.toLowerCase() : r; };
  const rel = path.relative(norm(parent), norm(child));
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export function assertOutAllowed(out, fromDir, toDir, platform) {
  if (isInside(out, fromDir, platform)) throw new Error('--out is inside the --from snapshot folder; refusing');
  if (isInside(out, toDir, platform)) throw new Error('--out is inside the --to snapshot folder; refusing');
}
