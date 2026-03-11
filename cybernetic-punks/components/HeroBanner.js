'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const CARD_CONFIG = [
  {
    editor: 'NEXUS',
    label: "WHAT'S META",
    sublabel: 'Tier List',
    icon: '⬡',
    color: '#00f5ff',
    spotlightHref: '/meta',
    fallbackValue: 'Scanning meta...',
  },
  {
    editor: 'DEXTER',
    label: 'TOP BUILD',
    sublabel: 'Build Lab',
    icon: '⬢',
    color: '#ff8800',
    spotlightHref: '/top-build',
    fallbackValue: 'Analyzing builds...',
  },
  {
    editor: 'CIPHER',
    label: 'PLAY OF THE DAY',
    sublabel: 'Play Grade',
    icon: '◈',
    color: '#ff0000',
    spotlightHref: '/play-of-the-day',
    fallbackValue: 'Grading plays...',
  },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function truncate(str, max = 72) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

function PulseDot({ color = '#00ff88' }) {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: color, marginRight: 8, boxShadow: `0 0 8px ${color}`,
      animation: 'pulse-glow 2s ease-in-out infinite',
    }} />
  );
}

export default function HeroBanner() {
  const [cards, setCards] = useState(null);

  useEffect(() => {
    async function fetchLatest() {
      try {
        const results = await Promise.all(
          CARD_CONFIG.map(({ editor }) =>
            supabase.from('feed_items')
              .select('headline, created_at, slug, thumbnail')
              .eq('editor', editor).eq('is_published', true)
              .order('created_at', { ascending: false }).limit(1).single()
          )
        );
        setCards(results.map((res, i) => {
          const config = CARD_CONFIG[i];
          const item = res.data;
          return {
            ...config,
            value: item ? truncate(item.headline) : config.fallbackValue,
            sub: item ? `Updated ${timeAgo(item.created_at)}` : 'Updated every 6h',
            thumbnail: item?.thumbnail || null,
            // Always link to spotlight page, not individual article
            href: config.spotlightHref,
          };
        }));
      } catch (err) {
        setCards(CARD_CONFIG.map(c => ({ ...c, value: c.fallbackValue, sub: 'Updated every 6h', href: c.spotlightHref })));
      }
    }
    fetchLatest();
  }, []);

  const displayCards = cards || CARD_CONFIG.map(c => ({ ...c, value: c.fallbackValue, sub: 'Updated every 6h', href: c.spotlightHref }));

  return (
    <section style={{
      paddingTop: 110, paddingBottom: 72, textAlign: 'center',
      background: 'linear-gradient(180deg, rgba(0,245,255,0.02) 0%, transparent 60%)',
      position: 'relative', overflow: 'hidden',
    }}>

      {/* Grid background pattern */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: 'linear-gradient(rgba(0,245,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)',
      }} />

      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: 72, left: 24, width: 28, height: 28, borderLeft: '1px solid rgba(0,245,255,0.2)', borderTop: '1px solid rgba(0,245,255,0.2)', zIndex: 1 }} />
      <div style={{ position: 'absolute', top: 72, right: 24, width: 28, height: 28, borderRight: '1px solid rgba(255,0,0,0.2)', borderTop: '1px solid rgba(255,0,0,0.2)', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: 24, left: 24, width: 28, height: 28, borderLeft: '1px solid rgba(0,245,255,0.1)', borderBottom: '1px solid rgba(0,245,255,0.1)', zIndex: 1 }} />
      <div style={{ position: 'absolute', bottom: 24, right: 24, width: 28, height: 28, borderRight: '1px solid rgba(255,0,0,0.1)', borderBottom: '1px solid rgba(255,0,0,0.1)', zIndex: 1 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Status bar */}
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: 4, color: 'rgba(0,245,255,0.45)', marginBottom: 24 }}>
          <PulseDot color="#00ff88" />
          ALWAYS WATCHING · ALWAYS UPDATED
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 'clamp(30px, 5.5vw, 54px)',
          fontWeight: 900, margin: '0 auto 16px',
          maxWidth: 760, lineHeight: 1.1, letterSpacing: 2,
        }}>
          <span style={{ color: '#fff' }}>KNOW WHAT </span>
          <span style={{ color: '#ff0000', textShadow: '0 0 30px rgba(255,0,0,0.3)' }}>WORKS</span>
          <br />
          <span style={{ color: '#00f5ff', textShadow: '0 0 30px rgba(0,245,255,0.3)' }}>BEFORE YOU DROP IN</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: 'Rajdhani, sans-serif', fontSize: 17,
          color: 'rgba(255,255,255,0.45)', maxWidth: 480,
          margin: '0 auto 36px', lineHeight: 1.6, letterSpacing: 0.3,
        }}>
          Five autonomous AI editors tracking meta, builds, and community pulse — updated every 6 hours.
        </p>

        {/* Editor strip */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 20, marginBottom: 44 }}>
          {[
            { icon: '⬡', label: 'Meta', color: '#00f5ff',  href: '/meta' },
            { icon: '⬢', label: 'Builds', color: '#ff8800', href: '/builds' },
            { icon: '◈', label: 'Plays', color: '#ff0000',  href: '/play-of-the-day' },
            { icon: '◇', label: 'Community', color: '#00ff88', href: '/intel/ghost' },
            { icon: '◎', label: 'Guides', color: '#9b5de5', href: '/intel/miranda' },
          ].map(function(f) {
            return (
              <Link key={f.label} href={f.href} style={{
                display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none',
                fontFamily: 'Share Tech Mono, monospace', fontSize: 10,
                color: 'rgba(255,255,255,0.35)', letterSpacing: 1,
                transition: 'color 0.2s',
              }}>
                <span style={{ color: f.color, opacity: 0.8, fontSize: 13 }}>{f.icon}</span>
                {f.label}
              </Link>
            );
          })}
        </div>

        {/* ── SPOTLIGHT CARDS ── */}
        <div style={{
          display: 'flex', justifyContent: 'center', flexWrap: 'wrap',
          gap: 16, maxWidth: 1000, margin: '0 auto 44px', padding: '0 20px',
        }}>
          {displayCards.map((card, i) => (
            <Link
              key={i}
              href={card.href}
              style={{
                flex: '1 1 260px', maxWidth: 320,
                background: 'rgba(0,0,0,0.6)',
                border: `1px solid ${card.color}22`,
                borderTop: `2px solid ${card.color}`,
                borderRadius: 8, padding: 0,
                textDecoration: 'none', display: 'block',
                overflow: 'hidden', position: 'relative',
                transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = card.color + '55';
                e.currentTarget.style.boxShadow = `0 8px 32px rgba(0,0,0,0.6), 0 0 20px ${card.color}15`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = card.color + '22';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.4)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Thumbnail strip */}
              {card.thumbnail && (
                <div style={{
                  width: '100%', height: 120,
                  background: `linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.6)), url(${card.thumbnail}) center/cover no-repeat`,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
                    background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
                  }} />
                </div>
              )}

              {/* Card body */}
              <div style={{ padding: '16px 18px 18px' }}>
                {/* Label row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: card.color, fontSize: 13 }}>{card.icon}</span>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: card.color, letterSpacing: 2 }}>
                      {card.label}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
                    {card.sublabel}
                  </span>
                </div>

                {/* Headline */}
                <div style={{
                  fontFamily: 'Rajdhani, sans-serif', fontSize: 15, fontWeight: 600,
                  color: 'rgba(255,255,255,0.9)', lineHeight: 1.4, marginBottom: 12,
                }}>
                  {card.value}
                </div>

                {/* Footer row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
                    {card.sub}
                  </span>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: card.color, letterSpacing: 1, opacity: 0.7 }}>
                    VIEW →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12 }}>
          <Link href="/builds" style={{
            fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700,
            letterSpacing: 2, background: 'linear-gradient(135deg, #ff0000, #cc0000)',
            color: '#fff', borderRadius: 5, padding: '13px 32px',
            boxShadow: '0 0 20px rgba(255,0,0,0.25)', textDecoration: 'none',
            display: 'inline-block', transition: 'box-shadow 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 32px rgba(255,0,0,0.45)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 20px rgba(255,0,0,0.25)'}
          >
            FIND A BUILD →
          </Link>
          <Link href="/meta" style={{
            fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700,
            letterSpacing: 2, background: 'transparent', color: '#00f5ff',
            border: '1px solid rgba(0,245,255,0.3)', borderRadius: 5, padding: '13px 32px',
            textDecoration: 'none', display: 'inline-block', transition: 'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,245,255,0.55)'; e.currentTarget.style.background = 'rgba(0,245,255,0.04)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,245,255,0.3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            WHAT&apos;S META RIGHT NOW
          </Link>
        </div>

      </div>
    </section>
  );
}
