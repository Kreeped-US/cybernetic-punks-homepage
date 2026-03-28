import { createClient } from '@supabase/supabase-js';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export const metadata = {
  title: "Top Build Today — DEXTER's #1 Marathon Loadout",
  description: "DEXTER's highest-rated Marathon build with full weapon stats, mod recommendations, and ranked strategy. Updated every 6 hours.",
  alternates: {
    canonical: 'https://cyberneticpunks.com/top-build',
  },
};

export const revalidate = 3600;

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const KNOWN_WEAPONS = [
  'V75 Scar','M77 Assault Rifle','Overrun AR','Impact HAR',
  'Retaliator LMG','Conquest LMG','Demolition HMG',
  'Knife','V11 Punch','Magnum MC','CE Tactical Sidearm','Rook Pistol',
  'Repeater HPR','Hardline PR','BR33 Volley Rifle','Twin Tap HBR','V66 Lookout','Stryder M1T',
  'V00 Zeus RG','Ares RG','WSTR Combat Shotgun','V85 Circuit Breaker','Misriah 2442',
  'Longshot','Outland','V99 Channel Rifle','Copperhead RF','V22 Volt Thrower','Bully SMG','BRRT SMG',
];

const KNOWN_SHELLS = ['Assassin','Destroyer','Recon','Rook','Thief','Triage','Vandal'];

const SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00f5ff',
  Rook: '#aaaaaa', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

const SHELL_SYMBOLS = {
  Assassin: '◈', Destroyer: '⬢', Recon: '◇',
  Rook: '▣', Thief: '⬠', Triage: '◎', Vandal: '⬡',
};

const CATEGORY_FALLBACKS = [
  { keywords: ['shotgun'],              weapon: 'WSTR Combat Shotgun' },
  { keywords: ['smg','submachine'],     weapon: 'BRRT SMG' },
  { keywords: ['assault','ar','rifle'], weapon: 'M77 Assault Rifle' },
  { keywords: ['sniper','marksman'],    weapon: 'Hardline PR' },
  { keywords: ['lmg','machine gun'],    weapon: 'Retaliator LMG' },
  { keywords: ['rail','railgun'],       weapon: 'Ares RG' },
  { keywords: ['volt','electric'],      weapon: 'V22 Volt Thrower' },
  { keywords: ['pistol','sidearm'],     weapon: 'CE Tactical Sidearm' },
];

const SHELL_FALLBACKS = [
  { keywords: ['aggressive','rush','push','combat'], shell: 'Destroyer' },
  { keywords: ['stealth','flank','assassin'],        shell: 'Assassin' },
  { keywords: ['support','heal','triage','medic'],   shell: 'Triage' },
  { keywords: ['scout','recon','intel','vision'],    shell: 'Recon' },
  { keywords: ['loot','extract','thief'],            shell: 'Thief' },
  { keywords: ['tank','rook','anchor','hold'],       shell: 'Rook' },
  { keywords: ['versati','flex','balanced'],         shell: 'Vandal' },
];

const TIER_COLORS = { S: '#ff0000', A: '#ff8800', B: '#00f5ff', C: '#aaaaaa', D: '#555' };
const RARITY_COLORS = {
  Standard: { color: '#888', border: '#88888830' },
  Enhanced: { color: '#00ff88', border: '#00ff8828' },
  Deluxe:   { color: '#00f5ff', border: '#00f5ff28' },
  Superior: { color: '#9b5de5', border: '#9b5de528' },
  Prestige: { color: '#ffd700', border: '#ffd70028' },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function extractWeaponNames(tags, body, allWeaponNames) {
  var text = ((tags || []).join(' ') + ' ' + (body || '')).toLowerCase();
  var fromDB = (allWeaponNames || []).filter(function(w) { return text.includes(w.toLowerCase()); });
  if (fromDB.length > 0) return fromDB;
  var exact = KNOWN_WEAPONS.filter(function(w) { return text.includes(w.toLowerCase()); });
  if (exact.length > 0) return exact;
  for (var fb of CATEGORY_FALLBACKS) {
    if (fb.keywords.some(function(k) { return text.includes(k); })) return [fb.weapon];
  }
  return [];
}

function extractShellName(tags, body, allShellNames) {
  var text = ((tags || []).join(' ') + ' ' + (body || '')).toLowerCase();
  var fromDB = (allShellNames || KNOWN_SHELLS).find(function(s) { return text.includes(s.toLowerCase()); });
  if (fromDB) return fromDB;
  for (var fb of SHELL_FALLBACKS) {
    if (fb.keywords.some(function(k) { return text.includes(k); })) return fb.shell;
  }
  return null;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

function statBarPct(val, max) {
  if (!val || !max) return 0;
  return Math.min(100, Math.round((val / max) * 100));
}

function computeGrade(item) {
  if (!item) return 'C';
  if (item.loadout_grade) return item.loadout_grade;
  var s = item.ce_score || 0;
  if (s >= 9) return 'S';
  if (s >= 7) return 'A+';
  if (s >= 6) return 'A';
  if (s >= 4) return 'B';
  return 'C';
}

function parseBody(body) {
  if (!body) return [];
  var elements = [];
  var parts = body.split(/\*\*([^*]{1,120})\*\*/);
  parts.forEach(function(part, i) {
    if (i % 2 === 0) {
      part.split(/\n{2,}/).forEach(function(block, j) {
        var t = block.trim();
        if (!t) return;
        var lines = t.split(/\n/).map(function(l) { return l.trim(); }).filter(Boolean);
        if (lines.length > 0) {
          elements.push({ type: 'para', content: lines.join(' '), key: 'p-' + i + '-' + j });
        }
      });
    } else {
      var h = part.trim();
      if (h) elements.push({ type: 'header', content: h, key: 'h-' + i });
    }
  });
  return elements;
}

// ─── DATA ────────────────────────────────────────────────────────────────────

async function getData() {
  var [featuredRes, nexusRes, moreBuildsRes, allWeaponsRes, allShellsRes, allModsRes] = await Promise.all([
    supabase.from('feed_items').select('*').eq('editor', 'DEXTER').eq('is_published', true).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('feed_items').select('headline,body,created_at').eq('editor', 'NEXUS').eq('is_published', true).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('feed_items').select('id,headline,slug,tags,ce_score,created_at').eq('editor', 'DEXTER').eq('is_published', true).order('created_at', { ascending: false }).limit(5),
    supabase.from('weapon_stats').select('*'),
    supabase.from('shell_stats').select('*'),
    supabase.from('mod_stats').select('*').order('rarity', { ascending: false }).limit(60),
  ]);

  var featured = featuredRes.data;
  var moreBuilds = (moreBuildsRes.data || []).filter(function(b) { return b.id !== featured?.id; }).slice(0, 3);
  var weapons = [], shell = null, mods = [];

  if (featured) {
    var allWeaponNames = (allWeaponsRes.data || []).map(function(w) { return w.name; });
    var weaponNames = extractWeaponNames(featured.tags, featured.body, allWeaponNames);
    var allShellNames = (allShellsRes.data || []).map(function(s) { return s.name; });
    var shellName = extractShellName(featured.tags, featured.body, allShellNames);
    weapons = (allWeaponsRes.data || []).filter(function(w) { return weaponNames.includes(w.name); });
    shell = (allShellsRes.data || []).find(function(s) { return s.name === shellName; }) || null;
    var modsData = allModsRes.data || [];
    var bodyLower = (featured.body || '').toLowerCase();
    mods = modsData.filter(function(m) { return m.name && bodyLower.includes(m.name.toLowerCase()); }).slice(0, 8);
    if (mods.length === 0) mods = modsData.slice(0, 4);
  }

  return { featured, nexus: nexusRes.data, moreBuilds, weapons, shell, mods };
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function Divider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '32px 0 20px' }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6 }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}

function StatBar({ label, value, max, color }) {
  var pct = statBarPct(value, max);
  var c = color || '#ff8800';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>{label}</span>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: c }}>{value ?? '—'}</span>
      </div>
      <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
        <div style={{ height: '100%', width: pct + '%', background: c, borderRadius: 2, boxShadow: '0 0 6px ' + c + '44' }} />
      </div>
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default async function TopBuildPage() {
  var { featured, nexus, moreBuilds, weapons, shell, mods } = await getData();
  var grade = computeGrade(featured);
  var gradeColor = TIER_COLORS[grade?.[0]] || '#ff8800';
  var primaryWeapon = weapons[0] || null;
  var secondaryWeapon = weapons[1] || null;
  var shellColor = shell ? (SHELL_COLORS[shell.name] || '#ff8800') : '#ff8800';
  var shellSymbol = shell ? (SHELL_SYMBOLS[shell.name] || '◈') : '◈';
  var parsed = parseBody(featured?.body);

  return (
    <>
      <Nav />
      <div style={{ minHeight: '100vh', background: '#030303', color: '#fff', paddingTop: 64, overflowX: 'hidden' }}>

        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.012, backgroundImage: 'linear-gradient(rgba(255,136,0,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,136,0,0.8) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ position: 'absolute', top: 64, left: '50%', transform: 'translateX(-50%)', width: 900, height: 400, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,136,0,0.06) 0%, transparent 65%)', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── HERO ── */}
        <div style={{ position: 'relative', zIndex: 1, borderBottom: '1px solid rgba(255,136,0,0.12)', padding: '48px 24px 40px' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontFamily: 'Share Tech Mono, monospace', fontSize: 9, letterSpacing: 2 }}>
              <Link href="/" style={{ color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>HOME</Link>
              <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
              <span style={{ color: '#ff8800' }}>TOP BUILD</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 40, alignItems: 'flex-start' }}>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff8800', boxShadow: '0 0 8px #ff8800' }} />
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 3 }}>⬢ DEXTER — BUILD ENGINEER</span>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{timeAgo(featured?.created_at)}</span>
                </div>

                <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 900, color: '#fff', margin: '0 0 16px', lineHeight: 1.2, letterSpacing: 1 }}>
                  {featured?.headline || 'No Build Available'}
                </h1>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  {shell && (
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: shellColor, background: shellColor + '15', border: '1px solid ' + shellColor + '35', borderRadius: 4, padding: '4px 12px', letterSpacing: 2 }}>
                      {shellSymbol} {shell.name.toUpperCase()}
                    </span>
                  )}
                  {featured?.ranked_viable && (
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 4, padding: '4px 12px', letterSpacing: 2 }}>
                      ● RANKED VIABLE
                    </span>
                  )}
                  {featured?.tags && featured.tags.slice(0, 3).map(function(tag) {
                    return (
                      <span key={tag} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, padding: '4px 10px', letterSpacing: 1 }}>
                        {tag.toUpperCase()}
                      </span>
                    );
                  })}
                </div>

                {(primaryWeapon || secondaryWeapon) && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[primaryWeapon, secondaryWeapon].filter(Boolean).map(function(w, i) {
                      return (
                        <div key={i} style={{ background: 'rgba(255,136,0,0.06)', border: '1px solid rgba(255,136,0,0.18)', borderRadius: 5, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,136,0,0.5)', letterSpacing: 1 }}>{i === 0 ? 'PRIMARY' : 'SECONDARY'}</span>
                          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#ff8800' }}>{w.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{ background: gradeColor + '10', border: '1px solid ' + gradeColor + '33', borderRadius: 10, padding: '20px 32px', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 6 }}>LOADOUT GRADE</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 64, fontWeight: 900, color: gradeColor, lineHeight: 1, textShadow: '0 0 30px ' + gradeColor + '55' }}>{grade}</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: 2, marginTop: 6 }}>
                  CE: {featured?.ce_score?.toFixed(1) || '—'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #ff8800, transparent)', position: 'relative', zIndex: 1 }} />

        {/* ── LOADOUT ── */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <Divider label="LOADOUT" />

          <div style={{ display: 'grid', gridTemplateColumns: shell ? '260px 1fr' : '1fr', gap: 20, marginBottom: 12 }}>

            {shell && (
              <div style={{ background: shellColor + '06', border: '1px solid ' + shellColor + '22', borderTop: '2px solid ' + shellColor, borderRadius: 10, padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ textAlign: 'center', paddingBottom: 14, borderBottom: '1px solid ' + shellColor + '15' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 36, color: shellColor, opacity: 0.3, lineHeight: 1, marginBottom: 6 }}>{shellSymbol}</div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: shellColor, letterSpacing: 2 }}>{shell.name.toUpperCase()}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginTop: 4 }}>{(shell.role || '').toUpperCase()}</div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
                    {shell.ranked_tier_solo && (
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: TIER_COLORS[shell.ranked_tier_solo] || '#888', background: (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '15', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_solo] || '#888') + '28', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>
                        S {shell.ranked_tier_solo}
                      </span>
                    )}
                    {shell.ranked_tier_squad && (
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: TIER_COLORS[shell.ranked_tier_squad] || '#888', background: (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '15', border: '1px solid ' + (TIER_COLORS[shell.ranked_tier_squad] || '#888') + '28', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>
                        Q {shell.ranked_tier_squad}
                      </span>
                    )}
                  </div>
                </div>

                {(shell.base_health || shell.base_shield) && (
                  <div>
                    {shell.base_health && <StatBar label="HEALTH" value={shell.base_health} max={175} color="#00ff88" />}
                    {shell.base_shield && <StatBar label="SHIELD" value={shell.base_shield} max={80} color="#00f5ff" />}
                  </div>
                )}

                {[
                  { label: 'ACTIVE', name: shell.active_ability_name || shell.prime_ability_name, color: shellColor },
                  { label: 'PASSIVE', name: shell.passive_ability_name || shell.tactical_ability_name, color: 'rgba(255,255,255,0.4)' },
                ].filter(function(a) { return a.name; }).map(function(a) {
                  return (
                    <div key={a.label}>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: a.color, letterSpacing: 2, marginBottom: 3, opacity: 0.7 }}>{a.label}</div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#fff', opacity: 0.8 }}>{a.name}</div>
                    </div>
                  );
                })}

                <Link href={'/shells/' + shell.name.toLowerCase()} style={{ marginTop: 'auto', fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: shellColor + '88', letterSpacing: 1, textDecoration: 'none', textAlign: 'center' }}>
                  FULL SHELL GUIDE →
                </Link>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { weapon: primaryWeapon, label: 'PRIMARY WEAPON' },
                { weapon: secondaryWeapon, label: 'SECONDARY WEAPON' },
              ].map(function(slot, si) {
                if (!slot.weapon) return (
                  <div key={si} style={{ background: 'rgba(255,136,0,0.02)', border: '1px solid rgba(255,136,0,0.08)', borderRadius: 8, padding: '20px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 2 }}>{slot.label} NOT IDENTIFIED</div>
                  </div>
                );
                var w = slot.weapon;
                return (
                  <div key={si} style={{ background: 'rgba(255,136,0,0.03)', border: '1px solid rgba(255,136,0,0.12)', borderTop: '2px solid #ff8800', borderRadius: 8, padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,136,0,0.5)', letterSpacing: 2, marginBottom: 4 }}>{slot.label}</div>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>{w.name}</div>
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, marginTop: 3 }}>
                          {[w.weapon_type, w.ammo_type].filter(Boolean).join(' · ').toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0 24px' }}>
                      {w.damage && <StatBar label="DAMAGE" value={w.damage} max={200} color="#ff4444" />}
                      {w.fire_rate && <StatBar label="FIRE RATE" value={w.fire_rate} max={1000} color="#ff8800" />}
                      {w.magazine_size && <StatBar label="MAGAZINE" value={w.magazine_size} max={60} color="#00f5ff" />}
                      {(w.firepower_score || w.accuracy_score) && <StatBar label={w.firepower_score ? 'FIREPOWER' : 'ACCURACY'} value={w.firepower_score || w.accuracy_score} max={200} color="#ffd700" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {mods.length > 0 && (
            <>
              <Divider label="RECOMMENDED MODS" />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {mods.map(function(mod) {
                  var r = RARITY_COLORS[mod.rarity] || RARITY_COLORS.Standard;
                  return (
                    <div key={mod.id || mod.name} style={{ background: r.color + '08', border: '1px solid ' + r.border, borderRadius: 5, padding: '7px 14px' }}>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: r.color, letterSpacing: 1, marginBottom: 2, opacity: 0.7 }}>{(mod.slot_type || '').toUpperCase()}</div>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: r.color }}>{mod.name}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ── ANALYSIS ── */}
          <Divider label="DEXTER ANALYSIS" />
          <div style={{ display: 'grid', gridTemplateColumns: nexus ? '1fr 320px' : '1fr', gap: 28, marginBottom: 12 }}>

            <div style={{ borderLeft: '2px solid rgba(255,136,0,0.2)', paddingLeft: 24 }}>
              {parsed.length > 0 ? parsed.map(function(el) {
                if (el.type === 'header') {
                  return (
                    <div key={el.key} style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 12px' }}>
                      <div style={{ width: 3, height: 16, background: '#ff8800', borderRadius: 2, flexShrink: 0 }} />
                      <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 900, color: '#ff8800', margin: 0, letterSpacing: 3 }}>{el.content}</h2>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,136,0,0.1)' }} />
                    </div>
                  );
                }
                return (
                  <p key={el.key} style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.72)', lineHeight: 1.85, margin: '0 0 16px', letterSpacing: 0.2 }}>
                    {el.content}
                  </p>
                );
              }) : (
                <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                  DEXTER is generating build analysis. Check back after the next cycle.
                </p>
              )}
            </div>

            {nexus && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.12)', borderTop: '2px solid rgba(0,245,255,0.4)', borderRadius: 8, padding: '18px 20px' }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', letterSpacing: 2, marginBottom: 10 }}>⬡ NEXUS META CONTEXT</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginBottom: 10 }}>{timeAgo(nexus.created_at)}</div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                    {(nexus.body || '').replace(/\*\*/g, '').slice(0, 320)}{nexus.body?.length > 320 ? '...' : ''}
                  </div>
                </div>

                <Link href="/advisor" style={{ display: 'block', background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.25)', borderRadius: 8, padding: '16px 20px', textDecoration: 'none', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ff8800', letterSpacing: 2, marginBottom: 4 }}>BUILD ADVISOR →</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>GET A PERSONALIZED LOADOUT</div>
                </Link>
              </div>
            )}
          </div>

          {moreBuilds.length > 0 && (
            <>
              <Divider label="MORE FROM DEXTER" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 48 }}>
                {moreBuilds.map(function(build) {
                  var g = computeGrade(build);
                  var gc = TIER_COLORS[g?.[0]] || '#888';
                  var shellTag = (build.tags || []).find(function(t) { return KNOWN_SHELLS.map(function(s) { return s.toLowerCase(); }).includes(t.toLowerCase()); });
                  return (
                    <Link key={build.id} href={'/intel/' + build.slug} style={{ textDecoration: 'none', display: 'block', background: '#080808', border: '1px solid rgba(255,136,0,0.1)', borderTop: '2px solid rgba(255,136,0,0.3)', borderRadius: 8, padding: 18, transition: 'border-color 0.2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        {shellTag && <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800', letterSpacing: 2 }}>{shellTag.toUpperCase()}</span>}
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: gc }}>{g}</span>
                      </div>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.3, marginBottom: 10 }}>{build.headline}</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>{timeAgo(build.created_at)}</div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}