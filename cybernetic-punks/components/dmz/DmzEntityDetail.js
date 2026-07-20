// components/dmz/DmzEntityDetail.js
// Shared DMZ entity DETAIL template (keys / missions / items). Cloned in
// BEHAVIOUR from app/uniques/[slug]: real-data-only, BreadcrumbList + WebPage
// JSON-LD, FAQPage ONLY when there are real Q&As. Rendered inside the DMZ layout
// (.dmz-theme token swap + DmzNav + disclaimer), so it uses var(--*) tokens, not
// Marathon hex.
//
// HONESTY GATE on `verified`: an unverified row is VISIBLE (datamined-then-pending
// is a real launch state) but clearly marked UNCONFIRMED, and its schema does not
// assert the facts as confirmed. The route sets robots noindex for unverified rows
// (see the route files) so a provisional page never enters the index.

import Link from 'next/link';

export default function DmzEntityDetail({ entity, row, siblings }) {
  var facts = entity.facts(row);
  var pageUrl = 'https://cyberneticpunks.com' + entity.routeBase + '/' + row.slug;
  var confirmed = row.verified === true;

  // ---- JSON-LD (real values only) ----
  var breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'DMZ', item: 'https://cyberneticpunks.com/dmz' },
      { '@type': 'ListItem', position: 3, name: 'DMZ ' + entity.plural, item: 'https://cyberneticpunks.com' + entity.routeBase },
      { '@type': 'ListItem', position: 4, name: row.name, item: pageUrl },
    ],
  };

  // Only emit facts as structured PropertyValues when the row is VERIFIED --
  // unconfirmed data must not be asserted as fact in machine-readable form.
  var props = confirmed ? facts.map(function (f) { return { '@type': 'PropertyValue', name: f.label, value: String(f.value) }; }) : [];
  var thing = { '@type': 'Thing', name: row.name, description: row.description || (entity.singular + ' in DMZ (Modern Warfare 4).') };
  if (props.length > 0) thing.additionalProperty = props;
  var webPage = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: row.name + ' - DMZ ' + entity.singular,
    description: entity.detailDesc(row),
    url: pageUrl, mainEntity: thing,
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
  };

  // FAQ ONLY from real data -- no invented Q&As. Acquisition is the one honest
  // question we can answer from the columns when they are present AND verified.
  var acq = row.acquisition_source ? (row.acquisition_source + (row.acquisition_detail ? ' - ' + row.acquisition_detail : '')) : '';
  var faqItems = [];
  if (confirmed && acq) faqItems.push({ q: 'How do you get the ' + row.name + ' in DMZ?', a: 'The ' + row.name + ' comes from ' + acq + '.' });
  var faqSchema = faqItems.length > 0 ? {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqItems.map(function (i) { return { '@type': 'Question', name: i.q, acceptedAnswer: { '@type': 'Answer', text: i.a } }; }),
  } : null;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPage) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px 96px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
          <Link href="/dmz" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>DMZ</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <Link href={entity.routeBase} style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>{entity.plural.toUpperCase()}</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{row.name.toUpperCase()}</span>
        </div>

        <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 3, fontWeight: 700, marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>
          DMZ {entity.singular}
        </div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: 1, color: '#fff', margin: '0 0 14px', lineHeight: 1.02 }}>
          {row.name}
        </h1>

        {/* HONESTY GATE: unconfirmed banner for unverified rows. */}
        {!confirmed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.35)', borderRadius: 3, padding: '10px 14px', marginBottom: 18 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffb400', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
              <strong style={{ color: '#ffb400', letterSpacing: 1, fontSize: 11 }}>UNCONFIRMED</strong>
              {' '}Not yet verified in-game. Details below are provisional and may change. We do not present them as confirmed.
            </span>
          </div>
        )}
        {confirmed && row.verified_source && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--green)', textTransform: 'uppercase', border: '1px solid var(--border)', borderRadius: 2, padding: '4px 10px', marginBottom: 18 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
            Verified in-game{row.patch_verified ? ' - ' + row.patch_verified : ''}
          </div>
        )}

        {row.description && (
          <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.65, maxWidth: 680, margin: '0 0 26px' }}>{row.description}</p>
        )}

        {/* FACTS (type-specific, present-only) */}
        {facts.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8, marginBottom: 30 }}>
            {facts.map(function (f, i) {
              return (
                <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 3, padding: '14px 16px' }}>
                  <div style={{ fontSize: 9, color: 'var(--text-tertiary)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6, fontFamily: 'monospace' }}>{f.label}</div>
                  <div style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.5 }}>{f.value}</div>
                </div>
              );
            })}
          </div>
        )}

        {acq && (
          <div style={{ marginBottom: 30 }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8, fontFamily: 'monospace' }}>How to get it</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{acq}</div>
          </div>
        )}

        {/* Sibling links -- internal linking, never orphan a detail page. */}
        {siblings && siblings.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginBottom: 10, fontFamily: 'monospace' }}>Other DMZ {entity.plural}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {siblings.map(function (s) {
                return (
                  <Link key={s.slug} href={entity.routeBase + '/' + s.slug} style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 2, padding: '6px 11px', textDecoration: 'none' }}>
                    {s.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 34 }}>
          <Link href={entity.routeBase} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px' }}>
            &larr; All DMZ {entity.plural}
          </Link>
        </div>
      </main>
    </>
  );
}
