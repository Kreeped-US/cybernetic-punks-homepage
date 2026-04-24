// app/guides/shells/[name]/page.js
// SEO-optimized per-shell guide pages — 7 pages pre-rendered.
// Each targets "Marathon [Shell] Guide" specifically.

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const revalidate = 300;

// ─── SHELL CONFIG ───────────────────────────────────────────
const SHELLS = {
  assassin: {
    name: 'Assassin',
    color: '#cc44ff',
    role: 'Stealth Killer',
    oneLiner: 'High-risk reposition gameplay. Pick a target, eliminate, disappear.',
    title: 'Marathon Assassin Guide — Stealth Builds, Abilities & Strategy',
    description: 'Complete Marathon Assassin shell guide. Active Camo strategy, stealth kill optimization, best weapons, and builds for the high-risk reposition playstyle.',
    keywords: 'Marathon Assassin guide, Marathon Assassin build, Marathon Assassin abilities, Marathon Assassin tips, Marathon stealth shell, Marathon Active Camo, Marathon Assassin loadout, Marathon Assassin strategy',
    intro: 'Assassin is Marathon\'s stealth specialist. Active Camo resets engagements, high-damage melee rewards precise execution, and mobility traits let you disappear before the body hits the ground. The hardest shell to master — the highest ceiling when you do.',
    playstyle: 'Engage only on your terms. Camo into position, secure the kill, exfil before anyone knows you were there. Avoid sustained fights — you lose every straight-up duel. Your job is disruption, not DPS.',
    strengths: ['Active Camo breaks line of sight on demand', 'High melee damage rewards flanks', 'Excellent mobility and reposition tools', 'Solo-dominant in ranked'],
    weaknesses: ['Lowest shield pool', 'Punished hard by team shooting', 'Mechanical skill floor is steep', 'Not forgiving for beginners'],
    priorityStats: ['Prime Recovery', 'Firewall', 'Melee Damage'],
  },
  destroyer: {
    name: 'Destroyer',
    color: '#ff3333',
    role: 'Heavy Combat',
    oneLiner: 'Frontline DPS. Tank damage, deal damage, hold ground.',
    title: 'Marathon Destroyer Guide — Heavy Combat Builds & Strategy',
    description: 'Complete Marathon Destroyer shell guide. Heavy weapon optimization, tank builds, abilities, and strategy for the frontline combat shell.',
    keywords: 'Marathon Destroyer guide, Marathon Destroyer build, Marathon Destroyer abilities, Marathon Destroyer tips, Marathon tank shell, Marathon Destroyer loadout, Marathon Destroyer strategy, Marathon heavy shell',
    intro: 'Destroyer is Marathon\'s heavy frontline shell. Built for sustained fights, it trades mobility for firepower and survivability. If Assassin picks engagements, Destroyer ends them — by standing in the middle and winning the DPS race.',
    playstyle: 'Hold ground. Take cover, out-trade, advance. Destroyer isn\'t built for fancy plays — it\'s built to win contested zones through raw combat stats. Pair with heavy weapons, keep your crew close, and lean on your shield pool.',
    strengths: ['Top-tier HP + shield pool', 'Heavy weapon optimization', 'Melee damage bonus', 'Consistent DPS winner'],
    weaknesses: ['Low mobility', 'Punished by repositioners', 'Poor solo extraction', 'Weak vs long-range specialists'],
    priorityStats: ['Melee Damage', 'Tactical Recovery', 'Hardware', 'Firewall'],
  },
  recon: {
    name: 'Recon',
    color: '#00d4ff',
    role: 'Information Specialist',
    oneLiner: 'Information-first play. See before they see you.',
    title: 'Marathon Recon Guide — Scout Builds, Echo Pulse & Squad Strategy',
    description: 'Complete Marathon Recon shell guide. Echo Pulse optimization, scout builds, squad support strategy, and the information-first playstyle.',
    keywords: 'Marathon Recon guide, Marathon Recon build, Marathon Recon abilities, Marathon Recon tips, Marathon scout shell, Marathon Echo Pulse, Marathon Recon loadout, Marathon Recon strategy',
    intro: 'Recon is Marathon\'s information specialist. Echo Pulse scans enemies through walls, passive detection traits reveal threats before they\'re in sight, and squad utility makes it the highest-impact support shell. Knowledge wins fights.',
    playstyle: 'Scout before every engagement. Echo Pulse to reveal positions, rotate to where the enemy isn\'t, feed info to your crew. Recon thrives in squads — solo play is viable but you\'re leaving 50% of its value on the table.',
    strengths: ['Unmatched information gathering', 'Strong in coordinated squads', 'Safe from ambushes (passive scan)', 'Scales with teammate skill'],
    weaknesses: ['Moderate combat stats', 'Underwhelming solo in late-match', 'Requires squad to maximize value', 'Average TTK'],
    priorityStats: ['Tactical Recovery', 'Finisher Siphon', 'Ping Duration'],
  },
  rook: {
    name: 'Rook',
    color: '#aaaaaa',
    role: 'Tank / Fortifier',
    oneLiner: 'Ironclad defense. Absorb, anchor, survive.',
    title: 'Marathon Rook Guide — Tank Builds, Shield Strategy & Playstyle',
    description: 'Complete Marathon Rook shell guide. Shield stacking builds, tank strategy, abilities, and the ironclad defensive playstyle. Note: Rook is banned from Ranked.',
    keywords: 'Marathon Rook guide, Marathon Rook build, Marathon Rook abilities, Marathon Rook tips, Marathon tank shell, Marathon shield build, Marathon Rook loadout, Marathon Rook strategy',
    intro: 'Rook is Marathon\'s pure tank. Highest combined HP + shield pool in the game, built to absorb damage that would delete any other shell. Powerful for beginners learning positioning — banned from Ranked due to balance concerns.',
    playstyle: 'Anchor the team. Take first contact, soak damage, let your crew flank while enemies waste ammo on you. In Casual play, Rook is nearly unkillable in duels. In squad contexts, you\'re the mobile cover your teammates shoot from behind.',
    strengths: ['Highest shield pool in game', 'Nearly unkillable in 1v1s', 'Beginner-friendly survival', 'Excellent for learning maps'],
    weaknesses: ['BANNED from Ranked mode', 'Lowest mobility', 'Poor solo extraction', 'Limited build variety'],
    priorityStats: ['Heat Capacity', 'Self-Repair Speed', 'Firewall'],
  },
  thief: {
    name: 'Thief',
    color: '#ffd700',
    role: 'Extraction Specialist',
    oneLiner: 'In, loot, out. Never be seen. Never be followed.',
    title: 'Marathon Thief Guide — Extraction Builds, Loot Strategy & Tips',
    description: 'Complete Marathon Thief shell guide. Pickpocket Drone strategy, Grapple Device optimization, loot routes, and the extraction-first playstyle. Top solo ranked pick.',
    keywords: 'Marathon Thief guide, Marathon Thief build, Marathon Thief abilities, Marathon Thief tips, Marathon extraction shell, Marathon Pickpocket Drone, Marathon Grapple Device, Marathon Thief loadout',
    intro: 'Thief is Marathon\'s extraction specialist. Pickpocket Drone loots enemies passively, Grapple Device escapes contested zones, and mobility traits make you the hardest shell to pin down. Ghost in, ghost out, never fight unless forced to.',
    playstyle: 'Run loot routes, not combat routes. Hit caches early, use the Pickpocket Drone on distracted enemies, Grapple to cover when spotted. Your value is what you extract with — every kill you take is a risk that wasn\'t worth it.',
    strengths: ['Best-in-class extraction speed', 'Passive loot generation', 'Excellent escape tools', 'S-tier solo ranked pick'],
    weaknesses: ['Low HP + shield', 'Poor sustained combat', 'Falls off in extended fights', 'Greedy plays get punished'],
    priorityStats: ['Loot Speed', 'Prime Recovery', 'Fall Resistance'],
  },
  triage: {
    name: 'Triage',
    color: '#00ff88',
    role: 'Squad Support',
    oneLiner: 'Squad anchor. Keep everyone alive, win through attrition.',
    title: 'Marathon Triage Guide — Support Builds, Revive Strategy & Squad Tips',
    description: 'Complete Marathon Triage shell guide. REBOOT+ revive strategy, MED-DRONE optimization, support builds, and the squad-anchor playstyle.',
    keywords: 'Marathon Triage guide, Marathon Triage build, Marathon Triage abilities, Marathon Triage tips, Marathon support shell, Marathon REBOOT, Marathon MED-DRONE, Marathon Triage loadout, Marathon medic shell',
    intro: 'Triage is Marathon\'s dedicated support shell. REBOOT+ revives teammates in situations that would wipe any other squad, MED-DRONE sustains through extended engagements, and self-repair makes you the hardest support to kill. Squad play\'s best shell.',
    playstyle: 'Stay alive and keep your crew alive. Hang back in fights, REBOOT+ at critical moments, drop MED-DRONE for sustain. Your kill count will be low — your win rate will be high. Beginner-friendly because survival covers for mechanical mistakes.',
    strengths: ['Best squad support in game', 'Self-sustain through fights', 'Forgiving for beginners', 'Turns losing fights into wins via revives'],
    weaknesses: ['Weak solo combat', 'Lower damage output', 'Requires squad to shine', 'Pure solo play is uphill'],
    priorityStats: ['Prime Recovery', 'Self-Repair Speed', 'Revive Speed'],
  },
  vandal: {
    name: 'Vandal',
    color: '#ff8800',
    role: 'Movement Specialist',
    oneLiner: 'Movement chains. Force fights at ranges they can\'t handle.',
    title: 'Marathon Vandal Guide — Movement Builds, Jump Jet Strategy & Tips',
    description: 'Complete Marathon Vandal shell guide. Jump Jet optimization, movement chain tactics, aggressive builds, and the pace-setting playstyle. Top solo ranked pick.',
    keywords: 'Marathon Vandal guide, Marathon Vandal build, Marathon Vandal abilities, Marathon Vandal tips, Marathon movement shell, Marathon Jump Jet, Marathon Vandal loadout, Marathon Vandal strategy, Marathon aggressive shell',
    intro: 'Vandal is Marathon\'s movement specialist. Jump Jets force engagements at ranges the enemy isn\'t prepared for, heat capacity lets you chain mobility abilities, and aggression traits reward pace. The build IS the strategy.',
    playstyle: 'Set the tempo. Jump Jet into positions they don\'t expect, commit to close range, rotate out before they adapt. Vandal punishes slow, methodical teams — your job is to make them play your game. Pair with close-range weapons.',
    strengths: ['Unmatched mobility', 'Forces favorable engagement ranges', 'Dominant solo ranked pick', 'High skill ceiling'],
    weaknesses: ['Medium HP/shield', 'Punished if you stop moving', 'Heat management takes practice', 'Bad at long-range fights'],
    priorityStats: ['Heat Capacity', 'Agility', 'Prime Recovery'],
  },
};

// ─── CONSTANTS ──────────────────────────────────────────────
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';
const PURPLE = '#9b5de5';
const ORANGE = '#ff8800';
const CYAN = '#00d4ff';

const TIER_COLORS = { S: '#ff2222', A: '#ff8800', B: '#ffd700', C: '#00d4ff', D: '#555' };

// ─── STATIC PARAMS ──────────────────────────────────────────
export function generateStaticParams() {
  return Object.keys(SHELLS).map(function(name) { return { name: name }; });
}

export async function generateMetadata({ params }) {
  var resolved = await params;
  var shell = SHELLS[resolved.name];
  if (!shell) return { title: 'Not Found' };

  return {
    title: shell.title + ' | CyberneticPunks',
    description: shell.description,
    keywords: shell.keywords,
    openGraph: {
      title: shell.title,
      description: shell.description,
      url: 'https://cyberneticpunks.com/guides/shells/' + resolved.name,
      siteName: 'CyberneticPunks',
      type: 'website',
      images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: shell.title,
      description: shell.description,
    },
    alternates: { canonical: 'https://cyberneticpunks.com/guides/shells/' + resolved.name },
  };
}

// ─── HELPERS ────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var hours = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

// ─── PAGE ───────────────────────────────────────────────────
export default async function ShellGuidePage({ params }) {
  var resolved = await params;
  var shell = SHELLS[resolved.name];
  if (!shell) notFound();

  var [shellStatsRes, shellValuesRes, metaTierRes, mirandaRes, dexterRes, weaponsRes, implantsRes] = await Promise.all([
    supabase
      .from('shell_stats')
      .select('*')
      .eq('name', shell.name)
      .maybeSingle(),

    supabase
      .from('shell_stat_values')
      .select('stat_name, stat_value')
      .eq('shell_name', shell.name),

    supabase
      .from('meta_tiers')
      .select('tier, trend, note, ranked_note')
      .eq('type', 'shell')
      .eq('name', shell.name)
      .maybeSingle(),

    // MIRANDA articles about this shell (10 most recent)
    supabase
      .from('feed_items')
      .select('id, headline, slug, body, tags, ce_score, thumbnail, created_at')
      .eq('editor', 'MIRANDA')
      .eq('is_published', true)
      .or('tags.cs.{' + resolved.name + '},headline.ilike.%' + shell.name + '%')
      .order('created_at', { ascending: false })
      .limit(10),

    // DEXTER builds for this shell (6 top by CE)
    supabase
      .from('feed_items')
      .select('id, headline, slug, tags, ce_score, thumbnail, created_at')
      .eq('editor', 'DEXTER')
      .eq('is_published', true)
      .or('tags.cs.{' + resolved.name + '},headline.ilike.%' + shell.name + '%')
      .order('ce_score', { ascending: false })
      .limit(6),

    // Best weapons in meta
    supabase
      .from('weapon_stats')
      .select('name, weapon_type, rarity, firepower_score, image_filename, ranked_viable')
      .eq('ranked_viable', true)
      .order('firepower_score', { ascending: false, nullsFirst: false })
      .limit(6),

    // Shell-locked or universal implants
    supabase
      .from('implant_stats')
      .select('name, slot_type, rarity, passive_name, required_runner, image_filename')
      .or('required_runner.eq.' + shell.name + ',required_runner.eq.Universal')
      .in('rarity', ['Superior', 'Prestige'])
      .order('rarity', { ascending: false })
      .limit(6),
  ]);

  var shellData = shellStatsRes.data || null;
  var statValues = shellValuesRes.data || [];
  var metaTier = metaTierRes.data || null;
  var mirandaArticles = mirandaRes.data || [];
  var dexterBuilds = dexterRes.data || [];
  var topWeapons = weaponsRes.data || [];
  var topImplants = implantsRes.data || [];

  var statMap = {};
  statValues.forEach(function(sv) { statMap[sv.stat_name] = sv.stat_value; });

  var shellImg = shellData?.image_filename ? '/images/shells/' + shellData.image_filename : null;

  // Structured data
  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',   item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://cyberneticpunks.com/guides' },
      { '@type': 'ListItem', position: 3, name: 'Shells', item: 'https://cyberneticpunks.com/guides/shells' },
      { '@type': 'ListItem', position: 4, name: shell.name, item: 'https://cyberneticpunks.com/guides/shells/' + resolved.name },
    ],
  };

  var articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: shell.title,
    description: shell.description,
    url: 'https://cyberneticpunks.com/guides/shells/' + resolved.name,
    author: { '@type': 'Organization', name: 'CyberneticPunks' },
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
    mainEntityOfPage: 'https://cyberneticpunks.com/guides/shells/' + resolved.name,
  };

  var faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: 'Is ' + shell.name + ' good in Marathon?', acceptedAnswer: { '@type': 'Answer', text: shell.intro } },
      { '@type': 'Question', name: 'How do you play ' + shell.name + ' in Marathon?', acceptedAnswer: { '@type': 'Answer', text: shell.playstyle } },
      { '@type': 'Question', name: 'What are the strengths of ' + shell.name + ' in Marathon?', acceptedAnswer: { '@type': 'Answer', text: shell.strengths.join('. ') + '.' } },
      { '@type': 'Question', name: 'What are the weaknesses of ' + shell.name + ' in Marathon?', acceptedAnswer: { '@type': 'Answer', text: shell.weaknesses.join('. ') + '.' } },
    ],
  };

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <style>{`
        .sg-card       { transition: background 0.12s, border-color 0.12s; }
        .sg-card:hover { background: #1e2228 !important; }
        .sg-link:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ BREADCRUMB ══════════════════════════════════════ */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li><Link href="/guides" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>GUIDES</Link></li>
          <li>/</li>
          <li><Link href="/guides/shells" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>SHELLS</Link></li>
          <li>/</li>
          <li style={{ color: shell.color }}>{shell.name.toUpperCase()}</li>
        </ol>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{ padding: '24px 24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: shell.color, background: shell.color + '15', border: '1px solid ' + shell.color + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
                {shell.role.toUpperCase()}
              </span>
              {metaTier && (
                <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: TIER_COLORS[metaTier.tier] || '#888', background: (TIER_COLORS[metaTier.tier] || '#888') + '15', border: '1px solid ' + (TIER_COLORS[metaTier.tier] || '#888') + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
                  {metaTier.tier}-TIER META
                </span>
              )}
              {shellData?.ranked_tier_solo && (
                <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: TIER_COLORS[shellData.ranked_tier_solo] || '#888', background: (TIER_COLORS[shellData.ranked_tier_solo] || '#888') + '15', border: '1px solid ' + (TIER_COLORS[shellData.ranked_tier_solo] || '#888') + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
                  RANKED {shellData.ranked_tier_solo}
                </span>
              )}
            </div>

            <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.0, margin: '0 0 14px' }}>
              MARATHON<br /><span style={{ color: shell.color }}>{shell.name.toUpperCase()} GUIDE</span>
            </h1>
            <p style={{ fontSize: 16, color: shell.color, lineHeight: 1.5, marginBottom: 14, fontWeight: 600, fontStyle: 'italic' }}>
              "{shell.oneLiner}"
            </p>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 560 }}>
              {shell.intro}
            </p>
          </div>

          {shellImg && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'inline-block', width: 240, height: 240, background: CARD_BG, border: '2px solid ' + shell.color + '55', borderRadius: 2, padding: 10, position: 'relative' }}>
                <img src={shellImg} alt={shell.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 50%, ' + shell.color + '10)', pointerEvents: 'none' }} />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══ QUICK STATS ═════════════════════════════════════ */}
      {shellData && (
        <section style={{ padding: '0 24px 32px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 4 }}>
            {[
              { label: 'HEALTH',        value: shellData.base_health || '—',      color: '#00ff41' },
              { label: 'SHIELD',        value: shellData.base_shield || '—',      color: '#00d4ff' },
              { label: 'PRIME',         value: shellData.prime_ability_name || '—', color: shell.color, small: true },
              { label: 'TACTICAL',      value: shellData.tactical_ability_name || '—', color: shell.color, small: true },
              { label: 'TRAIT',         value: shellData.trait_1_name || '—',     color: shell.color, small: true },
            ].map(function(stat, i) {
              return (
                <div key={i} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + stat.color, borderRadius: '0 0 2px 2px', padding: '12px 14px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>{stat.label}</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: stat.small ? 11 : 18, fontWeight: 900, color: stat.color, lineHeight: 1.1 }}>{stat.value}</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ PLAYSTYLE + STRENGTHS/WEAKNESSES ════════════════ */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
          <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + shell.color, borderRadius: '0 2px 2px 0', padding: '18px 20px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: shell.color, letterSpacing: 3, marginBottom: 10, fontWeight: 700 }}>HOW TO PLAY {shell.name.toUpperCase()}</div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>{shell.playstyle}</p>
          </div>

          <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #00ff41', borderRadius: '0 2px 2px 0', padding: '18px 20px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#00ff41', letterSpacing: 3, marginBottom: 10, fontWeight: 700 }}>STRENGTHS</div>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
              {shell.strengths.map(function(s, i) {
                return (
                  <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                    <span style={{ color: '#00ff41', flexShrink: 0 }}>▲</span>
                    <span>{s}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #ff4444', borderRadius: '0 2px 2px 0', padding: '18px 20px' }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#ff4444', letterSpacing: 3, marginBottom: 10, fontWeight: 700 }}>WEAKNESSES</div>
            <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
              {shell.weaknesses.map(function(w, i) {
                return (
                  <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>
                    <span style={{ color: '#ff4444', flexShrink: 0 }}>▼</span>
                    <span>{w}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      {/* ══ DEXTER BUILDS ═══════════════════════════════════ */}
      {dexterBuilds.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: ORANGE }}>⬢ DEXTER BUILDS</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <Link href="/intel/dexter" style={{ fontFamily: 'monospace', fontSize: 9, color: ORANGE, textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>ALL BUILDS →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 6 }}>
            {dexterBuilds.map(function(build) {
              var grade = build.ce_score >= 9 ? 'S' : build.ce_score >= 7 ? 'A' : build.ce_score >= 5 ? 'B' : 'C';
              var gradeColor = TIER_COLORS[grade] || ORANGE;
              return (
                <Link key={build.id} href={'/intel/' + build.slug} className="sg-card" style={{ display: 'flex', gap: 12, background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + ORANGE, borderRadius: '0 2px 2px 0', padding: 12, textDecoration: 'none' }}>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: gradeColor, lineHeight: 1 }}>{grade}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 6, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>CE</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', lineHeight: 1.3, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{build.headline}</div>
                    <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(build.created_at)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ MIRANDA STRATEGY GUIDES ═════════════════════════ */}
      {mirandaArticles.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: PURPLE }}>◎ MIRANDA STRATEGY</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <Link href="/intel/miranda" style={{ fontFamily: 'monospace', fontSize: 9, color: PURPLE, textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>ALL GUIDES →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 6 }}>
            {mirandaArticles.slice(0, 6).map(function(article) {
              var bodyPreview = (article.body || '').replace(/\*\*/g, '').replace(/#+\s/g, '').slice(0, 110);
              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="sg-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + PURPLE, borderRadius: '0 2px 2px 0', overflow: 'hidden', textDecoration: 'none' }}>
                  {article.thumbnail && (
                    <div style={{ height: 100, overflow: 'hidden', position: 'relative' }}>
                      <img src={article.thumbnail} alt={article.headline} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, ' + CARD_BG + ')' }} />
                    </div>
                  )}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: PURPLE, letterSpacing: 2, fontWeight: 700 }}>MIRANDA</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(article.created_at)}</span>
                    </div>
                    <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 800, color: '#fff', margin: '0 0 6px', lineHeight: 1.35 }}>{article.headline}</h3>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0, lineHeight: 1.5 }}>{bodyPreview}...</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ BEST WEAPONS FOR THIS SHELL ═════════════════════ */}
      {topWeapons.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>RANKED-VIABLE WEAPONS</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <Link href="/builds" style={{ fontFamily: 'monospace', fontSize: 9, color: ORANGE, textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>BUILD LAB →</Link>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 12, maxWidth: 680 }}>
            Top ranked-viable weapons by Firepower Score. Pair with {shell.name}\'s playstyle for optimal results. For full weapon analysis, visit the Build Lab.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 6 }}>
            {topWeapons.map(function(w) {
              var imgSrc = w.image_filename ? '/images/weapons/' + w.image_filename : null;
              return (
                <div key={w.name} className="sg-card" style={{ display: 'flex', gap: 10, alignItems: 'center', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #ff2222', borderRadius: '0 2px 2px 0', padding: '10px 12px' }}>
                  <div style={{ width: 36, height: 36, flexShrink: 0, background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {imgSrc ? <img src={imgSrc} alt={w.name} style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>⬢</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>{w.weapon_type || 'WEAPON'} · FPR {w.firepower_score || '—'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ IMPLANTS ═══════════════════════════════════════ */}
      {topImplants.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>TOP IMPLANTS FOR {shell.name.toUpperCase()}</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
            {topImplants.map(function(imp) {
              var imgSrc = imp.image_filename ? '/images/implants/' + imp.image_filename : null;
              var isShellLocked = imp.required_runner === shell.name;
              return (
                <div key={imp.name} className="sg-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + PURPLE, borderRadius: '0 2px 2px 0', padding: '10px 12px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, flexShrink: 0, background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {imgSrc ? <img src={imgSrc} alt={imp.name} style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span style={{ fontSize: 14, color: PURPLE + '40' }}>◇</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{imp.name}</div>
                      {imp.passive_name && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, marginBottom: 4 }}>{imp.passive_name}</div>}
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 7, color: PURPLE, background: PURPLE + '14', border: '1px solid ' + PURPLE + '30', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700 }}>{imp.rarity?.toUpperCase()}</span>
                        {isShellLocked && <span style={{ fontFamily: 'monospace', fontSize: 7, color: shell.color, letterSpacing: 1, fontWeight: 700 }}>{shell.name.toUpperCase()} ONLY</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ CTA ═════════════════════════════════════════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + shell.color, borderRadius: '0 2px 2px 0', padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: shell.color, letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>READY TO RUN {shell.name.toUpperCase()}?</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.1, marginBottom: 10 }}>
              GET A<br /><span style={{ color: shell.color }}>{shell.name.toUpperCase()} BUILD.</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              DEXTER will engineer a complete {shell.name} loadout — weapons, mods, implants, cores — tuned to your playstyle in seconds.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Link href={'/advisor?shell=' + shell.name} className="sg-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + ORANGE, borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: ORANGE, letterSpacing: 1, fontWeight: 700 }}>⬢ BUILD ADVISOR</div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>Get your {shell.name} loadout</div>
              </div>
              <span style={{ color: ORANGE, opacity: 0.5, fontSize: 13 }}>→</span>
            </Link>
            <Link href={'/shells/' + resolved.name} className="sg-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + CYAN, borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: CYAN, letterSpacing: 1, fontWeight: 700 }}>{shell.name.toUpperCase()} STATS</div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>Full ability breakdown + stats</div>
              </div>
              <span style={{ color: CYAN, opacity: 0.5, fontSize: 13 }}>→</span>
            </Link>
            <Link href="/guides/shells" className="sg-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + PURPLE, borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: PURPLE, letterSpacing: 1, fontWeight: 700 }}>◎ ALL SHELL GUIDES</div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>Compare with other shells</div>
              </div>
              <span style={{ color: PURPLE, opacity: 0.5, fontSize: 13 }}>←</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
