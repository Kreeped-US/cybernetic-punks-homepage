// lib/gsc/hardStatDetector.test.mjs
// Stage-1 recall (err BROAD) + the UNPARSEABLE combiner (blindness is LOUD, never silence).
// Run: node --test lib/gsc/hardStatDetector.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isHardStatSentence, detectUnparseable } from './hardStatDetector.js';

const W = [{ type: 'weapon', name: 'Twin Tap HBR', aliases: [], fields: {} }];

test('Stage-1: no entity present -> never a hit (a hard-stat claim is ABOUT a store entity)', () => {
  assert.equal(isHardStatSentence('damage increased from 23 to 28', []).hit, false);
});

test('Stage-1 recall: delta / percent / unit / comparative / no-extractor-category / stat-field+number all HIT', () => {
  assert.equal(isHardStatSentence('Twin Tap HBR damage from 23 to 28', W).signal, 'delta');
  assert.equal(isHardStatSentence('Twin Tap HBR got a 15% buff', W).signal, 'percent');
  assert.equal(isHardStatSentence('Twin Tap HBR has a 250ms ADS', W).signal, 'unit');
  assert.equal(isHardStatSentence('Twin Tap HBR has higher velocity than before', W).hit, true);
  assert.equal(isHardStatSentence('Twin Tap HBR moved to S tier', W).signal, 'no-extractor-category');
  assert.equal(isHardStatSentence('Twin Tap HBR deals 24 damage', W).signal, 'stat-field+number');
  assert.equal(isHardStatSentence('Twin Tap HBR no longer one-shots', W).signal, 'negation');
});

test('Stage-1 FALSE-POSITIVE policy: entity + a bare number with NO stat context does NOT hit', () => {
  assert.equal(isHardStatSentence('Twin Tap HBR appears in 9 POIs', W).hit, false, 'a count is not a stat claim');
  assert.equal(isHardStatSentence('Twin Tap HBR is in the top 5 this season', W).hit, false, 'a ranking is not a stat claim');
});

test('combiner: a Stage-1 hit that Stage-2 cannot parse -> exactly one UNPARSEABLE finding + gap counted', () => {
  const det = detectUnparseable([{ slug: 'a', body: 'The Twin Tap HBR moved up to S tier.' }], { entities: W });
  assert.equal(det.unparseable.length, 1);
  assert.equal(det.unparseable[0].class, 'UNPARSEABLE');
  assert.equal(det.unparseable[0].entity, 'Twin Tap HBR');
  assert.equal(det.gap.stage1_hits, 1);
  assert.equal(det.gap.stage2_parsed, 0);
  assert.equal(det.gap.gap, 1);
});

test('combiner: a Stage-1 hit Stage-2 DOES parse -> NO unparseable, counted as stage2_parsed (gap 0)', () => {
  const det = detectUnparseable([{ slug: 'a', body: 'The Twin Tap HBR deals 24 damage.' }], { entities: W });
  assert.equal(det.unparseable.length, 0);
  assert.equal(det.gap.stage1_hits, 1);
  assert.equal(det.gap.stage2_parsed, 1);
  assert.equal(det.gap.gap, 0);
});

test('combiner: empty store (DMZ pre-Phase-3) -> nothing flagged (no entities -> no Stage-1 hits)', () => {
  const det = detectUnparseable([{ slug: 'a', body: 'Something deals 45 damage at S tier.' }], { entities: [] });
  assert.equal(det.unparseable.length, 0);
  assert.equal(det.gap.stage1_hits, 0);
});
