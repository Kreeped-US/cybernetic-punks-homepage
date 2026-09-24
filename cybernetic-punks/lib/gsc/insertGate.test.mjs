// lib/gsc/insertGate.test.mjs
// gateDraftForInsert -- the SHARED gate the cron insert path + the release re-pass actually call.
// This is the regression guard for the 2026-09-23 wardogs contamination: the golden-corpus tests
// exercised runGate/decideGate DIRECTLY and passed, but the real call site dropped crossGameEntities
// (RC-2) and re-decided from a finding subset (RC-3). These tests run the REAL path
// (loadGateStore -> runGate -> decide), so that class of wiring bug cannot regress silently.
// Run: node --test lib/gsc/insertGate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gateDraftForInsert } from './insertGate.js';

// Minimal mock supabase client (mirrors storeLoader.test.mjs): from(t).select().eq().order().range().
function mockClient(tables) {
  return {
    from(table) {
      const chain = {
        select() { return chain; },
        eq() { return chain; },
        order() { return chain; },
        range(a) { return Promise.resolve({ data: a === 0 ? (tables[table] || []) : [], error: null }); },
      };
      return chain;
    },
  };
}

// Cross-game vocab source rows: loadCrossGameVocab reads weapon_stats/shell_stats/unique_weapons
// (name + game_slug). A Marathon MULTI-WORD weapon + a Marathon shell -> the contamination vocab.
const ROSTER = {
  weapon_stats: [{ name: 'MP43', game_slug: 'wardogs' }, { name: 'BR33 Volley Rifle', game_slug: 'marathon' }],
  shell_stats: [{ name: 'Destroyer', game_slug: 'marathon' }],
  unique_weapons: [],
};
const draft = (game, body) => ({ slug: 'd', editor: 'NEXUS', created_at: '2026-09-24', body, game_slug: game });

test('RC-2: a WARDOGS draft naming a Marathon entity -> HELD with CROSS_GAME_ENTITY (crossGameEntities is LOADED, not dropped)', async () => {
  const out = await gateDraftForInsert(mockClient(ROSTER), draft('wardogs', 'The BR33 Volley Rifle holds S-tier this cycle.'), { runDate: '2026-09-24' });
  assert.equal(out.decision.hold, true);
  assert.equal(out.decision.gate_status, 'held');
  assert.ok((out.decision.gate_findings || []).some((f) => f.class === 'CROSS_GAME_ENTITY'), 'a CROSS_GAME_ENTITY finding is written');
});

test('a clean WARDOGS draft (own entity only) -> clear/publish', async () => {
  const out = await gateDraftForInsert(mockClient(ROSTER), draft('wardogs', 'The MP43 is a solid pick this week.'), { runDate: '2026-09-24' });
  assert.equal(out.decision.hold, false);
  assert.equal(out.decision.gate_status, 'clear');
});

test('a MARATHON draft naming a cross-game token -> publishes (log-only, unchanged)', async () => {
  const out = await gateDraftForInsert(mockClient(ROSTER), draft('marathon', 'The MP43 appears in some clips.'), { runDate: '2026-09-24' });
  assert.equal(out.decision.hold, false, 'marathon is log-only -> never holds');
});

test('RC-3: recFindings fold HOLDS a fail-closed draft that runGate cleared', async () => {
  const rec = [{ class: 'UNSUPPORTED-RECOMMENDATION', reason: 'premise not verified' }];
  const out = await gateDraftForInsert(mockClient(ROSTER), draft('wardogs', 'The MP43 is a solid pick this week.'), { runDate: '2026-09-24', recFindings: rec });
  assert.equal(out.decision.hold, true);
  assert.ok((out.decision.gate_findings || []).some((f) => f.class === 'UNSUPPORTED-RECOMMENDATION'));
});

test('never DOWNGRADES a runGate hold when recFindings are present (cross-game stays held)', async () => {
  const rec = [{ class: 'NOTE' }]; // non-hold-class
  const out = await gateDraftForInsert(mockClient(ROSTER), draft('wardogs', 'The BR33 Volley Rifle holds S-tier.'), { runDate: '2026-09-24', recFindings: rec });
  assert.equal(out.decision.hold, true);
  assert.ok((out.decision.gate_findings || []).some((f) => f.class === 'CROSS_GAME_ENTITY'));
});

test('a store-load throw -> fail-closed HELD (wardogs), storeThrew=true, never throws', async () => {
  const throwing = { from() { throw new Error('boom'); } };
  let out;
  await assert.doesNotReject(async () => { out = await gateDraftForInsert(throwing, draft('wardogs', 'anything at all.'), { runDate: '2026-09-24' }); });
  assert.equal(out.decision.hold, true);
  assert.equal(out.storeThrew, true);
  assert.equal(out.gateRes, null);
});

test('a PRE-LOADED store (release path) -> uses runGate\'s own decision (no reload); clean body clears', async () => {
  const store = { entities: [], game_slug: 'wardogs', crossGameEntities: [] };
  const out = await gateDraftForInsert(null, draft('wardogs', 'The MP43 is a solid pick this week.'), { store, runDate: '2026-09-24' });
  assert.equal(out.decision.hold, false);
  assert.ok(out.gateRes, 'gateRes returned for the release certificate');
});
