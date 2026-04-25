// app/rising/page.js
// RISING RUNNERS — small Marathon Twitch streamers discovery hub
// Live data via <RisingRunners /> component; SEO-optimized surface.
//
// Updated April 27, 2026:
// - Colors aligned to design system tokens
// - Fonts standardized to system-ui / Orbitron / monospace
// - Mixed Tailwind + inline styles unified to inline-only
// - Breadcrumb added (visible + JSON-LD)
// - FAQ section + FAQPage schema added
// - WebPage + BreadcrumbList JSON-LD added
// - Long-tail keywords expanded

import Link from 'next/link';
import RisingRunners from '@/components/RisingRunners';

export const metadata = {
  title: 'Rising Runners — Small Marathon Twitch Streamers to Watch Right Now',
  description: 'Discover up-and-coming Marathon streamers on Twitch. CyberneticPunks scans for live streamers under 100 viewers — real players grinding right now. Support new Marathon content creators before they blow up.',
  keywords: [
    'Marathon streamers',
    'Marathon Twitch streamers',
    'Marathon small streamers',
    'small Marathon Twitch channels',
    'rising Marathon creators',
    'Marathon live streams',
    'new Marathon content creators',
    'best Marathon streamers to watch',
    'Marathon Twitch under 100 viewers',
    'find new Marathon streamers',
    'support small Marathon streamers',
    'discover Marathon Twitch',
  ],
  openGraph: {
    title: 'Rising Runners — Small Marathon Twitch Streamers to Watch',
    description: 'Live small streamers playing Marathon right now. Discover the next wave before they blow up.',
    url: 'https://cyberneticpunks.com/rising',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Rising Runners — Marathon Streamers to Watch',
    description: 'Live small streamers playing Marathon right now. Discover the next wave.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/rising',
  },
};

// ─── DESIGN TOKENS (locked design system) ────────────────────
const BG_PAGE   = '#121418';
const BG_CARD   = '#1a1d24';
const BG_DEEP   = '#0e1014';
const BORDER    = '#22252e';
const BORDER_SUBTLE = '#1e2028';

const GHOST   = '#00ff88';  // Rising Runners is GHOST-themed (community pulse editor)
const NEXUS   = '#00d4ff';
const DEXTER  = '#ff8800';
const MIRANDA = '#9b5de5';

// ─── FAQ DATA — drives both visible section AND schema ───────
const FAQS = [
  {
    q: 'Why support small Marathon streamers?',
    a: "Big Marathon streamers already have established audiences and algorithmic reach. Small streamers are putting in the work right now — learning the game, developing strategies, and building communities from scratch. A single chat message or follow can genuinely change their day. Discovering creators early is also how Marathon's community identity gets built — the next big personalities in the scene are streaming under 50 viewers right now.",
  },
  {
    q: 'How does CyberneticPunks find small Marathon streamers?',
    a: "We scan Twitch in real-time for streamers playing Marathon with under 100 viewers. The feed updates every time you visit the page — these are real players streaming right now, not algorithmic recommendations or pre-curated lists. We don't accept payment to feature streamers and we don't filter by language or region. If they're live and small, they're surfaced.",
  },
  {
    q: 'What viewer threshold makes a streamer qualify as "rising"?',
    a: "Rising Runners surfaces streamers with under 100 concurrent viewers. The threshold is intentionally generous — a streamer with 80 viewers still benefits enormously from a single new face in chat. We focus on streamers actively building rather than already-established creators with thousands of followers. As streamers grow past 100 viewers, they graduate out of the Rising feed.",
  },
  {
    q: 'Can I submit my Marathon Twitch channel to Rising Runners?',
    a: "You don't need to submit anything — if you're streaming Marathon on Twitch with under 100 viewers, you're automatically eligible. Just stream Marathon as your category and our scanner will find you. The scan runs whenever someone visits the Rising Runners page, so the feed stays current. No application, no waitlist, no curation — just stream and you're in.",
  },
  {
    q: 'When are most Marathon streamers live?',
    a: "Marathon's streaming activity peaks in evenings across each timezone — Pacific evening rush, then European afternoon, then Asian late-night. Weekend afternoons see sustained streaming throughout the day. The Rising Runners feed updates per-visit, so refreshing during your local prime time will surface the most active small streamers in your region. Marathon is a 24/7 game and someone is always grinding.",
  },
  {
    q: 'How is this different from Twitch\'s own discovery page?',
    a: "Twitch's browse page sorts by viewer count by default, which means small streamers get buried beneath established channels. Even when you sort low-to-high, you still wade through inactive streams, AFK channels, and viewer count gaming. Rising Runners filters specifically for active small streamers playing Marathon right now — no AFK, no rerun chains, no manipulation. It's a discovery tool optimized for finding actual rising creators, not a browse page.",
  },
];

export default function RisingPage() {
  return (
    <main style={{
      background: BG_PAGE,
      minHeight: '100vh',
      color: '#ffffff',
      paddingTop: 48,
      paddingBottom: 80,
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* ─── BREADCRUMB ──────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px 0' }}>
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 10,
          letterSpacing: 2,
          fontFamily: 'monospace',
          fontWeight: 700,
        }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>HOME</Link>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
          <span style={{ color: GHOST }}>RISING</span>
        </nav>
      </div>

      {/* ─── HERO ─────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 48px', padding: '40px 24px 0' }}>
        <h1 style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 'clamp(28px, 5vw, 40px)',
          fontWeight: 900,
          letterSpacing: '-0.3px',
          margin: '0 0 16px 0',
          lineHeight: 1.1,
        }}>
          <span style={{ color: GHOST, marginRight: 12 }}>◇</span>
          RISING <span style={{ color: GHOST }}>RUNNERS</span>
        </h1>

        <p style={{
          fontSize: 17,
          color: 'rgba(255,255,255,0.55)',
          maxWidth: 720,
          lineHeight: 1.6,
          margin: '0 0 28px',
        }}>
          The next wave of Marathon content creators. These streamers are live right now with smaller audiences — but that won&apos;t last long. Get in early, find your new favorite creator, and support the grind before they blow up.
        </p>

        {/* WHY card */}
        <div style={{
          background: BG_CARD,
          border: '1px solid ' + BORDER,
          borderLeft: '3px solid ' + GHOST,
          borderRadius: '0 3px 3px 0',
          padding: '18px 22px',
          marginBottom: 24,
        }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 10,
            color: GHOST,
            letterSpacing: 2,
            marginBottom: 8,
            fontWeight: 700,
          }}>
            WHY RISING RUNNERS?
          </div>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.65,
            margin: 0,
          }}>
            Big streamers already have their audience. These Runners are putting in the work right now — learning the game, developing strategies, building communities from scratch. One viewer can make their day. Your support matters more here than anywhere else in the Marathon ecosystem.
          </p>
        </div>
      </section>

      {/* ─── LIVE RISING RUNNERS WIDGET ──────────────── */}
      <RisingRunners />

      {/* ─── HOW WE FIND THEM ────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '40px auto 64px', padding: '0 24px' }}>
        <div style={{
          background: BG_CARD,
          border: '1px solid ' + BORDER,
          borderLeft: '3px solid ' + NEXUS,
          borderRadius: '0 3px 3px 0',
          padding: '20px 24px',
        }}>
          <h3 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 13,
            fontWeight: 800,
            color: NEXUS,
            letterSpacing: 2,
            margin: '0 0 12px 0',
          }}>
            HOW WE FIND RISING RUNNERS
          </h3>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.65,
            margin: 0,
          }}>
            We scan Twitch in real-time for Marathon streamers with under 100 viewers. These are real players streaming right now — not algorithmic recommendations or pre-curated lists. The feed updates every time you visit. If no one is live, check back soon — Marathon is a 24/7 game and someone is always grinding.
          </p>
        </div>
      </section>

      {/* ─── FAQ SECTION ─────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 24,
            fontWeight: 800,
            color: '#fff',
            margin: '0 0 12px 0',
            letterSpacing: '-0.3px',
          }}>
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            maxWidth: 720,
            margin: '0 auto',
          }}>
            Common questions about Rising Runners, Marathon streamer discovery, and how the live feed works.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQS.map(function(faq, i) {
            return (
              <div key={i} style={{
                padding: '18px 22px',
                background: BG_CARD,
                border: '1px solid ' + BORDER,
                borderLeft: '3px solid ' + GHOST,
                borderRadius: '0 3px 3px 0',
              }}>
                <h3 style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 14,
                  fontWeight: 700,
                  color: GHOST,
                  margin: '0 0 10px 0',
                  letterSpacing: '0.3px',
                }}>
                  {faq.q}
                </h3>
                <p style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: 1.65,
                  margin: 0,
                }}>
                  {faq.a}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CROSS-LINKS ─────────────────────────────── */}
      <section style={{ maxWidth: 800, margin: '0 auto 32px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/intel/ghost" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: GHOST,
            padding: '8px 18px',
            border: '1px solid ' + GHOST + '44',
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            ◇ GHOST INTEL
          </Link>
          <Link href="/editors" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            padding: '8px 18px',
            border: '1px solid ' + BORDER,
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            EDITORS →
          </Link>
          <Link href="/intel" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            padding: '8px 18px',
            border: '1px solid ' + BORDER,
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            ALL INTEL →
          </Link>
          <Link href="/meta" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            padding: '8px 18px',
            border: '1px solid ' + BORDER,
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            META TIER LIST →
          </Link>
        </div>
      </section>

      {/* ─── BACK LINK ───────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Link
          href="/"
          style={{
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.25)',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          ← BACK TO THE GRID
        </Link>
      </section>

      {/* ─── JSON-LD STRUCTURED DATA ─────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Rising Runners — Marathon Streamers to Watch',
          url: 'https://cyberneticpunks.com/rising',
          description: 'Discover up-and-coming Marathon streamers on Twitch. Live small streamers under 100 viewers — surfaced in real-time.',
          isPartOf: { '@type': 'WebSite', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
        }),
      }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://cyberneticpunks.com',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Rising Runners',
              item: 'https://cyberneticpunks.com/rising',
            },
          ],
        }),
      }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map(function(faq) {
            return {
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            };
          }),
        }),
      }} />
    </main>
  );
}