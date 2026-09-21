// lib/editors/promptVocabKit.test.mjs
// Stage 1 scaffolding (2026-09-21): the class/system-noun token family on resolveKit. Proves each
// new {{kit:...}} token resolves to Marathon's exact verbatim value for the real marathon config,
// and to the GRAMMATICAL AGNOSTIC DEFAULT for a game with no promptKit.vocab. metaEntitiesList is
// DERIVED from toolEnums.metaTypes (single source): marathon ['weapon','shell'] -> "weapons and
// shells"; ['weapon'] -> "weapons". classRoster stays render-empty (undefined) when absent.
//   Run: node --test lib/editors/promptVocabKit.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveKit } from './promptVocab.js';
import { marathon } from '../games/marathon.js';

test('marathon: each new token resolves to its verbatim value', () => {
  const k = resolveKit(marathon);
  assert.equal(k.entityList, 'weapon, mod, implant, core, shell, ammo type, and Cradle node');
  assert.equal(k.classNoun, 'shell');
  assert.equal(k.classNounPlural, 'shells');
  assert.equal(k.progressionSystem, 'the Cradle');
  assert.equal(k.gearSystem, 'Faction Armory');
  assert.equal(k.rankMetric, 'Holotag');
  assert.equal(k.classRoster, 'Destroyer, Vandal, Recon, Assassin, Triage, Thief, Rook, Sentinel');
});

test('marathon: metaEntitiesList derives from toolEnums.metaTypes (weapon+shell)', () => {
  const k = resolveKit(marathon);
  assert.equal(k.metaEntitiesList, 'weapons and shells');
});

test('no promptKit.vocab: grammatical agnostic defaults (not empty)', () => {
  const k = resolveKit({ displayName: 'X', editorial: { promptKit: {} } });
  assert.equal(k.entityList, 'every weapon, item, and system entity');
  assert.equal(k.classNoun, 'class');
  assert.equal(k.classNounPlural, 'classes');
  assert.equal(k.progressionSystem, 'the progression system');
  assert.equal(k.gearSystem, 'the gear/unlock system');
  assert.equal(k.rankMetric, 'ranked');
  assert.equal(k.classRoster, undefined); // render-empty: the roster line drops
  assert.equal(k.metaEntitiesList, 'entities'); // no metaTypes -> agnostic
});

test('no editorial/promptKit at all: same agnostic defaults (never throws)', () => {
  const k = resolveKit({ displayName: 'Y' });
  assert.equal(k.classNoun, 'class');
  assert.equal(k.metaEntitiesList, 'entities');
  assert.equal(k.classRoster, undefined);
});

test('metaEntitiesList derivation: metaTypes=[weapon] -> "weapons"', () => {
  const k = resolveKit({ displayName: 'Z', editorial: { promptKit: { toolEnums: { metaTypes: ['weapon'] } } } });
  assert.equal(k.metaEntitiesList, 'weapons');
});

test('metaEntitiesList derivation: a game-supplied vocab overrides the class nouns but metaEntitiesList still derives', () => {
  const k = resolveKit({ displayName: 'W', editorial: { promptKit: { vocab: { classNoun: 'role', classNounPlural: 'roles' }, toolEnums: { metaTypes: ['weapon', 'gadget'] } } } });
  assert.equal(k.classNoun, 'role');
  assert.equal(k.classNounPlural, 'roles');
  assert.equal(k.metaEntitiesList, 'weapons and gadgets');
});
