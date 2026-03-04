'use client';

// Hardcoded until meta_tiers Supabase table is built
const META_TIERS = {
  S: [
    { name: 'Extract Rush', type: 'Strategy', trend: 'up' },
    { name: 'Volt-9 SMG', type: 'Weapon', trend: 'stable' },
  ],
  A: [
    { name: 'Zone Denial Build', type: 'Loadout', trend: 'up' },
    { name: 'Pulse Rifle Meta', type: 'Weapon', trend: 'down' },
  ],
  B: [
    { name: 'Solo Flanker', type: 'Strategy', trend: 'stable' },
    { name: 'Barrier Tank', type: 'Loadout', trend: 'up' },
  ],
};

const TIER_STYLES = {
  S: {
    bg: 'rgba(255,0,0,0.12)',
    color: '#ff0000',
    border: 'rgba(255,0,0,0.2)',
  },
  A: {
    bg: 'rgba(255,136,0,0.1)',
    color: '#ff8800',
    border: 'rgba(255,136,0,0.15)',
  },
  B: {
    bg: 'rgba(255,255,255,0.04)',
    color: 'rgba(255,255,255,0.4)',
    border: 'rgba(255,255,255,0.06)',
  },
};

const TREND_DISPLAY = {
  up: { label: '▲ RISING', color: '#00ff88' },
  down: { label: '▼ FALLING', color: '#ff0000' },
  stable: { label: '● STABLE', color: 'rgba(255,255,255,0.3)' },
};

export default function MetaPreview() {
  return (
    <section
      id="meta"
      style={{
        maxWidth: 1200,
        margin: '0 auto 64px',
        padding: '0 24px',
        scrollMarginTop: 80,
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
            }}
          >
            <span style={{ color: '#00f5ff' }}>⬡</span> WHAT&apos;S META RIGHT
            NOW
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
            AUTO-UPDATED EVERY 6 HOURS
          </div>
        </div>
      </div>

      {/* Tier rows */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          flexDirection: 'column',
        }}
      >
        {Object.entries(META_TIERS).map(([tier, items]) => {
          const style = TIER_STYLES[tier];
          return (
            <div
              key={tier}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'stretch',
              }}
            >
              {/* Tier badge */}
              <div
                style={{
                  width: 52,
                  minHeight: 52,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 22,
                  fontWeight: 900,
                  background: style.bg,
                  color: style.color,
                  borderRadius: 8,
                  border: `1px solid ${style.border}`,
                }}
              >
                {tier}
              </div>

              {/* Items */}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flex: 1,
                  flexWrap: 'wrap',
                }}
              >
                {items.map((item, i) => {
                  const trend = TREND_DISPLAY[item.trend];
                  return (
                    <div
                      key={i}
                      style={{
                        flex: '1 1 200px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 8,
                        padding: '14px 18px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          'rgba(0,245,255,0.2)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor =
                          'rgba(255,255,255,0.06)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'Orbitron, monospace',
                            fontSize: 14,
                            fontWeight: 600,
                            color: '#fff',
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'Share Tech Mono, monospace',
                            fontSize: 10,
                            color: trend.color,
                          }}
                        >
                          {trend.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: 'Share Tech Mono, monospace',
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.35)',
                          marginTop: 6,
                          letterSpacing: 1,
                        }}
                      >
                        {item.type.toUpperCase()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}