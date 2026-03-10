// lib/gather/mod-stats.js
// Scrapes mod data from Clutchbase + marathon.wiki.gg
// Only fills NULL fields — never overwrites existing data
// Mirrors the pattern of dexter-stats.js

import { supabase } from '@/lib/supabase';

const CLUTCHBASE_MODS_URL = 'https://clutchbase.app/marathon/mods';
const WIKI_MODS_URL = 'https://marathon.wiki.gg/wiki/Mods';

// Normalize slot type labels to consistent values
function normalizeSlot(raw) {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s.includes('chip')) return 'Chip';
  if (s.includes('barrel') || s.includes('muzzle') || s.includes('dampener')) return 'Barrel';
  if (s.includes('optic') || s.includes('scope') || s.includes('sight')) return 'Optic';
  if (s.includes('magazine') || s.includes('mag')) return 'Magazine';
  if (s.includes('grip')) return 'Grip';
  if (s.includes('generator')) return 'Generator';
  if (s.includes('shield')) return 'Shield';
  return raw.trim();
}

// Normalize rarity labels
function normalizeRarity(raw) {
  if (!raw) return null;
  const r = raw.trim().toLowerCase();
  if (r.includes('prestige')) return 'Prestige';
  if (r.includes('superior')) return 'Superior';
  if (r.includes('deluxe')) return 'Deluxe';
  if (r.includes('enhanced')) return 'Enhanced';
  if (r.includes('standard')) return 'Standard';
  return raw.trim();
}

// Build a URL-safe slug from a mod name + rarity
function buildSlug(name, rarity) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const r = rarity ? rarity.toLowerCase() : '';
  // Same mod name can exist at multiple rarities (e.g. Weighted Barrel Enhanced vs Superior)
  // Append rarity suffix so slugs stay unique
  return r && r !== 'standard' ? `${base}-${r}` : base;
}

// Parse mod entries from Clutchbase HTML/text response
function parseClutchbaseMods(text) {
  const mods = [];

  // Clutchbase renders mod cards with a consistent pattern:
  // ### Mod Name\nRarity\n[effect line]\n**Slot**\nCredits
  // We split on heading markers and process each block
  const blocks = text.split(/###\s+/).slice(1);

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length < 2) continue;

    const name = lines[0].replace(/[*[\]()]/g, '').trim();
    if (!name || name.length > 100) continue;

    let rarity = null;
    let slot_type = null;
    let effect_desc = null;
    let credit_value = null;

    for (const line of lines.slice(1)) {
      // Rarity line (standalone word)
      if (!rarity && /^(Standard|Enhanced|Deluxe|Superior|Prestige)$/i.test(line)) {
        rarity = normalizeRarity(line);
        continue;
      }
      // Slot type line — wrapped in ** or plain
      const slotMatch = line.match(/^\*?\*?(Chip|Barrel|Optic|Magazine|Grip|Generator|Shield|Muzzle|Dampener)\*?\*?$/i);
      if (!slot_type && slotMatch) {
        slot_type = normalizeSlot(slotMatch[1]);
        continue;
      }
      // Credits line
      const creditMatch = line.match(/(\d[\d,]+)\s*Credits?/i);
      if (!credit_value && creditMatch) {
        credit_value = parseInt(creditMatch[1].replace(/,/g, ''), 10);
        continue;
      }
      // Effect description — any substantive line that isn't a label
      if (
        !effect_desc &&
        line.length > 10 &&
        !/^https?:\/\//.test(line) &&
        !/^\d/.test(line) &&
        !/^Showing/.test(line)
      ) {
        effect_desc = line.replace(/[*]/g, '').trim();
      }
    }

    if (!name) continue;

    const slug = buildSlug(name, rarity);

    mods.push({
      name,
      slug,
      slot_type,
      rarity,
      effect_desc: effect_desc || null,
      credit_value: credit_value || null,
    });
  }

  // Dedupe by slug (keep first occurrence)
  const seen = new Set();
  return mods.filter(m => {
    if (seen.has(m.slug)) return false;
    seen.add(m.slug);
    return true;
  });
}

// Fetch and parse Clutchbase mods page
async function fetchClutchbaseMods() {
  try {
    const res = await fetch(CLUTCHBASE_MODS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CyberneticPunks/1.0)',
        'Accept': 'text/html',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error(`[mod-stats] Clutchbase returned ${res.status}`);
      return [];
    }

    const text = await res.text();
    const parsed = parseClutchbaseMods(text);
    console.log(`[mod-stats] Clutchbase parsed ${parsed.length} mods`);
    return parsed;
  } catch (err) {
    console.error('[mod-stats] Clutchbase fetch error:', err.message);
    return [];
  }
}

// Fetch and parse marathon.wiki.gg mods page (secondary source)
// Wiki pages are MediaWiki-rendered HTML — we extract from table rows
async function fetchWikiMods() {
  try {
    const res = await fetch(WIKI_MODS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CyberneticPunks/1.0)',
        'Accept': 'text/html',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      console.error(`[mod-stats] Wiki returned ${res.status}`);
      return [];
    }

    const text = await res.text();
    const mods = [];

    // Wiki tables use | delimited rows — extract mod name and description pairs
    // Pattern: td containing mod name, followed by td with effect text
    const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;

    let rowMatch;
    while ((rowMatch = rowRegex.exec(text)) !== null) {
      const row = rowMatch[1];
      const cells = [];
      let cellMatch;
      while ((cellMatch = cellRegex.exec(row)) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#\d+;/g, '')
          .trim();
        if (cellText) cells.push(cellText);
      }

      if (cells.length >= 2) {
        const name = cells[0];
        const effect_desc = cells[1];
        if (name && name.length > 2 && name.length < 80 && effect_desc && effect_desc.length > 5) {
          mods.push({ name, effect_desc, slug: buildSlug(name, null) });
        }
      }
    }

    console.log(`[mod-stats] Wiki parsed ${mods.length} mod entries`);
    return mods;
  } catch (err) {
    console.error('[mod-stats] Wiki fetch error:', err.message);
    return [];
  }
}

// Merge Clutchbase (primary) with Wiki (fills gaps)
function mergeSources(clutchMods, wikiMods) {
  const merged = [...clutchMods];
  const existingSlugs = new Set(clutchMods.map(m => m.slug));
  const existingNames = new Set(clutchMods.map(m => m.name.toLowerCase()));

  for (const wikiMod of wikiMods) {
    if (!existingNames.has(wikiMod.name.toLowerCase())) {
      merged.push(wikiMod);
      existingSlugs.add(wikiMod.slug);
      existingNames.add(wikiMod.name.toLowerCase());
    } else {
      // Wiki has effect_desc for a mod we found on Clutchbase without one
      // Mark it for backfill below
      const existing = merged.find(m => m.name.toLowerCase() === wikiMod.name.toLowerCase());
      if (existing && !existing.effect_desc && wikiMod.effect_desc) {
        existing.effect_desc = wikiMod.effect_desc;
      }
    }
  }

  return merged;
}

// Upsert mods into Supabase — only fills NULL columns, never overwrites
async function upsertMods(mods) {
  if (!mods.length) {
    console.log('[mod-stats] No mods to upsert');
    return;
  }

  // Fetch existing rows so we can respect the null-only rule
  const { data: existing, error: fetchErr } = await supabase
    .from('mod_stats')
    .select('slug, name, slot_type, rarity, effect_desc, credit_value');

  if (fetchErr) {
    console.error('[mod-stats] Failed to fetch existing mods:', fetchErr.message);
    return;
  }

  const existingMap = new Map((existing || []).map(r => [r.slug, r]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const mod of mods) {
    const exists = existingMap.get(mod.slug);

    if (!exists) {
      // New mod — insert
      const { error } = await supabase.from('mod_stats').insert({
        name: mod.name,
        slug: mod.slug,
        slot_type: mod.slot_type || null,
        rarity: mod.rarity || null,
        effect_desc: mod.effect_desc || null,
        credit_value: mod.credit_value || null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error(`[mod-stats] Insert failed for "${mod.name}":`, error.message);
      } else {
        inserted++;
      }
    } else {
      // Existing mod — only patch genuinely NULL fields
      const patch = {};
      if (!exists.slot_type && mod.slot_type) patch.slot_type = mod.slot_type;
      if (!exists.rarity && mod.rarity) patch.rarity = mod.rarity;
      if (!exists.effect_desc && mod.effect_desc) patch.effect_desc = mod.effect_desc;
      if (!exists.credit_value && mod.credit_value) patch.credit_value = mod.credit_value;

      if (Object.keys(patch).length > 0) {
        patch.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from('mod_stats')
          .update(patch)
          .eq('slug', mod.slug);

        if (error) {
          console.error(`[mod-stats] Update failed for "${mod.name}":`, error.message);
        } else {
          updated++;
        }
      } else {
        skipped++;
      }
    }
  }

  console.log(`[mod-stats] Done — inserted: ${inserted}, updated: ${updated}, skipped: ${skipped}`);
}

// Main export — called by lib/gather/index.js each cron cycle
export async function gatherModStats() {
  console.log('[mod-stats] Starting mod stats gather...');

  const [clutchMods, wikiMods] = await Promise.all([
    fetchClutchbaseMods(),
    fetchWikiMods(),
  ]);

  if (!clutchMods.length && !wikiMods.length) {
    console.log('[mod-stats] Both sources returned empty — skipping upsert');
    return;
  }

  const merged = mergeSources(clutchMods, wikiMods);
  console.log(`[mod-stats] Merged total: ${merged.length} mods`);

  await upsertMods(merged);
}
