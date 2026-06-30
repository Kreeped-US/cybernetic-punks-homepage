// lib/dmz/articleContent.js
// Pure, dependency-free parsing for DMZ article bodies. Used by the DMZ article
// detail page (render-time, server) and importable by a bare-node verifier.
// NO API calls -- deterministic string/markdown parsing only.
//
// The DMZ news body shape (from gen-dmz-news.mjs): blank-line-separated blocks,
// where a block is one of:
//   - a whole-line **Bold Header**            -> a real section header (h2)
//   - a run of "- " lines                     -> a bullet list
//   - a standalone "...fully quoted..." line   -> a pull-quote
//   - anything else                            -> a paragraph (inline **bold**)

// Split a body into trimmed, non-empty blocks.
export function splitBlocks(body) {
  if (!body) return [];
  return body
    .split(/\n{2,}/)
    .map(function (b) { return b.replace(/^\s+|\s+$/g, ''); })
    .filter(Boolean);
}

// A block that is entirely **bold** on one line -> header text, else null.
export function headerText(block) {
  var m = block.match(/^\*\*\s*([^*]+?)\s*\*\*$/);
  return m ? m[1].trim() : null;
}

// Non-empty, trimmed lines of a block.
function blockLines(block) {
  return block.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
}

// A block whose every line starts with "- " or "* " -> the bullet items with the
// leading marker removed but inline **bold** PRESERVED (body rendering needs it),
// else null. Callers that want plain text (key facts) strip markers themselves.
export function bulletItems(block) {
  var lines = blockLines(block);
  if (lines.length === 0) return null;
  var allBullets = lines.every(function (l) { return /^[-*]\s+/.test(l); });
  if (!allBullets) return null;
  return lines.map(function (l) { return l.replace(/^[-*]\s+/, '').trim(); });
}

// Whole-line double-quoted string (one pair) -> a standalone pull-quote.
export function wholeQuote(s) {
  if (s.length > 2 && s.charAt(0) === '"' && s.charAt(s.length - 1) === '"'
    && (s.match(/"/g) || []).length === 2) {
    return s.slice(1, -1).trim();
  }
  return null;
}

// Strip inline **bold** markers, keep inner text.
export function stripMarkers(s) {
  return s.replace(/\*\*([^*]+)\*\*/g, '$1');
}

// First sentence of a paragraph (up to the first . ! or ? + space/end).
function firstSentence(text) {
  var m = text.match(/^([\s\S]+?[.!?])(\s|$)/);
  return (m ? m[1] : text).trim();
}

// Truncate to <= max chars at a word boundary; append "..." only if cut.
function truncateAtWord(s, max) {
  if (s.length <= max) return s;
  var cut = s.slice(0, max);
  var sp = cut.lastIndexOf(' ');
  if (sp > 0) cut = cut.slice(0, sp);
  return cut.replace(/[\s.,;:\-]+$/, '') + '...';
}

// Parse a body into typed render blocks: {type:'h2'|'ul'|'quote'|'p', ...}.
export function parseBody(body) {
  var out = [];
  splitBlocks(body).forEach(function (block, i) {
    var h = headerText(block);
    if (h) { out.push({ type: 'h2', text: h, key: 'h-' + i }); return; }

    var bullets = bulletItems(block);
    if (bullets) { out.push({ type: 'ul', items: bullets, key: 'u-' + i }); return; }

    var oneLine = block.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    var q = wholeQuote(oneLine);
    if (q) { out.push({ type: 'quote', text: q, key: 'q-' + i }); return; }

    out.push({ type: 'p', text: oneLine, key: 'p-' + i });
  });
  return out;
}

// KEY-FACTS extraction (deterministic, no AI):
//   1) If the FIRST bullet block in the body has 2-5 SHORT items (<= 90 chars
//      each), use those items verbatim.
//   2) Otherwise fall back to the first sentence of each of the first 3 paragraph
//      blocks (skipping headers, bullets, list lead-ins ending in ":", and
//      standalone quotes), each truncated to ~100 chars at a word boundary.
//   3) If fewer than 2 usable facts result, return null (caller HIDES the box).
export function extractKeyFacts(body) {
  var blocks = splitBlocks(body);

  // 1) first bullet block, if it qualifies (plain text -- markers stripped)
  for (var i = 0; i < blocks.length; i++) {
    var items = bulletItems(blocks[i]);
    if (items) {
      var clean = items.map(function (t) { return stripMarkers(t).trim(); });
      var shortEnough = clean.every(function (t) { return t.length <= 90; });
      if (clean.length >= 2 && clean.length <= 5 && shortEnough) return clean;
      break; // only the FIRST bullet block is considered
    }
  }

  // 2) fallback: first sentence of the first 3 paragraph blocks
  var facts = [];
  for (var j = 0; j < blocks.length && facts.length < 3; j++) {
    var block = blocks[j];
    if (headerText(block)) continue;
    if (bulletItems(block)) continue;
    var para = stripMarkers(block.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
    if (!para) continue;
    if (para.charAt(para.length - 1) === ':') continue; // list lead-in, not a fact
    if (wholeQuote(para)) continue;
    var sentence = truncateAtWord(firstSentence(para), 100);
    if (sentence) facts.push(sentence);
  }

  return facts.length >= 2 ? facts : null;
}
