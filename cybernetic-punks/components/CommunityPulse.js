'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

export default function CommunityPulse() {
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPulse() {
      try {
        const { data, error } = await supabase
          .from('feed_items')
          .select('headline, body, ce_score, created_at, slug')
          .eq('editor', 'GHOST')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!error && data) {
          setPulse(data);
        }
      } catch (err) {
        console.error('CommunityPulse fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPulse();
  }, []);

  // Fallback values
  const moodScore = pulse ? Math.round(pulse.ce_score) || 5 : 5;
  const moodMax = 10;
  const summary = pulse ? pulse.body : 'Scanning community sentiment from Reddit...';
  const headline = pulse ? pulse.headline : 'Awaiting GHOST data';
  const updated = pulse ? timeAgo(pulse.created_at) : '';
  const slug = pulse ? pulse.slug : null;

  const content = (
    <section
      style={{
        maxWidth: 1200,
        margin: '0 auto 64px',
        padding: '0 24px',
      }}
    >
      <div
        style={{
          background: 'rgba(0,255,136,0.02)',
          border: '1px solid rgba(0,255,136,0.1)',
          borderRadius: 10,
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 28,
          flexWrap: 'wrap',
          cursor: slug ? 'pointer' : 'default',
          transition: 'border-color 0.2s',
        }}
      >
        {/* GHOST icon */}
        <div style={{ textAlign: 'center', minWidth: 80 }}>
          <div
            style={{
              fontSize: 28,
              color: '#00ff88',
              marginBottom: 4,
            }}
          >
            ◇
          </div>
          <div
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 11,
              color: '#00ff88',
              letterSpacing: 2,
            }}
          >
            GHOST
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 1,
            height: 50,
            background: 'rgba(0,255,136,0.15)',
          }}
        />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 13,
              color: '#fff',
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            {headline}
          </div>

          {/* Mood bar */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              marginBottom: 10,
            }}
          >
            {[...Array(moodMax)].map((_, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i < moodScore
                      ? '#00ff88'
                      : 'rgba(255,255,255,0.06)',
                  opacity: i < moodScore ? 1 - i * 0.08 : 1,
                  boxShadow:
                    i < moodScore
                      ? '0 0 6px rgba(0,255,136,0.3)'
                      : 'none',
                }}
              />
            ))}
          </div>

          {/* Summary */}
          <div
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 14,
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: '#00ff88' }}>
              {moodScore}.0 / {moodMax}
            </strong>{' '}
            — {summary}
          </div>
        </div>

        {/* Timestamp */}
        <div
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 10,
            color: 'rgba(255,255,255,0.2)',
            textAlign: 'right',
            minWidth: 80,
          }}
        >
          {updated ? (
            <>
              UPDATED
              <br />
              {updated}
            </>
          ) : (
            <>
              UPDATED
              <br />
              Every 6 hours
            </>
          )}
        </div>
      </div>
    </section>
  );

  // Wrap in Link if we have a slug
  if (slug) {
    return (
      <Link href={'/intel/' + slug} style={{ textDecoration: 'none' }}>
        {content}
      </Link>
    );
  }

  return content;
}