'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

function formatUpdatedAt(dateStr) {
  if (!dateStr) return '';
  var now = new Date();
  var then = new Date(dateStr);
  var diffMs = now - then;
  var diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'UPDATED JUST NOW';
  if (diffH < 24) return 'UPDATED ' + diffH + 'H AGO';
  var diffD = Math.floor(diffH / 24);
  return 'UPDATED ' + diffD + 'D AGO';
}

var TAG_COLORS = {
  'SHIFTING':       '#ff8800',
  'STABILIZING':    '#00f5ff',
  'RANKED_FOCUS':   '#ffd700',
  'LAUNCH_PHASE':   '#ff0000',
  'THIEF_RISING':   '#cc44ff',
  'META_FRACTURE':  '#ff0000',
  'CONTENT_RUSH':   '#ff8800',
  'OPTIMIZATION':   '#00f5ff',
};

function TagPill({ tag }) {
  var color = TAG_COLORS[tag] || '#555';
  return (
    <span style={{
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: 10,
      color: color,
      padding: '2px 7px',
      background: color + '18',
      border: '1px solid ' + color + '33',
      borderRadius: 3,
      letterSpacing: 1,
    }}>
      {tag.replace(/_/g, ' ')}
    </span>
  );
}

export default function MetaPreview() {
  var [articles, setArticles] = useState([]);
  var [loading, setLoading] = useState(true);

  useEffect(function() {
    async function fetchMeta() {
      var { data } = await supabase
        .from('feed_items')
        .select('id, headline, slug, tags, created_at, body')
        .eq('editor', 'NEXUS')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(4);

      setArticles(data || []);
      setLoading(false);
    }
    fetchMeta();
  }, []);

  return (
    <section id="meta" style={{
      maxWidth: 1200,
      margin: '0 auto 64px',
      padding: '0 24px',
      scrollMarginTop: 80,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div>
          <h2 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 20,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: 2,
            margin: 0,
          }}>
            <span style={{ color: '#00f5ff' }}>⬡</span> WHAT&apos;S META RIGHT NOW
          </h2>
          <div style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: 1,
            marginTop: 4,
          }}>
            NEXUS — META STRATEGIST
            {articles[0] && (
              <span style={{ color: '#00f5ff', opacity: 0.5, marginLeft: 12 }}>
                {formatUpdatedAt(articles[0].created_at)}
              </span>
            )}
          </div>
        </div>
        <Link href="/meta" style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 11,
          color: '#00f5ff',
          letterSpacing: 1,
          textDecoration: 'none',
        }}>
          VIEW FULL TIER LIST →
        </Link>
      </div>

      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 13,
          color: '#333',
        }}>
          SCANNING META...
        </div>
      ) : articles.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 13,
          color: '#444',
          background: 'rgba(255,255,255,0.02)',
          border: '1px dashed rgba(255,255,255,0.06)',
          borderRadius: 8,
        }}>
          NEXUS INITIALIZING — META INTEL INCOMING
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Featured latest article */}
          <Link href={'/intel/' + articles[0].slug} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'rgba(0,245,255,0.04)',
              border: '1px solid rgba(0,245,255,0.15)',
              borderLeft: '3px solid #00f5ff',
              borderRadius: 8,
              padding: '18px 20px',
              cursor: 'pointer',
            }}>
              <div style={{
                fontFamily: 'Orbitron, monospace',
                fontSize: 15,
                fontWeight: 600,
                color: '#fff',
                marginBottom: 8,
                lineHeight: 1.3,
              }}>
                {articles[0].headline}
              </div>
              <div style={{
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: 13,
                color: 'rgba(255,255,255,0.4)',
                marginBottom: 10,
                lineHeight: 1.5,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}>
                {articles[0].body?.replace(/\*\*/g, '').slice(0, 140)}...
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(articles[0].tags || []).slice(0, 4).map(function(tag) {
                  return <TagPill key={tag} tag={tag} />;
                })}
              </div>
            </div>
          </Link>

          {/* Previous 3 as compact rows */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
            {articles.slice(1).map(function(article) {
              return (
                <Link key={article.id} href={'/intel/' + article.slug} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 6,
                    padding: '12px 14px',
                    cursor: 'pointer',
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-body, Rajdhani, sans-serif)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#ccc',
                      marginBottom: 6,
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {article.headline}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {(article.tags || []).slice(0, 2).map(function(tag) {
                        return <TagPill key={tag} tag={tag} />;
                      })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          <Link href="/sitrep" style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 11,
            color: 'rgba(0,245,255,0.5)',
            letterSpacing: 1,
            textDecoration: 'none',
            marginTop: 4,
          }}>
            FULL META SITREP →
          </Link>
        </div>
      )}
    </section>
  );
}