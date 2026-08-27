// app/me/MeShell.js
// The game-agnostic NETWORK HUB shell (Community v1 Piece A). Server component: it owns the
// page canvas (the 100vh dark background the old Marathon dashboard used to own) and lays out
// the core-loop slots. Pieces B/C/D fill their slots next; this build ships the STRUCTURE,
// the edge-degradation, and the Marathon-section fold-in.
//
//   HEADER            network identity (display_name/handle/avatar from network_account)
//   FOLLOW-EDITOR [C]  games multi-select -> games_interested  (placeholder slot)
//   PERSONALIZED FEED [B]  feed_items across followed games      (placeholder slot)
//   DISCORD CTA   [D]  link the community invite                (placeholder slot)
//   MARATHON SECTION   conditional: <MeClient/> when player_profiles present
//
// DEGRADE (accountId null -- a pure-Bungie, unbridged session): no network_account -> no
// games_interested. The follow-editor + feed HIDE behind a short "link your account" prompt
// (never a broken or empty feed, never an error); the Marathon section still renders.
import Link from 'next/link';
import MeClient from './MeClient';
import AccountMenu from '@/components/AccountMenu';
import FollowEditor from './FollowEditor';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import { DISCORD_INVITE } from '@/lib/socialLinks';

var CARD = {
  background: '#16181d',
  border: '1px solid #23262e',
  borderRadius: 10,
  padding: '20px 22px',
  marginBottom: 16,
};
var SLOT_LABEL = {
  fontFamily: 'monospace',
  fontSize: 10,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.38)',
  marginBottom: 10,
};

function initialsOf(name) {
  var s = String(name || '').trim();
  if (!s) return 'U';
  var parts = s.split(/\s+/);
  return ((parts[0][0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export default function MeShell({ account, player, feed }) {
  var hasAccount = !!account;                              // network_account present (accountId)
  var followEnabled = hasAccount;                          // feed + follow-editor need games_interested
  var games = (account && Array.isArray(account.games_interested)) ? account.games_interested : [];
  var feedItems = Array.isArray(feed) ? feed : [];
  // Serializable game options for the follow-editor (client), derived from ROOT_GAMES.
  var followOptions = ROOT_GAMES.map(function (g) {
    return {
      slug: g.slug,
      label: g.label,
      accent: (g.theme && g.theme.primary) || '#8b95a7',
      live: !!(g.pulse && g.pulse.mode === 'live'),
    };
  });
  var name = (account && (account.display_name || account.handle)) ||
             (player && player.bungie_display_name && player.bungie_display_name.replace(/#\d+/, '').trim()) ||
             'You';
  var handle = (account && account.handle) || null;
  var avatar = (account && account.avatar_url) || (player && player.bungie_avatar_url) || null;

  return (
    <div style={{ minHeight: '100vh', background: '#121418', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* NEUTRAL NETWORK TOP-BAR -- replaces the Marathon Nav.js (green) that used to render
          here. Matches the root's network convention: wordmark (home) + AccountMenu, no game
          nav, no Marathon green. AccountMenu (client) rendered directly as Nav/root do. */}
      <div style={{ borderBottom: '1px solid #1e2028', background: '#0e1014', position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cnp-512.png" alt="Cybernetic Punks" width={30} height={30} style={{ width: 30, height: 30, borderRadius: 7, display: 'block' }} />
            {/* Two-tone brand wordmark, matching the root nav: CYBERNETIC white + PUNKS in the
                approved brand burgundy (root .wm b = var(--burg-bright) = #9A2740). Hardcoded
                here because --burg-bright is scoped to .cnp-root and does not reach MeShell. */}
            <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.05em', color: '#fff' }}>CYBERNETIC <span style={{ color: '#9A2740' }}>PUNKS</span></span>
          </Link>
          <AccountMenu align="right" />
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 96px' }}>

        {/* HEADER -- network identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" width={56} height={56} style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <span style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: '#23262e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 20, color: 'rgba(255,255,255,0.7)' }}>{initialsOf(name)}</span>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Your network hub</div>
            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1 }}>{name}</div>
            {handle ? <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>@{handle}</div> : null}
          </div>
        </div>

        <div style={{ height: 1, background: '#1e2028', margin: '20px 0 24px' }} />

        {followEnabled ? (
          <>
            {/* FOLLOW-EDITOR slot -- Piece C: pick the games you follow (games_interested). */}
            <div style={CARD}>
              <div style={SLOT_LABEL}>Following{games.length ? ' · ' + games.length : ''}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
                Pick the games you want intel on. Change this anytime; your feed below updates to match.
              </div>
              <FollowEditor options={followOptions} current={games} />
            </div>

            {/* PERSONALIZED FEED slot -- Piece B: latest intel across the followed games,
                newest first. Each row's game pill uses that game's accent; the container stays
                neutral (no full theme bleed into the hub). */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ ...SLOT_LABEL, marginBottom: 12 }}>Your feed</div>
              {games.length === 0 ? (
                <div style={CARD}>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                    Follow games to build your feed -- use the follow editor above to pick the games
                    you want intel on, and their latest verified reports land here.
                  </div>
                </div>
              ) : feedItems.length === 0 ? (
                <div style={CARD}>
                  <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                    No new intel from the games you follow yet -- check back soon.
                  </div>
                </div>
              ) : (
                feedItems.map(function (item, i) {
                  return (
                    <Link key={i} href={item.href} style={{ display: 'block', textDecoration: 'none', background: '#16181d', border: '1px solid #23262e', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#08090c', background: item.accent, padding: '2px 7px', borderRadius: 3 }}>{item.game}</span>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{item.editor}{item.when ? ' · ' + item.when : ''}</span>
                      </div>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: '#fff', lineHeight: 1.4 }}>{item.headline}</div>
                    </Link>
                  );
                })
              )}
            </div>
          </>
        ) : (
          // DEGRADE: no network_account (pure-Bungie unbridged) -> follow + feed need an account.
          <div style={CARD}>
            <div style={SLOT_LABEL}>Your feed</div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
              Link your network account to follow games and build your personalized feed.
            </div>
          </div>
        )}

        {/* DISCORD CTA slot -- Piece D: the social layer lives off-site on Discord; /me links
            to it. Neutral-themed; the invite is single-sourced from lib/socialLinks. */}
        <div style={CARD}>
          <div style={SLOT_LABEL}>Community</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 12 }}>
            The conversation happens on Discord -- patch talk, questions, and the wider community.
          </div>
          <a
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 9, padding: '9px 16px',
              borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 700, color: '#fff',
              background: '#5865f2', border: '1px solid #5865f2',
            }}
          >
            <svg width="16" height="12" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M11.854 0.927C10.956 0.505 9.994 0.198 8.99 0.022C8.861 0.256 8.711 0.57 8.607 0.819C7.534 0.655 6.47 0.655 5.414 0.819C5.31 0.57 5.157 0.256 5.027 0.022C4.022 0.198 3.059 0.506 2.161 0.929C0.311 3.641 -0.19 6.285 0.06 8.893C1.27 9.789 2.442 10.336 3.595 10.696C3.887 10.3 4.147 9.879 4.371 9.436C3.947 9.276 3.541 9.078 3.158 8.845C3.261 8.769 3.362 8.69 3.461 8.609C5.742 9.672 8.266 9.672 10.52 8.609C10.62 8.691 10.721 8.77 10.823 8.845C10.439 9.079 10.031 9.278 9.606 9.437C9.83 9.879 10.089 10.302 10.382 10.697C11.536 10.337 12.709 9.79 13.919 8.893C14.213 5.87 13.419 3.25 11.854 0.927ZM4.676 7.279C3.983 7.279 3.413 6.639 3.413 5.854C3.413 5.069 3.971 4.428 4.676 4.428C5.381 4.428 5.952 5.068 5.939 5.854C5.94 6.639 5.38 7.279 4.676 7.279ZM9.297 7.279C8.604 7.279 8.034 6.639 8.034 5.854C8.034 5.069 8.592 4.428 9.297 4.428C10.002 4.428 10.573 5.068 10.56 5.854C10.56 6.639 10.001 7.279 9.297 7.279Z" fill="#fff"/>
            </svg>
            Join the community on Discord
          </a>
        </div>

        {/* MARATHON SECTION -- conditional. MeClient's outer wrapper is demoted (Option B) so it
            renders as a section inside this hub, not a nested full page. */}
        {player ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ ...SLOT_LABEL, marginBottom: 12 }}>Your Marathon profile</div>
            <MeClient player={player} />
          </div>
        ) : null}

      </div>
    </div>
  );
}
