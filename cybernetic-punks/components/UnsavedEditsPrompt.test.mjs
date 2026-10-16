// components/UnsavedEditsPrompt.test.mjs
// Brief 85: the in-panel unsaved-edits prompt (rendered with the repo's JSX harness) and source pins
// for how VantageDraftsPanel guards unsaved edits. Admin-only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadComponent, render } from '../lib/games/jsxHarness.test-helper.mjs';

const mod = await loadComponent('components/UnsavedEditsPrompt.js');
const Prompt = mod.default;
const noop = () => {};
const base = { fromHeadline: 'Draft A headline', toHeadline: 'Draft B headline', onSaveSwitch: noop, onDiscardSwitch: noop, onStay: noop };
const button = (html, label) => html.match(new RegExp('<button[^>]*>' + label.replace(/\./g, '\\.') + '</button>'))[0];

test('shows both headlines and exactly three outcomes: save and switch, discard and switch, stay', () => {
  const html = render(Prompt, { ...base, saving: false });
  for (const s of ['UNSAVED EDITS', 'Draft A headline', 'Draft B headline', 'APPROVE publishes the saved version']) assert.ok(html.includes(s), s);
  assert.equal((html.match(/<button/g) || []).length, 3);
  for (const l of [mod.SAVE_SWITCH_LABEL, mod.DISCARD_SWITCH_LABEL, mod.STAY_LABEL]) assert.doesNotMatch(button(html, l), /disabled=""/, l + ' enabled');
});

test('while saving, all three buttons are disabled and save reads SAVING...', () => {
  const html = render(Prompt, { ...base, saving: true });
  assert.match(button(html, 'SAVING...'), /disabled=""/);
  assert.match(button(html, mod.DISCARD_SWITCH_LABEL), /disabled=""/);
  assert.match(button(html, mod.STAY_LABEL), /disabled=""/);
});

test('VantageDraftsPanel wiring: dirty from draftDirty, no silent switch, approve blocked, badges, beforeunload, save result', () => {
  const src = readFileSync(new URL('./VantageDraftsPanel.js', import.meta.url), 'utf8');
  // dirty is derived from the stored draft vs the buffer by the pure helper
  assert.ok(src.includes("import { isDraftDirty } from '@/lib/admin/draftDirty';"));
  assert.ok(src.includes('var dirty = !!editingDraft && isDraftDirty(editingDraft, { headline: editHeadline, body: editBody, tags: editTags, source_url: editSourceUrl });'));
  // EDIT goes through requestEdit; a dirty buffer opens the prompt instead of switching; re-opening the same draft keeps its buffer
  assert.ok(src.includes('<button onClick={function () { requestEdit(d); }}'));
  assert.ok(!src.includes('<button onClick={function () { startEdit(d); }}'), 'no direct (silent) switch from the EDIT button');
  assert.ok(src.includes('if (dirty) { setPendingSwitch({ toId: d.id }); return; }'));
  assert.ok(src.includes('if (editingId === d.id) { setOpen('), 'same draft: do not reset the buffer');
  // save-and-switch only switches when the save succeeded
  assert.ok(src.includes('var ok = await saveEdit(editingDraft);'));
  assert.ok(src.includes('if (ok) { setPendingSwitch(null); startEdit(target); }'));
  assert.ok(src.includes("setNote('Saved: ' + data.data.headline + extra + ' -- still a draft; APPROVE to publish.');\r\n      return true;") || src.includes("setNote('Saved: ' + data.data.headline + extra + ' -- still a draft; APPROVE to publish.');\n      return true;"));
  assert.ok(/setNote\('Edit failed: ' \+ err\.message\);\r?\n\s+return false;/.test(src), 'failed save returns false (stays dirty)');
  // approve: refused + disabled for a dirty draft, with the required wording
  assert.ok(src.includes('if (isDirtyDraft(d)) {'));
  assert.ok(src.includes("disabled={busy === d.id || editingId === d.id || isDirtyDraft(d)}"));
  assert.ok(src.includes("title={isDirtyDraft(d) ? 'Unsaved edits - save or discard first'"));
  assert.ok(src.includes("'UNSAVED - SAVE OR DISCARD FIRST'"));
  // visible markers on the card and the editor
  assert.ok(src.includes('data-testid="unsaved-card-badge"') && src.includes('data-testid="unsaved-editor-badge"'));
  // beforeunload registered only while dirty, and removed on cleanup
  assert.ok(src.includes("if (!dirty || typeof window === 'undefined') return undefined;"));
  assert.ok(src.includes("window.addEventListener('beforeunload', warn);") && src.includes("window.removeEventListener('beforeunload', warn);"));
  assert.ok(src.includes('}, [dirty]);'));
  // no change to the approve request contract (Brief 81 flow intact)
  assert.ok(src.includes('if (acknowledgeCorrections) payload.acknowledgeCorrections = true;'));
});
