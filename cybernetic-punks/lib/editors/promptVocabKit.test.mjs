// lib/editors/promptVocabKit.test.mjs
// Stage 1 scaffolding + Stage 2 refinements (2026-09-21): the class/system-noun token family on
// resolveKit, plus the applyKit "^" first-letter-capitalize modifier. Proves each token resolves to
// Marathon's verbatim value and to the GRAMMATICAL AGNOSTIC (bare) default for a game with no
// promptKit.vocab. meta-entity lists derive from toolEnums.metaTypes (single source), in three
// structural forms (list / singular / all) so each NEXUS prompt site renders byte-identical.
//   Run: node --test lib/editors/promptVocabKit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveKit, applyKit } from './promptVocab.js';
import { marathon } from '../games/marathon.js';

test('marathon: each token resolves to its verbatim (Stage-2-refined) value', () => {
  const k = resolveKit(marathon);
  assert.equal(k.entityList, 'weapon, mod, implant, core, shell, ammo type, and Cradle node');
  assert.equal(k.classNoun, 'shell');
  assert.equal(k.classNounPlural, 'shells');
  assert.equal(k.progressionSystem, 'Cradle');   // bare (prompt supplies "the"/"^ perks")
  assert.equal(k.gearSystem, 'Faction Armory');
  assert.equal(k.rankMetric, 'holotag');          // lowercase base (^ at capitalized sites)
  assert.equal(k.classRoster, 'Destroyer, Vandal, Recon, Assassin, Triage, Thief, Rook, Sentinel');
});

test('marathon: meta-entity lists derive from toolEnums.metaTypes (weapon+shell), 3 forms', () => {
  const k = resolveKit(marathon);
  assert.equal(k.metaEntitiesList, 'weapons and shells');
  assert.equal(k.metaEntitiesSingular, 'weapon and shell');     // "every weapon and shell"
  assert.equal(k.metaEntitiesAll, 'weapons and ALL shells');    // "ALL weapons and ALL shells"
});

test('no promptKit.vocab: BARE grammatical defaults', () => {
  const k = resolveKit({ displayName: 'X', editorial: { promptKit: {} } });
  assert.equal(k.entityList, 'weapon, item, and system entity'); // bare (no leading "every")
  assert.equal(k.classNoun, 'class');
  assert.equal(k.classNounPlural, 'classes');
  assert.equal(k.progressionSystem, 'progression system'); // bare
  assert.equal(k.gearSystem, 'gear/unlock system');        // bare
  assert.equal(k.rankMetric, 'ranked');
  assert.equal(k.classRoster, undefined); // render-empty: roster line drops
  assert.equal(k.metaEntitiesSingular, 'entity');  // singular default -> "every entity"
  assert.equal(k.metaEntitiesAll, 'entities');     // plural default -> "ALL entities"
  assert.equal(k.metaEntitiesList, 'entities');
});

test('metaEntities derivation: metaTypes=[weapon] -> weapon / weapons / weapons', () => {
  const k = resolveKit({ displayName: 'Z', editorial: { promptKit: { toolEnums: { metaTypes: ['weapon'] } } } });
  assert.equal(k.metaEntitiesSingular, 'weapon');
  assert.equal(k.metaEntitiesAll, 'weapons');
  assert.equal(k.metaEntitiesList, 'weapons');
});

test('applyKit "^" capitalizes the FIRST letter only (title case, not all-caps)', () => {
  const kit = { classNoun: 'shell', classNounPlural: 'shells', rankMetric: 'holotag', progressionSystem: 'Cradle' };
  assert.equal(applyKit('{{kit:classNoun^}} ability names', kit), 'Shell ability names');
  assert.equal(applyKit('Runner {{kit:classNounPlural^}}', kit), 'Runner Shells');
  assert.equal(applyKit('{{kit:rankMetric^}} tier', kit), 'Holotag tier');
  assert.equal(applyKit('{{kit:progressionSystem^}} perks', kit), 'Cradle perks');
  // no caret -> unchanged base value
  assert.equal(applyKit('a {{kit:classNoun}} b', kit), 'a shell b');
  // missing key still render-empty
  assert.equal(applyKit('x {{kit:nope^}} y', kit), 'x  y');
});
