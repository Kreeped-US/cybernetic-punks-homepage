// components/game/GameArticle.js
// SHARED per-game ARTICLE-DETAIL render. Fetch by slug + game_slug + is_published, section-validate
// via the game's sectionForArticle (404 on mismatch), canonical /<game>/<section>/<slug>, robots
// INHERITED from the game layout's indexable gate (no own robots key), body via the game-neutral
// lib/dmz/articleContent renderer. Config + sectionForArticle are PASSED IN by the thin route file,
// so this module imports no game. First used by Bodycam; legacy games keep their own copies.

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getGameSection } from '@/lib/games';
import { getEditorDisplay, editorByline, editorInitial } from '@/lib/editors/roster';
import { formatPublishDate, toISOWithPTOffset } from '@/lib/formatDate';
import { parseBody, stripMarkers, extractKeyFacts, readTime } from '@/lib/dmz/articleContent';
import Link from 'next/link';

var CANONICAL_BASE = 'https://cyberneticpunks.com';
var FONT = 'Exo_2, system-ui, sans-serif';

async function fetchArticle(config, slug) {
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('id, headline, body, editor, tags, slug, created_at, source, source_url, game_slug, thumbnail')
      .eq('slug', slug).eq('game_slug', config.slug).eq('is_published', true)
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

// Metadata for an article route. Not-found -> a "<game> - Not Found" title (degrades cleanly, never
// an error). Call from the thin route file's generateMetadata.
export async function gameArticleMetadata(config, sectionForArticle, params) {
  var p = await params;
  var section = getGameSection(config.slug, p.section);
  var article = await fetchArticle(config, p.slug);
  if (!section || !article || sectionForArticle(article) !== section.slug) {
    return { title: config.displayName + ' - Not Found' };
  }
  var title = article.headline;
  var description = metaDescription(article.body, article.headline);
  var canonical = CANONICAL_BASE + config.basePath + '/' + section.slug + '/' + article.slug;
  return {
    title: { absolute: title },
    description: description,
    alternates: { canonical: canonical },
    openGraph: { title: title, description: description, url: canonical, siteName: 'Cybernetic Punks', type: 'article' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: title, description: description },
  };
}

// The article-detail page. config + sectionForArticle are passed by the thin route file.
export default async function GameArticle({ config, sectionForArticle, params }) {
  var p = await params;
  var section = getGameSection(config.slug, p.section);
  if (!section) notFound();

  var article = await fetchArticle(config, p.slug);
  if (!article) notFound();
  if (sectionForArticle(article) !== section.slug) notFound();

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
  var canonical = CANONICAL_BASE + config.basePath + '/' + section.slug + '/' + article.slug;

  var jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: article.headline, description: description,
    author: { '@type': 'Organization', name: article.editor + ' - Cybernetic Punks', url: 'https://cyberneticpunks.com/marathon/intel/' + (article.editor || '').toLowerCase() },
    publisher: { '@type': 'Organization', name: 'Cybernetic Punks', url: 'https://cyberneticpunks.com', logo: { '@type': 'ImageObject', url: 'https://cyberneticpunks.com/cnp-512.png' } },
    datePublished: toISOWithPTOffset(article.created_at), dateModified: toISOWithPTOffset(article.created_at),
    url: canonical, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    keywords: tags.length ? tags.join(', ') : config.displayName,
  };
  jsonLd.image = { '@type': 'ImageObject', url: article.thumbnail || (canonical + '/opengraph-image') };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 60px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Network', item: 'https://cyberneticpunks.com/' },
          { '@type': 'ListItem', position: 2, name: config.displayName, item: CANONICAL_BASE + config.basePath },
          { '@type': 'ListItem', position: 3, name: section.label, item: CANONICAL_BASE + config.basePath + '/' + section.slug },
        ],
      }) }} />

      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href={config.basePath} style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>{config.displayName}</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href={config.basePath + '/' + section.slug} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{section.label}</Link>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: FONT, fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#08090c', background: 'var(--accent)', padding: '4px 9px', borderRadius: 3 }}>{config.displayName}</span>
        <span style={{ fontSize: 11, letterSpacing: 1, fontFamily: 'monospace', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>{section.label}</span>
      </div>

      <h1 style={{ fontFamily: FONT, fontSize: 34, lineHeight: 1.15, fontWeight: 800, margin: '0 0 16px', color: 'var(--text-primary)' }}>{article.headline}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: editorColor, color: '#08090c', fontFamily: FONT, fontWeight: 800, fontSize: 12 }}>{initial}</span>
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
          if (blk.type === 'h2') return <h2 key={blk.key} style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, margin: '30px 0 10px', color: 'var(--text-primary)' }}>{stripMarkers(blk.text)}</h2>;
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
