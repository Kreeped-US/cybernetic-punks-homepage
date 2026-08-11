'use client';
// app/admin/page.js -- THE BRIDGE (admin home).
// One-stop steering view, three sections in priority order:
//   1. NEEDS ATTENTION -- only ACTIONABLE signals, each linked (drafts waiting,
//      directives pending + age). Prominent when present; quiet "all clear" otherwise.
//   2. SHIP VITALS -- per-game toggle (Marathon | DMZ | All): DISCOVERY (GSC WoW) +
//      ENGAGEMENT (views / builds / published this week).
//   3. GO TO -- a launcher grid to every admin surface (shares ADMIN_NAV with the shell).
// All data comes from GET /api/admin/bridge (read/display layer; no new aggregation).

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAdminAuth, S, FONTS, ADMIN_NAV } from './adminShell';

const GAME_TABS = [
  { key: 'all', label: 'ALL', color: '#9b5de5' },
  { key: 'marathon', label: 'MARATHON', color: '#00f5ff' },
  { key: 'dmz', label: 'DMZ', color: '#00ff88' },
];

function fmt(n) {
  if (n == null) return '--';
  return Number(n).toLocaleString();
}

// Trend chip: percentage change cur-vs-prev with a direction arrow. `lowerIsBetter`
// inverts the good/bad colour (used for avg position -- a lower number ranks better).
function trend(cur, prev, lowerIsBetter) {
  if (prev == null || prev === 0) {
    if (!cur) return { text: '--', color: S.muted };
    return { text: 'new', color: '#00ff88' };
  }
  if (cur === prev) return { text: '→ 0%', color: S.muted };
  const pct = Math.abs(((cur - prev) / prev) * 100);
  const up = cur > prev;
  const good = lowerIsBetter ? cur < prev : cur > prev;
  return { text: (up ? '↑' : '↓') + ' ' + pct.toFixed(0) + '%', color: good ? '#00ff88' : '#ff5470' };
}

function StatCard({ label, value, sub, trendObj, accent }) {
  return (
    <div style={{ flex: '1 1 150px', minWidth: 150, background: S.surface, border: '1px solid ' + S.border, borderTop: '2px solid ' + (accent || S.border), borderRadius: 8, padding: '16px 18px' }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: S.muted, letterSpacing: 2, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: FONTS.display, fontSize: 26, fontWeight: 800, color: '#fff', marginTop: 6, lineHeight: 1 }}>{value}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 14 }}>
        {trendObj && <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: trendObj.color, fontWeight: 700 }}>{trendObj.text}</span>}
        {sub && <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: S.muted, letterSpacing: 1 }}>{sub}</span>}
      </div>
    </div>
  );
}

export default function BridgePage() {
  const auth = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [game, setGame] = useState('all');

  const load = useCallback(async () => {
    if (!auth || !auth.password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/bridge', { headers: { 'x-admin-password': auth.password } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load bridge data');
      setData(json);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, [auth]);

  useEffect(() => { if (auth && auth.authed) load(); }, [auth, load]);

  // ── NEEDS ATTENTION items (only actionable ones) ──
  const attentionItems = [];
  if (data) {
    if (data.attention.draftsWaiting > 0) {
      attentionItems.push({
        key: 'drafts',
        text: data.attention.draftsWaiting + ' draft' + (data.attention.draftsWaiting === 1 ? '' : 's') + ' waiting for approval',
        cta: 'Review',
        href: '/admin/content',
      });
    }
    (data.attention.pendingDirectives || []).forEach((p) => {
      attentionItems.push({
        key: 'dir-' + p.id,
        text: 'Directive pending ' + p.ageDays + 'd -- ' + (p.editor || '?') + (p.instruction ? ': ' + p.instruction : ''),
        cta: 'View',
        href: '/admin/content?tab=editor_directives',
      });
    });
    // v2 (NOT built): cron heartbeat (from cron_runs) -- "daily generation last ran Xh ago",
    // and GSC indexation-drop delta. Both noted in the scope; a later increment adds them here.
  }

  const v = data ? data.vitals[game] : null;
  const gameAccent = (GAME_TABS.find((t) => t.key === game) || {}).color || S.accent;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: 2, margin: 0 }}>THE BRIDGE</h1>
          <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: S.muted, letterSpacing: 2, marginTop: 4 }}>STEER THE SHIP -- DISCOVERY + ENGAGEMENT</div>
        </div>
        <button onClick={load} disabled={loading} style={{ background: 'transparent', border: '1px solid ' + S.border, borderRadius: 4, color: S.muted, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, padding: '8px 14px', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.5 : 1 }}>{loading ? 'LOADING…' : 'REFRESH'}</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(255,84,112,0.08)', border: '1px solid rgba(255,84,112,0.4)', borderRadius: 8, padding: '14px 18px', marginBottom: 24, fontFamily: FONTS.mono, fontSize: 12, color: '#ff5470' }}>
          {error}
        </div>
      )}

      {/* ── 1. NEEDS ATTENTION ── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 3, color: attentionItems.length ? '#ffb020' : S.muted, marginBottom: 12 }}>NEEDS ATTENTION</div>
        {loading && !data ? (
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: S.muted, padding: '20px 0' }}>LOADING…</div>
        ) : attentionItems.length === 0 ? (
          <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.2)', borderLeft: '3px solid #00ff88', borderRadius: 8, padding: '16px 20px', fontFamily: FONTS.body, fontSize: 15, color: 'rgba(255,255,255,0.7)' }}>
            <span style={{ color: '#00ff88', fontWeight: 700 }}>✓ All clear.</span> No drafts waiting, no directives pending.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {attentionItems.map((item) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,176,32,0.05)', border: '1px solid rgba(255,176,32,0.25)', borderLeft: '3px solid #ffb020', borderRadius: 8, padding: '14px 18px' }}>
                <span style={{ color: '#ffb020', fontSize: 14, flexShrink: 0 }}>▲</span>
                <span style={{ flex: 1, fontFamily: FONTS.body, fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4 }}>{item.text}</span>
                <Link href={item.href} style={{ flexShrink: 0, textDecoration: 'none', fontFamily: FONTS.display, fontSize: 11, fontWeight: 700, letterSpacing: 1, color: '#000', background: '#ffb020', borderRadius: 4, padding: '7px 16px' }}>{item.cta}</Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── 2. SHIP VITALS ── */}
      <section style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 3, color: S.muted }}>SHIP VITALS</div>
          <div style={{ display: 'flex', gap: 6 }}>
            {GAME_TABS.map((t) => (
              <button key={t.key} onClick={() => setGame(t.key)} style={{ fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, padding: '6px 14px', borderRadius: 4, cursor: 'pointer', border: '1px solid ' + (game === t.key ? t.color : S.border), background: game === t.key ? t.color + '22' : 'transparent', color: game === t.key ? t.color : S.muted }}>{t.label}</button>
            ))}
          </div>
        </div>

        {!v ? (
          <div style={{ fontFamily: FONTS.mono, fontSize: 11, color: S.muted, padding: '20px 0' }}>{loading ? 'LOADING…' : 'No data.'}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 2, color: gameAccent }}>DISCOVERY</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: S.muted }}>Google Search · 7d vs prior 7d{data.gscThrough ? ' · data through ' + data.gscThrough : ''}</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <StatCard label="Impressions" value={fmt(v.discovery.cur.impressions)} trendObj={trend(v.discovery.cur.impressions, v.discovery.prev.impressions, false)} accent={gameAccent} />
                <StatCard label="Clicks" value={fmt(v.discovery.cur.clicks)} trendObj={trend(v.discovery.cur.clicks, v.discovery.prev.clicks, false)} accent={gameAccent} />
                <StatCard label="Avg Position" value={v.discovery.cur.position != null ? v.discovery.cur.position.toFixed(1) : '--'} trendObj={trend(v.discovery.cur.position, v.discovery.prev.position, true)} sub="lower = better" accent={gameAccent} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 2, color: gameAccent }}>ENGAGEMENT</span>
                <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: S.muted }}>this week (last 7d)</span>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <StatCard label="Article Views" value={fmt(v.engagement.views7d)} trendObj={trend(v.engagement.views7d, v.engagement.viewsPrev7d, false)} accent={gameAccent} />
                <StatCard label="Builds Created" value={fmt(v.engagement.actions7d)} sub="advisor" accent={gameAccent} />
                <StatCard label="Articles Published" value={fmt(v.engagement.published7d)} sub="this week" accent={gameAccent} />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── 3. GO TO ── */}
      <section>
        <div style={{ fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 3, color: S.muted, marginBottom: 12 }}>GO TO</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
          {ADMIN_NAV.filter((n) => n.key !== 'bridge').map((n) => (
            <Link key={n.key} href={n.href} style={{ textDecoration: 'none', background: S.surface, border: '1px solid ' + S.border, borderLeft: '3px solid ' + n.color, borderRadius: 8, padding: '16px 18px', display: 'block' }}>
              <div style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>{n.label}</div>
              <div style={{ fontFamily: FONTS.body, fontSize: 13, color: S.muted, marginTop: 4, lineHeight: 1.4 }}>{n.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      {data && data.generatedAt && (
        <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: S.muted, letterSpacing: 1, marginTop: 28, textAlign: 'right' }}>
          generated {new Date(data.generatedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
