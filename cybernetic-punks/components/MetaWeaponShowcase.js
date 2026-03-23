'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const WEAPON_TYPE_ICONS = {
  'SNIPER': '◎', 'SHOTGUN': '⊞', 'ASSAULT RIFLE': '≡',
  'AR': '≡', 'SMG': '∷', 'LMG': '▬',
  'PISTOL': '○', 'SIDEARM': '○', 'RAILGUN': '→', 'HEAVY': '⊟',
};

function getWeaponIcon(type) {
  return WEAPON_TYPE_ICONS[(type || '').toUpperCase()] || '◈';
}

export default function MetaWeaponShowcase() {
  var [items, setItems] = useState([]);
  var [loaded, setLoaded] = useState(false);
  var [hovered, setHovered] = useState(null);

  useEffect(function() {
    async function fetchData() {
      try {
        // Get S and A tier weapons from meta_tiers, join with weapon_stats for images
        var [tiersRes, weaponsRes] = await Promise.all([
          supabase
            .from('meta_tiers')
            .select('name, tier, trend, note')
            .eq('type', 'weapon')
            .in('tier', ['S', 'A'])
            .order('tier')
            .limit(8),
          supabase
            .from('weapon_stats')
            .select('name, weapon_type, damage, fire_rate, range_rating, image_filename')
        ]);

        var tiers = tiersRes.data || [];
        var weapons = weaponsRes.data || [];
        var weaponMap = {};
        weapons.forEach(function(w) { weaponMap[w.name.toLowerCase()] = w; });

        var combined = tiers.map(function(t) {
          var wData = weaponMap[t.name.toLowerCase()] || {};
          return { ...t, ...wData, name: t.name };
        }).filter(function(i) { return i.name; });

        setItems(combined);
        setLoaded(true);
      } catch (_) { setLoaded(true); }
    }
    fetchData();
  }, []);

  if (!loaded || items.length === 0) return null;

  var sTier = items.filter(function(i) { return i.tier === 'S'; });
  var aTier = items.filter(function(i) { return i.tier === 'A'; });

  return (
    <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`
        @keyframes metaWpnPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .mw-card { transition: transform 0.15s, border-color 0.15s; }
        .mw-card:hover { transform: translateY(-3px); }
      `}</style>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: '#ff0000', animation: 'metaWpnPulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3 }}>META WEAPONS THIS CYCLE</span>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>⬡ NEXUS</span>
        </div>
        <Link href="/meta" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: 2 }}>
          FULL TIER LIST →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
        {items.map(function(item) {
          var isSTop = item.tier === 'S';
          var tierColor = isSTop ? '#ff0000' : '#ff8800';
          var imgSrc = item.image_filename ? '/images/weapons/' + item.image_filename : null;
          var icon = getWeaponIcon(item.weapon_type);
          var isHovered = hovered === item.name;
          var trendColor = item.trend === 'up' ? '#00ff88' : item.trend === 'down' ? '#ff0000' : 'rgba(255,255,255,0.2)';
          var trendLabel = item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '●';

          return (
            <Link
              key={item.name}
              href="/meta"
              className="mw-card"
              style={{
                textDecoration: 'none',
                background: isHovered ? tierColor + '0a' : '#080808',
                border: '1px solid ' + (isHovered ? tierColor + '33' : tierColor + '15'),
                borderTop: '2px solid ' + tierColor,
                borderRadius: 8,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
              onMouseEnter={function() { setHovered(item.name); }}
              onMouseLeave={function() { setHovered(null); }}
            >
              {/* Weapon image */}
              <div style={{ height: 90, background: tierColor + '05', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={item.name}
                    style={{ width: '85%', height: '75%', objectFit: 'contain', opacity: 0.85 }}
                    onError={function(e) { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <span style={{ fontFamily: 'monospace', fontSize: 28, color: tierColor, opacity: 0.25 }}>{icon}</span>
                )}
                {/* Tier badge */}
                <div style={{ position: 'absolute', top: 6, left: 8 }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: tierColor, textShadow: isSTop ? '0 0 12px rgba(255,0,0,0.5)' : 'none' }}>{item.tier}</span>
                </div>
                {/* Trend badge */}
                <div style={{ position: 'absolute', top: 8, right: 8, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: trendColor }}>{trendLabel}</div>
              </div>

              {/* Info */}
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#fff', letterSpacing: 0.5, marginBottom: 4 }}>{item.name}</div>

                {/* Type + stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: tierColor, opacity: 0.6, letterSpacing: 1 }}>{(item.weapon_type || '').toUpperCase()}</span>
                  {item.damage && (
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>DMG {item.damage}</span>
                  )}
                  {item.fire_rate && (
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>{item.fire_rate}RPM</span>
                  )}
                </div>

                {/* Note */}
                {item.note && (
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>
                    {item.note.slice(0, 55)}{item.note.length > 55 ? '...' : ''}
                  </div>
                )}
              </div>
            </Link>
          );
        })}

        {/* CTA card */}
        <Link
          href="/meta"
          style={{
            textDecoration: 'none',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 20,
            minHeight: 160,
          }}
        >
          <div style={{ fontFamily: 'monospace', fontSize: 22, color: 'rgba(255,255,255,0.15)' }}>→</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: 2, textAlign: 'center', lineHeight: 1.6 }}>FULL TIER LIST</div>
        </Link>
      </div>
    </section>
  );
}
