// app/marathon/advisor/AdvisorLoading.test.mjs
// Brief 295: the Advisor loading screen claims no percentage or duration (indeterminate bar, elapsed seconds,
// one true message, reduced motion respected), and the three failure cases (timeout, a non-JSON 504 page, a
// 200 with no build) end on the input screen with a readable message. Rendered with react-dom/server through
// the JSX harness; no DB, no network, no model call.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { loadComponent, render } from '../../../lib/games/jsxHarness.test-helper.mjs';

const reactUrl = pathToFileURL(createRequire(import.meta.url).resolve('react')).href;
let M;
before(async () => {
  M = await loadComponent('app/marathon/advisor/AdvisorClient.js', {
    stubs: {
      react: "import R from '" + reactUrl + "';\nexport const useState = R.useState;\nexport const useRef = R.useRef;\nexport const useEffect = R.useEffect;\n",
      '@/lib/useIsMobile': 'export function useIsMobile() { return false; }\n',
      '@/lib/useTrack': 'export function track() {}\n',
      '@/lib/monetization': 'export function isMonetizationEnabled() { return false; }\n',
      '@supabase/supabase-js': 'export function createClient() { return {}; }\n',
      '@/components/marathon/BuildLabelNote': 'export default function BuildLabelNote() { return null; }\n',
    },
  });
});

const SRC = readFileSync(path.resolve('app/marathon/advisor/AdvisorClient.js'), 'utf8');
const RAW_PARSE_ERROR = /Unexpected token|JSON|SyntaxError|is not valid/;

function thrownMessage(fn) {
  try { fn(); } catch (e) { return e.message; }
  return null;
}

test('loading state: indeterminate bar, elapsed seconds, one true message, no percentage', () => {
  const html = render(M.AdvisorLoading, { accentColor: '#ff8800', symbol: 'T', subline: 'THIEF', elapsed: 7, isMobile: false });
  assert.ok(html.includes('Building your loadout'));
  assert.ok(html.includes('7s ELAPSED'));
  assert.ok(html.includes('role="progressbar"'));
  assert.ok(!/aria-valuenow/.test(html), 'indeterminate: no value claimed');
  const visible = html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' '); // text only, not CSS or inline styles
  assert.ok(!/\d+\s*%/.test(visible) && !/COMPLETE/.test(visible), 'no percentage shown');
  assert.ok(html.includes('@media (prefers-reduced-motion: reduce)'), 'reduced motion stops the sweep and the pulse');
});

test('the fake timer and its steps are gone from the client', () => {
  for (const gone of ['SCAN_STEPS', 'scanProgress', 'Math.min(99', 'prog = 99', 'COMPLETE']) assert.ok(!SRC.includes(gone), gone);
});

test('timeout: 120 s AbortController on the fetch, readable message, back to the input screen', () => {
  assert.equal(M.ADVISOR_TIMEOUT_MS, 120000);
  assert.equal(M.ADVISOR_TIMEOUT_MESSAGE, 'This is taking longer than expected. Try again.');
  assert.ok(SRC.includes('var controller = new AbortController();'));
  assert.ok(SRC.includes('setTimeout(function() { controller.abort(); }, ADVISOR_TIMEOUT_MS);'));
  assert.ok(SRC.includes('signal: controller.signal,'));
  assert.ok(SRC.includes('setError(timedOut ? ADVISOR_TIMEOUT_MESSAGE : err.message);'));
  const html = render(M.AdvisorErrorBox, { message: M.ADVISOR_TIMEOUT_MESSAGE });
  assert.ok(html.includes('This is taking longer than expected. Try again.'));
});

test('a non-JSON 504 page gives a readable message, never a raw parse error', () => {
  const msg = thrownMessage(() => M.readAdvisorResponse('<html><body>An error occurred with your deployment. FUNCTION_INVOCATION_TIMEOUT</body></html>'));
  assert.equal(msg, M.ADVISOR_BAD_RESPONSE_MESSAGE);
  const html = render(M.AdvisorErrorBox, { message: msg });
  assert.ok(html.includes('Something went wrong while building your loadout. Try again.'));
  assert.ok(!RAW_PARSE_ERROR.test(html));
  assert.equal(thrownMessage(() => M.readAdvisorResponse('')), M.ADVISOR_BAD_RESPONSE_MESSAGE);
});

test('a 200 with no build gives the same message, never a blank result', () => {
  assert.equal(thrownMessage(() => M.readAdvisorResponse('{"label":null}')), M.ADVISOR_BAD_RESPONSE_MESSAGE);
  assert.equal(thrownMessage(() => M.readAdvisorResponse('{}')), M.ADVISOR_BAD_RESPONSE_MESSAGE);
  assert.equal(thrownMessage(() => M.readAdvisorResponse('null')), M.ADVISOR_BAD_RESPONSE_MESSAGE);
  assert.equal(thrownMessage(() => M.readAdvisorResponse('{"build":"text"}')), M.ADVISOR_BAD_RESPONSE_MESSAGE);
});

test('JSON error bodies pass through unchanged (401/429/402/400/422 handling as before)', () => {
  assert.equal(thrownMessage(() => M.readAdvisorResponse('{"error":"Not authenticated"}')), 'Not authenticated');
  assert.equal(thrownMessage(() => M.readAdvisorResponse('{"error":"Invalid shell"}')), 'Invalid shell');
  assert.equal(thrownMessage(() => M.readAdvisorResponse('{"error":"limit_reached","feature":"advisor_generate"}')), 'limit_reached');
  assert.ok(SRC.includes('if (!timedOut && httpStatus === 401) {'), 'the 401 anonymous fallback still keys off the HTTP status');
  assert.ok(SRC.includes('setFallbackShell(shellToUse);'));
});

test('a good body returns the build and its label', () => {
  const r = M.readAdvisorResponse('{"build":{"shell":"Thief"},"label":{"tier":"verified","verified":1,"total":1}}');
  assert.deepEqual(r, { build: { shell: 'Thief' }, label: { tier: 'verified', verified: 1, total: 1 } });
  assert.deepEqual(M.readAdvisorResponse('{"build":{"shell":"Thief"}}'), { build: { shell: 'Thief' }, label: null });
});

test('no error message renders no error box', () => {
  assert.equal(render(M.AdvisorErrorBox, { message: null }), '');
});

test('/api/advisor logs one timing line per request, durations only', () => {
  const r = readFileSync(path.resolve('app/api/advisor/route.js'), 'utf8');
  assert.equal((r.match(/console\.log\(/g) || []).length, 1, 'exactly one console.log');
  assert.ok(r.includes("event: 'advisor_timing', status: res.status,"));
  for (const k of ['session_ms', 'gates_ms', 'generate_ms', 'label_ms', 'total_ms']) assert.ok(r.includes(k), k);
  const logBlock = r.slice(r.indexOf('console.log('), r.indexOf('return res;'));
  for (const banned of ['shell', 'playstyle', 'advisorId', 'session.', 'body']) assert.ok(!logBlock.includes(banned), 'no ' + banned + ' in the log');
});
