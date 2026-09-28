// lib/content/grounding.test.mjs
// Guards fetchVerifiedStatBlock's fact/assessment separation (2026-09-28): verified game facts render
// under the VERIFIED STATS header; editorial columns (ranked_viable, meta_rating, notes, ranked_*) render
// under a separate OUR ASSESSMENT header and NEVER under VERIFIED STATS. Also: compatible_categories is
// not labeled "Compatible Weapons"; and a row whose verified_source says "unverified" contributes no
// numbers (handled upstream by verificationState, but the grounding block still renders qualitatively).
// Run: node --import ./scripts/ext-resolve.register.mjs --test lib/content/grounding.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchVerifiedStatBlock } from './grounding.js';

// Minimal chainable Supabase stub: from/select/ilike/eq/order all return the builder; awaiting it
// resolves to { data, error }. `rows` is the canned result for the single table this call touches.
function stub(rows) {
  const builder = {
    from() { return builder; },
    select() { return builder; },
    ilike() { return builder; },
    eq() { return builder; },
    order() { return builder; },
    then(resolve) { resolve({ data: rows, error: null }); },
  };
  return builder;
}

test('weapon: facts under VERIFIED STATS, editorial under OUR ASSESSMENT (never mixed)', async () => {
  const rows = [{
    name: 'Longshot', category: 'Sniper', weapon_type: 'sniper_rifle', damage: 80, fire_rate: 45,
    ranked_viable: true, notes: 'Top sniper', verified: true, verified_source: 'Bungie patch notes',
  }];
  const out = await fetchVerifiedStatBlock(stub(rows), 'marathon', 'Longshot', 'weapon');
  const vs = out.indexOf('VERIFIED STATS');
  const oa = out.indexOf('OUR ASSESSMENT');
  assert.ok(vs >= 0 && oa > vs, 'both blocks present, assessment after facts');
  const factBlock = out.slice(vs, oa);
  const assessBlock = out.slice(oa);
  assert.match(factBlock, /Damage: 80/);
  assert.ok(!/Top sniper/.test(factBlock), 'notes NOT in the fact block');
  assert.ok(!/Ranked Viable/.test(factBlock), 'ranked_viable NOT in the fact block');
  assert.match(assessBlock, /Notes: Top sniper/);
  assert.match(assessBlock, /Ranked Viable: yes/);
});

test('mod: compatible_categories is labeled "Compatible Categories", not "Compatible Weapons"', async () => {
  const rows = [{
    name: 'Extended Mag', slot_type: 'Magazine', effect_summary: '+mag', compatible_categories: ['Sniper', 'AR'],
    ranked_impact: 'high', verified: true, verified_source: 'Bungie patch notes',
  }];
  const out = await fetchVerifiedStatBlock(stub(rows), 'marathon', 'Extended Mag', 'mod');
  assert.match(out, /Compatible Categories: Sniper, AR/);
  assert.ok(!/Compatible Weapons: Sniper/.test(out), 'categories must not be mislabeled as weapons');
  // ranked_impact is editorial -> under OUR ASSESSMENT, not VERIFIED STATS
  const oa = out.indexOf('OUR ASSESSMENT');
  assert.ok(oa >= 0 && out.slice(oa).includes('Ranked Impact: high'), 'ranked_impact under OUR ASSESSMENT');
});

test('a row with only editorial populated -> OUR ASSESSMENT block only, no VERIFIED STATS header', async () => {
  const rows = [{ name: 'X', notes: 'our take', verified: true, verified_source: 'src' }];
  const out = await fetchVerifiedStatBlock(stub(rows), 'marathon', 'X', 'weapon');
  assert.ok(out.includes('OUR ASSESSMENT'));
  assert.ok(!out.includes('VERIFIED STATS'), 'no fact header when there are no facts');
});

test('no populated fields -> null', async () => {
  const out = await fetchVerifiedStatBlock(stub([{ name: 'Empty', verified: true, verified_source: 's' }]), 'marathon', 'Empty', 'weapon');
  assert.equal(out, null);
});
