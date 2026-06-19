// components/QualityMetricsPanel.js
// Internal admin panel for the AI-quality measurement layer (quality_metrics).
// Usage: <QualityMetricsPanel password={adminPassword} /> -- mirrors UsageStats
// (client panel fed by an auth-gated admin API). INTERNAL ONLY.
//
// Honesty in presentation (carried from the metric design): RAW COUNTS shown,
// the headline is "confirmed-data share" NOT accuracy, the empty SOURCE_AGREED
// bucket is shown, and the 0%/low BACKLOG is sorted to the TOP, not buried.
'use client';

import { useState, useEffect } from 'react';

var mono = 'Share Tech Mono, monospace';
var heading = 'Orbitron, monospace';

function shareColor(s) {
  if (s === null || s === undefined) return '#ff4444';
  if (s < 25) return '#ff4444';
  if (s < 60) return '#ff8800';
  return '#00ff88';
}

export default function QualityMetricsPanel({ password }) {
  var [data, setData] = useState(null);
  var [loading, setLoading] = useState(true);
  var [error, setError] = useState(null);

  useEffect(function () {
    if (!password) return;
    async function fetchMetrics() {
      try {
        var res = await fetch('/api/admin/metrics', { headers: { 'x-admin-password': password } });
        if (!res.ok) throw new Error('Failed to fetch (' + res.status + ')');
        setData(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMetrics();
  }, [password]);

  if (loading) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>LOADING QUALITY METRICS...</div>;
  if (error) return <div style={{ padding: 20, fontFamily: mono, fontSize: 11, color: '#ff4444', letterSpacing: 1 }}>ERROR: {error}</div>;
  if (!data || data.empty) return <div style={{ padding: 20, fontFamily: mono, fontSize: 10, color: 'rgba(255,255,255,0.15)', letterSpacing: 2 }}>NO QUALITY SNAPSHOTS YET — POPULATED EACH CRON CYCLE</div>;

  var m = data.metrics || {};
  var overall = m.overall || {};
  var perTable = m.per_table || {};
  var currency = m.data_currency || [];
  var trend = data.trend || [];

  // Backlog-first: lowest confirmed_data_share at the top (nulls treated lowest).
  var tableEntries = Object.keys(perTable).map(function (k) { return [k, perTable[k]]; });
  tableEntries.sort(function (a, b) {
    var sa = a[1].confirmed_data_share, sb = b[1].confirmed_data_share;
    return (sa === null ? -1 : sa) - (sb === null ? -1 : sb);
  });

  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ fontFamily: heading, fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 3, marginBottom: 4, paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        AI-QUALITY MEASUREMENT <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>· INTERNAL</span>
      </div>
      <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, margin: '8px 0 16px', lineHeight: 1.5 }}>
        Share of stat DATA that is human-confirmed (verified=true) -- NOT an article-accuracy claim.
        Snapshot {data.computed_at ? new Date(data.computed_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}.
      </div>

      {/* Overall: raw counts + share + all three buckets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 20 }}>
        <div style={{ background: '#0a0a0a', border: '1px solid ' + shareColor(overall.confirmed_data_share) + '40', borderTop: '2px solid ' + shareColor(overall.confirmed_data_share), borderRadius: 6, padding: '14px 16px' }}>
          <div style={{ fontFamily: heading, fontSize: 22, fontWeight: 900, color: shareColor(overall.confirmed_data_share), lineHeight: 1, marginBottom: 4 }}>{overall.confirmed_data_share != null ? overall.confirmed_data_share + '%' : '--'}</div>
          <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2 }}>CONFIRMED DATA SHARE</div>
          <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.5)', letterSpacing: 1, marginTop: 4 }}>{overall.confirmed} / {overall.total} confirmed</div>
        </div>
        {[
          { k: 'CONFIRMED', v: overall.confirmed, c: '#00ff88' },
          { k: 'SOURCE_AGREED', v: overall.source_agreed, c: '#ffd700', note: 'middle register' },
          { k: 'UNCHECKED', v: overall.unchecked, c: '#ff8800' },
        ].map(function (b) {
          return (
            <div key={b.k} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6, padding: '14px 16px' }}>
              <div style={{ fontFamily: heading, fontSize: 20, fontWeight: 900, color: b.c, lineHeight: 1, marginBottom: 4 }}>{b.v != null ? b.v : 0}</div>
              <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>{b.k}</div>
              {b.note && <div style={{ fontFamily: mono, fontSize: 7, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, marginTop: 3 }}>{b.note}{b.v === 0 ? ' (empty today)' : ''}</div>}
            </div>
          );
        })}
      </div>

      {/* Per-table: backlog (0%/low) first */}
      <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 10 }}>PER-TABLE CONFIRMED SHARE (backlog first)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20 }}>
        {tableEntries.map(function (entry) {
          var name = entry[0], e = entry[1];
          var col = shareColor(e.confirmed_data_share);
          var pct = e.confirmed_data_share || 0;
          return (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.04)', borderLeft: '2px solid ' + col, borderRadius: 4, padding: '8px 12px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: mono, fontSize: 10, color: '#fff', width: 150, flexShrink: 0 }}>{name}</span>
              <div style={{ flex: 1, minWidth: 120, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: pct + '%', background: col, borderRadius: 2 }} />
              </div>
              <span style={{ fontFamily: mono, fontSize: 10, color: col, width: 52, textAlign: 'right', flexShrink: 0 }}>{e.confirmed_data_share != null ? e.confirmed_data_share + '%' : '--'}</span>
              <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.45)', width: 64, textAlign: 'right', flexShrink: 0 }}>{e.confirmed}/{e.total}</span>
              <span style={{ fontFamily: mono, fontSize: 8, width: 110, textAlign: 'right', flexShrink: 0, color: e.has_verified_source ? (e.source_attribution_share != null && e.source_attribution_share < 50 ? '#ff8800' : 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.15)' }}>
                {e.has_verified_source ? ('src ' + (e.source_attribution_share != null ? e.source_attribution_share + '%' : '--')) : 'no src col'}
              </span>
              {e.stale_stamp_count > 0 && <span style={{ fontFamily: mono, fontSize: 8, color: '#ff4444', flexShrink: 0 }}>{e.stale_stamp_count} stale</span>}
            </div>
          );
        })}
      </div>

      {/* Data currency (coarse) */}
      {currency.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 10 }}>DATA CURRENCY (coarse, source-level -- not per-claim freshness)</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {currency.map(function (c, i) {
              var stale = c.age_hours != null && c.age_hours > 168;
              return (
                <div key={i} style={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4, padding: '6px 12px' }}>
                  <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>{c.table_name}</span>
                  <span style={{ fontFamily: mono, fontSize: 9, color: c.age_hours == null ? '#ff4444' : (stale ? '#ff8800' : '#00ff88'), marginLeft: 8 }}>
                    {c.age_hours == null ? 'never' : c.age_hours + 'h'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Trend: confirmed_data_share over retained snapshots */}
      <div>
        <div style={{ fontFamily: mono, fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 3, marginBottom: 10 }}>CONFIRMED-SHARE TREND ({trend.length} snapshot{trend.length === 1 ? '' : 's'})</div>
        {trend.length <= 1 ? (
          <div style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
            {trend.length === 1 ? (trend[0].confirmed_data_share + '% baseline -- the trend builds one point per cron cycle.') : 'No trend yet.'}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 60 }}>
            {trend.map(function (p, i) {
              var h = p.confirmed_data_share != null ? Math.max(2, p.confirmed_data_share * 0.55) : 2;
              return (
                <div key={i} title={(p.confirmed_data_share != null ? p.confirmed_data_share + '%' : '--') + ' @ ' + new Date(p.computed_at).toLocaleDateString()} style={{ width: 8, height: h, background: shareColor(p.confirmed_data_share), borderRadius: 1, flexShrink: 0 }} />
              );
            })}
            <span style={{ fontFamily: mono, fontSize: 9, color: 'rgba(255,255,255,0.4)', marginLeft: 8, alignSelf: 'center' }}>
              {trend[0].confirmed_data_share}% &rarr; {trend[trend.length - 1].confirmed_data_share}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
