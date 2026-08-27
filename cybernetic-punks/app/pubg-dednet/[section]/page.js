// app/pubg-dednet/[section]/page.js
// One dynamic route renders EVERY PUBG: DED.NET section from the sections-config (routes render
// FROM config, not hardcoded per-section pages). Unknown slugs 404. Mirrors app/wardogs/[section].
//   source 'editor' -> read feed_items WHERE game_slug='pubg-dednet', scoped to THIS section via
//                      DEDNET_ARTICLE_SECTION. Zero -> inline empty state.
//   source 'data'   -> inline coming-soon shell (its own entity tables come at/after beta).
// Phase 1 ships zero articles, so editor sections render the empty state today; the article-card
// path (-> /pubg-dednet/[section]/[slug]) is forward-ready for Phase 2.
//
// Queries Supabase -> force-dynamic.
// ROBOTS: the whole subtree is noindex while pubg-dednet.indexable is false (layout gate); this
// route's generateMetadata also noindexes an EMPTY section (belt-and-suspenders).

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getGameSection } from '@/lib/games';
import { dednetArticleSlugsForSection } from '@/lib/games/pubg-dednet';
import { sectionHasContent } from '@/lib/pubg-dednet/sections';
import { extractSnippet, readTime } from '@/lib/dmz/articleContent';
import { formatPublishDate } from '@/lib/formatDate';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
var DEDNET_GAME_SLUG = 'pubg-dednet';
var EXO = 'Exo_2, system-ui, sans-serif';

export async function generateMetadata({ params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection('pubg-dednet', sectionSlug);
  if (!section) return { title: 'PUBG: DED.NET - Not Found' };
  var desc = section.description || (section.label + ' for PUBG: DED.NET.');
  var url = 'https://cyberneticpunks.com/pubg-dednet/' + section.slug;
  var hasContent = await sectionHasContent(section);
  // Empty section -> keep OUT of the index (follow:true). Once it has content AND indexable is
  // true, omit robots here and inherit the layout gate.
  var robots = hasContent ? undefined : { index: false, follow: true };
  return {
    title: section.label + ' - PUBG: DED.NET',
    description: desc,
    robots: robots,
    alternates: { canonical: url },
  };
}

function ArticleCard({ section, article }) {
  var snippet = extractSnippet(article.body, 170);
  var date = formatPublishDate(article.created_at);
  var rt = readTime(article.body);
  return (
    <Link href={'/pubg-dednet/' + section.slug + '/' + article.slug} style={{ display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: EXO, fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '2px 9px' }}>News</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: 0.5, fontWeight: 600 }}>{[date, rt].filter(Boolean).join('  -  ')}</span>
      </div>
      <span style={{ fontFamily: EXO, fontSize: 19, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{article.headline}</span>
      {snippet && <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55 }}>{snippet}</span>}
      <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>Sourced from official KRAFTON / PUBG Studios material</span>
    </Link>
  );
}

function EmptyState({ section }) {
  var isData = section.source === 'data';
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 40px' }}>
      <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href="/pubg-dednet" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>PUBG: DED.NET</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{section.label}</span>
      </nav>
      <h1 style={{ fontFamily: EXO, fontSize: 30, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>{section.label}</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '60ch' }}>{section.description}</p>
      <div style={{ marginTop: 28, padding: '18px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
        {isData ? 'Verified data lands here once the closed beta opens - built against real in-game numbers, not pre-launch guesses.' : 'No reports published yet. Confirmed-systems coverage lands here as PUBG Studios details the game.'}
      </div>
    </main>
  );
}

export default async function PubgDednetSectionPage({ params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection('pubg-dednet', sectionSlug);
  if (!section) notFound();

  if (section.source !== 'editor') return <EmptyState section={section} />;

  var articles = [];
  try {
    var sectionSlugs = dednetArticleSlugsForSection(section.slug);
    if (sectionSlugs.length > 0) {
      var { data } = await supabase
        .from('feed_items')
        .select('id, headline, slug, editor, tags, body, source_url, created_at')
        .eq('is_published', true).eq('game_slug', DEDNET_GAME_SLUG)
        .in('slug', sectionSlugs).order('created_at', { ascending: false }).limit(30);
      if (data) articles = data;
    }
  } catch (err) { /* non-fatal -> empty state */ }

  if (articles.length === 0) return <EmptyState section={section} />;

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 40px' }}>
      <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href="/pubg-dednet" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>PUBG: DED.NET</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{section.label}</span>
      </nav>
      <h1 style={{ fontFamily: EXO, fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>{section.label}</h1>
      {section.description && <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 28px', maxWidth: '60ch', lineHeight: 1.6 }}>{section.description}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {articles.map(function (a) { return <ArticleCard key={a.id} section={section} article={a} />; })}
      </div>
    </main>
  );
}
