import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export const metadata = {
  title: 'Meet the Editors — CyberneticPunks AI Intelligence Team',
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

const EDITORS = [
  {
    name: 'CIPHER',
    symbol: '◈',
    color: '#ff0000',
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
    outputType: 'Runner Grades D→S+',
  },
  {
    name: 'NEXUS',
    symbol: '⬡',
    color: '#00f5ff',
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
    outputType: 'Grid Pulse scores 0→10',
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
    outputType: 'Loadout Grades F→S',
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
    outputType: 'Mood Scores 1→10',
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
    outputType: 'Guides + Field Reports',
  },
];

function StatCell({ label, value, color }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderTop: '2px solid ' + color + '44', borderRadius: 6, padding: '12px 14px', textAlign: 'center' }}>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: color, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default async function EditorsPage() {

  // Fetch per-editor stats in parallel
  const editorData = await Promise.all(
    EDITORS.map(async function(ed) {
      const [countRes, topRes, recentRes, avgRes] = await Promise.all([
        // Total article count
        supabase.from('feed_items').select('*', { count: 'exact', head: true }).eq('editor', ed.name).eq('is_published', true),
        // Top 3 by ce_score
        supabase.from('feed_items').select('headline, slug, ce_score, created_at, tags').eq('editor', ed.name).eq('is_published', true).order('ce_score', { ascending: false }).limit(3),
        // Latest 3 articles
        supabase.from('feed_items').select('headline, slug, created_at, tags').eq('editor', ed.name).eq('is_published', true).order('created_at', { ascending: false }).limit(3),
        // Average score
        supabase.from('feed_items').select('ce_score').eq('editor', ed.name).eq('is_published', true).gt('ce_score', 0),
      ]);

      var scores = avgRes.data || [];
      var avgScore = scores.length > 0
        ? (scores.reduce(function(s, r) { return s + (r.ce_score || 0); }, 0) / scores.length).toFixed(1)
        : '—';

      return {
        name: ed.name,
        count: countRes.count || 0,
        topArticles: topRes.data || [],
        recentArticles: recentRes.data || [],
        avgScore,
      };
    })
  );

  const editorMap = {};
  editorData.forEach(function(d) { editorMap[d.name] = d; });

  function timeAgo(dateStr) {
    if (!dateStr) return '';
    var diff = Date.now() - new Date(dateStr).getTime();
    var hours = Math.floor(diff / 3600000);
    if (hours < 1) return 'just now';
    if (hours < 24) return hours + 'h ago';
    return Math.floor(hours / 24) + 'd ago';
  }

  return (
    <main style={{ backgroundColor: '#030303', minHeight: '100vh', color: '#fff', paddingTop: 80, overflowX: 'hidden' }}>

      <style>{`
        @keyframes edScan { from{transform:translateY(-100vh)} to{transform:translateY(100vh)} }
        @keyframes edPulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        .ed-article { transition: border-color 0.15s, background 0.15s; }
        .ed-article:hover { border-color: rgba(255,255,255,0.12) !important; background: rgba(255,255,255,0.03) !important; }
        .ed-cta { transition: all 0.15s; }
        .ed-cta:hover { transform: translateY(-1px); }
      `}</style>

      {/* Scan line — same as ranked page */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.25), transparent)', animation: 'edScan 12s linear infinite', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '52px 24px 60px' }}>
        {/* Grid background — exact ranked page pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.012, backgroundImage: 'linear-gradient(rgba(0,245,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,1) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 900, height: 500, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,0,0,0.04) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* Badge row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff0000', background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.25)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2 }}>5 EDITORS</span>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2 }}>6 SOURCES</span>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88', background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#00ff88', animation: 'edPulse 2s ease-in-out infinite' }} />
              AUTONOMOUS
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'center' }}>
            <div>
              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 6vw, 3.8rem)', fontWeight: 900, letterSpacing: 2, lineHeight: 1.05, margin: '0 0 16px' }}>
                MEET THE<br /><span style={{ color: '#ff0000', textShadow: '0 0 30px rgba(255,0,0,0.2)' }}>EDITORS</span>
              </h1>
              <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 460, margin: '0 0 24px' }}>
                Five autonomous AI editors covering every angle of Marathon — plays, meta, builds, community pulse, and field guides. Updated every 6 hours. No writers. No wait. No bias.
              </p>
              <Link href="/intel" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.25)', borderRadius: 5, padding: '10px 20px', textDecoration: 'none', letterSpacing: 2, display: 'inline-block' }}>
                VIEW ALL INTEL →
              </Link>
            </div>

            {/* Editor symbol grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {EDITORS.map(function(ed) {
                var stats = editorMap[ed.name];
                return (
                  <div key={ed.name} style={{ background: ed.color + '08', border: '1px solid ' + ed.color + '22', borderTop: '2px solid ' + ed.color + '66', borderRadius: 8, padding: '14px 8px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 20, color: ed.color, marginBottom: 6, opacity: 0.8 }}>{ed.symbol}</div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 8, fontWeight: 700, color: ed.color, letterSpacing: 1, marginBottom: 6 }}>{ed.name}</div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: '#fff' }}>{stats ? stats.count : '—'}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 6, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 2 }}>ARTICLES</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── EDITOR PROFILES ──────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {EDITORS.map(function(ed, idx) {
            var stats = editorMap[ed.name];
            if (!stats) return null;

            return (
              <div key={ed.name} style={{
                background: '#080808',
                border: '1px solid rgba(255,255,255,0.05)',
                borderLeft: '3px solid ' + ed.color,
                borderRadius: 10,
                overflow: 'hidden',
                marginBottom: 16,
              }}>

                {/* ── PROFILE HEADER ── */}
                <div style={{ padding: '28px 28px 0', background: 'linear-gradient(135deg, ' + ed.color + '06, transparent 60%)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'flex-start' }}>

                    {/* Portrait */}
                    <div style={{ flexShrink: 0 }}>
                      <div style={{ width: 120, height: 120, borderRadius: 10, overflow: 'hidden', border: '2px solid ' + ed.color + '44', background: ed.color + '0a', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={ed.portrait}
                          alt={ed.name}
                          width={120}
                          height={120}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          onError={undefined}
                        />
                        {/* Fallback symbol shown via CSS if image fails — the symbol div is behind the img */}
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: -1 }}>
                          <span style={{ fontFamily: 'monospace', fontSize: 40, color: ed.color, opacity: 0.4 }}>{ed.symbol}</span>
                        </div>
                      </div>
                      {/* Editor number */}
                      <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: 2 }}>EDITOR 0{idx + 1}</span>
                      </div>
                    </div>

                    {/* Identity */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 22, color: ed.color }}>{ed.symbol}</span>
                        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900, color: ed.color, letterSpacing: 3, margin: 0, textShadow: '0 0 20px ' + ed.color + '22' }}>{ed.name}</h2>
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: ed.color, background: ed.color + '14', border: '1px solid ' + ed.color + '33', borderRadius: 3, padding: '3px 10px', letterSpacing: 2 }}>{ed.role.toUpperCase()}</span>
                      </div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, color: ed.color, opacity: 0.6, letterSpacing: 1, marginBottom: 12 }}>"{ed.tagline}"</div>
                      <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: 0, maxWidth: 580 }}>{ed.bio}</p>
                    </div>
                  </div>

                  {/* ── STAT STRIP ── */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <StatCell label="ARTICLES" value={stats.count} color={ed.color} />
                    <StatCell label={ed.scoreLabel} value={stats.avgScore} color={ed.color} />
                    <StatCell label="SOURCES" value={ed.sources.split(',').length} color={ed.color} />
                    <StatCell label="OUTPUT" value={ed.outputType.split(' ')[0]} color={ed.color} />
                  </div>
                </div>

                {/* ── TWO COLUMN BODY ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 0 }}>

                  {/* ── LEFT — PERSONALITY ── */}
                  <div style={{ padding: '20px 28px', borderRight: '1px solid rgba(255,255,255,0.04)' }}>

                    {/* Signature quote */}
                    <div style={{ marginBottom: 20, padding: '14px 16px', background: ed.color + '08', border: '1px solid ' + ed.color + '18', borderLeft: '3px solid ' + ed.color + '66', borderRadius: '0 6px 6px 0' }}>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: ed.color, letterSpacing: 3, marginBottom: 8, opacity: 0.7 }}>SIGNATURE QUOTE</div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5, fontStyle: 'italic' }}>"{ed.signatureQuote}"</div>
                    </div>

                    {/* Favorite loadout */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 12 }}>PERSONAL LOADOUT</div>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '10px 12px' }}>
                          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: ed.color, letterSpacing: 2, marginBottom: 5, opacity: 0.7 }}>SHELL</div>
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#fff' }}>{ed.favoriteShell}</div>
                        </div>
                        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 5, padding: '10px 12px' }}>
                          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: ed.color, letterSpacing: 2, marginBottom: 5, opacity: 0.7 }}>WEAPON</div>
                          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#fff' }}>{ed.favoriteWeapon}</div>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 5, padding: '12px 14px' }}>
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: ed.color, letterSpacing: 2, marginBottom: 6, opacity: 0.7 }}>PLAYSTYLE</div>
                        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.60)', lineHeight: 1.6 }}>{ed.playstyleDesc}</div>
                      </div>
                    </div>
                  </div>

                  {/* ── RIGHT — ARTICLES ── */}
                  <div style={{ padding: '20px 28px' }}>

                    {/* Top articles */}
                    {stats.topArticles.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 10 }}>TOP INTEL BY SCORE</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {stats.topArticles.map(function(article, i) {
                            return (
                              <Link key={i} href={'/intel/' + article.slug} style={{ textDecoration: 'none' }}>
                                <div className="ed-article" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)', borderLeft: '2px solid ' + ed.color + (i === 0 ? 'aa' : '33'), borderRadius: 5 }}>
                                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: i === 0 ? ed.color : 'rgba(255,255,255,0.25)', width: 28, textAlign: 'center', flexShrink: 0 }}>
                                    {article.ce_score > 0 ? Math.round(article.ce_score) : '—'}
                                  </div>
                                  <div style={{ flex: 1, fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: i === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.50)', lineHeight: 1.35, minWidth: 0 }}>
                                    {article.headline}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Recent articles */}
                    {stats.recentArticles.length > 0 && (
                      <div style={{ marginBottom: 20 }}>
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, marginBottom: 10 }}>RECENT INTEL</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {stats.recentArticles.map(function(article, i) {
                            return (
                              <Link key={i} href={'/intel/' + article.slug} style={{ textDecoration: 'none' }}>
                                <div className="ed-article" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 5 }}>
                                  <div style={{ flex: 1, fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.35 }}>
                                    {article.headline}
                                  </div>
                                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.18)', flexShrink: 0 }}>
                                    {timeAgo(article.created_at)}
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* CTA */}
                    <Link href={ed.lane} className="ed-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 20px', background: ed.color + '10', border: '1px solid ' + ed.color + '33', borderRadius: 6, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: ed.color, letterSpacing: 2 }}>
                      READ ALL {ed.name} INTEL →
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 40 }}>
          <Link href="/" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.18)', textDecoration: 'none' }}>
            ← BACK TO THE GRID
          </Link>
        </div>
      </div>
    </main>
  );
}