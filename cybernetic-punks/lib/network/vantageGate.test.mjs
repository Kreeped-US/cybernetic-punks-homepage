// lib/network/vantageGate.test.mjs
// PROVES the VANTAGE honesty gate (Phase 1 detection) catches Fable Q1's known failure
// modes and passes a clean piece. An unproven gate is worse than none (false confidence),
// so this is the load-bearing evidence: the July "largely settled" slip MUST flag (Tier 2),
// a fabricated "2,263 daily players" MUST flag (Tier 3), attribution-survival is asserted
// with a dropped-source failing case (Tier 1), and a clean attributed piece passes clean.
// Run: node --test lib/network/vantageGate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sourceReference, detectUnattributedClaims, detectUnverifiedStats, runVantageGate } from './vantageGate.js';

// ── TIER 1: attribution-survival (structural) -- and the dropped-source FAILURE ──
test('tier1: a row with creator name + source_url structurally carries the reference', () => {
  const r = sourceReference({ creator_info: { name: 'Vivi Cross' }, source_url: 'https://youtube.com/watch?v=x', source: 'YouTube' });
  assert.equal(r.survives, true, 'named creator + url -> reference survives');
  assert.equal(r.isLinked, true, 'source_url present -> the bar is a link');
  assert.match(r.sourcedText, /Sourced from Vivi Cross/, 'the "Sourced from X" bar text carries the creator');
});
test('tier1: a DROPPED-SOURCE row (no name, no url) FAILS survival -- the case the gate must catch', () => {
  const r = sourceReference({ creator_info: {}, source_url: null });
  assert.equal(r.survives, false, 'no creator name AND no source_url -> attribution did NOT survive');
});
test('tier1: a url with no name still survives (anonymous but linked)', () => {
  const r = sourceReference({ creator_info: {}, source_url: 'https://x.com/post/1' });
  assert.equal(r.survives, true);
  assert.equal(r.hasName, false);
});

// ── TIER 2: per-claim attribution -- the July "largely settled" slip ──
test('tier2: the July slip -- "largely settled" in CNP voice with NO attribution -> FLAGGED', () => {
  const body = 'The debate over Marathon\'s economy is largely settled.';
  const flags = detectUnattributedClaims(body);
  assert.equal(flags.length, 1, 'exactly one unattributed reception claim');
  assert.match(flags[0].cue, /settled/, 'flagged on the settled-language cue');
});
test('tier2: the SAME claim, attributed ("in his read") -> NOT flagged (Fable rule 5: attributed is allowed)', () => {
  const body = 'In his read, the debate over the economy is largely settled.';
  assert.equal(detectUnattributedClaims(body).length, 0);
});
test('tier2: attribution to a group ("many players argue ... settled") -> NOT flagged', () => {
  const body = 'Many players argue the meta is settled and nothing will change.';
  assert.equal(detectUnattributedClaims(body).length, 0);
});
test('tier2: a CNP-voiced consensus claim ("everyone agrees") with no attribution -> FLAGGED', () => {
  const flags = detectUnattributedClaims('Everyone agrees the launch was a disaster.');
  assert.equal(flags.length, 1);
});
test('tier2: pure framing (no settled-language) -> NOT flagged (avoids noise)', () => {
  const body = 'The creator argues the reset is punishing. Why it matters: the community is split on whether that is fair.';
  assert.equal(detectUnattributedClaims(body).length, 0);
});

// ── TIER 3: unverifiable stats -- the July "2,263 / 50,000" fabrication ──
test('tier3: "2,263 daily players / 50,000 peak" NOT in source -> BOTH FLAGGED', () => {
  const body = 'The creator points to 2,263 daily players against a 50,000 peak.';
  const source = 'The creator argues the game feels empty and the population is collapsing.';
  const flags = detectUnverifiedStats(body, source);
  const tokens = flags.map(f => f.token.replace(/\s+/g, ' '));
  assert.ok(flags.length >= 2, 'both stat-shaped numbers flagged (got ' + flags.length + ')');
  assert.ok(tokens.some(t => t.includes('2,263')), '2,263 flagged');
  assert.ok(tokens.some(t => t.includes('50,000')), '50,000 flagged');
});
test('tier3: a number present VERBATIM in the source -> NOT flagged (source-traceable)', () => {
  const body = 'The creator cites 2,263 daily players.';
  const source = 'Peak was healthy but only 2,263 daily players remain, the creator says.';
  assert.equal(detectUnverifiedStats(body, source).length, 0, '2,263 is in the vetted source -> excluded');
});
test('tier3: a percentage not in source -> FLAGGED', () => {
  const flags = detectUnverifiedStats('Win rates jumped 45% after the patch.', 'The creator says wins went up a lot.');
  assert.equal(flags.length, 1);
  assert.match(flags[0].token, /45\s?%/);
});
test('tier3: dates/years/labels are NOT flagged', () => {
  const body = 'DMZ launches October 23, 2026. Season 2 is when it heats up.';
  assert.equal(detectUnverifiedStats(body, '').length, 0, 'month-day, year, and "Season 2" excluded');
});
test('tier3: small bare numbers (scores, counts <4 digits) are NOT stat-shaped -> NOT flagged', () => {
  assert.equal(detectUnverifiedStats('He went 3 and 0 in his last matches.', '').length, 0);
});

// ── FULL GATE: clean attributed piece passes; a poisoned piece flags across tiers ──
const CLEAN_ROW = {
  headline: 'A creator says Marathon\'s ranked reset feels punishing',
  creator_info: { name: 'Vivi Cross' },
  source_url: 'https://youtube.com/watch?v=abc',
  source: 'YouTube',
  body: [
    '**The take**',
    '',
    'According to the creator, Marathon\'s ranked reset feels punishing. In their read, the grind resets too hard each season.',
    '',
    '**Why it matters**',
    '',
    'The community is split on whether that is fair. For the verified ladder math, the ranked desk has the breakdown.',
  ].join('\n'),
};
const CLEAN_SOURCE = 'The reset is brutal, the creator argues; every season you start over and it feels punishing.';

test('gate: a clean, attributed, stat-free piece passes with ZERO flags', () => {
  const r = runVantageGate(CLEAN_ROW, CLEAN_SOURCE);
  assert.equal(r.tier1.survives, true, 'attribution survives');
  assert.equal(r.tier2.length, 0, 'no unattributed reception claims');
  assert.equal(r.tier3.length, 0, 'no unverifiable stats');
  assert.equal(r.needsReview, false, 'clean -> no review flags (still needs human approval by policy)');
});

test('gate: a poisoned piece (dropped source + slip + fake stat) flags on all three tiers', () => {
  const poisoned = {
    creator_info: {},          // dropped source (no name)...
    source_url: null,          // ...and no url -> tier1 FAIL
    body: 'The economy debate is largely settled. The game is down to 2,263 daily players.',
  };
  const r = runVantageGate(poisoned, 'The creator thinks the game is dying.');
  assert.equal(r.tier1.survives, false, 'tier1 flags dropped source');
  assert.ok(r.tier2.length >= 1, 'tier2 flags the settled slip');
  assert.ok(r.tier3.length >= 1, 'tier3 flags the fabricated 2,263');
  assert.ok(r.flagCount >= 3, 'all three tiers contributed a flag');
  assert.equal(r.needsReview, true);
});
