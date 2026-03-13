// lib/gather/miranda.js
// MIRANDA gather — YouTube guides + Reddit hot/new + Steam dev news + all 3 stat tables
// Includes recent-headline dedup so MIRANDA never covers the same topic twice in a row

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
  'Marathon mod guide best mods explained',
];

// ─── YOUTUBE ─────────────────────────────────────────────────

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
          query: q,
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

// ─── REDDIT ──────────────────────────────────────────────────
// Uses hot.json + new.json directly — flair search returns 0 on these subs
// Filters for posts that are likely guides/tips/questions by keyword

const GUIDE_KEYWORDS = [
  'guide', 'tip', 'help', 'question', 'how to', 'how do', 'best', 'ranked',
  'holotag', 'loadout', 'shell', 'extract', 'survive', 'beginner', 'advice',
  'what is', 'explain', 'build', 'strategy', 'mod', 'weapon', 'ability',
];

function isGuideRelevant(post) {
  const text = ((post.title || '') + ' ' + (post.link_flair_text || '')).toLowerCase();
  return GUIDE_KEYWORDS.some(kw => text.includes(kw));
}

async function fetchRedditGuides() {
  const posts = [];
  const seen = new Set();

  for (const sub of ['Marathon', 'MarathonTheGame']) {
    for (const feed of ['hot', 'new']) {
      try {
        const res = await fetch(
          `https://old.reddit.com/r/${sub}/${feed}.json?limit=25`,
          { headers: { 'User-Agent': 'CyberneticPunks-Bot/1.0' } }
        );
        if (!res.ok) {
          console.log(`[miranda.js] Reddit r/${sub}/${feed} returned ${res.status}`);
          continue;
        }
        const d = await res.json();
        const children = d?.data?.children || [];
        for (const item of children) {
          const p = item.data;
          if (!p?.title) continue;
          if (seen.has(p.id)) continue;
          if (!isGuideRelevant(p)) continue;
          seen.add(p.id);
          posts.push({
            title:    p.title,
            selftext: (p.selftext || '').slice(0, 500),
            score:    p.score || 0,
            url:      `https://reddit.com${p.permalink}`,
            flair:    p.link_flair_text || '',
            created:  p.created_utc,
          });
        }
        console.log(`[miranda.js] Reddit r/${sub}/${feed}: ${children.length} posts, ${posts.length} relevant so far`);
      } catch (err) {
        console.error(`[miranda.js] Reddit r/${sub}/${feed}:`, err.message);
      }
    }
  }

  // Sort by score desc, take top 10
  return posts.sort((a, b) => b.score - a.score).slice(0, 10);
}

// ─── DEV NEWS: Steam ──────────────────────────────────────────

async function fetchSteamDevNews() {
  try {
    const { fetchSteamNews } = await import('./steam.js');
    const articles = await fetchSteamNews();
    console.log(`[miranda.js] Steam dev news: ${articles.length} articles`);
    return articles;
  } catch (err) {
    console.error('[miranda.js] Steam news failed:', err.message);
    return [];
  }
}

// ─── DEV NEWS: Reddit official posts ─────────────────────────

const DEV_AUTHORS = ['Bungie', 'BungieHelp', 'BungieIntel', 'marathon_game'];

async function fetchDevRedditPosts() {
  const devPosts = [];
  const seen = new Set();

  for (const sub of ['Marathon', 'MarathonTheGame']) {
    // Scan new posts for dev author matches
    try {
      const res = await fetch(
        `https://old.reddit.com/r/${sub}/new.json?limit=25`,
        { headers: { 'User-Agent': 'CyberneticPunks-Bot/1.0' } }
      );
      if (!res.ok) continue;
      const d = await res.json();
      for (const item of (d?.data?.children || [])) {
        const p = item.data;
        if (!p?.title) continue;
        if (seen.has(p.id)) continue;
        const isDevAuthor = DEV_AUTHORS.some(a => (p.author || '').toLowerCase().includes(a.toLowerCase()));
        const isOfficialFlair = (p.link_flair_text || '').toLowerCase().includes('official');
        if (!isDevAuthor && !isOfficialFlair) continue;
        seen.add(p.id);
        devPosts.push({
          title:      p.title,
          selftext:   (p.selftext || '').slice(0, 600),
          score:      p.score || 0,
          url:        `https://reddit.com${p.permalink}`,
          author:     p.author,
          flair:      p.link_flair_text || 'Official',
          isOfficial: true,
        });
      }
      console.log(`[miranda.js] Dev Reddit r/${sub}: ${devPosts.length} dev posts found`);
    } catch (err) {
      console.error(`[miranda.js] Dev Reddit r/${sub}:`, err.message);
    }
  }

  return devPosts.slice(0, 5);
}

// ─── STAT CONTEXT ─────────────────────────────────────────────

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

// ─── RECENT MIRANDA HEADLINES (dedup) ────────────────────────
// Pulled into the prompt so MIRANDA knows what she's already covered
// and avoids writing the same guide topic twice in a row

async function fetchRecentMirandaHeadlines() {
  try {
    const { data } = await supabase
      .from('feed_items')
      .select('headline, created_at')
      .eq('editor', 'MIRANDA')
      .order('created_at', { ascending: false })
      .limit(12);
    return (data || []).map(r => r.headline);
  } catch (err) {
    console.error('[miranda.js] Recent headlines fetch:', err.message);
    return [];
  }
}

// ─── MAIN EXPORT ─────────────────────────────────────────────

export async function gatherMirandaData() {
  console.log('[miranda.js] Gathering...');

  const [videos, redditPosts, devNews, devRedditPosts, shellContext, weaponContext, modContext, recentHeadlines] = await Promise.all([
    fetchYouTubeGuides(),
    fetchRedditGuides(),
    fetchSteamDevNews(),
    fetchDevRedditPosts(),
    fetchShellContext(),
    fetchWeaponContext(),
    fetchModContext(),
    fetchRecentMirandaHeadlines(),
  ]);

  console.log(`[miranda.js] ${videos.length} videos, ${redditPosts.length} Reddit posts, ${devNews.length} Steam news, ${devRedditPosts.length} dev posts`);
  console.log(`[miranda.js] Context: ${shellContext.length} shells, ${weaponContext.length} weapons, ${modContext.length} mods`);
  console.log(`[miranda.js] Dedup: ${recentHeadlines.length} recent headlines loaded`);

  return { videos, redditPosts, devNews, devRedditPosts, shellContext, weaponContext, modContext, recentHeadlines };
}