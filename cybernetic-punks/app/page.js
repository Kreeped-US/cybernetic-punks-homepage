// app/page.js
// NEUTRAL ROOT (network front door) -- the LIVE site root at /. Styled v1.
// A lean, premium SHOWCASE ROUTER: brand hero (depth thesis, NO game vocabulary,
// NO AI in the hero), game-agnostic routing tiles (the signature element) +
// segmented pulse driven by lib/network/rootGames.js (keyed by game_slug),
// reserved slots for future workstreams, a light join-free affordance, and a
// neutral footer where AI is whispered as the engine.
//
// CUTOVER: this replaced the Marathon homepage at /, which now lives at /marathon.
// Indexed, self-canonical apex. See docs/network/cyberneticpunks-brand-positioning.md.
//
// STYLING: drives off the codebase design tokens (app/globals.css :root vars +
// .cp-* utilities). The ONLY injected colors are the two per-game accents, read
// from rootGames.js config (single-source, swappable); everything else is neutral
// tokens. Accent is restrained to tile spines, the live online-count, and the
// live dot -- no glow/fill (avoids the dark-bg + neon AI-default look). Character
// comes from the Orbitron / Rajdhani / mono type hierarchy + structure.
//
// Game-specific vocabulary (Cradle, shells, loadout, FOB, Season 2, etc.) MUST
// NOT appear in the root's own copy. Game NAMES on tiles/columns and a game's own
// content inside its segmented column are correct (routing + segmentation).
//
// The neutral root deliberately does NOT reuse components/Footer.js (that footer
// carries Marathon vocabulary); a minimal neutral footer is rendered here.

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getLiveStats } from '@/lib/liveStats';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import GameRoutingTile from '@/components/network/GameRoutingTile';
import GamePulseColumn from '@/components/network/GamePulseColumn';

// ── METADATA ────────────────────────────────────────────────
// Neutral, network-level title (the layout title.template appends the site name;
// no manual append here). Real brand-level description for the SERP pitch.
// Indexed (inherits the layout's robots:index) with a self-referential canonical
// to the apex -- this is the network root's own canonical home.
export const metadata = {
  title: 'Extraction-Shooter Intelligence Network',
  description: 'CyberneticPunks is the extraction-shooter intelligence network - the deepest, most current intel, build tools, and creator coverage across every extraction shooter we cover.',
  alternates: { canonical: 'https://cyberneticpunks.com' },
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
// (12h cycles at 00:00 + 12:00 UTC, the Marathon editorial cadence). Page-side
// resolver so the tile component stays data-agnostic.
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

  var liveStats = null;
  try { liveStats = await getLiveStats(); } catch (e) { liveStats = null; }
  var nextUpd = nextUpdateLabel();

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

// VANTAGE's latest surfaced framing. Reads the most recent NON-skipped
// network_brief row (network-scoped, no game_slug). Null when none exists or the
// latest cycle was skipped -> the voice slot stays in its clean reserved state.
// Read-only here; generation lives in /api/network-editor.
async function getNetworkVoice() {
  try {
    var { data } = await supabase
      .from('network_brief')
      .select('hero_line, brief, created_at')
      .eq('skipped', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data || null;
  } catch (e) {
    return null;
  }
}

// Brand entity + site structured data. Organization + WebSite ONLY (brand-level);
// no game-specific structured data on the root (that belongs on hubs/articles).
// Name matches the site-wide entity ("CyberneticPunks") so Google sees ONE entity.
// No SearchAction (there is no site-search endpoint to point at).
const JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CyberneticPunks',
    url: 'https://cyberneticpunks.com',
    logo: 'https://cyberneticpunks.com/icon-512.png',
    sameAs: ['https://x.com/Cybernetic87250'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CyberneticPunks',
    url: 'https://cyberneticpunks.com',
  },
];

export default async function NetworkPreview() {
  var [data, voice] = await Promise.all([getNetworkPulse(), getNetworkVoice()]);

  return (
    <div className="nr-page">
      {JSONLD.map(function(node, i) {
        return <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }} />;
      })}

      <style>{NR_CSS}</style>

      {/* ══ BRAND BANNER ══ */}
      <header className="nr-header">
        <div className="nr-wrap nr-header-row">
          <div className="nr-brand">
            <span className="nr-brand-dot" aria-hidden="true" />
            <span className="nr-brand-name">CYBERNETIC<span className="nr-brand-accent">PUNKS</span></span>
          </div>
          <Link href="#" className="nr-join">JOIN FREE</Link>
        </div>
      </header>

      <main className="nr-wrap nr-main">

        {/* ══ HERO ══ (thesis; no game vocab, no AI) */}
        <section className="nr-hero" aria-labelledby="nr-thesis">
          <h1 id="nr-thesis" className="nr-h1">
            The deepest, most current intel in every extraction shooter
          </h1>
          <p className="nr-descriptor">The extraction-shooter intelligence network</p>
          <p className="nr-offer">
            Intel hubs, build tools, and creator coverage - across every extraction shooter we cover.
          </p>

          {/* NETWORK-VOICE slot: VANTAGE's hero framing when present; otherwise the
              clean reserved placeholder (graceful, like the tile-art fallback). */}
          {voice && voice.hero_line ? (
            <div className="nr-voice">
              <span className="nr-voice-byline">
                <span className="nr-voice-dot" aria-hidden="true" />
                Vivian Cross / Vantage <span className="nr-voice-role">Network Editor</span>
              </span>
              <p className="nr-voice-line">{voice.hero_line}</p>
            </div>
          ) : (
            <div className="nr-reserved nr-reserved-wide" role="note" aria-label="Reserved: network voice">
              <span className="nr-reserved-label">Reserved</span>
              <span className="nr-reserved-text">network voice</span>
            </div>
          )}
        </section>

        {/* ══ ROUTING TILES ══ (signature; game-agnostic, one per ROOT_GAMES entry) */}
        <nav className="nr-section" aria-label="Game hubs">
          <h2 className="nr-h2">Choose your zone</h2>
          <div className="nr-grid nr-stagger">
            {ROOT_GAMES.map(function(game) {
              return <GameRoutingTile key={game.slug} game={game} pulse={data.pulse[game.slug]} />;
            })}
          </div>
        </nav>

        {/* ══ GAME-SEGMENTED PULSE ══ (per-game columns, never blended) */}
        <section className="nr-section" aria-labelledby="nr-pulse-h">
          <h2 id="nr-pulse-h" className="nr-h2">Network pulse</h2>
          {/* VANTAGE's optional cross-game brief -- present only when there is real
              movement; gracefully absent otherwise. Points at the per-game columns
              below, never duplicates them. */}
          {voice && voice.brief && (
            <div className="nr-brief">
              <span className="nr-brief-byline">Network brief - Vantage</span>
              <p className="nr-brief-text">{voice.brief}</p>
            </div>
          )}
          <div className="nr-pulse-grid nr-stagger">
            {ROOT_GAMES.map(function(game) {
              return <GamePulseColumn key={game.slug} game={game} items={data.feeds[game.slug]} />;
            })}
          </div>
        </section>

      </main>

      {/* ══ NEUTRAL FOOTER ══ (whispered AI line; no game vocabulary) */}
      <footer className="nr-footer">
        <div className="nr-wrap">
          <p className="nr-footer-tag">Cybernetic Punks - the extraction-shooter intelligence network. No hype. Just intel.</p>
          <p className="nr-footer-ai">powered by a live intelligence pipeline - updated continuously, verified against patch data</p>
        </div>
      </footer>
    </div>
  );
}

// ── STYLES ──────────────────────────────────────────────────
// All colors are design tokens (var(--*)); the only per-game accents are injected
// inline from rootGames.js config. Motion, hover, :focus-visible, reduced-motion,
// and responsive collapse are centralized here.
const NR_CSS = `
/* --nr-vantage: VANTAGE's own network-level accent (silver-blue / platinum per
   the persona spec -- distinct from the game accents and the editor palette).
   v1 starting value, single-source here; exact hex pinned at the styling pass. */
.nr-page { background: var(--bg-page); min-height: 100vh; display: flex; flex-direction: column; --nr-vantage: #c8d4e0; }
.nr-wrap { width: 100%; max-width: 1080px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }

/* Brand banner */
.nr-header { border-bottom: 1px solid var(--border-subtle); background: var(--bg-nav); }
.nr-header-row { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; padding-bottom: 16px; }
.nr-brand { display: flex; align-items: center; gap: 9px; }
.nr-brand-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--red); flex-shrink: 0; }
.nr-brand-name { font-family: var(--font-orbitron); font-size: 15px; font-weight: 800; letter-spacing: 3px; color: var(--text-primary); }
.nr-brand-accent { color: var(--red); }
.nr-join { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: var(--text-secondary); text-decoration: none; border: 1px solid var(--border); border-radius: 2px; padding: 7px 14px; transition: color .15s ease, border-color .15s ease; }
.nr-join:hover { color: var(--text-primary); border-color: var(--text-tertiary); }

/* Main rhythm */
.nr-main { flex: 1; display: flex; flex-direction: column; gap: 56px; padding-top: 64px; padding-bottom: 56px; }

/* Hero */
.nr-hero { display: flex; flex-direction: column; gap: 16px; }
/* Thesis: a confident single line, not a slogan-wall. Sized DOWN to sit just
   below the signature online-count (40px) so the tiles + live data lead; min/max
   track the existing scale (offer 16px floor -> ~30px lead), not a one-off value.
   Wider max-width lets it form 1-2 lines instead of the old narrow multi-line wall. */
.nr-h1 { font-family: var(--font-orbitron); font-weight: 900; letter-spacing: -0.3px; line-height: 1.2; font-size: clamp(20px, 3vw, 30px); color: var(--text-primary); margin: 0; max-width: 52ch; }
.nr-descriptor { font-family: var(--font-mono); font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text-secondary); margin: 0; }
.nr-offer { font-size: 16px; font-weight: 500; line-height: 1.5; color: var(--text-secondary); margin: 0; max-width: 56ch; }

/* Reserved placeholders (intentional, not broken) */
.nr-reserved { display: inline-flex; align-items: center; gap: 8px; border: 1px dashed var(--border); border-radius: 3px; padding: 10px 13px; background: linear-gradient(0deg, rgba(255,255,255,0.012), rgba(255,255,255,0.012)); }
.nr-reserved-wide { margin-top: 6px; align-self: flex-start; }
.nr-reserved-label { font-family: var(--font-mono); font-size: 8px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-secondary); border: 1px solid var(--border); border-radius: 2px; padding: 2px 6px; }
.nr-reserved-text { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-tertiary); }

/* VANTAGE network voice (hero) + cross-game brief (pulse). Her own accent spine;
   restrained, framing surfaces -- they point, never assert. */
.nr-voice { display: flex; flex-direction: column; gap: 7px; margin-top: 6px; align-self: stretch; padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--border); border-left: 2px solid var(--nr-vantage); border-radius: 3px; }
.nr-voice-byline { display: flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--nr-vantage); }
.nr-voice-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--nr-vantage); flex-shrink: 0; }
.nr-voice-role { color: var(--text-tertiary); }
.nr-voice-line { font-size: 16px; font-weight: 500; line-height: 1.5; color: var(--text-primary); margin: 0; }
.nr-brief { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--border); border-left: 2px solid var(--nr-vantage); border-radius: 3px; }
.nr-brief-byline { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--nr-vantage); }
.nr-brief-text { font-size: 13px; font-weight: 500; line-height: 1.5; color: var(--text-secondary); margin: 0; }

/* Sections */
.nr-section { display: flex; flex-direction: column; gap: 18px; }
.nr-h2 { font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: var(--text-secondary); margin: 0; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle); }

/* Grids */
.nr-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.nr-pulse-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }

/* ── SIGNATURE: routing tiles ── */
.nr-tile { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 18px; min-height: 188px; padding: 22px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 3px; text-decoration: none; transition: transform .16s ease, border-color .16s ease, background .16s ease; }
.nr-tile:hover { transform: translateY(-2px); background: var(--bg-card-hover); border-color: var(--text-disabled); }
/* Optional atmosphere art: image layer + a strong neutral scrim (rgb = --bg-page
   #121418) so the spine, label, and live count stay legible; the live count
   remains the boldest element. Content sits above via z-index. */
.nr-tile-art { position: absolute; inset: 0; z-index: 0; background-size: cover; background-position: center; }
.nr-tile-art::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(18,20,24,0.80) 0%, rgba(18,20,24,0.60) 48%, rgba(18,20,24,0.90) 100%); }
.nr-tile-head, .nr-tile-body, .nr-enter { position: relative; z-index: 1; }
.nr-tile-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.nr-tile-label { font-family: var(--font-orbitron); font-size: 22px; font-weight: 900; letter-spacing: 1px; line-height: 1; color: var(--text-primary); margin: 0; }
.nr-tile-body { flex: 1; display: flex; flex-direction: column; gap: 12px; justify-content: center; }
.nr-online { display: flex; align-items: baseline; gap: 9px; }
.nr-dot { align-self: center; animation: pulse-glow 2.4s ease-in-out infinite; }
.nr-online-num { font-family: var(--font-orbitron); font-size: 40px; font-weight: 900; line-height: 0.9; letter-spacing: -0.5px; }
.nr-unit { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-secondary); }
.nr-next { display: flex; align-items: baseline; gap: 8px; }
.nr-next-val { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--text-primary); }
.nr-prelaunch { font-family: var(--font-mono); font-size: 12px; font-weight: 700; letter-spacing: 0.5px; color: var(--text-secondary); }
.nr-enter { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; color: var(--text-tertiary); transition: color .16s ease; }
.nr-tile:hover .nr-enter { color: var(--text-secondary); }

/* ── Pulse columns ── alive via our own editor content (not an afterthought):
   weightier spacing, legible headlines, editor-accent codename tags, and
   freshness as a live signal. Restraint held: editor-accent on the tags is the
   only new color; everything else stays neutral tokens. */
.nr-col { display: flex; flex-direction: column; gap: 14px; padding: 18px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 3px; }
.nr-col-head { display: flex; align-items: center; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle); }
.nr-col-marker { width: 8px; height: 8px; border-radius: 1px; flex-shrink: 0; }
.nr-col-title { font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text-secondary); margin: 0; }
.nr-col-all { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1px; color: var(--text-tertiary); text-decoration: none; margin-left: auto; transition: color .15s ease; }
.nr-col-all:hover { color: var(--text-secondary); }
.nr-col-body { display: flex; flex-direction: column; gap: 10px; flex: 1; }
.nr-row { display: block; text-decoration: none; padding: 12px 13px; background: var(--bg-page); border: 1px solid var(--border); border-left: 2px solid transparent; border-radius: 2px; transition: border-color .15s ease, background .15s ease; }
.nr-row:hover { background: var(--bg-card-hover); border-left-color: var(--text-tertiary); }
.nr-row-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
/* Editor codename tag (color/symbol injected inline from the roster). */
.nr-tag { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; line-height: 1.5; padding: 2px 7px; border: 1px solid var(--border); border-radius: 2px; color: var(--text-secondary); }
.nr-tag-sym { font-size: 10px; line-height: 1; }
/* Freshness: a live signal, not fine print. */
.nr-row-when { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-secondary); margin-left: auto; }
.nr-row-headline { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 14px; font-weight: 600; line-height: 1.4; color: var(--text-primary); }
.nr-col-empty, .nr-col-prelaunch { font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: var(--text-tertiary); }

/* Footer */
.nr-footer { border-top: 1px solid var(--border-subtle); background: var(--bg-nav); padding-top: 22px; padding-bottom: 22px; }
.nr-footer-tag { font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--text-secondary); margin: 0 0 7px; }
.nr-footer-ai { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1px; color: var(--text-tertiary); margin: 0; }

/* Load-in (once), staggered across grid children */
@keyframes nrIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.nr-stagger > * { animation: nrIn .45s ease both; }
.nr-stagger > *:nth-child(2) { animation-delay: .07s; }
.nr-stagger > *:nth-child(3) { animation-delay: .14s; }
.nr-stagger > *:nth-child(4) { animation-delay: .21s; }

/* Keyboard focus (game-neutral ring) */
.nr-tile:focus-visible, .nr-row:focus-visible, .nr-col-all:focus-visible, .nr-join:focus-visible {
  outline: 2px solid rgba(255,255,255,0.7); outline-offset: 2px;
}

/* Respect reduced motion: kill load-in, hover transforms, dot pulse */
@media (prefers-reduced-motion: reduce) {
  .nr-stagger > * { animation: none !important; }
  .nr-tile, .nr-enter, .nr-row, .nr-join, .nr-col-all { transition: none !important; }
  .nr-tile:hover { transform: none !important; }
  .nr-dot { animation: none !important; }
}

/* Mobile collapse */
@media (max-width: 640px) {
  .nr-grid, .nr-pulse-grid { grid-template-columns: 1fr; }
  .nr-main { gap: 44px; padding-top: 44px; }
  .nr-online-num { font-size: 34px; }
}
`;
