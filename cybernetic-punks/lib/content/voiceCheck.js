// lib/content/voiceCheck.js
// VOICE CHECK (2026-10-06) -- LOG-ONLY telemetry. Counts two voice slips in a generated article body:
//   1. FIRST PERSON as the desk voice (I, I'm, I'll, I've, I'd, me, my, mine). "We/our" is the house voice
//      and is never counted. Text inside quotation marks, blockquote lines, code spans and markdown link
//      text is ignored (a quoted source or a link label is not the desk speaking).
//   2. SELF-NARRATION: sentences about the article's own length, scope or approach ("this will be a short
//      guide", "I will not pad it"). The pattern list is SMALL and built from real hits in the Sonnet 5.5
//      dry runs (2026-10-05/06). It deliberately does NOT match the honest-null disclosures the prompts
//      REQUIRE ("player reaction is not yet available", "we only have a short excerpt", "so we won't
//      invent any") -- those are required, not narration.
// Never blocks, retries or changes what publishes: the cron only attaches the counts to the
// article_generation site_events row. Game-agnostic. PURE, zero I/O.

// Editors whose desk voice is first person by design (NEXUS uses it in about half its published
// Marathon articles). Their first-person count is not flagged (always 0); self-narration still counts.
export const VOICE_FIRST_PERSON_EXEMPT_EDITORS = ['NEXUS'];

export const VOICE_SAMPLE_CAP = 3;

// First person. "I" forms are case-sensitive (a lowercase "i" is never the pronoun); me/my may open a
// sentence (Me/My); "mine" is lowercase only, so a proper noun such as "Snare Mine" is not counted.
// An "I" inside a dotted acronym ("C.A.R.R.I.") or used as a roman numeral after Tier/Part/Phase/Season/
// Act/Chapter/Vol is not the pronoun (both seen in the published Marathon baseline).
var FIRST_PERSON_RE = /(?<![.\w-])(?<!\b(?:Tier|Part|Phase|Season|Act|Chapter|Vol\.?) )I(?:['\u2019](?:m|ll|ve|d))?(?![\w.]*\.[A-Z])\b|\b[Mm][ey]\b|\bmine\b/g;

// Self-narration patterns (explicit and small). Each was seen in a real dry-run output.
export const SELF_NARRATION_PATTERNS = [
  // "so this will be a short guide" (Blast Off, Sonnet 5.5)
  /\bthis (?:will be|is going to be|is) (?:a )?(?:short|brief|quick) (?:guide|article|piece|read|breakdown)\b/i,
  // "I will not pad it" (Blast Off), "I will not dress it up" (Bombardier, Sonnet 5.5)
  /\b(?:I|we)(?: will not| won['\u2019]t| am not going to| are not going to) (?:pad|dress up|dress) (?:it|this)\b/i,
  // "That is the whole confirmed kit" (Bombardier, Sonnet 5.5)
  /\bthat(?: is|['\u2019]s) the whole (?:confirmed )?(?:kit|story|list)\b/i,
  // "That is a short list of facts" (Blast Off, Sonnet 5.5)
  /\bthat(?: is|['\u2019]s) a short list of facts\b/i,
];

// Remove what is not the desk speaking: fenced/inline code, markdown link text, blockquote lines,
// and quoted spans (straight or curly double quotes). Replaced with a space so word boundaries hold.
function stripNonVoice(text) {
  return String(text == null ? '' : text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`\n]*`/g, ' ')
    .replace(/\[([^\]\n]*)\]\([^)\n]*\)/g, ' ')
    .replace(/^\s*>.*$/gm, ' ')
    .replace(/"[^"\n]*"/g, ' ')
    .replace(/\u201c[^\u201d\n]*\u201d/g, ' ');
}

// Sentences of the stripped text (for samples), trimmed and length-capped.
function sentenceAround(text, index) {
  var start = Math.max(text.lastIndexOf('.', index), text.lastIndexOf('\n', index), text.lastIndexOf('!', index), text.lastIndexOf('?', index)) + 1;
  var endCandidates = ['.', '\n', '!', '?'].map(function (c) { var i = text.indexOf(c, index); return i === -1 ? text.length : i; });
  var end = Math.min.apply(null, endCandidates);
  return text.slice(start, end + 1).replace(/\s+/g, ' ').trim().slice(0, 160);
}

// checkVoice(body, editor) -> { firstPersonCount, firstPersonSamples[], selfNarrationCount,
//   selfNarrationSamples[], firstPersonExempt }
export function checkVoice(body, editor, opts) {
  var o = opts || {};
  var exempt = (o.exemptEditors || VOICE_FIRST_PERSON_EXEMPT_EDITORS).indexOf(String(editor || '').toUpperCase()) !== -1;
  var cap = typeof o.sampleCap === 'number' ? o.sampleCap : VOICE_SAMPLE_CAP;
  var text = stripNonVoice(body);

  var fpCount = 0; var fpSamples = [];
  if (!exempt) {
    var m; FIRST_PERSON_RE.lastIndex = 0;
    while ((m = FIRST_PERSON_RE.exec(text)) !== null) {
      fpCount++;
      var s = sentenceAround(text, m.index);
      if (fpSamples.length < cap && fpSamples.indexOf(s) === -1) fpSamples.push(s);
    }
  }

  // Self-narration is counted per DISTINCT SENTENCE (one sentence can match two patterns, e.g.
  // "That is the whole confirmed kit, so I will not dress it up.").
  var snSentences = [];
  for (var i = 0; i < SELF_NARRATION_PATTERNS.length; i++) {
    var re = new RegExp(SELF_NARRATION_PATTERNS[i].source, 'gi');
    var n;
    while ((n = re.exec(text)) !== null) {
      var t = sentenceAround(text, n.index);
      if (snSentences.indexOf(t) === -1) snSentences.push(t);
    }
  }

  return { firstPersonCount: fpCount, firstPersonSamples: fpSamples, selfNarrationCount: snSentences.length, selfNarrationSamples: snSentences.slice(0, cap), firstPersonExempt: exempt };
}
