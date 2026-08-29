// app/wardogs/[section]/[slug]/page.js
// Wardogs article-detail route (Stage 6 Track 2) -- the MINIMAL mirror of
// app/dmz/[section]/[slug]/page.js. Core only: fetch by slug + game_slug='wardogs' +
// is_published=true, section-validate via wardogsSectionForArticle (404 on mismatch),
// canonical /wardogs/<section>/<slug>, robots INHERITED from app/wardogs/layout.js's
// wardogs.indexable gate (no own robots key), body via the game-neutral lib/dmz/articleContent
// renderer. Deliberately OMITS the DMZ-specific enrichments Wardogs has no data for: discourse,
// POI linkify, the system cross-linker, and share/notify components. WARDOGS_ARTICLE_SEO does
// not exist -> title/description fall back to the headline + auto-truncated meta.
//
// The 6 pre-launch pieces are DRAFTS (is_published=false), so this renders nothing for them
// until they are published (Track-2 flip). It is wired now so the render path exists.
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { Exo_2 } from 'next/font/google';
import { getGameSection } from '@/lib/games';
import { wardogsSectionForArticle } from '@/lib/games/wardogs';
import { getEditorDisplay, editorByline, editorInitial } from '@/lib/editors/roster';
import { formatPublishDate, toISOWithPTOffset } from '@/lib/formatDate';
import { parseBody, stripMarkers, extractKeyFacts, readTime } from '@/lib/dmz/articleContent';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

var WARDOGS_GAME_SLUG = 'wardogs';
var CANONICAL_BASE = 'https://cyberneticpunks.com';

async function fetchArticle(slug) {
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('id, headline, body, editor, tags, slug, created_at, source, source_url, game_slug, thumbnail')
      .eq('slug', slug)
      .eq('game_slug', WARDOGS_GAME_SLUG)
      .eq('is_published', true)
      .maybeSingle();
    return data || null;
  } catch (err) {
    return null; // treat as missing -> 404
  }
}

function metaDescription(body, fallback) {
  if (!body) return fallback;
  var text = stripMarkers(body.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')).replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  if (text.length <= 155) return text;
  var cut = text.slice(0, 155);
  var sp = cut.lastIndexOf(' ');
  if (sp > 0) cut = cut.slice(0, sp);
  return cut.replace(/\s+$/, '') + '...';
}

export async function generateMetadata({ params }) {
  var p = await params;
  var section = getGameSection('wardogs', p.section);
  var article = await fetchArticle(p.slug);
  if (!section || !article || wardogsSectionForArticle(article) !== section.slug) {
    return { title: 'Wardogs — Not Found' };
  }
  var title = article.headline;
  var description = metaDescription(article.body, article.headline);
  var canonical = CANONICAL_BASE + '/wardogs/' + section.slug + '/' + article.slug;
  // NO robots key -> inherits app/wardogs/layout.js's robots gate (wardogs.indexable).
  return {
    title: { absolute: title },
    description: description,
    alternates: { canonical: canonical },
    openGraph: { title: title, description: description, url: canonical, siteName: 'CyberneticPunks', type: 'article' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: title, description: description },
  };
}

export default async function WardogsArticlePage({ params }) {
  var p = await params;
  var section = getGameSection('wardogs', p.section);
  if (!section) notFound();

  var article = await fetchArticle(p.slug);
  if (!article) notFound();
  if (wardogsSectionForArticle(article) !== section.slug) notFound();

  var display = getEditorDisplay(article.editor);
  var editorColor = display ? display.color : '#e0a13a';
  var byline = editorByline(article.editor) || article.editor;
  var role = display ? display.role : '';
  var initial = editorInitial(article.editor);
  var pubDate = formatPublishDate(article.created_at);
  var rt = readTime(article.body);
  var tags = Array.isArray(article.tags) ? article.tags : [];
  var keyFacts = extractKeyFacts(article.body);
  var description = metaDescription(article.body, article.headline);
  var canonical = CANONICAL_BASE + '/wardogs/' + section.slug + '/' + article.slug;

  var jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: article.headline,
    description: description,
    author: { '@type': 'Organization', name: article.editor + ' — CyberneticPunks', url: 'https://cyberneticpunks.com/marathon/intel/' + (article.editor || '').toLowerCase() },
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com', logo: { '@type': 'ImageObject', url: 'https://cyberneticpunks.com/cnp-512.png' } },
    datePublished: toISOWithPTOffset(article.created_at), dateModified: toISOWithPTOffset(article.created_at),
    url: canonical, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    keywords: tags.length ? tags.join(', ') : 'Wardogs, Bulkhead',
  };
  // image: an ImageObject (matching intel/pubg). Every article has one -- the real thumbnail when
  // present, else the article's OWN dynamic OG card (1200x630, Wardogs amber, CNP-text-branded,
  // IP-safe) at the stable canonical OG URL. canonical is CANONICAL_BASE-absolute.
  jsonLd.image = { '@type': 'ImageObject', url: article.thumbnail || (canonical + '/opengraph-image') };

  return (
    <main className={exo2.variable} style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 96px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Network', item: 'https://cyberneticpunks.com/' },
          { '@type': 'ListItem', position: 2, name: 'Wardogs', item: 'https://cyberneticpunks.com/wardogs' },
          { '@type': 'ListItem', position: 3, name: section.label, item: 'https://cyberneticpunks.com/wardogs/' + section.slug },
        ],
      }) }} />

      {/* Breadcrumb: Network / Wardogs / section */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href="/wardogs" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Wardogs</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href={'/wardogs/' + section.slug} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{section.label}</Link>
      </nav>

      {/* Wardogs tag pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: EXO, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#08090c', background: '#e0a13a', padding: '4px 9px', borderRadius: 3 }}>Wardogs</span>
        <span style={{ fontSize: 11, letterSpacing: 1, fontFamily: 'monospace', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{section.label}</span>
      </div>

      {/* Headline */}
      <h1 style={{ fontFamily: EXO, fontSize: 34, lineHeight: 1.15, fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)' }}>{article.headline}</h1>

      {/* Byline row: editor / date / read time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: editorColor, color: '#08090c', fontFamily: EXO, fontWeight: 800, fontSize: 12 }}>{initial}</span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{byline}</span>
        {role ? <span style={{ color: 'var(--text-tertiary)' }}>{role}</span> : null}
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.5 }}>/</span>
        <span>{pubDate}</span>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.5 }}>/</span>
        <span>{rt}</span>
      </div>

      {/* Key facts (optional, from the body) */}
      {keyFacts && keyFacts.length > 0 ? (
        <ul style={{ margin: '0 0 28px', padding: '16px 18px', listStyle: 'none', background: 'var(--bg-card, #12140f)', border: '1px solid var(--border, #2c2a22)', borderRadius: 6 }}>
          {keyFacts.map(function (fact, i) {
            return <li key={i} style={{ position: 'relative', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55, margin: i === 0 ? 0 : '8px 0 0', paddingLeft: 18 }}><span style={{ position: 'absolute', left: 0, color: '#e0a13a' }}>-</span>{stripMarkers(fact)}</li>;
          })}
        </ul>
      ) : null}

      {/* Body */}
      <article style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text-primary)' }}>
        {parseBody(article.body).map(function (blk) {
          if (blk.type === 'h2') return <h2 key={blk.key} style={{ fontFamily: EXO, fontSize: 20, fontWeight: 700, margin: '30px 0 10px', color: 'var(--text-primary)' }}>{stripMarkers(blk.text)}</h2>;
          if (blk.type === 'ul') return <ul key={blk.key} style={{ margin: '0 0 16px', paddingLeft: 22 }}>{blk.items.map(function (it, i) { return <li key={i} style={{ margin: '4px 0' }}>{stripMarkers(it)}</li>; })}</ul>;
          if (blk.type === 'quote') return <blockquote key={blk.key} style={{ margin: '0 0 16px', paddingLeft: 14, borderLeft: '3px solid #e0a13a', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{stripMarkers(blk.text)}</blockquote>;
          return <p key={blk.key} style={{ margin: '0 0 16px' }}>{stripMarkers(blk.text)}</p>;
        })}
      </article>

      {/* Tags */}
      {tags.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 32 }}>
          {tags.map(function (t) {
            return <span key={t} style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-tertiary)', border: '1px solid var(--border, #2c2a22)', padding: '3px 8px', borderRadius: 3 }}>{t}</span>;
          })}
        </div>
      ) : null}

      {/* Source citation (real URL or plain label when honest-null) */}
      {article.source ? (
        <div style={{ marginTop: 28, fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
          Source: {article.source_url ? <a href={article.source_url} target="_blank" rel="noopener noreferrer" style={{ color: '#e0a13a' }}>{article.source}</a> : <span>{article.source}</span>}
        </div>
      ) : null}
    </main>
  );
}
