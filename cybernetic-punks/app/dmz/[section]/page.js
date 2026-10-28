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
import { getDmzEntity, fetchDmzRows } from '@/lib/dmz/entities';
import { poiAreaRows } from '@/lib/dmz/poiAreas';
import PoiAreaBlock from '@/components/dmz/PoiAreaBlock';
import DmzEmptyState from '../DmzEmptyState';
import DmzComingSoon from '../DmzComingSoon';
import Link from 'next/link';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { sourceLabel } from '@/lib/content/sourceLabel';
import { dmz } from '@/lib/games/dmz';
import { withGameSuffix, withGamePrefix } from '@/lib/games/gameLabel';
import CutCard from '@/components/game/CutCard';
import HubPageHeader, { HUB_PAGE_CSS } from '@/components/game/HubPageHeader';
import { HUB_KIT_CSS } from '@/components/game/hubKitCss';
import { DMZ_HUB_VARS } from '@/lib/dmz/hubTheme';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';
// Publisher named in the card's "Sourced from ..." line; the noun (blog / patch notes) comes from the
// article's source_url via lib/content/sourceLabel.js (Brief 198).
var SOURCE_PUBLISHER = 'Call of Duty';

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
  // Optional per-section metadata override (config: section.seo, or section.reference.seo for the reference
  // sections). Canonical and robots are never overridden here. Fallback title (Brief 204): plain
  // "<label> | DMZ", no em-dash.
  var seo = section.seo || (section.reference && section.reference.seo) || null;
  if (seo && seo.description) desc = seo.description;
  var ogTitle = seo && seo.title ? seo.title : section.label + ' | DMZ';
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
    keywords: ['DMZ', withGamePrefix(section.label, dmz.displayName), 'Modern Warfare 4 DMZ', 'MW4 DMZ', 'Call of Duty DMZ'],
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

// Brief 205: the section page is on the hub kit (components/game: CutCard, HubPageHeader, hubKitCss; DMZ values
// for the --hk-* properties from lib/dmz/hubTheme.js). DMZ-only layout rules for this page below. Card date and
// source lines are 13px --hk-soft #b4bcc6 on --hk-card #11151a (9.55:1) on every section, News included (Brief 204
// asked >= 5.6:1 there and >= 4.5:1 elsewhere). Section image (Brief 207): full container width, 21:9 cover crop
// (16:9 at <= 640px, the native ratio of the FOB image); object-position 50% 85% keeps the lower band in frame,
// where the FOB image has its subject (the flag and the operator span about 21% to 95% of its height).
var SECTION_CSS = `
.dmzs-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:14px}
.hk-cut.dmzs-card{display:flex;flex-direction:column;gap:10px;padding:20px 22px}
.dmzs-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dmzs-meta{font-size:13px;font-weight:600;letter-spacing:.02em;color:var(--hk-soft)}
.dmzs-h{font-size:20px;font-weight:800;line-height:1.25;color:var(--hk-text)}
.dmzs-snip{font-size:15px;line-height:1.6;color:#c9d0d8}
.dmzs-src{margin-top:auto;font-size:13px;color:var(--hk-soft)}
.dmzs-covh{margin:8px 0 14px;font:700 12px/1.3 monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--hk-soft)}
.dmzs-see{margin:14px 0 0;font-size:14px;line-height:1.6;color:var(--hk-soft)}
.dmzs-see a{color:var(--hk-accent-text);text-decoration:underline;text-underline-offset:2px}
.dmzs-crumb{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dmzs-crumb-sep{opacity:.6}
.dmzs-img{margin:0 0 32px}
.dmzs-img img{display:block;width:100%;height:auto;aspect-ratio:21/9;object-fit:cover;object-position:50% 85%;border-radius:4px;border:1px solid var(--hk-line)}
.dmzs-img figcaption{margin-top:6px;font-size:12px;letter-spacing:.3px;text-align:right;color:var(--hk-mute)}
@media (max-width:640px){.dmzs-img img{aspect-ratio:16/9}}
.hk-cut.dmzs-msg{max-width:720px;padding:40px 28px;text-align:center}
.dmzs-msg-h{margin:18px 0 8px;font-size:17px;font-weight:700;color:var(--hk-text)}
.dmzs-msg-p{margin:0 auto;max-width:460px;font-size:15px;line-height:1.6;color:var(--hk-soft)}
.hk .dmzs-back{display:inline-flex;align-items:center;min-height:44px;margin-top:20px;padding:0 16px;border:1px solid var(--hk-line);font:700 12px/1 monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--hk-soft);text-decoration:none}
`;

// The page wrapper: the kit's classes and custom properties, its CSS once, and the Exo 2 face (as on the hub).
function SectionShell({ children }) {
  return (
    <main className={'hk ' + exo2.variable} style={Object.assign({ fontFamily: EXO }, DMZ_HUB_VARS)}>
      <style dangerouslySetInnerHTML={{ __html: HUB_KIT_CSS + HUB_PAGE_CSS + SECTION_CSS }} />
      {children}
    </main>
  );
}

function ArticleCard({ section, article }) {
  var snippet = extractSnippet(article.body, 170);
  var date = formatPublishDate(article.created_at);
  var rt = readTime(article.body);
  var isDiscourse = Array.isArray(article.tags) && article.tags.indexOf('discourse') !== -1;
  return (
    <CutCard href={'/dmz/' + section.slug + '/' + article.slug} className="dmzs-card">
      <span className="dmzs-top">
        <span className="hk-tag">{isDiscourse ? 'Discourse' : 'News'}</span>
        <span className="dmzs-meta">
          {[date, rt].filter(Boolean).join('  ·  ')}
        </span>
      </span>
      <span className="dmzs-h">
        {article.headline}
      </span>
      {snippet && (
        <span className="dmzs-snip">{snippet}</span>
      )}
      <span className="dmzs-src">
        {isDiscourse ? 'Network desk' : 'Sourced from ' + sourceLabel(SOURCE_PUBLISHER, article.source_url)}
      </span>
    </CutCard>
  );
}

// Optional section image (config: section.reference.image). Responsive srcset over the pre-cut
// widths. Brief 207: it fills the page container's content box (.dmzs-img rules), cropped to 21:9 with
// object-fit cover (16:9 at <= 640px); width/height attributes plus the CSS aspect-ratio reserve the box
// (no layout shift). It sits just under the header, so it keeps fetchPriority high.
function SectionImage({ image, sizes }) {
  var srcSet = image.widths.map(function (w) { return image.srcBase + w + '.webp ' + w + 'w'; }).join(', ');
  var largest = image.widths[image.widths.length - 1];
  return (
    <figure className="dmzs-img">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.srcBase + largest + '.webp'} srcSet={srcSet} sizes={sizes} alt={image.alt}
        width={image.width} height={image.height} fetchPriority="high" decoding="async" />
      {image.credit && (
        <figcaption>{image.credit}</figcaption>
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
          <Link href={reference.cta.href} style={{ display: 'inline-block', fontFamily: EXO, fontSize: 14, fontWeight: 700, color: 'var(--green)', border: '1px solid var(--green)', borderRadius: 4, padding: '8px 14px', textDecoration: 'none' }}>
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
          <p style={{ margin: '0 0 6px', fontSize: 13 }}>
            Source: <a href={reference.source.href} rel="noopener" style={{ color: 'var(--green)' }}>{reference.source.label}</a>
          </p>
        )}
        {reference.sources && reference.sources.length > 0 && (
          <p style={{ margin: '0 0 6px', fontSize: 13 }}>
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
      name: withGameSuffix(section.label, dmz.displayName, ' - '),
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
      <SectionShell>
        <DmzSectionSchema section={section} articles={[]} />
        <HubPageHeader eyebrow={'DMZ · ' + section.label} title={section.label} />
        <div className="hk-pw">
          <DmzComingSoon section={section} />
        </div>
      </SectionShell>
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
      <SectionShell>
        <DmzSectionSchema section={section} articles={[]} />
        <HubPageHeader eyebrow={'DMZ · ' + section.label} title={section.label} />
        <div className="hk-pw">
          <DmzEmptyState section={section} />
        </div>
      </SectionShell>
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

  // Optional locations block (section.poiAreas; /dmz/regions). Read at request time; a read error
  // THROWS (loud 500), the same as the POI hub's own read.
  var areaCfg = section.poiAreas || null;
  var areaEntity = areaCfg ? getDmzEntity(areaCfg.entity) : null;
  var areaRows = areaEntity ? poiAreaRows(await fetchDmzRows(areaEntity)) : [];

  // Header count: the article cards this page lists (its own articles plus a featured one from another section),
  // shown only from 2 cards up; a section with 0 or 1 cards gets no count.
  var cardCount = articles.length + (featured ? 1 : 0);
  var headerStat = cardCount >= 2 ? { value: cardCount, label: 'reports' } : null;

  return (
    <SectionShell>
      <DmzSectionSchema section={section} articles={articles} />
      <HubPageHeader
        eyebrow={
          <nav aria-label="Breadcrumb" className="dmzs-crumb">
            <Link href="/">Network</Link>
            <span className="dmzs-crumb-sep">/</span>
            <Link href="/dmz">DMZ</Link>
            <span className="dmzs-crumb-sep">/</span>
            <span>{section.label}</span>
          </nav>
        }
        title={section.label}
        intro={section.description || null}
        stat={headerStat}
      >
        {/* Optional related-page links (config: section.crossLinks; Hajin Regions -> the location hub). */}
        {section.crossLinks && section.crossLinks.length > 0 && (
          <p className="dmzs-see">
            {'See also: '}
            {section.crossLinks.map(function (l, i) {
              return (
                <span key={l.href}>
                  {i > 0 ? ' | ' : ''}
                  <Link href={l.href}>{l.label}</Link>
                </span>
              );
            })}
          </p>
        )}
      </HubPageHeader>

      <div className="hk-pw">
        {/* Section image (config: section.reference.image): first in the page container, its full content width
            (the container is 1160px with 16px gutters, so at most 1128px). */}
        {refImage && <SectionImage image={refImage} sizes="(max-width: 1160px) calc(100vw - 32px), 1128px" />}
        {ref && ref.groups && <SectionReference reference={ref} />}
        {areaRows.length > 0 && <PoiAreaBlock cfg={areaCfg} entity={areaEntity} rows={areaRows} />}
        {(ref || areaRows.length > 0) && (
          <h2 className="dmzs-covh">
            {section.label} coverage
          </h2>
        )}

        {/* Article cards */}
        <div className="dmzs-cards">
          {articles.map(function (a) {
            return <ArticleCard key={a.id} section={section} article={a} />;
          })}
          {featured && <ArticleCard key={featured.article.id} section={featured.section} article={featured.article} />}
        </div>
      </div>
    </SectionShell>
  );
}
