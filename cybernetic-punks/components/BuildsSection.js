'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

var DEXTER_ORANGE = '#ff8800';

var SHELLS = [
  { name: 'Destroyer', icon: '⬢', color: '#ff4444' },
  { name: 'Vandal',    icon: '⬡', color: '#ff8800' },
  { name: 'Recon',     icon: '◈', color: '#00f5ff' },
  { name: 'Assassin',  icon: '◇', color: '#cc44ff' },
  { name: 'Triage',    icon: '◎', color: '#00ff88' },
  { name: 'Thief',     icon: '⬠', color: '#ffcc00' },
];

export default function BuildsSection() {
  var [articles, setArticles] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    async function fetchData() {
      var { data } = await supabase
        .from('feed_items')
        .select('id, headline, slug, thumbnail, ce_score, tags, created_at')
        .eq('editor', 'DEXTER')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(4);

      setArticles(data || []);
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
          color: '#333',
        }}>
          SCANNING BUILDS...
        </div>
      ) : articles.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          fontFamily: 'var(--font-mono)',
          fontSize: '13px',
          color: '#444',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.06)',
          borderRadius: 8,
        }}>
          DEXTER INITIALIZING — BUILD ANALYSIS INCOMING
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '12px',
        }}>
          {articles.map(function(article) {
            var ceRaw = article.ce_score;
            var ceDisplay = ceRaw
              ? (ceRaw > 10 ? (ceRaw / 100).toFixed(1) : Number(ceRaw).toFixed(1))
              : null;

            return (
              <Link key={article.id} href={'/intel/' + article.slug} style={{
                display: 'flex',
                gap: '12px',
                background: '#0a0a0a',
                border: '1px solid #1a1a1a',
                borderTop: '2px solid ' + DEXTER_ORANGE + '55',
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
                      opacity: 0.85,
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
                    marginBottom: '4px',
                  }}>
                    {article.headline}
                  </div>
                  {ceDisplay && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: Number(ceDisplay) >= 8 ? '#00ff88' : DEXTER_ORANGE,
                    }}>
                      CE {ceDisplay}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
