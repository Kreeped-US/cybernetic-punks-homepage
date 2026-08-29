// app/pubg-dednet/[section]/[slug]/page.js
// PUBG: DED.NET article-detail route -- the coupled other half of the sitemap emission (Phase 1).
// Mirrors app/wardogs/[section]/[slug]/page.js: fetch by slug + game_slug='pubg-dednet' +
// is_published=true, section-validate via dednetSectionForArticle (404 on mismatch), canonical
// /pubg-dednet/<section>/<slug>, robots INHERITED from app/pubg-dednet/layout.js's indexable gate
// (no own robots key), body via the game-neutral lib/dmz/articleContent renderer.
//
// Phase 1 ships zero articles (DEDNET_ARTICLE_SECTION is empty), so this renders nothing until
// content publishes (Phase 2). It is wired now so the render path exists + the sitemap has its
// coupled route.
import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getGameSection } from '@/lib/games';
import { dednetSectionForArticle } from '@/lib/games/pubg-dednet';
import { getEditorDisplay, editorByline, editorInitial } from '@/lib/editors/roster';
import { formatPublishDate, toISOWithPTOffset } from '@/lib/formatDate';
import { parseBody, stripMarkers, extractKeyFacts, readTime } from '@/lib/dmz/articleContent';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

var DEDNET_GAME_SLUG = 'pubg-dednet';
var CANONICAL_BASE = 'https://cyberneticpunks.com';
var EXO = 'Exo_2, system-ui, sans-serif';

async function fetchArticle(slug) {
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('id, headline, body, editor, tags, slug, created_at, source, source_url, game_slug, thumbnail')
      .eq('slug', slug).eq('game_slug', DEDNET_GAME_SLUG).eq('is_published', true)
      .maybeSingle();
    return data || null;
  } catch (err) {
    return null;
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
  var section = getGameSection('pubg-dednet', p.section);
  var article = await fetchArticle(p.slug);
  if (!section || !article || dednetSectionForArticle(article) !== section.slug) {
    return { title: 'PUBG: DED.NET - Not Found' };
  }
  var title = article.headline;
  var description = metaDescription(article.body, article.headline);
  var canonical = CANONICAL_BASE + '/pubg-dednet/' + section.slug + '/' + article.slug;
  // NO robots key -> inherits app/pubg-dednet/layout.js's indexable gate.
  return {
    title: { absolute: title },
    description: description,
    alternates: { canonical: canonical },
    openGraph: { title: title, description: description, url: canonical, siteName: 'CyberneticPunks', type: 'article' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: title, description: description },
  };
}

export default async function PubgDednetArticlePage({ params }) {
  var p = await params;
  var section = getGameSection('pubg-dednet', p.section);
  if (!section) notFound();

  var article = await fetchArticle(p.slug);
  if (!article) notFound();
  if (dednetSectionForArticle(article) !== section.slug) notFound();

  var display = getEditorDisplay(article.editor);
  var editorColor = display ? display.color : 'var(--accent)';
  var byline = editorByline(article.editor) || article.editor;
  var role = display ? display.role : '';
  var initial = editorInitial(article.editor);
  var pubDate = formatPublishDate(article.created_at);
  var rt = readTime(article.body);
  var tags = Array.isArray(article.tags) ? article.tags : [];
  var keyFacts = extractKeyFacts(article.body);
  var description = metaDescription(article.body, article.headline);
  var canonical = CANONICAL_BASE + '/pubg-dednet/' + section.slug + '/' + article.slug;

  var jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: article.headline, description: description,
    author: { '@type': 'Organization', name: article.editor + ' - CyberneticPunks', url: 'https://cyberneticpunks.com/marathon/intel/' + (article.editor || '').toLowerCase() },
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com', logo: { '@type': 'ImageObject', url: 'https://cyberneticpunks.com/cnp-512.png' } },
    datePublished: toISOWithPTOffset(article.created_at), dateModified: toISOWithPTOffset(article.created_at),
    url: canonical, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    keywords: tags.length ? tags.join(', ') : 'PUBG: DED.NET, KRAFTON',
  };
  // image: an ImageObject (matching DiscourseArticle). Every article now has one -- the real
  // thumbnail when present, else the article's OWN dynamic OG card (1200x630, DED.NET blood-red,
  // CNP-text-branded, IP-safe) at the stable canonical OG URL. canonical is CANONICAL_BASE-absolute.
  jsonLd.image = { '@type': 'ImageObject', url: article.thumbnail || (canonical + '/opengraph-image') };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 60px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Network', item: 'https://cyberneticpunks.com/' },
          { '@type': 'ListItem', position: 2, name: 'PUBG: DED.NET', item: 'https://cyberneticpunks.com/pubg-dednet' },
          { '@type': 'ListItem', position: 3, name: section.label, item: 'https://cyberneticpunks.com/pubg-dednet/' + section.slug },
        ],
      }) }} />

      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href="/pubg-dednet" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>PUBG: DED.NET</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href={'/pubg-dednet/' + section.slug} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{section.label}</Link>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: EXO, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#0b0a0a', background: 'var(--accent)', padding: '4px 9px', borderRadius: 3 }}>PUBG: DED.NET</span>
        <span style={{ fontSize: 11, letterSpacing: 1, fontFamily: 'monospace', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{section.label}</span>
      </div>

      <h1 style={{ fontFamily: EXO, fontSize: 34, lineHeight: 1.15, fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)' }}>{article.headline}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: editorColor, color: '#0b0a0a', fontFamily: EXO, fontWeight: 800, fontSize: 12 }}>{initial}</span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{byline}</span>
        {role ? <span style={{ color: 'var(--text-tertiary)' }}>{role}</span> : null}
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.5 }}>/</span>
        <span>{pubDate}</span>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.5 }}>/</span>
        <span>{rt}</span>
      </div>

      {keyFacts && keyFacts.length > 0 ? (
        <ul style={{ margin: '0 0 28px', padding: '16px 18px', listStyle: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6 }}>
          {keyFacts.map(function (fact, i) {
            return <li key={i} style={{ position: 'relative', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55, margin: i === 0 ? 0 : '8px 0 0', paddingLeft: 18 }}><span style={{ position: 'absolute', left: 0, color: 'var(--accent)' }}>-</span>{stripMarkers(fact)}</li>;
          })}
        </ul>
      ) : null}

      <article style={{ fontSize: 16, lineHeight: 1.7, color: 'var(--text-primary)' }}>
        {parseBody(article.body).map(function (blk) {
          if (blk.type === 'h2') return <h2 key={blk.key} style={{ fontFamily: EXO, fontSize: 20, fontWeight: 700, margin: '30px 0 10px', color: 'var(--text-primary)' }}>{stripMarkers(blk.text)}</h2>;
          if (blk.type === 'ul') return <ul key={blk.key} style={{ margin: '0 0 16px', paddingLeft: 22 }}>{blk.items.map(function (it, i) { return <li key={i} style={{ margin: '4px 0' }}>{stripMarkers(it)}</li>; })}</ul>;
          if (blk.type === 'quote') return <blockquote key={blk.key} style={{ margin: '0 0 16px', paddingLeft: 14, borderLeft: '3px solid var(--accent)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>{stripMarkers(blk.text)}</blockquote>;
          return <p key={blk.key} style={{ margin: '0 0 16px' }}>{stripMarkers(blk.text)}</p>;
        })}
      </article>

      {tags.length > 0 ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 32 }}>
          {tags.map(function (tg) { return <span key={tg} style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-tertiary)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: 3 }}>{tg}</span>; })}
        </div>
      ) : null}

      {article.source ? (
        <div style={{ marginTop: 28, fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
          Source: {article.source_url ? <a href={article.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>{article.source}</a> : <span>{article.source}</span>}
        </div>
      ) : null}
    </main>
  );
}
