// lib/content/sourceLinks.js
// RENDER-TIME source links for the citation line at the end of an article body ("Sources:" or
// "Source:", see lib/content/linkEligibility.js). Splits the line into text and link segments:
// every http(s) URL becomes { type: 'link', text: <hostname without "www.">, href: <the URL as
// written in the body> }. The stored body is never changed; only how the line renders (Brief 232).
//
// Rules: trailing . , ; ) ] after a URL is not part of it and stays as text (a ")" or "]" that
// closes one opened inside the URL is kept); a URL with credentials (user:pass@), no host, or a
// scheme other than http/https stays plain text; a URL inside markdown link syntax [text](url) is
// never touched here (Brief 243: the markdown-link layer, lib/content/markdownLinks.js, renders
// those first; bare URLs elsewhere in the same line still link). Pure: no React.
import { isSourcesParagraph } from './linkEligibility.js';
import { markdownLinkSpans } from './markdownLinks.js';
import { safeHref } from '../security/safeHref.js';

var URL_RE = /https?:\/\/[^\s<>"']+/gi;
var TRAILING = '.,;)]';

function count(s, ch) { return s.split(ch).length - 1; }

// Drop trailing punctuation that belongs to the sentence, not the URL.
function trimUrl(u) {
  while (u.length) {
    var c = u.charAt(u.length - 1);
    if (TRAILING.indexOf(c) === -1) break;
    if (c === ')' && count(u, '(') >= count(u, ')')) break;
    if (c === ']' && count(u, '[') >= count(u, ']')) break;
    u = u.slice(0, -1);
  }
  return u;
}

// { type: 'link', text, href } for a linkable URL, else null (it stays plain text).
function toLink(url) {
  var u;
  try { u = new URL(url); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (u.username || u.password || !u.hostname) return null;
  var href = safeHref(url);
  if (!href) return null;
  return { type: 'link', text: u.hostname.replace(/^www\./, ''), href: href };
}

// Segments for a fragment of a citation line (the caller has already decided the line is one).
export function linkSourceUrls(text) {
  var s = text == null ? '' : String(text);
  var spans = markdownLinkSpans(s);
  var out = [];
  var last = 0;
  var m;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(s))) {
    var at = m.index;
    if (spans.some(function (sp) { return at >= sp[0] && at < sp[1]; })) continue;
    var url = trimUrl(m[0]);
    var link = toLink(url);
    if (!link) continue;
    if (m.index > last) out.push({ type: 'text', text: s.slice(last, m.index) });
    out.push(link);
    last = m.index + url.length;
  }
  if (last < s.length || out.length === 0) out.push({ type: 'text', text: s.slice(last) });
  return out;
}

// Segments for a whole paragraph: links only inside a "Sources:" / "Source:" line.
export function sourceLinkSegments(line) {
  if (!isSourcesParagraph(line)) return [{ type: 'text', text: line == null ? '' : String(line) }];
  return linkSourceUrls(line);
}
