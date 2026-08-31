// app/meta/page.js
// Now includes JSON-LD schemas (BreadcrumbList + WebPage with dateModified + ItemList)
// for rich Google results, expanded keywords, and a visible breadcrumb.
//
// FIXED May 15, 2026: Replaced module-scope createClient with import from
// lib/supabase, which uses a lazy-init Proxy. Module-scope createClient
// throws "supabaseUrl is required" during Next.js 16 build because env
// vars aren't populated when modules are evaluated at build time.
//
// SEO PASS June 1, 2026:
// - Title now leads with searcher intent ("Best Weapons & Shells Ranked")
//   and stays within Google's ~60-char display window.
// - Real em-dash (—) in place of double-hyphen (--), which previously
//   rendered as two literal hyphens in search results.
// - Description tightened to ~140 chars, drops front-facing "AI editors"
//   framing (AI-skeptical audience), adds concrete tier letters.
// - OG and Twitter titles aligned to the same searcher-voice copy.
//
// CADENCE FIX June 2, 2026:
// - Cron cadence is now once daily (19:00 UTC). Replaced all
//   "every 6 hours" claims with cadence-agnostic "throughout the day"
//   to match the homepage and avoid stale-interval claims going forward.

import { Suspense } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import MetaClient from './MetaClient';
import ViewTracker from '@/components/ViewTracker';
import { computeWeaponTiers } from '@/lib/weapons/tierModel';
import { entitySlugFor } from '@/lib/coverage';

export const dynamic = 'force-dynamic';

export const metadata = {
  // Weapon-forward intent (front-load "weapon tier list" / "best weapons"; "meta" is secondary).
  // 54 chars (A2 ceiling 60). Straight hyphen (house style -- the old em-dash was a violation).
  title: 'Best Marathon Weapons - Tier List (Live)',
  description: 'Live Marathon weapon tier list - every weapon and Runner Shell ranked by the numbers. See what\'s S-tier, A-tier, and what\'s falling, updated throughout the day.',
  keywords: 'best Marathon weapons, Marathon weapon tier list, Marathon tier list, Marathon weapons ranked, Marathon S-tier weapons, Marathon best guns, Marathon weapon ranking, Marathon meta tier list, Marathon shells tier list, Marathon top weapons, Marathon weapon tier list 2026, what are the best weapons in Marathon',
  openGraph: {
    title: 'Best Marathon Weapons - Tier List (Live) | Cybernetic Punks',
    description: 'Live Marathon weapon tier list - every weapon and shell ranked by the numbers. Updated throughout the day.',
    url: 'https://cyberneticpunks.com/marathon/meta',
    siteName: 'Cybernetic Punks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Best Marathon Weapons - Tier List (Live) | Cybernetic Punks',
    description: 'Live Marathon weapon tier list - every weapon and shell ranked by the numbers. Updated throughout the day.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/marathon/meta' },
};

export default async function MetaPage() {
  let metaTiers = [];
  let weapons = [];
  let shells = [];
  let modCount = 0;
  let recentPosts = [];

  try {
    const [metaRes, weaponsRes, shellsRes, modsRes, postsRes] = await Promise.all([
      supabase
        .from('meta_tiers')
        .select('name, type, tier, trend, note, updated_at')
        // Rook is excluded from tier surfaces entirely: it cannot be selected in
        // ranked, so it does not belong on a tier ladder. NOTE this is the SECOND
        // /meta path -- MetaClient's builder pool was filtered separately. Both
        // needed it.
        .neq('name', 'Rook')
        .order('updated_at', { ascending: false }),
      supabase
        .from('weapon_stats')
        // Widened for the tier model (Option B: recompute on render). The extra raw fields
        // (precision/magazine/spreads/handling/range) are the computeWeaponTiers inputs; the
        // originals stay for the card display. No DB/cron/DDL change -- same pure lib the cron uses.
        .select('name, weapon_type, ammo_type, damage, fire_rate, precision_multiplier, magazine_size, firepower_score, accuracy_score, hipfire_spread, moving_inaccuracy, crouch_spread_bonus, recoil, ads_speed, weight, equip_speed, reload_speed, aim_assist, range_meters, range_rating, zoom, ranked_viable, image_filename, verified')
        .eq('game_slug', 'marathon'), // scope: weapon_stats is game-shared; the tier model must not pull other games' weapons
      supabase
        .from('shell_stats')
        .select('name, role, base_health, base_shield, prime_ability_name, tactical_ability_name, passive_ability_name, ranked_tier_solo, ranked_tier_squad, ranked_notes, image_filename, verified'),
      supabase.from('mod_stats').select('id', { count: 'exact', head: true }),
      supabase
        .from('feed_items')
        .select('headline, slug, editor, tags, created_at')
        .in('editor', ['NEXUS', 'CIPHER'])
        .eq('is_published', true)
        .eq('game_slug', 'marathon')
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

    metaTiers   = metaRes.data   || [];
    weapons     = weaponsRes.data || [];
    shells      = shellsRes.data  || [];
    modCount    = modsRes.count   || 0;
    recentPosts = postsRes.data   || [];

    // Ranked fields are read from shell_stats (source of truth), not from the
    // mirrored meta_tiers columns being retired (step 3 of the loop fix). Overlay
    // them onto each shell-type tier row so MetaClient renders the source values.
    // Column-name shift: shell_stats.ranked_notes (PLURAL) -> ranked_note
    // (SINGULAR) which is what MetaClient reads. tier/trend/note stay from
    // meta_tiers (genuine editorial).
    var shellRankedByName = {};
    shells.forEach(function(sh) { shellRankedByName[sh.name] = sh; });
    metaTiers = metaTiers.map(function(row) {
      if (row.type !== 'shell') return row;
      var src = shellRankedByName[row.name];
      if (!src) return row;
      return Object.assign({}, row, {
        ranked_tier_solo:  src.ranked_tier_solo || null,
        ranked_tier_squad: src.ranked_tier_squad || null,
        ranked_note:       src.ranked_notes || null,
      });
    });
  } catch (err) {
    console.error('[MetaPage] fetch error:', err);
  }

  // WEAPON TIER MODEL (Option B: recompute on render). The same pure lib the cron uses to WRITE
  // meta_tiers.tier -- so the on-page axis breakdown is consistent with the stored tier, with no
  // DB/cron/DDL change. name -> { tier, band, axes:{firepower,accuracy,handling,range}, unrankable }.
  const weaponModel = {};
  try {
    computeWeaponTiers(weapons).forEach(function (r) {
      weaponModel[r.name] = { tier: r.tier, band: r.band, axes: r.axes, unrankable: r.unrankable };
    });
  } catch (e) {
    console.error('[MetaPage] weapon model compute:', e && e.message);
  }

  // Reflect the model tiers on the page NOW: weapons are model-derived, and the cron persists the
  // SAME values to meta_tiers on its next regrade. Overriding the stored weapon tier with the
  // freshly-computed model tier keeps the flat "By Tier" view, the "By Class" view, the JSON-LD,
  // and the share image all consistent with the model regardless of when the cron last ran (no
  // transient old-vs-new split). Shells + any unrankable weapon keep their stored tier.
  metaTiers = metaTiers.map(function (row) {
    if (row.type !== 'weapon') return row;
    const m = weaponModel[row.name];
    return (m && m.tier) ? Object.assign({}, row, { tier: m.tier }) : row;
  });

  // CRAWLABLE transparency mirror. The interactive By-Class view + axis breakdown (MetaClient)
  // are client-only (gated behind React state), so the "why is X S-tier: Firepower N ..." content
  // -- the long-tail SEO moat -- is invisible to crawlers. This groups the model output by band +
  // tier for a SERVER-RENDERED text version below. Real SSR HTML; reflects the actual model axes
  // (same values the on-click panel shows), so it stays honest.
  const SEO_BANDS = [
    { key: 'Close', label: 'Close Range', note: 'Close-range weapons (shotguns, SMGs) are ranked on burst / per-trigger lethality.' },
    { key: 'Mid', label: 'Mid Range', note: 'Mid-range weapons (assault + precision rifles, pistols) are ranked on sustained DPS, accuracy, and handling.' },
    { key: 'Long', label: 'Long Range', note: 'Long-range weapons (snipers) are ranked on sustained DPS, precision, and handling.' },
    { key: 'Special', label: 'Special', note: 'Power weapons (railguns, LMGs) are ranked on sustained DPS.' },
  ];
  const SEO_TIERS = ['S', 'A', 'B', 'C', 'D'];
  const seoByBand = {};
  weapons.forEach(function (w) {
    const m = weaponModel[w.name];
    if (!m || !m.band || m.band === 'EXCLUDE' || !m.tier) return;
    if (!seoByBand[m.band]) seoByBand[m.band] = {};
    if (!seoByBand[m.band][m.tier]) seoByBand[m.band][m.tier] = [];
    seoByBand[m.band][m.tier].push({ name: w.name, type: w.weapon_type, axes: m.axes || {} });
  });
  const axVal = function (v) { return (v == null) ? 'N/A' : Math.round(v); };

  // -- JSON-LD SCHEMAS --
  // Built from the live data, so they reflect actual tier list state.

  // Latest tier update timestamp. The reduce is a REAL max and is correct
  // regardless of query order -- only the fallback was wrong.
  //
  // The old fallback was `new Date().toISOString()`, and this comment used to read
  // "gives Google fresh-content signal" -- the bug's rationale stated outright.
  // The fallback existed TO guarantee a freshness signal, which is exactly why it
  // was dishonest: with metaTiers empty (an outage, or a failed cron) EVERY meta
  // page would claim modification at crawl time.
  //
  // FAIL CLOSED: null here, dateModified omitted below.
  const lastUpdated = metaTiers.length > 0
    ? metaTiers.reduce(function(a, b) { return a.updated_at > b.updated_at ? a : b; }).updated_at
    : null;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Meta Tier List', item: 'https://cyberneticpunks.com/marathon/meta' },
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Marathon Meta Tier List',
    description: 'Live Marathon tier list ranking weapons, shells, and loadouts. Updated throughout the day by AI editors analyzing gameplay, community sentiment, and patch impacts.',
    url: 'https://cyberneticpunks.com/marathon/meta',
    // dateModified attached below, only when a real date exists.
    publisher: {
      '@type': 'Organization',
      name: 'Cybernetic Punks',
      url:  'https://cyberneticpunks.com',
    },
  };

  // ItemList schema -- the tier list itself, top-tier items first.
  // This is the schema that can produce rich list results in Google Search.
  const tierOrder = { S: 0, A: 1, B: 2, C: 3, D: 4, F: 5 };
  const sortedForSchema = [...metaTiers]
    .filter(function(t) { return t.tier && t.name; })
    .sort(function(a, b) {
      var ta = tierOrder[(a.tier || '').toUpperCase()] ?? 99;
      var tb = tierOrder[(b.tier || '').toUpperCase()] ?? 99;
      return ta - tb;
    })
    .slice(0, 30); // top 30 items only -- schema rewards focused lists

  // Omit rather than emit a stand-in -- see lastUpdated above.
  if (lastUpdated) webPageSchema.dateModified = lastUpdated;

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Best Marathon Weapons - Tier List',
    description: 'Marathon weapons and Runner Shells ranked by the numbers - the current best-weapons tier list.',
    numberOfItems: sortedForSchema.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: sortedForSchema.map(function(item, i) {
      var type = (item.type || '').toLowerCase();
      var url = type === 'weapon'
        ? 'https://cyberneticpunks.com/marathon/weapons/' + entitySlugFor('weapon', item.name)
        : type === 'shell'
          ? 'https://cyberneticpunks.com/marathon/shells/' + entitySlugFor('shell', item.name)
          : null;
      var li = {
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        description: (item.tier ? item.tier + '-tier ' : '') + (item.type || 'item') + (item.note ? ' - ' + item.note : ''),
      };
      // url -> the entity page, so the ranked list links its items (rich-result eligibility).
      if (url) li.url = url;
      return li;
    }),
  };

  // NOTE: NO FAQPage schema. Doctrine A1 bans @type:FAQPage sitewide, so it was removed
  // (2026-08-28). The visible "Frequently asked" prose below stays -- it is fine as page
  // content; only the schema is banned.

  return (
    <main style={{ minHeight: '100vh', background: '#121418', color: '#fff', paddingTop: 48, paddingBottom: 80 }}>
      <ViewTracker slug="meta" type="tool" gameSlug="marathon" />
      {/* JSON-LD Schemas -- render inline so Google sees on first crawl */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {sortedForSchema.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}

      {/* Visible breadcrumb -- semantic nav for accessibility + E-E-A-T signal */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: '#00ff41' }}>META TIER LIST</li>
        </ol>
      </nav>

      <Suspense fallback={null}>
        <MetaClient
          metaTiers={metaTiers}
          weapons={weapons}
          shells={shells}
          modCount={modCount}
          recentPosts={recentPosts}
          weaponModel={weaponModel}
        />
      </Suspense>

      {/* HOW THIS TIER LIST WORKS -- server-rendered (crawlable) tier definitions +
          honest methodology + a visible "Frequently asked" prose block (content only; NO
          FAQPage schema -- doctrine A1). Honesty is the moat: weapon tiers are model-derived,
          shell tiers derive from ranked tiers, and underlying STATS are verified where badged. */}
      <section aria-labelledby="how-it-works" style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 24px 8px' }}>
        <h2 id="how-it-works" style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 0.5, margin: '0 0 12px' }}>
          How this tier list works
        </h2>

        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, maxWidth: 760, margin: '0 0 18px' }}>
          <strong style={{ color: '#fff' }}>Weapon</strong> tiers are ranked by the numbers: each weapon is scored on four
          axes - Firepower, Accuracy, Handling, and Range - derived from its in-game stats and weighted Accuracy 34%,
          Firepower 32%, Handling 18%, Range 16%, then tiered within its weapon class. Tap any weapon for its exact axis
          scores. <strong style={{ color: '#fff' }}>Runner Shell</strong> tiers derive from their ranked-play performance.
          The underlying stats are pulled from our verified database: an entry marked
          <strong style={{ color: '#00ff41' }}> Stats Verified</strong> has had its numbers confirmed against the live game,
          while <strong style={{ color: '#8a8f99' }}>Stats Unverified</strong> means they are not yet confirmed. The trend
          arrow shows whether an entry has risen or fallen over the past 48 hours.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, marginBottom: 22 }}>
          {[
            { t: 'S', d: 'Meta-defining. The strongest picks that most reliably win engagements right now.' },
            { t: 'A', d: 'Excellent. Highly competitive and a safe pick in almost any loadout.' },
            { t: 'B', d: 'Solid. Viable and effective, without defining the meta.' },
            { t: 'C', d: 'Situational. Works in the right hands or specific setups.' },
            { t: 'D', d: 'Outclassed. Currently hard to justify over higher-tier options.' },
          ].map(function(row) {
            return (
              <div key={row.t} style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 6 }}>{row.t}-Tier</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{row.d}</div>
              </div>
            );
          })}
        </div>

        <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: 1, margin: '0 0 10px' }}>
          Frequently asked
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 820 }}>
          {[
            { q: 'What is the best weapon in Marathon right now?', a: 'The current S-tier picks are the strongest weapons in the meta. Weapon tiers are computed from in-game stats (Firepower, Accuracy, Handling, Range) and ranked within each weapon class, so check the S-tier section of each class for the up-to-date best guns rather than a fixed answer.' },
            { q: 'What does S-tier mean in a Marathon tier list?', a: 'S-tier marks the strongest picks in a class. Tiers run from S (best) down through A, B, C, and D. Because weapons are ranked within class, an S-tier shotgun is the best shotgun - not necessarily better than an A-tier rifle.' },
            { q: 'How often is the Marathon tier list updated?', a: 'It is refreshed throughout the day. Weapon tiers recompute from the current stats, and re-rank when a balance patch changes those stats. The trend arrow on each entry shows whether it has risen or fallen over the past 48 hours.' },
            { q: 'How are the Marathon weapon tiers calculated?', a: 'Each weapon is scored 0-100 on four axes - Firepower, Accuracy, Handling, Range - from its in-game stats, weighted Accuracy 34%, Firepower 32%, Handling 18%, Range 16%, then tiered within its weapon class. Tap any weapon for its exact axis scores. Runner Shell tiers derive from ranked-play performance. Underlying stats are verified against the live game wherever an entry shows a Stats Verified badge.' },
          ].map(function(row, i) {
            return (
              <div key={i} style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #00ff41', borderRadius: '0 3px 3px 0', padding: '12px 16px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 5 }}>{row.q}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>{row.a}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BEST WEAPONS BY CLASS -- server-rendered (crawlable) mirror of the interactive By-Class
          view + axis breakdown. Real text + entity links in the SSR HTML so the transparency moat
          ("why is X S-tier: the axis scores") is indexable long-tail. Reflects the live model. */}
      <section aria-labelledby="by-class-breakdown" style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 24px 40px' }}>
        <h2 id="by-class-breakdown" style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 0.5, margin: '24px 0 12px' }}>
          Best Marathon weapons by class
        </h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, maxWidth: 760, margin: '0 0 20px' }}>
          Weapon tiers are ranked <strong style={{ color: '#fff' }}>within weapon class</strong> from the game&apos;s own stats,
          weighted Accuracy 34%, Firepower 32%, Handling 18%, Range 16%. An S-tier shotgun is the best shotgun, not necessarily
          better than an A-tier rifle. Each weapon&apos;s four axis scores (0-100) are shown below.
        </p>

        {SEO_BANDS.map(function (band) {
          const tiers = seoByBand[band.key];
          if (!tiers) return null;
          return (
            <div key={band.key} style={{ marginBottom: 26 }}>
              <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#00ff41', letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 4px' }}>
                {band.label}
              </h3>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '0 0 10px', lineHeight: 1.5 }}>{band.note}</p>
              {SEO_TIERS.map(function (t) {
                const ws = tiers[t];
                if (!ws || !ws.length) return null;
                return (
                  <div key={t} style={{ marginBottom: 10 }}>
                    <h4 style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 800, color: '#fff', letterSpacing: 1, margin: '0 0 5px' }}>
                      {t}-Tier {band.label} weapons
                    </h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {ws.map(function (w) {
                        return (
                          <li key={w.name} style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, marginBottom: 3 }}>
                            <Link href={'/marathon/weapons/' + entitySlugFor('weapon', w.name)} style={{ color: '#fff', fontWeight: 700, textDecoration: 'none' }}>{w.name}</Link>
                            {' - ' + t + '-tier ' + (w.type || 'weapon') + ' in ' + band.label + '. Firepower ' + axVal(w.axes.firepower) + ', Accuracy ' + axVal(w.axes.accuracy) + ', Handling ' + axVal(w.axes.handling) + ', Range ' + axVal(w.axes.range) + '.'}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          );
        })}
      </section>
    </main>
  );
}