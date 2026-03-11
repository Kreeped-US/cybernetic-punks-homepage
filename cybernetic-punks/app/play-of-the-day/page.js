import { createClient } from '@supabase/supabase-js';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const metadata = {
  title: 'Play of the Day — CIPHER Graded Marathon Plays | CyberneticPunks',
  description: "Today's highest-rated Marathon play, analyzed by CIPHER. Watch the clip, read the breakdown, see the grade.",
};

export const revalidate = 3600;

// ─── HELPERS ────────────────────────────────────────────────────────────────

const KNOWN_WEAPONS = [
  'V75 Scar','M77 Assault Rifle','Overrun AR','Impact HAR',
  'Retaliator LMG','Conquest LMG','Demolition HMG',
  'Knife','V11 Punch','Magnum MC','CE Tactical Sidearm','Rook Pistol',
  'Repeater HPR','Hardline PR','BR33 Volley Rifle','Twin Tap HBR','V66 Lookout','Stryder M1T',
  'V00 Zeus RG','Ares RG',
  'WSTR Combat Shotgun','V85 Circuit Breaker','Misriah 2442',
  'Longshot','Outland','V99 Channel Rifle',
  'Copperhead RF','V22 Volt Thrower','Bully SMG','BRRT SMG',
];

const KNOWN_SHELLS = ['Assassin','Destroyer','Recon','Rook','Thief','Triage','Vandal'];

function extractWeaponNames(tags, body) {
  const text = ((tags || []).join(' ') + ' ' + (body || '')).toLowerCase();
  return KNOWN_WEAPONS.filter(w => text.includes(w.toLowerCase()));
}

function extractShellName(tags, body) {
  const text = ((tags || []).join(' ') + ' ' + (body || '')).toLowerCase();
  return KNOWN_SHELLS.find(s => text.includes(s.toLowerCase())) || null;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function gradeColor(grade) {
  if (!grade) return '#ffffff';
  if (grade.startsWith('S')) return '#ff0000';
  if (grade === 'A') return '#ff8800';
  if (grade === 'B') return '#00f5ff';
  if (grade === 'C') return '#9b5de5';
  return 'rgba(255,255,255,0.4)';
}

function statBarPct(val, max) {
  if (!val || !max) return 0;
  return Math.min(100, Math.round((val / max) * 100));
}

// ─── DATA FETCHING ───────────────────────────────────────────────────────────

async function getData() {
  const [featuredRes, previousRes, allWeaponsRes, allShellsRes] = await Promise.all([
    supabase.from('feed_items').select('*').eq('editor', 'CIPHER').eq('is_published', true).order('ce_score', { ascending: false }).limit(1).single(),
    supabase.from('feed_items').select('id,headline,slug,thumbnail,ce_score,tags,created_at').eq('editor', 'CIPHER').eq('is_published', true).order('created_at', { ascending: false }).limit(5),
    supabase.from('weapon_stats').select('*'),
    supabase.from('shell_stats').select('*'),
  ]);

  const featured = featuredRes.data;
  const previous = (previousRes.data || []).filter(p => p.id !== featured?.id).slice(0, 4);

  let weapons = [];
  let shell = null;

  if (featured) {
    const weaponNames = extractWeaponNames(featured.tags, featured.body);
    const shellName = extractShellName(featured.tags, featured.body);
    weapons = (allWeaponsRes.data || []).filter(w => weaponNames.includes(w.name));
    shell = (allShellsRes.data || []).find(s => s.name === shellName) || null;
  }

  return { featured, previous, weapons, shell };
}

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function GradeBadge({ grade, size = 64 }) {
  if (!grade) return null;
  return (
    <div style={{
      fontFamily: 'Orbitron, monospace',
      fontSize: size,
      fontWeight: 900,
      color: gradeColor(grade),
      textShadow: `0 0 30px ${gradeColor(grade)}88, 0 0 60px ${gradeColor(grade)}44`,
      lineHeight: 1,
    }}>
      {grade}
    </div>
  );
}

function StatBar({ label, value, max, color = '#ff0000' }) {
  const pct = statBarPct(value, max);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>{label}</span>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>{value ?? '—'}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: pct + '%', background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 2, transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function WeaponCard({ weapon }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,0,0,0.15)',
      borderTop: '2px solid #ff0000',
      borderRadius: 6,
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{weapon.name}</div>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff0000', letterSpacing: 2, marginBottom: 12 }}>
        {weapon.weapon_type || 'WEAPON'} · {weapon.ammo_type || ''}
      </div>
      <StatBar label="DAMAGE" value={weapon.damage} max={200} color="#ff0000" />
      <StatBar label="FIRE RATE" value={weapon.fire_rate} max={1000} color="#ff8800" />
      <StatBar label="MAGAZINE" value={weapon.magazine_size} max={60} color="#00f5ff" />
    </div>
  );
}

function ShellCard({ shell }) {
  if (!shell) return null;
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,0,0,0.15)',
      borderRadius: 6,
      padding: 16,
      marginBottom: 12,
    }}>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 6 }}>RUNNER SHELL</div>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 700, color: '#ff0000', marginBottom: 4 }}>{shell.name}</div>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 12 }}>{shell.role || ''}</div>
      {shell.prime_ability_name && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff0000', letterSpacing: 2 }}>PRIME</div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{shell.prime_ability_name}</div>
        </div>
      )}
      {shell.tactical_ability_name && (
        <div>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800', letterSpacing: 2 }}>TACTICAL</div>
          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>{shell.tactical_ability_name}</div>
        </div>
      )}
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default async function PlayOfTheDayPage() {
  const { featured, previous, weapons, shell } = await getData();

  const grade = featured?.runner_grade || featured?.ce_score >= 8 ? 'S' : featured?.ce_score >= 6 ? 'A' : featured?.ce_score >= 4 ? 'B' : 'C';
  const videoId = featured?.source_url?.includes('youtube') ? featured.source_url.split('v=')[1]?.split('&')[0] : featured?.source_video_id || null;
  const gradeConf = featured?.grade_confidence || 'low';

  return (
    <>
      <Nav />
      <div style={{ minHeight: '100vh', background: '#030303', color: '#ffffff' }}>

        {/* ── CINEMATIC VIDEO HERO ── */}
        <div style={{ position: 'relative', width: '100%', height: 620, overflow: 'hidden', background: '#000' }}>

          {/* Video embed or placeholder */}
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0&modestbranding=1`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, #0a0000 0%, #1a0000 50%, #0a0000 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.2 }}>▶</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 3 }}>NO VIDEO SOURCE</div>
              </div>
            </div>
          )}

          {/* Top gradient bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to bottom, #030303, transparent)', pointerEvents: 'none', zIndex: 2 }} />

          {/* Bottom gradient bar */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200, background: 'linear-gradient(to top, #030303, transparent)', pointerEvents: 'none', zIndex: 2 }} />

          {/* CIPHER badge — top left */}
          <div style={{ position: 'absolute', top: 24, left: 28, zIndex: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff0000', boxShadow: '0 0 8px #ff0000', animation: 'pulse 2s infinite' }} />
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff0000', letterSpacing: 3 }}>◈ CIPHER — PLAY OF THE DAY</span>
          </div>

          {/* Grade overlay — top right */}
          <div style={{ position: 'absolute', top: 16, right: 28, zIndex: 10, textAlign: 'right' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 3, marginBottom: 4 }}>RUNNER GRADE</div>
            <GradeBadge grade={grade} size={72} />
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 4 }}>
              {gradeConf === 'high' ? '● HIGH CONFIDENCE' : gradeConf === 'medium' ? '◐ MEDIUM CONFIDENCE' : '○ METADATA GRADE'}
            </div>
          </div>

          {/* Bottom info overlay */}
          {featured && (
            <div style={{ position: 'absolute', bottom: 28, left: 28, zIndex: 10, maxWidth: '60%' }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 8 }}>
                {timeAgo(featured.created_at)}
              </div>
              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 26, fontWeight: 900, color: '#ffffff', margin: '0 0 8px', lineHeight: 1.2, textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
                {featured.headline}
              </h1>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff0000', letterSpacing: 2 }}>
                {(featured.tags || []).slice(0, 4).map(t => t.toUpperCase()).join(' · ')}
              </div>
            </div>
          )}
        </div>

        {/* ── ANALYSIS + SIDEBAR ── */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: '1fr 360px', gap: 40 }}>

          {/* Left — Analysis */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#ff0000', letterSpacing: 2 }}>◈</span>
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 3 }}>CIPHER ANALYSIS</span>
            </div>

            <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 24, lineHeight: 1.3 }}>
              WHY THIS PLAY EARNED {grade}-TIER
            </h2>

            <div style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: 17,
              lineHeight: 1.75,
              color: 'rgba(255,255,255,0.7)',
              borderLeft: '3px solid rgba(255,0,0,0.3)',
              paddingLeft: 20,
            }}>
              {featured?.body || 'No analysis available yet. Check back after the next CIPHER run.'}
            </div>

            {/* Grade Confidence Banner */}
            {gradeConf === 'low' && (
              <div style={{
                marginTop: 24,
                padding: '12px 16px',
                background: 'rgba(255,136,0,0.06)',
                border: '1px solid rgba(255,136,0,0.2)',
                borderRadius: 6,
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 10,
                color: '#ff8800',
                letterSpacing: 2,
              }}>
                ⚠ METADATA GRADE — No transcript available. Grade based on title, description, and view data only.
              </div>
            )}

            {/* Tags */}
            {featured?.tags?.length > 0 && (
              <div style={{ marginTop: 28, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {featured.tags.map(tag => (
                  <span key={tag} style={{
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.3)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 3,
                    padding: '4px 8px',
                    letterSpacing: 2,
                  }}>
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right — Sidebar */}
          <div>
            {/* Grade Card */}
            <div style={{
              background: 'rgba(255,0,0,0.04)',
              border: '1px solid rgba(255,0,0,0.2)',
              borderRadius: 8,
              padding: 24,
              marginBottom: 20,
              textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 12 }}>RUNNER GRADE</div>
              <GradeBadge grade={grade} size={80} />
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 12 }}>
                CE SCORE: {featured?.ce_score?.toFixed(1) || '—'} / 10.0
              </div>
            </div>

            {/* Shell Card */}
            <ShellCard shell={shell} />

            {/* Weapon Cards */}
            {weapons.length > 0 && (
              <div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 12 }}>LOADOUT DETECTED</div>
                {weapons.slice(0, 2).map(w => <WeaponCard key={w.id} weapon={w} />)}
              </div>
            )}

            {/* Source link */}
            {featured?.source_url && (
              <a href={featured.source_url} target="_blank" rel="noopener noreferrer" style={{
                display: 'block',
                textAlign: 'center',
                padding: '12px',
                border: '1px solid rgba(255,0,0,0.2)',
                borderRadius: 6,
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 10,
                color: '#ff0000',
                textDecoration: 'none',
                letterSpacing: 2,
                marginTop: 12,
              }}>
                WATCH SOURCE ↗
              </a>
            )}
          </div>
        </div>

        {/* ── PREVIOUS PLAYS ── */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: 2 }}>PREVIOUS PLAYS</div>
            <a href="/intel/cipher" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff0000', textDecoration: 'none', letterSpacing: 2 }}>ALL CIPHER GRADES →</a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {previous.map(play => {
              const g = play.ce_score >= 8 ? 'S' : play.ce_score >= 6 ? 'A' : play.ce_score >= 4 ? 'B' : 'C';
              return (
                <a key={play.id} href={`/intel/${play.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 8,
                    overflow: 'hidden',
                    transition: 'border-color 0.2s',
                  }}>
                    <div style={{ position: 'relative', height: 120, background: '#0a0000' }}>
                      {play.thumbnail && (
                        <img src={play.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
                      )}
                      <div style={{
                        position: 'absolute', top: 8, right: 8,
                        fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900,
                        color: gradeColor(g), textShadow: `0 0 12px ${gradeColor(g)}88`,
                      }}>{g}</div>
                    </div>
                    <div style={{ padding: 12 }}>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.3, marginBottom: 8 }}>
                        {play.headline}
                      </div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>
                        {timeAgo(play.created_at)}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </div>

      </div>
      <Footer />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @media (max-width: 768px) {
          .analysis-grid { grid-template-columns: 1fr !important; }
          .previous-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </>
  );
}
