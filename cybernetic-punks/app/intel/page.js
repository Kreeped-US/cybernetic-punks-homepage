// app/intel/page.js
// SEO depth pass — April 30, 2026.
// Adds: revalidate, expanded keywords, visible breadcrumb,
// BreadcrumbList + CollectionPage (with dateModified) + ItemList (richer)
// + FAQPage.
//
// MAJOR REWRITE June 2, 2026 — fixed 235 impressions / 0 clicks GSC problem:
// - Old title led with cadence ("Every 6 Hours") which (a) doesn't match a
//   real search query and (b) was factually inaccurate after the cadence
//   change to 12h. New title leads with searcher intent ("Marathon News &
//   Latest Updates").
// - Old description led with brand claim ("most current Marathon intel hub").
//   New description names concrete content types (news, builds, meta, ranked,
//   patches).
// - FAQs were about the publication SYSTEM (AI-generated? who writes them?
//   where does the data come from?). Replaced with FAQs about MARATHON —
//   what searchers actually ask. Old FAQs leaked AI framing into the public
//   FAQPage schema, which contradicted our Path 2 editorial-positioning
//   strategy from June 1.
// - Hero badge changed from "5 EDITORS · PUBLISHING EVERY 6 HOURS" (system
//   bragging) to "REFRESHED THROUGHOUT THE DAY" (publication cadence as
//   reader benefit, not system feature).
// - H1 changed from "Intel Feed." (internal jargon) to "Marathon News &
//   Latest Updates." (what the page actually is).
// - Section header "About Our Editors" → "Frequently Asked About Marathon".
// - All "every 6 hours" copy replaced with "throughout the day" to match
//   the meta page and the actual 12h cron.

import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEditorDisplay } from '@/lib/editors/roster';
import { toISOWithPTOffset } from '@/lib/formatDate';

// Display rename (editor rework Step 3): pills + bylines show the editor's tag
// (proper case), not the raw uppercase codename. Null-safe -> raw key fallback.
function edTag(key) { var d = getEditorDisplay(key); return d ? (d.tag || d.fullName) : key; }

export const dynamic = 'force-dynamic';

// Per-page metadata so paginated archive pages (?page=N) self-canonical -> each
// is its own indexable page (not a duplicate of page 1), keeping the crawl path
// traversable. Page 1 keeps the canonical /intel (URL unchanged).
export async function generateMetadata({ searchParams }) {
  var sp = (await searchParams) || {};
  var page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  var suffix = page > 1 ? ' (Page ' + page + ')' : '';
  var canonical = page > 1
    ? 'https://cyberneticpunks.com/intel?page=' + page
    : 'https://cyberneticpunks.com/intel';
  return {
    title: 'Marathon News & Updates — Builds, Meta & Patches' + suffix,
    description: 'Latest Marathon news, build analysis, meta shifts, ranked intel, and patch coverage. 1,000+ articles covering every shell, weapon, and faction — refreshed throughout the day.',
    keywords: 'Marathon news, Marathon updates, Marathon intel, Marathon analysis, Marathon guides, Marathon meta, Marathon builds, Marathon community, Marathon news today, Marathon weekly update, Marathon community pulse, Marathon tier list update, Marathon patch news, Marathon gameplay analysis, Marathon Bungie news, latest Marathon updates, Marathon Season 2, Marathon S2 news',
    openGraph: {
      title: 'Marathon News & Updates — Builds, Meta & Patches' + suffix + ' | CyberneticPunks',
      description: 'Latest Marathon news, build analysis, meta shifts, ranked intel, and patch coverage. 1,000+ articles covering every shell, weapon, and faction.',
      url: canonical,
      siteName: 'CyberneticPunks',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: 'Marathon News & Updates — Builds, Meta & Patches' + suffix + ' | CyberneticPunks',
      description: 'Latest Marathon news, builds, meta shifts, and ranked intel. Refreshed throughout the day.',
    },
    alternates: { canonical: canonical },
  };
}

// Windowed page-number list for the pagination control: [1, '...', cur-1, cur,
// cur+1, '...', last]. Small corpora (<=7 pages) just show every number.
function pageWindow(cur, total) {
  if (total <= 7) {
    var all = [];
    for (var i = 1; i <= total; i++) all.push(i);
    return all;
  }
  var keep = [1, total, cur, cur - 1, cur + 1].filter(function (p) { return p >= 1 && p <= total; });
  var uniq = Array.from(new Set(keep)).sort(function (a, b) { return a - b; });
  var out = [];
  var prev = 0;
  uniq.forEach(function (p) {
    if (p - prev > 1) out.push('...');
    out.push(p);
    prev = p;
  });
  return out;
}

// Page-1 href stays /intel (clean canonical); deeper pages add ?page=N.
function pageHref(p) { return p <= 1 ? '/intel' : '/intel?page=' + p; }

var EDITOR_INFO = {
  CIPHER:  { symbol: '◈', color: '#ff2222', role: 'Play Analyst' },
  NEXUS:   { symbol: '⬡', color: '#00d4ff', role: 'Meta Strategist' },
  DEXTER:  { symbol: '⬢', color: '#ff8800', role: 'Build Engineer' },
  GHOST:   { symbol: '◇', color: '#00ff88', role: 'Community Pulse' },
  MIRANDA: { symbol: '◎', color: '#9b5de5', role: 'Field Guide' },
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var now = new Date();
  var then = new Date(dateStr);
  var diffMs = now - then;
  var diffH = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffH < 1) return 'just now';
  if (diffH < 24) return diffH + 'h ago';
  var diffD = Math.floor(diffH / 24);
  if (diffD < 7) return diffD + 'd ago';
  return Math.floor(diffD / 7) + 'w ago';
}

// ─── FAQ DATA ──────────────────────────────────────────────
// Rewritten June 2, 2026. Old FAQs were about the publication system
// ("Are the articles AI-generated?", "Who writes the articles?"). New
// FAQs answer questions a Marathon player would actually type into
// Google. Each answer naturally includes a link to a relevant page,
// turning the FAQ into a navigation funnel.
var MARATHON_FAQS = [
  {
    q: 'What\'s new in Marathon right now?',
    a: 'Season 2 (NIGHTFALL) launched June 2, 2026, with major balance changes, a new Sentinel shell, the KKV-9SD SMG, the D54 Battle Pistol, and eight new weapon chips. Open Play Week runs through June 9, with the new Ranked queue opening June 14. Our intel feed covers every shift as it happens — meta tier movements, build viability changes, patch breakdowns, and community reactions.',
  },
  {
    q: 'Where can I find the current Marathon meta tier list?',
    a: 'The live Marathon tier list at /meta ranks every weapon and Runner Shell by current viability. Rankings shift throughout the day based on play data, community sentiment, and patch impacts. The page also lets you build and share your own tier list.',
  },
  {
    q: 'What\'s the best Marathon shell for ranked play?',
    a: 'Currently, Vandal and Thief dominate solo ranked, while Recon and Triage excel in squads. Rook is banned from Ranked. The specific S-tier shells shift week-to-week — check the live shell tier list at /shells or the meta page for the current rankings. Each shell has a dedicated guide with stats, abilities, builds, and matchup data.',
  },
  {
    q: 'How often does the Marathon meta change?',
    a: 'Significantly with every Bungie patch (roughly every 2-4 weeks), and continuously between patches as the community discovers new builds and counters. Our meta tier list refreshes throughout the day to capture both — major shifts after balance updates and incremental movement during patch cycles.',
  },
  {
    q: 'Where do I find Marathon patch notes and update analysis?',
    a: 'Bungie publishes official patch notes on their site, but the impact on builds and meta takes 24-72 hours to fully shake out. Our intel feed covers each patch with build viability changes, tier list movements, and community sentiment analysis — usually within hours of release.',
  },
  {
    q: 'How do I build a competitive Marathon loadout?',
    a: 'The Build Advisor at /advisor generates a complete loadout in seconds — pick your shell, playstyle, and rank goal, and get back weapons, mods, cores, and implants tuned to current meta. For step-by-step shell guides covering each Runner\'s strengths, weaknesses, and recommended cores, see /guides.',
  },
];

var ARCHIVE_PAGE_SIZE = 100;

export default async function IntelHubPage({ searchParams }) {
  var sp = (await searchParams) || {};
  var page = Math.max(1, parseInt(sp.page || '1', 10) || 1);
  var fromIdx = (page - 1) * ARCHIVE_PAGE_SIZE;

  // One 100-row slice per archive page (well under PostgREST's 1000-row response
  // cap). The FULL non-noindex set is reachable because there are N such pages,
  // walkable via the prev/next + numbered links below. count:'exact' gives the
  // total so we know how many pages exist. Same noindex gate as sitemap/listings.
  var { data: articles, count } = await supabase
    .from('feed_items')
    .select('*', { count: 'exact' })
    .eq('is_published', true)
    .eq('game_slug', 'marathon')
    .eq('noindex', false)
    .order('created_at', { ascending: false })
    .range(fromIdx, fromIdx + ARCHIVE_PAGE_SIZE - 1);

  var items = articles || [];
  var totalCount = count || 0;
  var totalPages = Math.max(1, Math.ceil(totalCount / ARCHIVE_PAGE_SIZE));
  // Out-of-range page -> 404 (no thin/empty archive pages in the index).
  if (page > totalPages) notFound();

  var editorCounts = {};
  items.forEach(function(item) {
    if (!editorCounts[item.editor]) editorCounts[item.editor] = 0;
    editorCounts[item.editor]++;
  });

  // ── JSON-LD SCHEMAS ────────────────────────────────────────────
  // Built from live data so they reflect actual feed state.

  // Latest article timestamp — fresh-content signal for Google
  var lastArticleDate = items.length > 0
    ? items[0].created_at
    : new Date().toISOString();

  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',       item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Intel Feed', item: 'https://cyberneticpunks.com/intel' },
    ],
  };

  var collectionPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Marathon News & Latest Updates',
    description: 'Latest Marathon news, build analysis, meta shifts, ranked intel, and patch coverage. Updated throughout the day.',
    url: 'https://cyberneticpunks.com/intel',
    dateModified: toISOWithPTOffset(lastArticleDate),
    publisher: {
      '@type': 'Organization',
      name: 'CyberneticPunks',
      url:  'https://cyberneticpunks.com',
    },
  };

  // Top 30 articles for ItemList — Google handles larger lists fine,
  // and surfacing more URLs per crawl is valuable
  var itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Latest Marathon Articles',
    numberOfItems: totalCount,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: items.slice(0, 30).map(function(item, i) {
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'Article',
          name:           item.headline,
          url:            'https://cyberneticpunks.com/intel/' + item.slug,
          datePublished:  toISOWithPTOffset(item.created_at),
          author: {
            '@type': 'Person',
            name: item.editor,
          },
        },
      };
    }),
  };

  // FAQPage — now built from MARATHON_FAQS (questions Marathon players ask)
  // not publication-system FAQs (questions nobody asks).
  var faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: MARATHON_FAQS.map(function(item) {
      return {
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      };
    }),
  };

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#ffffff', paddingTop: 12, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>

      {/* JSON-LD Schemas — render inline so Google sees on first crawl */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPageSchema) }} />
      {items.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      <style>{`
        .intel-row:hover   { background: #1e2228 !important; }
        .intel-editor-pill:hover { background: #1e2228 !important; }
        .intel-faq         { background: #1a1d24; border: 1px solid #22252e; border-left: 2px solid #00ff41; border-radius: 0 2px 2px 0; }
        .intel-faq summary { padding: 14px 18px; cursor: pointer; font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.85); list-style: none; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .intel-faq summary::-webkit-details-marker { display: none; }
        .intel-faq[open] summary { color: #fff; }
        .intel-faq-body    { padding: 0 18px 16px; font-size: 13px; color: rgba(255,255,255,0.55); line-height: 1.6; }
      `}</style>

      {/* ══ BREADCRUMB ════════════════════════════════════════ */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: '#00ff41' }}>NEWS & UPDATES</li>
        </ol>
      </nav>

      {/* ══ HERO ═════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff41', boxShadow: '0 0 6px rgba(0,255,65,0.5)' }} />
          <span style={{ fontSize: 10, color: '#00ff41', letterSpacing: 3, fontWeight: 700 }}>REFRESHED THROUGHOUT THE DAY</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.05, margin: '0 0 12px', color: '#fff' }}>
              Marathon News &<br /><span style={{ color: '#00ff41' }}>Latest Updates.</span>
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 520, margin: 0 }}>
              Build analysis, meta shifts, ranked intel, patch coverage, and community pulse. All the latest Marathon coverage in one feed.
            </p>
          </div>

          {/* Stat card */}
          <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid #00ff41', borderRadius: '0 0 3px 3px', padding: '14px 20px', minWidth: 180 }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#00ff41', lineHeight: 1, letterSpacing: '-0.5px', marginBottom: 5 }}>
              {totalCount}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
              Articles Published
            </div>
          </div>
        </div>
      </section>

      {/* ══ EDITOR FILTER STRIP ═════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Filter by Editor</span>
          <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
          {Object.keys(EDITOR_INFO).map(function(editorName) {
            var info = EDITOR_INFO[editorName];
            var count = editorCounts[editorName] || 0;
            return (
              <Link key={editorName} href={'/intel/' + editorName.toLowerCase()}
                className="intel-editor-pill"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: '#1a1d24',
                  border: '1px solid #22252e',
                  borderTop: '2px solid ' + info.color,
                  borderRadius: '0 0 3px 3px',
                  textDecoration: 'none',
                  transition: 'background 0.1s',
                }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid ' + info.color + '40', background: '#0e1014', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src={'/images/editors/' + editorName.toLowerCase() + '.jpg'} alt={editorName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: info.color, letterSpacing: 2, fontWeight: 700 }}>{edTag(editorName)}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1 }}>{info.role}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 800, color: info.color, fontFamily: 'monospace' }}>{count}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ══ ARTICLE LIST ═══════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>All Intel</span>
          <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontFamily: 'monospace' }}>{totalCount} TOTAL{totalPages > 1 ? ' · PAGE ' + page + '/' + totalPages : ''}</span>
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 40, background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, fontWeight: 700 }}>
            NO ARTICLES YET — CHECK BACK SOON
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(function(item) {
              var editor = EDITOR_INFO[item.editor] || EDITOR_INFO.CIPHER;
              return (
                <Link key={item.id} href={'/intel/' + item.slug} className="intel-row" style={{
                  display: 'flex', gap: 14,
                  background: '#1a1d24',
                  border: '1px solid #22252e',
                  borderLeft: '3px solid ' + editor.color + '66',
                  borderRadius: '0 3px 3px 0',
                  padding: '14px 16px',
                  textDecoration: 'none',
                  transition: 'background 0.1s',
                }}>
                  {item.thumbnail && (
                    <div style={{ width: 120, minWidth: 120, height: 75, borderRadius: 2, overflow: 'hidden', flexShrink: 0, background: '#0e1014', border: '1px solid #22252e' }}>
                      <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid ' + editor.color + '40', background: '#0e1014' }}>
                          <img src={'/images/editors/' + item.editor.toLowerCase() + '.jpg'} alt={item.editor} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                        </div>
                        <span style={{ fontSize: 9, color: editor.color, letterSpacing: 2, fontWeight: 700 }}>{edTag(item.editor)}</span>
                      </div>
                      {item.source && (
                        <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', padding: '2px 7px', border: '1px solid #22252e', borderRadius: 2, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>
                          {item.source}
                        </span>
                      )}
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto', fontFamily: 'monospace', letterSpacing: 1 }}>
                        {timeAgo(item.created_at)}
                      </span>
                    </div>

                    <h3 style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: '0 0 5px', lineHeight: 1.3 }}>
                      {item.headline}
                    </h3>

                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: 0, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {(item.body || '').replace(/\*\*/g, '')}
                    </p>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                      {item.ce_score > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: editor.color, background: editor.color + '15', border: '1px solid ' + editor.color + '30', borderRadius: 2, padding: '2px 7px', letterSpacing: 1 }}>
                          {item.ce_score}
                        </span>
                      )}
                      {item.tags && item.tags.length > 0 && item.tags.slice(0, 3).map(function(tag) {
                        return (
                          <span key={tag} style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', padding: '2px 7px', background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 1 }}>
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* ══ PAGINATION ═════════════════════════════════════ */}
      {/* Real <Link> prev/next + numbered pages so a crawler can walk the FULL
          non-noindex archive (page 1 -> last) and reach every quality article. */}
      {totalPages > 1 && (
        <nav aria-label="Intel archive pagination" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
          {page > 1 && (
            <Link rel="prev" href={pageHref(page - 1)} style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', padding: '8px 14px', border: '1px solid #22252e', background: '#1a1d24', borderRadius: 2, textDecoration: 'none', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace' }}>← PREV</Link>
          )}
          {pageWindow(page, totalPages).map(function (p, i) {
            if (p === '...') return <span key={'e' + i} style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', padding: '8px 4px', fontFamily: 'monospace' }}>…</span>;
            var current = p === page;
            return (
              <Link key={p} href={pageHref(p)} aria-current={current ? 'page' : undefined} style={{ fontSize: 10, color: current ? '#000' : 'rgba(255,255,255,0.6)', background: current ? '#00ff41' : '#1a1d24', border: '1px solid ' + (current ? '#00ff41' : '#22252e'), padding: '8px 13px', borderRadius: 2, textDecoration: 'none', letterSpacing: 1, fontWeight: 800, fontFamily: 'monospace' }}>{p}</Link>
            );
          })}
          {page < totalPages && (
            <Link rel="next" href={pageHref(page + 1)} style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', padding: '8px 14px', border: '1px solid #22252e', background: '#1a1d24', borderRadius: 2, textDecoration: 'none', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace' }}>NEXT →</Link>
          )}
        </nav>
      )}

      {/* ══ FAQ ═════════════════════════════════════════════ */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Frequently Asked About Marathon</span>
          <div style={{ flex: 1, height: 1, background: '#22252e' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{MARATHON_FAQS.length} QUESTIONS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MARATHON_FAQS.map(function(item, i) {
            return (
              <details key={i} className="intel-faq">
                <summary>
                  <span>{item.q}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#00ff41', flexShrink: 0, fontWeight: 700 }}>+</span>
                </summary>
                <div className="intel-faq-body">
                  {item.a}
                </div>
              </details>
            );
          })}
        </div>
      </section>

      {/* ══ BOTTOM LINKS ═══════════════════════════════════ */}
      <section style={{ maxWidth: 600, margin: '0 auto', padding: '0 24px 40px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Link href="/" style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', padding: '8px 18px', border: '1px solid #22252e', borderRadius: 2, textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>
            ← BACK TO HOME
          </Link>
          <Link href="/meta" style={{ fontSize: 10, color: '#00ff41', padding: '8px 18px', border: '1px solid rgba(0,255,65,0.3)', background: 'rgba(0,255,65,0.08)', borderRadius: 2, textDecoration: 'none', letterSpacing: 2, fontWeight: 700 }}>
            LIVE TIER LIST →
          </Link>
        </div>
      </section>
    </main>
  );
}