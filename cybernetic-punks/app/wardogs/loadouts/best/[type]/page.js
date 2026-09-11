// app/wardogs/loadouts/best/[type]/page.js
// Channel B Phase B1 -- WEAPON-TYPE loadout hub ("best assault rifle loadout in Wardogs"). SSR,
// crawlable, INDEXABLE. Computed deterministically from the store (weapon_stats + wardogs_ttk) via the
// SAME solver the tool uses (assembleLoadout), scoped to one weapon_type. Registry-light: which type
// hubs are live is `lib/wardogs/loadoutHubs.js` (only assault-rifle shipped in this proof; a non-shipped
// type notFound()s until fan-out). No DB writes. Provenance attributed; prices honest-null.
//
// FRAMING (hard rule): "fastest time-to-kill" + class caveats -- never an unqualified "best gun" (TTK
// ignores reload/range/recoil/handling; THE READ's CAVEAT says so). SEO lives in the STRUCTURE
// (title/H1/meta/query-shaped URL); THE READ is genuine analysis, front-loaded, NOT keyword-stuffed.

import { cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadLoadoutContext } from '@/lib/wardogs/loadLoadoutContext';
import { assembleLoadout, pickDetail } from '@/lib/wardogs/assembleLoadout';
import { typeHubBySlug, isShippedTypeHub, shippedTypeHubs } from '@/lib/wardogs/loadoutHubs';
import TypeHubResult from '@/components/wardogs/TypeHubResult';
import ViewTracker from '@/components/ViewTracker';

export const dynamic = 'force-dynamic';

const BASE = 'https://cyberneticpunks.com';
const HUB_PLAYSTYLE = 'balanced'; // the neutral canonical ranking for the indexable page

// One store read per request, shared by generateMetadata + the page (force-dynamic -> same request).
const getContext = cache(loadLoadoutContext);

// Compute the type-scoped, solved board. Returns null for an unknown/non-shipped type.
const getHubData = cache(async function getHubData(slug) {
  const hub = typeHubBySlug(slug);
  if (!hub || !hub.shipped) return null;
  const { weapons, ttk } = await getContext();
  const scoped = (weapons || []).filter((w) => w.weapon_type === hub.weaponType);
  const meta = assembleLoadout({ weapons: scoped, ttk }, { careerLevel: null, budget: null, playstyle: HUB_PLAYSTYLE });
  const ranked = ((meta.candidates && meta.candidates.primary) || []).filter((c) => c.rankable && c.score != null);
  const pick = (meta.recommendation && meta.recommendation.primary) || null;
  const runnerUp = ranked.filter((c) => !pick || c.weapon_name !== pick.weapon_name)[0] || null;
  const gapMs = pick && runnerUp && pick.weighted_ttk_ms != null && runnerUp.weighted_ttk_ms != null
    ? Math.round(Math.abs(runnerUp.weighted_ttk_ms - pick.weighted_ttk_ms)) : null;
  // Detail for the runner-up too, so the head-to-head hero card renders its real image + curves
  // (assembleLoadout only builds detail for primary/secondary; the hub's #2 needs the same).
  if (runnerUp) meta.detail.runnerUp = pickDetail(runnerUp, scoped, ttk);
  return { hub, meta, ranked, pick, runnerUp, gapMs };
});

// Deterministic THE READ -- FRONT-LOADS the answer in natural, search-aligned terms (no LLM, no
// keyword-stuffing). Ends with a CAVEAT paragraph -> TheRead renders it as the "THE CATCH" callout.
function buildRead({ hub, pick, runnerUp, gapMs, ranked }) {
  if (!pick) return '';
  const paras = [];
  let lead = 'The best ' + hub.label.toLowerCase() + ' loadout in Wardogs right now is the ' + pick.weapon_name
    + '. It posts the fastest measured time-to-kill of any ' + hub.label.toLowerCase() + ' in the game';
  if (pick.weighted_ttk_ms != null) lead += ' -- about ' + pick.weighted_ttk_ms + 'ms on a balanced profile';
  if (runnerUp && gapMs != null) lead += ', ' + gapMs + 'ms clear of the ' + runnerUp.weapon_name + ', the next-fastest';
  lead += '.';
  paras.push(lead);
  paras.push('That order comes from scoring ' + ranked.length + ' ' + hub.plural
    + ' on measured time-to-kill from community ballistics testing -- not on feel, and not on a spec sheet. '
    + 'Every number traces back to the same attributed data set, so the whole board is comparable like-for-like.');
  paras.push('CAVEAT: Time-to-kill measures raw killing speed at the trigger. It does not weigh reload time, '
    + 'effective range, recoil control, or handling -- a rifle that wins on paper can still lose a fight it '
    + 'cannot keep on target. These figures are attributed to Swoleguy’s testing, not yet Bulkhead-official, '
    + 'and prices are not published, so this ranks on effectiveness alone -- budget filtering switches on when '
    + 'official numbers land.');
  return paras.join('\n\n');
}

export async function generateMetadata({ params }) {
  const { type } = await params;
  const data = await getHubData(type);
  if (!data) return { title: 'Loadout guide not found', robots: { index: false, follow: false } };
  const { hub, pick } = data;
  const title = 'Best ' + hub.label + ' Loadout in Wardogs - Ranked by TTK';
  const description = 'The best ' + hub.label.toLowerCase() + ' loadout in Wardogs, '
    + (pick ? 'led by the ' + pick.weapon_name + ', ' : '')
    + 'ranked by measured time-to-kill from community ballistics testing. See the full board, per-weapon TTK, and the reasoning.';
  const url = BASE + '/wardogs/loadouts/best/' + hub.slug;
  return {
    title: { absolute: title + ' | Cybernetic Punks' },
    description,
    keywords: 'best ' + hub.label.toLowerCase() + ' Wardogs, Wardogs ' + hub.label.toLowerCase() + ' loadout, best Wardogs '
      + hub.plural + ', Wardogs ' + hub.label.toLowerCase() + ' TTK, Wardogs ' + hub.label.toLowerCase() + ' tier list',
    // Indexable: inherits index from the /wardogs subtree (wardogs.indexable). follow always.
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: 'Cybernetic Punks', type: 'article' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title, description },
  };
}

export default async function TypeHubPage({ params }) {
  const { type } = await params;
  if (!isShippedTypeHub(type)) notFound();
  const data = await getHubData(type);
  if (!data || !data.pick) notFound(); // no ranked data -> honest-null: do not publish an empty hub

  const { hub, meta, pick } = data;
  const analysis = buildRead(data);
  const url = BASE + '/wardogs/loadouts/best/' + hub.slug;

  const breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Wardogs', item: BASE + '/wardogs' },
      { '@type': 'ListItem', position: 3, name: 'Loadouts', item: BASE + '/wardogs/loadouts' },
      { '@type': 'ListItem', position: 4, name: 'Best ' + hub.label + ' Loadout', item: url },
    ],
  };
  const itemListLd = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: 'Best ' + hub.plural + ' in Wardogs by time-to-kill',
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    numberOfItems: data.ranked.length,
    itemListElement: data.ranked.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.weapon_name })),
  };

  const otherHubs = shippedTypeHubs().filter((h) => h.slug !== hub.slug);

  return (
    <>
      <ViewTracker slug={'loadouts-best-' + hub.slug} type="hub" gameSlug="wardogs" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />

      {/* Crawlable SSR hero -- breadcrumb + query-matched H1 + front-loaded lead + honesty strip. */}
      <section style={{ background: 'var(--bg-page)', color: '#fff', borderBottom: '1px solid var(--border)', padding: '30px 24px 22px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
            <Link href="/wardogs" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>WARDOGS</Link>
            <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
            <Link href="/wardogs/loadouts" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>LOADOUTS</Link>
            <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
            <span style={{ color: 'var(--text-secondary)' }}>BEST {hub.label.toUpperCase()}</span>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 7px var(--accent-glow)' }} />
            <span style={{ fontSize: 10, letterSpacing: 3, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace' }}>LOADOUT INTEL &middot; {hub.label.toUpperCase()}</span>
          </div>

          <h1 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 900, letterSpacing: '-0.6px', lineHeight: 1.05, margin: '0 0 14px' }}>
            Best {hub.label} Loadout in Wardogs
          </h1>

          <p style={{ fontSize: 'clamp(15px, 1.6vw, 17px)', color: 'var(--text-primary)', lineHeight: 1.6, maxWidth: 730, margin: '0 0 20px', fontWeight: 500 }}>
            The fastest-killing {hub.label.toLowerCase()} in Wardogs is the{' '}
            <span style={{ color: 'var(--accent)', fontWeight: 800 }}>{pick.weapon_name}</span> &mdash; ranked here by
            measured <span style={{ color: 'var(--accent)', fontWeight: 800 }}>time-to-kill</span> across every {hub.label.toLowerCase()} in
            the game, with the reasoning and the full board below. Fastest TTK, not an unqualified &ldquo;best gun.&rdquo;
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
            {[
              { k: 'MEASURED TTK', v: 'Ranked on real time-to-kill from community ballistics testing - not vibes.' },
              { k: 'ATTRIBUTED', v: 'Combat numbers credited to Swoleguy’s testing, not yet Bulkhead-official.' },
              { k: 'PRICES TBD', v: 'No official prices yet, so this ranks by effectiveness - budget filtering activates when they land.' },
            ].map((item) => (
              <div key={item.k} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', borderRadius: '0 3px 3px 0', padding: '11px 13px' }}>
                <div style={{ fontSize: 10, letterSpacing: 1.5, fontWeight: 800, color: 'var(--accent)', fontFamily: 'monospace', marginBottom: 5 }}>
                  <span style={{ marginRight: 6 }}>&#9698;</span>{item.k}
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TypeHubResult
        hub={hub}
        meta={meta}
        analysis={analysis}
        footer={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <Link href="/wardogs/loadouts" style={{ display: 'inline-block', padding: '12px 22px', background: 'var(--accent)', color: 'var(--bg-page)', borderRadius: 2, fontSize: 12, fontWeight: 900, letterSpacing: 1, textDecoration: 'none' }}>
                GENERATE YOUR OWN CUSTOM LOADOUT &rarr;
              </Link>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 8 }}>
                Set your level, budget, and playstyle and the solver builds a full loadout for you.
              </div>
            </div>

            {/* Internal mesh: back to the tool/hub + sibling type hubs (auto-populates on fan-out). */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: 'var(--text-tertiary)', fontWeight: 800, fontFamily: 'monospace', marginBottom: 10 }}>MORE LOADOUT INTEL</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link href="/wardogs/loadouts" style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '7px 12px' }}>
                  Wardogs Loadouts &mdash; the finder
                </Link>
                {otherHubs.map((h) => (
                  <Link key={h.slug} href={'/wardogs/loadouts/best/' + h.slug} style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 3, padding: '7px 12px' }}>
                    Best {h.label} Loadout
                  </Link>
                ))}
              </div>
            </div>
          </div>
        }
      />
    </>
  );
}
