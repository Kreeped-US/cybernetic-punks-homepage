// app/sitrep/page.js
// SITREP — Aggregated Marathon intelligence snapshot
// The "2-minute drop-in brief" — pulls from all editors + live meta + player data

import { supabase } from '@/lib/supabase';
import { getLiveStats } from '@/lib/liveStats';
import Link from 'next/link';

export const revalidate = 300;

export const metadata = {
  title: 'Marathon Sitrep — Live Meta Snapshot & Drop-In Brief | CyberneticPunks',
  description: 'The 2-minute drop-in brief. Live Marathon meta snapshot — S-tier weapons, top shells, meta movers, community pulse, ranked queue status, and what every editor covered this cycle. Updated every 6 hours.',
  keywords: 'Marathon meta today, Marathon current meta, Marathon meta snapshot, Marathon sitrep, Marathon what to run, Marathon ranked meta, Marathon meta tier list, Marathon daily briefing, Marathon live meta, Marathon top weapons, Marathon top shells',
  openGraph: {
    title: 'Marathon Sitrep — Live Meta Snapshot | CyberneticPunks',
    description: 'Everything you need to know before you drop in. Live meta, top shells, rising weapons, community pulse. Updated every 6 hours.',
    url: 'https://cyberneticpunks.com/sitrep',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Sitrep — Live Meta Snapshot',
    description: 'Everything you need to know before you drop in.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/sitrep' },
};

// ─── CONSTANTS ──────────────────────────────────────────────
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';

const EDITOR_COLORS = { CIPHER: '#ff2222', NEXUS: '#00d4ff', DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5' };
const EDITOR_SYMBOLS = { CIPHER: '◈', NEXUS: '⬡', DEXTER: '⬢', GHOST: '◇', MIRANDA: '◎' };
const EDITOR_ROLES  = { CIPHER: 'Play Analyst', NEXUS: 'Meta Strategist', DEXTER: 'Build Engineer', GHOST: 'Community Pulse', MIRANDA: 'Field Guides' };
const TIER_COLORS   = { S: '#ff2222', A: '#ff8800', B: '#ffd700', C: '#00d4ff', D: '#444' };

const FACTION_COLORS = {
  Cyberacme: '#00ff41',
  Nucaloric: '#ff2d78',
  Traxus:    '#ff6600',
  Mida:      '#cc44ff',
  Arachne:   '#ff2222',
  Sekiguchi: '#c8b400',
};

const FACTION_NAMES_LOWER = ['cyberacme', 'nucaloric', 'traxus', 'mida', 'arachne', 'sekiguchi'];

// ─── HELPERS ────────────────────────────────────────────────
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diffH = Math.floor((Date.now() - new Date(dateStr)) / 3600000);
  if (diffH < 1) return 'just now';
  if (diffH < 24) return diffH + 'h ago';
  return Math.floor(diffH / 24) + 'd ago';
}

function parseBrief(body) {
  if (!body) return '';
  return body.replace(/\*\*/g, '').replace(/#+\s/g, '').replace(/\n/g, ' ').trim().slice(0, 160);
}

// Ranked queue rotation — Sun 10AM PT to Thu 10AM PT open
function getRankedStatus() {
  var now = new Date();
  var pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  var day = pt.getDay(); // 0=Sun, 1=Mon, ... 6=Sat
  var hour = pt.getHours();

  // OPEN: Sun 10AM → Thu 10AM
  var isOpen = false;
  if (day === 0 && hour >= 10) isOpen = true;
  else if (day >= 1 && day <= 3) isOpen = true;
  else if (day === 4 && hour < 10) isOpen = true;

  return { isOpen: isOpen, day: day, hour: hour };
}

function SectionHeader({ label, count, color, rightLink }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: color || 'rgba(255,255,255,0.25)' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: BORDER }} />
      {count !== undefined && (
        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{count}</span>
      )}
      {rightLink}
    </div>
  );
}

// ─── PAGE ───────────────────────────────────────────────────
export default async function SitrepPage() {
  var [metaTiersRes, latestArticlesRes, topBuildRes, risingIntelRes, liveStats] = await Promise.all([
    supabase
      .from('meta_tiers')
      .select('name, type, tier, trend, note, ranked_note, ranked_tier_solo, updated_at')
      .order('tier'),

    supabase
      .from('feed_items')
      .select('id, headline, body, slug, editor, tags, ce_score, thumbnail, created_at')
      .eq('is_published', true)
      .gte('created_at', new Date(Date.now() - 48 * 3600000).toISOString())
      .order('created_at', { ascending: false })
      .limit(40),

    // Top DEXTER build in last 48h
    supabase
      .from('feed_items')
      .select('id, headline, slug, tags, ce_score, thumbnail, created_at')
      .eq('editor', 'DEXTER')
      .eq('is_published', true)
      .gte('created_at', new Date(Date.now() - 48 * 3600000).toISOString())
      .order('ce_score', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Top 3 rising intel across all editors (48h, by ce_score)
    supabase
      .from('feed_items')
      .select('id, headline, slug, editor, tags, ce_score, thumbnail, created_at')
      .eq('is_published', true)
      .gte('created_at', new Date(Date.now() - 48 * 3600000).toISOString())
      .gt('ce_score', 0)
      .order('ce_score', { ascending: false })
      .limit(3),

    getLiveStats(),
  ]);

  var allTiers     = metaTiersRes.data     || [];
  var allArticles  = latestArticlesRes.data || [];
  var topBuild     = topBuildRes.data       || null;
  var risingIntel  = risingIntelRes.data    || [];

  var editors = ['CIPHER', 'NEXUS', 'DEXTER', 'GHOST', 'MIRANDA'];
  var latestPerEditor = {};
  editors.forEach(function(editor) {
    var found = allArticles.find(function(a) { return a.editor === editor; });
    if (found) latestPerEditor[editor] = found;
  });

  var sTierWeapons = allTiers.filter(function(t) { return t.type === 'weapon' && t.tier === 'S'; });
  var aTierWeapons = allTiers.filter(function(t) { return t.type === 'weapon' && t.tier === 'A'; });
  var sTierShells  = allTiers.filter(function(t) { return t.type === 'shell'  && t.tier === 'S'; });
  var aTierShells  = allTiers.filter(function(t) { return t.type === 'shell'  && t.tier === 'A'; });
  var moversUp     = allTiers.filter(function(t) { return t.trend === 'up'; }).slice(0, 6);
  var moversDown   = allTiers.filter(function(t) { return t.trend === 'down'; }).slice(0, 6);
  var hasMovers    = moversUp.length > 0 || moversDown.length > 0;
  var hasMetaData  = allTiers.length > 0;
  var lastUpdated  = allTiers[0]?.updated_at || allArticles[0]?.created_at || null;

  // Faction activity — count articles mentioning each faction
  var factionActivity = {};
  FACTION_NAMES_LOWER.forEach(function(fname) {
    factionActivity[fname] = allArticles.filter(function(a) {
      var tags = (a.tags || []).map(function(t) { return (t || '').toLowerCase(); });
      var headline = (a.headline || '').toLowerCase();
      return tags.includes(fname) || headline.includes(fname);
    }).length;
  });
  var activeFactions = Object.entries(factionActivity)
    .filter(function(e) { return e[1] > 0; })
    .sort(function(a, b) { return b[1] - a[1]; });

  // Build drop-in brief
  var brief = [];
  if (sTierWeapons.length > 0) brief.push({ label: 'S-TIER META', text: sTierWeapons.map(function(w) { return w.name; }).join(', ') + ' are the dominant weapons right now.', color: '#ff2222' });
  if (moversUp.length > 0)     brief.push({ label: 'RISING',     text: moversUp.map(function(m) { return m.name; }).join(', ') + ' gaining ground this cycle.', color: '#00ff41' });
  if (moversDown.length > 0)   brief.push({ label: 'FALLING',    text: moversDown.map(function(m) { return m.name; }).join(', ') + ' losing meta share.', color: '#ff4444' });
  if (sTierShells.length > 0)  brief.push({ label: 'TOP SHELLS', text: sTierShells.map(function(s) { return s.name; }).join(', ') + ' leading ranked play.', color: '#ffd700' });
  if (topBuild)                brief.push({ label: 'TOP BUILD',  text: topBuild.headline + ' · graded ' + topBuild.ce_score + '/10', color: '#ff8800' });
  if (latestPerEditor['GHOST']) brief.push({ label: 'COMMUNITY', text: latestPerEditor['GHOST'].headline, color: '#00ff88' });
  var briefFinal = brief.slice(0, 6);

  var queueStatus = getRankedStatus();

  // Structured data
  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Sitrep', item: 'https://cyberneticpunks.com/sitrep' },
    ],
  };

  var webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Marathon Sitrep — Live Meta Snapshot',
    description: 'Everything you need to know before you drop in. Live Marathon meta snapshot updated every 6 hours.',
    url: 'https://cyberneticpunks.com/sitrep',
    dateModified: lastUpdated,
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
  };

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />

      <style>{`
        .s-card       { transition: background 0.12s, border-color 0.12s; }
        .s-card:hover { background: #1e2228 !important; }
        .s-row:hover  { background: #1e2228 !important; }
        .s-btn:hover  { background: #1e2228 !important; }
      `}</style>

      {/* ══ BREADCRUMB ══════════════════════════════════════ */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: '#00d4ff' }}>SITREP</li>
        </ol>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{ padding: '24px 24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#00d4ff', background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00d4ff' }} />
            LIVE INTELLIGENCE SNAPSHOT
          </span>
          {liveStats?.steam && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#00ff41', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
              {liveStats.steam.value.toLocaleString()} RUNNERS ONLINE
            </span>
          )}
          {lastUpdated && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
              UPDATED {timeAgo(lastUpdated).toUpperCase()}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5.5vw, 3.4rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.05, margin: '0 0 18px' }}>
              MARATHON<br /><span style={{ color: '#00d4ff' }}>SITREP</span>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 500, marginBottom: 20 }}>
              Everything you need to know before you drop in. Synthesized from all five editors, live meta data, ranked queue status, and community signals.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/meta" style={{ padding: '11px 22px', background: '#00d4ff', color: '#000', fontSize: 11, fontWeight: 800, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
                FULL META →
              </Link>
              <Link href="/advisor" style={{ padding: '11px 22px', background: CARD_BG, border: '1px solid ' + BORDER, color: '#ff8800', fontSize: 11, fontWeight: 700, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
                ⬢ GET BUILD →
              </Link>
            </div>
          </div>

          {/* Quick-glance stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
            {/* Ranked queue status */}
            <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + (queueStatus.isOpen ? '#00ff41' : '#ff4444'), borderRadius: '0 0 2px 2px', padding: '12px 14px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>RANKED QUEUE</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: queueStatus.isOpen ? '#00ff41' : '#ff4444' }} />
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: queueStatus.isOpen ? '#00ff41' : '#ff4444', lineHeight: 1 }}>
                  {queueStatus.isOpen ? 'OPEN' : 'CLOSED'}
                </div>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>
                {queueStatus.isOpen ? 'CLOSES THU 10AM PT' : 'REOPENS SUN 10AM PT'}
              </div>
            </div>

            {/* S-tier weapon */}
            <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid #ff2222', borderRadius: '0 0 2px 2px', padding: '12px 14px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>S-TIER WEAPON</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: '#ff2222', lineHeight: 1 }}>
                {sTierWeapons[0]?.name.toUpperCase() || '—'}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>
                NEXUS RANKED
              </div>
            </div>

            {/* S-tier shell */}
            <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid #ff8800', borderRadius: '0 0 2px 2px', padding: '12px 14px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>S-TIER SHELL</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: '#ff8800', lineHeight: 1 }}>
                {sTierShells[0]?.name.toUpperCase() || '—'}
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>
                TOP PICK
              </div>
            </div>

            {/* Intel count */}
            <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid #9b5de5', borderRadius: '0 0 2px 2px', padding: '12px 14px' }}>
              <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>48H INTEL</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 900, color: '#9b5de5', lineHeight: 1 }}>
                {allArticles.length} ARTICLES
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginTop: 4, fontWeight: 700 }}>
                FROM {Object.keys(latestPerEditor).length}/5 EDITORS
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ DROP-IN BRIEF ═══════════════════════════════════ */}
      {briefFinal.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid #00d4ff', borderRadius: '0 0 2px 2px', padding: '22px 26px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 900, color: '#00d4ff', letterSpacing: 3 }}>DROP-IN BRIEF</span>
              <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700 }}>THE 2-MINUTE READ</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {briefFinal.map(function(item, i) {
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 9, color: item.color, background: item.color + '15', border: '1px solid ' + item.color + '33', borderRadius: 2, padding: '4px 10px', letterSpacing: 1, fontWeight: 700, textAlign: 'center', marginTop: 2 }}>
                      {item.label}
                    </div>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.5 }}>
                      {item.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ══ RISING INTEL (new) ═════════════════════════════ */}
      {risingIntel.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader label="RISING INTEL" color="#00ff41" count={risingIntel.length + ' STORIES'} />
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 14, maxWidth: 680 }}>
            Highest-scoring articles from the last 48 hours across all editors. These are the pieces the system considers most significant right now.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 6 }}>
            {risingIntel.map(function(article) {
              var color = EDITOR_COLORS[article.editor] || '#888';
              var symbol = EDITOR_SYMBOLS[article.editor] || '·';
              var portrait = '/images/editors/' + (article.editor || '').toLowerCase() + '.jpg';
              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="s-card" style={{ display: 'block', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + color, borderRadius: '0 2px 2px 0', overflow: 'hidden', textDecoration: 'none' }}>
                  {article.thumbnail && (
                    <div style={{ height: 100, overflow: 'hidden', position: 'relative' }}>
                      <img src={article.thumbnail} alt={article.headline} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, ' + CARD_BG + ')' }} />
                    </div>
                  )}
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', border: '1px solid ' + color + '40', flexShrink: 0 }}>
                        <img src={portrait} alt={article.editor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: color }}>{symbol} {article.editor}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 9, fontWeight: 800, color: color, background: color + '18', border: '1px solid ' + color + '30', borderRadius: 2, padding: '1px 6px' }}>{article.ce_score}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.35, marginBottom: 6 }}>
                      {article.headline}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(article.created_at)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ META SNAPSHOT ═══════════════════════════════════ */}
      {hasMetaData && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader
            label="LIVE META SNAPSHOT"
            color="rgba(255,255,255,0.25)"
            rightLink={<Link href="/meta" style={{ fontFamily: 'monospace', fontSize: 9, color: '#00d4ff', textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>FULL LIST →</Link>}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>

            {/* Weapons */}
            <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid #ff2222', borderRadius: '0 0 2px 2px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + BORDER }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#ff2222', letterSpacing: 3 }}>WEAPONS</span>
              </div>
              {[...sTierWeapons, ...aTierWeapons].slice(0, 8).map(function(w, i, arr) {
                return (
                  <div key={w.name} className="s-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{w.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {w.trend === 'up'   && <span style={{ color: '#00ff41', fontSize: 11 }}>▲</span>}
                      {w.trend === 'down' && <span style={{ color: '#ff4444', fontSize: 11 }}>▼</span>}
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 900, color: TIER_COLORS[w.tier] || '#888', background: (TIER_COLORS[w.tier] || '#888') + '18', border: '1px solid ' + (TIER_COLORS[w.tier] || '#888') + '44', borderRadius: 2, padding: '2px 7px' }}>{w.tier}</span>
                    </div>
                  </div>
                );
              })}
              {sTierWeapons.length === 0 && aTierWeapons.length === 0 && (
                <div style={{ padding: '14px', fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>NEXUS UPDATING...</div>
              )}
            </div>

            {/* Shells */}
            <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid #ff8800', borderRadius: '0 0 2px 2px', overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + BORDER }}>
                <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, color: '#ff8800', letterSpacing: 3 }}>SHELLS</span>
              </div>
              {[...sTierShells, ...aTierShells].slice(0, 8).map(function(s, i, arr) {
                return (
                  <div key={s.name} className="s-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{s.name}</span>
                      {s.ranked_tier_solo && (
                        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', marginLeft: 8, letterSpacing: 1, fontWeight: 700 }}>RANKED {s.ranked_tier_solo}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.trend === 'up'   && <span style={{ color: '#00ff41', fontSize: 11 }}>▲</span>}
                      {s.trend === 'down' && <span style={{ color: '#ff4444', fontSize: 11 }}>▼</span>}
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 900, color: TIER_COLORS[s.tier] || '#888', background: (TIER_COLORS[s.tier] || '#888') + '18', border: '1px solid ' + (TIER_COLORS[s.tier] || '#888') + '44', borderRadius: 2, padding: '2px 7px' }}>{s.tier}</span>
                    </div>
                  </div>
                );
              })}
              {sTierShells.length === 0 && aTierShells.length === 0 && (
                <div style={{ padding: '14px', fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>NEXUS UPDATING...</div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ══ META MOVERS ═════════════════════════════════════ */}
      {hasMovers && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader label="META MOVERS THIS CYCLE" color="rgba(255,255,255,0.25)" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
            {moversUp.length > 0 && (
              <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #00ff41', borderRadius: '0 2px 2px 0', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + BORDER }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#00ff41', letterSpacing: 3, fontWeight: 700 }}>▲ TRENDING UP</span>
                </div>
                {moversUp.map(function(m, i) {
                  return (
                    <div key={m.name} className="s-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: i < moversUp.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{m.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700 }}>{(m.type || '').toUpperCase()}</span>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 900, color: TIER_COLORS[m.tier] || '#888', background: (TIER_COLORS[m.tier] || '#888') + '18', border: '1px solid ' + (TIER_COLORS[m.tier] || '#888') + '44', borderRadius: 2, padding: '2px 7px' }}>{m.tier}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {moversDown.length > 0 && (
              <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #ff4444', borderRadius: '0 2px 2px 0', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid ' + BORDER }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#ff4444', letterSpacing: 3, fontWeight: 700 }}>▼ TRENDING DOWN</span>
                </div>
                {moversDown.map(function(m, i) {
                  return (
                    <div key={m.name} className="s-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', borderBottom: i < moversDown.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{m.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700 }}>{(m.type || '').toUpperCase()}</span>
                        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 900, color: TIER_COLORS[m.tier] || '#888', background: (TIER_COLORS[m.tier] || '#888') + '18', border: '1px solid ' + (TIER_COLORS[m.tier] || '#888') + '44', borderRadius: 2, padding: '2px 7px' }}>{m.tier}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══ FACTION ACTIVITY (new) ══════════════════════════ */}
      {activeFactions.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader
            label="FACTION ACTIVITY"
            color="rgba(255,255,255,0.25)"
            count={activeFactions.length + ' ACTIVE'}
            rightLink={<Link href="/factions" style={{ fontFamily: 'monospace', fontSize: 9, color: '#ffd700', textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>FACTION INTEL →</Link>}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 5 }}>
            {activeFactions.map(function(entry) {
              var fname = entry[0];
              var count = entry[1];
              var displayName = fname.charAt(0).toUpperCase() + fname.slice(1);
              var color = FACTION_COLORS[displayName] || '#888';
              return (
                <Link key={fname} href="/factions" className="s-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + color, borderRadius: '0 2px 2px 0', padding: '10px 14px', textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: color, letterSpacing: 1 }}>{displayName.toUpperCase()}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>
                      {count} MENTION{count !== 1 ? 'S' : ''}
                    </div>
                  </div>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: color }}>{count}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ EDITOR COVERAGE ═════════════════════════════════ */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader
          label="THIS CYCLE — EDITOR COVERAGE"
          color="rgba(255,255,255,0.25)"
          rightLink={<Link href="/editors" style={{ fontFamily: 'monospace', fontSize: 9, color: '#00d4ff', textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>ALL EDITORS →</Link>}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 6 }}>
          {editors.map(function(editor) {
            var article = latestPerEditor[editor];
            var color   = EDITOR_COLORS[editor];
            var symbol  = EDITOR_SYMBOLS[editor];
            var portrait = '/images/editors/' + editor.toLowerCase() + '.jpg';

            return (
              <div key={editor} className="s-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + color, borderRadius: '0 2px 2px 0', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', border: '1px solid ' + color + '44', flexShrink: 0 }}>
                    <img src={portrait} alt={editor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: color, letterSpacing: 1 }}>{symbol} {editor}</span>
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>{EDITOR_ROLES[editor].toUpperCase()}</div>
                  </div>
                  {article && <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(article.created_at)}</span>}
                </div>

                {article ? (
                  <>
                    <Link href={'/intel/' + article.slug} style={{ textDecoration: 'none' }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: '0 0 6px', lineHeight: 1.4 }}>
                        {article.headline}
                      </p>
                    </Link>
                    {article.body && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '0 0 8px', lineHeight: 1.5 }}>
                        {parseBrief(article.body)}...
                      </p>
                    )}
                    <Link href={'/intel/' + article.slug} style={{ fontFamily: 'monospace', fontSize: 9, color: color, textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>
                      READ →
                    </Link>
                  </>
                ) : (
                  <p style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', margin: 0, letterSpacing: 1, fontWeight: 700 }}>NO RECENT COVERAGE</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ COMMUNITY PULSE ═════════════════════════════════ */}
      {latestPerEditor['GHOST'] && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader label="COMMUNITY PULSE" color="#00ff88" />

          <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid #00ff88', borderRadius: '0 2px 2px 0', padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(0,255,136,0.4)', flexShrink: 0 }}>
                <img src="/images/editors/ghost.jpg" alt="GHOST" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: '#00ff88', letterSpacing: 2 }}>◇ GHOST</span>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>COMMUNITY PULSE · {timeAgo(latestPerEditor['GHOST'].created_at).toUpperCase()}</div>
              </div>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.85)', margin: '0 0 8px', lineHeight: 1.4 }}>
              {latestPerEditor['GHOST'].headline}
            </p>
            {latestPerEditor['GHOST'].body && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 14px', lineHeight: 1.6 }}>
                {parseBrief(latestPerEditor['GHOST'].body)}...
              </p>
            )}
            <Link href={'/intel/' + latestPerEditor['GHOST'].slug} style={{ fontFamily: 'monospace', fontSize: 10, color: '#00ff88', textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>
              FULL PULSE REPORT →
            </Link>
          </div>
        </section>
      )}

      {/* ══ CROSS LINKS ═════════════════════════════════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid #00d4ff', borderRadius: '0 2px 2px 0', padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#00d4ff', letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>AUTONOMOUS INTELLIGENCE</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.1, marginBottom: 10 }}>
              DROP IN<br /><span style={{ color: '#00d4ff' }}>INFORMED.</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              This sitrep refreshes every 6 hours. Bookmark it, check before each session, and you'll always know what's shifted since you last played.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: '⬡ META TIER LIST',  href: '/meta',     color: '#00d4ff', desc: 'Full NEXUS rankings' },
              { label: '⬢ BUILD ADVISOR',   href: '/advisor',  color: '#ff8800', desc: 'Get your ranked loadout' },
              { label: 'RANKED GUIDE',       href: '/ranked',   color: '#ffd700', desc: 'Season 1 intel' },
              { label: 'FACTION INTEL',      href: '/factions', color: '#ffd700', desc: 'All 6 factions' },
              { label: 'ALL INTEL',          href: '/intel',    color: '#9b5de5', desc: 'Every article archived' },
            ].map(function(link) {
              return (
                <Link key={link.href} href={link.href} className="s-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + link.color, borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: link.color, letterSpacing: 1, fontWeight: 700 }}>{link.label}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>{link.desc}</div>
                  </div>
                  <span style={{ color: link.color, opacity: 0.5, fontSize: 13 }}>→</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}