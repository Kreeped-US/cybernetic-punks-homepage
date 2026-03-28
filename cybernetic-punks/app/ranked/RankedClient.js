'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const TIERS = [
  { name: 'Bronze',   color: '#cd7f32', bg: 'rgba(205,127,50,0.07)',  border: 'rgba(205,127,50,0.25)',  zones: 'LOW-STAKES',  zonesColor: '#00ff88', desc: 'Entry point. Prove you can survive extraction and meet your score target.', rewards: ['Ranked Emblem'] },
  { name: 'Silver',   color: '#aaaaaa', bg: 'rgba(170,170,170,0.05)', border: 'rgba(170,170,170,0.2)',  zones: 'LOW-STAKES',  zonesColor: '#00ff88', desc: 'Consistent runs. Efficient looting and smart exfil choices define this tier.', rewards: ['Ranked Emblem', 'Player Background'] },
  { name: 'Gold',     color: '#ffd700', bg: 'rgba(255,215,0,0.07)',   border: 'rgba(255,215,0,0.25)',   zones: 'LOW-STAKES',  zonesColor: '#00ff88', desc: 'High-value extractions. Your loadout ante and Holotag selection matters.', rewards: ['Ranked Emblem', 'Runner Shell Style (Destroyer)', 'Title'] },
  { name: 'Platinum', color: '#00f5ff', bg: 'rgba(0,245,255,0.05)',   border: 'rgba(0,245,255,0.2)',    zones: 'HIGH-STAKES', zonesColor: '#ff0000', desc: 'High-stakes zones unlocked. The field becomes lethal \u2014 higher risk, greater reward.', rewards: ['Ranked Emblem', 'Gun Style'] },
  { name: 'Diamond',  color: '#66ccff', bg: 'rgba(102,204,255,0.05)', border: 'rgba(102,204,255,0.2)',  zones: 'HIGH-STAKES', zonesColor: '#ff0000', desc: 'Elite extraction crews. Precision, coordination, and maximum gear ante.', rewards: ['Ranked Emblem', 'Gun Style'] },
  { name: 'Pinnacle', color: '#cc44ff', bg: 'rgba(204,68,255,0.07)',  border: 'rgba(204,68,255,0.25)', zones: 'HIGH-STAKES', zonesColor: '#ff0000', desc: 'The summit. Season-end cosmetics are reserved for those who reach this.', rewards: ['Ranked Emblem', 'Gun Style', 'Title'] },
];

const SHELLS_RANKED = [
  { name: 'Thief',     color: '#ffd700', solo: 'S',   squad: 'A',   why: 'Extraction speed is ranked currency. Built for exactly this mode.' },
  { name: 'Assassin',  color: '#cc44ff', solo: 'A',   squad: 'B',   why: 'Active Camo lets you disengage from fights you cannot win.' },
  { name: 'Vandal',    color: '#ff8800', solo: 'A',   squad: 'A',   why: 'Most forgiving movement options. Best all-rounder for ranked.' },
  { name: 'Recon',     color: '#00f5ff', solo: 'B',   squad: 'S',   why: 'Echo Pulse is information. Knowing positions before committing wins ranked.' },
  { name: 'Triage',    color: '#00ff88', solo: 'C',   squad: 'S',   why: 'Squad sustain in high-value extractions. Weak without teammates.' },
  { name: 'Destroyer', color: '#ff3333', solo: 'B',   squad: 'B',   why: 'High kill potential but ranked punishes aggression. Use carefully.' },
  { name: 'Rook',      color: '#555555', solo: 'BAN', squad: 'BAN', why: 'BANNED FROM RANKED. Sponsored Kits also banned. No exceptions.' },
];

const GRADE_COLORS = { S: '#ff0000', A: '#ff8800', B: '#00f5ff', C: '#888888', BAN: '#ff0000' };

const FAQS = [
  // UPDATED: schedule changed March 25, 2026 — no longer weekends only
  { q: 'When is Ranked active?', a: 'Ranked Mode launched March 21, 2026. After player feedback, Bungie updated the schedule on March 25: Ranked now runs Sunday 10 AM PT through Thursday 10 AM PT (4 days). Cryo Archive runs Thursday through Sunday. The first window (March 21\u201324) featured Low Stakes only on Perimeter. This is a beta \u2014 systems are subject to change.' },
  { q: 'What is a Holotag?', a: 'A Holotag is a mandatory pass you purchase before entering ranked. It adds to your crew\'s score target based on rarity. Higher rarity tags increase both the target and the scoring ceiling. Every Runner must carry a Holotag at all times during a ranked match. You can only purchase Holotags up to your current rank tier in the Armory.' },
  { q: 'What happens if I die in ranked?', a: 'Failing to exfiltrate results in a loss of ranked progress equal to your crew\'s combined loss penalty. Your gear is also lost. Holotags can be stolen from your body by enemy Runners.' },
  { q: 'What if I extract without hitting my target?', a: 'Exfiltrating without meeting the crew score target results in no ranked progress \u2014 no gain, no loss. This is your safe exit when a run goes wrong.' },
  { q: 'What are Tag Chips?', a: 'Tag Chips are loot items dropped by UESC enemies and map events during Ranked runs. They count toward your crew\'s score target and automatically sell on exfil \u2014 no inventory management needed. Grabbing Tag Chips is a reliable way to pad your score without relying purely on gear loot.' },
  { q: 'Can I play ranked solo?', a: 'Yes. Solo ranked is fully supported. Thief and Assassin are the strongest solo picks. Rook is banned from ranked entirely.' },
  { q: 'What are the ranked tiers?', a: 'Bronze, Silver, Gold, Platinum, Diamond, and Pinnacle \u2014 each with three subdivisions (III, II, I). You progress from III (entry) to I (peak) within each tier before advancing. Platinum and above unlocks high-stakes zones.' },
  { q: 'What are the ranked rewards?', a: 'Bronze: Ranked Emblem. Silver: Emblem + Player Background. Gold: Emblem + Destroyer Shell Style + Title. Platinum/Diamond: Emblem + Gun Style. Pinnacle: Emblem + Gun Style + Title. Rewards are milestone-based \u2014 drop from Pinnacle and you keep the Pinnacle cosmetic.' },
  { q: 'Do ranked rewards carry over between seasons?', a: 'Yes. Cosmetics earned through ranked are permanent. Rank progress resets each season. Liaison contract progression carries over.' },
  // UPDATED: added Runner Level 25 requirement
  { q: 'What is the gear ante?', a: 'A minimum loadout value threshold you must meet to queue. You must also be Runner Level 25 before the queue unlocks. Low Stakes requires a 3,000 ante (roughly Enhanced green gear with a few Deluxe blue pieces) and a Bronze Holotag. High Stakes requires a 10,000 ante (Deluxe gear with a few Superior purple pieces) and a Platinum Holotag.' },
];

function RankEmblem({ tier, size = 80, glow = false }) {
  var color = tier.color;
  var s = size;
  var c = s / 2;
  var outerR  = s * 0.40;
  var innerR  = s * 0.26;
  var lineGap = s * 0.08;
  var lineOut = s * 0.10;
  var dotR    = s * 0.055;

  var lines = [
    { x1: c, y1: c - innerR + lineGap,      x2: c, y2: c - outerR - lineOut },
    { x1: c, y1: c + innerR - lineGap,      x2: c, y2: c + outerR + lineOut },
    { x1: c - innerR + lineGap, y1: c,      x2: c - outerR - lineOut, y2: c },
    { x1: c + innerR - lineGap, y1: c,      x2: c + outerR + lineOut, y2: c },
  ];

  var center = null;
  var n = tier.name;

  if (n === 'Bronze') {
    center = <circle cx={c} cy={c} r={dotR * 1.1} fill={color} opacity="0.95" />;
  } else if (n === 'Silver') {
    var sp2 = s * 0.07;
    center = (<><circle cx={c} cy={c - sp2} r={dotR} fill={color} opacity="0.95" /><circle cx={c} cy={c + sp2} r={dotR} fill={color} opacity="0.95" /></>);
  } else if (n === 'Gold') {
    var sp3 = s * 0.075;
    center = (<><circle cx={c} cy={c - sp3} r={dotR} fill={color} opacity="0.95" /><circle cx={c} cy={c} r={dotR} fill={color} opacity="0.95" /><circle cx={c} cy={c + sp3} r={dotR} fill={color} opacity="0.95" /></>);
  } else if (n === 'Platinum') {
    var sp4 = s * 0.075; var pr = dotR * 1.15;
    center = (<><circle cx={c} cy={c - sp4} r={pr} fill={color} opacity="0.9" /><circle cx={c} cy={c + sp4} r={pr} fill={color} opacity="0.9" /><circle cx={c - sp4} cy={c} r={pr} fill={color} opacity="0.9" /><circle cx={c + sp4} cy={c} r={pr} fill={color} opacity="0.9" /></>);
  } else if (n === 'Diamond') {
    var sp5 = s * 0.088; var pr5 = dotR * 1.2;
    center = (<><circle cx={c} cy={c - sp5} r={pr5} fill={color} opacity="0.9" /><circle cx={c} cy={c + sp5} r={pr5} fill={color} opacity="0.9" /><circle cx={c - sp5} cy={c} r={pr5} fill={color} opacity="0.9" /><circle cx={c + sp5} cy={c} r={pr5} fill={color} opacity="0.9" /><circle cx={c} cy={c} r={dotR * 0.6} fill={color} opacity="0.7" /></>);
  } else if (n === 'Pinnacle') {
    var sp6a = s * 0.09; var sp6b = s * 0.075; var pr6a = dotR * 1.25; var pr6b = dotR * 0.85; var diag = sp6b * 0.707;
    center = (<><circle cx={c} cy={c - sp6a} r={pr6a} fill={color} opacity="0.95" /><circle cx={c} cy={c + sp6a} r={pr6a} fill={color} opacity="0.95" /><circle cx={c - sp6a} cy={c} r={pr6a} fill={color} opacity="0.95" /><circle cx={c + sp6a} cy={c} r={pr6a} fill={color} opacity="0.95" /><circle cx={c + diag} cy={c - diag} r={pr6b} fill={color} opacity="0.7" /><circle cx={c - diag} cy={c - diag} r={pr6b} fill={color} opacity="0.7" /><circle cx={c + diag} cy={c + diag} r={pr6b} fill={color} opacity="0.7" /><circle cx={c - diag} cy={c + diag} r={pr6b} fill={color} opacity="0.7" /><circle cx={c} cy={c} r={dotR * 0.65} fill={color} opacity="0.9" /></>);
  }

  return (
    <svg width={s} height={s} viewBox={'0 0 ' + s + ' ' + s} style={{ flexShrink: 0, filter: glow ? 'drop-shadow(0 0 ' + (s * 0.1) + 'px ' + color + '99)' : 'none', overflow: 'visible' }}>
      <circle cx={c} cy={c} r={outerR} fill="none" stroke={color} strokeWidth={s * 0.035} opacity="0.95" />
      <circle cx={c} cy={c} r={innerR} fill="none" stroke={color} strokeWidth={s * 0.025} opacity="0.55" />
      {lines.map(function(l, i) { return <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={color} strokeWidth={s * 0.035} strokeLinecap="round" opacity="0.9" />; })}
      {center}
    </svg>
  );
}

function DivisionPips({ color }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {['III', 'II', 'I'].map(function(d) {
        return <span key={d} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color, background: color + '18', border: '1px solid ' + color + '40', borderRadius: 2, padding: '2px 5px', letterSpacing: 1 }}>{d}</span>;
      })}
    </div>
  );
}

function Countdown() {
  var [parts, setParts] = useState({ d: '00', h: '00', m: '00', s: '00' });
  var [launched, setLaunched] = useState(false);

  useEffect(function() {
    var target = new Date('2026-03-21T17:00:00Z').getTime();
    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) { setLaunched(true); return; }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      setParts({ d: String(d).padStart(2,'0'), h: String(h).padStart(2,'0'), m: String(m).padStart(2,'0'), s: String(s).padStart(2,'0') });
    }
    tick();
    var id = setInterval(tick, 1000);
    return function() { clearInterval(id); };
  }, []);

  if (launched) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.4rem, 4vw, 2rem)', fontWeight: 900, color: '#00ff88', letterSpacing: 4, textShadow: '0 0 30px rgba(0,255,136,0.4)' }}>RANKED IS LIVE</div>
        {/* UPDATED: no longer weekends only — schedule changed March 25, 2026 */}
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginTop: 8 }}>SUN 10AM PT – THU 10AM PT</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(0,245,255,0.5)', letterSpacing: 4, marginBottom: 12, textAlign: 'center' }}>LAUNCHES IN</div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {[{ val: parts.d, label: 'DAYS' }, { val: parts.h, label: 'HOURS' }, { val: parts.m, label: 'MIN' }, { val: parts.s, label: 'SEC' }].map(function(unit, i) {
          return (
            <div key={unit.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 900, color: '#00f5ff', lineHeight: 1, background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 6, padding: '10px 14px', minWidth: 62, textShadow: '0 0 20px rgba(0,245,255,0.3)' }}>{unit.val}</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(0,245,255,0.35)', letterSpacing: 2, marginTop: 5 }}>{unit.label}</div>
              </div>
              {i < 3 && <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.6rem', fontWeight: 900, color: 'rgba(0,245,255,0.25)', marginBottom: 16 }}>:</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RankedClient() {
  var [activeTier, setActiveTier] = useState('Bronze');
  var [shellMode, setShellMode] = useState('solo');
  var [openFaq, setOpenFaq] = useState(null);

  var selectedTier = TIERS.find(function(t) { return t.name === activeTier; }) || TIERS[0];

  var faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(function(f) {
      return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } };
    }),
  };

  return (
    <main style={{ backgroundColor: '#030303', minHeight: '100vh', color: '#fff', paddingTop: 80, overflowX: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <style>{`
        @keyframes rPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes rScanLine { from{transform:translateY(-100vh)} to{transform:translateY(100vh)} }
        .r-btn  { transition: all 0.15s ease; cursor: pointer; }
        .r-btn:hover  { transform: translateY(-2px); }
        .r-card { transition: border-color 0.2s, transform 0.15s; }
        .r-card:hover { transform: translateY(-2px); }
        .r-faq  { transition: background 0.15s; cursor: pointer; }
        .r-faq:hover  { background: rgba(255,255,255,0.025) !important; }
        .r-row  { transition: background 0.12s; }
        .r-row:hover  { background: rgba(255,255,255,0.02) !important; }
      `}</style>

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.3), transparent)', animation: 'rScanLine 10s linear infinite', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── BETA NOTICE */}
      <div style={{ background: 'rgba(255,136,0,0.05)', borderBottom: '1px solid rgba(255,136,0,0.12)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800', background: 'rgba(255,136,0,0.12)', border: '1px solid rgba(255,136,0,0.3)', borderRadius: 3, padding: '2px 8px', letterSpacing: 2, flexShrink: 0 }}>BETA</span>
        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>
          <strong style={{ color: 'rgba(255,136,0,0.75)' }}>Ranked mode is in beta for Season 1.</strong>{' '}
          Bungie is actively collecting feedback to shape Ranked going forward. Stats, thresholds, and systems are subject to change.
        </span>
      </div>

      {/* ── HERO */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '56px 24px 64px' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.012, backgroundImage: 'linear-gradient(rgba(0,245,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,1) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 900, height: 500, background: 'radial-gradient(ellipse at 50% 0%, rgba(0,245,255,0.05) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2 }}>● LIVE NOW</span>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2 }}>SEASON 1 BETA</span>
            {/* UPDATED: was WEEKENDS ONLY — schedule changed March 25, 2026 */}
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,136,0,0.6)', background: 'rgba(255,136,0,0.06)', border: '1px solid rgba(255,136,0,0.18)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2 }}>SUN–THU ACTIVE</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'center' }}>
            <div>
              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', fontWeight: 900, letterSpacing: 2, lineHeight: 1.0, margin: '0 0 16px' }}>
                RANKED<br /><span style={{ color: '#00f5ff', textShadow: '0 0 40px rgba(0,245,255,0.25)' }}>MODE</span>
              </h1>
              <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 440, marginBottom: 28 }}>
                Put your survival skills to the test, climb the competitive ladder, and prove you're a top Runner on Tau Ceti. Six ranks. Three subdivisions each. Bring your best loadout, set your score target, and survive extraction.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/advisor" style={{ padding: '10px 20px', background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.35)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 2 }}>[D] BUILD ADVISOR &rarr;</Link>
                <Link href="/meta" style={{ padding: '10px 20px', background: 'rgba(0,245,255,0.05)', border: '1px solid rgba(0,245,255,0.18)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', letterSpacing: 2 }}>[N] RANKED META &rarr;</Link>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <Countdown />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
                {TIERS.map(function(tier) { return <RankEmblem key={tier.name} tier={tier} size={38} />; })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RANK TIERS */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6, textAlign: 'center', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />RANK TIERS<div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <div style={{ display: 'flex', gap: 3, marginBottom: 3, overflowX: 'auto', paddingBottom: 2 }}>
          {TIERS.map(function(tier) {
            var active = activeTier === tier.name;
            return (
              <button key={tier.name} className="r-btn" onClick={function() { setActiveTier(tier.name); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 18px', background: active ? tier.bg : '#0a0a0a', border: '1px solid ' + (active ? tier.border : 'rgba(255,255,255,0.05)'), borderBottom: '2px solid ' + (active ? tier.color : 'transparent'), borderRadius: '6px 6px 0 0', cursor: 'pointer', flexShrink: 0, minWidth: 80, transition: 'all 0.15s' }}>
                <RankEmblem tier={tier} size={44} glow={active} />
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: active ? tier.color : 'rgba(255,255,255,0.25)', letterSpacing: 2 }}>{tier.name.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        <div style={{ background: selectedTier.bg, border: '1px solid ' + selectedTier.border, borderTop: 'none', borderRadius: '0 0 10px 10px', padding: '28px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <RankEmblem tier={selectedTier} size={80} glow={true} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 900, color: selectedTier.color, textShadow: '0 0 20px ' + selectedTier.color + '44' }}>{selectedTier.name.toUpperCase()}</span>
              <DivisionPips color={selectedTier.color} />
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 12 }}>{selectedTier.desc}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: selectedTier.zonesColor + '10', border: '1px solid ' + selectedTier.zonesColor + '30', borderRadius: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: selectedTier.zonesColor, animation: 'rPulse 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: selectedTier.zonesColor, letterSpacing: 2 }}>{selectedTier.zones} ZONES</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 8 }}>TIER REWARDS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
              {selectedTier.rewards.map(function(r) {
                return <span key={r} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: selectedTier.color, background: selectedTier.color + '12', border: '1px solid ' + selectedTier.color + '28', borderRadius: 3, padding: '3px 10px', letterSpacing: 1 }}>{r.toUpperCase()}</span>;
              })}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 6, marginTop: 10 }}>
          {TIERS.map(function(tier) {
            return (
              <div key={tier.name} className="r-card" onClick={function() { setActiveTier(tier.name); }}
                style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#0a0a0a', border: '1px solid ' + tier.color + '15', borderLeft: '3px solid ' + tier.color + '88', borderRadius: 6, padding: '14px 16px', cursor: 'pointer' }}>
                <RankEmblem tier={tier} size={44} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: tier.color, letterSpacing: 1 }}>{tier.name.toUpperCase()}</span>
                    <DivisionPips color={tier.color} />
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>{tier.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 10, padding: '12px 16px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, display: 'flex', gap: 8 }}>
          <span style={{ color: '#00f5ff', flexShrink: 0 }}>●</span>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Each rank contains three subdivisions — III, II, and I — progressing from III (entry) to I (peak). Reach Rank I to advance to the next tier.</span>
        </div>
      </section>

      {/* ── HOLOTAGS + ZONES */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>

          {/* Holotags */}
          <div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6, textAlign: 'center', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />HOLOTAGS<div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ width: 46, height: 46, background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.25)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>🏷</div>
                <div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 700, color: '#ff8800', letterSpacing: 1, marginBottom: 4 }}>HOLOTAG</div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Mandatory passes for Runners entering Ranked play. Each Holotag adds to the crew's score target based on rarity. You can only purchase Holotags up to your current rank tier in the Armory.</div>
                </div>
              </div>
              {[
                { icon: '↗', color: '#ff8800', text: 'Holotag rarity increases crew score target — and scoring ceiling.' },
                { icon: '◎', color: '#ff0000', text: 'Holotags can be stolen from defeated Runners in the field.' },
                { icon: '◈', color: '#00f5ff', text: 'Every Runner must carry a Holotag at all times during a Ranked match.' },
                { icon: '⬡', color: '#00ff88', text: 'Tag Chips from UESC enemies and map events count toward your score target and auto-sell on exfil.' },
              ].map(function(item, i) {
                return (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                    <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 14, color: item.color, opacity: 0.7, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                    <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{item.text}</span>
                  </div>
                );
              })}

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {/* UPDATED: added Runner Level 25 requirement */}
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 10 }}>ENTRY REQUIREMENTS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: 5, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#ffd700', letterSpacing: 1 }}>RUNNER LEVEL</span>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700' }}>LEVEL 25 REQUIRED</span>
                    </div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>The Ranked queue does not unlock until you reach Runner Level 25.</div>
                  </div>
                  <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 5, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#00ff88', letterSpacing: 1 }}>LOW STAKES</span>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#00ff88' }}>3,000 ANTE</span>
                    </div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Bronze Holotag required. Roughly Enhanced green gear with a few Deluxe blue pieces.</div>
                  </div>
                  <div style={{ background: 'rgba(255,0,0,0.04)', border: '1px solid rgba(255,0,0,0.15)', borderRadius: 5, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#ff0000', letterSpacing: 1 }}>HIGH STAKES</span>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff0000' }}>10,000 ANTE</span>
                    </div>
                    <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>Platinum Holotag required. Roughly Deluxe gear with a few Superior purple pieces.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Zones */}
          <div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6, textAlign: 'center', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />RANKED ZONES<div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(0,255,136,0.12)', borderRadius: 8, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ff88', animation: 'rPulse 2s ease-in-out infinite' }} />
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#00ff88', letterSpacing: 1 }}>LOW-STAKES ZONES</span>
                  </div>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00ff88', background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>All Ranks</span>
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 8 }}>Available to all Runners across every rank. Standard extraction risk with controlled competition density.</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(0,255,136,0.4)', letterSpacing: 1 }}>★ Week 1 (Mar 21–24) was Low Stakes only on Perimeter</div>
              </div>

              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,0,0,0.12)', borderRadius: 8, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff0000', animation: 'rPulse 2s ease-in-out infinite' }} />
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ff0000', letterSpacing: 1 }}>HIGH-STAKES ZONES</span>
                  </div>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff0000', background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>Platinum+</span>
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 12 }}>Unlocked at Platinum rank. Greater risk, greater loot density, harder competition. Only the most coordinated crews thrive here.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {TIERS.slice(3).map(function(t) { return <RankEmblem key={t.name} tier={t} size={28} />; })}
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>and above</span>
                </div>
              </div>

              {/* UPDATED: schedule changed March 25, 2026 — Cryo Archive and Ranked no longer overlap */}
              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>↻</span>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>SEASON 1 SCHEDULE</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {[
                    { name: 'RANKED',       note: 'Sun 10AM – Thu 10AM PT', color: '#00f5ff' },
                    { name: 'CRYO ARCHIVE', note: 'Thu 10AM – Sun 10AM PT', color: '#9b5de5' },
                  ].map(function(z) {
                    return (
                      <div key={z.name} style={{ flex: 1, minWidth: 120, background: z.color + '08', border: '1px solid ' + z.color + '22', borderRadius: 4, padding: '8px 12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, fontWeight: 700, color: z.color, letterSpacing: 1, marginBottom: 3 }}>{z.name}</div>
                        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1 }}>{z.note}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.15)', letterSpacing: 1, lineHeight: 1.5 }}>
                  ★ Schedules split on March 25 after player feedback — Ranked and Cryo Archive no longer overlap. Map rotates weekly: Perimeter → Dire Marsh → Outpost.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAKES & CONSEQUENCES */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6, textAlign: 'center', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />STAKES & CONSEQUENCES<div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
          {[
            { icon: '↗', color: '#00ff88', title: 'SUCCESSFUL EXFIL — SCORE MET',  body: 'You exfiltrate and meet or exceed the crew\'s score target. Ranked progress is awarded.' },
            { icon: '△', color: '#ff8800', title: 'EXFIL — SCORE NOT MET',          body: 'Failing to meet the crew\'s score target while still exfiltrating results in no Ranked progress — no gain, no loss.' },
            { icon: '↘', color: '#ff0000', title: 'FAILED EXFIL',                   body: 'Failing to exfiltrate results in a loss of Ranked progress equal to your crew\'s combined loss penalty.' },
            { icon: '◎', color: '#00f5ff', title: 'HOLOTAG THEFT',                  body: 'Holotags stolen from defeated Runners contribute to your crew\'s score and overperformance capacity.' },
          ].map(function(item, i) {
            return (
              <div key={i} className="r-card" style={{ background: '#0a0a0a', border: '1px solid ' + item.color + '15', borderTop: '2px solid ' + item.color + '55', borderRadius: 8, padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 14, color: item.color }}>{item.icon}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: item.color, letterSpacing: 1, lineHeight: 1.3 }}>{item.title}</span>
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{item.body}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SEASON 1 REWARDS */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6, textAlign: 'center', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />SEASON 1 REWARDS<div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 12 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ff8800', letterSpacing: 1 }}>SEASONAL REWARDS</span>
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
              Based on the <strong style={{ color: '#fff' }}>highest rank you achieved during the season</strong> — not your final standing. Drop from Pinnacle back to Diamond? <strong style={{ color: '#fff' }}>You keep the Pinnacle cosmetic.</strong> Rewards are milestone-based, not final-rank-based.
            </div>
          </div>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>📦</span>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#00f5ff', letterSpacing: 1 }}>RANK-UP PACKAGES</span>
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
              Each time you reach a new rank, you'll receive a <strong style={{ color: '#fff' }}>loot package</strong> containing gear and room keys to randomly-selected zones. These drop immediately when you hit the milestone.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[...TIERS].reverse().map(function(tier) {
            return (
              <div key={tier.name} className="r-row" style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 5, padding: '12px 16px' }}>
                <RankEmblem tier={tier} size={34} />
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: tier.color, letterSpacing: 1, minWidth: 86 }}>{tier.name.toUpperCase()}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                  {tier.rewards.map(function(r) {
                    return <span key={r} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, padding: '3px 10px', letterSpacing: 1 }}>{r}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 10, padding: '12px 16px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, display: 'flex', gap: 8 }}>
          <span style={{ color: '#00f5ff', flexShrink: 0 }}>★</span>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>Cosmetics earned through Ranked are permanent to your account — wear them as proof of your standing on Tau Ceti.</span>
        </div>
      </section>

      {/* ── SHELL TIER LIST */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6, textAlign: 'center', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />RANKED SHELL TIER LIST<div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>

        <div style={{ display: 'flex', gap: 3, marginBottom: 14, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden', width: 'fit-content' }}>
          {['solo', 'squad'].map(function(mode) {
            var active = shellMode === mode;
            return (
              <button key={mode} onClick={function() { setShellMode(mode); }} style={{ padding: '10px 28px', background: active ? 'rgba(0,245,255,0.06)' : 'transparent', border: 'none', borderBottom: '2px solid ' + (active ? '#00f5ff' : 'transparent'), fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: active ? '#00f5ff' : 'rgba(255,255,255,0.28)', letterSpacing: 2, cursor: 'pointer', transition: 'all 0.15s' }}>
                {mode.toUpperCase()}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {SHELLS_RANKED.map(function(shell) {
            var grade = shellMode === 'solo' ? shell.solo : shell.squad;
            var gradeColor = GRADE_COLORS[grade] || '#555';
            var isBanned = grade === 'BAN';
            return (
              <div key={shell.name} className="r-row" style={{ display: 'grid', gridTemplateColumns: '130px 60px 1fr', gap: 16, alignItems: 'center', background: '#0a0a0a', border: '1px solid ' + (isBanned ? 'rgba(255,0,0,0.08)' : shell.color + '12'), borderLeft: '3px solid ' + (isBanned ? '#ff000044' : shell.color + '77'), padding: '13px 18px', borderRadius: 4, opacity: isBanned ? 0.6 : 1 }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: isBanned ? 'rgba(255,255,255,0.25)' : shell.color, letterSpacing: 1 }}>{shell.name.toUpperCase()}</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: isBanned ? '#ff0000' : gradeColor, background: (isBanned ? '#ff0000' : gradeColor) + '14', border: '1px solid ' + (isBanned ? '#ff0000' : gradeColor) + '33', borderRadius: 3, padding: '3px 10px', letterSpacing: 1, textAlign: 'center' }}>
                  {isBanned ? 'BAN' : grade}
                </span>
                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: isBanned ? 'rgba(255,50,50,0.5)' : 'rgba(255,255,255,0.42)', lineHeight: 1.4 }}>{shell.why}</span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/advisor" style={{ padding: '10px 20px', background: 'rgba(255,136,0,0.08)', border: '1px solid rgba(255,136,0,0.28)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 2 }}>GET YOUR RANKED BUILD &rarr;</Link>
          <Link href="/shells" style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>SHELL GUIDES &rarr;</Link>
        </div>
      </section>

      {/* ── LIVE INTEL */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ background: 'rgba(0,245,255,0.02)', border: '1px solid rgba(0,245,255,0.08)', borderLeft: '3px solid rgba(0,245,255,0.4)', borderRadius: 8, padding: '28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', letterSpacing: 3, marginBottom: 10 }}>CYBERNETICPUNKS — LIVE RANKED INTEL</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 17, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.2, marginBottom: 10 }}>5 AI EDITORS.<br /><span style={{ color: '#00f5ff' }}>UPDATED EVERY 6H.</span></div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.38)', lineHeight: 1.6 }}>NEXUS tracks the ranked tier list. DEXTER grades builds by Holotag viability. CIPHER analyzes ranked plays. MIRANDA publishes shell guides.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {[
              { href: '/meta',        color: '#00f5ff', label: '⬡ LIVE RANKED TIER LIST',  desc: 'Updated every 6h by NEXUS' },
              { href: '/advisor',     color: '#ff8800', label: '⬢ BUILD ADVISOR',          desc: 'Get your ranked loadout' },
              { href: '/shells',      color: '#ffd700', label: 'SHELL GUIDES',             desc: 'Full ability breakdowns' },
              { href: '/intel/nexus', color: '#00f5ff', label: '⬡ NEXUS META ANALYSIS',    desc: 'Full ranked breakdowns' },
            ].map(function(l) {
              return (
                <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: l.color + '06', border: '1px solid ' + l.color + '18', borderRadius: 5, textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: l.color, letterSpacing: 1 }}>{l.label}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.18)', letterSpacing: 1, marginTop: 1 }}>{l.desc}</div>
                  </div>
                  <span style={{ color: l.color, opacity: 0.5, fontSize: 12 }}>&rarr;</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.15)', letterSpacing: 6, textAlign: 'center', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />RANKED FAQ<div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {FAQS.map(function(faq, i) {
            var isOpen = openFaq === i;
            return (
              <div key={i} className="r-faq" onClick={function() { setOpenFaq(isOpen ? null : i); }}
                style={{ background: isOpen ? 'rgba(0,245,255,0.02)' : '#0a0a0a', border: '1px solid ' + (isOpen ? 'rgba(0,245,255,0.12)' : 'rgba(255,255,255,0.05)'), borderLeft: '3px solid ' + (isOpen ? '#00f5ff' : 'rgba(255,255,255,0.06)'), borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', gap: 16 }}>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, fontWeight: 600, color: isOpen ? '#fff' : 'rgba(255,255,255,0.65)', lineHeight: 1.3 }}>{faq.q}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 14, color: isOpen ? '#00f5ff' : 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{isOpen ? '\u2212' : '+'}</div>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 18px 16px', paddingTop: 14, fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}