// lib/gamedata/sparseProposal.js
// SPARSE PROPOSAL mode for the game-data diff (Brief 325). The full diff (snapshotDiff.js) compares two COMPLETE
// snapshots, so a partial capture (patch notes that name a few weapons and fields) would show everything it omits
// as missing. Here the newer side is a PROPOSAL: one CSV per table, named <table>.csv, holding the table's key
// columns plus only the columns being proposed. Only what the proposal provides is compared and reported.
// PURE like snapshotDiff.js: no file, network or console access; the CLI passes the bytes in.
//
// Rules:
//   - Rows match on the same natural key the full diff uses (lib/gamedata/gameTables.js).
//   - An omitted column, or an empty cell, means "not provided" and is skipped. The literal cell <NULL> proposes null.
//   - A provided cell is read by the BASE column's type (the snapshot JSON is typed; a CSV cell is text):
//     numbers compare numerically (30 = 30.0), booleans as true/false, text trimmed, JSON columns as JSON.
//     A cell that does not parse as the column's type stops the run, naming table, key and column.
//   - Output: only provided fields whose value differs (old -> new). Rows and fields the proposal does not mention,
//     and deletions, are never reported.
//   - A proposal key not in the base is a NEW ROW CANDIDATE, listed with its provided fields, plus a "possible typo
//     or rename" hint when a base key matches after normalising case/whitespace/punctuation or is within edit
//     distance 2. Never matched or fixed automatically.
//   - Duplicate keys (base or proposal) are reported and those rows are left out of the results.
//   - A proposal column that is not in the base table's schema stops the run, naming table and column.
//     Bookkeeping columns (id, created_at, updated_at) are refused the same way.
//   - _source and _note are provenance for the proposal itself: carried into the output, never compared.

import { canonical, valuesEqual, asciiEscape, DIFF_TOOL_VERSION } from './snapshotDiff.js';
import { PROVENANCE_COLUMNS, IGNORED_COLUMNS } from './gameTables.js';

export const NULL_TOKEN = '<NULL>';
export const PROPOSAL_META_COLUMNS = ['_source', '_note'];

// --- CSV (RFC 4180: quoted fields, doubled quotes, CRLF or LF, optional UTF-8 BOM) ---

export function parseCsv(text) {
  const s = String(text).replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', q = false, i = 0;
  while (i < s.length) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { field += '"'; i += 2; continue; } q = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { q = true; i++; continue; }
    if (c === ',') { row.push(field); field = ''; i++; continue; }
    if (c === '\r' || c === '\n') {
      row.push(field); rows.push(row); row = []; field = '';
      i += (c === '\r' && s[i + 1] === '\n') ? 2 : 1; continue;
    }
    field += c; i++;
  }
  if (q) throw new Error('CSV has an unterminated quoted field');
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => !(r.length === 1 && r[0] === ''));
  if (!nonEmpty.length) return { header: [], records: [] };
  const header = nonEmpty[0].map((h) => h.trim());
  const records = nonEmpty.slice(1).map((r, n) => {
    if (r.length !== header.length) throw new Error('CSV line ' + (n + 2) + ' has ' + r.length + ' fields, header has ' + header.length);
    const o = {};
    header.forEach((h, j) => { o[h] = r[j]; });
    return o;
  });
  return { header, records };
}

// --- column types and cell reading ---

// The base column's type: the typeof of its first non-null value ('number' | 'boolean' | 'string' | 'json'), or
// 'unknown' when every base value is null.
export function columnType(rows, col) {
  for (const r of rows) {
    const v = r ? r[col] : undefined;
    if (v === null || v === undefined) continue;
    if (typeof v === 'number') return 'number';
    if (typeof v === 'boolean') return 'boolean';
    if (typeof v === 'string') return 'string';
    return 'json';
  }
  return 'unknown';
}

// Reads a provided (non-empty) cell as the column's type. Returns { value } or { error }.
export function readCell(raw, type) {
  const t = String(raw).trim();
  if (t === NULL_TOKEN) return { value: null };
  if (type === 'number') {
    const n = Number(t);
    return t !== '' && Number.isFinite(n) ? { value: n } : { error: 'not a number: ' + JSON.stringify(raw) };
  }
  if (type === 'boolean') {
    if (/^true$/i.test(t)) return { value: true };
    if (/^false$/i.test(t)) return { value: false };
    return { error: 'not true/false: ' + JSON.stringify(raw) };
  }
  if (type === 'json') {
    try { return { value: JSON.parse(t) }; } catch { return { error: 'not valid JSON: ' + JSON.stringify(raw) }; }
  }
  if (type === 'unknown') {
    // Every base value is null, so there is no type to read by: a number or true/false is taken as such, else text.
    if (t !== '' && Number.isFinite(Number(t))) return { value: Number(t) };
    if (/^(true|false)$/i.test(t)) return { value: /^true$/i.test(t) };
    return { value: t };
  }
  return { value: t };
}

// Equality after the sparse normalisation: text compared trimmed, numbers numerically, JSON canonically.
export function sparseEqual(baseValue, proposed) {
  const b = baseValue === undefined ? null : baseValue;
  if (typeof b === 'string' && typeof proposed === 'string') return b.trim() === proposed.trim();
  return valuesEqual(b, proposed);
}

// One key part as a string, so a typed base key (armor_tier 1) and a CSV cell ("1", " 1.0 ") meet.
function keyPart(v, type) {
  if (v === null || v === undefined) return '';
  if (type === 'number') { const n = Number(String(v).trim()); return Number.isFinite(n) ? String(n) : String(v).trim(); }
  if (type === 'boolean') return String(String(v).trim().toLowerCase() === 'true');
  return String(v).trim();
}
function keyString(parts) { return canonical(parts); }

export function normaliseForHint(s) {
  return String(s).toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

export function editDistance(a, b) {
  a = String(a); b = String(b);
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

// Base keys that look like a typo or rename of a proposed key: equal after normalising case, whitespace and
// punctuation in every part, or within edit distance 2 on the joined key. Closest first, at most 3.
export function typoHints(proposedParts, baseKeys) {
  const joined = proposedParts.join(' | ');
  const norm = proposedParts.map(normaliseForHint).join('|');
  const hits = [];
  for (const parts of baseKeys) {
    const bj = parts.join(' | ');
    const sameNorm = parts.map(normaliseForHint).join('|') === norm;
    const d = editDistance(joined, bj);
    if (sameNorm || d <= 2) hits.push({ key: parts, reason: sameNorm ? 'same after normalising case, spaces and punctuation' : 'edit distance ' + d, d: sameNorm ? 0 : d });
  }
  hits.sort((x, y) => x.d - y.d || x.key.join('|').localeCompare(y.key.join('|')));
  return hits.slice(0, 3).map((h) => ({ key: h.key, reason: h.reason }));
}

// --- the per-table sparse diff ---

// spec: the gameTables.js entry. baseRows: the loaded base rows (already filtered to the game). schemaCols: every
// column the base table has (MANIFEST columns plus row keys). proposal: parseCsv() result. game: the --game value.
export function sparseDiffTable(spec, baseRows, schemaCols, proposal, game) {
  const table = spec.table;
  const schema = new Set(schemaCols);
  const header = proposal.header;
  for (const k of spec.key) if (!header.includes(k)) throw new Error(table + '.csv: key column ' + k + ' is missing (the key is ' + spec.key.join(', ') + ')');
  const seen = new Set();
  for (const h of header) {
    if (seen.has(h)) throw new Error(table + '.csv: column ' + h + ' appears twice in the header');
    seen.add(h);
    if (PROPOSAL_META_COLUMNS.includes(h)) continue;
    if (IGNORED_COLUMNS.includes(h)) throw new Error(table + '.csv: column ' + h + ' is database bookkeeping and cannot be proposed');
    if (!schema.has(h)) throw new Error(table + '.csv: column ' + h + ' does not exist in the base ' + table + ' table');
  }
  const valueCols = header.filter((h) => !spec.key.includes(h) && !PROPOSAL_META_COLUMNS.includes(h));
  const types = {};
  for (const c of [...spec.key, ...valueCols]) types[c] = columnType(baseRows, c);

  // Base index by key, duplicates set aside.
  const baseIdx = new Map(), baseDupes = new Map();
  for (const r of baseRows) {
    const parts = spec.key.map((c) => keyPart(r[c], types[c]));
    const k = keyString(parts);
    if (baseIdx.has(k) || baseDupes.has(k)) { baseDupes.set(k, { parts, count: (baseDupes.get(k) || { count: 1 }).count + 1 }); baseIdx.delete(k); continue; }
    baseIdx.set(k, { parts, row: r });
  }
  // Proposal rows by key, duplicates set aside.
  const propIdx = new Map(), propDupes = new Map();
  proposal.records.forEach((rec, n) => {
    const line = n + 2;
    for (const c of spec.key) {
      const t = String(rec[c] == null ? '' : rec[c]).trim();
      if (t === '' || t === NULL_TOKEN) throw new Error(table + '.csv line ' + line + ': key column ' + c + ' is empty');
    }
    if (spec.key.includes('game_slug') && String(rec.game_slug).trim() !== game) {
      throw new Error(table + '.csv line ' + line + ': game_slug ' + JSON.stringify(rec.game_slug) + ' is not the run game ' + JSON.stringify(game));
    }
    const parts = spec.key.map((c) => keyPart(rec[c], types[c]));
    const k = keyString(parts);
    if (propIdx.has(k) || propDupes.has(k)) {
      const d = propDupes.get(k) || { parts, lines: [propIdx.get(k).line] };
      d.lines.push(line); propDupes.set(k, d); propIdx.delete(k); return;
    }
    propIdx.set(k, { parts, rec, line });
  });

  const keyObj = (parts) => Object.fromEntries(spec.key.map((c, j) => [c, parts[j]]));
  const records = [], equalRows = [], candidates = [], excludedForBaseDupe = [];
  const fieldsByColumn = {};
  let rowsChanged = 0;
  const baseKeyParts = Array.from(baseIdx.values()).map((x) => x.parts).concat(Array.from(baseDupes.values()).map((x) => x.parts));
  for (const k of Array.from(propIdx.keys()).sort()) {
    const p = propIdx.get(k);
    const meta = { _source: nonEmpty(p.rec._source), _note: nonEmpty(p.rec._note) };
    const provided = {};
    for (const c of valueCols) {
      const raw = p.rec[c];
      if (raw == null || String(raw).trim() === '') continue;
      const r = readCell(raw, types[c]);
      if (r.error) throw new Error(table + '.csv line ' + p.line + ' (' + p.parts.join(' | ') + '): column ' + c + ' ' + r.error + ' (base column type ' + types[c] + ')');
      provided[c] = r.value;
    }
    if (baseDupes.has(k)) { excludedForBaseDupe.push({ key: keyObj(p.parts), line: p.line }); continue; }
    const base = baseIdx.get(k);
    if (!base) {
      candidates.push(Object.assign({ table_name: table, row_key: keyObj(p.parts), line: p.line, provided, hints: typoHints(p.parts, baseKeyParts) }, meta));
      continue;
    }
    const row_key = Object.fromEntries(spec.key.map((c) => [c, base.row[c]]));
    let changed = 0;
    for (const c of Object.keys(provided)) {
      const ov = base.row[c] === undefined ? null : base.row[c];
      const nv = provided[c];
      if (sparseEqual(ov, nv)) continue;
      changed++;
      fieldsByColumn[c] = (fieldsByColumn[c] || 0) + 1;
      records.push(Object.assign({
        table_name: table, row_key, field: c, change_type: 'update', old_value: ov, new_value: nv,
        kind: PROVENANCE_COLUMNS.includes(c) ? 'provenance' : 'data', type_only: false,
      }, meta));
    }
    if (changed) rowsChanged++;
    else equalRows.push({ key: row_key, provided: Object.keys(provided).length });
  }
  const duplicates = [
    ...Array.from(baseDupes.values()).map((d) => ({ side: 'base', key: keyObj(d.parts), rows: d.count })),
    ...Array.from(propDupes.values()).map((d) => ({ side: 'proposal', key: keyObj(d.parts), lines: d.lines })),
  ];
  return {
    table, records, candidates, duplicates, equalRows, excludedForBaseDupe, proposedColumns: valueCols,
    counts: {
      rows_base: baseRows.length, rows_proposal: proposal.records.length, rows_changed: rowsChanged, fields_changed: records.length,
      rows_equal: equalRows.length, new_row_candidates: candidates.length,
      typo_hints: candidates.filter((c) => c.hints.length).length, duplicate_keys: duplicates.length,
    },
    fieldsByColumn,
  };
}

function nonEmpty(v) { const t = v == null ? '' : String(v).trim(); return t === '' ? null : t; }

// --- output (pure: returns strings), same style as snapshotDiff.js reportMarkdown ---

function fmtValue(v) { return asciiEscape(JSON.stringify(v === undefined ? null : v)); }
function fmtKey(key) { return Object.keys(key).map((c) => c + '=' + fmtValue(key[c])).join(', '); }
function fmtMeta(r) {
  const bits = [];
  if (r._source) bits.push('source: ' + asciiEscape(r._source));
  if (r._note) bits.push('note: ' + asciiEscape(r._note));
  return bits.length ? ' [' + bits.join('; ') + ']' : '';
}

export function sparseChangesJson(tables) {
  const all = [];
  for (const t of tables) for (const r of t.records) all.push(r);
  return asciiEscape(JSON.stringify(all, null, 2)) + '\n';
}

export function sparseReportMarkdown(tables, meta) {
  const m = meta || {};
  const L = [];
  L.push('# Sparse proposal diff: ' + asciiEscape(m.game || '') + ', ' + asciiEscape(m.baseName || 'base') + ' + proposal ' + asciiEscape(m.proposalName || ''));
  L.push('');
  L.push('Tool: lib/gamedata/sparseProposal.js (snapshotDiff ' + DIFF_TOOL_VERSION + '). Base: ' + asciiEscape(m.baseName || '') + ' (exported ' + asciiEscape(m.baseExported || 'unknown') + ', MANIFEST.json sha256 checked). Proposal: ' + asciiEscape(m.proposalName || '') + (m.proposalManifest ? ' (MANIFEST.txt sha256 checked).' : ' (no MANIFEST.txt).'));
  L.push('');
  L.push('Only fields the proposal provides are compared. Rows and fields it does not mention are never reported, and nothing is ever reported as removed. New-row candidates and typo hints need a human; nothing is matched automatically.');
  L.push('');
  L.push('## Counts per table');
  L.push('');
  L.push('| table | rows in base | rows in proposal | rows changed | fields changed | rows equal to base | new-row candidates | typo hints | duplicate keys |');
  L.push('|---|---|---|---|---|---|---|---|---|');
  for (const t of tables) {
    const c = t.counts;
    L.push('| ' + t.table + ' | ' + c.rows_base + ' | ' + c.rows_proposal + ' | ' + c.rows_changed + ' | ' + c.fields_changed + ' | ' + c.rows_equal + ' | ' + c.new_row_candidates + ' | ' + c.typo_hints + ' | ' + c.duplicate_keys + ' |');
  }
  if (m.skippedTables && m.skippedTables.length) { L.push(''); L.push('Not in the proposal (not compared): ' + m.skippedTables.join(', ') + '.'); }
  if (m.ignoredFiles && m.ignoredFiles.length) { L.push(''); L.push('Files in the proposal folder that are not a table CSV (ignored): ' + m.ignoredFiles.map(asciiEscape).join(', ') + '.'); }
  L.push('');
  L.push('## Fields changed by table and column');
  L.push('');
  const fbc = [];
  for (const t of tables) for (const c of Object.keys(t.fieldsByColumn).sort()) fbc.push('- ' + t.table + '.' + c + ': ' + t.fieldsByColumn[c]);
  L.push(fbc.length ? fbc.join('\n') : 'None.');
  L.push('');
  L.push('## Duplicate keys (left out of the results)');
  L.push('');
  const dup = [];
  for (const t of tables) {
    for (const d of t.duplicates) dup.push('- ' + t.table + ' | ' + d.side + ' | ' + fmtKey(d.key) + (d.side === 'base' ? ' | rows: ' + d.rows : ' | proposal lines: ' + d.lines.join(', ')));
    for (const e of t.excludedForBaseDupe) dup.push('- ' + t.table + ' | proposal line ' + e.line + ' | ' + fmtKey(e.key) + ' | not compared: its key is duplicated in the base');
  }
  L.push(dup.length ? dup.join('\n') : 'None.');
  L.push('');
  L.push('## New-row candidates, needs a human');
  L.push('');
  const cand = [];
  for (const t of tables) for (const c of t.candidates) {
    cand.push('- ' + c.table_name + ' | ' + fmtKey(c.row_key) + ' | proposal line ' + c.line + ' | provided: ' + fmtValue(c.provided) + fmtMeta(c));
    for (const h of c.hints) cand.push('  - possible typo or rename of: ' + asciiEscape(h.key.join(' | ')) + ' (' + h.reason + ')');
  }
  L.push(cand.length ? cand.join('\n') : 'None.');
  L.push('');
  L.push('## Changes');
  for (const t of tables) {
    L.push('');
    L.push('### ' + t.table + ' (' + t.records.length + ')');
    L.push('');
    if (!t.records.length) { L.push('No changes.'); continue; }
    for (const r of t.records) L.push('- ' + r.table_name + ' | ' + fmtKey(r.row_key) + ' | ' + r.field + ' (' + r.kind + '): ' + fmtValue(r.old_value) + ' -> ' + fmtValue(r.new_value) + fmtMeta(r));
  }
  L.push('');
  return L.join('\n');
}

export function sparseSummaryLine(tables) {
  const s = { rows_changed: 0, fields_changed: 0, rows_equal: 0, new_row_candidates: 0, typo_hints: 0, duplicate_keys: 0 };
  for (const t of tables) for (const k of Object.keys(s)) s[k] += t.counts[k];
  return 'sparse diff: ' + tables.length + ' tables, ' + s.rows_changed + ' rows changed, ' + s.fields_changed + ' fields changed, '
    + s.rows_equal + ' rows equal to base, ' + s.new_row_candidates + ' new-row candidates, ' + s.typo_hints + ' typo hints, '
    + s.duplicate_keys + ' duplicate keys';
}

// MANIFEST.txt in the proposal folder (the cnp-snapshots/proposals habit: "<sha256>  <bytes>  <file>" per line).
// Returns [{ sha256, bytes, file }]; lines that are not of that shape (the free-text first line) are skipped.
export function parseManifestTxt(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = line.match(/^([0-9a-f]{64})\s+(\d+)\s+(.+?)\s*$/i);
    if (m) out.push({ sha256: m[1].toLowerCase(), bytes: Number(m[2]), file: m[3] });
  }
  return out;
}
