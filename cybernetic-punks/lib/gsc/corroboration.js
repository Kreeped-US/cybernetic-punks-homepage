// lib/gsc/corroboration.js
// GAME-DB CORROBORATION BATCH -- the pure classifier. Zero I/O, fully unit-testable (same house
// pattern as lib/gsc/nearMiss.js and cannibalization.js: the runner does the DB reads and calls
// this; nothing here touches a database or writes anything).
//
// WHAT IT DOES. Scans article bodies for CHECKABLE CLAIMS and compares each to the verified entity
// STORE (unique_weapons / shell_stats / weapon_stats). A checkable claim is a TRIPLE -- a known
// entity (closed vocab, exact match) x a known store FIELD (the store's columns are the ONLY
// attributes a claim can be about) x a parseable value, with syntactic attachment in one sentence.
// No store-schema triple = a mention, IGNORED. The store schema IS the grammar, so extraction
// cannot invent a claim category the store lacks words for.
//
// PRECISION OVER RECALL. A missed claim is silence; an invented claim is a false contradiction that
// erodes trust. Every finding QUOTES its verbatim source sentence so the reviewer audits extraction
// and claim in one glance. Ambiguous binding (>=2 applicable entities in a sentence) -> skip.
//
// CIRCULARITY GUARD (structural). Articles NEVER corroborate articles -- the STORE is the sole
// comparator. There is simply no article-vs-article operation here. Repetition (N articles, same
// claim) measures EXPOSURE / blast radius, NEVER credibility.
//
// TWO CLASSES.
//   CONTRADICTED   store has V, article says W. Store senior by DEFAULT -> fix-the-article. EXCEPT
//                  verification-decay: if the article POSTDATES the store value's patch verification
//                  (per a supplied PATCH_DATES calendar), seniority FLIPS -> re-verify-the-store.
//                  When freshness cannot be resolved (no calendar entry), seniority is INDETERMINATE
//                  -- we surface BOTH dates and default to re-verify-store candidacy, NEVER silently
//                  assume the store is fresher.
//   UNCORROBORATED store field is null; article asserts a value -> verification task (fills the
//                  store -> flips to corroborated next run).
//
// HARD RULE. The store is NEVER auto-filled from articles. This batch never writes the store, ever.
//
// DERIVE-DON'T-STORE. Findings derive, so a store fix flips its dependents on the next run (same
// property as the flags). A CORROBORATED result is NOT a finding -- it is emitted separately as the
// dated "corroborated-against-store" provenance stamp (this batch is also the honest-backfill
// instrument from the verified_source design, doing both jobs).

import { containsWholeWord } from './franchiseMarkers.js';

// The patch-calendar facts established so far (1.1.0 + Season 2 both launched 2026-06-02; Update
// 1.1.5 = 2026-07-21, marathon.js:242). The map extends as more patch/season dates are established;
// the seniority flip lights up incrementally. Store patch_verified values not in the map ->
// seniority indeterminate.
export const PATCH_DATES = { '1.1.0': '2026-06-02', 'S2': '2026-06-02', '1.1.5': '2026-07-21' };

// The CLOSED disposition set. The human picks; the batch only SUGGESTS one of these (never 'dismiss'
// -- dismissal is a human judgement, not a machine suggestion).
export const DISPOSITIONS = ['fix-article', 're-verify-store', 'create-verification-task', 'dismiss'];

// ── acquisition method categories (mutually exclusive) ───────────────────────────────────────────
// Acquisition is compared by METHOD BUCKET, not free text: only fires when BOTH the store value and
// the article sentence land in a KNOWN, differing bucket (else uncomparable -> skip). Precision-first.
function acqCategory(text) {
  const t = ' ' + String(text || '').toLowerCase() + ' ';
  if (/\barmor?y\b|\bpurchase\b|\bbuy\b|\bbought\b|\bcredits?\b|\bcurrency\b/.test(t)) return 'armory-purchase';
  if (/\bshowcase\b/.test(t)) return 'showcase';
  if (/\bfaction (leveling|rank|reputation|unlock)\b|\bfaction rep\b/.test(t)) return 'faction-unlock';
  if (/\bcraft(ed|ing)?\b/.test(t)) return 'crafting';
  if (/\bdrops? from\b|\bworld drop\b|\bfound (at|in)\b|\bencounter\b|\bloot pool\b/.test(t)) return 'world-drop';
  return null;
}

// locked_mods normalization -> a sorted, de-duped, pipe-joined set of BARE mod-name tokens.
// Reduces the two stored shapes (a prose value "Locked loadout (4): A, B (Enhanced), C. Mods
// permanently locked." AND an article's bare list "A, B, and C") to the same token set by stripping
// the "Locked loadout (N):" prefix, the "... permanently locked" suffix, and parenthetical tier
// annotations ("(Superior chip)", "(Enhanced)"). locked_mods-ONLY -- grep-confirmed nothing else
// calls this, so acquisition and the numeric fields are untouched. Applied to BOTH sides; a no-op
// on the article's bare list (idempotent).
function normModList(s) {
  return String(s || '')
    .replace(/locked loadout\s*\([^)]*\)\s*:?/i, '')   // "Locked loadout (4):" prefix
    .replace(/locked loadout\s*:?/i, '')               // "Locked loadout:" prefix (no count)
    .replace(/mods?\s+permanently\s+locked/i, '')      // "... Mods permanently locked" suffix
    .replace(/\([^)]*\)/g, ' ')                        // parenthetical tier annotations
    .toLowerCase()
    .split(/,|\band\b/)
    .map((x) => x.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)           // de-dupe
    .sort()
    .join(' | ');
}

// ── field extractors (the claim grammar, one per checkable store field) ───────────────────────────
// Each: field id, the entity types it applies to, a trigger test (does the sentence make THIS kind
// of claim), extract(sentence)->{value,display}|null, storeValue(fields)->{value,display}, and
// compare(claimed,store)->'match'|'contradict'|'uncomparable'. Kept deliberately few and precise.
function numericField(field, entityTypes, re, storeCol) {
  return {
    field, entityTypes, triggers: re,
    extract(sentence) { const m = sentence.match(re); if (!m) return null; const n = parseInt(m[1], 10); return isNaN(n) ? null : { value: n, display: m[0].trim() }; },
    storeValue(f) { const v = f[storeCol]; return { value: (v == null || v === '') ? null : Number(v), display: (v == null || v === '') ? null : String(v) }; },
    compare(a, b) { if (a == null || b == null) return 'uncomparable'; return a === b ? 'match' : 'contradict'; },
  };
}

const EXTRACTORS = [
  // ACQUISITION (unique_weapons.acquisition_source [+ _detail for display]).
  {
    field: 'acquisition', entityTypes: ['unique'],
    triggers: /\b(unlock|unlocked|acquire|acquired|obtain|available|purchase|buy|bought|drops?|dropped|found|earn|earned|craft)\b/i,
    extract(sentence) { const c = acqCategory(sentence); return c ? { value: c, display: sentence } : null; },
    storeValue(f) {
      const src = f.acquisition_source;
      if (!src) return { value: null, display: null };
      const display = src + (f.acquisition_detail ? ' / ' + f.acquisition_detail : '');
      return { value: acqCategory(src + ' ' + (f.acquisition_detail || '')), display };
    },
    compare(a, b) { if (a == null || b == null) return 'uncomparable'; return a === b ? 'match' : 'contradict'; },
  },
  // LOCKED MODS (unique_weapons.locked_mods) -- list structure required (>=2 named items).
  {
    field: 'locked_mods', entityTypes: ['unique'],
    triggers: /\b(locked mods?|pre-?equipped|comes with|modifications?|mods?)\b/i,
    extract(sentence) {
      const m = sentence.match(/(?:modifications?|mods?|chips?)\s*:?\s*([A-Z][^.]+)/);
      if (!m) return null;
      const items = m[1].split(/,|\band\b/).map((x) => x.trim()).filter(Boolean);
      if (items.length < 2) return null;              // a real list, not a single passing mention
      return { value: normModList(m[1]), display: m[1].trim() };
    },
    storeValue(f) { const v = f.locked_mods; const t = v == null || v === '' ? '' : normModList(v); return { value: t || null, display: v || null }; },
    // CONTAINMENT, not exact-equality: the article's cited mods must all be present in the store's
    // set (article-subset-of-store). An article naming a subset of the locked mods still corroborates;
    // an article naming a mod the store lacks contradicts.
    compare(a, b) {
      if (a == null || b == null || a === '' || b === '') return 'uncomparable';
      const store = new Set(String(b).split(' | '));
      return String(a).split(' | ').every((x) => store.has(x)) ? 'match' : 'contradict';
    },
  },
  // Numeric weapon facts (weapon_stats). High-precision patterns; the entity must be named in the sentence.
  numericField('damage', ['weapon'], /(\d+)\s+damage\b/i, 'damage'),
  numericField('fire_rate', ['weapon'], /(\d+)\s*(?:rpm|rounds per minute)\b/i, 'fire_rate'),
  numericField('magazine_size', ['weapon'], /(\d+)[- ]round (?:magazine|mag)\b/i, 'magazine_size'),
  // Numeric shell fact (shell_stats).
  numericField('base_health', ['shell'], /(\d+)\s+(?:base )?health\b/i, 'base_health'),
];

// Split a body into candidate sentences. Bold markers dropped; split on paragraph breaks and
// sentence terminators. Precision does not depend on perfect segmentation -- a claim needs entity +
// trigger + value co-present in one chunk, so over-splitting only loses recall, never adds a claim.
function sentencesOf(body) {
  if (!body) return [];
  return String(body).replace(/\*\*/g, ' ')
    .split(/\n+|(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

// The store value is "current as of" the LATER of two dates: when we last verified/touched the row
// (updated_at, maintained by the entity-table BEFORE-UPDATE trigger) and the patch it was verified
// against (patch_verified -> PATCH_DATES). We take the MAX, not "prefer updated_at", because both
// signals are lossy alone: a stale import-date updated_at can predate the patch (e.g. a 1.1.5-tagged
// row last physically edited 2026-06-02 would wrongly read older than a July article), and a
// patch-only view misses a fresh in-game re-verification (the Surprise-3 case: a row verified today
// but tagged to an old patch wrongly read article-fresher). MAX(updated_at, patch) is right in both.
function resolveSeniority(articleCreatedAt, storeUpdatedAt, storePatch, patchDates) {
  const updDate = storeUpdatedAt ? String(storeUpdatedAt).slice(0, 10) : null;
  const patchDate = storePatch ? (patchDates[storePatch] || null) : null;
  let storeDate = null, basis = null;
  if (updDate && patchDate) { const upWins = updDate >= patchDate; storeDate = upWins ? updDate : patchDate; basis = upWins ? 'updated_at' : 'patch'; }
  else if (updDate) { storeDate = updDate; basis = 'updated_at'; }
  else if (patchDate) { storeDate = patchDate; basis = 'patch'; }
  const artDate = articleCreatedAt ? String(articleCreatedAt).slice(0, 10) : null;
  if (!storeDate || !artDate) return { seniority: 'indeterminate', storeDate, basis };
  return { seniority: artDate > storeDate ? 'article-fresher' : 'store-fresher', storeDate, basis };
}

// articles: [{ slug, editor, created_at, body }]  (already game-filtered by the caller)
// store:    { entities: [{ type, name, aliases?, fields, verified, verified_source, patch_verified }] }
// opts:     { patchDates, runDate }
// returns { findings, corroborations, skippedAmbiguous }
export function classifyCorroboration(articles, store, opts) {
  const o = opts || {};
  const patchDates = o.patchDates || PATCH_DATES;
  const runDate = o.runDate || null;
  const entities = (store && store.entities) || [];

  // terms per entity (canonical name + curated aliases), for whole-word presence tests.
  const withTerms = entities.map((e) => ({ e, terms: [e.name].concat(e.aliases || []).filter(Boolean) }));

  const rawClaims = [];               // one per (article, sentence, entity, field) bind
  const corroborations = [];          // matches -> provenance stamps (not findings)
  const skippedAmbiguous = [];

  for (let ai = 0; ai < articles.length; ai++) {
    const art = articles[ai];
    const sents = sentencesOf(art.body);
    for (let si = 0; si < sents.length; si++) {
      const sentence = sents[si];
      // entities present in this sentence (whole-word on any term)
      const present = withTerms.filter((wt) => wt.terms.some((t) => containsWholeWord(t, sentence))).map((wt) => wt.e);
      if (present.length === 0) continue;

      for (let xi = 0; xi < EXTRACTORS.length; xi++) {
        const ext = EXTRACTORS[xi];
        const applicable = present.filter((e) => ext.entityTypes.indexOf(e.type) !== -1);
        if (applicable.length === 0) continue;
        if (!ext.triggers.test(sentence)) continue;
        const claimed = ext.extract(sentence);
        if (!claimed) continue;
        if (applicable.length > 1) {                 // AMBIGUOUS binding -> skip (record it)
          skippedAmbiguous.push({ slug: art.slug, field: ext.field, entities: applicable.map((e) => e.name), sentence });
          continue;
        }
        const entity = applicable[0];
        const sv = ext.storeValue(entity.fields || {});
        rawClaims.push({ art, entity, ext, field: ext.field, claimedValue: claimed.value, claimedDisplay: claimed.display, sentence, storeValue: sv });
      }
    }
  }

  // classify + group by (entity, field, claimedValue)
  const groups = new Map();
  for (let i = 0; i < rawClaims.length; i++) {
    const c = rawClaims[i];
    let cls;
    if (c.storeValue.value == null || c.storeValue.value === '') {
      cls = 'UNCORROBORATED';
    } else {
      const cmp = c.ext.compare(c.claimedValue, c.storeValue.value);
      if (cmp === 'match') {                          // corroboration -> provenance stamp, NOT a finding
        corroborations.push({ slug: c.art.slug, entity: c.entity.name, field: c.field, value: c.claimedValue, as_of: runDate });
        continue;
      }
      if (cmp === 'uncomparable') continue;           // precision: cannot verify -> silence
      cls = 'CONTRADICTED';
    }

    const key = c.entity.name + ' ' + c.field + ' ' + cls + ' ' + String(c.claimedValue);
    let g = groups.get(key);
    if (!g) {
      g = {
        entity: c.entity.name, entity_type: c.entity.type, field: c.field,
        claimed_value: c.claimedValue, class: cls,
        store_display: c.storeValue.display,
        store_verified: c.entity.verified === true,
        store_verified_source: c.entity.verified_source || null,
        store_patch: c.entity.patch_verified || null,
        store_updated_at: (c.entity.fields && c.entity.fields.updated_at) ? String(c.entity.fields.updated_at).slice(0, 10) : null,
        _entity: c.entity, affected: [], _seen: new Set(),
      };
      groups.set(key, g);
    }
    // per-article seniority (only meaningful for CONTRADICTED)
    let seniority = null, storeDate = null;
    if (cls === 'CONTRADICTED') { const r = resolveSeniority(c.art.created_at, g.store_updated_at, g.store_patch, patchDates); seniority = r.seniority; storeDate = r.storeDate; g._storeDate = storeDate; g._basis = r.basis; }
    const dedupKey = c.art.slug + ' ' + c.sentence;
    if (!g._seen.has(dedupKey)) {
      g._seen.add(dedupKey);
      g.affected.push({ slug: c.art.slug, editor: c.art.editor, created_at: c.art.created_at ? String(c.art.created_at).slice(0, 10) : null, seniority, verbatim: c.sentence });
    }
  }

  // finalize findings: finding-level seniority + suggested disposition + provenance-strength note
  const findings = [];
  for (const g of groups.values()) {
    let seniority = null, disposition;
    if (g.class === 'UNCORROBORATED') {
      disposition = 'create-verification-task';
    } else {
      const senSet = new Set(g.affected.map((a) => a.seniority));
      if (!g._storeDate) seniority = 'indeterminate';
      else if (senSet.size === 1) seniority = [...senSet][0];
      else seniority = 'mixed';
      // disposition: only assert fix-article when we can show the store is fresher than EVERY article.
      if (seniority === 'store-fresher') disposition = 'fix-article';
      else disposition = 're-verify-store';           // article-fresher / mixed / indeterminate -> store may be stale
    }
    const evidence_note = g.store_verified ? null
      : 'store row is UNVERIFIED (verified=false' + (g.store_verified_source ? ', source "' + g.store_verified_source + '"' : '') + ') -- weaker evidence; weight accordingly';
    findings.push({
      entity: g.entity, entity_type: g.entity_type, field: g.field,
      class: g.class, claimed_value: g.claimed_value,
      store_display: g.store_display,
      store_verified: g.store_verified, store_verified_source: g.store_verified_source,
      store_patch: g.store_patch, store_patch_date: g.store_patch ? (patchDates[g.store_patch] || null) : null,
      store_updated_at: g.store_updated_at || null,
      store_recency_date: g._storeDate || null, seniority_basis: g._basis || null,
      seniority, suggested_disposition: disposition,
      evidence_note,
      affected: g.affected,
      n_affected: g.affected.length,
    });
  }

  // order: CONTRADICTED before UNCORROBORATED, then by blast radius (n_affected desc)
  const clsRank = { CONTRADICTED: 0, UNCORROBORATED: 1 };
  findings.sort((a, b) => (clsRank[a.class] - clsRank[b.class]) || (b.n_affected - a.n_affected));

  return { findings, corroborations, skippedAmbiguous };
}
