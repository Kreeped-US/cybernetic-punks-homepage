'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── CARD CONFIG (v2 player-friendly labels) ─────────────────
const CARD_CONFIG = [
  {
    editor: 'NEXUS',
    label: "WHAT'S META",
    icon: '⬡',
    color: '#00f5ff',
    href: '/meta',
    fallbackValue: 'Scanning...',
    fallbackSub: 'Updated every 6 hours',
  },
  {
    editor: 'DEXTER',
    label: 'BEST BUILD',
    icon: '⬢',
    color: '#ff8800',
    href: '/builds',
    fallbackValue: 'Scanning...',
    fallbackSub: 'Updated every 6 hours',
  },
  {
    editor: 'CIPHER',
    label: 'PLAY OF THE DAY',
    icon: '◈',
    color: '#ff0000',
    href: '/intel/cipher',
    fallbackValue: 'Scanning...',
    fallbackSub: 'Updated every 6 hours',
  },
];

// ─── HELPERS ─────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function truncate(str, max = 28) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

// ─── PULSING DOT ────────────────────────────────────────────
function PulseDot({ color = '#00ff88' }) {
  return (
    <span
      className="inline-block rounded-full"
      style={{
        width: 8,
        height: 8,
        background: color,
        marginRight: 8,
        boxShadow: `0 0 8px ${color}`,
        animation: 'pulse-glow 2s ease-in-out infinite',
      }}
    />
  );
}

// ─── HERO BANNER (v2 copy) ──────────────────────────────────
export default function HeroBanner() {
  const [cards, setCards] = useState(null);

  useEffect(() => {
    async function fetchLatest() {
      try {
        const results = await Promise.all(
          CARD_CONFIG.map(({ editor }) =>
            supabase
              .from('feed_items')
              .select('headline, created_at')
              .eq('editor', editor)
              .eq('is_published', true)
              .order('created_at', { ascending: false })
              .limit(1)
              .single()
          )
        );

        const cardData = results.map((res, i) => {
          const config = CARD_CONFIG[i];
          const item = res.data;

          if (!item) {
            return {
              ...config,
              value: config.fallbackValue,
              sub: config.fallbackSub,
            };
          }

          return {
            ...config,
            value: truncate(item.headline),
            sub: `Updated ${timeAgo(item.created_at)}`,
          };
        });

        setCards(cardData);
      } catch (err) {
        console.error('HeroBanner fetch error:', err);
        setCards(
          CARD_CONFIG.map((config) => ({
            ...config,
            value: config.fallbackValue,
            sub: config.fallbackSub,
          }))
        );
      }
    }

    fetchLatest();
  }, []);

  const displayCards =
    cards ||
    CARD_CONFIG.map((config) => ({
      ...config,
      value: config.fallbackValue,
      sub: config.fallbackSub,
    }));

  return (
    <section
      className="relative text-center"
      style={{
        paddingTop: 120,
        paddingBottom: 60,
        background:
          'linear-gradient(180deg, rgba(0,245,255,0.03) 0%, transparent 40%)',
      }}
    >
      {/* Decorative corner brackets */}
      <div
        className="absolute"
        style={{
          top: 80,
          left: 40,
          width: 40,
          height: 40,
          borderLeft: '2px solid rgba(0,245,255,0.2)',
          borderTop: '2px solid rgba(0,245,255,0.2)',
        }}
      />
      <div
        className="absolute"
        style={{
          top: 80,
          right: 40,
          width: 40,
          height: 40,
          borderRight: '2px solid rgba(255,0,0,0.2)',
          borderTop: '2px solid rgba(255,0,0,0.2)',
        }}
      />

      {/* Status bar */}
      <div
        style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 12,
          letterSpacing: 4,
          color: 'rgba(0,245,255,0.5)',
          marginBottom: 16,
        }}
      >
        <PulseDot color="#00ff88" /> ALWAYS WATCHING • ALWAYS UPDATED
      </div>

      {/* Headline */}
      <h1
        style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 42,
          fontWeight: 900,
          margin: '0 auto 16px',
          maxWidth: 800,
          lineHeight: 1.15,
          letterSpacing: 2,
        }}
      >
        <span style={{ color: '#fff' }}>KNOW WHAT </span>
        <span
          style={{
            color: '#ff0000',
            textShadow: '0 0 30px rgba(255,0,0,0.3)',
          }}
        >
          WORKS
        </span>
        <br />
        <span
          style={{
            color: '#00f5ff',
            textShadow: '0 0 30px rgba(0,245,255,0.3)',
          }}
        >
          BEFORE YOU DROP IN
        </span>
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 19,
          color: 'rgba(255,255,255,0.7)',
          maxWidth: 620,
          margin: '0 auto 32px',
          lineHeight: 1.6,
          letterSpacing: 0.5,
        }}
      >
        No guesswork. No outdated tier lists.
        <br />
        Just what&apos;s winning right now.
      </p>

      {/* Value cards — live Supabase data, clickable */}
      <div
        className="flex justify-center flex-wrap"
        style={{
          gap: 16,
          maxWidth: 800,
          margin: '0 auto 36px',
        }}
      >
        {displayCards.map((card, i) => (
          <Link
            key={i}
            href={card.href}
            className="relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${card.color}22`,
              borderRadius: 8,
              padding: '20px 28px',
              minWidth: 200,
              flex: '1 1 0',
              transition: 'all 0.3s ease',
              textDecoration: 'none',
              display: 'block',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = card.color + '66';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = card.color + '22';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-0 right-0"
              style={{
                height: 2,
                background: `linear-gradient(90deg, transparent, ${card.color}44, transparent)`,
              }}
            />

            {/* Label */}
            <div
              style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 10,
                color: card.color,
                letterSpacing: 2,
                marginBottom: 6,
              }}
            >
              {card.label}
            </div>

            {/* Value */}
            <div
              style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                marginBottom: 4,
              }}
            >
              <span style={{ marginRight: 8, opacity: 0.4 }}>{card.icon}</span>
              {card.value}
            </div>

            {/* Subtitle — time only, no editor name */}
            <div
              style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 10,
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              {card.sub}
            </div>
          </Link>
        ))}
      </div>

      {/* CTAs — anchor scroll */}
      <div className="flex justify-center flex-wrap" style={{ gap: 16 }}>
        <a
          href="#builds"
          className="cursor-pointer"
          style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 2,
            background: 'linear-gradient(135deg, #ff0000, #cc0000)',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '14px 32px',
            boxShadow: '0 0 20px rgba(255,0,0,0.25)',
            transition: 'all 0.3s',
            textDecoration: 'none',
            display: 'inline-block',
          }}
          onMouseEnter={(e) =>
            (e.target.style.boxShadow = '0 0 30px rgba(255,0,0,0.45)')
          }
          onMouseLeave={(e) =>
            (e.target.style.boxShadow = '0 0 20px rgba(255,0,0,0.25)')
          }
        >
          FIND A BUILD →
        </a>
        <a
          href="#meta"
          className="cursor-pointer"
          style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 2,
            background: 'transparent',
            color: '#00f5ff',
            border: '1px solid rgba(0,245,255,0.3)',
            borderRadius: 6,
            padding: '14px 32px',
            transition: 'all 0.3s',
            textDecoration: 'none',
            display: 'inline-block',
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = 'rgba(0,245,255,0.6)';
            e.target.style.background = 'rgba(0,245,255,0.05)';
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = 'rgba(0,245,255,0.3)';
            e.target.style.background = 'transparent';
          }}
        >
          WHAT&apos;S META RIGHT NOW
        </a>
      </div>
    </section>
  );
}