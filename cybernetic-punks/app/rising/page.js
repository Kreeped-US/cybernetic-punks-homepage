import Link from 'next/link';

export const metadata = {
  title: 'Rising Runners — Up-and-Coming Marathon Streamers to Watch',
  description: 'Discover the next wave of Marathon streamers. Small channels, big plays. Support the grind before they blow up.',
  keywords: ['Marathon streamers', 'Marathon Twitch', 'Marathon small streamers', 'rising Marathon creators', 'Marathon live streams', 'new Marathon content creators'],
  openGraph: {
    title: 'Rising Runners — Marathon Streamers to Watch',
    description: 'Discover the next wave of Marathon streamers before they blow up.',
    url: 'https://cyberneticpunks.com/rising',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rising Runners — Marathon Streamers to Watch',
    description: 'Discover the next wave of Marathon streamers before they blow up.',
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/rising',
  },
};

import RisingRunners from '@/components/RisingRunners';

export default function RisingPage() {
  return (
    <main className="min-h-screen bg-black text-white pt-24" style={{ paddingBottom: 80 }}>
      {/* Hero */}
      <section style={{ maxWidth: 1200, margin: '0 auto 48px', padding: '0 24px' }}>
        <h1 style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 36,
          fontWeight: 900,
          letterSpacing: 2,
          margin: '0 0 12px',
        }}>
          <span style={{ color: '#00ff88' }}>◇</span> RISING{' '}
          <span style={{ color: '#00ff88' }}>RUNNERS</span>
        </h1>
        <p style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 17,
          color: 'rgba(255,255,255,0.5)',
          maxWidth: 700,
          lineHeight: 1.6,
          margin: '0 0 24px',
        }}>
          The next wave of Marathon content creators. These streamers are live right now with
          smaller audiences — but that won&apos;t last long. Get in early, find your new favorite
          creator, and support the grind before they blow up.
        </p>
        <div style={{
          background: 'rgba(0,255,136,0.04)',
          border: '1px solid rgba(0,255,136,0.1)',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 24,
        }}>
          <div style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 12,
            color: '#00ff88',
            letterSpacing: 1,
            marginBottom: 6,
          }}>
            WHY RISING RUNNERS?
          </div>
          <p style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Big streamers already have their audience. These runners are putting in the work right now —
            learning the game, developing strategies, building communities from scratch. One viewer can
            make their day. Your support matters more here than anywhere else in the Marathon ecosystem.
          </p>
        </div>
      </section>

      {/* Live Rising Runners Widget */}
      <RisingRunners />

      {/* When nobody is live */}
      <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: '24px 28px',
        }}>
          <h3 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 14,
            fontWeight: 700,
            color: '#00ff88',
            letterSpacing: 2,
            marginBottom: 10,
          }}>
            HOW WE FIND RISING RUNNERS
          </h3>
          <p style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            We scan Twitch in real-time for Marathon streamers with under 100 viewers.
            These are real players streaming right now — not algorithmic recommendations.
            The feed updates every time you visit. If no one is live, check back soon —
            Marathon is a 24/7 game and someone is always grinding.
          </p>
        </div>
      </section>

      {/* Back link */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Link
          href="/"
          style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.2)',
            textDecoration: 'none',
          }}
        >
          ← BACK TO THE GRID
        </Link>
      </section>
    </main>
  );
}
