// lib/games/gameHero.test.mjs
// The shared full-bleed GameHero (components/game/GameHero.js) + its view-model (lib/games/heroModel.js),
// using the REAL wardogs / bodycam / dmz / pubg-dednet configs. The component is RENDERED (compiled with
// Next's SWC via jsxHarness) -- with/without image, with/without logo, accent H1, extra slot -- and the
// status badge derivation, plainness, neutral class names and hero-image budget are asserted.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHeroProps, heroStatusBadge } from './heroModel.js';
import { loadComponent, render, React } from './jsxHarness.test-helper.mjs';
import { wardogs } from './wardogs.js';
import { bodycam } from './bodycam.js';
import { dmz } from './dmz.js';
import { pubgDednet } from './pubg-dednet.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let GameHero;
before(async () => { GameHero = (await loadComponent('components/game/GameHero.js')).default; });

const html = (cfg, children) => render(GameHero, { hero: buildHeroProps(cfg) }, children);
const count = (s, re) => (s.match(re) || []).length;
const h1Of = (s) => s.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)[1];
const textOf = (s) => s.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '')
  .replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

function isRscPlain(v) {
  if (v === null) return true;
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return true;
  if (t !== 'object') return false;
  if (Array.isArray(v)) return v.every(isRscPlain);
  const proto = Object.getPrototypeOf(v);
  if (proto !== Object.prototype && proto !== null) return false;
  return Object.values(v).every(isRscPlain);
}

// ── render: with / without image ─────────────────────────────────────────────────────────────────
test('with image: cover art (decorative, aria-hidden) + both overlay scrims', () => {
  const s = html(wardogs);
  assert.match(s, /<img src="\/images\/wardogs\/WD_Screenshot_Littlebird_1_WD1\.jpg" alt="" aria-hidden="true"/);
  assert.ok(s.includes('object-position:center 28%'));
  assert.ok(s.includes('linear-gradient(90deg, rgba(8,9,12,0.94) 0%, rgba(8,9,12,0.72) 42%, rgba(8,9,12,0.32) 100%)'), 'side scrim (Wardogs values)');
  assert.ok(s.includes('linear-gradient(0deg, #0b0d10 2%, rgba(11,13,16,0.15) 46%, rgba(11,13,16,0.35) 100%)'), 'bottom scrim');
  assert.ok(s.includes('data-game-hero'));
});

test('without image (pubg-dednet): PLAIN variant -- no art, no scrims, everything else renders', () => {
  const s = html(pubgDednet);
  assert.equal(count(s, /aria-hidden="true"/g), 0, 'no decorative art');
  assert.ok(!s.includes('linear-gradient'), 'no scrims without art');
  assert.equal(count(s, /<h1\b/g), 1);
  // overlay in config is ignored when there is no image
  const p = buildHeroProps({ ...pubgDednet, hero: { ...pubgDednet.hero, overlay: { side: 'x', bottom: 'y' } } });
  assert.equal(p.image, null); assert.equal(p.overlay, null);
});

// ── render: with / without logo ──────────────────────────────────────────────────────────────────
test('with logo: official mark as a BADGE above the text H1 (never inside the H1)', () => {
  for (const [cfg, src, alt] of [[wardogs, '/WD_Fullmark_White.png', 'Wardogs'], [bodycam, '/images/Bodycam/bodycam-logo.webp', 'Bodycam'], [pubgDednet, '/images/ded.net/dednet.webp', 'PUBG: DED.NET']]) {
    const s = html(cfg);
    assert.ok(s.includes('<img src="' + src + '" alt="' + alt + '"'), cfg.slug + ' logo badge');
    assert.ok(!/<img/.test(h1Of(s)), cfg.slug + ': H1 contains no image');
    assert.ok(s.indexOf(src) < s.indexOf('<h1'), cfg.slug + ': logo precedes the H1');
  }
});

test('without logo (dmz): no logo image; the derived status badge still renders', () => {
  const s = html(dmz);
  assert.ok(!s.includes('dmzlogo'), 'no DMZ logo asset');
  assert.equal(count(s, /<img\b/g), 1, 'only the decorative hero art');
  assert.ok(s.includes('PRE-LAUNCH') || s.includes('>LIVE<'), 'status badge present');
});

// ── H1 ──────────────────────────────────────────────────────────────────────────────────────────
test('H1: exactly one per hero; text identical to production (bodycam = the new operator text)', () => {
  const expect = {
    wardogs: 'Wardogs Loadouts That Actually Win',
    bodycam: 'Bodycam Intel: Patches, Modes and Loadouts',
    dmz: 'MW4 DMZ',
    'pubg-dednet': 'PUBG: DED.NET',
  };
  for (const cfg of [wardogs, bodycam, dmz, pubgDednet]) {
    const s = html(cfg);
    assert.equal(count(s, /<h1\b/g), 1, cfg.slug + ': one H1');
    assert.equal(textOf(h1Of(s)).replace(/\s+/g, ' ').trim(), expect[cfg.slug], cfg.slug + ' H1 text');
  }
  assert.ok(h1Of(html(wardogs)).includes('<br/>'), 'wardogs keeps its two-line break');
});

test('accent H1: the accent part renders after the text in the accent color', () => {
  const h = h1Of(html(pubgDednet));
  assert.match(h, /PUBG: <\/span><span style="color:var\(--accent\)">DED\.NET<\/span>$/);
});

// ── intro + CTAs ─────────────────────────────────────────────────────────────────────────────────
test('intro: explicit {text,strong} (wardogs) or tagline + ". " + hubIntro (bodycam / dmz / pubg)', () => {
  const w = html(wardogs);
  assert.ok(w.includes('Built for your level. <span style="color:#fff;font-weight:700">We don’t guess — if we don’t know, we say so.</span>'));
  for (const cfg of [bodycam, dmz, pubgDednet]) assert.ok(textOf(html(cfg)).includes(cfg.tagline + '. ' + cfg.hubIntro), cfg.slug + ' intro');
});

test('CTAs: neutral classes, labels + hrefs from config (none for dmz / pubg)', () => {
  const w = html(wardogs);
  assert.match(w, /<a href="\/wardogs\/loadouts" class="game-hero-cta-primary"[^>]*>Find Your Best Loadout →<\/a>/);
  assert.match(w, /<a href="\/wardogs\/tier-list" class="game-hero-cta-ghost"[^>]*>See the Tier List →<\/a>/);
  const b = html(bodycam);
  assert.match(b, /<a href="\/bodycam\/field-intel" class="game-hero-cta-primary"[^>]*>Latest Intel →<\/a>/);
  assert.match(b, /<a href="\/bodycam\/modes" class="game-hero-cta-ghost"[^>]*>Game Modes →<\/a>/);
  for (const cfg of [dmz, pubgDednet]) assert.ok(!/class="game-hero-cta-/.test(html(cfg)), cfg.slug + ': no CTA links');
});

test('neutral class names only (no wd-*), in the source and the rendered output', () => {
  const src = fs.readFileSync(path.join(ROOT, 'components/game/GameHero.js'), 'utf8');
  assert.ok(!/wd-/.test(src.replace(/\/\/.*$/gm, '')), 'no wd- class in GameHero code');
  for (const cfg of [wardogs, bodycam, dmz, pubgDednet]) assert.ok(!/class="wd-/.test(html(cfg)), cfg.slug);
});

// ── extra slot ───────────────────────────────────────────────────────────────────────────────────
test('extra slot: children render inside the hero, after the intro / CTAs', () => {
  const slot = React.createElement('div', { id: 'slot-probe' }, 'COUNTDOWN');
  const s = html(dmz, slot);
  assert.ok(s.includes('<div id="slot-probe">COUNTDOWN</div>'));
  assert.ok(s.indexOf('slot-probe') > s.indexOf('</h1>'), 'after the H1');
  assert.ok(s.indexOf('slot-probe') < s.lastIndexOf('</section>'), 'inside the hero section');
  assert.ok(!html(dmz).includes('slot-probe'), 'no slot when no children');
});

// ── breadcrumb ───────────────────────────────────────────────────────────────────────────────────
test('breadcrumb: NETWORK / <GAME> at the top of every hero', () => {
  for (const [cfg, leaf] of [[wardogs, 'WARDOGS'], [bodycam, 'BODYCAM'], [dmz, 'DMZ'], [pubgDednet, 'PUBG: DED.NET']]) {
    const s = html(cfg);
    assert.match(s, new RegExp('<nav aria-label="Breadcrumb"[^>]*><a href="/"[^>]*>NETWORK</a>.*?>' + leaf.replace(/[.]/g, '\\.') + '</span></nav>'));
    assert.ok(s.indexOf('Breadcrumb') < s.indexOf('<h1'), cfg.slug);
  }
});

// ── status badge derivation (never hardcoded) ────────────────────────────────────────────────────
test('badge derivation per status / earlyAccess / launch_date', () => {
  const future = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const past = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  assert.deepEqual(heroStatusBadge({ status: 'live', earlyAccess: true }), { label: 'EARLY ACCESS — LIVE', live: true });
  assert.deepEqual(heroStatusBadge({ status: 'live' }), { label: 'LIVE', live: true });
  assert.deepEqual(heroStatusBadge({ status: 'pre-launch', earlyAccess: true, launch_date: future }), { label: 'EARLY ACCESS', live: false });
  assert.deepEqual(heroStatusBadge({ status: 'pre-launch', launch_date: future }), { label: 'PRE-LAUNCH', live: false });
  assert.deepEqual(heroStatusBadge({ status: 'pre-launch', launch_date: past }), { label: 'LIVE', live: true }, 'auto-flips once the date passes');
  assert.deepEqual(heroStatusBadge({ status: 'revealed', launch_date: null }), { label: 'REVEALED', live: false });
  // the four real configs today
  assert.equal(heroStatusBadge(wardogs).label, 'EARLY ACCESS — LIVE');
  assert.equal(heroStatusBadge(bodycam).label, 'EARLY ACCESS — LIVE');
  assert.equal(heroStatusBadge(pubgDednet).label, 'REVEALED');
  assert.ok(['PRE-LAUNCH', 'LIVE'].includes(heroStatusBadge(dmz).label), 'dmz: pre-launch until Oct 23, then LIVE');
  // live -> green dot; otherwise accent dot
  assert.ok(html(wardogs).includes('background:var(--green,#5bd18e)'));
  assert.ok(!html(pubgDednet).includes('var(--green'));
});

// ── plainness + contract ─────────────────────────────────────────────────────────────────────────
test('plainness: hero props are RSC-plain for every game (the config RegExp never reaches a component)', () => {
  assert.equal(isRscPlain(bodycam), false, 'sanity: raw bodycam config is not plain');
  for (const cfg of [wardogs, bodycam, dmz, pubgDednet]) assert.equal(isRscPlain(buildHeroProps(cfg)), true, cfg.slug);
  const src = fs.readFileSync(path.join(ROOT, 'components/game/GameHero.js'), 'utf8');
  assert.ok(!/^\s*['"]use client['"]/m.test(src), 'GameHero is a server component');
});

test('contract: a hero without an H1 fails loudly (an H1-less hub is an SEO regression)', () => {
  assert.throws(() => buildHeroProps({ slug: 'x', hero: {} }), /hero\.h1\.text is required/);
  assert.throws(() => buildHeroProps({ slug: 'x' }), /required/);
});

test('every adopting hub renders GameHero and has no hand-built <h1> left; hero images < 250KB', () => {
  for (const g of ['wardogs', 'bodycam', 'dmz', 'pubg-dednet']) {
    const src = fs.readFileSync(path.join(ROOT, 'app', g, 'page.js'), 'utf8');
    assert.ok(src.includes('<GameHero hero={buildHeroProps('), g + ' uses GameHero');
    assert.ok(!/<h1\b/.test(src), g + ' has no own <h1>');
  }
  for (const cfg of [wardogs, bodycam, dmz]) {
    const size = fs.statSync(path.join(ROOT, 'public', cfg.hero.image.src)).size;
    assert.ok(size < 250 * 1024, cfg.slug + ' hero image ' + Math.round(size / 1024) + 'KB < 250KB');
  }
  assert.equal(pubgDednet.hero.image, undefined, 'dednet: no art until an official asset exists');
});
