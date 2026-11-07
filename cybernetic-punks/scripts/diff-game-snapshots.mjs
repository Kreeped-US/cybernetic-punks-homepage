// scripts/diff-game-snapshots.mjs
// OFFLINE diff of two game-data snapshot folders (Brief 308). No database, no network, no supabase import.
// Reads MANIFEST.json and the table JSON files of each folder, checks every file's sha256 against its manifest,
// compares rows on natural keys (lib/gamedata/gameTables.js) and writes changes.json and REPORT.md to --out.
// Writes nothing else. --out may not be inside either snapshot folder.
//
// USAGE:
//   node scripts/diff-game-snapshots.mjs --game wardogs --from <older snapshot dir> --to <newer snapshot dir> --out <dir>

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { GAME_DATA_TABLES } from '../lib/gamedata/gameTables.js';
import {
  loadSide, manifestEntry, diffSnapshots, changesJson, reportMarkdown, summaryLine, assertOutAllowed,
} from '../lib/gamedata/snapshotDiff.js';

export function parseArgs(argv) {
  const out = { game: null, from: null, to: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (['--game', '--from', '--to', '--out'].includes(a)) {
      const v = argv[i + 1];
      if (v == null || v.startsWith('--')) throw new Error(a + ' needs a value');
      out[a.slice(2)] = v;
      i++;
    } else throw new Error('unknown argument: ' + a);
  }
  for (const k of ['game', 'from', 'to', 'out']) if (!out[k]) throw new Error('--' + k + ' is required');
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

// Runs the diff and writes the two output files. Returns { tables, summary }.
export function run(opts, deps = {}) {
  const fsr = deps.fs || { readFileSync, existsSync };
  const fsw = deps.fsw || { mkdirSync, writeFileSync };
  const log = deps.log || console.log;
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    run(parseArgs(process.argv.slice(2)));
    process.exit(0);
  } catch (e) {
    console.error('ERROR: ' + (e && e.message));
    process.exit(1);
  }
}
