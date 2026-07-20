// app/dmz/[section]/page.js
// One dynamic route renders EVERY DMZ section from the sections-config (D1/D4:
// routes render FROM config, not hardcoded per-section pages). Unknown slugs 404.
//
//   source 'editor' -> read feed_items WHERE game_slug='dmz', scoped to THIS
//                      section via DMZ_ARTICLE_SECTION. Zero -> DmzEmptyState.
//                      Populated -> richer article cards (forest/Exo-2 language,
//                      matching the article-detail template).
//   source 'data'   -> DmzComingSoon shell (its own entity tables come later).
//
// Queries Supabase -> force-dynamic. `supabase` is the lazy anon Proxy.
//
// ROBOTS: gated in app/dmz/layout.js on dmz.indexable (index vs noindex,follow).
// This page sets NO robots of its own -> inherits that gate.

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Exo_2 } from 'next/font/google';
import { getGameSection } from '@/lib/games/registry';
import { dmzArticleSlugsForSection } from '@/lib/games/dmz';
import { extractSnippet, readTime } from '@/lib/dmz/articleContent';
import { formatPublishDate } from '@/lib/formatDate';
import DmzEmptyState from '../DmzEmptyState';
import DmzComingSoon from '../DmzComingSoon';
import Link from 'next/link';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

export const dynamic = 'force-dynamic';

var DMZ_GAME_SLUG = 'dmz';

// Does this section currently have indexable content? Mirrors the page body's
// fetch exactly (byTag vs slug-list; data sections render a coming-soon shell and
// have NO content until their entity tables exist). Used by generateMetadata to
// noindex empty sections -- an empty /dmz/<section> is a thin page that inherits
// index:true from dmz.indexable, and four+ of them were crawlable pre-launch.
// A section flips to index automatically the moment it has content.
async function sectionHasContent(section) {
  if (!section || section.source !== 'editor') return false; // data sections: coming-soon shell
  var byTag = section.contentFilter && section.contentFilter.byTag;
  try {
    if (byTag) {
      var { count: tagCount } = await supabase
        .from('feed_items')
        .select('id', { count: 'exact', head: true })
        .eq('is_published', true).eq('game_slug', DMZ_GAME_SLUG)
        .contains('tags', [byTag]);
      return (tagCount || 0) > 0;
    }
    var sectionSlugs = dmzArticleSlugsForSection(section.slug);
    if (sectionSlugs.length === 0) return false;
    var { count } = await supabase
      .from('feed_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true).eq('game_slug', DMZ_GAME_SLUG)
      .in('slug', sectionSlugs);
    return (count || 0) > 0;
  } catch (err) {
    return false; // fail-safe: an errored count -> treat as empty -> noindex (never over-expose)
  }
}

export async function generateMetadata({ params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection('dmz', sectionSlug);
  if (!section) return { title: 'DMZ — Not Found' };
  // Description resolves to the config `description` (all current sections have one).
  // The fallback is state-aware and never implies coverage exists: a data section is a
  // coming-soon structured-data shell (launches with the zone); an editor section without
  // copy is framed as incoming, not populated. openGraph/twitter/keywords are set here so
  // sections stop inheriting the root layout's Marathon og/twitter/keywords (same fix as
  // the hub; the /dmz/[section]/[slug] article pages already override on their own).
  var desc = section.description || (section.source === 'data'
    ? section.label + ' for DMZ -- structured data launches with the zone.'
    : section.label + ' for DMZ -- coverage arrives as official details are confirmed.');
  var ogTitle = section.label + ' — DMZ';
  var url = 'https://cyberneticpunks.com/dmz/' + section.slug;
  // An empty section is a thin page -- keep it OUT of the index until it has
  // content (follow:true so crawlers still traverse to real pages). When it has
  // content, omit robots here and inherit the root/layout index:true. The /dmz
  // hub and the article pages are unaffected -- they set their own metadata.
  var hasContent = await sectionHasContent(section);
  var robots = hasContent ? undefined : { index: false, follow: true };
  return {
    title: ogTitle,
    description: desc,
    keywords: ['DMZ', 'DMZ ' + section.label, 'Modern Warfare 4 DMZ', 'MW4 DMZ', 'Call of Duty DMZ'],
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
  var isDiscourse = Array.isArray(article.tags) && article.tags.indexOf('discourse') !== -1;
  return (
    <Link
      href={'/dmz/' + section.slug + '/' + article.slug}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 8, padding: '18px 20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{
          fontFamily: EXO, fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase',
          color: 'var(--green)', border: '1px solid var(--green)', borderRadius: 999, padding: '2px 9px',
        }}>{isDiscourse ? 'Discourse' : 'News'}</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: 0.5, fontWeight: 600 }}>
          {[date, rt].filter(Boolean).join('  ·  ')}
        </span>
      </div>
      <span style={{ fontFamily: EXO, fontSize: 19, fontWeight: 700, color: '#fff', lineHeight: 1.3, letterSpacing: 0.2 }}>
        {article.headline}
      </span>
      {snippet && (
        <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55 }}>{snippet}</span>
      )}
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
        {isDiscourse ? 'Network desk -- Vivian Cross / Vantage' : 'Sourced from the official Call of Duty blog'}
      </span>
    </Link>
  );
}

// Source-independent structured data for a DMZ section page. BreadcrumbList mirrors
// the VISIBLE breadcrumb (Network / DMZ / <section label>) using the literals the
// visible nav uses; only section.label is dynamic. CollectionPage is emitted ONLY
// when the section has published articles (no empty article-collection claims on the
// coming-soon / empty sections -- those get the BreadcrumbList alone).
function DmzSectionSchema({ section, articles }) {
  var base = 'https://cyberneticpunks.com';
  var schemas = [{
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Network', item: base + '/' },
      { '@type': 'ListItem', position: 2, name: 'DMZ', item: base + '/dmz' },
      { '@type': 'ListItem', position: 3, name: section.label },
    ],
  }];
  if (articles && articles.length > 0) {
    schemas.push({
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      name: section.label + ' - DMZ',
      description: section.description || ('DMZ ' + section.label + ' on the CyberneticPunks network.'),
      url: base + '/dmz/' + section.slug,
      isPartOf: { '@type': 'WebSite', name: 'CyberneticPunks', url: base },
      mainEntity: {
        '@type': 'ItemList',
        itemListElement: articles.map(function (a, i) {
          return { '@type': 'ListItem', position: i + 1, name: a.headline, url: base + '/dmz/' + section.slug + '/' + a.slug };
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

export default async function DmzSectionPage({ params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection('dmz', sectionSlug);
  if (!section) notFound();

  // Data-fed section: structured-data tool, no feed_items query. BreadcrumbList still
  // emits (indexed URL) -- no CollectionPage since there are no articles.
  if (section.source !== 'editor') {
    return (
      <>
        <DmzSectionSchema section={section} articles={[]} />
        <DmzComingSoon section={section} />
      </>
    );
  }

  // Editor-fed section: read DMZ articles scoped to THIS section. Curated news
  // sections map by slug (DMZ_ARTICLE_SECTION, since feed_items has no section
  // column). The Discourse section maps by TAG (contentFilter.byTag) -- its slugs
  // are generated, not hand-curated. No members -> empty state.
  var byTag = section.contentFilter && section.contentFilter.byTag;
  var articles = [];
  try {
    if (byTag) {
      var { data: tagData } = await supabase
        .from('feed_items')
        .select('id, headline, slug, editor, tags, body, source_url, created_at')
        .eq('is_published', true)
        .eq('game_slug', DMZ_GAME_SLUG)
        .contains('tags', [byTag])
        .order('created_at', { ascending: false })
        .limit(30);
      if (tagData) articles = tagData;
    } else {
      var sectionSlugs = dmzArticleSlugsForSection(section.slug);
      if (sectionSlugs.length > 0) {
        var { data } = await supabase
          .from('feed_items')
          .select('id, headline, slug, editor, tags, body, source_url, created_at')
          .eq('is_published', true)
          .eq('game_slug', DMZ_GAME_SLUG)
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
        <DmzSectionSchema section={section} articles={[]} />
        <DmzEmptyState section={section} />
      </>
    );
  }

  return (
    <main className={exo2.variable} style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 96px' }}>
      <DmzSectionSchema section={section} articles={articles} />
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href="/dmz" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>DMZ</Link>
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
