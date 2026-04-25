// lib/gather/dexter-stats.js
// DEXTER autonomous stat extraction pipeline
// Sources: Marathon wiki + community sites + YouTube transcripts + Reddit posts + Steam reviews
//
// Updated April 27, 2026:
// - Throttled to once per 24h via dexter_stats_meta table (was: every 6h cycle).
//   Stats change with patches (~monthly), not every 6 hours. Saves ~$5-10/mo.
// - Converted to tool-use structured output. No more JSON.parse failures.
// - Item lists now pulled FROM the database dynamically. Whatever's in
//   weapon_stats, core_stats, implant_stats becomes the extraction list.
//   Old hardcoded lists were tiny slices (9/30 weapons, 8/68 cores, 6/82 implants).
// - Only extracts data for items with NULL fields — no token waste re-extracting
//   data we already have.
// - Uses Anthropic SDK directly (consistent with editorCore.js).

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const STATS_MODEL = 'claude-sonnet-4-20250514';
const REFRESH_HOURS = 24;
const PIPELINE_KEY = 'dexter_stats_extraction';

// ─── THROTTLE CHECK ──────────────────────────────────────────
// Uses the existing wiki_meta table by inserting a row keyed to this
// pipeline. Same throttle pattern as wiki.js — 24h between runs.

async function needsRefresh() {
  try {
    const { data } = await supabase
      .from('wiki_meta')
      .select('last_fetched')
      .eq('table_name', PIPELINE_KEY)
      .single();
    if (!data?.last_fetched) return true;
    const hrs = (Date.now() - new Date(data.last_fetched).getTime()) / 3600000;
    return hrs >= REFRESH_HOURS;
  } catch {
    return true; // No row yet → needs first run
  }
}

async function logRefresh(updatedCount) {
  try {
    // Try update first
    const { data, error } = await supabase
      .from('wiki_meta')
      .update({
        last_fetched: new Date().toISOString(),
        records_updated: updatedCount,
        updated_at: new Date().toISOString(),
      })
      .eq('table_name', PIPELINE_KEY)
      .select();

    // If no row matched, insert
    if (!error && (!data || data.length === 0)) {
      await supabase.from('wiki_meta').insert({
        table_name: PIPELINE_KEY,
        last_fetched: new Date().toISOString(),
        records_updated: updatedCount,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('[dexter-stats] logRefresh failed:', err.message);
  }
}

// ─── WIKI / FAN SITE SOURCES ─────────────────────────────────
// Trimmed list — only URLs that have historically returned content.
// Each fetch has an 8s timeout to avoid hanging the whole pipeline.

const WIKI_URLS = [
  'https://marathon.wiki.gg/wiki/Shells',
  'https://marathon.wiki.gg/wiki/Weapons',
  'https://www.marathon.gg/shells',
  'https://www.marathon.gg/weapons',
];

async function fetchWikiContent() {
  const results = [];
  for (const url of WIKI_URLS) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'CyberneticPunks/1.0 Marathon Intelligence Hub' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        console.log('[dexter-stats] Wiki fetch ' + res.status + ': ' + url);
        continue;
      }
      const html = await res.text();
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .slice(0, 6000);
      if (text.length > 200) {
        results.push({ source: url, content: text });
        console.log('[dexter-stats] Wiki fetched: ' + url + ' (' + text.length + ' chars)');
      }
    } catch (err) {
      console.log('[dexter-stats] Wiki fetch failed: ' + url + ' — ' + err.message);
    }
  }
  return results;
}

// ─── DB-DRIVEN ITEM LISTS ────────────────────────────────────
// Pull current item rosters from Supabase. Identify which rows have NULL
// in the fields we want to fill. Only those become extraction targets.

async function fetchExtractionTargets() {
  const targets = { shells: [], weapons: [], cores: [], implants: [] };

  try {
    // Shells — find rows missing any of the key fields
    const { data: shells } = await supabase
      .from('shell_stats')
      .select('name, base_health, base_shield, base_speed, active_ability_name, passive_ability_name, strengths, weaknesses');
    targets.shells = (shells || [])
      .filter(s => !s.base_health || !s.active_ability_name || !s.passive_ability_name || !s.strengths || !s.weaknesses)
      .map(s => s.name);

    // Weapons
    const { data: weapons } = await supabase
      .from('weapon_stats')
      .select('name, damage, fire_rate, magazine_size, reload_time');
    targets.weapons = (weapons || [])
      .filter(w => !w.damage || !w.fire_rate || !w.magazine_size)
      .map(w => w.name);

    // Cores
    const { data: cores } = await supabase
      .from('core_stats')
      .select('name, effect_desc, ability_type, meta_rating');
    targets.cores = (cores || [])
      .filter(c => !c.effect_desc || !c.meta_rating)
      .map(c => c.name);

    // Implants
    const { data: implants } = await supabase
      .from('implant_stats')
      .select('name, description, passive_name, stat_1_label');
    targets.implants = (implants || [])
      .filter(imp => !imp.description || !imp.passive_name || !imp.stat_1_label)
      .map(imp => imp.name);

    console.log('[dexter-stats] Extraction targets: ' + targets.shells.length + ' shells, ' + targets.weapons.length + ' weapons, ' + targets.cores.length + ' cores, ' + targets.implants.length + ' implants');
  } catch (err) {
    console.error('[dexter-stats] Target fetch failed:', err.message);
  }

  return targets;
}

// ─── EXTRACTION TOOL SCHEMA ──────────────────────────────────
// Tool-use enforces the output structure. No more JSON.parse failures.
// Each section is optional — Claude only fills what it found evidence for.

const EXTRACT_TOOL = {
  name: 'submit_extracted_stats',
  description: 'Submit verified Marathon stats extracted from source material. Only include items where you found clear evidence. Omit any item or field where you are uncertain.',
  input_schema: {
    type: 'object',
    properties: {
      shells: {
        type: 'array',
        description: 'Shell stat extractions. One entry per shell where data was found.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Exact shell name from the targets list' },
            base_health: { type: ['number', 'null'] },
            base_shield: { type: ['number', 'null'] },
            base_speed: { type: ['string', 'null'], description: 'Slow / Medium / Fast' },
            active_ability_name: { type: ['string', 'null'] },
            active_ability_desc: { type: ['string', 'null'], description: 'Max 100 chars' },
            passive_ability_name: { type: ['string', 'null'] },
            passive_ability_desc: { type: ['string', 'null'], description: 'Max 100 chars' },
            strengths: { type: ['string', 'null'], description: 'Max 150 chars' },
            weaknesses: { type: ['string', 'null'], description: 'Max 150 chars' },
          },
          required: ['name'],
        },
      },
      weapons: {
        type: 'array',
        description: 'Weapon stat extractions. One entry per weapon where data was found.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Exact weapon name from the targets list' },
            damage: { type: ['number', 'null'] },
            fire_rate: { type: ['number', 'null'], description: 'Rounds per minute' },
            magazine_size: { type: ['number', 'null'] },
            reload_time: { type: ['number', 'null'], description: 'Seconds' },
          },
          required: ['name'],
        },
      },
      cores: {
        type: 'array',
        description: 'Core stat extractions. One entry per core where data was found.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Exact core name from the targets list' },
            effect_desc: { type: ['string', 'null'], description: 'What the core does, max 150 chars' },
            ability_type: { type: ['string', 'null'], description: 'Prime / Tactical / Passive / Grapple / etc' },
            is_shell_exclusive: { type: ['boolean', 'null'] },
            meta_rating: {
              type: ['string', 'null'],
              enum: ['S', 'A', 'B', 'C', 'D', null],
              description: 'Ranked viability tier',
            },
          },
          required: ['name'],
        },
      },
      implants: {
        type: 'array',
        description: 'Implant stat extractions. One entry per implant where data was found.',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Exact implant name from the targets list' },
            description: { type: ['string', 'null'], description: 'Max 150 chars' },
            stat_1_label: { type: ['string', 'null'] },
            stat_1_value: { type: ['string', 'null'] },
            stat_2_label: { type: ['string', 'null'] },
            stat_2_value: { type: ['string', 'null'] },
            stat_3_label: { type: ['string', 'null'] },
            stat_3_value: { type: ['string', 'null'] },
            stat_4_label: { type: ['string', 'null'] },
            stat_4_value: { type: ['string', 'null'] },
            passive_name: { type: ['string', 'null'] },
            passive_desc: { type: ['string', 'null'], description: 'Max 150 chars' },
          },
          required: ['name'],
        },
      },
    },
    required: [],
  },
};

// ─── CLAUDE STAT EXTRACTION ──────────────────────────────────

async function extractStats(sourceTexts, targets) {
  // Cap at top items per category to keep prompt manageable
  const shellList   = targets.shells.slice(0, 10).join(', ') || '(none missing)';
  const weaponList  = targets.weapons.slice(0, 30).join(', ') || '(none missing)';
  const coreList    = targets.cores.slice(0, 30).join(', ') || '(none missing)';
  const implantList = targets.implants.slice(0, 30).join(', ') || '(none missing)';

  // Skip extraction entirely if everything is filled
  if (
    targets.shells.length === 0 &&
    targets.weapons.length === 0 &&
    targets.cores.length === 0 &&
    targets.implants.length === 0
  ) {
    console.log('[dexter-stats] No missing fields anywhere — skipping extraction');
    return null;
  }

  const combinedContent = sourceTexts
    .map(s => `[SOURCE: ${s.source}]\n${s.content}`)
    .join('\n\n---\n\n')
    .slice(0, 12000);

  const systemPrompt = `You are DEXTER, the Marathon build engineer. You extract verified numerical stats and ability descriptions from community sources (wiki pages, YouTube transcripts, Reddit posts, Steam reviews).

EXTRACTION RULES:
- Only include items where you found CLEAR evidence in the sources. Omit items entirely if uncertain.
- Only include fields where the source material provides the value. Set unsupported fields to null.
- Use exact item names from the target lists. Do not invent or rename items.
- For text fields, respect length limits stated in field descriptions.
- For meta_rating on cores, only assign a tier if the source explicitly discusses ranked viability.

EXTRACTION TARGETS (only items in these lists need values):
SHELLS WITH MISSING DATA: ${shellList}
WEAPONS WITH MISSING DATA: ${weaponList}
CORES WITH MISSING DATA: ${coreList}
IMPLANTS WITH MISSING DATA: ${implantList}

Use the submit_extracted_stats tool to return findings. Submit empty arrays for categories where no data was found.`;

  const userPrompt = `Extract Marathon stats from the following source material:\n\n${combinedContent}`;

  try {
    const message = await client.messages.create({
      model: STATS_MODEL,
      max_tokens: 4096,
      system: systemPrompt,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: 'tool', name: EXTRACT_TOOL.name },
      messages: [{ role: 'user', content: userPrompt }],
    });

    const toolUseBlock = (message.content || []).find(b => b.type === 'tool_use' && b.name === EXTRACT_TOOL.name);

    if (!toolUseBlock) {
      console.log('[dexter-stats] No tool_use block returned. Stop reason: ' + message.stop_reason);
      return null;
    }

    return toolUseBlock.input;
  } catch (err) {
    console.error('[dexter-stats] Extraction failed:', err.message);
    return null;
  }
}

// ─── SUPABASE WRITERS ────────────────────────────────────────
// Each writer accepts a row and only updates fields that have values.
// Skips entirely if no writeable fields present.

function buildUpdate(row, allowedFields) {
  const update = {};
  for (const field of allowedFields) {
    if (row[field] !== null && row[field] !== undefined && row[field] !== '') {
      update[field] = row[field];
    }
  }
  return update;
}

async function updateShell(row) {
  const update = buildUpdate(row, [
    'base_health', 'base_shield', 'base_speed',
    'active_ability_name', 'active_ability_desc',
    'passive_ability_name', 'passive_ability_desc',
    'strengths', 'weaknesses',
  ]);
  if (Object.keys(update).length === 0) return false;
  update.updated_at = new Date().toISOString();
  const { error } = await supabase.from('shell_stats').update(update).eq('name', row.name);
  if (error) {
    console.error('[dexter-stats] Shell update failed: ' + row.name + ' — ' + error.message);
    return false;
  }
  console.log('[dexter-stats] Shell updated: ' + row.name + ' (' + Object.keys(update).filter(k => k !== 'updated_at').join(', ') + ')');
  return true;
}

async function updateWeapon(row) {
  const update = buildUpdate(row, ['damage', 'fire_rate', 'magazine_size', 'reload_time']);
  if (Object.keys(update).length === 0) return false;
  update.updated_at = new Date().toISOString();
  const { error } = await supabase.from('weapon_stats').update(update).eq('name', row.name);
  if (error) {
    console.error('[dexter-stats] Weapon update failed: ' + row.name + ' — ' + error.message);
    return false;
  }
  console.log('[dexter-stats] Weapon updated: ' + row.name + ' (' + Object.keys(update).filter(k => k !== 'updated_at').join(', ') + ')');
  return true;
}

async function updateCore(row) {
  const update = buildUpdate(row, ['effect_desc', 'ability_type', 'is_shell_exclusive', 'meta_rating']);
  if (Object.keys(update).length === 0) return false;
  update.updated_at = new Date().toISOString();
  const { error } = await supabase.from('core_stats').update(update).eq('name', row.name);
  if (error) {
    console.error('[dexter-stats] Core update failed: ' + row.name + ' — ' + error.message);
    return false;
  }
  console.log('[dexter-stats] Core updated: ' + row.name + ' (' + Object.keys(update).filter(k => k !== 'updated_at').join(', ') + ')');
  return true;
}

async function updateImplant(row) {
  const update = buildUpdate(row, [
    'description', 'passive_name', 'passive_desc',
    'stat_1_label', 'stat_1_value',
    'stat_2_label', 'stat_2_value',
    'stat_3_label', 'stat_3_value',
    'stat_4_label', 'stat_4_value',
  ]);
  if (Object.keys(update).length === 0) return false;
  update.updated_at = new Date().toISOString();
  const { error } = await supabase.from('implant_stats').update(update).eq('name', row.name);
  if (error) {
    console.error('[dexter-stats] Implant update failed: ' + row.name + ' — ' + error.message);
    return false;
  }
  console.log('[dexter-stats] Implant updated: ' + row.name + ' (' + Object.keys(update).filter(k => k !== 'updated_at').join(', ') + ')');
  return true;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────

export async function runDexterStatPipeline(existingData = {}) {
  // ── THROTTLE CHECK ────────────────────────────────────
  if (!(await needsRefresh())) {
    console.log('[dexter-stats] Skipped — last refresh was within ' + REFRESH_HOURS + 'h');
    return { skipped: true };
  }

  console.log('[dexter-stats] Starting extraction pipeline...');

  // ── BUILD TARGETS FROM DB ─────────────────────────────
  const targets = await fetchExtractionTargets();
  if (
    targets.shells.length === 0 &&
    targets.weapons.length === 0 &&
    targets.cores.length === 0 &&
    targets.implants.length === 0
  ) {
    console.log('[dexter-stats] All target fields filled — nothing to extract');
    await logRefresh(0);
    return { shellsUpdated: 0, weaponsUpdated: 0, coresUpdated: 0, implantsUpdated: 0 };
  }

  // ── GATHER SOURCES ────────────────────────────────────
  const wikiSources = await fetchWikiContent();
  const allSources = [...wikiSources];

  if (existingData.videos && existingData.videos.length > 0) {
    const ytText = existingData.videos
      .filter(v => v.transcript || v.description)
      .map(v => ({
        source: 'YouTube: ' + (v.title || 'video'),
        content: ((v.transcript || '') + ' ' + (v.description || '')).slice(0, 1000),
      }));
    allSources.push(...ytText);
    console.log('[dexter-stats] Added ' + ytText.length + ' YouTube sources');
  }

  if (existingData.redditPosts && existingData.redditPosts.length > 0) {
    const redditText = existingData.redditPosts
      .filter(p => p.title || p.selftext)
      .map(p => ({
        source: 'Reddit: r/MarathonTheGame',
        content: ((p.title || '') + ' ' + (p.selftext || '')).slice(0, 800),
      }));
    allSources.push(...redditText);
    console.log('[dexter-stats] Added ' + redditText.length + ' Reddit sources');
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
    return { shellsUpdated: 0, weaponsUpdated: 0, coresUpdated: 0, implantsUpdated: 0 };
  }

  // ── EXTRACT ───────────────────────────────────────────
  console.log('[dexter-stats] Sending ' + allSources.length + ' sources to Claude (tool-use)...');
  const extracted = await extractStats(allSources, targets);

  if (!extracted) {
    console.log('[dexter-stats] Extraction returned null — skipping DB writes');
    await logRefresh(0);
    return { shellsUpdated: 0, weaponsUpdated: 0, coresUpdated: 0, implantsUpdated: 0 };
  }

  // ── WRITE TO DB ───────────────────────────────────────
  let shellsUpdated = 0, weaponsUpdated = 0, coresUpdated = 0, implantsUpdated = 0;

  for (const row of (extracted.shells || [])) {
    if (await updateShell(row)) shellsUpdated++;
  }
  for (const row of (extracted.weapons || [])) {
    if (await updateWeapon(row)) weaponsUpdated++;
  }
  for (const row of (extracted.cores || [])) {
    if (await updateCore(row)) coresUpdated++;
  }
  for (const row of (extracted.implants || [])) {
    if (await updateImplant(row)) implantsUpdated++;
  }

  const totalUpdated = shellsUpdated + weaponsUpdated + coresUpdated + implantsUpdated;
  console.log('[dexter-stats] Pipeline complete — ' + shellsUpdated + ' shells, ' + weaponsUpdated + ' weapons, ' + coresUpdated + ' cores, ' + implantsUpdated + ' implants updated');

  await logRefresh(totalUpdated);

  return { shellsUpdated, weaponsUpdated, coresUpdated, implantsUpdated };
}
