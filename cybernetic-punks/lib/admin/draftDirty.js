// lib/admin/draftDirty.js
// Unsaved-edit detection for the admin drafts panel (2026-10-16, Brief 85). APPROVE publishes the
// STORED row, so text typed into the editor but never saved is lost on approve. This pure helper says
// whether the edit buffer differs from the stored draft, so the panel can block APPROVE, warn on
// switch / reload, and show an UNSAVED marker. Game-agnostic; no I/O.
//
// Each field is compared the way the SAVE path would store it, so a buffer that would save to the
// same values is CLEAN (no false "unsaved"), and any change the save would actually write is DIRTY:
//   headline   trimmed (the edit route trims it). null/undefined == ''.
//   body       line endings normalized (CRLF / lone CR -> LF) on BOTH sides. A browser textarea
//              reports its value with LF line breaks, so a CRLF body (e.g. one written through the
//              Windows SQL editor) would otherwise read as dirty after any keystroke, even an undo.
//              Other whitespace IS significant (a blank line splits a paragraph), so it is NOT
//              trimmed or collapsed. null/undefined == ''.
//   tags       buffer is the comma string the editor shows; parsed like saveEdit + the edit route
//              (split on ',', trim each, drop empties) and compared as an ordered list against the
//              stored text[] (null == []).
//   source_url trimmed; '' and null both mean "no source" (the edit route stores '' as null).
// House-style normalization the server applies on save (smart quotes, em-dashes) is NOT simulated:
// a buffer that differs only by such characters still counts as dirty, which is the safe direction.

function text(v) { return v == null ? '' : String(v); }
export function normalizeLineEndings(s) { return text(s).replace(/\r\n?/g, '\n'); }
export function parseTags(v) {
  if (Array.isArray(v)) return v.map(function (t) { return text(t).trim(); }).filter(Boolean);
  return text(v).split(',').map(function (t) { return t.trim(); }).filter(Boolean);
}
function url(v) { var s = text(v).trim(); return s === '' ? null : s; }

// Which fields differ: { headline, body, tags, source_url } booleans.
export function draftDiff(stored, buffer) {
  var s = stored || {}, b = buffer || {};
  var st = parseTags(s.tags), bt = parseTags(b.tags);
  return {
    headline: text(s.headline).trim() !== text(b.headline).trim(),
    body: normalizeLineEndings(s.body) !== normalizeLineEndings(b.body),
    tags: st.length !== bt.length || st.some(function (t, i) { return t !== bt[i]; }),
    source_url: url(s.source_url) !== url(b.source_url),
  };
}

// True when saving the buffer would change the stored draft.
export function isDraftDirty(stored, buffer) {
  var d = draftDiff(stored, buffer);
  return d.headline || d.body || d.tags || d.source_url;
}
