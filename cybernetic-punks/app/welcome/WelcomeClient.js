'use client';

// app/welcome/WelcomeClient.js
// Client component for the welcome screen.
// Renders four intent options. On click:
// 1) Fire site_events analytics ('signup_intent', { intent: 'build' | 'meta' | 'intel' | 'skip' })
// 2) Call /api/welcome/complete to mark player_profiles.has_seen_welcome = true
// 3) Navigate to destination
// All steps are non-blocking — clicks redirect immediately, side effects fire async.
//
// Coach tease section (added May 8, 2026): Personal Coach is the planned
// monetization product. The tease establishes its presence at first signup
// without forcing the funnel. Non-interactive for now — when Coach launches,
// this becomes the conversion entry point and we wire up click-through.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/useTrack';

// ─── INTENT CARDS ────────────────────────────────────────────
// Each card represents one path the user can choose.
// Colors match the editor color palette for thematic consistency.

const INTENT_CARDS = [
  {
    intent:  'build',
    label:   'BUILD A LOADOUT',
    sublabel: 'DEXTER engineers a complete build tuned to your shell, playstyle, and rank target.',
    symbol:  '⬢',
    color:   '#ff8800', // DEXTER orange
    href:    '/advisor',
  },
  {
    intent:  'meta',
    label:   'BROWSE THE META',
    sublabel: 'Live tier list ranking every weapon and shell. Updated by NEXUS every 6 hours.',
    symbol:  '⬡',
    color:   '#00d4ff', // NEXUS cyan
    href:    '/meta',
  },
  {
    intent:  'intel',
    label:   'READ INTEL',
    sublabel: 'Plays, builds, meta shifts, and community pulse from five AI editors.',
    symbol:  '◇',
    color:   '#00ff88', // GHOST green
    href:    '/intel',
  },
  {
    intent:  'skip',
    label:   'JUST LOOKING',
    sublabel: 'Drop me on the homepage. I\'ll explore on my own.',
    symbol:  '→',
    color:   'rgba(255,255,255,0.4)',
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
    // If this fails, user is still navigated — they just might see /welcome
    // again on next signin, which is recoverable.
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
    <main style={{
      background: '#121418',
      minHeight: '100vh',
      color: '#fff',
      paddingTop: 32,
      paddingBottom: 80,
      fontFamily: 'system-ui, sans-serif',
    }}>

      <style>{`
        .welcome-card {
          transition: background 0.15s, border-color 0.15s, transform 0.1s;
        }
        .welcome-card:hover {
          background: #1e2228 !important;
        }
        .welcome-card:active {
          transform: translateY(1px);
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>

        {/* ══ HEADER ═════════════════════════════════════════ */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: '#00ff41',
              boxShadow: '0 0 6px rgba(0,255,65,0.5)',
            }} />
            <span style={{
              fontSize: 10,
              color: '#00ff41',
              letterSpacing: 3,
              fontWeight: 700,
            }}>
              SIGNAL ACQUIRED · WELCOME RUNNER
            </span>
          </div>

          <h1 style={{
            fontSize: 'clamp(28px, 4.5vw, 42px)',
            fontWeight: 900,
            letterSpacing: '-1px',
            lineHeight: 1.05,
            margin: '0 0 14px',
            color: '#fff',
            fontFamily: 'Orbitron, monospace',
          }}>
            {displayName ? (
              <>Welcome,<br/><span style={{ color: '#00ff41' }}>{displayName}.</span></>
            ) : (
              <>Welcome to<br/><span style={{ color: '#00ff41' }}>CyberneticPunks.</span></>
            )}
          </h1>

          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.45)',
            lineHeight: 1.6,
            maxWidth: 520,
            margin: 0,
          }}>
            Five AI editors track Marathon every 6 hours — plays, meta, builds, community pulse, field guides. Pick where to start.
          </p>
        </section>

        {/* ══ INTENT CARDS ═══════════════════════════════════ */}
        <section>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}>
            <span style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: 3,
              fontWeight: 700,
              textTransform: 'uppercase',
              fontFamily: 'monospace',
            }}>
              What brings you here today?
            </span>
            <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
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
                    background: isSelected ? '#1e2228' : '#1a1d24',
                    border: '1px solid #22252e',
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
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    background: '#0e1014',
                    border: '1px solid ' + card.color + '40',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 18,
                    color: card.color,
                  }}>
                    {card.symbol}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'Orbitron, monospace',
                      fontSize: 13,
                      fontWeight: 800,
                      color: card.color,
                      letterSpacing: 1.5,
                      marginBottom: 4,
                    }}>
                      {card.label}
                    </div>
                    <div style={{
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.45)',
                      lineHeight: 1.5,
                    }}>
                      {card.sublabel}
                    </div>
                  </div>

                  <span style={{
                    fontSize: 14,
                    color: card.color,
                    opacity: 0.5,
                    flexShrink: 0,
                    fontWeight: 700,
                  }}>
                    →
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ══ COACH TEASE ════════════════════════════════════ */}
        {/* Establishes Personal Coach presence at first signup without
            forcing the funnel. Non-interactive — visual presence only.
            When Coach launches, replace the [COMING SOON] badge with
            an active CTA and wire up the click handler. */}
        <section style={{ marginTop: 28 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 14,
          }}>
            <span style={{
              fontSize: 10,
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: 3,
              fontWeight: 700,
              textTransform: 'uppercase',
              fontFamily: 'monospace',
            }}>
              On the way
            </span>
            <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '16px 20px',
            background: 'transparent',
            border: '1px dashed #2a2d36',
            borderRadius: 3,
            opacity: 0.7,
          }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 2,
              background: '#0e1014',
              border: '1px dashed #ff2d5560',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: 18,
              color: '#ff2d55',
            }}>
              ◈
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#ff2d55',
                  letterSpacing: 1.5,
                }}>
                  PERSONAL COACH
                </span>
                <span style={{
                  fontSize: 9,
                  color: 'rgba(255,45,85,0.7)',
                  letterSpacing: 2,
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  padding: '2px 6px',
                  border: '1px solid rgba(255,45,85,0.3)',
                  borderRadius: 2,
                }}>
                  COMING SOON
                </span>
              </div>
              <div style={{
                fontSize: 12,
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.5,
              }}>
                Tailored ranked progression plans. Climb path tuned to your shell, holotag, and time budget.
              </div>
            </div>
          </div>
        </section>

        {/* ══ FOOTNOTE ═══════════════════════════════════════ */}
        <section style={{ marginTop: 28, textAlign: 'center' }}>
          <div style={{
            fontSize: 9,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: 2,
            fontFamily: 'monospace',
            fontWeight: 700,
          }}>
            YOU CAN CHANGE PATHS ANY TIME · MAIN NAV ALWAYS AVAILABLE
          </div>
        </section>

      </div>
    </main>
  );
}