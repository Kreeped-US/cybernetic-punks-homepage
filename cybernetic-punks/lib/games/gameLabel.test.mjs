// lib/games/gameLabel.test.mjs
// Brief 204: a section label that already names its game is not given the game name again, in the JSON-LD
// CollectionPage name (suffix) or the keywords (prefix). Other labels keep the suffix and prefix.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { withGameSuffix, withGamePrefix } from './gameLabel.js';
import { dmz } from './dmz.js';

test('game name is not doubled: "DMZ News" stays as is; other labels keep the suffix and prefix', () => {
  const short = dmz.displayName;
  const news = dmz.sections.find((s) => s.slug === 'field-intel').label;
  assert.equal(withGameSuffix(news, short, ' - '), 'DMZ News');
  assert.equal(withGamePrefix(news, short), 'DMZ News');
  assert.equal(withGameSuffix('Loadouts', short, ' - '), 'Loadouts - DMZ');
  assert.equal(withGamePrefix('Loadouts', short), 'DMZ Loadouts');
  // Case-insensitive, whole word only: "dmz news" matches; "DMZed" does not.
  assert.equal(withGameSuffix('dmz news', short, ' - '), 'dmz news');
  assert.equal(withGameSuffix('DMZed', short, ' - '), 'DMZed - DMZ');
  // Game-agnostic: any short name from config.
  assert.equal(withGameSuffix('Acme News', 'Acme', ' - '), 'Acme News');
  assert.equal(withGamePrefix('Maps', 'Acme'), 'Acme Maps');
  // Wiring: the DMZ section page builds both outputs through the helper with the config short name.
  const src = readFileSync(new URL('../../app/dmz/[section]/page.js', import.meta.url), 'utf8');
  assert.ok(src.includes("name: withGameSuffix(section.label, dmz.displayName, ' - '),"));
  assert.ok(src.includes('withGamePrefix(section.label, dmz.displayName)'));
  assert.ok(!src.includes("name: section.label + ' - DMZ'") && !src.includes("'DMZ ' + section.label, 'Modern"));
  // The shared helper carries no game literal.
  assert.ok(!/dmz|marathon|wardogs|bodycam|pubg/i.test(readFileSync(new URL('./gameLabel.js', import.meta.url), 'utf8')));
});
