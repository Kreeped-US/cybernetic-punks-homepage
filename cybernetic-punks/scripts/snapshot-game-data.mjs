// scripts/snapshot-game-data.mjs
// OPERATOR-RUN, READ-ONLY export of one game's data tables plus a MANIFEST.json (Brief 303). Replaces the manual
// Oct 13 Wardogs export (C:\Users\justi\cnp-snapshots\2026-10-13-wardogs-pre-season2) with a repeatable one.
//
// READ-ONLY: the Supabase client is wrapped by readOnlyClient(), which throws if anything on this code path
// asks for insert, update, upsert, delete or rpc. Only select (rows, and count with head:true) is used.
//
// DRY RUN BY DEFAULT: prints each table and its row count (a count head request) and writes nothing.
// --write exports: one JSON file per table and MANIFEST.json into --out, which must not already hold files.
//
// USAGE:
//   node scripts/snapshot-game-data.mjs --game wardogs --out <dir>                    (dry run: counts only)
//   node scripts/snapshot-game-data.mjs --game wardogs --out <dir> --label "<text>" --write
//
// FILE FORMAT (same as the Oct 13 export): UTF-8, no BOM, a JSON array of row objects with keys in the order
// PostgREST returns them (database column order for select *), rows ordered by the table's stable key
// ascending, 2-space indent, trailing newline.
//
// PAGING: every page uses an explicit .order() on the table's stable key (the primary key id), so rows cannot
// repeat or drop between pages. The export fails if a key repeats, if the keys are not strictly ascending, or if
// the exported row count differs from a count(*) head request on the same filter.
//
// ENV: reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY from the environment or .env.local. Never prints
// a key; only the URL host is printed.

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const SCRIPT_VERSION = '1.0.0';
export const PAGE_SIZE = 1000;

// One entry per game. Every table is filtered by game_slug and paged in `key` order. Another game is a one-line
// addition here once its table list is known; nothing is guessed for games not listed.
export const GAME_TABLES = {
  wardogs: [
    { table: 'weapon_stats', key: 'id' },
    { table: 'wardogs_ttk', key: 'id' },
    { table: 'wardogs_ballistics', key: 'id' },
    { table: 'wardogs_ammo', key: 'id' },
    { table: 'wardogs_economy_items', key: 'id' },
    { table: 'wardogs_attachments', key: 'id' },
  ],
};

const WRITE_METHODS = ['insert', 'update', 'upsert', 'delete'];

// ---- arguments ----

export function parseArgs(argv) {
  const out = { game: null, out: null, label: null, write: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--write') out.write = true;
    else if (a === '--game' || a === '--out' || a === '--label') {
      const v = argv[i + 1];
      if (v == null || v.startsWith('--')) throw new Error(a + ' needs a value');
      out[a.slice(2)] = v;
      i++;
    } else throw new Error('unknown argument: ' + a);
  }
  if (!out.game) throw new Error('--game is required');
  if (!out.out) throw new Error('--out is required');
  if (!GAME_TABLES[out.game]) throw new Error('no table list for game "' + out.game + '" (known: ' + Object.keys(GAME_TABLES).join(', ') + ')');
  return out;
}

// ---- the output directory rule ----

// Throws unless dir is absent or an empty directory. Never deletes or overwrites anything.
export function assertOutDirUsable(dir, fs = { existsSync, statSync, readdirSync }) {
  if (!fs.existsSync(dir)) return;
  if (!fs.statSync(dir).isDirectory()) throw new Error('--out exists and is not a directory: ' + dir);
  const entries = fs.readdirSync(dir);
  if (entries.length > 0) throw new Error('--out already contains ' + entries.length + ' entr' + (entries.length === 1 ? 'y' : 'ies') + '; refusing to write into it: ' + dir);
}

// ---- read-only guard ----

function guardBuilder(builder, table) {
  return new Proxy(builder, {
    get(target, prop, receiver) {
      if (WRITE_METHODS.includes(prop)) {
        return () => { throw new Error('read-only snapshot: ' + String(prop) + '() on ' + table + ' is not allowed'); };
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

// Wraps a Supabase client so from(t) only allows reads. insert/update/upsert/delete on any table and rpc throw.
export function readOnlyClient(client) {
  return {
    from(table) { return guardBuilder(client.from(table), table); },
    rpc() { throw new Error('read-only snapshot: rpc() is not allowed'); },
  };
}

// ---- paging and checks (pure) ----

// Throws when a key repeats or keys are not strictly ascending in the order the pages arrived.
// Keys compare as numbers when both are numbers, else as strings (uuid ids sort as text in Postgres).
export function assertStableOrder(rows, key, table) {
  const seen = new Set();
  let prev;
  rows.forEach((r, i) => {
    const k = r ? r[key] : undefined;
    if (k == null) throw new Error(table + ': row ' + i + ' has no ' + key);
    if (seen.has(k)) throw new Error(table + ': ' + key + ' ' + k + ' repeats across pages');
    if (i > 0) {
      const lt = (typeof prev === 'number' && typeof k === 'number') ? prev < k : String(prev) < String(k);
      if (!lt) throw new Error(table + ': rows are not in ascending ' + key + ' order at row ' + i);
    }
    seen.add(k);
    prev = k;
  });
}

export function assertCountMatches(table, exported, dbCount) {
  if (typeof dbCount !== 'number') throw new Error(table + ': count(*) returned no number');
  if (exported !== dbCount) throw new Error(table + ': exported ' + exported + ' rows but count(*) is ' + dbCount + '; snapshot aborted');
}

// Column names in first-seen order across all rows.
export function columnsSeen(rows) {
  const cols = [];
  const seen = new Set();
  for (const r of rows) for (const c of Object.keys(r || {})) if (!seen.has(c)) { seen.add(c); cols.push(c); }
  return cols;
}

// The newest updated_at as stored (string), or null when the column is absent or every value is null.
export function maxUpdatedAt(rows) {
  let best = null, bestMs = -Infinity;
  for (const r of rows) {
    const u = r && r.updated_at;
    if (!u) continue;
    const ms = Date.parse(u);
    if (!Number.isNaN(ms) && ms > bestMs) { bestMs = ms; best = u; }
  }
  return best;
}

export function serializeRows(rows) {
  return JSON.stringify(rows, null, 2) + '\n';
}

export function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// Builds the MANIFEST.json object. tables: [{ table, key, filter, rows, file, bytes, sha256, max_updated_at, columns }].
export function buildManifest({ game, label, exportedAt, gitCommit, gitDirty, sourceHost, tables }) {
  return {
    snapshot_tool: 'scripts/snapshot-game-data.mjs',
    script_version: SCRIPT_VERSION,
    game,
    label: label || null,
    exported_at_utc: exportedAt,
    git_commit: gitCommit || null,
    git_dirty: typeof gitDirty === 'boolean' ? gitDirty : null,
    source: 'Supabase host ' + (sourceHost || 'unknown') + ', schema public, read via PostgREST select (read-only). No keys stored.',
    format: 'JSON: UTF-8, no BOM, array of row objects, keys in the order returned (database column order), rows ordered by the stable key ascending, 2-space indent, trailing newline.',
    files: tables.map((t) => ({
      file: t.file,
      table: t.table,
      filter: t.filter,
      order_key: t.key,
      rows: t.rows,
      db_count_at_capture: t.dbCount,
      bytes: t.bytes,
      sha256: t.sha256,
      max_updated_at: t.max_updated_at,
      columns: t.columns,
    })),
  };
}

// ---- database reads ----

async function countRows(db, table, game) {
  const { count, error } = await db.from(table).select('*', { count: 'exact', head: true }).eq('game_slug', game);
  if (error) throw new Error(table + ': count failed: ' + error.message);
  return count;
}

async function fetchAll(db, table, key, game) {
  let rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db.from(table).select('*').eq('game_slug', game)
      .order(key, { ascending: true }).range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(table + ': read failed at offset ' + from + ': ' + error.message);
    const page = data || [];
    rows = rows.concat(page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

// Exports (or, without write, only counts) every table for opts.game. db must already be read-only wrapped.
export async function run(opts, deps) {
  const { db, log = console.log, now = () => new Date(), git = gitInfo, fsw = { mkdirSync, writeFileSync }, sourceHost } = deps;
  assertOutDirUsable(opts.out);
  const specs = GAME_TABLES[opts.game];
  log((opts.write ? 'WRITE' : 'DRY RUN') + ': game ' + opts.game + ', ' + specs.length + ' tables, source host ' + (sourceHost || 'unknown'));
  if (!opts.write) {
    for (const s of specs) log('  ' + s.table.padEnd(24) + ' ' + (await countRows(db, s.table, opts.game)) + ' rows');
    log('Nothing written. Add --write to export into ' + opts.out);
    return { written: false };
  }
  const tables = [];
  const files = [];
  for (const s of specs) {
    const dbCount = await countRows(db, s.table, opts.game);
    const rows = await fetchAll(db, s.table, s.key, opts.game);
    assertStableOrder(rows, s.key, s.table);
    assertCountMatches(s.table, rows.length, dbCount);
    const text = serializeRows(rows);
    const file = s.table + '.json';
    files.push({ file, text });
    tables.push({
      table: s.table, key: s.key, filter: "game_slug = '" + opts.game + "'", rows: rows.length, dbCount,
      file, bytes: Buffer.byteLength(text, 'utf8'), sha256: sha256(text), max_updated_at: maxUpdatedAt(rows), columns: columnsSeen(rows),
    });
    log('  ' + s.table.padEnd(24) + ' ' + rows.length + ' rows (count(*) ' + dbCount + ')');
  }
  const g = git();
  const manifest = buildManifest({ game: opts.game, label: opts.label, exportedAt: now().toISOString(), gitCommit: g.commit, gitDirty: g.dirty, sourceHost, tables });
  // Every table read and checked before anything is written, so a failed check leaves no partial snapshot.
  fsw.mkdirSync(opts.out, { recursive: true });
  for (const f of files) fsw.writeFileSync(path.join(opts.out, f.file), f.text);
  fsw.writeFileSync(path.join(opts.out, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  log('Wrote ' + files.length + ' table files and MANIFEST.json to ' + opts.out);
  return { written: true, manifest };
}

// ---- environment ----

// git_commit and git_dirty for the manifest. Never throws: if git is not on PATH, the folder is not a repo, or
// either command fails, that field is recorded as null and the snapshot continues. exec is a test seam.
export function gitInfo(exec = execFileSync) {
  const runGit = (args) => {
    try { return exec('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return null; }
  };
  const head = runGit(['rev-parse', 'HEAD']);
  const status = runGit(['status', '--porcelain', '--untracked-files=no']);
  const commit = typeof head === 'string' && /^[0-9a-f]{40}$/.test(head.trim()) ? head.trim() : null;
  const dirty = typeof status === 'string' ? status.trim() !== '' : null;
  return { commit, dirty };
}

function loadEnvLocal() {
  if (process.env.SUPABASE_SERVICE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  let raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  for (const line0 of raw.split('\n')) {
    const line = line0.trim();
    if (!line || line.charAt(0) === '#') continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (val.length >= 2 && (val.charAt(0) === '"' || val.charAt(0) === "'")) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  (async () => {
    let opts;
    try { opts = parseArgs(process.argv.slice(2)); } catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
    loadEnvLocal();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_KEY;
    if (!url || !key) { console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local)'); process.exit(1); }
    let host = 'unknown';
    try { host = new URL(url).host; } catch (e) { /* keep unknown */ }
    const { createClient } = await import('@supabase/supabase-js');
    const db = readOnlyClient(createClient(url, key));
    await run(opts, { db, sourceHost: host });
  })().then(() => process.exit(0), (e) => { console.error('ERROR: ' + (e && e.message)); process.exit(1); });
}
