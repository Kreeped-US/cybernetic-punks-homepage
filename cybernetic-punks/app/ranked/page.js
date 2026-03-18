'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ─── CONSTANTS ──────────────────────────────────────────────
const TIERS = [
  { name: 'Bronze',   roman: 'I–III', color: '#cd7f32', glow: 'rgba(205,127,50,0.25)',  shadow: 'rgba(205,127,50,0.1)',  desc: 'Entry level. Learn the loop. Low Holotag targets. Best place to build habits before the stakes get real.', requirement: 'Account Level 25 + All Factions Unlocked', zones: 'Standard Zones' },
  { name: 'Silver',   roman: 'I–III', color: '#c0c0c0', glow: 'rgba(192,192,192,0.2)',  shadow: 'rgba(192,192,192,0.08)', desc: 'Targets increase. Runners start hunting your Holotag. Extraction discipline starts to matter here.', requirement: 'Bronze III cleared', zones: 'Standard Zones' },
  { name: 'Gold',     roman: 'I–III', color: '#ffd700', glow: 'rgba(255,215,0,0.25)',   shadow: 'rgba(255,215,0,0.1)',   desc: 'Mid-tier. Gear ante gets serious. Consistent extraction skills required to hold progress.', requirement: 'Silver III cleared', zones: 'Standard Zones' },
  { name: 'Platinum', roman: 'I–III', color: '#00f5ff', glow: 'rgba(0,245,255,0.25)',   shadow: 'rgba(0,245,255,0.08)', desc: 'High competition. High-stakes zones unlock. Top loadouts everywhere. Map knowledge becomes critical.', requirement: 'Gold III cleared', zones: 'Standard + High-Stakes Zones' },
  { name: 'Diamond',  roman: 'I–III', color: '#88ddff', glow: 'rgba(136,221,255,0.25)', shadow: 'rgba(136,221,255,0.08)', desc: 'Near-elite. Players run efficiently and punish every mistake. Every extraction decision carries real weight.', requirement: 'Platinum III cleared', zones: 'Standard + High-Stakes Zones' },
  { name: 'Pinnacle', roman: 'I–III', color: '#ff8800', glow: 'rgba(255,136,0,0.3)',    shadow: 'rgba(255,136,0,0.12)', desc: 'Elite tier. Top percentile of the playerbase. Consistent high-value extractions every single run.', requirement: 'Diamond III cleared', zones: 'Standard + High-Stakes Zones' },
];

const HOLOTAG_TIERS = [
  { name: 'Bronze Tag',   color: '#cd7f32', target: '~2,000',  risk: 'Low',    reward: 'Low',    desc: 'Safe entry. Learn extraction without burning serious gear.' },
  { name: 'Silver Tag',   color: '#c0c0c0', target: '~5,000',  risk: 'Medium', reward: 'Medium', desc: 'Runner hunting starts here. Stay alert or lose progress.' },
  { name: 'Gold Tag',     color: '#ffd700', target: '~10,000', risk: 'High',   reward: 'High',   desc: 'Serious loot requirement. One death costs a full session.' },
  { name: 'Platinum Tag', color: '#00f5ff', target: '~15,000', risk: 'Very High', reward: 'Very High', desc: 'Only for confident runners. Death hurts badly.' },
  { name: 'Diamond Tag',  color: '#88ddff', target: '~25,000', risk: 'Extreme', reward: 'Extreme', desc: 'Elite runs only. Maximum reward, maximum consequence.' },
];

const SHELLS_RANKED = [
  { name: 'Thief',     color: '#ffd700', solo: 'S', squad: 'A', why: 'Extraction speed is directly ranked currency. Built for exactly this mode.' },
  { name: 'Assassin',  color: '#cc44ff', solo: 'A', squad: 'B', why: 'Active Camo lets you disengage from fights you cannot win — critical in ranked.' },
  { name: 'Vandal',    color: '#ff8800', solo: 'A', squad: 'A', why: 'Most forgiving movement options. Disrupt Cannon punishes poor positioning.' },
  { name: 'Recon',     color: '#00f5ff', solo: 'B', squad: 'S', why: 'Echo Pulse is information — knowing enemy positions before committing is S-tier ranked intel.' },
  { name: 'Triage',    color: '#00ff88', solo: 'C', squad: 'S', why: 'Squad sustain in high-value extractions. Weak without teammates to support.' },
  { name: 'Destroyer', color: '#ff3333', solo: 'B', squad: 'B', why: 'High kill potential but ranked punishes aggression. Use carefully.' },
  { name: 'Rook',      color: '#aaaaaa', solo: 'N/A', squad: 'N/A', why: 'BANNED FROM RANKED. Sponsored Kits also banned. No exceptions.' },
];

const RULES = [
  { icon: '◈', color: '#ff0000', title: 'NO ROOK. NO SPONSORED KITS.', body: 'Confirmed by Bungie. Rook is banned from ranked entirely. Sponsored Kits are banned. You must field a real loadout.' },
  { icon: '⬡', color: '#00f5ff', title: 'GEAR ANTE REQUIRED',          body: 'You must meet a minimum loadout value threshold to queue ranked. Show up with gear on the line or you cannot enter.' },
  { icon: '⬢', color: '#ff8800', title: 'ACCOUNT LEVEL 25 REQUIRED',   body: 'Must reach Runner Level 25 AND have all six factions unlocked before the ranked queue becomes available.' },
  { icon: '◎', color: '#9b5de5', title: 'HOLOTAGS ARE LOOTABLE',        body: 'Kill a ranked runner and you can loot their Holotag. This increases your own score cap — PvP is a ranked strategy, not just survival.' },
  { icon: '◇', color: '#00ff88', title: 'SAFE EXIT EXISTS',             body: 'Extract before hitting your target and your rank stays unchanged. No gain, no loss. Use this when the run goes wrong.' },
  { icon: '◈', color: '#ffd700', title: 'ZONES ROTATE WEEKLY',          body: 'Platinum and above unlock high-stakes zones. Zone rotations change weekly — adapt your strategy each week.' },
];

const FAQS = [
  { q: 'When does ranked mode launch?',                     a: 'Ranked Mode launches March 21, 2026 — within Season 1: Death is the First Step.' },
  { q: 'What is a Holotag in Marathon ranked?',             a: 'A Holotag is an item you purchase before entering ranked. It sets your extraction score target. Extract with enough loot value and you gain rank progress. Die and you lose gear plus rank points equal to your full Holotag target. Other Runners can loot your Holotag from your body.' },
  { q: 'What happens if you die in ranked?',                a: 'You lose your equipped gear AND rank points equal to your full Holotag target value. Death is punishing. Survival and smart disengagement matter as much as combat skill.' },
  { q: 'What if you extract without meeting the target?',   a: 'Nothing happens. Your rank stays exactly where it was — no progress, no loss. This is your escape valve when a run goes bad.' },
  { q: 'Can you play ranked solo?',                         a: 'Yes. Solo ranked is fully supported with its own progression track. Thief and Assassin are the strongest solo picks.' },
  { q: 'What are the six ranked tiers?',                    a: 'Bronze, Silver, Gold, Platinum, Diamond, and Pinnacle — each with three divisions (I, II, III). Platinum and above unlocks high-stakes zones. A potential Master tier above Pinnacle may exist for the top 500.' },
  { q: 'Do ranked rewards carry over between seasons?',     a: 'Cosmetics, titles, and milestone rewards are permanent. Rank progress, gear, contracts, faction progress, and player level reset each season. Liaison contract progress carries over.' },
  { q: 'What is the best shell for ranked?',                a: 'Thief is S-tier solo ranked — extraction efficiency maps directly to Holotag success. Recon and Triage are S-tier squad ranked. Rook is banned from ranked entirely.' },
  { q: 'Does killing enemies help in ranked?',              a: 'Yes. Defeating Runners and collecting their Holotags increases your score cap significantly. PvP is a ranked strategy — high risk, high reward.' },
];

const TIER_COLORS = { S: '#ff0000', A: '#ff8800', B: '#00f5ff', C: '#aaaaaa', 'N/A': '#333333' };

function GradeTag({ grade }) {
  var color = TIER_COLORS[grade] || '#555';
  return (
    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color, background: color + '18', border: '1px solid ' + color + '44', borderRadius: 3, padding: '3px 10px', letterSpacing: 1, flexShrink: 0 }}>
      {grade}
    </span>
  );
}

function Countdown() {
  var [timeLeft, setTimeLeft] = useState('');
  var [launched, setLaunched] = useState(false);

  useEffect(function() {
    var target = new Date('2026-03-21T17:00:00Z').getTime();
    function tick() {
      var now = Date.now();
      var diff = target - now;
      if (diff <= 0) { setLaunched(true); setTimeLeft('LIVE NOW'); return; }
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        (d > 0 ? d + 'D ' : '') +
        String(h).padStart(2,'0') + 'H ' +
        String(m).padStart(2,'0') + 'M ' +
        String(s).padStart(2,'0') + 'S'
      );
    }
    tick();
    var id = setInterval(tick, 1000);
    return function() { clearInterval(id); };
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,215,0,0.5)', letterSpacing: 4, marginBottom: 8 }}>
        {launched ? 'RANKED IS LIVE' : 'RANKED LAUNCHES IN'}
      </div>
      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 6vw, 52px)', fontWeight: 900, color: '#ffd700', letterSpacing: 4, lineHeight: 1, textShadow: '0 0 40px rgba(255,215,0,0.4)' }}>
        {timeLeft || '——'}
      </div>
      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,215,0,0.35)', letterSpacing: 3, marginTop: 8 }}>MARCH 21, 2026</div>
    </div>
  );
}

export default function RankedPage() {
  var [activeShellMode, setActiveShellMode] = useState('solo');
  var [openFaq, setOpenFaq] = useState(null);

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
        @keyframes rPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.9)} }
        @keyframes rScan  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        @keyframes rReveal { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rGlow  { 0%,100%{box-shadow:0 0 20px rgba(255,215,0,0.2)} 50%{box-shadow:0 0 40px rgba(255,215,0,0.4)} }
        .r-card { transition: border-color 0.2s, transform 0.2s; }
        .r-card:hover { transform: translateY(-2px); }
        .r-faq  { transition: background 0.15s; cursor: pointer; }
        .r-faq:hover  { background: rgba(255,255,255,0.03) !important; }
        .r-tier { transition: background 0.2s, border-color 0.2s; }
        .r-tier:hover { background: rgba(255,255,255,0.025) !important; }
      `}</style>

      {/* ── SCAN LINE EFFECT ─────────────────────────── */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, transparent, #ffd700, transparent)', animation: 'rScan 8s linear infinite', pointerEvents: 'none', zIndex: 0, opacity: 0.15 }} />

      {/* ── LIVE ALERT BANNER ────────────────────────── */}
      <div style={{ background: 'linear-gradient(90deg, rgba(255,215,0,0.06), rgba(255,215,0,0.12), rgba(255,215,0,0.06))', borderTop: '1px solid rgba(255,215,0,0.2)', borderBottom: '1px solid rgba(255,215,0,0.2)', padding: '12px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: '#ffd700', animation: 'rPulse 2s ease-in-out infinite' }} />
        <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 11, color: '#ffd700', letterSpacing: 3 }}>
          ⚡ RANKED MODE DROPS MARCH 21 — CONFIRMED BY BUNGIE — HOLOTAG SEASON 1 —&nbsp;
          <Link href="/ranked#holotag" style={{ color: '#ffd700', textDecoration: 'underline' }}>FULL SYSTEM BREAKDOWN BELOW</Link>
        </span>
      </div>

      {/* ── HERO ─────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '60px 24px 80px' }}>
        {/* Background grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.025, backgroundImage: 'linear-gradient(rgba(255,215,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,215,0,1) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />
        {/* Radial glow */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 800, height: 500, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,215,0,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 48, alignItems: 'center' }}>

            {/* Left — title */}
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '5px 14px', background: 'rgba(255,0,0,0.08)', border: '1px solid rgba(255,0,0,0.25)', borderRadius: 4, marginBottom: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff0000', animation: 'rPulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff0000', letterSpacing: 3 }}>CYBERNETICPUNKS — RANKED INTELLIGENCE</span>
              </div>
              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: 3, lineHeight: 1.05, margin: '0 0 16px' }}>
                MARATHON<br />
                <span style={{ color: '#ffd700', textShadow: '0 0 40px rgba(255,215,0,0.3)' }}>RANKED</span><br />
                MODE
              </h1>
              <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 17, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 460, marginBottom: 28 }}>
                The most brutal ranked system in extraction gaming. Buy a Holotag. Meet the gear ante. Extract high-value loot. Die and lose everything. This is the complete intelligence brief.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { href: '/advisor', color: '#ff8800', label: '[D] BUILD ADVISOR' },
                  { href: '/meta',    color: '#00f5ff', label: '[N] RANKED META'   },
                  { href: '/shells',  color: '#ffd700', label: 'SHELL GUIDES'       },
                ].map(function(l) {
                  return (
                    <Link key={l.href} href={l.href} style={{ padding: '10px 18px', background: l.color + '12', border: '1px solid ' + l.color + '44', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: l.color, letterSpacing: 2 }}>
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Right — countdown */}
            <div style={{ background: 'rgba(255,215,0,0.04)', border: '1px solid rgba(255,215,0,0.15)', borderRadius: 12, padding: '40px 32px', animation: 'rGlow 4s ease-in-out infinite', textAlign: 'center' }}>
              <Countdown />
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(255,215,0,0.1)', display: 'flex', justifyContent: 'center', gap: 28 }}>
                {[
                  { val: '6',   label: 'TIERS'      },
                  { val: '3',   label: 'DIVISIONS'  },
                  { val: '6',   label: 'SHELLS'     },
                  { val: '∞',   label: 'RISK'       },
                ].map(function(s) {
                  return (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: '#ffd700', lineHeight: 1 }}>{s.val}</div>
                      <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginTop: 4 }}>{s.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CONFIRMED INTEL STRIP ────────────────────── */}
      <div style={{ background: 'rgba(255,0,0,0.04)', borderTop: '1px solid rgba(255,0,0,0.1)', borderBottom: '1px solid rgba(255,0,0,0.1)', padding: '20px 24px', maxWidth: 1100, margin: '0 auto 60px', borderRadius: 8 }}>
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff0000', letterSpacing: 4, marginBottom: 14 }}>CONFIRMED BY BUNGIE — PATCH 1.0.5</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            '✓ Launches March 21, 2026',
            '✓ Bronze → Silver → Gold → Platinum → Diamond → Pinnacle',
            '✓ Each tier has 3 divisions (I, II, III)',
            '✓ Rook banned from ranked',
            '✓ Sponsored Kits banned',
            '✓ Account Level 25 + All Factions required',
            '✓ Platinum+ unlocks high-stakes zones',
            '✓ Zones rotate weekly',
            '✓ Cosmetic rewards only — no pay advantage',
            '✓ Milestone cosmetics are permanent',
          ].map(function(item, i) {
            return <div key={i} style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 1 }}>{item}</div>;
          })}
        </div>
      </div>

      {/* ── HOLOTAG SYSTEM ───────────────────────────── */}
      <section id="holotag" style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto', scrollMarginTop: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ffd700', letterSpacing: 4, padding: '4px 12px', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 3 }}>SYSTEM BREAKDOWN</div>
        </div>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 900, letterSpacing: 3, margin: '0 0 8px', color: '#ffd700' }}>THE HOLOTAG SYSTEM</h2>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 32, maxWidth: 600 }}>
          The Holotag is your entry ticket and your biggest liability. Higher tiers mean bigger gains — and bigger consequences when you die.
        </p>

        {/* Loop flow */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 3, marginBottom: 32 }}>
          {[
            { n: '01', label: 'GEAR ANTE',    desc: 'Meet minimum loadout value',   color: '#555555' },
            { n: '02', label: 'BUY HOLOTAG',  desc: 'Sets your extraction target',  color: '#ffd700' },
            { n: '03', label: 'DROP IN',      desc: 'Enter the ranked zone',        color: '#00f5ff' },
            { n: '04', label: 'LOOT & FIGHT', desc: 'Hit your credit target',       color: '#ff8800' },
            { n: '05', label: 'EXTRACT',      desc: 'Gain rank progress',           color: '#00ff88' },
          ].map(function(step, i) {
            return (
              <div key={i} style={{ background: '#0a0a0a', borderTop: '3px solid ' + step.color, padding: '16px 14px', position: 'relative' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 9, color: step.color, opacity: 0.5, marginBottom: 8 }}>{step.n}</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 1, marginBottom: 6 }}>{step.label}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{step.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Risk/Reward split */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 32 }}>
          <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderLeft: '3px solid #00ff88', borderRadius: 8, padding: '20px 22px' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00ff88', letterSpacing: 3, marginBottom: 10 }}>IF YOU EXTRACT ABOVE TARGET</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#00ff88', marginBottom: 6 }}>RANK UP</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Gain rank progress proportional to your Holotag tier. Kill enemy Runners and loot their tags to stack your score cap even higher.</div>
          </div>
          <div style={{ background: 'rgba(0,245,255,0.04)', border: '1px solid rgba(0,245,255,0.15)', borderLeft: '3px solid #00f5ff', borderRadius: 8, padding: '20px 22px' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', letterSpacing: 3, marginBottom: 10 }}>IF YOU EXTRACT BELOW TARGET</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#00f5ff', marginBottom: 6 }}>NO CHANGE</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Safe exit. Your rank stays exactly where it was. No progress, no loss. Use this when the run falls apart.</div>
          </div>
          <div style={{ background: 'rgba(255,0,0,0.04)', border: '1px solid rgba(255,0,0,0.15)', borderLeft: '3px solid #ff0000', borderRadius: 8, padding: '20px 22px' }}>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#ff0000', letterSpacing: 3, marginBottom: 10 }}>IF YOU DIE</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#ff0000', marginBottom: 6 }}>LOSE EVERYTHING</div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Lose your equipped gear AND rank points equal to your full Holotag target. Your Holotag is lootable from your body.</div>
          </div>
        </div>

        {/* Holotag tiers */}
        <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 12 }}>HOLOTAG RISK LADDER</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {HOLOTAG_TIERS.map(function(tag, i) {
            return (
              <div key={i} className="r-tier" style={{ display: 'grid', gridTemplateColumns: '180px 100px 1fr', gap: 16, alignItems: 'center', background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.04)', borderLeft: '3px solid ' + tag.color, padding: '14px 18px', borderRadius: 4 }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: tag.color, letterSpacing: 1 }}>{tag.name}</div>
                <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>TARGET: {tag.target}</div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{tag.desc}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── RANKED TIER LADDER ───────────────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 900, letterSpacing: 3, margin: '0 0 8px' }}>RANKED TIER LADDER</h2>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.35)', marginBottom: 28, maxWidth: 500 }}>Six tiers, three divisions each. Platinum and above unlocks high-stakes zones.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TIERS.map(function(tier, i) {
            return (
              <div key={tier.name} className="r-tier" style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: 20, alignItems: 'center', background: '#0a0a0a', border: '1px solid ' + tier.color + '22', borderLeft: '4px solid ' + tier.color, padding: '20px 22px', borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                {/* Subtle glow bg */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(90deg, ' + tier.shadow + ', transparent)', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: tier.color, textShadow: '0 0 20px ' + tier.glow, lineHeight: 1, marginBottom: 4 }}>{tier.name}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: tier.color, opacity: 0.5, letterSpacing: 2 }}>{tier.roman}</div>
                </div>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 4 }}>{tier.desc}</div>
                  {tier.name === 'Platinum' && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.25)', borderRadius: 3 }}>
                      <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', letterSpacing: 2 }}>HIGH-STAKES ZONES UNLOCKED HERE</span>
                    </div>
                  )}
                </div>
                <div style={{ position: 'relative', zIndex: 1, textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginBottom: 3 }}>ZONES</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: tier.color, opacity: 0.7, letterSpacing: 1 }}>{tier.zones}</div>
                </div>
              </div>
            );
          })}
          {/* Master potential */}
          <div style={{ background: 'rgba(255,0,0,0.03)', border: '1px dashed rgba(255,0,0,0.2)', borderRadius: 6, padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: '#ff0000', opacity: 0.5, letterSpacing: 1, marginBottom: 2 }}>MASTER ?</div>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: 'rgba(255,0,0,0.4)', letterSpacing: 2 }}>UNCONFIRMED</div>
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5 }}>
              Indications suggest a Master tier may exist above Pinnacle for the top 500 global leaderboard. Bungie has not officially confirmed this.
            </div>
          </div>
        </div>
      </section>

      {/* ── SHELL TIER LIST FOR RANKED ───────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 900, letterSpacing: 3, margin: '0 0 8px' }}>SHELL RANKINGS — RANKED MODE</h2>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.35)', marginBottom: 20, maxWidth: 500 }}>Which shells thrive when gear is on the line. Updated by NEXUS — check /meta for live tier shifts.</p>

        {/* Solo / Squad toggle */}
        <div style={{ display: 'flex', gap: 3, marginBottom: 20, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden', width: 'fit-content' }}>
          {['solo', 'squad'].map(function(mode) {
            var active = activeShellMode === mode;
            return (
              <button key={mode} onClick={function() { setActiveShellMode(mode); }} style={{ padding: '10px 28px', background: active ? 'rgba(255,215,0,0.1)' : 'transparent', border: 'none', borderBottom: '2px solid ' + (active ? '#ffd700' : 'transparent'), fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: active ? '#ffd700' : 'rgba(255,255,255,0.3)', letterSpacing: 2, cursor: 'pointer', transition: 'all 0.15s' }}>
                {mode.toUpperCase()}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {SHELLS_RANKED.map(function(shell) {
            var grade = activeShellMode === 'solo' ? shell.solo : shell.squad;
            var gradeColor = TIER_COLORS[grade] || '#555';
            var isBanned = grade === 'N/A';
            return (
              <div key={shell.name} className="r-tier" style={{ display: 'grid', gridTemplateColumns: '140px 70px 1fr', gap: 16, alignItems: 'center', background: isBanned ? 'rgba(255,0,0,0.02)' : '#0a0a0a', border: '1px solid ' + (isBanned ? 'rgba(255,0,0,0.12)' : shell.color + '18'), borderLeft: '3px solid ' + (isBanned ? '#ff0000' : shell.color), padding: '14px 18px', borderRadius: 4, opacity: isBanned ? 0.7 : 1 }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: isBanned ? 'rgba(255,255,255,0.3)' : shell.color, letterSpacing: 1 }}>{shell.name.toUpperCase()}</div>
                <GradeTag grade={grade} />
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: isBanned ? 'rgba(255,0,0,0.5)' : 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>{shell.why}</div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/advisor" style={{ padding: '10px 20px', background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.3)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#ff8800', letterSpacing: 2 }}>
            [D] GET YOUR RANKED BUILD &rarr;
          </Link>
          <Link href="/shells" style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 5, textDecoration: 'none', fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2 }}>
            SHELL GUIDES &rarr;
          </Link>
        </div>
      </section>

      {/* ── KEY RANKED RULES ─────────────────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 900, letterSpacing: 3, margin: '0 0 24px' }}>CONFIRMED RANKED RULES</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
          {RULES.map(function(rule, i) {
            return (
              <div key={i} className="r-card" style={{ background: '#0a0a0a', border: '1px solid ' + rule.color + '18', borderTop: '2px solid ' + rule.color + '66', borderRadius: 8, padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 16, color: rule.color, opacity: 0.7 }}>{rule.icon}</span>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: 1, lineHeight: 1.3 }}>{rule.title}</div>
                </div>
                <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{rule.body}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── LIVE INTEL CALLOUT ───────────────────────── */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(0,245,255,0.04), rgba(255,136,0,0.04))', border: '1px solid rgba(0,245,255,0.12)', borderRadius: 10, padding: '32px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: '#00f5ff', letterSpacing: 3, marginBottom: 10 }}>CYBERNETICPUNKS — LIVE RANKED INTEL</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.2, marginBottom: 10 }}>
              5 AI EDITORS.<br />UPDATED EVERY 6H.
            </div>
            <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              When ranked launches, NEXUS tracks the tier list. DEXTER grades builds by Holotag viability. CIPHER analyzes ranked clutch plays. GHOST monitors community sentiment. MIRANDA publishes shell guides.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { href: '/meta',        color: '#00f5ff', label: '⬡ LIVE RANKED TIER LIST',    desc: 'Updated every 6h by NEXUS' },
              { href: '/builds',      color: '#ff8800', label: '⬢ RANKED BUILD GRADES',      desc: 'Holotag-viable loadouts by DEXTER' },
              { href: '/advisor',     color: '#ff8800', label: '⬢ BUILD ADVISOR',            desc: 'Get your ranked loadout engineered' },
              { href: '/intel/nexus', color: '#00f5ff', label: '⬡ NEXUS META ANALYSIS',      desc: 'Full ranked meta breakdowns' },
            ].map(function(l) {
              return (
                <Link key={l.href} href={l.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: l.color + '08', border: '1px solid ' + l.color + '20', borderRadius: 6, textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: l.color, letterSpacing: 1 }}>{l.label}</div>
                    <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 2 }}>{l.desc}</div>
                  </div>
                  <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: l.color, opacity: 0.6 }}>&rarr;</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────── */}
      <section style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.4rem, 3vw, 1.8rem)', fontWeight: 900, letterSpacing: 3, margin: '0 0 8px' }}>RANKED FAQ</h2>
        <p style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, color: 'rgba(255,255,255,0.35)', marginBottom: 24 }}>Every confirmed question answered.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FAQS.map(function(faq, i) {
            var isOpen = openFaq === i;
            return (
              <div key={i} className="r-faq" style={{ background: isOpen ? 'rgba(255,215,0,0.03)' : '#0a0a0a', border: '1px solid ' + (isOpen ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.05)'), borderLeft: '3px solid ' + (isOpen ? '#ffd700' : 'rgba(255,255,255,0.08)'), borderRadius: 6, overflow: 'hidden' }}
                onClick={function() { setOpenFaq(isOpen ? null : i); }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', gap: 16 }}>
                  <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 15, fontWeight: 600, color: isOpen ? '#fff' : 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>{faq.q}</div>
                  <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 12, color: isOpen ? '#ffd700' : 'rgba(255,255,255,0.2)', flexShrink: 0 }}>{isOpen ? '−' : '+'}</div>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 20px 16px', fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: 14 }}>
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