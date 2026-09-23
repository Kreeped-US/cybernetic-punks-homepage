// app/wardogs/loadouts/build/[slug]/page.js
// SSR-from-stored Wardogs loadout page (Phase 1d Step 1). Reads a SAVED wardogs_loadout_pages row and
// renders it from the stored loadout_json via the SHARED <LoadoutResult> (the SAME render as the live
// tool, streaming=false). PUBLIC (SEO-safe -- it is shareable content, not the gated generator), but
// NOINDEX by default (is_indexable=false) until the Channel B ramp promotes it. Slugs are created at
// runtime by the save route, so this is force-dynamic (fetch-by-slug, 404 when missing) -- NOT a fixed
// generateStaticParams set like Marathon's shells. Honest: attributed provenance + honest-null render
// straight from the stored JSON.

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import LoadoutResult from '@/components/wardogs/LoadoutResult';
import { shippedHubForWeaponType } from '@/lib/wardogs/loadoutHubs';
import { perTierComparison } from '@/lib/wardogs/loadoutAnalysisGuard';

export const dynamic = 'force-dynamic';

const BASE = 'https://cyberneticpunks.com';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function fetchLoadout(slug) {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('wardogs_loadout_pages')
    .select('slug, loadout_json, is_indexable, playstyle, career_level, budget, updated_at')
    .eq('game_slug', 'wardogs').eq('slug', slug)
    .maybeSingle();
  return data || null;
}

// The saved loadout's primary weapon -> its LIVE class hub (loadout_json has no weapon_type, so we
// look it up). Returns a shipped hub or null (caller falls back to /wardogs/arsenal). Never a 404.
async function hubForWeapon(weaponName) {
  if (!weaponName) return null;
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('weapon_stats').select('weapon_type')
      .eq('game_slug', 'wardogs').eq('name', weaponName).maybeSingle();
    return shippedHubForWeaponType(data && data.weapon_type);
  } catch (e) { return null; }
}

// Per-tier primary-vs-runner-up comparison from CURRENT wardogs_ttk (the two weapons at the pick's
// ammo). Reads live data so a saved page reflects data fixes; null on any miss (the table just hides).
async function currentComparison(j) {
  const prim = j && j.recommendation && j.recommendation.primary;
  const cand = (j && j.candidates && j.candidates.primary) || [];
  const ru = prim ? cand.find((c) => c.weapon_name !== prim.weapon_name) : null;
  if (!prim || !ru || !prim.ammo) return null;
  try {
    const supabase = getSupabase();
    const { data } = await supabase
      .from('wardogs_ttk').select('weapon_name, ammo_type, armor_tier, ttk_ms')
      .eq('game_slug', 'wardogs').eq('ammo_type', prim.ammo)
      .in('weapon_name', [prim.weapon_name, ru.weapon_name]);
    return perTierComparison({ ttk: data || [], primaryName: prim.weapon_name, runnerUpName: ru.weapon_name, ammo: prim.ammo });
  } catch (e) { return null; }
}

function titleFor(row) {
  const j = (row && row.loadout_json) || {};
  const primary = j.recommendation && j.recommendation.primary && j.recommendation.primary.weapon_name;
  const ps = (j.playstyle || row.playstyle || 'balanced');
  const psTitle = ps.charAt(0).toUpperCase() + ps.slice(1);
  const lvl = row.career_level != null ? ' at Level ' + row.career_level : '';
  return primary
    ? primary + ' -- ' + psTitle + ' Wardogs Loadout' + lvl
    : 'Wardogs Loadout' + lvl;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const row = await fetchLoadout(slug);
  if (!row) return { title: 'Loadout not found', robots: { index: false, follow: false } };
  const title = titleFor(row);
  const description = 'A Wardogs loadout ranked by measured time-to-kill from community ballistics testing (attributed). See the full board, the per-weapon TTK breakdown, and the reasoning.';
  const url = BASE + '/wardogs/loadouts/build/' + row.slug;
  return {
    title: { absolute: title + ' | Cybernetic Punks' },
    description,
    // NOINDEX by default until the Channel B ramp promotes it (is_indexable).
    robots: { index: !!row.is_indexable, follow: true },
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Cybernetic Punks', type: 'article' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function SavedLoadoutPage({ params }) {
  const { slug } = await params;
  const row = await fetchLoadout(slug);
  if (!row) notFound();

  const j = row.loadout_json || {};
  const meta = {
    recommendation: j.recommendation || {},
    candidates: j.candidates || {},
    detail: j.detail || {},
    provenance: j.provenance || { tier: 'attributed' },
    budget: j.budget || {},
    playstyle: j.playstyle || row.playstyle || null,
  };
  const primaryName = j.recommendation && j.recommendation.primary && j.recommendation.primary.weapon_name;
  const typeHub = await hubForWeapon(primaryName);   // matching class hub, or null -> arsenal fallback
  // Per-tier comparison computed from CURRENT wardogs_ttk (not the stored snapshot), so a saved page's
  // honest breakdown reflects any later data correction. Reads the two weapons at the pick's ammo.
  const comparison = await currentComparison(j);
  const ghostLink = { display: 'inline-block', padding: '12px 22px', background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 2, fontSize: 12, fontWeight: 800, letterSpacing: 1, textDecoration: 'none' };

  return (
    <>
      {/* Crawlable SSR frame -- real prose so the page has substance beyond the rendered widget. */}
      <section style={{ background: 'var(--bg-page)', color: '#fff', borderBottom: '1px solid var(--border)', padding: '34px 24px 10px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 10 }}>SAVED LOADOUT</div>
          <h1 style={{ fontSize: 'clamp(24px, 3.6vw, 34px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.1, margin: '0 0 12px' }}>
            {titleFor(row)}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
            Ranked by measured <strong>time-to-kill</strong> from community-tested ballistics (attributed to
            Swoleguy, not yet Bulkhead-official), and costed gun + ammo against the economy (prices
            community-recorded). It&rsquo;s fastest time-to-kill for the money, not an unqualified &ldquo;best gun.&rdquo;
          </p>
        </div>
      </section>

      <LoadoutResult
        steps={j.steps || []}
        meta={meta}
        comparison={comparison}
        analysis={j.analysis || ''}
        queried={j.queried || null}
        streaming={false}
        footer={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/wardogs/loadouts" style={{ display: 'inline-block', padding: '12px 22px', background: 'var(--accent)', color: 'var(--bg-page)', borderRadius: 2, fontSize: 12, fontWeight: 900, letterSpacing: 1, textDecoration: 'none' }}>
              GENERATE YOUR OWN CUSTOM LOADOUT &rarr;
            </Link>
            {typeHub
              ? <Link href={'/wardogs/loadouts/best/' + typeHub.slug} style={ghostLink}>Best {typeHub.label} loadouts &rarr;</Link>
              : <Link href="/wardogs/arsenal" style={ghostLink}>Browse the arsenal &rarr;</Link>}
          </div>
        }
      />
    </>
  );
}
