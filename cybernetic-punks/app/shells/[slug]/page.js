// app/shells/[slug]/page.js
// Individual Runner Shell Hub — aggregates all content for one shell

import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const revalidate = 300;

const SHELL_COLORS = {
  assassin: '#cc44ff', destroyer: '#ff3333', recon: '#00f5ff',
  rook: '#aaaaaa', thief: '#ffd700', triage: '#00ff88', vandal: '#ff8800',
};
const TIER_COLORS = { S: '#ff0000', A: '#ff8800', B: '#00f5ff', C: '#aaaaaa', D: '#555555' };
const RARITY_COLORS = {
  Standard: { color: '#888888', bg: '#88888814', border: '#88888830' },
  Enhanced: { color: '#00ff88', bg: '#00ff8812', border: '#00ff8828' },
  Deluxe:   { color: '#00f5ff', bg: '#00f5ff12', border: '#00f5ff28' },
  Superior: { color: '#9b5de5', bg: '#9b5de512', border: '#9b5de528' },
  Prestige: { color: '#ffd700', bg: '#ffd70012', border: '#ffd70028' },
};
const STAT_COLORS = {
  'Heat Capacity': '#ff4444', 'Agility': '#00f5ff', 'Loot Speed': '#ffd700',
  'Melee Damage': '#ff8800', 'Prime Recovery': '#cc44ff', 'Tactical Recovery': '#9b5de5',
  'Self-Repair Speed': '#00ff88', 'Hardware': '#888888', 'Finisher Siphon': '#ff6644',
  'Revive Speed': '#00ff88', 'Firewall': '#00f5ff', 'Fall Resistance': '#ccaa44',
  'Ping Duration': '#88aaff',
};
const STAT_ORDER = ['Heat Capacity','Agility','Loot Speed','Melee Damage','Prime Recovery','Tactical Recovery','Self-Repair Speed','Hardware','Finisher Siphon','Revive Speed','Firewall','Fall Resistance','Ping Duration'];

export async function generateStaticParams() {
  var { data } = await supabase.from('shell_stats').select('name');
  return (data || []).map(function(s) { return { slug: s.name.toLowerCase() }; });
}

export async function generateMetadata({ params }) {
  var slug = (await params).slug;
  var shellName = slug.charAt(0).toUpperCase() + slug.slice(1);
  var { data: shell } = await supabase.from('shell_stats').select('name, role, best_for').eq('name', shellName).single();
  if (!shell) return { title: 'Shell Not Found | CyberneticPunks' };
  var desc = 'Complete ' + shell.name + ' guide for Marathon. Stats, abilities, best cores, implants, and top build guides — updated every 6 hours by CyberneticPunks.';
  return {
    title: shell.name + ' Guide — Builds, Meta & Tips | CyberneticPunks',
    description: desc,
    keywords: ['marathon ' + shell.name.toLowerCase() + ' guide', 'marathon ' + shell.name.toLowerCase() + ' build', 'marathon ' + shell.name.toLowerCase() + ' abilities', 'marathon ' + shell.name.toLowerCase() + ' tips', 'marathon best ' + shell.name.toLowerCase() + ' loadout'],
    openGraph: {
      title: shell.name + ' Guide — Builds, Meta & Tips | CyberneticPunks',
      description: desc,
      url: 'https://cyberneticpunks.com/shells/' + slug,
    },
    alternates: { canonical: 'https://cyberneticpunks.com/shells/' + slug },
  };
}

function statBar(val, max, color) {
  var pct = max > 0 ? Math.min(100, Math.round((val || 0) / max * 100)) : 0;
  return (
    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 2 }} />
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export default async function ShellHubPage({ params }) {
  var slug = (await params).slug;
  var shellName = slug.charAt(0).toUpperCase() + slug.slice(1);
  var color = SHELL_COLORS[slug] || '#ff8800';

  var [
    shellRes, shellStatValuesRes, coresRes, implantsRes,
    metaTierRes, articlesRes,
  ] = await Promise.all([
    supabase.from('shell_stats').select('*').eq('name', shellName).single(),
    supabase.from('shell_stat_values').select('stat_name, stat_value').eq('shell_name', shellName),
    supabase.from('core_stats').select('name, rarity, effect_desc, ability_type, meta_rating, ranked_viable').or('required_runner.eq.' + shellName + ',required_runner.is.null').order('rarity', { ascending: false }),
    supabase.from('implant_stats').select('name, slot_type, rarity, description, passive_name, passive_desc, stat_1_label, stat_1_value, stat_2_label, stat_2_value').or('required_runner.eq.' + shellName + ',required_runner.is.null').order('rarity', { ascending: false }),
    supabase.from('meta_tiers').select('tier, trend, note, ranked_note').eq('name', shellName).eq('type', 'shell').single(),
    supabase.from('feed_items').select('id, headline, slug, tags, ce_score, editor, created_at').eq('is_published', true).contains('tags', [shellName.toLowerCase()]).order('created_at', { ascending: false }).limit(12),
  ]);

  var shell = shellRes.data;
  if (!shell) notFound();

  var shellStats = {};
  (shellStatValuesRes.data || []).forEach(function(sv) { shellStats[sv.stat_name] = sv.stat_value; });

  var shellCores = (coresRes.data || []).filter(function(c) { return c.required_runner; }).slice(0, 6);
  var universalCores = (coresRes.data || []).filter(function(c) { return !c.required_runner; }).slice(0, 4);

  var shellImplants = (implantsRes.data || []).filter(function(i) { return i.required_runner; }).slice(0, 6);
  var universalImplants = (implantsRes.data || []).filter(function(i) { return !i.required_runner; }).slice(0, 4);

  var metaTier = metaTierRes.data;
  var articles = articlesRes.data || [];

  // Group articles by editor
  var articlesByEditor = {};
  articles.forEach(function(a) {
    if (!articlesByEditor[a.editor]) articlesByEditor[a.editor] = [];
    articlesByEditor[a.editor].push(a);
  });

  var maxHp = 175; // Destroyer is the tankiest — use as scale reference
  var orderedStats = STAT_ORDER.filter(function(s) { return shellStats[s] != null; });
  var maxStatVal = orderedStats.length > 0 ? Math.max.apply(null, orderedStats.map(function(s) { return shellStats[s]; })) : 100;

  // Build FAQ data for JSON-LD
  var faqItems = [];
  if (metaTier) {
    faqItems.push({
      q: 'Is ' + shellName + ' good in Marathon ranked?',
      a: shellName + ' is currently ' + metaTier.tier + '-Tier in ranked play.' + (metaTier.ranked_note ? ' ' + metaTier.ranked_note : ''),
    });
  }
  if (shell.prime_ability_name) {
    faqItems.push({
      q: 'What is ' + shellName + "'s prime ability in Marathon?",
      a: shellName + "'s prime ability is " + shell.prime_ability_name + (shell.tactical_ability_name ? ' and the tactical ability is ' + shell.tactical_ability_name + '.' : '.'),
    });
  }
  var topBuild = articles.find(function(a) { return a.editor === 'DEXTER'; });
  if (topBuild) {
    faqItems.push({
      q: 'What is the best build for ' + shellName + ' in Marathon?',
      a: 'According to DEXTER, ' + topBuild.headline + '. Check cyberneticpunks.com/shells/' + slug + ' for the latest loadout analysis.',
    });
  }

  return (
    <main style={{ background: '#030303', minHeight: '100vh', color: '#fff' }}>
      <style>{`
        @keyframes shellPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .art-card { transition: border-color 0.2s, transform 0.15s; }
        .art-card:hover { border-color: ${color}44 !important; transform: translateY(-2px); }
        .core-card { transition: background 0.15s; }
        .core-card:hover { background: rgba(255,255,255,0.04) !important; }
      `}</style>

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{ paddingTop: 96, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 500, background: 'radial-gradient(ellipse at 30% 0%, ' + color + '14 0%, transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.012, backgroundImage: 'linear-gradient(' + color + ' 1px, transparent 1px), linear-gradient(90deg, ' + color + ' 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px 48px', position: 'relative', zIndex: 1 }}>
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>
            <Link href="/shells" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>SHELLS</Link>
            <span>/</span>
            <span style={{ color: color }}>{shellName.toUpperCase()}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: color + '88', letterSpacing: 3, marginBottom: 10 }}>RUNNER SHELL GUIDE</div>
              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: 4, color: color, margin: '0 0 8px 0', lineHeight: 1, textShadow: '0 0 40px ' + color + '33' }}>
                {shellName.toUpperCase()}
              </h1>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 14 }}>{shell.role || ''}</div>
              {shell.best_for && (
                <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 520, marginBottom: 0 }}>{shell.best_for}</p>
              )}
            </div>

            {/* Meta tier display */}
            {metaTier && (
              <div style={{ textAlign: 'center', background: (TIER_COLORS[metaTier.tier] || '#888') + '14', border: '1px solid ' + (TIER_COLORS[metaTier.tier] || '#888') + '44', borderRadius: 10, padding: '20px 28px', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 6 }}>NEXUS META</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 52, fontWeight: 900, color: TIER_COLORS[metaTier.tier] || '#888', lineHeight: 1 }}>{metaTier.tier}</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 6 }}>TIER</div>
                {metaTier.trend && (
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: metaTier.trend === 'up' ? '#00ff88' : metaTier.trend === 'down' ? '#ff0000' : 'rgba(255,255,255,0.2)', marginTop: 6 }}>
                    {metaTier.trend === 'up' ? '▲ RISING' : metaTier.trend === 'down' ? '▼ FALLING' : '● STABLE'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── STAT BLOCK ───────────────────────────────────── */}
      <section style={{ padding: '0 20px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>

          {/* HP / Shield / Ranked */}
          <div style={{ background: '#0a0a0a', border: '1px solid ' + color + '22', borderTop: '2px solid ' + color, borderRadius: 8, padding: '20px' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color + '88', letterSpacing: 3, marginBottom: 16 }}>BASE STATS</div>

            {shell.base_health && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00ff88', width: 50, flexShrink: 0 }}>HEALTH</span>
                {statBar(shell.base_health, maxHp, '#00ff88')}
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#00ff88', width: 36, textAlign: 'right', flexShrink: 0 }}>{shell.base_health}</span>
              </div>
            )}
            {shell.base_shield && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', width: 50, flexShrink: 0 }}>SHIELD</span>
                {statBar(shell.base_shield, maxHp, '#00f5ff')}
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#00f5ff', width: 36, textAlign: 'right', flexShrink: 0 }}>{shell.base_shield}</span>
              </div>
            )}

            {/* Ranked tiers */}
            <div style={{ display: 'flex', gap: 10, marginBottom: metaTier?.ranked_note ? 12 : 0 }}>
              {shell.ranked_tier_solo && (
                <div style={{ flex: 1, background: (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '12', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '33', borderRadius: 6, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, color: TIER_COLORS[shell.ranked_tier_solo] || '#888', lineHeight: 1 }}>{shell.ranked_tier_solo}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 4 }}>SOLO RANKED</div>
                </div>
              )}
              {shell.ranked_tier_squad && (
                <div style={{ flex: 1, background: (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '12', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '33', borderRadius: 6, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, color: TIER_COLORS[shell.ranked_tier_squad] || '#888', lineHeight: 1 }}>{shell.ranked_tier_squad}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 4 }}>SQUAD RANKED</div>
                </div>
              )}
            </div>
            {metaTier?.ranked_note && (
              <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, marginTop: 8 }}>{metaTier.ranked_note}</div>
            )}
          </div>

          {/* Abilities */}
          <div style={{ background: '#0a0a0a', border: '1px solid ' + color + '22', borderTop: '2px solid ' + color + '88', borderRadius: 8, padding: '20px' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color + '88', letterSpacing: 3, marginBottom: 16 }}>ABILITIES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shell.prime_ability_name && (
                <div style={{ background: color + '0e', border: '1px solid ' + color + '28', borderRadius: 6, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: color + '88', letterSpacing: 2, marginBottom: 6 }}>PRIME ABILITY</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: 1 }}>{shell.prime_ability_name}</div>
                </div>
              )}
              {shell.tactical_ability_name && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 6, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 6 }}>TACTICAL ABILITY</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: 1 }}>{shell.tactical_ability_name}</div>
                </div>
              )}
              {shell.trait_1_name && (
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '12px 14px' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: 2, marginBottom: 6 }}>PASSIVE TRAIT</div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{shell.trait_1_name}</div>
                </div>
              )}
              {!shell.prime_ability_name && !shell.tactical_ability_name && (
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>ABILITY DATA SEEDING — CHECK BACK SOON</div>
              )}
            </div>
          </div>

          {/* Shell-specific stats from shell_stat_values */}
          {orderedStats.length > 0 && (
            <div style={{ background: '#0a0a0a', border: '1px solid ' + color + '22', borderTop: '2px solid ' + color + '44', borderRadius: 8, padding: '20px' }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color + '88', letterSpacing: 3, marginBottom: 16 }}>SHELL STATS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {orderedStats.map(function(statName) {
                  var val = shellStats[statName];
                  var statColor = STAT_COLORS[statName] || 'rgba(255,255,255,0.4)';
                  var pct = maxStatVal > 0 ? Math.round((val / maxStatVal) * 100) : 0;
                  return (
                    <div key={statName} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.22)', width: 90, flexShrink: 0, letterSpacing: 0.5 }}>{statName.toUpperCase().slice(0,13)}</span>
                      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: pct + '%', background: statColor, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: statColor, width: 28, textAlign: 'right', flexShrink: 0 }}>{val}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* NEXUS meta note */}
        {metaTier?.note && (
          <div style={{ marginTop: 14, background: '#00f5ff0a', border: '1px solid #00f5ff18', borderLeft: '3px solid #00f5ff44', borderRadius: 6, padding: '14px 18px' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff66', letterSpacing: 2, marginBottom: 6 }}>NEXUS META ANALYSIS</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{metaTier.note}</div>
          </div>
        )}

        {/* Advisor CTA */}
        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href={'/advisor?shell=' + shellName} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: color + '14', border: '1px solid ' + color + '44', borderRadius: 6, textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: color, letterSpacing: 2 }}>
            [D] GET {shellName.toUpperCase()} BUILD &rarr;
          </Link>
          <Link href="/builds" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>
            BUILD LAB &rarr;
          </Link>
        </div>
      </section>

      {/* ── CORES ────────────────────────────────────────── */}
      {(shellCores.length > 0 || universalCores.length > 0) && (
        <section style={{ padding: '0 20px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 2, marginBottom: 4 }}>CORES</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 16 }}>
            {shellCores.length > 0 ? shellName.toUpperCase() + '-EXCLUSIVE' : ''}{shellCores.length > 0 && universalCores.length > 0 ? ' + ' : ''}{universalCores.length > 0 ? 'UNIVERSAL' : ''}
          </div>

          {shellCores.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color + '77', letterSpacing: 3, marginBottom: 10 }}>{shellName.toUpperCase()} EXCLUSIVE</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                {shellCores.map(function(core) {
                  var r = RARITY_COLORS[core.rarity] || RARITY_COLORS.Standard;
                  return (
                    <div key={core.name} className="core-card" style={{ background: r.bg, border: '1px solid ' + r.border, borderRadius: 6, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: core.effect_desc ? 6 : 0 }}>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: r.color, letterSpacing: 1, lineHeight: 1.3 }}>{core.name}</div>
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                          {core.ability_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: r.color + '88', background: r.bg, border: '1px solid ' + r.border, borderRadius: 2, padding: '1px 4px', letterSpacing: 1 }}>{core.ability_type.toUpperCase()}</span>}
                          {core.ranked_viable === false && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#ff444488', letterSpacing: 1 }}>SKIP</span>}
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
            <div>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 10 }}>UNIVERSAL CORES</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
                {universalCores.map(function(core) {
                  var r = RARITY_COLORS[core.rarity] || RARITY_COLORS.Standard;
                  return (
                    <div key={core.name} className="core-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: core.effect_desc ? 6 : 0 }}>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: r.color, letterSpacing: 1 }}>{core.name}</div>
                        {core.ability_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>{core.ability_type.toUpperCase()}</span>}
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

      {/* ── IMPLANTS ─────────────────────────────────────── */}
      {(shellImplants.length > 0 || universalImplants.length > 0) && (
        <section style={{ padding: '0 20px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 2, marginBottom: 4 }}>IMPLANTS</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 16 }}>
            COMPATIBLE WITH {shellName.toUpperCase()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {[...shellImplants, ...universalImplants].map(function(imp) {
              var r = RARITY_COLORS[imp.rarity] || RARITY_COLORS.Standard;
              var stats = [
                imp.stat_1_label && imp.stat_1_value ? imp.stat_1_label + ' ' + imp.stat_1_value : null,
                imp.stat_2_label && imp.stat_2_value ? imp.stat_2_label + ' ' + imp.stat_2_value : null,
              ].filter(Boolean);
              return (
                <div key={imp.name} className="core-card" style={{ background: r.bg, border: '1px solid ' + r.border, borderRadius: 6, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: r.color, letterSpacing: 1, lineHeight: 1.3 }}>{imp.name}</div>
                    {imp.slot_type && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: r.color + '77', letterSpacing: 1, flexShrink: 0, marginLeft: 6 }}>{imp.slot_type.toUpperCase()}</span>}
                  </div>
                  {imp.passive_name && <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#9b5de588', letterSpacing: 1, marginBottom: 3 }}>{imp.passive_name}</div>}
                  {imp.description && <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4, marginBottom: stats.length ? 6 : 0 }}>{imp.description}</div>}
                  {stats.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {stats.map(function(s, i) { return <span key={i} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#9b5de5', background: '#9b5de512', border: '1px solid #9b5de522', borderRadius: 2, padding: '2px 5px' }}>{s}</span>; })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── ARTICLES ─────────────────────────────────────── */}
      {articles.length > 0 && (
        <section style={{ padding: '0 20px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 2, marginBottom: 4 }}>LATEST {shellName.toUpperCase()} INTEL</div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 16 }}>FROM CIPHER, DEXTER, NEXUS, MIRANDA — UPDATED EVERY 6H</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {articles.map(function(article) {
              var editorColors = { CIPHER: '#ff0000', NEXUS: '#00f5ff', DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5' };
              var editorColor = editorColors[article.editor] || '#888';
              var grade = article.ce_score >= 9 ? 'S' : article.ce_score >= 7 ? 'A' : article.ce_score >= 5 ? 'B' : 'C';
              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="art-card" style={{ display: 'flex', gap: 12, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderLeft: '3px solid ' + editorColor + '44', borderRadius: 8, padding: '14px', textDecoration: 'none' }}>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: editorColor + '88', letterSpacing: 1, marginBottom: 4 }}>{article.editor}</div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: TIER_COLORS[grade] || editorColor, lineHeight: 1 }}>{grade}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.headline}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{timeAgo(article.created_at)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── RELATED SHELLS ───────────────────────────────── */}
      <section style={{ padding: '0 20px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 12 }}>OTHER SHELLS</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['Assassin','Destroyer','Recon','Rook','Thief','Triage','Vandal'].filter(function(s) { return s.toLowerCase() !== slug; }).map(function(s) {
            var c = SHELL_COLORS[s.toLowerCase()] || '#888';
            return (
              <Link key={s} href={'/shells/' + s.toLowerCase()} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: c, background: c + '12', border: '1px solid ' + c + '30', borderRadius: 4, padding: '6px 14px', textDecoration: 'none', letterSpacing: 1 }}>
                {s.toUpperCase()}
              </Link>
            );
          })}
        </div>
      </section>

      {/* JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': faqItems.length > 0 ? 'FAQPage' : 'WebPage',
        name: shellName + ' Guide — Marathon Runner Shell | CyberneticPunks',
        description: 'Complete ' + shellName + ' guide for Marathon. Stats, abilities, cores, implants, and build guides.',
        url: 'https://cyberneticpunks.com/shells/' + slug,
        ...(faqItems.length > 0 ? {
          mainEntity: faqItems.map(function(item) {
            return {
              '@type': 'Question',
              name: item.q,
              acceptedAnswer: { '@type': 'Answer', text: item.a },
            };
          }),
        } : {}),
      })}} />
    </main>
  );
}
