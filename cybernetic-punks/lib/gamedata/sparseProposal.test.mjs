// lib/gamedata/sparseProposal.test.mjs
// Brief 325: sparse proposal mode for the game-data diff. Synthetic fixtures only (built here; the CLI cases write
// a temp base snapshot and temp proposal folders). No real snapshot, no database, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GAME_DATA_TABLES } from './gameTables.js';
import { sha256Hex } from './snapshotDiff.js';
import {
  parseCsv, readCell, columnType, sparseEqual, editDistance, typoHints, sparseDiffTable, sparseReportMarkdown,
  sparseSummaryLine, parseManifestTxt, NULL_TOKEN,
} from './sparseProposal.js';
import { run, parseArgs, HELP } from '../../scripts/diff-game-snapshots.mjs';

const SPEC = (table) => GAME_DATA_TABLES.wardogs.find((s) => s.table === table);
const W = (name, extra) => Object.assign({ id: 'id-' + name, game_slug: 'wardogs', name, category: 'AR', fire_rate: 600, damage: 30, notes: 'n', verified: false, updated_at: '2026-10-01T00:00:00+00:00' }, extra || {});
const T = (weapon, ammo, tier, ttk, extra) => Object.assign({ id: 'ttk-' + weapon + ammo + tier, game_slug: 'wardogs', weapon_name: weapon, ammo_type: ammo, armor_tier: tier, ttk_ms: ttk, verified_source: 's1' }, extra || {});
const WS_COLS = Object.keys(W('x'));
const TTK_COLS = Object.keys(T('x', 'FMJ', 0, 1));
const csv = (lines) => parseCsv(lines.join('\r\n') + '\r\n');
const ws = (base, lines) => sparseDiffTable(SPEC('weapon_stats'), base, WS_COLS, csv(lines), 'wardogs');
const ttk = (base, lines) => sparseDiffTable(SPEC('wardogs_ttk'), base, TTK_COLS, csv(lines), 'wardogs');

test('CSV parser: quotes, doubled quotes, embedded commas and newlines, BOM, CRLF and LF', () => {
  const r = parseCsv('\uFEFFa,b,c\r\n"x, y","say ""hi""","line1\nline2"\n1,,3\n');
  assert.deepEqual(r.header, ['a', 'b', 'c']);
  assert.deepEqual(r.records, [{ a: 'x, y', b: 'say "hi"', c: 'line1\nline2' }, { a: '1', b: '', c: '3' }]);
  assert.throws(() => parseCsv('a,b\n1\n'), /line 2 has 1 fields, header has 2/);
  assert.throws(() => parseCsv('a\n"open\n'), /unterminated/);
});

test('empty cell is "not provided" and skipped; an omitted column is never compared', () => {
  const r = ws([W('M4', { fire_rate: 600, damage: 30 })], ['game_slug,name,fire_rate,damage', 'wardogs,M4,,35']);
  assert.deepEqual(r.records.map((x) => [x.field, x.old_value, x.new_value]), [['damage', 30, 35]]);
  assert.ok(!r.records.some((x) => x.field === 'category'), 'category is not in the proposal');
  const blank = ws([W('M4')], ['game_slug,name,fire_rate', 'wardogs,M4,  ']);
  assert.equal(blank.records.length, 0, 'a whitespace-only cell is empty too');
  assert.equal(blank.counts.rows_equal, 1);
});

test('<NULL> proposes null; null to null is no change', () => {
  const r = ws([W('M4', { fire_rate: 600 }), W('AK', { fire_rate: null })], ['game_slug,name,fire_rate', 'wardogs,M4,' + NULL_TOKEN, 'wardogs,AK,<NULL>']);
  assert.deepEqual(r.records.map((x) => [x.row_key.name, x.old_value, x.new_value]), [['M4', 600, null]]);
  assert.equal(r.counts.rows_equal, 1);
});

test('numeric normalisation: 30 = 30.0 = " 30 "; text compared trimmed; booleans and JSON by type', () => {
  const r = ws([W('M4', { damage: 30, fire_rate: 600, category: 'AR', verified: false })],
    ['game_slug,name,damage,fire_rate,category,verified', 'wardogs,M4,30.0, 600 , AR ,FALSE']);
  assert.equal(r.records.length, 0);
  assert.equal(r.counts.rows_equal, 1);
  assert.ok(sparseEqual(30, 30) && !sparseEqual(30, 30.5) && sparseEqual(' a ', 'a') && sparseEqual(['x'], ['x']));
  assert.deepEqual(readCell('[1,2]', 'json'), { value: [1, 2] });
  assert.deepEqual(readCell('true', 'boolean'), { value: true });
  assert.deepEqual(readCell('12', 'unknown'), { value: 12 });
  assert.equal(columnType([{ a: null }, { a: 2 }], 'a'), 'number');
  assert.equal(columnType([{ a: null }], 'a'), 'unknown');
  const d = ws([W('M4', { damage: 30 })], ['game_slug,name,damage', 'wardogs,M4,31']);
  assert.deepEqual(d.records[0].new_value, 31, 'the new value is the typed number, not the CSV text');
});

test('a cell that does not parse as the base column type stops the run, naming table, key and column', () => {
  assert.throws(() => ws([W('M4')], ['game_slug,name,fire_rate', 'wardogs,M4,6OO']), /weapon_stats\.csv line 2 \(wardogs \| M4\): column fire_rate not a number: "6OO" \(base column type number\)/);
  assert.throws(() => ws([W('M4')], ['game_slug,name,verified', 'wardogs,M4,yes']), /column verified not true\/false/);
});

test('unknown column stops the run naming table and column; bookkeeping columns refused; key column required', () => {
  assert.throws(() => ws([W('M4')], ['game_slug,name,fire_rat', 'wardogs,M4,700']), /weapon_stats\.csv: column fire_rat does not exist in the base weapon_stats table/);
  assert.throws(() => ws([W('M4')], ['game_slug,name,updated_at', 'wardogs,M4,x']), /column updated_at is database bookkeeping and cannot be proposed/);
  assert.throws(() => ttk([T('M4', 'FMJ', 0, 300)], ['game_slug,weapon_name,ammo_type,ttk_ms', 'wardogs,M4,FMJ,280']), /wardogs_ttk\.csv: key column armor_tier is missing/);
  assert.throws(() => ws([W('M4')], ['game_slug,name,fire_rate,fire_rate', 'wardogs,M4,1,2']), /column fire_rate appears twice/);
  assert.throws(() => ws([W('M4')], ['game_slug,name,fire_rate', 'wardogs,,700']), /line 2: key column name is empty/);
  assert.throws(() => ws([W('M4')], ['game_slug,name,fire_rate', 'marathon,M4,700']), /game_slug "marathon" is not the run game "wardogs"/);
});

test('multi-column key matches the typed base key (armor_tier 1 = "1" = "1.0")', () => {
  const r = ttk([T('M4', 'FMJ', 0, 300), T('M4', 'FMJ', 1, 340)], ['game_slug,weapon_name,ammo_type,armor_tier,ttk_ms', 'wardogs,M4,FMJ,1.0,360']);
  assert.deepEqual(r.records.map((x) => [x.row_key.armor_tier, x.old_value, x.new_value]), [[1, 340, 360]]);
  assert.equal(typeof r.records[0].row_key.armor_tier, 'number', 'row_key carries the base typed value');
});

test('new-row candidates are listed with their provided fields and typo hints; never auto-matched', () => {
  const base = [W('AK-74'), W('M4A1'), W('Super-45')];
  const r = ws(base, ['game_slug,name,fire_rate', 'wardogs,ak 74,650', 'wardogs,M4A2,700', 'wardogs,Brand New Gun,500']);
  assert.equal(r.records.length, 0, 'no candidate is applied to an existing row');
  assert.equal(r.counts.new_row_candidates, 3);
  const by = Object.fromEntries(r.candidates.map((c) => [c.row_key.name, c]));
  assert.deepEqual(by['ak 74'].provided, { fire_rate: 650 });
  assert.deepEqual(by['ak 74'].hints[0], { key: ['wardogs', 'AK-74'], reason: 'same after normalising case, spaces and punctuation' });
  assert.deepEqual(by.M4A2.hints[0], { key: ['wardogs', 'M4A1'], reason: 'edit distance 1' });
  assert.deepEqual(by['Brand New Gun'].hints, []);
  assert.equal(r.counts.typo_hints, 2);
  assert.equal(editDistance('kitten', 'sitting'), 3);
  assert.equal(typoHints(['a'], [['b'], ['c'], ['d'], ['e']]).length, 3, 'at most 3 hints');
});

test('duplicate keys in base or proposal are reported and left out of the results', () => {
  const base = [W('M4'), W('M4', { id: 'dupe' }), W('AK', { fire_rate: 600 })];
  const r = ws(base, ['game_slug,name,fire_rate', 'wardogs,M4,700', 'wardogs,AK,650', 'wardogs,AK,660', 'wardogs,FAL,500']);
  assert.equal(r.records.length, 0, 'neither M4 (base dupe) nor AK (proposal dupe) is compared');
  assert.deepEqual(r.duplicates, [
    { side: 'base', key: { game_slug: 'wardogs', name: 'M4' }, rows: 2 },
    { side: 'proposal', key: { game_slug: 'wardogs', name: 'AK' }, lines: [3, 4] },
  ]);
  assert.deepEqual(r.excludedForBaseDupe, [{ key: { game_slug: 'wardogs', name: 'M4' }, line: 2 }]);
  assert.equal(r.counts.duplicate_keys, 2);
  assert.equal(r.counts.new_row_candidates, 1, 'FAL is still a candidate');
});

test('rows the proposal does not mention are never reported; deletions are never reported', () => {
  const base = [W('M4', { fire_rate: 600 }), W('AK', { fire_rate: 1 }), W('FAL', { fire_rate: 2 })];
  const r = ws(base, ['game_slug,name,fire_rate', 'wardogs,M4,700']);
  assert.deepEqual(r.records.map((x) => x.row_key.name), ['M4']);
  assert.ok(r.records.every((x) => x.change_type === 'update'), 'only updates, never delete');
  assert.deepEqual(r.counts, { rows_base: 3, rows_proposal: 1, rows_changed: 1, fields_changed: 1, rows_equal: 0, new_row_candidates: 0, typo_hints: 0, duplicate_keys: 0 });
});

test('_source and _note are carried into the output and never compared or treated as schema', () => {
  const r = ws([W('M4', { fire_rate: 600, notes: 'old' })], ['game_slug,name,fire_rate,notes,_source,_note', 'wardogs,M4,700,new,"Patch notes S3, weapons",checked twice', 'wardogs,AK,1,,src,']);
  const fr = r.records.find((x) => x.field === 'fire_rate');
  assert.equal(fr._source, 'Patch notes S3, weapons');
  assert.equal(fr._note, 'checked twice');
  assert.equal(r.records.find((x) => x.field === 'notes').kind, 'provenance', 'a real provenance column (notes) is compared and tagged as in the full diff');
  assert.ok(!r.records.some((x) => x.field === '_source' || x.field === '_note'));
  assert.equal(r.candidates[0]._source, 'src');
  assert.equal(r.candidates[0]._note, null, 'an empty _note is null');
  assert.deepEqual(r.proposedColumns, ['fire_rate', 'notes']);
});

// --- CLI on temp folders ---

function writeSnapshot(dir, tables) {
  mkdirSync(dir, { recursive: true });
  const files = [];
  for (const s of GAME_DATA_TABLES.wardogs) {
    const rows = tables[s.table] || [];
    const text = JSON.stringify(rows, null, 2) + '\n';
    const file = s.table + '.json';
    writeFileSync(path.join(dir, file), text);
    const columns = rows.length ? Object.keys(rows[0]) : [];
    files.push({ file, table: s.table, rows: rows.length, sha256: sha256Hex(Buffer.from(text, 'utf8')), columns });
  }
  writeFileSync(path.join(dir, 'MANIFEST.json'), JSON.stringify({ exported_at_utc: '2026-11-07T00:00:00.000Z', files }, null, 2) + '\n');
}
function writeProposal(dir, files, manifest) {
  mkdirSync(dir, { recursive: true });
  const lines = ['Test proposal.'];
  for (const [name, text] of Object.entries(files)) {
    writeFileSync(path.join(dir, name), text);
    lines.push(sha256Hex(Buffer.from(text, 'utf8')) + '  ' + Buffer.byteLength(text) + '  ' + name);
  }
  if (manifest === 'good') writeFileSync(path.join(dir, 'MANIFEST.txt'), lines.join('\r\n') + '\r\n');
  if (manifest === 'bad') writeFileSync(path.join(dir, 'MANIFEST.txt'), lines.join('\r\n').replace(/^[0-9a-f]{64}/m, 'f'.repeat(64)) + '\r\n');
}
function fixture(root) {
  const base = path.join(root, 'base');
  writeSnapshot(base, {
    weapon_stats: [W('M4', { fire_rate: 600 }), W('AK-74', { fire_rate: 650 }), W('Overrun AR', { game_slug: 'marathon' })],
    wardogs_ttk: [T('M4', 'FMJ', 0, 300), T('M4', 'FMJ', 1, 340)],
  });
  return base;
}

test('CLI sparse: writes changes.json and REPORT.md in the full-diff record format; ASCII; deterministic', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cnp-b325-'));
  const base = fixture(root);
  const prop = path.join(root, 'prop');
  writeProposal(prop, {
    'weapon_stats.csv': 'game_slug,name,fire_rate,_source\r\nwardogs,M4,700,S3 notes \u00e9\r\nwardogs,AK 74,1,\r\n',
    'wardogs_ttk.csv': 'game_slug,weapon_name,ammo_type,armor_tier,ttk_ms\r\nwardogs,M4,FMJ,1,360\r\nwardogs,M4,FMJ,0,300\r\n',
    'notes.csv': 'x\r\n1\r\n',
  }, 'good');
  const logs = [];
  const r = run({ game: 'wardogs', from: base, sparse: prop, out: path.join(root, 'out-1') }, { log: (l) => logs.push(l) });
  run({ game: 'wardogs', from: base, sparse: prop, out: path.join(root, 'out-2') }, { log: () => {} });
  for (const f of ['changes.json', 'REPORT.md']) assert.ok(readFileSync(path.join(root, 'out-1', f)).equals(readFileSync(path.join(root, 'out-2', f))), f + ' byte-identical');
  assert.equal(logs[0], 'sparse diff: 2 tables, 2 rows changed, 2 fields changed, 1 rows equal to base, 1 new-row candidates, 1 typo hints, 0 duplicate keys');
  assert.equal(logs[0], sparseSummaryLine(r.tables));
  const changes = JSON.parse(readFileSync(path.join(root, 'out-1', 'changes.json'), 'utf8'));
  assert.ok(changes.every((c) => ['table_name', 'row_key', 'field', 'change_type', 'old_value', 'new_value', 'kind', 'type_only'].every((k) => k in c)), 'same record fields as the full diff');
  assert.deepEqual(changes.map((c) => [c.table_name, c.field, c.old_value, c.new_value]), [['weapon_stats', 'fire_rate', 600, 700], ['wardogs_ttk', 'ttk_ms', 340, 360]]);
  const report = readFileSync(path.join(root, 'out-1', 'REPORT.md'), 'utf8');
  assert.ok(!/[^\x00-\x7f]/.test(report), 'REPORT.md is ASCII');
  assert.ok(report.includes('- weapon_stats | game_slug="wardogs", name="M4" | fire_rate (data): 600 -> 700 [source: S3 notes \\u00e9]'));
  assert.ok(report.includes('| weapon_stats | 2 | 2 | 1 | 1 | 0 | 1 | 1 | 0 |'), 'Overrun AR (marathon) filtered out of the base count');
  assert.ok(report.includes('  - possible typo or rename of: wardogs | AK-74 (same after normalising case, spaces and punctuation)'));
  assert.ok(report.includes('Not in the proposal (not compared): wardogs_ballistics, wardogs_ammo, wardogs_economy_items, wardogs_attachments.'));
  assert.ok(report.includes('not a table CSV (ignored): notes.csv'));
  assert.ok(report.includes('(MANIFEST.txt sha256 checked)'));
  assert.ok(!/MISSING|delete/i.test(report.split('## Changes')[1]), 'no deletions in the changes');
  assert.ok(sparseReportMarkdown([], {}).includes('## New-row candidates, needs a human'));
});

test('CLI sparse refusals: unknown column, MANIFEST.txt mismatch or unlisted file, no table CSV, --out inside an input; nothing written', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cnp-b325-'));
  const base = fixture(root);
  const go = (prop, out) => run({ game: 'wardogs', from: base, sparse: prop, out: out || path.join(root, 'out-x') }, { log: () => {} });
  const p1 = path.join(root, 'p1'); writeProposal(p1, { 'weapon_stats.csv': 'game_slug,name,firerate\r\nwardogs,M4,1\r\n' });
  assert.throws(() => go(p1), /weapon_stats\.csv: column firerate does not exist in the base weapon_stats table/);
  const p2 = path.join(root, 'p2'); writeProposal(p2, { 'weapon_stats.csv': 'game_slug,name,fire_rate\r\nwardogs,M4,1\r\n' }, 'bad');
  assert.throws(() => go(p2), /weapon_stats\.csv sha256 .* does not match MANIFEST\.txt f{64}; refusing to run/);
  const p3 = path.join(root, 'p3'); writeProposal(p3, { 'weapon_stats.csv': 'game_slug,name,fire_rate\r\nwardogs,M4,1\r\n' });
  writeFileSync(path.join(p3, 'MANIFEST.txt'), 'nothing listed\r\n');
  assert.throws(() => go(p3), /weapon_stats\.csv is not listed in the proposal MANIFEST\.txt/);
  const p4 = path.join(root, 'p4'); writeProposal(p4, { 'proposed_ttk.csv': 'a\r\n1\r\n' });
  assert.throws(() => go(p4), /no table CSV in .* \(expected one of weapon_stats\.csv/);
  assert.throws(() => go(p3, path.join(p3, 'out')), /inside the --sparse proposal folder/);
  assert.throws(() => go(p3, path.join(base, 'out')), /inside the --from snapshot folder/);
  assert.ok(!existsSync(path.join(root, 'out-x')), 'nothing written on any refusal');
  assert.ok(!existsSync(path.join(p3, 'out')) && !existsSync(path.join(base, 'out')));
});

test('arguments: --sparse replaces --to; both together refused; --help; full-mode parse unchanged', () => {
  assert.deepEqual(parseArgs(['--game', 'wardogs', '--from', 'a', '--sparse', 'p', '--out', 'c']), { game: 'wardogs', from: 'a', out: 'c', sparse: 'p' });
  assert.throws(() => parseArgs(['--game', 'wardogs', '--from', 'a', '--to', 'b', '--sparse', 'p', '--out', 'c']), /--sparse and --to cannot be used together/);
  assert.throws(() => parseArgs(['--game', 'wardogs', '--sparse', 'p', '--out', 'c']), /--from is required/);
  assert.deepEqual(parseArgs(['--help']), { help: true });
  assert.ok(HELP.includes('--sparse <proposal dir>') && HELP.includes('<NULL>') && HELP.includes('_source'));
  assert.deepEqual(parseArgs(['--game', 'wardogs', '--from', 'a', '--to', 'b', '--out', 'c']), { game: 'wardogs', from: 'a', to: 'b', out: 'c' });
  assert.deepEqual(parseManifestTxt('Free text first line\r\n' + 'a'.repeat(64) + '  12  x.csv\r\n'), [{ sha256: 'a'.repeat(64), bytes: 12, file: 'x.csv' }]);
});
