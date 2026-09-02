// components/game/GameSectionPage.js
// SHARED per-game SECTION-LIST render (one dynamic route renders EVERY section from a game's
// sections-config). Config-driven: getGameSection resolves the section, editor sections read
// feed_items scoped by the game's article->section map, data sections show a coming-soon shell, and
// an editor section with zero articles shows an honest empty state. Unknown slug -> notFound().
//
// The per-game bits (config, the article->section map fns) are PASSED IN by the thin route file, so
// this module imports no game. First used by Bodycam; legacy games keep their own copies (Option C).
//
// Also exports: sectionHasContent (the generic indexability predicate, replacing the per-game
// lib/<game>/sections.js copies) and CoverageCard (the landing's per-section card).

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getGameSection } from '@/lib/games';
import { extractSnippet, readTime } from '@/lib/dmz/articleContent';
import { formatPublishDate } from '@/lib/formatDate';
import Link from 'next/link';
import GameArsenal from './GameArsenal';

var FONT = 'Exo_2, system-ui, sans-serif';

// Generic "does this /<game>/<section> have indexable content?" -- a 'data' section is a coming-soon
// shell (false); an 'editor' section has content iff >= 1 published feed_item resolves to it via the
// game's article->section map. Fail-safe: errored count -> false. `client` is a test seam.
export async function sectionHasContent(config, section, articleSlugsForSection, client) {
  if (!section || section.source !== 'editor') return false;
  var db = client || supabase;
  try {
    var sectionSlugs = articleSlugsForSection(section.slug);
    if (!sectionSlugs || sectionSlugs.length === 0) return false;
    var { count } = await db
      .from('feed_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true).eq('game_slug', config.slug)
      .in('slug', sectionSlugs);
    return (count || 0) > 0;
  } catch (err) {
    return false;
  }
}

// Metadata for a section route. Noindex an empty section (follow:true) until it has content AND the
// game is indexable. Call from the thin route file's generateMetadata.
export async function gameSectionMetadata(config, articleSlugsForSection, params) {
  var sectionSlug = (await params).section;
  var section = getGameSection(config.slug, sectionSlug);
  if (!section) return { title: config.displayName + ' - Not Found' };
  var desc = section.description || (section.label + ' for ' + config.displayName + '.');
  var url = 'https://cyberneticpunks.com' + config.basePath + '/' + section.slug;
  var hasContent = await sectionHasContent(config, section, articleSlugsForSection);
  return {
    title: section.label + ' - ' + config.displayName,
    description: desc,
    robots: hasContent ? undefined : { index: false, follow: true },
    alternates: { canonical: url },
  };
}

// The landing's per-section coverage card (exported so the game landing reuses it).
export function CoverageCard({ config, section, count }) {
  var isData = section.source === 'data';
  var live = !isData && count > 0;
  return (
    <Link href={config.basePath + '/' + section.slug} style={{
      display: 'flex', flexDirection: 'column', background: 'var(--bg-card)',
      border: '1px solid var(--border)', borderRadius: 6, textDecoration: 'none', minHeight: 128, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'var(--bg-nav)', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)' }}>{section.label.toUpperCase()}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 8.5, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: live ? 'var(--accent)' : 'var(--text-tertiary)', border: '1px solid ' + (live ? 'var(--accent)' : 'var(--border)'), borderRadius: 2, padding: '2px 7px' }}>{live ? 'Live' : 'Soon'}</span>
      </div>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <span style={{ fontFamily: FONT, fontSize: 17, fontWeight: 700, color: '#fff' }}>{section.label}</span>
        <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{section.description}</span>
        <span style={{ marginTop: 'auto', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, color: live ? 'var(--accent)' : 'var(--text-tertiary)' }}>
          {isData ? 'Structured data soon' : (live ? (count + (count === 1 ? ' report' : ' reports')) : 'Publishing soon')}
        </span>
      </div>
    </Link>
  );
}

function Breadcrumb({ config, section }) {
  return (
    <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
      <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
      <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
      <Link href={config.basePath} style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>{config.displayName}</Link>
      <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
      <span style={{ color: 'var(--text-secondary)' }}>{section.label}</span>
    </nav>
  );
}

function ArticleCard({ config, section, article }) {
  var snippet = extractSnippet(article.body, 170);
  var date = formatPublishDate(article.created_at);
  var rt = readTime(article.body);
  return (
    <Link href={config.basePath + '/' + section.slug + '/' + article.slug} style={{ display: 'flex', flexDirection: 'column', gap: 8, textDecoration: 'none', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 999, padding: '2px 9px' }}>News</span>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: 0.5, fontWeight: 600 }}>{[date, rt].filter(Boolean).join('  -  ')}</span>
      </div>
      <span style={{ fontFamily: FONT, fontSize: 19, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{article.headline}</span>
      {snippet && <span style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.55 }}>{snippet}</span>}
    </Link>
  );
}

function EmptyState({ config, section }) {
  var isData = section.source === 'data';
  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 40px' }}>
      <Breadcrumb config={config} section={section} />
      <h1 style={{ fontFamily: FONT, fontSize: 30, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>{section.label}</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '60ch' }}>{section.description}</p>
      <div style={{ marginTop: 28, padding: '18px 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
        {isData
          ? 'Structured data lands here as it is built and verified in-game - not guesses. Being built now.'
          : 'No reports published yet. Coverage lands here as the game is detailed and verified. Being built now.'}
      </div>
    </main>
  );
}

// The section-list page. config + articleSlugsForSection are passed by the thin route file.
export default async function GameSectionPage({ config, articleSlugsForSection, params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection(config.slug, sectionSlug);
  if (!section) notFound();

  // Data section (source !== 'editor'). If it targets weapon_stats and rows exist for this game,
  // render the honest-null arsenal roster; otherwise the coming-soon EmptyState. (A data section
  // never counts as indexable content -- sectionHasContent stays false -- so this roster of
  // verified=false rows renders WITHOUT being indexed, exactly like the Wardogs precedent.)
  if (section.source !== 'editor') {
    var cf = section.contentFilter || {};
    if (cf.table === 'weapon_stats') {
      var weapons = [];
      try {
        var wres = await supabase
          .from('weapon_stats')
          .select('name, category, weapon_type, ammo_type, verified, verified_source, notes')
          .eq('game_slug', config.slug)
          .order('category', { ascending: true })
          .order('name', { ascending: true });
        weapons = (wres && wres.data) || [];
      } catch (err) { weapons = []; }
      if (weapons.length > 0) return <GameArsenal config={config} section={section} weapons={weapons} />;
    }
    return <EmptyState config={config} section={section} />;
  }

  var articles = [];
  try {
    var sectionSlugs = articleSlugsForSection(section.slug);
    if (sectionSlugs && sectionSlugs.length > 0) {
      var { data } = await supabase
        .from('feed_items')
        .select('id, headline, slug, editor, tags, body, source_url, created_at')
        .eq('is_published', true).eq('game_slug', config.slug)
        .in('slug', sectionSlugs).order('created_at', { ascending: false }).limit(30);
      if (data) articles = data;
    }
  } catch (err) { /* non-fatal -> empty state */ }

  if (articles.length === 0) return <EmptyState config={config} section={section} />;

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 40px' }}>
      <Breadcrumb config={config} section={section} />
      <h1 style={{ fontFamily: FONT, fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 10px' }}>{section.label}</h1>
      {section.description && <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 28px', maxWidth: '60ch', lineHeight: 1.6 }}>{section.description}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {articles.map(function (a) { return <ArticleCard key={a.id} config={config} section={section} article={a} />; })}
      </div>
    </main>
  );
}
