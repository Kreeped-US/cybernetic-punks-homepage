// lib/marathon/cryoGuideFaq.test.mjs
// /marathon/guides/cryo-archive: the "What is Cryo Archive" FAQ answer carries the Nightfall Refresh
// schedule (weekly from Thu Oct 15, windows end Monday) instead of "rotates through the season", and the
// hub's title, meta description and canonical stay byte-identical to production (2026-10-08).
// Rendered through the JSX harness with Supabase stubbed to return no rows.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const NEW_SENTENCE = 'During the Nightfall Refresh it is available every week from Thursday, Oct 15, and each weekly window ends on Monday.';
// Production values captured 2026-10-08 (HTML-decoded).
const PROD_TITLE = 'Marathon Cryo Archive Guide - Endgame Raid & Vaults';
const PROD_DESCRIPTION = "Complete Marathon Cryo Archive guide. Security Clearance progression, Vault 1-7 walkthroughs, Compiler boss strategy, exfil routes, and loadout recommendations for Marathon's endgame raid.";
const PROD_CANONICAL = 'https://cyberneticpunks.com/marathon/guides/cryo-archive';

// Chainable query stub: every builder method returns itself; awaiting it yields no rows.
const SUPABASE_STUB = "const q = { then(res, rej) { return Promise.resolve({ data: [], error: null }).then(res, rej); } };\n"
  + "for (const m of ['select','eq','contains','order','limit','in','neq','not','gte','lte','maybeSingle','single']) q[m] = () => q;\n"
  + 'export const supabase = { from: () => q };\n';

let mod;
before(async () => {
  mod = await loadComponent('app/marathon/guides/[category]/page.js', {
    stubs: {
      '@/lib/supabase': SUPABASE_STUB,
      'next/navigation': "export function notFound() { throw new Error('NOT_FOUND'); }\n",
    },
  });
});

function textOf(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
}
const params = Promise.resolve({ category: 'cryo-archive' });

test('cryo-archive FAQ: new schedule sentence present, "rotates through the season" gone', async () => {
  const el = await mod.default({ params });
  const text = textOf(render(() => el));
  assert.ok(text.includes('What is Cryo Archive in Marathon?'));
  assert.ok(text.includes("Cryo Archive is Marathon's endgame zone - a large PvPvE raid map"), 'rest of the answer kept');
  assert.ok(text.includes('and the Compiler boss fight. ' + NEW_SENTENCE), text.slice(0, 200));
  assert.ok(!/rotates through the season/i.test(text));
});

test('cryo-archive hub: title, meta description and canonical unchanged vs production', async () => {
  const md = await mod.generateMetadata({ params });
  assert.equal(md.title.absolute, PROD_TITLE);
  assert.equal(md.description, PROD_DESCRIPTION);
  assert.equal(md.alternates.canonical, PROD_CANONICAL);
});
