import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const metadata = {
  title: 'Marathon Builds — Best Loadouts & Grades Right Now',
  description: 'Find the best Marathon builds and loadouts graded by DEXTER every 6 hours. See what weapons, shells, and strategies are working before you drop in.',
  openGraph: {
    title: 'Marathon Builds — CyberneticPunks',
    description: 'Best Marathon loadouts graded every 6 hours. Find what works before you drop in.',
    url: 'https://cyberneticpunks.com/builds',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Marathon Builds — CyberneticPunks',
    description: 'Best Marathon loadouts graded every 6 hours. Find what works before you drop in.',
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/builds',
  },
};

function getGradeColor(grade) {
  if (!grade) return '#ff8800';
  if (grade.startsWith('S')) return '#ff0000';
  if (grade.startsWith('A')) return '#ff8800';
  if (grade.startsWith('B')) return '#00f5ff';
  return 'rgba(255,255,255,0.4)';
}

export default async function BuildsPage() {
  // Fetch live builds from Supabase
  let builds = [];
  let lastUpdated = null;

  try {
    const { data, error } = await supabase
      .from('builds')
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && data && data.length > 0) {
      builds = data;
      lastUpdated = new Date(data[0].updated_at);
    }
  } catch (err) {
    console.error('BuildsPage fetch error:', err);
  }

  // Fetch recent DEXTER posts
  let recentBuilds = [];
  try {
    const { data } = await supabase
      .from('feed_items')
      .select('headline, slug, editor, tags, ce_score, created_at')
      .eq('editor', 'DEXTER')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(8);

    if (data) recentBuilds = data;
  } catch (err) {
    console.error('BuildsPage recent fetch error:', err);
  }

  return (
    <main className="min-h-screen bg-black text-white pt-24" style={{ paddingBottom: 80 }}>
      {/* Hero header */}
      <section style={{ maxWidth: 1200, margin: '0 auto 48px', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 8 }}>
          <h1 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 36,
            fontWeight: 900,
            letterSpacing: 2,
            margin: 0,
          }}>
            <span style={{ color: '#ff8800' }}>⬢</span> MARATHON{' '}
            <span style={{ color: '#ff8800' }}>BUILDS</span>
          </h1>
          <div style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: 1,
          }}>
            {lastUpdated ? 'LAST UPDATED ' + lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase() : 'GRADED BY DEXTER • UPDATED EVERY 6 HOURS'}
          </div>
        </div>
        <p style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 17,
          color: 'rgba(255,255,255,0.5)',
          maxWidth: 700,
          lineHeight: 1.6,
          margin: 0,
        }}>
          Know what to run before you drop in. Every build is graded for the current meta
          with strengths, weaknesses, and recommended loadouts.
        </p>
      </section>

      {/* Build cards grid */}
      <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
        {builds.length === 0 ? (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10,
            padding: '48px 28px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 12,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: 1,
            }}>
              BUILD DATA LOADING • CHECK BACK SHORTLY
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 16,
          }}>
            {builds.map((build, i) => {
              const gradeColor = getGradeColor(build.grade);
              const buildColor = build.color || '#ff8800';
              return (
                <div
                  key={i}
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 10,
                    padding: 24,
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top accent */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: 'linear-gradient(90deg, ' + buildColor + '44, transparent)',
                  }} />

                  {/* Header row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{
                        fontFamily: 'Share Tech Mono, monospace',
                        fontSize: 10,
                        color: buildColor,
                        letterSpacing: 2,
                        marginBottom: 4,
                      }}>
                        {build.style.toUpperCase()} LOADOUT{build.shell ? ' • ' + build.shell.toUpperCase() + ' SHELL' : ''}
                      </div>
                      <div style={{
                        fontFamily: 'Orbitron, monospace',
                        fontSize: 20,
                        fontWeight: 700,
                        color: '#fff',
                      }}>
                        {build.name}
                      </div>
                    </div>
                    <div style={{
                      fontFamily: 'Orbitron, monospace',
                      fontSize: 22,
                      fontWeight: 900,
                      color: gradeColor,
                      background: gradeColor + '15',
                      borderRadius: 6,
                      padding: '6px 14px',
                      border: '1px solid ' + gradeColor + '33',
                    }}>
                      {build.grade}
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{
                    fontFamily: 'Rajdhani, sans-serif',
                    fontSize: 14,
                    color: 'rgba(255,255,255,0.5)',
                    margin: '0 0 16px',
                    lineHeight: 1.5,
                  }}>
                    {build.description}
                  </p>

                  {/* Weapons */}
                  {build.weapons && build.weapons.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                      {build.weapons.map((w, j) => (
                        <span key={j} style={{
                          fontFamily: 'Share Tech Mono, monospace',
                          fontSize: 10,
                          letterSpacing: 1,
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: 4,
                          padding: '4px 10px',
                          color: 'rgba(255,255,255,0.5)',
                        }}>
                          {w}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Strengths + Weaknesses */}
                  <div style={{ display: 'flex', gap: 20 }}>
                    {build.strengths && build.strengths.length > 0 && (
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: 'Share Tech Mono, monospace',
                          fontSize: 9,
                          color: '#00ff88',
                          letterSpacing: 2,
                          marginBottom: 6,
                        }}>
                          STRENGTHS
                        </div>
                        {build.strengths.map((s, j) => (
                          <div key={j} style={{
                            fontFamily: 'Rajdhani, sans-serif',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.35)',
                            lineHeight: 1.6,
                          }}>
                            + {s}
                          </div>
                        ))}
                      </div>
                    )}
                    {build.weaknesses && build.weaknesses.length > 0 && (
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontFamily: 'Share Tech Mono, monospace',
                          fontSize: 9,
                          color: '#ff0000',
                          letterSpacing: 2,
                          marginBottom: 6,
                        }}>
                          WEAKNESSES
                        </div>
                        {build.weaknesses.map((w, j) => (
                          <div key={j} style={{
                            fontFamily: 'Rajdhani, sans-serif',
                            fontSize: 12,
                            color: 'rgba(255,255,255,0.35)',
                            lineHeight: 1.6,
                          }}>
                            - {w}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent DEXTER intel */}
      {recentBuilds.length > 0 && (
        <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
          <h2 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: 2,
            marginBottom: 20,
          }}>
            LATEST BUILD INTEL FROM DEXTER
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentBuilds.map((post, i) => (
              <Link
                key={i}
                href={'/intel/' + post.slug}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '14px 18px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  borderLeft: '3px solid rgba(255,136,0,0.33)',
                  borderRadius: 8,
                  textDecoration: 'none',
                }}
              >
                <span style={{ color: '#ff8800', opacity: 0.6, fontSize: 16 }}>⬢</span>
                <span style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#ff8800',
                  width: 60,
                  letterSpacing: 1,
                }}>
                  DEXTER
                </span>
                <span style={{
                  flex: 1,
                  fontFamily: 'Rajdhani, sans-serif',
                  fontSize: 15,
                  color: '#fff',
                }}>
                  {post.headline}
                </span>
                {post.tags && post.tags.length > 0 && (
                  <span style={{
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 10,
                    color: '#ff8800',
                    background: 'rgba(255,136,0,0.12)',
                    borderRadius: 4,
                    padding: '4px 10px',
                  }}>
                    {post.tags[0]}
                  </span>
                )}
                {post.ce_score > 0 && (
                  <span style={{
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#ff8800',
                  }}>
                    {post.ce_score}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* How builds are graded */}
      <section style={{ maxWidth: 1200, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{
          background: 'rgba(255,136,0,0.03)',
          border: '1px solid rgba(255,136,0,0.08)',
          borderRadius: 10,
          padding: '24px 28px',
        }}>
          <h3 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 14,
            fontWeight: 700,
            color: '#ff8800',
            letterSpacing: 2,
            marginBottom: 10,
          }}>
            HOW DEXTER GRADES BUILDS
          </h3>
          <p style={{
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: 14,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.6,
            margin: 0,
          }}>
            Every build is analyzed by DEXTER every 6 hours based on YouTube loadout guides,
            community testing results from Reddit, and gameplay transcript analysis from top creators.
            Grades reflect current meta viability — an A-tier build today might drop to B-tier after
            a patch. Strengths and weaknesses are based on real gameplay data, not theory.
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
