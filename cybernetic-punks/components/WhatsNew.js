'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const EDITOR_COLORS = {
  CIPHER:  '#ff0000',
  NEXUS:   '#00f5ff',
  GHOST:   '#00ff88',
  DEXTER:  '#ff8800',
  MIRANDA: '#9b5de5',
};

function truncate(str, max = 50) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

export default function WhatsNew() {
  const [items, setItems] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    async function fetchRecent() {
      try {
        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from('feed_items')
          .select('headline, editor')
          .eq('is_published', true)
          .gte('created_at', twelveHoursAgo)
          .order('created_at', { ascending: false })
          .limit(4);
        if (error) throw error;
        if (data && data.length > 0) setItems(data);
      } catch (err) {
        console.error('WhatsNew fetch error:', err);
      }
    }
    fetchRecent();
  }, []);

  const summaryParts = items
    ? items.map((item) => ({
        editor: item.editor,
        color: EDITOR_COLORS[item.editor] || '#fff',
        text: truncate(item.headline),
      }))
    : [
        { editor: 'DEXTER',  color: '#ff8800', text: 'New build analysis posted' },
        { editor: 'NEXUS',   color: '#00f5ff', text: 'Meta shift detected' },
        { editor: 'CIPHER',  color: '#ff0000', text: 'New play graded' },
      ];

  return (
    <section style={{ maxWidth: 1200, margin: '0 auto 48px', padding: '0 24px' }}>
      <div style={{
        background: 'rgba(0,245,255,0.03)',
        border: '1px solid rgba(0,245,255,0.1)',
        borderRadius: 8,
        padding: isMobile ? '14px 16px' : '18px 28px',
      }}>
        {isMobile ? (
          // ── MOBILE — stacked ──
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Label row */}
            <div style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 10, letterSpacing: 3, color: '#00f5ff',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                display: 'inline-block', width: 7, height: 7,
                borderRadius: '50%', background: '#00f5ff',
                boxShadow: '0 0 8px #00f5ff',
                animation: 'pulse-glow 2s ease-in-out infinite',
                flexShrink: 0,
              }} />
              LAST 12 HOURS
            </div>

            {/* Items — one per line on mobile */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {summaryParts.map((part, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{
                    fontFamily: 'Orbitron, monospace', fontSize: 9,
                    fontWeight: 700, color: part.color,
                    letterSpacing: 1, flexShrink: 0, paddingTop: 2,
                  }}>{part.editor}</span>
                  <span style={{
                    fontFamily: 'Rajdhani, sans-serif', fontSize: 13,
                    color: 'rgba(255,255,255,0.7)', lineHeight: 1.4,
                  }}>{part.text}</span>
                </div>
              ))}
              <div style={{
                fontFamily: 'Share Tech Mono, monospace', fontSize: 9,
                color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 2,
              }}>updated automatically</div>
            </div>
          </div>
        ) : (
          // ── DESKTOP — single row ──
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Label */}
            <div style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 11, letterSpacing: 3, color: '#00f5ff',
              whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8,
                borderRadius: '50%', background: '#00f5ff',
                boxShadow: '0 0 8px #00f5ff',
                animation: 'pulse-glow 2s ease-in-out infinite',
              }} />
              LAST 12 HOURS
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 28, background: 'rgba(0,245,255,0.15)', flexShrink: 0 }} />

            {/* Summary */}
            <div style={{
              fontFamily: 'Rajdhani, sans-serif', fontSize: 15,
              color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: 1.5,
            }}>
              {summaryParts.map((part, i) => (
                <span key={i}>
                  {i > 0 && ' • '}
                  {truncate(part.text)}
                </span>
              ))}
              <span style={{ color: 'rgba(255,255,255,0.4)' }}> • updated automatically</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}