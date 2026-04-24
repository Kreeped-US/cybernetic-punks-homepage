'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

var SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00d4ff',
  Rook: '#888888', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

var SHELL_SYMBOLS = {
  Assassin: '◈', Destroyer: '⬢', Recon: '◇',
  Rook: '▣', Thief: '⬠', Triage: '◎', Vandal: '⬡',
};

var TIER_COLORS = {
  S: { bg: '#ff2222', fg: '#fff' },
  A: { bg: '#ff8800', fg: '#000' },
  B: { bg: '#00d4ff', fg: '#000' },
  C: { bg: '#666', fg: '#fff' },
  D: { bg: '#333', fg: 'rgba(255,255,255,0.7)' },
  BAN: { bg: '#ff2222', fg: '#fff' },
};

var TREND_DISPLAY = {
  up:     { label: '↑', color: '#00ff41' },
  down:   { label: '↓', color: '#ff2222' },
  stable: { label: '→', color: 'rgba(255,255,255,0.3)' },
};

var QUIZ_QUESTIONS = [
  {
    q: 'How do you want to win a fight?',
    options: [
      { key: 'aggressive', label: 'Push first. Win the opening.',         shellBias: ['Destroyer', 'Vandal', 'Assassin'] },
      { key: 'calculated', label: 'Wait, outsmart, counter.',             shellBias: ['Recon', 'Thief'] },
      { key: 'support',    label: 'Keep my squad alive and winning.',     shellBias: ['Triage'] },
      { key: 'evasive',    label: 'Pick my fights. Extract the loot.',    shellBias: ['Thief', 'Assassin'] },
    ],
  },
  {
    q: "What's your experience?",
    options: [
      { key: 'new',     label: 'New to Marathon',              difficulty: ['Easy'] },
      { key: 'some',    label: 'Some extractions in',          difficulty: ['Easy', 'Medium'] },
      { key: 'ranked',  label: 'Playing ranked',               difficulty: ['Medium', 'Hard'] },
      { key: 'veteran', label: 'Extraction shooter veteran',   difficulty: ['Hard', 'Expert'] },
    ],
  },
];

function recommendShell(answers, shells) {
  if (!shells || shells.length === 0) return null;
  var q1 = QUIZ_QUESTIONS[0].options.find(function(o) { return o.key === answers[0]; });
  var q2 = QUIZ_QUESTIONS[1].options.find(function(o) { return o.key === answers[1]; });
  var biasedShells = q1 ? q1.shellBias : [];
  var difficulty = q2 ? q2.difficulty : [];

  var scored = shells.map(function(s) {
    if (!s || !s.name) return { shell: null, score: -999 };
    if (s.name === 'Rook') return { shell: s, score: -1 };
    var score = 0;
    if (biasedShells.includes(s.name)) score += 3;
    if (difficulty.length && s.difficulty && difficulty.includes(s.difficulty)) score += 2;
    if ((answers[1] === 'ranked' || answers[1] === 'veteran') && s.meta && (s.meta.tier === 'S' || s.meta.tier === 'A')) score += 1;
    return { shell: s, score: score };
  }).filter(function(x) { return x.shell && x.score >= 0; });

  scored.sort(function(a, b) { return b.score - a.score; });
  if (scored.length > 0 && scored[0].shell) return scored[0].shell;
  return shells.find(function(s) { return s && s.name && s.name !== 'Rook'; }) || null;
}

export default function ShellsHubClient(props) {
  var shells = props.shells;
  var totalPicks = props.totalPicks;

  var router = useRouter();
  var [roleFilter, setRoleFilter] = useState('all');
  var [tierFilter, setTierFilter] = useState('all');
  var [quizOpen, setQuizOpen] = useState(false);
  var [quizStep, setQuizStep] = useState(0);
  var [quizAnswers, setQuizAnswers] = useState([]);
  var [quizResult, setQuizResult] = useState(null);

  // Defensive filter
  var safeShells = Array.isArray(shells) ? shells.filter(function(s) { return s && s.name; }) : [];

  var roles = useMemo(function() {
    var set = new Set();
    safeShells.forEach(function(sh) { if (sh.role) set.add(sh.role); });
    return ['all'].concat(Array.from(set).sort());
  }, [safeShells]);

  var filtered = safeShells.filter(function(s) {
    if (roleFilter !== 'all' && s.role !== roleFilter) return false;
    if (tierFilter !== 'all') {
      if (!s.meta || s.meta.tier !== tierFilter) return false;
    }
    return true;
  });

  function handleQuizAnswer(optionKey) {
    var newAnswers = quizAnswers.concat([optionKey]);
    setQuizAnswers(newAnswers);
    if (quizStep === QUIZ_QUESTIONS.length - 1) {
      var rec = recommendShell(newAnswers, safeShells);
      setQuizResult(rec);
    } else {
      setQuizStep(quizStep + 1);
    }
  }

  function resetQuiz() {
    setQuizStep(0);
    setQuizAnswers([]);
    setQuizResult(null);
  }

  var sTierCount = safeShells.filter(function(s) { return s.meta && s.meta.tier === 'S'; }).length;
  var rankedViable = safeShells.filter(function(s) {
    return s.meta && (s.meta.tier === 'S' || s.meta.tier === 'A' || s.meta.tier === 'B');
  }).length;

  // Quiz result — pre-compute safe values
  var qrName = quizResult && quizResult.name ? quizResult.name : '';
  var qrColor = qrName ? (SHELL_COLORS[qrName] || '#00ff41') : '#00ff41';
  var qrSymbol = qrName ? (SHELL_SYMBOLS[qrName] || '◈') : '◈';
  var qrImg = quizResult && quizResult.image_filename ? ('/images/shells/' + quizResult.image_filename) : null;

  return (
    <>
      <style>{`
        .shell-card:hover { background: #1e2228 !important; border-color: #2a2e38 !important; }
        .shell-card:hover .shell-view { color: var(--shell-color) !important; }
        .quiz-option:hover { background: #1e2228 !important; }
        .filter-pill:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
          <span style={{ fontSize: 10, color: '#00ff41', letterSpacing: 3, fontWeight: 700 }}>7 RUNNER SHELLS · LIVE META DATA</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1, margin: '0 0 12px', color: '#fff' }}>
              Runner<br /><span style={{ color: '#00ff41' }}>Shells.</span>
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
              Seven Runner Shells. Each one a different philosophy of survival on Tau Ceti. Choose your approach — then know it completely.
            </p>
          </div>

          <button onClick={function() { setQuizOpen(true); resetQuiz(); }} style={{
            background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #ff8800',
            borderRadius: '0 0 3px 3px', padding: '14px 20px',
            cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#ff8800', letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' }}>⬢ New to Marathon?</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 2 }}>Find your Shell →</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 1 }}>2-question quiz · 15 seconds</div>
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1, background: '#1e2028' }}>
          {[
            { label: 'Shells',         value: safeShells.length, color: '#00ff41' },
            { label: 'Ranked Viable',  value: rankedViable,      color: '#00d4ff' },
            { label: 'S-Tier',         value: sTierCount,        color: '#ff2222' },
            { label: 'Banned Ranked',  value: 1,                 color: '#666' },
          ].map(function(stat) {
            return (
              <div key={stat.label} style={{ background: '#1a1d24', borderTop: '2px solid ' + stat.color, padding: '14px 16px' }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: stat.color, lineHeight: 1, letterSpacing: '-0.5px', marginBottom: 5 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ FILTERS ═════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', paddingBottom: 12, borderBottom: '1px solid #1e2028' }}>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginRight: 4 }}>Role</span>
          {roles.map(function(r) {
            var active = roleFilter === r;
            return (
              <button key={r} className="filter-pill" onClick={function() { setRoleFilter(r); }} style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                padding: '5px 10px', borderRadius: 2, cursor: 'pointer',
                background: active ? 'rgba(0,255,65,0.1)' : 'transparent',
                border: '1px solid ' + (active ? 'rgba(0,255,65,0.3)' : '#22252e'),
                color: active ? '#00ff41' : 'rgba(255,255,255,0.4)',
                fontFamily: 'inherit', textTransform: 'uppercase',
              }}>
                {r === 'all' ? 'ALL' : r}
              </button>
            );
          })}

          <span style={{ width: 1, height: 16, background: '#22252e' }} />

          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginRight: 4 }}>Tier</span>
          {['all', 'S', 'A', 'B', 'C'].map(function(t) {
            var active = tierFilter === t;
            var tierC = t === 'all' ? null : TIER_COLORS[t];
            return (
              <button key={t} className="filter-pill" onClick={function() { setTierFilter(t); }} style={{
                fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
                padding: '5px 10px', borderRadius: 2, cursor: 'pointer',
                background: active && tierC ? tierC.bg + '22' : (active ? 'rgba(0,255,65,0.1)' : 'transparent'),
                border: '1px solid ' + (active && tierC ? tierC.bg + '60' : active ? 'rgba(0,255,65,0.3)' : '#22252e'),
                color: active && tierC ? tierC.bg : (active ? '#00ff41' : 'rgba(255,255,255,0.4)'),
                fontFamily: 'inherit',
              }}>
                {t === 'all' ? 'ALL' : t}
              </button>
            );
          })}
        </div>
      </section>

      {/* ══ SHELL GRID ═════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 32px' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700 }}>
            NO SHELLS MATCH — RESET FILTERS
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {filtered.map(function(shell) {
              if (!shell || !shell.name) return null;
              var color = SHELL_COLORS[shell.name] || '#00ff41';
              var symbol = SHELL_SYMBOLS[shell.name] || '◈';
              var meta = shell.meta;
              var tierStyle = meta && meta.tier ? TIER_COLORS[meta.tier] : null;
              var trend = meta && meta.trend ? TREND_DISPLAY[meta.trend] : null;
              var isBanned = shell.name === 'Rook';
              var imgSrc = shell.image_filename ? '/images/shells/' + shell.image_filename : null;
              var pickPct = (totalPicks && totalPicks >= 10 && shell.pickRate) ? Math.round((shell.pickRate / totalPicks) * 100) : null;

              var soloTier = shell.ranked_tier_solo;
              var squadTier = shell.ranked_tier_squad;

              return (
                <Link
                  key={shell.name}
                  href={'/shells/' + shell.name.toLowerCase()}
                  className="shell-card"
                  style={{
                    '--shell-color': color,
                    display: 'block', textDecoration: 'none',
                    background: '#1a1d24',
                    border: '1px solid #22252e',
                    borderTop: '2px solid ' + (isBanned ? '#555' : color),
                    borderRadius: '0 0 3px 3px',
                    overflow: 'hidden',
                    opacity: isBanned ? 0.7 : 1,
                    transition: 'background 0.1s, border-color 0.1s',
                  }}
                >
                  <div style={{ position: 'relative', height: 160, background: '#0e1014', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 100%, ' + color + '18 0%, transparent 70%)' }} />

                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={shell.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', position: 'relative', zIndex: 1, filter: isBanned ? 'grayscale(1) brightness(0.5)' : 'none' }}
                      />
                    ) : (
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, color: color, opacity: 0.15 }}>{symbol}</div>
                    )}

                    {meta && tierStyle && (
                      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {trend && trend.label !== '→' && (
                          <div style={{ background: trend.color + '18', border: '1px solid ' + trend.color + '40', borderRadius: 2, padding: '2px 5px', fontSize: 10, color: trend.color, fontWeight: 900, lineHeight: 1 }}>
                            {trend.label}
                          </div>
                        )}
                        <div style={{ background: tierStyle.bg, color: tierStyle.fg, fontSize: 14, fontWeight: 900, letterSpacing: 1, padding: '3px 10px', borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1 }}>
                          {meta.tier}
                        </div>
                      </div>
                    )}

                    {isBanned && (
                      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 2, background: 'rgba(255,34,34,0.15)', border: '1px solid rgba(255,34,34,0.35)', borderRadius: 2, padding: '3px 8px' }}>
                        <span style={{ fontSize: 8, color: '#ff2222', letterSpacing: 1.5, fontWeight: 700 }}>RANKED BANNED</span>
                      </div>
                    )}

                    {pickPct !== null && pickPct > 0 && (
                      <div style={{ position: 'absolute', bottom: 10, right: 10, zIndex: 2, background: '#121418aa', border: '1px solid #22252e', borderRadius: 2, padding: '2px 6px', fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>
                        {pickPct}% PICKED
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: isBanned ? 'rgba(255,255,255,0.4)' : '#fff', letterSpacing: 1 }}>{shell.name.toUpperCase()}</span>
                    </div>

                    <div style={{ fontSize: 9, color: color + 'aa', letterSpacing: 2, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                      {shell.role || '—'}
                    </div>

                    {shell.lore_tagline && (
                      <div style={{ fontSize: 12, color: isBanned ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 10, fontStyle: 'italic' }}>
                        "{shell.lore_tagline}"
                      </div>
                    )}

                    {shell.active_ability_name && (
                      <div style={{ marginBottom: 10 }}>
                        <span style={{ fontSize: 8, color: color, background: color + '12', border: '1px solid ' + color + '30', borderRadius: 2, padding: '2px 7px', letterSpacing: 1.5, fontWeight: 700 }}>
                          {shell.active_ability_name.toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #22252e' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {soloTier && soloTier !== 'BAN' && TIER_COLORS[soloTier] && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: TIER_COLORS[soloTier].bg, background: TIER_COLORS[soloTier].bg + '15', border: '1px solid ' + TIER_COLORS[soloTier].bg + '30', borderRadius: 2, padding: '2px 6px', letterSpacing: 1, fontFamily: 'monospace' }}>
                            SOLO {soloTier}
                          </span>
                        )}
                        {squadTier && squadTier !== 'BAN' && TIER_COLORS[squadTier] && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: TIER_COLORS[squadTier].bg, background: TIER_COLORS[squadTier].bg + '15', border: '1px solid ' + TIER_COLORS[squadTier].bg + '30', borderRadius: 2, padding: '2px 6px', letterSpacing: 1, fontFamily: 'monospace' }}>
                            SQD {squadTier}
                          </span>
                        )}
                      </div>
                      <span className="shell-view" style={{ fontSize: 9, color: isBanned ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.35)', letterSpacing: 1.5, fontWeight: 700, transition: 'color 0.1s' }}>
                        VIEW →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ══ DEXTER CTA ═════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 32px' }}>
        <div style={{
          background: '#1a1d24', border: '1px solid #22252e',
          borderTop: '2px solid #ff8800', borderRadius: '0 0 3px 3px',
          padding: '20px 24px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ff8800', letterSpacing: 2, marginBottom: 6, textTransform: 'uppercase' }}>Not sure which Shell to run?</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 500 }}>
              DEXTER will engineer a complete loadout based on your playstyle, rank target, and experience level.
            </div>
          </div>
          <Link href="/advisor" style={{
            padding: '11px 22px', background: '#ff8800', color: '#000',
            fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2,
            textDecoration: 'none', flexShrink: 0,
          }}>
            BUILD ADVISOR →
          </Link>
        </div>
      </section>

      {/* ══ QUIZ MODAL ═════════════════════════════════════ */}
      {quizOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 500, padding: 20,
        }}>
          <div style={{
            background: '#1a1d24', border: '1px solid #22252e',
            borderTop: '2px solid #ff8800',
            borderRadius: '0 0 3px 3px',
            width: '100%', maxWidth: 520,
            maxHeight: '90vh', overflowY: 'auto',
            padding: '28px',
          }}>
            {!quizResult ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#ff8800', letterSpacing: 2, textTransform: 'uppercase' }}>Find Your Shell</span>
                  <div style={{ flex: 1, height: 2, background: '#22252e', borderRadius: 1, overflow: 'hidden' }}>
                    <div style={{ width: ((quizStep + 1) / QUIZ_QUESTIONS.length * 100) + '%', height: '100%', background: '#ff8800', transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', letterSpacing: 1 }}>{quizStep + 1} / {QUIZ_QUESTIONS.length}</span>
                </div>

                <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', margin: '0 0 20px', color: '#fff' }}>
                  {QUIZ_QUESTIONS[quizStep].q}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 20 }}>
                  {QUIZ_QUESTIONS[quizStep].options.map(function(opt) {
                    return (
                      <button
                        key={opt.key}
                        className="quiz-option"
                        onClick={function() { handleQuizAnswer(opt.key); }}
                        style={{
                          padding: '13px 16px',
                          background: '#121418', border: '1px solid #22252e',
                          borderLeft: '3px solid #ff8800',
                          borderRadius: '0 3px 3px 0',
                          cursor: 'pointer',
                          textAlign: 'left',
                          fontSize: 14, fontWeight: 600,
                          color: 'rgba(255,255,255,0.75)',
                          fontFamily: 'inherit',
                          transition: 'background 0.1s',
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={function() { setQuizOpen(false); }}
                  style={{ background: 'none', border: 'none', fontSize: 10, color: 'rgba(255,255,255,0.3)', cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit', fontWeight: 700 }}
                >
                  ✕ Close
                </button>
              </>
            ) : quizResult && qrName ? (
              <>
                <div style={{ fontSize: 10, color: '#ff8800', letterSpacing: 3, marginBottom: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                  Your recommended Shell
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px', background: '#121418', border: '1px solid #22252e', borderTop: '2px solid ' + qrColor, borderRadius: '0 0 3px 3px', marginBottom: 20 }}>
                  <div style={{ width: 72, height: 72, flexShrink: 0, background: '#0e1014', border: '1px solid ' + qrColor + '40', borderRadius: 3, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {qrImg ? (
                      <img src={qrImg} alt={qrName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ fontSize: 36, color: qrColor }}>{qrSymbol}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: qrColor, letterSpacing: 1.5, marginBottom: 3 }}>
                      {qrName.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginBottom: 5, fontFamily: 'monospace' }}>
                      {quizResult.role || '—'}
                    </div>
                    {quizResult.lore_tagline && (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: 1.5 }}>
                        "{quizResult.lore_tagline}"
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Link href={'/shells/' + qrName.toLowerCase()} style={{ flex: 1, minWidth: 180, padding: '12px', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, textDecoration: 'none', textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', letterSpacing: 1 }}>
                    READ THE GUIDE
                  </Link>
                  <Link href={'/advisor?shell=' + qrName.toLowerCase()} style={{ flex: 1, minWidth: 180, padding: '12px', background: '#ff8800', border: 'none', borderRadius: 2, textDecoration: 'none', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#000', letterSpacing: 1 }}>
                    BUILD A LOADOUT →
                  </Link>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, paddingTop: 14, borderTop: '1px solid #22252e' }}>
                  <button onClick={resetQuiz} style={{ fontSize: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit', fontWeight: 700 }}>
                    ← Retake Quiz
                  </button>
                  <div style={{ flex: 1 }} />
                  <button onClick={function() { setQuizOpen(false); }} style={{ fontSize: 10, background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit', fontWeight: 700 }}>
                    ✕ Close
                  </button>
                </div>
              </>
            ) : (
              /* No result found — fallback */
              <>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 16 }}>
                  No shell matched your answers perfectly. Try the Build Advisor for a custom loadout.
                </div>
                <Link href="/advisor" style={{ display: 'block', padding: '12px', background: '#ff8800', borderRadius: 2, textDecoration: 'none', textAlign: 'center', fontSize: 11, fontWeight: 800, color: '#000', letterSpacing: 1 }}>
                  OPEN BUILD ADVISOR →
                </Link>
                <button onClick={resetQuiz} style={{ marginTop: 12, background: 'none', border: 'none', fontSize: 10, color: 'rgba(255,255,255,0.35)', cursor: 'pointer', letterSpacing: 1, fontFamily: 'inherit', fontWeight: 700 }}>
                  ← Retake Quiz
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}