// lib/gsc/corroboration.golden.test.mjs
// THE GOLDEN CORPUS (Phase 2b, Ruling 3) -- the gate's eyesight test. Each fixture asserts a
// VALUE (not just parse/no-parse), so it catches BOTH misses (mode 1/2 -> UNPARSEABLE) AND
// mis-parses (mode 3 -> a wrong value, invisible to UNPARSEABLE -- only a value-assertion catches
// it). Run: node --test lib/gsc/corroboration.golden.test.mjs
//
// GROWTH RULE (Ruling 3): every future blindness incident adds its sentence here SAME-DAY.
// TODO (data): fixtures marked 'synthetic' should be replaced with the 5 VERBATIM Phase-1 patch
// sentences once pulled from the real 1.1.5.2 article/logs -- the growth rule covers this.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractTriples } from './corroboration.js';
import { isHardStatSentence, detectUnparseable } from './hardStatDetector.js';
import { containsWholeWord } from './franchiseMarkers.js';

// ── store entity fixtures ─────────────────────────────────────────────────────
const WEAPON = { type: 'weapon', name: 'Twin Tap HBR', aliases: [], fields: { name: 'Twin Tap HBR', damage: 24, fire_rate: 600, magazine_size: 30 } };
const SHELL  = { type: 'shell',  name: 'Sentinel',    aliases: [], fields: { name: 'Sentinel', base_health: 180 } };
const UNIQUE = { type: 'unique', name: 'Cloudborn',   aliases: ['Cloudborn (Standard)'], fields: { acquisition_source: 'Armory', acquisition_detail: 'purchase', locked_mods: 'Locked loadout (2): Steady Barrel, Oracle Lens. Mods permanently locked.' } };
// DMZ entities have NO extractor yet (Phase 3), so a DMZ hard-stat claim is UNPARSEABLE by design.
const DMZ_RECIPE = { type: 'dmz-recipe', name: '3D Printer', aliases: [], fields: {} };
const DMZ_LT     = { type: 'dmz-lieutenant', name: 'Bombmaker', aliases: [], fields: {} };
const M = [WEAPON, SHELL, UNIQUE];               // Marathon store
const D = [DMZ_RECIPE, DMZ_LT];                  // DMZ store (no extractors)

function present(sentence, entities) {
  return entities.filter((e) => [e.name].concat(e.aliases || []).some((t) => containsWholeWord(t, sentence)));
}

// fixture: { s, label, ents, stage1, expect }
//   expect: array of {field, value?} (value asserted when given) | 'UNPARSEABLE' | 'NONE'
const CORPUS = [
  // ── VALUE-PARSE (Stage 2 extracts the right triple/value) ───────────────────
  { s: 'The Twin Tap HBR deals 24 damage per shot.', label: 'value/int-damage', ents: M, stage1: true, expect: [{ field: 'damage', value: 24 }] },
  { s: 'The Twin Tap HBR now deals 12.6 damage.', label: 'value/DECIMAL-damage (mode-3 exhibit)', ents: M, stage1: true, expect: [{ field: 'damage', value: 12.6 }] },
  { s: 'The Sentinel has 180 base health.', label: 'value/absolute-health', ents: M, stage1: true, expect: [{ field: 'base_health', value: 180 }] },
  { s: 'The Sentinel starts with 180 health.', label: 'value/health-no-base-word', ents: M, stage1: true, expect: [{ field: 'base_health', value: 180 }] },
  { s: 'The Twin Tap HBR fires at 600 rpm.', label: 'value/fire_rate-rpm', ents: M, stage1: true, expect: [{ field: 'fire_rate', value: 600 }] },
  { s: 'The Twin Tap HBR fires 600 rounds per minute.', label: 'value/fire_rate-longform', ents: M, stage1: true, expect: [{ field: 'fire_rate', value: 600 }] },
  { s: 'The Twin Tap HBR fires at 599.5 rpm.', label: 'value/DECIMAL-fire_rate', ents: M, stage1: true, expect: [{ field: 'fire_rate', value: 599.5 }] },
  { s: 'The Twin Tap HBR has a 30-round magazine.', label: 'value/magazine', ents: M, stage1: true, expect: [{ field: 'magazine_size', value: 30 }] },
  { s: 'The Twin Tap HBR deals 24 damage at 600 rpm.', label: 'value/MULTI-CLAIM (2 triples)', ents: M, stage1: true, expect: [{ field: 'damage', value: 24 }, { field: 'fire_rate', value: 600 }] },
  { s: 'Cloudborn (Standard) is unlocked via Armory purchase.', label: 'value/acquisition + ALIAS-form (categorical, Stage-1 false)', ents: M, stage1: false, expect: [{ field: 'acquisition', value: 'armory-purchase' }] },
  { s: 'Cloudborn comes with mods: Steady Barrel, Oracle Lens.', label: 'value/locked_mods (categorical, Stage-1 false)', ents: M, stage1: false, expect: [{ field: 'locked_mods' }] },

  // ── EXPECTED-UNPARSEABLE (Stage-1 hit, Stage-2 cannot parse -> the LOUD path) ─
  { s: 'Twin Tap HBR damage increased from 23 to 28.', label: 'UNPARSEABLE/mode-1 DELTA (synthetic patch)', ents: M, stage1: true, expect: 'UNPARSEABLE' },
  { s: 'The Twin Tap HBR was bumped up to 28 damage this patch.', label: 'value/delta-with-FIELD-ADJACENT-final-value parses (28)', ents: M, stage1: true, expect: [{ field: 'damage', value: 28 }] },
  { s: 'The Twin Tap HBR moved up to S tier.', label: 'UNPARSEABLE/mode-2 TIER (synthetic patch)', ents: M, stage1: true, expect: 'UNPARSEABLE' },
  { s: 'The Twin Tap HBR has higher projectile velocity now.', label: 'UNPARSEABLE/mode-2 VELOCITY', ents: M, stage1: true, expect: 'UNPARSEABLE' },
  { s: 'The Twin Tap HBR gained better precision.', label: 'UNPARSEABLE/mode-2 PRECISION', ents: M, stage1: true, expect: 'UNPARSEABLE' },
  { s: 'The Twin Tap HBR now has a 250ms ADS time.', label: 'UNPARSEABLE/UNIT-bearing (no ads extractor)', ents: M, stage1: true, expect: 'UNPARSEABLE' },
  { s: 'The Twin Tap HBR gained a 15% damage boost.', label: 'UNPARSEABLE/PERCENT', ents: M, stage1: true, expect: 'UNPARSEABLE' },
  { s: 'The Twin Tap HBR has 40-60 damage falloff.', label: 'UNPARSEABLE/RANGE (guard: not mis-parsed to 60)', ents: M, stage1: true, expect: 'UNPARSEABLE' },
  { s: 'The Twin Tap HBR has higher damage than the Copperhead.', label: 'UNPARSEABLE/COMPARATIVE', ents: M, stage1: true, expect: 'UNPARSEABLE' },
  { s: 'The Twin Tap HBR no longer one-shots to the body.', label: 'UNPARSEABLE/NEGATION', ents: M, stage1: true, expect: 'UNPARSEABLE' },

  // ── DMZ section (no DMZ extractor yet -> DMZ hard-stat claims are UNPARSEABLE) ─
  { s: 'The 3D Printer output deals 45 damage per hit at tier 3.', label: 'DMZ/UNPARSEABLE (no dmz extractor)', ents: D, stage1: true, expect: 'UNPARSEABLE' },
  { s: 'The Bombmaker has higher armor than other lieutenants at tier 5.', label: 'DMZ/UNPARSEABLE (tier + comparative)', ents: D, stage1: true, expect: 'UNPARSEABLE' },

  // ── NEGATIVE cases (must NOT flag: no entity, or no stat context) ────────────
  { s: 'Season 3 begins September 22.', label: 'NEG/date (no entity)', ents: M, stage1: false, expect: 'NONE' },
  { s: 'The battle pass costs $70.', label: 'NEG/price (no entity)', ents: M, stage1: false, expect: 'NONE' },
  { s: 'These are the top 5 loadouts this season.', label: 'NEG/ranking (no entity)', ents: M, stage1: false, expect: 'NONE' },
  { s: 'This was fixed in patch 1.1.5.1.', label: 'NEG/patch-number (no entity)', ents: M, stage1: false, expect: 'NONE' },
  { s: 'The Twin Tap HBR appears in 9 POIs.', label: 'NEG/FP-BORDERLINE entity+count-without-stat-context', ents: M, stage1: false, expect: 'NONE' },
];

for (const fx of CORPUS) {
  test('[' + fx.label + '] "' + fx.s.slice(0, 52) + (fx.s.length > 52 ? '...' : '') + '"', () => {
    const p = present(fx.s, fx.ents);
    const s1 = isHardStatSentence(fx.s, p);
    assert.equal(s1.hit, fx.stage1, 'Stage-1 verdict (signal=' + s1.signal + ')');
    const { triples } = extractTriples(fx.s, p);

    if (fx.expect === 'UNPARSEABLE') {
      assert.equal(triples.length, 0, 'Stage-2 must NOT parse a triple (else it is not unparseable)');
      const det = detectUnparseable([{ slug: 't', body: fx.s }], { entities: fx.ents });
      assert.ok(det.unparseable.some((u) => u.class === 'UNPARSEABLE'), 'combiner emits an UNPARSEABLE finding (LOUD, not silence)');
    } else if (fx.expect === 'NONE') {
      assert.equal(triples.length, 0, 'negative: no triple');
      assert.equal(s1.hit, false, 'negative: not flagged');
    } else {
      const got = triples.map((t) => ({ field: t.field, value: t.claimedValue }));
      for (const e of fx.expect) {
        const hit = got.find((g) => g.field === e.field);
        assert.ok(hit, 'expected field ' + e.field + ' in ' + JSON.stringify(got));
        if ('value' in e) assert.equal(hit.value, e.value, e.field + ' VALUE: expected ' + e.value + ', got ' + hit.value);
      }
    }
  });
}
