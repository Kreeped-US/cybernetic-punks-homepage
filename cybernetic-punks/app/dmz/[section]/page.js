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

export async function generateMetadata({ params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection('dmz', sectionSlug);
  if (!section) return { title: 'DMZ — Not Found' };
  return {
    title: section.label + ' — DMZ',
    description: section.description || ('DMZ ' + section.label + ' on the CyberneticPunks game network.'),
    alternates: { canonical: 'https://cyberneticpunks.com/dmz/' + section.slug },
  };
}

function ArticleCard({ section, article }) {
  var snippet = extractSnippet(article.body, 170);
  var date = formatPublishDate(article.created_at);
  var rt = readTime(article.body);
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
        }}>News</span>
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
        Sourced from the official Call of Duty blog
      </span>
    </Link>
  );
}

export default async function DmzSectionPage({ params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection('dmz', sectionSlug);
  if (!section) notFound();

  // Data-fed section: structured-data tool, no feed_items query.
  if (section.source !== 'editor') {
    return <DmzComingSoon section={section} />;
  }

  // Editor-fed section: read DMZ articles scoped to THIS section (DMZ_ARTICLE_SECTION
  // in lib/games/dmz.js, since feed_items has no section column). No assigned slugs
  // -> empty state (no query).
  var sectionSlugs = dmzArticleSlugsForSection(section.slug);
  var articles = [];
  if (sectionSlugs.length > 0) {
    try {
      var { data } = await supabase
        .from('feed_items')
        .select('id, headline, slug, editor, tags, body, source_url, created_at')
        .eq('is_published', true)
        .eq('game_slug', DMZ_GAME_SLUG)
        .in('slug', sectionSlugs)
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) articles = data;
    } catch (err) {
      // non-fatal: fall through to empty-state
    }
  }

  if (articles.length === 0) {
    return <DmzEmptyState section={section} />;
  }

  return (
    <main className={exo2.variable} style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 96px' }}>
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
