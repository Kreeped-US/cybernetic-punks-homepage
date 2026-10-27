// components/dmz/DmzWeaponDetail.js
// /dmz/weapons/[slug] body. Server component, rendered inside the DMZ layout (var(--*) tokens). Shows only what
// the row holds (lib/dmz/weapons.js helpers); a missing value is omitted. Never shows an unlock level.
// JSON-LD: BreadcrumbList + WebPage only; no facts are asserted in structured data.

import Link from 'next/link';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { toISOWithPTOffset } from '@/lib/formatDate';
import {
  WEAPONS_HUB, WEAPON_NOTES, weaponFacts, attachmentTypes, apexOf, apexBlocksText, classRanks, classLabel, weaponTitle, weaponDesc,
} from '@/lib/dmz/weapons';
import { APEX_NOTES } from '@/lib/dmz/weaponApexNotes';

var BASE = 'https://cyberneticpunks.com';
var CARD = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 3, padding: '14px 16px' };
var LABEL = { fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'monospace' };
var H2 = { fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', margin: '28px 0 10px', fontFamily: 'monospace' };
var NOTE = { fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '6px 0 0' };

export default function DmzWeaponDetail({ row, rows, className }) {
  var url = BASE + WEAPONS_HUB.routeBase + '/' + row.slug;
  var facts = weaponFacts(row, className);
  var types = attachmentTypes(row);
  var apex = apexOf(row);
  var blocks = apexBlocksText(apex);
  var mechanic = apex ? APEX_NOTES[row.slug] || null : null;
  var ranks = classRanks(row, rows);
  var cls = classLabel(row, className);
  var note = WEAPON_NOTES[row.slug] || null;
  var confirmed = row.verified === true;
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

      {facts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginTop: 22 }}>
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

      {types.length > 0 ? (
        <section>
          <h2 style={H2}>Attachment types</h2>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{types.join(', ')}</p>
        </section>
      ) : null}

      {apex ? (
        <section>
          <h2 style={H2}>Apex attachment</h2>
          <div style={CARD}>
            <div style={{ fontSize: 15, color: '#fff', fontWeight: 700 }}>{apex.name}</div>
            {mechanic ? <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '8px 0 0' }}>{mechanic}</p> : null}
            {blocks ? <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: '8px 0 0' }}>{blocks}</p> : null}
          </div>
        </section>
      ) : null}

      {siblings.length > 0 ? (
        <section>
          <h2 style={H2}>Other {cls || 'weapons in this class'}</h2>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {siblings.map(function (s) {
              return <li key={s.slug}><Link href={WEAPONS_HUB.routeBase + '/' + s.slug} className="dmz-dossier" style={{ display: 'inline-block', padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 3, fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none' }}>{s.name}</Link></li>;
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
