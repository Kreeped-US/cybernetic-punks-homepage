// components/UsageStats.js
// Admin panel: live site-usage counts, BROKEN DOWN PER GAME.
// Usage: <UsageStats password={adminPassword} />
//
// Reads /api/admin/stats, which returns { games: [...], byGame: { slug: { events,
// topShells, topPlaystyles } }, recent }. One section per game; a game with no
// events (e.g. DMZ today, until a DMZ surface fires one) shows zeroes -- expected.

'use client';

import { useState, useEffect } from 'react';

const SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00f5ff',
  Rook: '#aaaaaa', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

// Small per-game accent for the section header (falls back to neutral).
const GAME_ACCENT = { marathon: '#00ff41', dmz: '#3f7d44', network: '#b32d40' };

export default function UsageStats({ password }) {
  var [stats, setStats] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);

  useEffect(function () {
    if (!password) return;
    async function fetchStats() {
      try {
        var res = await fetch('/api/admin/stats', { headers: { 'x-admin-password': password } });
        if (!res.ok) throw new Error('Failed to fetch');
        var data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    var interval = setInterval(fetchStats, 60000); // refresh every minute
    return function () { clearInterval(interval); };
  }, [password]);

  var mono = 'Share Tech Mono, monospace';
  var heading = 'Orbitron, monospace';

  if (loading) return (
    <div style={{ padding: '20px', fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>
      LOADING USAGE DATA...
    </div>
  );

  if (error) return (
    <div style={{ padding: '20px', fontFamily: mono, fontSize: 11, color: '#ff4444', letterSpacing: 1 }}>
      ERROR: {error}
    </div>
  );

  var games = (stats && stats.games) || [];
  var byGame = (stats && stats.byGame) || {};

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: heading, fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 3, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        SITE USAGE &middot; PER GAME
      </div>

      {games.map(function (game) {
        var g = byGame[game] || { events: {}, topShells: [], topPlaystyles: [] };
        var ev = g.events || {};
        var advisorTotal = (ev.advisor_generate && ev.advisor_generate.total) || 0;
        var advisorToday = (ev.advisor_generate && ev.advisor_generate.last24h) || 0;
        var advisorWeek = (ev.advisor_generate && ev.advisor_generate.last7d) || 0;
        var shareTotal = (ev.advisor_share && ev.advisor_share.total) || 0;
        var metaTotal = (ev.meta_view && ev.meta_view.total) || 0;
        var tierShare = (ev.tierlist_share && ev.tierlist_share.total) || 0;
        var accent = GAME_ACCENT[game] || '#8b95a7';
        var isEmpty = advisorTotal === 0 && shareTotal === 0 && metaTotal === 0 && tierShare === 0;

        return (
          <div key={game} style={{ marginBottom: 26 }}>
            {/* Per-game header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent }} />
              <span style={{ fontFamily: heading, fontSize: 12, fontWeight: 900, color: accent, letterSpacing: 3 }}>{String(game).toUpperCase()}</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
              {isEmpty && <span style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>NO EVENTS YET</span>}
            </div>

            {/* Top-line stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 14 }}>
              {[
                { val: advisorTotal, label: 'BUILDS GENERATED', color: '#ff8800', sub: advisorToday + ' TODAY · ' + advisorWeek + ' THIS WEEK' },
                { val: shareTotal, label: 'BUILDS SHARED', color: '#ff8800', sub: 'CARDS DOWNLOADED' },
                { val: metaTotal, label: 'META VIEWS', color: '#00f5ff', sub: 'TIER LIST LOADS' },
                { val: tierShare, label: 'TIER LIST SHARED', color: '#00f5ff', sub: 'SHARE ACTIONS' },
              ].map(function (stat, i) {
                return (
                  <div key={i} style={{ background: '#0a0a0a', border: '1px solid ' + stat.color + '20', borderTop: '2px solid ' + stat.color + '66', borderRadius: 6, padding: '12px 14px' }}>
                    <div style={{ fontFamily: heading, fontSize: 20, fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: 4 }}>{stat.val.toLocaleString()}</div>
                    <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 4 }}>{stat.label}</div>
                    <div style={{ fontFamily: mono, fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: 1 }}>{stat.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* Top shells (per game) */}
            {g.topShells && g.topShells.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 8 }}>TOP SHELLS REQUESTED</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {g.topShells.map(function (entry, i) {
                    var shell = entry[0], count = entry[1];
                    var color = SHELL_COLORS[shell] || '#888';
                    var maxCount = g.topShells[0][1];
                    var pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 4, padding: '7px 12px' }}>
                        <span style={{ fontFamily: heading, fontSize: 11, fontWeight: 700, color: color, width: 80, flexShrink: 0 }}>{shell.toUpperCase()}</span>
                        <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontFamily: mono, fontSize: 10, color: color, width: 24, textAlign: 'right', flexShrink: 0 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top playstyles (per game) */}
            {g.topPlaystyles && g.topPlaystyles.length > 0 && (
              <div>
                <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 8 }}>TOP PLAYSTYLES</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {g.topPlaystyles.map(function (entry, i) {
                    var style = entry[0], count = entry[1];
                    return (
                      <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(255,136,0,0.15)', borderRadius: 4, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: mono, fontSize: 9, color: '#ff8800', letterSpacing: 1 }}>{(style || 'unknown').toUpperCase()}</span>
                        <span style={{ fontFamily: heading, fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {games.length === 0 && (
        <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, padding: '12px 0' }}>
          NO EVENTS YET &mdash; USAGE WILL APPEAR HERE ONCE VISITORS INTERACT WITH THE ADVISOR AND META TOOLS
        </div>
      )}
    </div>
  );
}
