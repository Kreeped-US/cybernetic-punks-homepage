// lib/content/markdownLinks.js
// RENDER-TIME markdown links [label](target) in article bodies (Brief 243). The editor prompt
// (lib/editorCore.js:105) asks writers for internal links in this form; only DiscourseArticle rendered
// them, so the other body renderers showed the raw syntax. Splits text into text and link segments;
// the stored body is never changed. Pure: no React.
//
// Rules: the label is non-empty with no brackets and no newline; the target has no whitespace (a ")"
// ends it). Internal = a path starting with a single "/" (not "//" or "/\"); external = https only.
// Everything else (http:, javascript:, data:, mailto:, protocol-relative, relative paths, "#anchor",
// malformed syntax) stays literal text. Never throws.
import { safeHref } from '../security/safeHref.js';

var MD_LINK_RE = /\[([^[\]\n]+)\]\(([^\s)]+)\)/g;
// Any markdown-link-shaped run, linkable or not (for callers that must leave the syntax alone).
var MD_SYNTAX_RE = /\[[^[\]\n]*\]\([^\s)]*\)/g;
var BOLD_SPLIT_RE = /(\*\*[^*]+\*\*)/;
var BOLD_RE = /^\*\*[^*]+\*\*$/;

function toLink(label, target) {
  if (!label.trim()) return null;
  if (safeHref(target) !== target) return null;
  if (target.charAt(0) === '/') return { type: 'link', label: label, href: target, internal: true };
  if (/^https:\/\//i.test(target)) return { type: 'link', label: label, href: target, internal: false };
  return null;
}

// [{type:'text', text} | {type:'link', label, href, internal}] for a run of text.
export function splitMarkdownLinks(text) {
  var s = text == null ? '' : String(text);
  var out = [];
  var last = 0;
  try {
    var m;
    MD_LINK_RE.lastIndex = 0;
    while ((m = MD_LINK_RE.exec(s))) {
      var link = toLink(m[1], m[2]);
      if (!link) continue;
      if (m.index > last) out.push({ type: 'text', text: s.slice(last, m.index) });
      out.push(link);
      last = m.index + m[0].length;
    }
  } catch (e) {
    return [{ type: 'text', text: s }];
  }
  if (last < s.length || out.length === 0) out.push({ type: 'text', text: s.slice(last) });
  return out;
}

export function hasMarkdownLink(text) {
  return splitMarkdownLinks(text).some(function (seg) { return seg.type === 'link'; });
}

// [start, end) of every markdown-link-shaped run in text, linkable or not.
export function markdownLinkSpans(text) {
  var s = text == null ? '' : String(text);
  var spans = [];
  var m;
  MD_SYNTAX_RE.lastIndex = 0;
  while ((m = MD_SYNTAX_RE.exec(s))) spans.push([m.index, m.index + m[0].length]);
  return spans;
}

// Like splitMarkdownLinks, but each **bold** run stays whole as a text segment so the caller's own
// bold parsing still sees it (a link inside bold is rendered by that bold renderer, inside <strong>).
export function splitMarkdownLinksOutsideBold(text) {
  var out = [];
  String(text == null ? '' : text).split(BOLD_SPLIT_RE).forEach(function (part) {
    if (!part) return;
    if (BOLD_RE.test(part)) { out.push({ type: 'text', text: part }); return; }
    splitMarkdownLinks(part).forEach(function (seg) { if (seg.type === 'link' || seg.text) out.push(seg); });
  });
  return out.length ? out : [{ type: 'text', text: '' }];
}
