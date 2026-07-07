// app/page.js
// NEUTRAL ROOT (network front door) -- the LIVE site root at /. Styled v2.
// A lean, premium SHOWCASE ROUTER: brand hero (eyebrow -> depth thesis -> offer
// -> live telemetry proof; NO game vocabulary, NO AI in the hero), game-agnostic
// routing tiles (the signature element) + segmented pulse driven by
// lib/network/rootGames.js (keyed by game_slug), the network editor's voice
// (Vantage), a light join-free affordance, and a neutral footer where AI is
// whispered as the engine.
//
// CUTOVER: this replaced the Marathon homepage at /, which now lives at /marathon.
// Indexed, self-canonical apex. See docs/network/cyberneticpunks-brand-positioning.md.
//
// STYLING (v2 visual pass): depth/elevation + a faint ambient texture give warmth
// WITHOUT new hue -- the cool silver/platinum network identity is preserved. All
// colors are design tokens (globals.css :root vars); the ONLY injected colors are
// the two per-game accents (read from rootGames.js config) + the network's own
// silver accent (--nr-vantage). ~90% neutral; accent only where it carries meaning
// (brand dot, live dot, game spines, the live online-count, Vantage). Aliveness
// comes from REAL live data (telemetry bar + freshness timestamps) + the existing
// dot pulse -- no looping background animation. Character from the Orbitron /
// Rajdhani / mono type hierarchy + structure.
//
// Game-specific vocabulary (Cradle, shells, loadout, FOB, Season 2, Runners, etc.)
// MUST NOT appear in the root's own copy -- telemetry labels stay neutral
// (games / online / articles). Game NAMES on tiles/columns and a game's own
// content inside its segmented column are correct (routing + segmentation).
//
// The neutral root deliberately does NOT reuse components/Footer.js (that footer
// carries Marathon vocabulary); a minimal neutral footer is rendered here.

import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getLiveStats } from '@/lib/liveStats';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import { discourseHref } from '@/lib/discourse';
import { minutesToNextRun } from '@/lib/cronCadence';
import GameRoutingTile from '@/components/network/GameRoutingTile';
import GamePulseColumn from '@/components/network/GamePulseColumn';
import AccountMenu from '@/components/AccountMenu';
import NetworkSubscribeForm from '@/components/network/NetworkSubscribeForm';

// ── METADATA ────────────────────────────────────────────────
// Neutral, network-level title (the layout title.template appends the site name;
// no manual append here). Real brand-level description for the SERP pitch.
// Indexed (inherits the layout's robots:index) with a self-referential canonical
// to the apex -- this is the network root's own canonical home.
export const metadata = {
  title: 'Competitive-Shooter Intelligence Network',
  description: 'The competitive-shooter intelligence network - deep, verified intel for Marathon and extraction shooters. Every weapon, shell, and build analyzed deeper than anywhere else and verified against the live game.',
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

// Compact number (1.2K, 3.4M) for the live online count.
function formatNum(n) {
  if (n == null) return '--';
  if (n < 1000) return String(n);
  if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K';
  return (n / 1000000).toFixed(1) + 'M';
}

// Thousands separators for the article count (a real big number reads as a
// genuine depth flex). No locale dependency.
function addCommas(n) {
  if (n == null) return '--';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Next-update label for the editorial cadence. Cadence math is centralized in
// lib/cronCadence.js (single source anchored at 19:00 UTC, once daily).
function nextUpdateLabel() {
  var minsLeft = minutesToNextRun();
  var h = Math.floor(minsLeft / 60);
  var m = minsLeft % 60;
  return h > 0 ? h + 'h ' + m + 'm' : m + 'm';
}

// Resolve the live pulse (online count, next update, latest feed items) for the
// games that declare a live pulse. Pre-launch games need no query. Reads the SAME
// sources the /marathon page uses: getLiveStats() + feed_items.
async function getNetworkPulse() {
  var liveGames = ROOT_GAMES.filter(function(g) { return g.pulse.mode === 'live'; });
  var feedGames = ROOT_GAMES.filter(function(g) { return g.pulse.feed && g.pulse.feed.gameSlug; });
  var pulse = {};   // slug -> { online, nextUpdate }  (live games only -> tiles unchanged)
  var feeds = {};   // slug -> [{ headline, slug, editor, when, href }]

  var liveStats = null;
  try { liveStats = await getLiveStats(); } catch (e) { liveStats = null; }
  var nextUpd = nextUpdateLabel();

  // Live pulse (online count + next update) -- LIVE games only. Pre-launch games
  // (DMZ) get no pulse entry, so GameRoutingTile renders exactly as before.
  liveGames.forEach(function(g) {
    var online = null;
    if (liveStats && g.pulse.onlineSource && liveStats[g.pulse.onlineSource]) {
      online = liveStats[g.pulse.onlineSource].value;
    }
    pulse[g.slug] = { online: online, nextUpdate: nextUpd };
  });

  // Feed columns -- ANY game that declares a feed scope (live OR pre-launch), so
  // published DMZ articles surface in its pulse column while the tile stays
  // pre-launch. SAME select/filters/order/limit as before. Each row is mapped
  // through the game's articleHref; a null href (unmapped slug) is dropped so the
  // column never dead-links.
  await Promise.all(feedGames.map(async function(g) {
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
        var href = g.pulse.articleHref ? g.pulse.articleHref(it.slug) : ('/intel/' + it.slug);
        return { headline: it.headline, slug: it.slug, editor: it.editor, when: timeAgo(it.created_at), href: href };
      }).filter(function(it) { return it.href; });
    } catch (e) {
      feeds[g.slug] = [];
    }
  }));

  return { pulse: pulse, feeds: feeds };
}

// NETWORK-LEVEL telemetry: total published article count + the latest publish
// timestamp across ALL games (network-wide depth + freshness). Cheap: one head
// count + one 1-row read. Game-agnostic (no per-game filter). force-dynamic.
async function getNetworkStats() {
  var out = { articles: null, updated: null };
  try {
    var { count } = await supabase
      .from('feed_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true);
    out.articles = typeof count === 'number' ? count : null;
  } catch (e) {}
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    out.updated = data && data.created_at ? data.created_at : null;
  } catch (e) {}
  return out;
}

// VANTAGE's latest surfaced framing. Reads the most recent NON-skipped
// network_brief row (network-scoped, no game_slug). Null when none exists or the
// latest cycle was skipped -> the voice slot shows its teaching placeholder.
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

// NETWORK DESK feed: VANTAGE's PUBLISHED discourse articles across ALL games,
// newest first, surfaced on the root under her brief. is_published=true +
// tags-array-contains 'discourse' (drafts never appear here). Each row links to
// its CANONICAL HOME via discourseHref (marathon -> /intel/<slug>, dmz ->
// /dmz/discourse/<slug>); a null href (unknown game) is dropped so a card never
// dead-links. Empty result -> the section renders nothing (no empty box).
async function getNetworkDeskFeed() {
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('headline, slug, game_slug, created_at, creator_info, tags')
      .eq('is_published', true)
      .contains('tags', ['discourse'])
      .order('created_at', { ascending: false })
      .limit(6);
    return (data || []).map(function(it) {
      return {
        headline: it.headline,
        slug: it.slug,
        game_slug: it.game_slug,
        when: timeAgo(it.created_at),
        creator: (it.creator_info && it.creator_info.name) || null,
        href: discourseHref(it),
      };
    }).filter(function(it) { return it.href; });
  } catch (e) {
    return [];
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

export default async function NetworkRoot() {
  var [data, voice, stats, deskFeed] = await Promise.all([getNetworkPulse(), getNetworkVoice(), getNetworkStats(), getNetworkDeskFeed()]);

  // Network telemetry (game-agnostic). online = sum across live games' pulses.
  var onlineTotal = 0;
  var anyOnline = false;
  ROOT_GAMES.forEach(function(g) {
    var p = data.pulse[g.slug];
    if (p && typeof p.online === 'number') { onlineTotal += p.online; anyOnline = true; }
  });
  var updatedLabel = stats.updated ? timeAgo(stats.updated) : null;
  var teleItems = [
    { label: 'GAMES', value: String(ROOT_GAMES.length) },
    anyOnline ? { label: 'ONLINE', value: formatNum(onlineTotal) } : null,
    stats.articles != null ? { label: 'REPORTS', value: addCommas(stats.articles) } : null,
    updatedLabel ? { label: 'UPDATED', value: updatedLabel } : null,
    { label: 'NEXT DROP', value: nextUpdateLabel() },
  ].filter(Boolean);

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
            <span className="nr-brand-name">CYBERNETIC <span className="nr-brand-accent">PUNKS</span></span>
          </div>
          <AccountMenu align="right" />
        </div>
      </header>

      <main className="nr-main">

        {/* ══ HERO BAND ══ (eyebrow -> thesis -> offer -> live proof; depth + faint texture) */}
        <section className="nr-hero-band" aria-labelledby="nr-thesis">
          <div className="nr-ambient" aria-hidden="true" />
          <div className="nr-wrap nr-hero">
            {/* Broadcast top row: mono network label (the eyebrow) + LIVE pill.
                The LIVE moment lives here now (removed from the telemetry bar) so
                there is a single, high-contrast live signal. */}
            <div className="nr-hero-top">
              <p className="nr-eyebrow">No hype. Just intel.</p>
              <span className="nr-livepill"><span className="nr-livepill-dot" aria-hidden="true" />LIVE</span>
            </div>
            <p className="nr-kicker">Everyone has opinions. We have the data.</p>
            <h1 id="nr-thesis" className="nr-h1">
              The intelligence network for competitive shooters.
            </h1>
            <p className="nr-subhead">
              Human-verified intel across every game you grind. No hype, just data.
            </p>
            {/* Secondary tagline (reuses the kicker style -- no new styling). Moved
                here from the H1 slot; Justin to decide keep/drop next pass after
                seeing the new headline in place. */}
            <p className="nr-kicker">Where the serious players check first.</p>
            <div className="nr-cta-row">
              <a href="#nr-subscribe" className="nr-cta nr-cta-primary">Get intel drops</a>
              <a href="#nr-zones" className="nr-cta nr-cta-secondary">Explore the network</a>
            </div>
            <div className="nr-pitch">
              <ul className="nr-points">
                <li className="nr-point">
                  <span className="nr-point-tick" aria-hidden="true" />
                  <span className="nr-point-text"><span className="nr-point-lead">Verified against the live game</span><span className="nr-point-clause"> — every stat checked in-game, never scraped</span></span>
                </li>
                <li className="nr-point">
                  <span className="nr-point-tick" aria-hidden="true" />
                  <span className="nr-point-text"><span className="nr-point-lead">An engine that never sleeps</span><span className="nr-point-clause"> — every weapon, shell, and patch tracked</span></span>
                </li>
                <li className="nr-point">
                  <span className="nr-point-tick" aria-hidden="true" />
                  <span className="nr-point-text"><span className="nr-point-lead">Analyzed deeper than anywhere else</span><span className="nr-point-clause"> — the most thorough intel in the genre</span></span>
                </li>
                <li className="nr-point">
                  <span className="nr-point-tick" aria-hidden="true" />
                  <span className="nr-point-text"><span className="nr-point-lead">No hype. Just intel.</span><span className="nr-point-clause"> — the standard others can&apos;t match</span></span>
                </li>
              </ul>
            </div>

            {/* LIVE TELEMETRY -- the centerpiece. Network-level, game-agnostic.
                ONLINE gets the one accent color; every other stat stays quiet. */}
            <div className="nr-telemetry" role="group" aria-label="Live network status">
              {teleItems.map(function(it) {
                return (
                  <span key={it.label} className={'nr-tele-item' + (it.label === 'ONLINE' ? ' nr-tele-accent' : '')}>
                    <span className="nr-tele-val">{it.value}</span>
                    <span className="nr-tele-label">{it.label}</span>
                  </span>
                );
              })}
            </div>

            {/* NETWORK VOICE (Vantage) -- featured editorial callout when filled
                (the default once her cron runs); a teaching placeholder otherwise
                so the slot reads as a known feature, never unfinished. */}
            {voice && voice.hero_line ? (
              <figure className="nr-voice">
                <figcaption className="nr-voice-byline">
                  <span className="nr-voice-dot" aria-hidden="true" />
                  Vivian Cross / Vantage <span className="nr-voice-role">Network editor</span>
                </figcaption>
                <blockquote className="nr-voice-line">{voice.hero_line}</blockquote>
                {voice.brief && <p className="nr-voice-brief">{voice.brief}</p>}
              </figure>
            ) : (
              <div className="nr-voice nr-voice-empty" role="note" aria-label="Network editor briefing">
                <span className="nr-voice-byline">
                  <span className="nr-voice-dot" aria-hidden="true" />
                  Vantage <span className="nr-voice-role">Network Editor</span>
                </span>
                <p className="nr-voice-line nr-voice-teaching">The network editor&apos;s read on what is moving posts here each cycle.</p>
              </div>
            )}

            {/* NETWORK DESK -- Vantage's PUBLISHED discourse across games, directly
                under her brief. Only published pieces surface (drafts never); each
                links to its canonical subject-game home. Renders nothing when empty
                (no box), so it only appears once there is real coverage. */}
            {deskFeed.length > 0 && (
              <section className="nr-desk" aria-label="From the network desk">
                <div className="nr-desk-head">
                  <span className="nr-desk-tick" aria-hidden="true" />
                  <span className="nr-desk-label">From the network desk</span>
                </div>
                <ul className="nr-desk-list">
                  {deskFeed.map(function(a) {
                    return (
                      <li key={a.slug}>
                        <Link href={a.href} className="nr-desk-row">
                          <span className="nr-desk-meta">
                            <span className="nr-desk-game">{a.game_slug}</span>
                            {a.creator && <span className="nr-desk-creator">on {a.creator}</span>}
                            <span className="nr-desk-when">{a.when}</span>
                          </span>
                          <span className="nr-desk-headline">{a.headline}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </section>

        {/* ══ BODY ══ */}
        <div className="nr-wrap nr-body">

          {/* ROUTING TILES (signature; game-agnostic, one per ROOT_GAMES entry) */}
          <nav id="nr-zones" className="nr-section" aria-label="Game hubs">
            <h2 className="nr-h2"><span className="nr-h2-tick" aria-hidden="true" />Choose your game</h2>
            <div className="nr-grid nr-stagger">
              {ROOT_GAMES.map(function(game) {
                return <GameRoutingTile key={game.slug} game={game} pulse={data.pulse[game.slug]} />;
              })}
            </div>
          </nav>

          {/* GAME-SEGMENTED PULSE (per-game columns, never blended) */}
          <section className="nr-section" aria-labelledby="nr-pulse-h">
            <h2 id="nr-pulse-h" className="nr-h2">
              <span className="nr-h2-tick" aria-hidden="true" />Network pulse
              {updatedLabel && <span className="nr-h2-meta">updated {updatedLabel}</span>}
            </h2>
            {/* Vantage's cross-game brief now lives in the featured hero callout
                (with her hero line); the pulse section stays the per-game columns. */}
            <div className="nr-pulse-grid nr-stagger">
              {ROOT_GAMES.map(function(game) {
                return <GamePulseColumn key={game.slug} game={game} items={data.feeds[game.slug]} />;
              })}
            </div>
          </section>

          {/* TOOLS ROW -- the search-strength reference pages (these are the pages
              that actually rank). Real links, game-agnostic network utilities. */}
          <section className="nr-section" aria-labelledby="nr-tools-h">
            <h2 id="nr-tools-h" className="nr-h2"><span className="nr-h2-tick" aria-hidden="true" />Tools &amp; references</h2>
            <div className="nr-tools nr-stagger">
              {[
                { href: '/meta',        glyph: '◈', label: 'Tier list',     sub: 'Weapons & shells ranked' },
                { href: '/leaderboard', glyph: '▲', label: 'Leaderboard',   sub: 'Top runners tracked' },
                { href: '/status',      glyph: '●', label: 'Server status',  sub: 'Player activity & errors' },
                { href: '/player-count',glyph: '◱', label: 'Player count',   sub: 'Live Steam concurrents' },
                { href: '/weapons',     glyph: '▣', label: 'Weapons',        sub: 'Every stat, every gun' },
              ].map(function(t) {
                return (
                  <Link key={t.href} href={t.href} className="nr-tool">
                    <span className="nr-tool-glyph" aria-hidden="true">{t.glyph}</span>
                    <span className="nr-tool-text">
                      <span className="nr-tool-label">{t.label}</span>
                      <span className="nr-tool-sub">{t.sub}</span>
                    </span>
                    <span className="nr-tool-arrow" aria-hidden="true">&rarr;</span>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ABOUT THE NETWORK -- short blurb + link to the full /about page.
              Server-rendered, crawlable. Network accent (red) on the link only. */}
          <section className="nr-section" aria-labelledby="nr-about-h">
            <h2 id="nr-about-h" className="nr-h2"><span className="nr-h2-tick" aria-hidden="true" />What is Cybernetic Punks?</h2>
            <div className="nr-about">
              <p className="nr-about-body">
                An intelligence network for competitive shooters &mdash; Marathon now, Call of Duty&apos;s DMZ next, more to come. Every stat is verified against the live game, never scraped or guessed. Our editorial desk tracks the meta, builds, and economy of each game around the clock, so you get first-party intel that general-purpose AI can&apos;t replicate. No hype. Just intel.
              </p>
              <Link href="/about" className="nr-about-link">How the network works &rarr;</Link>
            </div>
          </section>

          {/* SUBSCRIBE -- network-level email capture (shared list, source-tagged). */}
          <section id="nr-subscribe" className="nr-section" aria-labelledby="nr-sub-h">
            <h2 id="nr-sub-h" className="nr-h2"><span className="nr-h2-tick" aria-hidden="true" />Get intel drops</h2>
            <div className="nr-subscribe">
              <div className="nr-subscribe-copy">
                <p className="nr-subscribe-lead">One email when the meta moves.</p>
                <p className="nr-subscribe-clause">Network-wide intel across every game we cover. No spam, no hype &mdash; just the drops that matter.</p>
              </div>
              <NetworkSubscribeForm />
            </div>
          </section>

        </div>
      </main>

      {/* ══ NEUTRAL FOOTER ══ (whispered AI line; no game vocabulary) */}
      <footer className="nr-footer">
        <div className="nr-wrap">
          <p className="nr-footer-tag">
            <span className="nr-footer-dot" aria-hidden="true" />
            Cybernetic Punks - the competitive-shooter intelligence network. No hype. Just intel.
          </p>
          <p className="nr-footer-ai">powered by a live intelligence pipeline - updated continuously, verified against patch data</p>
          <Link href="/about" className="nr-footer-link">About the network &rarr;</Link>
        </div>
      </footer>
    </div>
  );
}

// ── STYLES ──────────────────────────────────────────────────
// All colors are design tokens (var(--*)); the only injected accents are the
// per-game accents (inline, from rootGames.js config) and the network's silver
// (--nr-vantage). Depth via --nr-elev + inset highlights. Motion, hover,
// :focus-visible, reduced-motion, and responsive collapse are centralized here.
const NR_CSS = `
/* NETWORK PALETTE (two tiers, restrained):
   - The RED brand accent (var(--red), CP red from the logo) carries the few
     "pops": the LIVE pill, the ONLINE stat, and the primary CTA -- alongside the
     pre-existing brand dot / wordmark / footer dot. This replaced Marathon's green
     so the network no longer reads as a Marathon site.
   - --nr-vantage stays the quiet, NEUTRAL structural accent (silver) for the many
     small ticks/borders/bylines, so red does not blanket the page (restraint).
   Neither is a per-game color: Marathon green + DMZ forest come from
   game.theme.primary and are never recolored here. */
.nr-page { background: var(--bg-page); min-height: 100vh; display: flex; flex-direction: column; --nr-vantage: #c8d4e0; --nr-elev: 0 3px 16px rgba(0,0,0,0.30); }
.nr-wrap { width: 100%; max-width: 1080px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }

/* Brand banner */
.nr-header { border-bottom: 1px solid var(--border-subtle); background: var(--bg-nav); }
.nr-header-row { display: flex; align-items: center; justify-content: space-between; padding-top: 16px; padding-bottom: 16px; }
.nr-brand { display: flex; align-items: center; gap: 9px; }
.nr-brand-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--red); flex-shrink: 0; }
.nr-brand-name { font-family: var(--font-orbitron); font-size: 15px; font-weight: 800; letter-spacing: 3px; color: var(--text-primary); }
.nr-brand-accent { color: var(--red); }
.nr-join { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1.5px; color: var(--text-secondary); text-decoration: none; border: 1px solid var(--border); border-radius: 2px; padding: 7px 14px; transition: color .15s ease, border-color .15s ease, background .15s ease; }
.nr-join:hover { color: var(--text-primary); border-color: var(--text-tertiary); background: var(--bg-card); }

.nr-main { flex: 1; }

/* ── HERO BAND ── recessed gradient + faint static ambient texture (depth, no hue) */
.nr-hero-band { position: relative; overflow: hidden; background: linear-gradient(180deg, var(--bg-nav) 0%, var(--bg-page) 100%); border-bottom: 1px solid var(--border-subtle); padding-top: 56px; padding-bottom: 44px; }
.nr-ambient { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.nr-ambient::before { content: ""; position: absolute; inset: 0; background-image: radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px); background-size: 30px 30px; -webkit-mask-image: linear-gradient(180deg, #000 0%, transparent 85%); mask-image: linear-gradient(180deg, #000 0%, transparent 85%); }
.nr-ambient::after { content: ""; position: absolute; top: -140px; right: -110px; width: 460px; height: 460px; border: 1px solid rgba(255,255,255,0.03); transform: rotate(45deg); }
.nr-hero { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 18px; align-items: flex-start; }

/* Broadcast top row -- mono network label (eyebrow) left, LIVE pill right. */
.nr-hero-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; width: 100%; }
.nr-eyebrow { font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 2.5px; text-transform: uppercase; color: var(--text-secondary); margin: 0; }
.nr-eyebrow::before { content: "// "; color: var(--nr-vantage); }
/* LIVE pill -- a red broadcast accent (var(--red), CP brand); everything else quiet. */
.nr-livepill { display: inline-flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 10px; font-weight: 800; letter-spacing: 2px; color: var(--red); background: var(--bg-nav); border: 1px solid var(--red); border-radius: 2px; padding: 4px 10px; }
.nr-livepill-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--red); box-shadow: 0 0 5px var(--red); animation: pulse-glow 2.4s ease-in-out infinite; }
/* Punchy short headline -> sized up to be the confident anchor of the hero
   (the strongest statement on the page); a tight max-width gives it a bold
   two-line stack on desktop, scaling down responsively via clamp. */
.nr-h1 { font-family: var(--font-orbitron); font-weight: 900; letter-spacing: -0.5px; line-height: 1.05; font-size: clamp(34px, 6vw, 58px); color: var(--text-primary); margin: 0; max-width: 18ch; }
/* Pitch: kicker lead-in + 4 differentiator bullets (designed, not a dash list).
   Small silver diamond ticks (accent = network identity); bold lead + muted
   clause per bullet; tight rhythm. Real ul/li; ticks are decorative. */
.nr-pitch { display: flex; flex-direction: column; gap: 12px; max-width: 62ch; }
/* Punchy positioning line (kept) directly under the H1; the plain-language
   subhead follows it for newcomer clarity. */
.nr-kicker { font-size: 18px; font-weight: 600; line-height: 1.4; color: var(--text-primary); margin: 0; }
.nr-subhead { font-size: clamp(15px, 2.2vw, 18px); font-weight: 500; line-height: 1.5; color: var(--text-secondary); margin: 0; max-width: 54ch; }
/* Hero CTAs: primary (red fill) + secondary (outline). Anchor links -> no JS. */
.nr-cta-row { display: flex; flex-wrap: wrap; gap: 12px; }
.nr-cta { font-family: var(--font-mono); font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none; padding: 12px 20px; border-radius: 3px; border: 1px solid var(--border); transition: transform .14s ease, border-color .14s ease, background .14s ease, color .14s ease; }
.nr-cta-primary { background: var(--red); border-color: var(--red); color: var(--text-primary); }
.nr-cta-primary:hover { transform: translateY(-1px); }
.nr-cta-secondary { background: transparent; color: var(--text-primary); }
.nr-cta-secondary:hover { border-color: var(--text-tertiary); background: var(--bg-card); }
.nr-points { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.nr-point { display: flex; align-items: flex-start; gap: 11px; }
.nr-point-tick { flex-shrink: 0; width: 6px; height: 6px; margin-top: 7px; border-radius: 1px; background: var(--nr-vantage); transform: rotate(45deg); }
.nr-point-text { font-size: 14px; line-height: 1.45; }
.nr-point-lead { color: var(--text-primary); font-weight: 700; }
.nr-point-clause { color: var(--text-secondary); }

/* ── LIVE TELEMETRY (centerpiece) ── elevated bar; dividers between items */
/* Bold mono stat strip -- darker recessed bar for contrast; ONLINE is the lone
   accent-colored stat, the rest stay primary/quiet. */
.nr-telemetry { display: flex; align-items: center; flex-wrap: wrap; gap: 0 18px; margin-top: 18px; padding: 16px 20px; background: var(--bg-nav); border: 1px solid var(--border); border-radius: 3px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), var(--nr-elev); }
.nr-tele-item { display: inline-flex; align-items: baseline; gap: 8px; padding-left: 18px; border-left: 1px solid var(--border-subtle); }
.nr-tele-item:first-child { padding-left: 0; border-left: 0; }
.nr-tele-val { font-family: var(--font-orbitron); font-size: 18px; font-weight: 900; letter-spacing: 0.3px; color: var(--text-primary); }
.nr-tele-accent .nr-tele-val { color: var(--red); }
.nr-tele-label { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-secondary); }

/* ── NETWORK VOICE (Vantage) ── featured callout; silver spine + quote */
.nr-voice { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; align-self: stretch; max-width: 760px; padding: 16px 18px; background: var(--bg-card-hover); border: 1px solid var(--border); border-left: 2px solid var(--nr-vantage); border-radius: 3px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), var(--nr-elev); }
.nr-voice-byline { display: flex; align-items: center; gap: 7px; font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--nr-vantage); }
.nr-voice-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--nr-vantage); flex-shrink: 0; }
.nr-voice-role { color: var(--text-tertiary); }
.nr-voice-line { font-size: 18px; font-weight: 500; line-height: 1.5; color: var(--text-primary); margin: 0; font-style: italic; }
.nr-voice-teaching { font-size: 14px; color: var(--text-tertiary); }
.nr-voice-empty { border-left-color: var(--border); }
/* Vantage's cross-game brief, featured directly under her hero line. */
.nr-voice-brief { font-size: 14px; font-weight: 500; line-height: 1.55; color: var(--text-secondary); margin: 0; }

/* ── NETWORK DESK feed ── Vantage's published discourse, under her brief. Network
   red chrome (spine + tick + hover) per the brand pass; neutral game tags. */
.nr-desk { display: flex; flex-direction: column; gap: 12px; margin-top: 12px; align-self: stretch; max-width: 760px; padding: 16px 18px; background: var(--bg-card-hover); border: 1px solid var(--border); border-left: 2px solid var(--red); border-radius: 3px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), var(--nr-elev); }
.nr-desk-head { display: flex; align-items: center; gap: 8px; }
.nr-desk-tick { width: 8px; height: 8px; border-radius: 1px; background: var(--red); flex-shrink: 0; }
.nr-desk-label { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-secondary); }
.nr-desk-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.nr-desk-row { display: block; text-decoration: none; padding: 11px 13px; background: var(--bg-page); border: 1px solid var(--border); border-left: 2px solid transparent; border-radius: 2px; transition: border-color .15s ease, background .15s ease; }
.nr-desk-row:hover { background: var(--bg-card-hover); border-left-color: var(--red); }
.nr-desk-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
.nr-desk-game { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-secondary); border: 1px solid var(--border); border-radius: 2px; padding: 1px 6px; line-height: 1.5; }
.nr-desk-creator { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: var(--text-tertiary); }
.nr-desk-when { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-secondary); margin-left: auto; }
.nr-desk-headline { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 14px; font-weight: 600; line-height: 1.4; color: var(--text-primary); }

/* ── SECTIONS ── header gets an accent tick + optional freshness meta */
.nr-body { display: flex; flex-direction: column; gap: 64px; padding-top: 56px; padding-bottom: 56px; }
.nr-section { display: flex; flex-direction: column; gap: 20px; }
.nr-h2 { display: flex; align-items: center; gap: 9px; font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: var(--text-secondary); margin: 0; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle); }
.nr-h2-tick { width: 9px; height: 9px; border-radius: 1px; background: var(--nr-vantage); flex-shrink: 0; }
.nr-h2-meta { margin-left: auto; font-size: 9px; font-weight: 700; letter-spacing: 1px; color: var(--text-tertiary); text-transform: none; }

/* Grids */
.nr-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); }
.nr-pulse-grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }

/* ── Tools row ── search-strength reference pages; compact link cards */
.nr-tools { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); }
.nr-tool { display: flex; align-items: center; gap: 13px; padding: 16px; background: var(--bg-card-hover); border: 1px solid var(--border); border-radius: 3px; text-decoration: none; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), var(--nr-elev); transition: transform .16s ease, border-color .16s ease; }
.nr-tool:hover { transform: translateY(-2px); border-color: var(--text-disabled); }
.nr-tool-glyph { font-size: 18px; line-height: 1; color: var(--nr-vantage); flex-shrink: 0; }
.nr-tool-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.nr-tool-label { font-family: var(--font-orbitron); font-size: 14px; font-weight: 800; letter-spacing: 0.3px; color: var(--text-primary); }
.nr-tool-sub { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.5px; color: var(--text-secondary); }
.nr-tool-arrow { font-family: var(--font-mono); font-size: 13px; color: var(--text-tertiary); flex-shrink: 0; transition: color .16s ease; }
.nr-tool:hover .nr-tool-arrow { color: var(--nr-vantage); }

/* ── Subscribe ── network email capture; elevated card, silver spine */
.nr-subscribe { display: flex; flex-direction: column; gap: 16px; padding: 22px; background: var(--bg-card-hover); border: 1px solid var(--border); border-left: 2px solid var(--nr-vantage); border-radius: 3px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), var(--nr-elev); }
.nr-subscribe-copy { display: flex; flex-direction: column; gap: 6px; }
.nr-subscribe-lead { font-family: var(--font-orbitron); font-size: 18px; font-weight: 800; color: var(--text-primary); margin: 0; }
.nr-subscribe-clause { font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); margin: 0; max-width: 60ch; }

/* ── About blurb ── short network summary + link to /about (crawlable) */
.nr-about { display: flex; flex-direction: column; gap: 14px; }
.nr-about-body { font-size: 15px; line-height: 1.7; color: var(--text-secondary); margin: 0; max-width: 74ch; }
.nr-about-link { align-self: flex-start; font-family: var(--font-mono); font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: var(--red); text-decoration: none; transition: opacity .15s ease; }
.nr-about-link:hover { opacity: 0.75; }

/* ── SIGNATURE: routing tiles ── (depth added; live count stays boldest) */
.nr-tile { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 18px; min-height: 188px; padding: 22px; background: var(--bg-card-hover); border: 1px solid var(--border); border-radius: 3px; text-decoration: none; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), var(--nr-elev); transition: transform .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease; }
.nr-tile:hover { transform: translateY(-2px); background: var(--bg-card-hover); border-color: var(--text-disabled); box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 6px 20px rgba(0,0,0,0.30); }
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

/* ── Pulse columns ── editor content; elevated; freshness as a live signal */
.nr-col { display: flex; flex-direction: column; gap: 14px; padding: 18px; background: var(--bg-card-hover); border: 1px solid var(--border); border-radius: 3px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), var(--nr-elev); }
.nr-col-head { display: flex; align-items: center; gap: 8px; padding-bottom: 10px; border-bottom: 1px solid var(--border-subtle); }
.nr-col-marker { width: 8px; height: 8px; border-radius: 1px; flex-shrink: 0; }
.nr-col-title { font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: var(--text-secondary); margin: 0; }
.nr-col-all { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1px; color: var(--text-tertiary); text-decoration: none; margin-left: auto; transition: color .15s ease; }
.nr-col-all:hover { color: var(--text-secondary); }
.nr-col-body { display: flex; flex-direction: column; gap: 10px; flex: 1; }
.nr-row { display: block; text-decoration: none; padding: 12px 13px; background: var(--bg-page); border: 1px solid var(--border); border-left: 2px solid transparent; border-radius: 2px; transition: border-color .15s ease, background .15s ease; }
.nr-row:hover { background: var(--bg-card-hover); border-left-color: var(--text-tertiary); }
.nr-row-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 7px; }
.nr-tag { display: inline-flex; align-items: center; gap: 4px; font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; line-height: 1.5; padding: 2px 7px; border: 1px solid var(--border); border-radius: 2px; color: var(--text-secondary); }
.nr-tag-sym { font-size: 10px; line-height: 1; }
.nr-row-when { font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-secondary); margin-left: auto; }
.nr-row-headline { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 14px; font-weight: 600; line-height: 1.4; color: var(--text-primary); }
.nr-col-empty, .nr-col-prelaunch { font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: var(--text-tertiary); }

/* ── Creator-coverage "incoming" panel (intentional, not a TODO) ── */
/* Reserved creator-coverage slot -- a subtle left accent + mono labels make it
   read as an intentional "incoming" slot, not a broken/empty box. */
.nr-coming { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 12px; background: var(--bg-page); border: 1px solid var(--border-subtle); border-left: 2px solid var(--border); border-radius: 2px; }
.nr-coming-label { font-family: var(--font-mono); font-size: 8px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-secondary); }
.nr-coming-soon { font-family: var(--font-mono); font-size: 8px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: var(--text-tertiary); border: 1px solid var(--border); border-radius: 2px; padding: 1px 6px; }
.nr-coming-text { flex-basis: 100%; font-size: 11px; line-height: 1.45; color: var(--text-tertiary); }

/* Footer */
.nr-footer { border-top: 1px solid var(--border-subtle); background: var(--bg-nav); padding-top: 22px; padding-bottom: 22px; }
.nr-footer-tag { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 11px; font-weight: 700; letter-spacing: 1px; color: var(--text-secondary); margin: 0 0 7px; }
.nr-footer-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--red); flex-shrink: 0; }
.nr-footer-ai { font-family: var(--font-mono); font-size: 9px; font-weight: 700; letter-spacing: 1px; color: var(--text-tertiary); margin: 0; }
.nr-footer-link { display: inline-block; margin-top: 10px; font-family: var(--font-mono); font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: var(--red); text-decoration: none; transition: opacity .15s ease; }
.nr-footer-link:hover { opacity: 0.75; }

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
  .nr-grid, .nr-pulse-grid, .nr-tools { grid-template-columns: 1fr; }
  .nr-body { gap: 40px; padding-top: 36px; }
  .nr-hero-band { padding-top: 40px; }
  .nr-online-num { font-size: 34px; }
  /* Telemetry: drop the dividers when wrapped tight so it reads as chips */
  .nr-telemetry { gap: 10px 16px; }
  .nr-tele-item { padding-left: 0; border-left: 0; }
  /* CTAs go full-width, stacked, so they are easy thumb targets */
  .nr-cta-row { flex-direction: column; align-items: stretch; }
  .nr-cta { text-align: center; }
}
`;
