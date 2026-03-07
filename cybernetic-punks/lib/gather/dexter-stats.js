// lib/gather/dexter-stats.js
// DEXTER autonomous stat extraction pipeline
// Sources: Marathon wiki, YouTube transcripts, Reddit posts, Steam reviews
// Runs each cron cycle — only fills NULL fields, always takes most recent value on conflict

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─── KNOWN SHELLS & WEAPONS ──────────────────────────────────

const SHELLS = ['Assassin', 'Destroyer', 'Recon', 'Rook', 'Thief', 'Triage', 'Vandal'];

const WEAPONS = [
  'M77 Assault Rifle', 'Overrun AR', 'Impact HAR', 'V75 Scar', 'CE Tactical',
  'Retaliator LMG', 'Conquest LMG', 'V22 Volt Thrower', 'Magnum MC',
];

// ─── WIKI / FAN SITE SOURCES ─────────────────────────────────

const WIKI_URLS = [
  'https://marathon.wiki.gg/wiki/Shells',
  'https://marathon.wiki.gg/wiki/Weapons',
  'https://marathon.wiki.gg/wiki/Marathon_Wiki',
  'https://www.mararthon.gg/shells',
  'https://www.mararthon.gg/weapons',
];

async function fetchWikiContent() {
  const results = [];
  for (const url of WIKI_URLS) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'CyberneticPunks/1.0 Marathon Intelligence Hub' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const html = await res.text();
      // Strip HTML tags, keep text content
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .slice(0, 6000);
      if (text.length > 200) {
        results.push({ source: url, content: text });
        console.log('[dexter-stats] Wiki fetched:', url, '(' + text.length + ' chars)');
      }
    } catch (err) {
      console.log('[dexter-stats] Wiki fetch failed:', url, err.message);
    }
  }
  return results;
}

// ─── CLAUDE STAT EXTRACTION ──────────────────────────────────

async function extractStatsWithClaude(sourceTexts, shells, weapons) {
  const shellList = shells.join(', ');
  const weaponList = weapons.join(', ');

  const combinedContent = sourceTexts
    .map(s => `[SOURCE: ${s.source}]\n${s.content}`)
    .join('\n\n---\n\n')
    .slice(0, 12000);

  const prompt = `You are DEXTER, a Marathon game build engineer extracting verified stats from community sources.

Extract any numerical stats you can find for the following Marathon game entities.

SHELLS TO EXTRACT: ${shellList}
WEAPONS TO EXTRACT: ${weaponList}

For each shell, extract if available:
- base_health (number, e.g. 150)
- base_shield (number, e.g. 50)
- base_speed (text: "Slow", "Medium", "Fast")
- active_ability_name (text)
- active_ability_desc (text, max 100 chars)
- passive_ability_name (text)
- passive_ability_desc (text, max 100 chars)
- strengths (text, max 150 chars)
- weaknesses (text, max 150 chars)

For each weapon, extract if available:
- damage (number, base damage per shot)
- fire_rate (number, RPM)
- magazine_size (number)
- reload_time (number, seconds)

SOURCE CONTENT:
${combinedContent}

Respond ONLY with a valid JSON object in this exact format, no preamble, no markdown:
{
  "shells": {
    "Assassin": { "base_health": null, "base_shield": null, "base_speed": null, "active_ability_name": null, "active_ability_desc": null, "passive_ability_name": null, "passive_ability_desc": null, "strengths": null, "weaknesses": null },
    "Destroyer": { "base_health": null, "base_shield": null, "base_speed": null, "active_ability_name": null, "active_ability_desc": null, "passive_ability_name": null, "passive_ability_desc": null, "strengths": null, "weaknesses": null },
    "Recon": { "base_health": null, "base_shield": null, "base_speed": null, "active_ability_name": null, "active_ability_desc": null, "passive_ability_name": null, "passive_ability_desc": null, "strengths": null, "weaknesses": null },
    "Rook": { "base_health": null, "base_shield": null, "base_speed": null, "active_ability_name": null, "active_ability_desc": null, "passive_ability_name": null, "passive_ability_desc": null, "strengths": null, "weaknesses": null },
    "Thief": { "base_health": null, "base_shield": null, "base_speed": null, "active_ability_name": null, "active_ability_desc": null, "passive_ability_name": null, "passive_ability_desc": null, "strengths": null, "weaknesses": null },
    "Triage": { "base_health": null, "base_shield": null, "base_speed": null, "active_ability_name": null, "active_ability_desc": null, "passive_ability_name": null, "passive_ability_desc": null, "strengths": null, "weaknesses": null },
    "Vandal": { "base_health": null, "base_shield": null, "base_speed": null, "active_ability_name": null, "active_ability_desc": null, "passive_ability_name": null, "passive_ability_desc": null, "strengths": null, "weaknesses": null }
  },
  "weapons": {
    "M77 Assault Rifle": { "damage": null, "fire_rate": null, "magazine_size": null, "reload_time": null },
    "Overrun AR": { "damage": null, "fire_rate": null, "magazine_size": null, "reload_time": null },
    "Impact HAR": { "damage": null, "fire_rate": null, "magazine_size": null, "reload_time": null },
    "V75 Scar": { "damage": null, "fire_rate": null, "magazine_size": null, "reload_time": null },
    "CE Tactical": { "damage": null, "fire_rate": null, "magazine_size": null, "reload_time": null },
    "Retaliator LMG": { "damage": null, "fire_rate": null, "magazine_size": null, "reload_time": null },
    "Conquest LMG": { "damage": null, "fire_rate": null, "magazine_size": null, "reload_time": null },
    "V22 Volt Thrower": { "damage": null, "fire_rate": null, "magazine_size": null, "reload_time": null },
    "Magnum MC": { "damage": null, "fire_rate": null, "magazine_size": null, "reload_time": null }
  }
}

Only populate fields where you found clear numerical or textual evidence in the sources. Leave as null if uncertain.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    const raw = data?.content?.[0]?.text || '';
    const clean = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[dexter-stats] Claude extraction failed:', err.message);
    return null;
  }
}

// ─── SUPABASE WRITERS ────────────────────────────────────────

async function updateShellStats(shellName, stats) {
  // Build update object — only include non-null extracted values
  const update = {};
  const fields = [
    'base_health', 'base_shield', 'base_speed',
    'active_ability_name', 'active_ability_desc',
    'passive_ability_name', 'passive_ability_desc',
    'strengths', 'weaknesses',
  ];

  for (const field of fields) {
    if (stats[field] !== null && stats[field] !== undefined) {
      update[field] = stats[field];
    }
  }

  if (Object.keys(update).length === 0) return false;

  update.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('shell_stats')
    .update(update)
    .eq('name', shellName);

  if (error) {
    console.error('[dexter-stats] Shell update failed:', shellName, error.message);
    return false;
  }

  console.log('[dexter-stats] Shell updated:', shellName, Object.keys(update));
  return true;
}

async function updateWeaponStats(weaponName, stats) {
  const update = {};
  const fields = ['damage', 'fire_rate', 'magazine_size', 'reload_time'];

  for (const field of fields) {
    if (stats[field] !== null && stats[field] !== undefined) {
      update[field] = stats[field];
    }
  }

  if (Object.keys(update).length === 0) return false;

  update.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('weapon_stats')
    .update(update)
    .eq('name', weaponName);

  if (error) {
    console.error('[dexter-stats] Weapon update failed:', weaponName, error.message);
    return false;
  }

  console.log('[dexter-stats] Weapon updated:', weaponName, Object.keys(update));
  return true;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────

export async function runDexterStatPipeline(existingData = {}) {
  console.log('[dexter-stats] Starting DEXTER stat extraction pipeline...');

  // 1. Fetch wiki content
  const wikiSources = await fetchWikiContent();

  // 2. Combine with existing pipeline data already gathered this cron run
  const allSources = [...wikiSources];

  if (existingData.videos && existingData.videos.length > 0) {
    const ytText = existingData.videos
      .filter(v => v.transcript || v.description)
      .map(v => ({
        source: 'YouTube: ' + (v.title || 'video'),
        content: ((v.transcript || '') + ' ' + (v.description || '')).slice(0, 1000),
      }));
    allSources.push(...ytText);
    console.log('[dexter-stats] Added', ytText.length, 'YouTube sources');
  }

  if (existingData.redditPosts && existingData.redditPosts.length > 0) {
    const redditText = existingData.redditPosts
      .filter(p => p.title || p.selftext)
      .map(p => ({
        source: 'Reddit: r/MarathonTheGame',
        content: ((p.title || '') + ' ' + (p.selftext || '')).slice(0, 800),
      }));
    allSources.push(...redditText);
    console.log('[dexter-stats] Added', redditText.length, 'Reddit sources');
  }

  if (existingData.steamReviews && existingData.steamReviews.length > 0) {
    const steamText = {
      source: 'Steam Reviews',
      content: existingData.steamReviews.map(r => r.review || r.text || '').join(' ').slice(0, 2000),
    };
    allSources.push(steamText);
    console.log('[dexter-stats] Added Steam reviews source');
  }

  if (allSources.length === 0) {
    console.log('[dexter-stats] No sources available — skipping this run');
    return { shellsUpdated: 0, weaponsUpdated: 0 };
  }

  // 3. Extract stats via Claude
  console.log('[dexter-stats] Sending', allSources.length, 'sources to Claude for extraction...');
  const extracted = await extractStatsWithClaude(allSources, SHELLS, WEAPONS);

  if (!extracted) {
    console.log('[dexter-stats] Extraction returned null — skipping DB writes');
    return { shellsUpdated: 0, weaponsUpdated: 0 };
  }

  // 4. Write to Supabase
  let shellsUpdated = 0;
  let weaponsUpdated = 0;

  if (extracted.shells) {
    for (const [name, stats] of Object.entries(extracted.shells)) {
      const updated = await updateShellStats(name, stats);
      if (updated) shellsUpdated++;
    }
  }

  if (extracted.weapons) {
    for (const [name, stats] of Object.entries(extracted.weapons)) {
      const updated = await updateWeaponStats(name, stats);
      if (updated) weaponsUpdated++;
    }
  }

  console.log('[dexter-stats] Pipeline complete —', shellsUpdated, 'shells updated,', weaponsUpdated, 'weapons updated');
  return { shellsUpdated, weaponsUpdated };
}
