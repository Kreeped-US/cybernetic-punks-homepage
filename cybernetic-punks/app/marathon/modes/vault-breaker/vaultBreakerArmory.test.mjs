// app/marathon/modes/vault-breaker/vaultBreakerArmory.test.mjs
// Armory section (2026-10-15): first-run figures are labelled as the first run; the return run lists
// only what Bungie's Update 1.1.9.2 (Oct 6) states; anything not restated is marked "not stated".
// The head, the JSON-LD and the dates are pinned in vaultBreakerBody.test.mjs (Brief 134 moved the Event dates
// and the head text to the return run; the freeze ended in Brief 133). This file checks the Armory section and
// that the JSON-LD WebPage description and SOURCES stay as they are.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('./page.js', import.meta.url), 'utf8');
const ARMORY = SRC.slice(SRC.indexOf('{/* ARMORY */}'), SRC.indexOf('{/* ── THE COMPILER'));

test('first-run figures are kept and labelled as the first run', () => {
  for (const s of [
    '<FactCard label="Deluxe weapon" value="Daily rotating" note="First run (Jul 21 - Aug 4)" />',
    '<FactCard label="Cryo Key Templates" value="Stocked" note="First run (Jul 21 - Aug 4)" />',
    '<FactCard label="Prestige Weapons" value="One each per event" note="First run (Jul 21 - Aug 4)" />',
    'WEEKLY STOCK LIMITS - FIRST RUN (JUL 21 - AUG 4)',
    '<li>Tier 1 items: 3&times; or 5&times; per week, depending on the item.</li>',
    '<li>Tier 2 items: 1&times; per week &mdash; or convert to Tier 1 and buy 5&times; per week.</li>',
  ]) assert.ok(ARMORY.includes(s), s);
  assert.ok(!ARMORY.includes('<FactCard label="Deluxe weapon" value="Daily rotating" />'), 'no unlabelled first-run card left');
});

test('return run lists exactly what Update 1.1.9.2 states, attributed inline', () => {
  assert.ok(ARMORY.includes('RETURN RUN (OCT 20 - NOV 9) - CHANGES IN UPDATE 1.1.9.2'));
  assert.ok(ARMORY.includes('{LATER_POSTS.returnRun.name}'), 'cites Update 1.1.9.2 inline (not via SOURCES)');
  for (const s of [
    'Materials Pack 1: 2 per week (was 5)', 'Materials Pack 2: 2 per week (was 5)',
    'Cryo Archive Key Template: 1 per week (was 3)', 'Deluxe weapon: 2 per week (was 3)',
    'Deluxe Backpack: 2 per week (was 3)', 'Deluxe Shield Implant: 2 per week (was 3)',
    'Vault Key 4, 5, and 6: only available for purchase during the 2nd and 3rd weeks.',
    'Limited offers only during the 2nd and 3rd weeks: DRRVISH, Salt Wages, Omnipositor, Biotoxic Disinjector, Biotoxic Disinjector Ammo.',
    'All upgrades are available for purchase from the start.',
    'Solo players receive 50% more Tier 1 and Tier 2 event currency.',
    'Monitor scan XP is reduced by 50%.',
  ]) assert.ok(ARMORY.includes(s), s);
});

test('anything not restated for the return is marked "not stated", not carried over', () => {
  assert.ok(ARMORY.includes('Not stated for the return: the other Tier 1 stock limits, the Tier 2 weekly stock and the'));
  assert.ok(ARMORY.includes('Tier 2 to Tier 1 conversion, the Prestige Weapons limit, and whether the Deluxe weapon still'));
});

test('new Armory strings are ASCII (entities aside)', () => {
  const start = ARMORY.indexOf('FIRST RUN vs RETURN RUN');
  const added = ARMORY.slice(start).replace(/&[a-z]+;|&#\d+;/g, '');
  const firstRunBox = ARMORY.slice(ARMORY.indexOf('WEEKLY STOCK LIMITS'), ARMORY.indexOf('RETURN RUN (OCT 20'));
  const returnBox = ARMORY.slice(ARMORY.indexOf('RETURN RUN (OCT 20'), ARMORY.indexOf('BEFORE YOU SPEND'));
  assert.ok(!/[^\x00-\x7f]/.test(returnBox), 'return-run box is ASCII');
  assert.ok(added.length > 0 && firstRunBox.length > 0);
});

test('JSON-LD WebPage description and SOURCES unchanged (not part of the Armory or the Brief 134 date edits)', () => {
  assert.ok(SRC.includes("description: 'Dates, Vault Data tiers, Sponsored Kit, and Armory stock for Marathon Vault Breaker, sourced from Bungie\\'s official announcements.',"));
  const sources = SRC.slice(SRC.indexOf('const SOURCES = ['), SRC.indexOf('];', SRC.indexOf('const SOURCES = [')));
  assert.equal((sources.match(/name: '/g) || []).length, 3);
});
