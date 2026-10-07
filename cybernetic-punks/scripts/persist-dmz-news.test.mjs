// scripts/persist-dmz-news.test.mjs
// persist-dmz-news.mjs inserts HELD, never published (2026-10-07): every insert payload carries
// heldPublishState() (is_published=false, gate_status='clear'), the dry-run reports all four offline
// checks, and no code path in the script sets is_published true. Importing the script never runs main
// (direct-execution guard), so these tests make no DB or network call. Run inside the suite (ext-resolve).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ARTICLES, buildRows, runDryChecks, heldLine } from './persist-dmz-news.mjs';
import { heldPublishState } from '../lib/content/heldForReview.js';

const rows = buildRows(ARTICLES);

test('every insert payload is HELD: is_published=false, gate_status=clear (never true)', () => {
  assert.ok(rows.length > 0);
  for (const r of rows) {
    assert.equal(r.is_published, false, r.slug);
    assert.equal(r.gate_status, 'clear', r.slug + " -- 'clear' (operator draft), not 'held' (auto-released)");
    assert.notEqual(r.is_published, true);
    assert.equal(r.game_slug, 'dmz');
    assert.equal(r.editor, 'NEXUS');
  }
});

test('the held state is the cron hold state, single-sourced from heldPublishState()', () => {
  const hp = heldPublishState();
  for (const r of rows) {
    assert.equal(r.is_published, hp.is_published);
    assert.equal(r.gate_status, hp.gate_status);
  }
});

test('an article object cannot override the held state (heldPublishState applied last)', () => {
  const [r] = buildRows([{ headline: 'Test headline for a DMZ draft', body: 'x', tags: [], is_published: true, gate_status: 'released' }]);
  assert.equal(r.is_published, false);
  assert.equal(r.gate_status, 'clear');
});

test('the rest of the payload is unchanged (source, url, slug derivation, tags)', () => {
  const bySlug = Object.fromEntries(rows.map((r) => [r.slug, r]));
  for (const s of ['dmz-forward-operating-base-every-hub-system-detailed', 'dmz-3d-printer-crafting-system-every-category-detailed',
    'dmz-hajin-exclusion-zone-what-the-deep-dive-reveals', 'dmz-vs-warzone', 'dmz-gunsmith', 'dmz-missions', 'dmz-survival', 'dmz-weapon-vendor']) {
    assert.ok(bySlug[s], 'slug unchanged: ' + s);
  }
  for (const r of rows) {
    assert.equal(r.source, 'DEEP DIVE');
    assert.equal(r.source_url, 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive');
    assert.equal(r.ce_score, 0);
    assert.equal(r.thumbnail, null);
    assert.ok(Array.isArray(r.tags));
  }
});

test('dry-run reports all four checks for every row (offline)', async () => {
  const checks = await runDryChecks(rows);
  assert.equal(checks.length, rows.length);
  for (const c of checks) {
    for (const k of ['integrity', 'gate', 'corrections', 'dedup']) {
      assert.equal(typeof c[k], 'string', c.slug + ' ' + k);
      assert.ok(c[k].length > 0);
    }
    assert.match(c.integrity, /^(PASS|FAIL)/);
    assert.match(c.gate, /^(CLEAR|HOLD) \(fail-closed/);
    assert.match(c.corrections, /^(PASS|WARN)/);
    assert.match(c.dedup, /^(PASS|REVIEW|BLOCK)/);
  }
});

test('dry-run checks catch problems: a stub body fails integrity, a near-duplicate headline is flagged', async () => {
  const fob = rows.find((r) => r.slug === 'dmz-forward-operating-base-every-hub-system-detailed');
  const extra = buildRows([{ headline: fob.headline + ' explained', body: 'TODO', tags: [], slug: 'dmz-fob-dup-test' }])[0];
  const checks = await runDryChecks([...rows, extra]);
  const c = checks.find((x) => x.slug === 'dmz-fob-dup-test');
  assert.match(c.integrity, /^FAIL/, 'stub body fails integrity');
  assert.match(c.dedup, /^(BLOCK|REVIEW)/, 'near-duplicate of the FOB headline is flagged');
});

test('no code path in the script sets is_published true (source check)', () => {
  const src = readFileSync(new URL('./persist-dmz-news.mjs', import.meta.url), 'utf8');
  const code = src.split(/\r?\n/).filter((l) => !/^\s*\/\//.test(l)).join('\n'); // ignore comment lines
  assert.doesNotMatch(code, /is_published\s*:\s*true/);
  assert.doesNotMatch(code, /is_published\s*=\s*true/);
  assert.doesNotMatch(code, /\.update\(/, 'the script never updates rows (existing rows are untouched)');
  assert.match(code, /heldPublishState\(\)/);
  assert.match(code, /import\.meta\.url === pathToFileURL\(process\.argv\[1\]\)\.href\) \{/, 'main runs only when executed directly');
  assert.match(code, /main\(\)\.catch\(/, 'failures are caught: message + exit 1, no stack trace');
});

test('heldLine: the final line reports the read-back state and where to approve', () => {
  const line = heldLine({ id: '00000000-0000-0000-0000-000000000000', slug: 'dmz-weapon-vendor', is_published: false, gate_status: 'clear' });
  assert.equal(line, 'HELD  id=00000000-0000-0000-0000-000000000000  slug=dmz-weapon-vendor  (is_published=false, gate_status=clear)  -- approve at the admin drafts page (/admin/review)');
});

test('--dry WITHOUT the alias hook: prints the help message, exits 1, no stack trace, nothing written', () => {
  // Spawned as a separate plain-node process (no --import hook) so the dynamic dedupGate import fails.
  // --dry never creates a DB client, so this cannot write; the Supabase env vars are removed anyway.
  const env = { ...process.env };
  delete env.SUPABASE_SERVICE_KEY;
  delete env.NEXT_PUBLIC_SUPABASE_URL;
  delete env.NODE_OPTIONS;
  const script = fileURLToPath(new URL('./persist-dmz-news.mjs', import.meta.url));
  const r = spawnSync(process.execPath, ['--no-warnings', script, '--dry'], { env, encoding: 'utf8', cwd: fileURLToPath(new URL('..', import.meta.url)) });
  assert.equal(r.status, 1, 'exit code 1');
  assert.match(r.stderr, /ERROR: the dedup check needs the alias hook\. Run: node --import \.\/scripts\/ext-resolve\.register\.mjs scripts\/persist-dmz-news\.mjs --dry/);
  assert.doesNotMatch(r.stderr, /\n\s+at /, 'no stack trace');
  assert.doesNotMatch(r.stdout + r.stderr, /HELD  id=|SKIP \(exists\)/, 'nothing inserted or looked up');
  assert.match(r.stdout, /DRY -- no write/);
});
