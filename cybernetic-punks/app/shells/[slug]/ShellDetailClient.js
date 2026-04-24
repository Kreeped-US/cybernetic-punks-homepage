'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import CoachCTA from '@/components/CoachCTA';

var SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00d4ff',
  Rook: '#888888', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

var SHELL_SYMBOLS = {
  Assassin: '◈', Destroyer: '⬢', Recon: '◇',
  Rook: '▣', Thief: '⬠', Triage: '◎', Vandal: '⬡',
};

var TIER_COLORS = {
  S: { bg: '#ff2222', fg: '#fff' },
  A: { bg: '#ff8800', fg: '#000' },
  B: { bg: '#00d4ff', fg: '#000' },
  C: { bg: '#666', fg: '#fff' },
  D: { bg: '#333', fg: 'rgba(255,255,255,0.7)' },
  BAN: { bg: '#ff2222', fg: '#fff' },
};

var RARITY_COLORS = {
  Standard:   { color: '#888' },
  Enhanced:   { color: '#00ff41' },
  Deluxe:     { color: '#00d4ff' },
  Superior:   { color: '#9b5de5' },
  Prestige:   { color: '#ffd700' },
  Contraband: { color: '#ff2d55' },
};

var EDITOR_COLORS = {
  CIPHER: '#ff2222', NEXUS: '#00d4ff', DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export default function ShellDetailClient({
  shell, shellName, slug, color, symbol,
  metaTier, shellCores, universalCores, articles,
  strengths, weaknesses, counteredShells, synergyShells,
  viewerMatches, pickPct, faqItems,
  nexusTake, dexterPicks,
}) {
  var [stickyVisible, setStickyVisible] = useState(false);

  // Show sticky CTA after user scrolls past hero
  useEffect(function() {
    function onScroll() {
      setStickyVisible(window.scrollY > 500);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return function() { window.removeEventListener('scroll', onScroll); };
  }, []);

  var imgSrc = shell.image_filename ? '/images/shells/' + shell.image_filename : null;
  var maxHp = 175;
  var isBanned = shellName === 'Rook';
  var tierStyle = metaTier ? TIER_COLORS[metaTier.tier] : null;

  // Defensive defaults — gracefully handle missing props
  var nexusArticles = nexusTake || [];
  var dexterBuilds = dexterPicks || [];

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, fontFamily: 'system-ui, sans-serif' }}>

      <style>{`
        .core-card:hover      { background: #1e2228 !important; }
        .article-row:hover    { background: #1e2228 !important; }
        .counter-card:hover   { background: #1e2228 !important; }
        .bottom-nav:hover     { background: #1e2228 !important; }
        .nx-take-card:hover   { background: #1e2228 !important; }
        .dx-pick-card:hover   { background: #1e2228 !important; }
      `}</style>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#0e1014', borderBottom: '1px solid #1e2028' }}>

        {/* Shell artwork as right-side wash */}
        {imgSrc && (
          <>
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0,
              width: '45%',
              backgroundImage: 'url(' + imgSrc + ')',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: isBanned ? 0.08 : 0.2,
              filter: isBanned ? 'grayscale(1)' : 'none',
            }} />
            <div style={{
              position: 'absolute', right: 0, top: 0, bottom: 0,
              width: '50%',
              background: 'linear-gradient(to right, #0e1014 0%, transparent 100%)',
            }} />
          </>
        )}

        {/* Geometric accent */}
        <div style={{ position: 'absolute', top: -50, right: '25%', width: 260, height: 260, border: '1px solid ' + color + '14', transform: 'rotate(45deg)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -20, right: '27%', width: 360, height: 360, border: '1px solid ' + color + '08', transform: 'rotate(45deg)', pointerEvents: 'none' }} />

        {/* Vertical color stripe */}
        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, ' + color + ' 0%, transparent 100%)' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '36px 24px 36px' }}>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/shells" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>SHELLS</Link>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
            <span style={{ color: color }}>{shellName.toUpperCase()}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 10, color: color + 'aa', letterSpacing: 3, fontWeight: 700, marginBottom: 6, fontFamily: 'monospace' }}>RUNNER SHELL</div>

              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 900, letterSpacing: '3px', color: color, margin: '0 0 8px', lineHeight: 0.95 }}>
                {shellName.toUpperCase()}
              </h1>

              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', letterSpacing: 3, marginBottom: 16, fontWeight: 700, textTransform: 'uppercase' }}>
                {shell.role || '—'}
              </div>

              {shell.lore_tagline && (
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, maxWidth: 500, marginBottom: 14, fontStyle: 'italic' }}>
                  "{shell.lore_tagline}"
                </div>
              )}

              {shell.best_for && (
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.38)', lineHeight: 1.65, maxWidth: 480, marginBottom: 18 }}>
                  {shell.best_for}
                </p>
              )}

              {/* Status pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                {shell.difficulty && (
                  <span style={{ fontSize: 9, color: color, background: color + '14', border: '1px solid ' + color + '30', borderRadius: 2, padding: '4px 10px', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                    {shell.difficulty} Difficulty
                  </span>
                )}
                {isBanned && (
                  <span style={{ fontSize: 9, color: '#ff2222', background: 'rgba(255,34,34,0.1)', border: '1px solid rgba(255,34,34,0.3)', borderRadius: 2, padding: '4px 10px', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                    Ranked Banned
                  </span>
                )}
                {metaTier?.trend === 'up' && <span style={{ fontSize: 9, color: '#00ff41', background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.25)', borderRadius: 2, padding: '4px 10px', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>↑ Rising Meta</span>}
                {metaTier?.trend === 'down' && <span style={{ fontSize: 9, color: '#ff2222', background: 'rgba(255,34,34,0.08)', border: '1px solid rgba(255,34,34,0.2)', borderRadius: 2, padding: '4px 10px', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>↓ Falling Meta</span>}
                {pickPct !== null && pickPct > 0 && (
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: '4px 10px', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                    {pickPct}% of Runners Main This
                  </span>
                )}
              </div>

              {/* Primary CTAs */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href={'/advisor?shell=' + slug} style={{
                  padding: '11px 20px',
                  background: color, color: color === '#ffd700' || color === '#00d4ff' || color === '#ff8800' || color === '#00ff88' ? '#000' : '#fff',
                  fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2,
                  textDecoration: 'none',
                }}>
                  BUILD A {shellName.toUpperCase()} LOADOUT →
                </Link>
                <Link href="/meta" style={{
                  padding: '11px 20px',
                  background: 'transparent', border: '1px solid #22252e',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 11, fontWeight: 700, letterSpacing: 1, borderRadius: 2,
                  textDecoration: 'none',
                }}>
                  LIVE META →
                </Link>
              </div>
            </div>

            {/* Tier summary card */}
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + color, borderRadius: '0 0 3px 3px', padding: '18px 20px', minWidth: 220, flexShrink: 0 }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 14, fontWeight: 700, textTransform: 'uppercase' }}>Tier Summary</div>

              {/* Meta tier */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace', flex: 1 }}>LIVE META</div>
                {tierStyle ? (
                  <div style={{ background: tierStyle.bg, color: tierStyle.fg, fontSize: 14, fontWeight: 900, letterSpacing: 1, padding: '3px 10px', borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1 }}>
                    {metaTier.tier}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>—</span>
                )}
              </div>

              {/* Solo ranked */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace', flex: 1 }}>SOLO RANKED</div>
                {shell.ranked_tier_solo && TIER_COLORS[shell.ranked_tier_solo] ? (
                  <div style={{ background: TIER_COLORS[shell.ranked_tier_solo].bg, color: TIER_COLORS[shell.ranked_tier_solo].fg, fontSize: 14, fontWeight: 900, letterSpacing: 1, padding: '3px 10px', borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1 }}>
                    {shell.ranked_tier_solo}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>—</span>
                )}
              </div>

              {/* Squad ranked */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace', flex: 1 }}>SQUAD RANKED</div>
                {shell.ranked_tier_squad && TIER_COLORS[shell.ranked_tier_squad] ? (
                  <div style={{ background: TIER_COLORS[shell.ranked_tier_squad].bg, color: TIER_COLORS[shell.ranked_tier_squad].fg, fontSize: 14, fontWeight: 900, letterSpacing: 1, padding: '3px 10px', borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1 }}>
                    {shell.ranked_tier_squad}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>—</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* ══ PERSONAL COACH TEASER — only if viewer's shell matches ══ */}
        {viewerMatches && (
          <section style={{ paddingTop: 28 }}>
            <div style={{ position: 'relative', overflow: 'hidden', background: '#0e1014', border: '1px solid #22252e', borderRadius: 3 }}>
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.008) 8px, rgba(255,255,255,0.008) 9px)', pointerEvents: 'none' }} />
              <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, rgba(155,93,229,0.5) 30%, rgba(155,93,229,0.5) 70%, transparent)' }} />
              <div style={{ position: 'relative', zIndex: 1, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>🔒</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, textTransform: 'uppercase' }}>Personal {shellName} Coach</span>
                    <span style={{ padding: '2px 7px', background: 'rgba(155,93,229,0.1)', border: '1px solid rgba(155,93,229,0.25)', borderRadius: 2, fontSize: 8, fontWeight: 700, letterSpacing: 2, color: 'rgba(155,93,229,0.6)', textTransform: 'uppercase' }}>Coming Soon</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.65, margin: 0 }}>
                    You main {shellName}. When Personal Coach launches, you'll get a detailed analysis of how you play this shell — what's working, what's leaking rating, and the specific changes that close the gap.
                  </p>
                </div>
                <div style={{ padding: '10px 16px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#00ff41', letterSpacing: 1.5, marginBottom: 2 }}>EARLY ADOPTER</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>Priority access confirmed</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══ BASE STATS ════════════════════════════════════ */}
        <section style={{ paddingTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Base Stats</span>
            <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1, background: '#1e2028' }}>
            {[
              shell.base_health && { label: 'Health', value: shell.base_health, max: maxHp, color: '#00ff41', pct: Math.round((shell.base_health / maxHp) * 100) },
              shell.base_shield && { label: 'Shield', value: shell.base_shield, max: maxHp, color: '#00d4ff', pct: Math.round((shell.base_shield / maxHp) * 100) },
              shell.base_speed   && { label: 'Speed',  value: shell.base_speed,  max: 100,   color: '#ffd700', pct: shell.base_speed_value || 70 },
            ].filter(Boolean).map(function(stat) {
              return (
                <div key={stat.label} style={{ background: '#1a1d24', borderTop: '2px solid ' + stat.color, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>{stat.label}</span>
                    <span style={{ fontSize: 22, fontWeight: 900, color: stat.color, fontFamily: 'Orbitron, monospace', letterSpacing: '-0.5px' }}>{stat.value}</span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: stat.pct + '%', background: stat.color, borderRadius: 1 }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ══ NEXUS ANALYSIS / HOLOTAG NOTES ═══════════════ */}
        {(metaTier?.note || metaTier?.ranked_note || shell.holotag_tier_recommendation) && (
          <section style={{ paddingTop: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 6 }}>
              {(metaTier?.note || metaTier?.ranked_note) && (
                <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #00d4ff', borderRadius: '0 3px 3px 0', padding: '14px 18px' }}>
                  <div style={{ fontSize: 9, color: '#00d4ff', letterSpacing: 2, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>⬡ NEXUS Analysis</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{metaTier.note || metaTier.ranked_note}</div>
                </div>
              )}
              {shell.holotag_tier_recommendation && (
                <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #ffd700', borderRadius: '0 3px 3px 0', padding: '14px 18px' }}>
                  <div style={{ fontSize: 9, color: '#ffd700', letterSpacing: 2, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>◈ Holotag Recommendation</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{shell.holotag_tier_recommendation}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══ NEXUS'S TAKE — featured NEXUS articles for this shell ══ */}
        {nexusArticles.length > 0 && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: '#00d4ff', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>⬡ NEXUS's Take</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
              <Link href="/intel/nexus" style={{ fontSize: 9, color: '#00d4ff', textDecoration: 'none', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>ALL NEXUS →</Link>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, margin: '0 0 14px', maxWidth: 600 }}>
              Latest meta intel for {shellName}, updated as the meta shifts.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 6 }}>
              {nexusArticles.map(function(article) {
                var bodyPreview = (article.body || '').replace(/\*\*/g, '').replace(/#+\s/g, '').slice(0, 160);
                return (
                  <Link key={article.id} href={'/intel/' + article.slug} className="nx-take-card" style={{
                    display: 'block',
                    background: '#1a1d24', border: '1px solid #22252e',
                    borderLeft: '3px solid #00d4ff',
                    borderRadius: '0 3px 3px 0',
                    padding: '14px 16px', textDecoration: 'none',
                    transition: 'background 0.1s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 9, color: '#00d4ff', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>⬡ NEXUS</span>
                      {article.ce_score > 0 && (
                        <span style={{ fontSize: 9, color: '#00d4ff', background: 'rgba(0,212,255,0.14)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 2, padding: '1px 6px', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 800 }}>
                          GP {article.ce_score}
                        </span>
                      )}
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', fontFamily: 'monospace', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(article.created_at)}</span>
                    </div>
                    <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#fff', margin: '0 0 8px', lineHeight: 1.35 }}>{article.headline}</h3>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, margin: 0 }}>{bodyPreview}...</p>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ══ ABILITIES ══════════════════════════════════════ */}
        <section style={{ paddingTop: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Abilities</span>
            <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 6 }}>
            {/* Active ability */}
            {(shell.active_ability_name || shell.prime_ability_name) && (
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + color, borderRadius: '0 0 3px 3px', padding: '18px 20px' }}>
                <div style={{ fontSize: 9, color: color, letterSpacing: 3, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>Active Ability</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: 1, marginBottom: 10 }}>
                  {shell.active_ability_name || shell.prime_ability_name}
                </div>
                {(shell.active_ability_description || shell.active_ability_desc || shell.prime_ability_description) && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65, marginBottom: 12 }}>
                    {shell.active_ability_description || shell.active_ability_desc || shell.prime_ability_description}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {shell.active_ability_cooldown_seconds && (
                    <div style={{ background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, padding: '5px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: color, fontFamily: 'Orbitron, monospace' }}>{shell.active_ability_cooldown_seconds}s</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>CD</div>
                    </div>
                  )}
                  {shell.active_ability_duration_seconds && (
                    <div style={{ background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, padding: '5px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: color, fontFamily: 'Orbitron, monospace' }}>{shell.active_ability_duration_seconds}s</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>DUR</div>
                    </div>
                  )}
                  {shell.active_ability_range_m && (
                    <div style={{ background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, padding: '5px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: color, fontFamily: 'Orbitron, monospace' }}>{shell.active_ability_range_m}m</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>RNG</div>
                    </div>
                  )}
                  {shell.ability_charges && shell.ability_charges > 1 && (
                    <div style={{ background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, padding: '5px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: color, fontFamily: 'Orbitron, monospace' }}>{shell.ability_charges}</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>CHG</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Passive / tactical */}
            {(shell.passive_ability_name || shell.tactical_ability_name) && (
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid rgba(255,255,255,0.15)', borderRadius: '0 0 3px 3px', padding: '18px 20px' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 3, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>Passive / Tactical</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.75)', letterSpacing: 1, marginBottom: 10 }}>
                  {shell.passive_ability_name || shell.tactical_ability_name}
                </div>
                {(shell.passive_ability_description || shell.passive_ability_desc || shell.tactical_ability_description) && (
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
                    {shell.passive_ability_description || shell.passive_ability_desc || shell.tactical_ability_description}
                  </div>
                )}
              </div>
            )}

            {/* Traits */}
            {(shell.trait_1_name || shell.trait_2_name) && (
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '18px 20px' }}>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>Passive Traits</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {shell.trait_1_name && (
                    <div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 4 }}>{shell.trait_1_name}</div>
                      {shell.trait_1_description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{shell.trait_1_description}</div>}
                    </div>
                  )}
                  {shell.trait_2_name && (
                    <div style={{ paddingTop: shell.trait_1_name ? 10 : 0, borderTop: shell.trait_1_name ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 4 }}>{shell.trait_2_name}</div>
                      {shell.trait_2_description && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{shell.trait_2_description}</div>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ══ FIELD ANALYSIS ═════════════════════════════════ */}
        {(strengths.length > 0 || weaknesses.length > 0 || shell.recommended_playstyle) && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Field Analysis</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
            </div>

            {shell.recommended_playstyle && (
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + color, borderRadius: '0 3px 3px 0', padding: '14px 18px', marginBottom: 6 }}>
                <div style={{ fontSize: 9, color: color, letterSpacing: 2, marginBottom: 6, fontWeight: 700, textTransform: 'uppercase' }}>Recommended Playstyle</div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{shell.recommended_playstyle}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 6 }}>
              {strengths.length > 0 && (
                <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00ff41', borderRadius: '0 0 3px 3px', padding: '14px 18px' }}>
                  <div style={{ fontSize: 9, color: '#00ff41', letterSpacing: 2, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>Strengths</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {strengths.map(function(s, i) {
                      return (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: '#00ff41', flexShrink: 0, marginTop: 1, fontWeight: 900 }}>+</span>
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{s}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {weaknesses.length > 0 && (
                <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #ff2222', borderRadius: '0 0 3px 3px', padding: '14px 18px' }}>
                  <div style={{ fontSize: 9, color: '#ff2222', letterSpacing: 2, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>Weaknesses</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {weaknesses.map(function(s, i) {
                      return (
                        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ color: '#ff2222', flexShrink: 0, marginTop: 1, fontWeight: 900 }}>−</span>
                          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{s}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══ COUNTER MATRIX ═══════════════════════════════ */}
        {(counteredShells.length > 0 || synergyShells.length > 0) && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Matchups</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 6 }}>
              {counteredShells.length > 0 && (
                <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #ff8800', borderRadius: '0 0 3px 3px', padding: '14px 18px' }}>
                  <div style={{ fontSize: 9, color: '#ff8800', letterSpacing: 2, marginBottom: 12, fontWeight: 700, textTransform: 'uppercase' }}>Countered By</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {counteredShells.map(function(c, i) {
                      if (!c.known) {
                        return <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '6px 10px', background: '#0e1014', border: '1px solid #22252e', borderRadius: 2 }}>{c.name}</div>;
                      }
                      var cColor = SHELL_COLORS[c.name] || '#666';
                      var cSym = SHELL_SYMBOLS[c.name] || '◈';
                      return (
                        <Link key={i} href={'/shells/' + c.name.toLowerCase()} className="counter-card" style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', background: '#0e1014', border: '1px solid #22252e',
                          borderLeft: '3px solid ' + cColor + '88',
                          borderRadius: '0 2px 2px 0', textDecoration: 'none',
                          transition: 'background 0.1s',
                        }}>
                          <div style={{ width: 32, height: 32, background: '#1a1d24', border: '1px solid ' + cColor + '40', borderRadius: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {c.image_filename ? (
                              <img src={'/images/shells/' + c.image_filename} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: 14, color: cColor }}>{cSym}</span>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: cColor, letterSpacing: 1, fontFamily: 'Orbitron, monospace' }}>{c.name.toUpperCase()}</div>
                            {c.role && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700, fontFamily: 'monospace', marginTop: 2 }}>{c.role.toUpperCase()}</div>}
                          </div>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, fontFamily: 'monospace' }}>→</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {synergyShells.length > 0 && (
                <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00d4ff', borderRadius: '0 0 3px 3px', padding: '14px 18px' }}>
                  <div style={{ fontSize: 9, color: '#00d4ff', letterSpacing: 2, marginBottom: 12, fontWeight: 700, textTransform: 'uppercase' }}>Synergizes With</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    {synergyShells.map(function(c, i) {
                      if (!c.known) {
                        return <div key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', padding: '6px 10px', background: '#0e1014', border: '1px solid #22252e', borderRadius: 2 }}>{c.name}</div>;
                      }
                      var cColor = SHELL_COLORS[c.name] || '#666';
                      var cSym = SHELL_SYMBOLS[c.name] || '◈';
                      return (
                        <Link key={i} href={'/shells/' + c.name.toLowerCase()} className="counter-card" style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 10px', background: '#0e1014', border: '1px solid #22252e',
                          borderLeft: '3px solid ' + cColor + '88',
                          borderRadius: '0 2px 2px 0', textDecoration: 'none',
                          transition: 'background 0.1s',
                        }}>
                          <div style={{ width: 32, height: 32, background: '#1a1d24', border: '1px solid ' + cColor + '40', borderRadius: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {c.image_filename ? (
                              <img src={'/images/shells/' + c.image_filename} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                              <span style={{ fontSize: 14, color: cColor }}>{cSym}</span>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: cColor, letterSpacing: 1, fontFamily: 'Orbitron, monospace' }}>{c.name.toUpperCase()}</div>
                            {c.role && <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700, fontFamily: 'monospace', marginTop: 2 }}>{c.role.toUpperCase()}</div>}
                          </div>
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, fontFamily: 'monospace' }}>→</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══ CORES ═══════════════════════════════════════════ */}
        {(shellCores.length > 0 || universalCores.length > 0) && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Shell Cores</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
            </div>

            {shellCores.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, color: color, letterSpacing: 3, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>{shellName} Exclusive</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
                  {shellCores.map(function(core) {
                    var r = RARITY_COLORS[core.rarity] || RARITY_COLORS.Standard;
                    return (
                      <div key={core.name} className="core-card" style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + r.color, borderRadius: '0 2px 2px 0', padding: '11px 14px', transition: 'background 0.1s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: core.effect_desc ? 6 : 0, gap: 8 }}>
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 800, color: r.color, letterSpacing: 0.5, lineHeight: 1.3 }}>{core.name}</div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {core.ability_type && <span style={{ fontSize: 7, color: r.color, background: r.color + '18', border: '1px solid ' + r.color + '30', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{core.ability_type}</span>}
                            {core.ranked_viable === false && <span style={{ fontSize: 7, color: '#ff2222', letterSpacing: 1, fontWeight: 700 }}>SKIP</span>}
                          </div>
                        </div>
                        {core.effect_desc && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', lineHeight: 1.5 }}>{core.effect_desc}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {universalCores.length > 0 && (
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>Universal Cores</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
                  {universalCores.map(function(core) {
                    var r = RARITY_COLORS[core.rarity] || RARITY_COLORS.Standard;
                    return (
                      <div key={core.name} className="core-card" style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '11px 14px', transition: 'background 0.1s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: core.effect_desc ? 6 : 0, gap: 8 }}>
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: r.color, letterSpacing: 0.5 }}>{core.name}</div>
                          {core.ability_type && <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{core.ability_type}</span>}
                        </div>
                        {core.effect_desc && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.5 }}>{core.effect_desc}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ══ DEXTER'S PICKS — top builds for this shell ═══════ */}
        {dexterBuilds.length > 0 && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: '#ff8800', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>⬢ DEXTER's Picks</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
              <Link href={'/advisor?shell=' + slug} style={{ fontSize: 9, color: '#ff8800', textDecoration: 'none', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>BUILD ADVISOR →</Link>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, margin: '0 0 14px', maxWidth: 600 }}>
              Top {shellName} builds engineered by DEXTER, sorted by Combat Effectiveness score.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 6 }}>
              {dexterBuilds.map(function(build) {
                var score = build.ce_score || 0;
                var grade = score >= 9 ? 'S' : score >= 7 ? 'A' : score >= 5 ? 'B' : 'C';
                var gradeColors = { S: '#ff2222', A: '#ff8800', B: '#00d4ff', C: '#666' };
                var gradeColor = gradeColors[grade];
                return (
                  <Link key={build.id} href={'/intel/' + build.slug} className="dx-pick-card" style={{
                    display: 'flex', gap: 12,
                    background: '#1a1d24', border: '1px solid #22252e',
                    borderLeft: '3px solid #ff8800',
                    borderRadius: '0 3px 3px 0',
                    padding: '12px 14px', textDecoration: 'none',
                    transition: 'background 0.1s',
                  }}>
                    <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 32 }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{grade}</div>
                      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700, fontFamily: 'monospace' }}>CE {score}</div>
                    </div>
                    {build.thumbnail && (
                      <img src={build.thumbnail} alt="" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 2, flexShrink: 0, border: '1px solid #22252e' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: '#ff8800', letterSpacing: 2, marginBottom: 4, fontWeight: 700, fontFamily: 'monospace' }}>⬢ DEXTER BUILD</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{build.headline}</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700, fontFamily: 'monospace' }}>{timeAgo(build.created_at)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ══ ARTICLES — CIPHER/GHOST/MIRANDA only (NEXUS/DEXTER above) ══ */}
        {articles.length > 0 && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>{shellName} Intel</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 6 }}>
              {articles.map(function(article) {
                var ec = EDITOR_COLORS[article.editor] || '#888';
                return (
                  <Link key={article.id} href={'/intel/' + article.slug} className="article-row" style={{
                    display: 'flex', gap: 10, background: '#1a1d24', border: '1px solid #22252e',
                    borderLeft: '3px solid ' + ec + '66', borderRadius: '0 3px 3px 0',
                    padding: '12px', textDecoration: 'none', overflow: 'hidden',
                    transition: 'background 0.1s',
                  }}>
                    {article.thumbnail && (
                      <img src={article.thumbnail} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 2, flexShrink: 0, border: '1px solid #22252e' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: ec, letterSpacing: 2, marginBottom: 4, fontWeight: 700 }}>{article.editor}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.3, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.headline}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(article.created_at)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ══ COACH CTA ══════════════════════════════════════ */}
        <section style={{ paddingTop: 32 }}>
          <CoachCTA variant="banner" />
        </section>

        {/* ══ OTHER SHELLS ════════════════════════════════════ */}
        <section style={{ paddingTop: 32, paddingBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Other Shells</span>
            <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 6 }}>
            {['Assassin','Destroyer','Recon','Rook','Thief','Triage','Vandal'].filter(function(s) { return s.toLowerCase() !== slug; }).map(function(s) {
              var c = SHELL_COLORS[s] || '#666';
              var sym = SHELL_SYMBOLS[s] || '◈';
              return (
                <Link key={s} href={'/shells/' + s.toLowerCase()} className="bottom-nav" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px',
                  background: '#1a1d24',
                  border: '1px solid #22252e',
                  borderTop: '2px solid ' + c + '70',
                  borderRadius: '0 0 3px 3px',
                  textDecoration: 'none', transition: 'background 0.1s',
                }}>
                  <span style={{ fontSize: 14, color: c, flexShrink: 0 }}>{sym}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: c, letterSpacing: 1 }}>{s.toUpperCase()}</span>
                </Link>
              );
            })}
          </div>
        </section>

      </div>

      {/* ══ STICKY BUILD CTA ═══════════════════════════════ */}
      {!isBanned && (
        <div style={{
          position: 'fixed',
          bottom: stickyVisible ? 16 : -80,
          left: '50%', transform: 'translateX(-50%)',
          zIndex: 100,
          transition: 'bottom 0.3s ease',
          maxWidth: 'calc(100vw - 32px)',
        }}>
          <Link href={'/advisor?shell=' + slug} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 18px',
            background: '#0e1014',
            border: '1px solid #22252e',
            borderTop: '2px solid ' + color,
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ fontSize: 18, color: color, lineHeight: 1 }}>{symbol}</span>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: color, letterSpacing: 2, marginBottom: 2, textTransform: 'uppercase' }}>Build This Shell</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>DEXTER engineers a full loadout</div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 800, color: color, marginLeft: 8 }}>→</span>
          </Link>
        </div>
      )}

      {/* FAQ Schema */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': faqItems.length > 0 ? 'FAQPage' : 'WebPage',
        name: shellName + ' Guide — Marathon Runner Shell | CyberneticPunks',
        description: 'Complete ' + shellName + ' guide for Marathon. Stats, abilities, cores, implants, and build guides.',
        url: 'https://cyberneticpunks.com/shells/' + slug,
        ...(faqItems.length > 0 ? { mainEntity: faqItems.map(function(item) { return { '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } }; }) } : {}),
      })}} />
    </main>
  );
}
