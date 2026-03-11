import { createClient } from '@supabase/supabase-js';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const metadata = {
  title: "Top Build Today — DEXTER's #1 Marathon Loadout | CyberneticPunks",
  description: "DEXTER's highest-rated Marathon build with full weapon stats, mod recommendations, and ranked strategy. Updated daily.",
};

export const revalidate = 3600;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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

// Category → default weapon fallback when no exact name is found
const CATEGORY_FALLBACKS = [
  { keywords: ['shotgun'],             weapon: 'WSTR Combat Shotgun' },
  { keywords: ['smg','submachine'],    weapon: 'BRRT SMG' },
  { keywords: ['assault','ar','rifle'],weapon: 'M77 Assault Rifle' },
  { keywords: ['sniper','marksman'],   weapon: 'Hardline PR' },
  { keywords: ['lmg','machine gun'],   weapon: 'Retaliator LMG' },
  { keywords: ['rail','railgun'],      weapon: 'Ares RG' },
  { keywords: ['volt','electric'],     weapon: 'V22 Volt Thrower' },
  { keywords: ['pistol','sidearm'],    weapon: 'CE Tactical Sidearm' },
  { keywords: ['scout','longshot'],    weapon: 'Longshot' },
];

// Role/strategy → default shell fallback when no exact shell is named
const SHELL_FALLBACKS = [
  { keywords: ['aggressive','rush','push','combat','fragger'], shell: 'Destroyer' },
  { keywords: ['stealth','flank','assassin','silent'],         shell: 'Assassin' },
  { keywords: ['support','heal','triage','medic'],             shell: 'Triage' },
  { keywords: ['scout','recon','intel','vision'],              shell: 'Recon' },
  { keywords: ['loot','extract','thief','theft','resources'],  shell: 'Thief' },
  { keywords: ['tank','rook','anchor','hold'],                 shell: 'Rook' },
  { keywords: ['versati','flex','all-around','balanced'],      shell: 'Vandal' },
];

function extractWeaponNames(tags, body) {
  const text = ((tags || []).join(' ') + ' ' + (body || '')).toLowerCase();
  const exact = KNOWN_WEAPONS.filter(w => text.includes(w.toLowerCase()));
  if (exact.length > 0) return exact;
  // Category fallback
  for (const fb of CATEGORY_FALLBACKS) {
    if (fb.keywords.some(k => text.includes(k))) return [fb.weapon];
  }
  return [];
}

function extractShellName(tags, body) {
  const text = ((tags || []).join(' ') + ' ' + (body || '')).toLowerCase();
  const exact = KNOWN_SHELLS.find(s => text.includes(s.toLowerCase()));
  if (exact) return exact;
  // Category fallback
  for (const fb of SHELL_FALLBACKS) {
    if (fb.keywords.some(k => text.includes(k))) return fb.shell;
  }
  return null;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function tierColor(tier) {
  if (tier === 'S') return '#ff0000';
  if (tier === 'A') return '#ff8800';
  if (tier === 'B') return '#00f5ff';
  if (tier === 'C') return '#9b5de5';
  return 'rgba(255,255,255,0.3)';
}

function statBarPct(val, max) {
  if (!val || !max) return 0;
  return Math.min(100, Math.round((val / max) * 100));
}

// ─── DATA FETCHING ────────────────────────────────────────────────────────────

async function getData() {
  const [featuredRes, nexusRes, cipherRes, moreBuildsRes, allWeaponsRes, allShellsRes, allModsRes] = await Promise.all([
    supabase.from('feed_items').select('*').eq('editor', 'DEXTER').eq('is_published', true).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('feed_items').select('headline,body').eq('editor', 'NEXUS').eq('is_published', true).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('feed_items').select('headline,body').eq('editor', 'CIPHER').eq('is_published', true).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('feed_items').select('id,headline,slug,tags,ce_score,created_at').eq('editor', 'DEXTER').eq('is_published', true).order('created_at', { ascending: false }).limit(4),
    supabase.from('weapon_stats').select('*'),
    supabase.from('shell_stats').select('*'),
    supabase.from('mod_stats').select('*').order('rarity', { ascending: false }).limit(60),
  ]);

  const featured = featuredRes.data;
  const moreBuilds = (moreBuildsRes.data || []).filter(b => b.id !== featured?.id).slice(0, 3);

  let weapons = [];
  let shell = null;
  let mods = [];

  if (featured) {
    const weaponNames = extractWeaponNames(featured.tags, featured.body);
    const shellName = extractShellName(featured.tags, featured.body);
    weapons = (allWeaponsRes.data || []).filter(w => weaponNames.includes(w.name));
    shell = (allShellsRes.data || []).find(s => s.name === shellName) || null;

    // Get mods relevant to weapons found
    const modsData = allModsRes.data || [];
    const bodyLower = (featured.body || '').toLowerCase();
    mods = modsData.filter(m => m.name && bodyLower.includes(m.name.toLowerCase())).slice(0, 6);
    if (mods.length === 0) mods = modsData.slice(0, 4); // fallback: show top mods
  }

  return {
    featured,
    nexus: nexusRes.data,
    cipher: cipherRes.data,
    moreBuilds,
    weapons,
    shell,
    mods,
  };
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function TierBadge({ tier, label }) {
  if (!tier) return null;
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      border: `1px solid ${tierColor(tier)}`,
      borderRadius: 3,
      fontFamily: 'Share Tech Mono, monospace',
      fontSize: 10,
      color: tierColor(tier),
      letterSpacing: 2,
      marginRight: 6,
    }}>
      {label ? `${label}: ` : ''}{tier}
    </span>
  );
}

function StatBar({ label, value, max, color }) {
  const pct = statBarPct(value, max);
  const barColor = color || (pct > 66 ? '#ff0000' : pct > 33 ? '#ff8800' : '#00f5ff');
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>{label}</span>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>{value ?? '—'}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: pct + '%', background: `linear-gradient(90deg, ${barColor}, ${barColor}99)`, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function WeaponPanel({ weapon, label, mods }) {
  if (!weapon) return null;
  const weaponMods = mods.filter(m => !m.compatible_weapons?.length || m.compatible_weapons.includes(weapon.name));
  return (
    <div style={{
      background: 'rgba(255,136,0,0.03)',
      border: '1px solid rgba(255,136,0,0.12)',
      borderTop: '2px solid #ff8800',
      borderRadius: 6,
      padding: 20,
      marginBottom: 16,
    }}>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800', letterSpacing: 3, marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{weapon.name}</div>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginBottom: 16 }}>
        {weapon.weapon_type} · {weapon.ammo_type} · {weapon.firing_mode}
      </div>
      <StatBar label="DAMAGE" value={weapon.damage} max={200} />
      <StatBar label="FIRE RATE" value={weapon.fire_rate} max={1000} />
      <StatBar label="MAGAZINE" value={weapon.magazine_size} max={60} />
      <StatBar label="RANGE" value={weapon.range_meters} max={200} />
      {weapon.reload_speed && <StatBar label="RELOAD" value={weapon.reload_speed} max={5} color="#9b5de5" />}

      {/* Mod pills */}
      {weaponMods.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 8 }}>RECOMMENDED MODS</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {weaponMods.slice(0, 4).map(m => (
              <span key={m.id} style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 9,
                color: '#ff8800',
                background: 'rgba(255,136,0,0.08)',
                border: '1px solid rgba(255,136,0,0.2)',
                borderRadius: 3,
                padding: '3px 8px',
                letterSpacing: 1,
              }}>
                {m.slot_type}: {m.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ShellPanel({ shell }) {
  if (!shell) return (
    <div style={{ padding: 24, background: 'rgba(255,136,0,0.02)', border: '1px solid rgba(255,136,0,0.1)', borderRadius: 6, textAlign: 'center' }}>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>SHELL DATA PENDING</div>
    </div>
  );

  const abilities = [
    { label: 'PRIME', name: shell.prime_ability_name, desc: shell.prime_ability_description, color: '#ff8800' },
    { label: 'TACTICAL', name: shell.tactical_ability_name, desc: shell.tactical_ability_description, color: '#ff0000' },
    { label: 'TRAIT I', name: shell.trait_1_name, desc: shell.trait_1_description, color: '#00f5ff' },
    { label: 'TRAIT II', name: shell.trait_2_name, desc: shell.trait_2_description, color: '#9b5de5' },
  ].filter(a => a.name);

  return (
    <div style={{
      background: 'rgba(255,136,0,0.02)',
      border: '1px solid rgba(255,136,0,0.15)',
      borderRadius: 8,
      padding: 24,
      height: '100%',
    }}>
      {/* Shell identity */}
      <div style={{ textAlign: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid rgba(255,136,0,0.1)' }}>
        <div style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 48,
          fontWeight: 900,
          color: '#ff8800',
          opacity: 0.15,
          lineHeight: 1,
          marginBottom: -12,
        }}>◈</div>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: '#ff8800', letterSpacing: 2 }}>{shell.name}</div>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginTop: 6 }}>{shell.role || 'RUNNER'}</div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          {shell.ranked_tier_solo && <TierBadge tier={shell.ranked_tier_solo} label="SOLO" />}
          {shell.ranked_tier_squad && <TierBadge tier={shell.ranked_tier_squad} label="SQUAD" />}
        </div>
      </div>

      {/* Abilities */}
      {abilities.map(ability => (
        <div key={ability.label} style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: ability.color, letterSpacing: 3, marginBottom: 4 }}>{ability.label}</div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{ability.name}</div>
          {ability.desc && (
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{ability.desc}</div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default async function TopBuildPage() {
  const { featured, nexus, cipher, moreBuilds, weapons, shell, mods } = await getData();

  const grade = featured?.loadout_grade || featured?.ce_score >= 8 ? 'S' : featured?.ce_score >= 6 ? 'A' : featured?.ce_score >= 4 ? 'B' : 'C';
  const primaryWeapon = weapons[0] || null;
  const secondaryWeapon = weapons[1] || null;

  return (
    <>
      <Nav />
      <div style={{ minHeight: '100vh', background: '#030303', color: '#ffffff' }}>

        {/* ── HERO BANNER ── */}
        <div style={{
          borderBottom: '1px solid rgba(255,136,0,0.15)',
          padding: '48px 24px 40px',
          background: 'linear-gradient(180deg, rgba(255,136,0,0.04) 0%, transparent 100%)',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>

              {/* Left — Build info */}
              <div style={{ flex: 1, minWidth: 300 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff8800', boxShadow: '0 0 8px #ff8800' }} />
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 3 }}>⬢ DEXTER — TOP BUILD</span>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>
                    {featured ? timeAgo(featured.created_at) : ''}
                  </span>
                </div>

                <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 32, fontWeight: 900, color: '#ffffff', margin: '0 0 12px', lineHeight: 1.2 }}>
                  {featured?.headline || 'No Build Available'}
                </h1>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  {shell && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 2 }}>{shell.name.toUpperCase()}</span>}
                  {featured?.ranked_viable && (
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00ff88', letterSpacing: 2 }}>● RANKED VIABLE</span>
                  )}
                  {featured?.holotag_tier && (
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ffd700', letterSpacing: 2 }}>◈ {featured.holotag_tier} HOLOTAG</span>
                  )}
                </div>

                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 560 }}>
                  {featured?.body || 'DEXTER is analyzing the latest Marathon builds. Check back after the next cron run.'}
                </div>
              </div>

              {/* Right — Grade */}
              <div style={{
                background: 'rgba(255,136,0,0.06)',
                border: '1px solid rgba(255,136,0,0.2)',
                borderRadius: 8,
                padding: '24px 36px',
                textAlign: 'center',
                minWidth: 160,
              }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 8 }}>LOADOUT GRADE</div>
                <div style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 72,
                  fontWeight: 900,
                  color: '#ff8800',
                  textShadow: '0 0 30px rgba(255,136,0,0.6), 0 0 60px rgba(255,136,0,0.3)',
                  lineHeight: 1,
                }}>
                  {grade}
                </div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 8 }}>
                  CE: {featured?.ce_score?.toFixed(1) || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Orange divider */}
        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #ff8800, transparent)' }} />

        {/* ── LOADOUT SCREEN — 3 columns ── */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '280px 1fr 280px', gap: 28 }}>

          {/* Left — Shell Panel */}
          <ShellPanel shell={shell} />

          {/* Center — Weapons */}
          <div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#ffffff', letterSpacing: 2, marginBottom: 20 }}>WEAPONS</div>

            {primaryWeapon ? (
              <WeaponPanel weapon={primaryWeapon} label="PRIMARY WEAPON" mods={mods} />
            ) : (
              <div style={{ padding: 32, background: 'rgba(255,136,0,0.02)', border: '1px solid rgba(255,136,0,0.08)', borderRadius: 6, textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>PRIMARY WEAPON NOT IDENTIFIED</div>
              </div>
            )}

            {secondaryWeapon ? (
              <WeaponPanel weapon={secondaryWeapon} label="SECONDARY WEAPON" mods={mods} />
            ) : primaryWeapon ? null : (
              <div style={{ padding: 32, background: 'rgba(255,136,0,0.02)', border: '1px solid rgba(255,136,0,0.08)', borderRadius: 6, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>SECONDARY WEAPON NOT IDENTIFIED</div>
              </div>
            )}

            {/* Ranked note */}
            {featured?.ranked_note && (
              <div style={{ padding: '14px 18px', background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.12)', borderRadius: 6, marginTop: 8 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00f5ff', letterSpacing: 2, marginBottom: 6 }}>RANKED NOTE</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{featured.ranked_note}</div>
              </div>
            )}
          </div>

          {/* Right — Strategy */}
          <div>
            {/* NEXUS Meta Context */}
            {nexus && (
              <div style={{
                background: 'rgba(0,245,255,0.03)',
                border: '1px solid rgba(0,245,255,0.15)',
                borderRadius: 8,
                padding: 18,
                marginBottom: 16,
              }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00f5ff', letterSpacing: 3, marginBottom: 10 }}>⬡ NEXUS META CONTEXT</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                  {nexus.body?.slice(0, 280)}...
                </div>
              </div>
            )}

            {/* CIPHER Tips */}
            {cipher && (
              <div style={{
                background: 'rgba(255,0,0,0.03)',
                border: '1px solid rgba(255,0,0,0.12)',
                borderRadius: 8,
                padding: 18,
                marginBottom: 16,
              }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff0000', letterSpacing: 3, marginBottom: 10 }}>◈ CIPHER PLAY INTEL</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                  {cipher.body?.slice(0, 240)}...
                </div>
              </div>
            )}

            {/* Tags */}
            {featured?.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {featured.tags.map(tag => (
                  <span key={tag} style={{
                    fontFamily: 'Share Tech Mono, monospace',
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.25)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 3,
                    padding: '3px 8px',
                    letterSpacing: 2,
                  }}>
                    {tag.toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── MORE BUILDS ── */}
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#ffffff', letterSpacing: 2 }}>MORE FROM DEXTER</div>
            <a href="/builds" style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', textDecoration: 'none', letterSpacing: 2 }}>FULL BUILD LAB →</a>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {moreBuilds.map(build => {
              const g = build.ce_score >= 8 ? 'S' : build.ce_score >= 6 ? 'A' : build.ce_score >= 4 ? 'B' : 'C';
              const shellTag = (build.tags || []).find(t => KNOWN_SHELLS.map(s => s.toLowerCase()).includes(t.toLowerCase()));
              return (
                <a key={build.id} href={`/intel/${build.slug}`} style={{ textDecoration: 'none' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,136,0,0.1)',
                    borderTop: '2px solid rgba(255,136,0,0.3)',
                    borderRadius: 8,
                    padding: 20,
                    transition: 'border-color 0.2s',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      {shellTag && (
                        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800', letterSpacing: 2 }}>
                          {shellTag.toUpperCase()}
                        </span>
                      )}
                      <span style={{
                        fontFamily: 'Orbitron, monospace',
                        fontSize: 20,
                        fontWeight: 900,
                        color: tierColor(g),
                        textShadow: `0 0 12px ${tierColor(g)}66`,
                      }}>{g}</span>
                    </div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.3, marginBottom: 10 }}>
                      {build.headline}
                    </div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2 }}>
                      {timeAgo(build.created_at)}
                    </div>
                  </div>
                </a>
              );
            })}

            {moreBuilds.length === 0 && (
              <div style={{ gridColumn: '1/-1', padding: 32, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>MORE BUILDS GENERATING — CHECK BACK SOON</div>
              </div>
            )}
          </div>
        </div>

      </div>
      <Footer />
      <style>{`
        @media (max-width: 900px) {
          .loadout-grid { grid-template-columns: 1fr !important; }
          .more-builds-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
