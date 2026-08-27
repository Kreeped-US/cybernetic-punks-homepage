// app/wardogs/page.js
// Wardogs landing -- the per-game hub. PHASE 1 SKELETON: breadcrumb + hero + EA
// countdown + config-driven Coverage cards (from lib/games/wardogs.js, with REAL
// feed_items counts). Deliberately lean -- the richer hub content (notify block, tool
// deck, FAQ, entity Reference links) is Phase 2 (confirmed-systems content), not
// scaffolded empty now. Mirrors the structural core of app/dmz/page.js.
//
// Server component + a Supabase read for live counts -> force-dynamic.
// ROBOTS: the subtree is indexed now that wardogs.indexable is true (layout gate); this
// page sets no robots of its own.

import Link from 'next/link';
import { Exo_2 } from 'next/font/google';
import { supabase } from '@/lib/supabase';
import { wardogs, wardogsArticleSlugsForSection } from '@/lib/games/wardogs';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: { absolute: 'Wardogs - Early Access Intel Hub | CyberneticPunks' },
  description: 'Confirmed-systems intel for Wardogs, the BULKHEAD / Team17 combined-arms shooter launching in Steam Early Access on September 10, 2026. Part of the CyberneticPunks network.',
  alternates: { canonical: 'https://cyberneticpunks.com/wardogs' },
};

// Set of currently-published game_slug='wardogs' article slugs -> REAL per-section
// counts. Zero pre-launch; the try/catch keeps the hub rendering if the read fails.
async function publishedWardogsSlugs() {
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('slug')
      .eq('game_slug', 'wardogs')
      .eq('is_published', true);
    return new Set((data || []).map(function (r) { return r.slug; }));
  } catch (err) {
    return new Set();
  }
}

function sectionCount(slug, publishedSet) {
  return wardogsArticleSlugsForSection(slug).filter(function (s) { return publishedSet.has(s); }).length;
}

// Whole days until Early Access, from the single wardogs.launch_date constant.
function daysToEarlyAccess() {
  if (!wardogs.launch_date) return null;
  var ms = new Date(wardogs.launch_date + 'T00:00:00Z').getTime() - Date.now();
  if (isNaN(ms)) return null;
  var d = Math.ceil(ms / 86400000);
  return d > 0 ? d : 0;
}

function Pill({ text, tone }) {
  var color = tone === 'live' ? 'var(--green)' : 'var(--text-tertiary)';
  var border = tone === 'live' ? 'var(--green)' : 'var(--border)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontFamily: 'monospace', fontSize: 8.5, fontWeight: 800, letterSpacing: 1.5,
      textTransform: 'uppercase', color: color,
      border: '1px solid ' + border, borderRadius: 2, padding: '2px 8px',
    }}>
      {tone === 'live' && <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />}
      {text}
    </span>
  );
}

var cardBase = {
  display: 'flex', flexDirection: 'column',
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 6, textDecoration: 'none', minHeight: 132, overflow: 'hidden',
};

function DossierHead({ code, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 14px', background: 'var(--bg-nav)', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)' }}>{code}</span>
      {children}
    </div>
  );
}

// Editor-fed section card with REAL count. count>0 -> live + "{n} report(s)";
// count===0 -> neutral "Publishing soon" (never claims live with nothing there).
function CountCard({ section, count, code }) {
  var live = count > 0;
  return (
    <Link href={'/wardogs/' + section.slug} className="wd-dossier" style={cardBase}>
      <DossierHead code={code}><Pill text={live ? 'Live' : 'Soon'} tone={live ? 'live' : 'muted'} /></DossierHead>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <span className="wd-card-title" style={{ fontFamily: EXO, fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>{section.label}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{section.description}</span>
        <span style={{ marginTop: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: live ? 'var(--green)' : 'var(--text-tertiary)' }}>
          {live ? (count + (count === 1 ? ' report' : ' reports')) : 'Publishing soon'}
        </span>
      </div>
    </Link>
  );
}

// Data-fed "coming soon" shell card (Arsenal).
function SoonCard({ section, code }) {
  return (
    <Link href={'/wardogs/' + section.slug} className="wd-dossier" style={cardBase}>
      <DossierHead code={code}><Pill text="Soon" tone="muted" /></DossierHead>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <span className="wd-card-title" style={{ fontFamily: EXO, fontSize: 17, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>{section.label}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{section.description}</span>
        <span style={{ marginTop: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: 'var(--text-tertiary)' }}>
          Verified in-game at Early Access
        </span>
      </div>
    </Link>
  );
}

export default async function WardogsLanding() {
  var published = await publishedWardogsSlugs();
  var daysToEA = daysToEarlyAccess();
  var briefingCount = published.size;

  var HUB_BASE = 'https://cyberneticpunks.com';
  var hubBreadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Network', item: HUB_BASE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Wardogs' },
    ],
  };
  var hubCollectionLd = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'Wardogs - Early Access Intel Hub',
    description: 'Confirmed-systems intel for Wardogs on the CyberneticPunks network.',
    url: HUB_BASE + '/wardogs',
    isPartOf: { '@type': 'WebSite', name: 'CyberneticPunks', url: HUB_BASE },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: wardogs.sections.map(function (sec, i) {
        return { '@type': 'ListItem', position: i + 1, name: sec.label, url: HUB_BASE + '/wardogs/' + sec.slug };
      }),
    },
  };

  return (
    <main className={exo2.variable} style={{ maxWidth: 1100, margin: '0 auto', padding: '52px 16px 96px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hubBreadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hubCollectionLd) }} />
      <style>{`
        .wd-dossier { transition: border-color .14s ease, background .14s ease; }
        .wd-dossier:hover { border-color: var(--accent); background: var(--bg-card-hover); }
        .wd-dossier .wd-card-title { transition: color .14s ease; }
        .wd-dossier:hover .wd-card-title { color: var(--accent) !important; }
      `}</style>

      {/* Breadcrumb: Network / Wardogs */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Wardogs</span>
      </nav>

      {/* Hero */}
      <div style={{ marginBottom: 34 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: EXO, fontSize: 11, fontWeight: 800, letterSpacing: 1,
            color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 6, padding: '3px 7px',
          }}>CNP</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
            Cybernetic Punks Network
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <h1 style={{ fontFamily: EXO, fontSize: 46, fontWeight: 800, letterSpacing: 1, color: '#fff', margin: 0, lineHeight: 1 }}>Wardogs</h1>
          <Pill text="Pre-launch" tone="muted" />
        </div>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: '0 0 22px', maxWidth: 600, lineHeight: 1.6 }}>
          {wardogs.tagline}. Confirmed-systems coverage of the BULKHEAD / Team17 combined-arms shooter - the three-team Control Zone, the cash economy, and combined arms - with verified data landing as Early Access opens.
        </p>

        {/* Early Access clock -- server-computed (SSR, force-dynamic). Days derive from
            the single wardogs.launch_date constant. No client tick. */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)',
          borderRadius: 8, padding: '20px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 800, letterSpacing: 2, color: 'var(--accent)', textTransform: 'uppercase' }}>Early Access</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
              <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Countdown Active</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap', alignItems: 'center' }}>
            {daysToEA != null && (
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 2 }}>T-Minus</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 56, fontWeight: 900, lineHeight: 1, color: 'var(--accent)', letterSpacing: 1 }}>{daysToEA}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Days</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minWidth: 210 }}>
              {[['Launch', '10 SEP 2026'], ['Platform', 'Steam (PC)'], ['Access', 'Early Access']].map(function (r) {
                return (
                  <div key={r[0]} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', width: 74, flexShrink: 0 }}>{r[0]}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{r[1]}</span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', width: 74, flexShrink: 0 }}>Intel</span>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {briefingCount > 0
                    ? <><span style={{ color: 'var(--green)', fontWeight: 700 }}>Live</span> - {briefingCount} {briefingCount === 1 ? 'Briefing' : 'Briefings'}</>
                    : 'Building'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontFamily: EXO, fontSize: 15, fontWeight: 700, color: '#fff' }}>Wardogs opens in Early Access September 10, 2026</span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>- the hub is standing by.</span>
          </div>
        </div>
      </div>

      {/* Coverage -- config-driven cards from wardogs.sections */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 16px' }}>
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>Coverage</h2>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
        {wardogs.sections.map(function (sec, i) {
          var code = sec.slug.replace(/[^a-z]/gi, '').slice(0, 2).toUpperCase() + '-' + String(i + 1).padStart(2, '0');
          if (sec.source === 'editor') return <CountCard key={sec.slug} section={sec} count={sectionCount(sec.slug, published)} code={code} />;
          return <SoonCard key={sec.slug} section={sec} code={code} />;
        })}
      </div>

      {/* PROVENANCE note -- Wardogs facts beyond name + date are unverified until in-game. */}
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '28px 0 0', maxWidth: 680, lineHeight: 1.6, fontFamily: 'monospace' }}>
        Wardogs is in pre-launch. Everything here is drawn from official BULKHEAD / Team17 material; specific numbers stay flagged as unconfirmed until they are verified in-game once Early Access opens.
      </p>
    </main>
  );
}
