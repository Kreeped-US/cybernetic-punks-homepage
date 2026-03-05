'use client';

import { useState, useEffect } from 'react';

export default function RisingRunners() {
  const [runners, setRunners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRunners() {
      try {
        const res = await fetch('/api/rising-runners');
        if (!res.ok) return;
        const data = await res.json();
        if (data.runners && data.runners.length > 0) {
          setRunners(data.runners.slice(0, 12));
        }
      } catch (err) {
        console.log('[RisingRunners] Fetch error:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRunners();
  }, []);

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
            <span style={{ color: '#00ff88' }}>◇</span> RISING RUNNERS
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
            UP-AND-COMING MARATHON STREAMERS • SUPPORT THE GRIND
          </div>
        </div>
        <a
          href="https://www.twitch.tv/directory/game/Marathon"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            color: '#00ff88',
            letterSpacing: 1,
            textDecoration: 'none',
            transition: 'opacity 0.2s',
          }}
        >
          BROWSE ALL ON TWITCH →
        </a>
      </div>

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
          SCANNING FOR RISING RUNNERS...
        </div>
      ) : runners.length === 0 ? (
        <div
          style={{
            background: 'rgba(0,255,136,0.02)',
            border: '1px solid rgba(0,255,136,0.08)',
            borderRadius: 10,
            padding: '40px 28px',
            textAlign: 'center',
          }}
        >
          <div style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 12,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: 1,
            marginBottom: 8,
          }}>
            NO RISING RUNNERS LIVE RIGHT NOW
          </div>
          <div style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.2)',
          }}>
            Check back soon — Marathon is a 24/7 game and someone is always grinding.
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 14,
          }}
        >
          {runners.map((runner, i) => (
            <a
              key={i}
              href={runner.stream_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(0,255,136,0.02)',
                border: '1px solid rgba(0,255,136,0.08)',
                borderRadius: 10,
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textDecoration: 'none',
                display: 'block',
              }}
            >
              {/* Thumbnail */}
              <div
                style={{
                  width: '100%',
                  height: 140,
                  background: runner.thumbnail_url
                    ? 'url(' + runner.thumbnail_url + ') center/cover no-repeat'
                    : 'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,0,0,0.8))',
                  position: 'relative',
                }}
              >
                {/* RISING badge */}
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#000',
                    background: '#00ff88',
                    borderRadius: 4,
                    padding: '3px 8px',
                    letterSpacing: 1,
                  }}
                >
                  RISING
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
                  {runner.viewer_count} watching
                </div>

                {/* LIVE dot */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 8,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#ff0000',
                    boxShadow: '0 0 6px #ff0000',
                    animation: 'pulse-glow 1.5s ease-in-out infinite',
                  }}
                />
              </div>

              {/* Info */}
              <div style={{ padding: '14px 16px' }}>
                <div
                  style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#00ff88',
                    marginBottom: 4,
                  }}
                >
                  {runner.user_name}
                </div>
                <div
                  style={{
                    fontFamily: 'Rajdhani, sans-serif',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.4)',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {runner.title}
                </div>
                <div
                  style={{
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 10,
                    color: 'rgba(0,255,136,0.4)',
                    marginTop: 8,
                    letterSpacing: 1,
                  }}
                >
                  SUPPORT THIS RUNNER →
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
