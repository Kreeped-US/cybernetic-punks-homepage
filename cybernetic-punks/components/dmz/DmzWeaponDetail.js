// components/dmz/DmzWeaponDetail.js
// /dmz/weapons/[slug] body. Server component, rendered inside the DMZ layout (var(--*) tokens). Shows only what
// the row holds (lib/dmz/weapons.js helpers); a missing value is omitted. Never shows an unlock level.
// Order (Brief 168): header and source lines, the hero image on a spotlight panel, the figures strip, the Gunsmith
// bench (weapons with attachment types only), the Apex card, the in-class ranks, the class links. Launchers and the
// knife (no attachment types, no Apex) get the hero and the figures only.
// JSON-LD: BreadcrumbList + WebPage only; no facts are asserted in structured data.

import Link from 'next/link';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { toISOWithPTOffset } from '@/lib/formatDate';
import {
  WEAPONS_HUB, WEAPON_NOTES, WEAPON_IMAGE, FLAG_LABELS, weaponFacts, apexOf, apexBlocksText, classRanks, classLabel,
  weaponTitle, weaponDesc, weaponFlags, weaponImageSet, weaponImageAlt, slotGrid,
} from '@/lib/dmz/weapons';
import { APEX_NOTES } from '@/lib/dmz/weaponApexNotes';
import { SPOTLIGHT } from './weaponArmoryCss.js';
import WeaponBench, { NO_BLOCKS_STATED } from './WeaponBench.js';

var BASE = 'https://cyberneticpunks.com';
var CARD = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 3, padding: '14px 16px' };
var LABEL = { fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'monospace' };
var H2 = { fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', margin: '28px 0 10px', fontFamily: 'monospace' };
var NOTE = { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '6px 0 0' };
var FLAG = { display: 'inline-block', font: '800 10px/1.2 monospace', letterSpacing: 1.5, textTransform: 'uppercase', color: '#ffb400', border: '1px solid rgba(255,180,0,0.45)', borderRadius: 2, padding: '3px 6px', marginRight: 6 };
var HERO = { position: 'relative', aspectRatio: '2 / 1', width: '100%', borderRadius: 8, overflow: 'hidden', background: SPOTLIGHT, border: '1px solid #243341', boxShadow: '0 0 0 1px rgba(63,125,68,0.25), 0 0 40px rgba(63,125,68,0.14)' };
var HERO_IMG = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: 12 };

export default function DmzWeaponDetail({ row, rows, className }) {
  var url = BASE + WEAPONS_HUB.routeBase + '/' + row.slug;
  var facts = weaponFacts(row, className);
  var apex = apexOf(row);
  var grid = slotGrid(row);
  var mechanic = apex ? APEX_NOTES[row.slug] || null : null;
  var ranks = classRanks(row, rows);
  var cls = classLabel(row, className);
  var note = WEAPON_NOTES[row.slug] || null;
  var flags = weaponFlags(row);
  var confirmed = row.verified === true;
  var img = weaponImageSet(row, WEAPON_IMAGE.heroSizes);
  var siblings = (rows || []).filter(function (r) { return r.class_slug === row.class_slug && r.slug !== row.slug; });

  var breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE },
      { '@type': 'ListItem', position: 2, name: 'DMZ', item: BASE + '/dmz' },
      { '@type': 'ListItem', position: 3, name: 'DMZ Weapons', item: BASE + WEAPONS_HUB.routeBase },
      { '@type': 'ListItem', position: 4, name: row.name, item: url },
    ],
  };
  var webPage = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: weaponTitle(row), description: weaponDesc(row, className), url: url,
    isPartOf: { '@type': 'WebSite', name: 'Cybernetic Punks', url: BASE },
  };
  if (row.updated_at) webPage.dateModified = toISOWithPTOffset(row.updated_at);

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px 96px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webPage) }} />

      <nav aria-label="Breadcrumb" style={{ fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 18, fontFamily: 'monospace' }}>
        <Link href="/dmz" style={{ color: 'inherit', textDecoration: 'none' }}>DMZ</Link>{' / '}
        <Link href={WEAPONS_HUB.routeBase} style={{ color: 'inherit', textDecoration: 'none' }}>Weapons</Link>{' / '}
        <span style={{ color: 'var(--text-secondary)' }}>{row.name}</span>
      </nav>

      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 3, fontWeight: 700, marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>DMZ Weapon</div>
      <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: 1, color: '#fff', margin: '0 0 14px', lineHeight: 1.02 }}>{row.name}</h1>

      {confirmed || flags.length > 0 ? (
        <p style={{ margin: '0 0 12px' }}>
          {confirmed ? <span style={Object.assign({}, FLAG, { color: '#0a0e13', background: '#6cc97e', borderColor: '#6cc97e' })}>Confirmed</span> : null}
          {flags.map(function (f) { return <span key={f} style={FLAG}>{'Source note: ' + FLAG_LABELS[f]}</span>; })}
        </p>
      ) : null}

      {!confirmed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.35)', borderRadius: 3, padding: '10px 14px', marginBottom: 14 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffb400', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
            <strong style={{ color: '#ffb400', letterSpacing: 1, fontSize: 11 }}>UNCONFIRMED</strong>{': '}{WEAPONS_HUB.unconfirmed}
          </span>
        </div>
      )}

      <p style={NOTE}>
        Source: <a href={WEAPONS_HUB.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)' }}>{WEAPONS_HUB.sourceLabel}</a>
      </p>
      <p style={NOTE}>{WEAPONS_HUB.scopeLine}</p>
      {note ? <p style={NOTE}>Note: {note}</p> : null}

      {img ? (
        <figure style={{ margin: '20px 0 0' }}>
          <div style={HERO}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.src} srcSet={img.srcSet} sizes={img.sizes} width={img.width} height={img.height}
              alt={weaponImageAlt(row)} fetchPriority="high" decoding="async" style={HERO_IMG} />
          </div>
          <figcaption style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6 }}>{WEAPON_IMAGE.credit}</figcaption>
        </figure>
      ) : null}

      {facts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 18 }}>
          {facts.map(function (f) {
            return (
              <div key={f.label} style={CARD}>
                <div style={LABEL}>{f.label}</div>
                <div style={{ fontSize: 15, color: '#fff', fontWeight: 600 }}>{f.value}</div>
              </div>
            );
          })}
        </div>
      ) : null}

      <WeaponBench row={row} />

      {apex ? (
        <section>
          <h2 style={H2}>Apex attachment</h2>
          <div style={Object.assign({}, CARD, { borderLeft: '2px solid #ff6a1f' })}>
            <div style={{ fontSize: 15, color: '#fff', fontWeight: 700 }}>{apex.name}</div>
            {mechanic ? <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '8px 0 0' }}>{mechanic}</p> : null}
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '8px 0 0' }}>{grid.blocksStated ? apexBlocksText(apex) : NO_BLOCKS_STATED}</p>
          </div>
        </section>
      ) : null}

      {ranks.length > 0 ? (
        <section>
          <h2 style={H2}>Rank in {cls || 'its class'}</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
            {ranks.map(function (r) {
              return <li key={r.label} style={{ fontSize: 14, color: 'var(--text-secondary)' }}><strong style={{ color: '#fff' }}>{r.label}:</strong> {r.text}</li>;
            })}
          </ul>
          <p style={NOTE}>{WEAPONS_HUB.derivedLabel} Highest value ranks first.</p>
        </section>
      ) : null}

      {siblings.length > 0 ? (
        <section>
          <h2 style={H2}>Other {cls || 'weapons in this class'}</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {siblings.map(function (s) {
              return <li key={s.slug}><Link href={WEAPONS_HUB.routeBase + '/' + s.slug} className="dmz-dossier" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 44, padding: '6px 12px', border: '1px solid var(--border)', borderRadius: 3, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>{s.name}</Link></li>;
            })}
          </ul>
        </section>
      ) : null}

      <p style={{ marginTop: 32, fontSize: 13 }}>
        <Link href={WEAPONS_HUB.routeBase} style={{ color: 'var(--text-secondary)' }}>{'\u2190'} All DMZ weapons</Link>
        {' \u00b7 '}
        <Link href="/dmz" style={{ color: 'var(--text-secondary)' }}>DMZ hub</Link>
      </p>
    </main>
  );
}
