// app/maps/page.js
// ============================================================
// MAPS INDEX — lists every map that has a page (merged June 8, 2026)
// ============================================================
// A map has a public page if it exists in EITHER system:
//   - game_maps (verified): the SEO reference layer (zones/boss/events) -
//     ALL such maps have public crawlable detail pages.
//   - maps (is_published): the interactive/vault layer.
// We read both, merge, and dedupe by slug so the index lists the full set
// and links to each /maps/[slug]. This is the internal-linking hub for the
// maps cluster - it must surface every detail page, not just vault ones.
//
// Card fields come from game_maps when available (summary + difficulty),
// falling back to the vault map's description/season for vault-only maps.
//
// Original index created May 26, 2026 (vault-only). Merged with the
// game_maps SEO layer June 8, 2026.

import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const BG = '#121418';
const CARD_BG = '#1a1d24';
const BORDER = '#22252e';
const CYAN = '#00d4ff';

export const metadata = {
  title: 'Marathon Maps - Zone Guides, Bosses & Vault Intel | CyberneticPunks',
  description: 'Marathon map guides for every location. Zones, bosses, events, and game modes for each map, with interactive vault breakdowns and credential routes where available.',
  alternates: { canonical: 'https://cyberneticpunks.com/maps' },
  // Self-set Marathon OG so /maps keeps its game-appropriate card instead of inheriting
  // the network-level root defaults (mirrors /marathon; the other Marathon pages already
  // self-set their own OG).
  openGraph: {
    title: 'Marathon Maps - Zone Guides, Bosses & Vault Intel',
    description: 'Marathon map guides for every location. Zones, bosses, events, and game modes for each map, with interactive vault breakdowns and credential routes where available.',
    url: 'https://cyberneticpunks.com/maps',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Maps - Zone Guides, Bosses & Vault Intel',
    description: 'Marathon map guides for every location. Zones, bosses, events, and game modes for each map.',
  },
};

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export default async function MapsIndex() {
  var supabase = getServiceClient();

  var [gameMapsRes, vaultMapsRes] = await Promise.all([
    supabase.from('game_maps')
      .select('slug, name, summary, difficulty, style, variant_of, updated_at')
      .eq('game_slug', 'marathon')
      .eq('verified', true)
      .order('name', { ascending: true }),
    supabase.from('maps')
      .select('slug, name, description, season, updated_at')
      .eq('is_published', true),
  ]);

  var gameMaps = gameMapsRes.data || [];
  var vaultMaps = vaultMapsRes.data || [];

  // Merge + dedupe by slug. game_maps is the backbone (drives the card);
  // a vault-only map (in maps but not game_maps) is added with its own fields.
  var bySlug = {};
  gameMaps.forEach(function(g) {
    bySlug[g.slug] = {
      slug: g.slug,
      name: g.name,
      blurb: g.summary || null,
      difficulty: g.difficulty || null,
      style: g.style || null,
      variant_of: g.variant_of || null,
      hasVault: false,
    };
  });
  vaultMaps.forEach(function(v) {
    if (bySlug[v.slug]) {
      // Map exists in both - mark that it has an interactive layer.
      bySlug[v.slug].hasVault = true;
    } else {
      // Vault-only map (no game_maps row yet) - list it from vault fields.
      bySlug[v.slug] = {
        slug: v.slug,
        name: v.name,
        blurb: v.description || null,
        difficulty: null,
        style: null,
        variant_of: null,
        hasVault: true,
      };
    }
  });

  // Sort: non-variant maps first (alpha), then variants (alpha), so a base
  // map lists above its night/variant counterpart.
  var maps = Object.keys(bySlug).map(function(k) { return bySlug[k]; });
  maps.sort(function(a, b) {
    if (!!a.variant_of !== !!b.variant_of) return a.variant_of ? 1 : -1;
    return (a.name || '').localeCompare(b.name || '');
  });

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <style>{`
        .mi-card { transition: background 0.12s, border-color 0.12s, transform 0.12s; }
        .mi-card:hover { background: #1e2228 !important; transform: translateY(-1px); border-color: ${CYAN}55 !important; }
      `}</style>

      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: CYAN }}>MAPS</li>
        </ol>
      </nav>

      <section style={{ padding: '24px 24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: CYAN, background: CYAN + '14', border: '1px solid ' + CYAN + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
          MAP INTEL
        </span>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.05, margin: '16px 0', color: CYAN }}>
          MARATHON MAPS
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
          Map-by-map guides to every location in Marathon - zones, bosses, events, and game modes for each, with interactive vault breakdowns and credential routes where available.
        </p>
      </section>

      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        {maps.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {maps.map(function(m) {
              return (
                <Link key={m.slug} href={'/maps/' + m.slug} className="mi-card" style={{ display: 'block', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + CYAN, borderRadius: '0 2px 2px 0', padding: '18px 20px', textDecoration: 'none' }}>
                  <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>{m.name}</h2>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: m.blurb ? 8 : 0 }}>
                    {m.difficulty && (
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: CYAN, border: '1px solid ' + CYAN + '40', background: CYAN + '12', borderRadius: 2, padding: '2px 7px', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{m.difficulty}</span>
                    )}
                    {m.style && (
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '2px 7px', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{m.style}</span>
                    )}
                    {m.variant_of && (
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '2px 7px', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>VARIANT</span>
                    )}
                    {m.hasVault && (
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: '#ffd700', border: '1px solid #ffd70040', background: '#ffd70012', borderRadius: 2, padding: '2px 7px', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>VAULT INTEL</span>
                    )}
                  </div>
                  {m.blurb && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: 0 }}>{m.blurb.slice(0, 140)}{m.blurb.length > 140 ? '...' : ''}</p>}
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: CYAN, letterSpacing: 1, fontWeight: 700, marginTop: 12 }}>VIEW MAP →</div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700 }}>
              MAPS COMING SOON
            </div>
          </div>
        )}
      </section>
    </main>
  );
}