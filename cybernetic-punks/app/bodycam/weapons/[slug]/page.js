// app/bodycam/weapons/[slug]/page.js
// Bodycam per-weapon crawlable page (phase 3, build-order #4). The OTHER half of the builder's SEO
// asset (with the /bodycam/builder frame): a server-rendered page per real Bodycam weapon that
// explains how the attachment system applies to THAT weapon -- the slots it takes, the
// rail->optic mounting rule, and the attributes each part tunes. Mirrors the DMZ per-weapon build
// page + the Marathon weapon-page slug resolution.
//
// EMPTY-TABLES POSTURE: weapon_stats has 20 real Bodycam weapons (honest-null stats), so these
// pages have real keys and real system content NOW. bodycam_attachments is EMPTY, so specific
// compatible parts are "pending" -- NOT fabricated. Per-PART pages (/bodycam/attachments/[slug])
// are DEFERRED until parts are seeded (no slugs to route on an empty table).
//
// SLUG: weapon_stats has no slug column, so the slug is derived from the name via
// entitySlugFor('weapon', name) (the sitemap's source of truth). We resolve IN by fetching the
// Bodycam weapon names and matching the derived slug. ALL reads are scoped game_slug='bodycam'
// (shared table -- an unscoped read would match a Marathon/Wardogs weapon).
//
// bodycam.indexable is false -> robots noindex,follow now; the page is built search-ready so the
// flip surfaces a content-rich page. NO fabricated parts/numbers.

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { entitySlugFor } from '@/lib/coverage';
import { bodycam } from '@/lib/games/bodycam';
import { BODYCAM_SLOTS } from '@/lib/bodycam/slots';

export const dynamic = 'force-dynamic';

const BASE = 'https://cyberneticpunks.com';
const GAME = 'bodycam';
const ACCENT = bodycam.theme.accent; // steel-cyan #3d97b8

const AXES = [
  'Aim-down-sight (ADS) speed', 'Weapon-switch speed', 'Reload speed', 'Horizontal recoil',
  'Vertical recoil', 'Spread / hipfire accuracy', 'Kick', 'Magazine / ammo capacity',
];

// Resolve a URL slug -> the exact Bodycam weapon name (game_slug-scoped). Returns null if no match.
async function resolveWeaponName(slug) {
  const { data } = await supabase.from('weapon_stats').select('name').eq('game_slug', GAME);
  if (!data) return null;
  const match = data.find((w) => entitySlugFor('weapon', w.name) === slug);
  return match ? match.name : null;
}

async function fetchWeapon(name) {
  const { data } = await supabase
    .from('weapon_stats')
    .select('name, category, weapon_type, verified, verified_source, notes')
    .eq('game_slug', GAME).eq('name', name).maybeSingle();
  return data || null;
}

function classOf(w) {
  return w.weapon_type || w.category || 'Weapon';
}

function buildTitle(name) {
  const full = 'Bodycam ' + name + ' Attachments & Build';
  if (full.length <= 60) return full;
  const shorter = 'Bodycam ' + name + ' Attachments';
  return shorter.length <= 60 ? shorter : ('Bodycam ' + name).slice(0, 60);
}

export async function generateMetadata({ params }) {
  const slug = (await params).slug;
  const name = await resolveWeaponName(slug);
  if (!name) return { title: { absolute: 'Bodycam Weapon Not Found' }, robots: { index: false, follow: true } };
  const weapon = await fetchWeapon(name);
  if (!weapon) return { title: { absolute: 'Bodycam Weapon Not Found' }, robots: { index: false, follow: true } };

  const cls = classOf(weapon);
  const url = BASE + '/bodycam/weapons/' + slug;
  const title = buildTitle(name);
  const description =
    'Bodycam ' + name + ' (' + cls + ') attachments and build: the weapon slots it takes, the ' +
    'rail-before-sight mounting rule, and the attributes each part tunes. Compatible parts pending.';
  return {
    title: { absolute: title },
    description,
    // DERIVED honesty gate: noindex while bodycam.indexable is false; ranks the moment it flips.
    robots: bodycam.indexable ? undefined : { index: false, follow: true },
    alternates: { canonical: url },
    openGraph: { title: title + ' | Cybernetic Punks', description, url, siteName: 'Cybernetic Punks', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: 'Bodycam ' + name + ' Attachments', description },
  };
}

export default async function BodycamWeaponPage({ params }) {
  const slug = (await params).slug;
  const name = await resolveWeaponName(slug);
  if (!name) notFound();
  const weapon = await fetchWeapon(name);
  if (!weapon) notFound();

  const cls = classOf(weapon);
  const url = BASE + '/bodycam/weapons/' + slug;

  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Bodycam', item: BASE + '/bodycam' },
      { '@type': 'ListItem', position: 3, name: 'Arsenal', item: BASE + '/bodycam/arsenal' },
      { '@type': 'ListItem', position: 4, name: name, item: url },
    ],
  };
  const webPage = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: buildTitle(name), url,
    isPartOf: { '@type': 'WebSite', name: 'Cybernetic Punks', url: BASE },
  };

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '44px 16px 64px' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 18, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
          <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
          <Link href="/bodycam" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Bodycam</Link>
          <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
          <Link href="/bodycam/arsenal" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Arsenal</Link>
          <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{name}</span>
        </nav>

        {/* Crawlable H1 + class + intro. */}
        <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: ACCENT, marginBottom: 8 }}>{cls}</div>
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.12, color: '#fff', margin: '0 0 14px' }}>
          Bodycam {name} &mdash; Attachments &amp; Build
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 720, margin: '0 0 12px' }}>
          How Bodycam&rsquo;s attachment system applies to the {name} ({cls}): the slots it takes, the
          rail-before-sight mounting rule, and the attributes each part tunes. Build a loadout in the{' '}
          <Link href="/bodycam/builder" style={{ color: ACCENT, textDecoration: 'none' }}>Bodycam attachment builder</Link>, or
          see the full <Link href="/bodycam/arsenal" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>weapon roster</Link>.
        </p>

        {/* Honest-null stats posture. */}
        <div style={{ background: 'rgba(61,151,184,0.06)', border: '1px solid ' + ACCENT, borderRadius: 4, padding: '13px 15px', margin: '18px 0 30px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: ACCENT, marginBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
            Confirmed weapon &mdash; stats &amp; parts pending
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
            The {name} is confirmed in Bodycam. Its numeric stat values and its specific compatible
            attachments are not published yet, so none are stated here &mdash; they are added only once
            verified in-game. The attachment structure below is the sourced, weapon-agnostic system.
            {weapon.notes ? ' Note: ' + weapon.notes : ''}
          </p>
        </div>

        {/* Attachment slots (from the sourced taxonomy). */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Attachment slots</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 720, margin: '0 0 14px' }}>
          Bodycam weapons expose these attachment slots. The specific parts that fit the {name} are
          published as the roster is verified; the slot structure itself is confirmed:
        </p>
        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(200px, 100%), 1fr))', gap: 8, listStyle: 'none', padding: 0, margin: '0 0 32px' }}>
          {BODYCAM_SLOTS.map((s) => (
            <li key={s.type} style={{ ...card, padding: '11px 14px', borderLeft: '2px solid ' + ACCENT, borderRadius: '0 3px 3px 0' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff' }}>{s.slot}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 3 }}>{s.subtypes !== '-' ? s.subtypes : s.role}</div>
            </li>
          ))}
        </ul>

        {/* Mounting rule. */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Mounting rule: mount a rail before a sight</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 720, margin: '0 0 26px' }}>
          Bodycam gates parts hierarchically: an optic requires an optic mount, and a rail or mount
          provides that slot &mdash; so on the {name}, as on every Bodycam weapon, you mount a rail before
          a sight. A canted optic toggles alongside the primary in the same slot.
        </p>

        {/* Effect axes. */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>What attachments change</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 720, margin: '0 0 14px' }}>
          Attachments tune the {name} across eight attributes. The axes are confirmed; per-part values
          are unpublished, so no numbers are stated here:
        </p>
        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: 8, listStyle: 'none', padding: 0, margin: '0 0 34px' }}>
          {AXES.map((a) => (
            <li key={a} style={{ ...card, padding: '11px 14px', fontSize: 13.5, color: 'var(--text-secondary)' }}>{a}</li>
          ))}
        </ul>

        {/* Cross-links. */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/bodycam/builder" style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#00121a', background: ACCENT, borderRadius: 2, padding: '10px 18px', textDecoration: 'none' }}>
            Open the builder &rarr;
          </Link>
          <Link href="/bodycam/arsenal" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '10px 16px' }}>
            Weapon roster &rarr;
          </Link>
        </div>
      </main>
    </>
  );
}
