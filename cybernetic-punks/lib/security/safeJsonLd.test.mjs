// lib/security/safeJsonLd.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeJsonLd } from './safeJsonLd.js';

test('round-trips: JSON.parse(output) deep-equals input', () => {
  const input = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'BR33 guide',
    tags: ['a', 'b'],
    nested: { n: 1, list: [true, null, 'x'] },
  };
  assert.deepEqual(JSON.parse(safeJsonLd(input)), input);
});

test('no "</script" survives a breakout payload', () => {
  const input = { headline: '</script><img src=x onerror=alert(1)>', desc: 'a & b < c > d' };
  const out = safeJsonLd(input);
  assert.equal(out.includes('</script'), false, 'must not contain a raw </script');
  assert.equal(out.includes('<'), false, 'no raw <');
  assert.equal(out.includes('>'), false, 'no raw >');
  assert.equal(out.includes('&') && !out.includes('\\u0026'), false, 'ampersands escaped');
  // and still round-trips to the exact original string
  assert.deepEqual(JSON.parse(out), input);
});

test('escapes U+2028 / U+2029 while preserving value', () => {
  const input = { s: 'line sep end' };
  const out = safeJsonLd(input);
  assert.equal(out.includes(' '), false);
  assert.equal(out.includes(' '), false);
  assert.deepEqual(JSON.parse(out), input);
});
