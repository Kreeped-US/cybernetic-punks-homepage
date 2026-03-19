'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useIsMobile } from '@/lib/useIsMobile';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const KNOWN_WEAPONS = [
  'V75 Scar','M77 Assault Rifle','Overrun AR','Impact HAR',
  'Retaliator LMG','Conquest LMG','Demolition HMG',
  'Knife','V11 Punch','Magnum MC','CE Tactical Sidearm','Rook Pistol',
  'Repeater HPR','Hardline PR','BR33 Volley Rifle','Twin Tap HBR','V66 Lookout','Stryder M1T',
  'V00 Zeus RG','Ares RG','WSTR Combat Shotgun','V85 Circuit Breaker','Misriah 2442',
  'Longshot','Outland','V99 Channel Rifle','Copperhead RF','V22 Volt Thrower','Bully SMG','BRRT SMG',
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
  var text = ((tags||[]).join(' ') + ' ' + (body||'')).toLowerCase();
  var exact = KNOWN_WEAPONS.filter(function(w){ return text.includes(w.toLowerCase()); });
  if (exact.length > 0) return exact;
  for (var i=0; i<CATEGORY_FALLBACKS.length; i++) {
    if (CATEGORY_FALLBACKS[i].keywords.some(function(k){ return text.includes(k); })) return [CATEGORY_FALLBACKS[i].weapon];
  }
  return [];
}
function scanShell(tags, body) {
  var text = ((tags||[]).join(' ') + ' ' + (body||'')).toLowerCase();
  var exact = KNOWN_SHELLS.find(function(s){ return text.includes(s.toLowerCase()); });
  if (exact) return exact;
  for (var i=0; i<SHELL_FALLBACKS.length; i++) {
    if (SHELL_FALLBACKS[i].keywords.some(function(k){ return text.includes(k); })) return SHELL_FALLBACKS[i].shell;
  }
  return null;
}

var TIER_ORDER = { S:0, A:1, B:2, C:3, D:4, F:5 };

function getSecondsToNextCron() {
  var now = new Date();
  var t = now.getUTCHours()*3600 + now.getUTCMinutes()*60 + now.getUTCSeconds();
  for (var i=0; i<[6,12,18,24].length; i++) {
    var b = [6,12,18,24][i]*3600;
    if (t < b) return b - t;
  }
  return 86400 - t;
}
function formatCountdown(s) {
  var h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=s%60;
  if (h>0) return h+'H '+String(m).padStart(2,'0')+'M';
  return String(m).padStart(2,'0')+'M '+String(sec).padStart(2,'0')+'S';
}
function computeGrade(item, editor) {
  if (!item) return '—';
  if (editor==='CIPHER') {
    if (item.runner_grade) return item.runner_grade;
    if (item.ce_score>=9) return 'S+'; if (item.ce_score>=8) return 'S';
    if (item.ce_score>=6) return 'A'; if (item.ce_score>=4) return 'B'; return 'C';
  }
  if (editor==='DEXTER') {
    if (item.loadout_grade) return item.loadout_grade;
    if (item.ce_score>=9) return 'S'; if (item.ce_score>=7) return 'A+';
    if (item.ce_score>=6) return 'A'; if (item.ce_score>=4) return 'B'; return 'C';
  }
  return String(item.ce_score?.toFixed(1)||'—');
}
function confidencePct(item) {
  if (!item) return null;
  if (item.grade_confidence==='high') return '94%';
  if (item.grade_confidence==='medium') return '75%';
  return null;
}
function statPct(val, max) { return (!val||!max) ? 0 : Math.min(100, Math.round((val/max)*100)); }
function tierColor(tier) {
  if (tier==='S') return '#ff0000'; if (tier==='A') return '#ff8800';
  if (tier==='B') return '#00f5ff'; if (tier==='C') return 'rgba(255,255,255,0.35)';
  return 'rgba(255,255,255,0.2)';
}
function truncate(str, max) { if (!str) return ''; return str.length>max ? str.slice(0,max).trimEnd()+'...' : str; }
function formatNum(n) {
  if (n==null) return '—';
  if (n>=1000000) return (n/1000000).toFixed(1)+'M';
  if (n>=1000) return (n/1000).toFixed(1)+'K';
  return n.toLocaleString();
}

function StatBar({ label, pct, val, fillColor }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
      <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,255,255,0.15)', width:28 }}>{label}</span>
      <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.04)', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:pct+'%', background:fillColor, borderRadius:2 }} />
      </div>
      <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,255,255,0.25)', width:24, textAlign:'right' }}>{val??'—'}</span>
    </div>
  );
}

function WeaponInlineCard({ weapon, accentColor }) {
  if (!weapon) return null;
  var hasFpr = weapon.firepower_score != null;
  var hasDmg = weapon.damage != null;
  return (
    <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)', borderRadius:6, padding:'10px 12px', marginBottom:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontFamily:'Orbitron, monospace', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.8)', letterSpacing:1 }}>{weapon.name}</span>
        <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,255,255,0.2)', letterSpacing:1 }}>{weapon.weapon_type?.toUpperCase()||''}</span>
      </div>
      {hasFpr ? (
        <>
          <StatBar label="FPR" pct={statPct(weapon.firepower_score,200)} val={weapon.firepower_score} fillColor={accentColor} />
          <StatBar label="ACC" pct={statPct(weapon.accuracy_score,100)} val={weapon.accuracy_score} fillColor={accentColor==='#ff8800'?'#ff8800':'#00f5ff'} />
        </>
      ) : hasDmg ? (
        <>
          <StatBar label="DMG" pct={statPct(weapon.damage,150)} val={weapon.damage} fillColor="#ff0000" />
          <StatBar label="RPM" pct={statPct(weapon.fire_rate,1200)} val={weapon.fire_rate} fillColor="#00f5ff" />
        </>
      ) : (
        <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,255,255,0.15)', letterSpacing:1 }}>STATS PENDING</div>
      )}
    </div>
  );
}

function ShellInlineCard({ shell, accentColor }) {
  if (!shell) return null;
  var abilities = [shell.prime_ability_name, shell.tactical_ability_name].filter(Boolean);
  return (
    <div style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.04)', borderRadius:6, padding:'10px 12px', marginBottom:6 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:abilities.length>0?4:0 }}>
        <span style={{ fontFamily:'Orbitron, monospace', fontSize:11, fontWeight:700, color:accentColor, letterSpacing:1 }}>{shell.name.toUpperCase()}</span>
        <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,255,255,0.2)', letterSpacing:1 }}>
          {shell.ranked_tier_solo?'SOLO: '+shell.ranked_tier_solo:''}
          {shell.ranked_tier_solo&&shell.ranked_tier_squad?' / ':''}
          {shell.ranked_tier_squad?'SQUAD: '+shell.ranked_tier_squad:''}
        </span>
      </div>
      {abilities.length>0 && <div style={{ fontFamily:'Rajdhani, sans-serif', fontSize:11, color:'rgba(255,255,255,0.25)', lineHeight:1.4 }}>{abilities.join(' / ')}</div>}
    </div>
  );
}

function LiveStatCell({ value, label, color, isLive, sublabel, isMobile }) {
  return (
    <div style={{ background:'#030303', padding:isMobile?'11px 8px':'14px 16px', textAlign:'center', position:'relative' }}>
      {isLive && (
        <div style={{ position:'absolute', top:6, right:6, display:'flex', alignItems:'center', gap:3 }}>
          <div style={{ width:4, height:4, borderRadius:'50%', background:color, boxShadow:'0 0 5px '+color, animation:'heroPulse 2s ease-in-out infinite' }} />
          <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:7, color:color, opacity:0.7, letterSpacing:1 }}>LIVE</span>
        </div>
      )}
      <div style={{ fontFamily:'Orbitron, monospace', fontSize:isMobile?15:20, fontWeight:800, lineHeight:1, color:color, textShadow:isLive?'0 0 10px '+color+'40':'none' }}>{value}</div>
      {sublabel && <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:isMobile?7:8, color:color, opacity:0.4, letterSpacing:1, marginTop:2 }}>{sublabel}</div>}
      <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:isMobile?9:8, color:'rgba(255,255,255,0.2)', letterSpacing:isMobile?1:2, marginTop:sublabel?2:5 }}>{label}</div>
    </div>
  );
}

function SpotlightCard({ href, accentColor, editorSymbol, editorName, badgeLabel, loading, children, isMobile }) {
  var [hovered, setHovered] = useState(false);
  return (
    <Link href={href} style={{ display:'flex', flexDirection:'column', background:'rgba(255,255,255,0.015)', border:'1px solid '+(hovered?accentColor+'25':'rgba(255,255,255,0.04)'), borderRadius:10, overflow:'hidden', textDecoration:'none', transform:hovered&&!isMobile?'translateY(-2px)':'none', transition:'border-color 0.3s, transform 0.3s', minWidth:isMobile?'72vw':undefined, flexShrink:isMobile?0:undefined }}
      onMouseEnter={function(){ setHovered(true); }}
      onMouseLeave={function(){ setHovered(false); }}
    >
      <div style={{ height:2, background:'linear-gradient(90deg, '+accentColor+', '+accentColor+'18)', flexShrink:0 }} />
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px 8px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:accentColor, boxShadow:'0 0 6px '+accentColor, flexShrink:0 }} />
          <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:9, color:accentColor+'99', letterSpacing:2 }}>{editorSymbol} {editorName}</span>
        </div>
        <span style={{ fontFamily:'Orbitron, monospace', fontSize:9, fontWeight:700, letterSpacing:2, color:accentColor, background:accentColor+'14', border:'1px solid '+accentColor+'25', borderRadius:3, padding:'3px 8px' }}>{badgeLabel}</span>
      </div>
      <div style={{ padding:'0 16px 12px', flex:1 }}>
        {loading ? <div style={{ padding:'16px 0', textAlign:'center' }}><div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:9, color:'rgba(255,255,255,0.12)', letterSpacing:2 }}>LOADING...</div></div> : children}
      </div>
      <div style={{ padding:'10px 16px', borderTop:'1px solid rgba(255,255,255,0.03)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, minHeight:44 }}>
        <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:9, color:accentColor+'80', letterSpacing:1 }}>VIEW FULL {badgeLabel} &rarr;</span>
      </div>
    </Link>
  );
}

// ─── MOBILE CARD CONTENT — compact, no stat bars ────────────
function MobileCipherCard({ d }) {
  if (!d?.cipher) return <EmptyState />;
  var tags = (d.cipher.tags || []).slice(0, 2);
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ fontFamily:'Orbitron, monospace', fontSize:48, fontWeight:900, color:'#ff0000', lineHeight:1, textShadow:'0 0 20px rgba(255,0,0,0.3)', flexShrink:0 }}>{d.cipherGrade}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'Orbitron, monospace', fontSize:13, fontWeight:700, color:'#fff', letterSpacing:1, lineHeight:1.3, marginBottom:6 }}>{truncate(d.cipher.headline, 55)}</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {tags.map(function(t,i){ return <span key={i} style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,0,0,0.5)', background:'rgba(255,0,0,0.08)', border:'1px solid rgba(255,0,0,0.15)', borderRadius:2, padding:'2px 6px', letterSpacing:1 }}>{t.toUpperCase()}</span>; })}
        </div>
      </div>
    </div>
  );
}

function MobileDexterCard({ d }) {
  if (!d?.dexter) return <EmptyState />;
  var shellName = d.dexterShell ? d.dexterShell.name : null;
  var weaponName = d.dexterWeapons.length > 0 ? d.dexterWeapons[0].name : null;
  return (
    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ fontFamily:'Orbitron, monospace', fontSize:48, fontWeight:900, color:'#ff8800', lineHeight:1, textShadow:'0 0 20px rgba(255,136,0,0.3)', flexShrink:0 }}>{d.dexterGrade}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'Orbitron, monospace', fontSize:13, fontWeight:700, color:'#fff', letterSpacing:1, lineHeight:1.3, marginBottom:6 }}>{truncate(d.dexter.headline, 55)}</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {shellName && <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,136,0,0.6)', background:'rgba(255,136,0,0.08)', border:'1px solid rgba(255,136,0,0.15)', borderRadius:2, padding:'2px 6px', letterSpacing:1 }}>{shellName.toUpperCase()}</span>}
          {weaponName && <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,255,255,0.25)', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:2, padding:'2px 6px', letterSpacing:1 }}>{truncate(weaponName, 18)}</span>}
          {d.dexter.ranked_viable && <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(0,255,136,0.6)', background:'rgba(0,255,136,0.06)', border:'1px solid rgba(0,255,136,0.15)', borderRadius:2, padding:'2px 6px', letterSpacing:1 }}>RANKED</span>}
        </div>
      </div>
    </div>
  );
}

function MobileNexusCard({ d }) {
  if (!d?.metaTiers?.length) return <EmptyState />;
  return (
    <div>
      <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(0,245,255,0.4)', letterSpacing:2, marginBottom:8 }}>CURRENT META RANKINGS</div>
      {d.metaTiers.slice(0, 4).map(function(item, i) {
        return (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
            <span style={{ fontFamily:'Orbitron, monospace', fontSize:13, fontWeight:900, width:22, textAlign:'center', color:tierColor(item.tier) }}>{item.tier}</span>
            <span style={{ fontFamily:'Rajdhani, sans-serif', fontSize:14, color:item.tier==='S'?'rgba(255,255,255,0.85)':'rgba(255,255,255,0.5)', flex:1 }}>{item.name}</span>
            <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:9, color:item.trend==='up'?'#00ff88':item.trend==='down'?'#ff0000':'rgba(255,255,255,0.2)' }}>{item.trend==='up'?'^':item.trend==='down'?'v':'.'}</span>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding:'16px 0', textAlign:'center' }}>
      <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:9, color:'rgba(255,255,255,0.12)', letterSpacing:2 }}>AWAITING NEXT CYCLE</div>
    </div>
  );
}

export default function HeroBanner() {
  var [countdown, setCountdown] = useState(function(){ return formatCountdown(getSecondsToNextCron()); });
  var [data, setData] = useState(null);
  var [liveStats, setLiveStats] = useState(null);
  var intervalRef = useRef(null);
  var isMobile = useIsMobile(640);

  useEffect(function() {
    intervalRef.current = setInterval(function(){ setCountdown(formatCountdown(getSecondsToNextCron())); }, 1000);
    return function(){ clearInterval(intervalRef.current); };
  }, []);

  useEffect(function() {
    async function fetchLive() {
      try {
        var res = await fetch('/api/live-stats', { signal: AbortSignal.timeout(5000) });
        if (res.ok) setLiveStats(await res.json());
      } catch(_) {}
    }
    fetchLive();
    var t = setInterval(fetchLive, 5*60*1000);
    return function(){ clearInterval(t); };
  }, []);

  useEffect(function() {
    async function fetchAll() {
      try {
        var today = new Date(); today.setUTCHours(0,0,0,0);
        var iso = today.toISOString();
        var [wc,cc,mc,ms,tt,ci,di,mtr,gi,aw,as,ct,nt,dt,gt,mt] = await Promise.all([
          supabase.from('weapon_stats').select('*',{count:'exact',head:true}),
          supabase.from('core_stats').select('*',{count:'exact',head:true}),
          supabase.from('mod_stats').select('*',{count:'exact',head:true}),
          supabase.from('meta_tiers').select('*',{count:'exact',head:true}).gte('updated_at',iso),
          supabase.from('meta_tiers').select('name,tier').eq('tier','S').order('updated_at',{ascending:false}).limit(1).single(),
          supabase.from('feed_items').select('*').eq('editor','CIPHER').eq('is_published',true).order('ce_score',{ascending:false}).limit(1).single(),
          supabase.from('feed_items').select('*').eq('editor','DEXTER').eq('is_published',true).order('created_at',{ascending:false}).limit(1).single(),
          supabase.from('meta_tiers').select('name,type,tier,trend').limit(12),
          supabase.from('feed_items').select('headline,body,tags,ce_score,created_at').eq('editor','GHOST').eq('is_published',true).order('created_at',{ascending:false}).limit(1).single(),
          supabase.from('weapon_stats').select('name,damage,fire_rate,weapon_type,firepower_score,accuracy_score'),
          supabase.from('shell_stats').select('name,ranked_tier_solo,ranked_tier_squad,prime_ability_name,tactical_ability_name'),
          supabase.from('feed_items').select('*',{count:'exact',head:true}).eq('editor','CIPHER').gte('created_at',iso),
          supabase.from('feed_items').select('*',{count:'exact',head:true}).eq('editor','NEXUS').gte('created_at',iso),
          supabase.from('feed_items').select('*',{count:'exact',head:true}).eq('editor','DEXTER').gte('created_at',iso),
          supabase.from('feed_items').select('*',{count:'exact',head:true}).eq('editor','GHOST').gte('created_at',iso),
          supabase.from('feed_items').select('*',{count:'exact',head:true}).eq('editor','MIRANDA').gte('created_at',iso),
        ]);
        var metaTiers = (mtr.data||[]).sort(function(a,b){ return (TIER_ORDER[a.tier]??99)-(TIER_ORDER[b.tier]??99); }).slice(0,6);
        var wm={}, sm={};
        (aw.data||[]).forEach(function(w){ wm[w.name.toLowerCase()]=w; });
        (as.data||[]).forEach(function(s){ sm[s.name.toLowerCase()]=s; });
        var cipher=ci.data, dexter=di.data, ghost=gi.data;
        var cWpns = cipher ? scanWeapons(cipher.tags,cipher.body).map(function(n){ return wm[n.toLowerCase()]; }).filter(Boolean).slice(0,2) : [];
        var dWpns = dexter ? scanWeapons(dexter.tags,dexter.body).map(function(n){ return wm[n.toLowerCase()]; }).filter(Boolean).slice(0,1) : [];
        var dShellName = dexter ? scanShell(dexter.tags,dexter.body) : null;
        var dShell = dShellName ? sm[dShellName.toLowerCase()]||{name:dShellName} : null;
        var dMods = Array.isArray(dexter?.mods_featured) ? dexter.mods_featured.slice(0,3).join(' / ') : null;
        setData({
          weaponCount:wc.count??0, coreCount:cc.count??0, modCount:mc.count??0,
          metaShifts:ms.count??0, topTierName:tt.data?.name??null,
          cipher, cipherWeapons:cWpns, cipherGrade:computeGrade(cipher,'CIPHER'), cipherConf:confidencePct(cipher),
          dexter, dexterWeapons:dWpns, dexterShell:dShell, dexterMods:dMods, dexterGrade:computeGrade(dexter,'DEXTER'),
          metaTiers, ghost, moodScore:ghost?.ce_score??null, moodText:ghost?truncate(ghost.headline||ghost.body,120):null,
          pulse:{ cipher:ct.count??0, nexus:nt.count??0, dexter:dt.count??0, ghost:gt.count??0, miranda:mt.count??0 },
        });
      } catch(err) { console.error('[HeroBanner]',err); setData({}); }
    }
    fetchAll();
  }, []);

  var d=data, ls=liveStats;
  var EDITORS = [
    { sym:'C', name:'CIPHER',  color:'#ff0000', status:d?.pulse?.cipher>0?'GRADED '+d.pulse.cipher+' TODAY':'AWAITING CYCLE' },
    { sym:'N', name:'NEXUS',   color:'#00f5ff', status:d?.pulse?.nexus>0?d.pulse.nexus+' META SHIFTS':'AWAITING CYCLE' },
    { sym:'D', name:'DEXTER',  color:'#ff8800', status:d?.pulse?.dexter>0?d.pulse.dexter+' BUILDS':'AWAITING CYCLE' },
    { sym:'G', name:'GHOST',   color:'#00ff88', status:'SCANNING X + REDDIT' },
    { sym:'M', name:'MIRANDA', color:'#9b5de5', status:d?.pulse?.miranda>0?d.pulse.miranda+' GUIDES':'AWAITING CYCLE' },
  ];

  return (
    <div style={{ background:'#030303', paddingBottom:8, position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0, background:'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,245,255,0.005) 2px, rgba(0,245,255,0.005) 4px)' }} />
      <div style={{ position:'absolute', top:0, left:0, right:0, height:400, background:'radial-gradient(ellipse at 50% 0%, rgba(0,245,255,0.04) 0%, transparent 65%)', pointerEvents:'none', zIndex:0 }} />

      <div style={{ position:'relative', zIndex:1, maxWidth:1200, margin:'0 auto', padding:isMobile?'0 16px':'0 24px' }}>

        {/* STATUS BAR */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:'1px solid rgba(0,245,255,0.06)', flexWrap:'wrap', gap:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#00ff88', boxShadow:'0 0 6px #00ff88', animation:'heroPulse 3s ease-in-out infinite', flexShrink:0 }} />
            <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:isMobile?9:10, color:'rgba(0,255,136,0.6)', letterSpacing:isMobile?1:2 }}>
              {isMobile ? 'GRID ONLINE — NEXT IN '+countdown : 'GRID ONLINE — 5 EDITORS ACTIVE — NEXT CYCLE IN '+countdown}
            </span>
          </div>
          {!isMobile && <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:10, color:'rgba(255,255,255,0.12)', letterSpacing:1 }}>CYBERNETICPUNKS.COM — MARATHON INTELLIGENCE</span>}
        </div>

        {/* STATS BAR */}
        <div style={{ marginTop:14 }}>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2, 1fr)':'repeat(4, 1fr)', gap:1, background:'rgba(0,255,136,0.03)', border:'1px solid rgba(0,255,136,0.08)', borderRadius:'8px 8px 0 0', overflow:'hidden' }}>
            <LiveStatCell value={ls?.steam?.current!=null?formatNum(ls.steam.current):d?.steamCount!=null?formatNum(d.steamCount):'—'} label="RUNNERS ONLINE" color="#00ff88" isLive={true} isMobile={isMobile} />
            <LiveStatCell value={ls?.steam?.peak24h!=null?formatNum(ls.steam.peak24h):'—'} label="24H PEAK" color="#00ff88" sublabel="STEAM" isMobile={isMobile} />
            <LiveStatCell value={ls?.twitch?.viewers!=null?formatNum(ls.twitch.viewers):'—'} label="WATCHING NOW" color="#9b5de5" isLive={ls?.twitch?.viewers!=null} sublabel="TWITCH" isMobile={isMobile} />
            <LiveStatCell value={ls?.twitch?.streams!=null?String(ls.twitch.streams):'—'} label="LIVE STREAMS" color="#9b5de5" sublabel="TWITCH" isMobile={isMobile} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2, 1fr)':'repeat(4, 1fr)', gap:1, background:'rgba(0,245,255,0.03)', border:'1px solid rgba(0,245,255,0.06)', borderTop:'none', borderRadius:'0 0 8px 8px', overflow:'hidden', marginBottom:isMobile?20:28 }}>
            <LiveStatCell value={d!=null?String(d.weaponCount):'—'} label="WEAPONS" color="#00f5ff" isMobile={isMobile} />
            <LiveStatCell value={d!=null?String(d.modCount):'—'} label="MODS" color="#00f5ff" isMobile={isMobile} />
            <LiveStatCell value={d!=null?String(d.metaShifts):'—'} label="META SHIFTS" color="#ff0000" isMobile={isMobile} />
            <LiveStatCell value={d?.topTierName?'S':'—'} label={d?.topTierName?'TOP: '+d.topTierName.toUpperCase().slice(0,12):'TOP TIER'} color="#ffd700" isMobile={isMobile} />
          </div>
        </div>

        {/* HEADLINE */}
        <div style={{ textAlign:'center', marginBottom:isMobile?22:32, padding:isMobile?'0 4px':'0' }}>
          <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:isMobile?8:10, color:'rgba(0,245,255,0.4)', letterSpacing:isMobile?2:4, marginBottom:8 }}>AUTONOMOUS MARATHON INTELLIGENCE</div>
          <h1 style={{ fontFamily:'Orbitron, monospace', fontSize:isMobile?17:'clamp(20px, 3vw, 28px)', fontWeight:900, letterSpacing:isMobile?2:4, marginBottom:8, lineHeight:1.3, wordBreak:'break-word' }}>
            <span style={{ color:'#00f5ff', textShadow:'0 0 20px rgba(0,245,255,0.15)' }}>5 EDITORS. 6 SOURCES.</span>
            {' '}
            <span style={{ color:'rgba(255,255,255,0.85)' }}>EVERY 6 HOURS.</span>
          </h1>
          <div style={{ fontFamily:'Orbitron, monospace', fontSize:isMobile?12:'clamp(14px, 2vw, 18px)', fontWeight:700, letterSpacing:isMobile?3:6, color:'#00f5ff', textShadow:'0 0 20px rgba(0,245,255,0.15)', marginBottom:8 }}>
            AUTONOMOUS INTELLIGENCE
          </div>
          <p style={{ fontFamily:'Share Tech Mono, monospace', fontSize:isMobile?10:11, color:'rgba(255,255,255,0.2)', letterSpacing:1, marginBottom:8, lineHeight:1.6 }}>
            {isMobile ? 'Weapons. Builds. Meta. Community. Updated every 6 hours.' : 'Weapons profiled. Loadouts engineered. Plays graded. Meta decoded. Community intercepted. No writers. No wait. No buzz.'}
          </p>
          <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:isMobile?8:9, color:'rgba(255,255,255,0.08)', letterSpacing:isMobile?1:3 }}>
            YOUTUBE · REDDIT · X · STEAM · TWITCH · BUNGIE.NET
          </div>
        </div>

        {/* SPOTLIGHT CARDS */}
        <div style={{ display:isMobile?'flex':'grid', flexDirection:isMobile?'row':undefined, overflowX:isMobile?'auto':undefined, gridTemplateColumns:isMobile?undefined:'repeat(3, 1fr)', gap:isMobile?10:14, marginBottom:isMobile?20:28, paddingBottom:isMobile?4:0, WebkitOverflowScrolling:'touch' }}>

          <SpotlightCard href="/play-of-the-day" accentColor="#ff0000" editorSymbol="C" editorName="CIPHER" badgeLabel="PLAY OF THE DAY" loading={d===null} isMobile={isMobile}>
            {isMobile
              ? <MobileCipherCard d={d} />
              : d?.cipher ? (
                <>
                  <div style={{ fontFamily:'Orbitron, monospace', fontSize:14, fontWeight:700, color:'#fff', letterSpacing:1, lineHeight:1.3, marginBottom:10 }}>{truncate(d.cipher.headline, 60)}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <div style={{ fontFamily:'Orbitron, monospace', fontSize:32, fontWeight:900, color:'#ff0000', lineHeight:1, textShadow:'0 0 20px rgba(255,0,0,0.3)' }}>{d.cipherGrade}</div>
                    <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:1, lineHeight:1.6 }}>RUNNER GRADE{d.cipherConf?'\nCONF: '+d.cipherConf:''}</div>
                  </div>
                  {d.cipherWeapons.length>0 ? d.cipherWeapons.map(function(w,i){ return <WeaponInlineCard key={i} weapon={w} accentColor="#ff0000" />; }) : <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:9, color:'rgba(255,255,255,0.15)', letterSpacing:1, padding:'8px 0' }}>LOADOUT SCANNING...</div>}
                </>
              ) : <EmptyState />
            }
          </SpotlightCard>

          <SpotlightCard href="/top-build" accentColor="#ff8800" editorSymbol="D" editorName="DEXTER" badgeLabel="TOP BUILD" loading={d===null} isMobile={isMobile}>
            {isMobile
              ? <MobileDexterCard d={d} />
              : d?.dexter ? (
                <>
                  <div style={{ fontFamily:'Orbitron, monospace', fontSize:14, fontWeight:700, color:'#fff', letterSpacing:1, lineHeight:1.3, marginBottom:10 }}>{truncate(d.dexter.headline, 60)}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <div style={{ fontFamily:'Orbitron, monospace', fontSize:32, fontWeight:900, color:'#ff8800', lineHeight:1, textShadow:'0 0 20px rgba(255,136,0,0.3)' }}>{d.dexterGrade}</div>
                    <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:1, lineHeight:1.6 }}>BUILD GRADE{d.dexter.ranked_viable?'\nRANKED VIABLE':''}</div>
                  </div>
                  <ShellInlineCard shell={d.dexterShell} accentColor="#ff8800" />
                  {d.dexterWeapons.map(function(w,i){ return <WeaponInlineCard key={i} weapon={w} accentColor="#ff8800" />; })}
                  {d.dexterMods && <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,136,0,0.3)', letterSpacing:1, marginTop:6 }}>MODS: {d.dexterMods}</div>}
                </>
              ) : <EmptyState />
            }
          </SpotlightCard>

          <SpotlightCard href="/meta" accentColor="#00f5ff" editorSymbol="N" editorName="NEXUS" badgeLabel="LIVE META" loading={d===null} isMobile={isMobile}>
            {isMobile
              ? <MobileNexusCard d={d} />
              : (
                <>
                  <div style={{ fontFamily:'Orbitron, monospace', fontSize:14, fontWeight:700, color:'#fff', letterSpacing:1, marginBottom:14 }}>Current Season 1 Meta</div>
                  {d?.metaTiers?.length>0 ? d.metaTiers.map(function(item,i){
                    return (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:i<d.metaTiers.length-1?'1px solid rgba(255,255,255,0.02)':'none' }}>
                        <span style={{ fontFamily:'Orbitron, monospace', fontSize:12, fontWeight:900, width:24, textAlign:'center', color:tierColor(item.tier) }}>{item.tier}</span>
                        <span style={{ fontFamily:'Rajdhani, sans-serif', fontSize:13, color:item.tier==='S'?'rgba(255,255,255,0.8)':'rgba(255,255,255,0.55)', flex:1 }}>{item.name}</span>
                        <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,255,255,0.15)', letterSpacing:1 }}>{(item.type||'').toUpperCase()}</span>
                        <span style={{ fontFamily:'Share Tech Mono, monospace', fontSize:9, color:item.trend==='up'?'#00ff88':item.trend==='down'?'#ff0000':'rgba(255,255,255,0.2)' }}>{item.trend==='up'?'^':item.trend==='down'?'v':'.'}</span>
                      </div>
                    );
                  }) : <EmptyState />}
                </>
              )
            }
          </SpotlightCard>
        </div>

        {/* EDITOR PULSE STRIP */}
        {isMobile ? (
          <div style={{ marginBottom:14 }}>
            <div style={{ overflowX:'auto', WebkitOverflowScrolling:'touch', paddingBottom:6 }}>
              <div style={{ display:'flex', gap:1, minWidth:'max-content', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.03)', borderRadius:8, overflow:'hidden' }}>
                {EDITORS.map(function(e,i){
                  return (
                    <div key={i} style={{ background:'#030303', padding:'12px 16px', display:'flex', alignItems:'center', gap:10, minWidth:140, flexShrink:0 }}>
                      <span style={{ fontSize:13, color:e.color, opacity:0.5, flexShrink:0, fontFamily:'Orbitron, monospace', fontWeight:900 }}>{e.sym}</span>
                      <div>
                        <div style={{ fontFamily:'Orbitron, monospace', fontSize:10, fontWeight:700, color:e.color, opacity:0.6, letterSpacing:1, marginBottom:2 }}>{e.name}</div>
                        <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,255,255,0.15)', letterSpacing:1 }}>{d===null?'...':e.status}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,255,255,0.1)', letterSpacing:1, textAlign:'center', marginTop:4 }}>scroll for all editors</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:1, background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.03)', borderRadius:8, overflow:'hidden', marginBottom:16 }}>
            {EDITORS.map(function(e,i){
              return (
                <div key={i} style={{ background:'#030303', padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:16, color:e.color, opacity:0.4, flexShrink:0 }}>{e.sym}</span>
                  <div>
                    <div style={{ fontFamily:'Orbitron, monospace', fontSize:10, fontWeight:700, color:e.color, opacity:0.6, letterSpacing:1, marginBottom:2 }}>{e.name}</div>
                    <div style={{ fontFamily:'Share Tech Mono, monospace', fontSize:8, color:'rgba(255,255,255,0.15)', letterSpacing:1 }}>{d===null?'...':e.status}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}



      </div>

      <style>{`
        @keyframes heroPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.85)} }
      `}</style>
    </div>
  );
}