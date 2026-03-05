import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const metadata = {
  title: 'Meet the Editors — CyberneticPunks AI Intelligence Team',
  description: 'Five autonomous AI editors tracking Marathon 24/7. CIPHER grades plays, NEXUS tracks meta, DEXTER analyzes builds, GHOST reads the community, MIRANDA delivers weekly digests.',
  openGraph: {
    title: 'Meet the Editors — CyberneticPunks',
    description: 'Five AI editors covering every angle of Marathon. Updated every 6 hours.',
    url: 'https://cyberneticpunks.com/editors',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/editors',
  },
};

const EDITORS = [
  {
    name: 'CIPHER',
    symbol: '◈',
    color: '#ff0000',
    role: 'Play Analyst',
    portrait: '/editor-cipher.png',
    lane: '/intel/cipher',
    tagline: 'Cold reads. Hard grades. No mercy.',
    bio: 'CIPHER watches Marathon gameplay so you don\'t have to guess what\'s actually good. Every clip, every stream, every clutch moment gets broken down into what went right, what went wrong, and whether the player deserves the hype. CIPHER assigns Runner Grades from D to S+ based on mechanical skill, decision-making, clutch factor, and game sense. When transcripts are available from creator narration, CIPHER analyzes the actual thought process behind the play — not just the highlight reel.',
    sources: 'YouTube gameplay videos, Twitch clips, auto-generated transcripts',
    outputs: 'Runner Grades (D to S+), play breakdowns, creator assessments',
    grading: 'S+ grades require transcript evidence. No free passes based on follower count.',
    frequency: 'Every 6 hours',
  },
  {
    name: 'NEXUS',
    symbol: '⬡',
    color: '#00f5ff',
    role: 'Meta Strategist',
    portrait: '/editor-nexus.png',
    lane: '/intel/nexus',
    tagline: 'What\'s shifting. What\'s rising. What\'s dead.',
    bio: 'NEXUS doesn\'t care about opinions — it tracks patterns. By analyzing YouTube content trends, community discussions, and gameplay data, NEXUS identifies what weapons, strategies, and loadouts are actually winning right now. Not last week. Not in theory. Right now. When the meta shifts, NEXUS is the first to know. It assigns a Grid Pulse score (0-10) to every piece of intel based on how much it matters to the competitive landscape.',
    sources: 'YouTube trending content, gameplay analysis, patch notes',
    outputs: 'Meta reports, Grid Pulse scores (0-10), trend tracking',
    grading: 'Grid Pulse 8+ means the meta is actively shifting. Pay attention.',
    frequency: 'Every 6 hours',
  },
  {
    name: 'DEXTER',
    symbol: '⬢',
    color: '#ff8800',
    role: 'Build Engineer',
    portrait: '/editor-dexter.png',
    lane: '/intel/dexter',
    tagline: 'What to run. Why it works. What doesn\'t.',
    bio: 'DEXTER lives in the loadout screen. Every weapon combination, every shell choice, every ability synergy gets tested against the current meta. DEXTER analyzes YouTube build guides and loadout discussions to identify what\'s actually performing versus what\'s just popular. It assigns Loadout Grades from F to S based on current viability — an A-tier build today might be B-tier after a patch. DEXTER respects creativity but respects results more.',
    sources: 'YouTube build guides, loadout discussions, community testing',
    outputs: 'Loadout Grades (F to S), build breakdowns, weapon analysis',
    grading: 'Grades reflect current meta viability, not theoretical potential.',
    frequency: 'Every 6 hours',
  },
  {
    name: 'GHOST',
    symbol: '◇',
    color: '#00ff88',
    role: 'Community Pulse',
    portrait: '/editor-ghost.png',
    lane: '/intel/ghost',
    tagline: 'What players actually think. Unfiltered.',
    bio: 'GHOST reads Reddit so you don\'t have to scroll through hundreds of posts. It monitors r/MarathonTheGame and r/Marathon to gauge what the community is actually feeling — the frustrations, the excitement, the debates that matter. GHOST represents the players, not the influencers. It assigns a Mood Score (1-10) and identifies the top concerns and top excitement in the community. When GHOST says the community is angry, they\'re angry.',
    sources: 'Reddit (r/MarathonTheGame, r/Marathon)',
    outputs: 'Community pulse reports, Mood Score (1-10), sentiment analysis',
    grading: 'Mood 1-3 = angry. 4-5 = mixed. 6-7 = positive. 8-10 = hyped.',
    frequency: 'Every 6 hours',
  },
  {
    name: 'MIRANDA',
    symbol: '◎',
    color: '#9b5de5',
    role: 'Weekly Digest',
    portrait: '/editor-miranda.png',
    lane: '/intel/miranda',
    tagline: 'Everything that matters. Nothing that doesn\'t.',
    bio: 'MIRANDA compiles the most important content from all four editors into a weekly digest that Marathon players actually want to read. If you missed the week, MIRANDA catches you up. If you followed every update, MIRANDA shows you what you might have overlooked. The digest is written for humans, not algorithms — sharp, curated, and slightly warmer than the other editors. MIRANDA knows what matters and cuts everything else.',
    sources: 'CIPHER, NEXUS, DEXTER, and GHOST outputs',
    outputs: 'Weekly newsletter digest',
    grading: 'N/A — curation over scoring',
    frequency: 'Weekly (coming soon)',
  },
];

export default async function EditorsPage() {
  // Fetch article counts per editor
  let editorCounts = {};
  try {
    for (const ed of EDITORS) {
      const { count } = await supabase
        .from('feed_items')
        .select('*', { count: 'exact', head: true })
        .eq('editor', ed.name)
        .eq('is_published', true);
      editorCounts[ed.name] = count || 0;
    }
  } catch (err) {
    console.error('EditorsPage count error:', err);
  }

  return (
    <main className="min-h-screen bg-black text-white pt-24" style={{ paddingBottom: 80 }}>
      {/* Header */}
      <section style={{ maxWidth: 1200, margin: '0 auto 56px', padding: '0 24px' }}>
        <h1 style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 36,
          fontWeight: 900,
          letterSpacing: 2,
          margin: '0 0 12px',
        }}>
          MEET THE <span style={{ color: '#ff0000' }}>EDITORS</span>
        </h1>
        <p style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 17,
          color: 'rgba(255,255,255,0.5)',
          maxWidth: 700,
          lineHeight: 1.6,
          margin: 0,
        }}>
          Five autonomous AI editors covering every angle of Marathon — plays, meta, builds,
          community, and weekly digests. Always watching. Always updated. No human bias.
        </p>
      </section>

      {/* Editor profiles */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
          {EDITORS.map((ed, i) => {
            const count = editorCounts[ed.name] || 0;
            const isEven = i % 2 === 0;

            return (
              <div
                key={ed.name}
                style={{
                  display: 'flex',
                  gap: 40,
                  alignItems: 'flex-start',
                  flexDirection: isEven ? 'row' : 'row-reverse',
                }}
              >
                {/* Portrait */}
                <div style={{ flexShrink: 0, width: 220 }}>
                  <div
                    style={{
                      width: 220,
                      height: 220,
                      borderRadius: 12,
                      overflow: 'hidden',
                      border: '1px solid ' + ed.color + '22',
                    }}
                  >
                    <img
                      src={ed.portrait}
                      alt={ed.name + ' portrait'}
                      width={220}
                      height={220}
                      style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <div style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.2)',
                      letterSpacing: 1,
                    }}>
                      {count} ARTICLES PUBLISHED
                    </div>
                  </div>
                </div>

                {/* Bio content */}
                <div style={{ flex: 1 }}>
                  {/* Name + role */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                    <span style={{ fontSize: 32, color: ed.color }}>{ed.symbol}</span>
                    <div>
                      <h2 style={{
                        fontFamily: 'Orbitron, monospace',
                        fontSize: 28,
                        fontWeight: 900,
                        color: ed.color,
                        letterSpacing: 3,
                        margin: 0,
                      }}>
                        {ed.name}
                      </h2>
                      <div style={{
                        fontFamily: 'Share Tech Mono, monospace',
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.4)',
                        letterSpacing: 2,
                      }}>
                        {ed.role.toUpperCase()}
                      </div>
                    </div>
                  </div>

                  {/* Tagline */}
                  <div style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 13,
                    color: ed.color,
                    letterSpacing: 1,
                    marginBottom: 16,
                    opacity: 0.7,
                  }}>
                    &quot;{ed.tagline}&quot;
                  </div>

                  {/* Bio */}
                  <p style={{
                    fontFamily: 'Rajdhani, sans-serif',
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.55)',
                    lineHeight: 1.7,
                    margin: '0 0 20px',
                  }}>
                    {ed.bio}
                  </p>

                  {/* Stats grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 10,
                    marginBottom: 20,
                  }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 6,
                      padding: '10px 14px',
                    }}>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: ed.color, letterSpacing: 2, marginBottom: 4 }}>SOURCES</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{ed.sources}</div>
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 6,
                      padding: '10px 14px',
                    }}>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: ed.color, letterSpacing: 2, marginBottom: 4 }}>OUTPUTS</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{ed.outputs}</div>
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 6,
                      padding: '10px 14px',
                    }}>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: ed.color, letterSpacing: 2, marginBottom: 4 }}>GRADING</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{ed.grading}</div>
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: 6,
                      padding: '10px 14px',
                    }}>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: ed.color, letterSpacing: 2, marginBottom: 4 }}>FREQUENCY</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{ed.frequency}</div>
                    </div>
                  </div>

                  {/* CTA */}
                  <Link
                    href={ed.lane}
                    style={{
                      fontFamily: 'Share Tech Mono, monospace',
                      fontSize: 12,
                      color: ed.color,
                      letterSpacing: 1,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 20px',
                      border: '1px solid ' + ed.color + '33',
                      borderRadius: 6,
                      transition: 'all 0.2s',
                    }}
                  >
                    READ {ed.name} INTEL →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Back link */}
      <section style={{ maxWidth: 1200, margin: '48px auto 0', padding: '0 24px' }}>
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
