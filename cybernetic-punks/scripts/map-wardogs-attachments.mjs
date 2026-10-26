// scripts/map-wardogs-attachments.mjs
// READ + MAP only (no DB writes except a read of the weapon roster). Parses the operator's
// attachment catalog (public/images/wardogs/wardogsstats.txt), infers slot_type, parses
// price/weight (honest-null "."), resolves weapon-specific compatibility against the LIVE wardogs
// roster, flags dupes + ambiguities, and emits: (1) the mapping doc, (2) the HELD load migration.
// Nothing is written to the DB. Run: node scripts/map-wardogs-attachments.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { compat } from './wardogs-attachment-compat.mjs';

const SRC = 'public/images/wardogs/wardogsstats.txt';
const MAP_OUT = 'docs/wardogs/attachment-catalog-mapping.md';
const SQL_OUT = 'docs/migrations/2026-09-15-wardogs-attachments-load.sql';
const SOURCE_LABEL = 'community-aggregated attachment catalog, in-game tested (attributed)';

// --- load roster (read-only) for weapon-token validation ---
const env = {};
for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
const roster = ((await sb.from('weapon_stats').select('name').eq('game_slug', 'wardogs')).data || []).map(r => r.name);
const rosterNorm = new Map(roster.map(n => [n.toLowerCase().replace(/[^a-z0-9]/g, ''), n]));

// --- parse ---
const raw = readFileSync(SRC, 'utf8').split(/\r?\n/);
const rows = [];
for (const line of raw) {
  if (!line.trim()) continue;
  if (line.trim() === 'Reference') continue;               // drop the stray trailer
  if (/^Name\s+Class/.test(line)) continue; // header
  // Columns are separated by RUNS OF 2+ SPACES (not tabs); names contain single spaces.
  const parts = line.split(/ {2,}/).map(s => s.trim());
  const name = parts[0];
  if (!name || name === '·') continue;
  // columns: Name, Class, Caliber, Weight, Price  (Class/Caliber are all "." in this dump)
  const weightRaw = parts[3] != null ? parts[3] : '·';
  const priceRaw = parts[4] != null ? parts[4] : '·';
  rows.push({ name, weightRaw, priceRaw });
}

const money = s => (s && s !== '·' && /\$/.test(s)) ? parseInt(s.replace(/[^0-9]/g, ''), 10) : null;
const num = s => (s && s !== '·' && /^[0-9.]+$/.test(s)) ? Number(s) : null;

// --- slot inference (ordered; first match wins) ---
function slotOf(name) {
  const n = name.toLowerCase();
  if (/\bbipod\b/.test(n)) return ['bipod', null];
  if (/dust cover/.test(n)) return ['dust_cover', null];
  if (/suppressor|muzzle brake|\bbrake\b|flash hider|compensator|\bchoke\b|\bmuzzle\b|prong/.test(n)) {
    let sub = /suppressor/.test(n) ? 'suppressor' : /flash hider|prong/.test(n) ? 'flash-hider' : /choke/.test(n) ? 'choke' : /brake/.test(n) ? 'brake' : /compensator/.test(n) ? 'compensator' : null;
    return ['muzzle', sub];
  }
  if (/scope|optic|reflex|red dot|\bsight\b|prism|lpvo|reticle|irons|\bmoa\b|\bmrad\b|thermal|pgo-7|spectr|spitfire|kobra|\bokp\b|marksman|^10x|^4x hybrid|^3-6x|^6-10x|dot\b/.test(n)) {
    let sub = /reflex|red dot|\bdot\b|kobra|okp|holographic|micro/.test(n) ? 'reflex' : /prism/.test(n) ? 'prism' : /thermal/.test(n) ? 'thermal' : /lpvo|scope|marksman|precision|10x|6x|4x|3x/.test(n) ? 'scope' : /irons/.test(n) ? 'irons' : null;
    return ['optic', sub];
  }
  if (/foregrip|grip pod|front rail grip/.test(n)) return ['foregrip', /angled/.test(n) ? 'angled' : /vertical/.test(n) ? 'vertical' : null];
  if (/pistol grip|dong grip|\bgrip\b/.test(n)) return ['grip', 'pistol'];
  if (/magazine|\bmag\b|\bdrum\b|\brnd\b|\brd\b|\d+\s?rd\b|\bshell\b|stripper clip|\bd60\b|surefire 60|saw-mag|ext mag|extended|internal mag|magpul/.test(n)) return ['magazine', /drum/.test(n) ? 'drum' : /extended|ext /.test(n) ? 'extended' : null];
  if (/barrel/.test(n)) return ['barrel', null];
  if (/handguard|forend/.test(n)) return ['handguard', null];
  if (/\bstock\b/.test(n)) return ['stock', /folding/.test(n) ? 'folding' : null];
  if (/receiver/.test(n)) return ['receiver', null];
  if (/trigger/.test(n)) return ['trigger', null];
  if (/laser/.test(n)) return ['accessory', 'laser'];
  if (/battlerail|side mount|\brail\b/.test(n)) return ['accessory', 'mount'];
  return ['other', null]; // flagged for review
}

// --- weapon-token compatibility: compat(name, roster) in ./wardogs-attachment-compat.mjs (pure, tested).
// It replaced the inline NORM map, whose 'pp-19' prefix sent every PP-19 name to the Vityaz.

// --- build mapping ---
const seen = new Map(); const dupes = [];
const mapped = rows.map(r => {
  const [slot, sub] = slotOf(r.name);
  const price = money(r.priceRaw), weight = num(r.weightRaw);
  const c = compat(r.name, roster);
  const rec = { name: r.name, slot, sub, price, weight, kind: c.kind, weapons: c.weapons, flags: [] };
  if (slot === 'other') rec.flags.push('AMBIGUOUS-SLOT');
  if (c.flag) rec.flags.push(c.flag);
  if (seen.has(r.name)) { dupes.push(r.name); rec.flags.push('DUPLICATE'); } else seen.set(r.name, true);
  return rec;
});

// --- summary ---
const priced = mapped.filter(m => m.price != null).length;
const unpriced = mapped.filter(m => m.price == null).length;
const bySlot = {}; mapped.forEach(m => bySlot[m.slot] = (bySlot[m.slot] || 0) + 1);
const distinct = new Set(mapped.map(m => m.name)).size;
console.log('rows parsed:', mapped.length, '| distinct names:', distinct, '| priced:', priced, '| unpriced(null):', unpriced);
console.log('by slot:', JSON.stringify(bySlot));
console.log('duplicates:', JSON.stringify([...new Set(dupes)]));
console.log('ambiguous-slot (other):', JSON.stringify(mapped.filter(m => m.slot === 'other').map(m => m.name)));
console.log('unmatched weapon tokens:', JSON.stringify(mapped.filter(m => m.flags.some(f => /UNMATCHED/.test(f))).map(m => m.name)));

// --- write mapping doc ---
const esc = s => String(s == null ? '' : s);
let md = '# Wardogs Attachments -- Load Mapping (for review)\n\n';
md += 'STATUS: REVIEW. Parsed from `' + SRC + '`. No DB writes. Held load migration: `' + SQL_OUT + '`.\n\n';
md += '- rows: **' + mapped.length + '** (distinct names ' + distinct + ') | priced **' + priced + '** | unpriced/honest-null **' + unpriced + '**\n';
md += '- by slot: ' + Object.entries(bySlot).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+' '+v).join(', ') + '\n';
md += '- DUPLICATES (operator resolve -- keep one or distinct variants?): ' + ([...new Set(dupes)].join('; ') || 'none') + '\n';
md += '- AMBIGUOUS SLOT (mapped `other` -- confirm): ' + (mapped.filter(m=>m.slot==='other').map(m=>m.name).join('; ') || 'none') + '\n';
md += '- UNMATCHED weapon tokens (weapon-specific but not in our 33-gun roster): ' + (mapped.filter(m=>m.flags.some(f=>/UNMATCHED/.test(f))).map(m=>m.name).join('; ') || 'none') + '\n\n';
md += 'Provenance for every row: tier=attributed, verified=false, verified_source="' + SOURCE_LABEL + '". Effect columns stay NULL (Phase 2).\n\n';
md += '| # | name | slot | subtype | price | weight | compat | compatible_weapons | flags |\n|---|---|---|---|---|---|---|---|---|\n';
mapped.forEach((m, i) => {
  md += '| ' + (i+1) + ' | ' + esc(m.name) + ' | ' + m.slot + ' | ' + esc(m.sub) + ' | ' + (m.price==null?'_null_':m.price) + ' | ' + (m.weight==null?'_null_':m.weight) + ' | ' + m.kind + ' | ' + (m.weapons?m.weapons.join(','):'') + ' | ' + m.flags.join('; ') + ' |\n';
});
writeFileSync(MAP_OUT, md);

// --- write HELD load migration (dedupe to distinct names; flag dupes in a comment) ---
const q = s => s == null ? 'NULL' : "'" + String(s).replace(/'/g, "''") + "'";
const arr = a => a == null ? 'NULL' : "ARRAY[" + a.map(x => q(x)).join(',') + "]::text[]";
let sql = '-- 2026-09-15-wardogs-attachments-load.sql\n';
sql += '-- HELD. Operator-run (rule 2) AFTER reviewing docs/wardogs/attachment-catalog-mapping.md AND after\n';
sql += '-- running the schema (2026-09-15-wardogs-attachments-schema.sql). Loads the community attachment\n';
sql += '-- catalog: ' + distinct + ' distinct rows. price/weight honest-null for the "." rows. Effect columns\n';
sql += '-- stay NULL (Phase 2). Idempotent: ON CONFLICT (game_slug, name) updates the loadable fields.\n';
sql += '-- DUPLICATES collapsed to one row each (' + ([...new Set(dupes)].join(', ') || 'none') + ') -- confirm they are not distinct variants.\n';
sql += '-- Provenance: tier=attributed, verified=false, verified_source below.\n\nBEGIN;\n\n';
const done = new Set();
for (const m of mapped) {
  if (done.has(m.name)) continue; done.add(m.name);
  const flags = m.flags.filter(f => f !== 'DUPLICATE');
  sql += 'INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source' + (flags.length ? ', notes' : '') + ')\n';
  sql += "VALUES ('wardogs', " + q(m.name) + ', ' + q(m.slot) + ', ' + q(m.sub) + ', ' + (m.price==null?'NULL':m.price) + ', ' + (m.weight==null?'NULL':m.weight) + ', ' + q(m.kind) + ', ' + arr(m.weapons) + ", 'attributed', false, " + q(SOURCE_LABEL) + (flags.length ? ', ' + q(flags.join('; ')) : '') + ')\n';
  sql += 'ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();\n\n';
}
sql += 'COMMIT;\n\n-- VERIFY: SELECT count(*) FROM wardogs_attachments;  -- expect ' + distinct + '\n';
sql += '--         SELECT slot_type, count(*) FROM wardogs_attachments GROUP BY slot_type ORDER BY 2 DESC;\n';
writeFileSync(SQL_OUT, sql);
console.log('\nwrote', MAP_OUT, '+', SQL_OUT);
