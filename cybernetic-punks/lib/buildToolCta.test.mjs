// lib/buildToolCta.test.mjs
// The article->advisor CTA relevance rule. Run: node --test lib/buildToolCta.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveBuildToolCta } from './buildToolCta.js';

const art = (over) => ({ game_slug: 'marathon', headline: '', tags: [], slug: 's', ...over });

test('CONTEXTUAL: a shell-naming marathon article -> prefilled deep-link + "Plan your <Shell> build"', () => {
  const r = resolveBuildToolCta(art({ headline: 'Marathon Vandal runner build: movement mods' }));
  assert.equal(r.show, true);
  assert.equal(r.shell, 'Vandal');
  assert.equal(r.href, '/advisor?shell=vandal');
  assert.equal(r.copy, 'Plan your Vandal build →');
});

test('CONTEXTUAL via TAGS too (not just headline)', () => {
  const r = resolveBuildToolCta(art({ headline: 'Season 2 economy shift', tags: ['recon', 'meta'] }));
  assert.equal(r.shell, 'Recon');
  assert.equal(r.href, '/advisor?shell=recon');
});

test('GENERIC: build-relevant but no single shell -> generic /advisor link', () => {
  const r = resolveBuildToolCta(art({ headline: 'Best loadout tips for the current meta', tags: ['weapon'] }));
  assert.equal(r.show, true);
  assert.equal(r.shell, null);
  assert.equal(r.href, '/advisor');
  assert.equal(r.copy, 'Want a build based on this intel? Open the Build Advisor →');
});

test('NOTHING: unrelated news/lore -> no CTA', () => {
  const r = resolveBuildToolCta(art({ headline: 'Bungie studio update: staff changes', tags: ['news'] }));
  assert.equal(r.show, false);
});

test('DMZ (buildToolCta:null) -> renders nothing, even for a build article', () => {
  const r = resolveBuildToolCta({ game_slug: 'dmz', headline: 'DMZ loadout crafting build guide', tags: ['loadout', 'build'], slug: 'x' });
  assert.equal(r.show, false);
});

test('never throws on junk / missing fields', () => {
  assert.equal(resolveBuildToolCta(null).show, false);
  assert.equal(resolveBuildToolCta({}).show, false);
  assert.equal(resolveBuildToolCta({ game_slug: 'nonsense', headline: 'vandal build' }).show, false);
});
