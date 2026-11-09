// app/marathon/guides/shellHubLinks.test.mjs (outside [category]/: node --test reads brackets as a glob)
// Brief 324 (from Brief 322e): /marathon/guides/shells must link every one of its child guide pages
// (/marathon/guides/shells/<name>) as a real <a href> in its SERVER-rendered HTML. Renders the actual
// CategoryPage server component through the JSX harness with Supabase stubbed (no DB, no network).
//   1. shells hub: every slug in lib/shellGuides.js SHELL_GUIDE_SLUGS has exactly one anchor, and every
//      /marathon/guides/shells/<x> anchor on the page points at a slug in that roster.
//   2. every child route that exists (app/marathon/guides/shells/[name]) resolves from that roster, so a
//      guide added to the roster without a hub link -- or a link without a guide -- fails here.
//   3. other categories render no shell-guide child section (no change to the other hubs).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadComponent, render } from '../../../lib/games/jsxHarness.test-helper.mjs';
import { SHELL_GUIDE_SLUGS } from '../../../lib/shellGuides.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// Chainable Supabase stub: every query resolves to { data: [] } (an empty feed is the worst case -- the
// child links must not depend on any article existing).
const SUPABASE_STUB = [
  'function q() { const p = Promise.resolve({ data: [], error: null });',
  '  const o = { then: p.then.bind(p), catch: p.catch.bind(p) };',
  "  for (const k of ['select','eq','neq','contains','order','limit','in','gte','lte','not','is']) o[k] = () => o;",
  '  return o; }',
  'export const supabase = { from: () => q() };',
].join('\n') + '\n';
const NAV_STUB = "export function notFound() { throw new Error('NOT_FOUND'); }\n";

let CategoryPage;
before(async () => {
  CategoryPage = (await loadComponent('app/marathon/guides/[category]/page.js', {
    stubs: { '@/lib/supabase': SUPABASE_STUB, 'next/navigation': NAV_STUB },
  })).default;
});

async function html(category) {
  const el = await CategoryPage({ params: Promise.resolve({ category }) });
  return render(() => el);
}
const childHrefs = (h) => [...h.matchAll(/<a\b[^>]*\bhref="(\/marathon\/guides\/shells\/[^"#?]+)"/g)].map((m) => m[1]);

test('shells hub links every shell guide in SHELL_GUIDE_SLUGS as a real anchor in server HTML', async () => {
  const hrefs = childHrefs(await html('shells'));
  for (const slug of SHELL_GUIDE_SLUGS) {
    const href = '/marathon/guides/shells/' + slug;
    assert.equal(hrefs.filter((h) => h === href).length, 1,
      href + ' has no <a href> (or more than one) on /marathon/guides/shells -- the hub must link every child guide in its server HTML (Brief 324)');
  }
  for (const h of hrefs) {
    assert.ok(SHELL_GUIDE_SLUGS.includes(h.split('/').pop()), 'hub links ' + h + ' but it is not in lib/shellGuides.js SHELL_GUIDE_SLUGS (it would 404)');
  }
  assert.equal(hrefs.length, SHELL_GUIDE_SLUGS.length);
});

test('today: 7 child guides, all linked', async () => {
  assert.deepEqual([...SHELL_GUIDE_SLUGS].sort(), ['assassin', 'destroyer', 'recon', 'rook', 'thief', 'triage', 'vandal']);
  assert.equal(childHrefs(await html('shells')).length, 7);
});

test('the child route resolves from the same roster the hub links from', () => {
  const route = path.join(ROOT, 'app/marathon/guides/shells/[name]/page.js');
  assert.ok(fs.existsSync(route), 'child route missing');
  assert.match(fs.readFileSync(route, 'utf8'), /hasShellGuide\(/, 'child route no longer gates on lib/shellGuides.js -- the hub links and the route could drift');
});

test('other category hubs render no shell-guide child section', async () => {
  for (const c of ['ranked', 'weapons', 'squad']) {
    const h = await html(c);
    assert.ok(!h.includes('GUIDE BY SHELL'), c + ' rendered the shell child section');
  }
});
