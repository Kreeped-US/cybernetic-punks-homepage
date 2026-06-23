// app/network-preview/page.js
// NEUTRAL ROOT SKELETON (network front door) at a TEMPORARY preview path.
// This is the brand's front door above the games: brand hero (depth promise, NO
// game vocabulary, NO AI in the hero), game-agnostic routing tiles + segmented
// pulse driven by lib/network/rootGames.js (keyed by game_slug), reserved slots
// for future workstreams, a light join-free affordance, and a neutral footer
// where AI is whispered as the engine.
//
// STAGING: lives at /network-preview, NOT /. noindex + absent from the sitemap.
// / and /marathon are untouched. Structure-first; a visual-polish pass is a
// separate later task. See docs/network/cyberneticpunks-brand-positioning.md.
//
// Game-specific vocabulary (Cradle, shells, loadout, FOB, Season 2, etc.) MUST
// NOT appear in the root's own copy -- those live on the game hubs. Game NAMES on
// tiles/columns and a game's own content inside its segmented column are correct
// (that is the routing + segmentation, not the root adopting game vocabulary).
//
// The neutral root deliberately does NOT reuse components/Footer.js: that footer
// carries Marathon vocabulary (Tau Ceti, Bungie TM, Marathon links) and would
// break the no-game-vocabulary rule. A minimal neutral footer is rendered here.

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getLiveStats } from '@/lib/liveStats';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import GameRoutingTile from '@/components/network/GameRoutingTile';
import GamePulseColumn from '@/components/network/GamePulseColumn';

// ── METADATA ────────────────────────────────────────────────
// Neutral, network-level title (the layout title.template appends the site name;
// no manual append here). noindex while this is a preview; not added to sitemap.
export const metadata = {
  title: 'Extraction-Shooter Intelligence Network',
  description: 'The deepest, most current intel in every extraction shooter. Fast routing into each game hub, with a live network pulse.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// ── HELPERS ─────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// Next-update label for live games. Mirrors the /marathon page's cron-cycle math
// (12h cycles at 00:00 + 12:00 UTC, the Marathon editorial cadence). Kept here as
// the page-side resolver so the tile component stays data-agnostic.
function nextUpdateLabel() {
  var now = new Date();
  var minsIn = (now.getUTCHours() * 60 + now.getUTCMinutes()) % 720;
  var minsLeft = 720 - minsIn;
  var h = Math.floor(minsLeft / 60);
  var m = minsLeft % 60;
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
}

// Resolve the live pulse (online count, next update, latest feed items) for the
// games that declare a live pulse. Pre-launch games need no query. Reads the SAME
// sources the /marathon page uses: getLiveStats() + feed_items.
async function getNetworkPulse() {
  var liveGames = ROOT_GAMES.filter(function(g) { return g.pulse.mode === 'live'; });
  var pulse = {};   // slug -> { online, nextUpdate }
  var feeds = {};   // slug -> [{ headline, slug, editor, when }]

  // Live counts (single shared snapshot; map each game's onlineSource onto it).
  var liveStats = null;
  try { liveStats = await getLiveStats(); } catch (e) { liveStats = null; }
  var nextUpd = nextUpdateLabel();

  // Latest feed per live game, scoped by its configured game_slug.
  await Promise.all(liveGames.map(async function(g) {
    var online = null;
    if (liveStats && g.pulse.onlineSource && liveStats[g.pulse.onlineSource]) {
      online = liveStats[g.pulse.onlineSource].value;
    }
    pulse[g.slug] = { online: online, nextUpdate: nextUpd };

    feeds[g.slug] = [];
    try {
      var res = await supabase
        .from('feed_items')
        .select('headline, slug, editor, created_at')
        .eq('is_published', true)
        .eq('game_slug', g.pulse.feed.gameSlug)
        .order('created_at', { ascending: false })
        .limit(4);
      feeds[g.slug] = (res.data || []).map(function(it) {
        return { headline: it.headline, slug: it.slug, editor: it.editor, when: timeAgo(it.created_at) };
      });
    } catch (e) {
      feeds[g.slug] = [];
    }
  }));

  return { pulse: pulse, feeds: feeds };
}

export default async function NetworkPreview() {
  var data = await getNetworkPulse();

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, maxWidth: 1100, width: '100%', margin: '0 auto', padding: '64px 24px 48px', display: 'flex', flexDirection: 'column', gap: 40 }}>

        {/* ══ BRAND HERO ══ (network identity + depth promise; no game vocab, no AI) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 800, letterSpacing: 3, color: 'var(--text-primary)' }}>
              CYBERNETIC<span style={{ color: 'var(--red)' }}>PUNKS</span>
            </span>
          </div>

          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 34, fontWeight: 900, lineHeight: 1.1, color: 'var(--text-primary)', margin: 0, maxWidth: 760 }}>
            The deepest, most current intel in every extraction shooter
          </h1>

          <p style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, letterSpacing: 2, color: 'var(--text-secondary)', margin: 0, textTransform: 'uppercase' }}>
            The extraction-shooter intelligence network
          </p>

          {/* RESERVED: network-voice slot (a network-editor intro renders here later) */}
          <div style={{ border: '1px dashed var(--border)', borderRadius: 2, padding: '12px 14px', fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginTop: 6 }}>
            [reserved: network voice]
          </div>

          {/* Light join-free affordance (present, not pushy; placeholder, no auth) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
            <Link href="#" style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--green)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '7px 14px' }}>
              JOIN FREE
            </Link>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: 1 }}>
              track your runs across the network
            </span>
          </div>
        </section>

        {/* ══ ROUTING TILES ══ (game-agnostic, one per ROOT_GAMES entry) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="cp-section-label" style={{ margin: 0 }}>Choose your zone</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
            {ROOT_GAMES.map(function(game) {
              return <GameRoutingTile key={game.slug} game={game} pulse={data.pulse[game.slug]} />;
            })}
          </div>
        </section>

        {/* ══ GAME-SEGMENTED PULSE ══ (per-game columns, never blended) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span className="cp-section-label" style={{ margin: 0 }}>Network pulse</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {ROOT_GAMES.map(function(game) {
              return <GamePulseColumn key={game.slug} game={game} items={data.feeds[game.slug]} />;
            })}
          </div>
        </section>

      </div>

      {/* ══ NEUTRAL FOOTER ══ (whispered AI line; no game vocabulary) */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-nav)', padding: '24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--text-secondary)' }}>
            Cybernetic Punks - the extraction-shooter intelligence network. No hype. Just intel.
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1, color: 'var(--text-tertiary)' }}>
            powered by a live intelligence pipeline - updated continuously, verified against patch data
          </span>
        </div>
      </footer>
    </div>
  );
}
