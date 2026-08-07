// app/dmz/builds/saved/page.js
// PRIVATE "your saved builds" surface. Session-gated on the ACCOUNT (accountId), NOT on
// hasMarathonProfile -- a Discord/DMZ-only user must reach their own saves. Server component: reads
// the session + queries saved_build directly with the service key (saved_build is RLS service-role-
// only). Re-resolves each build_ref (weapon_slug) to the current weapon name -> a card linking
// /dmz/builds/[weapon]. Empty-state when none. noindex (private, per-user). force-dynamic.

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { resolveSession } from '@/lib/auth/resolveSession';
import { SAVED_GAME_SLUG } from '@/lib/dmz/savedBuilds';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your Saved Builds', robots: { index: false, follow: false } };

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function titleCase(slug) {
  return String(slug || '').split('-').map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
}

export default async function SavedBuildsPage() {
  var supabase = getSupabase();
  var session = await resolveSession({ supabase });
  // ACCOUNT-gated (not Marathon): a logged-out or un-bridged (no accountId) session -> /join.
  if (!session || !session.accountId) redirect('/join');

  var { data: saves } = await supabase
    .from('saved_build')
    .select('build_ref, saved_at')
    .eq('account_id', session.accountId).eq('game_slug', SAVED_GAME_SLUG)
    .order('saved_at', { ascending: false });
  var rows = saves || [];

  // Re-resolve the weapon names in ONE batch read (build_ref = weapon_slug).
  var nameBySlug = {};
  if (rows.length > 0) {
    var slugs = rows.map(function (r) { return r.build_ref; });
    var { data: weapons } = await supabase
      .from('dmz_weapons')
      .select('slug, name')
      .eq('game_slug', SAVED_GAME_SLUG).in('slug', slugs);
    (weapons || []).forEach(function (w) { if (w.slug) nameBySlug[w.slug] = w.name; });
  }

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px 96px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
        <Link href="/dmz" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>DMZ</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <Link href="/dmz/builds" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>BUILDS</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>SAVED</span>
      </div>

      <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, letterSpacing: 1, color: '#fff', margin: '0 0 12px' }}>
        Your Saved Builds
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 640, margin: '0 0 30px' }}>
        The DMZ weapon builds you saved. Open one to see the current FOB loadout.
      </p>

      {rows.length === 0 ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '40px 28px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 auto 22px', maxWidth: 480, lineHeight: 1.6 }}>
            You have not saved any builds yet. Open a weapon build and hit Save to keep it here.
          </p>
          <Link href="/dmz/builds" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px' }}>
            Browse builds &rarr;
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
          {rows.map(function (r) {
            var name = nameBySlug[r.build_ref] || titleCase(r.build_ref);
            return (
              <Link key={r.build_ref} href={'/dmz/builds/' + r.build_ref} style={{ display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '2px solid var(--green)', borderRadius: '0 3px 3px 0', padding: '14px 16px', textDecoration: 'none' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 5 }}>{name}</div>
                <div style={{ fontSize: 9, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace', color: 'var(--text-tertiary)' }}>
                  Saved build
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
