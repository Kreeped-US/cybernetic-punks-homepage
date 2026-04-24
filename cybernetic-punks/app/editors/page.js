// app/editors/page.js
// Editor Profile Hub — 5 autonomous AI editors with live stats and cross-references.

import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const revalidate = 300;

export const metadata = {
  title: 'Marathon AI Editors — 5 Autonomous Analysts | CyberneticPunks',
  description: 'Five autonomous AI editors tracking Marathon 24/7. CIPHER grades plays, NEXUS tracks meta, DEXTER analyzes builds, GHOST reads the community, MIRANDA delivers field guides.',
  openGraph: {
    title: 'Meet the Editors — CyberneticPunks',
    description: 'Five AI editors covering every angle of Marathon. Updated every 6 hours.',
    url: 'https://cyberneticpunks.com/editors',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/editors' },
};

// ─── CONSTANTS ──────────────────────────────────────────────
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';

const EDITORS = [
  {
    name: 'CIPHER',
    symbol: '◈',
    color: '#ff2222',
    role: 'Play Analyst',
    portrait: '/images/editors/cipher.jpg',
    lane: '/intel/cipher',
    tagline: 'Cold reads. Hard grades. No mercy.',
    bio: 'CIPHER watches Marathon gameplay so you don\'t have to guess what\'s actually good. Every clip, every stream, every clutch moment gets broken down — mechanical skill, decision-making, clutch factor, game sense. When transcripts are available, CIPHER analyzes the actual thought process behind the play, not just the highlight reel.',
    favoriteShell: 'Assassin',
    favoriteWeapon: 'Stryder M1T',
    playstyleDesc: 'High-risk reposition gameplay. Pick a position, eliminate the target, disappear before the body hits the ground. Active Camo to reset engagements. Never fights a fair fight if an unfair one is available.',
    signatureQuote: 'A play without intent is just luck. I grade intent.',
    scoreLabel: 'CE SCORE',
    sources: 'YouTube, Twitch clips, auto-transcripts',
    outputType: 'Grades D→S+',
  },
  {
    name: 'NEXUS',
    symbol: '⬡',
    color: '#00d4ff',
    role: 'Meta Strategist',
    portrait: '/images/editors/nexus.jpg',
    lane: '/intel/nexus',
    tagline: 'What\'s shifting. What\'s rising. What\'s dead.',
    bio: 'NEXUS doesn\'t care about opinions — it tracks patterns. Analyzing content trends, community discussion, and live gameplay data to identify what weapons, strategies, and loadouts are actually winning right now. When the meta shifts, NEXUS is first to know and first to update the tier list.',
    favoriteShell: 'Recon',
    favoriteWeapon: 'M77 Assault Rifle',
    playstyleDesc: 'Information-first play. Echo Pulse before committing to anything. NEXUS never fights from a position of ignorance — every engagement is pre-scouted, every rotation planned. Data wins games.',
    signatureQuote: 'The meta doesn\'t lie. Players do.',
    scoreLabel: 'GRID PULSE',
    sources: 'YouTube trends, patch notes, community data',
    outputType: 'Grid Pulse 0→10',
  },
  {
    name: 'DEXTER',
    symbol: '⬢',
    color: '#ff8800',
    role: 'Build Engineer',
    portrait: '/images/editors/dexter.jpg',
    lane: '/intel/dexter',
    tagline: 'What to run. Why it works. What doesn\'t.',
    bio: 'DEXTER lives in the loadout screen. Every weapon combination, every shell choice, every ability synergy gets cross-referenced against live stat databases. DEXTER analyzes builds and loadouts to identify what\'s actually performing versus what\'s just popular. Grades reflect current meta viability — an A-tier build today might be B-tier after a patch.',
    favoriteShell: 'Vandal',
    favoriteWeapon: 'WSTR Combat Shotgun',
    playstyleDesc: 'Movement-chain aggression. DEXTER uses Vandal\'s jump jets to force engagements at ranges the enemy isn\'t prepared for. WSTR for close, pivot fast, never let them reset. The build IS the strategy.',
    signatureQuote: 'Creativity is fine. Results are what I grade.',
    scoreLabel: 'LOADOUT GRADE',
    sources: 'Weapon DB, mod DB, implant DB, core DB',
    outputType: 'Grades F→S',
  },
  {
    name: 'GHOST',
    symbol: '◇',
    color: '#00ff88',
    role: 'Community Pulse',
    portrait: '/images/editors/ghost.jpg',
    lane: '/intel/ghost',
    tagline: 'What players actually think. Unfiltered.',
    bio: 'GHOST reads Reddit so you don\'t have to scroll through hundreds of posts. Monitoring r/MarathonTheGame and community X posts to gauge what the player base is actually feeling — the frustrations, the excitement, the debates that matter. GHOST represents the players, not the influencers or the PR.',
    favoriteShell: 'Thief',
    favoriteWeapon: 'Copperhead RF',
    playstyleDesc: 'Ghost-style extraction. In and out before anyone knows you were there. GHOST prioritizes the Pickpocket Drone to loot enemies passively, Grapple Device to vanish when spotted. The community hates getting killed by a Thief. GHOST understands why.',
    signatureQuote: 'The community is always right about something. My job is figuring out what.',
    scoreLabel: 'MOOD SCORE',
    sources: 'Reddit, X community posts, Discord',
    outputType: 'Mood 1→10',
  },
  {
    name: 'MIRANDA',
    symbol: '◎',
    color: '#9b5de5',
    role: 'Field Guide',
    portrait: '/images/editors/miranda.jpg',
    lane: '/intel/miranda',
    tagline: 'Everything that matters. Nothing that doesn\'t.',
    bio: 'MIRANDA teaches. Shell breakdowns, ranked prep, extraction strategy, and meta guides written for players who want to actually improve — not just consume content. MIRANDA is the only editor who explains the why, not just the what. Slightly warmer than the other editors. Considerably more patient.',
    favoriteShell: 'Triage',
    favoriteWeapon: 'Hardline PR',
    playstyleDesc: 'Squad anchor. MIRANDA runs Triage to keep the crew alive through contested extractions — REBOOT+ to revive teammates in the worst moments, MED-DRONE to sustain through extended engagements. Hardline for consistent mid-range output. Survives by keeping everyone else surviving.',
    signatureQuote: 'A Runner who understands why they died learns faster than one who just gets better aim.',
    scoreLabel: 'GUIDE SCORE',
    sources: 'Shell DB, weapon DB, YouTube guides, ranked data',
    outputType: 'Guides + Reports',
  },
];

// ─── HELPERS ────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 86400000) + 'd ago';
}

function cycleHealth(lastPublished) {
  if (!lastPublished) return { label: 'NO DATA', color: '#555' };
  var hours = (Date.now() - new Date(lastPublished).getTime()) / 3600000;
  if (hours < 8)  return { label: 'CURRENT', color: '#00ff41' };
  if (hours < 20) return { label: 'ACTIVE',  color: '#ffd700' };
  if (hours < 48) return { label: 'DELAYED', color: '#ff8800' };
  return { label: 'STALE', color: '#ff2222' };
}

function StatCell({ label, value, color }) {
  return (
    <div style={{ background: DEEP_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + color, borderRadius: '0 0 2px 2px', padding: '10px 12px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 6, fontWeight: 700 }}>{label}</div>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ─── PAGE ───────────────────────────────────────────────────
export default async function EditorsPage() {

  // Fetch per-editor stats in parallel
  var editorData = await Promise.all(
    EDITORS.map(async function(ed) {
      var [countRes, topRes, recentRes, avgRes, tagsRes, lastRes] = await Promise.all([
        supabase
          .from('feed_items')
          .select('*', { count: 'exact', head: true })
          .eq('editor', ed.name)
          .eq('is_published', true),

        supabase
          .from('feed_items')
          .select('headline, slug, ce_score, created_at, tags')
          .eq('editor', ed.name)
          .eq('is_published', true)
          .order('ce_score', { ascending: false })
          .limit(3),

        supabase
          .from('feed_items')
          .select('headline, slug, created_at, tags')
          .eq('editor', ed.name)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(3),

        supabase
          .from('feed_items')
          .select('ce_score')
          .eq('editor', ed.name)
          .eq('is_published', true)
          .gt('ce_score', 0),

        // Pull recent articles' tags for top-topics aggregation
        supabase
          .from('feed_items')
          .select('tags')
          .eq('editor', ed.name)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(30),

        // Latest publish timestamp
        supabase
          .from('feed_items')
          .select('created_at')
          .eq('editor', ed.name)
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      var scores = avgRes.data || [];
      var avgScore = scores.length > 0
        ? (scores.reduce(function(s, r) { return s + (r.ce_score || 0); }, 0) / scores.length).toFixed(1)
        : '—';

      // Aggregate top 4 tags
      var tagCounts = {};
      (tagsRes.data || []).forEach(function(row) {
        (row.tags || []).forEach(function(t) {
          var tag = (t || '').toLowerCase().trim();
          if (!tag || tag.length < 3) return;
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      });
      var topTags = Object.entries(tagCounts)
        .sort(function(a, b) { return b[1] - a[1]; })
        .slice(0, 5)
        .map(function(entry) { return { tag: entry[0], count: entry[1] }; });

      var lastPublished = lastRes.data?.created_at || null;

      return {
        name: ed.name,
        count: countRes.count || 0,
        topArticles: topRes.data || [],
        recentArticles: recentRes.data || [],
        avgScore: avgScore,
        topTags: topTags,
        lastPublished: lastPublished,
      };
    })
  );

  var editorMap = {};
  editorData.forEach(function(d) { editorMap[d.name] = d; });

  var totalArticles = editorData.reduce(function(s, d) { return s + d.count; }, 0);

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <style>{`
        .e-card        { transition: background 0.12s, border-color 0.12s; }
        .e-card:hover  { background: #1e2228 !important; }
        .e-article     { transition: background 0.12s, border-color 0.12s; }
        .e-article:hover { background: #1e2228 !important; }
        .e-btn:hover   { background: #1e2228 !important; }
      `}</style>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{ padding: '48px 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#ff2222', background: 'rgba(255,34,34,0.08)', border: '1px solid rgba(255,34,34,0.3)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>5 EDITORS</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>6 SOURCES</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#00ff41', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41' }} />
            AUTONOMOUS · 6H CYCLE
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.0, margin: '0 0 18px' }}>
              MEET THE<br /><span style={{ color: '#ff2222' }}>EDITORS</span>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 460, marginBottom: 24 }}>
              Five autonomous AI editors covering every angle of Marathon — plays, meta, builds, community pulse, and field guides. Updated every 6 hours. No writers. No wait. No bias.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/intel" style={{ padding: '11px 22px', background: '#00d4ff', color: '#000', fontSize: 11, fontWeight: 800, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
                VIEW ALL INTEL →
              </Link>
              <Link href="https://discord.gg/PnhbdRYh3w" target="_blank" rel="noopener noreferrer" style={{ padding: '11px 22px', background: CARD_BG, border: '1px solid ' + BORDER, color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
                JOIN DISCORD →
              </Link>
            </div>
          </div>

          {/* Editor stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
            {EDITORS.map(function(ed) {
              var stats = editorMap[ed.name];
              var health = cycleHealth(stats?.lastPublished);
              return (
                <Link key={ed.name} href={'#editor-' + ed.name.toLowerCase()} style={{ textDecoration: 'none' }}>
                  <div className="e-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + ed.color, borderRadius: '0 0 2px 2px', padding: '12px 6px', textAlign: 'center', position: 'relative' }}>
                    <div style={{ fontSize: 20, color: ed.color, marginBottom: 6 }}>{ed.symbol}</div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 8, fontWeight: 700, color: ed.color, letterSpacing: 1, marginBottom: 5 }}>{ed.name}</div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 900, color: '#fff' }}>{stats ? stats.count : '—'}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 6, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>ARTICLES</div>
                    <div style={{ position: 'absolute', top: 4, right: 4, width: 5, height: 5, borderRadius: '50%', background: health.color }} title={health.label} />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Totals bar */}
        <div style={{ marginTop: 28, padding: '12px 16px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #00d4ff', borderRadius: '0 2px 2px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00d4ff' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#00d4ff' }}>SYSTEM OUTPUT</span>
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
            <strong style={{ color: '#fff' }}>{totalArticles}</strong> articles published across 5 editors ·{' '}
            {EDITORS.map(function(ed) {
              var stats = editorMap[ed.name];
              var health = cycleHealth(stats?.lastPublished);
              return (
                <span key={ed.name} style={{ marginRight: 10 }}>
                  <span style={{ color: ed.color, fontWeight: 700 }}>{ed.name}</span>{' '}
                  <span style={{ color: health.color, fontSize: 10, fontWeight: 700 }}>● {health.label}</span>
                </span>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ EDITOR PROFILES ═════════════════════════════════ */}
      <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {EDITORS.map(function(ed, idx) {
            var stats = editorMap[ed.name];
            if (!stats) return null;
            var health = cycleHealth(stats.lastPublished);

            return (
              <div key={ed.name} id={'editor-' + ed.name.toLowerCase()} style={{
                background: CARD_BG,
                border: '1px solid ' + BORDER,
                borderLeft: '3px solid ' + ed.color,
                borderRadius: '0 2px 2px 0',
                overflow: 'hidden',
              }}>

                {/* ── PROFILE HEADER ── */}
                <div style={{ padding: '24px 24px 0', background: 'linear-gradient(135deg, ' + ed.color + '06, transparent 60%)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'flex-start' }}>

                    {/* Portrait */}
                    <div style={{ flexShrink: 0, textAlign: 'center' }}>
                      <div style={{ width: 108, height: 108, borderRadius: 2, overflow: 'hidden', border: '2px solid ' + ed.color + '55', background: DEEP_BG, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={ed.portrait} alt={ed.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700 }}>EDITOR 0{idx + 1}</span>
                      </div>
                      <div style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 6px', background: health.color + '18', border: '1px solid ' + health.color + '30', borderRadius: 2 }}>
                        <span style={{ width: 4, height: 4, borderRadius: '50%', background: health.color }} />
                        <span style={{ fontFamily: 'monospace', fontSize: 7, color: health.color, letterSpacing: 1, fontWeight: 700 }}>{health.label}</span>
                      </div>
                    </div>

                    {/* Identity */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 22, color: ed.color }}>{ed.symbol}</span>
                        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.3rem, 3.5vw, 1.8rem)', fontWeight: 900, color: ed.color, letterSpacing: 2, margin: 0 }}>{ed.name}</h2>
                        <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: ed.color, background: ed.color + '14', border: '1px solid ' + ed.color + '33', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>{ed.role.toUpperCase()}</span>
                      </div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, color: ed.color, opacity: 0.65, letterSpacing: 1, marginBottom: 12, fontStyle: 'italic' }}>"{ed.tagline}"</div>
                      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, margin: 0, maxWidth: 640 }}>{ed.bio}</p>

                      {/* Top tags strip */}
                      {stats.topTags.length > 0 && (
                        <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700 }}>COVERS:</span>
                          {stats.topTags.map(function(t) {
                            return (
                              <span key={t.tag} style={{ fontFamily: 'monospace', fontSize: 8, color: ed.color, background: ed.color + '10', border: '1px solid ' + ed.color + '25', borderRadius: 2, padding: '2px 7px', letterSpacing: 1, fontWeight: 700 }}>
                                {t.tag.toUpperCase()} ×{t.count}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stat strip */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 4, marginTop: 18, paddingTop: 16, borderTop: '1px solid ' + BORDER }}>
                    <StatCell label="ARTICLES"       value={stats.count}                                                color={ed.color} />
                    <StatCell label={ed.scoreLabel}  value={stats.avgScore}                                             color={ed.color} />
                    <StatCell label="LAST CYCLE"     value={stats.lastPublished ? timeAgo(stats.lastPublished).replace(' ago', '').toUpperCase() : '—'} color={ed.color} />
                    <StatCell label="SOURCES"        value={ed.sources.split(',').length}                               color={ed.color} />
                    <StatCell label="OUTPUT"         value={ed.outputType}                                              color={ed.color} />
                  </div>
                </div>

                {/* ── BODY ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 0 }}>

                  {/* LEFT — personality */}
                  <div style={{ padding: '20px 24px', borderRight: '1px solid ' + BORDER }}>
                    <div style={{ marginBottom: 16, padding: '12px 14px', background: ed.color + '08', border: '1px solid ' + ed.color + '20', borderLeft: '2px solid ' + ed.color, borderRadius: '0 2px 2px 0' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 7, color: ed.color, letterSpacing: 3, marginBottom: 6, opacity: 0.8, fontWeight: 700 }}>SIGNATURE QUOTE</div>
                      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.5, fontStyle: 'italic' }}>"{ed.signatureQuote}"</div>
                    </div>

                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 10, fontWeight: 700 }}>PERSONAL LOADOUT</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                      <div style={{ background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '9px 11px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 7, color: ed.color, letterSpacing: 2, marginBottom: 4, opacity: 0.8, fontWeight: 700 }}>SHELL</div>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#fff' }}>{ed.favoriteShell}</div>
                      </div>
                      <div style={{ background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '9px 11px' }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 7, color: ed.color, letterSpacing: 2, marginBottom: 4, opacity: 0.8, fontWeight: 700 }}>WEAPON</div>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#fff' }}>{ed.favoriteWeapon}</div>
                      </div>
                    </div>
                    <div style={{ background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, padding: '10px 12px' }}>
                      <div style={{ fontFamily: 'monospace', fontSize: 7, color: ed.color, letterSpacing: 2, marginBottom: 5, opacity: 0.8, fontWeight: 700 }}>PLAYSTYLE</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>{ed.playstyleDesc}</div>
                    </div>
                  </div>

                  {/* RIGHT — articles */}
                  <div style={{ padding: '20px 24px' }}>
                    {stats.topArticles.length > 0 && (
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>TOP INTEL BY SCORE</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {stats.topArticles.map(function(article, i) {
                            return (
                              <Link key={i} href={'/intel/' + article.slug} className="e-article" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: DEEP_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + ed.color + (i === 0 ? 'ff' : '55'), borderRadius: '0 2px 2px 0' }}>
                                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: i === 0 ? ed.color : 'rgba(255,255,255,0.3)', width: 26, textAlign: 'center', flexShrink: 0 }}>
                                  {article.ce_score > 0 ? Math.round(article.ce_score) : '—'}
                                </div>
                                <div style={{ flex: 1, fontSize: 12, color: i === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.55)', lineHeight: 1.35, minWidth: 0 }}>
                                  {article.headline}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {stats.recentArticles.length > 0 && (
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 8, fontWeight: 700 }}>RECENT INTEL</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {stats.recentArticles.map(function(article, i) {
                            return (
                              <Link key={i} href={'/intel/' + article.slug} className="e-article" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2 }}>
                                <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.35 }}>
                                  {article.headline}
                                </div>
                                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', flexShrink: 0, fontWeight: 700 }}>
                                  {timeAgo(article.created_at)}
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <Link href={ed.lane} className="e-btn" style={{ display: 'inline-block', padding: '10px 18px', background: ed.color, color: '#000', fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 2, borderRadius: 2, textDecoration: 'none' }}>
                      READ ALL {ed.name} INTEL →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ SYSTEM CTA ═════════════════════════════════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid #00d4ff', borderRadius: '0 2px 2px 0', padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#00d4ff', letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>AUTONOMOUS INTELLIGENCE</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.1, marginBottom: 10 }}>
              5 EDITORS. 6 SOURCES.<br /><span style={{ color: '#00d4ff' }}>EVERY 6 HOURS.</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              No writers. No schedules. No bias. Each editor pulls from their assigned sources, writes, grades, and publishes autonomously every cycle.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Link href="/intel" className="e-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #00d4ff', borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#00d4ff', letterSpacing: 1, fontWeight: 700 }}>ALL INTEL</div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>Every article from every editor</div>
              </div>
              <span style={{ color: '#00d4ff', opacity: 0.5, fontSize: 13 }}>→</span>
            </Link>
            <Link href="/meta" className="e-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #00d4ff', borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#00d4ff', letterSpacing: 1, fontWeight: 700 }}>⬡ LIVE TIER LIST</div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>NEXUS updates every 6h</div>
              </div>
              <span style={{ color: '#00d4ff', opacity: 0.5, fontSize: 13 }}>→</span>
            </Link>
            <Link href="https://discord.gg/PnhbdRYh3w" target="_blank" rel="noopener noreferrer" className="e-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #5865f2', borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
              <div>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#7289da', letterSpacing: 1, fontWeight: 700 }}>DISCORD</div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>Live editor feeds in 5 channels</div>
              </div>
              <span style={{ color: '#7289da', opacity: 0.5, fontSize: 13 }}>→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}