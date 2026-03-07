// lib/gather/miranda.js
// MIRANDA gather — YouTube guides + Reddit help threads + all 3 stat tables

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const YT_KEY  = process.env.YOUTUBE_API_KEY;
const YT_BASE = 'https://www.googleapis.com/youtube/v3';

const GUIDE_QUERIES = [
  'Marathon game beginner guide 2026',
  'Marathon Bungie how to extract guide',
  'Marathon runner shell guide tips',
  'Marathon best loadout beginners',
  'Marathon ranked mode tips how to rank up',
  'Marathon Holotag guide ranked explained',
  'Marathon survival tips how to win',
  'Marathon mod guide best mods explained'
];

async function fetchYouTubeGuides() {
  const videos = [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);

  for (const q of GUIDE_QUERIES) {
    try {
      const res = await fetch(
        `${YT_BASE}/search?part=snippet&q=${encodeURIComponent(q)}&type=video&order=relevance&publishedAfter=${cutoff.toISOString()}&maxResults=3&key=${YT_KEY}`
      );
      const d = await res.json();
      if (!d.items) continue;
      for (const item of d.items) {
        videos.push({
          videoId:      item.id.videoId,
          title:        item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          description:  item.snippet.description,
          thumbnail:    item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
          query: q
        });
      }
    } catch (err) {
      console.error(`[miranda.js] YT failed: ${q}`, err.message);
    }
  }

  const seen = new Set();
  return videos.filter(v => {
    if (seen.has(v.videoId)) return false;
    seen.add(v.videoId);
    return true;
  });
}

async function fetchRedditGuides() {
  const posts = [];
  for (const sub of ['Marathon', 'MarathonTheGame']) {
    for (const flair of ['Guide', 'Tips', 'Help', 'Question', 'Ranked']) {
      try {
        const res = await fetch(
          `https://old.reddit.com/r/${sub}/search.json?q=flair:${flair}&restrict_sr=1&sort=new&limit=5`,
          { headers: { 'User-Agent': 'CyberneticPunks-Bot/1.0' } }
        );
        if (!res.ok) continue;
        const d = await res.json();
        for (const item of (d?.data?.children || [])) {
          const p = item.data;
          posts.push({
            title:    p.title,
            selftext: p.selftext?.slice(0, 500) || '',
            score:    p.score,
            url:      `https://reddit.com${p.permalink}`,
            flair:    p.link_flair_text || flair
          });
        }
      } catch (err) {
        console.error(`[miranda.js] Reddit r/${sub} ${flair}:`, err.message);
      }
    }
  }
  return posts.sort((a, b) => b.score - a.score).slice(0, 10);
}

async function fetchShellContext() {
  try {
    const { data } = await supabase.from('shell_stats').select(
      'name,role,difficulty,best_for,active_ability_name,active_ability_description,active_ability_cooldown_seconds,passive_ability_name,passive_ability_description,trait_1_name,trait_1_description,trait_2_name,trait_2_description,base_health,base_shield,base_speed,strengths,weaknesses,countered_by,synergizes_with,ranked_tier,ranked_tier_solo,ranked_tier_squad,ranked_notes,holotag_tier_recommendation'
    ).order('name');
    return data || [];
  } catch (err) {
    console.error('[miranda.js] Shell context:', err.message);
    return [];
  }
}

async function fetchWeaponContext() {
  try {
    const { data } = await supabase.from('weapon_stats').select(
      'name,category,ammo_type,damage,fire_rate,range_rating,ranked_viable,mod_slot_types,notes'
    ).order('category');
    return data || [];
  } catch (err) {
    console.error('[miranda.js] Weapon context:', err.message);
    return [];
  }
}

async function fetchModContext() {
  try {
    const { data } = await supabase.from('mod_stats').select(
      'name,slot_type,effect_summary,effect_detail,compatible_categories,ranked_impact,ranked_notes'
    ).order('slot_type');
    return data || [];
  } catch (err) {
    console.error('[miranda.js] Mod context:', err.message);
    return [];
  }
}

export async function gatherMirandaData() {
  console.log('[miranda.js] Gathering...');
  const [videos, redditPosts, shellContext, weaponContext, modContext] = await Promise.all([
    fetchYouTubeGuides(),
    fetchRedditGuides(),
    fetchShellContext(),
    fetchWeaponContext(),
    fetchModContext()
  ]);
  console.log(`[miranda.js] ${videos.length} videos, ${redditPosts.length} Reddit, ${shellContext.length} shells, ${weaponContext.length} weapons, ${modContext.length} mods`);
  return { videos, redditPosts, shellContext, weaponContext, modContext };
}