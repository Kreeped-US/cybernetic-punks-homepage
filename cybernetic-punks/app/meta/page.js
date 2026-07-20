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

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Marathon Meta Tier List — Best Weapons & Shells (Live)',
  description: 'Live Marathon meta tier list ranking every weapon and Runner Shell. See what\'s S-tier, A-tier, and what\'s falling — updated throughout the day.',
  keywords: 'Marathon tier list, Marathon meta, Marathon best weapons, Marathon S-tier, Marathon weapons ranked, Marathon shells tier list, best Marathon weapons, Marathon meta tier list, Marathon ranked tier list, Marathon weapon tier list 2026, Marathon top weapons, Marathon top shells, Marathon dominant builds, Marathon meta snapshot, Marathon weapon ranking, what is the meta in Marathon',
  openGraph: {
    title: 'Marathon Meta Tier List — Best Weapons & Shells (Live) | CyberneticPunks',
    description: 'Live Marathon tier list — every weapon and shell ranked. Updated throughout the day.',
    url: 'https://cyberneticpunks.com/meta',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Meta Tier List — Best Weapons & Shells (Live) | CyberneticPunks',
    description: 'Live Marathon tier list — every weapon and shell ranked. Updated throughout the day.',
  },
  alternates: { canonical: 'https://cyberneticpunks.com/meta' },
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
        .select('name, type, tier, trend, note, ranked_note, ranked_tier_solo, ranked_tier_squad, holotag_tier, updated_at')
        // Rook is excluded from tier surfaces entirely: it cannot be selected in
        // ranked, so it does not belong on a tier ladder. NOTE this is the SECOND
        // /meta path -- MetaClient's builder pool was filtered separately. Both
        // needed it.
        .neq('name', 'Rook')
        .order('updated_at', { ascending: false }),
      supabase
        .from('weapon_stats')
        .select('name, weapon_type, ammo_type, damage, fire_rate, range_rating, ranked_viable, firepower_score, accuracy_score, image_filename, verified'),
      supabase
        .from('shell_stats')
        .select('name, role, base_health, base_shield, base_speed, prime_ability_name, tactical_ability_name, passive_ability_name, ranked_tier_solo, ranked_tier_squad, ranked_notes, image_filename, verified'),
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

  // -- JSON-LD SCHEMAS --
  // Built from the live data, so they reflect actual tier list state.

  // Latest tier update timestamp -- gives Google fresh-content signal
  const lastUpdated = metaTiers.length > 0
    ? metaTiers.reduce(function(a, b) { return a.updated_at > b.updated_at ? a : b; }).updated_at
    : new Date().toISOString();

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Meta Tier List', item: 'https://cyberneticpunks.com/meta' },
    ],
  };

  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Marathon Meta Tier List',
    description: 'Live Marathon tier list ranking weapons, shells, and loadouts. Updated throughout the day by AI editors analyzing gameplay, community sentiment, and patch impacts.',
    url: 'https://cyberneticpunks.com/meta',
    dateModified: lastUpdated,
    publisher: {
      '@type': 'Organization',
      name: 'CyberneticPunks',
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

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Marathon Meta Tier List — Top Weapons and Shells',
    description: 'Ranked tier list of Marathon weapons and Runner Shells based on current meta analysis.',
    numberOfItems: sortedForSchema.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: sortedForSchema.map(function(item, i) {
      return {
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        description: (item.tier ? item.tier + '-tier ' : '') + (item.type || 'item') + (item.note ? ' — ' + item.note : ''),
      };
    }),
  };

  // FAQPage schema -- targets the tier query cluster. Answers MIRROR the visible
  // "How this tier list works" section below and are HONEST: tier letters are
  // editor-assigned (NEXUS, daily), NOT human-verified; underlying stats are
  // verified where a badge marks them. Exactly one FAQPage block on the page.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is the best weapon in Marathon right now?',
        acceptedAnswer: { '@type': 'Answer', text: 'The current S-tier picks on the live tier list are the strongest weapons in the meta. Tier letters are assigned by our NEXUS editor and refreshed daily, so check the S-tier section for the up-to-date list rather than a fixed answer.' },
      },
      {
        '@type': 'Question',
        name: 'What does S-tier mean in a Marathon tier list?',
        acceptedAnswer: { '@type': 'Answer', text: 'S-tier marks the strongest, meta-defining weapons and Runner Shells. Tiers run from S (best) down through A, B, C, and D. S and A are the picks that most reliably win engagements in the current meta.' },
      },
      {
        '@type': 'Question',
        name: 'How often is the Marathon tier list updated?',
        acceptedAnswer: { '@type': 'Answer', text: 'It is refreshed throughout the day. Tier letters are reassigned by our NEXUS editor on a daily cadence, and sooner when a balance patch lands. The trend arrow on each entry shows whether it has risen or fallen over the past 48 hours.' },
      },
      {
        '@type': 'Question',
        name: 'Are the Marathon tiers verified?',
        acceptedAnswer: { '@type': 'Answer', text: 'The tier letters are editorial calls assigned by our NEXUS editor from gameplay, community, and patch signals -- they are not human-verified rankings. The underlying weapon and shell stats ARE verified against the live game wherever an entry shows a Stats Verified badge.' },
      },
    ],
  };

  return (
    <main style={{ minHeight: '100vh', background: '#121418', color: '#fff', paddingTop: 48, paddingBottom: 80 }}>
      <ViewTracker slug="meta" type="tool" gameSlug="marathon" />
      {/* JSON-LD Schemas -- render inline so Google sees on first crawl */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }} />
      {sortedForSchema.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

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
        />
      </Suspense>

      {/* HOW THIS TIER LIST WORKS -- server-rendered (crawlable) tier definitions +
          honest methodology + visible FAQ that mirrors the FAQPage schema above.
          Honesty is the moat: tier LETTERS are editor-assigned (NEXUS, daily), NOT
          human-verified; underlying STATS are verified where an entry is badged. */}
      <section aria-labelledby="how-it-works" style={{ maxWidth: 1200, margin: '0 auto', padding: '8px 24px 8px' }}>
        <h2 id="how-it-works" style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: 0.5, margin: '0 0 12px' }}>
          How this tier list works
        </h2>

        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, maxWidth: 760, margin: '0 0 18px' }}>
          Tier letters are assigned by our NEXUS editor and refreshed daily &mdash; sooner when a balance patch lands
          &mdash; from gameplay analysis, community sentiment, and Bungie patch notes. They are editorial calls, not
          human-verified rankings. The underlying weapon and Runner Shell stats are pulled from our verified database:
          an entry marked <strong style={{ color: '#00ff41' }}>Stats Verified</strong> has had its stats confirmed against
          the live game, while <strong style={{ color: '#8a8f99' }}>Stats Unverified</strong> means the numbers are not yet
          confirmed and the tier is an editorial read. The trend arrow shows whether an entry has risen or fallen over the
          past 48 hours.
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
            { q: 'What is the best weapon in Marathon right now?', a: 'The current S-tier picks on the live tier list are the strongest weapons in the meta. Tier letters are assigned by our NEXUS editor and refreshed daily, so check the S-tier section for the up-to-date list rather than a fixed answer.' },
            { q: 'What does S-tier mean in a Marathon tier list?', a: 'S-tier marks the strongest, meta-defining weapons and Runner Shells. Tiers run from S (best) down through A, B, C, and D. S and A are the picks that most reliably win engagements in the current meta.' },
            { q: 'How often is the Marathon tier list updated?', a: 'It is refreshed throughout the day. Tier letters are reassigned by our NEXUS editor on a daily cadence, and sooner when a balance patch lands. The trend arrow on each entry shows whether it has risen or fallen over the past 48 hours.' },
            { q: 'Are the Marathon tiers verified?', a: 'The tier letters are editorial calls assigned by our NEXUS editor from gameplay, community, and patch signals -- they are not human-verified rankings. The underlying weapon and shell stats ARE verified against the live game wherever an entry shows a Stats Verified badge.' },
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
    </main>
  );
}