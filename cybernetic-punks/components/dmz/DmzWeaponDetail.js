// components/dmz/DmzWeaponDetail.js
// /dmz/weapons/[slug] body. Server component. Shows only what the row holds (lib/dmz/weapons.js helpers); a missing
// value is omitted. Never shows an unlock level.
// Order (Brief 168): header and source lines, the hero image on a spotlight panel, the figures strip, the Gunsmith
// bench (weapons with attachment types only), the Apex card, the in-class ranks, the class links. Launchers and the
// knife (no attachment types, no Apex) get the hero and the figures only.
// JSON-LD: BreadcrumbList + WebPage only; no facts are asserted in structured data.
//
// Brief 213: on the hub kit (components/game: HubPageHeader, CutCard, hubKitCss; DMZ values for the --hk-* properties
// from lib/dmz/hubTheme.js), like the weapons list page. Same copy, DOM order, ids and heading levels: the breadcrumb is
// the header eyebrow, the "DMZ Weapon" label sits above the title, the tags, source lines and note follow the title.
// The hero image and the figures share one row from 900px up (one wrapper, .dmzwd-top), so the key values stay high.
// The 1160px container (.hk-pw) keeps the left edge in line with the header; text blocks are capped at 760px.
//
// Brief 221: "Camos (reported)" after the in-class ranks and before the class links, from lib/dmz/weaponCamos.js
// (generated from the MW4 Mastery Tracker by Axolwaffles; third-party, tier REPORTED). One bordered block
// (data-camos) whose first sentence names the source, with the network "Reported" chip
// (components/network/confidenceTiers.js); the credit line with the link to the author's post follows the block. A
// null DMZ line is shown as not shown, never guessed. dateModified is the later of updated_at and
// WEAPON_CAMOS_UPDATED.

import Link from 'next/link';
import { Exo_2 } from 'next/font/google';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { toISOWithPTOffset } from '@/lib/formatDate';
import {
  WEAPONS_HUB, WEAPON_NOTES, WEAPON_IMAGE, FLAG_LABELS, weaponFacts, apexOf, apexBlocksText, classRanks, classLabel,
  weaponTitle, weaponDesc, weaponFlags, weaponImageSet, weaponImageAlt, slotGrid,
} from '@/lib/dmz/weapons';
import { APEX_NOTES } from '@/lib/dmz/weaponApexNotes';
import { weaponCamos, CAMO_RULES, WEAPON_CAMOS_SOURCE, camosDateIfLater } from '@/lib/dmz/weaponCamos';
import { CONFIDENCE_TIERS, TierIcon } from '@/components/network/confidenceTiers';
import CutCard from '@/components/game/CutCard';
import HubPageHeader, { HUB_PAGE_CSS } from '@/components/game/HubPageHeader';
import { HUB_KIT_CSS } from '@/components/game/hubKitCss';
import { DMZ_HUB_VARS } from '@/lib/dmz/hubTheme';
import { SPOTLIGHT } from './weaponArmoryCss.js';
import WeaponBench, { NO_BLOCKS_STATED } from './WeaponBench.js';

var BASE = 'https://cyberneticpunks.com';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

// The first three rules tighten the shared header and container spacing on this page only (as on the list page; the
// third keeps the "DMZ Weapon" label, in the header top slot, next to the title).
var DETAIL_CSS = `
.hk .hk-ph-in{padding-top:24px;padding-bottom:24px}
.hk .hk-pw{padding-top:20px}
.hk .hk-ph-top{margin-bottom:4px}
.dmzwd-crumb{display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:.14em}
.dmzwd-crumb-sep{opacity:.6}
.dmzwd-crumb-cur{color:var(--hk-soft)}
.dmzwd-label{margin:0;font:700 12px/1.3 monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--hk-mute)}
.dmzwd-tags{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 12px}
.dmzwd-tag{display:inline-block;font:700 12px/1.3 monospace;letter-spacing:.1em;text-transform:uppercase;padding:2px 6px;color:#ffb400;border:1px solid #ffb400}
.dmzwd-tag.dmzwd-ok{color:#8fe0a8;border-color:#4a9d5b}
.dmzwd-unc{display:flex;align-items:center;gap:8px;max-width:760px;margin:0 0 14px;padding:10px 14px;border:1px solid rgba(255,180,0,0.45);background:rgba(255,180,0,0.08)}
.dmzwd-unc-dot{width:6px;height:6px;border-radius:50%;background:#ffb400;flex-shrink:0}
.dmzwd-unc-t{font-size:13px;line-height:1.5;color:var(--hk-text)}
.dmzwd-unc-t strong{color:#ffb400;letter-spacing:.08em;font-size:12px}
.dmzwd-note{max-width:760px;margin:8px 0 0;font-size:13px;line-height:1.5;color:var(--hk-soft)}
.hk .dmzwd-note a{padding:14px 0;color:inherit;text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:2px}
.dmzwd-top{display:grid;gap:14px}
@media (min-width:900px){.dmzwd-top{grid-template-columns:minmax(0,3fr) minmax(0,2fr);gap:20px;align-items:start}}
.dmzwd-fig{margin:0}
.dmzwd-hero{position:relative;aspect-ratio:2/1;width:100%;overflow:hidden;background:${SPOTLIGHT}}
.dmzwd-hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:12px}
.dmzwd-cap{margin-top:6px;font-size:12px;color:var(--hk-mute)}
.dmzwd-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.dmzwd-fact{padding:12px 14px}
.dmzwd-fl{margin-bottom:6px;font:700 12px/1.2 monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--hk-mute)}
.dmzwd-fv{font-size:16px;font-weight:700;color:var(--hk-text)}
.dmzwd-h2{margin:32px 0 12px;font:800 14px/1.2 monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--hk-text)}
.dmzwd-apex{max-width:760px;padding:14px 18px 16px;box-shadow:inset 3px 0 0 var(--hk-accent),inset 0 0 0 1px var(--hk-line)}
.dmzwd-apex-n{font-size:16px;font-weight:700;color:var(--hk-text)}
.dmzwd-apex-p{margin:8px 0 0;font-size:15px;line-height:1.6;color:var(--hk-soft)}
.dmzwd-ranks{max-width:760px;margin:0;padding:0;list-style:none;display:grid;gap:6px}
.dmzwd-ranks li{font-size:15px;line-height:1.5;color:var(--hk-soft)}
.dmzwd-ranks strong{color:var(--hk-text)}
.dmzwd-sibs{margin:0;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:8px}
.hk .dmzwd-sibs a{display:inline-flex;align-items:center;min-height:44px;padding:6px 12px;border:1px solid var(--hk-line);font-size:14px;color:var(--hk-soft);text-decoration:none}
.hk .dmzwd-sibs a:hover{color:var(--hk-text);border-color:var(--hk-accent)}
.dmzwd-back{margin:32px 0 0;font-size:14px;color:var(--hk-mute)}
.hk .dmzwd-back a{display:inline-flex;align-items:center;min-height:44px;color:var(--hk-soft);text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:3px}
.dmzwd-camos{max-width:760px;padding:16px 18px 18px 21px;box-shadow:inset 3px 0 0 var(--rep-c),inset 0 0 0 1px var(--hk-line)}
.dmzwd-rep{display:inline-flex;align-items:center;gap:6px;margin-right:8px;padding:2px 8px;border:1px solid var(--rep-c);border-radius:999px;font:700 12px/1.3 monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--rep-c);vertical-align:1px}
.dmzwd-cl{margin:0 0 10px;font-size:15px;line-height:1.6;color:var(--hk-text)}
.dmzwd-cm{margin:0;font-size:14px;line-height:1.5;color:var(--hk-soft)}
.dmzwd-h3{margin:18px 0 8px;font:700 12px/1.3 monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--hk-mute)}
.dmzwd-cam{margin:0;padding:0;list-style:none;display:grid;gap:10px}
.dmzwd-cam li{font-size:14px;line-height:1.5;color:var(--hk-soft)}
.dmzwd-cam strong{font-size:15px;color:var(--hk-text)}
.dmzwd-clv{margin-left:8px;font:700 12px/1.3 monospace;letter-spacing:.06em;color:var(--hk-mute)}
.dmzwd-cd{display:block}
.dmzwd-cdl{color:var(--hk-mute)}
.hk .dmzwd-camo-credit a:focus-visible{outline:2px solid var(--hk-accent);outline-offset:2px}
`;

// The network "Reported" tier (label and colour from the locked vocabulary).
var REPORTED = CONFIDENCE_TIERS.filter(function (t) { return t.key === 'attributed'; })[0];
var DMZ_LINE_LABEL = "DMZ version (tracker's Enemies line): ";
var NULL_LINE = "not shown; the tracker's entry for this camo is inconsistent.";

function DmzLine({ text }) {
  return <span className="dmzwd-cd"><span className="dmzwd-cdl">{DMZ_LINE_LABEL}</span>{text === null ? NULL_LINE : text}</span>;
}

// The camo block for one weapon (null: no data, no section). No count rule for Harmonic Break (the tracker gives two).
function CamoSection({ name, camos }) {
  if (!camos) return null;
  var gold = camos.platinum.unlockGoldCount;
  return (
    <section>
      <h2 className="dmzwd-h2">Camos (reported)</h2>
      <CutCard className="dmzwd-camos" data-camos="" style={{ '--rep-c': REPORTED.color }}>
        <p className="dmzwd-cl">
          <span className="dmzwd-rep"><TierIcon tier="attributed" size={12} />{REPORTED.label}</span>
          {'The Mastery Tracker by ' + WEAPON_CAMOS_SOURCE.creator + ' reports these camos and challenges for the ' + name + '.'}
        </p>
        <p className="dmzwd-cm">{"Military camos: tracker lists 'Reach Weapon Level " + camos.militaryLevel + "'."}</p>
        <h3 className="dmzwd-h3">Special camos</h3>
        <ul className="dmzwd-cam">
          {camos.special.map(function (s) {
            return (
              <li key={s.name}>
                <strong>{s.name}</strong><span className="dmzwd-clv">{'Weapon level ' + s.level}</span>
                <DmzLine text={s.dmzChallenge} />
              </li>
            );
          })}
        </ul>
        <h3 className="dmzwd-h3">Gold to Divergence</h3>
        <ul className="dmzwd-cam">
          <li><strong>Gold</strong>{': ' + CAMO_RULES.gold.after + '.'}<DmzLine text={CAMO_RULES.gold.dmzChallenge} /></li>
          <li><strong>Platinum</strong>{': after ' + gold + ' Gold camo' + (gold === 1 ? '' : 's') + ' in this class.'}<DmzLine text={camos.platinum.dmzChallenge} /></li>
          <li><strong>Harmonic Break</strong><DmzLine text={camos.harmonicBreak.dmzChallenge} /></li>
          <li><strong>Divergence</strong>{': ' + CAMO_RULES.divergence.after + '.'}</li>
        </ul>
        <h3 className="dmzwd-h3">War Spoils camo</h3>
        <p className="dmzwd-cm">{CAMO_RULES.warSpoils.text + " (tracker's DMZ Recipes & Manuals tab)."}</p>
      </CutCard>
      <p className="dmzwd-note dmzwd-camo-credit">
        {'Camo data reported by the ' + WEAPON_CAMOS_SOURCE.title + ' by ' + WEAPON_CAMOS_SOURCE.creator + ' (community spreadsheet, v1.0.4, updated Oct 27 2026): '}
        <a href={WEAPON_CAMOS_SOURCE.url} target="_blank" rel="noopener noreferrer">the tracker&apos;s Reddit post</a>
        {'. Not yet confirmed in game by Cybernetic Punks.'}
      </p>
    </section>
  );
}

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
  var camosDate = camosDateIfLater(row.updated_at);
  if (camosDate) webPage.dateModified = camosDate;
  else if (row.updated_at) webPage.dateModified = toISOWithPTOffset(row.updated_at);

  return (
    <main className={'hk ' + exo2.variable} style={Object.assign({ fontFamily: EXO }, DMZ_HUB_VARS)}>
      <style dangerouslySetInnerHTML={{ __html: HUB_KIT_CSS + HUB_PAGE_CSS + DETAIL_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webPage) }} />

      <HubPageHeader
        eyebrow={
          <nav aria-label="Breadcrumb" className="dmzwd-crumb">
            <Link href="/dmz">DMZ</Link>
            <span className="dmzwd-crumb-sep">/</span>
            <Link href={WEAPONS_HUB.routeBase}>Weapons</Link>
            <span className="dmzwd-crumb-sep">/</span>
            <span className="dmzwd-crumb-cur">{row.name}</span>
          </nav>
        }
        top={<div className="dmzwd-label">DMZ Weapon</div>}
        title={row.name}
      >
        {confirmed || flags.length > 0 ? (
          <p className="dmzwd-tags">
            {confirmed ? <span className="dmzwd-tag dmzwd-ok">Confirmed</span> : null}
            {flags.map(function (f) { return <span key={f} className="dmzwd-tag">{'Source note: ' + FLAG_LABELS[f]}</span>; })}
          </p>
        ) : null}

        {!confirmed && (
          <div className="dmzwd-unc">
            <span className="dmzwd-unc-dot" />
            <span className="dmzwd-unc-t"><strong>UNCONFIRMED</strong>{': '}{WEAPONS_HUB.unconfirmed}</span>
          </div>
        )}

        <p className="dmzwd-note">
          Source: <a href={WEAPONS_HUB.sourceUrl} target="_blank" rel="noopener noreferrer">{WEAPONS_HUB.sourceLabel}</a>
        </p>
        <p className="dmzwd-note">{WEAPONS_HUB.scopeLine}</p>
        {note ? <p className="dmzwd-note">Note: {note}</p> : null}
      </HubPageHeader>

      <div className="hk-pw">
        <div className="dmzwd-top">
          {img ? (
            <figure className="dmzwd-fig">
              <div className="dmzwd-hero">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.src} srcSet={img.srcSet} sizes={img.sizes} width={img.width} height={img.height}
                  alt={weaponImageAlt(row)} fetchPriority="high" decoding="async" />
              </div>
              <figcaption className="dmzwd-cap">{WEAPON_IMAGE.credit}</figcaption>
            </figure>
          ) : null}

          {facts.length > 0 ? (
            <div className="dmzwd-facts">
              {facts.map(function (f) {
                return (
                  <CutCard key={f.label} className="dmzwd-fact">
                    <div className="dmzwd-fl">{f.label}</div>
                    <div className="dmzwd-fv">{f.value}</div>
                  </CutCard>
                );
              })}
            </div>
          ) : null}
        </div>

        <WeaponBench row={row} />

        {apex ? (
          <section>
            <h2 className="dmzwd-h2">Apex attachment</h2>
            <CutCard className="dmzwd-apex">
              <div className="dmzwd-apex-n">{apex.name}</div>
              {mechanic ? <p className="dmzwd-apex-p">{mechanic}</p> : null}
              <p className="dmzwd-apex-p">{grid.blocksStated ? apexBlocksText(apex) : NO_BLOCKS_STATED}</p>
            </CutCard>
          </section>
        ) : null}

        {ranks.length > 0 ? (
          <section>
            <h2 className="dmzwd-h2">Rank in {cls || 'its class'}</h2>
            <ul className="dmzwd-ranks">
              {ranks.map(function (r) {
                return <li key={r.label}><strong>{r.label}:</strong> {r.text}</li>;
              })}
            </ul>
            <p className="dmzwd-note">{WEAPONS_HUB.derivedLabel} Highest value ranks first.</p>
          </section>
        ) : null}

        <CamoSection name={row.name} camos={weaponCamos(row.slug)} />

        {siblings.length > 0 ? (
          <section>
            <h2 className="dmzwd-h2">Other {cls || 'weapons in this class'}</h2>
            <ul className="dmzwd-sibs">
              {siblings.map(function (s) {
                return <li key={s.slug}><Link href={WEAPONS_HUB.routeBase + '/' + s.slug} className="dmz-dossier">{s.name}</Link></li>;
              })}
            </ul>
          </section>
        ) : null}

        <p className="dmzwd-back">
          <Link href={WEAPONS_HUB.routeBase}>{'\u2190'} All DMZ weapons</Link>
          {' \u00b7 '}
          <Link href="/dmz">DMZ hub</Link>
        </p>
      </div>
    </main>
  );
}
