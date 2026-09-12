// components/wardogs/WardogsFooter.js
// The WARDOGS-themed footer -- the first per-game footer variant (Footer.js delegates here when
// game==='wardogs'; every other game keeps the generic network footer untouched). Gritty press-kit
// combat backdrop (tank shot) darkened for legibility + amber accents + marketable player voice.
// The editor "POWERED BY" strip is dropped (off-strategy). KEEPS: the Wardogs surface nav, the
// community links (Discord/X/email -- distribution matters), and the press-kit legal disclaimer
// (required -- it permits the logo/shots). Used under press-kit terms.
//
// Server component (Link + img only). Nav links + legal come from lib/games/wardogs.js footer config
// (+ the live Tier List). Amber theming inline so it does not depend on the .wardogs-theme token swap.

import Link from 'next/link';
import { getGameConfig } from '@/lib/games';
import { DISCORD_INVITE, DISPLAY_DISCORD } from '@/lib/socialLinks';

const AMBER = '#e0a13a';
const BG = '#0b0d10';
const TANK = '/images/wardogs/WD_Screenshot_Tank_1_WD2.jpg';
const LOGO = '/WD_Fullmark_White.png';
const EXO = 'var(--font-exo2), system-ui, sans-serif';

export default function WardogsFooter() {
  const fcfg = (getGameConfig('wardogs') || {}).footer || {};
  const legal = fcfg.legal || [
    'CYBERNETIC PUNKS IS AN UNOFFICIAL FAN SITE - NOT AFFILIATED WITH OR ENDORSED BY BULKHEAD OR TEAM17.',
    'WARDOGS IS A TRADEMARK OF ITS RESPECTIVE OWNER.',
  ];
  // Surface nav from config + the live Tier List (append if not already present).
  const explore = (fcfg.links && fcfg.links.explore ? fcfg.links.explore.slice() : []);
  if (!explore.some((l) => l.href === '/wardogs/tier-list')) explore.push({ label: 'Tier List', href: '/wardogs/tier-list' });
  const year = new Date().getFullYear();

  const heading = { fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginBottom: 14, fontWeight: 700 };
  const link = { color: 'rgba(255,255,255,0.72)', textDecoration: 'none', fontSize: 13, fontWeight: 500 };

  return (
    <footer style={{ position: 'relative', overflow: 'hidden', background: BG, borderTop: '1px solid #1d2026', marginTop: 40 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={TANK} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 42%', opacity: 0.9 }} />
      {/* heavy scrims -- the shot is bright daylight, so darken hard for legibility */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(11,13,16,0.97) 0%, rgba(11,13,16,0.82) 40%, rgba(11,13,16,0.9) 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 90% at 15% 20%, rgba(224,161,58,0.06), transparent 60%)' }} />

      <div style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '44px 24px 26px' }}>
        {/* brand + tagline */}
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
          <div style={{ maxWidth: 460 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO} alt="Wardogs" style={{ height: 34, width: 'auto', display: 'block', marginBottom: 16, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))' }} />
            <p style={{ fontFamily: EXO, fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.4, margin: 0 }}>
              The Wardogs loadouts, tier lists, and economy intel that actually help you win.
            </p>
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, margin: '10px 0 0' }}>
              Ranked by measured time-to-kill, priced against the economy. We don&rsquo;t guess &mdash; if we don&rsquo;t know, we say so.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 'clamp(28px,6vw,64px)', flexWrap: 'wrap' }}>
            {/* explore */}
            <div>
              <div style={heading}>EXPLORE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                {explore.map((l) => (
                  <Link key={l.href} href={l.href} className="wd-foot-link" style={link}>{l.label}</Link>
                ))}
              </div>
            </div>
            {/* community */}
            <div>
              <div style={heading}>CONTACT &amp; COMMUNITY</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                <Link href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                  <svg width="15" height="12" viewBox="0 0 14 11" fill="none" aria-hidden="true"><path d="M11.854 0.927C10.956 0.505 9.994 0.198 8.99 0.022C8.861 0.256 8.711 0.57 8.607 0.819C7.534 0.655 6.47 0.655 5.414 0.819C5.31 0.57 5.157 0.256 5.027 0.022C4.022 0.198 3.059 0.506 2.161 0.929C0.311 3.641 -0.19 6.285 0.06 8.893C1.27 9.789 2.442 10.336 3.595 10.696C3.887 10.3 4.147 9.879 4.371 9.436C3.947 9.276 3.541 9.078 3.158 8.845C3.261 8.769 3.362 8.69 3.461 8.609C5.742 9.672 8.266 9.672 10.52 8.609C10.62 8.691 10.721 8.77 10.823 8.845C10.439 9.079 10.031 9.278 9.606 9.437C9.83 9.879 10.089 10.302 10.382 10.697C11.536 10.337 12.709 9.79 13.919 8.893C14.213 5.87 13.419 3.25 11.854 0.927ZM4.676 7.279C3.983 7.279 3.413 6.639 3.413 5.854C3.413 5.069 3.971 4.428 4.676 4.428C5.381 4.428 5.952 5.068 5.939 5.854C5.94 6.639 5.38 7.279 4.676 7.279ZM9.297 7.279C8.604 7.279 8.034 6.639 8.034 5.854C8.034 5.069 8.592 4.428 9.297 4.428C10.002 4.428 10.573 5.068 10.56 5.854C10.56 6.639 10.001 7.279 9.297 7.279Z" fill="#7289da" /></svg>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8ba0e8', letterSpacing: 1, fontWeight: 700 }}>JOIN DISCORD</span>
                </Link>
                <Link href="https://x.com/Cybernetic87250" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.6)" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.65)', letterSpacing: 1, fontWeight: 700 }}>FOLLOW ON X</span>
                </Link>
                <Link href="mailto:contact@cyberneticpunks.com" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                  <svg width="15" height="11" viewBox="0 0 24 18" fill="none" aria-hidden="true"><path d="M22 0H2C0.9 0 0 0.9 0 2V16C0 17.1 0.9 18 2 18H22C23.1 18 24 17.1 24 16V2C24 0.9 23.1 0 22 0ZM22 4L12 11L2 4V2L12 9L22 2V4Z" fill="rgba(255,255,255,0.5)" /></svg>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, fontWeight: 700 }}>EMAIL US</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* network line + legal */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 18, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Link href="/" className="wd-foot-link" style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.3, color: AMBER, textDecoration: 'none' }}>
            Part of the Cybernetic Punks network &rarr;
          </Link>
          <div style={{ maxWidth: 640 }}>
            {legal.map((line, i) => (
              <div key={i} style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.32)', letterSpacing: 0.6, lineHeight: 1.7, textTransform: 'uppercase' }}>{line}</div>
            ))}
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.28)', letterSpacing: 0.6, marginTop: 4 }}>&copy; {year} CYBERNETIC PUNKS</div>
          </div>
        </div>
      </div>

      <style>{'.wd-foot-link:hover{color:#fff !important}'}</style>
    </footer>
  );
}
