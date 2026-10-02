// components/game/GameHero.js
// SHARED full-bleed game-hub hero (2026-10-02), modeled on -- and pixel-carried-over from -- the original
// /wardogs hero: optional cover-fit art behind two legibility scrims, breadcrumb, the official logo as a
// BADGE beside the derived status badge, ONE text <h1>, intro, CTAs, and an optional slot (children) for
// game-specific blocks (e.g. the DMZ countdown). No art -> the plain variant (same layout, no image).
//
// Server component. Takes ONLY the plain props from buildHeroProps (lib/games/heroModel.js) -- never the
// raw config (it carries a RegExp) -- so nothing non-plain can reach a client boundary. Colors come from
// the page's theme tokens (--accent, --accent-glow, --green), so every game renders in its own palette.
// Full-bleed: render it OUTSIDE the page's max-width <main>.
//
// MIN HEIGHT (heroes WITH art only; 2026-10-02): every art hero is at least as tall as the original Wardogs
// hero, so a game with less hero content (no CTAs, no logo) still gets a full-size band of art. The floor
// is a step function MEASURED from the Wardogs hero on 2026-10-02 (480px at >=1050 wide, 432 at 721-1049,
// 391 at 416-720, 518 at <=415): each step is Wardogs' LOWEST natural height in that range, so Wardogs
// itself never gains a pixel at any width (it sits exactly on the floor at 1280 and 390). The CSS values are
// Wardogs' measured FRACTIONAL inner heights ROUNDED DOWN (inner = section minus its 1px bottom border):
// 479.000, 431.125, 390.031, 516.781 -> 479 / 431 / 390 / 516. Rounding down matters: a floor even 0.2px
// above Wardogs' natural height would re-center its content by a sub-pixel and shift the text. Re-measure if the
// Wardogs hero content changes. Extra height goes to the art: the breadcrumb stays pinned at the top and
// the badge / H1 / intro block is vertically centered in the remaining space (half above, half below).
// Heroes without art (the plain variant) are unaffected.

import Link from 'next/link';
import { Exo_2 } from 'next/font/google';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
const EXO = 'var(--font-exo2), system-ui, sans-serif';
const A = 'var(--accent)';

// Hover + mobile rules (SSR-safe static <style>, neutral class names).
const CSS = `
.game-hero-cta-primary { transition: transform .12s ease, box-shadow .12s ease, filter .12s ease; }
.game-hero-cta-primary:hover { transform: translateY(-1px); filter: brightness(1.05); box-shadow: 0 8px 26px var(--accent-glow, color-mix(in srgb, var(--accent) 25%, transparent)); }
.game-hero-cta-ghost:hover { border-color: var(--accent) !important; color: #fff !important; }
@media (max-width: 720px) { .game-hero-inner { padding: 40px 18px 34px !important; } }
.game-hero--art .game-hero-inner { display: flex; flex-direction: column; box-sizing: border-box; min-height: 479px; }
.game-hero--art .game-hero-body { margin: auto 0; }
@media (max-width: 1049px) { .game-hero--art .game-hero-inner { min-height: 431px; } }
@media (max-width: 720px) { .game-hero--art .game-hero-inner { min-height: 390px; } }
@media (max-width: 415px) { .game-hero--art .game-hero-inner { min-height: 516px; } }
`;

export default function GameHero({ hero, children }) {
  if (!hero) return null;
  var h1 = hero.h1;
  return (
    <section data-game-hero className={exo2.variable + (hero.image ? ' game-hero--art' : '')} style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid #1d2026', color: '#fff' }}>
      <style>{CSS}</style>
      {hero.image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={hero.image.src} alt="" aria-hidden="true" fetchPriority="high" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: hero.image.position }} />
          {hero.overlay && hero.overlay.side ? <div style={{ position: 'absolute', inset: 0, background: hero.overlay.side }} /> : null}
          {hero.overlay && hero.overlay.bottom ? <div style={{ position: 'absolute', inset: 0, background: hero.overlay.bottom }} /> : null}
        </>
      ) : null}

      <div className="game-hero-inner" style={{ position: 'relative', maxWidth: 1120, margin: '0 auto', padding: '52px 24px 44px' }}>
        <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 26, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>NETWORK</Link>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>/</span>
          <span style={{ color: 'rgba(255,255,255,0.8)' }}>{hero.breadcrumbLabel}</span>
        </nav>

        <div className="game-hero-body">
        {/* official logo (badge, NOT the H1) + derived status badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
          {hero.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.logo.src} alt={hero.logo.alt} style={{ height: hero.logo.height, width: 'auto', maxWidth: '100%', display: 'block', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }} />
          ) : null}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, color: A, border: '1px solid ' + A, borderRadius: 3, padding: '4px 8px', background: 'color-mix(in srgb, var(--accent) 8%, transparent)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: hero.badge.live ? 'var(--green,#5bd18e)' : A, boxShadow: '0 0 6px currentColor' }} />
            {hero.badge.label}
          </span>
        </div>

        <h1 style={{ fontFamily: EXO, fontSize: 'clamp(34px, 6vw, 62px)', fontWeight: 800, lineHeight: 1.03, letterSpacing: '-0.5px', margin: '0 0 16px', maxWidth: 760, textShadow: '0 2px 24px rgba(0,0,0,0.5)' }}>
          {h1.lines.map(function (line, i) {
            return <span key={i}>{i > 0 ? <br /> : null}{line}</span>;
          })}
          {h1.accent ? <span style={{ color: A }}>{h1.accent}</span> : null}
        </h1>

        {hero.intro ? (
          <p style={{ fontSize: 'clamp(15px,2vw,18px)', color: 'rgba(255,255,255,0.82)', lineHeight: 1.55, maxWidth: 620, margin: hero.ctas.length || children ? '0 0 30px' : 0, fontWeight: 500 }}>
            {hero.intro.text}
            {hero.intro.strong ? <>{' '}<span style={{ color: '#fff', fontWeight: 700 }}>{hero.intro.strong}</span></> : null}
          </p>
        ) : null}

        {hero.ctas.length ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            {hero.ctas.map(function (c) {
              return c.variant === 'primary'
                ? <Link key={c.href} href={c.href} className="game-hero-cta-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: A, color: '#0b0d10', fontFamily: EXO, fontSize: 15, fontWeight: 800, letterSpacing: 0.3, padding: '14px 24px', borderRadius: 4, textDecoration: 'none' }}>{c.label}</Link>
                : <Link key={c.href} href={c.href} className="game-hero-cta-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.25)', fontFamily: EXO, fontSize: 15, fontWeight: 700, padding: '13px 22px', borderRadius: 4, textDecoration: 'none', transition: 'border-color .12s ease, color .12s ease' }}>{c.label}</Link>;
            })}
          </div>
        ) : null}

        {children ? <div style={{ marginTop: hero.ctas.length ? 30 : 0 }}>{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
