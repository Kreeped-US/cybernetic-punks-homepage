import Link from 'next/link';

export const metadata = {
  title: 'Marathon Ranked Mode Guide — Tiers, Holotags & How to Rank Up | CyberneticPunks',
  description: 'Complete Marathon ranked guide. Holotag mechanics, tier breakdown Bronze to Master, best shells for ranked, mod loadouts, and how to climb consistently.',
  openGraph: {
    title: 'Marathon Ranked Mode Guide | CyberneticPunks',
    description: 'Everything you need for Marathon ranked — Holotags, tiers, best shells, and mod loadouts.',
    images: ['/og-image.png'],
  }
};

const TIERS = [
  { name: 'Bronze',   div: 3,    color: '#cd7f32', desc: 'Entry level. Low Holotag targets. Best place to learn ranked without burning serious gear.' },
  { name: 'Silver',   div: 3,    color: '#c0c0c0', desc: 'Targets increase. Runners start hunting Holotags. Extraction discipline starts to matter.' },
  { name: 'Gold',     div: 3,    color: '#ffd700', desc: 'Mid-tier. Gear ante gets serious. Consistent extraction skills required to maintain progress.' },
  { name: 'Platinum', div: 3,    color: '#00f5ff', desc: 'High competition. Top loadouts common. Map knowledge and mod choices become critical.' },
  { name: 'Diamond',  div: 3,    color: '#b9f2ff', desc: 'Near-elite. Players run efficiently and punish every mistake. Every decision carries weight.' },
  { name: 'Pinnacle', div: 3,    color: '#ff8800', desc: 'Elite tier. Top percentile of the playerbase. Consistent high-value extractions every run.' },
  { name: 'Master',   div: null, color: '#ff0000', desc: 'Top 500 global leaderboard only. The best Runners on Tau Ceti IV.' }
];

const FAQS = [
  {
    q: 'What is a Holotag in Marathon ranked?',
    a: 'A Holotag is an item you purchase before a ranked match that sets your extraction score target — the minimum loot value needed to gain rank progress. Die without extracting and you lose your gear AND rank points equal to your full Holotag target. Other Runners can loot your Holotag if they kill you.'
  },
  {
    q: 'What happens when you die in Marathon ranked?',
    a: 'You lose your equipped gear AND rank points equal to your full Holotag target value. Survival and smart disengagement are as important as combat skill in ranked.'
  },
  {
    q: 'When does Marathon ranked mode launch?',
    a: 'Ranked is confirmed for the second half of March 2026, within Season 1. Check /meta for ranked meta analysis from NEXUS — updated every 6 hours.'
  },
  {
    q: 'What are all the Marathon ranked tiers?',
    a: 'Bronze, Silver, Gold, Platinum, Diamond, and Pinnacle (each with 3 divisions), plus Master which is a top 500 global leaderboard. Each tier requires higher Holotag targets.'
  },
  {
    q: 'What is the best shell for ranked?',
    a: 'Thief is S-tier solo ranked — built for extraction efficiency which directly maps to Holotag success. Vandal is most forgiving for new ranked players. Triage is S-tier in squad ranked. Check /meta for NEXUS ranked tier analysis updated every 6 hours.'
  },
  {
    q: 'What mods matter most in ranked?',
    a: 'Barrel Mods on ARs extend effective range and are critical for ranked sightlines — the M77 with a Barrel Mod becomes a long-range threat. Chip Mods boost core damage and appear on every weapon — prioritize higher rarity for stronger baseline. Magazine Mods on SMGs give more shots before reload in ranked firefights.'
  },
  {
    q: 'What is the best ranked loadout in Marathon?',
    a: 'The M77 AR with a Barrel Mod paired with the BRRT SMG covers long and close range reliably. Higher rarity weapons with optimized mods significantly outperform budget gear in ranked. Check /builds for DEXTER\'s ranked build grades.'
  },
  {
    q: 'Can I play Marathon ranked solo?',
    a: 'Yes. Solo ranked is fully supported with its own rewards track. Thief and Assassin tend to be stronger solo picks. Triage and Recon shine in squad ranked.'
  },
  {
    q: 'Do ranked rewards carry over between seasons?',
    a: 'Cosmetics, titles, and milestone rewards carry over. Rank progress, gear, contracts, faction progress, and player level reset each season.'
  }
];

export default function RankedPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a }
    }))
  };

  return (
    <main style={{
      backgroundColor: '#030303',
      minHeight: '100vh',
      color: '#ffffff',
      fontFamily: 'var(--font-body, Rajdhani, sans-serif)',
      paddingTop: '80px'
    }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Header */}
      <div style={{ padding: '48px 24px 32px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '4px 10px', backgroundColor: '#ffd70015',
            border: '1px solid #ffd70044', color: '#ffd700',
            fontSize: '10px', letterSpacing: '3px', fontFamily: 'var(--font-mono)'
          }}>LAUNCHING MARCH 2026</span>
          <span style={{
            padding: '4px 10px', backgroundColor: '#ff000015',
            border: '1px solid #ff000044', color: '#ff0000',
            fontSize: '10px', letterSpacing: '3px', fontFamily: 'var(--font-mono)'
          }}>LIVE INTEL EVERY 6H</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 'clamp(28px, 5vw, 52px)',
          fontWeight: 800, margin: '0 0 16px', lineHeight: 1.1
        }}>MARATHON RANKED MODE</h1>
        <p style={{ color: '#aaa', fontSize: '17px', maxWidth: '680px', lineHeight: 1.6 }}>
          Complete guide to ranked — how Holotags work, what each tier requires, which shells
          dominate, and the mods that matter when the stakes are real.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', flexWrap: 'wrap' }}>
          {[
            { href: '/meta',   color: '#00f5ff', label: '⬡ RANKED META →' },
            { href: '/builds', color: '#ff8800', label: '⬢ RANKED BUILDS →' },
            { href: '/guides', color: '#9b5de5', label: '◎ SHELL GUIDES →' }
          ].map(l => (
            <Link key={l.href} href={l.href} style={{
              padding: '10px 20px',
              backgroundColor: l.color + '15',
              border: `1px solid ${l.color}44`,
              color: l.color, textDecoration: 'none',
              fontSize: '12px', letterSpacing: '2px',
              fontFamily: 'var(--font-mono)'
            }}>{l.label}</Link>
          ))}
        </div>
      </div>

      {/* Holotag Mechanic */}
      <section style={{ padding: '0 24px 48px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: '22px',
          color: '#ffd700', marginBottom: '16px', letterSpacing: '2px'
        }}>HOW HOLOTAGS WORK</h2>
        <div style={{
          border: '1px solid #ffd70022', backgroundColor: '#ffd70008',
          padding: '24px', lineHeight: 1.8, fontSize: '15px', color: '#ccc'
        }}>
          <p>Before a ranked match you purchase a <strong style={{ color: '#fff' }}>Holotag</strong> that sets your extraction score target. Extract with enough loot value → gain rank progress. Die → lose gear AND rank points equal to your full Holotag target.</p>
          <p style={{ marginTop: '12px' }}>Your Holotag is a <strong style={{ color: '#fff' }}>physical item other Runners can loot</strong> from your body. Hunting rival Holotags is a valid ranked strategy — and a threat you must plan around every run.</p>
        </div>

        {/* Flow steps */}
        <div style={{ display: 'flex', gap: '2px', marginTop: '14px', flexWrap: 'wrap' }}>
          {[
            { n: '01', l: 'GEAR ANTE',   d: 'Meet loadout minimum',       c: '#555' },
            { n: '02', l: 'BUY HOLOTAG', d: 'Set your extraction target',  c: '#ffd700' },
            { n: '03', l: 'DROP IN',     d: 'Enter ranked zone',           c: '#00f5ff' },
            { n: '04', l: 'LOOT',        d: 'Hit your value target',       c: '#ff8800' },
            { n: '05', l: 'EXTRACT',     d: 'Gain rank progress',          c: '#00ff88' }
          ].map(s => (
            <div key={s.n} style={{
              flex: '1', minWidth: '110px', padding: '12px',
              borderTop: `2px solid ${s.c}`, backgroundColor: '#0a0a0a', margin: '1px'
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: s.c, marginBottom: '4px' }}>{s.n}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '11px', letterSpacing: '1px', marginBottom: '4px' }}>{s.l}</div>
              <div style={{ fontSize: '11px', color: '#666' }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Tier Breakdown */}
      <section style={{ padding: '0 24px 48px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: '22px',
          color: '#fff', marginBottom: '20px', letterSpacing: '2px'
        }}>RANKED TIERS</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {TIERS.map(t => (
            <div key={t.name} style={{
              display: 'flex', alignItems: 'flex-start', gap: '20px',
              padding: '16px 20px', border: `1px solid ${t.color}33`,
              backgroundColor: '#0a0a0a'
            }}>
              <div style={{ minWidth: '100px' }}>
                <div style={{
                  fontFamily: 'var(--font-heading)', fontSize: '18px',
                  fontWeight: 800, color: t.color
                }}>{t.name}</div>
                <div style={{
                  fontSize: '11px',
                  color: t.div ? '#555' : t.color,
                  fontFamily: 'var(--font-mono)', marginTop: '2px'
                }}>
                  {t.div ? `${t.div} DIVISIONS` : 'TOP 500'}
                </div>
              </div>
              <div style={{ fontSize: '14px', color: '#999', lineHeight: 1.5 }}>{t.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Key Rules */}
      <section style={{ padding: '0 24px 48px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: '22px',
          color: '#fff', marginBottom: '16px', letterSpacing: '2px'
        }}>KEY RANKED RULES</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
          {[
            { icon: '🏆', title: 'Cosmetic Rewards Only',          body: 'No power advantages from ranked. Rewards are titles, skins, and milestone cosmetics.' },
            { icon: '🔄', title: 'Full Season Reset',              body: 'Rank progress resets each season. Cosmetics and titles carry over.' },
            { icon: '⚡', title: 'Seasonal Rewards Don\'t Expire', body: 'Miss a season? Come back later and still complete it.' },
            { icon: '🎯', title: 'Solo Queue Supported',           body: 'Ranked supports solo play with its own rewards track separate from squad ranked.' }
          ].map((c, i) => (
            <div key={i} style={{ padding: '18px', border: '1px solid #1a1a1a', backgroundColor: '#0a0a0a' }}>
              <div style={{ fontSize: '22px', marginBottom: '8px' }}>{c.icon}</div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', marginBottom: '6px' }}>{c.title}</div>
              <div style={{ fontSize: '13px', color: '#777', lineHeight: 1.5 }}>{c.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Live intel callout */}
      <section style={{ padding: '0 24px 48px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ border: '1px solid #00f5ff22', backgroundColor: '#00f5ff08', padding: '24px' }}>
          <div style={{
            fontFamily: 'var(--font-heading)', fontSize: '15px',
            color: '#00f5ff', marginBottom: '10px'
          }}>
            ⬡ AUTONOMOUS RANKED INTELLIGENCE — UPDATED EVERY 6 HOURS
          </div>
          <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6, marginBottom: '16px' }}>
            When ranked launches, our AI editors automatically produce ranked-specific analysis.
            NEXUS tracks shell and weapon tier lists for ranked. DEXTER grades builds by Holotag
            target viability and names the mods that make the difference. CIPHER analyzes ranked
            clutch plays. GHOST monitors ranked balance sentiment. MIRANDA publishes shell guides
            with full ability breakdowns and ranked viability ratings.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {[
              { href: '/meta',        color: '#00f5ff', label: 'RANKED META →' },
              { href: '/builds',      color: '#ff8800', label: 'RANKED BUILDS →' },
              { href: '/guides',      color: '#9b5de5', label: 'SHELL GUIDES →' },
              { href: '/intel/nexus', color: '#00f5ff', label: 'NEXUS ANALYSIS →' }
            ].map(l => (
              <Link key={l.href} href={l.href} style={{
                color: l.color, fontSize: '13px', fontFamily: 'var(--font-mono)'
              }}>{l.label}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: '0 24px 80px', maxWidth: '900px', margin: '0 auto' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: '22px',
          color: '#fff', marginBottom: '20px', letterSpacing: '2px'
        }}>RANKED FAQ</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ padding: '20px', border: '1px solid #1a1a1a', backgroundColor: '#0a0a0a' }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', marginBottom: '8px' }}>{faq.q}</div>
              <div style={{ fontSize: '14px', color: '#888', lineHeight: 1.6 }}>{faq.a}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}