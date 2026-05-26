// app/maps/[slug]/page.js
// ============================================================
// GENERALIZED MAP REFERENCE PAGE — Step 2 (reference layer only)
// ============================================================
// This is the SEO engine for the maps system. It renders the full
// PUBLIC, CRAWLABLE reference content for any map, driven entirely by
// map_slug data. Adding a future map = inserting rows; no code change.
//
// NO interactive visual map yet (Step 3) and NO Raid Advisor yet
// (Step 5). This page is pure reference: vaults, mechanics, credential
// routes, and credits.
//
// DATA ACCESS / RLS:
// The maps tables have RLS allowing public read of PUBLISHED maps only.
// While a map is is_published = false it is invisible to the anon key.
// So this server component creates a request-scoped SERVICE-KEY client
// (mirroring app/api/cron/route.js) so it can render an unpublished map
// for preview. To avoid exposing unpublished maps to the public, an
// is_published guard is enforced in the page: an unpublished map only
// renders when ?preview=<MAPS_PREVIEW_KEY> matches; otherwise notFound().
//
// Created: May 26, 2026 (Step 2 of the maps build)

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// --- design tokens (match site conventions) ---
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';
const CYAN = '#00d4ff';
const PURPLE = '#9b5de5';
const GOLD = '#ffd700';
const CONTRABAND = '#ff2d55';

// key-tier -> color (rarity ladder)
function keyTierColor(tier) {
  switch ((tier || '').toLowerCase()) {
    case 'superior':   return '#00d4ff';
    case 'prestige':   return '#ffd700';
    case 'contraband': return '#ff2d55';
    case 'deluxe':     return '#9b5de5';
    case 'enhanced':   return '#00ff88';
    default:           return 'rgba(255,255,255,0.5)';
  }
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function fetchMap(slug) {
  var supabase = getServiceClient();
  var [mapRes, attribRes, refRes, vaultRes] = await Promise.all([
    supabase.from('maps').select('*').eq('slug', slug).single(),
    supabase.from('map_attribution').select('*').eq('map_slug', slug),
    supabase.from('map_reference').select('*').eq('map_slug', slug).order('sort_order', { ascending: true }),
    supabase.from('map_vaults').select('*').eq('map_slug', slug).order('sort_order', { ascending: true }),
  ]);
  return {
    map: mapRes.data || null,
    attribution: attribRes.data || [],
    reference: refRes.data || [],
    vaults: vaultRes.data || [],
  };
}

export async function generateMetadata({ params }) {
  var resolved = await params;
  var supabase = getServiceClient();
  var { data: map } = await supabase.from('maps').select('*').eq('slug', resolved.slug).single();
  if (!map || !map.is_published) return { title: 'Map Not Found | CyberneticPunks' };

  var title = map.name + ' Map - Vaults, Mechanics & Credential Routes | CyberneticPunks';
  var description = map.description || (map.name + ' interactive map and complete guide.');
  return {
    title: title,
    description: description,
    alternates: { canonical: 'https://cyberneticpunks.com/maps/' + resolved.slug },
    openGraph: {
      title: title,
      description: description,
      url: 'https://cyberneticpunks.com/maps/' + resolved.slug,
      siteName: 'CyberneticPunks',
      type: 'website',
      images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: title, description: description },
  };
}

export default async function MapPage({ params, searchParams }) {
  var resolved = await params;
  var resolvedSearch = (await searchParams) || {};
  var data = await fetchMap(resolved.slug);
  var map = data.map;

  if (!map) notFound();

  // PREVIEW GUARD: unpublished maps only render with a matching preview key.
  if (!map.is_published) {
    var providedKey = resolvedSearch.preview || '';
    var expectedKey = process.env.MAPS_PREVIEW_KEY || '';
    if (!expectedKey || providedKey !== expectedKey) {
      notFound();
    }
  }

  var vaults = data.vaults;
  var reference = data.reference;
  var attribution = data.attribution;

  // Split reference into mechanics vs credential routes (cred-* keys).
  var credentialRoutes = reference.filter(function(r) { return (r.section_key || '').indexOf('cred-') === 0; });
  var mechanics = reference.filter(function(r) { return (r.section_key || '').indexOf('cred-') !== 0; });

  var isPreview = !map.is_published;

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <style>{`
        .mp-card { transition: background 0.12s, border-color 0.12s, transform 0.12s; }
        .mp-card:hover { background: #1e2228 !important; transform: translateY(-1px); }
        .mp-link:hover { background: #1e2228 !important; }
      `}</style>

      {isPreview && (
        <div style={{ background: GOLD, color: '#000', textAlign: 'center', padding: '6px 12px', fontFamily: 'monospace', fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>
          PREVIEW MODE — THIS MAP IS UNPUBLISHED AND NOT PUBLICLY VISIBLE
        </div>
      )}

      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li><Link href="/maps" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>MAPS</Link></li>
          <li>/</li>
          <li style={{ color: CYAN }}>{(map.name || '').toUpperCase()}</li>
        </ol>
      </nav>

      {/* hero */}
      <section style={{ padding: '24px 24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: CYAN, background: CYAN + '14', border: '1px solid ' + CYAN + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
            MAP INTEL
          </span>
          {map.season && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
              {map.season.toUpperCase()}
            </span>
          )}
        </div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.05, margin: '0 0 16px', color: CYAN }}>
          {(map.name || '').toUpperCase()}
        </h1>
        {map.description && (
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 760, margin: 0 }}>
            {map.description}
          </p>
        )}
      </section>

      {/* VAULTS */}
      {vaults.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 3, color: CYAN }}>VAULTS</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{vaults.length} TOTAL</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))', gap: 10 }}>
            {vaults.map(function(v) {
              var kColor = keyTierColor(v.key_tier);
              return (
                <div key={v.id} className="mp-card" style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + kColor, borderRadius: '0 2px 2px 0', padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                    <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#fff', margin: 0 }}>
                      <span style={{ color: kColor }}>VAULT {v.vault_number}</span>
                      {v.vault_name ? ' — ' + v.vault_name : ''}
                    </h2>
                    {v.key_tier && (
                      <span style={{ fontFamily: 'monospace', fontSize: 8, fontWeight: 800, color: kColor, background: kColor + '18', border: '1px solid ' + kColor + '55', borderRadius: 2, padding: '2px 7px', letterSpacing: 1, whiteSpace: 'nowrap' }}>
                        {v.key_tier.toUpperCase()} KEY
                      </span>
                    )}
                  </div>

                  {/* requirement chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                    {v.batteries_total != null && (
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 8px', letterSpacing: 0.5 }}>
                        🔋 {v.batteries_total} BATTERIES
                      </span>
                    )}
                    {v.requires_cryo_coolant && (
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: CYAN, background: CYAN + '12', border: '1px solid ' + CYAN + '40', borderRadius: 2, padding: '3px 8px', letterSpacing: 0.5 }}>
                        ❄ CRYO COOLANT
                      </span>
                    )}
                    {v.credentials_required && (
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: GOLD, background: GOLD + '12', border: '1px solid ' + GOLD + '40', borderRadius: 2, padding: '3px 8px', letterSpacing: 0.5 }}>
                        🔑 {v.credentials_required.toUpperCase()}
                      </span>
                    )}
                    {v.clearance_level != null && (
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: PURPLE, background: PURPLE + '12', border: '1px solid ' + PURPLE + '40', borderRadius: 2, padding: '3px 8px', letterSpacing: 0.5 }}>
                        CLEARANCE {v.clearance_level}
                      </span>
                    )}
                  </div>

                  {v.batteries_breakdown && (
                    <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 10, letterSpacing: 0.5 }}>
                      Battery use: {v.batteries_breakdown}
                    </div>
                  )}

                  {v.unique_weapon && (
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, fontWeight: 700 }}>UNIQUE LOOT</span>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 14, color: CONTRABAND, fontWeight: 700, marginTop: 2 }}>{v.unique_weapon}</div>
                    </div>
                  )}

                  {v.puzzle_desc && (
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.55, margin: '0 0 8px' }}>{v.puzzle_desc}</p>
                  )}
                  {v.notes && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, margin: 0, fontStyle: 'italic' }}>{v.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MECHANICS */}
      {mechanics.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.5)' }}>MECHANICS</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 8 }}>
            {mechanics.map(function(m) {
              return (
                <div key={m.id} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + CYAN, borderRadius: '0 2px 2px 0', padding: '14px 16px' }}>
                  <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{m.title}</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{m.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CREDENTIAL ROUTES */}
      {credentialRoutes.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, letterSpacing: 3, color: GOLD }}>CREDENTIAL ROUTES</span>
            <div style={{ flex: 1, height: 1, background: BORDER }} />
            <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{credentialRoutes.length} ROUTES</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 8 }}>
            {credentialRoutes.map(function(c) {
              return (
                <div key={c.id} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + GOLD, borderRadius: '0 2px 2px 0', padding: '14px 16px' }}>
                  <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{c.title}</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{c.body}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* CREDITS */}
      {attribution.length > 0 && (
        <section style={{ padding: '0 24px 56px', maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + PURPLE, borderRadius: '0 2px 2px 0', padding: 20 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: PURPLE, letterSpacing: 3, fontWeight: 700, marginBottom: 12 }}>MAP CREDITS</div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '0 0 14px', maxWidth: 640 }}>
              This map is built on data compiled by the Marathon community. Huge thanks to the contributors below — used with permission.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {attribution.map(function(a) {
                return (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', background: DEEP_BG, border: '1px solid ' + BORDER, borderRadius: 2, flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 700, color: '#fff' }}>{a.contributor_name}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginLeft: 10 }}>{(a.contribution_type || '').toUpperCase()}</span>
                      {a.note && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{a.note}</div>}
                    </div>
                    {a.contributor_url && (
                      <a href={a.contributor_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'monospace', fontSize: 10, color: CYAN, letterSpacing: 1, textDecoration: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        VIEW PROFILE →
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}