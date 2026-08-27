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
import MeClient from './MeClient';

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

export default function MeShell({ account, player }) {
  var hasAccount = !!account;                              // network_account present (accountId)
  var followEnabled = hasAccount;                          // feed + follow-editor need games_interested
  var games = (account && Array.isArray(account.games_interested)) ? account.games_interested : [];
  var name = (account && (account.display_name || account.handle)) ||
             (player && player.bungie_display_name && player.bungie_display_name.replace(/#\d+/, '').trim()) ||
             'You';
  var handle = (account && account.handle) || null;
  var avatar = (account && account.avatar_url) || (player && player.bungie_avatar_url) || null;

  return (
    <div style={{ minHeight: '100vh', background: '#121418', color: '#fff', paddingTop: 48, fontFamily: 'system-ui, sans-serif' }}>
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
            {/* FOLLOW-EDITOR slot -- Piece C */}
            <div style={CARD}>
              <div style={SLOT_LABEL}>Following{games.length ? ' · ' + games.length : ''}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                {games.length ? ('You follow: ' + games.join(', ') + '.') : 'You are not following any games yet.'}
                {' '}Follow-editor lands here next (Piece C) -- change your games anytime.
              </div>
            </div>

            {/* PERSONALIZED FEED slot -- Piece B */}
            <div style={CARD}>
              <div style={SLOT_LABEL}>Your feed</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
                Personalized feed lands here next (Piece B): the latest verified intel across the
                games you follow, newest first.
              </div>
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

        {/* DISCORD CTA slot -- Piece D */}
        <div style={CARD}>
          <div style={SLOT_LABEL}>Community</div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>
            Discord CTA lands here next (Piece D).
          </div>
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
