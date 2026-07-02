// app/dmz/[section]/[slug]/page.js
// DMZ article detail -- the shareable article template (applies to every DMZ
// article: the existing 3 + future). Replaces the earlier minimal renderer.
//
// The Marathon /intel/[slug] renderer is intentionally NOT reused -- it injects
// inline shell/weapon stat cards and assumes Marathon editorial data, which would
// re-couple DMZ to Marathon. This page has its OWN renderer (parseBody +
// extractKeyFacts in lib/dmz/articleContent.js) for the DMZ news body shape:
// **bold headers** -> real <h2>, "- " lists -> bullets, standalone "quoted" lines
// -> pull-quotes, paragraphs with inline **bold**.
//
// FONT: display type is Exo 2 (the brand's OG/icon face), loaded here via
// next/font/google scoped to this page (className on <main> exposes --font-exo2).
// Body copy inherits the site default. (Other DMZ pages still use Orbitron -- that
// font reconciliation is separate, already-flagged future work; not touched here.)
//
// SECTION param is GENUINE: each DMZ article is assigned to one section via
// DMZ_ARTICLE_SECTION (lib/games/dmz.js). 404s on unknown section, missing/
// unpublished article, or a section/article mismatch. Nothing crashes.
//
// ROBOTS: gated in app/dmz/layout.js on dmz.indexable (index vs noindex,follow).
// This page sets NO robots of its own, so it INHERITS that gate.
//
// Supabase read via the lazy anon Proxy (no module-scope createClient).
// force-dynamic: queried at request time.

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Exo_2 } from 'next/font/google';
import { getGameSection } from '@/lib/games/registry';
import { DMZ_ARTICLE_SECTION, DMZ_ARTICLE_SEO } from '@/lib/games/dmz';
import { getEditorDisplay, editorByline, editorInitial } from '@/lib/editors/roster';
import { formatPublishDate, toISOWithPTOffset } from '@/lib/formatDate';
import { parseBody, extractKeyFacts, stripMarkers } from '@/lib/dmz/articleContent';
import DmzShare from '../../DmzShare';
import DmzNotifyStrip from '@/components/dmz/DmzNotifyStrip';
import ViewTracker from '@/components/ViewTracker';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Exo 2 for display type, scoped to this page (variable exposed on <main>).
const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

var DMZ_GAME_SLUG = 'dmz';
var CANONICAL_BASE = 'https://cyberneticpunks.com';

async function fetchArticle(slug) {
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('id, headline, body, editor, tags, slug, created_at, source, source_url')
      .eq('slug', slug)
      .eq('game_slug', DMZ_GAME_SLUG)
      .eq('is_published', true)
      .maybeSingle();
    return data || null;
  } catch (err) {
    return null; // treat as missing -> 404
  }
}

function readTime(body) {
  if (!body) return '1 min read';
  var words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200)) + ' min read';
}

function metaDescription(body, fallback) {
  if (!body) return fallback;
  var text = stripMarkers(body).replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  if (text.length <= 155) return text;
  var cut = text.slice(0, 155);
  var sp = cut.lastIndexOf(' ');
  if (sp > 0) cut = cut.slice(0, sp);
  return cut.replace(/\s+$/, '') + '...';
}

export async function generateMetadata({ params }) {
  var p = await params;
  var section = getGameSection('dmz', p.section);
  var article = await fetchArticle(p.slug);
  if (!section || !article || DMZ_ARTICLE_SECTION[article.slug] !== section.slug) {
    return { title: 'DMZ — Not Found' };
  }
  // Authored SEO overrides (lib/games/dmz.js) preferred; fall back to the
  // headline title + auto-truncated meta for any unmapped slug. The "-- DMZ"
  // suffix is dropped (headlines already lead with "DMZ"); the root
  // title.template appends " | CyberneticPunks".
  var seo = DMZ_ARTICLE_SEO[article.slug] || null;
  var title = seo && seo.title ? seo.title : article.headline;
  var description = seo && seo.description ? seo.description : metaDescription(article.body, article.headline);
  var canonical = CANONICAL_BASE + '/dmz/' + section.slug + '/' + article.slug;
  // NO robots key -> inherits the dmz layout's robots gate (dmz.indexable).
  // openGraph/twitter override the Marathon-branded root defaults so shared DMZ
  // links carry the article's own title/description; the per-article DMZ OG image
  // comes from the sibling opengraph-image.js (Next wires og:image automatically).
  return {
    title: title,
    description: description,
    alternates: { canonical: canonical },
    openGraph: {
      title: title,
      description: description,
      url: canonical,
      siteName: 'CyberneticPunks',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: title,
      description: description,
    },
  };
}

// Inline **bold** -> <strong>.
function InlineBold({ text }) {
  var parts = text.split(/(\*\*[^*]+\*\*)/);
  return (
    <>
      {parts.map(function (part, i) {
        var m = part.match(/^\*\*([^*]+)\*\*$/);
        if (m) return <strong key={i} style={{ color: '#fff', fontWeight: 700 }}>{m[1]}</strong>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// Render the parsed body blocks: real h2 / bullet list / pull-quote / paragraph.
function ArticleBody({ body }) {
  var blocks = parseBody(body);
  return (
    <div>
      {blocks.map(function (b) {
        if (b.type === 'h2') {
          return (
            <div key={b.key} style={{ margin: '38px 0 14px' }}>
              <h2 style={{ fontFamily: EXO, fontSize: 21, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.3, letterSpacing: 0.2 }}>
                {b.text}
              </h2>
              <div style={{ width: 38, height: 2, background: 'var(--green)', marginTop: 9, borderRadius: 1 }} />
            </div>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={b.key} style={{ margin: '0 0 1.6em', padding: 0, listStyle: 'none' }}>
              {b.items.map(function (item, li) {
                return (
                  <li key={li} style={{ position: 'relative', fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.65, margin: '0 0 0.8em', paddingLeft: 22 }}>
                    <span aria-hidden="true" style={{ position: 'absolute', left: 2, top: 1, color: 'var(--green)', fontWeight: 800 }}>›</span>
                    <InlineBold text={item} />
                  </li>
                );
              })}
            </ul>
          );
        }
        if (b.type === 'quote') {
          return (
            <blockquote key={b.key} style={{
              margin: '26px 0', padding: '6px 0 6px 22px', borderLeft: '3px solid var(--green)',
              fontFamily: EXO, fontSize: 21, fontWeight: 600, lineHeight: 1.45, color: '#fff', fontStyle: 'normal',
            }}>
              <span style={{ color: 'var(--green)', marginRight: 3 }}>&ldquo;</span>{b.text}<span style={{ color: 'var(--green)', marginLeft: 2 }}>&rdquo;</span>
            </blockquote>
          );
        }
        return (
          <p key={b.key} style={{ fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.7, margin: '0 0 1.4em', maxWidth: '68ch' }}>
            <InlineBold text={b.text} />
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
  if (DMZ_ARTICLE_SECTION[article.slug] !== section.slug) notFound();

  // Launch-email strip: read the dismissal cookie server-side so a dismissed strip
  // is never rendered (no hydration flash / flicker-in-then-out).
  var cookieStore = await cookies();
  var notifyCookie = cookieStore.get('dmz_notify_dismissed');
  var notifyDismissed = notifyCookie ? notifyCookie.value === '1' : false;

  var display = getEditorDisplay(article.editor);
  var editorColor = display ? display.color : '#888';
  var byline = editorByline(article.editor) || article.editor;
  var role = display ? display.role : '';
  var initial = editorInitial(article.editor);
  var pubDate = formatPublishDate(article.created_at);
  var rt = readTime(article.body);
  var tags = Array.isArray(article.tags) ? article.tags : [];

  // Authored SEO overrides (lib/games/dmz.js) preferred; fall back to the
  // render-time derivations for unmapped slugs. keyFacts null-hides as before.
  var seo = DMZ_ARTICLE_SEO[article.slug] || null;
  var keyFacts = (seo && Array.isArray(seo.keyFacts) && seo.keyFacts.length > 0)
    ? seo.keyFacts
    : extractKeyFacts(article.body);
  var description = seo && seo.description ? seo.description : metaDescription(article.body, article.headline);

  var canonical = CANONICAL_BASE + '/dmz/' + section.slug + '/' + article.slug;

  // NewsArticle JSON-LD -- mirrors the /intel Article shape (author + publisher +
  // datePublished helper + mainEntityOfPage), DMZ-branded, @type NewsArticle.
  // headline = DB headline (not the SEO title); author mirrors /intel exactly (the
  // editor codename byline is an intentional public byline). The DMZ article page
  // carries no other JSON-LD, so this is the only block.
  var jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: article.headline,
    description: description,
    author: { '@type': 'Organization', name: article.editor + ' — CyberneticPunks', url: 'https://cyberneticpunks.com/intel/' + (article.editor || '').toLowerCase() },
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
    datePublished: toISOWithPTOffset(article.created_at), dateModified: toISOWithPTOffset(article.created_at),
    url: canonical, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    keywords: article.tags ? article.tags.join(', ') : 'DMZ, Call of Duty',
  };

  return (
    <main className={exo2.variable} style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 96px' }}>
      <ViewTracker slug={article.slug} type="article" headline={article.headline} gameSlug="dmz" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* 1. Breadcrumb: Network / DMZ / section */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href="/dmz" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>DMZ</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href={'/dmz/' + section.slug} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>{section.label}</Link>
      </nav>

      {/* Launch-email capture strip (article surface). Server-gated by the dismissal
          cookie above -> not rendered at all once dismissed (no hydration flash). */}
      {!notifyDismissed && <DmzNotifyStrip />}

      {/* 2. DMZ tag pill + eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', fontFamily: EXO, fontSize: 10, fontWeight: 800,
          letterSpacing: 2, textTransform: 'uppercase', color: 'var(--green)',
          border: '1px solid var(--green)', borderRadius: 999, padding: '3px 11px',
        }}>DMZ</span>
        <span style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>
          {section.label} · news
        </span>
      </div>

      {/* 3. Headline (Exo 2) */}
      <h1 style={{ fontFamily: EXO, fontSize: 34, fontWeight: 800, letterSpacing: 0.2, color: '#fff', margin: '0 0 20px', lineHeight: 1.2 }}>
        {article.headline}
      </h1>

      {/* 4. Byline row: avatar + name + date/read-time + inline share */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: 'var(--bg-card)', border: '1px solid ' + editorColor + '66',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: editorColor, fontSize: 16, fontWeight: 800, fontFamily: EXO,
        }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontFamily: EXO, fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: 0.2 }}>{byline}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: 0.5, fontWeight: 600, marginTop: 2 }}>
            {[role, pubDate, rt].filter(Boolean).join('  ·  ')}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <DmzShare url={canonical} title={article.headline} mode="row" />
        </div>
      </div>

      {/* 5. Source-attribution bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap',
        margin: '18px 0 4px', padding: '10px 14px', borderRadius: 4,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        fontSize: 12, color: 'var(--text-secondary)',
      }}>
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
        <span>
          Sourced from{' '}
          {article.source_url ? (
            <a href={article.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)', textDecoration: 'none', fontWeight: 600 }}>
              the official Call of Duty blog
            </a>
          ) : (
            <span style={{ color: 'var(--text-primary)' }}>the official Call of Duty blog</span>
          )}
          {article.source ? ' · ' + article.source : ''}
        </span>
      </div>

      {/* 6. KEY FACTS callout (hidden entirely when extraction yields nothing usable) */}
      {keyFacts && (
        <div style={{ margin: '24px 0 10px', padding: '18px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--green)', borderRadius: 6 }}>
          <div style={{ fontFamily: EXO, fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--green)', marginBottom: 12 }}>
            Key facts
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {keyFacts.map(function (fact, i) {
              return (
                <li key={i} style={{ position: 'relative', fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55, margin: i === 0 ? 0 : '8px 0 0', paddingLeft: 20 }}>
                  <span aria-hidden="true" style={{ position: 'absolute', left: 0, top: 1, color: 'var(--green)', fontWeight: 800 }}>›</span>
                  {fact}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* 7. Body */}
      <article style={{ marginTop: 26 }}>
        <ArticleBody body={article.body} />
      </article>

      {/* 8. Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 30 }}>
          {tags.map(function (t) {
            return (
              <span key={t} style={{
                fontSize: 9, color: 'var(--text-tertiary)', border: '1px solid var(--border)',
                background: 'var(--bg-card)', borderRadius: 2, padding: '3px 9px',
                letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase',
              }}>{t}</span>
            );
          })}
        </div>
      )}

      {/* 9. Bottom share CTA */}
      <DmzShare url={canonical} title={article.headline} mode="cta" />

      {/* Back link */}
      <div style={{ marginTop: 28 }}>
        <Link href={'/dmz/' + section.slug} style={{ fontSize: 11, color: 'var(--text-tertiary)', textDecoration: 'none', letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>
          &lt;- Back to {section.label}
        </Link>
      </div>
    </main>
  );
}
