'use client';

import { useState, useEffect } from 'react';

export default function TwitchLive() {
  const [streamers, setStreamers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch('/api/twitch-live');
        if (!res.ok) return;
        const data = await res.json();
        if (data.streamers && data.streamers.length > 0) {
          setStreamers(data.streamers);
        }
      } catch (err) {
        console.log('[TwitchLive] Fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchLive();
  }, []);

  // Don't show section if nobody is live
  if (!loading && streamers.length === 0) return null;

  return (
    <section
      style={{
        maxWidth: 1200,
        margin: '0 auto 64px',
        padding: '0 24px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 20,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 2,
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: '#ff0000',
                boxShadow: '0 0 8px #ff0000',
                animation: 'pulse-glow 2s ease-in-out infinite',
              }}
            />
            LIVE NOW
          </h2>
          <div
            style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: 1,
              marginTop: 4,
            }}
          >
            MARATHON STREAMERS ON TWITCH • {streamers.length} LIVE
          </div>
        </div>
        <a
          href="https://www.twitch.tv/directory/game/Marathon"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            color: '#9b5de5',
            letterSpacing: 1,
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
        >
          VIEW ALL ON TWITCH →
        </a>
      </div>

      {/* Streamer cards — horizontal scroll */}
      {loading ? (
        <div
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 12,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: 1,
            padding: '24px 0',
          }}
        >
          SCANNING TWITCH...
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 14,
            overflowX: 'auto',
            paddingBottom: 8,
          }}
        >
          {streamers.map((streamer, i) => (
            <a
              key={i}
              href={streamer.stream_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                minWidth: 220,
                maxWidth: 260,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(155,93,229,0.15)',
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s',
                flexShrink: 0,
                textDecoration: 'none',
                display: 'block',
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: '100%',
                  height: 124,
                  background: streamer.thumbnail_url
                    ? 'url(' + streamer.thumbnail_url + ') center/cover no-repeat'
                    : 'linear-gradient(135deg, rgba(155,93,229,0.2), rgba(0,0,0,0.8))',
                  position: 'relative',
                }}
              >
                {/* LIVE badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#fff',
                    background: '#ff0000',
                    borderRadius: 4,
                    padding: '3px 8px',
                    letterSpacing: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#fff',
                      animation: 'pulse-glow 1.5s ease-in-out infinite',
                    }}
                  />
                  LIVE
                </div>

                {/* Viewer count */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 10,
                    color: '#fff',
                    background: 'rgba(0,0,0,0.7)',
                    borderRadius: 4,
                    padding: '2px 8px',
                  }}
                >
                  {streamer.viewer_count.toLocaleString()} watching
                </div>
              </div>

              {/* Info */}
              <div style={{ padding: '12px 14px' }}>
                <div
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#9b5de5',
                    marginBottom: 4,
                  }}
                >
                  {streamer.user_name}
                </div>
                <div
                  style={{
                    fontFamily: 'Rajdhani, sans-serif',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {streamer.title}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
