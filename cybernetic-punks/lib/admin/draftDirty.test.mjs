// lib/admin/draftDirty.test.mjs
// Unsaved-edit detection for the admin drafts panel (Brief 85). The buffer is what the editor holds
// (tags as the comma string the input shows); "stored" is the draft row as fetched.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isDraftDirty, draftDiff, normalizeLineEndings, parseTags } from './draftDirty.js';

const STORED = { headline: 'Wardogs Season 2 Damage Changes', body: 'Para one.\n\nPara two.', tags: ['weapons', 'patch'], source_url: 'https://store.steampowered.com/news/app/1867240/view/1' };
// The exact buffer startEdit() builds from a stored row.
const bufferFrom = (d) => ({ headline: d.headline || '', body: d.body || '', tags: Array.isArray(d.tags) ? d.tags.join(', ') : '', source_url: d.source_url || '' });

test('unchanged: the buffer startEdit builds is clean', () => {
  assert.equal(isDraftDirty(STORED, bufferFrom(STORED)), false);
  assert.deepEqual(draftDiff(STORED, bufferFrom(STORED)), { headline: false, body: false, tags: false, source_url: false });
});

test('each field changed on its own is dirty, and only that field is flagged', () => {
  const cases = {
    headline: { headline: STORED.headline + '!' },
    body: { body: STORED.body + ' More.' },
    tags: { tags: 'weapons, patch, season-2' },
    source_url: { source_url: 'https://store.steampowered.com/news/app/1867240/view/2' },
  };
  for (const [field, change] of Object.entries(cases)) {
    const buf = { ...bufferFrom(STORED), ...change };
    assert.equal(isDraftDirty(STORED, buf), true, field);
    const diff = draftDiff(STORED, buf);
    for (const f of Object.keys(diff)) assert.equal(diff[f], f === field, field + ' -> ' + f);
  }
  // tag order is a change; removing a tag is a change; clearing the source is a change
  assert.equal(isDraftDirty(STORED, { ...bufferFrom(STORED), tags: 'patch, weapons' }), true);
  assert.equal(isDraftDirty(STORED, { ...bufferFrom(STORED), tags: 'weapons' }), true);
  assert.equal(isDraftDirty(STORED, { ...bufferFrom(STORED), source_url: '' }), true);
});

test('whitespace-only changes: headline and tags/source whitespace is not a change (save trims it); body whitespace IS', () => {
  assert.equal(isDraftDirty(STORED, { ...bufferFrom(STORED), headline: '  ' + STORED.headline + '  ' }), false, 'headline is trimmed on save');
  assert.equal(isDraftDirty(STORED, { ...bufferFrom(STORED), tags: '  weapons ,patch,  ' }), false, 'tags are trimmed + empties dropped on save');
  assert.equal(isDraftDirty(STORED, { ...bufferFrom(STORED), source_url: ' ' + STORED.source_url + ' ' }), false, 'source_url is trimmed on save');
  assert.equal(isDraftDirty(STORED, { ...bufferFrom(STORED), body: 'Para one.\nPara two.' }), true, 'removing a blank line merges paragraphs');
  assert.equal(isDraftDirty(STORED, { ...bufferFrom(STORED), body: STORED.body + '\n' }), true, 'body whitespace is significant');
  assert.equal(isDraftDirty(STORED, { ...bufferFrom(STORED), headline: 'Wardogs Season 2  Damage Changes' }), true, 'inner headline spacing is a real change');
});

test('null versus empty string: null and "" are the same empty value', () => {
  const s = { headline: 'H', body: 'B', tags: null, source_url: null };
  assert.equal(isDraftDirty(s, bufferFrom(s)), false, 'startEdit maps null tags/source to ""');
  assert.equal(isDraftDirty(s, { headline: 'H', body: 'B', tags: '', source_url: '' }), false);
  assert.equal(isDraftDirty({ headline: null, body: null, tags: [], source_url: '' }, { headline: '', body: '', tags: '', source_url: null }), false);
  assert.equal(isDraftDirty(s, { headline: 'H', body: 'B', tags: 'x', source_url: '' }), true);
  assert.equal(isDraftDirty(s, null), true, 'no buffer vs a non-empty stored draft');
});

test('CRLF: an untouched CRLF draft is clean, and editing it back to the stored text is clean (textarea reports LF)', () => {
  const crlf = { ...STORED, body: 'Para one.\r\n\r\nPara two.\r\nLine two.' };
  assert.equal(isDraftDirty(crlf, bufferFrom(crlf)), false, 'untouched: buffer holds the CRLF text');
  const fromTextarea = { ...bufferFrom(crlf), body: 'Para one.\n\nPara two.\nLine two.' }; // what onChange delivers
  assert.equal(isDraftDirty(crlf, fromTextarea), false, 'LF from the textarea vs CRLF stored is not a change');
  assert.equal(isDraftDirty({ ...STORED, body: 'a\rb' }, { ...bufferFrom(STORED), body: 'a\nb' }), false, 'lone CR too');
  assert.equal(isDraftDirty(crlf, { ...fromTextarea, body: fromTextarea.body + ' edit' }), true, 'a real edit is still dirty');
  assert.equal(normalizeLineEndings('x\r\ny\rz\n'), 'x\ny\nz\n');
});

test('parseTags matches the save path (split on comma, trim, drop empties; arrays too)', () => {
  assert.deepEqual(parseTags(' a, ,b ,, c '), ['a', 'b', 'c']);
  assert.deepEqual(parseTags(['a ', '', ' b']), ['a', 'b']);
  assert.deepEqual(parseTags(null), []);
});
