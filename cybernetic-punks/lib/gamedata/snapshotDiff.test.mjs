// lib/gamedata/snapshotDiff.test.mjs
// Brief 308: the offline snapshot diff. Synthetic fixtures only (built here, written to a temp folder for the CLI
// cases); no real snapshot, no database, no network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { GAME_DATA_TABLES, PROVENANCE_COLUMNS, IGNORED_COLUMNS } from './gameTables.js';
import {
  sha256Hex, loadSide, diffTable, diffSnapshots, isTypeOnly, asciiEscape, changesJson, reportMarkdown, isInside, assertOutAllowed,
} from './snapshotDiff.js';
import { GAME_TABLES } from '../../scripts/snapshot-game-data.mjs';
import { run, parseArgs } from '../../scripts/diff-game-snapshots.mjs';

const SPEC = (table) => GAME_DATA_TABLES.wardogs.find((s) => s.table === table);
const W = (name, extra) => Object.assign({ id: name.length, game_slug: 'wardogs', name, fire_rate: 600, verified: false, verified_source: 's1', updated_at: '2026-10-01T00:00:00+00:00' }, extra || {});

test('config: same six tables as scripts/snapshot-game-data.mjs, keys as briefed, provenance and ignored lists', () => {
  assert.deepEqual(GAME_DATA_TABLES.wardogs.map((s) => s.table), GAME_TABLES.wardogs.map((s) => s.table));
  assert.deepEqual(SPEC('wardogs_ballistics').key, ['game_slug', 'weapon_name', 'body_part', 'ammo_type', 'armor_tier']);
  assert.deepEqual(SPEC('wardogs_ammo').key, ['game_slug', 'caliber', 'ammo_type']);
  assert.ok(PROVENANCE_COLUMNS.includes('notes') && PROVENANCE_COLUMNS.includes('superseded_by'));
  assert.deepEqual(IGNORED_COLUMNS, ['id', 'created_at', 'updated_at']);
});

test('insert, delete, data update and provenance-only update; ignored columns never reported', () => {
  const from = [W('M4'), W('AK74'), W('FAL', { verified_source: 'old' })];
  const to = [W('M4', { fire_rate: 650, id: 99, updated_at: '2026-11-01T00:00:00+00:00' }), W('FAL', { verified_source: 'new' }), W('TCX Spear')];
  const r = diffTable(SPEC('weapon_stats'), from, to);
  assert.deepEqual(r.counts, { rows_from: 3, rows_to: 3, inserts: 1, deletes: 1, data_updates: 1, provenance_updates: 1, type_only: 0 });
  const upd = r.records.find((x) => x.change_type === 'update' && x.field === 'fire_rate');
  assert.deepEqual(upd, { table_name: 'weapon_stats', row_key: { game_slug: 'wardogs', name: 'M4' }, field: 'fire_rate', change_type: 'update', old_value: 600, new_value: 650, kind: 'data', type_only: false });
  assert.equal(r.records.find((x) => x.field === 'verified_source').kind, 'provenance');
  const ins = r.records.find((x) => x.change_type === 'insert');
  assert.equal(ins.field, null);
  assert.equal(ins.new_value.name, 'TCX Spear');
  assert.ok(!('id' in ins.new_value) && !('updated_at' in ins.new_value), 'ignored columns stripped');
  assert.equal(r.records.find((x) => x.change_type === 'delete').row_key.name, 'AK74');
  assert.ok(!r.records.some((x) => IGNORED_COLUMNS.includes(x.field)));
  assert.equal(r.records.filter((x) => x.change_type !== 'update').length, 2, 'one record per inserted or deleted row');
});

test('type_only: 5 versus "5" is reported, tagged and counted separately', () => {
  const r = diffTable(SPEC('weapon_stats'), [W('M4', { fire_rate: 5 })], [W('M4', { fire_rate: '5' })]);
  assert.equal(r.counts.type_only, 1);
  assert.equal(r.counts.data_updates, 0);
  assert.equal(r.records[0].type_only, true);
  assert.ok(isTypeOnly(true, 'true') && !isTypeOnly(null, '') && !isTypeOnly(5, '5.0'));
  const same = diffTable(SPEC('weapon_stats'), [W('M4', { mod_slot_types: ['a', 'b'] })], [W('M4', { mod_slot_types: ['a', 'b'] })]);
  assert.equal(same.records.length, 0, 'equal arrays are not a change');
});

test('duplicate natural key or missing key column stops the run, naming the table and key', () => {
  assert.throws(() => diffTable(SPEC('weapon_stats'), [W('M4'), W('M4')], []), /from: weapon_stats has a duplicate natural key \{"game_slug":"wardogs","name":"M4"\}/);
  assert.throws(() => diffTable(SPEC('wardogs_ttk'), [], [{ game_slug: 'wardogs', weapon_name: 'M4', ammo_type: 'FMJ', ttk_ms: 300 }]), /to: wardogs_ttk has a row with no value for key column armor_tier/);
});

test('different column sets: shared columns compared, extras listed per side', () => {
  const r = diffTable(SPEC('wardogs_ammo'),
    [{ id: 1, game_slug: 'wardogs', caliber: '9x19mm', ammo_type: 'FMJ', box_price: 10, old_col: 1 }],
    [{ id: 1, game_slug: 'wardogs', caliber: '9x19mm', ammo_type: 'FMJ', box_price: 12, season: 's3' }]);
  assert.deepEqual(r.extraColumns, { from_only: ['old_col'], to_only: ['season'] });
  assert.deepEqual(r.records.map((x) => x.field), ['box_price']);
});

test('possible renames are listed, never merged; other key columns must match', () => {
  const r = diffTable(SPEC('wardogs_economy_items'),
    [{ game_slug: 'wardogs', name: 'Gepard', cost: 8000 }, { game_slug: 'wardogs', name: 'Humvee', cost: 1 }],
    [{ game_slug: 'wardogs', name: 'Flakpanzer Gepard', cost: 14000 }, { game_slug: 'wardogs', name: 'T-72B3', cost: 2 }]);
  assert.deepEqual(r.renames, [{ table_name: 'wardogs_economy_items', column: 'name', from_name: 'Gepard', to_name: 'Flakpanzer Gepard', rows: 1 }]);
  assert.equal(r.counts.inserts, 2);
  assert.equal(r.counts.deletes, 2, 'the rename candidate stays a delete plus an insert');
  const t = diffTable(SPEC('wardogs_ttk'),
    [{ game_slug: 'wardogs', weapon_name: 'PP-19', ammo_type: 'FMJ', armor_tier: 0, ttk_ms: 1 }, { game_slug: 'wardogs', weapon_name: 'PP-19', ammo_type: 'FMJ', armor_tier: 1, ttk_ms: 1 }],
    [{ game_slug: 'wardogs', weapon_name: 'PP-19 Vityaz', ammo_type: 'FMJ', armor_tier: 0, ttk_ms: 1 }, { game_slug: 'wardogs', weapon_name: 'PP-19 Vityaz', ammo_type: 'HP', armor_tier: 1, ttk_ms: 1 }]);
  assert.deepEqual(t.renames.map((x) => [x.from_name, x.to_name, x.rows]), [['PP-19', 'PP-19 Vityaz', 1]], 'only the pair whose other key columns match');
});

// --- snapshot folders on disk (temp) for the load and CLI cases ---

function writeSnapshot(dir, tables, opts = {}) {
  mkdirSync(dir, { recursive: true });
  const files = [];
  for (const s of GAME_DATA_TABLES.wardogs) {
    const rows = tables[s.table] || [];
    const text = JSON.stringify(rows, null, 2) + '\n';
    const file = s.table + '.json';
    writeFileSync(path.join(dir, file), text);
    files.push({ file, table: s.table, rows: rows.length, sha256: opts.badSha === s.table ? 'f'.repeat(64) : sha256Hex(Buffer.from(text, 'utf8')) });
  }
  writeFileSync(path.join(dir, 'MANIFEST.json'), JSON.stringify({ exported_at_utc: opts.at || '2026-11-07T00:00:00.000Z', files }, null, 2) + '\n');
}

function fixture(root) {
  const from = path.join(root, 'snap-a'), to = path.join(root, 'snap-b');
  writeSnapshot(from, { weapon_stats: [W('M4'), W('Overrun AR', { game_slug: 'marathon' })], wardogs_economy_items: [{ id: 1, game_slug: 'wardogs', name: 'Gepard', cost: 8000 }] });
  writeSnapshot(to, { weapon_stats: [W('M4', { fire_rate: 650 }), W('TCX Spear \u00e9'), W('Bushmaster', { game_slug: 'bodycam' })], wardogs_economy_items: [{ id: 1, game_slug: 'wardogs', name: 'Flakpanzer Gepard', cost: 14000 }] }, { at: '2026-11-08T00:00:00.000Z' });
  return { from, to };
}

test('loadSide: sha256 mismatch refuses to run; weapon_stats filtered to the game on both sides', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cnp-b308-'));
  const { from, to } = fixture(root);
  const bad = path.join(root, 'snap-bad');
  writeSnapshot(bad, { weapon_stats: [W('M4')] }, { badSha: 'wardogs_ttk' });
  assert.throws(() => run({ game: 'wardogs', from, to: bad, out: path.join(root, 'out-bad') }, { log: () => {} }), /to: wardogs_ttk\.json sha256 .* does not match MANIFEST\.json f{64}; refusing to run/);
  assert.ok(!existsSync(path.join(root, 'out-bad')), 'nothing written on a refusal');
  const r = run({ game: 'wardogs', from, to, out: path.join(root, 'out-1') }, { log: () => {} });
  const ws = r.tables.find((t) => t.table === 'weapon_stats');
  assert.equal(ws.counts.rows_from, 1, 'the marathon row is filtered out');
  assert.equal(ws.counts.rows_to, 2, 'the bodycam row is filtered out');
  assert.ok(!ws.records.some((x) => /Overrun|Bushmaster/.test(JSON.stringify(x))));
  assert.equal(typeof loadSide, 'function');
});

test('refuses --out inside either snapshot folder', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cnp-b308-'));
  const { from, to } = fixture(root);
  assert.throws(() => run({ game: 'wardogs', from, to, out: path.join(from, 'diff') }, { log: () => {} }), /inside the --from snapshot folder/);
  assert.throws(() => run({ game: 'wardogs', from, to, out: to }, { log: () => {} }), /inside the --to snapshot folder/);
  assert.ok(isInside('C:\\Snap\\A\\x', 'c:\\snap\\a', 'win32'), 'case-insensitive on Windows');
  assert.ok(!isInside(path.join(root, 'snap-ab'), from), 'a sibling with a shared prefix is not inside');
  assert.doesNotThrow(() => assertOutAllowed(path.join(root, 'out'), from, to));
});

test('outputs: ASCII report with counts, changes and renames; deterministic byte-identical runs', () => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'cnp-b308-'));
  const { from, to } = fixture(root);
  const lines = [];
  run({ game: 'wardogs', from, to, out: path.join(root, 'out-1') }, { log: (l) => lines.push(l) });
  run({ game: 'wardogs', from, to, out: path.join(root, 'out-2') }, { log: () => {} });
  for (const f of ['changes.json', 'REPORT.md']) {
    assert.ok(readFileSync(path.join(root, 'out-1', f)).equals(readFileSync(path.join(root, 'out-2', f))), f + ' is byte-identical');
  }
  const report = readFileSync(path.join(root, 'out-1', 'REPORT.md'), 'utf8');
  assert.ok(!/[^\x00-\x7f]/.test(report), 'REPORT.md is ASCII');
  assert.ok(report.includes('TCX Spear \\u00e9'), 'non-ASCII escaped as \\uXXXX');
  assert.ok(report.includes('| weapon_stats | 1 | 2 | 1 | 0 | 1 | 0 | 0 |'));
  assert.ok(report.includes('- weapon_stats | game_slug="wardogs", name="M4" | fire_rate (data): 600 -> 650'));
  assert.ok(report.includes('"Gepard" (missing in newer) -> "Flakpanzer Gepard" (new in newer) | rows: 1'));
  assert.ok(report.includes('MISSING IN NEWER'));
  const changes = JSON.parse(readFileSync(path.join(root, 'out-1', 'changes.json'), 'utf8'));
  assert.ok(changes.every((c) => ['table_name', 'row_key', 'field', 'change_type', 'old_value', 'new_value', 'kind', 'type_only'].every((k) => k in c)));
  assert.match(lines[0], /^diff: 6 tables, 2 inserts, 1 missing in newer, 1 data updates, 0 provenance updates, 0 type_only$/);
  assert.equal(asciiEscape('\u00e9\u2014'), '\\u00e9\\u2014');
  assert.equal(changesJson(diffSnapshots(GAME_DATA_TABLES.wardogs, {}, {})), '[]\n');
  assert.ok(reportMarkdown([], {}).includes('## Possible renames, needs a human'));
});

test('arguments: all four required, unknown game refused', () => {
  assert.deepEqual(parseArgs(['--game', 'wardogs', '--from', 'a', '--to', 'b', '--out', 'c']), { game: 'wardogs', from: 'a', to: 'b', out: 'c' });
  assert.throws(() => parseArgs(['--game', 'wardogs', '--from', 'a', '--to', 'b']), /--out is required/);
  assert.throws(() => parseArgs(['--game', 'marathon', '--from', 'a', '--to', 'b', '--out', 'c']), /no table config for game "marathon"/);
});
