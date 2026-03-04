'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── EDITOR COLORS ───────────────────────────────────────────
const EDITOR_COLORS = {
  CIPHER: '#ff0000',
  NEXUS: '#00f5ff',
  GHOST: '#00ff88',
  DEXTER: '#ff8800',
  MIRANDA: '#9b5de5',
};

// ─── HELPER ──────────────────────────────────────────────────
function truncate(str, max = 50) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

export default function WhatsNew() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    async function fetchRecent() {
      try {
        // Pull the latest 4 published items from the last 12 hours
        const twelveHoursAgo = new Date(
          Date.now() - 12 * 60 * 60 * 1000
        ).toISOString();

        const { data, error } = await supabase
          .from('feed_items')
          .select('headline, editor')
          .eq('is_published', true)
          .gte('created_at', twelveHoursAgo)
          .order('created_at', { ascending: false })
          .limit(4);

        if (error) throw error;
        if (data && data.length > 0) {
          setItems(data);
        }
      } catch (err) {
        console.error('WhatsNew fetch error:', err);
      }
    }

    fetchRecent();
  }, []);

  // Build the summary line from live data or fallback
  const summaryParts = items
    ? items.map((item) => ({
        editor: item.editor,
        color: EDITOR_COLORS[item.editor] || '#fff',
        text: truncate(item.headline),
      }))
    : [
        { editor: 'DEXTER', color: '#ff8800', text: 'New build analysis posted' },
        { editor: 'NEXUS', color: '#00f5ff', text: 'Meta shift detected' },
        { editor: 'CIPHER', color: '#ff0000', text: 'New play graded' },
      ];

  return (
    <section
      style={{
        maxWidth: 1200,
        margin: '0 auto 48px',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          background: 'rgba(0,245,255,0.03)',
          border: '1px solid rgba(0,245,255,0.1)',
          borderRadius: 8,
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        {/* Label */}
        <div
          style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            letterSpacing: 3,
            color: '#00f5ff',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#00f5ff',
              boxShadow: '0 0 8px #00f5ff',
              animation: 'pulse-glow 2s ease-in-out infinite',
            }}
          />
          LAST 12 HOURS
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 28,
            background: 'rgba(0,245,255,0.15)',
          }}
        />

        {/* Summary */}
        <div
          style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 15,
            color: 'rgba(255,255,255,0.7)',
            flex: 1,
            lineHeight: 1.5,
          }}
        >
          {summaryParts.map((part, i) => (
            <span key={i}>
              {i > 0 && ' • '}
              {truncate(part.text)}
            </span>
          ))}
          <span style={{ color: 'rgba(255,255,255,0.4)' }}>
            {' '}
            • updated automatically
          </span>
        </div>
      </div>
    </section>
  );
}