'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ── STATIC CONFIG ──────────────────────────────────────────────
const TIERS = [
  { name: 'Bronze',   color: '#cd7f32', zones: 'LOW-STAKES',  zonesColor: '#00ff41', desc: 'Entry point. Prove you can survive extraction and meet your score target.', rewards: ['Ranked Emblem'] },
  { name: 'Silver',   color: '#aaaaaa', zones: 'LOW-STAKES',  zonesColor: '#00ff41', desc: 'Consistent runs. Efficient looting and smart exfil choices define this tier.', rewards: ['Ranked Emblem', 'Player Background'] },
  { name: 'Gold',     color: '#ffd700', zones: 'LOW-STAKES',  zonesColor: '#00ff41', desc: 'High-value extractions. Your loadout ante and Holotag selection matters.', rewards: ['Ranked Emblem', 'Destroyer Shell Style', 'Title'] },
  { name: 'Platinum', color: '#00d4ff', zones: 'HIGH-STAKES', zonesColor: '#ff2222', desc: 'High-stakes zones unlocked. The field becomes lethal — higher risk, greater reward.', rewards: ['Ranked Emblem', 'Gun Style'] },
  { name: 'Diamond',  color: '#66ccff', zones: 'HIGH-STAKES', zonesColor: '#ff2222', desc: 'Elite extraction crews. Precision, coordination, and maximum gear ante.', rewards: ['Ranked Emblem', 'Gun Style'] },
  { name: 'Pinnacle', color: '#cc44ff', zones: 'HIGH-STAKES', zonesColor: '#ff2222', desc: 'The summit. Season-end cosmetics are reserved for those who reach this.', rewards: ['Ranked Emblem', 'Gun Style', 'Title'] },
];

const SHELL_FALLBACK = {
  Thief:     { solo: 'S',   squad: 'A',   why: 'Extraction speed is ranked currency. Built for exactly this mode.' },
  Assassin:  { solo: 'A',   squad: 'B',   why: 'Active Camo lets you disengage from fights you cannot win.' },
  Vandal:    { solo: 'A',   squad: 'A',   why: 'Most forgiving movement options. Best all-rounder for ranked.' },
  Recon:     { solo: 'B',   squad: 'S',   why: 'Echo Pulse is information. Knowing positions before committing wins ranked.' },
  Triage:    { solo: 'C',   squad: 'S',   why: 'Squad sustain in high-value extractions. Weak without teammates.' },
  Destroyer: { solo: 'B',   squad: 'B',   why: 'High kill potential but ranked punishes aggression. Use carefully.' },
  Rook:      { solo: 'BAN', squad: 'BAN', why: 'BANNED FROM RANKED. Sponsored Kits also banned. No exceptions.' },
};

const SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00d4ff',
  Rook: '#555555', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

const EDITOR_COLORS = {
  CIPHER:  '#ff2222',
  NEXUS:   '#00d4ff',
  DEXTER:  '#ff8800',
  GHOST:   '#00ff88',
  MIRANDA: '#9b5de5',
};

const EDITOR_SYMBOLS = {
  CIPHER: '◈', NEXUS: '⬡', DEXTER: '⬢', GHOST: '◇', MIRANDA: '◎',
};

const GRADE_COLORS = { S: '#ff2222', A: '#ff8800', B: '#00d4ff', C: '#888888', D: '#555555', BAN: '#ff2222' };

const FAQS = [
  { q: 'When is Ranked active?', a: 'Ranked Mode launched March 21, 2026. After player feedback, Bungie updated the schedule on March 25: Ranked now runs Sunday 10 AM PT through Thursday 10 AM PT (4 days). Cryo Archive runs Thursday through Sunday. The first window (March 21–24) featured Low Stakes only on Perimeter. This is a beta — systems are subject to change.' },
  { q: 'What is a Holotag?', a: 'A Holotag is a mandatory pass you purchase before entering ranked. It adds to your crew\'s score target based on rarity. Higher rarity tags increase both the target and the scoring ceiling. Every Runner must carry a Holotag at all times during a ranked match. You can only purchase Holotags up to your current rank tier in the Armory.' },
  { q: 'What happens if I die in ranked?', a: 'Failing to exfiltrate results in a loss of ranked progress equal to your crew\'s combined loss penalty. Your gear is also lost. Holotags can be stolen from your body by enemy Runners.' },
  { q: 'What if I extract without hitting my target?', a: 'Exfiltrating without meeting the crew score target results in no ranked progress — no gain, no loss. This is your safe exit when a run goes wrong.' },
  { q: 'What are Tag Chips?', a: 'Tag Chips are loot items dropped by UESC enemies and map events during Ranked runs. They count toward your crew\'s score target and automatically sell on exfil — no inventory management needed. Grabbing Tag Chips is a reliable way to pad your score without relying purely on gear loot.' },
  { q: 'Can I play ranked solo?', a: 'Yes. Solo ranked is fully supported. Thief and Assassin are the strongest solo picks. Rook is banned from ranked entirely.' },
  { q: 'What are the ranked tiers?', a: 'Bronze, Silver, Gold, Platinum, Diamond, and Pinnacle — each with three subdivisions (III, II, I). You progress from III (entry) to I (peak) within each tier before advancing. Platinum and above unlocks high-stakes zones.' },
  { q: 'What are the ranked rewards?', a: 'Bronze: Ranked Emblem. Silver: Emblem + Player Background. Gold: Emblem + Destroyer Shell Style + Title. Platinum/Diamond: Emblem + Gun Style. Pinnacle: Emblem + Gun Style + Title. Rewards are milestone-based — drop from Pinnacle and you keep the Pinnacle cosmetic.' },
  { q: 'Do ranked rewards carry over between seasons?', a: 'Yes. Cosmetics earned through ranked are permanent. Rank progress resets each season. Liaison contract progression carries over.' },
  { q: 'What is the gear ante?', a: 'A minimum loadout value threshold you must meet to queue. You must also be Runner Level 25 before the queue unlocks. Low Stakes requires a 3,000 ante (roughly Enhanced green gear with a few Deluxe blue pieces) and a Bronze Holotag. High Stakes requires a 10,000 ante (Deluxe gear with a few Superior purple pieces) and a Platinum Holotag.' },
];

// ── HELPERS ────────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function rankedStatus() {
  // Sun 10AM PT through Thu 10AM PT. PT is UTC-7 (DST) or UTC-8.
  var now = new Date();
  var ptMs = now.getTime() - 7 * 3600000;
  var pt = new Date(ptMs);
  var day = pt.getUTCDay();
  var hour = pt.getUTCHours();
  var live =
    (day === 0 && hour >= 10) ||
    (day === 1 || day === 2 || day === 3) ||
    (day === 4 && hour < 10);
  return live ? 'LIVE' : 'OFFLINE';
}

// ── SVG EMBLEM (custom per tier) ───────────────────────────────
function RankEmblem({ tier, size = 80, glow = false }) {
  var color = tier.color;
  var s = size;
  var c = s / 2;
  var outerR = s * 0.40;
  var innerR = s * 0.26;
  var lineGap = s * 0.08;
  var lineOut = s * 0.10;
  var dotR = s * 0.055;

  var lines = [
    { x1: c, y1: c - innerR + lineGap, x2: c, y2: c - outerR - lineOut },
    { x1: c, y1: c + innerR - lineGap, x2: c, y2: c + outerR + lineOut },
    { x1: c - innerR + lineGap, y1: c, x2: c - outerR - lineOut, y2: c },
    { x1: c + innerR - lineGap, y1: c, x2: c + outerR + lineOut, y2: c },
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
    <svg width={s} height={s} viewBox={'0 0 ' + s + ' ' + s} style={{ flexShrink: 0, filter: glow ? 'drop-shadow(0 0 ' + (s * 0.08) + 'px ' + color + '99)' : 'none', overflow: 'visible' }}>
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
        return <span key={d} style={{ fontFamily: 'monospace', fontSize: 8, color: color, background: color + '18', border: '1px solid ' + color + '40', borderRadius: 2, padding: '2px 5px', letterSpacing: 1, fontWeight: 700 }}>{d}</span>;
      })}
    </div>
  );
}

// ── MAIN ───────────────────────────────────────────────────────
export default function RankedClient({ data }) {
  var [activeTier, setActiveTier] = useState('Bronze');
  var [shellMode, setShellMode] = useState('solo');
  var [openFaq, setOpenFaq] = useState(null);
  var [liveStatus, setLiveStatus] = useState('OFFLINE');

  useEffect(function() {
    setLiveStatus(rankedStatus());
    var id = setInterval(function() { setLiveStatus(rankedStatus()); }, 60000);
    return function() { clearInterval(id); };
  }, []);

  var selectedTier = TIERS.find(function(t) { return t.name === activeTier; }) || TIERS[0];

  // Build shell tier list from live DB data with fallback
  var SHELL_ORDER = ['Thief', 'Assassin', 'Vandal', 'Recon', 'Triage', 'Destroyer', 'Rook'];
  var shells = SHELL_ORDER.map(function(shellName) {
    var dbShell = data.shells.find(function(s) { return s.name === shellName; });
    var fallback = SHELL_FALLBACK[shellName] || { solo: 'C', squad: 'C', why: '' };
    return {
      name: shellName,
      color: SHELL_COLORS[shellName] || '#888',
      solo: (dbShell && dbShell.ranked_tier_solo) || fallback.solo,
      squad: (dbShell && dbShell.ranked_tier_squad) || fallback.squad,
      why: (dbShell && dbShell.recommended_playstyle) || fallback.why,
      image_filename: dbShell ? dbShell.image_filename : null,
      role: dbShell ? dbShell.role : null,
      prime: dbShell ? dbShell.prime_ability_name : null,
      isDBDriven: !!(dbShell && dbShell.ranked_tier_solo),
    };
  });

  // Precompute metadata
  var articleCount = data.rankedArticles.length;
  var unviableCount = data.unviableWeapons.length;
  var moverCount = data.metaMovers.length;
  var editorsActive = [...new Set(data.rankedArticles.map(function(a) { return a.editor; }))];

  var faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(function(f) {
      return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } };
    }),
  };

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <style>{`
        .r-card         { transition: background 0.12s, border-color 0.12s; }
        .r-card:hover   { background: #1e2228 !important; }
        .r-faq          { transition: background 0.12s; cursor: pointer; }
        .r-faq:hover    { background: #1e2228 !important; }
        .r-row:hover    { background: #1e2228 !important; }
        .r-btn          { transition: background 0.12s, border-color 0.12s, color 0.12s; cursor: pointer; }
        .r-btn:hover    { background: #1e2228 !important; }
        .r-tier-btn     { transition: background 0.12s, border-color 0.12s; cursor: pointer; }
        .r-tier-btn:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ BETA NOTICE ═════════════════════════════════════ */}
      <div style={{ background: '#1a1d24', borderBottom: '1px solid #22252e', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#ff8800', background: 'rgba(255,136,0,0.12)', border: '1px solid rgba(255,136,0,0.3)', borderRadius: 2, padding: '2px 8px', letterSpacing: 2, fontWeight: 700 }}>BETA</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.4 }}>
          <strong style={{ color: 'rgba(255,136,0,0.85)' }}>Ranked mode is in Season 1 beta.</strong>{' '}
          Systems are subject to change based on Bungie player feedback.
        </span>
      </div>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{ padding: '48px 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 48, alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: liveStatus === 'LIVE' ? '#00ff41' : 'rgba(255,255,255,0.4)', background: liveStatus === 'LIVE' ? 'rgba(0,255,65,0.1)' : 'rgba(255,255,255,0.05)', border: '1px solid ' + (liveStatus === 'LIVE' ? 'rgba(0,255,65,0.3)' : 'rgba(255,255,255,0.1)'), borderRadius: 2, padding: '3px 10px', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: liveStatus === 'LIVE' ? '#00ff41' : 'rgba(255,255,255,0.3)' }} />
                {liveStatus === 'LIVE' ? 'QUEUE LIVE' : 'QUEUE OFFLINE'}
              </span>
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', border: '1px solid #22252e', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>SEASON 1</span>
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,136,0,0.7)', background: 'rgba(255,136,0,0.06)', border: '1px solid rgba(255,136,0,0.2)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>SUN–THU</span>
            </div>

            <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2.2rem, 6vw, 4rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.0, margin: '0 0 18px' }}>
              RANKED<br /><span style={{ color: '#00ff41' }}>MODE</span>
            </h1>

            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 460, marginBottom: 24 }}>
              Put your survival skills to the test, climb the competitive ladder, and prove you're a top Runner on Tau Ceti. Six ranks. Three subdivisions each. Bring your best loadout, set your score target, survive extraction.
            </p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/advisor" style={{ padding: '11px 22px', background: '#00ff41', color: '#000', fontSize: 11, fontWeight: 800, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
                GET RANKED BUILD →
              </Link>
              <Link href="/meta" style={{ padding: '11px 22px', background: '#1a1d24', border: '1px solid #22252e', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
                VIEW META →
              </Link>
            </div>

            {/* Live intel summary */}
            {(articleCount > 0 || moverCount > 0 || unviableCount > 0) && (
              <div style={{ marginTop: 28, padding: '14px 18px', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #00ff41', borderRadius: '0 2px 2px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: '#00ff41' }}>AUTONOMOUS INTEL</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                  <strong style={{ color: '#fff' }}>{articleCount}</strong> ranked articles tracked ·{' '}
                  <strong style={{ color: '#fff' }}>{moverCount}</strong> meta movers ·{' '}
                  <strong style={{ color: '#fff' }}>{unviableCount}</strong> weapons flagged ·{' '}
                  <strong style={{ color: '#fff' }}>{editorsActive.length}/5</strong> editors active
                </div>
              </div>
            )}
          </div>

          {/* Tier stack */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 14 }}>SIX RANKS · THREE DIVISIONS EACH</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                {TIERS.map(function(tier) {
                  return (
                    <div key={tier.name} style={{ textAlign: 'center' }}>
                      <RankEmblem tier={tier} size={42} />
                      <div style={{ fontFamily: 'monospace', fontSize: 7, color: tier.color, letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>{tier.name.toUpperCase()}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ RANK TIERS ══════════════════════════════════════ */}
      <section style={{ padding: '24px 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>RANK TIERS</span>
          <div style={{ flex: 1, height: 1, background: '#22252e' }} />
        </div>

        {/* Tier selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3, marginBottom: 12 }}>
          {TIERS.map(function(tier) {
            var active = activeTier === tier.name;
            return (
              <button key={tier.name} className="r-tier-btn" onClick={function() { setActiveTier(tier.name); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '12px 8px',
                  background: '#1a1d24',
                  border: '1px solid ' + (active ? tier.color + '55' : '#22252e'),
                  borderTop: '2px solid ' + (active ? tier.color : '#22252e'),
                  borderRadius: '0 0 2px 2px',
                  cursor: 'pointer',
                }}>
                <RankEmblem tier={tier} size={36} glow={active} />
                <span style={{ fontFamily: 'monospace', fontSize: 8, color: active ? tier.color : 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontWeight: 700 }}>{tier.name.toUpperCase()}</span>
              </button>
            );
          })}
        </div>

        {/* Selected tier detail */}
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + selectedTier.color, borderRadius: '0 2px 2px 0', padding: 24, display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <RankEmblem tier={selectedTier} size={72} glow={true} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: selectedTier.color, letterSpacing: 1 }}>{selectedTier.name.toUpperCase()}</span>
              <DivisionPips color={selectedTier.color} />
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, marginBottom: 10 }}>{selectedTier.desc}</div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: selectedTier.zonesColor + '12', border: '1px solid ' + selectedTier.zonesColor + '33', borderRadius: 2, fontFamily: 'monospace', fontSize: 9, color: selectedTier.zonesColor, letterSpacing: 2, fontWeight: 700 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: selectedTier.zonesColor }} />
              {selectedTier.zones} ZONES
            </span>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 8, fontWeight: 700 }}>TIER REWARDS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
              {selectedTier.rewards.map(function(r) {
                return <span key={r} style={{ fontFamily: 'monospace', fontSize: 9, color: selectedTier.color, background: selectedTier.color + '12', border: '1px solid ' + selectedTier.color + '30', borderRadius: 2, padding: '3px 9px', letterSpacing: 1, fontWeight: 700 }}>{r.toUpperCase()}</span>;
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, padding: '10px 14px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ color: '#00ff41' }}>●</span>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>Each rank contains three subdivisions — III, II, I — progressing from III (entry) to I (peak). Reach Rank I to advance.</span>
        </div>
      </section>

      {/* ══ LIVE META MOVERS (NEXUS data) ═══════════════════ */}
      {data.metaMovers.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#00d4ff' }}>⬡ NEXUS — RANKED META MOVERS</span>
            <div style={{ flex: 1, height: 1, background: '#22252e' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{data.metaMovers.length} TRACKED</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {data.metaMovers.map(function(mover) {
              var isShell = (mover.type || '').toLowerCase() === 'shell';
              var folder = isShell ? 'shells' : 'weapons';
              var imgSrc = mover.image_filename ? '/images/' + folder + '/' + mover.image_filename : null;
              var tierColor = GRADE_COLORS[mover.tier] || '#888';
              var rankedSoloTier = mover.ranked_tier_solo;
              var holotag = mover.holotag_tier;
              return (
                <div key={mover.name} className="r-card" style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid ' + tierColor, borderRadius: '0 2px 2px 0', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, flexShrink: 0, background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {imgSrc
                        ? <img src={imgSrc} alt={mover.name} style={{ width: 40, height: 40, objectFit: 'contain' }} />
                        : <span style={{ fontSize: 16, color: 'rgba(255,255,255,0.15)' }}>{isShell ? '◎' : '⬢'}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.5 }}>{mover.name}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: 8, color: tierColor, background: tierColor + '18', border: '1px solid ' + tierColor + '40', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700 }}>{mover.tier}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
                        {rankedSoloTier && (
                          <span style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700 }}>SOLO {rankedSoloTier}</span>
                        )}
                        {holotag && (
                          <span style={{ fontFamily: 'monospace', fontSize: 7, color: '#ffd700', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.2)', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700 }}>{holotag.toUpperCase()} HOLOTAG</span>
                        )}
                      </div>
                      {mover.ranked_note && (
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, fontStyle: 'italic' }}>
                          "{mover.ranked_note}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ WEAPONS FLAGGED UNVIABLE (live data) ════════════ */}
      {data.unviableWeapons.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#ff2222' }}>⚠ DO NOT RUN IN RANKED</span>
            <div style={{ flex: 1, height: 1, background: '#22252e' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{data.unviableWeapons.length} FLAGGED</span>
          </div>

          <div style={{ background: '#1a1d24', border: '1px solid rgba(255,34,34,0.2)', borderLeft: '3px solid #ff2222', borderRadius: '0 2px 2px 0', padding: '14px 18px', marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>
              NEXUS has flagged these weapons as <strong style={{ color: '#ff2222' }}>not viable for ranked</strong> this cycle. Consider alternatives before queuing.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 }}>
            {data.unviableWeapons.map(function(w) {
              var imgSrc = w.image_filename ? '/images/weapons/' + w.image_filename : null;
              return (
                <div key={w.name} style={{ background: '#1a1d24', border: '1px solid rgba(255,34,34,0.12)', borderRadius: 2, padding: '10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 32, height: 32, flexShrink: 0, background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {imgSrc
                      ? <img src={imgSrc} alt={w.name} style={{ width: 28, height: 28, objectFit: 'contain', opacity: 0.5, filter: 'grayscale(100%)' }} />
                      : <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>⬢</span>
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>{w.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,34,34,0.6)', letterSpacing: 1, fontWeight: 700 }}>{w.weapon_type || 'WEAPON'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ HOLOTAGS + ZONES ═══════════════════════════════ */}
      <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>

          {/* Holotags */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#ffd700' }}>HOLOTAGS</span>
              <div style={{ flex: 1, height: 1, background: '#22252e' }} />
            </div>
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: 20 }}>
              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #22252e' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#ffd700', letterSpacing: 1, marginBottom: 6 }}>MANDATORY PASS</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
                  Runners must carry a Holotag in Ranked. Each tag adds to the crew's score target based on rarity. You can only purchase Holotags up to your current rank tier.
                </div>
              </div>
              {[
                { color: '#ff8800', text: 'Holotag rarity increases crew score target and scoring ceiling.' },
                { color: '#ff2222', text: 'Holotags can be stolen from defeated Runners in the field.' },
                { color: '#00d4ff', text: 'Every Runner must carry a Holotag at all times during a match.' },
                { color: '#00ff41', text: 'Tag Chips from UESC enemies count toward your score and auto-sell.' },
              ].map(function(item, i) {
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ color: item.color, flexShrink: 0, fontSize: 12, marginTop: 2 }}>◈</span>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item.text}</span>
                  </div>
                );
              })}

              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #22252e' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>ENTRY REQUIREMENTS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ background: '#0e1014', border: '1px solid #22252e', borderLeft: '2px solid #ffd700', borderRadius: '0 2px 2px 0', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#ffd700', letterSpacing: 1 }}>RUNNER LEVEL</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#ffd700', fontWeight: 700 }}>LVL 25</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Queue does not unlock until you reach Runner Level 25.</div>
                  </div>
                  <div style={{ background: '#0e1014', border: '1px solid #22252e', borderLeft: '2px solid #00ff41', borderRadius: '0 2px 2px 0', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#00ff41', letterSpacing: 1 }}>LOW STAKES</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#00ff41', fontWeight: 700 }}>3,000 ANTE</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Bronze Holotag. Enhanced green with a few Deluxe blue.</div>
                  </div>
                  <div style={{ background: '#0e1014', border: '1px solid #22252e', borderLeft: '2px solid #ff2222', borderRadius: '0 2px 2px 0', padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#ff2222', letterSpacing: 1 }}>HIGH STAKES</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#ff2222', fontWeight: 700 }}>10,000 ANTE</span>
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Platinum Holotag. Deluxe with a few Superior purple.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Zones + Schedule */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: '#00d4ff' }}>RANKED ZONES</span>
              <div style={{ flex: 1, height: 1, background: '#22252e' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #00ff41', borderRadius: '0 2px 2px 0', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#00ff41', letterSpacing: 1 }}>LOW-STAKES ZONES</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#00ff41', background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.3)', borderRadius: 2, padding: '2px 8px', letterSpacing: 1, fontWeight: 700 }}>ALL RANKS</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                  Available to all Runners. Standard extraction risk, controlled competition.
                </div>
              </div>

              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #ff2222', borderRadius: '0 2px 2px 0', padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ff2222', letterSpacing: 1 }}>HIGH-STAKES ZONES</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#ff2222', background: 'rgba(255,34,34,0.1)', border: '1px solid rgba(255,34,34,0.3)', borderRadius: 2, padding: '2px 8px', letterSpacing: 1, fontWeight: 700 }}>PLATINUM+</span>
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 10 }}>
                  Unlocked at Platinum. Greater risk, greater loot density, harder competition.
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {TIERS.slice(3).map(function(t) { return <RankEmblem key={t.name} tier={t} size={24} />; })}
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>AND ABOVE</span>
                </div>
              </div>

              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: 16 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 10 }}>SEASON 1 SCHEDULE</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                  <div style={{ background: '#0e1014', border: '1px solid #22252e', borderTop: '2px solid #00d4ff', borderRadius: '0 0 2px 2px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#00d4ff', letterSpacing: 1, marginBottom: 2 }}>RANKED</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>SUN 10AM – THU 10AM PT</div>
                  </div>
                  <div style={{ background: '#0e1014', border: '1px solid #22252e', borderTop: '2px solid #9b5de5', borderRadius: '0 0 2px 2px', padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: '#9b5de5', letterSpacing: 1, marginBottom: 2 }}>CRYO ARCHIVE</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>THU 10AM – SUN 10AM PT</div>
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                  Map rotation weekly: Perimeter → Dire Marsh → Outpost.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ SHELL TIER LIST (live DB) ═══════════════════════ */}
      <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>RANKED SHELL TIER LIST</span>
          <div style={{ flex: 1, height: 1, background: '#22252e' }} />
          <div style={{ display: 'flex', gap: 2, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, overflow: 'hidden' }}>
            {['solo', 'squad'].map(function(mode) {
              var active = shellMode === mode;
              return (
                <button key={mode} onClick={function() { setShellMode(mode); }} style={{
                  padding: '6px 18px',
                  background: active ? '#00ff41' : 'transparent',
                  border: 'none',
                  fontFamily: 'monospace',
                  fontSize: 10,
                  fontWeight: 800,
                  color: active ? '#000' : 'rgba(255,255,255,0.35)',
                  letterSpacing: 2,
                  cursor: 'pointer',
                }}>
                  {mode.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {shells.map(function(shell) {
            var grade = shellMode === 'solo' ? shell.solo : shell.squad;
            var gradeColor = GRADE_COLORS[grade] || '#555';
            var isBanned = grade === 'BAN';
            var imgSrc = shell.image_filename ? '/images/shells/' + shell.image_filename : null;
            return (
              <Link key={shell.name} href={'/shells/' + shell.name.toLowerCase()} className="r-row" style={{
                display: 'grid',
                gridTemplateColumns: '44px 100px 56px 1fr auto',
                gap: 12,
                alignItems: 'center',
                background: '#1a1d24',
                border: '1px solid #22252e',
                borderLeft: '3px solid ' + (isBanned ? '#ff2222' : shell.color),
                padding: '10px 14px',
                borderRadius: '0 2px 2px 0',
                textDecoration: 'none',
                opacity: isBanned ? 0.55 : 1,
              }}>
                <div style={{ width: 44, height: 44, background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {imgSrc
                    ? <img src={imgSrc} alt={shell.name} style={{ width: 40, height: 40, objectFit: 'contain', filter: isBanned ? 'grayscale(100%)' : 'none' }} />
                    : <span style={{ fontSize: 18, color: shell.color + '40' }}>◎</span>
                  }
                </div>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: isBanned ? 'rgba(255,255,255,0.3)' : shell.color, letterSpacing: 1 }}>{shell.name.toUpperCase()}</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: isBanned ? '#ff2222' : gradeColor, background: (isBanned ? '#ff2222' : gradeColor) + '18', border: '1px solid ' + (isBanned ? '#ff2222' : gradeColor) + '40', borderRadius: 2, padding: '3px 0', letterSpacing: 1, textAlign: 'center' }}>
                  {isBanned ? 'BAN' : grade}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: isBanned ? 'rgba(255,50,50,0.5)' : 'rgba(255,255,255,0.55)', lineHeight: 1.4, marginBottom: 2 }}>{shell.why}</div>
                  {shell.isDBDriven && !isBanned && (
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#00d4ff', letterSpacing: 1, fontWeight: 700 }}>⬡ NEXUS-GRADED</div>
                  )}
                </div>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: isBanned ? 'rgba(255,50,50,0.4)' : 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>DETAILS →</span>
              </Link>
            );
          })}
        </div>

        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/advisor" style={{ padding: '10px 20px', background: '#ff8800', color: '#000', fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 2, borderRadius: 2, textDecoration: 'none' }}>
            GET YOUR RANKED BUILD →
          </Link>
          <Link href="/shells" style={{ padding: '10px 20px', background: '#1a1d24', border: '1px solid #22252e', color: 'rgba(255,255,255,0.55)', fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 2, borderRadius: 2, textDecoration: 'none' }}>
            ALL SHELLS →
          </Link>
        </div>
      </section>

      {/* ══ RECENT RANKED INTEL (live feed) ════════════════ */}
      {data.rankedArticles.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>RECENT RANKED INTEL</span>
            <div style={{ flex: 1, height: 1, background: '#22252e' }} />
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{data.rankedArticles.length} ARTICLES</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 8 }}>
            {data.rankedArticles.slice(0, 8).map(function(article) {
              var color = EDITOR_COLORS[article.editor] || '#888';
              var symbol = EDITOR_SYMBOLS[article.editor] || '·';
              var portrait = '/images/editors/' + (article.editor || '').toLowerCase() + '.jpg';
              var thumb = article.thumbnail;
              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="r-card" style={{
                  background: '#1a1d24',
                  border: '1px solid #22252e',
                  borderLeft: '2px solid ' + color,
                  borderRadius: '0 2px 2px 0',
                  padding: 0,
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}>
                  {thumb && (
                    <div style={{ height: 100, background: '#0e1014', overflow: 'hidden', position: 'relative' }}>
                      <img src={thumb} alt={article.headline} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(26,29,36,0.95))' }} />
                    </div>
                  )}
                  <div style={{ padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', overflow: 'hidden', border: '1px solid ' + color + '40', flexShrink: 0 }}>
                        <img src={portrait} alt={article.editor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: color }}>{symbol} {article.editor}</span>
                      {article.ce_score > 0 && (
                        <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 9, fontWeight: 800, color: color, background: color + '18', border: '1px solid ' + color + '30', borderRadius: 2, padding: '1px 6px', letterSpacing: 0.5 }}>{article.ce_score}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, marginBottom: 8 }}>
                      {article.headline}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(article.created_at)}</div>
                  </div>
                </Link>
              );
            })}
          </div>

          {data.rankedArticles.length > 8 && (
            <div style={{ marginTop: 10, textAlign: 'center' }}>
              <Link href="/intel?tag=ranked" style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, fontWeight: 700, textDecoration: 'none' }}>
                VIEW ALL {data.rankedArticles.length} RANKED ARTICLES →
              </Link>
            </div>
          )}
        </section>
      )}

      {/* ══ STAKES & CONSEQUENCES ═══════════════════════════ */}
      <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>STAKES & CONSEQUENCES</span>
          <div style={{ flex: 1, height: 1, background: '#22252e' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
          {[
            { color: '#00ff41', title: 'SUCCESSFUL EXFIL', sub: 'SCORE MET', body: 'You exfiltrate and meet or exceed the crew\'s score target. Ranked progress is awarded.' },
            { color: '#ff8800', title: 'EXFIL — SCORE NOT MET', sub: 'SAFE EXIT', body: 'Exfiltrate without hitting the crew\'s score target — no progress gained, no progress lost.' },
            { color: '#ff2222', title: 'FAILED EXFIL', sub: 'LOSS', body: 'Die or fail to exfiltrate — lose ranked progress equal to your crew\'s combined penalty.' },
            { color: '#00d4ff', title: 'HOLOTAG THEFT', sub: 'OVERPERFORM', body: 'Holotags stolen from defeated Runners contribute to your crew\'s score and scoring ceiling.' },
          ].map(function(item, i) {
            return (
              <div key={i} className="r-card" style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + item.color, borderRadius: '0 0 2px 2px', padding: 16 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: item.color, letterSpacing: 2, fontWeight: 700, marginBottom: 2 }}>{item.sub}</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 1, marginBottom: 8 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item.body}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ SEASON 1 REWARDS ═══════════════════════════════ */}
      <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>SEASON 1 REWARDS</span>
          <div style={{ flex: 1, height: 1, background: '#22252e' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 8, marginBottom: 10 }}>
          <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #ff8800', borderRadius: '0 2px 2px 0', padding: 16 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#ff8800', letterSpacing: 1, marginBottom: 8 }}>SEASONAL REWARDS</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              Based on the <strong style={{ color: '#fff' }}>highest rank you achieved during the season</strong> — not your final standing. Drop from Pinnacle back to Diamond? <strong style={{ color: '#fff' }}>You keep the Pinnacle cosmetic.</strong>
            </div>
          </div>
          <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #00d4ff', borderRadius: '0 2px 2px 0', padding: 16 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#00d4ff', letterSpacing: 1, marginBottom: 8 }}>RANK-UP PACKAGES</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
              Each time you reach a new rank, you'll receive a <strong style={{ color: '#fff' }}>loot package</strong> with gear and room keys to randomly-selected zones. Drops immediately on milestone hit.
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {[...TIERS].reverse().map(function(tier) {
            return (
              <div key={tier.name} className="r-row" style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid ' + tier.color, borderRadius: '0 2px 2px 0', padding: '10px 14px' }}>
                <RankEmblem tier={tier} size={30} />
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: tier.color, letterSpacing: 1, minWidth: 86 }}>{tier.name.toUpperCase()}</span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
                  {tier.rewards.map(function(r) {
                    return <span key={r} style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.55)', background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, padding: '3px 10px', letterSpacing: 1, fontWeight: 700 }}>{r.toUpperCase()}</span>;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ LIVE INTEL CTA ═════════════════════════════════ */}
      <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #00ff41', borderRadius: '0 2px 2px 0', padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#00ff41', letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>AUTONOMOUS INTELLIGENCE</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.1, marginBottom: 10 }}>
              5 AI EDITORS.<br /><span style={{ color: '#00ff41' }}>UPDATED EVERY 6H.</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              NEXUS tracks the ranked tier list. DEXTER grades builds by Holotag viability. CIPHER analyzes ranked plays. MIRANDA publishes guides.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { href: '/meta',        color: '#00d4ff', label: '⬡ LIVE TIER LIST',        desc: 'Updated every 6h by NEXUS' },
              { href: '/advisor',     color: '#ff8800', label: '⬢ BUILD ADVISOR',          desc: 'Ranked-viable loadouts' },
              { href: '/intel/nexus', color: '#00d4ff', label: '⬡ NEXUS META ANALYSIS',    desc: 'Deep ranked breakdowns' },
              { href: '/intel/cipher', color: '#ff2222', label: '◈ CIPHER PLAY ANALYSIS',   desc: 'Grade the best ranked plays' },
            ].map(function(l) {
              return (
                <Link key={l.href} href={l.href} className="r-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid ' + l.color, borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: l.color, letterSpacing: 1, fontWeight: 700 }}>{l.label}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>{l.desc}</div>
                  </div>
                  <span style={{ color: l.color, opacity: 0.5, fontSize: 13 }}>→</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)' }}>RANKED FAQ</span>
          <div style={{ flex: 1, height: 1, background: '#22252e' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {FAQS.map(function(faq, i) {
            var isOpen = openFaq === i;
            return (
              <div key={i} className="r-faq" onClick={function() { setOpenFaq(isOpen ? null : i); }}
                style={{
                  background: '#1a1d24',
                  border: '1px solid #22252e',
                  borderLeft: '2px solid ' + (isOpen ? '#00ff41' : 'transparent'),
                  borderRadius: '0 2px 2px 0',
                  overflow: 'hidden',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', gap: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: isOpen ? '#fff' : 'rgba(255,255,255,0.7)', lineHeight: 1.3 }}>{faq.q}</div>
                  <span style={{ fontFamily: 'monospace', fontSize: 14, color: isOpen ? '#00ff41' : 'rgba(255,255,255,0.3)', flexShrink: 0, fontWeight: 700 }}>{isOpen ? '−' : '+'}</span>
                </div>
                {isOpen && (
                  <div style={{ padding: '0 16px 14px', paddingTop: 12, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, borderTop: '1px solid #22252e' }}>
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
