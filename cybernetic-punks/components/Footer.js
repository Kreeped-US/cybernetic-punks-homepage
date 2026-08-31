'use client';
import { DISCORD_INVITE, DISPLAY_DISCORD } from '@/lib/socialLinks';

import Link from 'next/link';
import { useState } from 'react';
import { getAllEditors } from '@/lib/editors/roster';
import { getGameConfig } from '@/lib/games';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import { isGameLive } from '@/lib/network/gameStatus';

// Updated April 27, 2026:
// - Colors aligned to design system (#0e1014 footer / #ff2222 / #00d4ff)
// - Fonts standardized to Orbitron / system-ui / monospace
// - Glow removed from brand dot (design system says no glows except editor emblems)
// - Layout expanded to 4 columns (was 3) to surface missing discovery pages
// - Discovery column added: Rising Runners, Leaderboard, Stats, Factions, Sitrep, Status
// - Tagline standardized to one canonical form

// The NETWORK editor desk -- all 6 (roster.js EDITOR_ORDER), identical on every game's footer
// (the roster is a network asset, not per-game). LIVE editors get a lane/masthead chip + link;
// an 'incoming' editor (Broker -- no lane yet) renders DIMMED with a small "incoming" marker and
// is NOT linked. Compact chip shows the tag (proper case), not the raw uppercase codename.
// Phase 2 decision (b): Broker is now shown (dimmed); the footer no longer filters to live-only.
// The chip HREF is computed per game in the component (chipHref): Marathon links each live editor
// to its lane (/marathon/intel/<key>); the other games have no per-game lanes, so they link to the
// network editor masthead (/editors) -- Phase 3 decision (c).
const DESK = getAllEditors().map(function(e) {
  return {
    key: e.key, symbol: e.symbol, color: e.color, name: e.tag || e.fullName,
    status: e.status, live: e.status === 'live',
  };
});

// EXPLORE + DISCOVER links, the brand description, and the legal lines now come from each game's
// footer config (the footer object in lib/games/<game>.js), read via the game prop below. Marathon's
// values were copied VERBATIM from this file in Phase 1, so Marathon renders unchanged.

// ─── DESIGN TOKENS ───────────────────────────────────────────
const BG_FOOTER = '#0e1014';
const BORDER    = '#22252e';
const BORDER_SUBTLE = '#1e2028';
const CIPHER  = '#ff2222';
const NEXUS   = '#00d4ff';
// Cross-game peer accents are no longer hardcoded here -- each peer's accent comes from its
// ROOT_GAMES theme.primary (same source of truth as the network root tiles).

export default function Footer({ game = 'marathon' }) {
  const [year] = useState(function() { return new Date().getFullYear(); });
  // Per-game footer config (Phase 1 data). Default game 'marathon' keeps every existing
  // <Footer /> call unchanged. description / legal / EXPLORE + DISCOVER links read from here.
  var fcfg = getGameConfig(game).footer;
  var exploreLinks = (fcfg.links && fcfg.links.explore) || [];
  var discoverLinks = (fcfg.links && fcfg.links.discover) || [];

  // Editor-chip href, GAME-DEPENDENT (Phase 3 decision c). An 'incoming' editor is never linked.
  // Marathon links to the editor's own lane; the other games have no per-game lanes, so they link
  // to the network editor masthead (/editors). Marathon is unchanged -> byte-identical.
  function chipHref(ed) {
    if (!ed.live) return null;
    return game === 'marathon' ? ('/marathon/intel/' + ed.key) : '/editors';
  }

  // Cross-game row peers: the OTHER games (this row INVERTS per game -- never shows itself).
  // Order + route + accent come from ROOT_GAMES (the network-root source of truth); the sublabel
  // token + lifecycle come from each peer's footer config. The label is built as ONE string so it
  // renders as a single text node (no SSR text-delimiter comments) -- the technique that kept the
  // Phase 2 legal/description marker-free. Marathon's derived peers reproduce its former hardcoded
  // strings verbatim (Part A was authored to match), so Marathon stays byte-identical.
  var peers = ROOT_GAMES.filter(function (g) { return g.slug !== game; }).map(function (g) {
    var pcfg = getGameConfig(g.slug);
    var pf = pcfg.footer;
    var up = String(g.label || '').toUpperCase();
    // Lifecycle is DATE-DRIVEN: once a peer's launch date passes, its static pre-launch
    // token (e.g. Wardogs' 'EA SEP 10') flips to a live label so it cannot go stale --
    // EA games read 'IN EA', full launches read 'LIVE'. isGameLive uses the clock, not
    // the dead `launched` flag. Byte-identical today (no peer is live yet).
    var lifecycle = isGameLive(pcfg) ? (pcfg.earlyAccess ? 'IN EA' : 'LIVE') : pf.peerLifecycle;
    return {
      slug: g.slug,
      route: g.route,
      accent: g.theme && g.theme.primary,
      text: up + ' · ' + pf.peerLabel + ' (' + lifecycle + ') →',
    };
  });

  return (
    <footer style={{
      borderTop: '1px solid ' + BORDER_SUBTLE,
      background: BG_FOOTER,
      marginTop: 40,
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* ── EDITORS ROW ── */}
      <div style={{ borderBottom: '1px solid ' + BORDER_SUBTLE, padding: '20px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.18)',
            letterSpacing: 2,
            marginRight: 8,
            fontWeight: 700,
          }}>
            POWERED BY
          </span>
          {DESK.map(function(ed) {
            if (ed.live) {
              return (
                <Link key={ed.name} href={chipHref(ed)} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  textDecoration: 'none',
                  padding: '4px 10px',
                  background: ed.color + '08',
                  border: '1px solid ' + ed.color + '22',
                  borderRadius: 2,
                  transition: 'border-color 0.15s',
                }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: ed.color }}>{ed.symbol}</span>
                  <span style={{
                    fontFamily: 'monospace',
                    fontSize: 9,
                    color: ed.color,
                    opacity: 0.75,
                    letterSpacing: 1,
                    fontWeight: 700,
                  }}>
                    {ed.name}
                  </span>
                </Link>
              );
            }
            // 'incoming' editor (Broker): DIMMED, NOT linked (no lane yet), + a small "incoming" marker.
            return (
              <span key={ed.name} title="Incoming editor" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px',
                background: ed.color + '05',
                border: '1px dashed ' + ed.color + '20',
                borderRadius: 2,
                opacity: 0.5,
              }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: ed.color }}>{ed.symbol}</span>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: 9,
                  color: ed.color,
                  opacity: 0.75,
                  letterSpacing: 1,
                  fontWeight: 700,
                }}>
                  {ed.name}
                </span>
                <span style={{
                  fontFamily: 'monospace',
                  fontSize: 7,
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: 1,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}>
                  incoming
                </span>
              </span>
            );
          })}
          <span style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.15)',
            letterSpacing: 1.5,
            marginLeft: 'auto',
            fontWeight: 700,
          }}>
            6 EDITORS · 6 SOURCES · AROUND THE CLOCK
          </span>
        </div>
      </div>

      {/* ── MAIN FOOTER ── */}
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '36px 24px 32px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 32,
      }}>

        {/* ── COLUMN 1: BRAND ── */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: CIPHER,
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 14,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: 3,
            }}>
              CYBERNETIC<span style={{ color: CIPHER + 'aa' }}>PUNKS</span>
            </span>
          </div>
          <p style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.3)',
            lineHeight: 1.6,
            margin: '0 0 18px',
          }}>
            {fcfg.description}
          </p>
          {/* Network-membership link: gives Marathon's authority pages (this footer
              renders on every /intel article + the hubs) a crawlable internal link
              up to the indexable network apex. Distributes link equity Marathon ->
              network root, which the per-game nav/footer otherwise never do. */}
          <Link href="/" style={{
            display: 'inline-block',
            fontFamily: 'monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: 1.5,
            textDecoration: 'none',
            fontWeight: 700,
            marginBottom: 18,
            transition: 'color 0.15s',
          }}
            onMouseEnter={function(e) { e.currentTarget.style.color = NEXUS; }}
            onMouseLeave={function(e) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            PART OF THE CYBERNETICPUNKS NETWORK →
          </Link>
          {/* Cross-game wayfinding: the network's OTHER games (this row INVERTS per game -- it
              never lists the current game). Peers, order, route + accent come from ROOT_GAMES;
              each peer's sublabel token + lifecycle come from its footer config; the label is one
              interpolated string so it renders as a single text node (no SSR marker). Quiet,
              always-visible. Marathon's derived peers reproduce its former hardcoded strings. */}
          {peers.map(function(peer) {
            return (
              <Link key={peer.slug} href={peer.route} style={{
                display: 'block',
                fontFamily: 'monospace',
                fontSize: 10,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: 1.5,
                textDecoration: 'none',
                fontWeight: 700,
                marginBottom: 18,
                transition: 'color 0.15s',
              }}
                onMouseEnter={function(e) { e.currentTarget.style.color = peer.accent; }}
                onMouseLeave={function(e) { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
              >
                {peer.text}
              </Link>
            );
          })}
          <div style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.18)',
            letterSpacing: 1.5,
            lineHeight: 1.8,
            fontWeight: 700,
          }}>
            {fcfg.legal.reduce(function(acc, line, i) {
              if (i > 0) acc.push(<br key={'lg' + i} />);
              acc.push(line);
              return acc;
            }, [])}
          </div>
        </div>

        {/* ── COLUMN 2: EXPLORE ── */}
        <div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: 3,
            marginBottom: 14,
            fontWeight: 700,
          }}>
            EXPLORE
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {exploreLinks.map(function(link) {
              return (
                <Link key={link.href} href={link.href} style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.5)',
                  textDecoration: 'none',
                  letterSpacing: 1.5,
                  transition: 'color 0.15s',
                  fontWeight: 700,
                }}
                  onMouseEnter={function(e) { e.target.style.color = NEXUS; }}
                  onMouseLeave={function(e) { e.target.style.color = 'rgba(255,255,255,0.5)'; }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── COLUMN 3: DISCOVER ── */}
        <div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: 3,
            marginBottom: 14,
            fontWeight: 700,
          }}>
            DISCOVER
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {discoverLinks.map(function(link) {
              return (
                <Link key={link.href} href={link.href} style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.5)',
                  textDecoration: 'none',
                  letterSpacing: 1.5,
                  transition: 'color 0.15s',
                  fontWeight: 700,
                }}
                  onMouseEnter={function(e) { e.target.style.color = NEXUS; }}
                  onMouseLeave={function(e) { e.target.style.color = 'rgba(255,255,255,0.5)'; }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── COLUMN 4: CONTACT & COMMUNITY ── */}
        <div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.25)',
            letterSpacing: 3,
            marginBottom: 14,
            fontWeight: 700,
          }}>
            CONTACT & COMMUNITY
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* Discord */}
            <Link href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.854 0.927C10.956 0.505 9.994 0.198 8.99 0.022C8.861 0.256 8.711 0.57 8.607 0.819C7.534 0.655 6.47 0.655 5.414 0.819C5.31 0.57 5.157 0.256 5.027 0.022C4.022 0.198 3.059 0.506 2.161 0.929C0.311 3.641 -0.19 6.285 0.06 8.893C1.27 9.789 2.442 10.336 3.595 10.696C3.887 10.3 4.147 9.879 4.371 9.436C3.947 9.276 3.541 9.078 3.158 8.845C3.261 8.769 3.362 8.69 3.461 8.609C5.742 9.672 8.266 9.672 10.52 8.609C10.62 8.691 10.721 8.77 10.823 8.845C10.439 9.079 10.031 9.278 9.606 9.437C9.83 9.879 10.089 10.302 10.382 10.697C11.536 10.337 12.709 9.79 13.919 8.893C14.213 5.87 13.419 3.25 11.854 0.927ZM4.676 7.279C3.983 7.279 3.413 6.639 3.413 5.854C3.413 5.069 3.971 4.428 4.676 4.428C5.381 4.428 5.952 5.068 5.939 5.854C5.94 6.639 5.38 7.279 4.676 7.279ZM9.297 7.279C8.604 7.279 8.034 6.639 8.034 5.854C8.034 5.069 8.592 4.428 9.297 4.428C10.002 4.428 10.573 5.068 10.56 5.854C10.56 6.639 10.001 7.279 9.297 7.279Z" fill="#7289da"/>
              </svg>
              <div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: '#7289da',
                  letterSpacing: 1.5,
                  fontWeight: 700,
                }}>
                  JOIN DISCORD
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.25)',
                  letterSpacing: 1,
                  fontWeight: 700,
                }}>
                  {DISPLAY_DISCORD}
                </div>
              </div>
            </Link>

            {/* X / Twitter */}
            <Link href="https://x.com/Cybernetic87250" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.55)',
                  letterSpacing: 1.5,
                  fontWeight: 700,
                }}>
                  FOLLOW ON X
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.25)',
                  letterSpacing: 1,
                  fontWeight: 700,
                }}>
                  @Cybernetic87250
                </div>
              </div>
            </Link>

            {/* Email */}
            <Link href="mailto:contact@cyberneticpunks.com"
              style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <svg width="14" height="11" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 0H2C0.9 0 0 0.9 0 2V16C0 17.1 0.9 18 2 18H22C23.1 18 24 17.1 24 16V2C24 0.9 23.1 0 22 0ZM22 4L12 11L2 4V2L12 9L22 2V4Z" fill="rgba(255,255,255,0.4)"/>
              </svg>
              <div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.55)',
                  letterSpacing: 1.5,
                  fontWeight: 700,
                }}>
                  EMAIL US
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 9,
                  color: 'rgba(255,255,255,0.25)',
                  letterSpacing: 1,
                  fontWeight: 700,
                }}>
                  contact@cyberneticpunks.com
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={{ borderTop: '1px solid ' + BORDER_SUBTLE, padding: '14px 24px' }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
        }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: 1.5,
            fontWeight: 700,
          }}>
            © {year} CYBERNETICPUNKS.COM · BUILT ON THE GRID
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: 1.5,
            fontWeight: 700,
          }}>
            {fcfg.bottomTagline}
          </div>
        </div>
      </div>

    </footer>
  );
}