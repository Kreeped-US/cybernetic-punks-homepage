// lib/gather/wiki.js
// Autonomous wiki data refresh — weapon_stats, shell_stats
// Self-throttles to 24h per table via wiki_meta
// NOTE: marathonthegame.fandom.com blocks server-side requests (403)
// These fetches are kept for future compatibility but fail silently

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const WIKI_URLS = {
  weapon_stats: 'https://marathonthegame.fandom.com/wiki/Weapons',
  shell_stats:  'https://marathonthegame.fandom.com/wiki/Runner_Shells',
};

const REFRESH_HOURS = 24;

async function needsRefresh(tableName) {
  try {
    const { data } = await supabase
      .from('wiki_meta').select('last_fetched')
      .eq('table_name', tableName).single();
    if (!data?.last_fetched) return true;
    const hrs = (Date.now() - new Date(data.last_fetched).getTime()) / 3600000;
    return hrs >= REFRESH_HOURS;
  } catch { return true; }
}

async function logRefresh(tableName, count) {
  await supabase.from('wiki_meta').update({
    last_fetched: new Date().toISOString(),
    records_updated: count,
    updated_at: new Date().toISOString()
  }).eq('table_name', tableName);
}

async function fetchWikiPage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CyberneticPunks-Bot/1.0 (https://cyberneticpunks.com)' }
    });
    if (!res.ok) {
      // Fandom blocks server-side requests — fail silently, no log spam
      return null;
    }
    return await res.text();
  } catch (err) {
    return null;
  }
}

function parseWikiTable(html) {
  const rows = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
  let first = true, headers = [], m;

  while ((m = rowRe.exec(html)) !== null) {
    const cells = [];
    let c;
    while ((c = cellRe.exec(m[1])) !== null) {
      cells.push(c[1].replace(/<[^>]+>/g,'').replace(/&nbsp;/g,' ').replace(/&#\d+;/g,'').trim());
    }
    if (!cells.length) continue;
    if (first) { headers = cells.map(h => h.toLowerCase()); first = false; continue; }
    if (cells.length >= 2) {
      const row = {};
      headers.forEach((h, i) => { row[h] = cells[i] || null; });
      rows.push(row);
    }
  }
  return rows;
}

function parseWeapons(html) {
  return parseWikiTable(html)
    .filter(r => r['name'] && r['name'].length > 1)
    .map(r => ({
      name:          r['name'] || r['weapon'],
      category:      r['type'] || r['category'] || null,
      ammo_type:     r['ammo'] || r['ammo type'] || null,
      damage:        parseInt(r['damage']) || null,
      fire_rate:     parseInt(r['fire rate'] || r['rpm']) || null,
      magazine_size: parseInt(r['magazine'] || r['mag']) || null,
      range_rating:  r['range'] || null,
      mod_slots:     parseInt(r['mod slots'] || r['mods']) || null,
      source_url:    WIKI_URLS.weapon_stats,
      updated_at:    new Date().toISOString()
    }));
}

function parseShells(html) {
  const knownShells = [
    'Vandal','Destroyer','Assassin','Thief','Triage','Recon','Rook'
  ];
  const shells = [];
  const headerRe = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
  const infoRe = /\|\s*([^=\|\n]+?)\s*=\s*([^\|\n]+)/g;
  let m;

  while ((m = headerRe.exec(html)) !== null) {
    const text = m[1].replace(/<[^>]+>/g,'').trim();
    const shell = knownShells.find(s => text.toLowerCase().includes(s.toLowerCase()));
    if (!shell) continue;

    const section = html.slice(m.index, Math.min(m.index + 3000, html.length));
    const info = {};
    let i;
    while ((i = infoRe.exec(section)) !== null) {
      info[i[1].trim().toLowerCase()] = i[2].trim();
    }

    shells.push({
      name:                        shell,
      active_ability_name:         info['active ability'] || info['active'] || null,
      active_ability_description:  info['active description'] || null,
      active_ability_cooldown_seconds: parseFloat(info['cooldown']) || null,
      passive_ability_name:        info['passive ability'] || info['passive'] || null,
      passive_ability_description: info['passive description'] || null,
      base_health:                 parseInt(info['health']) || null,
      base_shield:                 parseInt(info['shield']) || null,
      base_speed:                  info['speed'] || null,
      lore_tagline:                info['tagline'] || info['description'] || null,
      source_url:                  WIKI_URLS.shell_stats,
      updated_at:                  new Date().toISOString()
    });
  }

  return shells;
}

async function upsert(table, records) {
  if (!records.length) return 0;
  const { error } = await supabase.from(table)
    .upsert(records, { onConflict: 'name', ignoreDuplicates: false });
  if (error) { console.error(`[wiki.js] ${table} upsert error:`, error.message); return 0; }
  return records.length;
}

export async function refreshWikiData() {
  const results = { weapons: 0, shells: 0, skipped: [] };

  // Weapons
  if (await needsRefresh('weapon_stats')) {
    const html = await fetchWikiPage(WIKI_URLS.weapon_stats);
    if (html) {
      results.weapons = await upsert('weapon_stats', parseWeapons(html));
      await logRefresh('weapon_stats', results.weapons);
      console.log(`[wiki.js] weapon_stats: ${results.weapons} updated`);
    } else {
      await logRefresh('weapon_stats', 0);
    }
  } else {
    results.skipped.push('weapon_stats');
  }

  // Shells
  if (await needsRefresh('shell_stats')) {
    const html = await fetchWikiPage(WIKI_URLS.shell_stats);
    if (html) {
      const shells = parseShells(html);
      if (shells.length) {
        results.shells = await upsert('shell_stats', shells);
        await logRefresh('shell_stats', results.shells);
        console.log(`[wiki.js] shell_stats: ${results.shells} updated`);
      } else {
        await logRefresh('shell_stats', 0);
      }
    } else {
      await logRefresh('shell_stats', 0);
    }
  } else {
    results.skipped.push('shell_stats');
  }

  console.log('[wiki.js] Skipped (fresh):', results.skipped);
  return results;
}