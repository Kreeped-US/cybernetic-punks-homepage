// components/dmz/DmzEntityHub.js
// Shared DMZ entity HUB template (keys / missions / items). CollectionPage +
// ItemList JSON-LD over the table, rendered in the DMZ layout (.dmz-theme).
// Honest empty state when there are no rows (the pre-launch state today).
// Row-count-gated indexing lives in the route's generateMetadata, not here.
// Brief 217: on the hub kit (components/game: HubPageHeader, CutCard, hubKitCss; DMZ values for the --hk-*
// properties from lib/dmz/hubTheme.js), like the other DMZ pages. Same copy, rows, labels, links and order. The
// detail template (DmzEntityDetail) shares no style with this file and is unchanged.

import Link from 'next/link';
import { cookies } from 'next/headers';
import { Exo_2 } from 'next/font/google';
import DmzNotifyStrip from './DmzNotifyStrip';
import CutCard from '@/components/game/CutCard';
import HubPageHeader, { HUB_PAGE_CSS } from '@/components/game/HubPageHeader';
import { HUB_KIT_CSS } from '@/components/game/hubKitCss';
import { DMZ_HUB_VARS } from '@/lib/dmz/hubTheme';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { dmz } from '@/lib/games/dmz';
import { emptyStateCopy, showLaunchNotify } from '@/lib/network/launchCopy';
import { entityImageSet } from '@/lib/dmz/entityImage';
import { depthFloorFields, entityDetailIndexable } from '@/lib/games/entityDepth';
import { IMAGE_CARD_CSS, IMAGE_CARD_TEXT_STYLE, imageCardImgProps } from '@/lib/dmz/imageCard';

// IMAGE CARDS (Brief 120): a row whose image_url is a valid image BASE PATH, on an entity whose config has
// imageWidths (POIs today), gets the shared image-background card (lib/dmz/imageCard.js; same treatment as the
// /dmz/regions cards) with a taller minimum height for its three text lines. Every other card (no image, or an
// entity without imageWidths: keys, missions, items, builds) keeps exactly the plain card. The entity image
// credit renders once under the grid, only when an image card exists.
// Brief 217: both card kinds are kit cut cards (CutCard with href, so the kit's focus ring applies); the image card
// takes its layout from the classes below instead of imageCardLinkStyle (the regions cards keep that style). The
// status accent is a 3px bar (::before, above the image) and the status label is always text, never color alone.
// The status bar (and, on an image card, the absolutely placed image and text band) would cover parts of the kit's
// inset focus ring, so the ring is repeated, same place and color, on a layer above them (::after).
var HUB_CARD_SIZES = '(max-width: 640px) calc(100vw - 40px), 360px';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

// No text under 12px; links and buttons 44px tall (inline text links by vertical padding, which does not move the
// lines); every link that is not a cut card gets a visible focus ring. The
// first two rules tighten the shared header and container on these pages only, so the first card stays high on a phone.
var HUB_CSS = `
.hk .hk-ph-in{padding-top:24px;padding-bottom:24px}
.hk .hk-pw{padding-top:20px}
.ehub-crumb{display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:.14em}
.ehub-crumb-sep{color:var(--hk-mute)}
.hk .ehub-crumb a{padding:0 10px;margin:0 -10px}
.ehub-also{margin:12px 0 0;max-width:640px;font-size:14px;line-height:1.6;color:var(--hk-soft)}
.hk .ehub-also a{padding:14px 0;color:var(--hk-text);text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:3px}
.ehub-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.ehub-ok{--ehub-acc:#6cc97e;--ehub-st:#8fe0a8}
.ehub-unc{--ehub-acc:#ffb400;--ehub-st:#ffb400}
.hk a.ehub-card{position:relative;padding:14px 16px 14px 19px}
.hk a.ehub-card::before{content:"";position:absolute;z-index:1;left:0;top:0;bottom:0;width:3px;background:var(--ehub-acc)}
.hk a.ehub-img{display:flex;flex-direction:column;justify-content:flex-end;min-height:170px;padding:0;overflow:hidden}
.hk a.ehub-card:focus-visible::after{content:"";position:absolute;z-index:2;inset:1px;border:2px solid var(--hk-accent);pointer-events:none}
.ehub-name{margin-bottom:5px;font-size:16px;font-weight:800;line-height:1.25;color:var(--hk-text)}
.ehub-area,.ehub-note{margin-bottom:5px;font-size:13px;line-height:1.4;color:var(--hk-soft)}
.ehub-st{font:700 12px/1.3 monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--ehub-st)}
.ehub-credit{margin:12px 0 0;font-size:13px;line-height:1.6;color:var(--hk-soft)}
.hk .ehub-credit a{padding:14px 0;color:inherit;text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:2px}
.hk-cut.ehub-empty{max-width:760px;padding:40px 28px;text-align:center}
.ehub-empty-h{display:inline-flex;align-items:center;gap:7px;margin-bottom:16px;padding:4px 10px;border:1px solid var(--hk-line);font:700 12px/1.3 monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--hk-soft)}
.ehub-dot{width:5px;height:5px;border-radius:50%;background:var(--hk-soft)}
.ehub-empty-p{max-width:480px;margin:0 auto;font-size:15px;line-height:1.6;color:var(--hk-soft)}
.ehub-back{margin-top:22px}
.hk .ehub-back a{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border:1px solid var(--hk-line);font:700 13px/1 monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--hk-text);text-decoration:none}
.hk a:not(.hk-cut):focus-visible{outline:2px solid var(--hk-accent-text);outline-offset:2px}
`;

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

      <main className={'hk ' + exo2.variable} style={Object.assign({ fontFamily: EXO }, DMZ_HUB_VARS)}>
        <style dangerouslySetInnerHTML={{ __html: HUB_KIT_CSS + HUB_PAGE_CSS + HUB_CSS }} />
        <HubPageHeader
          eyebrow={
            <nav aria-label="Breadcrumb" className="ehub-crumb">
              <Link href="/dmz">DMZ</Link>
              <span className="ehub-crumb-sep">/</span>
              <span>{entity.plural.toUpperCase()}</span>
            </nav>
          }
          title={entity.hubH1}
          intro={entity.hubDesc}
        >
          {/* Optional related-page links (entity.hubLinks; the POI hub only). Plain text links. */}
          {entity.hubLinks && entity.hubLinks.length > 0 && (
            <p className="ehub-also">
              {'See also: '}
              {entity.hubLinks.map(function (l, i) {
                return (
                  <span key={l.href}>
                    {i > 0 ? ' | ' : ''}
                    <Link href={l.href}>{l.label}</Link>
                  </span>
                );
              })}
            </p>
          )}
        </HubPageHeader>

        <div className="hk-pw">
        {/* Launch-notify capture (source-tagged) -- these are ranking browse pages that catch
            launch-surge search traffic. Server-gated on the dismiss cookie (no flash) and on
            showLaunchNotify(dmz) (pre-launch only). */}
        {!notifyDismissed && showLaunchNotify(dmz) && <DmzNotifyStrip source="dmz-entity" />}

        {rows.length === 0 ? (
          <CutCard className="ehub-empty">
            <div className="ehub-empty-h">
              <span className="ehub-dot" />
              {empty.heading}
            </div>
            <p className="ehub-empty-p">{empty.text}</p>
            <div className="ehub-back">
              <Link href="/dmz">
                &larr; DMZ hub
              </Link>
            </div>
          </CutCard>
        ) : (
          <>
          {anyImage && <style>{IMAGE_CARD_CSS}</style>}
          <div className="ehub-grid">
            {rows.map(function (r) {
              var confirmed = r.verified === true;
              var status = confirmed ? 'ehub-ok' : 'ehub-unc';
              var text = (
                <>
                  <div className="ehub-name">{r.name}</div>
                  {/* POI rows with a structured location show it (absent for every other entity). */}
                  {r.area && (
                    <div className="ehub-area">{r.area + (r.territory ? ' (' + r.territory + ')' : '')}</div>
                  )}
                  {/* Optional one-line note from the entity config (keys: the rarity label), only when it returns text. */}
                  {entity.hubCardNote && entity.hubCardNote(r) && (
                    <div data-card-note="" className="ehub-note">{entity.hubCardNote(r)}</div>
                  )}
                  <div className="ehub-st">
                    {confirmed ? (r.source_label && entity.sourcedBadge ? entity.sourcedBadge : 'Verified') : 'Unconfirmed'}
                  </div>
                </>
              );
              var img = imageFor(r);
              if (img) {
                return (
                  <CutCard key={r.slug} href={entity.routeBase + '/' + r.slug} className={'dmz-area-card ehub-card ehub-img ' + status}>
                    {/* alt="" is set inside imageCardImgProps (decorative image); the rule cannot see through the spread. */}
                    {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
                    <img {...imageCardImgProps(img, entity.imageSize || null)} />
                    <div style={IMAGE_CARD_TEXT_STYLE}>{text}</div>
                  </CutCard>
                );
              }
              return (
                <CutCard key={r.slug} href={entity.routeBase + '/' + r.slug} className={'ehub-card ' + status}>
                  {text}
                </CutCard>
              );
            })}
          </div>
          {anyImage && entity.imageCredit && (
            <p className="ehub-credit">
              {entity.imageCreditUrl
                ? <a href={entity.imageCreditUrl} target="_blank" rel="noopener noreferrer">{entity.imageCredit}</a>
                : entity.imageCredit}
            </p>
          )}
          </>
        )}
        </div>
      </main>
    </>
  );
}
