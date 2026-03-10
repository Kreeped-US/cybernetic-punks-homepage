// lib/gather/mod-stats.js
// Scrapes mod data from Clutchbase (primary source)
// Only fills NULL fields — never overwrites existing data

import { supabase } from '@/lib/supabase';

const CLUTCHBASE_MODS_URL = 'https://clutchbase.app/marathon/mods';

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

function buildSlug(name, rarity) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const r = rarity ? rarity.toLowerCase() : '';
  return r && r !== 'standard' ? `${base}-${r}` : base;
}

function parseClutchbaseMods(text) {
  const mods = [];
  const blocks = text.split(/###\s+/).slice(1);
  console.log(`[mod-stats] Clutchbase raw blocks found: ${blocks.length}`);

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
      if (!rarity && /^(Standard|Enhanced|Deluxe|Superior|Prestige)$/i.test(line)) {
        rarity = normalizeRarity(line);
        continue;
      }
      const slotMatch = line.match(/^\*?\*?(Chip|Barrel|Optic|Magazine|Grip|Generator|Shield|Muzzle|Dampener)\*?\*?$/i);
      if (!slot_type && slotMatch) {
        slot_type = normalizeSlot(slotMatch[1]);
        continue;
      }
      const creditMatch = line.match(/(\d[\d,]+)\s*Credits?/i);
      if (!credit_value && creditMatch) {
        credit_value = parseInt(creditMatch[1].replace(/,/g, ''), 10);
        continue;
      }
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
    mods.push({ name, slug, slot_type, rarity, effect_desc: effect_desc || null, credit_value: credit_value || null });
  }

  const seen = new Set();
  return mods.filter(m => {
    if (seen.has(m.slug)) return false;
    seen.add(m.slug);
    return true;
  });
}

async function fetchClutchbaseMods() {
  try {
    console.log('[mod-stats] Fetching Clutchbase...');

    const res = await fetch(CLUTCHBASE_MODS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      next: { revalidate: 0 },
    });

    console.log(`[mod-stats] Clutchbase status: ${res.status}`);

    if (!res.ok) {
      console.error(`[mod-stats] Clutchbase returned ${res.status} — skipping`);
      return [];
    }

    const text = await res.text();
    console.log(`[mod-stats] Clutchbase response length: ${text.length} chars`);

    const parsed = parseClutchbaseMods(text);
    console.log(`[mod-stats] Clutchbase parsed ${parsed.length} mods`);
    return parsed;
  } catch (err) {
    console.error('[mod-stats] Clutchbase fetch error:', err.message);
    return [];
  }
}

async function upsertMods(mods) {
  if (!mods.length) {
    console.log('[mod-stats] No mods to upsert');
    return;
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('mod_stats')
    .select('slug, name, slot_type, rarity, effect_desc, effect_summary, credit_value');

  if (fetchErr) {
    console.error('[mod-stats] Failed to fetch existing mods:', fetchErr.message);
    return;
  }

  const existingMap = new Map((existing || []).map(r => [r.slug, r]));
  const existingNames = new Map((existing || []).map(r => [r.name?.toLowerCase(), r]));

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const mod of mods) {
    const exists = existingMap.get(mod.slug) || existingNames.get(mod.name?.toLowerCase());

    if (!exists) {
      const { error } = await supabase.from('mod_stats').insert({
        name: mod.name,
        slug: mod.slug,
        slot_type: mod.slot_type || null,
        rarity: mod.rarity || null,
        effect_desc: mod.effect_desc || null,
        effect_summary: mod.effect_desc || null,
        credit_value: mod.credit_value || null,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error(`[mod-stats] Insert failed for "${mod.name}":`, error.message);
      } else {
        inserted++;
      }
    } else {
      const patch = {};
      if (!exists.slot_type && mod.slot_type) patch.slot_type = mod.slot_type;
      if (!exists.rarity && mod.rarity) patch.rarity = mod.rarity;
      if (!exists.effect_desc && mod.effect_desc) patch.effect_desc = mod.effect_desc;
      if (!exists.effect_summary && mod.effect_desc) patch.effect_summary = mod.effect_desc;
      if (!exists.credit_value && mod.credit_value) patch.credit_value = mod.credit_value;

      if (Object.keys(patch).length > 0) {
        patch.updated_at = new Date().toISOString();
        const { error } = await supabase
          .from('mod_stats')
          .update(patch)
          .eq('name', exists.name);

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

export async function gatherModStats() {
  console.log('[mod-stats] Starting mod stats gather...');

  const mods = await fetchClutchbaseMods();

  if (!mods.length) {
    console.log('[mod-stats] Clutchbase returned empty — skipping upsert');
    return;
  }

  await upsertMods(mods);
}
