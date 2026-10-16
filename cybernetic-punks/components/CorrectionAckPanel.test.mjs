// components/CorrectionAckPanel.test.mjs
// The admin correction-warning review box (2026-10-16), rendered to static HTML with the repo's JSX
// harness, plus source pins for how VantageDraftsPanel wires it to the approve route. Admin-only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadComponent, render } from '../lib/games/jsxHarness.test-helper.mjs';

const mod = await loadComponent('components/CorrectionAckPanel.js');
const Panel = mod.default;

const RECORD = {
  id: 'wardogs-s1-economy-supersedes-beta',
  date: '2026-09-09',
  correction: 'Season 1 changelog (2026-09-09) superseded specific beta-observed economy figures: FOB vendor $2,500->$7,500.',
  source: 'Wardogs Season 1 changelog, Steam, 2026-09-09',
  entity: 'economy',
  keywordsFound: ['vendor'],
  sentenceHits: [],
  snippet: null,
};
const noop = () => {};
const base = { headline: 'Wardogs Season 2 Damage Changes: Calibre Nerfs Explained', corrections: [RECORD], onToggleChecked: noop, onCancel: noop, onConfirm: noop };
const confirmButton = (html) => html.match(/<button[^>]*>(?:I reviewed this - approve anyway|PUBLISHING\.\.\.)<\/button>/)[0];

test('shows every field of the record, and says plainly when no sentence contains both', () => {
  const html = render(Panel, { ...base, checked: false, busy: false });
  for (const s of ['CORRECTION WARNING', 'NOT PUBLISHED', RECORD.id, RECORD.date, RECORD.source, 'economy', 'vendor', 'SENTENCE HITS (0)', mod.NO_SENTENCE_HIT]) {
    assert.ok(html.includes(s.replace(/&/g, '&amp;')), 'missing: ' + s);
  }
  assert.ok(html.includes('FOB vendor $2,500-&gt;$7,500'), 'correction text rendered (escaped)');
});

test('lists each sentence hit when there are some', () => {
  const hits = ['The economy shift means the vendor charges more.', 'Second economy vendor line.'];
  const html = render(Panel, { ...base, corrections: [{ ...RECORD, sentenceHits: hits }], checked: false, busy: false });
  assert.ok(html.includes('SENTENCE HITS (2)'));
  for (const h of hits) assert.ok(html.includes('<li') && html.includes(h));
  assert.ok(!html.includes(mod.NO_SENTENCE_HIT));
});

test('checkbox is unchecked by default and the approve-anyway button is disabled until checked', () => {
  const off = render(Panel, { ...base, checked: false, busy: false });
  assert.ok(off.includes(mod.ACK_CHECKBOX_LABEL));
  assert.match(off, /<input type="checkbox"(?![^>]*checked="")[^>]*>/, 'checkbox not checked');
  assert.match(confirmButton(off), /disabled=""/, 'confirm disabled while unchecked');
  assert.match(off, /<button[^>]*>CANCEL<\/button>/);
  assert.doesNotMatch(off.match(/<button[^>]*>CANCEL<\/button>/)[0], /disabled=""/, 'cancel always available');

  const on = render(Panel, { ...base, checked: true, busy: false });
  assert.match(on, /<input type="checkbox"[^>]*checked=""/);
  assert.doesNotMatch(confirmButton(on), /disabled=""/, 'confirm enabled once checked');

  const busy = render(Panel, { ...base, checked: true, busy: true });
  assert.match(confirmButton(busy), /disabled=""/, 'confirm disabled while publishing');
  assert.ok(busy.includes('PUBLISHING...'));
});

test('VantageDraftsPanel wiring: 409 correction-warning opens the panel; resend carries acknowledgeCorrections only after the checkbox', () => {
  const src = readFileSync(new URL('./VantageDraftsPanel.js', import.meta.url), 'utf8');
  assert.ok(src.includes("import CorrectionAckPanel from '@/components/CorrectionAckPanel';"));
  assert.ok(src.includes("if (res.status === 409 && data && data.gate === 'correction-warning' && data.requiresCorrectionAck) {"));
  assert.ok(src.includes('setCorrAckChecked(false);'), 'checkbox reset to unchecked on every new warning');
  assert.ok(src.includes('if (acknowledgeCorrections) payload.acknowledgeCorrections = true;'));
  assert.ok(src.includes('onConfirm={function () { if (corrAckChecked) sendApprove(d, corrAck.overrideHolds, true); }}'), 'resend only when checked, overrideHolds carried as before');
  assert.ok(src.includes("(acked.length ? ' (correction warning acknowledged: ' + acked.join(', ') + ')' : '')"), 'toast shows the acknowledged ids');
  // The first approve never sends the acknowledgement.
  assert.ok(src.includes('await sendApprove(d, verdict.reviewHolds.length > 0, false);'));
});
