import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Create Account | CyberneticPunks',
  description: 'Connect your Bungie account and claim your Runner profile.',
};

export default async function JoinPage({ searchParams }) {
  // Already logged in — send to profile
  var cookieStore = await cookies();
  var playerId = cookieStore.get('cp_player_id')?.value;
  if (playerId) redirect('/me');

  var error = searchParams?.error;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#121418',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      fontFamily: 'system-ui, sans-serif',
    }}>

      <div style={{ maxWidth: 460, width: '100%' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 40, justifyContent: 'center' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff2222', boxShadow: '0 0 8px rgba(255,34,34,0.6)' }} />
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, letterSpacing: '2px', color: '#fff' }}>
            CYBERNETIC<span style={{ color: '#ff2222' }}>PUNKS</span>
          </span>
        </div>

        {/* Main card */}
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00ff41', borderRadius: '0 0 3px 3px', padding: '32px 28px', marginBottom: 1 }}>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.2)', borderRadius: 2, fontSize: 8, fontWeight: 700, letterSpacing: 2, color: '#00ff41', marginBottom: 18 }}>
            <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00ff41' }} />
            EARLY ACCESS
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1, margin: '0 0 12px', color: '#fff' }}>
            Create your<br />Runner profile.
          </h1>

          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, margin: '0 0 28px' }}>
            Connect your Bungie account to claim your profile, earn Early Adopter status, and get priority access when new tools launch.
          </p>

          {error && (
            <div style={{ background: 'rgba(255,34,34,0.06)', border: '1px solid rgba(255,34,34,0.2)', borderRadius: 2, padding: '10px 14px', marginBottom: 16, fontSize: 10, color: 'rgba(255,100,100,0.8)', letterSpacing: 1, fontFamily: 'monospace' }}>
              ⚠ AUTHENTICATION ERROR — PLEASE TRY AGAIN
            </div>
          )}

          <a
            href="/api/auth/bungie"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '13px 24px',
              background: '#00ff41',
              color: '#000',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '1px',
              borderRadius: 2,
              textDecoration: 'none',
              marginBottom: 12,
            }}
          >
            CONNECT BUNGIE ACCOUNT
          </a>

          <div style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, fontFamily: 'monospace' }}>
            SECURE · NO PASSWORD STORED · BUNGIE OAUTH 2.0
          </div>
        </div>

        {/* Value props */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: '#1e2028' }}>
          {[
            { icon: '⬡', color: '#00ff41',  label: 'RUNNER PROFILE',   desc: 'Your shell, playstyle and platform badge' },
            { icon: '◈', color: '#ff2222',   label: 'EARLY ADOPTER',    desc: 'Permanent status for founding members' },
            { icon: '◎', color: '#9b5de5',   label: 'PRIORITY ACCESS',  desc: 'First in line when new tools launch' },
          ].map(function(item) {
            return (
              <div key={item.label} style={{ background: '#121418', padding: '18px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: 20, color: item.color, marginBottom: 8, opacity: 0.7 }}>{item.icon}</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(255,255,255,0.45)', marginBottom: 5, textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            );
          })}
        </div>

        {/* Already have an account */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/api/auth/bungie" style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', letterSpacing: 1, fontFamily: 'monospace' }}>
            Already registered? Sign in →
          </a>
        </div>

      </div>
    </div>
  );
}