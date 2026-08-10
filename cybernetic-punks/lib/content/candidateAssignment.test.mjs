// lib/content/candidateAssignment.test.mjs
// The pure candidate->directive formatter (step 2, 2-observe). Asserts the EXACT
// assignment block for given fields, with and without target_phrase. selectQueued
// Candidate is a thin DB read, exercised by the cron observe pass, not here.
// Run: node --test lib/content/candidateAssignment.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidateDirective } from './candidateAssignment.js';

test('buildCandidateDirective: exact block for entity+facet (no target_phrase)', () => {
  const block = buildCandidateDirective({ entity: 'Destroyer', facet: 'shell' });
  const expected =
    '\n\n--- EDITOR DIRECTIVE -- THIS IS YOUR ASSIGNED TOPIC THIS CYCLE ---\n' +
    'You have been given a specific article assignment. This overrides your normal content selection.\n\n' +
    'ASSIGNMENT: Write about the Destroyer shell.\n' +
    '\nWrite your article specifically about this topic. Do not default to generic meta analysis or build content -- cover this assignment directly and thoroughly.\n---';
  assert.equal(block, expected);
});

test('buildCandidateDirective: includes a FRAMING line when target_phrase is present', () => {
  const block = buildCandidateDirective({ entity: 'Recon', facet: 'shell', target_phrase: 'best recon shell build for ranked' });
  const expected =
    '\n\n--- EDITOR DIRECTIVE -- THIS IS YOUR ASSIGNED TOPIC THIS CYCLE ---\n' +
    'You have been given a specific article assignment. This overrides your normal content selection.\n\n' +
    'ASSIGNMENT: Write about the Recon shell.\n' +
    'FRAMING: best recon shell build for ranked\n' +
    'Shape the piece toward that angle/phrasing where it fits naturally -- do not force it.\n' +
    '\nWrite your article specifically about this topic. Do not default to generic meta analysis or build content -- cover this assignment directly and thoroughly.\n---';
  assert.equal(block, expected);
});

test('buildCandidateDirective: no FRAMING line for empty/absent target_phrase', () => {
  const withEmpty = buildCandidateDirective({ entity: 'Vandal', facet: 'shell', target_phrase: '' });
  assert.ok(!withEmpty.includes('FRAMING:'), 'empty target_phrase -> no framing line');
  const withNull = buildCandidateDirective({ entity: 'Vandal', facet: 'shell', target_phrase: null });
  assert.ok(!withNull.includes('FRAMING:'));
});

test('buildCandidateDirective: subject joins entity + facet, tolerant of missing fields', () => {
  assert.ok(buildCandidateDirective({ entity: 'Overclock', facet: 'cradle' }).includes('ASSIGNMENT: Write about the Overclock cradle.'));
  // missing facet -> just the entity as subject (no trailing space)
  assert.ok(buildCandidateDirective({ entity: 'Overclock' }).includes('ASSIGNMENT: Write about the Overclock.'));
  // fully empty candidate must not crash and must not emit a framing line
  const empty = buildCandidateDirective({});
  assert.ok(empty.includes('ASSIGNMENT: Write about the .'));
  assert.ok(!empty.includes('FRAMING:'));
});
