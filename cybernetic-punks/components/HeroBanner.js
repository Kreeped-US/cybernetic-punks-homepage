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
    icon: '⬡',
    color: '#00f5ff',
    href: '/intel/nexus',
    fallbackValue: 'Scanning meta...',
  },
  {
    editor: 'DEXTER',
    label: 'TOP BUILD',
    icon: '⬢',
    color: '#ff8800',
    href: '/intel/dexter',
    fallbackValue: 'Analyzing builds...',
  },
  {
    editor: 'CIPHER',
    label: 'PLAY OF THE DAY',
    icon: '◈',
    color: '#ff0000',
    href: '/intel/cipher',
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

function truncate(str, max = 60) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

function PulseDot({ color = '#00ff88' }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 7,
      height: 7,
      borderRadius: '50%',
      background: color,
      marginRight: 8,
      boxShadow: `0 0 8px ${color}`,
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
            supabase
              .from('feed_items')
              .select('headline, created_at, slug')
              .eq('editor', editor)
              .eq('is_published', true)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
          )
        );

        setCards(results.map((res, i) => {
          const config = CARD_CONFIG[i];
          const item = res.data;
          return {
            ...config,
            value: item ? truncate(item.headline) : config.fallbackValue,
            sub: item ? `Updated ${timeAgo(item.created_at)}` : 'Updated every 6h',
            href: item ? `/intel/${item.slug}` : config.href,
          };
        }));
      } catch (err) {
        setCards(CARD_CONFIG.map(c => ({ ...c, value: c.fallbackValue, sub: 'Updated every 6h' })));
      }
    }
    fetchLatest();
  }, []);

  const displayCards = cards || CARD_CONFIG.map(c => ({ ...c, value: c.fallbackValue, sub: 'Updated every 6h' }));

  return (
    <section style={{
      paddingTop: 100,
      paddingBottom: 64,
      textAlign: 'center',
      background: 'linear-gradient(180deg, rgba(0,245,255,0.025) 0%, transparent 50%)',
      position: 'relative',
    }}>

      {/* Corner brackets */}
      <div style={{ position: 'absolute', top: 72, left: 32, width: 32, height: 32, borderLeft: '1px solid rgba(0,245,255,0.15)', borderTop: '1px solid rgba(0,245,255,0.15)' }} />
      <div style={{ position: 'absolute', top: 72, right: 32, width: 32, height: 32, borderRight: '1px solid rgba(255,0,0,0.15)', borderTop: '1px solid rgba(255,0,0,0.15)' }} />

      {/* Status bar */}
      <div style={{
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 11,
        letterSpacing: 4,
        color: 'rgba(0,245,255,0.4)',
        marginBottom: 20,
      }}>
        <PulseDot color="#00ff88" />
        ALWAYS WATCHING · ALWAYS UPDATED
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'Orbitron, monospace',
        fontSize: 'clamp(28px, 5vw, 48px)',
        fontWeight: 900,
        margin: '0 auto 14px',
        maxWidth: 700,
        lineHeight: 1.2,
        letterSpacing: 2,
      }}>
        <span style={{ color: '#fff' }}>KNOW WHAT </span>
        <span style={{ color: '#ff0000', textShadow: '0 0 24px rgba(255,0,0,0.25)' }}>WORKS</span>
        <br />
        <span style={{ color: '#00f5ff', textShadow: '0 0 24px rgba(0,245,255,0.25)' }}>BEFORE YOU DROP IN</span>
      </h1>

      {/* Subtitle */}
      <p style={{
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: 17,
        color: 'rgba(255,255,255,0.5)',
        maxWidth: 480,
        margin: '0 auto 40px',
        lineHeight: 1.6,
        letterSpacing: 0.3,
      }}>
        Five autonomous AI editors tracking meta, builds, and community pulse — updated every 6 hours.
      </p>

      {/* Feature strip */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '24px',
        marginBottom: 32,
      }}>
        {[
          { icon: '⬡', label: 'Meta Tracking', color: '#00f5ff' },
          { icon: '⬢', label: 'Build Analysis', color: '#ff8800' },
          { icon: '◈', label: 'Play Grades', color: '#ff0000' },
          { icon: '◇', label: 'Community Pulse', color: '#00ff88' },
          { icon: '◎', label: 'Field Guides', color: '#9b5de5' },
        ].map(function(f) {
          return (
            <div key={f.label} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: 1,
            }}>
              <span style={{ color: f.color, opacity: 0.7 }}>{f.icon}</span>
              {f.label}
            </div>
          );
        })}
      </div>

      {/* Cards */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: 12,
        maxWidth: 860,
        margin: '0 auto 40px',
        padding: '0 20px',
      }}>
        {displayCards.map((card, i) => (
          <Link
            key={i}
            href={card.href}
            style={{
              flex: '1 1 220px',
              maxWidth: 280,
              background: 'rgba(255,255,255,0.02)',
              border: `1px solid ${card.color}1a`,
              borderRadius: 8,
              padding: '16px 20px',
              textDecoration: 'none',
              display: 'block',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
              textAlign: 'left',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = card.color + '44';
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = card.color + '1a';
              e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
            }}
          >
            {/* Top accent */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent, ${card.color}33, transparent)`,
            }} />

            {/* Label + icon row */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 10,
            }}>
              <span style={{ color: card.color, fontSize: 12, opacity: 0.7 }}>{card.icon}</span>
              <span style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 10,
                color: card.color,
                letterSpacing: 2,
                opacity: 0.8,
              }}>
                {card.label}
              </span>
            </div>

            {/* Headline */}
            <div style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 15,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.4,
              marginBottom: 10,
            }}>
              {card.value}
            </div>

            {/* Time */}
            <div style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 10,
              color: 'rgba(255,255,255,0.25)',
            }}>
              {card.sub}
            </div>
          </Link>
        ))}
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Link
          href="/builds"
          style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
            background: 'linear-gradient(135deg, #ff0000, #cc0000)',
            color: '#fff',
            borderRadius: 5,
            padding: '12px 28px',
            boxShadow: '0 0 18px rgba(255,0,0,0.2)',
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'box-shadow 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 28px rgba(255,0,0,0.4)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 0 18px rgba(255,0,0,0.2)'}
        >
          FIND A BUILD →
        </Link>
        <Link
          href="/meta"
          style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 2,
            background: 'transparent',
            color: '#00f5ff',
            border: '1px solid rgba(0,245,255,0.25)',
            borderRadius: 5,
            padding: '12px 28px',
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(0,245,255,0.5)';
            e.currentTarget.style.background = 'rgba(0,245,255,0.04)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(0,245,255,0.25)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          WHAT&apos;S META RIGHT NOW
        </Link>
      </div>

    </section>
  );
}