// components/marathon/ProvenanceBadge.test.mjs
// Brief 237: the Marathon source chip was white-space nowrap, so its longest label (about 296px with padding)
// pushed weapon and shell pages wider than a 360px phone. It now keeps one line by default and may wrap only
// below 414px. Pins the class, the default nowrap rule, the media rule, and that nowrap left the inline style.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const src = readFileSync(path.resolve('components/marathon/ProvenanceBadge.js'), 'utf8');

test('the chip carries the prov-chip class and emits its rules', () => {
  assert.ok(src.includes('className="prov-chip"'));
  assert.ok(src.includes('<style>{CHIP_CSS}</style>'));
});

test('nowrap stays the default', () => {
  assert.ok(src.includes("'.prov-chip{white-space:nowrap}'"));
});

test('the label may wrap only below 414px', () => {
  assert.ok(src.includes("'@media (max-width:413.98px){.prov-chip{white-space:normal}}'"));
});

test('white-space is not set inline, so the media rule can apply', () => {
  assert.ok(!/whiteSpace/.test(src));
});

test('the icon stays centred on two lines', () => {
  assert.ok(src.includes("display: 'inline-flex', alignItems: 'center', gap: 6,"));
});
