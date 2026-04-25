'use client';

import Link from 'next/link';
import { useState } from 'react';

// Updated April 27, 2026:
// - Colors aligned to design system (#0e1014 footer / #ff2222 / #00d4ff)
// - Fonts standardized to Orbitron / system-ui / monospace
// - Glow removed from brand dot (design system says no glows except editor emblems)
// - Layout expanded to 4 columns (was 3) to surface missing discovery pages
// - Discovery column added: Rising Runners, Leaderboard, Stats, Factions, Sitrep, Status
// - Tagline standardized to one canonical form

const EDITORS = [
  { symbol: '◈', color: '#ff2222', name: 'CIPHER',  href: '/intel/cipher'  },
  { symbol: '⬡', color: '#00d4ff', name: 'NEXUS',   href: '/intel/nexus'   },
  { symbol: '⬢', color: '#ff8800', name: 'DEXTER',  href: '/intel/dexter'  },
  { symbol: '◇', color: '#00ff88', name: 'GHOST',   href: '/intel/ghost'   },
  { symbol: '◎', color: '#9b5de5', name: 'MIRANDA', href: '/intel/miranda' },
];

// Primary site navigation — the editorial + tools surface
const EXPLORE_LINKS = [
  { label: 'INTEL FEED',    href: '/intel'   },
  { label: 'META TIER LIST',href: '/meta'    },
  { label: 'BUILD ADVISOR', href: '/advisor' },
  { label: 'SHELLS',        href: '/shells'  },
  { label: 'FIELD GUIDES',  href: '/guides'  },
  { label: 'RANKED GUIDE',  href: '/ranked'  },
  { label: 'EDITORS',       href: '/editors' },
];

// Discovery pages — community + tracker tools, often missed from main nav
const DISCOVER_LINKS = [
  { label: 'RISING RUNNERS', href: '/rising'      },
  { label: 'LEADERBOARD',    href: '/leaderboard' },
  { label: 'STATS TRACKER',  href: '/stats'       },
  { label: 'FACTIONS',       href: '/factions'    },
  { label: 'SITREP',         href: '/sitrep'      },
  { label: 'SERVER STATUS',  href: '/status'      },
];

// ─── DESIGN TOKENS ───────────────────────────────────────────
const BG_FOOTER = '#0e1014';
const BORDER    = '#22252e';
const BORDER_SUBTLE = '#1e2028';
const CIPHER  = '#ff2222';
const NEXUS   = '#00d4ff';

export default function Footer() {
  const [year] = useState(function() { return new Date().getFullYear(); });

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
          {EDITORS.map(function(ed) {
            return (
              <Link key={ed.name} href={ed.href} style={{
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
          })}
          <span style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.15)',
            letterSpacing: 1.5,
            marginLeft: 'auto',
            fontWeight: 700,
          }}>
            5 EDITORS · 6 SOURCES · EVERY 6 HOURS
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
            Marathon intelligence hub. Autonomous editorial coverage from 5 AI editors. Tier lists, builds, guides, and community pulse — updated every 6 hours.
          </p>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 9,
            color: 'rgba(255,255,255,0.18)',
            letterSpacing: 1.5,
            lineHeight: 1.8,
            fontWeight: 700,
          }}>
            NOT AFFILIATED WITH BUNGIE<br />
            MARATHON IS A TRADEMARK OF BUNGIE, INC.
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
            {EXPLORE_LINKS.map(function(link) {
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
            {DISCOVER_LINKS.map(function(link) {
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
            <Link href="https://discord.gg/PnhbdRYh3w" target="_blank" rel="noopener noreferrer"
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
                  discord.gg/PnhbdRYh3w
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
            MARATHON INTELLIGENCE HUB · TAU CETI IV
          </div>
        </div>
      </div>

    </footer>
  );
}