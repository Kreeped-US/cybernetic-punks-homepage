// app/builds/page.js
// DEXTER'S BUILD LAB — Shell-organized build hub with weapon quick-ref
// Pulls DEXTER articles from Supabase, deduped by source video

import { supabase } from '../../lib/supabase';
import Link from 'next/link';

export const revalidate = 300;

// ─── SEO METADATA ───────────────────────────────────────────────
export const metadata = {
  title: 'Marathon Builds & Loadouts — Best Shells, Weapons & Loadout Guides | CyberneticPunks',
  description: 'DEXTER grades the builds. Auto-updated Marathon loadout guides for every Runner Shell — Destroyer, Vandal, Recon, Assassin, Triage, Thief. Weapon tier list, core combos, and meta analysis updated every 6 hours.',
  keywords: 'Marathon builds, Marathon loadouts, Marathon best weapons, Marathon Destroyer build, Marathon Assassin build, Marathon Thief build, Marathon weapon tier list, Marathon cores, Marathon implants, best Marathon shell, Marathon Season 1 meta',
  openGraph: {
    title: "Marathon Builds & Loadouts — DEXTER's Build Lab | CyberneticPunks",
    description: 'Auto-updated Marathon build guides for every Runner Shell. Weapon tiers, core combos, and loadout analysis refreshed every 6 hours.',
    url: 'https://cyberneticpunks.com/builds',
    type: 'website',
  },
};

// ─── CONSTANTS ──────────────────────────────────────────────────
const DEXTER_ORANGE = '#ff8800';
const CYAN = '#00f5ff';
const BLACK = '#030303';
const RED = '#ff0000';
const GREEN = '#00ff88';

const SHELLS = [
  { name: 'Destroyer', role: 'Frontline Combat',   icon: '⬢', color: '#ff4444', description: 'Thrusters, aggression, Search & Destroy. Built to push fights.' },
  { name: 'Vandal',    role: 'Mobility Specialist', icon: '⬡', color: '#ff8800', description: 'Jump jets, movement chaining, chaos in motion.' },
  { name: 'Recon',     role: 'Intel Gatherer',      icon: '◈', color: '#00f5ff', description: 'Echo Pulse, scanning, information warfare.' },
  { name: 'Assassin',  role: 'Stealth Operator',    icon: '◇', color: '#cc44ff', description: 'Active Camo, Shadow Dive, invisibility kills.' },
  { name: 'Triage',    role: 'Combat Support',      icon: '◎', color: '#00ff88', description: 'Healing, team sustain, frontline medic.' },
  { name: 'Thief',     role: 'Loot Specialist',     icon: '⬠', color: '#ffcc00', description: 'X-Ray Visor, Pickpocket Drone, extraction expert.' },
];

const WEAPON_CATEGORIES = [
  {
    category: 'Assault Rifles',
    picks: [
      { name: 'M77 Assault Rifle', tier: 'S', ammo: 'Medium Rounds', note: 'Best all-rounder. Damage, range, accuracy.' },
      { name: 'Overrun AR',        tier: 'S', ammo: 'Medium Rounds', note: '720 RPM pressure. Forgiving for new players.' },
      { name: 'Impact HAR',        tier: 'A', ammo: 'Heavy Rounds',  note: 'Hardest-hitting AR. High recoil, high reward.' },
      { name: 'V75 Scar',          tier: 'B', ammo: 'Volt Battery',  note: 'Energy AR. Spinning barrel, unique feel.' },
      { name: 'CE Tactical',       tier: 'B', ammo: 'Light Rounds',  note: 'Starter AR. Prestige mod unlocks invis on kill.' },
    ],
  },
  {
    category: 'SMGs',
    picks: [
      { name: 'BRRT SMG',        tier: 'S', ammo: 'Medium Rounds', note: 'Highest SMG damage per shot. Corridor king.' },
      { name: 'Bully SMG',       tier: 'A', ammo: 'Medium Rounds', note: 'Burst-fire. Consistent close-range performer.' },
      { name: 'V22 Volt Thrower',tier: 'B', ammo: 'Volt Battery',  note: 'Lock-on system. Niche but modable.' },
    ],
  },
  {
    category: 'Shotguns',
    picks: [
      { name: 'WSTR Combat Shotgun', tier: 'S', ammo: 'MIPS', note: 'Double-barrel delete button. Iconic.' },
      { name: 'Copperhead RF',       tier: 'A', ammo: 'MIPS', note: 'Semi-auto. More range than WSTR.' },
    ],
  },
  {
    category: 'Precision Rifles',
    picks: [
      { name: 'Hardline PR',  tier: 'S', ammo: 'Medium Rounds', note: 'MIDA vibes. Rewarding for headshot players.' },
      { name: 'Stryder M1T', tier: 'S', ammo: 'Medium Rounds', note: 'Destiny players will feel right at home.' },
    ],
  },
  {
    category: 'Sniper Rifles',
    picks: [
      { name: 'Longshot', tier: 'S', ammo: 'MIPS', note: 'Top long-range pick. Clean sightlines.' },
      { name: 'Outland',  tier: 'A', ammo: 'MIPS', note: 'Solid secondary sniper option.' },
    ],
  },
  {
    category: 'Machine Guns',
    picks: [
      { name: 'Retaliator LMG', tier: 'A', ammo: 'Heavy Rounds', note: 'Area denial. Shield mod slot.' },
      { name: 'Conquest LMG',   tier: 'A', ammo: 'Light Rounds',  note: 'Lighter LMG option. Good sustained fire.' },
      { name: 'Demolition HMG', tier: 'B', ammo: 'Heavy Rounds', note: 'Slow but devastating. Niche use.' },
    ],
  },
  {
    category: 'Railguns',
    picks: [
      { name: 'Ares RG',    tier: 'S', ammo: 'Volt Cells', note: 'Charged devastation. Ammo is scarce.' },
      { name: 'V00 Zeus RG',tier: 'B', ammo: 'Volt Cells', note: 'Alternative energy rail. Lower tier.' },
    ],
  },
  {
    category: 'Sidearms',
    picks: [
      { name: 'Magnum MC',    tier: 'A', ammo: 'Heavy Rounds',  note: 'Hand cannon. Best pistol if you can aim.' },
      { name: 'Misriah 2442', tier: 'A', ammo: 'Medium Rounds', note: 'Reliable backup. Solid stats.' },
      { name: 'CE Tactical',  tier: 'B', ammo: 'Medium Rounds', note: 'Budget sidearm. Good for new runners.' },
    ],
  },
];

// Real Marathon weapon builds — no placeholders
const DEXTER_PICKS = [
  {
    id: 'extractor',
    shell: 'Thief',
    style: 'Stealth · Solo',
    grade: 'A',
    name: 'The Extractor',
    description: 'Get in, grab loot, get out alive. WSTR up close, Hardline PR for mid-range threats. Built for consistent extraction across all maps.',
    weapons: ['WSTR Combat Shotgun', 'Hardline PR'],
    strengths: ['Fast extraction times', 'Strong in CQC', 'Works solo or team'],
    weaknesses: ['Loses mid-range duels', 'Low sustained ammo'],
    color: '#ffcc00',
  },
  {
    id: 'aggressor',
    shell: 'Destroyer',
    style: 'Striker · Aggressive',
    grade: 'A',
    name: 'The Aggressor',
    description: 'Maximum pressure build. BRRT SMG deletes runners in corridors, Ares RG punishes anyone who tries to disengage.',
    weapons: ['BRRT SMG', 'Ares RG'],
    strengths: ['Fastest TTK in close range', 'Wins almost every 1v1', 'Thruster synergy'],
    weaknesses: ['Volt Cells scarce', 'Poor at long range', 'Expensive to lose'],
    color: '#ff4444',
  },
  {
    id: 'marksman',
    shell: 'Recon',
    style: 'Precision · Mid-Range',
    grade: 'A',
    name: 'The Marksman',
    description: 'Stryder M1T for mid-range consistency, Magnum MC as a punishing sidearm. Echo Pulse gives you target info before engagements even start.',
    weapons: ['Stryder M1T', 'Magnum MC'],
    strengths: ['High skill ceiling', 'Excellent sightline control', 'Good information advantage'],
    weaknesses: ['Weak in CQC', 'Requires aim discipline', 'Low area denial'],
    color: '#00f5ff',
  },
  {
    id: 'rookie',
    shell: 'Rook',
    style: 'Beginner · Balanced',
    grade: 'B+',
    name: 'Rookie Runner',
    description: 'M77 Assault Rifle carries you through most engagements. Misriah 2442 as backup. Forgiving kit for your first dozen runs.',
    weapons: ['M77 Assault Rifle', 'Misriah 2442'],
    strengths: ['Very forgiving', 'Cheap to replace on death', 'Good for learning maps'],
    weaknesses: ['Low ceiling in PvP', 'Outscaled by A-tier builds', 'Limited utility'],
    color: '#aaaaaa',
  },
  {
    id: 'frontline',
    shell: 'Vandal',
    style: 'Frontline · Squad',
    grade: 'A-',
    name: 'Jump Jet Frontline',
    description: 'Retaliator LMG for area denial, WSTR Combat Shotgun to punish anyone who pushes. Vandal jump jets let you reposition after every burst.',
    weapons: ['Retaliator LMG', 'WSTR Combat Shotgun'],
    strengths: ['Best area denial in game', 'Forces enemy rotations', 'Team force multiplier'],
    weaknesses: ['Heavy loadout slows movement', 'Relies on team follow-up', 'Expensive'],
    color: '#ff8800',
  },
  {
    id: 'sniper',
    shell: 'Assassin',
    style: 'Stealth · Long Range',
    grade: 'B+',
    name: 'Silent Operator',
    description: 'Longshot from concealment, Overrun AR for any runner who gets close. Active Camo lets you reposition between shots safely.',
    weapons: ['Longshot', 'Overrun AR'],
    strengths: ['Safe repositioning', 'High-value target elimination', 'Zero noise signature'],
    weaknesses: ['Useless if spotted', 'Slow loot speed', 'MIPS ammo scarce'],
    color: '#cc44ff',
  },
];

const TIER_COLORS = {
  S: '#ff0000',
  A: '#ff8800',
  B: '#ffcc00',
  C: '#00f5ff',
  D: '#666666',
};

// ─── PAGE COMPONENT ─────────────────────────────────────────────
export default async function BuildsPage() {
  // Fetch DEXTER articles
  const { data: dexterArticles } = await supabase
    .from('feed_items')
    .select('id, headline, slug, tags, ce_score, thumbnail, source_video_id, created_at')
    .eq('editor', 'DEXTER')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(60);

  // Group by shell — dedupe by source_video_id within each shell
  const shellNames = SHELLS.map(s => s.name.toLowerCase());
  const articlesByShell = {};
  const generalArticles = [];
  const seenVideoIds = {};

  (dexterArticles || []).forEach(article => {
    const tags = (article.tags || []).map(t => t.toLowerCase());
    const headline = (article.headline || '').toLowerCase();
    let matchedShell = null;

    for (const shell of shellNames) {
      if (tags.includes(shell) || headline.includes(shell)) {
        matchedShell = shell;
        break;
      }
    }

    const videoId = article.source_video_id || article.id;
    const dedupeKey = matchedShell ? matchedShell + '_' + videoId : 'general_' + videoId;

    if (seenVideoIds[dedupeKey]) return; // skip duplicate
    seenVideoIds[dedupeKey] = true;

    if (matchedShell) {
      if (!articlesByShell[matchedShell]) articlesByShell[matchedShell] = [];
      articlesByShell[matchedShell].push(article);
    } else {
      generalArticles.push(article);
    }
  });

  const totalUniqueArticles = Object.values(articlesByShell).reduce((sum, arr) => sum + arr.length, 0) + generalArticles.length;

  return (
    <main style={{ background: BLACK, minHeight: '100vh', color: '#ffffff' }}>

      {/* ─── HERO ─────────────────────────────────────── */}
      <section style={{
        padding: '120px 20px 60px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: `radial-gradient(circle, ${DEXTER_ORANGE}15 0%, transparent 70%)`,
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px', margin: '0 auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 16px',
            border: `1px solid ${DEXTER_ORANGE}44`,
            borderRadius: '4px',
            marginBottom: '20px',
            fontSize: '13px',
            fontFamily: 'var(--font-mono)',
            color: DEXTER_ORANGE,
            letterSpacing: '2px',
          }}>
            <span style={{ fontSize: '16px' }}>⬢</span> DEXTER — BUILD ENGINEER
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2rem, 6vw, 3.5rem)',
            fontWeight: 700,
            lineHeight: 1.1,
            margin: '0 0 16px 0',
            color: '#ffffff',
          }}>
            BUILD <span style={{ color: DEXTER_ORANGE }}>LAB</span>
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '17px',
            color: '#999999',
            lineHeight: 1.6,
            maxWidth: '600px',
            margin: '0 auto 24px',
          }}>
            Loadout guides for every Runner Shell — graded, explained, and
            updated every 6 hours from what top creators are actually running.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
            <Stat label="BUILDS ANALYZED"  value={totalUniqueArticles} color={DEXTER_ORANGE} />
            <Stat label="RUNNER SHELLS"    value="6"                   color={CYAN} />
            <Stat label="WEAPONS TRACKED"  value="28"                  color={RED} />
            <Stat label="UPDATE CYCLE"     value="6H"                  color={GREEN} />
          </div>
        </div>
      </section>

      {/* ─── SHELL QUICK NAV ─────────────────────────── */}
      <section style={{ padding: '0 20px 40px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {SHELLS.map(shell => {
            const count = articlesByShell[shell.name.toLowerCase()]?.length || 0;
            return (
              <a key={shell.name} href={'#shell-' + shell.name.toLowerCase()} style={{
                display: 'block',
                padding: '16px',
                background: '#0a0a0a',
                border: '1px solid ' + shell.color + '33',
                borderRadius: '6px',
                textDecoration: 'none',
              }}>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13px',
                  color: shell.color,
                  letterSpacing: '1px',
                  marginBottom: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span>{shell.icon}</span> {shell.name.toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#666' }}>
                  {shell.role} · {count} {count === 1 ? 'guide' : 'guides'}
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* ─── WEAPON QUICK REFERENCE ──────────────────── */}
      <section style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
            WEAPON QUICK REFERENCE
          </h2>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: DEXTER_ORANGE,
            padding: '2px 8px',
            border: '1px solid ' + DEXTER_ORANGE + '44',
            borderRadius: '3px',
            letterSpacing: '1px',
          }}>
            SEASON 1
          </span>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          28 weapons across 8 categories · 5 ammo types · 5 rarity tiers (Standard → Prestige)
        </p>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '24px',
          padding: '12px 16px',
          background: '#0a0a0a',
          borderRadius: '6px',
          border: '1px solid #1a1a1a',
        }}>
          <AmmoTag name="Light Rounds"  color="#aaaaaa" />
          <AmmoTag name="Medium Rounds" color="#ccaa88" />
          <AmmoTag name="Heavy Rounds"  color="#ff6644" />
          <AmmoTag name="Volt Battery"  color="#00f5ff" />
          <AmmoTag name="Volt Cells"    color="#8844ff" />
          <AmmoTag name="MIPS"          color="#ffcc00" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {WEAPON_CATEGORIES.map(cat => (
            <div key={cat.category} style={{
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: '6px',
              padding: '16px',
            }}>
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '13px',
                color: DEXTER_ORANGE,
                letterSpacing: '1px',
                marginBottom: '12px',
                textTransform: 'uppercase',
              }}>
                {cat.category}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {cat.picks.map(weapon => (
                  <div key={weapon.name} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 0',
                    borderBottom: '1px solid #111111',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: TIER_COLORS[weapon.tier],
                      minWidth: '20px',
                    }}>
                      {weapon.tier}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: '#ffffff', marginBottom: '2px' }}>
                        {weapon.name}
                      </div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#666' }}>
                        {weapon.note}
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#444', whiteSpace: 'nowrap' }}>
                      {weapon.ammo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DEXTER'S PICKS ──────────────────────────── */}
      <section style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
          DEXTER&apos;S PICKS
        </h2>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#666', marginBottom: '24px' }}>
          Hand-graded loadouts rated by effectiveness, versatility, and skill floor. Real weapons. Real shells.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {DEXTER_PICKS.map(build => (
            <div key={build.id} style={{
              background: '#0a0a0a',
              border: '1px solid ' + build.color + '33',
              borderRadius: '6px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                fontFamily: 'var(--font-heading)',
                fontSize: '28px',
                fontWeight: 700,
                color: build.grade.startsWith('S') ? RED : build.grade.startsWith('A') ? DEXTER_ORANGE : CYAN,
                opacity: 0.25,
                lineHeight: 1,
              }}>
                {build.grade}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: build.color,
                letterSpacing: '1px',
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}>
                {build.shell} · {build.style}
              </div>
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '18px',
                fontWeight: 700,
                color: '#ffffff',
                margin: '0 0 10px 0',
              }}>
                {build.name}
              </h3>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: '#888',
                lineHeight: 1.5,
                marginBottom: '14px',
              }}>
                {build.description}
              </p>
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  color: '#444',
                  letterSpacing: '1px',
                  marginBottom: '6px',
                }}>
                  WEAPONS
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {build.weapons.map(w => (
                    <span key={w} style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: '#ccc',
                      padding: '3px 8px',
                      background: '#111',
                      borderRadius: '3px',
                      border: '1px solid #222',
                    }}>
                      {w}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: GREEN, letterSpacing: '1px', marginBottom: '4px' }}>
                    STRENGTHS
                  </div>
                  {build.strengths.map(s => (
                    <div key={s} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#777', lineHeight: 1.6 }}>
                      + {s}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: RED, letterSpacing: '1px', marginBottom: '4px' }}>
                    WEAKNESSES
                  </div>
                  {build.weaknesses.map(w => (
                    <div key={w} style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: '#777', lineHeight: 1.6 }}>
                      − {w}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SHELL SECTIONS ──────────────────────────── */}
      {SHELLS.map(shell => {
        const shellKey = shell.name.toLowerCase();
        const articles = articlesByShell[shellKey] || [];
        return (
          <section key={shell.name} id={'shell-' + shellKey} style={{
            padding: '40px 20px',
            maxWidth: '1100px',
            margin: '0 auto',
            borderTop: '1px solid ' + shell.color + '22',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '20px', color: shell.color }}>{shell.icon}</span>
                  <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: shell.color, margin: 0 }}>
                    {shell.name.toUpperCase()}
                  </h2>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    color: '#666',
                    padding: '2px 8px',
                    border: '1px solid #222',
                    borderRadius: '3px',
                  }}>
                    {shell.role}
                  </span>
                </div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#666', margin: 0 }}>
                  {shell.description}
                </p>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#444' }}>
                {articles.length} {articles.length === 1 ? 'article' : 'articles'}
              </div>
            </div>

            {articles.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
                {articles.map(article => (
                  <ArticleCard key={article.id} article={article} accentColor={shell.color} />
                ))}
              </div>
            ) : (
              <div style={{
                padding: '30px',
                textAlign: 'center',
                background: '#0a0a0a',
                borderRadius: '6px',
                border: '1px dashed #1a1a1a',
              }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: '#444', margin: 0 }}>
                  DEXTER is gathering {shell.name} build intel — check back soon.
                </p>
              </div>
            )}
          </section>
        );
      })}

      {/* ─── GENERAL BUILD ARTICLES ──────────────────── */}
      {generalArticles.length > 0 && (
        <section style={{ padding: '40px 20px', maxWidth: '1100px', margin: '0 auto', borderTop: '1px solid #1a1a1a' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 700, color: '#ffffff', marginBottom: '8px' }}>
            GENERAL BUILD INTEL
          </h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#666', marginBottom: '24px' }}>
            Cross-shell analysis, weapon comparisons, and meta trends.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '14px' }}>
            {generalArticles.slice(0, 12).map(article => (
              <ArticleCard key={article.id} article={article} accentColor={DEXTER_ORANGE} />
            ))}
          </div>
        </section>
      )}

      {/* ─── BOTTOM CTA ──────────────────────────────── */}
      <section style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#444', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '12px' }}>
          BUILDS ANALYZED BY
        </p>
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', color: DEXTER_ORANGE, marginBottom: '8px' }}>
          ⬢ DEXTER
        </p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#666', lineHeight: 1.6, marginBottom: '24px' }}>
          Build Engineer for CyberneticPunks. DEXTER monitors top Marathon
          creators around the clock and auto-publishes loadout analysis every 6 hours.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <Link href="/intel/dexter" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '13px',
            color: DEXTER_ORANGE,
            padding: '10px 24px',
            border: '1px solid ' + DEXTER_ORANGE,
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            ALL DEXTER ARTICLES →
          </Link>
          <Link href="/editors" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '13px',
            color: '#666',
            padding: '10px 24px',
            border: '1px solid #333',
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            MEET ALL EDITORS →
          </Link>
        </div>
      </section>

      {/* ─── JSON-LD ─────────────────────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Marathon Builds and Loadouts — DEXTER Build Lab',
          description: 'Auto-updated Marathon build guides for every Runner Shell with weapon tier rankings and loadout analysis.',
          url: 'https://cyberneticpunks.com/builds',
          mainEntity: {
            '@type': 'ItemList',
            name: 'Marathon Runner Shell Build Guides',
            numberOfItems: SHELLS.length,
            itemListElement: SHELLS.map((shell, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              name: shell.name + ' Build Guide',
              url: 'https://cyberneticpunks.com/builds#shell-' + shell.name.toLowerCase(),
            })),
          },
        }),
      }} />
    </main>
  );
}

// ─── ARTICLE CARD ────────────────────────────────────────────────
function ArticleCard({ article, accentColor }) {
  return (
    <Link href={'/intel/' + article.slug} style={{
      display: 'flex',
      gap: '14px',
      background: '#0a0a0a',
      border: '1px solid #1a1a1a',
      borderLeft: '2px solid ' + accentColor + '44',
      borderRadius: '6px',
      padding: '14px',
      textDecoration: 'none',
    }}>
      {article.thumbnail && (
        <div style={{ width: '100px', minWidth: '100px', height: '70px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0 }}>
          <img src={article.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          fontWeight: 600,
          color: '#ffffff',
          margin: '0 0 6px 0',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {article.headline}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {article.ce_score && (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              color: article.ce_score >= 8 ? RED : article.ce_score >= 6 ? DEXTER_ORANGE : CYAN,
            }}>
              CE:{article.ce_score}
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#444' }}>
            {timeAgo(article.created_at)}
          </span>
          {article.tags && article.tags.slice(0, 2).map(tag => (
            <span key={tag} style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '9px',
              color: '#555',
              padding: '1px 6px',
              background: '#111',
              borderRadius: '2px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

// ─── HELPERS ────────────────────────────────────────────────────
function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '24px', fontWeight: 700, color: color, lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#555', letterSpacing: '1px', marginTop: '4px' }}>
        {label}
      </div>
    </div>
  );
}

function AmmoTag({ name, color }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '11px',
      color: color,
      padding: '3px 10px',
      background: color + '11',
      border: '1px solid ' + color + '33',
      borderRadius: '3px',
    }}>
      {name}
    </span>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now - then;
  const diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'just now';
  if (diffH < 24) return diffH + 'h ago';
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return diffD + 'd ago';
  return Math.floor(diffD / 7) + 'w ago';
}
