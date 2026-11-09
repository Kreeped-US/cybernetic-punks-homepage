// scripts/diff-game-snapshots.mjs
// OFFLINE diff of game-data snapshot folders (Brief 308; sparse proposal mode Brief 325). No database, no network,
// no supabase import. Reads MANIFEST.json and the table JSON files of each snapshot folder, checks every file's
// sha256 against its manifest, compares rows on natural keys (lib/gamedata/gameTables.js) and writes changes.json
// and REPORT.md to --out. Writes nothing else. --out may not be inside any input folder.
//
// USAGE (also: --help):
//   full:   node scripts/diff-game-snapshots.mjs --game wardogs --from <older snapshot dir> --to <newer snapshot dir> --out <dir>
//   sparse: node scripts/diff-game-snapshots.mjs --game wardogs --from <base snapshot dir> --sparse <proposal dir> --out <dir>

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GAME_DATA_TABLES } from '../lib/gamedata/gameTables.js';
import {
  loadSide, manifestEntry, diffSnapshots, changesJson, reportMarkdown, summaryLine, assertOutAllowed, isInside, sha256Hex,
} from '../lib/gamedata/snapshotDiff.js';
import {
  parseCsv, parseManifestTxt, sparseDiffTable, sparseChangesJson, sparseReportMarkdown, sparseSummaryLine, NULL_TOKEN,
} from '../lib/gamedata/sparseProposal.js';

export const HELP = [
  'Offline game-data snapshot diff. Reads files only; writes changes.json and REPORT.md to --out.',
  '',
  'Full mode (two complete snapshots):',
  '  node scripts/diff-game-snapshots.mjs --game <game> --from <older snapshot dir> --to <newer snapshot dir> --out <dir>',
  '',
  'Sparse mode (a base snapshot plus a partial proposal, e.g. patch notes):',
  '  node scripts/diff-game-snapshots.mjs --game <game> --from <base snapshot dir> --sparse <proposal dir> --out <dir>',
  '',
  '  The proposal folder holds one CSV per table, named <table>.csv (weapon_stats.csv, wardogs_ttk.csv, ...).',
  '  Each CSV has the table key columns (lib/gamedata/gameTables.js) plus only the columns being proposed.',
  '  Empty cell = not provided (skipped). ' + NULL_TOKEN + ' = propose null. Optional _source and _note columns are carried',
  '  into the output and never compared. Only provided fields that differ are reported; nothing is reported as',
  '  removed. Keys not in the base are listed as new-row candidates with typo hints. An unknown column stops the',
  '  run. If the folder has a MANIFEST.txt ("<sha256>  <bytes>  <file>" lines), each table CSV must be listed there',
  '  and match.',
  '',
  '--out may not be inside any input folder. --help prints this text.',
].join('\n');

export function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) return { help: true };
  const out = { game: null, from: null, to: null, out: null };
  let sparse = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--game', '--from', '--to', '--out', '--sparse'].includes(a)) {
      const v = argv[i + 1];
      if (v == null || v.startsWith('--')) throw new Error(a + ' needs a value');
      if (a === '--sparse') sparse = v; else out[a.slice(2)] = v;
      i++;
    } else throw new Error('unknown argument: ' + a);
  }
  if (sparse != null) {
    if (out.to) throw new Error('--sparse and --to cannot be used together (sparse mode compares a proposal against --from)');
    for (const k of ['game', 'from', 'out']) if (!out[k]) throw new Error('--' + k + ' is required');
    delete out.to;
    out.sparse = sparse;
  } else {
    for (const k of ['game', 'from', 'to', 'out']) if (!out[k]) throw new Error('--' + k + ' is required');
  }
  if (!GAME_DATA_TABLES[out.game]) throw new Error('no table config for game "' + out.game + '" (known: ' + Object.keys(GAME_DATA_TABLES).join(', ') + ')');
  return out;
}

// Reads one snapshot folder: its manifest plus the bytes of each configured table's JSON file.
export function readSide(dir, specs, label, fs = { readFileSync, existsSync }) {
  const mPath = path.join(dir, 'MANIFEST.json');
  if (!fs.existsSync(mPath)) throw new Error(label + ': no MANIFEST.json in ' + dir);
  const manifest = JSON.parse(fs.readFileSync(mPath, 'utf8'));
  const files = {};
  for (const s of specs) {
    const entry = manifestEntry(manifest, s.table);
    const p = path.join(dir, entry.file);
    if (fs.existsSync(p)) files[entry.file] = fs.readFileSync(p);
  }
  return { label, manifest, files };
}

// Reads a sparse proposal folder: <table>.csv per configured table, checked against MANIFEST.txt when present.
// Returns { tables: { [table]: parseCsv result }, ignoredFiles, manifestChecked }.
export function readProposal(dir, specs, fs = { readFileSync, existsSync, readdirSync }) {
  if (!fs.existsSync(dir)) throw new Error('sparse: proposal folder not found: ' + dir);
  const names = fs.readdirSync(dir);
  const mPath = path.join(dir, 'MANIFEST.txt');
  const manifest = fs.existsSync(mPath) ? parseManifestTxt(fs.readFileSync(mPath, 'utf8')) : null;
  const tableFiles = new Set(specs.map((s) => s.table + '.csv'));
  const tables = {};
  for (const s of specs) {
    const file = s.table + '.csv';
    if (!names.includes(file)) continue;
    const bytes = fs.readFileSync(path.join(dir, file));
    if (manifest) {
      const e = manifest.find((x) => x.file === file);
      if (!e) throw new Error('sparse: ' + file + ' is not listed in the proposal MANIFEST.txt; refusing to run');
      const actual = sha256Hex(bytes);
      if (actual !== e.sha256) throw new Error('sparse: ' + file + ' sha256 ' + actual + ' does not match MANIFEST.txt ' + e.sha256 + '; refusing to run');
    }
    try { tables[s.table] = parseCsv(bytes.toString('utf8')); } catch (err) { throw new Error('sparse: ' + file + ': ' + err.message); }
  }
  if (!Object.keys(tables).length) throw new Error('sparse: no table CSV in ' + dir + ' (expected one of ' + Array.from(tableFiles).join(', ') + ')');
  const ignoredFiles = names.filter((n) => /\.csv$/i.test(n) && !tableFiles.has(n)).sort();
  return { tables, ignoredFiles, manifestChecked: !!manifest };
}

// Runs the diff and writes the two output files. Returns { tables, summary }.
export function run(opts, deps = {}) {
  const fsr = deps.fs || { readFileSync, existsSync, readdirSync };
  const fsw = deps.fsw || { mkdirSync, writeFileSync };
  const log = deps.log || console.log;
  if (opts.sparse) return runSparse(opts, fsr, fsw, log);
  assertOutAllowed(opts.out, opts.from, opts.to);
  const specs = GAME_DATA_TABLES[opts.game];
  const fromSide = readSide(opts.from, specs, 'from', fsr);
  const toSide = readSide(opts.to, specs, 'to', fsr);
  const tables = diffSnapshots(specs, loadSide(fromSide, specs, opts.game), loadSide(toSide, specs, opts.game));
  const meta = {
    game: opts.game,
    fromName: path.basename(path.resolve(opts.from)), toName: path.basename(path.resolve(opts.to)),
    fromExported: fromSide.manifest.exported_at_utc || fromSide.manifest.captured_at_utc || null,
    toExported: toSide.manifest.exported_at_utc || toSide.manifest.captured_at_utc || null,
  };
  fsw.mkdirSync(opts.out, { recursive: true });
  fsw.writeFileSync(path.join(opts.out, 'changes.json'), changesJson(tables));
  fsw.writeFileSync(path.join(opts.out, 'REPORT.md'), reportMarkdown(tables, meta));
  const summary = summaryLine(tables);
  log(summary);
  return { tables, summary };
}

// Sparse mode: everything is read and checked before anything is written, so a refusal writes nothing.
function runSparse(opts, fsr, fsw, log) {
  if (isInside(opts.out, opts.from)) throw new Error('--out is inside the --from snapshot folder; refusing');
  if (isInside(opts.out, opts.sparse)) throw new Error('--out is inside the --sparse proposal folder; refusing');
  const specs = GAME_DATA_TABLES[opts.game];
  const baseSide = readSide(opts.from, specs, 'base', fsr);
  const base = loadSide(baseSide, specs, opts.game);
  const proposal = readProposal(opts.sparse, specs, fsr);
  const tables = [], skippedTables = [];
  for (const s of specs) {
    if (!proposal.tables[s.table]) { skippedTables.push(s.table); continue; }
    const rows = base[s.table] || [];
    const entry = manifestEntry(baseSide.manifest, s.table);
    const schema = new Set(Array.isArray(entry.columns) ? entry.columns : []);
    for (const r of rows) for (const c of Object.keys(r || {})) schema.add(c);
    tables.push(sparseDiffTable(s, rows, Array.from(schema), proposal.tables[s.table], opts.game));
  }
  const meta = {
    game: opts.game, baseName: path.basename(path.resolve(opts.from)), proposalName: path.basename(path.resolve(opts.sparse)),
    baseExported: baseSide.manifest.exported_at_utc || baseSide.manifest.captured_at_utc || null,
    proposalManifest: proposal.manifestChecked, skippedTables, ignoredFiles: proposal.ignoredFiles,
  };
  fsw.mkdirSync(opts.out, { recursive: true });
  fsw.writeFileSync(path.join(opts.out, 'changes.json'), sparseChangesJson(tables));
  fsw.writeFileSync(path.join(opts.out, 'REPORT.md'), sparseReportMarkdown(tables, meta));
  const summary = sparseSummaryLine(tables);
  log(summary);
  return { tables, summary, skippedTables };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) { console.log(HELP); process.exit(0); }
    run(opts);
    process.exit(0);
  } catch (e) {
    console.error('ERROR: ' + (e && e.message));
    process.exit(1);
  }
}
