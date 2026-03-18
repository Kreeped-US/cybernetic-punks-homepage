// components/UsageStats.js
// Drop into admin page — shows live usage counts
// Usage: <UsageStats password={adminPassword} />

'use client';

import { useState, useEffect } from 'react';

const EVENT_LABELS = {
  advisor_generate: 'Build Advisor — Generated',
  advisor_share:    'Build Advisor — Shared',
  meta_view:        'Meta Tier List — Viewed',
  tierlist_share:   'Tier List — Shared',
};

const EVENT_COLORS = {
  advisor_generate: '#ff8800',
  advisor_share:    '#ff8800',
  meta_view:        '#00f5ff',
  tierlist_share:   '#00f5ff',
};

const SHELL_COLORS = {
  Assassin: '#cc44ff', Destroyer: '#ff3333', Recon: '#00f5ff',
  Rook: '#aaaaaa', Thief: '#ffd700', Triage: '#00ff88', Vandal: '#ff8800',
};

export default function UsageStats({ password }) {
  var [stats, setStats] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);

  useEffect(function() {
    if (!password) return;
    async function fetchStats() {
      try {
        var res = await fetch('/api/admin/stats', {
          headers: { 'x-admin-password': password },
        });
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
    return function() { clearInterval(interval); };
  }, [password]);

  var mono = 'Share Tech Mono, monospace';
  var heading = 'Orbitron, monospace';
  var body = 'Rajdhani, sans-serif';

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

  var advisorTotal = stats?.events?.advisor_generate?.total || 0;
  var advisorToday = stats?.events?.advisor_generate?.last24h || 0;
  var advisorWeek  = stats?.events?.advisor_generate?.last7d  || 0;
  var shareTotal   = stats?.events?.advisor_share?.total || 0;
  var metaTotal    = stats?.events?.meta_view?.total || 0;

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: heading, fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 3, marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        SITE USAGE
      </div>

      {/* Top-line stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 20 }}>
        {[
          { val: advisorTotal, label: 'BUILDS GENERATED', color: '#ff8800', sub: advisorToday + ' TODAY · ' + advisorWeek + ' THIS WEEK' },
          { val: shareTotal,   label: 'BUILDS SHARED',    color: '#ff8800', sub: 'CARDS DOWNLOADED' },
          { val: metaTotal,    label: 'META VIEWS',        color: '#00f5ff', sub: 'TIER LIST LOADS' },
        ].map(function(stat, i) {
          return (
            <div key={i} style={{ background: '#0a0a0a', border: '1px solid ' + stat.color + '20', borderTop: '2px solid ' + stat.color + '66', borderRadius: 6, padding: '14px 16px' }}>
              <div style={{ fontFamily: heading, fontSize: 22, fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: 4 }}>{stat.val.toLocaleString()}</div>
              <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontFamily: mono, fontSize: 7, color: 'rgba(255,255,255,0.18)', letterSpacing: 1 }}>{stat.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Top shells */}
      {stats?.topShells && stats.topShells.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 10 }}>TOP SHELLS REQUESTED</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {stats.topShells.map(function(entry, i) {
              var shell = entry[0], count = entry[1];
              var color = SHELL_COLORS[shell] || '#888';
              var maxCount = stats.topShells[0][1];
              var pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 4, padding: '8px 12px' }}>
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

      {/* Top playstyles */}
      {stats?.topPlaystyles && stats.topPlaystyles.length > 0 && (
        <div>
          <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 10 }}>TOP PLAYSTYLES</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {stats.topPlaystyles.map(function(entry, i) {
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

      {advisorTotal === 0 && shareTotal === 0 && metaTotal === 0 && (
        <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2, padding: '12px 0' }}>
          NO EVENTS YET — USAGE WILL APPEAR HERE ONCE VISITORS INTERACT WITH THE ADVISOR AND META TOOLS
        </div>
      )}
    </div>
  );
}
