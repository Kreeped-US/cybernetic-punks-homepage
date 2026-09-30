'use client';

// app/(network)/welcome/WelcomeClient.js
// Client component for the welcome screen.
// Renders four intent options. On click:
// 1) Fire site_events analytics ('signup_intent', { intent: 'build' | 'meta' | 'intel' | 'skip' })
// 2) Call /api/welcome/complete to mark player_profiles.has_seen_welcome = true
// 3) Navigate to destination
// All steps are non-blocking — clicks redirect immediately, side effects fire async.
//
// NETWORK THEME (2026-09-30): page moved into app/(network)/, so it renders inside .cnp-root with
// NetworkNav + NetworkFooter. Surfaces + the Marathon-green (#00ff41) accents are swapped for burgundy/
// gold tokens; the four INTENT CARDS keep their per-EDITOR accent colors (DEXTER orange / NEXUS cyan /
// GHOST green / neutral) -- those are the editor palette used site-wide, not the Marathon site-green.
// No full-screen vh layout: the network layout owns page height.
//
// Coach tease section (added May 8, 2026): Personal Coach is the planned
// monetization product. The tease establishes its presence at first signup
// without forcing the funnel. Non-interactive for now.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/useTrack';

// ─── INTENT CARDS ────────────────────────────────────────────
// Each card is one path the user can choose. Colors are the EDITOR palette (kept on purpose).
const INTENT_CARDS = [
  {
    intent:  'build',
    label:   'BUILD A LOADOUT',
    sublabel: 'Our build AI engineers a complete build tuned to your shell, playstyle, and rank target.',
    symbol:  '⬢',
    color:   '#ff8800', // DEXTER orange
    href:    '/marathon/advisor',
  },
  {
    intent:  'meta',
    label:   'BROWSE THE META',
    sublabel: 'Live tier list ranking every weapon and shell. Updated by our meta AI throughout the day.',
    symbol:  '⬡',
    color:   '#00d4ff', // NEXUS cyan
    href:    '/marathon/meta',
  },
  {
    intent:  'intel',
    label:   'READ INTEL',
    sublabel: 'Plays, builds, meta shifts, and community pulse from six AI editors.',
    symbol:  '◇',
    color:   '#00ff88', // GHOST green (editor palette)
    href:    '/marathon/intel',
  },
  {
    intent:  'skip',
    label:   'JUST LOOKING',
    sublabel: 'Drop me on the homepage. I\'ll explore on my own.',
    symbol:  '→',
    color:   'var(--text-dim)',
    href:    '/',
  },
];

export default function WelcomeClient({ displayName, playerId }) {
  const router = useRouter();
  const [selected, setSelected] = useState(null);

  async function handleSelect(card) {
    // Optimistic UI: highlight the selected card immediately
    setSelected(card.intent);

    // Fire analytics event (non-blocking)
    try {
      track('signup_intent', { intent: card.intent });
    } catch (_) {}

    // Mark profile complete server-side (non-blocking)
    try {
      fetch('/api/welcome/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, intent: card.intent }),
      }).catch(function() {});
    } catch (_) {}

    // Navigate to destination
    router.push(card.href);
  }

  return (
    <main style={{ padding: '40px 0 72px' }}>

      <style>{`
        .welcome-card { transition: background 0.15s, border-color 0.15s, transform 0.1s; }
        .welcome-card:hover { background: var(--surface-2) !important; }
        .welcome-card:active { transform: translateY(1px); }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

        {/* ══ HEADER ═════════════════════════════════════════ */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', boxShadow: '0 0 6px var(--burg-glow)' }} />
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--gold)', letterSpacing: 3, fontWeight: 700 }}>
              SIGNAL ACQUIRED · WELCOME PLAYER
            </span>
          </div>

          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4.5vw, 42px)', fontWeight: 700, letterSpacing: '-1px', lineHeight: 1.05, margin: '0 0 14px', color: 'var(--text)' }}>
            {displayName ? (
              <>Welcome,<br/><span style={{ color: 'var(--gold)' }}>{displayName}.</span></>
            ) : (
              <>Welcome to<br/><span style={{ color: 'var(--gold)' }}>Cybernetic Punks.</span></>
            )}
          </h1>

          <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
            Six AI editors track Marathon throughout the day — plays, meta, builds, community pulse, field guides. Pick where to start.
          </p>
        </section>

        {/* ══ INTENT CARDS ═══════════════════════════════════ */}
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>
              What brings you here today?
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {INTENT_CARDS.map(function(card) {
              const isSelected = selected === card.intent;
              return (
                <button
                  key={card.intent}
                  onClick={function() { handleSelect(card); }}
                  disabled={selected !== null}
                  className="welcome-card"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '16px 20px',
                    background: isSelected ? 'var(--surface-2)' : 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderLeft: '3px solid ' + card.color,
                    borderRadius: '0 3px 3px 0',
                    cursor: selected !== null ? 'default' : 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    color: 'inherit',
                    width: '100%',
                    opacity: selected !== null && !isSelected ? 0.4 : 1,
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 2, background: 'var(--base)', border: '1px solid ' + card.color + '40', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, color: card.color }}>
                    {card.symbol}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 700, color: card.color, letterSpacing: 1.5, marginBottom: 4 }}>
                      {card.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                      {card.sublabel}
                    </div>
                  </div>

                  <span style={{ fontSize: 14, color: card.color, opacity: 0.5, flexShrink: 0, fontWeight: 700 }}>
                    →
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ══ COACH TEASE ════════════════════════════════════ */}
        <section style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-dim)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>
              On the way
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px', background: 'transparent', border: '1px dashed var(--line)', borderRadius: 3, opacity: 0.8 }}>
            <div style={{ width: 38, height: 38, borderRadius: 2, background: 'var(--base)', border: '1px dashed var(--burg-bright)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 18, color: 'var(--burg-bright)' }}>
              ◈
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: 1.5 }}>
                  PERSONAL COACH
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--gold)', letterSpacing: 2, fontWeight: 700, padding: '2px 6px', border: '1px solid rgba(232,181,77,0.3)', borderRadius: 2 }}>
                  COMING SOON
                </span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Tailored ranked progression plans. Climb path tuned to your shell, holotag, and time budget.
              </div>
            </div>
          </div>
        </section>

        {/* ══ FOOTNOTE ═══════════════════════════════════════ */}
        <section style={{ marginTop: 28, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--text-dim)', opacity: 0.7, letterSpacing: 2, fontWeight: 700 }}>
            YOU CAN CHANGE PATHS ANY TIME · MAIN NAV ALWAYS AVAILABLE
          </div>
        </section>

      </div>
    </main>
  );
}
