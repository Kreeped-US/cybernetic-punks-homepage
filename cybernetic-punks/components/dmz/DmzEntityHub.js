// components/dmz/DmzEntityHub.js
// Shared DMZ entity HUB template (keys / missions / items). CollectionPage +
// ItemList JSON-LD over the table, rendered in the DMZ layout (.dmz-theme).
// Honest empty state when there are no rows (the pre-launch state today).
// Row-count-gated indexing lives in the route's generateMetadata, not here.

import Link from 'next/link';

export default function DmzEntityHub({ entity, rows }) {
  var hubUrl = 'https://cyberneticpunks.com' + entity.routeBase;

  // ItemList only over rows that exist; empty ItemList is omitted (no empty claim).
  var itemListSchema = rows.length > 0 ? {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: entity.hubH1, url: hubUrl,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: rows.map(function (r, i) {
        return { '@type': 'ListItem', position: i + 1, name: r.name, url: hubUrl + '/' + r.slug };
      }),
    },
  } : {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: entity.hubH1, url: hubUrl,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
          <Link href="/dmz" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>DMZ</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{entity.plural.toUpperCase()}</span>
        </div>

        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, letterSpacing: 1, color: '#fff', margin: '0 0 12px' }}>
          {entity.hubH1}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 640, margin: '0 0 30px' }}>{entity.hubDesc}</p>

        {rows.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '40px 28px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)', textTransform: 'uppercase', border: '1px solid var(--border)', borderRadius: 2, padding: '4px 10px', marginBottom: 16 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
              Awaiting launch
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 auto', maxWidth: 480, lineHeight: 1.6 }}>{entity.hubEmpty}</p>
            <div style={{ marginTop: 22 }}>
              <Link href="/dmz" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px' }}>
                &larr; DMZ hub
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {rows.map(function (r) {
              var confirmed = r.verified === true;
              return (
                <Link key={r.slug} href={entity.routeBase + '/' + r.slug} style={{ display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '2px solid ' + (confirmed ? 'var(--green)' : '#ffb400'), borderRadius: '0 3px 3px 0', padding: '14px 16px', textDecoration: 'none' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 5 }}>{r.name}</div>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace', color: confirmed ? 'var(--green)' : '#ffb400' }}>
                    {confirmed ? 'Verified' : 'Unconfirmed'}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
