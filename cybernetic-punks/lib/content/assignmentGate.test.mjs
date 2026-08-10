// lib/content/assignmentGate.test.mjs
// The DECISION logic of the assignment gate (1d-arm): reinforce fires on PHRASE
// containment, substance does NOT gate reinforce, and the pass/gap paths hold.
// Uses a fake supabase (chainable, thenable) so the integrated decision -- real
// substanceFloor + real checkNovelty (buildIdfMap/closestMatch/phraseContained) --
// runs without a DB. Run: node --test lib/content/assignmentGate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runAssignmentGate } from './assignmentGate.js';

// Fake supabase: `.from('feed_items')` resolves to { data: corpus } (the novelty
// corpus); any other table resolves to { count: storeCount } (the substance count,
// via head:true count queries). Every chain method returns the same thenable.
function makeSupabase({ corpus = [], storeCount = 0 }) {
  function q(table) {
    var o = {
      select() { return o; },
      ilike() { return o; },
      eq() { return o; },
      order() { return o; },
      limit() { return o; },
      then(resolve) {
        if (table === 'feed_items') resolve({ data: corpus, error: null });
        else resolve({ count: storeCount, error: null });
      },
    };
    return o;
  }
  return { from: q };
}

const DESTROYER_PAGE = { headline: 'Marathon Destroyer Shell: Squad Dominance and Ranked Guide', slug: 'ds', editor: 'NEXUS' };
const TRIAGE_PAGE = { headline: 'Marathon Triage Build: The Squad Support Engine for Ranked', slug: 'tr', editor: 'NEXUS' };

test('1d-arm: phrase=yes -> decision=reinforce (the true shell case)', async () => {
  const supabase = makeSupabase({ corpus: [DESTROYER_PAGE], storeCount: 1 });
  const res = await runAssignmentGate({ game_slug: 'marathon', entity: 'Destroyer', facet: 'shell' }, supabase, undefined);
  assert.equal(res.novelty.nearPhrase, true, 'destroyer_shell is contiguous in the page');
  assert.equal(res.decision, 'reinforce');
  assert.equal(res.reinforceTarget, 'ds');
});

test('1d-arm: substance does NOT gate reinforce (phrase=yes reinforces even with 0 substance)', async () => {
  // storeCount 0 -> substance FAILS; phrase=yes must STILL reinforce (not writing new).
  const supabase = makeSupabase({ corpus: [DESTROYER_PAGE], storeCount: 0 });
  const res = await runAssignmentGate({ game_slug: 'marathon', entity: 'Destroyer', facet: 'shell' }, supabase, undefined);
  assert.equal(res.substance.passes, false, 'substance floor fails here');
  assert.equal(res.decision, 'reinforce', 'reinforce takes priority over the substance gap');
  assert.equal(res.reinforceTarget, 'ds');
});

test('1d-arm: a cov=1.00 FALSE-POSITIVE (phrase=no) does NOT reinforce -> stays gap', async () => {
  // "Squad ranked": both tokens are in the Triage page (cov would be 1.00) but
  // squad_ranked is NOT contiguous -> phrase=no -> not reinforce. facet 'ranked'
  // is unknown -> substance fails -> gap.
  const supabase = makeSupabase({ corpus: [TRIAGE_PAGE], storeCount: 0 });
  const res = await runAssignmentGate({ game_slug: 'marathon', entity: 'Squad', facet: 'ranked' }, supabase, undefined);
  assert.equal(res.novelty.nearPhrase, false, 'squad_ranked is not contiguous');
  assert.notEqual(res.decision, 'reinforce', 'a phrase=no false-positive must NOT reinforce');
  assert.equal(res.decision, 'gap');
});

test('1d-arm: novel + grounded (no near-match, substance ok) -> pass', async () => {
  // corpus shares < 2 tokens with "Sentinel weapon" -> no near-match -> novel.
  const supabase = makeSupabase({ corpus: [{ headline: 'Totally unrelated patch notes roundup', slug: 'u' }], storeCount: 1 });
  const res = await runAssignmentGate({ game_slug: 'marathon', entity: 'Sentinel', facet: 'weapon' }, supabase, undefined);
  assert.notEqual(res.novelty.nearPhrase, true);
  assert.equal(res.decision, 'pass');
  assert.equal(res.reinforceTarget, null);
});

test('1d-arm: novel + under substance -> gap', async () => {
  const supabase = makeSupabase({ corpus: [{ headline: 'Totally unrelated patch notes roundup', slug: 'u' }], storeCount: 0 });
  const res = await runAssignmentGate({ game_slug: 'marathon', entity: 'Sentinel', facet: 'weapon' }, supabase, undefined);
  assert.equal(res.decision, 'gap');
  assert.equal(res.reinforceTarget, null);
});

test('1d-arm: a real Jaccard>=0.7 dup still reinforces (isDup path kept)', async () => {
  // an exact-topic page: "Destroyer shell" vs a headline that IS just those tokens
  // scores Jaccard 1.0 -> isDup -> reinforce via dupSlug (phrase also yes here).
  const supabase = makeSupabase({ corpus: [{ headline: 'Destroyer Shell', slug: 'exact', editor: 'X' }], storeCount: 1 });
  const res = await runAssignmentGate({ game_slug: 'marathon', entity: 'Destroyer', facet: 'shell' }, supabase, undefined);
  assert.equal(res.novelty.isDup, true, 'exact topic match crosses Jaccard 0.7');
  assert.equal(res.decision, 'reinforce');
  assert.equal(res.reinforceTarget, 'exact');
});
