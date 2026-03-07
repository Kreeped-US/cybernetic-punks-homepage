// lib/gather/miranda.js
// MIRANDA gather — YouTube guides + Reddit help + dev news + all 3 stat tables

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

// ─── DEV NEWS: Bungie.net ─────────────────────────────────────
// Fetches the Bungie news page and extracts recent article titles + URLs

async function fetchBungieNews() {
  try {
    const res = await fetch('https://www.bungie.net/en/News', {
      headers: { 'User-Agent': 'CyberneticPunks-Bot/1.0 (https://cyberneticpunks.com)' }
    });
    if (!res.ok) throw new Error(`Bungie.net returned ${res.status}`);
    const html = await res.text();

    const articles = [];

    // Extract article titles and links from Bungie news page
    const linkRe = /<a[^>]+href="(\/en\/News\/Article\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = linkRe.exec(html)) !== null) {
      const href = m[1];
      const text = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      if (text.length > 10 && text.length < 200) {
        articles.push({
          title: text,
          url:   'https://www.bungie.net' + href
        });
      }
    }

    // Deduplicate by URL
    const seen = new Set();
    const unique = articles.filter(a => {
      if (seen.has(a.url)) return false;
      seen.add(a.url);
      return true;
    });

    console.log(`[miranda.js] Bungie.net: ${unique.length} articles found`);
    return unique.slice(0, 5);

  } catch (err) {
    console.error('[miranda.js] Bungie.net fetch failed:', err.message);
    return [];
  }
}

// ─── DEV NEWS: Reddit official posts ─────────────────────────
// Looks for Official flair or Bungie account posts in r/Marathon

async function fetchDevRedditPosts() {
  const devPosts = [];
  const devAuthors = ['Bungie', 'BungieHelp', 'BungieIntel', 'marathon_game'];

  try {
    // Search for Official flair
    for (const sub of ['Marathon', 'MarathonTheGame']) {
      try {
        const res = await fetch(
          `https://old.reddit.com/r/${sub}/search.json?q=flair:Official&restrict_sr=1&sort=new&limit=5`,
          { headers: { 'User-Agent': 'CyberneticPunks-Bot/1.0' } }
        );
        if (!res.ok) continue;
        const d = await res.json();
        for (const item of (d?.data?.children || [])) {
          const p = item.data;
          devPosts.push({
            title:    p.title,
            selftext: p.selftext?.slice(0, 600) || '',
            score:    p.score,
            url:      `https://reddit.com${p.permalink}`,
            author:   p.author,
            flair:    p.link_flair_text || 'Official',
            isOfficial: true
          });
        }
      } catch (err) {
        console.error(`[miranda.js] Dev Reddit r/${sub}:`, err.message);
      }

      // Also check new posts for known dev authors
      try {
        const res2 = await fetch(
          `https://old.reddit.com/r/${sub}/new.json?limit=25`,
          { headers: { 'User-Agent': 'CyberneticPunks-Bot/1.0' } }
        );
        if (!res2.ok) continue;
        const d2 = await res2.json();
        for (const item of (d2?.data?.children || [])) {
          const p = item.data;
          if (devAuthors.some(a => p.author?.toLowerCase().includes(a.toLowerCase()))) {
            devPosts.push({
              title:    p.title,
              selftext: p.selftext?.slice(0, 600) || '',
              score:    p.score,
              url:      `https://reddit.com${p.permalink}`,
              author:   p.author,
              flair:    p.link_flair_text || 'Dev Post',
              isOfficial: true
            });
          }
        }
      } catch (err) {
        console.error(`[miranda.js] Dev author scan r/${sub}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[miranda.js] fetchDevRedditPosts failed:', err.message);
  }

  // Deduplicate by URL
  const seen = new Set();
  return devPosts.filter(p => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  }).slice(0, 5);
}

// ─── STAT CONTEXT FETCHERS ────────────────────────────────────

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

// ─── MAIN EXPORT ─────────────────────────────────────────────

export async function gatherMirandaData() {
  console.log('[miranda.js] Gathering...');

  const [videos, redditPosts, devNews, devRedditPosts, shellContext, weaponContext, modContext] = await Promise.all([
    fetchYouTubeGuides(),
    fetchRedditGuides(),
    fetchBungieNews(),
    fetchDevRedditPosts(),
    fetchShellContext(),
    fetchWeaponContext(),
    fetchModContext()
  ]);

  console.log(`[miranda.js] ${videos.length} videos, ${redditPosts.length} Reddit, ${devNews.length} Bungie news, ${devRedditPosts.length} dev posts`);
  console.log(`[miranda.js] Context: ${shellContext.length} shells, ${weaponContext.length} weapons, ${modContext.length} mods`);

  return { videos, redditPosts, devNews, devRedditPosts, shellContext, weaponContext, modContext };
}