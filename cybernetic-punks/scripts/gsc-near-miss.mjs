// scripts/gsc-near-miss.mjs
// Level 1 NEAR-MISS runner. READ-ONLY. Does the DB reads + per-game entity resolution and
// calls the pure core lib/gsc/nearMiss.js. Prints: the impressions-floor distribution, the
// top pages by score with per-page queries + the soft entity-affinity flag, and PROVES the
// cross-franchise marker filter drops the known junk. No writes, no UI.
// RUN: node scripts/gsc-near-miss.mjs
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { loadVocabulary, entitySlugFor } from '../lib/coverage.js';
import { gameSlugForUrl, slugCandidate } from '../lib/gsc/storage.js';
import { marathon } from '../lib/games/marathon.js';
import { dmz } from '../lib/games/dmz.js';
import {
  classifyNearMiss, NEAR_MISS_WINDOW_DAYS, NEAR_MISS_POSITION_LOW,
  NEAR_MISS_POSITION_HIGH, NEAR_MISS_IMPRESSION_FLOOR,
} from '../lib/gsc/nearMiss.js';

function loadEnvLocal() {
  let raw; try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  raw.split('\n').forEach((line) => {
    line = line.trim(); if (!line || line.charAt(0) === '#') return;
    const eq = line.indexOf('='); if (eq === -1) return;
    const k = line.slice(0, eq).trim(); let v = line.slice(eq + 1).trim();
    if (v.length >= 2) { const f = v[0], l = v[v.length - 1]; if ((f === '"' || f === "'") && f === l) v = v.slice(1, -1); }
    if (!process.env[k]) process.env[k] = v;
  });
}
loadEnvLocal();
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const GAMES = ['marathon', 'dmz'];
const distinctiveTokens = (name) => String(name || '').toLowerCase().split(/[^a-z0-9]+/).filter((t) => t && (t.length >= 4 || /[0-9]/.test(t)));

async function pageAll(table, sel, filter) {
  const out = []; for (let from = 0; ; from += 1000) { let q = supa.from(table).select(sel); if (filter) q = filter(q); const { data, error } = await q.range(from, from + 999); if (error) { console.error(table + ' read err: ' + error.message); break; } if (!data || !data.length) break; out.push(...data); if (data.length < 1000) break; } return out;
}

// per-game slug -> canonical entity name (coverage vocab + uniques, reversed via entitySlugFor)
async function slugNameFor(game) {
  const vocab = await loadVocabulary(supa, game);
  const map = new Map();
  const add = (type, name) => { if (!name) return; const s = entitySlugFor(type, name); if (s && !map.has(s)) map.set(s, name); };
  ['shell', 'weapon', 'mod_slot', 'map', 'mode', 'event'].forEach((t) => (vocab[t] || []).forEach((n) => add(t, n)));
  try { const uw = await supa.from('unique_weapons').select('name').eq('game_slug', game); (uw.data || []).forEach((r) => add('unique', r.name)); } catch (e) { /* uniques optional */ }
  return map;
}

const all = await pageAll('gsc_query_metrics', 'query, page_url, position, impressions, clicks, date, game_slug');
const dates = all.map((r) => r.date).filter(Boolean).sort();
const maxD = dates[dates.length - 1];
const winStart = new Date(Date.parse(maxD) - NEAR_MISS_WINDOW_DAYS * 86400000).toISOString().slice(0, 10);
const rows = all.filter((r) => r.date >= winStart);
console.log('window ' + winStart + '..' + maxD + ' (' + NEAR_MISS_WINDOW_DAYS + 'd)  rows=' + rows.length + '/' + all.length + '  band=[' + NEAR_MISS_POSITION_LOW + ',' + NEAR_MISS_POSITION_HIGH + ']');

const noindexedSlugs = new Set((await pageAll('feed_items', 'slug', (q) => q.not('noindexed_at', 'is', null))).map((r) => r.slug).filter(Boolean));

const slugNameByGame = {}; for (const g of GAMES) slugNameByGame[g] = await slugNameFor(g);
const urls = new Set(rows.map((r) => r.page_url));
const entityNameByUrl = new Map();
for (const url of urls) { const g = gameSlugForUrl(url); if (!g) continue; const s = slugCandidate(url); const m = slugNameByGame[g]; entityNameByUrl.set(url, s && m ? (m.get(s) || null) : null); }
const bigTokens = (m) => { const s = new Set(); for (const n of m.values()) distinctiveTokens(n).forEach((t) => { if (t.length >= 5) s.add(t); }); return s; };
const marBig = bigTokens(slugNameByGame.marathon || new Map()), dmzBig = bigTokens(slugNameByGame.dmz || new Map());
// SHARED GENRE STOPWORDS: both games' contextTokens + ambiguousTokens (the "ambiguous / shared"
// tiers of the identity vocab). Subtracting these keeps the entity-layer from firing on genre
// words like "extraction" that are entity-ish in one game but generic across both.
const genreStop = new Set();
[marathon.relevance, dmz.relevance].forEach((rel) => (rel.contextTokens || []).concat(rel.ambiguousTokens || []).forEach((tk) => distinctiveTokens(tk).forEach((t) => genreStop.add(t))));
const otherEntityTokensByGame = {
  marathon: new Set([...dmzBig].filter((t) => !marBig.has(t) && !genreStop.has(t))),
  dmz: new Set([...marBig].filter((t) => !dmzBig.has(t) && !genreStop.has(t))),
};

const baseOpts = { noindexedSlugs, entityNameByUrl, otherEntityTokensByGame };

// (2) impressions-floor distribution: run at floor 1 (all band + marker/entity-clean), bucket.
const wide = classifyNearMiss(rows, Object.assign({ minImpressions: 1 }, baseOpts));
const cands = wide.pages.flatMap((p) => p.queries.map((q) => ({ imp: q.impressions, page: p.page_url })));
console.log('\n=== impressions-floor survival (band-admitted, marker/entity-clean (query,page) candidates) ===');
[1, 5, 10, 15, 20].forEach((f) => { const c = cands.filter((x) => x.imp >= f); console.log('  floor>=' + String(f).padStart(2) + ' : candidates=' + String(c.length).padStart(3) + '  pages=' + new Set(c.map((x) => x.page)).size); });
console.log('  (NEAR_MISS_IMPRESSION_FLOOR proposed = ' + NEAR_MISS_IMPRESSION_FLOOR + ')');

// display at the proposed floor
const res = classifyNearMiss(rows, Object.assign({ minImpressions: NEAR_MISS_IMPRESSION_FLOOR }, baseOpts));
console.log('\n=== TOP 15 PAGES by near-miss score (floor=' + NEAR_MISS_IMPRESSION_FLOOR + ') ===  total pages=' + res.pages.length);
res.pages.slice(0, 15).forEach((p, i) => {
  console.log('\n  #' + (i + 1) + '  score=' + p.score + '  ' + p.game + '/' + p.franchise + '  avg_pos=' + (p.avg_position == null ? '-' : p.avg_position.toFixed(1)) + '  best=' + p.best_position.toFixed(1) + '  entity=' + JSON.stringify(p.entity_name) + '  matched=' + p.n_entity_matched + '/' + p.queries.length);
  console.log('     ' + p.page_url.replace('https://cyberneticpunks.com', ''));
  p.queries.forEach((q) => console.log('       ' + (q.entity_name_match ? '[E:' + q.matched_on + ']' : '[  -  ]').padEnd(18) + ' pos=' + q.position.toFixed(1).padStart(4) + ' imp=' + String(q.impressions).padStart(3) + ' clk=' + q.clicks + ' ctr=' + (100 * q.ctr).toFixed(1) + '%  "' + q.query + '"'));
});

// VERIFY: marker filter drops known cross-game junk.
console.log('\n=== MARKER-EXCLUSION PROOF (cross-franchise junk dropped, band-admitted) ===');
if (!wide.droppedByMarker.length) console.log('  (none dropped)');
wide.droppedByMarker.forEach((d) => console.log('  DROP  marker="' + d.marker + '" (' + d.franchise + ')  page-game=' + d.game + '  "' + d.query + '"  ::  ' + d.page_url.replace('https://cyberneticpunks.com', '')));
console.log('\n=== ENTITY-LAYER drops (other game entity named) ===');
if (!wide.droppedByEntity.length) console.log('  (none dropped)');
wide.droppedByEntity.forEach((d) => console.log('  DROP  entity-token="' + d.token + '"  page-game=' + d.game + '  "' + d.query + '"  ::  ' + d.page_url.replace('https://cyberneticpunks.com', '')));
process.exit(0);
