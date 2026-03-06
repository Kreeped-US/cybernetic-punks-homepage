// components/BuildsSection.js
// Homepage preview of DEXTER's Build Lab — shows latest builds + shell quick links
// Pulls live data from Supabase instead of hardcoded content

'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

const DEXTER_ORANGE = '#ff8800';
const CYAN = '#00f5ff';
const RED = '#ff0000';

const SHELLS = [
  { name: 'Destroyer', icon: '⬢', color: '#ff4444' },
  { name: 'Vandal', icon: '⬡', color: '#ff8800' },
  { name: 'Recon', icon: '◈', color: '#00f5ff' },
  { name: 'Assassin', icon: '◇', color: '#cc44ff' },
  { name: 'Triage', icon: '◎', color: '#00ff88' },
  { name: 'Thief', icon: '⬠', color: '#ffcc00' },
];

export default function BuildsSection() {
  const [builds, setBuilds] = useState([]);
  const [recentArticles, setRecentArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(function() {
    async function fetchData() {
      // Fetch curated builds (top 3)
      const { data: buildsData } = await supabase
        .from('builds')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(3);

      // Fetch latest DEXTER articles (top 4)
      const { data: articles } = await supabase
        .from('feed_items')
        .select('id, headline, slug, thumbnail, ce_score, tags, created_at')
        .eq('editor', 'DEXTER')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(4);

      setBuilds(buildsData || []);
      setRecentArticles(articles || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <section id="builds" style={{
      padding: '60px 20px',
      maxWidth: '1100px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: DEXTER_ORANGE,
            letterSpacing: '2px',
            marginBottom: '6px',
          }}>
            ⬢ DEXTER — BUILD ENGINEER
          </div>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(1.3rem, 4vw, 1.8rem)',
            fontWeight: 700,
            color: '#ffffff',
            margin: 0,
          }}>
            BUILD LAB
          </h2>
        </div>
        <Link href="/builds" style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '12px',
          color: DEXTER_ORANGE,
          textDecoration: 'none',
          letterSpacing: '1px',
          padding: '6px 14px',
          border: '1px solid ' + DEXTER_ORANGE + '44',
          borderRadius: '4px',
        }}>
          VIEW FULL BUILD LAB →
        </Link>
      </div>

      {/* Shell Quick Links */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        marginBottom: '24px',
      }}>
        {SHELLS.map(function(shell) {
          return (
            <Link key={shell.name} href={'/builds#shell-' + shell.name.toLowerCase()} style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: shell.color,
              padding: '4px 12px',
              background: shell.color + '11',
              border: '1px solid ' + shell.color + '33',
              borderRadius: '3px',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
            }}>
              <span>{shell.icon}</span> {shell.name}
            </Link>
          );
        })}
      </div>

      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: '#444',
        }}>
          LOADING BUILD DATA...
        </div>
      ) : (
        <>
          {/* Curated Build Cards */}
          {builds.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '14px',
              marginBottom: '24px',
            }}>
              {builds.map(function(build) {
                return (
                  <Link key={build.id} href="/builds" style={{
                    display: 'block',
                    background: '#0a0a0a',
                    border: '1px solid ' + (build.color || DEXTER_ORANGE) + '33',
                    borderRadius: '6px',
                    padding: '16px',
                    textDecoration: 'none',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '14px',
                      fontFamily: 'var(--font-heading)',
                      fontSize: '22px',
                      fontWeight: 700,
                      color: build.grade === 'S' ? RED : DEXTER_ORANGE,
                      opacity: 0.25,
                    }}>
                      {build.grade}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: build.color || DEXTER_ORANGE,
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                      marginBottom: '4px',
                    }}>
                      {build.shell} · {build.style}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#ffffff',
                      marginBottom: '6px',
                    }}>
                      {build.name}
                    </div>
                    {build.weapons && (
                      <div style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '10px',
                        color: '#555',
                      }}>
                        {build.weapons.join(' · ')}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Latest DEXTER Articles */}
          {recentArticles.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '12px',
            }}>
              {recentArticles.map(function(article) {
                return (
                  <Link key={article.id} href={'/intel/' + article.slug} style={{
                    display: 'flex',
                    gap: '12px',
                    background: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    borderRadius: '6px',
                    padding: '12px',
                    textDecoration: 'none',
                  }}>
                    {article.thumbnail && (
                      <div style={{
                        width: '80px',
                        minWidth: '80px',
                        height: '55px',
                        borderRadius: '4px',
                        overflow: 'hidden',
                      }}>
                        <img src={article.thumbnail} alt="" style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }} />
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#ffffff',
                        lineHeight: 1.3,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}>
                        {article.headline}
                      </div>
                      {article.ce_score && (
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: article.ce_score >= 80 ? RED : DEXTER_ORANGE,
                          marginTop: '4px',
                          display: 'inline-block',
                        }}>
                          CE:{article.ce_score}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}