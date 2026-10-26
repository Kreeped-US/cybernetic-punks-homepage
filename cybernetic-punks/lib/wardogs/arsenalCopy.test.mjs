// lib/wardogs/arsenalCopy.test.mjs
// /wardogs/arsenal copy (Brief 151): Season 2 adds weapons with no TTK/ballistics, so the page claims only weapons
// "with measured time-to-kill ... where tested", and no longer "Every Wardogs weapon" or "Full Arsenal". Every line
// must stay true with 33 or 37 weapons. Source-level: the page imports the DB client.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const SRC = readFileSync(new URL('../../app/wardogs/arsenal/page.js', import.meta.url), 'utf8');

test('arsenal title, meta, OG, twitter, JSON-LD and hero carry the Brief 151 text', () => {
  assert.ok(SRC.includes("title: { absolute: 'Wardogs Weapons - Arsenal, TTK & Ballistics | Cybernetic Punks' },"), 'title');
  assert.ok(SRC.includes("description: 'Wardogs weapons, with measured time-to-kill and body-part ballistics where community testing (attributed) has them. Browse the roster by weapon type and open any weapon for its shots-to-kill breakdown.',"), 'meta');
  assert.ok(SRC.includes("openGraph: { title: 'Wardogs Weapons - Arsenal, TTK & Ballistics', description: 'Wardogs weapons with measured TTK + body-part ballistics where tested (attributed). Browse the roster; open any weapon for its shots-to-kill breakdown.',"), 'OG');
  assert.ok(SRC.includes("title: 'Wardogs Weapons - Arsenal, TTK & Ballistics', description: 'Wardogs weapons with measured TTK + body-part ballistics where tested (attributed).' },"), 'twitter');
  assert.ok(SRC.includes("name: 'Wardogs Weapons - Arsenal', url: BASE + '/wardogs/arsenal',"), 'JSON-LD name');
  assert.ok(SRC.includes("description: 'Wardogs weapons, with measured time-to-kill and body-part ballistics where tested (attributed).',"), 'JSON-LD description');
  assert.ok(SRC.includes('{total} Wardogs weapons in our roster, ranked and detailed by measured{\' \'}'), 'hero, count stays computed');
  assert.ok(SRC.includes('time-to-kill</span> and body-part ballistics where tested.'), 'hero qualifier');
});

test('no "Every Wardogs weapon", "Full Arsenal" or "All {total} weapons" claim remains on the arsenal page', () => {
  assert.ok(!/Every Wardogs weapon/i.test(SRC), 'no "Every Wardogs weapon"');
  assert.ok(!/Full Arsenal/i.test(SRC), 'no "Full Arsenal"');
  assert.ok(!/All \{total\} weapons/.test(SRC), 'no "All {total} weapons"');
});
