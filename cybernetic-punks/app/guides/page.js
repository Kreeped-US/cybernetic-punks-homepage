// app/guides/page.js
// MIRANDA Field Guides — SEO-optimized hub with cross-references and structured data

import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Footer from '@/components/Footer';

export const revalidate = 300;

export const metadata = {
  title: 'Marathon Guides — Shell Guides, Ranked Prep, Extraction Strategy & Build Tips',
  description: 'Complete Marathon guides for every Runner. Shell ability breakdowns, ranked prep, weapon analysis, extraction strategy, mod guides, and beginner tips — updated every 6 hours by MIRANDA. Covers all 7 shells, weapons, mods, and map intel.',
  keywords: 'Marathon guides, Marathon guide, Marathon tips, Marathon beginner guide, Marathon shell guide, Marathon ranked guide, Marathon weapon guide, Marathon mod guide, Marathon extraction guide, Marathon strategy, how to play Marathon, Marathon Bungie guide, Marathon Thief guide, Marathon Destroyer guide, Marathon Assassin guide, Marathon Recon guide, Marathon Vandal guide, Marathon Triage guide, Marathon Rook guide',
  openGraph: {
    title: 'Marathon Guides — Shell Breakdowns, Ranked Prep & Extraction Strategy',
    description: 'Every Marathon guide you need. Shells, ranked, weapons, mods, extraction, and beginner tips. Auto-updated every 6 hours.',
    url: 'https://cyberneticpunks.com/guides',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630, alt: 'Marathon Field Guides — CyberneticPunks' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Guides | CyberneticPunks',
    description: 'Shell breakdowns, ranked prep, extraction strategy, and more. Updated every 6 hours.',
    images: ['https://cyberneticpunks.com/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/guides' },
};

// ─── CONSTANTS ──────────────────────────────────────────────
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';

const CATS = {
  'shell-guide':  { label: 'SHELL GUIDES',     color: '#9b5de5', desc: 'Ability breakdowns, playstyle analysis, and synergies for all 7 Runner Shells.', seoTerm: 'Marathon Shell Guides' },
  'ranked':       { label: 'RANKED PREP',      color: '#ffd700', desc: 'Holotag strategy, gear ante requirements, shell picks, and tier climb routes.', seoTerm: 'Marathon Ranked Guides' },
  'weapon-guide': { label: 'WEAPON GUIDES',    color: '#ff8800', desc: 'Per-weapon analysis — fire rate, range, ammo efficiency, and matchups.', seoTerm: 'Marathon Weapon Guides' },
  'extraction':   { label: 'EXTRACTION',       color: '#00d4ff', desc: 'Escape routes, timing windows, loot prioritization, and exfil tactics.', seoTerm: 'Marathon Extraction Strategy' },
  'mod-guide':    { label: 'MOD GUIDES',       color: '#ff2222', desc: 'Mod slot breakdowns and the best combinations for each shell and weapon.', seoTerm: 'Marathon Mod Guides' },
  'beginner':     { label: 'BEGINNER',         color: '#00ff41', desc: 'New Runner essentials — core mechanics, first builds, survival basics.', seoTerm: 'Marathon Beginner Guides' },
  'progression':  { label: 'PROGRESSION',      color: '#ffffff', desc: 'Faction paths, runner level milestones, and season-long upgrade priorities.', seoTerm: 'Marathon Progression Guides' },
  'map-guide':    { label: 'MAP INTEL',        color: '#888888', desc: 'Zone-by-zone knowledge — POIs, extraction points, map rotations.', seoTerm: 'Marathon Map Guides' },
};

const SHELLS = [
  { name: 'Assassin',  color: '#cc44ff', tag: 'assassin',  role: 'Stealth Killer' },
  { name: 'Destroyer', color: '#ff3333', tag: 'destroyer', role: 'Heavy Combat' },
  { name: 'Recon',     color: '#00d4ff', tag: 'recon',     role: 'Information' },
  { name: 'Rook',      color: '#aaaaaa', tag: 'rook',      role: 'Tank' },
  { name: 'Thief',     color: '#ffd700', tag: 'thief',     role: 'Extraction' },
  { name: 'Triage',    color: '#00ff88', tag: 'triage',    role: 'Support' },
  { name: 'Vandal',    color: '#ff8800', tag: 'vandal',    role: 'Movement' },
];

const FAQS = [
  {
    q: 'What is the best shell for beginners in Marathon?',
    a: 'For new Runners, Triage and Rook are the most forgiving picks. Triage has self-repair and revive abilities that help you survive mistakes, while Rook\'s high shield pool gives you time to learn positioning. Once comfortable, transition to Vandal for movement-based play or Thief for extraction-focused runs.',
  },
  {
    q: 'How do I extract successfully in Marathon?',
    a: 'Plan your exfil from the start of the match — know where your escape points are before you commit to a fight. Prioritize Tag Chips and high-value loot early, avoid late-match fights unless you have clear positioning, and always leave with enough health and ammo to contest the extraction zone. Don\'t be greedy.',
  },
  {
    q: 'What are Tag Chips and how do they work?',
    a: 'Tag Chips are loot items dropped by UESC enemies and map events during Ranked runs. They count toward your crew\'s score target and automatically sell on exfil — no inventory management needed. Grabbing Tag Chips is a reliable way to pad your score without relying purely on gear loot.',
  },
  {
    q: 'What is the meta in Marathon right now?',
    a: 'The meta shifts every 6 hours as NEXUS tracks live play data. Generally, Vandal and Thief dominate solo ranked, while Recon and Triage excel in squad play. Weapon meta rotates more often — check the live tier list for current picks. Rook is banned from Ranked.',
  },
  {
    q: 'How do I unlock faction items in Marathon?',
    a: 'Each of the 6 factions (Cyberacme, Nucaloric, Traxus, Mida, Arachne, Sekiguchi) has a reputation track. Run faction-aligned missions and farm their materials to level up. Higher ranks unlock stat bonuses, weapons, mods, and implants specific to that faction. See our Faction Guide for rank requirements and costs.',
  },
  {
    q: 'What is the best weapon in Marathon?',
    a: 'There\'s no single best weapon — it depends on your shell, range preference, and ammo type. For close range, the WSTR Combat Shotgun is a consistent S-tier pick. For mid-range, the M77 Assault Rifle offers the most forgiving gunplay. Our live tier list ranks every weapon by current meta viability.',
  },
  {
    q: 'How often are Marathon guides updated?',
    a: 'MIRANDA publishes new field guides every 6 hours, pulled from verified game data and community trends. Shell stats, weapon balancing, and meta positioning are tracked continuously — so the guides you read here always reflect the current game state.',
  },
  {
    q: 'What platforms is Marathon available on?',
    a: 'Marathon is available on Steam (PC), PlayStation 5, and Xbox Series X|S, with full cross-play support. Our guides apply to all platforms — weapon stats, shell abilities, and meta positioning are identical across platforms.',
  },
];

function readTime(body) {
  if (!body) return '1 min';
  return Math.max(1, Math.round(body.split(' ').length / 200)) + ' min read';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 86400000) + 'd ago';
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

function GuideCard({ guide, large }) {
  var catKey = guide.tags?.find(function(t) { return CATS[t]; }) || 'beginner';
  var cat = CATS[catKey] || CATS['beginner'];
  var rt = readTime(guide.body);
  var bodyPreview = (guide.body || '').replace(/\*\*/g, '').replace(/#+\s/g, '').slice(0, large ? 180 : 110);

  return (
    <Link href={'/intel/' + guide.slug} className="g-card" style={{ textDecoration: 'none', display: 'block', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + cat.color, borderRadius: '0 2px 2px 0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {guide.thumbnail && (
        <div style={{ position: 'relative', height: large ? 140 : 110, overflow: 'hidden', flexShrink: 0 }}>
          <img src={guide.thumbnail} alt={guide.headline} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, ' + CARD_BG + ')' }} />
        </div>
      )}
      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: cat.color, letterSpacing: 2, fontWeight: 700 }}>{cat.label}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(guide.created_at)}</span>
        </div>
        <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: large ? 13 : 12, fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.35 }}>{guide.headline}</h3>
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, margin: 0, lineHeight: 1.5, flex: 1 }}>{bodyPreview}...</p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid ' + BORDER, paddingTop: 8, marginTop: 4 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: cat.color, letterSpacing: 1, fontWeight: 700 }}>READ GUIDE →</span>
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>{rt}</span>
        </div>
      </div>
    </Link>
  );
}

function GuideGrid({ guides }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 6 }}>
      {guides.map(function(guide) { return <GuideCard key={guide.id} guide={guide} />; })}
    </div>
  );
}

// ─── PAGE ───────────────────────────────────────────────────
export default async function GuidesPage({ searchParams }) {
  var params = await searchParams;
  var activeFilter = params?.cat || null;

  var [guidesResult, dexterBuildsResult, nexusMetaResult, shellResult, weaponResult, modResult, shellListResult] = await Promise.all([
    supabase
      .from('feed_items')
      .select('id, headline, body, slug, tags, thumbnail, created_at, ce_score')
      .eq('editor', 'MIRANDA')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(80),

    // Cross-reference: DEXTER build articles for "related builds" section
    supabase
      .from('feed_items')
      .select('id, headline, slug, tags, thumbnail, ce_score, created_at')
      .eq('editor', 'DEXTER')
      .eq('is_published', true)
      .order('ce_score', { ascending: false })
      .limit(4),

    // Cross-reference: NEXUS meta for "related meta analysis"
    supabase
      .from('feed_items')
      .select('id, headline, slug, tags, thumbnail, ce_score, created_at')
      .eq('editor', 'NEXUS')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(4),

    supabase.from('shell_stats').select('id', { count: 'exact', head: true }),
    supabase.from('weapon_stats').select('id', { count: 'exact', head: true }),
    supabase.from('mod_stats').select('id', { count: 'exact', head: true }),

    // Shell list with images for "Explore by Shell" nav
    supabase.from('shell_stats').select('name, image_filename, role').order('name'),
  ]);

  var shellCount  = shellResult.count  || 0;
  var weaponCount = weaponResult.count || 0;
  var modCount    = modResult.count    || 0;
  var dexterBuilds = dexterBuildsResult.data || [];
  var nexusMeta    = nexusMetaResult.data || [];
  var shellDB      = shellListResult.data || [];

  // Dedup by headline
  var seen = {};
  var allGuides = [];
  for (var guide of (guidesResult.data || [])) {
    var key = (guide.headline || '').slice(0, 50).toLowerCase().trim();
    if (seen[key]) continue;
    seen[key] = true;
    allGuides.push(guide);
    if (allGuides.length >= 40) break;
  }

  var guides = activeFilter
    ? allGuides.filter(function(g) { return g.tags && g.tags.includes(activeFilter); })
    : allGuides;

  var featured = guides[0] || null;
  var rest = guides.slice(1);
  var totalGuides = allGuides.length;

  // Trending: last 7 days by ce_score
  var weekAgo = Date.now() - 7 * 86400000;
  var trending = allGuides
    .filter(function(g) { return new Date(g.created_at).getTime() > weekAgo && g.ce_score > 0; })
    .sort(function(a, b) { return (b.ce_score || 0) - (a.ce_score || 0); })
    .slice(0, 3);

  // Category counts
  var catCounts = {};
  for (var g of allGuides) {
    if (!g.tags) continue;
    for (var tag of g.tags) {
      if (CATS[tag]) catCounts[tag] = (catCounts[tag] || 0) + 1;
    }
  }

  // Per-shell guide counts
  var shellGuideCounts = {};
  SHELLS.forEach(function(s) {
    shellGuideCounts[s.tag] = allGuides.filter(function(g) {
      var tags = (g.tags || []).map(function(t) { return (t || '').toLowerCase(); });
      var headline = (g.headline || '').toLowerCase();
      return tags.includes(s.tag) || headline.includes(s.tag);
    }).length;
  });

  var lastUpdated = allGuides[0]?.created_at || null;

  // ─── STRUCTURED DATA ─────────────────────────────────────
  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://cyberneticpunks.com/guides' },
    ],
  };

  var faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(function(f) {
      return { '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } };
    }),
  };

  var itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Marathon Field Guides',
    description: 'Complete collection of Marathon game guides covering shells, weapons, mods, ranked mode, extraction strategy, and progression.',
    numberOfItems: totalGuides,
    itemListElement: guides.slice(0, 10).map(function(g, i) {
      return {
        '@type': 'ListItem',
        position: i + 1,
        url: 'https://cyberneticpunks.com/intel/' + g.slug,
        name: g.headline,
      };
    }),
  };

  var collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Marathon Guides — CyberneticPunks',
    description: 'Complete Marathon guides for every Runner. Shell ability breakdowns, ranked prep, weapon analysis, extraction strategy, mod guides, and beginner tips.',
    url: 'https://cyberneticpunks.com/guides',
    inLanguage: 'en-US',
    isPartOf: {
      '@type': 'WebSite',
      name: 'CyberneticPunks',
      url: 'https://cyberneticpunks.com',
    },
    dateModified: lastUpdated,
  };

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />

      <style>{`
        .g-card        { transition: background 0.12s, border-color 0.12s; }
        .g-card:hover  { background: #1e2228 !important; }
        .g-cat         { transition: background 0.12s, border-color 0.12s; }
        .g-cat:hover   { background: #1e2228 !important; }
        .g-link:hover  { background: #1e2228 !important; }
        .g-shell:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ BREADCRUMB ══════════════════════════════════════ */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: '#9b5de5' }}>GUIDES</li>
          {activeFilter && CATS[activeFilter] && (
            <>
              <li>/</li>
              <li style={{ color: '#fff' }}>{CATS[activeFilter].label}</li>
            </>
          )}
        </ol>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════ */}
      <section style={{ padding: '24px 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#9b5de5', background: 'rgba(155,93,229,0.1)', border: '1px solid rgba(155,93,229,0.3)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#9b5de5' }} />
            ◎ MIRANDA · FIELD GUIDE EDITOR
          </span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#00ff41', background: 'rgba(0,255,65,0.08)', border: '1px solid rgba(0,255,65,0.25)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
            UPDATED EVERY 6H
          </span>
          {lastUpdated && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
              LATEST {timeAgo(lastUpdated).toUpperCase()}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 40, alignItems: 'center' }}>
          <div>
            <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5.5vw, 3.6rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.05, margin: '0 0 18px' }}>
              MARATHON<br /><span style={{ color: '#9b5de5' }}>FIELD GUIDES</span>
            </h1>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 540, marginBottom: 14 }}>
              Complete Marathon guides for every Runner. Shell ability breakdowns, ranked prep, weapon analysis, extraction strategy, mod guides, and beginner tips.
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, maxWidth: 540, marginBottom: 24 }}>
              Built from verified game data across <strong style={{ color: '#fff' }}>{shellCount} shells</strong>, <strong style={{ color: '#fff' }}>{weaponCount} weapons</strong>, and <strong style={{ color: '#fff' }}>{modCount} mods</strong>. Auto-updated by MIRANDA every 6 hours.
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link href="/advisor" style={{ padding: '11px 22px', background: '#ff8800', color: '#000', fontSize: 11, fontWeight: 800, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
                ⬢ GET YOUR BUILD →
              </Link>
              <Link href="/ranked" style={{ padding: '11px 22px', background: CARD_BG, border: '1px solid ' + BORDER, color: '#ffd700', fontSize: 11, fontWeight: 700, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
                RANKED GUIDE →
              </Link>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
            {[
              { label: 'GUIDES PUBLISHED',  value: totalGuides,  color: '#9b5de5' },
              { label: 'SHELLS DOCUMENTED', value: shellCount,   color: '#00d4ff' },
              { label: 'WEAPONS TRACKED',   value: weaponCount,  color: '#ff8800' },
              { label: 'MODS INDEXED',      value: modCount,     color: '#ff2222' },
            ].map(function(stat, i) {
              return (
                <div key={i} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + stat.color, borderRadius: '0 0 2px 2px', padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 26, fontWeight: 900, color: stat.color, lineHeight: 1, marginBottom: 6 }}>{stat.value}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700 }}>{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ EXPLORE BY SHELL ════════════════════════════════ */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader label="EXPLORE BY SHELL" count={shellCount + ' SHELLS'} />

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 14, maxWidth: 720 }}>
          Jump to guides for your Runner Shell. Each link takes you to the shell's detail page with ability breakdowns, stat tables, and related MIRANDA guides.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 5 }}>
          {SHELLS.map(function(shell) {
            var dbShell = shellDB.find(function(s) { return s.name === shell.name; });
            var imgSrc = dbShell?.image_filename ? '/images/shells/' + dbShell.image_filename : null;
            var guideCount = shellGuideCounts[shell.tag] || 0;
            return (
              <Link key={shell.name} href={'/shells/' + shell.tag} className="g-shell" style={{ display: 'flex', gap: 10, alignItems: 'center', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + shell.color, borderRadius: '0 2px 2px 0', padding: '10px 12px', textDecoration: 'none' }}>
                <div style={{ width: 36, height: 36, flexShrink: 0, background: DEEP_BG, border: '1px solid ' + shell.color + '30', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {imgSrc ? <img src={imgSrc} alt={shell.name} style={{ width: 32, height: 32, objectFit: 'contain' }} /> : <span style={{ fontSize: 14, color: shell.color + '40' }}>◎</span>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: shell.color, letterSpacing: 1 }}>{shell.name.toUpperCase()}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>
                    {guideCount > 0 ? guideCount + ' GUIDE' + (guideCount !== 1 ? 'S' : '') : shell.role.toUpperCase()}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ══ CATEGORY FILTER ═════════════════════════════════ */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader label="BROWSE BY CATEGORY" />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 5 }}>
          <Link href="/guides" className="g-cat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + (!activeFilter ? '#fff' : 'rgba(255,255,255,0.2)'), borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
            <div>
              <div style={{ fontFamily: 'monospace', fontSize: 9, color: !activeFilter ? '#fff' : 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 2, fontWeight: 700 }}>ALL GUIDES</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Every category</div>
            </div>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: !activeFilter ? '#fff' : 'rgba(255,255,255,0.25)' }}>{totalGuides}</span>
          </Link>
          {Object.entries(CATS).map(function(entry) {
            var key = entry[0];
            var cat = entry[1];
            var isActive = activeFilter === key;
            var count = catCounts[key] || 0;
            return (
              <Link key={key} href={isActive ? '/guides' : '/guides?cat=' + key} className="g-cat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + (isActive ? cat.color : cat.color + '44'), borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
                <div>
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: isActive ? cat.color : cat.color + 'cc', letterSpacing: 2, marginBottom: 2, fontWeight: 700 }}>{cat.label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.desc.slice(0, 36)}</div>
                </div>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 900, color: isActive ? cat.color : 'rgba(255,255,255,0.25)' }}>{count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ══ TRENDING (7 day top scores) ═════════════════════ */}
      {trending.length > 0 && !activeFilter && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader label="TRENDING THIS WEEK" color="#00ff41" count={trending.length} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 6 }}>
            {trending.map(function(g) { return <GuideCard key={g.id} guide={g} />; })}
          </div>
        </section>
      )}

      {/* ══ FEATURED GUIDE ══════════════════════════════════ */}
      {featured && !activeFilter && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader label="FEATURED GUIDE" color="#9b5de5" />
          <Link href={'/intel/' + featured.slug} className="g-card" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ position: 'relative', background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '3px solid #9b5de5', borderRadius: '0 0 2px 2px', overflow: 'hidden', display: 'grid', gridTemplateColumns: featured.thumbnail ? 'minmax(0, 1fr) 320px' : '1fr', minHeight: 220 }}>
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(135deg, rgba(155,93,229,0.06), transparent 60%)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 800, letterSpacing: 2, color: '#000', background: '#9b5de5', padding: '3px 10px', borderRadius: 2 }}>FEATURED</span>
                    {(function() {
                      var catKey = featured.tags?.find(function(t) { return CATS[t]; });
                      var cat = catKey ? CATS[catKey] : null;
                      return cat ? <span key="cat" style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: cat.color, background: cat.color + '14', border: '1px solid ' + cat.color + '30', padding: '3px 9px', borderRadius: 2 }}>{cat.label}</span> : null;
                    })()}
                    <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto', fontWeight: 700 }}>{timeAgo(featured.created_at)}</span>
                  </div>
                  <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(16px, 2.2vw, 22px)', fontWeight: 900, color: '#fff', margin: '0 0 12px', lineHeight: 1.2 }}>
                    {featured.headline}
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, margin: 0, maxWidth: 540 }}>
                    {(featured.body || '').replace(/\*\*/g, '').replace(/#+\s/g, '').slice(0, 200)}...
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18, paddingTop: 14, borderTop: '1px solid ' + BORDER, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#9b5de5', letterSpacing: 2, fontWeight: 700 }}>READ FULL GUIDE →</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>{readTime(featured.body)}</span>
                </div>
              </div>
              {featured.thumbnail && (
                <div style={{ backgroundImage: 'url(' + featured.thumbnail + ')', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, ' + CARD_BG + ' 0%, transparent 50%)' }} />
                </div>
              )}
            </div>
          </Link>
        </section>
      )}

      {/* ══ GUIDE GRID ══════════════════════════════════════ */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        {guides.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2 }}>
            <div style={{ fontSize: 32, color: '#9b5de5', marginBottom: 16, opacity: 0.4 }}>◎</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700 }}>
              {activeFilter ? 'NO ' + (CATS[activeFilter]?.label || activeFilter.toUpperCase()) + ' YET' : 'MIRANDA INITIALIZING'}
            </div>
          </div>
        ) : activeFilter ? (
          <>
            <SectionHeader
              label={(CATS[activeFilter]?.seoTerm || activeFilter.toUpperCase()).toUpperCase()}
              color={CATS[activeFilter]?.color}
              count={guides.length + ' GUIDES'}
            />
            {CATS[activeFilter] && (
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 16, maxWidth: 720 }}>
                {CATS[activeFilter].desc}
              </p>
            )}
            <GuideGrid guides={guides} />
          </>
        ) : (
          <>
            <SectionHeader label="ALL GUIDES" count={rest.length + ' GUIDES'} />
            <GuideGrid guides={rest} />
          </>
        )}
      </section>

      {/* ══ RELATED INTEL FROM OTHER EDITORS ════════════════ */}
      {(dexterBuilds.length > 0 || nexusMeta.length > 0) && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader label="RELATED INTEL" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 10 }}>
            {dexterBuilds.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#ff8800', letterSpacing: 2, fontWeight: 700 }}>⬢ DEXTER BUILDS</span>
                  <Link href="/intel/dexter" style={{ fontFamily: 'monospace', fontSize: 8, color: '#ff8800', textDecoration: 'none', letterSpacing: 1, marginLeft: 'auto', fontWeight: 700 }}>ALL BUILDS →</Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dexterBuilds.map(function(b) {
                    return (
                      <Link key={b.id} href={'/intel/' + b.slug} className="g-link" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #ff8800', borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
                        <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.35, minWidth: 0 }}>{b.headline}</div>
                        {b.ce_score > 0 && <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#ff8800', background: 'rgba(255,136,0,0.14)', border: '1px solid rgba(255,136,0,0.3)', borderRadius: 2, padding: '1px 6px', fontWeight: 800 }}>{b.ce_score}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {nexusMeta.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#00d4ff', letterSpacing: 2, fontWeight: 700 }}>⬡ NEXUS META</span>
                  <Link href="/intel/nexus" style={{ fontFamily: 'monospace', fontSize: 8, color: '#00d4ff', textDecoration: 'none', letterSpacing: 1, marginLeft: 'auto', fontWeight: 700 }}>ALL META →</Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {nexusMeta.map(function(m) {
                    return (
                      <Link key={m.id} href={'/intel/' + m.slug} className="g-link" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #00d4ff', borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
                        <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.35, minWidth: 0 }}>{m.headline}</div>
                        {m.ce_score > 0 && <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#00d4ff', background: 'rgba(0,212,255,0.14)', border: '1px solid rgba(0,212,255,0.3)', borderRadius: 2, padding: '1px 6px', fontWeight: 800 }}>{m.ce_score}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ══ FAQ (SEO GOLD) ══════════════════════════════════ */}
      <section style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader label="FREQUENTLY ASKED" count={FAQS.length + ' QUESTIONS'} />

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 16, maxWidth: 720 }}>
          Quick answers to the questions Runners ask most often. For deeper analysis, browse the guides above.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 6 }}>
          {FAQS.map(function(faq, i) {
            return (
              <div key={i} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid #9b5de5', borderRadius: '0 2px 2px 0', padding: '14px 16px' }}>
                <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.35 }}>{faq.q}</h3>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>{faq.a}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ CTA ═════════════════════════════════════════════ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid #9b5de5', borderRadius: '0 2px 2px 0', padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#9b5de5', letterSpacing: 3, fontWeight: 700, marginBottom: 8 }}>◎ MIRANDA · FIELD GUIDE EDITOR</div>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: 1, lineHeight: 1.1, marginBottom: 10 }}>
              GUIDES PUBLISHED<br /><span style={{ color: '#9b5de5' }}>EVERY 6 HOURS.</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
              MIRANDA publishes structured shell guides, ranked prep, and extraction strategy — built from live database stats, not opinions.
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { href: '/intel/miranda', label: '◎ ALL MIRANDA INTEL',  sub: 'Full guide archive',       color: '#9b5de5' },
              { href: '/advisor',       label: '⬢ BUILD ADVISOR',       sub: 'Get your ranked loadout',  color: '#ff8800' },
              { href: '/shells',        label: 'SHELL DATABASE',        sub: 'Full ability breakdowns',  color: '#00d4ff' },
              { href: '/ranked',        label: 'RANKED SEASON 1',       sub: 'Tiers, Holotags, rewards', color: '#ffd700' },
            ].map(function(item) {
              return (
                <Link key={item.href} href={item.href} className="g-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + item.color, borderRadius: '0 2px 2px 0', textDecoration: 'none' }}>
                  <div>
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: item.color, letterSpacing: 1, fontWeight: 700 }}>{item.label}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700 }}>{item.sub}</div>
                  </div>
                  <span style={{ color: item.color, opacity: 0.5, fontSize: 13 }}>→</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}