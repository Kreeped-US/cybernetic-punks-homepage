// lib/content/bodyIntegrity.js
// BODY INTEGRITY GUARD (2026-10-05). PURE, zero-I/O, game-agnostic: does this headline + body look
// like a real article, or like a pipeline/template artifact? Callers decide what a failure means
// (publish + approve BLOCK on it; draft insert only logs it).
//
// THE INCIDENT IT CLOSES. Wardogs 17b28539 went live on Sep 15 with the body
// "<full body — exact text, headers as **bold**, quotes escaped — in the committed file>" -- a note
// that was meant to be replaced by the real text. It entered through a hand-run SQL insert, so no
// gate saw it, and it stayed live and indexed for 20 days. Separately, 2f4f11e1 shipped
// "from 20mm and 30mm cannon fire from 20mm and 30mm cannon fire" (a back-to-back repeat).
//
// PROBLEM CLASSES (each returns { code, message, detail }):
//   BODY_EMPTY / BODY_TOO_SHORT  -- trimmed body under MIN_BODY_CHARS. Calibrated 2026-10-05 on the
//                                   414 published articles: shortest real body 766 chars (104 words),
//                                   p1 1244, median 3619; the placeholder was 85. 400 sits well
//                                   below every real article and well above any stub.
//   PLACEHOLDER                  -- the whole body is one <...> note, or it carries template /
//                                   placeholder syntax (see PLACEHOLDER_PATTERNS). Bare words that
//                                   real prose uses ("placeholder", "TBD", "exact text") are NOT
//                                   matched -- only their placeholder forms -- because honest-null
//                                   copy legitimately says "TBD" and a published Marathon article
//                                   says "1.1.0.4 is a placeholder on the calendar".
//   REPEATED_PHRASE              -- a 4-12 word run repeated back to back within one line. Per line,
//                                   so a **HEADER** echoed by the first sentence is not a hit.
//   HEADLINE_EMPTY / HEADLINE_IS_BODY_START -- no headline, or the body just restates it.

export const MIN_BODY_CHARS = 400;

// Placeholder / template-leak patterns. Each is matched against the raw body.
export const PLACEHOLDER_PATTERNS = [
  { re: /^<[^>]*>$/, label: 'body is a single <...> note' },                       // tested on the trimmed body
  { re: /<\s*(?:full body|body|headline|source|url|link|text|content|placeholder|tbd|todo|insert)\b[^>]*>/i, label: '<...> template slot' },
  { re: /\bfull body\s*(?:--|—|–|-|:|,)/i, label: '"full body" placeholder note' },
  { re: /\bexact text\s*(?:--|—|–|-|:|,)/i, label: '"exact text" placeholder note' },
  { re: /\bin the committed file\b/i, label: '"in the committed file" placeholder note' },
  { re: /lorem ipsum/i, label: 'lorem ipsum' },
  { re: /\bTODO\b/, label: 'TODO' },
  { re: /\bPLACEHOLDER\b/, label: 'PLACEHOLDER' },
  { re: /^\s*\[?TBD\]?\s*\.?\s*$/m, label: 'a line that is only TBD' },
  { re: /\[(?:insert|placeholder|tbd|todo)\b[^\]]*\]/i, label: '[insert ...] style slot' },
  { re: /\[(?:source|link|url)\](?!\()/i, label: '[source] slot with no link' },  // "[source](https://..)" is a real link
  { re: /\{\{[^}]*\}\}/, label: 'unresolved {{template}} token' },
];

const MIN_REPEAT_WORDS = 4;
const MAX_REPEAT_WORDS = 12;

function normWord(w) {
  return String(w).toLowerCase().replace(/[^a-z0-9%$.]+/g, '').replace(/\.+$/, '');
}

function normText(s) {
  return String(s || '').toLowerCase().replace(/\*\*/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// First back-to-back repeat of a 4-12 word run inside one line, or null.
export function findRepeatedPhrase(body) {
  const lines = String(body || '').split(/\r?\n/);
  for (const line of lines) {
    const raw = line.split(/\s+/).filter(Boolean);
    const toks = raw.map(normWord);
    for (let n = MIN_REPEAT_WORDS; n <= MAX_REPEAT_WORDS; n++) {
      for (let i = 0; i + 2 * n <= toks.length; i++) {
        let same = true;
        let hasLetters = false;
        for (let k = 0; k < n; k++) {
          if (!toks[i + k] || toks[i + k] !== toks[i + n + k]) { same = false; break; }
          if (/[a-z]/.test(toks[i + k])) hasLetters = true;
        }
        if (same && hasLetters) {
          return { words: n, phrase: raw.slice(i, i + n).join(' '), context: raw.slice(Math.max(0, i - 6), i + 2 * n + 4).join(' ') };
        }
      }
    }
  }
  return null;
}

// checkBodyIntegrity({ headline, body }) -> { ok, problems[] }
export function checkBodyIntegrity(input) {
  const o = input || {};
  const body = o.body == null ? '' : String(o.body);
  const headline = o.headline == null ? '' : String(o.headline);
  const trimmed = body.trim();
  const problems = [];

  if (!trimmed) {
    problems.push({ code: 'BODY_EMPTY', message: 'Body is empty.', detail: null });
  } else if (trimmed.length < MIN_BODY_CHARS) {
    problems.push({ code: 'BODY_TOO_SHORT', message: 'Body is ' + trimmed.length + ' characters; the minimum is ' + MIN_BODY_CHARS + '.', detail: trimmed.slice(0, 120) });
  }

  for (const p of PLACEHOLDER_PATTERNS) {
    const target = p.label === 'body is a single <...> note' ? trimmed : body;
    const m = target.match(p.re);
    if (m) problems.push({ code: 'PLACEHOLDER', message: 'Placeholder or template text: ' + p.label + '.', detail: m[0].slice(0, 120) });
  }

  const rep = findRepeatedPhrase(body);
  if (rep) {
    problems.push({ code: 'REPEATED_PHRASE', message: 'A ' + rep.words + '-word phrase is repeated back to back: "' + rep.phrase + '".', detail: rep.context });
  }

  const h = normText(headline);
  if (!h) {
    problems.push({ code: 'HEADLINE_EMPTY', message: 'Headline is empty.', detail: null });
  } else if (normText(body).startsWith(h)) {
    problems.push({ code: 'HEADLINE_IS_BODY_START', message: 'The body starts by repeating the headline.', detail: headline.slice(0, 120) });
  }

  return { ok: problems.length === 0, problems };
}

// One-line summary for error responses and logs.
export function summarizeProblems(problems) {
  return (problems || []).map((p) => p.code + ': ' + p.message).join(' | ');
}
