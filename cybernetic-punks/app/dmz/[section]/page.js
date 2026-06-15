// app/dmz/[section]/page.js
// One dynamic route renders EVERY DMZ section from the sections-config (D1/D4:
// routes render FROM config, not hardcoded per-section pages). The section slug
// is validated against the registry; unknown slugs 404.
//
//   source 'editor' -> read feed_items WHERE game_slug='dmz' (empty pre-launch
//                      -> empty-state). Filters inert until DMZ rows exist.
//   source 'data'   -> "coming soon" shell (its own entity tables come later;
//                      no query yet).
//
// Queries Supabase -> force-dynamic (Next.js 16). `supabase` is the lazy Proxy
// from @/lib/supabase (no module-scope createClient()).

import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import { getGameSection } from '@/lib/games/registry';
import DmzEmptyState from '../DmzEmptyState';
import DmzComingSoon from '../DmzComingSoon';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// Pre-launch this is the producing game's slug for DMZ content. Constant 'dmz'
// here (DMZ section is fixed to the DMZ game). Reads stay inert until the first
// game_slug='dmz' row is inserted (the separate gated go-live step).
var DMZ_GAME_SLUG = 'dmz';

export async function generateMetadata({ params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection('dmz', sectionSlug);
  if (!section) return { title: 'DMZ — Not Found' };
  return {
    title: section.label + ' — DMZ',
    description: 'DMZ ' + section.label + ' on the CyberneticPunks game network.',
    alternates: { canonical: 'https://cyberneticpunks.com/dmz/' + section.slug },
  };
}

export default async function DmzSectionPage({ params }) {
  var sectionSlug = (await params).section;
  var section = getGameSection('dmz', sectionSlug);
  if (!section) notFound();

  // Data-fed section: structured-data tool, no feed_items query.
  if (section.source !== 'editor') {
    return <DmzComingSoon section={section} />;
  }

  // Editor-fed section: read DMZ articles (game-scoped). Empty pre-launch.
  var articles = [];
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('id, headline, slug, editor, tags, created_at')
      .eq('is_published', true)
      .eq('game_slug', DMZ_GAME_SLUG)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) articles = data;
  } catch (err) {
    // non-fatal: fall through to empty-state
  }

  if (articles.length === 0) {
    return <DmzEmptyState section={section} />;
  }

  // Content path (not reached pre-launch; correct for when DMZ rows exist).
  return (
    <main style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 16px 96px' }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: 3,
        color: 'var(--text-tertiary)', textTransform: 'uppercase', marginBottom: 10,
      }}>
        DMZ · {section.label}
      </div>
      <h1 style={{
        fontFamily: 'Orbitron, monospace', fontSize: 30, fontWeight: 800,
        letterSpacing: 1, color: '#fff', margin: '0 0 24px',
      }}>
        {section.label}
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {articles.map(function(a) {
          return (
            <Link
              key={a.id}
              href={'/dmz/' + section.slug + '/' + a.slug}
              style={{
                display: 'block', textDecoration: 'none',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 4, padding: '16px 18px',
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{a.headline}</span>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
