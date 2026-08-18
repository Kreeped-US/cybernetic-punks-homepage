'use client';
// app/admin/email-signups/page.js
// Operator-only READ view of the owned launch-email list (email_signups). Auth + theme
// inherited from the admin layout (AdminGate + S/FONTS/useAdminAuth). Reads the
// READ-ONLY /api/admin/email-signups endpoint; there is NO write/update/delete path
// from this page (or from that endpoint) to email_signups.
//
// StatCard visual matches the Bridge (app/admin/page.js) tokens/shape; replicated here
// rather than importing (the Bridge's StatCard is module-local) to keep the change
// surface minimal.

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth, S, FONTS } from '../adminShell';

var PAGE_SIZE = 100;

function fmt(n) { return n == null ? '-' : Number(n).toLocaleString(); }

function fmtDate(iso) {
  if (!iso) return '-';
  var s = String(iso);
  return s.slice(0, 10) + ' ' + s.slice(11, 16) + ' UTC';
}

var thStyle = { padding: '10px 14px', fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1.5, color: S.muted, textTransform: 'uppercase', fontWeight: 700, textAlign: 'left' };
var tdStyle = { padding: '9px 14px', color: S.text, whiteSpace: 'nowrap' };

function pagerStyle(enabled) {
  return { background: 'transparent', border: '1px solid ' + S.border, borderRadius: 4, color: enabled ? S.text : S.muted, fontFamily: FONTS.mono, fontSize: 11, letterSpacing: 1, padding: '6px 12px', cursor: enabled ? 'pointer' : 'default', opacity: enabled ? 1 : 0.5 };
}

// StatCard -- same dark card shape/tokens as the Bridge steering cards.
function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ flex: '1 1 170px', minWidth: 170, background: S.surface, border: '1px solid ' + S.border, borderRadius: 8, padding: '16px 18px' }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 2, color: S.muted, textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: FONTS.display, fontSize: 28, fontWeight: 900, color: accent || S.text, lineHeight: 1 }}>{value}</div>
      {sub ? <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: S.muted, marginTop: 6 }}>{sub}</div> : null}
    </div>
  );
}

// Minimal 30-day sparkline (growth-at-a-glance) from the endpoint's dense buckets.
function Sparkline({ buckets }) {
  if (!buckets || !buckets.length) return null;
  var max = buckets.reduce(function (m, b) { return Math.max(m, b.count); }, 0);
  return (
    <div style={{ background: S.surface, border: '1px solid ' + S.border, borderRadius: 8, padding: '14px 18px', marginBottom: 24 }}>
      <div style={{ fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 2, color: S.muted, textTransform: 'uppercase', marginBottom: 12 }}>Signups / day -- last 30 days</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 48 }}>
        {buckets.map(function (b, i) {
          var h = max > 0 ? Math.round((b.count / max) * 44) : 0;
          return (
            <div key={i} title={b.day + ': ' + b.count}
              style={{ flex: 1, minWidth: 2, height: Math.max(h, b.count > 0 ? 2 : 1), background: b.count > 0 ? S.accent : S.border, borderRadius: 1 }} />
          );
        })}
      </div>
    </div>
  );
}

export default function EmailSignupsPage() {
  var auth = useAdminAuth();
  var password = auth ? auth.password : '';

  var [data, setData] = useState(null);
  var [offset, setOffset] = useState(0);
  var [loading, setLoading] = useState(false);
  var [error, setError] = useState('');
  var [downloading, setDownloading] = useState(false);

  var load = useCallback(async function (off) {
    setLoading(true); setError('');
    try {
      var res = await fetch('/api/admin/email-signups?limit=' + PAGE_SIZE + '&offset=' + off, { headers: { 'x-admin-password': password } });
      var json = await res.json();
      if (!res.ok) { setError(json.error || 'Failed to load.'); setData(null); }
      else setData(json);
    } catch (e) {
      setError('Failed to load.'); setData(null);
    }
    setLoading(false);
  }, [password]);

  useEffect(function () { load(offset); }, [offset, load]);

  async function downloadCsv() {
    setDownloading(true); setError('');
    try {
      var res = await fetch('/api/admin/email-signups?format=csv', { headers: { 'x-admin-password': password } });
      if (!res.ok) { setError('CSV export failed.'); setDownloading(false); return; }
      var blob = await res.blob();
      var objUrl = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = objUrl; a.download = 'email-signups.csv';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(objUrl);
    } catch (e) {
      setError('CSV export failed.');
    }
    setDownloading(false);
  }

  var total = data ? data.total : null;
  var dmz = data ? data.byGame.dmz : null;
  var marathon = data ? data.byGame.marathon : null;
  var other = data ? data.byGame.other : null;
  var last7 = data ? data.last7 : null;
  var rows = data ? data.rows : [];
  var hasNext = data && total != null ? (offset + PAGE_SIZE < total) : false;
  var hasPrev = offset > 0;
  var exportDisabled = downloading || !data || total === 0;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '8px 4px 60px', fontFamily: FONTS.body, color: S.text }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontFamily: FONTS.display, fontSize: 22, fontWeight: 900, letterSpacing: 2, margin: 0 }}>EMAIL SIGNUPS</h1>
        <button onClick={downloadCsv} disabled={exportDisabled}
          style={{ background: S.accent, border: 'none', borderRadius: 4, color: '#fff', fontFamily: FONTS.display, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, padding: '9px 16px', cursor: exportDisabled ? 'default' : 'pointer', opacity: exportDisabled ? 0.6 : 1 }}>
          {downloading ? 'PREPARING...' : 'DOWNLOAD CSV'}
        </button>
      </div>

      {error ? <div style={{ fontFamily: FONTS.mono, fontSize: 12, color: '#ff4444', marginBottom: 16 }}>{error}</div> : null}

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <StatCard label="Total signups" value={loading && !data ? '...' : fmt(total)} accent={S.accent} />
        <StatCard label="DMZ" value={loading && !data ? '...' : fmt(dmz)} sub={data ? (fmt(marathon) + ' marathon / ' + fmt(other) + ' other') : null} />
        <StatCard label="Last 7 days" value={loading && !data ? '...' : fmt(last7)} sub="new signups" accent="#00ff88" />
      </div>

      <Sparkline buckets={data ? data.buckets : null} />

      <div style={{ overflowX: 'auto', border: '1px solid ' + S.border, borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONTS.mono, fontSize: 12 }}>
          <thead>
            <tr style={{ background: S.surface }}>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Source</th>
              <th style={thStyle}>Game</th>
              <th style={thStyle}>Created (UTC)</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: S.muted, fontFamily: FONTS.mono, fontSize: 12 }}>{loading ? 'Loading...' : 'No signups yet.'}</td></tr>
            ) : rows.map(function (r) {
              return (
                <tr key={r.id} style={{ borderTop: '1px solid ' + S.border }}>
                  <td style={tdStyle}>{r.email}</td>
                  <td style={tdStyle}>{r.source || '-'}</td>
                  <td style={tdStyle}>{r.game_slug || '-'}</td>
                  <td style={tdStyle}>{fmtDate(r.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, fontFamily: FONTS.mono, fontSize: 11, color: S.muted }}>
        <button onClick={function () { if (hasPrev) setOffset(Math.max(0, offset - PAGE_SIZE)); }} disabled={!hasPrev} style={pagerStyle(hasPrev)}>PREV</button>
        <span>{total != null ? (fmt(total === 0 ? 0 : offset + 1) + '-' + fmt(Math.min(offset + PAGE_SIZE, total)) + ' of ' + fmt(total)) : ''}</span>
        <button onClick={function () { if (hasNext) setOffset(offset + PAGE_SIZE); }} disabled={!hasNext} style={pagerStyle(hasNext)}>NEXT</button>
      </div>
    </div>
  );
}
