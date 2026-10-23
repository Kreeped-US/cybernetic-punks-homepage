// components/dmz/PoiAreaBlock.js
// Optional locations block on a DMZ section page (config: section.poiAreas; /dmz/regions only), rendered by
// app/dmz/[section]/page.js. `rows` are the visible, verified POI rows (lib/dmz/poiAreas.js poiAreaRows),
// grouped by the stored value of cfg.groupBy; group headings show that value exactly as stored. Each location
// links to its page and shows the stored cfg.cardDetail value; no threat level or rank is shown here. Rows with
// no group value are not grouped: they get the config's note, naming the places from the row's neighbors.
// Renders nothing for zero rows. Card styling follows the entity hub cards (components/dmz/DmzEntityHub.js).
//
// IMAGE CARDS (Brief 119): a row whose image_url is a valid image BASE PATH (lib/dmz/entityImage.js, widths
// from the entity config) gets the image behind the card: an absolutely positioned, decorative <img> (alt="",
// the card text names the location), lazy, object-fit cover, with the text on a dark band at the bottom
// (CARD_BAND, measured for contrast against every image). Rows without a valid image keep exactly the
// image-less card. The image credit (entity config) is shown once under the block, only when an image card
// exists; the hover zoom runs only under prefers-reduced-motion: no-preference.

import Link from 'next/link';
import { groupByField, neighborNames, distinctSources, joinNames } from '@/lib/dmz/poiAreas';
import { entityImageSet } from '@/lib/dmz/entityImage';

var EXO = 'var(--font-exo2), system-ui, sans-serif';
var CARD_SIZES = '(max-width: 640px) calc(100vw - 40px), 320px';
// Dark band under the card text: solid from the bottom up to 12px below the band's top, then a 12px fade into
// the image. The band starts 14px above the name, so the text always sits on the solid part.
var CARD_BAND_ALPHA = 0.9;
var CARD_BAND = 'linear-gradient(to top, rgba(7,9,12,' + CARD_BAND_ALPHA + ') 0, rgba(7,9,12,' + CARD_BAND_ALPHA + ') calc(100% - 12px), rgba(7,9,12,0) 100%)';
var CARD_CSS = '.dmz-area-card:focus-visible{outline:2px solid var(--green);outline-offset:2px}'
  + '@media (prefers-reduced-motion: no-preference){.dmz-area-card-img{transition:transform 0.4s ease}'
  + '.dmz-area-card:hover .dmz-area-card-img,.dmz-area-card:focus-visible .dmz-area-card-img{transform:scale(1.04)}}';

export default function PoiAreaBlock({ cfg, entity, rows }) {
  if (!rows || rows.length === 0) return null;
  var grouped = groupByField(rows, cfg.groupBy, 'name');
  var notes = grouped.ungrouped.map(function (r) {
    var places = neighborNames(r, rows);
    return places.length > 0 ? { key: r.slug, text: cfg.noAreaNote(r.name, joinNames(places)) } : null;
  }).filter(Boolean);
  var sources = distinctSources(rows);
  var imageFor = function (r) { return entityImageSet(r.image_url, { widths: entity.imageWidths, sizes: CARD_SIZES }); };
  var anyImage = grouped.groups.some(function (g) { return g.rows.some(function (r) { return !!imageFor(r); }); });
  var size = entity.imageSize || null;
  return (
    <section aria-labelledby="dmz-poi-areas-heading" style={{ margin: '8px 0 36px' }}>
      {anyImage && <style>{CARD_CSS}</style>}
      <h2 id="dmz-poi-areas-heading" style={{ fontFamily: EXO, fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 14px', lineHeight: 1.3 }}>
        {cfg.heading}
      </h2>
      {grouped.groups.map(function (g) {
        return (
          <div key={g.key} style={{ margin: '0 0 18px' }}>
            <h3 style={{ fontFamily: EXO, fontSize: 11, fontWeight: 800, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--green)', margin: '0 0 8px' }}>{g.key}</h3>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 220px), 1fr))', gap: 8 }}>
              {g.rows.map(function (r) {
                var detail = cfg.cardDetail ? r[cfg.cardDetail] : null;
                var img = imageFor(r);
                if (!img) {
                  return (
                    <li key={r.slug}>
                      <Link href={entity.routeBase + '/' + r.slug} style={{ display: 'block', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '2px solid var(--green)', borderRadius: '0 3px 3px 0', padding: '14px 16px', textDecoration: 'none' }}>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: detail ? 5 : 0 }}>{r.name}</div>
                        {detail && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{detail}</div>}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={r.slug}>
                    <Link href={entity.routeBase + '/' + r.slug} className="dmz-area-card" style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 150, overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '2px solid var(--green)', borderRadius: '0 3px 3px 0', textDecoration: 'none' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="dmz-area-card-img" src={img.src} srcSet={img.srcSet} sizes={img.sizes} alt=""
                        width={size ? size.width : undefined} height={size ? size.height : undefined}
                        loading="lazy" decoding="async"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'relative', padding: '26px 16px 14px', background: CARD_BAND }}>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: detail ? 5 : 0 }}>{r.name}</div>
                        {detail && <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{detail}</div>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
      <div style={{ fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.6, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        {notes.map(function (n) { return <p key={n.key} style={{ margin: '0 0 6px' }}>{n.text}</p>; })}
        <p style={{ margin: '0 0 6px' }}>{cfg.threatNote}</p>
        {sources.map(function (s) {
          return (
            <p key={s.label} style={{ margin: '0 0 6px', fontSize: 13 }}>
              {'Source: per '}
              {s.url ? <a href={s.url} rel="noopener" style={{ color: 'var(--green)' }}>{s.label}</a> : s.label}
            </p>
          );
        })}
        {anyImage && entity.imageCredit && (
          <p style={{ margin: '0 0 6px', fontSize: 13 }}>
            {entity.imageCreditUrl
              ? <a href={entity.imageCreditUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--green)' }}>{entity.imageCredit}</a>
              : entity.imageCredit}
          </p>
        )}
      </div>
    </section>
  );
}
