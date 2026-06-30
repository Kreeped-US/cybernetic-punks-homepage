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

// Lead TERM of a bullet item, for long lists where the useful signal is the term
// (the system / category name), not the whole sentence: the **bold** lead if
// present (FOB's "**Wallet** -- ..."), else the text before the first
// " -- "/dash/":" separator (crafting's "Gear -- ..."). No separator -> whole item.
function leadTerm(item) {
  var bold = item.match(/^\*\*\s*([^*]+?)\s*\*\*/);
  if (bold) return bold[1].trim();
  var plain = stripMarkers(item).trim();
  var m = plain.match(/^(.+?)(?:\s+(?:--|—|–)\s+|:\s+)/);
  return (m ? m[1] : plain).trim();
}

// True for a sentence that is meta-commentary, not a fact about the game: the
// article's own sourcing/dateline, or a purely negative/absence statement. Used to
// keep the last-resort fallback from surfacing "Call of Duty's official blog..." or
// "the excerpt does not detail..." as a "key fact".
function isMetaSentence(s) {
  var t = s.toLowerCase();
  if (/^(call of duty'?s official blog|the blog\b|according to|the dmz deep dive|the deep dive)/.test(t)) return true;
  if (/(does not detail|does not specify|not detailed|not specified|has not been|have not been|no further detail|not yet (been )?(specified|detailed|published|announced|shared|revealed))/.test(t)) return true;
  return false;
}

// KEY-FACTS extraction (deterministic, no AI):
//   P1) FIRST bullet block has 2-5 SHORT items (<= 90 chars each) -> use verbatim
//       (e.g. Hajin's 4 named locations).
//   P2) FIRST bullet block is LONGER (6+ items) -> use the lead TERM of the first
//       4 items (bold lead, or text before the separator) -- e.g. FOB's stations
//       ("Orders and Objectives", "Wallet", ...) or crafting's categories
//       ("Gear", "Plate Carriers", ...). Only when the terms come out short
//       (<= 60 chars); otherwise fall through.
//   P3) Last resort: first sentence of the first 3 paragraph blocks, SKIPPING
//       headers, bullets, list lead-ins (":"), quotes, AND sourcing/dateline +
//       negative/absence sentences (meta-commentary, not facts). Each truncated
//       to ~100 chars at a word boundary.
//   If fewer than 2 usable facts result, return null (caller HIDES the box).
export function extractKeyFacts(body) {
  var blocks = splitBlocks(body);

  // Locate the FIRST bullet block (items keep their ** markers).
  var firstBullet = null;
  for (var i = 0; i < blocks.length; i++) {
    var it = bulletItems(blocks[i]);
    if (it) { firstBullet = it; break; }
  }

  if (firstBullet) {
    // P1: short list -> items verbatim (markers stripped).
    var clean = firstBullet.map(function (t) { return stripMarkers(t).trim(); });
    if (clean.length >= 2 && clean.length <= 5 && clean.every(function (t) { return t.length <= 90; })) {
      return clean;
    }
    // P2: long list -> lead term of the first 4 items.
    if (firstBullet.length >= 6) {
      var terms = firstBullet.slice(0, 4)
        .map(leadTerm)
        .filter(function (t) { return t && t.length <= 60; });
      if (terms.length >= 2) return terms;
    }
  }

  // P3: last-resort first-sentence fallback (skips meta/sourcing/negatives).
  var facts = [];
  for (var j = 0; j < blocks.length && facts.length < 3; j++) {
    var block = blocks[j];
    if (headerText(block)) continue;
    if (bulletItems(block)) continue;
    var para = stripMarkers(block.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
    if (!para) continue;
    if (para.charAt(para.length - 1) === ':') continue; // list lead-in, not a fact
    if (wholeQuote(para)) continue;
    var sentence = firstSentence(para);
    if (isMetaSentence(sentence)) continue; // article's own sourcing or a negative
    sentence = truncateAtWord(sentence, 100);
    if (sentence) facts.push(sentence);
  }

  return facts.length >= 2 ? facts : null;
}

// Snippet-skip filter (for list-card snippets). Like the key-facts meta filter but
// DELIBERATELY one clause looser: it skips the DATELINE / pure sourcing intro
// ("Call of Duty's official blog published...", "According to..."), the launch-date
// boilerplate (the same closing line on every article), and negative/absence
// sentences -- but ALLOWS an attributed CONTENT sentence like "The blog is explicit
// that the FOB is not static." For a bare KEY FACT that attribution is unwanted (so
// extractKeyFacts skips it); for a prose SNIPPET it reads fine and, without this
// relaxation, FOB's first two paragraphs are both sourcing-framed and it would have
// no usable snippet at all.
function isSnippetSkip(s) {
  var t = s.toLowerCase();
  if (/^according to/.test(t)) return true;
  if (/call of duty'?s official blog/.test(t)) return true;
  if (/(deep dive|blog) (published|posted|detailed)/.test(t)) return true;
  if (/\bdmz launches\b/.test(t) || /launches october 23/.test(t)) return true;
  if (/(does not detail|does not specify|not detailed|not specified|has not been|have not been|no further detail|not yet (been )?(specified|detailed|published|announced|shared|revealed))/.test(t)) return true;
  return false;
}

// Snippet for a list card: the first real prose sentence (skipping headers, bullets,
// list lead-ins, quotes, and dateline/sourcing/launch/negative sentences per
// isSnippetSkip), truncated to ~maxLen at a word boundary. Null if none usable.
export function extractSnippet(body, maxLen) {
  maxLen = maxLen || 170;
  var blocks = splitBlocks(body);
  for (var i = 0; i < blocks.length; i++) {
    var block = blocks[i];
    if (headerText(block)) continue;
    if (bulletItems(block)) continue;
    var para = stripMarkers(block.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim());
    if (!para) continue;
    if (para.charAt(para.length - 1) === ':') continue;
    if (wholeQuote(para)) continue;
    var sentence = firstSentence(para);
    if (isSnippetSkip(sentence)) continue;
    return truncateAtWord(sentence, maxLen);
  }
  return null;
}

// Rough read-time label from a body (words / 200 wpm, min 1).
export function readTime(body) {
  if (!body) return '1 min read';
  var words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200)) + ' min read';
}
