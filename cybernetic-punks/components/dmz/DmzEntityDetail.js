// components/dmz/DmzEntityDetail.js
// Shared DMZ entity DETAIL template (keys / missions / items). Cloned in
// BEHAVIOUR from app/uniques/[slug]: real-data-only, BreadcrumbList + WebPage
// JSON-LD only, no FAQPage JSON-LD (doctrine A1). Rendered inside the DMZ layout
// (.dmz-theme token swap + DmzNav + disclaimer).
// Brief 218: on the hub kit (components/game: HubPageHeader, CutCard, hubKitCss; DMZ values for the --hk-*
// properties from lib/dmz/hubTheme.js), like the hubs (DmzEntityHub, Brief 217). Same copy, fields, links, ids and
// JSON-LD. One DOM order change: with a hero image the header now comes first (the kit header), then the image beside
// the description and facts, so the name and status stay high on a phone.
//
// HONESTY GATE on `verified`: an unverified row is VISIBLE (datamined-then-pending
// is a real launch state) but clearly marked UNCONFIRMED, and its schema does not
// assert the facts as confirmed. The route sets robots noindex for unverified rows
// (see the route files) so a provisional page never enters the index.

import Link from 'next/link';
import { cookies } from 'next/headers';
import { Exo_2 } from 'next/font/google';
import { toISOWithPTOffset } from '@/lib/formatDate';
import { verifiedBadgeLabel } from '@/lib/verification';
import DmzNotifyStrip from './DmzNotifyStrip';
import CutCard from '@/components/game/CutCard';
import HubPageHeader, { HUB_PAGE_CSS } from '@/components/game/HubPageHeader';
import { HUB_KIT_CSS } from '@/components/game/hubKitCss';
import { DMZ_HUB_VARS } from '@/lib/dmz/hubTheme';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { dmz } from '@/lib/games/dmz';
import { showLaunchNotify } from '@/lib/network/launchCopy';
import { entityImageSet, absoluteImageUrl } from '@/lib/dmz/entityImage';

// Content column of the detail page (main maxWidth 1000 minus 2 x 20px padding): the widest the hero can be. Kept as
// the image `sizes` cap, so the image request is unchanged (Brief 218).
var CONTENT_WIDTH = 960;
// Hero layout (only rendered with an image): stacked below 900px (the image, then the description and facts); from
// 900px a two-column grid, the image column capped at `col` px, the description and facts beside it.
function heroCss(col) {
  return '.dmz-entity-hero .edet-side{margin-top:20px}'
    + '@media (min-width:900px){.dmz-entity-hero{display:grid;grid-template-columns:minmax(0,' + col + 'px) 1fr;gap:28px;align-items:start}.dmz-entity-hero .edet-side{min-width:0;margin-top:0}}';
}

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

// async so it can server-gate the launch-notify strip on the dmz_notify_dismissed cookie (no-flash,
// same as the article page). Entity detail pages are force-dynamic, so the cookie read is fine.
// Anchor id for a named place (stable, ASCII): "Heavenly Luck Casino" -> "heavenly-luck-casino".
function placeId(name) {
  return String(name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// A list fact uses CSS columns: 1 below 720px, 2 from 720px; entries never split across columns.
var FACT_LIST_CSS = '.dmz-fact-list li{break-inside:avoid}@media (min-width:720px){.dmz-fact-list{columns:2;column-gap:28px}}';

// Page styles (Brief 218), scoped to the edet- classes. No text under 12px; links 44px tall (inline text links by
// vertical padding, which does not move the lines); every link that is not a cut card gets a visible focus ring
// (a link inside a cut card sits at least 6px from its edges, so the 2px ring at 2px offset is never clipped).
// Status: a 3px bar (green for verified or pre-release source, amber for unconfirmed) plus its text label, never
// color alone. The first two rules tighten the shared header and container on these pages only.
var DETAIL_CSS = `
.hk .hk-ph-in{padding-top:24px;padding-bottom:24px}
.hk .hk-pw{padding-top:20px}
.hk .hk-ph-top{margin-bottom:8px}
.edet-crumb{display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:.14em}
.edet-crumb-sep{color:var(--hk-mute)}
.hk .edet-crumb a{padding:0 10px;margin:0 -10px}
.edet-crumb-here{color:var(--hk-soft);overflow-wrap:anywhere}
.edet-type{font:700 12px/1.3 monospace;letter-spacing:.16em;text-transform:uppercase;color:var(--hk-soft)}
.edet-ok{--edet-acc:#6cc97e;--edet-st:#8fe0a8}
.edet-unc{--edet-acc:#ffb400;--edet-st:#ffb400}
.edet-status{position:relative;max-width:760px;margin:6px 0 0;padding:10px 14px 10px 17px;background:var(--hk-card);box-shadow:inset 0 0 0 1px var(--hk-line)}
.edet-status::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--edet-acc)}
.edet-badge{display:inline-flex;align-items:center;gap:7px;font:700 12px/1.3 monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--edet-st)}
.edet-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;background:var(--edet-acc)}
.edet-src{margin-top:6px;font-size:13px;line-height:1.5;color:var(--hk-soft);overflow-wrap:anywhere}
.hk .edet-src a{padding:14px 0;color:var(--hk-text);text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:2px}
.edet-unc-row{display:flex;align-items:center;gap:8px}
.edet-unc-text{font-size:14px;line-height:1.5;color:var(--hk-text)}
.edet-unc-text strong{font:700 12px/1 monospace;letter-spacing:.1em;color:var(--edet-st)}
.edet-desc{max-width:760px;margin:0 0 24px;font-size:16px;line-height:1.65;color:#d5dae0}
.edet-frame{position:relative;overflow:hidden;background:var(--hk-card);box-shadow:inset 0 0 0 1px var(--hk-line)}
.edet-credit{margin-top:6px;font-size:13px;line-height:1.5;color:var(--hk-soft);text-align:right}
.hk .edet-credit a{padding:14px 0;color:inherit;text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:2px}
.edet-facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px;margin-bottom:28px}
.hk-cut.edet-fact{padding:14px 16px}
.hk-cut.edet-fact-wide{grid-column:1 / -1}
.edet-label{margin-bottom:6px;font:700 12px/1.3 monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--hk-soft)}
.edet-val{font-size:16px;line-height:1.5;color:var(--hk-text)}
.edet-list{margin:0;padding-left:18px;font-size:15px;line-height:1.5;color:var(--hk-text)}
.edet-list li{margin:0 0 4px}
.edet-sec{max-width:760px;margin-bottom:28px}
.hk-cut.edet-box{padding:14px 16px}
.edet-h2{margin:0 0 10px;font:700 12px/1.3 monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--hk-soft)}
.edet-table{width:100%;border-collapse:collapse;font-size:15px}
.edet-table th{padding:8px 10px;border-bottom:1px solid var(--hk-line);text-align:left;font:700 12px/1.3 monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--hk-soft)}
.edet-table td{padding:8px 10px;border-bottom:1px solid var(--hk-line);color:var(--hk-text)}
.edet-table td.edet-level{font-weight:700}
.edet-tnote{font-weight:400;color:var(--hk-soft)}
.edet-note{margin:10px 0 0;font-size:13px;line-height:1.6;color:var(--hk-soft)}
.edet-cards{list-style:none;margin:0;padding:0;display:grid;gap:10px}
.hk-cut.edet-card{padding:12px 16px}
.edet-card-name{font-size:16px;font-weight:700;color:var(--hk-text)}
.hk a.edet-card-name{display:inline-flex;align-items:center;min-height:44px;margin:-6px 0;text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:3px}
.edet-card-sub{margin-top:3px;font-size:14px;line-height:1.55;color:var(--hk-soft)}
.edet-pnote{max-width:760px;margin:0 0 28px;padding-left:12px;border-left:3px solid var(--hk-line);font-size:14px;line-height:1.6;color:var(--hk-soft)}
.edet-chips{display:flex;flex-wrap:wrap;gap:8px}
.hk .edet-chips a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border:1px solid var(--hk-line);background:var(--hk-card);font-size:14px;color:var(--hk-text);text-decoration:none}
.hk .edet-chips a:hover{border-color:var(--hk-accent)}
.edet-acq{font-size:15px;line-height:1.6;color:var(--hk-text)}
.edet-back{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:32px}
.hk .edet-back a{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border:1px solid var(--hk-line);font:700 13px/1 monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--hk-text);text-decoration:none}
.hk .edet-back a.edet-ctx{text-transform:none;letter-spacing:.04em;color:var(--hk-accent-text)}
.hk a:not(.hk-cut):focus-visible{outline:2px solid var(--hk-accent-text);outline-offset:2px}
`;

// `related` (optional): rows this one names as nearby (POIs only). Structured POI fields (area,
// territory, threat_levels, sub_locations, source_label/source_url) render ONLY when present, so
// keys/missions/items and older POI rows render exactly as before.
// `contained` (optional): rows located in this one (lib/dmz/containedPlaces.js). Rendered only when
// non-empty; absent or [] renders nothing.
export default async function DmzEntityDetail({ entity, row, siblings, related, contained }) {
  var notifyDismissed = ((await cookies()).get('dmz_notify_dismissed') || {}).value === '1';
  var facts = entity.facts(row);
  var hasFactList = facts.some(function (f) { return Array.isArray(f.items) && f.items.length > 0; });
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
    description: entity.detailDesc(row, { nearby: (related || []).length, contained: (contained || []).length }),
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
  // without an image (and every keys/missions/items row) render no figure. The figure is never
  // wider than the largest variant (never upscaled; it may shrink below it). The frame takes the config
  // imageSize ratio (falling back to the largest width with no fixed height).
  var heroSet = entityImageSet(row.image_url, { widths: entity.imageWidths });
  var heroSize = entity.imageSize && entity.imageSize.width > 0 && entity.imageSize.height > 0 ? entity.imageSize : null;
  if (heroSet) {
    var heroCap = Math.min(heroSet.width, CONTENT_WIDTH);
    heroSet.sizes = '(max-width: ' + (heroCap + 40) + 'px) calc(100vw - 40px), ' + heroCap + 'px';
    heroSet.col = Math.min(heroSet.width, heroSize ? heroSize.width : heroSet.width);
    thing.image = absoluteImageUrl(row.image_url, heroSet.width, 'https://cyberneticpunks.com');
  }

  // FAQ ONLY from real data -- no invented Q&As. Acquisition is the one honest
  // question we can answer from the columns when they are present AND verified.
  var acq = row.acquisition_source ? (row.acquisition_source + (row.acquisition_detail ? ' - ' + row.acquisition_detail : '')) : '';

  // Status block (UNCONFIRMED banner or the source badge), rendered once inside the kit header under the H1.
  var status = (
    <>
      {/* HONESTY GATE: unconfirmed banner for unverified rows. Provenance is the
          DB row's verified_source (single source of truth) followed by a static
          provisional tail; if verified_source is null, the tail alone renders
          (fail-closed -- no invented source). */}
      {!confirmed && (
        <div className="edet-status edet-unc">
          <div className="edet-unc-row">
            <span className="edet-dot" />
            <span className="edet-unc-text">
              <strong>UNCONFIRMED</strong>
              {': '}{row.verified_source ? row.verified_source + '. ' : ''}Not yet verified in the live game; details are provisional and may change.
            </span>
          </div>
        </div>
      )}
      {/* Official pre-release source (POIs from Deep Dive Part 1): labelled as such, linked, never
          "verified in-game". */}
      {confirmed && row.source_label && (
        <div className="edet-status edet-ok">
          <div className="edet-badge">
            <span className="edet-dot" />
            {entity.sourcedBadge || verifiedBadgeLabel(row.verified_source)}
          </div>
          <div className="edet-src">
            {'Source: per '}
            {row.source_url
              ? <a href={row.source_url} rel="noopener">{row.source_label}</a>
              : row.source_label}
          </div>
        </div>
      )}
      {confirmed && !row.source_label && row.verified_source && (
        <div className="edet-status edet-ok">
          {/* Badge wording DERIVES from verified_source: "Verified in-game" only when the source
              attests in-game (verifiedBadgeLabel), otherwise the neutral "Verified" -- so an
              official-source row (e.g. a dev blog) never falsely claims in-game verification. */}
          <div className="edet-badge">
            <span className="edet-dot" />
            {verifiedBadgeLabel(row.verified_source) + (vpatch ? ' (patch ' + vpatch + ')' : '')}
          </div>
          {/* Source citation for confirmed rows -- carries the "official source" nuance the badge no
              longer states. Plain text (the source string may embed a URL); not linkified. */}
          <div className="edet-src">
            {'Source: ' + row.verified_source}
          </div>
        </div>
      )}
    </>
  );

  // Description and facts: beside the image from 900px when there is one, else in normal flow.
  var body = (
    <>
      {row.description && (
        <p className="edet-desc">{row.description}</p>
      )}

      {/* FACTS (type-specific, present-only). A fact may carry display-only fields (lib/dmz/entities.js fact):
          `display` is shown instead of the value; `items` renders as a list (entries and order as stored)
          in a card spanning the full grid width, 2 CSS columns from 720px. JSON-LD keeps using f.value. */}
      {facts.length > 0 && (
        <>
        {hasFactList && <style>{FACT_LIST_CSS}</style>}
        <div className="edet-facts">
          {facts.map(function (f, i) {
            var list = Array.isArray(f.items) && f.items.length > 0 ? f.items : null;
            return (
              <CutCard key={i} className={list ? 'edet-fact edet-fact-wide' : 'edet-fact'}>
                <div className="edet-label">{f.label}</div>
                {list ? (
                  <ul className="dmz-fact-list edet-list">
                    {list.map(function (t, j) { return <li key={j}>{t}</li>; })}
                  </ul>
                ) : (
                  <div className="edet-val">{f.display != null ? f.display : f.value}</div>
                )}
              </CutCard>
            );
          })}
        </div>
        </>
      )}
    </>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webPage) }} />

      <main className={'hk ' + exo2.variable} style={Object.assign({ fontFamily: EXO }, DMZ_HUB_VARS)}>
        <style dangerouslySetInnerHTML={{ __html: HUB_KIT_CSS + HUB_PAGE_CSS + DETAIL_CSS }} />
        {/* Header (hub kit): breadcrumb eyebrow, the type label, the H1 and the status block. */}
        <HubPageHeader
          eyebrow={
            <nav aria-label="Breadcrumb" className="edet-crumb">
              <Link href="/dmz">DMZ</Link>
              <span className="edet-crumb-sep">/</span>
              <Link href={entity.routeBase}>{entity.plural.toUpperCase()}</Link>
              <span className="edet-crumb-sep">/</span>
              <span className="edet-crumb-here">{row.name.toUpperCase()}</span>
            </nav>
          }
          top={<div className="edet-type">DMZ {entity.singular}</div>}
          title={row.name}
          compact
        >
          {status}
        </HubPageHeader>

        <div className="hk-pw">
        {/* HERO IMAGE (only with a valid image base; see heroSet above): the image with its credit, and the
            description and facts beside it (from 900px) or below it. No text over the image. alt falls back to ""
            if image_alt is missing (the dmz_pois pairing CHECK should prevent that). */}
        {heroSet ? (
          <div className="dmz-entity-hero">
            <style>{heroCss(heroSet.col)}</style>
            <figure className="edet-fig" style={{ maxWidth: heroSet.width, margin: 0 }}>
              <div className="dmz-entity-hero-frame edet-frame" style={{ aspectRatio: heroSize ? heroSize.width + ' / ' + heroSize.height : undefined }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroSet.src} srcSet={heroSet.srcSet} sizes={heroSet.sizes} alt={row.image_alt || ''}
                  width={heroSize ? heroSize.width : undefined} height={heroSize ? heroSize.height : undefined}
                  fetchPriority="high" decoding="async"
                  style={heroSize ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' } : { display: 'block', width: '100%', height: 'auto' }} />
              </div>
              {/* Credit: plain text, or a link when the entity config sets imageCreditUrl. */}
              {entity.imageCredit && (
                <figcaption className="edet-credit">
                  {entity.imageCreditUrl
                    ? <a href={entity.imageCreditUrl} target="_blank" rel="noopener noreferrer">{entity.imageCredit}</a>
                    : entity.imageCredit}
                </figcaption>
              )}
            </figure>
            <div className="edet-side">{body}</div>
          </div>
        ) : body}

        {/* EXPECTED THREAT LEVELS (POIs): labels exactly as published; the note states what the source
            does and does not rank. */}
        {threats.length > 0 && (
          <CutCard className="edet-sec edet-box">
            <h2 className="edet-h2">Expected threat levels</h2>
            <table className="edet-table">
              <thead>
                <tr>
                  <th scope="col">Area</th>
                  <th scope="col">Threat level</th>
                </tr>
              </thead>
              <tbody>
                {threats.map(function (t, i) {
                  return (
                    <tr key={i}>
                      <td>{t.name}</td>
                      <td className="edet-level">
                        {t.level}{t.note ? <span className="edet-tnote">{' (' + t.note + ')'}</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {entity.threatNote && <p className="edet-note">{entity.threatNote}</p>}
          </CutCard>
        )}

        {/* NAMED PLACES inside the POI (anchored, so a legacy slug can redirect to one). */}
        {places.length > 0 && (
          <div className="edet-sec">
            <h2 className="edet-h2">Named places</h2>
            <ul className="edet-cards">
              {places.map(function (p) {
                return (
                  <li key={p.name} id={placeId(p.name)} className="hk-cut edet-card">
                    <div className="edet-card-name">{p.name}</div>
                    {p.note && <div className="edet-card-sub">{p.note}</div>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* LOCATED IN this place: rows whose stored area text ends with this row's name. Name links to the
            member's page; the secondary line is its stored area, verbatim. Same card list as Named places. */}
        {contained && contained.length > 0 && (
          <div className="edet-sec">
            <h2 className="edet-h2">{'Located in ' + row.name}</h2>
            <ul className="edet-cards">
              {contained.map(function (m) {
                return (
                  <li key={m.slug} className="hk-cut edet-card">
                    <Link href={entity.routeBase + '/' + m.slug} className="edet-card-name">{m.name}</Link>
                    <div className="edet-card-sub">{m.area}</div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {pageNote && (
          <p className="edet-pnote">{pageNote}</p>
        )}

        {/* NEARBY (POIs): locations the source places next to, inside or around this one. */}
        {related && related.length > 0 && (
          <div className="edet-sec">
            <h2 className="edet-h2">Nearby locations</h2>
            <div className="edet-chips">
              {related.map(function (s) {
                return (
                  <Link key={s.slug} href={entity.routeBase + '/' + s.slug}>
                    {s.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {acq && (
          <CutCard className="edet-sec edet-box">
            <div className="edet-h2">How to get it</div>
            <div className="edet-acq">{acq}</div>
          </CutCard>
        )}

        {/* Sibling links -- internal linking, never orphan a detail page. */}
        {siblings && siblings.length > 0 && (
          <div>
            <div className="edet-h2">Other DMZ {entity.plural}</div>
            <div className="edet-chips">
              {siblings.map(function (s) {
                return (
                  <Link key={s.slug} href={entity.routeBase + '/' + s.slug}>
                    {s.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="edet-back">
          <Link href={entity.routeBase}>
            &larr; All DMZ {entity.plural}
          </Link>
          {/* Context link back to the map/geography article (spoke 1). Rendered only
              when the entity config supplies it (POIs do; keys/missions/items do not). */}
          {entity.contextLink && (
            <Link href={entity.contextLink.href} className="edet-ctx">
              {entity.contextLink.label} &rarr;
            </Link>
          )}
        </div>

        {/* Launch-notify capture (source-tagged, server-gated on the dismiss cookie -- no flash). */}
        {!notifyDismissed && showLaunchNotify(dmz) && <div style={{ marginTop: 30 }}><DmzNotifyStrip source="dmz-entity" /></div>}
        </div>
      </main>
    </>
  );
}
