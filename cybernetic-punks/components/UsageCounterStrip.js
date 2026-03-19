'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function AnimatedCount({ target, duration = 1200 }) {
  var [current, setCurrent] = useState(0);

  useEffect(function() {
    if (!target || target === 0) return;
    var start = 0;
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target, duration]);

  return current.toLocaleString();
}

export default function UsageCounterStrip() {
  var [stats, setStats] = useState(null);
  var [visible, setVisible] = useState(false);

  useEffect(function() {
    async function fetchStats() {
      try {
        var { data, error } = await supabase
          .from('site_events')
          .select('event_name');

        if (error || !data) return;

        var builds    = data.filter(function(e) { return e.event_name === 'advisor_generate'; }).length;
        var tierlists = data.filter(function(e) { return e.event_name === 'tierlist_share'; }).length;
        var metaViews = data.filter(function(e) { return e.event_name === 'meta_view'; }).length;

        setStats({ builds, tierlists, metaViews });
        setTimeout(function() { setVisible(true); }, 100);
      } catch (err) {
        // Non-fatal — strip just doesn't render
      }
    }
    fetchStats();
  }, []);

  // Don't render if no events yet or still loading
  if (!stats || (stats.builds === 0 && stats.tierlists === 0 && stats.metaViews === 0)) return null;

  var counters = [
    { value: stats.builds,    label: 'BUILDS GENERATED',    color: '#ff8800', icon: '⬢', href: '/advisor' },
    { value: stats.tierlists, label: 'TIER LISTS SHARED',   color: '#00f5ff', icon: '⬡', href: '/meta'    },
    { value: stats.metaViews, label: 'META VIEWS',           color: '#00ff88', icon: '◈', href: '/meta'    },
  ].filter(function(c) { return c.value > 0; });

  if (counters.length === 0) return null;

  return (
    <div style={{
      maxWidth: 1200, margin: '0 auto 48px', padding: '0 24px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
      transition: 'opacity 0.4s ease, transform 0.4s ease',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        overflow: 'hidden',
      }}>
        {counters.map(function(counter, i) {
          return (
            <a
              key={counter.label}
              href={counter.href}
              style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
                padding: '18px 20px',
                textDecoration: 'none',
                borderRight: i < counters.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                background: 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={function(e) { e.currentTarget.style.background = counter.color + '06'; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
            >
              {/* Icon */}
              <span style={{
                fontFamily: 'monospace', fontSize: 18,
                color: counter.color, opacity: 0.7, flexShrink: 0,
              }}>{counter.icon}</span>

              {/* Number + label */}
              <div style={{ textAlign: 'left' }}>
                <div style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 22, fontWeight: 900,
                  color: counter.color, lineHeight: 1,
                  textShadow: '0 0 20px ' + counter.color + '33',
                }}>
                  <AnimatedCount target={counter.value} />
                </div>
                <div style={{
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 8, letterSpacing: 2,
                  color: 'rgba(255,255,255,0.25)',
                  marginTop: 4,
                }}>
                  {counter.label}
                </div>
              </div>
            </a>
          );
        })}

        {/* Right end label */}
        <div style={{
          padding: '18px 20px',
          borderLeft: '1px solid rgba(255,255,255,0.05)',
          flexShrink: 0,
        }}>
          <div style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 8, letterSpacing: 2,
            color: 'rgba(255,255,255,0.15)',
            textAlign: 'right', lineHeight: 1.6,
          }}>
            RUNNERS<br />USING THE SITE
          </div>
        </div>
      </div>
    </div>
  );
}
