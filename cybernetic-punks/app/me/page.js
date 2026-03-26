import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

function platformLabel(platform) {
  const map = { ps5: 'PS5', xbox: 'XBOX SERIES X|S', pc: 'PC · STEAM', bungie: 'PC' };
  return map[platform] || 'PC';
}

export const metadata = {
  title: 'Runner Profile | CyberneticPunks',
};

export default async function MePage() {
  const cookieStore = await cookies();
  const playerId = cookieStore.get('cp_player_id')?.value;

  if (!playerId) {
    redirect('/join');
  }

  const supabase = getSupabase();

  const { data: player, error } = await supabase
    .from('player_profiles')
    .select('*')
    .eq('id', playerId)
    .single();

  if (error || !player) {
    redirect('/join');
  }

  const initials = player.bungie_display_name
    .replace(/#\d+/, '')
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#030303',
      fontFamily: "'Rajdhani', sans-serif",
      color: '#fff',
      position: 'relative',
    }}>

      {/* Grid background */}
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundImage: 'linear-gradient(rgba(0,245,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.035) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          borderBottom: '1px solid rgba(0,245,255,0.08)',
          padding: '18px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

            {/* Avatar */}
            {player.bungie_avatar_url ? (
              <img
                src={player.bungie_avatar_url}
                alt="Bungie avatar"
                width={40}
                height={40}
                style={{
                  borderRadius: '50%',
                  border: '1px solid rgba(0,245,255,0.25)',
                }}
              />
            ) : (
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(0,245,255,0.1)',
                border: '1px solid rgba(0,245,255,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '13px',
                color: '#00f5ff',
                fontWeight: 700,
              }}>{initials}</div>
            )}

            <div>
              <div style={{
                fontFamily: "'Orbitron', sans-serif",
                fontSize: '13px',
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '2px',
              }}>
                {player.bungie_display_name.replace(/#\d+/, '').trim()}
              </div>
              <div style={{
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '8px',
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '2px',
                marginTop: '3px',
              }}>
                {platformLabel(player.platform)} · SCOUT TIER · PROFILE ACTIVE
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '8px',
              color: 'rgba(0,245,255,0.5)',
              letterSpacing: '2px',
              textAlign: 'right',
            }}>
              <div>MEMBER SINCE</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>
                {new Date(player.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div style={{ padding: '48px 36px', maxWidth: '900px', margin: '0 auto' }}>

          {/* Welcome block */}
          <div style={{
            background: 'rgba(0,245,255,0.03)',
            border: '1px solid rgba(0,245,255,0.1)',
            borderRadius: '4px',
            padding: '36px 40px',
            marginBottom: '24px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: "'Share Tech Mono', monospace",
              color: 'rgba(0,245,255,0.5)',
              fontSize: '9px',
              letterSpacing: '4px',
              marginBottom: '16px',
            }}>BUNGIE IDENTITY CONFIRMED</div>

            <div style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: '24px',
              fontWeight: 900,
              color: '#fff',
              letterSpacing: '4px',
              marginBottom: '12px',
            }}>
              RUNNER PROFILE INITIALIZED
            </div>

            <p style={{
              color: 'rgba(255,255,255,0.4)',
              fontSize: '14px',
              lineHeight: 2,
              margin: '0 0 32px',
              maxWidth: '480px',
              marginLeft: 'auto',
              marginRight: 'auto',
            }}>
              Your identity is locked. The next step is your Runner Intake — twelve questions that calibrate our editors to your playstyle, loadout, and goals. Takes about four minutes.
            </p>

            <a
              href="/join/intake"
              style={{
                display: 'inline-block',
                background: 'rgba(0,245,255,0.07)',
                border: '1px solid rgba(0,245,255,0.45)',
                color: '#00f5ff',
                fontFamily: "'Share Tech Mono', monospace",
                fontSize: '11px',
                letterSpacing: '4px',
                padding: '16px 48px',
                borderRadius: '3px',
                textDecoration: 'none',
              }}
            >
              BEGIN RUNNER INTAKE →
            </a>
          </div>

          {/* Status grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px',
            marginBottom: '24px',
          }}>
            {[
              { label: 'BUNGIE IDENTITY', value: 'CONFIRMED', color: '#00ff88' },
              { label: 'RUNNER INTAKE', value: 'PENDING', color: '#ff8800' },
              { label: 'FULL AUDIT', value: 'LOCKED', color: 'rgba(255,255,255,0.2)' },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '3px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                <div style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '7px',
                  color: 'rgba(255,255,255,0.25)',
                  letterSpacing: '2px',
                  marginBottom: '10px',
                }}>{item.label}</div>
                <div style={{
                  fontFamily: "'Share Tech Mono', monospace",
                  fontSize: '11px',
                  color: item.color,
                  letterSpacing: '3px',
                }}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Editor preview strip */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '4px',
            padding: '24px 28px',
          }}>
            <div style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '8px',
              color: 'rgba(255,255,255,0.25)',
              letterSpacing: '3px',
              marginBottom: '20px',
            }}>YOUR EDITORS · STANDING BY</div>

            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {[
                { sym: '◈', color: '#ff0000', name: 'CIPHER', role: 'Play Analyst', status: 'READY' },
                { sym: '⬡', color: '#00f5ff', name: 'NEXUS', role: 'Meta Strategist', status: 'READY' },
                { sym: '⬢', color: '#ff8800', name: 'DEXTER', role: 'Build Engineer', status: 'READY' },
                { sym: '◇', color: '#00ff88', name: 'GHOST', role: 'Community Pulse', status: 'READY' },
                { sym: '◎', color: '#9b5de5', name: 'MIRANDA', role: 'Field Guide', status: 'READY' },
              ].map((ed) => (
                <div key={ed.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flex: '1',
                  minWidth: '140px',
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid rgba(255,255,255,0.05)`,
                  borderRadius: '3px',
                }}>
                  <span style={{ color: ed.color, fontSize: '18px' }}>{ed.sym}</span>
                  <div>
                    <div style={{
                      fontFamily: "'Share Tech Mono', monospace",
                      fontSize: '9px',
                      color: ed.color,
                      letterSpacing: '2px',
                      marginBottom: '3px',
                    }}>{ed.name}</div>
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(255,255,255,0.3)',
                    }}>{ed.role}</div>
                  </div>
                  <div style={{
                    marginLeft: 'auto',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: '#00ff88',
                    boxShadow: '0 0 6px rgba(0,255,136,0.6)',
                  }} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
