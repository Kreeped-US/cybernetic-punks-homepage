'use client';

export default function CommunityPulse() {
  // Hardcoded until GHOST is wired to Reddit intake
  const moodScore = 6;
  const moodMax = 10;
  const moodSummary =
    'Players excited about core gameplay loop but frustrated with queue times and extraction spawn balance.';

  return (
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
            HOW&apos;S THE COMMUNITY FEELING?
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
            — {moodSummary}
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
          UPDATED
          <br />
          Coming soon
        </div>
      </div>
    </section>
  );
}
