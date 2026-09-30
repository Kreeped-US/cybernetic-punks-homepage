// lib/security/safeHref.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeHref } from './safeHref.js';

test('rejects dangerous / off-site URLs -> null', () => {
  for (const bad of [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    '//evil.com',
    '/\\evil.com',
    'mailto:x@y.com',
    '',
    '   ',
    null,
    undefined,
    42,
  ]) {
    assert.equal(safeHref(bad), null, 'should reject: ' + String(bad));
  }
});

test('keeps http(s) and same-site relative paths', () => {
  assert.equal(safeHref('https://x.com/a'), 'https://x.com/a');
  assert.equal(safeHref('http://x.com'), 'http://x.com');
  assert.equal(safeHref('/marathon/x'), '/marathon/x');
  assert.equal(safeHref('  https://x.com/a  '), 'https://x.com/a'); // trims
  assert.equal(safeHref('/dmz/pois/prison'), '/dmz/pois/prison');
});
