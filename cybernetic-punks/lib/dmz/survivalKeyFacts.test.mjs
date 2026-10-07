// lib/dmz/survivalKeyFacts.test.mjs
// The dmz-survival key facts stay inside the June Deep Dive wording: the MIA system recovers lost
// Operators so they continue their progression instead of starting from scratch. It does NOT say
// nothing is lost (that stronger claim is sourced only to the Infinity Ward post, on /dmz/traits).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DMZ_ARTICLE_SEO } from '../games/dmz.js';

test('dmz-survival key facts: MIA fact uses the June wording; no "without losing"', () => {
  const facts = DMZ_ARTICLE_SEO['dmz-survival'].keyFacts;
  assert.ok(facts.includes('The MIA system lets you spend FOB cash to deploy rescue teams and recover lost Operators so they continue their progression instead of starting from scratch.'));
  assert.ok(facts.some((f) => f.includes('starting from scratch')));
  assert.ok(!facts.some((f) => f.includes('without losing')));
});
