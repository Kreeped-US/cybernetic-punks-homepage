// components/dmz/DmzEntityDetail.js
// Shared DMZ entity DETAIL template (keys / missions / items). Cloned in
// BEHAVIOUR from app/uniques/[slug]: real-data-only, BreadcrumbList + WebPage
// JSON-LD only, no FAQPage JSON-LD (doctrine A1). Rendered inside the DMZ layout
// (.dmz-theme token swap + DmzNav + disclaimer), so it uses var(--*) tokens, not
// Marathon hex.
//
// HONESTY GATE on `verified`: an unverified row is VISIBLE (datamined-then-pending
// is a real launch state) but clearly marked UNCONFIRMED, and its schema does not
// assert the facts as confirmed. The route sets robots noindex for unverified rows
// (see the route files) so a provisional page never enters the index.

import Link from 'next/link';
import { cookies } from 'next/headers';
import { toISOWithPTOffset } from '@/lib/formatDate';
import { verifiedBadgeLabel } from '@/lib/verification';
import DmzNotifyStrip from './DmzNotifyStrip';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { dmz } from '@/lib/games/dmz';
import { showLaunchNotify } from '@/lib/network/launchCopy';
import { entityImageSet, absoluteImageUrl } from '@/lib/dmz/entityImage';
import { HERO_OVERLAY_STANDARD } from '@/lib/games/heroOverlays';

// Content column of the detail page (main maxWidth 1000 minus 2 x 20px padding): the widest the hero can be.
var CONTENT_WIDTH = 960;
// Hero frame shape: wide on desktop, taller on narrow screens. Only rendered with an image.
var HERO_CSS = '.dmz-entity-hero-frame{aspect-ratio:16/7}@media (max-width:640px){.dmz-entity-hero-frame{aspect-ratio:4/3}}';

// async so it can server-gate the launch-notify strip on the dmz_notify_dismissed cookie (no-flash,
// same as the article page). Entity detail pages are force-dynamic, so the cookie read is fine.
// Anchor id for a named place (stable, ASCII): "Heavenly Luck Casino" -> "heavenly-luck-casino".
function placeId(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

var sectionLabel = { fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginBottom: 10, fontFamily: 'monospace' };

// `related` (optional): rows this one names as nearby (POIs only). Structured POI fields (area,
// territory, threat_levels, sub_locations, source_label/source_url) render ONLY when present, so
// keys/missions/items and older POI rows render exactly as before.
export default async function DmzEntityDetail({ entity, row, siblings, related }) {
  var notifyDismissed = ((await cookies()).get('dmz_notify_dismissed') || {}).value === '1';
  var facts = entity.facts(row);
  var threats = Array.isArray(row.threat_levels) ? row.threat_levels.filter(function (t) { return t && t.name && t.level; }) : [];
  var places = Array.isArray(row.sub_locations) ? row.sub_locations.filter(function (p) { return p && p.name; }) : [];
  var pageNote = entity.pageNotes && entity.pageNotes[row.slug] ? entity.pageNotes[row.slug] : null;
  var pageUrl = 'https://cyberneticpunks.com' + entity.routeBase + '/' + row.slug;
  var confirmed = row.verified === true;
  // Patch label parsed from verified_source when a launch flip stamps it as
  // 'game-verified@<patch>' (no schema column -- verified_source is the one source).
  var vpatch = (row.verified_source && row.verified_source.indexOf('game-verified@') === 0)
    ? row.verified_source.slice('game-verified@'.length)
    : null;

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
  // additionalProperty is a schema.org property of Product/Place (not Thing), so the entity's
  // schemaType drives a VALID type: POIs -> Place, item-like entities -> Product (default).
  var thing = { '@type': entity.schemaType || 'Product', name: row.name, description: row.description || (entity.singular + ' in DMZ (Modern Warfare 4).') };
  if (props.length > 0) thing.additionalProperty = props;
  var webPage = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: row.name + ' - DMZ ' + entity.singular,
    description: entity.detailDesc(row),
    url: pageUrl, mainEntity: thing,
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
  };
  // FRESHNESS (four-entity: keys/missions/items/pois). Emit dateModified ONLY when
  // the row carries updated_at. All four tables have updated_at NOT NULL, so this
  // fires for every real row; the guard is both belt-and-suspenders AND load-bearing
  // -- toISOWithPTOffset(null) returns '', which is as invalid in JSON-LD as null, so
  // the omit must key on row presence here, never on the helper. No new Date()
  // fallback: an undated row omits its dateModified, it never guesses "now".
  if (row.updated_at) webPage.dateModified = toISOWithPTOffset(row.updated_at);

  // HERO IMAGE. row.image_url is a BASE PATH ('<base>-<width>.webp' per entity.imageWidths; see
  // lib/dmz/entityImage.js). An invalid base, or an entity without imageWidths, renders no image, so rows
  // without an image (and every keys/missions/items row) keep exactly today's markup. The hero is capped at
  // the largest variant's width (never upscaled) and centered when that is narrower than the column.
  var heroSet = entityImageSet(row.image_url, { widths: entity.imageWidths });
  if (heroSet) {
    var heroCap = Math.min(heroSet.width, CONTENT_WIDTH);
    heroSet.sizes = '(max-width: ' + (heroCap + 40) + 'px) calc(100vw - 40px), ' + heroCap + 'px';
    thing.image = absoluteImageUrl(row.image_url, heroSet.width, 'https://cyberneticpunks.com');
  }

  // FAQ ONLY from real data -- no invented Q&As. Acquisition is the one honest
  // question we can answer from the columns when they are present AND verified.
  var acq = row.acquisition_source ? (row.acquisition_source + (row.acquisition_detail ? ' - ' + row.acquisition_detail : '')) : '';
  // Header group (type label, H1, source/UNCONFIRMED badges). Rendered ONCE: in normal flow without a hero,
  // or over the bottom of the hero image with one (no duplicated heading in the DOM).
  var header = (
    <>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 3, fontWeight: 700, marginBottom: 6, fontFamily: 'monospace', textTransform: 'uppercase' }}>
        DMZ {entity.singular}
      </div>
      <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 900, letterSpacing: 1, color: '#fff', margin: '0 0 14px', lineHeight: 1.02 }}>
        {row.name}
      </h1>

      {/* HONESTY GATE: unconfirmed banner for unverified rows. Provenance is the
          DB row's verified_source (single source of truth) followed by a static
          provisional tail; if verified_source is null, the tail alone renders
          (fail-closed -- no invented source). */}
      {!confirmed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,180,0,0.08)', border: '1px solid rgba(255,180,0,0.35)', borderRadius: 3, padding: '10px 14px', marginBottom: 18 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffb400', flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
            <strong style={{ color: '#ffb400', letterSpacing: 1, fontSize: 11 }}>UNCONFIRMED</strong>
            {': '}{row.verified_source ? row.verified_source + '. ' : ''}Not yet verified in the live game; details are provisional and may change.
          </span>
        </div>
      )}
      {/* Official pre-release source (POIs from Deep Dive Part 1): labelled as such, linked, never
          "verified in-game". */}
      {confirmed && row.source_label && (
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--green)', textTransform: 'uppercase', border: '1px solid var(--border)', borderRadius: 2, padding: '4px 10px' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
            {entity.sourcedBadge || verifiedBadgeLabel(row.verified_source)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, lineHeight: 1.5 }}>
            {'Source: per '}
            {row.source_url
              ? <a href={row.source_url} rel="noopener" style={{ color: 'var(--green)' }}>{row.source_label}</a>
              : row.source_label}
          </div>
        </div>
      )}
      {confirmed && !row.source_label && row.verified_source && (
        <div style={{ marginBottom: 18 }}>
          {/* Badge wording DERIVES from verified_source: "Verified in-game" only when the source
              attests in-game (verifiedBadgeLabel), otherwise the neutral "Verified" -- so an
              official-source row (e.g. a dev blog) never falsely claims in-game verification. */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: 'var(--green)', textTransform: 'uppercase', border: '1px solid var(--border)', borderRadius: 2, padding: '4px 10px' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }} />
            {verifiedBadgeLabel(row.verified_source) + (vpatch ? ' (patch ' + vpatch + ')' : '')}
          </div>
          {/* Source citation for confirmed rows -- carries the "official source" nuance the badge no
              longer states. Plain text (the source string may embed a URL); not linkified. */}
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, lineHeight: 1.5 }}>
            {'Source: ' + row.verified_source}
          </div>
        </div>
      )}
    </>
  );
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webPage) }} />

      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px 96px' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
          <Link href="/dmz" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>DMZ</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <Link href={entity.routeBase} style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>{entity.plural.toUpperCase()}</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ color: 'var(--text-secondary)' }}>{row.name.toUpperCase()}</span>
        </div>

        {!heroSet && header}

        {/* HERO IMAGE (only with a valid image base; see heroSet above). The frame keeps a wide shape (16:7,
            4:3 on narrow screens) and grows if the header needs more room; the image covers it, a bottom
            gradient (the shared hero scrim) keeps the header legible, and the credit sits below. alt falls
            back to "" if image_alt is missing (the dmz_pois pairing CHECK should prevent that). */}
        {heroSet && (
          <figure style={{ maxWidth: heroSet.width, margin: '0 auto 26px' }}>
            <style>{HERO_CSS}</style>
            <div className="dmz-entity-hero-frame" style={{ position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', overflow: 'hidden', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroSet.src} srcSet={heroSet.srcSet} sizes={heroSet.sizes} alt={row.image_alt || ''}
                width={entity.imageSize ? entity.imageSize.width : undefined} height={entity.imageSize ? entity.imageSize.height : undefined}
                fetchPriority="high" decoding="async"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: HERO_OVERLAY_STANDARD.bottom }} />
              <div style={{ position: 'relative', padding: '28px 20px 4px' }}>
                {header}
              </div>
            </div>
            {entity.imageCredit && <figcaption style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, textAlign: 'right', letterSpacing: 0.3 }}>{entity.imageCredit}</figcaption>}
          </figure>
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

        {/* EXPECTED THREAT LEVELS (POIs): labels exactly as published; the note states what the source
            does and does not rank. */}
        {threats.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <h2 style={Object.assign({}, sectionLabel, { margin: '0 0 10px' })}>Expected threat levels</h2>
            <table style={{ width: '100%', maxWidth: 680, borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 700 }}>Area</th>
                  <th scope="col" style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-tertiary)', fontSize: 11, fontWeight: 700 }}>Threat level</th>
                </tr>
              </thead>
              <tbody>
                {threats.map(function (t, i) {
                  return (
                    <tr key={i}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-primary)' }}>{t.name}</td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', color: '#fff', fontWeight: 700 }}>
                        {t.level}{t.note ? <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>{' (' + t.note + ')'}</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {entity.threatNote && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 680, margin: '10px 0 0' }}>{entity.threatNote}</p>}
          </div>
        )}

        {/* NAMED PLACES inside the POI (anchored, so a legacy slug can redirect to one). */}
        {places.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <h2 style={Object.assign({}, sectionLabel, { margin: '0 0 10px' })}>Named places</h2>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, maxWidth: 680 }}>
              {places.map(function (p) {
                return (
                  <li key={p.name} id={placeId(p.name)} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 3, padding: '10px 14px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{p.name}</div>
                    {p.note && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: 3 }}>{p.note}</div>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {pageNote && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 680, margin: '0 0 30px', borderLeft: '2px solid var(--border)', paddingLeft: 12 }}>{pageNote}</p>
        )}

        {/* NEARBY (POIs): locations the source places next to, inside or around this one. */}
        {related && related.length > 0 && (
          <div style={{ marginBottom: 30 }}>
            <h2 style={Object.assign({}, sectionLabel, { margin: '0 0 10px' })}>Nearby locations</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {related.map(function (s) {
                return (
                  <Link key={s.slug} href={entity.routeBase + '/' + s.slug} style={{ fontSize: 12, color: 'var(--text-primary)', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 2, padding: '6px 11px', textDecoration: 'none' }}>
                    {s.name}
                  </Link>
                );
              })}
            </div>
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

        <div style={{ marginTop: 34, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href={entity.routeBase} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px' }}>
            &larr; All DMZ {entity.plural}
          </Link>
          {/* Context link back to the map/geography article (spoke 1). Rendered only
              when the entity config supplies it (POIs do; keys/missions/items do not). */}
          {entity.contextLink && (
            <Link href={entity.contextLink.href} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, color: 'var(--green)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px' }}>
              {entity.contextLink.label} &rarr;
            </Link>
          )}
        </div>

        {/* Launch-notify capture (source-tagged, server-gated on the dismiss cookie -- no flash). */}
        {!notifyDismissed && showLaunchNotify(dmz) && <div style={{ marginTop: 30 }}><DmzNotifyStrip source="dmz-entity" /></div>}
      </main>
    </>
  );
}
