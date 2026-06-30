// app/dmz/[section]/[slug]/page.js
// Minimal DMZ article detail page -- the route the section page links to
// (/dmz/[section]/[slug]) but that did not exist yet (investigation: links 404'd).
//
// Renders ONE game_slug='dmz' feed_items row: headline, editor byline (via the
// canonical roster), body, tags, publish date. The Marathon /intel/[slug]
// renderer is intentionally NOT reused -- it injects inline shell/weapon stat
// cards (needs an allItems set) and assumes Marathon editorial data, which would
// re-couple DMZ to Marathon. This page has its OWN minimal renderer that handles
// only what the DMZ news articles use: **bold headers**, "- " bullet lists, and
// paragraphs with inline **bold**. Richer rendering (pull-quotes, entity chips,
// comments, related-article rails) can come later, once DMZ has its own
// editorial infrastructure -- keep this lean for now.
//
// SECTION param is cosmetic: DMZ articles are not section-scoped in the DB (the
// section page reads all game_slug='dmz' rows), so [section] only drives the
// breadcrumb/back-link. An unknown section slug 404s; a missing/unpublished
// article 404s. Neither crashes.
//
// NOINDEX: this route lives under app/dmz/layout.js, which sets
// robots: { index:false, follow:true } while !dmz.launched. This page sets NO
// robots of its own, so it INHERITS that gate (same mechanism the section page
// relies on) -- a pre-launch DMZ article is noindex. When dmz.launched flips
// true, the layout's robots clears and these become indexable in one move.
//
// Supabase read uses the lazy anon Proxy (no module-scope createClient), same as
// the section page. force-dynamic: queried at request time.

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getGameSection } from '@/lib/games/registry';
import { getEditorDisplay, editorByline } from '@/lib/editors/roster';
import { formatPublishDate } from '@/lib/formatDate';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

var DMZ_GAME_SLUG = 'dmz';

async function fetchArticle(slug) {
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('id, headline, body, editor, tags, slug, created_at, source_url')
      .eq('slug', slug)
      .eq('game_slug', DMZ_GAME_SLUG)
      .eq('is_published', true)
      .maybeSingle();
    return data || null;
  } catch (err) {
    // non-fatal: treat as missing -> 404 in the page
    return null;
  }
}

// Plain meta description: strip ** markers, flatten, truncate at a word boundary.
function metaDescription(body, fallback) {
  if (!body) return fallback;
  var text = body.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  if (text.length <= 155) return text;
  var cut = text.slice(0, 155);
  var sp = cut.lastIndexOf(' ');
  if (sp > 0) cut = cut.slice(0, sp);
  return cut.replace(/\s+$/, '') + '…';
}

export async function generateMetadata({ params }) {
  var p = await params;
  var section = getGameSection('dmz', p.section);
  var article = await fetchArticle(p.slug);
  if (!section || !article) return { title: 'DMZ — Not Found' };
  // NO robots key here on purpose -> inherits app/dmz/layout.js noindex,follow
  // while !dmz.launched.
  return {
    title: article.headline + ' — DMZ',
    description: metaDescription(article.body, article.headline),
    alternates: { canonical: 'https://cyberneticpunks.com/dmz/' + section.slug + '/' + article.slug },
  };
}

// Inline **bold** -> <strong>; everything else stays plain text.
function InlineBold({ text }) {
  var parts = text.split(/(\*\*[^*]+\*\*)/);
  return (
    <>
      {parts.map(function(part, i) {
        var m = part.match(/^\*\*([^*]+)\*\*$/);
        if (m) return <strong key={i} style={{ color: '#fff', fontWeight: 700 }}>{m[1]}</strong>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// Minimal block renderer for the DMZ news shape: blank-line-separated blocks ->
// **bold-only line** = header, all-"- " lines = bullet list, otherwise paragraph.
function ArticleBody({ body, accent }) {
  var blocks = (body || '').split(/\n{2,}/);
  return (
    <div>
      {blocks.map(function(raw, bi) {
        var block = raw.replace(/^\s+|\s+$/g, '');
        if (!block) return null;

        var headerMatch = block.match(/^\*\*\s*([^*]+?)\s*\*\*$/);
        if (headerMatch) {
          return (
            <div key={bi} style={{ margin: '32px 0 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 3, height: 16, background: accent, borderRadius: 1, flexShrink: 0 }} />
              <h2 style={{
                fontSize: 12, fontWeight: 800, color: accent, margin: 0, letterSpacing: 3,
                textTransform: 'uppercase', fontFamily: 'Orbitron, monospace',
              }}>
                {headerMatch[1]}
              </h2>
              <div style={{ flex: 1, height: 1, background: accent + '33' }} />
            </div>
          );
        }

        var lines = block.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
        var allBullets = lines.length > 0 && lines.every(function(l) { return /^[-*]\s+/.test(l); });
        if (allBullets) {
          return (
            <ul key={bi} style={{ margin: '0 0 1.5em', paddingLeft: 22, listStyle: 'none' }}>
              {lines.map(function(l, li) {
                var content = l.replace(/^[-*]\s+/, '');
                return (
                  <li key={li} style={{
                    position: 'relative', fontSize: 15, color: 'var(--text-secondary)',
                    lineHeight: 1.6, margin: '0 0 0.7em', paddingLeft: 4,
                  }}>
                    <span style={{ position: 'absolute', left: -18, color: accent, fontWeight: 700 }}>-</span>
                    <InlineBold text={content} />
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <p key={bi} style={{
            fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.6,
            margin: '0 0 1.4em', maxWidth: '66ch',
          }}>
            <InlineBold text={lines.join(' ')} />
          </p>
        );
      })}
    </div>
  );
}

export default async function DmzArticlePage({ params }) {
  var p = await params;
  var section = getGameSection('dmz', p.section);
  if (!section) notFound();

  var article = await fetchArticle(p.slug);
  if (!article) notFound();

  var display = getEditorDisplay(article.editor);
  var editorColor = display ? display.color : '#888';
  var editorSymbol = display ? display.symbol : '#';
  var byline = editorByline(article.editor) || article.editor;
  var role = display ? display.role : '';
  var pubDate = formatPublishDate(article.created_at);
  var tags = Array.isArray(article.tags) ? article.tags : [];

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 16px 96px' }}>
      {/* Breadcrumb */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
        fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700,
      }}>
        <Link href="/dmz" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>DMZ</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href={'/dmz/' + section.slug} style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>
          {section.label}
        </Link>
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'Orbitron, monospace', fontSize: 30, fontWeight: 800,
        letterSpacing: 0.5, color: '#fff', margin: '0 0 18px', lineHeight: 1.25,
      }}>
        {article.headline}
      </h1>

      {/* Byline */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8,
        paddingBottom: 20, borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: 'var(--bg-card)', border: '1px solid ' + editorColor + '55',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: editorColor, fontSize: 18,
        }}>
          {editorSymbol}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>
            {byline}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', marginTop: 2 }}>
            {role}{role && pubDate ? ' · ' : ''}{pubDate}
          </div>
        </div>
      </div>

      {/* Body */}
      <article style={{ marginTop: 24 }}>
        <ArticleBody body={article.body} accent={'var(--green)'} />
      </article>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 28 }}>
          {tags.map(function(t) {
            return (
              <span key={t} style={{
                fontSize: 8, color: 'var(--text-tertiary)', border: '1px solid var(--border)',
                background: 'var(--bg-card)', borderRadius: 2, padding: '3px 8px',
                letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase',
              }}>
                {t}
              </span>
            );
          })}
        </div>
      )}

      {/* Source attribution (also stated in-body; this is the explicit link) */}
      {article.source_url && (
        <div style={{ marginTop: 28, fontSize: 12, color: 'var(--text-tertiary)' }}>
          Source:{' '}
          <a href={article.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)' }}>
            official Call of Duty blog
          </a>
        </div>
      )}

      {/* Back link */}
      <div style={{ marginTop: 40 }}>
        <Link href={'/dmz/' + section.slug} style={{
          fontSize: 11, color: 'var(--text-tertiary)', textDecoration: 'none',
          letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700,
        }}>
          &lt;- Back to {section.label}
        </Link>
      </div>
    </main>
  );
}
