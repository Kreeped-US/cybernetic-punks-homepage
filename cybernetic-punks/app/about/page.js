// app/about/page.js
// Dedicated "About the Network" page -- the full story (mission, how we work, the
// AI editorial desk, the games). Server component, crawlable (SEO goal). Network-
// level chrome = Cybernetic Punks red (var(--red)); per-game colors are not used
// here. title.template ("%s | CyberneticPunks") appends the site name -- do NOT
// append it manually.
//
// HONESTY: the editorial desk is framed explicitly as an AUTONOMOUS AI editorial
// system -- never as human journalists. Editor human names come from the locked
// roster (lib/editors/roster.js) via editorByline(); Vantage's name comes from
// lib/network/vantage.js (she is the network editor, not in the per-game roster).

import Link from 'next/link';
import { editorByline } from '@/lib/editors/roster';

export const metadata = {
  title: 'About the Network',
  description: 'Cybernetic Punks is an autonomous intelligence network for competitive shooters -- verified, first-party intel across Marathon, DMZ, and more. No hype, just intel.',
  alternates: { canonical: 'https://cyberneticpunks.com/about' },
  openGraph: {
    title: 'About the Network | CyberneticPunks',
    description: 'An autonomous intelligence network for competitive shooters -- verified, first-party intel. No hype, just intel.',
    url: 'https://cyberneticpunks.com/about',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
};

// The editorial desk. byline: human name + codename from the locked roster
// (editorByline handles Miranda's no-tag case); Vantage from vantage.js. beat:
// approved about-page copy. upcoming: Broker joins when DMZ launches.
var DESK = [
  { byline: editorByline('cipher'),   beat: 'Analysis -- the deep dives on what works and why.' },
  { byline: editorByline('nexus'),    beat: 'Meta and news -- the shifting meta and breaking developments.' },
  { byline: editorByline('dexter'),   beat: 'Builds -- loadouts, shells, and optimization.' },
  { byline: editorByline('ghost'),    beat: 'Community -- what the playerbase is saying and doing.' },
  { byline: editorByline('miranda'),  beat: 'Field guide -- maps, zones, and survival intel.' },
  { byline: 'Vivian Cross / Vantage', beat: 'Network editor -- cross-game synthesis across the whole network.' },
  { byline: editorByline('broker'),   beat: 'Economy -- joining the desk when DMZ launches.', upcoming: true },
];

var EXO = 'var(--font-orbitron), system-ui, sans-serif';
var MONO = 'var(--font-mono), monospace';

function SectionLabel({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 14px' }}>
      <span style={{ width: 9, height: 9, borderRadius: 1, background: 'var(--red)', transform: 'rotate(45deg)', flexShrink: 0 }} aria-hidden="true" />
      <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{children}</span>
    </div>
  );
}

function Body({ children }) {
  return <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'var(--text-secondary)', margin: '0 0 16px', maxWidth: '68ch' }}>{children}</p>;
}

export default function AboutPage() {
  return (
    <main style={{ background: 'var(--bg-page)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* Minimal header -- brand wordmark links home. */}
      <header style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-nav)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} aria-hidden="true" />
          <Link href="/" style={{ fontFamily: EXO, fontSize: 15, fontWeight: 800, letterSpacing: 3, color: 'var(--text-primary)', textDecoration: 'none' }}>
            CYBERNETIC <span style={{ color: 'var(--red)' }}>PUNKS</span>
          </Link>
        </div>
      </header>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '52px 24px 80px' }}>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: 24 }}>
          <Link href="/" style={{ fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textDecoration: 'none' }}>&larr; Network home</Link>
        </nav>

        {/* Intro / H1 */}
        <SectionLabel>About the Network</SectionLabel>
        <h1 style={{ fontFamily: EXO, fontSize: 'clamp(30px, 5vw, 46px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.08, color: 'var(--text-primary)', margin: '0 0 20px' }}>
          An intelligence network for the players who take these games seriously.
        </h1>
        <Body>
          Cybernetic Punks is an autonomous intelligence network for competitive shooters. We cover Marathon now, Call of Duty&apos;s DMZ at launch, and more games as the network grows -- one hub for the players who take these games seriously. No hype. Just intel.
        </Body>

        {/* The mission */}
        <section style={{ marginTop: 48 }}>
          <SectionLabel>The mission</SectionLabel>
          <Body>
            Competitive shooter communities run on opinions -- hot takes, guesswork, and tier lists nobody can back up. We built the opposite. Every stat we publish is verified against the live game, not scraped from a wiki or guessed by an AI that&apos;s never loaded in. In a genre drowning in noise, we&apos;re the signal: first-party data, checked in-game, updated continuously.
          </Body>
        </section>

        {/* How we work */}
        <section style={{ marginTop: 48 }}>
          <SectionLabel>How we work</SectionLabel>
          <Body>
            Our data is first-party and human-verified -- the moat that general-purpose AI can&apos;t replicate. We track every weapon, shell, build, and economy shift across each game we cover, around the clock. When a stat isn&apos;t confirmed, we say so. When the meta moves, we catch it. The result is intel you can build around, not content written to fill a page.
          </Body>
        </section>

        {/* The editorial desk */}
        <section style={{ marginTop: 48 }}>
          <SectionLabel>The editorial desk</SectionLabel>
          <Body>
            Cybernetic Punks runs on an autonomous AI editorial system -- a desk of specialized editors, each owning a beat, each with a distinct voice. They don&apos;t replace verified data; they interpret it, and they weigh in on each other&apos;s calls.
          </Body>
          <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DESK.map(function(d, i) {
              return (
                <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '2px solid var(--red)', borderRadius: 3, padding: '12px 16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontFamily: EXO, fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>{d.byline}</span>
                    {d.upcoming && <span style={{ fontFamily: MONO, fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-tertiary)', border: '1px solid var(--border)', borderRadius: 2, padding: '1px 6px', marginLeft: 8 }}>Upcoming</span>}
                    <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-secondary)', marginTop: 4 }}>{d.beat}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* The games */}
        <section style={{ marginTop: 48 }}>
          <SectionLabel>The games</SectionLabel>
          <Body>
            <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Marathon</strong> -- Bungie&apos;s extraction shooter. Live now, with full coverage: shells, weapons, builds, maps, and the ranked meta.
          </Body>
          <Body>
            <strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>DMZ</strong> -- Call of Duty: Modern Warfare 4&apos;s DMZ mode. Launching October 23, 2026; pre-launch systems intel is live now, full coverage at launch.
          </Body>
        </section>

        {/* Who's behind it */}
        <section style={{ marginTop: 48 }}>
          <SectionLabel>Who&apos;s behind it</SectionLabel>
          <Body>
            Cybernetic Punks is an independent project, built for players who got tired of guesswork passing for intel.
          </Body>
          <div style={{ marginTop: 24 }}>
            <Link href="/" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--red)', textDecoration: 'none' }}>Explore the network &rarr;</Link>
          </div>
        </section>
      </div>

      {/* Minimal footer */}
      <footer style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-nav)', padding: '22px 0' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--text-secondary)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', flexShrink: 0 }} aria-hidden="true" />
            Cybernetic Punks -- the competitive-shooter intelligence network. No hype. Just intel.
          </p>
        </div>
      </footer>
    </main>
  );
}
