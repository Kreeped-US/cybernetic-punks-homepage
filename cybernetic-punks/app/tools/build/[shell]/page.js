// app/tools/build/[shell]/page.js
// Goal-neutral canonical build page: /tools/build/[shell]. SSRs the stored build_pages
// row via the STATIC BuildView (zero paid advisor calls -- render/generate separation,
// Fable route ruling). Static generation for all 8 shells; `revalidate: false` (freshness
// is the A5 on-demand hook, a later slice, NOT time-based ISR). `dynamicParams: false` so
// only the 8 generated shells resolve -- any other [shell] 404s.

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BuildView from './BuildView';

export const revalidate = false;      // static; on-demand revalidation is the A5 slice
export const dynamicParams = false;   // unknown [shell] -> 404 (only generateStaticParams shells)

const BASE = 'https://cyberneticpunks.com';
const GAME = 'marathon';

// Accent per shell (the DB has no colour column; branding lives in code, same as
// app/advisor/page.js SHELL_BRANDING). Keyed by slug.
const SHELL_ACCENT = {
  destroyer: '#ff3333', vandal: '#ff8800', recon: '#00d4ff', assassin: '#cc44ff',
  triage: '#00ff88', thief: '#ffd700', rook: '#888888', sentinel: '#4d9fff',
};

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Only indexable, generated goal-neutral canonicals (goal NULL, weapon_slug NULL) are
// servable rows. This is BOTH the generateStaticParams source and the fetch predicate.
async function fetchCanonical(shellSlug) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('build_pages')
    .select('slug, shell, build_json, source_updated_at, is_indexable, updated_at')
    .eq('game_slug', GAME).eq('slug', shellSlug)
    .is('goal', null).is('weapon_slug', null)
    .maybeSingle();
  return data || null;
}

function titleCase(slug) {
  return String(slug || '').charAt(0).toUpperCase() + String(slug || '').slice(1);
}

export async function generateStaticParams() {
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('build_pages')
      .select('slug')
      .eq('game_slug', GAME).is('goal', null).is('weapon_slug', null)
      .eq('is_indexable', true).not('build_json', 'is', null);
    return (data || []).map((r) => ({ shell: r.slug }));
  } catch (_) {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { shell } = await params;
  const row = await fetchCanonical(shell);
  if (!row || !row.is_indexable || !row.build_json) {
    return { title: 'Build Not Found — Marathon', robots: { index: false } };
  }
  const name = titleCase(shell);
  const b = row.build_json;
  const primary = b.primary_weapon && b.primary_weapon.name ? b.primary_weapon.name : 'a top-tier weapon';
  // Title <=60 (A2 cap): "Sentinel Build — Marathon Season 2" = 34 chars, all shells fit.
  const title = name + ' Build — Marathon Season 2';
  const description =
    'The best Marathon ' + name + ' loadout: ' + primary +
    ', plus weapon mods, shell cores, implants, and a Cradle stat plan — built on verified in-game stats.';
  const url = BASE + '/tools/build/' + shell;
  return {
    title,
    description,
    alternates: { canonical: url },   // bare URL: any ?goal=/?rank= refinement self-canonicalizes here
    openGraph: { title: name + ' Build — Marathon', description, url, siteName: 'CyberneticPunks', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: name + ' Build — Marathon', description },
  };
}

export default async function BuildPage({ params }) {
  const { shell } = await params;
  const row = await fetchCanonical(shell);
  if (!row || !row.is_indexable || !row.build_json) notFound();

  const name = titleCase(shell);
  const accent = SHELL_ACCENT[shell] || '#ff8800';
  const build = row.build_json;

  // JSON-LD: BreadcrumbList + WebPage only (A1 -- no FAQPage).
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Builds', item: BASE + '/tools/build' },
      { '@type': 'ListItem', position: 3, name: name + ' Build', item: BASE + '/tools/build/' + shell },
    ],
  };
  const webPage = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: name + ' Build — Marathon Season 2',
    url: BASE + '/tools/build/' + shell,
    isPartOf: { '@type': 'WebSite', name: 'CyberneticPunks', url: BASE },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />

      {/* Crawlable intro (real H1 + prose + internal links). */}
      <section style={{ background: '#121418', color: '#fff', borderBottom: '1px solid #1e2028', padding: '40px 24px 20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12, fontFamily: 'monospace', letterSpacing: 1 }}>
            <Link href="/shells" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Shells</Link>
            {' / '}<Link href={'/shells/' + shell} style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>{name}</Link>
            {' / '}<span style={{ color: accent }}>Build</span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1, margin: '0 0 14px' }}>
            Best Marathon {name} Build — Season 2 Loadout
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 820, margin: '0 0 12px' }}>
            A complete Marathon {name} loadout — primary and secondary weapons, weapon mods, shell cores,
            implants, and a{' '}
            <Link href="/cradle" style={{ color: accent, textDecoration: 'none' }}>Cradle stat-track plan</Link>{' '}
            — engineered from the {name}&rsquo;s playstyle and cross-referenced against real in-game stat
            values. Browse the full{' '}
            <Link href={'/shells/' + shell} style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}>{name} shell data</Link>{' '}
            and every <Link href="/weapons" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}>weapon</Link> behind these picks.
          </p>
          <div>
            <Link href={'/advisor?shell=' + name} style={{ display: 'inline-block', padding: '10px 18px', background: accent, color: accent === '#ffd700' || accent === '#ff8800' || accent === '#00d4ff' || accent === '#00ff88' || accent === '#888888' ? '#000' : '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
              CUSTOMIZE THIS BUILD →
            </Link>
          </div>
        </div>
      </section>

      <BuildView build={build} accent={accent} />
    </>
  );
}
