// lib/content/voiceCheck.test.mjs -- the log-only voice check (first person + self-narration).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkVoice, VOICE_FIRST_PERSON_EXEMPT_EDITORS, SELF_NARRATION_PATTERNS } from './voiceCheck.js';

// Real dry-run outputs (2026-10-05/06), body text verbatim.
const FIX = JSON.parse(readFileSync(new URL('./voiceCheck.fixtures.json', import.meta.url), 'utf8')).articles;
const run = (id) => checkVoice(FIX[id].body, FIX[id].editor);

test('Sonnet 5.5 MIRANDA outputs with first person and self-narration flag', () => {
  const b = run('B-55');
  assert.equal(b.firstPersonCount, 3);
  assert.equal(b.selfNarrationCount, 1);
  assert.ok(b.selfNarrationSamples[0].includes('whole confirmed kit'));
  const blast = run('BlastOff-55');
  assert.equal(blast.firstPersonCount, 3);
  assert.equal(blast.selfNarrationCount, 2);
  assert.ok(blast.selfNarrationSamples.some((s) => s.includes('this will be a short guide')));
});

test('the other dry-run outputs do not flag first person or self-narration', () => {
  for (const id of ['A-55', 'C-55', 'A-46', 'B-46', 'C-46', 'BlastOff-46']) {
    const r = checkVoice(FIX[id].body, FIX[id].editor, { exemptEditors: [] });   // raw count, no exemption
    assert.equal(r.firstPersonCount, 0, id + ' first person');
    assert.equal(r.selfNarrationCount, 0, id + ' self-narration');
  }
});

test('NEXUS is exempt from the first-person flag via the config constant; self-narration still counts', () => {
  assert.deepEqual(VOICE_FIRST_PERSON_EXEMPT_EDITORS, ['NEXUS']);
  const body = "I'm moving it from B to A. This will be a short guide.";
  const nexus = checkVoice(body, 'NEXUS');
  assert.equal(nexus.firstPersonCount, 0);
  assert.equal(nexus.firstPersonExempt, true);
  assert.equal(nexus.selfNarrationCount, 1);
  const miranda = checkVoice(body, 'MIRANDA');
  assert.equal(miranda.firstPersonCount, 1);
  assert.equal(miranda.firstPersonExempt, false);
  for (const ed of ['CIPHER', 'GHOST']) assert.equal(checkVoice(body, ed).firstPersonCount, 1, ed);
});

test('honest-null disclosures the prompts require are not self-narration', () => {
  const required = [
    'We only have a short excerpt of the notes, not the full list, so we are reporting what the excerpt says and nothing beyond it.',
    "Player reaction to the patch isn't in our material yet, so we aren't characterizing it.",
    'The track gives no numeric values for how much Self-Repair, Hardware, or Firewall you gain, so we won\'t invent any.',
    "Player reaction to this patch is not yet available in our sources; community discussion was not captured in this cycle's intake.",
    'Coverage is thin this cycle, so treat it as a hint and not a trend.',
    'One note on how thin this is. Community discussion of this core is limited right now, so there is little shared testing to lean on.',
    'The notes give no stats for the Havoc or the CIWS beyond that kill-time figure.',
    'This reflects how much creator content we gathered, not the state of the game.',
    'Limited signal this week: one video this cycle.',
    'Neither blog gives the size of Hajin.',
  ];
  for (const s of required) assert.equal(checkVoice(s, 'MIRANDA').selfNarrationCount, 0, s);
});

test('first person inside quotes, blockquotes, code spans and link text is ignored; we/our is not counted', () => {
  const body = [
    'We tested it. Our read is simple.',
    'The creator said "I think this is broken" in the video.',
    '> I quote the patch notes here.',
    'Use `my-config` and the [Cradle planner I built](/marathon/cradle).',
    'The Snare Mine sits near the door.',
  ].join('\n');
  assert.equal(checkVoice(body, 'MIRANDA').firstPersonCount, 0);
  assert.equal(checkVoice('My pick is the M77. Give me the Longshot. That one is mine.', 'GHOST').firstPersonCount, 3);
});

test('acronyms and roman numerals are not the pronoun I', () => {
  const body = 'The C.A.R.R.I. Armory gains two items. Item Economy: The C.A.R.R.I. Armory. Tier I gear and Part I of the roadmap.';
  assert.equal(checkVoice(body, 'MIRANDA').firstPersonCount, 0);
  assert.equal(checkVoice('After the update I went back in. I.', 'MIRANDA').firstPersonCount, 2);
});

test('samples are capped at 3 and the pattern list stays small and explicit', () => {
  const body = 'I go. I run. I stop. I wait. I leave.';
  const r = checkVoice(body, 'MIRANDA');
  assert.equal(r.firstPersonCount, 5);
  assert.equal(r.firstPersonSamples.length, 3);
  assert.ok(SELF_NARRATION_PATTERNS.length <= 5);
});

test('empty or missing body is safe', () => {
  assert.deepEqual(checkVoice(null, 'MIRANDA'), { firstPersonCount: 0, firstPersonSamples: [], selfNarrationCount: 0, selfNarrationSamples: [], firstPersonExempt: false });
});
