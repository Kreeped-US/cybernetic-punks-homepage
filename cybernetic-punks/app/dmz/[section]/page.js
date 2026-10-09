// app/dmz/[section]/page.js
// One dynamic route renders EVERY DMZ section from the sections-config (D1/D4:
// routes render FROM config, not hardcoded per-section pages). Unknown slugs 404.
//
//   source 'editor' -> the eligible game_slug='dmz' articles that RESOLVE to THIS
//                      section via the shared resolver (lib/games/sectionArticles.js:
//                      slug map, discourse tag, default fallback). Zero -> DmzEmptyState.
//                      Populated -> richer article cards (forest/Exo-2 language,
//                      matching the article-detail template).
//   source 'data'   -> DmzComingSoon shell (its own entity tables come later).
//
// Queries Supabase -> force-dynamic.
//
// ROBOTS: gated in app/dmz/layout.js on dmz.indexable (index vs noindex,follow).
// This page sets NO robots of its own -> inherits that gate.

import { notFound } from 'next/navigation';
import { Exo_2 } from 'next/font/google';
import { getGameSection } from '@/lib/games';
import { loadSectionArticles } from '@/lib/games/sectionArticles';
import { withOgImages } from '@/lib/seo/ogImage';
import { sectionHasContent, isStandaloneReference } from '@/lib/dmz/sections';
import { extractSnippet, readTime } from '@/lib/dmz/articleContent';
import { formatPublishDate } from '@/lib/formatDate';
import DmzEmptyState from '../DmzEmptyState';
import DmzComingSoon from '../DmzComingSoon';
import Link from 'next/link';
import { safeJsonLd } from '@/lib/security/safeJsonLd';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

export const dynamic = 'force-dynamic';

var DMZ_GAME_SLUG = 'dmz';

// sectionHasContent (the shared indexability predicate) now lives in
// lib/dmz/sections.js so THIS route's noindex/meta-robots gate and the sitemap's
// section inclusion derive from ONE source and cannot drift. Imported above.

export async function generateMetadata({ params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection('dmz', sectionSlug);
  if (!section) return { title: 'DMZ - Not Found' };
  // Description resolves to the config `description` (all current sections have one).
  // The fallback is state-aware and never implies coverage exists: a data section is a
  // coming-soon structured-data shell (launches with the zone); an editor section without
  // copy is framed as incoming, not populated. openGraph/twitter/keywords are set here so
  // sections stop inheriting the root layout's Marathon og/twitter/keywords (same fix as
  // the hub; the /dmz/[section]/[slug] article pages already override on their own).
  var desc = section.description || (section.source === 'data'
    ? section.label + ' for DMZ -- structured data launches with the zone.'
    : section.label + ' for DMZ -- coverage arrives as official details are confirmed.');
  // Optional per-section metadata override (config: section.reference.seo; FOB only today). Canonical
  // and robots are never overridden here.
  var seo = section.reference && section.reference.seo ? section.reference.seo : null;
  if (seo && seo.description) desc = seo.description;
  var ogTitle = seo && seo.title ? seo.title : section.label + ' \u2014 DMZ';
  var ogImages = seo && seo.ogImage ? [seo.ogImage] : undefined;
  var url = 'https://cyberneticpunks.com/dmz/' + section.slug;
  // An empty section is a thin page -- keep it OUT of the index until it has
  // content (follow:true so crawlers still traverse to real pages). When it has
  // content, omit robots here and inherit the root/layout index:true. The /dmz
  // hub and the article pages are unaffected -- they set their own metadata.
  var hasContent = await sectionHasContent(section);
  var robots = hasContent ? undefined : { index: false, follow: true };
  return withOgImages({
    title: ogTitle,
    description: desc,
    keywords: ['DMZ', 'DMZ ' + section.label, 'Modern Warfare 4 DMZ', 'MW4 DMZ', 'Call of Duty DMZ'],
    robots: robots,
    alternates: { canonical: url },
    openGraph: {
      title: ogTitle,
      description: desc,
      url: url,
      siteName: 'Cybernetic Punks',
      type: 'website',
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: ogTitle,
      description: desc,
      ...(ogImages ? { images: ogImages } : {}),
    },
  }, 'dmz');
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
        {isDiscourse ? 'Network desk' : 'Sourced from the official Call of Duty blog'}
      </span>
    </Link>
  );
}

// Optional section image (config: section.reference.image). Responsive srcset over the pre-cut
// widths; width/height + aspect-ratio reserve the box (no layout shift). It is the page's only
// image and sits above the fold, so it gets fetchPriority high.
function SectionImage({ image, sizes, style }) {
  var srcSet = image.widths.map(function (w) { return image.srcBase + w + '.webp ' + w + 'w'; }).join(', ');
  var largest = image.widths[image.widths.length - 1];
  return (
    <figure style={{ margin: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.srcBase + largest + '.webp'} srcSet={srcSet} sizes={sizes} alt={image.alt}
        width={image.width} height={image.height} fetchPriority="high" decoding="async"
        style={Object.assign({ display: 'block', width: '100%', height: 'auto', aspectRatio: image.width + ' / ' + image.height, borderRadius: 4, border: '1px solid var(--border)' }, style || {})} />
      {image.credit && (
        <figcaption style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, textAlign: 'right', letterSpacing: 0.3 }}>{image.credit}</figcaption>
      )}
    </figure>
  );
}

// Optional "at a glance" reference block (config: section.reference; FOB only today). Server-rendered,
// data-driven: groups of {name, desc, href?, note?}, then attributed notes, the source link and the
// follow-up line. Text is paraphrased from the official source in the config, never quoted.
function SectionReference({ reference }) {
  return (
    <section aria-labelledby="dmz-reference-heading" style={{ margin: '8px 0 36px' }}>
      <h2 id="dmz-reference-heading" style={{ fontFamily: EXO, fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1.3 }}>
        {reference.heading}
      </h2>
      {reference.intro && (
        <p style={{ fontSize: 14.5, color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.6, maxWidth: '64ch' }}>{reference.intro}</p>
      )}
      {/* Optional prominent link to the full article (reference.cta; printer only today). */}
      {reference.cta && (
        <p style={{ margin: '-6px 0 22px' }}>
          <Link href={reference.cta.href} style={{ display: 'inline-block', fontFamily: EXO, fontSize: 13, fontWeight: 700, color: 'var(--green)', border: '1px solid var(--green)', borderRadius: 4, padding: '8px 14px', textDecoration: 'none' }}>
            {reference.cta.label} &rarr;
          </Link>
        </p>
      )}
      {reference.groups.map(function (g) {
        return (
          <div key={g.title} style={{ margin: '0 0 22px' }}>
            <h3 style={{ fontFamily: EXO, fontSize: 11, fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--green)', margin: '0 0 10px' }}>{g.title}</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: 10 }}>
              {g.stations.map(function (s) {
                return (
                  <li key={s.name} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
                    <div style={{ fontFamily: EXO, fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>
                      {s.href
                        ? <Link href={s.href} style={{ color: '#fff', textDecoration: 'underline', textDecorationColor: 'var(--green)', textUnderlineOffset: 3 }}>{s.name}</Link>
                        : s.name}
                      {s.note && <span style={{ fontFamily: 'inherit', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginLeft: 8 }}>{s.note}</span>}
                    </div>
                    {s.desc && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{s.desc}</div>}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {(reference.notes || []).map(function (n, i) { return <p key={i} style={{ margin: '0 0 6px' }}>{n}</p>; })}
        {reference.source && (
          <p style={{ margin: '0 0 6px' }}>
            Source: <a href={reference.source.href} rel="noopener" style={{ color: 'var(--green)' }}>{reference.source.label}</a>
          </p>
        )}
        {reference.sources && reference.sources.length > 0 && (
          <p style={{ margin: '0 0 6px' }}>
            {'Sources: '}
            {reference.sources.map(function (s, i) {
              // A source with no URL (e.g. official in-game graphics observed by the owner) renders as text.
              return (
                <span key={s.href || s.label}>
                  {i > 0 ? '; ' : ''}
                  {s.href ? <a href={s.href} rel="noopener" style={{ color: 'var(--green)' }}>{s.label}</a> : s.label}
                </span>
              );
            })}
          </p>
        )}
        {reference.followUp && <p style={{ margin: 0 }}>{reference.followUp}</p>}
      </div>
    </section>
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
      description: section.description || ('DMZ ' + section.label + ' on the Cybernetic Punks network.'),
      url: base + '/dmz/' + section.slug,
      isPartOf: { '@type': 'WebSite', name: 'Cybernetic Punks', url: base },
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
        return <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(s) }} />;
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
  // A data section with a STANDALONE reference block (printer) renders that block instead of the shell.
  if (section.source !== 'editor' && !isStandaloneReference(section)) {
    return (
      <>
        <DmzSectionSchema section={section} articles={[]} />
        <DmzComingSoon section={section} />
      </>
    );
  }

  // Editor-fed section: the eligible DMZ articles that RESOLVE to THIS section via the shared
  // resolver (feed_items has no section column). One resolver covers curated slugs
  // (DMZ_ARTICLE_SECTION), the Discourse TAG (generated slugs), and the defaultArticleSection
  // fallback -- the SAME one the detail route and sitemap use, so list == routable set.
  // LOUD FAILURE: a real read error THROWS (-> Next default 500) instead of the old swallow-to-empty,
  // which rendered an empty section at 200 while its metadata (sectionHasContent) reported it
  // indexable. A genuine zero-row result still falls through to the empty state (unchanged).
  var articles = section.source === 'editor' ? await loadSectionArticles(DMZ_GAME_SLUG, section.slug, { limit: 30 }) : [];
  var ref = section.reference || null;

  // A STANDALONE reference section is real content on its own (lib/dmz/sections.js), so it renders even
  // with zero articles of its own; every other editor section keeps the empty state (FOB unchanged).
  if (articles.length === 0 && !isStandaloneReference(section)) {
    return (
      <>
        <DmzSectionSchema section={section} articles={[]} />
        <DmzEmptyState section={section} />
      </>
    );
  }

  // Optional featured article that lives in ANOTHER section (reference.featuredArticle; printer -> the
  // crafting article under /dmz/loadouts). Read through the same eligible-article resolver, so it shows
  // only while that article is published and routable there.
  var featured = null;
  if (ref && ref.featuredArticle) {
    var fa = ref.featuredArticle;
    var pool = await loadSectionArticles(DMZ_GAME_SLUG, fa.section, { limit: 30 });
    var hit = pool.find(function (a) { return a.slug === fa.slug; });
    if (hit && !articles.some(function (a) { return a.slug === hit.slug; })) featured = { section: { slug: fa.section }, article: hit };
  }

  var refImage = ref && ref.image && ref.image.srcBase ? ref.image : null;

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

      {/* Section image (config: section.reference.image) above the H1, wider than the text column
          on large screens (capped, centered; never wider than the viewport minus gutters). */}
      {refImage && (
        <div style={{ position: 'relative', left: '50%', transform: 'translateX(-50%)', width: 'min(calc(100vw - 32px), 1040px)', margin: '0 0 26px' }}>
          <SectionImage image={refImage} sizes="(max-width: 1072px) calc(100vw - 32px), 1040px" />
        </div>
      )}

      {/* Section header */}
      <h1 style={{ fontFamily: EXO, fontSize: 32, fontWeight: 800, letterSpacing: 0.3, color: '#fff', margin: '0 0 10px', lineHeight: 1.2 }}>
        {section.label}
      </h1>
      {section.description && (
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: section.crossLinks && section.crossLinks.length ? '0 0 10px' : '0 0 28px', maxWidth: '60ch', lineHeight: 1.6 }}>
          {section.description}
        </p>
      )}
      {/* Optional related-page links (config: section.crossLinks; Hajin Regions -> the location hub). */}
      {section.crossLinks && section.crossLinks.length > 0 && (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '0 0 28px', lineHeight: 1.6 }}>
          {'See also: '}
          {section.crossLinks.map(function (l, i) {
            return (
              <span key={l.href}>
                {i > 0 ? ' | ' : ''}
                <Link href={l.href} style={{ color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{l.label}</Link>
              </span>
            );
          })}
        </p>
      )}

      {ref && ref.groups && <SectionReference reference={ref} />}
      {ref && (
        <h2 style={{ fontFamily: EXO, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 14px' }}>
          {section.label} coverage
        </h2>
      )}

      {/* Article cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {articles.map(function (a) {
          return <ArticleCard key={a.id} section={section} article={a} />;
        })}
        {featured && <ArticleCard key={featured.article.id} section={featured.section} article={featured.article} />}
      </div>
    </main>
  );
}
