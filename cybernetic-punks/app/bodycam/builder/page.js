// app/bodycam/builder/page.js
// Bodycam Attachments & Weapon Builder -- the SSR, SEO-first FRAME (phase 3, build-order #2).
//
// The SEO value of the whole builder feature lives HERE (and in the #4 per-weapon/per-part pages),
// NOT in the client widget (client JS is not crawlable). So this is a genuine content-rich page
// about Bodycam's attachment SYSTEM -- the slot taxonomy, the rail->optic mounting rule, the eight
// effect axes, and the size-vs-control design principle -- all server-rendered, all sourced from
// Reissad's Sept 2 2026 "Locked & Loaded" patch + devlog (see docs/bodycam/ATTACHMENT_SEED_SCOPING.md).
//
// Tables are EMPTY (no parts published), so bodycam.indexable is false and this page is NOINDEX for
// now -- but it is built fully search-ready, so the moment indexable flips it ranks a content page,
// not a shell. NO fabricated parts or numbers: the page explains the confirmed system; parts
// populate later. The interactive builder (#3, BodycamBuilderClient over lib/bodycam/mountability)
// is an ENHANCEMENT that mounts where the honest placeholder sits below -- not built in this brief.

import Link from 'next/link';
import { bodycam } from '@/lib/games/bodycam';
import { BODYCAM_SLOTS } from '@/lib/bodycam/slots';
import BodycamBuilderClient from './BodycamBuilderClient';

export const dynamic = 'force-dynamic';

const BASE = 'https://cyberneticpunks.com';
const URL = BASE + '/bodycam/builder';
const ACCENT = bodycam.theme.accent; // steel-cyan #3d97b8, from config

// The confirmed slot taxonomy (docs/bodycam/ATTACHMENT_SEED_SCOPING.md section 2) lives in
// lib/bodycam/slots.js so the crawlable table here and the interactive widget render from ONE
// source. Sourced STRUCTURE only -- categories + subtypes; parts/numbers unpublished (not shown).
const SLOTS = BODYCAM_SLOTS;

// The eight effect axes the system tunes (schema `effects` shape). The AXES are confirmed
// structure; the per-part VALUES are unpublished and are NOT shown (no fabricated numbers).
const AXES = [
  'Aim-down-sight (ADS) speed', 'Weapon-switch speed', 'Reload speed', 'Horizontal recoil',
  'Vertical recoil', 'Spread / hipfire accuracy', 'Kick', 'Magazine / ammo capacity',
];

export function generateMetadata() {
  const title = 'Bodycam Attachments & Weapon Builder';
  const description =
    'How Bodycam’s attachment system works: the weapon slots, the rail-before-sight mounting ' +
    'rules, and the stats each attachment tunes. A weapon builder for Reissad Studio’s tactical FPS.';
  return {
    title,
    description,
    alternates: { canonical: URL },
    // DERIVED honesty gate: noindex while bodycam.indexable is false; flips to indexable
    // automatically when the vertical opens -- and the page is already content-rich, so it ranks
    // immediately (no shell). Mirrors the DMZ per-weapon build page.
    robots: bodycam.indexable ? undefined : { index: false, follow: true },
    openGraph: { title: title + ' - Bodycam', description, url: URL, siteName: 'Cybernetic Punks', type: 'website' },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: title + ' - Bodycam', description },
  };
}

export default function BodycamBuilderPage() {
  // JSON-LD: BreadcrumbList + WebPage only (the house pattern -- A1-clean, no FAQPage).
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'Bodycam', item: BASE + '/bodycam' },
      { '@type': 'ListItem', position: 3, name: 'Attachments & Builder', item: URL },
    ],
  };
  const webPage = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: 'Bodycam Attachments & Weapon Builder',
    url: URL,
    isPartOf: { '@type': 'WebSite', name: 'Cybernetic Punks', url: BASE },
  };

  const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '44px 16px 64px' }}>
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 18, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
          <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
          <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
          <Link href="/bodycam" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Bodycam</Link>
          <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>Attachments &amp; Builder</span>
        </nav>

        {/* Crawlable H1 + intro prose + internal links (the SEO core -- server-rendered). */}
        <h1 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.12, color: '#fff', margin: '0 0 14px' }}>
          Bodycam Attachments &amp; Weapon Builder
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 720, margin: '0 0 12px' }}>
          Bodycam&rsquo;s Gunsmith is a hierarchical attachment system: parts mount into weapon slots,
          and some slots only appear once another part provides them. This page explains how that
          system works &mdash; the slots, the mounting rules, and the stats each attachment tunes &mdash;
          drawn from Reissad Studio&rsquo;s &ldquo;Locked &amp; Loaded&rdquo; patch and devlog. Browse the{' '}
          <Link href="/bodycam/arsenal" style={{ color: ACCENT, textDecoration: 'none' }}>Bodycam weapon roster</Link>{' '}
          or return to the <Link href="/bodycam" style={{ color: 'var(--text-secondary)', textDecoration: 'underline' }}>Bodycam hub</Link>.
        </p>

        {/* Honest posture banner: confirmed structure, values/parts pending. */}
        <div style={{ background: 'rgba(61,151,184,0.06)', border: '1px solid ' + ACCENT, borderRadius: 4, padding: '13px 15px', margin: '18px 0 30px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: ACCENT, marginBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT }} />
            System confirmed &mdash; parts &amp; values pending
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
            The attachment structure below is sourced from the official patch and devlog. Individual
            part names and their numeric stat values are not published yet, so none are stated here &mdash;
            they are added only once verified in-game. The interactive builder activates when the parts
            roster lands.
          </p>
        </div>

        {/* The slot system -- structured, crawlable table. */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>The Bodycam slot system</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 720, margin: '0 0 16px' }}>
          Every weapon exposes a fixed set of attachment slots. Each slot takes one part (an optic
          and its canted secondary being the toggled exception). These are the confirmed slot types:
        </p>
        <div style={{ ...card, overflowX: 'auto', marginBottom: 34 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, minWidth: 520 }}>
            <thead>
              <tr style={{ background: 'var(--bg-nav)', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px', color: 'var(--text-tertiary)', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 800 }}>Slot</th>
                <th style={{ padding: '10px 14px', color: 'var(--text-tertiary)', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 800 }}>Subtypes</th>
                <th style={{ padding: '10px 14px', color: 'var(--text-tertiary)', fontFamily: 'monospace', fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 800 }}>What it is</th>
              </tr>
            </thead>
            <tbody>
              {SLOTS.map(function (s) {
                return (
                  <tr key={s.slot} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '9px 14px', color: '#fff', fontWeight: 700 }}>{s.slot}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{s.subtypes}</td>
                    <td style={{ padding: '9px 14px', color: 'var(--text-secondary)' }}>{s.role}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mounting rules -- the confirmed rail->optic dependency. */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Mounting rules: mount a rail before a sight</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 720, margin: '0 0 12px' }}>
          The Gunsmith gates parts hierarchically: some parts <strong style={{ color: '#fff' }}>provide</strong> a
          mounting slot that others <strong style={{ color: '#fff' }}>require</strong>. The one confirmed
          rule is the sight chain &mdash; an <strong style={{ color: '#fff' }}>optic requires an optic mount</strong>,
          and a <strong style={{ color: '#fff' }}>rail or mount provides that slot</strong>. So you mount a
          rail before a sight; the optic slot only opens once a rail is on the gun. A canted optic
          toggles alongside the primary in the same slot. Other slot orderings are not stated by the
          sources and are not asserted here.
        </p>

        {/* Effect axes -- the eight attributes attachments tune. */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '26px 0 12px' }}>What attachments change</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 720, margin: '0 0 14px' }}>
          Attachments tune a weapon across eight attributes. The axes are confirmed; the specific
          per-part values are unpublished, so no numbers are stated here:
        </p>
        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: 8, listStyle: 'none', padding: 0, margin: '0 0 34px' }}>
          {AXES.map(function (a) {
            return (
              <li key={a} style={{ ...card, padding: '11px 14px', fontSize: 13.5, color: 'var(--text-secondary)', borderLeft: '2px solid ' + ACCENT, borderRadius: '0 3px 3px 0' }}>{a}</li>
            );
          })}
        </ul>

        {/* Size vs control design principle. */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Size vs control</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 720, margin: '0 0 34px' }}>
          Reissad states a consistent trade-off across parts: compact, short, and light parts favor
          faster handling at the cost of stability, while long and heavy parts trade handling for
          more control. This is a stated design principle, not a set of per-part numbers &mdash; exact
          values are added only once verified in-game.
        </p>

        {/* Interactive builder: the crawlable heading + intro stay server-rendered; the widget
            (client) mounts below and drives the interactive slot frame over the resolver. The
            widget receives parts/compatibility as props (empty now -> auto-fills when seeded). */}
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Interactive builder</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 720, margin: '0 0 16px' }}>
          Pick a weapon, mount parts, and watch the dependency slots unlock. The slot structure and
          the mounting rule are live now; per-slot parts activate when the verified roster is published.
        </p>
        <BodycamBuilderClient weapons={[]} attachments={[]} compatibility={[]} accent={ACCENT} />

        {/* Footer cross-links. */}
        <div style={{ marginTop: 30, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/bodycam/arsenal" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px' }}>
            Bodycam weapon roster &rarr;
          </Link>
          <Link href="/bodycam" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px' }}>
            All Bodycam intel &rarr;
          </Link>
        </div>
      </main>
    </>
  );
}
