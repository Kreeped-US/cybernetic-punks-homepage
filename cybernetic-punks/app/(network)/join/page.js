import { resolveSession } from '@/lib/auth/resolveSession';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { isValidGameIntent } from '@/lib/network/rootGames';

export const metadata = {
  // Manual suffix REMOVED - was double-appended by the root layout template.
  title: 'Join the Network',
  description: 'Sign in to claim your handle and profile.',
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

export default async function JoinPage({ searchParams }) {
  // Logged-in users go to their OWN profile. Order preserves the no-loop property:
  //   1. accountId present -> their network_account handle -> /u/[handle] (covers
  //      Discord-only AND bridged Bungie users). /u/[handle] is a PUBLIC page that
  //      never redirects away, so sending logged-in users there can never loop.
  //   2. else playerProfileId (un-bridged Bungie: a Marathon profile but no account
  //      yet) -> /me (the existing safe path; they have a profile so /me renders).
  //   3. else (logged out / unresolvable) -> render the signup form below.
  // Defensive: if accountId resolves no handle (shouldn't happen -- every account has
  // one), fall through rather than redirect to a broken /u/.
  var session = await resolveSession();

  if (session?.accountId) {
    var supabase = getSupabase();
    var { data: acct } = await supabase
      .from('network_account')
      .select('handle')
      .eq('id', session.accountId)
      .maybeSingle();
    if (acct?.handle) redirect('/u/' + acct.handle);
  }

  if (session?.playerProfileId) redirect('/me');

  var error = searchParams?.error;

  // Ruling 3 Stage 2: forward a validated game intent onto the sign-in link so the OAuth
  // flow can capture it (startOAuth reads ?intent= and sets the cp_intent cookie). Valid
  // intents = the front-door games (isValidGameIntent, derived from ROOT_GAMES) so any
  // game-scoped join link works; anything else -> no param.
  var rawIntent = searchParams?.intent;
  var validIntent = isValidGameIntent(rawIntent) ? rawIntent : null;
  var discordHref = '/api/auth/discord' + (validIntent ? '?intent=' + validIntent : '');

  // NETWORK THEME (2026-09-30): page moved into app/(network)/, so it renders inside .cnp-root with
  // NetworkNav + NetworkFooter (the layout supplies the logo/wordmark -- no duplicate in-card logo here).
  // A centered card in the network body replaces the former full-screen vh-centered Marathon-green layout;
  // every #00ff41/Marathon accent is swapped for a burgundy/gold token. The Discord button stays blurple
  // (#5865f2) -- that is Discord's brand, not ours.
  return (
    <main style={{ maxWidth: 460, margin: '0 auto', padding: '52px 24px 84px' }}>
      <style>{
        '.cnp-root .join-signin span:last-child{transition:text-decoration-color .15s}' +
        '.cnp-root .join-signin:hover span:last-child,.cnp-root .join-signin:focus-visible span:last-child{text-decoration:underline}'
      }</style>

      {/* Registration card */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderTop: '2px solid var(--gold)', borderRadius: 3, padding: '30px 28px' }}>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', background: 'rgba(232,181,77,0.1)', border: '1px solid rgba(232,181,77,0.28)', borderRadius: 2, fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 18 }}>
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)' }} aria-hidden="true" />
          Network registration
        </div>

        <h1 style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.5px', lineHeight: 1.1, margin: '0 0 12px', color: 'var(--text)' }}>
          Join the<br />network.
        </h1>

        <p style={{ fontSize: 14.5, color: 'var(--text-dim)', lineHeight: 1.7, margin: '0 0 26px' }}>
          Sign in to claim your handle, save your profile, and get first access as new tools and games launch.
        </p>

        {error && (
          <div style={{ background: 'rgba(255,32,56,0.08)', border: '1px solid rgba(255,32,56,0.28)', borderRadius: 2, padding: '10px 14px', marginBottom: 16, fontSize: 10, color: 'var(--red)', letterSpacing: 1, fontFamily: 'var(--mono)' }}>
            AUTHENTICATION ERROR - PLEASE TRY AGAIN
          </div>
        )}

        <a
          href={discordHref}
          style={{
            display: 'block',
            textAlign: 'center',
            padding: '13px 24px',
            background: '#5865f2',
            color: '#fff',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '1px',
            borderRadius: 2,
            textDecoration: 'none',
            marginBottom: 12,
          }}
        >
          SIGN IN WITH DISCORD
        </a>

        <div style={{ textAlign: 'center', fontSize: 9, color: 'var(--text-dim)', opacity: 0.6, letterSpacing: 2, fontFamily: 'var(--mono)' }}>
          SECURE &middot; NO PASSWORD STORED &middot; OAUTH 2.0
        </div>
      </div>

      {/* Already registered -- secondary to the Discord button but noticeable: sits directly under the
          card, sized to the lede, "Sign in" in the gold accent, 44px tap target. Same href/behavior. */}
      <div style={{ textAlign: 'center', marginTop: 14 }}>
        <a href={discordHref} className="join-signin" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '0 8px', fontSize: 14.5, fontFamily: 'var(--body)', textDecoration: 'none' }}>
          <span style={{ color: 'var(--text-dim)' }}>Already registered?&nbsp;</span>
          <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Sign in &rarr;</span>
        </a>
      </div>

      {/* Value props */}
      <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 3, overflow: 'hidden' }}>
        {[
          { icon: '⬡', color: 'var(--gold)',        label: 'PROFILE',                desc: 'Your handle, avatar and bio' },
          { icon: '◈', color: 'var(--red)',         label: 'VERIFIED',               desc: 'Every stat carries its source and a confidence tier.' },
          { icon: '◎', color: 'var(--burg-bright)', label: 'YOUR GAMES, YOUR INTEL', desc: 'Tell us which games you follow; we point you at the coverage that matters. Change it anytime.' },
        ].map(function(item) {
          return (
            <div key={item.label} style={{ background: 'var(--base)', padding: '18px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, color: item.color, marginBottom: 8, opacity: 0.85 }}>{item.icon}</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-dim)', marginBottom: 5, textTransform: 'uppercase' }}>{item.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-dim)', opacity: 0.8, lineHeight: 1.6 }}>{item.desc}</div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
