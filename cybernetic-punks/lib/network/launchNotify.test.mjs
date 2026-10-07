// lib/network/launchNotify.test.mjs
// The DMZ "notify me at launch" UI (DmzNotifyBlock on /dmz, DmzNotifyStrip on articles / entity hubs /
// entity details / build pages) renders ONLY before launch, via the shared, game-agnostic
// showLaunchNotify(cfg) = !isGameLive(cfg). Date.now is pinned around 2026-10-23T00:00Z. The block is
// rendered through the JSX harness; the four strip sites are server components that read cookies(), so
// their gate is pinned by source checks (the real render is verified on a local server, pre and post).
import { test, before, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { showLaunchNotify } from './launchCopy.js';
import { dmz } from '../games/dmz.js';
import { loadComponent, render } from '../games/jsxHarness.test-helper.mjs';

const realNow = Date.now;
const JUST_BEFORE = Date.parse('2026-10-22T23:59:59Z');
const AT = Date.parse('2026-10-23T00:00:00Z');
const AFTER = Date.parse('2026-10-24T12:00:00Z');
const TODAY = Date.parse('2026-10-07T12:00:00Z');
function at(ms) { Date.now = () => ms; }
afterEach(() => { Date.now = realNow; });

test('showLaunchNotify: true before launch, false at and after 2026-10-23T00:00Z', () => {
  at(TODAY); assert.equal(showLaunchNotify(dmz), true, 'today (pre-launch)');
  at(JUST_BEFORE); assert.equal(showLaunchNotify(dmz), true, 'one second before');
  at(AT); assert.equal(showLaunchNotify(dmz), false, 'at the launch instant');
  at(AFTER); assert.equal(showLaunchNotify(dmz), false, 'after launch');
});

test("showLaunchNotify: status 'live' hides it regardless of the date (game-agnostic)", () => {
  at(TODAY);
  assert.equal(showLaunchNotify({ ...dmz, status: 'live' }), false);
  assert.equal(showLaunchNotify({ displayName: 'Other', status: 'live', launch_date: '2030-01-01' }), false);
  assert.equal(showLaunchNotify({ displayName: 'Other', status: 'pre-launch', launch_date: '2030-01-01' }), true);
});

// ── DmzNotifyBlock rendered (the second guard; the /dmz wrapper is the first) ──────────────────
let Block;
before(async () => {
  Block = (await loadComponent('components/dmz/DmzNotifyBlock.js', {
    stubs: { './DmzNotifyForm': "export default function DmzNotifyForm() { return null; }\n" },
  })).default;
});

test('DmzNotifyBlock renders pre-launch (today and one second before launch)', () => {
  for (const ms of [TODAY, JUST_BEFORE]) {
    at(ms);
    const html = render(Block, {});
    assert.match(html, /Notify on Deployment/);
    assert.match(html, /goes live on October 23, 2026/);
  }
});

test('DmzNotifyBlock renders NOTHING at and after launch (no empty wrapper)', () => {
  for (const ms of [AT, AFTER]) {
    at(ms);
    assert.equal(render(Block, {}), '');
  }
});

// ── Render sites: the gate wraps the whole capture (label / margin wrapper included) ─────────────
const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');

test('/dmz: the whole "Notify on Deployment" wrapper (label + block) is gated by showLaunchNotify(dmz)', () => {
  const s = src('app/dmz/page.js');
  assert.match(s, /\{showLaunchNotify\(dmz\) && \(\s*<div style=\{\{ marginTop: 18 \}\}>\s*<div[^>]*>Notify on Deployment<\/div>\s*<DmzNotifyBlock \/>\s*<\/div>\s*\)\}/);
  assert.equal(s.split('<DmzNotifyBlock').length - 1, 1, 'the block renders in one place only');
});

test('strip: gated by showLaunchNotify(dmz) at all four server render sites, wrapper included', () => {
  const sites = [
    ['app/dmz/[section]/[slug]/page.js', '{!notifyDismissed && showLaunchNotify(dmz) && <DmzNotifyStrip />}'],
    ['components/dmz/DmzEntityHub.js', '{!notifyDismissed && showLaunchNotify(dmz) && <DmzNotifyStrip source="dmz-entity" />}'],
    ['components/dmz/DmzEntityDetail.js', '{!notifyDismissed && showLaunchNotify(dmz) && <div style={{ marginTop: 30 }}><DmzNotifyStrip source="dmz-entity" /></div>}'],
    ['components/dmz/DmzBuildView.js', "{!notifyDismissed && showLaunchNotify(dmz) && <div style={{ maxWidth: 780, margin: '28px auto 0', padding: '0 16px' }}><DmzNotifyStrip source=\"dmz-build\" /></div>}"],
  ];
  for (const [file, line] of sites) {
    const s = src(file);
    assert.ok(s.includes(line), file + ' gates the strip (and its wrapper) on showLaunchNotify(dmz)');
    assert.equal(s.split('<DmzNotifyStrip').length - 1, 1, file + ': exactly one strip render');
  }
});

test('no render site outside DMZ, and the client strip itself carries no clock check (no hydration risk)', () => {
  // Every file under app/ and components/ that imports a DMZ notify component lives under a DMZ path.
  const root = new URL('../../', import.meta.url);
  const hits = [];
  const walk = (rel) => {
    for (const e of readdirSync(new URL(rel, root), { withFileTypes: true })) {
      const p = rel + e.name;
      if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(p + '/'); }
      else if (/\.(js|jsx|mjs)$/.test(e.name) && !/\.test\./.test(e.name)) {
        if (/import\s+DmzNotify(Block|Strip)\b/.test(readFileSync(new URL(p, root), 'utf8'))) hits.push(p);
      }
    }
  };
  walk('app/'); walk('components/');
  assert.ok(hits.length >= 5, 'found the render sites');
  for (const h of hits) assert.match(h, /^(app\/dmz\/|components\/dmz\/)/, h + ' is a DMZ file');
  const strip = src('components/dmz/DmzNotifyStrip.js');
  assert.match(strip, /^'use client';/);
  assert.doesNotMatch(strip, /isGameLive|showLaunchNotify|Date\.now/);
});
