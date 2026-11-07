// scripts/snapshot-game-data.test.mjs
// Brief 303: the read-only game-data snapshot. Pure parts only (arguments, the out-dir rule, the read-only guard,
// stable ordering, the count check, the manifest) plus run() against an in-memory fake client. No DB, no network,
// and importing the script never runs it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_TABLES, PAGE_SIZE, SCRIPT_VERSION, parseArgs, assertOutDirUsable, readOnlyClient, assertStableOrder,
  assertCountMatches, columnsSeen, maxUpdatedAt, serializeRows, sha256, buildManifest, run, gitInfo,
} from './snapshot-game-data.mjs';

test('gitInfo: git missing from PATH -> null commit and null dirty, never throws; partial failure keeps the other field', () => {
  const enoent = () => { const e = new Error('spawnSync git ENOENT'); e.code = 'ENOENT'; throw e; };
  assert.deepEqual(gitInfo(enoent), { commit: null, dirty: null });
  const sha = 'e5953767710b960856ef138a47c98b01870e72ec';
  assert.deepEqual(gitInfo((cmd, args) => (args[0] === 'rev-parse' ? sha + '\n' : '')), { commit: sha, dirty: false });
  assert.deepEqual(gitInfo((cmd, args) => (args[0] === 'rev-parse' ? sha + '\n' : ' M lib/x.js\n')), { commit: sha, dirty: true });
  assert.deepEqual(gitInfo((cmd, args) => { if (args[0] === 'status') throw new Error('not a repo'); return sha; }), { commit: sha, dirty: null });
  assert.equal(gitInfo(() => 'fatal: not a git repository').commit, null, 'non-sha output is not recorded as a commit');
  // A manifest built from the git-missing result records null, not "unknown".
  const m = buildManifest({ game: 'wardogs', tables: [], gitCommit: null, gitDirty: null });
  assert.equal(m.git_commit, null);
  assert.equal(m.git_dirty, null);
});

test('wardogs table list is exactly the six tables, each paged by id; no other game is configured', () => {
  assert.deepEqual(Object.keys(GAME_TABLES), ['wardogs']);
  assert.deepEqual(GAME_TABLES.wardogs.map((t) => t.table),
    ['weapon_stats', 'wardogs_ttk', 'wardogs_ballistics', 'wardogs_ammo', 'wardogs_economy_items', 'wardogs_attachments']);
  assert.ok(GAME_TABLES.wardogs.every((t) => t.key === 'id'));
});

test('arguments: --game and --out required, dry run by default, unknown game and unknown flag refused', () => {
  assert.deepEqual(parseArgs(['--game', 'wardogs', '--out', 'x']), { game: 'wardogs', out: 'x', label: null, write: false });
  assert.equal(parseArgs(['--game', 'wardogs', '--out', 'x', '--label', 'pre S3', '--write']).write, true);
  assert.throws(() => parseArgs(['--out', 'x']), /--game is required/);
  assert.throws(() => parseArgs(['--game', 'wardogs']), /--out is required/);
  assert.throws(() => parseArgs(['--game', 'marathon', '--out', 'x']), /no table list for game "marathon"/);
  assert.throws(() => parseArgs(['--game', 'wardogs', '--out', 'x', '--force']), /unknown argument/);
  assert.throws(() => parseArgs(['--game', '--out', 'x']), /--game needs a value/);
});

test('out dir: absent or empty is fine; a non-empty dir or a file is refused', () => {
  const fake = (entries, isDir = true, exists = true) => ({
    existsSync: () => exists, statSync: () => ({ isDirectory: () => isDir }), readdirSync: () => entries,
  });
  assert.doesNotThrow(() => assertOutDirUsable('d', fake([], true, false)));
  assert.doesNotThrow(() => assertOutDirUsable('d', fake([])));
  assert.throws(() => assertOutDirUsable('d', fake(['MANIFEST.json'])), /already contains 1 entry; refusing/);
  assert.throws(() => assertOutDirUsable('d', fake(['a', 'b'])), /already contains 2 entries/);
  assert.throws(() => assertOutDirUsable('d', fake([], false)), /not a directory/);
});

test('read-only guard: insert, update, upsert, delete and rpc throw; select passes through', () => {
  const calls = [];
  const raw = { from: (t) => ({ select: (c) => { calls.push(['select', t, c]); return 'ok'; }, insert() { calls.push(['insert']); }, update() {}, upsert() {}, delete() {} }) };
  const db = readOnlyClient(raw);
  assert.equal(db.from('weapon_stats').select('*'), 'ok');
  for (const m of ['insert', 'update', 'upsert', 'delete']) {
    assert.throws(() => db.from('weapon_stats')[m]({}), new RegExp('read-only snapshot: ' + m + '\\(\\) on weapon_stats'));
  }
  assert.throws(() => db.rpc('anything'), /rpc\(\) is not allowed/);
  assert.deepEqual(calls, [['select', 'weapon_stats', '*']], 'the raw insert was never reached');
});

test('stable order: ascending unique keys pass; a repeat or an out-of-order key fails', () => {
  assert.doesNotThrow(() => assertStableOrder([{ id: 1 }, { id: 2 }, { id: 10 }], 'id', 't'));
  assert.doesNotThrow(() => assertStableOrder([{ id: '0a1' }, { id: '0b2' }, { id: 'f00' }], 'id', 't'));
  assert.throws(() => assertStableOrder([{ id: 1 }, { id: 2 }, { id: 2 }], 'id', 't'), /id 2 repeats across pages/);
  assert.throws(() => assertStableOrder([{ id: 3 }, { id: 2 }], 'id', 't'), /not in ascending id order at row 1/);
  assert.throws(() => assertStableOrder([{ name: 'x' }], 'id', 't'), /row 0 has no id/);
});

test('count check: equal passes; a mismatch or a missing count fails loudly', () => {
  assert.doesNotThrow(() => assertCountMatches('wardogs_ttk', 450, 450));
  assert.throws(() => assertCountMatches('wardogs_ttk', 449, 450), /wardogs_ttk: exported 449 rows but count\(\*\) is 450; snapshot aborted/);
  assert.throws(() => assertCountMatches('wardogs_ttk', 0, null), /count\(\*\) returned no number/);
});

test('columns, max updated_at, serialization and hash', () => {
  assert.deepEqual(columnsSeen([{ id: 1, name: 'a' }, { id: 2, name: 'b', extra: null }]), ['id', 'name', 'extra']);
  assert.equal(maxUpdatedAt([{ updated_at: '2026-10-08T16:40:00.260427+00:00' }, { updated_at: '2026-10-26T21:23:53.46154+00:00' }, { updated_at: null }]),
    '2026-10-26T21:23:53.46154+00:00');
  assert.equal(maxUpdatedAt([{ id: 1 }]), null, 'no updated_at column -> null');
  const text = serializeRows([{ id: 1 }]);
  assert.equal(text, '[\n  {\n    "id": 1\n  }\n]\n');
  assert.equal(sha256(text), sha256('[\n  {\n    "id": 1\n  }\n]\n'));
  assert.match(sha256(text), /^[0-9a-f]{64}$/);
});

test('manifest: script version, game, label, UTC time, git commit and per-table entries', () => {
  const m = buildManifest({
    game: 'wardogs', label: 'pre Season 3', exportedAt: '2026-11-08T12:00:00.000Z', gitCommit: 'abc123', gitDirty: false,
    sourceHost: 'example.supabase.co',
    tables: [{ table: 'wardogs_ttk', key: 'id', filter: "game_slug = 'wardogs'", rows: 2, dbCount: 2, file: 'wardogs_ttk.json', bytes: 10, sha256: 'f'.repeat(64), max_updated_at: null, columns: ['id'] }],
  });
  assert.equal(m.script_version, SCRIPT_VERSION);
  assert.equal(m.game, 'wardogs');
  assert.equal(m.label, 'pre Season 3');
  assert.equal(m.exported_at_utc, '2026-11-08T12:00:00.000Z');
  assert.equal(m.git_commit, 'abc123');
  assert.equal(m.git_dirty, false);
  assert.ok(m.source.includes('example.supabase.co') && m.source.includes('No keys stored'));
  assert.deepEqual(m.files[0], {
    file: 'wardogs_ttk.json', table: 'wardogs_ttk', filter: "game_slug = 'wardogs'", order_key: 'id', rows: 2,
    db_count_at_capture: 2, bytes: 10, sha256: 'f'.repeat(64), max_updated_at: null, columns: ['id'],
  });
  assert.equal(buildManifest({ game: 'wardogs', tables: [] }).label, null);
});

// In-memory fake PostgREST client: select(*, {count, head}) + eq + order + range over per-table rows.
function fakeDb(tables, opts = {}) {
  const log = [];
  return {
    log,
    from(table) {
      const all = tables[table] || [];
      const q = { filters: [], orderKey: null, head: false };
      const b = {
        select(cols, o) { q.head = !!(o && o.head); return b; },
        eq(col, v) { q.filters.push([col, v]); return b; },
        order(k) { q.orderKey = k; return b; },
        range(from, to) {
          log.push([table, 'range', from, to, q.orderKey]);
          let rows = all.filter((r) => q.filters.every(([c, v]) => r[c] === v));
          if (q.orderKey) rows = rows.slice().sort((a, b2) => (a[q.orderKey] < b2[q.orderKey] ? -1 : 1));
          return Promise.resolve({ data: rows.slice(from, to + 1), error: null });
        },
        then(resolve) {
          const rows = all.filter((r) => q.filters.every(([c, v]) => r[c] === v));
          const extra = (opts.countSkew && opts.countSkew[table]) || 0;
          resolve({ count: rows.length + extra, error: null });
        },
        insert() { log.push(['WRITE']); },
      };
      return b;
    },
  };
}

function wardogsTables(nBallistics) {
  const t = {};
  for (const s of GAME_TABLES.wardogs) t[s.table] = [];
  t.weapon_stats = [{ id: 2, game_slug: 'wardogs', name: 'M4', updated_at: '2026-10-26T21:23:53.46154+00:00' },
    { id: 1, game_slug: 'marathon', name: 'Overrun AR', updated_at: '2026-10-08T16:40:00+00:00' }];
  for (let i = 1; i <= nBallistics; i++) t.wardogs_ballistics.push({ id: i, game_slug: 'wardogs', damage: i });
  return t;
}

test('run, dry run: counts only, writes nothing, and never calls a write method', async () => {
  const db = fakeDb(wardogsTables(3));
  const writes = [];
  const lines = [];
  const r = await run({ game: 'wardogs', out: 'C:/nonexistent-snapshot-dir-303', write: false },
    { db: readOnlyClient(db), log: (l) => lines.push(l), fsw: { mkdirSync: () => writes.push('mkdir'), writeFileSync: () => writes.push('write') } });
  assert.equal(r.written, false);
  assert.deepEqual(writes, []);
  assert.ok(lines[0].startsWith('DRY RUN'));
  assert.ok(lines.some((l) => /weapon_stats\s+1 rows/.test(l)), 'only the wardogs weapon_stats row is counted');
  assert.ok(!db.log.some((e) => e[0] === 'WRITE'));
});

test('run, write: pages past PAGE_SIZE in id order, filters by game, then writes files and the manifest', async () => {
  const n = PAGE_SIZE + 5;
  const db = fakeDb(wardogsTables(n));
  const written = {};
  const r = await run({ game: 'wardogs', out: 'C:/nonexistent-snapshot-dir-303', label: 'test', write: true },
    { db: readOnlyClient(db), log: () => {}, now: () => new Date('2026-11-08T12:00:00Z'), git: () => ({ commit: 'abc', dirty: false }), sourceHost: 'h',
      fsw: { mkdirSync: () => {}, writeFileSync: (p, text) => { written[p.split(/[\\/]/).pop()] = text; } } });
  assert.equal(r.written, true);
  const pages = db.log.filter((e) => e[0] === 'wardogs_ballistics');
  assert.deepEqual(pages.map((e) => [e[2], e[4]]), [[0, 'id'], [PAGE_SIZE, 'id']], 'two pages, both ordered by id');
  assert.equal(JSON.parse(written['wardogs_ballistics.json']).length, n);
  assert.deepEqual(JSON.parse(written['weapon_stats.json']).map((x) => x.name), ['M4'], 'no other game rows');
  const m = JSON.parse(written['MANIFEST.json']);
  assert.equal(m.files.length, 6);
  const wb = m.files.find((f) => f.table === 'wardogs_ballistics');
  assert.equal(wb.rows, n);
  assert.equal(wb.sha256, sha256(written['wardogs_ballistics.json']));
  assert.equal(m.files.find((f) => f.table === 'weapon_stats').max_updated_at, '2026-10-26T21:23:53.46154+00:00');
  assert.equal(m.exported_at_utc, '2026-11-08T12:00:00.000Z');
  assert.equal(m.git_commit, 'abc');
});

test('run, write: a count mismatch aborts before any file is written', async () => {
  const db = fakeDb(wardogsTables(3), { countSkew: { wardogs_ballistics: 1 } });
  const writes = [];
  await assert.rejects(
    run({ game: 'wardogs', out: 'C:/nonexistent-snapshot-dir-303', write: true },
      { db: readOnlyClient(db), log: () => {}, git: () => ({ commit: null, dirty: null }), fsw: { mkdirSync: () => writes.push('mkdir'), writeFileSync: () => writes.push('write') } }),
    /wardogs_ballistics: exported 3 rows but count\(\*\) is 4; snapshot aborted/);
  assert.deepEqual(writes, []);
});
