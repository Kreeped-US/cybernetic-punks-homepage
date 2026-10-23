// lib/network/rootGamesMode.test.mjs
// ROOT_GAMES pulse.mode (Brief 124): DMZ is live -- mode 'live', no onlineSource (no DMZ player-count
// source exists), no note (read only for pre-launch games). The other four games' pulse framing is frozen.
// The labels each consumer derives from the mode are computed here with the consumers' own expressions,
// which are pinned in their sources below: Vantage context line, /join/welcome status, /me follow label.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ROOT_GAMES } from './rootGames.js';
import { buildVantageUserPrompt } from './vantage.js';

const src = (p) => readFileSync(new URL('../../' + p, import.meta.url), 'utf8');
const game = (slug) => ROOT_GAMES.find((g) => g.slug === slug);
const framing = (g) => ({ mode: g.pulse.mode, onlineSource: g.pulse.onlineSource, note: g.pulse.note });

test('DMZ rootGames entry: mode live, no onlineSource, no note; feed unchanged', () => {
  const d = game('dmz');
  assert.equal(d.pulse.mode, 'live');
  assert.ok(!('onlineSource' in d.pulse), 'no player-count source for DMZ');
  assert.ok(!('note' in d.pulse), 'note is read only for pre-launch games');
  assert.deepEqual(d.pulse.feed, { gameSlug: 'dmz' });
});

test('other games: pulse framing unchanged', () => {
  assert.deepEqual(framing(game('marathon')), { mode: 'live', onlineSource: 'steam', note: undefined });
  assert.deepEqual(framing(game('wardogs')), { mode: 'live', onlineSource: undefined, note: 'Live in Early Access' });
  assert.deepEqual(framing(game('pubg-dednet')), { mode: 'pre-launch', onlineSource: undefined, note: 'Revealed - closed beta' });
  assert.deepEqual(framing(game('bodycam')), { mode: 'live', onlineSource: 'steam', note: undefined });
});

test('Vantage context: DMZ is "DMZ: LIVE"; the other games keep their lines', () => {
  const route = src('app/api/network-editor/route.js');
  assert.ok(route.includes("live: g.pulse.mode === 'live',"));
  assert.ok(route.includes("note: g.pulse.mode === 'pre-launch' ? g.pulse.note : null,"));
  const games = ROOT_GAMES.map((g) => ({ label: g.label, live: g.pulse.mode === 'live', note: g.pulse.mode === 'pre-launch' ? g.pulse.note : null }));
  const lines = buildVantageUserPrompt({ games, recent: [] }).split('\n').filter((l) => /^- .+: (LIVE|PRE-LAUNCH)\b/.test(l));
  assert.deepEqual(lines, ['- Marathon: LIVE', '- DMZ: LIVE', '- Wardogs: LIVE', '- PUBG: DED.NET: PRE-LAUNCH (Revealed - closed beta)', '- Bodycam: LIVE']);
});

test('/join/welcome and /me labels for DMZ read live', () => {
  const welcome = src('app/(network)/join/welcome/page.js');
  assert.ok(welcome.includes("var live = !!(g.pulse && g.pulse.mode === 'live');"));
  assert.ok(welcome.includes("status: live ? 'Live now' : ((g.pulse && g.pulse.note) || 'Pre-launch'),"));
  assert.ok(src('app/(network)/join/welcome/OnboardingClient.js').includes("{o.live ? o.status : ('Pre-launch - ' + o.status)}"));
  assert.ok(src('app/me/MeShell.js').includes("live: !!(g.pulse && g.pulse.mode === 'live'),"));
  assert.ok(src('app/me/FollowEditor.js').includes("{o.live ? 'Live' : 'Pre-launch'}"));
  const d = game('dmz');
  const live = !!(d.pulse && d.pulse.mode === 'live');
  const welcomeStatus = live ? 'Live now' : ((d.pulse && d.pulse.note) || 'Pre-launch');
  assert.equal(live ? welcomeStatus : 'Pre-launch - ' + welcomeStatus, 'Live now');
  assert.equal(live ? 'Live' : 'Pre-launch', 'Live');
  // Only PUBG: DED.NET is still pre-launch, so the welcome pre-launch note stays for it alone.
  assert.deepEqual(ROOT_GAMES.filter((g) => g.pulse.mode !== 'live').map((g) => g.slug), ['pubg-dednet']);
});
