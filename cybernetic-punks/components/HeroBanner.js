'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ─── WEAPON SCANNER ─────────────────────────────────────────
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
  { keywords: ['aggressive','rush','push','combat','fragger'], shell: 'Destroyer' },
  { keywords: ['stealth','flank','assassin','silent'],         shell: 'Assassin' },
  { keywords: ['support','heal','triage','medic'],             shell: 'Triage' },
  { keywords: ['scout','recon','intel','vision'],              shell: 'Recon' },
  { keywords: ['loot','extract','thief','theft'],              shell: 'Thief' },
  { keywords: ['tank','rook','anchor','hold'],                 shell: 'Rook' },
  { keywords: ['versati','flex','all-around','balanced'],      shell: 'Vandal' },
];
function scanWeapons(tags, body) {
  const text = ((tags || []).join(' ') + ' ' + (body || '')).toLowerCase();
  const exact = KNOWN_WEAPONS.filter(w => text.includes(w.toLowerCase()));
  if (exact.length > 0) return exact;
  for (const fb of CATEGORY_FALLBACKS) {
    if (fb.keywords.some(k => text.includes(k))) return [fb.weapon];
  }
  return [];
}
function scanShell(tags, body) {
  const text = ((tags || []).join(' ') + ' ' + (body || '')).toLowerCase();
  const exact = KNOWN_SHELLS.find(s => text.includes(s.toLowerCase()));
  if (exact) return exact;
  for (const fb of SHELL_FALLBACKS) {
    if (fb.keywords.some(k => text.includes(k))) return fb.shell;
  }
  return null;
}

// ─── HELPERS ────────────────────────────────────────────────
const TIER_ORDER = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };

function getSecondsToNextCron() {
  const now = new Date();
  const totalSecs = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  for (const h of [6, 12, 18, 24]) {
    const boundary = h * 3600;
    if (totalSecs < boundary) return boundary - totalSecs;
  }
  return 86400 - totalSecs;
}

function formatCountdown(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}H ${String(m).padStart(2, '0')}M`;
  return `${String(m).padStart(2, '0')}M ${String(s).padStart(2, '0')}S`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return 'JUST NOW';
  if (h < 24) return `${h}H AGO`;
  return `${Math.floor(h / 24)}D AGO`;
}

function computeGrade(item, editor) {
  if (!item) return '—';
  if (editor === 'CIPHER') {
    if (item.runner_grade) return item.runner_grade;
    if (item.ce_score >= 9) return 'S+';
    if (item.ce_score >= 8) return 'S';
    if (item.ce_score >= 6) return 'A';
    if (item.ce_score >= 4) return 'B';
    return 'C';
  }
  if (editor === 'DEXTER') {
    if (item.loadout_grade) return item.loadout_grade;
    if (item.ce_score >= 9) return 'S';
    if (item.ce_score >= 7) return 'A+';
    if (item.ce_score >= 6) return 'A';
    if (item.ce_score >= 4) return 'B';
    return 'C';
  }
  return String(item.ce_score?.toFixed(1) || '—');
}

function confidencePct(item) {
  if (!item) return null;
  const c = item.grade_confidence;
  if (c === 'high') return '94%';
  if (c === 'medium') return '75%';
  return null; // don't show for low confidence
}

function statPct(val, max) {
  if (!val || !max) return 0;
  return Math.min(100, Math.round((val / max) * 100));
}

function tierColor(tier) {
  if (tier === 'S') return '#ff0000';
  if (tier === 'A') return '#ff8800';
  if (tier === 'B') return '#00f5ff';
  if (tier === 'C') return 'rgba(255,255,255,0.35)';
  return 'rgba(255,255,255,0.2)';
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.slice(0, max).trimEnd() + '…' : str;
}

// ─── SUB-COMPONENTS ─────────────────────────────────────────

function StatBar({ label, pct, val, fillColor }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', width: 28 }}>{label}</span>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: fillColor, borderRadius: 2 }} />
      </div>
      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', width: 24, textAlign: 'right' }}>{val ?? '—'}</span>
    </div>
  );
}

function WeaponInlineCard({ weapon, accentColor }) {
  if (!weapon) return null;
  const dmgPct = statPct(weapon.damage, 150);
  const rpmPct = statPct(weapon.fire_rate, 1200);
  const fprPct = statPct(weapon.firepower_score, 200);
  const accPct = statPct(weapon.accuracy_score, 100);
  const hasFpr = weapon.firepower_score != null;
  const hasDmg = weapon.damage != null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.04)',
      borderRadius: 6, padding: '10px 12px', marginBottom: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.8)', letterSpacing: 1 }}>
          {weapon.name}
        </span>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
          {weapon.weapon_type?.toUpperCase() || ''}
        </span>
      </div>
      {hasFpr ? (
        <>
          <StatBar label="FPR" pct={fprPct} val={weapon.firepower_score} fillColor={accentColor} />
          <StatBar label="ACC" pct={accPct} val={weapon.accuracy_score} fillColor={accentColor === '#ff8800' ? '#ff8800' : '#00f5ff'} />
        </>
      ) : hasDmg ? (
        <>
          <StatBar label="DMG" pct={dmgPct} val={weapon.damage} fillColor="#ff0000" />
          <StatBar label="RPM" pct={rpmPct} val={weapon.fire_rate} fillColor="#00f5ff" />
        </>
      ) : (
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>
          STATS PENDING
        </div>
      )}
    </div>
  );
}

function ShellInlineCard({ shell, accentColor }) {
  if (!shell) return null;
  const abilities = [shell.prime_ability_name, shell.tactical_ability_name].filter(Boolean);
  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.04)',
      borderRadius: 6, padding: '10px 12px', marginBottom: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: abilities.length > 0 ? 4 : 0 }}>
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: accentColor, letterSpacing: 1 }}>
          {shell.name.toUpperCase()}
        </span>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>
          {shell.ranked_tier_solo ? `SOLO: ${shell.ranked_tier_solo}` : ''}
          {shell.ranked_tier_solo && shell.ranked_tier_squad ? ' • ' : ''}
          {shell.ranked_tier_squad ? `SQUAD: ${shell.ranked_tier_squad}` : ''}
        </span>
      </div>
      {abilities.length > 0 && (
        <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.25)', lineHeight: 1.4 }}>
          {abilities.join(' • ')}
        </div>
      )}
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────

export default function HeroBanner() {
  const [countdown, setCountdown] = useState(() => formatCountdown(getSecondsToNextCron()));
  const [data, setData] = useState(null);
  const intervalRef = useRef(null);

  // Countdown ticker
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCountdown(formatCountdown(getSecondsToNextCron()));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // Data fetch
  useEffect(() => {
    async function fetchAll() {
      try {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        const [
          weaponCount, coreCount, modCount, metaShifts, topTier,
          cipherLatest, dexterLatest, metaTiersRaw, ghostLatest,
          allWeapons, allShells,
          cipherToday, nexusToday, dexterToday, ghostToday, mirandaToday,
        ] = await Promise.all([
          supabase.from('weapon_stats').select('*', { count: 'exact', head: true }),
          supabase.from('core_stats').select('*', { count: 'exact', head: true }),
          supabase.from('mod_stats').select('*', { count: 'exact', head: true }),
          supabase.from('meta_tiers').select('*', { count: 'exact', head: true }).gte('updated_at', todayISO),
          supabase.from('meta_tiers').select('name, tier').eq('tier', 'S').order('updated_at', { ascending: false }).limit(1).single(),
          supabase.from('feed_items').select('*').eq('editor', 'CIPHER').eq('is_published', true).order('ce_score', { ascending: false }).limit(1).single(),
          supabase.from('feed_items').select('*').eq('editor', 'DEXTER').eq('is_published', true).order('created_at', { ascending: false }).limit(1).single(),
          supabase.from('meta_tiers').select('name, type, tier, trend').limit(12),
          supabase.from('feed_items').select('headline, body, tags, ce_score, created_at').eq('editor', 'GHOST').eq('is_published', true).order('created_at', { ascending: false }).limit(1).single(),
          supabase.from('weapon_stats').select('name, damage, fire_rate, weapon_type, firepower_score, accuracy_score'),
          supabase.from('shell_stats').select('name, ranked_tier_solo, ranked_tier_squad, prime_ability_name, tactical_ability_name'),
          supabase.from('feed_items').select('*', { count: 'exact', head: true }).eq('editor', 'CIPHER').gte('created_at', todayISO),
          supabase.from('feed_items').select('*', { count: 'exact', head: true }).eq('editor', 'NEXUS').gte('created_at', todayISO),
          supabase.from('feed_items').select('*', { count: 'exact', head: true }).eq('editor', 'DEXTER').gte('created_at', todayISO),
          supabase.from('feed_items').select('*', { count: 'exact', head: true }).eq('editor', 'GHOST').gte('created_at', todayISO),
          supabase.from('feed_items').select('*', { count: 'exact', head: true }).eq('editor', 'MIRANDA').gte('created_at', todayISO),
        ]);

        // Sort meta tiers client-side (S → A → B → C → D → F)
        const metaTiers = (metaTiersRaw.data || [])
          .sort((a, b) => (TIER_ORDER[a.tier] ?? 99) - (TIER_ORDER[b.tier] ?? 99))
          .slice(0, 6);

        // Weapon lookup map
        const weaponMap = {};
        (allWeapons.data || []).forEach(w => { weaponMap[w.name.toLowerCase()] = w; });
        const shellMap = {};
        (allShells.data || []).forEach(s => { shellMap[s.name.toLowerCase()] = s; });

        // CIPHER weapons
        const cipher = cipherLatest.data;
        const cipherWeaponNames = cipher ? scanWeapons(cipher.tags, cipher.body) : [];
        const cipherWeapons = cipherWeaponNames.map(n => weaponMap[n.toLowerCase()]).filter(Boolean).slice(0, 2);

        // DEXTER weapons + shell
        const dexter = dexterLatest.data;
        const dexterWeaponNames = dexter ? scanWeapons(dexter.tags, dexter.body) : [];
        const dexterWeapons = dexterWeaponNames.map(n => weaponMap[n.toLowerCase()]).filter(Boolean).slice(0, 1);
        const dexterShellName = dexter ? scanShell(dexter.tags, dexter.body) : null;
        const dexterShell = dexterShellName ? shellMap[dexterShellName.toLowerCase()] || { name: dexterShellName } : null;

        // Mods featured
        const dexterMods = Array.isArray(dexter?.mods_featured)
          ? dexter.mods_featured.slice(0, 3).join(' • ')
          : null;

        // GHOST mood
        const ghost = ghostLatest.data;
        const moodScore = ghost?.ce_score ?? null;
        const moodText = ghost ? truncate(ghost.headline || ghost.body, 120) : null;

        // Steam count (optional — try fetching from our own API)
        let steamCount = null;
        try {
          const steamRes = await fetch('/api/steam-count', { signal: AbortSignal.timeout(3000) });
          if (steamRes.ok) {
            const steamJson = await steamRes.json();
            steamCount = steamJson.count ?? null;
          }
        } catch (_) { /* Steam count unavailable — shows — */ }

        setData({
          // Data strip
          weaponCount: weaponCount.count ?? 0,
          coreCount: coreCount.count ?? 0,
          modCount: modCount.count ?? 0,
          metaShifts: metaShifts.count ?? 0,
          topTierName: topTier.data?.name ?? null,
          steamCount,
          // Spotlight cards
          cipher,
          cipherWeapons,
          cipherGrade: computeGrade(cipher, 'CIPHER'),
          cipherConf: confidencePct(cipher),
          dexter,
          dexterWeapons,
          dexterShell,
          dexterMods,
          dexterGrade: computeGrade(dexter, 'DEXTER'),
          metaTiers,
          ghost,
          moodScore,
          moodText,
          // Pulse strip
          pulse: {
            cipher: cipherToday.count ?? 0,
            nexus: nexusToday.count ?? 0,
            dexter: dexterToday.count ?? 0,
            ghost: ghostToday.count ?? 0,
            miranda: mirandaToday.count ?? 0,
          },
        });
      } catch (err) {
        console.error('[HeroBanner] fetch error:', err);
        setData({});
      }
    }
    fetchAll();
  }, []);

  const d = data;

  // ─── RENDER ───────────────────────────────────────────────
  return (
    <div style={{ background: '#030303', paddingBottom: 8, position: 'relative', overflow: 'hidden' }}>

      {/* Scanline + radial background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,245,255,0.005) 2px, rgba(0,245,255,0.005) 4px)',
      }} />
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 400,
        background: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,255,0.04) 0%, transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.012,
        backgroundImage: 'linear-gradient(rgba(0,245,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,1) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>

        {/* ── SECTION 1: SYSTEM STATUS BAR ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 0', borderBottom: '1px solid rgba(0,245,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#00ff88', boxShadow: '0 0 6px #00ff88',
              animation: 'heroPulse 3s ease-in-out infinite',
              flexShrink: 0,
            }} />
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(0,255,136,0.6)', letterSpacing: 2 }}>
              GRID ONLINE — 5 EDITORS ACTIVE — NEXT CYCLE IN {countdown}
            </span>
          </div>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.12)', letterSpacing: 1 }}>
            CYBERNETICPUNKS.COM • MARATHON INTELLIGENCE TERMINAL
          </span>
        </div>

        {/* ── SECTION 2: LIVE DATA STRIP ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1,
          background: 'rgba(0,245,255,0.04)',
          border: '1px solid rgba(0,245,255,0.06)',
          borderRadius: 8, overflow: 'hidden',
          margin: '16px 0 28px',
        }}>
          {[
            {
              value: d?.steamCount != null ? d.steamCount.toLocaleString() : '—',
              label: 'RUNNERS ONLINE',
              color: '#00ff88',
            },
            {
              value: d != null ? String(d.weaponCount) : '—',
              label: 'WEAPONS TRACKED',
              color: '#00f5ff',
            },
            {
              value: d != null ? String(d.coreCount) : '—',
              label: 'CORES INDEXED',
              color: '#ff8800',
            },
            {
              value: d != null ? String(d.modCount) : '—',
              label: 'MODS CATALOGED',
              color: 'rgba(255,255,255,0.4)',
            },
            {
              value: d != null ? String(d.metaShifts) : '—',
              label: 'META SHIFTS TODAY',
              color: '#ff0000',
            },
            {
              value: d?.topTierName ? 'S' : '—',
              label: d?.topTierName ? `TOP TIER: ${d.topTierName.toUpperCase()}` : 'TOP TIER',
              color: '#ffd700',
            },
          ].map((cell, i) => (
            <div key={i} style={{ background: '#030303', padding: '14px 16px', textAlign: 'center' }}>
              <div style={{
                fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 800,
                lineHeight: 1, color: cell.color,
              }}>
                {cell.value}
              </div>
              <div style={{
                fontFamily: 'Share Tech Mono, monospace', fontSize: 8,
                color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 6,
              }}>
                {cell.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── SECTION 3: HEADLINE ── */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(0,245,255,0.4)', letterSpacing: 4, marginBottom: 10 }}>
            ◈ ⬡ ⬢ ◇ ◎ — AUTONOMOUS MARATHON INTELLIGENCE
          </div>
          <h1 style={{
            fontFamily: 'Orbitron, monospace', fontSize: 'clamp(20px, 3vw, 28px)',
            fontWeight: 900, letterSpacing: 4, marginBottom: 8, lineHeight: 1.3,
          }}>
            <span style={{ color: '#00f5ff', textShadow: '0 0 20px rgba(0,245,255,0.15)' }}>5 EDITORS. 6 SOURCES.</span>
            {' '}
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>EVERY 6 HOURS.</span>
          </h1>
          <div style={{
            fontFamily: 'Orbitron, monospace', fontSize: 'clamp(14px, 2vw, 18px)',
            fontWeight: 700, letterSpacing: 6, color: '#00f5ff',
            textShadow: '0 0 20px rgba(0,245,255,0.15)', marginBottom: 10,
          }}>
            AUTONOMOUS INTELLIGENCE
          </div>
          <p style={{
            fontFamily: 'Share Tech Mono, monospace', fontSize: 11,
            color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginBottom: 8,
          }}>
            Weapons profiled. Loadouts engineered. Plays graded. Meta decoded. Community intercepted. No writers. No wait. No buzz.
          </p>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.08)', letterSpacing: 3 }}>
            YOUTUBE • REDDIT • X • STEAM • TWITCH • BUNGIE.NET
          </div>
        </div>

        {/* ── SECTION 4: THREE SPOTLIGHT CARDS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>

          {/* ── CIPHER — PLAY OF THE DAY ── */}
          <SpotlightCard
            href="/play-of-the-day"
            accentColor="#ff0000"
            editorSymbol="◈"
            editorName="CIPHER"
            badgeLabel="PLAY OF THE DAY"
            loading={d === null}
          >
            {d?.cipher ? (
              <>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 1, lineHeight: 1.3, marginBottom: 10 }}>
                  {truncate(d.cipher.headline, 60)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 32, fontWeight: 900, color: '#ff0000', lineHeight: 1, textShadow: '0 0 20px rgba(255,0,0,0.3)' }}>
                    {d.cipherGrade}
                  </div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, lineHeight: 1.6 }}>
                    RUNNER GRADE{d.cipherConf ? `\nCONFIDENCE: ${d.cipherConf}` : ''}
                  </div>
                </div>
                {d.cipherWeapons.length > 0
                  ? d.cipherWeapons.map((w, i) => <WeaponInlineCard key={i} weapon={w} accentColor="#ff0000" />)
                  : <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: 1, padding: '8px 0' }}>LOADOUT SCANNING...</div>
                }
              </>
            ) : (
              <EmptyState color="#ff0000" />
            )}
          </SpotlightCard>

          {/* ── DEXTER — TOP BUILD ── */}
          <SpotlightCard
            href="/top-build"
            accentColor="#ff8800"
            editorSymbol="⬢"
            editorName="DEXTER"
            badgeLabel="TOP BUILD"
            loading={d === null}
          >
            {d?.dexter ? (
              <>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 1, lineHeight: 1.3, marginBottom: 10 }}>
                  {truncate(d.dexter.headline, 60)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 32, fontWeight: 900, color: '#ff8800', lineHeight: 1, textShadow: '0 0 20px rgba(255,136,0,0.3)' }}>
                    {d.dexterGrade}
                  </div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, lineHeight: 1.6 }}>
                    BUILD GRADE{d.dexter.ranked_viable ? '\nRANKED VIABLE' : ''}
                  </div>
                </div>
                <ShellInlineCard shell={d.dexterShell} accentColor="#ff8800" />
                {d.dexterWeapons.map((w, i) => <WeaponInlineCard key={i} weapon={w} accentColor="#ff8800" />)}
                {d.dexterMods && (
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,136,0,0.3)', letterSpacing: 1, marginTop: 6 }}>
                    MODS: {d.dexterMods}
                  </div>
                )}
              </>
            ) : (
              <EmptyState color="#ff8800" />
            )}
          </SpotlightCard>

          {/* ── NEXUS — LIVE META ── */}
          <SpotlightCard
            href="/meta"
            accentColor="#00f5ff"
            editorSymbol="⬡"
            editorName="NEXUS"
            badgeLabel="LIVE META"
            loading={d === null}
          >
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 1, marginBottom: 14 }}>
              Current Season 1 Meta Rankings
            </div>
            {d?.metaTiers?.length > 0 ? d.metaTiers.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 0',
                borderBottom: i < d.metaTiers.length - 1 ? '1px solid rgba(255,255,255,0.02)' : 'none',
              }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 900, width: 24, textAlign: 'center', color: tierColor(item.tier) }}>
                  {item.tier}
                </span>
                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: item.tier === 'S' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)', flex: 1 }}>
                  {item.name}
                </span>
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>
                  {(item.type || '').toUpperCase()}
                </span>
                <span style={{
                  fontFamily: 'Share Tech Mono, monospace', fontSize: 9,
                  color: item.trend === 'up' ? '#00ff88' : item.trend === 'down' ? '#ff0000' : 'rgba(255,255,255,0.2)',
                }}>
                  {item.trend === 'up' ? '▲' : item.trend === 'down' ? '▼' : '●'}
                </span>
              </div>
            )) : (
              <EmptyState color="#00f5ff" />
            )}
          </SpotlightCard>
        </div>

        {/* ── SECTION 5: EDITOR PULSE STRIP ── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.03)',
          borderRadius: 8, overflow: 'hidden', marginBottom: 16,
        }}>
          {[
            { symbol: '◈', name: 'CIPHER',  color: '#ff0000',  status: d?.pulse?.cipher > 0 ? `GRADED ${d.pulse.cipher} PLAY${d.pulse.cipher !== 1 ? 'S' : ''} TODAY` : 'AWAITING NEXT CYCLE' },
            { symbol: '⬡', name: 'NEXUS',   color: '#00f5ff',  status: d?.pulse?.nexus  > 0 ? `${d.pulse.nexus} META SHIFT${d.pulse.nexus !== 1 ? 'S' : ''} DETECTED` : 'AWAITING NEXT CYCLE' },
            { symbol: '⬢', name: 'DEXTER',  color: '#ff8800',  status: d?.pulse?.dexter > 0 ? `${d.pulse.dexter} BUILD${d.pulse.dexter !== 1 ? 'S' : ''} PUBLISHED` : 'AWAITING NEXT CYCLE' },
            { symbol: '◇', name: 'GHOST',   color: '#00ff88',  status: 'SCANNING REDDIT + X' },
            { symbol: '◎', name: 'MIRANDA', color: '#9b5de5',  status: d?.pulse?.miranda > 0 ? `${d.pulse.miranda} GUIDE${d.pulse.miranda !== 1 ? 'S' : ''} PUBLISHED` : 'AWAITING NEXT CYCLE' },
          ].map((editor, i) => (
            <div key={i} style={{ background: '#030303', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 16, color: editor.color, opacity: 0.4, flexShrink: 0 }}>{editor.symbol}</span>
              <div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: editor.color, opacity: 0.6, letterSpacing: 1, marginBottom: 2 }}>
                  {editor.name}
                </div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 1 }}>
                  {d === null ? '...' : editor.status}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── SECTION 6: GHOST MOOD BAR ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          background: 'rgba(0,255,136,0.015)',
          border: '1px solid rgba(0,255,136,0.06)',
          borderRadius: 8, padding: '14px 20px', marginBottom: 8,
        }}>
          <span style={{ fontSize: 18, color: '#00ff88', opacity: 0.4, flexShrink: 0 }}>◇</span>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(0,255,136,0.4)', letterSpacing: 2, flexShrink: 0 }}>GHOST</span>
          <div style={{ width: 1, height: 20, background: 'rgba(0,255,136,0.1)', flexShrink: 0 }} />
          {/* Mood meter */}
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            {Array.from({ length: 10 }, (_, i) => {
              const filled = d?.moodScore != null ? i < Math.round(d.moodScore) : false;
              return (
                <div key={i} style={{
                  width: 20, height: 4, borderRadius: 2,
                  background: filled ? '#00ff88' : 'rgba(255,255,255,0.04)',
                  boxShadow: filled ? '0 0 4px rgba(0,255,136,0.3)' : 'none',
                }} />
              );
            })}
          </div>
          {d?.moodScore != null && (
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#00ff88', flexShrink: 0 }}>
              {d.moodScore.toFixed(1)}
            </span>
          )}
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.3)', flex: 1, minWidth: 200, lineHeight: 1.4 }}>
            {d?.moodText ?? (d === null ? '...' : 'AWAITING GHOST DATA')}
          </span>
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.1)', letterSpacing: 1, flexShrink: 0 }}>
            REDDIT + X + STEAM
          </span>
        </div>

      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes heroPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @media (max-width: 900px) {
          .hero-spotlight-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 700px) {
          .hero-data-strip { grid-template-columns: repeat(3, 1fr) !important; }
          .hero-pulse-strip { overflow-x: auto; }
        }
      `}</style>
    </div>
  );
}

// ─── SPOTLIGHT CARD WRAPPER ──────────────────────────────────
function SpotlightCard({ href, accentColor, editorSymbol, editorName, badgeLabel, loading, children }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      href={href}
      style={{
        display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.015)',
        border: `1px solid ${hovered ? accentColor + '25' : 'rgba(255,255,255,0.04)'}`,
        borderRadius: 10, overflow: 'hidden', textDecoration: 'none',
        position: 'relative',
        transform: hovered ? 'translateY(-2px)' : 'none',
        transition: 'border-color 0.3s, transform 0.3s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top accent line */}
      <div style={{ height: 2, background: `linear-gradient(90deg, ${accentColor}, ${accentColor}18)`, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, boxShadow: `0 0 6px ${accentColor}`, flexShrink: 0 }} />
          <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: accentColor + '99', letterSpacing: 2 }}>
            {editorSymbol} {editorName}
          </span>
        </div>
        <span style={{
          fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2,
          color: accentColor, background: accentColor + '14',
          border: `1px solid ${accentColor}25`, borderRadius: 3, padding: '3px 8px',
        }}>
          {badgeLabel}
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: '0 18px 14px', flex: 1 }}>
        {loading ? <LoadingState /> : children}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 18px',
        borderTop: '1px solid rgba(255,255,255,0.03)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: accentColor + '80', letterSpacing: 1 }}>
          VIEW FULL {badgeLabel} →
        </span>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.1)', letterSpacing: 1 }}>
          {/* timestamp rendered inside children if needed */}
        </span>
      </div>
    </Link>
  );
}

// ─── MICRO STATES ───────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ padding: '20px 0', textAlign: 'center' }}>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 2 }}>
        LOADING...
      </div>
    </div>
  );
}

function EmptyState({ color }) {
  return (
    <div style={{ padding: '20px 0', textAlign: 'center' }}>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.12)', letterSpacing: 2 }}>
        AWAITING NEXT CYCLE
      </div>
    </div>
  );
}