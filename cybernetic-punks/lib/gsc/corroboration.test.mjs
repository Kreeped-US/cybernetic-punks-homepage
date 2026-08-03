// lib/gsc/corroboration.test.mjs
// Unit tests for the game-DB corroboration classifier. Pure, no DB. RUN: node lib/gsc/corroboration.test.mjs
import assert from 'node:assert';
import { classifyCorroboration } from './corroboration.js';

let passed = 0;
function test(name, fn) { fn(); passed++; console.log('  ok  ' + name); }
const find = (r, field, cls) => r.findings.find((f) => f.field === field && (!cls || f.class === cls));

// Store fixture: the real BR33 Victory Lap entity row (verified, Showcase-drop acquisition, null mods).
const BR33 = {
  type: 'unique', name: 'BR33 Victory Lap', aliases: ['Victory Lap'],
  fields: { acquisition_source: 'Showcase encounter', acquisition_detail: 'Perimeter / Dire Marsh', locked_mods: null },
  verified: true, verified_source: 'In-game Showcase data', patch_verified: '1.1.0',
};

// ── THE BR33 FIXTURE: one MIRANDA article, TWO findings, two independent classes ─────────────────
test('BR33 MIRANDA article yields two findings (acquisition CONTRADICTED + locked_mods UNCORROBORATED)', () => {
  const article = {
    slug: 'br33-victory-lap-unique-weapon-guide-complete-unlock-and-build-analysi-spks',
    editor: 'MIRANDA', created_at: '2026-04-14T12:00:00+00:00',
    body: [
      'The BR33 Victory Lap comes pre-equipped with four high-tier modifications: Trigger Discipline chip, Hi-Zoom Optic, Tru-Shot Barrel, and Feather Mag.',
      "Victory Lap requires no faction leveling - it's available through direct purchase from the Armory using the new Unique weapon currency system introduced in Update 1.0.6.",
    ].join('\n\n'),
  };
  const r = classifyCorroboration([article], { entities: [BR33] }, { patchDates: {} });

  assert.strictEqual(r.findings.length, 2, 'exactly two findings, got ' + r.findings.length);

  const acq = find(r, 'acquisition');
  assert.ok(acq, 'acquisition finding present');
  assert.strictEqual(acq.class, 'CONTRADICTED');
  assert.strictEqual(acq.claimed_value, 'armory-purchase', 'article categorized as armory-purchase');
  assert.strictEqual(acq.store_display, 'Showcase encounter / Perimeter / Dire Marsh', 'store value surfaced');
  assert.strictEqual(acq.seniority, 'indeterminate', 'no calendar entry for 1.1.0 -> indeterminate');
  assert.strictEqual(acq.suggested_disposition, 're-verify-store', 'indeterminate never auto fix-article');
  // BOTH dates surfaced for the reviewer:
  assert.strictEqual(acq.store_patch, '1.1.0', 'store patch surfaced');
  assert.strictEqual(acq.store_patch_date, null, 'store patch date unresolved');
  assert.strictEqual(acq.affected[0].created_at, '2026-04-14', 'article date surfaced');
  assert.ok(/Armory/.test(acq.affected[0].verbatim), 'finding carries verbatim sentence');

  const mods = find(r, 'locked_mods');
  assert.ok(mods, 'locked_mods finding present');
  assert.strictEqual(mods.class, 'UNCORROBORATED', 'store null -> uncorroborated');
  assert.strictEqual(mods.suggested_disposition, 'create-verification-task');
  assert.strictEqual(mods.seniority, null, 'seniority only applies to CONTRADICTED');
  assert.ok(/Trigger Discipline/.test(mods.affected[0].verbatim), 'carries verbatim mod list');
});

// ── CORROBORATED is NOT a finding, it is a provenance stamp ───────────────────────────────────────
test('a matching claim is a corroboration stamp, not a finding', () => {
  const weapon = { type: 'weapon', name: 'BR33 Volley Rifle', fields: { damage: 14 }, verified: true, verified_source: 'x', patch_verified: '1.1.0' };
  const art = { slug: 'a1', editor: 'NEXUS', created_at: '2026-05-01', body: 'The BR33 Volley Rifle deals 14 damage in the current build.' };
  const r = classifyCorroboration([art], { entities: [weapon] }, {});
  assert.strictEqual(r.findings.length, 0, 'no finding when article agrees with store');
  assert.strictEqual(r.corroborations.length, 1, 'one corroboration stamp');
  assert.strictEqual(r.corroborations[0].field, 'damage');
});

// ── numeric CONTRADICTED ─────────────────────────────────────────────────────────────────────────
test('numeric mismatch is CONTRADICTED', () => {
  const weapon = { type: 'weapon', name: 'BR33 Volley Rifle', fields: { fire_rate: 720 }, verified: true, verified_source: 'x', patch_verified: '1.1.0' };
  const art = { slug: 'a2', editor: 'NEXUS', created_at: '2026-05-01', body: 'The BR33 Volley Rifle fires at 900 RPM.' };
  const r = classifyCorroboration([art], { entities: [weapon] }, {});
  const f = find(r, 'fire_rate');
  assert.ok(f && f.class === 'CONTRADICTED');
  assert.strictEqual(f.claimed_value, 900);
});

// ── calendar-resolved seniority flip (both directions) ───────────────────────────────────────────
test('calendar-resolved seniority: article postdating store patch flips to re-verify-store', () => {
  const uq = { type: 'unique', name: 'Test Gun', fields: { acquisition_source: 'Armory purchase' }, verified: true, verified_source: 'x', patch_verified: '1.1.5' };
  const art = { slug: 'post', editor: 'NEXUS', created_at: '2026-08-01', body: 'The Test Gun is found in the Showcase encounter this season.' };
  const r = classifyCorroboration([art], { entities: [uq] }, {}); // default PATCH_DATES has 1.1.5 -> 2026-07-21
  const f = find(r, 'acquisition', 'CONTRADICTED');
  assert.ok(f, 'contradiction present');
  assert.strictEqual(f.store_patch_date, '2026-07-21', 'store patch resolved via calendar');
  assert.strictEqual(f.seniority, 'article-fresher');
  assert.strictEqual(f.suggested_disposition, 're-verify-store');
});
test('calendar-resolved seniority: article predating store patch is fix-article', () => {
  const uq = { type: 'unique', name: 'Test Gun', fields: { acquisition_source: 'Armory purchase' }, verified: true, verified_source: 'x', patch_verified: '1.1.5' };
  const art = { slug: 'pre', editor: 'NEXUS', created_at: '2026-07-01', body: 'The Test Gun is found in the Showcase encounter.' };
  const r = classifyCorroboration([art], { entities: [uq] }, {});
  const f = find(r, 'acquisition', 'CONTRADICTED');
  assert.strictEqual(f.seniority, 'store-fresher');
  assert.strictEqual(f.suggested_disposition, 'fix-article');
});

// ── seniority recency: a freshly-verified row (updated_at newer than patch) reads store-fresher ────
test('seniority MAX: updated_at newer than patch makes a recent article store-fresher', () => {
  // store verified in-game 2026-08-03 but tagged an old patch; an article from 2026-07-03 must read
  // store-fresher (the Surprise-3 fix) because updated_at (08-03) is the later evidence.
  const uq = { type: 'unique', name: 'Fresh Gun', verified: true, patch_verified: '1.1.0',
    fields: { acquisition_source: 'Armory purchase', updated_at: '2026-08-03T00:00:00+00' } };
  const art = { slug: 'fresh', editor: 'NEXUS', created_at: '2026-07-03', body: 'The Fresh Gun is found in the Showcase encounter.' };
  const r = classifyCorroboration([art], { entities: [uq] }, {}); // PATCH_DATES has 1.1.0 -> 2026-06-02
  const f = r.findings.find((x) => x.field === 'acquisition' && x.class === 'CONTRADICTED');
  assert.ok(f, 'contradiction present');
  assert.strictEqual(f.seniority_basis, 'updated_at', 'updated_at (08-03) beats patch (06-02)');
  assert.strictEqual(f.seniority, 'store-fresher');
  assert.strictEqual(f.suggested_disposition, 'fix-article');
});

// ── seniority recency: a stale updated_at older than the patch does NOT mislabel (MAX picks patch) ──
test('seniority MAX: stale updated_at older than patch still uses the later patch date', () => {
  // updated_at 2026-06-02 (last physical edit) is older than the 1.1.5 patch (2026-07-21); an article
  // from 2026-07-10 (post-06-02, pre-07-21) must still read store-fresher via the patch date, not
  // article-fresher via the stale updated_at (the naive-prefer-updated_at failure mode).
  const uq = { type: 'unique', name: 'Stale Gun', verified: true, patch_verified: '1.1.5',
    fields: { acquisition_source: 'Armory purchase', updated_at: '2026-06-02T00:00:00+00' } };
  const art = { slug: 'stale', editor: 'NEXUS', created_at: '2026-07-10', body: 'The Stale Gun is found in the Showcase encounter.' };
  const r = classifyCorroboration([art], { entities: [uq] }, {}); // 1.1.5 -> 2026-07-21
  const f = r.findings.find((x) => x.field === 'acquisition' && x.class === 'CONTRADICTED');
  assert.strictEqual(f.seniority_basis, 'patch', 'patch (07-21) beats stale updated_at (06-02)');
  assert.strictEqual(f.seniority, 'store-fresher');
});

// ── ambiguous binding -> skip, never a finding ───────────────────────────────────────────────────
test('two applicable entities in one sentence -> skipped, not a finding', () => {
  const a = { type: 'unique', name: 'Gun Alpha', fields: { acquisition_source: 'Armory purchase' }, verified: true, patch_verified: '1.1.0' };
  const b = { type: 'unique', name: 'Gun Beta', fields: { acquisition_source: 'Showcase encounter' }, verified: true, patch_verified: '1.1.0' };
  const art = { slug: 'amb', editor: 'NEXUS', created_at: '2026-05-01', body: 'Both Gun Alpha and Gun Beta are found in the Showcase encounter.' };
  const r = classifyCorroboration([art], { entities: [a, b] }, {});
  assert.strictEqual(r.findings.length, 0, 'no finding on ambiguous binding');
  assert.ok(r.skippedAmbiguous.length >= 1, 'recorded as skipped-ambiguous');
});

// ── grouping / blast radius: N articles, same claim -> one finding ───────────────────────────────
test('repetition measures blast radius, not credibility (one finding, n_affected=2)', () => {
  const uq = { type: 'unique', name: 'Repeat Gun', fields: { locked_mods: null }, verified: true, patch_verified: '1.1.0' };
  const mk = (slug) => ({ slug, editor: 'NEXUS', created_at: '2026-05-01', body: 'The Repeat Gun comes with mods: Alpha Chip, Beta Optic, and Gamma Barrel.' });
  const r = classifyCorroboration([mk('r1'), mk('r2')], { entities: [uq] }, {});
  const f = find(r, 'locked_mods', 'UNCORROBORATED');
  assert.ok(f, 'one grouped finding');
  assert.strictEqual(f.n_affected, 2, 'two affected articles under one claim');
  assert.strictEqual(r.findings.length, 1);
});

// ── provenance wrinkle surfaced: unverified store row carries an evidence note ────────────────────
test('unverified store row (verified=false) carries an evidence_note', () => {
  const weapon = { type: 'weapon', name: 'Third Party Gun', fields: { damage: 14 }, verified: false, verified_source: 'tauceti.gg', patch_verified: '1.1.0' };
  const art = { slug: 'tp', editor: 'NEXUS', created_at: '2026-05-01', body: 'The Third Party Gun deals 20 damage.' };
  const r = classifyCorroboration([art], { entities: [weapon] }, {});
  const f = find(r, 'damage', 'CONTRADICTED');
  assert.ok(f && /UNVERIFIED/.test(f.evidence_note || ''), 'evidence note flags unverified store');
  assert.strictEqual(f.store_verified, false);
});

// ── mention without a store-schema triple is IGNORED ─────────────────────────────────────────────
test('a bare entity mention with no checkable claim yields nothing', () => {
  const uq = { type: 'unique', name: 'Quiet Gun', fields: { acquisition_source: 'Armory purchase', locked_mods: null }, verified: true, patch_verified: '1.1.0' };
  const art = { slug: 'q', editor: 'NEXUS', created_at: '2026-05-01', body: 'The Quiet Gun is a fun weapon that feels great to use in ranked play.' };
  const r = classifyCorroboration([art], { entities: [uq] }, {});
  assert.strictEqual(r.findings.length, 0, 'no schema triple -> no finding');
});

// ── locked_mods: store PROSE vs article BARE LIST corroborates (the BR33 false-positive fix) ──────
test('locked_mods store prose wrapper matches an article bare list (BR33 case)', () => {
  const uq = { type: 'unique', name: 'BR33 Victory Lap', aliases: ['Victory Lap'], verified: true, patch_verified: '1.1.0',
    fields: { locked_mods: 'Locked loadout (4): Trigger Discipline chip, Hi-Zoom Optic, Tru-Shot Barrel, Feather Mag. Mods permanently locked.' } };
  const art = { slug: 'br33', editor: 'MIRANDA', created_at: '2026-04-19',
    body: 'The BR33 Victory Lap comes pre-equipped with four high-tier modifications: Trigger Discipline chip, Hi-Zoom Optic, Tru-Shot Barrel, and Feather Mag.' };
  const r = classifyCorroboration([art], { entities: [uq] }, { runDate: '2026-08-03' });
  assert.strictEqual(r.findings.filter((f) => f.field === 'locked_mods').length, 0, 'no CONTRADICTED finding (was the false positive)');
  const stamp = r.corroborations.find((c) => c.field === 'locked_mods' && c.entity === 'BR33 Victory Lap');
  assert.ok(stamp, 'emits a corroborated-against-store stamp instead');
});

// ── locked_mods: store TIER-ANNOTATED vs article without tiers corroborates (misery-disciple case) ─
test('locked_mods store tier annotations match an article without tiers (misery-disciple case)', () => {
  const uq = { type: 'unique', name: 'Misery Disciple', aliases: [], verified: true, patch_verified: '1.1.0',
    fields: { locked_mods: 'Locked loadout (4): Sucker Punch (Superior chip), Compartmental Mag I (Enhanced), Snapshot Grip (Enhanced), Pinpoint Barrel (Deluxe). Mods permanently locked.' } };
  const art = { slug: 'md', editor: 'MIRANDA', created_at: '2026-05-01',
    body: 'The Misery Disciple comes pre-equipped with four mods: Sucker Punch, Compartmental Mag I, Snapshot Grip, and Pinpoint Barrel.' };
  const r = classifyCorroboration([art], { entities: [uq] }, { runDate: '2026-08-03' });
  assert.strictEqual(r.findings.filter((f) => f.field === 'locked_mods').length, 0, 'tier annotations stripped -> no false contradiction');
  assert.ok(r.corroborations.find((c) => c.field === 'locked_mods'), 'corroborated stamp emitted');
});

// ── locked_mods: an article naming a mod the store LACKS still CONTRADICTS (containment guard) ─────
test('locked_mods still contradicts when an article names a mod not in the store', () => {
  const uq = { type: 'unique', name: 'Guard Gun', aliases: [], verified: true, patch_verified: '1.1.0',
    fields: { locked_mods: 'Locked loadout (4): Alpha Chip, Beta Optic, Gamma Barrel, Delta Mag. Mods permanently locked.' } };
  const art = { slug: 'g', editor: 'NEXUS', created_at: '2026-05-01',
    body: 'The Guard Gun comes with mods: Alpha Chip, Beta Optic, and Wrong Mod.' };
  const r = classifyCorroboration([art], { entities: [uq] }, {});
  const f = r.findings.find((x) => x.field === 'locked_mods');
  assert.ok(f && f.class === 'CONTRADICTED', 'a mod not in the store still contradicts (not laundered by containment)');
});

console.log('\n' + passed + ' passed');
