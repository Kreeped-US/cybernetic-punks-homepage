// lib/gsc/releaseHeld.test.mjs
// PHASE 4 auto-release core (releaseHeldDrafts) under a mock supabase client. Proves the
// auto-publish safety inventory end-to-end: RELEASE only on a clean re-pass; STAYS HELD on a wrong
// value (CONTRADICTED) and on a provisional anchor (verified=false -> demoted -> UNCORROBORATED,
// recognition-preserving, never silent-released); FAIL-CLOSED abort on a store-load throw (0
// releases); ATOMIC release (the WHERE gate_status='held' closes the double-release race).
// Run: node --test lib/gsc/releaseHeld.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { releaseHeldDrafts } from './releaseHeld.js';

// ── mock supabase client ─────────────────────────────────────────────────────────────────────────
// from('feed_items'): supports .select(cols).eq('gate_status','held') (the held scan) AND
//   .update(vals).eq('id',id).eq('gate_status','held').select('id') (the ATOMIC release). The update
//   matches ALL filters against the LIVE db rows, so a row already flipped to 'released' matches 0.
// from('dmz_*'): the store tables, .select('*').eq('game_slug',g).range(a,b) -> single page (like
//   storeLoader.test's mock); failStore makes one table error (pageAllStrict throws -> abort).
function mockClient(db) {
  return {
    from(table) {
      if (table === 'feed_items') return feedItemsChain(db);
      return storeChain(table, db.storeTables || {}, db.failStore);
    },
  };
}

function feedItemsChain(db) {
  const st = { mode: null, vals: null, filters: {}, returning: false };
  const chain = {
    select() { if (st.mode === 'update') st.returning = true; else st.mode = 'select'; return chain; },
    update(vals) { st.mode = 'update'; st.vals = vals; return chain; },
    eq(col, val) { st.filters[col] = val; return chain; },
    then(resolve, reject) { return Promise.resolve().then(() => execFeed(st, db)).then(resolve, reject); },
  };
  return chain;
}

function matches(row, filters) {
  return Object.keys(filters).every((k) => row[k] === filters[k]);
}

function execFeed(st, db) {
  if (st.mode === 'select') {
    if (db.selectError) return { data: null, error: { message: db.selectError } };
    return { data: db.rows.filter((r) => matches(r, st.filters)).map((r) => ({ ...r })), error: null };
  }
  if (st.mode === 'update') {
    if (db.beforeUpdate) db.beforeUpdate(st.filters, db);   // simulate a concurrent run (race test)
    const target = db.rows.filter((r) => matches(r, st.filters));   // atomic WHERE: id AND gate_status='held'
    target.forEach((r) => Object.assign(r, st.vals));
    db.updateCalls.push({ filters: { ...st.filters }, vals: { ...st.vals }, matched: target.length });
    if (db.updateError) return { data: null, error: { message: db.updateError } };
    return { data: st.returning ? target.map((r) => ({ id: r.id })) : null, error: null };
  }
  return { data: null, error: null };
}

function storeChain(table, storeTables, failStore) {
  const chain = {
    select() { return chain; },
    eq() { return chain; },
    range(a) {
      if (failStore === table) return Promise.resolve({ data: null, error: { message: 'boom' } });
      return Promise.resolve({ data: a === 0 ? (storeTables[table] || []) : [], error: null });
    },
  };
  return chain;
}

const EMPTY_STORE_TABLES = { dmz_recipes: [], dmz_ingredients: [], dmz_lieutenants: [], dmz_attachments: [], dmz_recipe_ingredients: [] };
const weaponTables = (weaponRow) => ({ ...EMPTY_STORE_TABLES, dmz_weapons: [weaponRow] });
const heldRow = (over) => ({ id: 1, slug: 'rifle-24', headline: 'Rifle 24', body: 'The PLACEHOLDER Rifle deals 24 damage.', editor: 'x', created_at: '2026-10-24', game_slug: 'dmz', gate_findings: [{ class: 'UNCORROBORATED' }], is_published: false, gate_status: 'held', ...over });

// capture console.log to assert the RELEASE CERTIFICATE (freeing rows + gate version).
function withCapturedLogs(fn) {
  const lines = [];
  const orig = console.log;
  console.log = (...a) => { lines.push(a.join(' ')); };
  return Promise.resolve().then(fn).finally(() => { console.log = orig; }).then(() => lines);
}

// ── RELEASE: store row now verified=TRUE with the matching value -> clean re-pass -> RELEASES ──────
test('RELEASE: a held draft whose blocking claim now corroborates a VERIFIED row -> released (atomic, certificate logged)', async () => {
  const db = { rows: [heldRow()], storeTables: weaponTables({ slug: 'w1', name: 'PLACEHOLDER Rifle', stats: { damage: 24 }, verified: true, verified_source: 'Official Deep Dive' }), updateCalls: [] };
  let summary;
  const logs = await withCapturedLogs(async () => { summary = await releaseHeldDrafts(mockClient(db), { runDate: '2026-10-24', gateVersion: 'abc1234' }); });
  assert.equal(summary.released, 1);
  assert.deepEqual(summary.releasedSlugs, ['rifle-24']);
  // the DB row is now published + released + findings cleared
  assert.equal(db.rows[0].is_published, true);
  assert.equal(db.rows[0].gate_status, 'released');
  assert.equal(db.rows[0].gate_findings, null);
  // ATOMIC: the update carried the gate_status='held' guard
  assert.equal(db.updateCalls[0].filters.gate_status, 'held');
  assert.equal(db.updateCalls[0].filters.id, 1);
  // RELEASE CERTIFICATE: freeing row (entity/field/value + verified_source) + gate version
  const cert = logs.find((l) => l.includes('RELEASED rifle-24'));
  assert.ok(cert, 'a RELEASED certificate line is logged');
  assert.ok(cert.includes('gate=abc1234'), 'the gate version stamps the certificate');
  assert.ok(cert.includes('PLACEHOLDER Rifle') && cert.includes('Official Deep Dive'), 'the freeing row names the verified entity + source');
});

// ── STAYS HELD (wrong value): the store says 24, the draft still claims 99 -> CONTRADICTED -> held ─
test('STAYS HELD (wrong value): a still-contradicting claim -> CONTRADICTED -> not released', async () => {
  const db = { rows: [heldRow({ body: 'The PLACEHOLDER Rifle deals 99 damage.' })], storeTables: weaponTables({ slug: 'w1', name: 'PLACEHOLDER Rifle', stats: { damage: 24 }, verified: true, verified_source: 'x' }), updateCalls: [] };
  const summary = await releaseHeldDrafts(mockClient(db), { runDate: '2026-10-24', gateVersion: 'abc1234' });
  assert.equal(summary.released, 0);
  assert.equal(summary.stillHeld, 1);
  assert.equal(db.rows[0].gate_status, 'held', 'the row is untouched');
  assert.equal(db.updateCalls.length, 0, 'no UPDATE is even attempted for a held row');
});

// ── STAYS HELD (provisional anchor): correct value but verified=FALSE -> demoted -> UNCORROBORATED ─
test('STAYS HELD (provisional anchor): matching value but verified=FALSE -> demoted -> UNCORROBORATED-held (NEVER silent-released)', async () => {
  const db = { rows: [heldRow()], storeTables: weaponTables({ slug: 'w1', name: 'PLACEHOLDER Rifle', stats: { damage: 24 }, verified: false, verified_source: null }), updateCalls: [] };
  const summary = await releaseHeldDrafts(mockClient(db), { runDate: '2026-10-24', gateVersion: 'abc1234' });
  assert.equal(summary.released, 0, 'a provisional anchor does not release');
  assert.equal(summary.stillHeld, 1);
  assert.equal(db.rows[0].gate_status, 'held', 'recognition-preserving: held, not dropped to silent-publish');
  assert.equal(db.updateCalls.length, 0);
});

// ── STAYS HELD (throw, fail-closed): a store-load error ABORTS the run, 0 releases ────────────────
test('FAIL-CLOSED: a store-load throw ABORTS the run (0 releases, the held row untouched)', async () => {
  const db = { rows: [heldRow()], storeTables: weaponTables({ slug: 'w1', name: 'PLACEHOLDER Rifle', stats: { damage: 24 }, verified: true, verified_source: 'x' }), failStore: 'dmz_weapons', updateCalls: [] };
  const summary = await releaseHeldDrafts(mockClient(db), { runDate: '2026-10-24', gateVersion: 'abc1234' });
  assert.equal(summary.aborted, true, 'a broken store aborts -- frees nothing');
  assert.equal(summary.released, 0);
  assert.equal(db.rows[0].gate_status, 'held', 'the row stays held');
  assert.equal(db.updateCalls.length, 0);
});

// ── ATOMIC race: an overlapping run releases row2 first -> our UPDATE matches 0 rows -> we skip it ─
test('ATOMIC: the gate_status=held WHERE closes the double-release race (a row stolen mid-run is skipped, not double-released)', async () => {
  const row1 = heldRow({ id: 1, slug: 'rifle-a' });
  const row2 = heldRow({ id: 2, slug: 'rifle-b' });
  const db = {
    rows: [row1, row2],
    storeTables: weaponTables({ slug: 'w1', name: 'PLACEHOLDER Rifle', stats: { damage: 24 }, verified: true, verified_source: 'x' }),
    updateCalls: [],
    // when row1 is updated, a concurrent run has ALREADY released row2 (flip it live).
    beforeUpdate(filters, d) { if (filters.id === 1) { const r = d.rows.find((x) => x.id === 2); if (r) r.gate_status = 'released'; } },
  };
  const summary = await releaseHeldDrafts(mockClient(db), { runDate: '2026-10-24', gateVersion: 'abc1234' });
  assert.equal(summary.released, 1, 'only row1 -- row2 was stolen by the concurrent run');
  assert.deepEqual(summary.releasedSlugs, ['rifle-a']);
  // row2's update matched 0 rows (already 'released'); it is NOT re-released, NOT an error
  const row2Update = db.updateCalls.find((u) => u.filters.id === 2);
  assert.equal(row2Update.matched, 0, 'the atomic WHERE matched 0 for the stolen row');
  assert.equal((summary.errors || []).length, 0, 'a lost race is not an error');
});

// ── unknown game_slug: held (fail-closed, surgical) AND surfaced with a loud warn ────────────────
test('UNKNOWN game_slug: the row stays held (fail-closed) and is SURFACED with a warn (not silently stranded)', async () => {
  const db = { rows: [heldRow({ game_slug: 'not-a-game' })], storeTables: EMPTY_STORE_TABLES, updateCalls: [] };
  const warns = [];
  const origWarn = console.warn;
  console.warn = (...a) => { warns.push(a.join(' ')); };
  let summary;
  try { summary = await releaseHeldDrafts(mockClient(db), { runDate: '2026-10-24', gateVersion: 'abc1234' }); }
  finally { console.warn = origWarn; }
  assert.equal(summary.released, 0, 'an unknown-game row does not release');
  assert.equal(summary.stillHeld, 1);
  assert.equal(db.rows[0].gate_status, 'held', 'held, not aborted -- surgical fail-closed');
  const warn = warns.find((w) => w.includes('unknown/unregistered game_slug') && w.includes('rifle-24'));
  assert.ok(warn, 'the mis-slugged held row is surfaced with a loud warn, not silently held');
});

// ── no-op: nothing held -> zero work ──────────────────────────────────────────────────────────────
test('no-op: 0 held rows -> released 0, checked 0 (no store load)', async () => {
  const db = { rows: [heldRow({ gate_status: 'clear', is_published: true })], storeTables: EMPTY_STORE_TABLES, updateCalls: [] };
  const summary = await releaseHeldDrafts(mockClient(db), { runDate: '2026-10-24', gateVersion: 'abc1234' });
  assert.equal(summary.released, 0);
  assert.equal(summary.checked, 0);
});
