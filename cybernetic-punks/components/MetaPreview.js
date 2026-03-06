// components/MetaPreview.js
// Homepage "What's Meta Right Now" section — LIVE from Supabase meta_tiers table

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

var TIER_ORDER = ['S', 'A', 'B', 'C', 'D'];

var TIER_STYLES = {
  S: { bg: 'rgba(255,0,0,0.12)', color: '#ff0000', border: 'rgba(255,0,0,0.2)' },
  A: { bg: 'rgba(255,136,0,0.1)', color: '#ff8800', border: 'rgba(255,136,0,0.15)' },
  B: { bg: 'rgba(255,204,0,0.08)', color: '#ffcc00', border: 'rgba(255,204,0,0.12)' },
  C: { bg: 'rgba(0,245,255,0.06)', color: '#00f5ff', border: 'rgba(0,245,255,0.1)' },
  D: { bg: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.3)', border: 'rgba(255,255,255,0.06)' },
};

var TREND_DISPLAY = {
  up: { label: '▲ RISING', color: '#00ff88' },
  down: { label: '▼ FALLING', color: '#ff0000' },
  stable: { label: '● STABLE', color: 'rgba(255,255,255,0.3)' },
};

var TYPE_COLORS = {
  weapon: '#ff0000',
  strategy: '#00f5ff',
  loadout: '#ff8800',
  shell: '#cc44ff',
  ability: '#00ff88',
};

function getTypeColor(type) {
  if (!type) return '#444';
  var key = type.toLowerCase();
  return TYPE_COLORS[key] || '#444';
}

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

export default function MetaPreview() {
  var [tiers, setTiers] = useState({});
  var [loading, setLoading] = useState(true);
  var [lastUpdated, setLastUpdated] = useState(null);

  useEffect(function() {
    async function fetchMeta() {
      var { data, error } = await supabase
        .from('meta_tiers')
        .select('*')
        .order('updated_at', { ascending: false });

      if (data && data.length > 0) {
        // Group by tier
        var grouped = {};
        data.forEach(function(item) {
          var t = item.tier || 'B';
          if (!grouped[t]) grouped[t] = [];
          grouped[t].push(item);
        });
        setTiers(grouped);
        setLastUpdated(data[0].updated_at);
      }
      setLoading(false);
    }
    fetchMeta();
  }, []);

  // Only show tiers that have entries, in order
  var activeTiers = TIER_ORDER.filter(function(t) { return tiers[t] && tiers[t].length > 0; });

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
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span>NEXUS — META STRATEGIST</span>
            {lastUpdated && (
              <span style={{ color: '#00f5ff', opacity: 0.5 }}>{formatUpdatedAt(lastUpdated)}</span>
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

      {/* Loading state */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 13,
          color: '#444',
        }}>
          LOADING META DATA...
        </div>
      ) : activeTiers.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 13,
          color: '#444',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: 8,
          border: '1px dashed rgba(255,255,255,0.06)',
        }}>
          META TIERS LOADING — CHECK BACK SOON
        </div>
      ) : (
        <Link href="/meta" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            {activeTiers.map(function(tier) {
              var style = TIER_STYLES[tier] || TIER_STYLES.D;
              var items = tiers[tier];

              return (
                <div key={tier} style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'stretch',
                }}>
                  {/* Tier badge */}
                  <div style={{
                    width: 52,
                    minHeight: 52,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'Orbitron, monospace',
                    fontSize: 22,
                    fontWeight: 900,
                    background: style.bg,
                    color: style.color,
                    borderRadius: 8,
                    border: '1px solid ' + style.border,
                    flexShrink: 0,
                  }}>
                    {tier}
                  </div>

                  {/* Items */}
                  <div style={{
                    display: 'flex',
                    gap: 10,
                    flex: 1,
                    flexWrap: 'wrap',
                  }}>
                    {items.map(function(item) {
                      var trend = TREND_DISPLAY[item.trend] || TREND_DISPLAY.stable;
                      var typeColor = getTypeColor(item.type);

                      return (
                        <div key={item.id} style={{
                          flex: '1 1 220px',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 8,
                          padding: '14px 18px',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s, transform 0.2s',
                        }}>
                          {/* Name + trend */}
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 6,
                          }}>
                            <span style={{
                              fontFamily: 'Orbitron, monospace',
                              fontSize: 14,
                              fontWeight: 600,
                              color: '#fff',
                            }}>
                              {item.name}
                            </span>
                            <span style={{
                              fontFamily: 'Share Tech Mono, monospace',
                              fontSize: 10,
                              color: trend.color,
                            }}>
                              {trend.label}
                            </span>
                          </div>

                          {/* Type badge */}
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}>
                            <span style={{
                              fontFamily: 'Share Tech Mono, monospace',
                              fontSize: 10,
                              color: typeColor,
                              letterSpacing: 1,
                              padding: '2px 6px',
                              background: typeColor + '11',
                              border: '1px solid ' + typeColor + '22',
                              borderRadius: 3,
                            }}>
                              {(item.type || 'META').toUpperCase()}
                            </span>
                            {/* Note preview */}
                            {item.note && (
                              <span style={{
                                fontFamily: 'Rajdhani, sans-serif',
                                fontSize: 12,
                                color: 'rgba(255,255,255,0.3)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                              }}>
                                {item.note}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </Link>
      )}
    </section>
  );
}