// app/wardogs/[section]/page.js
// One dynamic route renders EVERY Wardogs section from the sections-config (routes
// render FROM config, not hardcoded per-section pages). Unknown slugs 404. Mirrors
// app/dmz/[section]/page.js.
//
//   source 'editor' -> read feed_items WHERE game_slug='wardogs', scoped to THIS
//                      section via WARDOGS_ARTICLE_SECTION. Zero -> WardogsEmptyState.
//   source 'data'   -> WardogsComingSoon shell (its own entity tables come post-EA).
//
// Phase 1 ships zero Wardogs articles, so editor sections always render the empty state
// today; the article-card path is forward-ready for Phase 2. NOTE: the
// /wardogs/[section]/[slug] article-detail route is DEFERRED (nothing to open yet) --
// it must land together with the first published Wardogs article.
//
// Queries Supabase -> force-dynamic. `supabase` is the lazy anon proxy.
// ROBOTS: the subtree is indexed now that wardogs.indexable is true (layout gate); this
// route's generateMetadata still noindexes an EMPTY section (belt-and-suspenders).

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Exo_2 } from 'next/font/google';
import { getGameSection } from '@/lib/games';
import { wardogsArticleSlugsForSection } from '@/lib/games/wardogs';
import { sectionHasContent } from '@/lib/wardogs/sections';
import { extractSnippet, readTime } from '@/lib/dmz/articleContent';
import { formatPublishDate } from '@/lib/formatDate';
import WardogsEmptyState from '../WardogsEmptyState';
import WardogsComingSoon from '../WardogsComingSoon';
import Link from 'next/link';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

export const dynamic = 'force-dynamic';

var WARDOGS_GAME_SLUG = 'wardogs';

export async function generateMetadata({ params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection('wardogs', sectionSlug);
  if (!section) return { title: 'Wardogs - Not Found' };
  var desc = section.description || (section.source === 'data'
    ? section.label + ' for Wardogs -- structured data lands with Early Access.'
    : section.label + ' for Wardogs -- coverage arrives as official details are confirmed.');
  var ogTitle = section.label + ' - Wardogs';
  var url = 'https://cyberneticpunks.com/wardogs/' + section.slug;
  // Empty section -> keep OUT of the index (follow:true so crawlers still traverse).
  // With wardogs.indexable true, a section WITH content omits robots here and inherits (indexed).
  var hasContent = await sectionHasContent(section);
  var robots = hasContent ? undefined : { index: false, follow: true };
  return {
    title: ogTitle,
    description: desc,
    robots: robots,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description: desc,
      url: url,
      siteName: 'CyberneticPunks',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: ogTitle,
      description: desc,
    },
  };
}

function ArticleCard({ section, article }) {
  var snippet = extractSnippet(article.body, 170);
  var date = formatPublishDate(article.created_at);
  var rt = readTime(article.body);
  return (
    <Link
      href={'/wardogs/' + section.slug + '/' + article.slug}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '18px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: EXO, fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
          color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '2px 9px',
        }}>News</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: 0.5, fontWeight: 600 }}>
          {[date, rt].filter(Boolean).join('  -  ')}
        </span>
      </div>
      <span style={{ fontFamily: EXO, fontSize: 19, fontWeight: 700, color: '#fff', lineHeight: 1.3, letterSpacing: 0.2 }}>
        {article.headline}
      </span>
      {snippet && (
        <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55 }}>{snippet}</span>
      )}
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
        Sourced from official Bulkhead / Team17 channels
      </span>
    </Link>
  );
}

// Source-independent structured data for a Wardogs section page. BreadcrumbList mirrors
// the VISIBLE breadcrumb (Network / Wardogs / <section label>). CollectionPage is emitted
// ONLY when the section has published articles.
function WardogsSectionSchema({ section, articles }) {
  var base = 'https://cyberneticpunks.com';
  var schemas = [{
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Network', item: base + '/' },
      { '@type': 'ListItem', position: 2, name: 'Wardogs', item: base + '/wardogs' },
      { '@type': 'ListItem', position: 3, name: section.label },
    ],
  }];
  if (articles && articles.length > 0) {
    schemas.push({
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: section.label + ' - Wardogs',
      description: section.description || ('Wardogs ' + section.label + ' on the CyberneticPunks network.'),
      url: base + '/wardogs/' + section.slug,
      isPartOf: { '@type': 'WebSite', name: 'CyberneticPunks', url: base },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: articles.map(function (a, i) {
          return { '@type': 'ListItem', position: i + 1, name: a.headline, url: base + '/wardogs/' + section.slug + '/' + a.slug };
        }),
      },
    });
  }
  return (
    <>
      {schemas.map(function (s, i) {
        return <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />;
      })}
    </>
  );
}

export default async function WardogsSectionPage({ params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection('wardogs', sectionSlug);
  if (!section) notFound();

  // Data-fed section: structured-data tool, no feed_items query.
  if (section.source !== 'editor') {
    return (
      <>
        <WardogsSectionSchema section={section} articles={[]} />
        <WardogsComingSoon section={section} />
      </>
    );
  }

  // Editor-fed section: read Wardogs articles scoped to THIS section via the slug map.
  // No members -> empty state. (byTag branch kept for parity; no Wardogs tag sections yet.)
  var byTag = section.contentFilter && section.contentFilter.byTag;
  var articles = [];
  try {
    if (byTag) {
      var { data: tagData } = await supabase
        .from('feed_items')
        .select('id, headline, slug, editor, tags, body, source_url, created_at')
        .eq('is_published', true)
        .eq('game_slug', WARDOGS_GAME_SLUG)
        .contains('tags', [byTag])
        .order('created_at', { ascending: false })
        .limit(30);
      if (tagData) articles = tagData;
    } else {
      var sectionSlugs = wardogsArticleSlugsForSection(section.slug);
      if (sectionSlugs.length > 0) {
        var { data } = await supabase
          .from('feed_items')
          .select('id, headline, slug, editor, tags, body, source_url, created_at')
          .eq('is_published', true)
          .eq('game_slug', WARDOGS_GAME_SLUG)
          .in('slug', sectionSlugs)
          .order('created_at', { ascending: false })
          .limit(30);
        if (data) articles = data;
      }
    }
  } catch (err) {
    // non-fatal: fall through to empty-state
  }

  if (articles.length === 0) {
    return (
      <>
        <WardogsSectionSchema section={section} articles={[]} />
        <WardogsEmptyState section={section} />
      </>
    );
  }

  return (
    <main className={exo2.variable} style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 96px' }}>
      <WardogsSectionSchema section={section} articles={articles} />
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href="/wardogs" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Wardogs</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{section.label}</span>
      </nav>

      {/* Section header */}
      <h1 style={{ fontFamily: EXO, fontSize: 32, fontWeight: 800, letterSpacing: 0.3, color: '#fff', margin: '0 0 10px', lineHeight: 1.2 }}>
        {section.label}
      </h1>
      {section.description && (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 28px', maxWidth: '60ch', lineHeight: 1.6 }}>
          {section.description}
        </p>
      )}

      {/* Article cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {articles.map(function (a) {
          return <ArticleCard key={a.id} section={section} article={a} />;
        })}
      </div>
    </main>
  );
}
