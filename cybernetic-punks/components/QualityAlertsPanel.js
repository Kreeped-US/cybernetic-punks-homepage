// components/QualityAlertsPanel.js
// Internal admin panel for the Quality Audit agent (quality_alerts). Read-only:
// triage by reading; resolve at the source article. Usage:
// <QualityAlertsPanel password={adminPassword} /> -- mirrors QualityMetricsPanel
// (client panel fed by the auth-gated admin API). INTERNAL ONLY.
'use client';

import { useState, useEffect } from 'react';

var mono = 'Share Tech Mono, monospace';
var heading = 'Orbitron, monospace';

function sevColor(s) {
  if (s === 'high') return '#ff4444';
  if (s === 'medium') return '#ff8800';
  return 'rgba(255,255,255,0.4)';
}

export default function QualityAlertsPanel({ password }) {
  var [alerts, setAlerts] = useState([]);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);
  var [status, setStatus] = useState('new');
  var [severity, setSeverity] = useState('all');
  var [game, setGame] = useState('all');
  var [lastRun, setLastRun] = useState(null);

  useEffect(function () {
    if (!password) return;
    var cancelled = false;
    setLoading(true);
    async function run() {
      try {
        var qs = 'status=' + encodeURIComponent(status) +
          '&severity=' + encodeURIComponent(severity) +
          '&game=' + encodeURIComponent(game);
        var res = await fetch('/api/admin/quality-alerts?' + qs, { headers: { 'x-admin-password': password } });
        if (!res.ok) throw new Error('Failed to fetch (' + res.status + ')');
        var data = await res.json();
        if (!cancelled) { setAlerts(data.alerts || []); setLastRun(data.lastRun || null); setError(null); }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return function () { cancelled = true; };
  }, [password, status, severity, game]);

  var selStyle = { fontFamily: mono, fontSize: 10, background: '#0a0a0a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '4px 8px' };
  var chip = { fontFamily: mono, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', padding: '2px 6px', borderRadius: 2 };

  function filterLabel(label, value, setter, options) {
    return (
      <label style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 5 }}>
        {label}
        <select value={value} onChange={function (e) { setter(e.target.value); }} style={selStyle}>
          {options.map(function (o) { return <option key={o} value={o}>{o}</option>; })}
        </select>
      </label>
    );
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: heading, fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 3, marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        QUALITY ALERTS <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>&middot; INTERNAL &middot; READ-ONLY</span>
      </div>
      <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, margin: '8px 0 14px', lineHeight: 1.5 }}>
        Deterministic checks on recent published articles -- editor-codename leakage + retired-feature references. Triage by reading; fix at the source article.
      </div>

      {!loading && !error && (
        <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: 1, margin: '0 0 14px', lineHeight: 1.5, color: lastRun ? 'rgba(0,255,65,0.6)' : 'rgba(255,136,0,0.6)' }}>
          {lastRun
            ? 'LAST RUN ' + (lastRun.ran_at ? new Date(lastRun.ran_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '?') + ' / ' + (lastRun.game_slug || '?') + ' / CHECKED ' + (lastRun.articles_checked != null ? lastRun.articles_checked : '?') + ' / FOUND ' + (lastRun.alerts_found != null ? lastRun.alerts_found : '?')
            : 'NO AGENT RUN RECORDED YET -- run the quality_audit_runs migration; the agent then records each run.'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        {filterLabel('STATUS', status, setStatus, ['all', 'new', 'reviewed', 'resolved'])}
        {filterLabel('SEVERITY', severity, setSeverity, ['all', 'high', 'medium'])}
        {filterLabel('GAME', game, setGame, ['all', 'marathon', 'dmz', 'network'])}
      </div>

      {loading ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>LOADING ALERTS...</div>
      ) : error ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 11, color: '#ff4444', letterSpacing: 1 }}>ERROR: {error}</div>
      ) : alerts.length === 0 ? (
        <div style={{ padding: 16, fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>NO ALERTS FOR THIS FILTER</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, marginBottom: 2 }}>{alerts.length} ALERT{alerts.length === 1 ? '' : 'S'}</div>
          {alerts.map(function (a) {
            var col = sevColor(a.severity);
            return (
              <div key={a.id} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderLeft: '2px solid ' + col, borderRadius: 4, padding: '10px 12px' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                  <span style={{ ...chip, color: col, border: '1px solid ' + col + '55' }}>{a.severity || '--'}</span>
                  <span style={{ ...chip, color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>{a.alert_type}</span>
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 }}>{a.game_slug}</span>
                  <span style={{ ...chip, color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>{a.status}</span>
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <div style={{ fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.65)', lineHeight: 1.45 }}>{a.evidence}</div>
                <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 5 }}>article {a.article_id}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
