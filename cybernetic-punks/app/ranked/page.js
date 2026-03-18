'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ─── TIER DATA ───────────────────────────────────────────────
const TIERS = [
  {
    name: 'Bronze',   color: '#cd7f32', bg: 'rgba(205,127,50,0.08)',  border: 'rgba(205,127,50,0.3)',
    zones: 'LOW-STAKES', zonesColor: '#00ff88',
    desc: 'Entry point. Prove you can survive extraction and meet your score target.',
    rewards: ['Ranked Emblem'],
  },
  {
    name: 'Silver',   color: '#c0c0c0', bg: 'rgba(192,192,192,0.06)', border: 'rgba(192,192,192,0.25)',
    zones: 'LOW-STAKES', zonesColor: '#00ff88',
    desc: 'Consistent runs. Efficient looting and smart exfil choices define this tier.',
    rewards: ['Ranked Emblem', 'Player Background'],
  },
  {
    name: 'Gold',     color: '#ffd700', bg: 'rgba(255,215,0,0.08)',   border: 'rgba(255,215,0,0.3)',
    zones: 'LOW-STAKES', zonesColor: '#00ff88',
    desc: 'High-value extractions. Your loadout ante and Holotag selection matters.',
    rewards: ['Ranked Emblem', 'Runner Shell Style (Destroyer)', 'Title'],
  },
  {
    name: 'Platinum', color: '#00f5ff', bg: 'rgba(0,245,255,0.06)',   border: 'rgba(0,245,255,0.25)',
    zones: 'HIGH-STAKES', zonesColor: '#ff0000',
    desc: 'High-stakes zones unlocked. The field becomes lethal — higher risk, greater reward.',
    rewards: ['Ranked Emblem', 'Gun Style'],
  },
  {
    name: 'Diamond',  color: '#88ddff', bg: 'rgba(136,221,255,0.06)', border: 'rgba(136,221,255,0.25)',
    zones: 'HIGH-STAKES', zonesColor: '#ff0000',
    desc: 'Elite extraction crews. Precision, coordination, and maximum gear ante.',
    rewards: ['Ranked Emblem', 'Gun Style'],
  },
  {
    name: 'Pinnacle', color: '#cc44ff', bg: 'rgba(204,68,255,0.08)',  border: 'rgba(204,68,255,0.3)',
    zones: 'HIGH-STAKES', zonesColor: '#ff0000',
    desc: 'The summit. Season-end cosmetics are reserved for those who reach this.',
    rewards: ['Ranked Emblem', 'Gun Style', 'Title'],
  },
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
  { q: 'When does ranked mode launch?',                    a: 'Ranked Mode launches March 21, 2026 at 10AM PT. The first weekend runs March 21–24. This is a beta — stats, thresholds, and systems are subject to change.' },
  { q: 'What is a Holotag?',                               a: 'A Holotag is a mandatory pass you purchase before entering ranked. It adds to your crew\'s score target based on rarity. Higher rarity tags increase both the target and the scoring ceiling. Every Runner must carry a Holotag at all times during a ranked match.' },
  { q: 'What happens if I die in ranked?',                 a: 'Failing to exfiltrate results in a loss of ranked progress equal to your crew\'s combined loss penalty. Your gear is also lost. Holotags can be stolen from your body by enemy Runners.' },
  { q: 'What if I extract without hitting my target?',     a: 'Exfiltrating without meeting the crew score target results in no ranked progress — no gain, no loss. This is your safe exit when a run goes wrong.' },
  { q: 'Can I play ranked solo?',                          a: 'Yes. Solo ranked is fully supported. Thief and Assassin are the strongest solo picks. Rook is banned from ranked entirely.' },
  { q: 'What are the ranked tiers?',                       a: 'Bronze, Silver, Gold, Platinum, Diamond, and Pinnacle — each with three subdivisions (III, II, I). You progress from III (entry) to I (peak) within each tier before advancing. Platinum and above unlocks high-stakes zones.' },
  { q: 'What are the ranked rewards?',                     a: 'Bronze: Ranked Emblem. Silver: Emblem + Player Background. Gold: Emblem + Destroyer Shell Style + Title. Platinum/Diamond: Emblem + Gun Style. Pinnacle: Emblem + Gun Style + Title. Rewards are based on highest rank achieved during the season — not final standing.' },
  { q: 'Do ranked rewards carry over between seasons?',    a: 'Yes. Cosmetics earned through ranked are permanent. Rank progress resets each season. Liaison contract progression carries over.' },
  { q: 'What is the gear ante?',                           a: 'A minimum loadout value threshold you must meet to queue for ranked. You must show up with real gear on the line — low-value loadouts cannot enter ranked.' },
];

// ─── SVG RANK EMBLEM ────────────────────────────────────────
function RankEmblem({ color, size = 80, glow = false }) {
  var s = size;
  var c = Math.floor(s / 2);
  var r1 = Math.floor(s * 0.42);
  var r2 = Math.floor(s * 0.28);
  var r3 = Math.floor(s * 0.12);
  return (
    <svg width={s} height={s} viewBox={'0 0 ' + s + ' ' + s} style={{ flexShrink: 0, filter: glow ? 'drop-shadow(0 0 8px ' + color + '88)' : 'none' }}>
      {/* Outer ring */}
      <circle cx={c} cy={c} r={r1} fill="none" stroke={color} strokeWidth="2" opacity="0.9" />
      {/* Crosshair lines */}
      <line x1={c - r1 - 2} y1={c} x2={c - r2 - 4} y2={c} stroke={color} strokeWidth="2" opacity="0.7" />
      <line x1={c + r2 + 4} y1={c} x2={c + r1 + 2} y2={c} stroke={color} strokeWidth="2" opacity="0.7" />
      <line x1={c} y1={c - r1 - 2} x2={c} y2={c - r2 - 4} stroke={color} strokeWidth="2" opacity="0.7" />
      <line x1={c} y1={c + r2 + 4} x2={c} y2={c + r1 + 2} stroke={color} strokeWidth="2" opacity="0.7" />
      {/* Inner ring */}
      <circle cx={c} cy={c} r={r2} fill="none" stroke={color} strokeWidth="1.5" opacity="0.7" />
      {/* Center dot cluster */}
      <circle cx={c} cy={c} r={r3} fill={color} opacity="0.9" />
      <circle cx={c - r3 * 2.2} cy={c} r={r3 * 0.7} fill={color} opacity="0.6" />
      <circle cx={c + r3 * 2.2} cy={c} r={r3 * 0.7} fill={color} opacity="0.6" />
      <circle cx={c} cy={c - r3 * 2.2} r={r3 * 0.7} fill={color} opacity="0.6" />
      <circle cx={c} cy={c + r3 * 2.2} r={r3 * 0.7} fill={color} opacity="0.6" />
      {/* Outer tick marks */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map(function(deg, i) {
        var rad = (deg * Math.PI) / 180;
        var x1 = c + Math.cos(rad) * (r1 - 6);
        var y1 = c + Math.sin(rad) * (r1 - 6);
        var x2 = c + Math.cos(rad) * (r1 - 2);
        var y2 = c + Math.sin(rad) * (r1 - 2);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="1.5" opacity="0.5" />;
      })}
    </svg>
  );
}

// ─── DIVISION PIPS ──────────────────────────────────────────
function DivisionPips({ color }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {['III', 'II', 'I'].map(function(d) {
        return (
          <span key={d} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: color, background: color + '18', border: '1px solid ' + color + '44', borderRadius: 2, padding: '2px 5px', letterSpacing: 1 }}>{d}</span>
        );
      })}
    </div>
  );
}

// ─── COUNTDOWN ──────────────────────────────────────────────
function Countdown() {
  var [parts, setParts] = useState({ d: '00', h: '00', m: '00', s: '00' });
  var [launched, setLaunched] = useState(false);

  useEffect(function() {
    var target = new Date('2026-03-21T17:00:00Z').getTime();
    function tick() {
      var diff = target - Date.now();
      if (diff <= 0) { setLaunched(true); setParts({ d: '00', h: '00', m: '00', s: '00' }); return; }
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
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, color: '#00ff88', letterSpacing: 4, textShadow: '0 0 30px rgba(0,255,136,0.4)' }}>RANKED IS LIVE</div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,215,0,0.5)', letterSpacing: 4, marginBottom: 12, textAlign: 'center' }}>LAUNCHES IN</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
        {[{ val: parts.d, label: 'DAYS' }, { val: parts.h, label: 'HOURS' }, { val: parts.m, label: 'MIN' }, { val: parts.s, label: 'SEC' }].map(function(unit, i) {
          return (
            <div key={unit.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, color: '#ffd700', lineHeight: 1, background: 'rgba(255,215,0,0.06)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 6, padding: '12px 16px', minWidth: 70, textShadow: '0 0 20px rgba(255,215,0,0.3)' }}>
                  {unit.val}
                </div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,215,0,0.4)', letterSpacing: 2, marginTop: 6 }}>{unit.label}</div>
              </div>
              {i < 3 && <div style={{ fontFamily: 'Orbitron, monospace', fontSize: '1.8rem', fontWeight: 900, color: 'rgba(255,215,0,0.3)', marginBottom: 18 }}>:</div>}
            </div>
          );
        })}
      </div>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,215,0,0.35)', letterSpacing: 2, marginTop: 12, textAlign: 'center' }}>
        FIRST WEEKEND — MAR 21 10AM PT → MAR 24 10AM PT
      </div>
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────
export default function RankedPage() {
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
    <main style={{ backgroundColor: '#0d0f0d', minHeight: '100vh', color: '#fff', paddingTop: 80, overflowX: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <style>{`
        @keyframes rPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes rReveal { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        .r-tier-btn { transition: all 0.15s ease; }
        .r-tier-btn:hover { transform: translateY(-2px); }
        .r-card { transition: border-color 0.2s, transform 0.15s; }
        .r-card:hover { transform: translateY(-2px); }
        .r-faq { transition: background 0.15s; cursor: pointer; }
        .r-faq:hover { background: rgba(255,255,255,0.03) !important; }
        .r-shell { transition: background 0.15s; }
        .r-shell:hover { background: rgba(255,255,255,0.025) !important; }
      `}</style>

      {/* ── BETA NOTICE ─────────────────────────────── */}
      <div style={{ background: 'rgba(255,136,0,0.06)', borderBottom: '1px solid rgba(255,136,0,0.15)', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ff8800', background: 'rgba(255,136,0,0.15)', border: '1px solid rgba(255,136,0,0.3)', borderRadius: 3, padding: '2px 8px', letterSpacing: 2, flexShrink: 0 }}>BETA</span>
        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>
          <strong style={{ color: 'rgba(255,136,0,0.8)' }}>Ranked mode is in beta for Season 1.</strong> Bungie is actively looking for feedback to continue shaping Ranked. Stats, thresholds, and systems are subject to change.
        </span>
      </div>

      {/* ── HERO ─────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '56px 24px 64px' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.018, backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,1) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 100%, rgba(0,40,0,0.6) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: '#ffd700', background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2 }}>LAUNCHING SOON</span>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '4px 12px', letterSpacing: 2 }}>SEASON 1</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 48, alignItems: 'center' }}>
            {/* Left */}
            <div>
              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', fontWeight: 900, letterSpacing: 2, lineHeight: 1.0, margin: '0 0 16px' }}>
                RANKED<br /><span style={{ color: '#ffd700', textShadow: '0 0 40px rgba(255,215,0,0.3)' }}>MODE</span>
              </h1>
              <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, maxWidth: 440, marginBottom: 28 }}>
                Put your survival skills to the test, climb the competitive ladder, and prove you're a top Runner on Tau Ceti. Six ranks. Three subdivisions each. Bring your best loadout, set your score target, and survive extraction.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/advisor" style={{ padding: '10px 20px', background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.35)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 2 }}>
                  [D] BUILD ADVISOR &rarr;
                </Link>
                <Link href="/meta" style={{ padding: '10px 20px', background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.2)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#00f5ff', letterSpacing: 2 }}>
                  [N] RANKED META &rarr;
                </Link>
              </div>
            </div>

            {/* Right — countdown + emblem parade */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <Countdown />
              {/* Tier emblem parade */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                {TIERS.map(function(tier, i) {
                  return (
                    <div key={tier.name} style={{ opacity: i === 0 ? 1 : 1 - i * 0.1, transform: 'scale(' + (1 - i * 0.03) + ')' }}>
                      <RankEmblem color={tier.color} size={36} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RANK TIERS ───────────────────────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 6, textAlign: 'center', marginBottom: 28 }}>RANK TIERS</div>

        {/* Tier selector */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
          {TIERS.map(function(tier) {
            var active = activeTier === tier.name;
            return (
              <button key={tier.name} className="r-tier-btn" onClick={function() { setActiveTier(tier.name); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '12px 16px', background: active ? tier.bg : '#0a0a0a', border: '1px solid ' + (active ? tier.border : 'rgba(255,255,255,0.06)'), borderBottom: '2px solid ' + (active ? tier.color : 'transparent'), borderRadius: '6px 6px 0 0', cursor: 'pointer', flexShrink: 0, minWidth: 80 }}>
                <RankEmblem color={tier.color} size={40} glow={active} />
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: active ? tier.color : 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>{tier.name.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Selected tier detail */}
        <div style={{ background: selectedTier.bg, border: '1px solid ' + selectedTier.border, borderRadius: '0 8px 8px 8px', padding: '28px 28px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, alignItems: 'center' }}>
          <RankEmblem color={selectedTier.color} size={72} glow={true} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 26, fontWeight: 900, color: selectedTier.color, textShadow: '0 0 20px ' + selectedTier.color + '44' }}>{selectedTier.name.toUpperCase()}</span>
              <DivisionPips color={selectedTier.color} />
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 12 }}>{selectedTier.desc}</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', background: selectedTier.zonesColor + '15', border: '1px solid ' + selectedTier.zonesColor + '33', borderRadius: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: selectedTier.zonesColor }} />
              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: selectedTier.zonesColor, letterSpacing: 2 }}>{selectedTier.zones} ZONES</span>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 8 }}>TIER REWARDS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end' }}>
              {selectedTier.rewards.map(function(r) {
                return <span key={r} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: selectedTier.color, background: selectedTier.color + '14', border: '1px solid ' + selectedTier.color + '30', borderRadius: 3, padding: '3px 10px', letterSpacing: 1 }}>{r.toUpperCase()}</span>;
              })}
            </div>
          </div>
        </div>

        {/* All tiers grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8, marginTop: 8 }}>
          {TIERS.map(function(tier) {
            return (
              <div key={tier.name} className="r-card" onClick={function() { setActiveTier(tier.name); }}
                style={{ display: 'flex', gap: 14, alignItems: 'center', background: '#0a0a0a', border: '1px solid ' + tier.color + '18', borderLeft: '3px solid ' + tier.color, borderRadius: 6, padding: '14px 16px', cursor: 'pointer' }}>
                <RankEmblem color={tier.color} size={42} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: tier.color, letterSpacing: 1 }}>{tier.name.toUpperCase()}</span>
                    <DivisionPips color={tier.color} />
                  </div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{tier.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, padding: '12px 16px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
          <span style={{ color: '#ffd700' }}>●</span> Each rank contains three subdivisions — III, II, and I — progressing from III (entry) to I (peak). Reach Rank I to advance to the next tier.
        </div>
      </section>

      {/* ── HOLOTAGS + ZONES ─────────────────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>

          {/* Holotags */}
          <div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 6, textAlign: 'center', marginBottom: 14 }}>HOLOTAGS</div>
            <div style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: 8, padding: '22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 48, height: 48, background: 'rgba(255,215,0,0.1)', border: '1px solid rgba(255,215,0,0.3)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 22 }}>🏷</span>
                </div>
                <div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 700, color: '#ffd700', letterSpacing: 1, marginBottom: 4 }}>HOLOTAG</div>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>Mandatory passes for Runners entering Ranked play. Each Holotag adds to the crew's score target based on rarity — higher rarity tags also provide greater scoring capacity.</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: '↗', text: 'Holotag rarity increases crew score target — and scoring ceiling.' },
                  { icon: '◎', text: 'Holotags can be stolen from defeated Runners in the field.' },
                  { icon: '◈', text: 'Every Runner must carry a Holotag at all times during a Ranked match.' },
                ].map(function(item, i) {
                  return (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: '#ffd700', opacity: 0.6, flexShrink: 0, marginTop: 1 }}>{item.icon}</span>
                      <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Ranked Zones */}
          <div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 6, textAlign: 'center', marginBottom: 14 }}>RANKED ZONES</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 8, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', animation: 'rPulse 2s ease-in-out infinite' }} />
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#00ff88', letterSpacing: 1 }}>LOW-STAKES ZONES</span>
                  </div>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00ff88', background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>All Ranks</span>
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>Available to all Runners across every rank. Standard extraction risk with controlled competition density. The foundational Ranked experience.</div>
              </div>

              <div style={{ background: 'rgba(255,0,0,0.04)', border: '1px solid rgba(255,0,0,0.15)', borderRadius: 8, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff0000', animation: 'rPulse 2s ease-in-out infinite' }} />
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#ff0000', letterSpacing: 1 }}>HIGH-STAKES ZONES</span>
                  </div>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff0000', background: 'rgba(255,0,0,0.1)', border: '1px solid rgba(255,0,0,0.25)', borderRadius: 3, padding: '2px 8px', letterSpacing: 1 }}>Platinum+</span>
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 12 }}>Unlocked at Platinum rank. Greater risk, greater loot density, harder competition. Only the most coordinated crews thrive here.</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {TIERS.slice(3).map(function(t) {
                    return <RankEmblem key={t.name} color={t.color} size={28} />;
                  })}
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>and above</span>
                </div>
              </div>

              <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 14 }}>↻</span>
                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>Ranked zones rotate each week.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STAKES & CONSEQUENCES ────────────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 6, textAlign: 'center', marginBottom: 20 }}>STAKES & CONSEQUENCES</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
          {[
            { icon: '↗', color: '#00ff88', title: 'SUCCESSFUL EXFIL — SCORE MET',    body: 'You exfiltrate and meet or exceed the crew\'s score target. Ranked progress is awarded.' },
            { icon: '△', color: '#ff8800', title: 'EXFIL — SCORE NOT MET',            body: 'Failing to meet the crew\'s score target while still exfiltrating results in no Ranked progress.' },
            { icon: '↘', color: '#ff0000', title: 'FAILED EXFIL',                     body: 'Failing to exfiltrate results in a loss of Ranked progress equal to your crew\'s combined loss penalty.' },
            { icon: '◎', color: '#ffd700', title: 'HOLOTAG THEFT',                    body: 'Holotags stolen from defeated Runners are yours to keep — they contribute score and capacity to your crew.' },
          ].map(function(item, i) {
            return (
              <div key={i} className="r-card" style={{ background: '#0a0a0a', border: '1px solid ' + item.color + '18', borderTop: '2px solid ' + item.color + '55', borderRadius: 8, padding: '18px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 14, color: item.color }}>{item.icon}</span>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: item.color, letterSpacing: 1, lineHeight: 1.3 }}>{item.title}</span>
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{item.body}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SEASON 1 REWARDS ─────────────────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 6, textAlign: 'center', marginBottom: 20 }}>SEASON 1 REWARDS</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10, marginBottom: 14 }}>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>🏆</span>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#ffd700', letterSpacing: 1 }}>SEASONAL REWARDS</span>
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              Each season brings a unique set of rewards earnable only through Ranked play. You'll secure rewards based on the <strong style={{ color: '#fff' }}>highest rank you achieved during the season</strong> — not your final standing. Every ranked tier earns you a Ranked Emblem specific to that rank.
            </div>
          </div>
          <div style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 8, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>📦</span>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#00f5ff', letterSpacing: 1 }}>RANK-UP PACKAGES</span>
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
              Each time you earn a new rank, you'll receive a <strong style={{ color: '#fff' }}>loot package</strong> containing gear and room keys to randomly-selected zones.
            </div>
          </div>
        </div>

        {/* Rewards per tier */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[...TIERS].reverse().map(function(tier) {
            return (
              <div key={tier.name} className="r-shell" style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '14px 18px' }}>
                <RankEmblem color={tier.color} size={36} />
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: tier.color, letterSpacing: 1, minWidth: 90 }}>{tier.name.toUpperCase()}</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                  {tier.rewards.map(function(r) {
                    return (
                      <span key={r} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, padding: '3px 10px', letterSpacing: 1 }}>
                        {r}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, padding: '12px 16px', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ color: '#ffd700', flexShrink: 0 }}>★</span>
          <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Each season brings entirely new rewards. Cosmetics earned through Ranked are permanent to your account — wear them as proof of your standing on Tau Ceti.</span>
        </div>
      </section>

      {/* ── SHELL TIER LIST ───────────────────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 6, textAlign: 'center', marginBottom: 20 }}>RANKED SHELL TIER LIST</div>

        <div style={{ display: 'flex', gap: 3, marginBottom: 16, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden', width: 'fit-content' }}>
          {['solo', 'squad'].map(function(mode) {
            var active = shellMode === mode;
            return (
              <button key={mode} onClick={function() { setShellMode(mode); }} style={{ padding: '10px 28px', background: active ? 'rgba(255,215,0,0.08)' : 'transparent', border: 'none', borderBottom: '2px solid ' + (active ? '#ffd700' : 'transparent'), fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: active ? '#ffd700' : 'rgba(255,255,255,0.3)', letterSpacing: 2, cursor: 'pointer', transition: 'all 0.15s' }}>
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
              <div key={shell.name} className="r-shell" style={{ display: 'grid', gridTemplateColumns: '130px 60px 1fr', gap: 16, alignItems: 'center', background: isBanned ? 'rgba(255,0,0,0.02)' : '#0a0a0a', border: '1px solid ' + (isBanned ? 'rgba(255,0,0,0.1)' : shell.color + '15'), borderLeft: '3px solid ' + (isBanned ? '#ff000055' : shell.color + '88'), padding: '13px 18px', borderRadius: 4, opacity: isBanned ? 0.65 : 1 }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: isBanned ? 'rgba(255,255,255,0.3)' : shell.color, letterSpacing: 1 }}>{shell.name.toUpperCase()}</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: gradeColor, background: gradeColor + '18', border: '1px solid ' + gradeColor + '44', borderRadius: 3, padding: '3px 10px', letterSpacing: 1, textAlign: 'center' }}>{isBanned ? '🚫' : grade}</span>
                <span style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: isBanned ? 'rgba(255,0,0,0.5)' : 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{shell.why}</span>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/advisor" style={{ padding: '10px 20px', background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.3)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 2 }}>
            GET YOUR RANKED BUILD &rarr;
          </Link>
          <Link href="/shells" style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>
            SHELL GUIDES &rarr;
          </Link>
        </div>
      </section>

      {/* ── LIVE INTEL ───────────────────────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid rgba(0,245,255,0.1)', borderRadius: 10, padding: '28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', letterSpacing: 3, marginBottom: 10 }}>CYBERNETICPUNKS — LIVE RANKED INTEL</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.2, marginBottom: 10 }}>5 AI EDITORS.<br /><span style={{ color: '#00f5ff' }}>UPDATED EVERY 6H.</span></div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>NEXUS tracks the ranked tier list. DEXTER grades builds by Holotag viability. CIPHER analyzes ranked plays. MIRANDA publishes shell guides.</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/meta',        color: '#00f5ff', label: '⬡ LIVE RANKED TIER LIST',   desc: 'Updated every 6h by NEXUS' },
              { href: '/advisor',     color: '#ff8800', label: '⬢ BUILD ADVISOR',           desc: 'Get your ranked loadout' },
              { href: '/shells',      color: '#ffd700', label: 'SHELL GUIDES',              desc: 'Full ability breakdowns' },
              { href: '/intel/nexus', color: '#00f5ff', label: '⬡ NEXUS META ANALYSIS',     desc: 'Full ranked breakdowns' },
            ].map(function(l) {
              return (
                <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: l.color + '08', border: '1px solid ' + l.color + '1a', borderRadius: 5, textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: l.color, letterSpacing: 1 }}>{l.label}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 1 }}>{l.desc}</div>
                  </div>
                  <span style={{ color: l.color, opacity: 0.5, fontSize: 12 }}>&rarr;</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 6, textAlign: 'center', marginBottom: 20 }}>RANKED FAQ</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {FAQS.map(function(faq, i) {
            var isOpen = openFaq === i;
            return (
              <div key={i} className="r-faq" onClick={function() { setOpenFaq(isOpen ? null : i); }}
                style={{ background: isOpen ? 'rgba(255,215,0,0.03)' : '#0a0a0a', border: '1px solid ' + (isOpen ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)'), borderLeft: '3px solid ' + (isOpen ? '#ffd700' : 'rgba(255,255,255,0.06)'), borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', gap: 16 }}>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, fontWeight: 600, color: isOpen ? '#fff' : 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>{faq.q}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 14, color: isOpen ? '#ffd700' : 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{isOpen ? '−' : '+'}</div>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 18px 16px', fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 14 }}>
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
