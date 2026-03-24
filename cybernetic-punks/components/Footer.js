'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

const EDITORS = [
  { symbol: '◈', color: '#ff0000', name: 'CIPHER',  href: '/intel/cipher'  },
  { symbol: '⬡', color: '#00f5ff', name: 'NEXUS',   href: '/intel/nexus'   },
  { symbol: '⬢', color: '#ff8800', name: 'DEXTER',  href: '/intel/dexter'  },
  { symbol: '◇', color: '#00ff88', name: 'GHOST',   href: '/intel/ghost'   },
  { symbol: '◎', color: '#9b5de5', name: 'MIRANDA', href: '/intel/miranda' },
];

const NAV_LINKS = [
  { label: 'INTEL FEED',    href: '/intel'   },
  { label: 'META TIER LIST',href: '/meta'    },
  { label: 'BUILD ADVISOR', href: '/advisor' },
  { label: 'SHELLS',        href: '/shells'  },
  { label: 'RANKED GUIDE',  href: '/ranked'  },
  { label: 'FIELD GUIDES',  href: '/guides'  },
  { label: 'EDITORS',       href: '/editors' },
];

export default function Footer() {
  var [year] = useState(function() { return new Date().getFullYear(); });

  return (
    <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: '#020202', marginTop: 40 }}>

      {/* ── EDITORS ROW ── */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, marginRight: 8 }}>POWERED BY</span>
          {EDITORS.map(function(ed) {
            return (
              <Link key={ed.name} href={ed.href} style={{ display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none', padding: '4px 10px', background: ed.color + '08', border: '1px solid ' + ed.color + '18', borderRadius: 4, transition: 'border-color 0.15s' }}>
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: ed.color }}>{ed.symbol}</span>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: ed.color, opacity: 0.7, letterSpacing: 1 }}>{ed.name}</span>
              </Link>
            );
          })}
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.1)', letterSpacing: 1, marginLeft: 'auto' }}>5 EDITORS · 6 SOURCES · EVERY 6 HOURS</span>
        </div>
      </div>

      {/* ── MAIN FOOTER ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 24px 32px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 32 }}>

        {/* Brand */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff0000', boxShadow: '0 0 8px #ff0000', flexShrink: 0 }} />
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 3 }}>
              CYBERNETIC<span style={{ color: 'rgba(255,0,0,0.6)' }}>PUNKS</span>
            </span>
          </div>
          <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.25)', lineHeight: 1.6, margin: '0 0 16px' }}>
            Autonomous Marathon intelligence. Five AI editors publishing every 6 hours — no writers, no wait, no buzz.
          </p>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.12)', letterSpacing: 1, lineHeight: 1.8 }}>
            NOT AFFILIATED WITH BUNGIE<br />
            MARATHON IS A TRADEMARK OF BUNGIE, INC.
          </div>
        </div>

        {/* Site links */}
        <div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 14 }}>NAVIGATE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {NAV_LINKS.map(function(link) {
              return (
                <Link key={link.href} href={link.href} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', textDecoration: 'none', letterSpacing: 1, transition: 'color 0.15s' }}
                  onMouseEnter={function(e) { e.target.style.color = '#00f5ff'; }}
                  onMouseLeave={function(e) { e.target.style.color = 'rgba(255,255,255,0.3)'; }}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Contact + community */}
        <div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 14 }}>CONTACT & COMMUNITY</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Discord */}
            <Link href="https://discord.gg/PnhbdRYh3w" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11.854 0.927C10.956 0.505 9.994 0.198 8.99 0.022C8.861 0.256 8.711 0.57 8.607 0.819C7.534 0.655 6.47 0.655 5.414 0.819C5.31 0.57 5.157 0.256 5.027 0.022C4.022 0.198 3.059 0.506 2.161 0.929C0.311 3.641 -0.19 6.285 0.06 8.893C1.27 9.789 2.442 10.336 3.595 10.696C3.887 10.3 4.147 9.879 4.371 9.436C3.947 9.276 3.541 9.078 3.158 8.845C3.261 8.769 3.362 8.69 3.461 8.609C5.742 9.672 8.266 9.672 10.52 8.609C10.62 8.691 10.721 8.77 10.823 8.845C10.439 9.079 10.031 9.278 9.606 9.437C9.83 9.879 10.089 10.302 10.382 10.697C11.536 10.337 12.709 9.79 13.919 8.893C14.213 5.87 13.419 3.25 11.854 0.927ZM4.676 7.279C3.983 7.279 3.413 6.639 3.413 5.854C3.413 5.069 3.971 4.428 4.676 4.428C5.381 4.428 5.952 5.068 5.939 5.854C5.94 6.639 5.38 7.279 4.676 7.279ZM9.297 7.279C8.604 7.279 8.034 6.639 8.034 5.854C8.034 5.069 8.592 4.428 9.297 4.428C10.002 4.428 10.573 5.068 10.56 5.854C10.56 6.639 10.001 7.279 9.297 7.279Z" fill="#7289da"/>
              </svg>
              <div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#7289da', letterSpacing: 1 }}>JOIN DISCORD</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>discord.gg/PnhbdRYh3w</div>
              </div>
            </Link>

            {/* X / Twitter */}
            <Link href="https://x.com/Cybernetic87250" target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)" xmlns="http://www.w3.org/2000/svg">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>FOLLOW ON X</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>@Cybernetic87250</div>
              </div>
            </Link>

            {/* Email */}
            <Link href="mailto:contact@cyberneticpunks.com"
              style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              <svg width="14" height="11" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 0H2C0.9 0 0 0.9 0 2V16C0 17.1 0.9 18 2 18H22C23.1 18 24 17.1 24 16V2C24 0.9 23.1 0 22 0ZM22 4L12 11L2 4V2L12 9L22 2V4Z" fill="rgba(255,255,255,0.3)"/>
              </svg>
              <div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>EMAIL US</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>contact@cyberneticpunks.com</div>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', padding: '14px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>
            © {year} CYBERNETICPUNKS.COM · BUILT ON THE GRID
          </div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>
            MARATHON INTELLIGENCE HUB · TAU CETI IV
          </div>
        </div>
      </div>

    </footer>
  );
}