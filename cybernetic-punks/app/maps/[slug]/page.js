// app/maps/[slug]/page.js
// ============================================================
// MAP PAGE — TWO LAYERS, ONE URL (merged June 8, 2026)
// ============================================================
// Layer 1 (SEO backbone, ungated): game-world reference content from the
//   verified game_maps / game_zones / game_bosses / game_events / game_modes
//   tables. Public + crawlable for any map with a verified game_maps row.
//   This is the SEO engine - zones, boss, events, modes.
//
// Layer 2 (interactive / premium, optional): the original vault-intel system
//   from the maps / map_vaults / map_reference / map_attribution tables.
//   Renders only when a maps row exists AND (is_published OR a matching
//   ?preview=<MAPS_PREVIEW_KEY>). Future gated/monetized interactive layer.
//
// The page renders if the map exists in EITHER system. notFound() only when
// BOTH are empty. The two layers gate independently, so the SEO content is
// never hidden behind the vault system's publish state.
//
// Slugs align across both systems (verified): cryo-archive exists in both;
// dire-marsh / night-marsh / outpost / perimeter are game_maps-only for now
// and render as SEO-only pages until their interactive layer is built.
//
// Original interactive system created May 26, 2026. SEO layer + merge added
// June 8, 2026. Vault/preview machinery preserved exactly.

import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

// --- design tokens (match site conventions) ---
const BG = '#121418';
const CARD_BG = '#1a1d24';
const DEEP_BG = '#0e1014';
const BORDER = '#22252e';
const BORDER_SUBTLE = '#1e2028';
const CYAN = '#00d4ff';
const PURPLE = '#9b5de5';
const GOLD = '#ffd700';
const GHOST = '#00ff88';
const CONTRABAND = '#ff2d55';

// Maps that have a hero PNG at /public/images/maps/<slug>.png. Only slugs
// listed here render a banner -- this prevents broken-image icons, since a
// server component cannot use <img onError>. Add a slug when its PNG lands.
const MAP_HERO_SLUGS = new Set([
  'cryo-archive',
  'dire-marsh',
  'night-marsh',
  'outpost',
  'perimeter',
]);

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

// Match an event/mode to this map via its free-text available_on field.
function availableOnMap(availableOn, mapName) {
  if (!availableOn || !mapName) return false;
  return availableOn.toLowerCase().indexOf(mapName.toLowerCase()) !== -1;
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// --- LAYER 2 (vault/interactive) fetch -----------------------
async function fetchVaultData(slug) {
  var supabase = getServiceClient();
  var [mapRes, attribRes, refRes, vaultRes] = await Promise.all([
    supabase.from('maps').select('*').eq('slug', slug).maybeSingle(),
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

// --- LAYER 1 (game_maps SEO) fetch ---------------------------
async function fetchSeoData(slug) {
  var supabase = getServiceClient();

  var { data: gameMap } = await supabase
    .from('game_maps')
    .select('*')
    .eq('slug', slug)
    .eq('game_slug', 'marathon')
    .eq('verified', true)
    .maybeSingle();

  if (!gameMap) {
    return { gameMap: null, ownZones: [], inheritedZones: [], bosses: [], events: [], modes: [], parentMap: null };
  }

  // Zone slugs: this map, plus the parent if this is a variant.
  var zoneMapSlugs = [slug];
  if (gameMap.variant_of) zoneMapSlugs.push(gameMap.variant_of);

  var [zonesRes, bossesRes, eventsRes, modesRes, parentRes] = await Promise.all([
    supabase.from('game_zones')
      .select('zone_name, zone_type, summary, map_slug')
      .in('map_slug', zoneMapSlugs)
      .eq('game_slug', 'marathon')
      .eq('verified', true)
      .order('zone_name', { ascending: true }),
    supabase.from('game_bosses')
      .select('boss_name, summary, map_slug')
      .eq('map_slug', slug)
      .eq('game_slug', 'marathon')
      .eq('verified', true),
    supabase.from('game_events')
      .select('event_name, event_type, available_on, summary')
      .eq('game_slug', 'marathon')
      .eq('verified', true),
    supabase.from('game_modes')
      .select('mode_name, mode_type, available_on, summary, is_limited_time')
      .eq('game_slug', 'marathon')
      .eq('verified', true),
    gameMap.variant_of
      ? supabase.from('game_maps').select('slug, name').eq('slug', gameMap.variant_of).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  var allZones = zonesRes.data || [];
  var ownZones = allZones.filter(function(z) { return z.map_slug === slug; });
  var inheritedZones = allZones.filter(function(z) { return z.map_slug !== slug; });
  var events = (eventsRes.data || []).filter(function(e) { return availableOnMap(e.available_on, gameMap.name); });
  var modes  = (modesRes.data || []).filter(function(m) { return availableOnMap(m.available_on, gameMap.name); });

  return {
    gameMap: gameMap,
    ownZones: ownZones,
    inheritedZones: inheritedZones,
    bosses: bossesRes.data || [],
    events: events,
    modes: modes,
    parentMap: (parentRes && parentRes.data) ? parentRes.data : null,
  };
}

export async function generateMetadata({ params }) {
  var resolved = await params;
  var slug = resolved.slug;

  // Prefer the SEO (game_maps) row for metadata; fall back to the vault map.
  var supabase = getServiceClient();
  var { data: gameMap } = await supabase
    .from('game_maps').select('name, summary, difficulty, style, best_for')
    .eq('slug', slug).eq('verified', true).maybeSingle();

  var name = null, descSource = null, difficulty = null, style = null;
  if (gameMap) {
    name = gameMap.name; descSource = gameMap.summary; difficulty = gameMap.difficulty; style = gameMap.style;
  } else {
    var { data: vaultMap } = await supabase.from('maps').select('name, description, is_published').eq('slug', slug).maybeSingle();
    if (!vaultMap || !vaultMap.is_published) return { title: 'Map Not Found | CyberneticPunks' };
    name = vaultMap.name; descSource = vaultMap.description;
  }

  if (!name) return { title: 'Map Not Found | CyberneticPunks' };

  var title = 'Marathon ' + name + ' - Map Guide, Zones & Boss';
  var lead = [];
  if (difficulty) lead.push(difficulty + ' difficulty');
  if (style) lead.push(style);
  var leadStr = lead.length ? ' (' + lead.join(', ') + ')' : '';
  var desc = ('Marathon ' + name + leadStr + ' - '
    + (descSource ? descSource.slice(0, 110) + ' ' : '')
    + 'Zones, boss, events, and what to expect on ' + name + '.').slice(0, 300);

  return {
    title: title,
    description: desc,
    alternates: { canonical: 'https://cyberneticpunks.com/maps/' + slug },
    openGraph: {
      title: title + ' | CyberneticPunks',
      description: desc,
      url: 'https://cyberneticpunks.com/maps/' + slug,
      siteName: 'CyberneticPunks',
      type: 'website',
      images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: 'Marathon ' + name + ' - Map Guide', description: desc.slice(0, 180) },
  };
}

export default async function MapPage({ params, searchParams }) {
  var resolved = await params;
  var resolvedSearch = (await searchParams) || {};
  var slug = resolved.slug;

  // Fetch BOTH layers in parallel.
  var [seo, vault] = await Promise.all([
    fetchSeoData(slug),
    fetchVaultData(slug),
  ]);

  var gameMap = seo.gameMap;
  var vaultMap = vault.map;

  // Render if the map exists in EITHER system; 404 only when both are empty.
  if (!gameMap && !vaultMap) notFound();

  // --- LAYER 2 GATE: vault content only when published or valid preview key.
  var vaultVisible = false;
  var isVaultPreview = false;
  if (vaultMap) {
    if (vaultMap.is_published) {
      vaultVisible = true;
    } else {
      var providedKey = resolvedSearch.preview || '';
      var expectedKey = process.env.MAPS_PREVIEW_KEY || '';
      if (expectedKey && providedKey === expectedKey) {
        vaultVisible = true;
        isVaultPreview = true;
      }
    }
  }

  var vaults = vaultVisible ? vault.vaults : [];
  var reference = vaultVisible ? vault.reference : [];
  var attribution = vaultVisible ? vault.attribution : [];

  // Split reference into mechanics vs credential routes (cred-* keys).
  var credentialRoutes = reference.filter(function(r) { return (r.section_key || '').indexOf('cred-') === 0; });
  var mechanics = reference.filter(function(r) { return (r.section_key || '').indexOf('cred-') !== 0; });

  // --- PAGE SHELL: prefer game_maps (SEO backbone), fall back to vault map.
  var displayName = (gameMap && gameMap.name) || (vaultMap && vaultMap.name) || slug;
  var displaySummary = (gameMap && gameMap.summary) || (vaultMap && vaultMap.description) || null;

  var ownZones = seo.ownZones;
  var inheritedZones = seo.inheritedZones;
  var bosses = seo.bosses;
  var events = seo.events;
  var modes = seo.modes;
  var parentMap = seo.parentMap;
  var zoneCount = ownZones.length + inheritedZones.length;

  // --- FAQ ITEMS (also feed FAQPage JSON-LD) -------------------
  var faqItems = [];
  if (bosses.length > 0) {
    faqItems.push({
      q: 'Who is the boss on ' + displayName + ' in Marathon?',
      a: 'The boss on ' + displayName + ' is ' + bosses.map(function(b) { return b.boss_name; }).join(' and ') + '.'
        + (bosses[0].summary ? ' ' + bosses[0].summary : ''),
    });
  }
  if (zoneCount > 0) {
    faqItems.push({
      q: 'What zones are on ' + displayName + '?',
      a: displayName + ' has ' + zoneCount + ' zone' + (zoneCount !== 1 ? 's' : '') + ': '
        + ownZones.concat(inheritedZones).map(function(z) { return z.zone_name; }).join(', ') + '.',
    });
  }
  if (gameMap && gameMap.difficulty) {
    faqItems.push({
      q: 'How hard is ' + displayName + ' in Marathon?',
      a: displayName + ' is rated ' + gameMap.difficulty + ' difficulty.'
        + (gameMap.best_for ? ' Best for: ' + gameMap.best_for + '.' : ''),
    });
  }

  // --- JSON-LD (SEO layer) -------------------------------------
  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Maps', item: 'https://cyberneticpunks.com/maps' },
      { '@type': 'ListItem', position: 3, name: displayName, item: 'https://cyberneticpunks.com/maps/' + slug },
    ],
  };

  var mapProps = [];
  if (gameMap && gameMap.difficulty)       mapProps.push({ '@type': 'PropertyValue', name: 'Difficulty', value: gameMap.difficulty });
  if (gameMap && gameMap.style)            mapProps.push({ '@type': 'PropertyValue', name: 'Style', value: gameMap.style });
  if (gameMap && gameMap.player_structure) mapProps.push({ '@type': 'PropertyValue', name: 'Player Structure', value: gameMap.player_structure });
  if (zoneCount > 0)                       mapProps.push({ '@type': 'PropertyValue', name: 'Zones', value: zoneCount });

  var mapEntity = {
    '@type': 'Place',
    name: displayName,
    description: displaySummary || ('A map in Marathon, Bungie\'s extraction shooter.'),
  };
  if (mapProps.length > 0) mapEntity.additionalProperty = mapProps;

  var webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Marathon ' + displayName + ' - Map Guide',
    description: 'Zones, boss, events, and modes for ' + displayName + ' in Marathon.',
    url: 'https://cyberneticpunks.com/maps/' + slug,
    mainEntity: mapEntity,
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
  };
  if (gameMap && gameMap.updated_at) webPageSchema.dateModified = gameMap.updated_at;

  var faqSchema = faqItems.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(function(item) {
      return { '@type': 'Question', name: item.q, acceptedAnswer: { '@type': 'Answer', text: item.a } };
    }),
  } : null;

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <style>{`
        .mp-card { transition: background 0.12s, border-color 0.12s, transform 0.12s; }
        .mp-card:hover { background: #1e2228 !important; transform: translateY(-1px); }
        .mp-link:hover { background: #1e2228 !important; }
      `}</style>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      {isVaultPreview && (
        <div style={{ background: GOLD, color: '#000', textAlign: 'center', padding: '6px 12px', fontFamily: 'monospace', fontSize: 11, fontWeight: 800, letterSpacing: 2 }}>
          PREVIEW MODE — INTERACTIVE/VAULT LAYER IS UNPUBLISHED AND NOT PUBLICLY VISIBLE
        </div>
      )}

      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li><Link href="/maps" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>MAPS</Link></li>
          <li>/</li>
          <li style={{ color: CYAN }}>{(displayName || '').toUpperCase()}</li>
        </ol>
      </nav>

      {/* hero (SEO backbone) */}
      <section style={{ padding: '24px 24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        {MAP_HERO_SLUGS.has(slug) && (
          <div style={{ marginBottom: 20, borderRadius: 4, overflow: 'hidden', border: '1px solid ' + BORDER }}>
            <img
              src={'/images/maps/' + slug + '.png'}
              alt={displayName + ' map'}
              style={{ display: 'block', width: '100%', height: 'auto', maxHeight: 360, objectFit: 'cover' }}
            />
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: CYAN, background: CYAN + '14', border: '1px solid ' + CYAN + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
            MAP INTEL
          </span>
          {gameMap && gameMap.difficulty && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: CYAN, background: CYAN + '14', border: '1px solid ' + CYAN + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
              {gameMap.difficulty.toUpperCase()}
            </span>
          )}
          {gameMap && gameMap.style && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
              {gameMap.style.toUpperCase()}
            </span>
          )}
          {gameMap && gameMap.player_structure && (
            <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.04)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
              {gameMap.player_structure.toUpperCase()}
            </span>
          )}
        </div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.05, margin: '0 0 16px', color: CYAN }}>
          {(displayName || '').toUpperCase()}
        </h1>
        {parentMap && (
          <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 12, fontWeight: 700 }}>
            VARIANT OF <Link href={'/maps/' + parentMap.slug} style={{ color: CYAN, textDecoration: 'none' }}>{(parentMap.name || '').toUpperCase()}</Link>
          </div>
        )}
        {displaySummary && (
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 760, margin: '0 0 12px' }}>
            {displaySummary}
          </p>
        )}
        {gameMap && gameMap.best_for && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            <span style={{ color: CYAN, fontWeight: 700, fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5 }}>BEST FOR: </span>{gameMap.best_for}
          </div>
        )}
      </section>

      {/* ===== LAYER 1: SEO REFERENCE CONTENT (game_maps) ===== */}

      {/* BOSS */}
      {bosses.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <SectionHeader label="BOSS" color={CONTRABAND} />
          {bosses.map(function(b, i) {
            return (
              <div key={i} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + CONTRABAND, borderRadius: '0 2px 2px 0', padding: '18px 22px', marginBottom: 8 }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 800, color: CONTRABAND, marginBottom: 6 }}>{b.boss_name}</div>
                {b.summary && <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{b.summary}</p>}
              </div>
            );
          })}
        </section>
      )}

      {/* ZONES */}
      {zoneCount > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <SectionHeader label={'ZONES (' + zoneCount + ')'} color={CYAN} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {ownZones.map(function(z, i) { return <ZoneCard key={'o' + i} zone={z} />; })}
            {inheritedZones.map(function(z, i) { return <ZoneCard key={'i' + i} zone={z} inherited parentName={parentMap ? parentMap.name : null} />; })}
          </div>
        </section>
      )}

      {/* EVENTS */}
      {events.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <SectionHeader label="EVENTS" color={GHOST} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {events.map(function(e, i) {
              return (
                <div key={i} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + GHOST, borderRadius: '0 0 2px 2px', padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: GHOST, marginBottom: 4 }}>{e.event_name}</div>
                  {e.event_type && <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>{e.event_type}</div>}
                  {e.summary && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: 0 }}>{e.summary}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MODES */}
      {modes.length > 0 && (
        <section style={{ padding: '0 24px 40px', maxWidth: 1100, margin: '0 auto' }}>
          <SectionHeader label="GAME MODES" color="#ff8800" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {modes.map(function(m, i) {
              return (
                <div key={i} style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid #ff8800', borderRadius: '0 0 2px 2px', padding: '14px 16px' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#ff8800', marginBottom: 4 }}>
                    {m.mode_name}{m.is_limited_time ? ' (LTM)' : ''}
                  </div>
                  {m.summary && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: 0 }}>{m.summary}</p>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== LAYER 2: INTERACTIVE / VAULT (maps) - premium, gated ===== */}

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

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
                    {v.batteries_total != null && (
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '3px 8px', letterSpacing: 0.5 }}>
                        {v.batteries_total} BATTERIES
                      </span>
                    )}
                    {v.requires_cryo_coolant && (
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: CYAN, background: CYAN + '12', border: '1px solid ' + CYAN + '40', borderRadius: 2, padding: '3px 8px', letterSpacing: 0.5 }}>
                        CRYO COOLANT
                      </span>
                    )}
                    {v.credentials_required && (
                      <span style={{ fontFamily: 'monospace', fontSize: 9, color: GOLD, background: GOLD + '12', border: '1px solid ' + GOLD + '40', borderRadius: 2, padding: '3px 8px', letterSpacing: 0.5 }}>
                        {v.credentials_required.toUpperCase()}
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

                  {v.bonus_loot && (
                    <div style={{ marginBottom: 10 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, fontWeight: 700 }}>BONUS LOOT</span>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{v.bonus_loot}</div>
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

      <div style={{ padding: '0 24px 56px', maxWidth: 1100, margin: '0 auto' }}>
        <Link href="/maps" style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', fontWeight: 700 }}>
          ← ALL MAPS
        </Link>
      </div>
    </main>
  );
}

function SectionHeader({ label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
      <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: color, letterSpacing: 2, margin: 0, textTransform: 'uppercase' }}>{label}</h2>
      <div style={{ flex: 1, height: 1, background: BORDER_SUBTLE }} />
    </div>
  );
}

function ZoneCard({ zone, inherited, parentName }) {
  return (
    <div style={{ background: CARD_BG, border: '1px solid ' + BORDER, borderTop: '2px solid ' + (inherited ? CYAN + '55' : CYAN), borderRadius: '0 0 2px 2px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: CYAN }}>{zone.zone_name}</div>
        {inherited && parentName && <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', border: '1px solid ' + BORDER, borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700, fontFamily: 'monospace' }}>SHARED</span>}
      </div>
      {zone.zone_type && <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, fontWeight: 700, fontFamily: 'monospace', textTransform: 'uppercase', marginBottom: 6 }}>{zone.zone_type}</div>}
      {zone.summary && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: 0 }}>{zone.summary}</p>}
    </div>
  );
}