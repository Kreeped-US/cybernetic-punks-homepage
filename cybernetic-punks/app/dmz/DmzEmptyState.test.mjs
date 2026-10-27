// app/dmz/DmzEmptyState.test.mjs
// Brief 174: the empty state for an editor section with no published articles (today /dmz/meta and
// /dmz/discourse) states only that nothing is published yet; no launch-dependent "check back" line.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadComponent, render } from '../../lib/games/jsxHarness.test-helper.mjs';

test('empty state: label-specific, launch-neutral copy', async () => {
  const mod = await loadComponent('app/dmz/DmzEmptyState.js', {});
  for (const label of ['Meta', 'Discourse']) {
    const html = render(mod.default, { section: { label, slug: label.toLowerCase() } });
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    assert.ok(text.includes('No ' + label + ' reports yet.'), label);
    assert.ok(text.includes('This feed fills automatically as DMZ ' + label + ' reports are published.'), label);
    assert.ok(!/goes live|go live|check back|launch/i.test(text), 'no launch-dependent wording: ' + label);
  }
});
