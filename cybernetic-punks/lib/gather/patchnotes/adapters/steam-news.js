// lib/gather/patchnotes/adapters/steam-news.js
// PER-SOURCE patch-notes adapter: Steam (Gap 2 Phase B). Faithful extraction of
// bungie.js's two-source fetch -- the Steam news JSON (full notes, BBCode-cleaned
// in steam.js) + the Steam community-announcements RSS feed (summary, HTML-cleaned
// here). Returns normalized articles WITHOUT is_patch_note (the engine adds that).
// See docs/network/PATCHNOTES_PHASEB_SCOPING.md. UNWIRED in B1.
//
// COMPOSES steam.js fetchSteamNews -- does NOT move it (miranda's dev-news shares
// it). Reusable across games (DMZ may use it with the MW4 appid).

import { fetchSteamNews } from '../../steam.js';

// Steam community-announcements RSS for the appid. Faithful copy of bungie.js
// fetchBungieNetNews: HTML-clean (no length cap, Gap 1), notes_complete:false
// (RSS <description> is a Steam-side summary; the JSON source is authoritative
// and wins the engine's prefer-fuller merge).
async function fetchRssNews(appId) {
  try {
    const res = await fetch(
      `https://store.steampowered.com/feeds/news/app/${appId}/?cc=US&l=english&snr=1_2108_9__2107`,
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
        .trim();
      if (title) {
        articles.push({
          title: title.trim(),
          url: link.trim(),
          date: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
          contents: cleanDesc,
          author: 'Bungie',
          source: 'steam-rss',
          notes_complete: false,
        });
      }
    }
    return articles;
  } catch (err) {
    console.log('[patchnotes:steam-news] RSS fetch failed:', err.message);
    return [];
  }
}

// Adapter entry. Receives the game's patchNotes config (reads appId). Returns the
// JSON source first, then RSS -- same order bungie.js fed the merge, so the
// engine's first-seen tie-break is preserved.
export async function fetchSteamNewsSource(patchNotesConfig) {
  const appId = patchNotesConfig.appId;
  const [json, rss] = await Promise.all([
    fetchSteamNews(appId),
    fetchRssNews(appId),
  ]);
  return [...json, ...rss];
}
