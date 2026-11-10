// components/GameAnnouncementNotice.test.mjs
// Brief 329: the per-game announced-update notice (lib/games/announcements.js + components/GameAnnouncementNotice.js),
// first used for the Marathon Symbiosis announcement on /marathon. Renders the real server component through the
// JSX harness with an injected `now` (no DB, no network).
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadComponent, render } from '../lib/games/jsxHarness.test-helper.mjs';
import { GAME_ANNOUNCEMENTS, ANNOUNCEMENT_LABEL, activeAnnouncements, ptDay } from '../lib/games/announcements.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const X_URL = 'https://x.com/MarathonTheGame/status/2120155249080181082';

let Notice;
before(async () => { Notice = (await loadComponent('components/GameAnnouncementNotice.js')).default; });
const html = (game, iso) => render(() => Notice({ game, now: new Date(iso) }));

test('marathon: Symbiosis notice renders from Nov 10 PT through the end of Dec 15 PT', () => {
  for (const iso of ['2026-11-10T08:00:00Z', '2026-11-20T12:00:00Z', '2026-12-08T20:00:00Z', '2026-12-16T07:59:59Z']) {
    const h = html('marathon', iso);
    assert.match(h, /data-announcement="marathon-symbiosis-2026-12-08"/, iso);
    assert.ok(h.includes('Symbiosis update announced for December 8'), iso);
    assert.ok(h.includes(ANNOUNCEMENT_LABEL), iso);
  }
});

test('marathon: nothing renders after Dec 15 PT ends, or before Nov 10 PT', () => {
  for (const iso of ['2026-12-16T08:00:00Z', '2026-12-25T12:00:00Z', '2027-01-01T00:00:00Z', '2026-11-10T07:59:59Z']) {
    assert.equal(html('marathon', iso), '', iso);
  }
});

test('no other game renders a notice', () => {
  assert.deepEqual(Object.keys(GAME_ANNOUNCEMENTS), ['marathon']);
  for (const game of ['wardogs', 'dmz', 'bodycam', 'pubg-dednet', 'arc-raiders', '', undefined, 'constructor', '__proto__']) {
    assert.equal(html(game, '2026-11-20T12:00:00Z'), '', String(game));
    assert.deepEqual(activeAnnouncements(game, new Date('2026-11-20T12:00:00Z')), [], String(game));
  }
});

test('source link is the official X post, and no .bng.local address appears anywhere', () => {
  const h = html('marathon', '2026-11-20T12:00:00Z');
  const hrefs = [...h.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, [X_URL]);
  assert.ok(h.includes('Source:') && h.includes('Official Marathon X account post about Symbiosis'));
  assert.ok(!/bng\.local/i.test(h));
  assert.ok(!/bng\.local/i.test(JSON.stringify(GAME_ANNOUNCEMENTS)));
  for (const f of ['lib/games/announcements.js', 'components/GameAnnouncementNotice.js']) {
    assert.ok(!/bng\.local/i.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), f);
  }
});

test('wording is attributed and tense-safe', () => {
  const text = JSON.stringify(GAME_ANNOUNCEMENTS);
  for (const bad of [/is live/i, /now available/i, /out now/i, /has launched/i]) assert.ok(!bad.test(text), String(bad));
  for (const a of GAME_ANNOUNCEMENTS.marathon) {
    assert.ok(a.sentences.length >= 2 && a.sentences.length <= 3);
    for (const s of a.sentences) assert.match(s, /^Bungie (has announced|says|has also announced)/);
  }
});

test('ptDay uses Pacific Time calendar days', () => {
  assert.equal(ptDay(new Date('2026-12-16T07:59:59Z')), '2026-12-15');
  assert.equal(ptDay(new Date('2026-12-16T08:00:00Z')), '2026-12-16');
});

test('/marathon mounts the notice for game marathon, server-side', () => {
  const src = fs.readFileSync(path.join(ROOT, 'app/marathon/page.js'), 'utf8');
  assert.ok(src.includes("import GameAnnouncementNotice from '@/components/GameAnnouncementNotice';"));
  assert.match(src, /<GameAnnouncementNotice game="marathon"/);
  const comp = fs.readFileSync(path.join(ROOT, 'components/GameAnnouncementNotice.js'), 'utf8');
  assert.ok(!/use client|fetch\(|supabase/.test(comp));
});
