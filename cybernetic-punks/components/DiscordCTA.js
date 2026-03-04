'use client';

export default function DiscordCTA() {
  var discordUrl = 'https://discord.gg/fgxdSD7SJj';

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
          background:
            'linear-gradient(135deg, rgba(88,101,242,0.08), rgba(88,101,242,0.02))',
          border: '1px solid rgba(88,101,242,0.15)',
          borderRadius: 10,
          padding: '32px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 2,
              marginBottom: 8,
            }}
          >
            GET UPDATES IN DISCORD
          </div>
          <div
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 15,
              color: 'rgba(255,255,255,0.5)',
              maxWidth: 500,
              lineHeight: 1.5,
            }}
          >
            Get alerts on meta shifts, new build grades, and play breakdowns.
            All five editors post live intel straight to Discord.
          </div>
        </div>
        <a
          href={discordUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: 2,
            background: '#5865F2',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            padding: '14px 32px',
            cursor: 'pointer',
            boxShadow: '0 0 20px rgba(88,101,242,0.3)',
            transition: 'all 0.3s',
            whiteSpace: 'nowrap',
            textDecoration: 'none',
            display: 'inline-block',
          }}
          onMouseEnter={(e) =>
            (e.target.style.boxShadow = '0 0 30px rgba(88,101,242,0.5)')
          }
          onMouseLeave={(e) =>
            (e.target.style.boxShadow = '0 0 20px rgba(88,101,242,0.3)')
          }
        >
          JOIN DISCORD
        </a>
      </div>
    </section>
  );
}
