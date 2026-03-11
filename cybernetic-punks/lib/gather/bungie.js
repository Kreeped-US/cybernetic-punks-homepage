// lib/gather/bungie.js
// Polls Bungie official news from two sources:
// 1. Steam news API (captures patch notes + announcements, already working)
// 2. Bungie.net news page (direct scrape as secondary source)
// Returns structured array of Bungie dev news articles

import { fetchSteamNews } from './steam.js';

async function fetchBungieNetNews() {
  try {
    // Bungie community announcements RSS via Steam's feed
    const res = await fetch(
      'https://store.steampowered.com/feeds/news/app/3065800/?cc=US&l=english&snr=1_2108_9__2107',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CyberneticPunks/1.0; +https://cyberneticpunks.com)',
          'Accept': 'application/rss+xml, application/xml, text/xml',
        },
      }
    );
    if (!res.ok) return [];
    const text = await res.text();
    const articles = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const item = match[1];
      const title = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]
        || item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '';
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]
        || item.match(/<guid>([\s\S]*?)<\/guid>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
      const description = item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1]
        || item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || '';
      const cleanDesc = description
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 400);
      if (title) {
        articles.push({
          title: title.trim(),
          url: link.trim(),
          date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          contents: cleanDesc,
          author: 'Bungie',
          source: 'steam-rss',
        });
      }
    }
    return articles;
  } catch (err) {
    console.log('[bungie.js] RSS fetch failed:', err.message);
    return [];
  }
}

export async function gatherBungieNews() {
  try {
    // Run both sources in parallel
    const [steamNews, rssNews] = await Promise.all([
      fetchSteamNews(),
      fetchBungieNetNews(),
    ]);

    // Merge and deduplicate by title
    const seen = new Set();
    const all = [];

    for (const article of [...steamNews, ...rssNews]) {
      const key = article.title.toLowerCase().slice(0, 60);
      if (!seen.has(key)) {
        seen.add(key);
        all.push(article);
      }
    }

    // Sort by date descending
    all.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Flag patch notes specifically
    const patchKeywords = ['patch', 'update', 'hotfix', 'fix', 'balance', 'nerf', 'buff', 'change', 'tweak', 'season'];
    const tagged = all.map(a => ({
      ...a,
      is_patch_note: patchKeywords.some(k => a.title.toLowerCase().includes(k) || a.contents.toLowerCase().includes(k)),
    }));

    console.log(`[bungie.js] Gathered ${tagged.length} Bungie news articles (${tagged.filter(a => a.is_patch_note).length} patch-related)`);
    return tagged;
  } catch (err) {
    console.error('[bungie.js] gatherBungieNews failed:', err.message);
    return [];
  }
}

export function formatBungieNewsForTicker(articles) {
  if (!articles || articles.length === 0) return null;
  return articles.slice(0, 10).map(a => {
    const prefix = a.is_patch_note ? '🔧 PATCH: ' : '📡 DEV: ';
    return prefix + a.title.toUpperCase();
  });
}

export function formatBungieNewsForEditor(articles) {
  if (!articles || articles.length === 0) return '';
  const recent = articles.slice(0, 6);
  const lines = recent.map(a =>
    `[${a.is_patch_note ? 'PATCH NOTE' : 'DEV NEWS'}] ${a.title}\n  Date: ${new Date(a.date).toLocaleDateString()}\n  ${a.contents || '(No preview available)'}\n  URL: ${a.url}`
  ).join('\n\n');
  return `\n\n--- OFFICIAL BUNGIE NEWS (most recent first) ---\n${lines}\n--- END BUNGIE NEWS ---`;
}