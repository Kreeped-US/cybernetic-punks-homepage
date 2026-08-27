// lib/generation/grounding.js
// ============================================================
// SHARED PRE-LAUNCH GROUNDING LIBRARY (Phase 2a) -- the game-agnostic enforcement
// surface extracted from the two working inline generators (gen-dmz-news.mjs +
// gen-wardogs-news.mjs). It is the architecture for game #5 (PUBG: DED.NET) onward.
//
// WHAT THIS IS (per the Phase 2a read of the two real generators):
//   - the excerpt-injection prompt scaffold (buildUserPrompt framing)
//   - the honesty-rule block skeleton (~8 rules), PARAMETERIZED by game/vocab/close
//   - generate() (forced tool-call + tool_use extraction + throw-if-none)
//   - makeNewsTool() (the headline/body/tags schema)
//   - loadEnvLocal() (the bare-node .env.local loader)
//   - the STRUCTURAL no-excerpt-no-topic guard (refuse/skip a topic with no excerpt)
//   - the TIERED citation resolver (first-party / attributed / secondary / unknown),
//     real-URL-or-null, never synthesized
//   - buildLaunchNote() (TBA-aware close -- NOT date-shaped for null-date games)
//   - runDryRunCli() (the argv-filter + loop + dry-run epilogue skeleton)
//
// WHAT THIS IS NOT (honest scope): there is NO post-generation grounding VALIDATOR
// here -- none exists in the legacy generators either. The enforcement extracted is
// a PROMPT CONTRACT + THIN CODE SCAFFOLD + STRUCTURAL GUARDS + the citation resolver.
// A verifier that checks the generated body contains only excerpt-derived facts would
// be NEW work, deliberately out of scope for this extraction.
//
// ADOPTION: DED.NET (Phase 2b) is built on this. DMZ + Wardogs are DELIBERATELY NOT
// retrofitted -- they are done (DMZ shipped, Wardogs frozen-drafted) and their output
// never re-generates to production, so retrofitting is pure risk. Retrofit legacy only
// if a future re-gen need arises, gated behind a built-prompt byte-diff + dry-run parity.
//
// STYLE: line arrays joined with '\n' (no template literals in prompts), straight
// quotes only, no em-dashes -- matching the legacy generators so built prompts stay
// diff-clean. Zero heavy deps: the Anthropic client is PASSED IN (never imported here).

import { readFileSync } from 'node:fs';

// ============================================================
// 1. ENV -- the bare-node .env.local loader (no Next env injection under node).
// ============================================================
// metaUrl = the CALLER's import.meta.url. Resolving '../.env.local' relative to the
// caller reproduces the legacy scripts' behavior exactly (scripts live in scripts/,
// so '../.env.local' is the project root). Passing the caller's own url keeps that
// resolution correct no matter where this library sits.
export function loadEnvLocal(metaUrl, keys) {
  var want = keys && keys.length ? keys : ['ANTHROPIC_API_KEY'];
  var allPresent = true;
  for (var w = 0; w < want.length; w++) { if (!process.env[want[w]]) { allPresent = false; break; } }
  if (allPresent) return;
  var raw;
  try {
    raw = readFileSync(new URL('../.env.local', metaUrl), 'utf8');
  } catch (e) {
    return;
  }
  var lines = raw.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.charAt(0) === '#') continue;
    var eq = line.indexOf('=');
    if (eq === -1) continue;
    var key = line.slice(0, eq).trim();
    var val = line.slice(eq + 1).trim();
    if (val.length >= 2 && (val.charAt(0) === '"' || val.charAt(0) === "'")) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

// ============================================================
// 2. THE NEWS TOOL -- headline / body / tags (no meta_update, no tier list).
// ============================================================
// Parameterized ONLY by the tool name + a couple of description strings; the shape
// (headline/body/tags, all required) is identical across every game.
export function makeNewsTool(opts) {
  var o = opts || {};
  var name = o.name || 'publish_news';
  var gameLabel = o.gameLabel || 'the game';
  var closeHint = o.closeHint || 'Ends with the launch note.';
  var headlineHint = o.headlineHint || ('Leads with "' + gameLabel + '" + the searchable term; 65 chars max (58 target); not all-caps; no site suffix.');
  return {
    name: name,
    description: 'Publish a single ' + gameLabel + ' pre-launch news article (headline, body, tags). Plain news shape -- no tier ratings, no meta scoring.',
    input_schema: {
      type: 'object',
      properties: {
        headline: { type: 'string', description: headlineHint },
        body: { type: 'string', description: '350-550 words. **HEADER** section breaks. Explicitly attributes facts to the named source. ' + closeHint + ' Straight quotes only.' },
        tags: { type: 'array', items: { type: 'string' }, description: '3-6 short lowercase search tags.' },
      },
      required: ['headline', 'body', 'tags'],
    },
  };
}

// ============================================================
// 3. THE HONESTY-RULE SYSTEM PROMPT -- the ~8-rule skeleton, parameterized.
// ============================================================
// The five CORE rules (announced-not-verified, no-unearned-interpretation,
// stay-inside-excerpt, attribute-explicitly, excerpt-is-the-only-universe) are the
// invariant enforcement shared by all three legacy prompts, harmonized here.
// extraRules slot in AFTER rule 5 (e.g. FLAGGED NUMBERS for Wardogs; ATTRIBUTION
// TIERS for DED.NET), then the wrong-game-vocab / reader-address / launch-note rules
// close the block. Numbering is computed at assembly time so inserted rules never
// desync the count.

function numberRules(blocks) {
  var out = [];
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var head = (i + 1) + '. ' + b.title;
    var lines = b.lines || [];
    if (lines.length) {
      out.push(head + ' ' + lines[0]);
      for (var j = 1; j < lines.length; j++) out.push('   ' + lines[j]);
    } else {
      out.push(head);
    }
  }
  return out;
}

// The fully-shared voice block (identical intent across all three legacy prompts).
function defaultVoiceBlock() {
  return [
    'VOICE -- PRE-LAUNCH NEWS MODE (this overrides your usual analyst habit):',
    '- There is no played data here, so the interpretive analyst voice is OFF. You are a',
    '  clear, sharp NEWS reporter: summarize and organize what was announced. You do not',
    '  analyze how it will play, feel, or land.',
    '- Redirect any "what this means" instinct into STRUCTURAL clarity: how the announced',
    '  systems connect, what is genuinely new, and what the source has NOT yet detailed.',
    '- Confident about the FACTS, never about GAMEPLAY IMPACT. No hype, no slogans.',
    '',
  ];
}

// The fully-shared ARTICLE FORM block, with the headline lead term parameterized.
function defaultArticleForm(headlineLeadTerm, tagExample) {
  return [
    'ARTICLE FORM:',
    '- 350-550 words. Use **HEADER TEXT** section breaks; at least 2-3 sections.',
    '- Body markdown is limited to **bold headers** and simple "- " bullet lists. No',
    '  horizontal rules, no code fences, no tables. Do NOT place a separator before the',
    '  launch/close note -- end the final paragraph, then the close note on its own line.',
    '- Straight quotes only. No backticks, no curly quotes, no emoji.',
    '- Headline: lead with "' + headlineLeadTerm + '" + the primary searchable term in the first',
    '  few words. 58 characters target, 65 hard cap; sentence or title case, never all-caps;',
    '  no site suffix. Any hook goes after a colon or dash.',
    '- Tags: 3-6 short lowercase search tags (e.g. ' + (tagExample || '"news", "pre-launch"') + ').',
  ];
}

// The five invariant core rules (shared verbatim-in-intent across DMZ + Wardogs).
function coreRuleBlocks(cfg) {
  var attributeExample = cfg.attributeExample || 'the official source';
  return [
    {
      title: 'ANNOUNCED, NOT VERIFIED.',
      lines: [
        'Never call any detail "confirmed by hands-on", "tested", or imply you have played',
        'it. The right framing is "announced", "detailed", "according to the source". You',
        'report the announcement; you do not validate it.',
      ],
    },
    {
      title: 'NO UNEARNED INTERPRETATION.',
      lines: [
        'Do NOT characterize how any mechanic will FEEL, play, reward, punish, or pressure',
        'players -- none of it has been played. State what each system IS and how it',
        'connects to the other announced systems; let the reader judge how it will play.',
        'Hedge words ("suggests", "reads like", "implies") do NOT make an interpretive claim',
        'acceptable -- cut the claim. Noting an open question honestly ("the source does not',
        'specify X yet") is reporting, and is encouraged.',
      ],
    },
    {
      title: 'STAY STRICTLY INSIDE THE EXCERPT.',
      lines: [
        '(a) ABSENCE-CLAIMS NEED SOURCE TOO -- you may note "the source does not specify X"',
        '(a statement about THIS source), but never assert a wider fact the excerpt does not',
        'establish. (b) DO NOT CLASSIFY OR DEFINE BEYOND THE EXCERPT -- if the excerpt names a',
        'term or gives only examples, use it exactly as given; do NOT add an unstated',
        'definition, list, or classification even if it is "common knowledge." The test is',
        '"is this literally in the excerpt."',
      ],
    },
    {
      title: 'ATTRIBUTE EXPLICITLY.',
      lines: [
        'At least once in the body, name the source in plain text -- e.g. "' + attributeExample + '"',
        '-- so the reader knows where these facts come from. Use the SOURCE LABEL(S) given in',
        'the user message, and follow any ATTRIBUTED marker there exactly.',
      ],
    },
    {
      title: 'THE EXCERPT IS THE ONLY UNIVERSE (the load-bearing rule).',
      lines: [
        'You may state ONLY facts LITERALLY PRESENT in the SOURCE EXCERPT for THIS topic. For',
        'this article you have NO other knowledge of the game. This is ABSOLUTE and does NOT',
        'matter whether an outside fact happens to be true:',
        '- FORBIDDEN: any fact from another topic or the wider game not in THIS excerpt.',
        '- FORBIDDEN: "well-known"/"common knowledge" facts, and ANYTHING from training memory.',
        '- The ONLY test is: do these exact words or figures appear in the excerpt above? If',
        '  not, state the gap honestly instead. Never fill a gap from outside the excerpt. Do',
        '  not invent or import numbers, names, mechanics, dates, factions, or tracks.',
      ],
    },
  ];
}

function vocabRuleBlock(cfg) {
  var lines = ['This is ' + cfg.gameLabel + ' -- a DIFFERENT game from the others on the network.'];
  var bans = cfg.bannedVocab || [];
  for (var i = 0; i < bans.length; i++) lines.push('NEVER use ' + bans[i]);
  if (cfg.ownVocab) lines.push('Use ' + cfg.gameLabel + "'s own vocabulary from the source (" + cfg.ownVocab + ').');
  return { title: 'WRONG-GAME VOCABULARY IS BANNED.', lines: lines };
}

function readerAddressBlock() {
  return {
    title: 'READER ADDRESS.',
    lines: [
      'Address the audience as "you" or "players". Do NOT label the reader with an in-world',
      'noun. Using the game\'s entity names correctly for in-world things is fine.',
    ],
  };
}

function launchNoteRuleBlock(cfg) {
  return {
    title: 'END WITH THE CLOSE NOTE.',
    lines: [
      'Close with a brief, plain note, on its own line, stating exactly this and nothing more:',
      '"' + cfg.launchNote + '"',
    ],
  };
}

// buildSystemPrompt(cfg) -> the full system-prompt string.
// Required cfg: personaLines[], introLines[], gameLabel, launchNote, headlineLeadTerm.
// Optional cfg: voiceLines[], bannedVocab[], ownVocab, attributeExample, extraRules[]
//   ({title, lines}), articleFormLines[], tagExample.
export function buildSystemPrompt(cfg) {
  if (!cfg || !cfg.personaLines || !cfg.introLines) throw new Error('buildSystemPrompt: personaLines + introLines are required');
  if (!cfg.gameLabel) throw new Error('buildSystemPrompt: gameLabel is required');
  if (!cfg.launchNote) throw new Error('buildSystemPrompt: launchNote is required (the close note -- may be a TBA variant for a null-date game)');
  if (!cfg.headlineLeadTerm) throw new Error('buildSystemPrompt: headlineLeadTerm is required');

  var ruleBlocks = coreRuleBlocks(cfg)
    .concat(cfg.extraRules || [])
    .concat([vocabRuleBlock(cfg), readerAddressBlock(), launchNoteRuleBlock(cfg)]);

  var parts = []
    .concat(cfg.personaLines, [''])
    .concat(cfg.introLines, [''])
    .concat(cfg.voiceLines || defaultVoiceBlock())
    .concat(['HONESTY RULES -- ABSOLUTE:'])
    .concat(numberRules(ruleBlocks))
    .concat([''])
    .concat(cfg.articleFormLines || defaultArticleForm(cfg.headlineLeadTerm, cfg.tagExample));

  return parts.join('\n');
}

// ============================================================
// 4. THE LAUNCH/CLOSE NOTE -- TBA-aware (NOT date-shaped when there is no date).
// ============================================================
// A null/absent date yields an honest TBA close with NO fabricated date. A real
// date yields the standard dated close. releasePhrase overrides the middle clause.
export function buildLaunchNote(opts) {
  var o = opts || {};
  var game = o.game || 'The game';
  var by = o.developer ? (' from ' + o.developer + (o.publisher ? ' and ' + o.publisher : '')) : (o.publisher ? ' from ' + o.publisher : '');
  if (o.date) {
    var phrase = o.releasePhrase || ('launches ' + o.date);
    return game + ' ' + phrase + by + '.';
  }
  // NO DATE: honest TBA close. Never emit a placeholder date, "0 days", or a countdown.
  var tbaPhrase = o.releasePhrase || 'has no announced release date yet';
  var revealed = o.revealedNote ? (' ' + o.revealedNote) : '';
  return game + ' ' + tbaPhrase + by + '.' + revealed;
}

// ============================================================
// 5. THE EXCERPT-INJECTION USER PROMPT + the no-excerpt structural guard.
// ============================================================
export function hasExcerpt(topic) {
  return !!(topic && typeof topic.source === 'string' && topic.source.trim().length > 0);
}

// Refuse: throws if a topic has no non-empty excerpt (no source => no fabrication).
export function guardExcerpt(topic) {
  if (!hasExcerpt(topic)) {
    throw new Error('no-excerpt guard: topic "' + ((topic && topic.slug) || '?') + '" has no source excerpt -- refusing to generate (no source => no fabrication).');
  }
  return topic;
}

// Skip: filters a topic list down to only the ones that carry an excerpt.
export function filterSourced(topics) {
  return (topics || []).filter(hasExcerpt);
}

// buildUserPrompt({ topicName, excerpt, citationLines?, avoidLines?, toolName, writeGuidance? })
// citationLines/avoidLines come from resolveCitations(); when absent, the SOURCE(S)
// block is omitted (single-source-inline style still works via the excerpt header).
export function buildUserPrompt(opts) {
  var o = opts || {};
  if (!o.excerpt || !String(o.excerpt).trim()) throw new Error('buildUserPrompt: excerpt is required (no source => no fabrication)');
  var toolName = o.toolName || 'publish_news';
  var lines = ['TOPIC: ' + (o.topicName || '(untitled)'), ''];
  if (o.citationLines && o.citationLines.length) {
    lines.push('SOURCE(S) -- attribute by these exact names in the body:');
    lines = lines.concat(o.citationLines, ['']);
  }
  if (o.avoidLines && o.avoidLines.length) {
    lines.push('DO NOT GROUND ON THESE (secondary / press-only -- never state as first-party fact):');
    lines = lines.concat(o.avoidLines, ['']);
  }
  lines.push('SOURCE EXCERPT -- this is the ONLY factual basis; do not state anything beyond it:');
  lines.push('');
  lines.push(o.excerpt);
  lines.push('');
  lines.push(o.writeGuidance || ('Write a single pre-launch news article on this topic, obeying every honesty rule. Call the ' + toolName + ' tool with the result.'));
  return lines.join('\n');
}

// ============================================================
// 6. THE GENERATE CALL -- forced tool-call + tool_use extraction + throw-if-none.
// ============================================================
// The Anthropic client is passed in (the caller constructs it). Returns block.input.
export async function generate(client, opts) {
  var o = opts || {};
  if (!client || !client.messages) throw new Error('generate: an Anthropic client is required');
  if (!o.model) throw new Error('generate: model is required');
  if (!o.tool || !o.tool.name) throw new Error('generate: tool (with a name) is required');
  if (!o.system) throw new Error('generate: system prompt is required');
  if (!o.userPrompt) throw new Error('generate: userPrompt is required');
  var message = await client.messages.create({
    model: o.model,
    max_tokens: o.maxTokens || 2048,
    system: o.system,
    tools: [o.tool],
    tool_choice: { type: 'tool', name: o.tool.name },
    messages: [{ role: 'user', content: o.userPrompt }],
  });
  var block = null;
  if (Array.isArray(message.content)) {
    block = message.content.find(function (b) { return b.type === 'tool_use' && b.name === o.tool.name; });
  }
  if (!block) throw new Error('no tool_use block (stop_reason: ' + message.stop_reason + ')');
  return block.input;
}

// ============================================================
// 7. THE TIERED CITATION RESOLVER -- real-URL-or-null, never synthesized.
// ============================================================
// Generalizes the two legacy citation shapes (DMZ single-source; Wardogs registry +
// honest-null) into the four tiers DED.NET needs:
//   first-party -- state plainly (Steam / official blog / press release)
//   attributed  -- surface WITH attribution ("<who> told <outlet>..."), never as
//                  anonymous first-party (dev-to-outlet interview material)
//   secondary   -- NEVER surface as first-party (press-only / unconfirmed): NOT
//                  citable; excluded from the citation set, emitted as an AVOID line
//   unknown     -- honest-null: no URL, attribute by name only, never present as
//                  settled fact; source_url is ALWAYS null
// A citation is a REAL http(s) URL or null. A non-http, relative, or invented URL
// throws at registry construction -- the library structurally cannot emit a
// synthesized/aggregator URL.
export var TIER = Object.freeze({
  FIRST_PARTY: 'first-party',
  ATTRIBUTED: 'attributed',
  SECONDARY: 'secondary',
  UNKNOWN: 'unknown',
});
var VALID_TIERS = [TIER.FIRST_PARTY, TIER.ATTRIBUTED, TIER.SECONDARY, TIER.UNKNOWN];

function isRealUrlOrNull(u) {
  return u === null || u === undefined || (typeof u === 'string' && /^https?:\/\//i.test(u));
}

// makeSourceRegistry(entries): entries = { key: { label, url?, tier, attribution?, code? } }
// Returns a frozen, validated registry. code = the short DB "source" column value
// (e.g. 'TOP QUESTIONS', 'DEEP DIVE'); falls back to label when absent.
export function makeSourceRegistry(entries) {
  var out = {};
  var keys = Object.keys(entries || {});
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    var e = entries[k] || {};
    if (!e.label || typeof e.label !== 'string') throw new Error('source "' + k + '": a string label is required');
    if (VALID_TIERS.indexOf(e.tier) === -1) throw new Error('source "' + k + '": tier must be one of ' + VALID_TIERS.join(' / ') + ' (got ' + e.tier + ')');
    var url = (e.url === undefined ? null : e.url);
    if (e.tier === TIER.UNKNOWN) url = null; // unknown is honest-null by definition
    if (!isRealUrlOrNull(url)) throw new Error('source "' + k + '": url must be a real http(s) URL or null -- never a synthesized/relative value (got ' + url + ')');
    if (e.tier === TIER.ATTRIBUTED && (!e.attribution || typeof e.attribution !== 'string')) {
      throw new Error('source "' + k + '": the attributed tier requires an attribution phrase (how to surface it in-body, e.g. "X told Y")');
    }
    var citable = (e.tier === TIER.FIRST_PARTY || e.tier === TIER.ATTRIBUTED || e.tier === TIER.UNKNOWN);
    out[k] = Object.freeze({
      key: k,
      label: e.label,
      url: url,
      tier: e.tier,
      attribution: e.attribution || null,
      code: e.code || null,
      citable: citable,
    });
  }
  return Object.freeze(out);
}

export function resolveSource(registry, key) {
  var s = registry && registry[key];
  if (!s) throw new Error('resolveSource: unknown source key "' + key + '"');
  return s;
}

function promptLineFor(s) {
  var urlPart = s.url ? (' (' + s.url + ')') : ' (real URL not yet supplied -- attribute by name only)';
  if (s.tier === TIER.FIRST_PARTY) {
    return '- ' + s.label + urlPart;
  }
  if (s.tier === TIER.ATTRIBUTED) {
    return '- ' + s.label + ' -- ATTRIBUTED: state as "' + s.attribution + '", never as anonymous first-party' + urlPart;
  }
  if (s.tier === TIER.UNKNOWN) {
    return '- ' + s.label + ' -- UNCONFIRMED (honest-null): no source URL; attribute by name only and do not present as settled fact';
  }
  return null; // secondary has no citation line
}

// resolveCitations(registry, keys) ->
//   { promptLines:[], avoidLines:[], primary:{ source, source_url }, rejectedSecondary:[], sources:[] }
// primary = the row binding for persistence. It binds to the STRONGEST available
// citation by TIER PRIORITY, not list order: first-party > attributed > unknown. So a
// topic grounded on both a direct first-party source and an attributed interview binds
// the row to the first-party url (its real url or null honest-null), never the weaker
// interview. secondary keys never become primary and never ground.
export function resolveCitations(registry, keys) {
  var ks = keys || [];
  var promptLines = [];
  var avoidLines = [];
  var rejectedSecondary = [];
  var sources = [];
  var firstOf = { 'first-party': null, attributed: null, unknown: null };

  for (var i = 0; i < ks.length; i++) {
    var s = resolveSource(registry, ks[i]);
    sources.push(s);
    if (s.tier === TIER.SECONDARY) {
      rejectedSecondary.push(s.label);
      avoidLines.push('- ' + s.label + ' (secondary / press-only) -- never state its content as first-party fact.');
      continue;
    }
    var line = promptLineFor(s);
    if (line) promptLines.push(line);
    if (!firstOf[s.tier]) firstOf[s.tier] = s;
  }

  var chosen = firstOf[TIER.FIRST_PARTY] || firstOf[TIER.ATTRIBUTED] || firstOf[TIER.UNKNOWN] || null;
  var primary = chosen
    ? { source: chosen.code || chosen.label, source_url: chosen.url || null }
    : { source: null, source_url: null };
  return {
    promptLines: promptLines,
    avoidLines: avoidLines,
    primary: primary,
    rejectedSecondary: rejectedSecondary,
    sources: sources,
  };
}

// ============================================================
// 8. THE DRY-RUN CLI SKELETON -- argv filter + loop + dry-run epilogue.
// ============================================================
// runDryRunCli(cfg): cfg = {
//   title, model, topics[], slugOf(topic)?, runOne(client, topic)->art,
//   printArticle(topic, art), makeClient()->client, requireEnv?, epilogue?()
// }
// Mirrors the legacy main(): pick a single topic by argv slug or run all; loop with
// per-topic try/catch; print; then the dry-run epilogue. Writes NOTHING.
export async function runDryRunCli(cfg) {
  var c = cfg || {};
  var topics = c.topics || [];
  var slugOf = c.slugOf || function (t) { return t.slug; };
  var only = process.argv[2] ? String(process.argv[2]).toLowerCase() : null;
  var queue = only ? topics.filter(function (t) { return String(slugOf(t)).toLowerCase() === only; }) : topics;

  if (only && queue.length === 0) {
    console.error('Unknown topic slug: ' + only + '. Known: ' + topics.map(slugOf).join(', '));
    process.exit(1);
  }

  console.log((c.title || 'Pre-launch news generator') + ' -- DRY-RUN (no DB write).');
  console.log('Model: ' + c.model + '   Topics this run: ' + queue.map(slugOf).join(', '));

  var client = c.makeClient ? c.makeClient() : null;
  for (var i = 0; i < queue.length; i++) {
    var topic = queue[i];
    try {
      var art = await c.runOne(client, topic);
      c.printArticle(topic, art);
    } catch (e) {
      console.error('[' + slugOf(topic) + '] generation failed: ' + e.message);
    }
  }

  console.log('');
  console.log('DRY-RUN complete. Nothing was written to feed_items.');
  if (c.epilogue) c.epilogue();
}
