'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const EDITOR_CONFIG = {
  CIPHER:  { color: '#ff0000', symbol: '◈' },
  NEXUS:   { color: '#00f5ff', symbol: '⬡' },
  GHOST:   { color: '#00ff88', symbol: '◇' },
  DEXTER:  { color: '#ff8800', symbol: '⬢' },
  MIRANDA: { color: '#9b5de5', symbol: '◎' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

export default function IntelFeed() {
  const [items, setItems] = useState([]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    async function fetchFeed() {
      try {
        const { data, error } = await supabase
          .from('feed_items')
          .select('headline, editor, tags, created_at, slug')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(8);
        if (error) throw error;
        if (data) setItems(data);
      } catch (err) {
        console.error('IntelFeed fetch error:', err);
      }
    }
    fetchFeed();
  }, []);

  if (items.length === 0) return null;

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: 2, margin: 0 }}>
            LATEST UPDATES
          </h2>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginTop: 4 }}>
            ALL EDITORS • LATEST DROPS
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, i) => {
          const config = EDITOR_CONFIG[item.editor] || { color: '#fff', symbol: '•' };
          const tag = item.tags && item.tags.length > 0 ? item.tags[0] : '';

          return (
            <Link
              key={i}
              href={'/intel/' + item.slug}
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: isMobile ? 6 : 16,
                padding: isMobile ? '14px 16px' : '14px 20px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderLeft: '3px solid ' + config.color + '33',
                borderRadius: 8,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderLeftColor = config.color;
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderLeftColor = config.color + '33';
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
            >
              {isMobile ? (
                // ── MOBILE LAYOUT ──
                <>
                  {/* Top row: editor + timestamp */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 14, color: config.color, opacity: 0.7 }}>{config.symbol}</span>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: config.color, letterSpacing: 1 }}>{item.editor}</span>
                      {tag && (
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, letterSpacing: 1, color: config.color, background: config.color + '12', borderRadius: 3, padding: '2px 7px' }}>
                          {tag}
                        </span>
                      )}
                    </div>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                  {/* Headline */}
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, width: '100%' }}>
                    {item.headline}
                  </div>
                </>
              ) : (
                // ── DESKTOP LAYOUT ──
                <>
                  <div style={{ fontFamily: 'monospace', fontSize: 18, color: config.color, opacity: 0.6, width: 24, textAlign: 'center', flexShrink: 0 }}>
                    {config.symbol}
                  </div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: config.color, width: 70, letterSpacing: 1, flexShrink: 0 }}>
                    {item.editor}
                  </div>
                  <div style={{ flex: 1, fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: '#fff' }}>
                    {item.headline}
                  </div>
                  {tag && (
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, letterSpacing: 1, color: config.color, background: config.color + '12', borderRadius: 4, padding: '4px 10px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {tag}
                    </div>
                  )}
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.25)', width: 48, textAlign: 'right', flexShrink: 0 }}>
                    {timeAgo(item.created_at)}
                  </div>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}