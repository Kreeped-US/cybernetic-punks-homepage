// lib/liveStats.js
// Server-side reader for live player/viewer counts.
// Returns a normalized snapshot from the `live_stats` table.

import { supabase } from '@/lib/supabase';

export async function getLiveStats() {
  try {
    var { data, error } = await supabase
      .from('live_stats')
      .select('source, value, metadata, updated_at');

    if (error || !data) {
      return {
        steam: null,
        twitch: null,
        lastUpdated: null,
      };
    }

    var map = {};
    data.forEach(function(row) {
      map[row.source] = row;
    });

    var steamRow = map.steam || null;
    var twitchRow = map.twitch || null;

    // Latest updated_at across all sources
    var latest = null;
    data.forEach(function(row) {
      if (!latest || new Date(row.updated_at) > new Date(latest)) {
        latest = row.updated_at;
      }
    });

    return {
      steam: steamRow && steamRow.value > 0 ? {
        value: steamRow.value,
        updated_at: steamRow.updated_at,
      } : null,
      twitch: twitchRow ? {
        value: twitchRow.value,
        stream_count: twitchRow.metadata?.stream_count || 0,
        updated_at: twitchRow.updated_at,
      } : null,
      lastUpdated: latest,
    };
  } catch (e) {
    return { steam: null, twitch: null, lastUpdated: null };
  }
}
