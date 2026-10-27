// lib/content/sourceLabel.js
// SHARED "Sourced from ..." noun, keyed by the PATH of an article's source_url (Brief 198). Game-agnostic:
// no game or publisher names here; the caller passes its publisher. A source_url whose path starts with
// /patchnotes/ is an official patch-notes page; anything else (a blog post, a missing or unparsable URL)
// keeps the default 'blog' noun, so every existing article renders exactly as before.
// Pure: no imports, no React.

// First match wins. Add a kind here, never at a render site.
export var SOURCE_KINDS = [
  { pathPrefix: '/patchnotes/', noun: 'patch notes' },
];
export var DEFAULT_SOURCE_NOUN = 'blog';

// The URL's path ('/patchnotes/2026/10/...'), or null when there is no usable URL. A bare path is accepted.
function urlPath(sourceUrl) {
  if (typeof sourceUrl !== 'string' || !sourceUrl.trim()) return null;
  var s = sourceUrl.trim();
  if (s.charAt(0) === '/') return s;
  try {
    return new URL(s).pathname;
  } catch (e) {
    return null;
  }
}

export function sourceNoun(sourceUrl) {
  var path = urlPath(sourceUrl);
  if (path) {
    for (var i = 0; i < SOURCE_KINDS.length; i++) {
      if (path.indexOf(SOURCE_KINDS[i].pathPrefix) === 0) return SOURCE_KINDS[i].noun;
    }
  }
  return DEFAULT_SOURCE_NOUN;
}

// 'the official <publisher> <noun>', e.g. 'the official Acme blog' / 'the official Acme patch notes'.
export function sourceLabel(publisher, sourceUrl) {
  return 'the official ' + publisher + ' ' + sourceNoun(sourceUrl);
}
