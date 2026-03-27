// app/shells/[slug]/page.js
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CoachCTA from '@/components/CoachCTA';

export const revalidate = 300;

const SHELL_COLORS = {
  assassin: '#cc44ff', destroyer: '#ff3333', recon: '#00f5ff',
  rook: '#aaaaaa', thief: '#ffd700', triage: '#00ff88', vandal: '#ff8800',
};

const SHELL_SYMBOLS = {
  assassin: '◈', destroyer: '⬢', recon: '◇',
  rook: '▣', thief: '⬠', triage: '◎', vandal: '⬡',
};

const TIER_COLORS = { S: '#ff0000', A: '#ff8800', B: '#00f5ff', C: '#aaaaaa', D: '#555555', BAN: '#ff0000' };

const RARITY_COLORS = {
  Standard: { color: '#888888', bg: '#88888814', border: '#88888830' },
  Enhanced: { color: '#00ff88', bg: '#00ff8812', border: '#00ff8828' },
  Deluxe:   { color: '#00f5ff', bg: '#00f5ff12', border: '#00f5ff28' },
  Superior: { color: '#9b5de5', bg: '#9b5de512', border: '#9b5de528' },
  Prestige: { color: '#ffd700', bg: '#ffd70012', border: '#ffd70028' },
};

const EDITOR_COLORS = {
  CIPHER: '#ff0000', NEXUS: '#00f5ff', DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export async function generateStaticParams() {
  var { data } = await supabase.from('shell_stats').select('name');
  return (data || []).map(function(s) { return { slug: s.name.toLowerCase() }; });
}

export async function generateMetadata({ params }) {
  var slug = (await params).slug;
  var shellName = slug.charAt(0).toUpperCase() + slug.slice(1);
  var { data: shell } = await supabase.from('shell_stats').select('name, role, lore_tagline, best_for').eq('name', shellName).single();
  if (!shell) return { title: 'Shell Not Found | CyberneticPunks' };
  var desc = shell.lore_tagline
    ? shell.lore_tagline + ' Complete ' + shell.name + ' guide for Marathon — stats, abilities, cores, implants, and ranked build analysis.'
    : 'Complete ' + shell.name + ' guide for Marathon. Stats, abilities, best cores, implants, and ranked build guides — updated every 6 hours by CyberneticPunks.';
  return {
    title: shell.name + ' Guide — Builds, Meta & Tips | CyberneticPunks',
    description: desc,
    openGraph: {
      title: shell.name + ' Guide — Builds, Meta & Tips | CyberneticPunks',
      description: desc,
      url: 'https://cyberneticpunks.com/shells/' + slug,
      images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title: shell.name + ' Guide | CyberneticPunks', images: ['https://cyberneticpunks.com/og-image.png'] },
    alternates: { canonical: 'https://cyberneticpunks.com/shells/' + slug },
  };
}

export default async function ShellHubPage({ params }) {
  var slug = (await params).slug;
  var shellName = slug.charAt(0).toUpperCase() + slug.slice(1);
  var color = SHELL_COLORS[slug] || '#ff8800';
  var symbol = SHELL_SYMBOLS[slug] || '◈';

  var [shellRes, coresRes, implantsRes, metaTierRes, articlesRes] = await Promise.all([
    supabase.from('shell_stats').select('*').eq('name', shellName).single(),
    supabase.from('core_stats').select('name, rarity, effect_desc, ability_type, ranked_viable').or('required_runner.eq.' + shellName + ',required_runner.is.null').order('rarity', { ascending: false }),
    supabase.from('implant_stats').select('name, slot_type, rarity, description, passive_name, passive_desc, stat_1_label, stat_1_value, stat_2_label, stat_2_value').or('required_runner.eq.' + shellName + ',required_runner.is.null').order('rarity', { ascending: false }),
    supabase.from('meta_tiers').select('tier, trend, note, ranked_note').eq('name', shellName).eq('type', 'shell').maybeSingle(),
    supabase.from('feed_items').select('id, headline, slug, tags, ce_score, editor, thumbnail, created_at').eq('is_published', true).contains('tags', [shellName.toLowerCase()]).order('created_at', { ascending: false }).limit(9),
  ]);

  var shell = shellRes.data;
  if (!shell) notFound();

  var shellCores = (coresRes.data || []).filter(function(c) { return c.required_runner; }).slice(0, 6);
  var universalCores = (coresRes.data || []).filter(function(c) { return !c.required_runner; }).slice(0, 4);
  var metaTier = metaTierRes.data;
  var articles = articlesRes.data || [];
  var imgSrc = shell.image_filename ? '/images/shells/' + shell.image_filename : null;
  var maxHp = 175;
  var isBanned = shellName === 'Rook';

  function parseList(val) {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    try { var p = JSON.parse(val); if (Array.isArray(p)) return p; } catch (_) {}
    return String(val).split(',').map(function(s) { return s.trim(); }).filter(Boolean);
  }

  var strengths = parseList(shell.strengths);
  var weaknesses = parseList(shell.weaknesses);
  var counteredBy = parseList(shell.countered_by);
  var synergizes = parseList(shell.synergizes_with);

  var faqItems = [];
  if (metaTier) faqItems.push({ q: 'Is ' + shellName + ' good in Marathon ranked?', a: shellName + ' is currently ' + metaTier.tier + '-Tier in ranked.' + (metaTier.ranked_note ? ' ' + metaTier.ranked_note : '') });
  if (shell.active_ability_name) faqItems.push({ q: 'What is ' + shellName + "'s active ability?", a: shell.active_ability_name + (shell.active_ability_description ? ': ' + shell.active_ability_description : '') });

  return (
    <main style={{ background: '#030303', minHeight: '100vh', color: '#fff', overflowX: 'hidden' }}>
      <style>{`
        @keyframes shPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .sh-art { transition: border-color 0.2s, transform 0.15s; }
        .sh-art:hover { border-color: ${color}44 !important; transform: translateY(-2px); }
        .sh-core { transition: background 0.15s; }
        .sh-core:hover { background: rgba(255,255,255,0.04) !important; }
        .sh-nav { transition: all 0.15s; }
        .sh-nav:hover { background: ${color}18 !important; border-color: ${color}44 !important; }
      `}</style>

      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.012, backgroundImage: 'linear-gradient(' + color + ' 1px, transparent 1px), linear-gradient(90deg, ' + color + ' 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
      <div style={{ position: 'absolute', top: 0, left: '30%', width: 800, height: 600, background: 'radial-gradient(ellipse at 50% 0%, ' + color + '10 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── HERO ── */}
      <section style={{ paddingTop: 96, position: 'relative', zIndex: 1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 0' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 2 }}>
            <Link href="/shells" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>SHELLS</Link>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
            <span style={{ color: color }}>{shellName.toUpperCase()}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 32, color: color, opacity: 0.8 }}>{symbol}</span>
                <div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: color + '77', letterSpacing: 3, marginBottom: 4 }}>RUNNER SHELL</div>
                  <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', fontWeight: 900, letterSpacing: 4, color: color, margin: 0, lineHeight: 1, textShadow: '0 0 40px ' + color + '33' }}>
                    {shellName.toUpperCase()}
                  </h1>
                </div>
              </div>

              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 12 }}>{(shell.role || '').toUpperCase()}</div>

              {shell.lore_tagline && (
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 18, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, maxWidth: 520, marginBottom: 16, fontStyle: 'italic' }}>
                  "{shell.lore_tagline}"
                </div>
              )}

              {shell.best_for && (
                <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6, maxWidth: 480, marginBottom: 20 }}>{shell.best_for}</p>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
                {shell.difficulty && (
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: color, background: color + '12', border: '1px solid ' + color + '30', borderRadius: 4, padding: '4px 12px', letterSpacing: 2 }}>
                    {shell.difficulty.toUpperCase()} DIFFICULTY
                  </span>
                )}
                {isBanned && (
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff0000', background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.3)', borderRadius: 4, padding: '4px 12px', letterSpacing: 2 }}>
                    RANKED BANNED
                  </span>
                )}
                {metaTier?.trend === 'up' && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 4, padding: '4px 12px', letterSpacing: 1 }}>▲ RISING META</span>}
                {metaTier?.trend === 'down' && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff4444', background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: 4, padding: '4px 12px', letterSpacing: 1 }}>▼ FALLING META</span>}
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/advisor" style={{ padding: '11px 22px', background: color + '14', border: '1px solid ' + color + '44', borderRadius: 6, textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: color, letterSpacing: 2 }}>
                  [D] BUILD ADVISOR →
                </Link>
                <Link href="/meta" style={{ padding: '11px 22px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>
                  META TIER LIST →
                </Link>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, flexShrink: 0 }}>
              <div style={{ width: 220, height: 220, background: color + '08', border: '1px solid ' + color + '22', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 100%, ' + color + '20 0%, transparent 65%)' }} />
                {imgSrc ? (
                  <img src={imgSrc} alt={shellName} style={{ width: '85%', height: '85%', objectFit: 'contain', position: 'relative', zIndex: 1, filter: isBanned ? 'grayscale(1) brightness(0.4)' : 'none' }} />
                ) : (
                  <span style={{ fontFamily: 'monospace', fontSize: 80, color: color, opacity: 0.15 }}>{symbol}</span>
                )}
              </div>

              {metaTier && (
                <div style={{ background: (TIER_COLORS[metaTier.tier] || '#888') + '10', border: '1px solid ' + (TIER_COLORS[metaTier.tier] || '#888') + '33', borderRadius: 8, padding: '14px 28px', textAlign: 'center', minWidth: 120 }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 4 }}>⬡ NEXUS META</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 44, fontWeight: 900, color: TIER_COLORS[metaTier.tier] || '#888', lineHeight: 1, textShadow: '0 0 20px ' + (TIER_COLORS[metaTier.tier] || '#888') + '44' }}>{metaTier.tier}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, marginTop: 4 }}>TIER</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '32px 24px 0', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6 }}>BASE STATS</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 32 }}>
          {[
            shell.base_health && { label: 'HEALTH', value: shell.base_health, max: maxHp, color: '#00ff88', pct: Math.round((shell.base_health / maxHp) * 100) },
            shell.base_shield && { label: 'SHIELD', value: shell.base_shield, max: maxHp, color: '#00f5ff', pct: Math.round((shell.base_shield / maxHp) * 100) },
            shell.base_speed && { label: 'SPEED', value: shell.base_speed, max: 100, color: '#ffd700', pct: shell.base_speed_value || 70 },
          ].filter(Boolean).map(function(stat) {
            return (
              <div key={stat.label} style={{ background: '#0a0a0a', border: '1px solid ' + stat.color + '18', borderTop: '2px solid ' + stat.color + '44', borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}>{stat.label}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: stat.color }}>{stat.value}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: stat.pct + '%', background: stat.color, borderRadius: 2 }} />
                </div>
              </div>
            );
          })}

          {(shell.ranked_tier_solo || shell.ranked_tier_squad) && (
            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '16px 18px' }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 12 }}>RANKED TIERS</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {shell.ranked_tier_solo && (
                  <div style={{ flex: 1, background: (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '10', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '28', borderRadius: 6, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: TIER_COLORS[shell.ranked_tier_solo] || '#888', lineHeight: 1 }}>{shell.ranked_tier_solo}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: 1, marginTop: 4 }}>SOLO</div>
                  </div>
                )}
                {shell.ranked_tier_squad && (
                  <div style={{ flex: 1, background: (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '10', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '28', borderRadius: 6, padding: '8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: TIER_COLORS[shell.ranked_tier_squad] || '#888', lineHeight: 1 }}>{shell.ranked_tier_squad}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: 1, marginTop: 4 }}>SQUAD</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {(metaTier?.ranked_note || metaTier?.note || shell.ranked_notes || shell.holotag_tier_recommendation) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 32 }}>
            {(metaTier?.note || metaTier?.ranked_note) && (
              <div style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.1)', borderLeft: '3px solid rgba(0,245,255,0.4)', borderRadius: 6, padding: '14px 18px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', letterSpacing: 2, marginBottom: 8 }}>⬡ NEXUS ANALYSIS</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{metaTier.note || metaTier.ranked_note}</div>
              </div>
            )}
            {shell.holotag_tier_recommendation && (
              <div style={{ background: 'rgba(255,215,0,0.03)', border: '1px solid rgba(255,215,0,0.1)', borderLeft: '3px solid rgba(255,215,0,0.35)', borderRadius: 6, padding: '14px 18px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ffd700', letterSpacing: 2, marginBottom: 8 }}>◈ HOLOTAG RECOMMENDATION</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{shell.holotag_tier_recommendation}</div>
              </div>
            )}
            {shell.ranked_notes && !metaTier?.ranked_note && (
              <div style={{ background: color + '04', border: '1px solid ' + color + '12', borderLeft: '3px solid ' + color + '33', borderRadius: 6, padding: '14px 18px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color, letterSpacing: 2, marginBottom: 8 }}>RANKED INTEL</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{shell.ranked_notes}</div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ── ABILITIES ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 24px 0', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6 }}>ABILITIES</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10, marginBottom: 32 }}>
          {(shell.active_ability_name || shell.prime_ability_name) && (
            <div style={{ background: color + '08', border: '1px solid ' + color + '25', borderTop: '2px solid ' + color, borderRadius: 8, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color + '77', letterSpacing: 3, marginBottom: 10 }}>ACTIVE ABILITY</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 1, marginBottom: 10 }}>
                {shell.active_ability_name || shell.prime_ability_name}
              </div>
              {(shell.active_ability_description || shell.active_ability_desc || shell.prime_ability_description) && (
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 14 }}>
                  {shell.active_ability_description || shell.active_ability_desc || shell.prime_ability_description}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {shell.active_ability_cooldown_seconds && (
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '6px 10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: color }}>{shell.active_ability_cooldown_seconds}s</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>COOLDOWN</div>
                  </div>
                )}
                {shell.active_ability_duration_seconds && (
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '6px 10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: color }}>{shell.active_ability_duration_seconds}s</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>DURATION</div>
                  </div>
                )}
                {shell.active_ability_range_m && (
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '6px 10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: color }}>{shell.active_ability_range_m}m</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>RANGE</div>
                  </div>
                )}
                {shell.ability_charges && shell.ability_charges > 1 && (
                  <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '6px 10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: color }}>{shell.ability_charges}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>CHARGES</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {(shell.passive_ability_name || shell.tactical_ability_name) && (
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderTop: '2px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 10 }}>PASSIVE / TACTICAL</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.7)', letterSpacing: 1, marginBottom: 10 }}>
                {shell.passive_ability_name || shell.tactical_ability_name}
              </div>
              {(shell.passive_ability_description || shell.passive_ability_desc || shell.tactical_ability_description) && (
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  {shell.passive_ability_description || shell.passive_ability_desc || shell.tactical_ability_description}
                </div>
              )}
            </div>
          )}

          {(shell.trait_1_name || shell.trait_2_name) && (
            <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8, padding: '18px 20px' }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: 3, marginBottom: 10 }}>PASSIVE TRAITS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {shell.trait_1_name && (
                  <div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 4 }}>{shell.trait_1_name}</div>
                    {shell.trait_1_description && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>{shell.trait_1_description}</div>}
                  </div>
                )}
                {shell.trait_2_name && (
                  <div style={{ paddingTop: shell.trait_1_name ? 10 : 0, borderTop: shell.trait_1_name ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1, marginBottom: 4 }}>{shell.trait_2_name}</div>
                    {shell.trait_2_description && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>{shell.trait_2_description}</div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── FIELD ANALYSIS ── */}
      {(strengths.length > 0 || weaknesses.length > 0 || counteredBy.length > 0 || synergizes.length > 0 || shell.recommended_playstyle) && (
        <section style={{ position: 'relative', zIndex: 1, padding: '0 24px 0', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6 }}>FIELD ANALYSIS</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, marginBottom: 32 }}>
            {shell.recommended_playstyle && (
              <div style={{ gridColumn: '1 / -1', background: color + '06', border: '1px solid ' + color + '18', borderLeft: '3px solid ' + color + '44', borderRadius: 8, padding: '16px 20px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color + '88', letterSpacing: 2, marginBottom: 8 }}>RECOMMENDED PLAYSTYLE</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{shell.recommended_playstyle}</div>
              </div>
            )}

            {strengths.length > 0 && (
              <div style={{ background: 'rgba(0,255,136,0.03)', border: '1px solid rgba(0,255,136,0.1)', borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00ff88', letterSpacing: 2, marginBottom: 12 }}>STRENGTHS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {strengths.map(function(s, i) {
                    return (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ color: '#00ff88', flexShrink: 0, marginTop: 1 }}>+</span>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {weaknesses.length > 0 && (
              <div style={{ background: 'rgba(255,0,0,0.02)', border: '1px solid rgba(255,0,0,0.08)', borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff4444', letterSpacing: 2, marginBottom: 12 }}>WEAKNESSES</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {weaknesses.map(function(s, i) {
                    return (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <span style={{ color: '#ff4444', flexShrink: 0, marginTop: 1 }}>−</span>
                        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4 }}>{s}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {counteredBy.length > 0 && (
              <div style={{ background: 'rgba(255,136,0,0.02)', border: '1px solid rgba(255,136,0,0.08)', borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff8800', letterSpacing: 2, marginBottom: 12 }}>COUNTERED BY</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {counteredBy.map(function(s, i) {
                    return <span key={i} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800', background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.18)', borderRadius: 3, padding: '4px 10px', letterSpacing: 1 }}>{s}</span>;
                  })}
                </div>
              </div>
            )}

            {synergizes.length > 0 && (
              <div style={{ background: 'rgba(0,245,255,0.02)', border: '1px solid rgba(0,245,255,0.08)', borderRadius: 8, padding: '16px 18px' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', letterSpacing: 2, marginBottom: 12 }}>SYNERGIZES WITH</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {synergizes.map(function(s, i) {
                    return <span key={i} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00f5ff', background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.14)', borderRadius: 3, padding: '4px 10px', letterSpacing: 1 }}>{s}</span>;
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── CORES ── */}
      {(shellCores.length > 0 || universalCores.length > 0) && (
        <section style={{ position: 'relative', zIndex: 1, padding: '0 24px 0', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6 }}>SHELL CORES</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {shellCores.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color + '66', letterSpacing: 3, marginBottom: 10 }}>{shellName.toUpperCase()} EXCLUSIVE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                {shellCores.map(function(core) {
                  var r = RARITY_COLORS[core.rarity] || RARITY_COLORS.Standard;
                  return (
                    <div key={core.name} className="sh-core" style={{ background: r.bg, border: '1px solid ' + r.border, borderRadius: 6, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: core.effect_desc ? 6 : 0 }}>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: r.color, letterSpacing: 1, lineHeight: 1.3 }}>{core.name}</div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                          {core.ability_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: r.color + '88', border: '1px solid ' + r.border, borderRadius: 2, padding: '1px 4px', letterSpacing: 1 }}>{core.ability_type.toUpperCase()}</span>}
                          {core.ranked_viable === false && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,68,68,0.6)', letterSpacing: 1 }}>SKIP</span>}
                        </div>
                      </div>
                      {core.effect_desc && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{core.effect_desc}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {universalCores.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 10 }}>UNIVERSAL CORES</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                {universalCores.map(function(core) {
                  var r = RARITY_COLORS[core.rarity] || RARITY_COLORS.Standard;
                  return (
                    <div key={core.name} className="sh-core" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: core.effect_desc ? 6 : 0 }}>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: r.color, letterSpacing: 1 }}>{core.name}</div>
                        {core.ability_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: 1 }}>{core.ability_type.toUpperCase()}</span>}
                      </div>
                      {core.effect_desc && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{core.effect_desc}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── ARTICLES ── */}
      {articles.length > 0 && (
        <section style={{ position: 'relative', zIndex: 1, padding: '0 24px 0', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6 }}>{shellName.toUpperCase()} INTEL</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10, marginBottom: 32 }}>
            {articles.map(function(article) {
              var ec = EDITOR_COLORS[article.editor] || '#888';
              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="sh-art"
                  style={{ display: 'flex', gap: 12, background: '#080808', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid ' + ec + '44', borderRadius: 8, padding: '14px', textDecoration: 'none', overflow: 'hidden' }}>
                  {article.thumbnail && (
                    <img src={article.thumbnail} alt="" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 4, flexShrink: 0, opacity: 0.8 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: ec + '88', letterSpacing: 1, marginBottom: 5 }}>{article.editor}</div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.headline}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)' }}>{timeAgo(article.created_at)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── COACH CTA ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 24px', maxWidth: 1100, margin: '0 auto' }}>
        <CoachCTA variant="banner" />
      </section>

      {/* ── OTHER SHELLS ── */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6 }}>OTHER SHELLS</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Assassin','Destroyer','Recon','Rook','Thief','Triage','Vandal'].filter(function(s) { return s.toLowerCase() !== slug; }).map(function(s) {
            var c = SHELL_COLORS[s.toLowerCase()] || '#888';
            var sym = SHELL_SYMBOLS[s.toLowerCase()] || '◈';
            return (
              <Link key={s} href={'/shells/' + s.toLowerCase()} className="sh-nav"
                style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: c, background: c + '0e', border: '1px solid ' + c + '25', borderRadius: 5, padding: '7px 14px', textDecoration: 'none', letterSpacing: 1 }}>
                <span style={{ fontSize: 12 }}>{sym}</span>
                {s.toUpperCase()}
              </Link>
            );
          })}
        </div>
      </section>

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