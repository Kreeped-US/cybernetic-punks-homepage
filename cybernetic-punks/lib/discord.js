// lib/discord.js
// Sends embeds to Discord channels via webhooks
// Non-blocking — all calls are fire-and-forget

const EDITOR_COLORS = {
  CIPHER:  0xff0000,
  NEXUS:   0x00f5ff,
  DEXTER:  0xff8800,
  GHOST:   0x00ff88,
  MIRANDA: 0x9b5de5,
};

const EDITOR_SYMBOLS = {
  CIPHER:  '◈',
  NEXUS:   '⬡',
  DEXTER:  '⬢',
  GHOST:   '◇',
  MIRANDA: '◎',
};

async function sendWebhook(url, payload) {
  if (!url) return;
  try {
    var res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.log('[DISCORD] Webhook failed: ' + res.status + ' ' + url.slice(-20));
    }
  } catch (err) {
    console.log('[DISCORD] Webhook error: ' + err.message);
  }
}

// ── INTEL FEED — fires when MIRANDA publishes ──────────────────
export async function notifyIntelFeed(feedItem, editorName) {
  var url = process.env.DISCORD_WEBHOOK_INTEL;
  if (!url) return;

  var symbol = EDITOR_SYMBOLS[editorName] || '◈';
  var color  = EDITOR_COLORS[editorName]  || 0xffffff;
  var articleUrl = 'https://cyberneticpunks.com/intel/' + feedItem.slug;
  var bodyPreview = (feedItem.body || '').replace(/\*\*/g, '').slice(0, 200);
  if (bodyPreview.length === 200) bodyPreview += '...';

  await sendWebhook(url, {
    embeds: [{
      color,
      author: {
        name: symbol + ' ' + editorName + ' — CyberneticPunks',
        url: 'https://cyberneticpunks.com/intel/' + editorName.toLowerCase(),
      },
      title: feedItem.headline,
      url: articleUrl,
      description: bodyPreview,
      fields: feedItem.tags && feedItem.tags.length > 0 ? [{
        name: 'TAGS',
        value: feedItem.tags.slice(0, 5).join(' · '),
        inline: true,
      }] : [],
      thumbnail: feedItem.thumbnail ? { url: feedItem.thumbnail } : undefined,
      footer: {
        text: 'cyberneticpunks.com · Updated every 6h',
      },
      timestamp: feedItem.created_at || new Date().toISOString(),
    }],
  });
}

// ── META UPDATES — ONLY fires when tiers actually move ─────────
// If nothing changed this cycle, we stay silent. No spam.
export async function notifyMetaUpdate(metaRows) {
  var url = process.env.DISCORD_WEBHOOK_META;
  if (!url || !metaRows || metaRows.length === 0) return;

  var risers  = metaRows.filter(function(r) { return r.trend === 'up'; });
  var fallers = metaRows.filter(function(r) { return r.trend === 'down'; });

  // ── SILENT IF NO MOVERS — do not spam Discord with "meta stable" ──
  if (risers.length === 0 && fallers.length === 0) {
    console.log('[DISCORD] Meta stable — skipping Discord notification');
    return;
  }

  var fields = [];

  if (risers.length > 0) {
    fields.push({
      name: '▲ RISING',
      value: risers.slice(0, 8).map(function(r) {
        return '**' + r.name + '** — ' + r.tier + ' tier' + (r.note ? ' · ' + r.note : '');
      }).join('\n'),
      inline: false,
    });
  }

  if (fallers.length > 0) {
    fields.push({
      name: '▼ FALLING',
      value: fallers.slice(0, 8).map(function(r) {
        return '**' + r.name + '** — ' + r.tier + ' tier' + (r.note ? ' · ' + r.note : '');
      }).join('\n'),
      inline: false,
    });
  }

  await sendWebhook(url, {
    embeds: [{
      color: 0x00f5ff,
      author: {
        name: '⬡ NEXUS — Meta Shift Detected',
        url: 'https://cyberneticpunks.com/meta',
      },
      title: 'Marathon Meta Tier Shifts',
      url: 'https://cyberneticpunks.com/meta',
      fields,
      footer: {
        text: metaRows.length + ' entries tracked · cyberneticpunks.com/meta',
      },
      timestamp: new Date().toISOString(),
    }],
  });
}

// ── PATCH NOTES — fires when NEW Bungie patch is detected ──────
// Deduplication is handled upstream in cron/route.js before this is called.
export async function notifyPatchNotes(bungieNews) {
  var url = process.env.DISCORD_WEBHOOK_PATCH;
  if (!url || !bungieNews || bungieNews.length === 0) return;

  var patchItems = bungieNews.filter(function(n) { return n.is_patch_note; });
  if (patchItems.length === 0) return;

  var latest = patchItems[0];

  await sendWebhook(url, {
    embeds: [{
      color: 0xff8800,
      author: {
        name: 'BUNGIE OFFICIAL — Patch Notes Detected',
        url: 'https://www.bungie.net',
      },
      title: latest.title || 'New Bungie Update',
      url: latest.url || 'https://www.bungie.net',
      description: patchItems.length > 1
        ? patchItems.slice(0, 5).map(function(n) { return '• [' + n.title + '](' + n.url + ')'; }).join('\n')
        : 'New official Bungie communication detected. NEXUS is analyzing impact on the meta.',
      footer: {
        text: 'cyberneticpunks.com · NEXUS will cover this in the next cycle',
      },
      timestamp: new Date().toISOString(),
    }],
  });
}

// ── RANKED INTEL — fires when any editor posts ranked-tagged article ──
export async function notifyRankedIntel(feedItem, editorName) {
  var url = process.env.DISCORD_WEBHOOK_RANKED;
  if (!url) return;

  var tags = feedItem.tags || [];
  var isRanked = tags.some(function(t) {
    return t.toLowerCase() === 'ranked' || t.toLowerCase().includes('ranked');
  });
  if (!isRanked) return;

  var symbol = EDITOR_SYMBOLS[editorName] || '◈';
  var color  = EDITOR_COLORS[editorName]  || 0xffffff;
  var articleUrl = 'https://cyberneticpunks.com/intel/' + feedItem.slug;
  var bodyPreview = (feedItem.body || '').replace(/\*\*/g, '').slice(0, 220);
  if (bodyPreview.length === 220) bodyPreview += '...';

  await sendWebhook(url, {
    embeds: [{
      color,
      author: {
        name: symbol + ' ' + editorName + ' — Ranked Intel',
        url: 'https://cyberneticpunks.com/ranked',
      },
      title: feedItem.headline,
      url: articleUrl,
      description: bodyPreview,
      fields: [
        {
          name: 'RANKED RESOURCES',
          value: '[Ranked Guide](https://cyberneticpunks.com/ranked) · [Meta Tier List](https://cyberneticpunks.com/meta) · [Build Advisor](https://cyberneticpunks.com/advisor)',
          inline: false,
        },
      ],
      thumbnail: feedItem.thumbnail ? { url: feedItem.thumbnail } : undefined,
      footer: {
        text: 'cyberneticpunks.com · Marathon Season 1 Ranked',
      },
      timestamp: feedItem.created_at || new Date().toISOString(),
    }],
  });
}