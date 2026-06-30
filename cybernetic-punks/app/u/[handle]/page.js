// app/u/[handle]/page.js
// PUBLIC network-account profile page. Anyone can view; reads network_account by
// handle server-side with the service-key client (RLS is service-role-only -- no
// policy needed, matches the codebase pattern). v1 = identity only: avatar, display
// name, handle, member-since, bio, accent, provider-type badges, and a Plays-Marathon
// badge. Career / builds / coach are deferred (their tables do not exist yet).
// Editing is stage b; the /join redirect is stage c.
//
// SECURITY: exposes ONLY public display fields. NEVER external_id, the account uuid
// (used only in server-side queries, never rendered), updated_at, or any
// player_profiles internals. Provider TYPES only (no external ids).
//
// Reuses the profile-preview brand palette + the ShareableCard visual structure,
// but with REAL data and neutral copy (no "Operative"/"Runner"). Server component,
// presentational: no event handlers, server <img> with NO onError. No module-scope
// createClient.

import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { resolveSession } from '@/lib/auth/resolveSession';
import { brand } from '@/app/profile-preview/brand';
import EditProfile from './EditProfile';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  var handle = String((await params).handle || '').toLowerCase();
  return { title: '@' + handle };
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

// Provider TYPE -> badge label + accent. Types only; external_id is never read.
var PROVIDER_BADGES = {
  bungie:     { label: 'Bungie',      color: '#00a3e0' },
  discord:    { label: 'Discord',     color: '#5865f2' },
  activision: { label: 'Activision',  color: '#9aa0a6' },
  xbox:       { label: 'Xbox',        color: '#107c10' },
  psn:        { label: 'PlayStation', color: '#0070d1' },
  steam:      { label: 'Steam',       color: '#66c0f4' },
};

function memberSince(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch (e) {
    return '';
  }
}

function initialOf(name) {
  var s = (name || '').trim();
  return s ? s.charAt(0).toUpperCase() : '?';
}

export default async function ProfilePage({ params }) {
  // The login bridge slugifies handles to lowercase -- lowercase the param so
  // /u/Kreeped and /u/kreeped both resolve.
  var handle = String((await params).handle || '').toLowerCase();
  if (!handle) notFound();

  var supabase = getSupabase();

  var { data: account } = await supabase
    .from('network_account')
    .select('id, handle, display_name, bio, accent_color, avatar_url, created_at')
    .eq('handle', handle)
    .maybeSingle();

  if (!account) notFound();

  // Linked provider TYPES (badges) -- never external_id.
  var { data: links } = await supabase
    .from('linked_identity')
    .select('provider, provider_avatar_url')
    .eq('account_id', account.id);
  var providers = [];
  var seen = {};
  (links || []).forEach(function(l) {
    if (l && l.provider && !seen[l.provider]) { seen[l.provider] = true; providers.push(l.provider); }
  });

  // Provider avatar URLs, deduped by provider. Built here but ONLY passed to the
  // owner's EditProfile (rendered only when isOwner) -- non-owners never receive it.
  var providerAvatars = [];
  var seenAv = {};
  (links || []).forEach(function(l) {
    if (l && l.provider && l.provider_avatar_url && !seenAv[l.provider]) {
      seenAv[l.provider] = true;
      providerAvatars.push({ provider: l.provider, url: l.provider_avatar_url });
    }
  });

  // Does this account have a Marathon (player_profiles) slice?
  var { data: marathon } = await supabase
    .from('player_profiles')
    .select('id')
    .eq('account_id', account.id)
    .maybeSingle();
  var playsMarathon = !!(marathon && marathon.id);

  // Owner detection (drives the owner hint now; the Edit affordance lands in stage b).
  var session = await resolveSession({ supabase });
  var isOwner = !!(session && session.accountId && session.accountId === account.id);

  var displayName = account.display_name || account.handle;
  var accent = account.accent_color || brand.marathon;
  var since = memberSince(account.created_at);

  return (
    <main style={{ minHeight: '100vh', background: brand.bg, color: brand.text, paddingTop: 64, paddingBottom: 96 }}>
      <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 16px' }}>

        {isOwner && (
          <EditProfile
            account={{ handle: account.handle, display_name: account.display_name, bio: account.bio, accent_color: account.accent_color, avatar_url: account.avatar_url }}
            providerAvatars={providerAvatars}
          />
        )}

        <div style={{ background: brand.panel, border: '1px solid ' + brand.borderHi, borderRadius: 10, overflow: 'hidden', boxShadow: '0 18px 50px rgba(0,0,0,0.5)' }}>

          {/* Brand header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 18px', borderBottom: '1px solid ' + brand.border, background: brand.bg }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: brand.dmz, boxShadow: '0 0 8px rgba(63,125,68,0.5)' }} />
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, letterSpacing: 2.5, color: '#fff' }}>
              CYBERNETIC<span style={{ color: brand.textDim }}>PUNKS</span>
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 8, letterSpacing: 1.5, color: brand.textFaint, textTransform: 'uppercase' }}>
              Intelligence Network
            </span>
          </div>

          {/* Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '18px 18px 14px' }}>
            {account.avatar_url ? (
              <img src={account.avatar_url} alt="" width={56} height={56} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', border: '2px solid ' + accent, flexShrink: 0, display: 'block' }} />
            ) : (
              <div style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid ' + accent, background: brand.panelHi, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron, monospace', fontWeight: 800, fontSize: 22, color: accent, flexShrink: 0 }}>
                {initialOf(displayName)}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ fontSize: 12, color: brand.textDim, marginTop: 2 }}>@{account.handle}</div>
              {since && (
                <div style={{ fontSize: 10, color: brand.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginTop: 4 }}>
                  Member since {since}
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {account.bio && (
            <div style={{ padding: '0 18px 14px' }}>
              <p style={{ fontSize: 13, color: brand.text, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>{account.bio}</p>
            </div>
          )}

          {/* Badges: provider types + Marathon */}
          {(providers.length > 0 || playsMarathon) && (
            <div style={{ padding: '0 18px 18px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {providers.map(function(prov) {
                var b = PROVIDER_BADGES[prov] || { label: prov, color: brand.textDim };
                return (
                  <span key={prov} style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: b.color, border: '1px solid ' + b.color + '55', background: b.color + '14', borderRadius: 2, padding: '3px 9px' }}>
                    {b.label}
                  </span>
                );
              })}
              {playsMarathon && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: brand.marathon, border: '1px solid ' + brand.marathon + '55', background: brand.marathon + '14', borderRadius: 2, padding: '3px 9px' }}>
                  Plays Marathon
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 18px', borderTop: '1px solid ' + brand.border, background: brand.bg }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.textDim }}>cyberneticpunks.com</span>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: brand.dmz, textTransform: 'uppercase' }}>No hype. Just intel.</span>
          </div>
        </div>
      </div>
    </main>
  );
}
