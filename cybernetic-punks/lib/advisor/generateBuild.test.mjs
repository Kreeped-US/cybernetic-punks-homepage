// lib/advisor/generateBuild.test.mjs
// Guards the advisor honest-null + no-meta-talk fix (2026-09-24). Proves:
//  - honestNumber withholds an UNCHECKED row's number (the primitive BOTH generators wrap with).
//  - renderCradlePerkLine (now shared into generateBuild) honest-nulls an UNCHECKED cradle perk.
//  - the rendered advisor prompt has NO "database" string and ends with the single-sourced
//    NO_META_TALK_RULE.
// editorCore.js (pulled in via generateBuild) uses extensionless imports, so run WITH the hook:
//   node --import ./scripts/ext-resolve.register.mjs --test lib/advisor/generateBuild.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { honestNumber } from '../verification.js';
import { renderCradlePerkLine } from '../editorCore.js';
import { NO_META_TALK_RULE } from '../promptRules.js';
import { buildAdvisorPrompt } from './generateBuild.js';

const UNCHECKED = { verified: false };                                   // -> UNCHECKED
const CONFIRMED = { verified: true, verified_source: 'datamine' };       // -> CONFIRMED
const SOURCE_AGREED = { patch_verified: 's2' };                          // -> SOURCE_AGREED

// ── honestNumber primitive (both generators wrap numeric fragments with it) ─────────────────────
test('honestNumber withholds an UNCHECKED number, keeps CONFIRMED/SOURCE-LISTED', () => {
  assert.equal(honestNumber(UNCHECKED, ', Dmg: 100'), '', 'UNCHECKED -> withheld');
  assert.equal(honestNumber(CONFIRMED, ', Dmg: 100'), ', Dmg: 100', 'CONFIRMED -> kept');
  assert.equal(honestNumber(SOURCE_AGREED, ', Dmg: 100'), ', Dmg: 100', 'SOURCE-LISTED -> kept (attribution via verificationTag)');
  assert.equal(honestNumber(UNCHECKED, null), '', 'null fragment -> empty');
});

// ── renderCradlePerkLine (shared by editorCore + generateBuild after this change) ───────────────
test('an UNCHECKED cradle perk renders with NO Energy number in the advisor path too', () => {
  const line = renderCradlePerkLine({ node_name: 'Quick Vent', cumulative_energy: 12, effect: 'faster vent', is_perk: true });
  assert.ok(line.includes('Quick Vent') && line.includes('faster vent'));
  assert.ok(line.includes('@ breakpoint'));
  assert.equal(line.includes('12'), false, 'UNCHECKED cradle Energy number never reaches the advisor');
  assert.equal(line.includes('[UNVERIFIED]'), false);
});

// ── rendered advisor prompt: no "database", ends with the single-sourced no-meta-talk rule ──────
test('buildAdvisorPrompt output has no "database" string and appends the shared NO_META_TALK_RULE', () => {
  const stubContext = '\n\n--- WEAPONS REFERENCE ---\nFAL [AR] — Ammo: 7.62, Range: A [UNVERIFIED]\n--- END WEAPONS ---';
  const prompt = buildAdvisorPrompt('Vandal', 'aggressive', 'gold', '', 'solo', 'balanced', 'intermediate', stubContext);
  // The no-meta-talk rule legitimately QUOTES "the database" as the phrase to avoid (bb34280 wording,
  // shared with editorCore); exclude the rule text and assert no "database" PRIMING remains elsewhere.
  const withoutRule = prompt.split(NO_META_TALK_RULE).join('');
  assert.equal(/database/i.test(withoutRule), false, 'no "database" priming word outside the no-meta-talk rule');
  assert.ok(prompt.includes('WEAPONS REFERENCE'), 'reference sections are named "REFERENCE"');
  assert.ok(prompt.trimEnd().endsWith(NO_META_TALK_RULE), 'prompt ends with the single-sourced no-meta-talk rule');
});
