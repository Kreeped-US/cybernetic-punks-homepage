// app/tools/build/[shell]/[weapon]/page.js
// A2 weapon-variant build page: /tools/build/[shell]/[weapon] (e.g. /tools/build/assassin/knife).
// The demand-promoted long-tail spoke off the goal-neutral canonical hub. SSRs a stored
// variant build_pages row (weapon_slug set) via the SHARED BuildView (build_json-shape
// agnostic -- same component the canonical uses). Static + revalidate:false; the A5 poller
// keeps it fresh. dynamicParams:false so only generated variants resolve; anything else 404s.
//
// INFRA-ONLY (WS1a): generateStaticParams reads the variant rows -- ZERO today (no variants
// seeded; WS1b seeds the 6). So this route generates no pages yet; it exists, ready. The
// canonical hub route ([shell]/page.js) stays weapon_slug-IS-NULL-only, so the two routes
// never overlap.

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import BuildRefiner from '../BuildRefiner';
import { weaponNameForSlug } from '@/lib/advisor/regenerateCanonical';

export const revalidate = false;      // static; the A5 poller does on-demand freshness
export const dynamicParams = false;   // only generated variants resolve; else 404

const BASE = 'https://cyberneticpunks.com';
const GAME = 'marathon';

// Accent per shell (mirrors the canonical route; the DB has no colour column).
const SHELL_ACCENT = {
  destroyer: '#ff3333', vandal: '#ff8800', recon: '#00d4ff', assassin: '#cc44ff',
  triage: '#00ff88', thief: '#ffd700', rook: '#888888', sentinel: '#4d9fff',
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // ACTIONABLE build-time diagnostic. This route reads build_pages in generateStaticParams,
  // which runs at BUILD ("Collecting page data"). If NEXT_PUBLIC_SUPABASE_URL is absent from
  // the BUILD env, createClient throws the OPAQUE "supabaseUrl is required". Surface the ROOT
  // CAUSE instead so it is fixable at a glance. Still FAILS the build (never a silent [] --
  // the URL genuinely must be present at build for these pages to prerender); the Finding-1
  // read-error throw below is unaffected.
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL is not set at BUILD time. /tools/build/[shell]/[weapon] reads ' +
      'build_pages in generateStaticParams (build phase), so this var must be in the Vercel ' +
      'Production BUILD environment, not runtime-only. Set it there to unblock the build.'
    );
  }
  return createClient(url, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function titleCase(slug) {
  return String(slug || '').charAt(0).toUpperCase() + String(slug || '').slice(1);
}

// A servable variant = indexable, generated, goal-neutral (goal NULL), weapon-qualified.
// Keyed on (shell, weapon_slug) -- the exact URL segments.
async function fetchVariant(shellSlug, weaponSlug) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('build_pages')
    .select('slug, shell, weapon_slug, build_json, source_updated_at, is_indexable, updated_at')
    .eq('game_slug', GAME).eq('shell', shellSlug).eq('weapon_slug', weaponSlug).is('goal', null)
    .maybeSingle();
  return data || null;
}

export async function generateStaticParams() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('build_pages')
    .select('shell, weapon_slug')
    .eq('game_slug', GAME).is('goal', null).not('weapon_slug', 'is', null)
    .eq('is_indexable', true).not('build_json', 'is', null);
  // Read FAILED (error set) -> THROW so `next build` fails LOUDLY instead of shipping 0
  // variant pages (all 404). A network-level reject propagates for the same reason (no
  // try/catch to swallow it). A GENUINE empty result (error null, data []) returns [] and
  // the build succeeds -- the legitimate no-variants / pre-seeding case (this route was
  // correctly empty before WS1b seeded the 6). error-vs-empty, NOT zero-vs-nonzero.
  // Build-time-only read (static, revalidate:false, dynamicParams:false) -- throw fails the
  // build, never a live 500.
  if (error) throw new Error('build_pages variant generateStaticParams read failed: ' + error.message);
  return (data || []).map((r) => ({ shell: r.shell, weapon: r.weapon_slug }));
}

// Title <=60 (A2 cap). "[Shell] [Weapon] Build — Marathon". Longest of the seeded 6 is
// "Destroyer V85 Circuit Breaker Build — Marathon" (46). Guard for future long weapons:
// drop " Build", then fall back to the bare "[Shell] [Weapon]" if still over.
function variantTitle(name, weaponName) {
  const full = name + ' ' + weaponName + ' Build — Marathon';
  if (full.length <= 60) return full;
  const noBuild = name + ' ' + weaponName + ' — Marathon';
  if (noBuild.length <= 60) return noBuild;
  return (name + ' ' + weaponName).slice(0, 60);
}

export async function generateMetadata({ params }) {
  const { shell, weapon } = await params;
  const row = await fetchVariant(shell, weapon);
  if (!row || !row.is_indexable || !row.build_json) {
    return { title: 'Build Not Found — Marathon', robots: { index: false } };
  }
  const name = titleCase(shell);
  const weaponName = (await weaponNameForSlug(getSupabase(), weapon)) || titleCase(weapon);
  const b = row.build_json;
  const primary = b.primary_weapon && b.primary_weapon.name ? b.primary_weapon.name : weaponName;
  const url = BASE + '/tools/build/' + shell + '/' + weapon;
  const description =
    'The best Marathon ' + name + ' ' + weaponName + ' loadout: ' + primary +
    ', plus weapon mods, shell cores, implants, and a Cradle stat plan — built on verified in-game stats.';
  return {
    title: variantTitle(name, weaponName),
    description,
    alternates: { canonical: url },   // self-canonical per the promotion rule (its own query)
    openGraph: { title: name + ' ' + weaponName + ' Build — Marathon', description, url, siteName: 'CyberneticPunks', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: name + ' ' + weaponName + ' Build — Marathon', description },
  };
}

export default async function VariantBuildPage({ params }) {
  const { shell, weapon } = await params;
  const row = await fetchVariant(shell, weapon);
  if (!row || !row.is_indexable || !row.build_json) notFound();

  const name = titleCase(shell);
  const weaponName = (await weaponNameForSlug(getSupabase(), weapon)) || titleCase(weapon);
  const accent = SHELL_ACCENT[shell] || '#ff8800';
  const build = row.build_json;

  // JSON-LD: BreadcrumbList + WebPage only (A1 -- no FAQPage). Breadcrumb includes the hub.
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Builds', item: BASE + '/tools/build' },
      { '@type': 'ListItem', position: 3, name: name + ' Build', item: BASE + '/tools/build/' + shell },
      { '@type': 'ListItem', position: 4, name: name + ' ' + weaponName + ' Build', item: BASE + '/tools/build/' + shell + '/' + weapon },
    ],
  };
  const webPage = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: name + ' ' + weaponName + ' Build — Marathon',
    url: BASE + '/tools/build/' + shell + '/' + weapon,
    isPartOf: { '@type': 'WebSite', name: 'CyberneticPunks', url: BASE },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />

      <section style={{ background: '#121418', color: '#fff', borderBottom: '1px solid #1e2028', padding: '40px 24px 20px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 12, fontFamily: 'monospace', letterSpacing: 1 }}>
            <Link href="/marathon/shells" style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>Shells</Link>
            {' / '}<Link href={'/tools/build/' + shell} style={{ color: 'rgba(255,255,255,0.55)', textDecoration: 'none' }}>{name} Build</Link>
            {' / '}<span style={{ color: accent }}>{weaponName}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1, margin: '0 0 14px' }}>
            Best Marathon {name} {weaponName} Build — Season 2 Loadout
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, maxWidth: 820, margin: '0 0 12px' }}>
            A complete Marathon {name} loadout built around the {weaponName} — weapon mods, shell cores,
            implants, and a{' '}
            <Link href={'/tools/build/' + shell + '#cradle'} style={{ color: accent, textDecoration: 'none' }}>Cradle stat-track plan</Link>{' '}
            — engineered from the {name}&rsquo;s playstyle and cross-referenced against real in-game stat
            values. See the full{' '}
            <Link href={'/tools/build/' + shell} style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}>{name} build hub</Link>{' '}
            and the <Link href="/marathon/weapons" style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'underline' }}>{weaponName}</Link> stats behind these picks.
          </p>
          <div>
            <Link href={'/advisor?shell=' + name} style={{ display: 'inline-block', padding: '10px 18px', background: accent, color: accent === '#ffd700' || accent === '#ff8800' || accent === '#00d4ff' || accent === '#00ff88' || accent === '#888888' ? '#000' : '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
              CUSTOMIZE THIS BUILD →
            </Link>
          </div>
        </div>
      </section>

      {/* Slice B: BuildRefiner mounts over the SSR canonical variant. First paint renders
          BuildView with the stored build_json (crawlable); ZERO advisor calls on load --
          refinement is gesture-bound only. */}
      <BuildRefiner canonicalBuild={build} accent={accent} />
    </>
  );
}
