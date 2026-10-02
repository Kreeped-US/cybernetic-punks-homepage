// lib/games/gameNavProps.test.mjs
// Guards the 2026-10-02 /bodycam outage fix: the props GameLayout hands its CLIENT child GameNav must be
// PLAIN-serializable (no RegExp/Date/Map/function/class instance), using the REAL bodycam config -- the
// config carries a RegExp (sources.patchNotes.detection.versionRe) that Next refuses to serialize across
// the Server->Client boundary, which 500'd every /bodycam route. Run inside the suite (ext-resolve hook).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGameNavProps } from './gameNavProps.js';
import { bodycam } from './bodycam.js';

// Recursive "is RSC-plain": every value is a primitive, a plain array, or a plain object (Object.prototype
// or null proto). This mirrors Next's "only plain objects + a few built-ins can cross to a Client
// Component" rule and REJECTS RegExp/Date/Map/Set/functions/class instances. NOTE structuredClone() alone
// is too lax here -- it happily clones a RegExp -- so this stricter check is the faithful guard.
function isRscPlain(v) {
  if (v === null) return true;
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return true;
  if (t !== 'object') return false; // function / symbol / bigint
  if (Array.isArray(v)) return v.every(isRscPlain);
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return false; // RegExp, Date, Map, class instance, ...
  return Object.values(v).every(isRscPlain);
}

test('sanity: the RAW bodycam config is NOT RSC-plain (it carries the versionRe RegExp) -- why we narrow', () => {
  assert.equal(isRscPlain(bodycam), false, 'raw config must be non-plain, or this guard proves nothing');
});

test('buildGameNavProps(bodycam): RSC-plain AND survives structuredClone()', () => {
  const nav = buildGameNavProps(bodycam);
  assert.equal(isRscPlain(nav), true, 'every nav value is a primitive / plain array / plain object');
  assert.doesNotThrow(() => structuredClone(nav), 'structuredClone of the nav props does not throw');
});

test('buildGameNavProps(bodycam): correct narrowed shape', () => {
  const nav = buildGameNavProps(bodycam);
  assert.equal(nav.displayName, 'Bodycam');
  assert.equal(nav.basePath, '/bodycam');
  assert.equal(nav.slug, 'bodycam');
  assert.ok(Array.isArray(nav.sections) && nav.sections.length > 0, 'sections present');
  for (const s of nav.sections) {
    assert.equal(typeof s.label, 'string');
    assert.ok(s.href.startsWith('/bodycam/'), 'href is basePath + /slug');
    assert.ok(s.status === 'soon' || s.status === 'live', 'status is a plain enum string');
    assert.equal(Object.keys(s).sort().join(','), 'href,label,status', 'ONLY {label,href,status} -- no config leakage');
  }
  // 'data' sections (arsenal/maps coming-soon) -> SOON; 'editor' sections (field-intel/modes) -> live.
  const arsenal = nav.sections.find((s) => s.href === '/bodycam/arsenal');
  assert.ok(arsenal && arsenal.status === 'soon', 'arsenal (data section) is SOON');
  const fieldIntel = nav.sections.find((s) => s.href === '/bodycam/field-intel');
  assert.ok(fieldIntel && fieldIntel.status === 'live', 'field-intel (editor section) is live');
});

test('the Footer prop GameLayout passes (config.slug) is a plain string', () => {
  assert.equal(typeof bodycam.slug, 'string');
  assert.doesNotThrow(() => structuredClone(bodycam.slug));
});
