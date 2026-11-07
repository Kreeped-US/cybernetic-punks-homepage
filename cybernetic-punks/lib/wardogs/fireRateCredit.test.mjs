// lib/wardogs/fireRateCredit.test.mjs
// Brief 321: the weapon page credits fire rate to the row's own "fire_rate:" segment of weapon_stats.verified_source
// (pipe-separated), so the four new Season 2 weapons credit the Evo4Fun workbook once the staged SQL appends their
// segment, and the other weapons credit their Swoleguy segment instead of the whole multi-part string.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fireRateSource, sourceLine } from './weaponFacts.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SQL = readFileSync(path.join(ROOT, 'docs/migrations/2026-11-07-wardogs-s2-fire-rate-credit.sql'), 'utf8');
const EVO = 'Evo4Fun in-game testing workbook, sheet dated 30/10/2026 (attributed)';
const TCX_OLD = "Bulkhead's WARDOGS Season 02 Patch Notes (Steam, 2026-10-14), lines L14, L354/L356, L358, L594; new in Season 2; no stats published";
const SEG = 'Evo4Fun workbook Weapon Base Stats tab (sheet dated 30/10/2026), listed 800 rpm, nominal, attributed, not owner-verified';
const AK = 'Closed Alpha/Beta playtest capture (attributed, unconfirmed; not verified in-game) | fire_rate: community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified | credit_cost + class-unlock: community-aggregated (multiple fan databases), Season 1, 2026-09, attributed, not owner-verified | Update 2026-10-16: vendor price for this row now from Bulkhead\'s WARDOGS Season 02 Patch Notes (Steam, 2026-10-14); supersedes the community-aggregated Season 1 value(s) named above.';
const SWOLE_SEG = 'community in-game shooting-range testing by Swoleguy (YouTube), released for community use, 2026-09-10, attributed, not owner-verified';

test('fireRateSource: the fire_rate segment when present, else the whole text, else null', () => {
  assert.equal(fireRateSource(TCX_OLD + ' | fire_rate: ' + SEG), SEG);
  assert.equal(fireRateSource(AK), SWOLE_SEG);
  assert.equal(fireRateSource(TCX_OLD), TCX_OLD, 'no segment: unchanged (whole text)');
  assert.equal(fireRateSource('Community range testing (attributed)'), 'Community range testing (attributed)');
  for (const x of [null, undefined, '']) assert.equal(fireRateSource(x), null);
  assert.equal(fireRateSource('a | fire_rate:x | b'), 'x', 'no space after the colon');
  assert.equal(fireRateSource('a | fire_rate:swoleguy | b'), 'swoleguy', 'a segment starting with s keeps its first letter');
});

test('the staged SQL appends exactly that segment after the untouched patch-notes text', () => {
  assert.ok(SQL.includes("'" + TCX_OLD.replace(/'/g, "''") + " | fire_rate: " + SEG + "'::text"), 'new text = old text + segment');
  assert.ok(SQL.includes("'" + TCX_OLD.replace(/'/g, "''") + "'::text"), 'the old text is the guard');
  assert.ok(/BEGIN;[\s\S]*DO \$\$[\s\S]*IF n <> 4 THEN RAISE EXCEPTION[\s\S]*COMMIT;/.test(SQL), 'transaction + count assertion');
});

test('weapon page sentence: TCX-SPR after the SQL credits the workbook; before it, the patch notes (unchanged)', () => {
  const after = sourceLine({ fire_rate: 800, verified_source: TCX_OLD + ' | fire_rate: ' + SEG }, { hasBallistics: true, combatSource: EVO });
  assert.equal(after, 'ballistics and time-to-kill from ' + EVO + '; fire rate from ' + SEG + '. Superseded by first-party data when Bulkhead publishes.');
  assert.ok(!after.includes('no stats published'), after);
  const before = sourceLine({ fire_rate: 800, verified_source: TCX_OLD }, { hasBallistics: true, combatSource: EVO });
  assert.ok(before.includes('fire rate from ' + TCX_OLD), 'no segment yet: the whole text, as before');
});

test('weapon page sentence: an existing weapon credits its Swoleguy fire_rate segment, not the whole string', () => {
  const s = sourceLine({ fire_rate: 665, verified_source: AK }, { hasBallistics: true, combatSource: EVO });
  assert.equal(s, 'ballistics and time-to-kill from ' + EVO + '; fire rate from ' + SWOLE_SEG + '. Superseded by first-party data when Bulkhead publishes.');
  assert.ok(!s.includes('Closed Alpha/Beta') && !s.includes('vendor price'), 'price/unlock provenance no longer printed as the fire-rate source');
  // the other branches (no row combat credit) are unchanged: they still print the whole text
  assert.equal(sourceLine({ fire_rate: 665, verified_source: AK }, { hasBallistics: true }), 'ballistics + fire rate from ' + AK + '. Superseded by first-party data when Bulkhead publishes.');
});
