// lib/articleBody.js
// The article body PARSER, extracted VERBATIM from app/intel/[slug]/page.js so the
// public intel route AND the admin drafts preview share ONE parser -- identical output
// (including stripCitationTags), so the intel route's render is byte-unchanged. Pure:
// returns element descriptors { type:'header'|'quote'|'para', content, key }; the RENDER
// (styling) stays per-surface (the intel route keeps its ParagraphWithCards render; the
// drafts panel uses a simpler formatted render). No JSX / React here.

import { stripCitationTags } from './gather/blockId.js';

// starts and ends with a double-quote and contains exactly one pair
export function isWholeQuote(s) {
  return s.length > 2 && s.charAt(0) === '"' && s.charAt(s.length - 1) === '"'
    && (s.match(/"/g) || []).length === 2;
}

export function parseBody(body) {
  if (!body) return [];
  body = stripCitationTags(body); // render-only: drop any leaked [WS#]/[SH#]/[BN#]... citation tags from prose
  var elements = [];
  var paragraphs = body.split(/\n{2,}/);

  paragraphs.forEach(function(rawPara, paraIdx) {
    var para = rawPara.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!para) return;

    // Rule 1: whole-paragraph bold header
    var fullHeader = para.match(/^\*\*\s*([^*]+?)\s*\*\*$/);
    if (fullHeader && fullHeader[1].length <= 120) {
      elements.push({ type: 'header', content: fullHeader[1].trim(), key: 'h-' + paraIdx });
      return;
    }

    // Rule 2: standalone pull-quote
    if (isWholeQuote(para)) {
      elements.push({ type: 'quote', content: para.slice(1, -1).trim(), key: 'q-' + paraIdx });
      return;
    }

    // Rule 3: leading **Header** fused to body text
    var lead = para.match(/^\*\*\s*([^*]+?)\s*\*\*\s+(.+)$/);
    if (lead) {
      var head = lead[1].trim();
      var rest = lead[2].trim();
      if (head.length <= 60 && !/[.!?]/.test(head)) {
        elements.push({ type: 'header', content: head, key: 'h-' + paraIdx });
        if (isWholeQuote(rest)) {
          elements.push({ type: 'quote', content: rest.slice(1, -1).trim(), key: 'q-' + paraIdx + 'b' });
        } else {
          elements.push({ type: 'para', content: rest, key: 'p-' + paraIdx + 'b' });
        }
        return;
      }
    }

    // Rule 4: default paragraph
    elements.push({ type: 'para', content: para, key: 'p-' + paraIdx });
  });

  return elements;
}
