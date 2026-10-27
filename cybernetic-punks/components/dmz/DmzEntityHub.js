// components/dmz/DmzEntityHub.js
// Shared DMZ entity HUB template (keys / missions / items). CollectionPage +
// ItemList JSON-LD over the table, rendered in the DMZ layout (.dmz-theme).
// Honest empty state when there are no rows (the pre-launch state today).
// Row-count-gated indexing lives in the route's generateMetadata, not here.

import Link from 'next/link';
import { cookies } from 'next/headers';
import DmzNotifyStrip from './DmzNotifyStrip';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { dmz } from '@/lib/games/dmz';
import { emptyStateCopy, showLaunchNotify } from '@/lib/network/launchCopy';
import { entityImageSet } from '@/lib/dmz/entityImage';
import { depthFloorFields, entityDetailIndexable } from '@/lib/games/entityDepth';
import { IMAGE_CARD_CSS, IMAGE_CARD_TEXT_STYLE, imageCardLinkStyle, imageCardImgProps } from '@/lib/dmz/imageCard';

// IMAGE CARDS (Brief 120): a row whose image_url is a valid image BASE PATH, on an entity whose config has
// imageWidths (POIs today), gets the shared image-background card (lib/dmz/imageCard.js; same treatment as the
// /dmz/regions cards) with a taller minimum height for its three text lines. Every other card (no image, or an
// entity without imageWidths: keys, missions, items, builds) keeps exactly the plain card. The entity image
// credit renders once under the grid, only when an image card exists.
var HUB_CARD_SIZES = '(max-width: 640px) calc(100vw - 40px), 360px';
var HUB_IMAGE_CARD_MIN_HEIGHT = 170;

// async so it can server-gate the launch-notify strip on the dmz_notify_dismissed cookie (same
// no-flash pattern the article page uses). Only rendered in force-dynamic DMZ pages, so the
// per-request cookie read is fine. Covers the entity hubs AND the /dmz/builds hub (which reuses this).
export default async function DmzEntityHub({ entity, rows }) {
  var notifyDismissed = ((await cookies()).get('dmz_notify_dismissed') || {}).value === '1';
  var hubUrl = 'https://cyberneticpunks.com' + entity.routeBase;
  // Empty-state copy flips on isGameLive(dmz) (shared, game-agnostic): the dated pre-launch line
  // until launch, then a 0-row-true "live, verified entries added as confirmed" line.
  var empty = emptyStateCopy(dmz, entity.plural, entity.hubEmpty);
  var imageFor = function (r) { return entityImageSet(r.image_url, { widths: entity.imageWidths, sizes: HUB_CARD_SIZES }); };
  var anyImage = rows.some(function (r) { return !!imageFor(r); });

  // ItemList only over rows that exist; empty ItemList is omitted (no empty claim).
  var itemListSchema = rows.length > 0 ? {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: entity.hubH1, url: hubUrl,
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: rows.map(function (r, i) {
        // Brief 180: an entity with a depth floor lists a detail url only for indexable detail pages; the
        // others keep their name (the hub still lists every row). Entities without a floor are unchanged.
        var withUrl = depthFloorFields(entity).length === 0 || entityDetailIndexable(entity, r);
        return withUrl ? { '@type': 'ListItem', position: i + 1, name: r.name, url: hubUrl + '/' + r.slug } : { '@type': 'ListItem', position: i + 1, name: r.name };
      }),
    },
  } : {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: entity.hubH1, url: hubUrl,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListSchema) }} />

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px 96px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 12, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
          <Link href="/dmz" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>DMZ</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{entity.plural.toUpperCase()}</span>
        </div>

        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, letterSpacing: 1, color: '#fff', margin: '0 0 12px' }}>
          {entity.hubH1}
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 640, margin: entity.hubLinks && entity.hubLinks.length ? '0 0 12px' : '0 0 30px' }}>{entity.hubDesc}</p>
        {/* Optional related-page links (entity.hubLinks; the POI hub only). Plain text links. */}
        {entity.hubLinks && entity.hubLinks.length > 0 && (
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 640, margin: '0 0 30px' }}>
            {'See also: '}
            {entity.hubLinks.map(function (l, i) {
              return (
                <span key={l.href}>
                  {i > 0 ? ' | ' : ''}
                  <Link href={l.href} style={{ color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{l.label}</Link>
                </span>
              );
            })}
          </p>
        )}

        {/* Launch-notify capture (source-tagged) -- these are ranking browse pages that catch
            launch-surge search traffic. Server-gated on the dismiss cookie (no flash) and on
            showLaunchNotify(dmz) (pre-launch only). */}
        {!notifyDismissed && showLaunchNotify(dmz) && <DmzNotifyStrip source="dmz-entity" />}

        {rows.length === 0 ? (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '40px 28px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text-tertiary)', textTransform: 'uppercase', border: '1px solid var(--border)', borderRadius: 2, padding: '4px 10px', marginBottom: 16 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
              {empty.heading}
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 auto', maxWidth: 480, lineHeight: 1.6 }}>{empty.text}</p>
            <div style={{ marginTop: 22 }}>
              <Link href="/dmz" style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px' }}>
                &larr; DMZ hub
              </Link>
            </div>
          </div>
        ) : (
          <>
          {anyImage && <style>{IMAGE_CARD_CSS}</style>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
            {rows.map(function (r) {
              var confirmed = r.verified === true;
              var accent = confirmed ? 'var(--green)' : '#ffb400';
              var text = (
                <>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 5 }}>{r.name}</div>
                  {/* POI rows with a structured location show it (absent for every other entity). */}
                  {r.area && (
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>{r.area + (r.territory ? ' (' + r.territory + ')' : '')}</div>
                  )}
                  {/* Optional one-line note from the entity config (keys: the rarity label), only when it returns text. */}
                  {entity.hubCardNote && entity.hubCardNote(r) && (
                    <div data-card-note="" style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 5 }}>{entity.hubCardNote(r)}</div>
                  )}
                  <div style={{ fontSize: 9, letterSpacing: 1.5, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace', color: accent }}>
                    {confirmed ? (r.source_label && entity.sourcedBadge ? entity.sourcedBadge : 'Verified') : 'Unconfirmed'}
                  </div>
                </>
              );
              var img = imageFor(r);
              if (img) {
                return (
                  <Link key={r.slug} href={entity.routeBase + '/' + r.slug} className="dmz-area-card" style={imageCardLinkStyle(HUB_IMAGE_CARD_MIN_HEIGHT, accent)}>
                    {/* alt="" is set inside imageCardImgProps (decorative image); the rule cannot see through the spread. */}
                    {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                    <img {...imageCardImgProps(img, entity.imageSize || null)} />
                    <div style={IMAGE_CARD_TEXT_STYLE}>{text}</div>
                  </Link>
                );
              }
              return (
                <Link key={r.slug} href={entity.routeBase + '/' + r.slug} style={{ display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '2px solid ' + accent, borderRadius: '0 3px 3px 0', padding: '14px 16px', textDecoration: 'none' }}>
                  {text}
                </Link>
              );
            })}
          </div>
          {anyImage && entity.imageCredit && (
            <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.6 }}>
              {entity.imageCreditUrl
                ? <a href={entity.imageCreditUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)' }}>{entity.imageCredit}</a>
                : entity.imageCredit}
            </p>
          )}
          </>
        )}
      </main>
    </>
  );
}
