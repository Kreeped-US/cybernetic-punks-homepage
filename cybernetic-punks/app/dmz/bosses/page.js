// app/dmz/bosses/page.js
// DMZ BOSS BOARD dossier page. Static, hand-written, sourced page (no DB read). Every fact, unpublished item,
// dossier field and update-log line comes from lib/dmz/bosses.js, which the tests also read.
//
// RENDERING: every dossier, tree node and poster is server-rendered in full, so the whole page reads without
// JavaScript (posters and tree nodes are plain #hash links to the dossier articles). DossierController is a
// progressive enhancement only: with JS, the same link opens that article as a modal dialog in place.
// INDEXING: inherits the DMZ layout gate (dmz.indexable). Listed explicitly in lib/sitemap/eligible.js with a
// fixed lastmod (CONTENT_CHANGED). JSON-LD: BreadcrumbList + WebPage (dateModified = CONTENT_CHANGED,
// citations = the sources) + ItemList of the named Commanders. NO FAQPage. The visible "Checked against
// source on" line stays on LAST_UPDATED (the source-check date; see lib/dmz/bosses.js).
// Brief 214: restyled onto the hub kit (components/game: HubPageHeader, CutCard, hubKitCss; DMZ values for the
// --hk-* properties from lib/dmz/hubTheme.js), like the other DMZ pages. Same copy, ids, headings, links and order.

import Link from 'next/link';
import { Exo_2 } from 'next/font/google';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import CutCard from '@/components/game/CutCard';
import HubPageHeader, { HUB_PAGE_CSS } from '@/components/game/HubPageHeader';
import { HUB_KIT_CSS } from '@/components/game/hubKitCss';
import { DMZ_HUB_VARS } from '@/lib/dmz/hubTheme';
import { DMZ_OG_IMAGE } from '@/lib/dmz/ogImage';
import DossierController from './DossierController';
import { SOURCES, FACTS, UNPUBLISHED, TREE, FIELDS, DOSSIERS, UPDATE_LOG, LAST_UPDATED, CONTENT_CHANGED, PAGE_URL, TITLE, DESC, BOSS_IMAGE, LT_SEEN, REWARDS_SEEN, bossSeen, bossSeenLine, factById, unpublishedById, evidence, bossImageSet, bossImageAlt, lieutenantImageSet, lieutenantImageAlt } from '@/lib/dmz/bosses';

export const metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE + ' | Cybernetic Punks', description: DESC, url: PAGE_URL, siteName: 'Cybernetic Punks', type: 'article', images: [DMZ_OG_IMAGE] },
  twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: TITLE, description: DESC, images: [DMZ_OG_IMAGE] },
};

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

var RELATED = [
  { href: '/dmz/bounties', text: 'DMZ Bounty System: bounties, Bounty Stations and the Bounty Leaderboard' },
  { href: '/dmz/fob', text: 'FOB stations at a glance, including the Boss Board' },
  { href: '/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals', text: 'DMZ Hajin: 13 locations and the FOB in Deep Dive Part 1' },
  { href: '/dmz', text: 'DMZ hub: field intel and guides' },
];

// Page styles, scoped under .bb, after the hub kit rules (HUB_KIT_CSS + HUB_PAGE_CSS). Colors come from the --hk-*
// properties; the three evidence tiers keep their own marks: confirmed (green, with its "Source:" line), UNPUBLISHED
// (yellow tag) and OBSERVED (accent chip plus the "operator observation" label text), never color alone. No text
// under 12px; controls 44px (source links get the height from vertical padding, which does not move the lines).
// The first three rules tighten the shared header and container on this page only, so the first boss content stays
// high on a phone. Motion: the kit's hover lift (no-preference only) and the dialog fade, off under reduced motion.
var CSS = `
.hk .hk-ph-in{padding-top:24px;padding-bottom:24px}
.hk .hk-ph-top{margin-bottom:14px}
.hk .hk-pw{padding-top:20px}
.bb{--ok:#8fe0a8;--okl:#4a9d5b;--unp:#ffb400;--tx:#d5dae0}
.bb h2{margin:0 0 12px;font-size:22px;font-weight:800;line-height:1.3;color:var(--hk-text)}
.bb-crumb{display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:.14em}
.bb-crumb-sep{color:var(--hk-mute)}
.hk .bb-crumb a{padding:0 10px;margin:0 -10px}
.bb-badge{display:inline-block;padding:4px 10px;border:1px solid var(--hk-accent);font:700 12px/1.3 monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--hk-accent-text)}
.bb-checked{margin:14px 0 0;font-size:13px;color:var(--hk-soft)}
.bb-card{margin:0 0 14px;padding:18px 22px 20px}
.bb-sec>h2{margin-top:28px}
.bb-status{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;max-width:760px;margin:0 0 14px;padding:14px 20px;box-shadow:inset 3px 0 0 var(--hk-accent),inset 0 0 0 1px var(--hk-line)}
.bb-status b{margin-right:6px;font-size:17px;font-weight:800;color:var(--hk-text)}
.bb-ok,.bb-unp-c{font:700 13px/1.3 monospace;letter-spacing:.08em;padding:4px 10px;border:1px solid}
.bb-ok{color:var(--ok);border-color:var(--okl)}
.bb-unp-c{color:var(--unp);border-color:var(--unp)}
.bb-src{display:block;font-size:13px;line-height:1.5;color:var(--hk-soft);margin-top:3px}
.hk .bb-src a{padding:15px 0;color:inherit;text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:2px}
.bb-facts{max-width:760px;margin:0;padding-left:18px;font-size:15px;color:var(--tx);line-height:1.65}
.bb-facts li{margin-bottom:8px}
.bb-facts li::marker{color:var(--hk-accent-text)}
.bb-log{font-size:14px}
.bb-tag{font:700 12px/1 monospace;letter-spacing:.08em;color:var(--unp);border:1px solid var(--unp);padding:2px 5px;margin-right:8px;white-space:nowrap}
/* Tree chart: the station, then two sibling branches (no ranking between them). */
.bb-tree{display:flex;flex-direction:column;align-items:center}
.bb-node{background:var(--hk-ground);border:1px solid var(--hk-line);padding:12px 14px;width:100%}
.bb-node h3{margin:0 0 8px;font:800 14px/1.3 monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--hk-text)}
.bb-node ul{margin:0;padding-left:16px;font-size:14px;color:var(--tx);line-height:1.55}
.bb-root{max-width:560px;border-color:var(--hk-accent)}
.bb-stem{width:2px;height:22px;background:var(--hk-line)}
.bb-branches{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:18px;width:100%;padding-top:22px}
.bb-branches::before{content:"";position:absolute;top:0;left:25%;right:25%;height:2px;background:var(--hk-line)}
.bb-branch{position:relative;display:flex;flex-direction:column;align-items:stretch}
.bb-branch::before{content:"";position:absolute;top:-22px;left:50%;width:2px;height:22px;background:var(--hk-line)}
.bb-kids{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.bb-kid{flex:1 1 120px;display:flex;align-items:center;justify-content:center;min-height:44px;padding:8px;text-align:center;font:700 13px/1.3 monospace;letter-spacing:.1em;text-transform:uppercase;text-decoration:none;border:1px solid var(--hk-line);background:var(--hk-card)}
.hk a.bb-kid{color:var(--hk-text)}
.hk a.bb-kid.unk{color:var(--hk-accent-text);border-color:var(--hk-accent)}
.bb-kid:hover{border-color:var(--hk-accent)}
/* Poster wall: each poster is a kit cut card (the kit draws its hover and its focus ring). The SEEN IN GAME chip sits
   20px in from the top and right edges, inside the image box, so it never reaches the ring (3px in) or the cut
   corner; the count line under the rank comes from evidence(). */
.bb-wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px}
.bb-poster{position:relative;display:flex;flex-direction:column;gap:8px;padding:12px;overflow:hidden}
.hk a.bb-poster{color:var(--tx)}
.bb-pchip{position:absolute;z-index:3;top:20px;right:20px;font:700 12px/1 monospace;letter-spacing:.08em;color:var(--hk-accent-text);background:var(--hk-card);border:1px solid var(--hk-accent);padding:4px 6px}
.bb-count{font:12px/1.3 monospace;color:var(--hk-soft)}
.bb-ph{position:relative;aspect-ratio:4/3;border:1px solid var(--hk-line);display:flex;align-items:center;justify-content:center;
  background:repeating-linear-gradient(45deg,rgba(255,255,255,0.025) 0 6px,transparent 6px 12px),var(--hk-ground);overflow:hidden}
.bb-ph span{font:700 12px/1.3 monospace;letter-spacing:.12em;color:var(--hk-soft);text-align:center;padding:0 8px}
.bb-ph svg{position:absolute;inset:0;width:100%;height:100%}
.bb-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.bb-fig{margin:0 0 12px;max-width:320px}
.bb-dossier .bb-fig .bb-ph{margin-bottom:6px}
.bb-credit{font-size:12px;line-height:1.4;color:var(--hk-mute);margin:8px 0 0}
/* Lieutenants: poster mosaic (decorative) and the dossier roster (names under the seen-in-game label). */
.bb-mosaic{display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(3,1fr);gap:2px;background:var(--hk-ground)}
.bb-mosaic img{position:static;width:100%;height:100%;min-height:0;object-fit:cover}
.bb-roster{margin:0 0 12px}
.bb-sline{max-width:760px;margin:0 0 14px;font-size:14px;line-height:1.5;color:var(--tx)}
.bb-rseen{margin:14px 0 0}
.bb-rseen ul{margin:6px 0}
.bb-roster-h{font-size:14px;line-height:1.5;color:var(--tx);margin:0 0 4px}
.bb-seen{font:700 12px/1 monospace;letter-spacing:.08em;color:var(--hk-accent-text);border:1px solid var(--hk-accent);padding:2px 5px;margin-right:8px;white-space:nowrap}
.bb-lts{list-style:none;margin:10px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:10px}
.bb-lts figure{margin:0}
.bb-lts img{display:block;width:100%;aspect-ratio:1/1;object-fit:cover;border:1px solid var(--hk-line);background:var(--hk-ground)}
.bb-lts figcaption{font:700 12px/1.3 monospace;letter-spacing:.06em;color:var(--hk-text);text-align:center;margin-top:5px;overflow-wrap:anywhere}
.bb-des{margin:0;font-size:22px;font-weight:800;line-height:1.15;color:var(--hk-text)}
.bb-rank{font:700 12px/1.2 monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--hk-accent-text)}
.bb-line{max-width:760px;font-size:14px;line-height:1.5;margin:0;color:var(--hk-soft)}
.bb-bars{display:flex;flex-direction:column;gap:5px}
.bb-bars i{display:block;height:7px;background:rgba(255,255,255,0.13)}
/* Evidence meter: label and count on one line, the bar full width below. */
.bb-meter{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px;font:12px/1.3 monospace;color:var(--hk-soft)}
.bb-meter .bar{order:3;flex:1 1 100%;height:8px;background:rgba(255,180,0,0.25);overflow:hidden}
.bb-meter .fill{display:block;height:100%;background:var(--ok)}
/* Dossiers: plain articles; with JS one opens as a modal dialog. From 900px a dossier on the page sets its image (or
   roster) beside the meter and the fields, under the header and the seen-in-game line; the open dialog keeps one
   column. */
.bb-dossier{scroll-margin-top:70px}
.bb-dossier header{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px 14px;margin-bottom:12px}
.bb-dossier .bb-ph{max-width:320px;margin-bottom:12px}
.bb-fields{display:grid;grid-template-columns:minmax(110px,170px) 1fr;gap:10px 16px;max-width:760px;margin:12px 0 0}
.bb-fields dt{font:700 12px/1.6 monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--hk-soft)}
.bb-fields dd{margin:0;font-size:15px;line-height:1.6;color:var(--tx)}
.bb-fields dd ul{margin:0;padding-left:16px}
@media (min-width:900px){
  .bb-dossier:not(.bb-open){display:grid;grid-template-columns:320px minmax(0,1fr);grid-template-rows:auto auto auto 1fr;column-gap:28px;align-items:start}
  .bb-dossier:not(.bb-open)>header,.bb-dossier:not(.bb-open)>.bb-sline{grid-column:1/-1}
  .bb-dossier:not(.bb-open)>.bb-fig,.bb-dossier:not(.bb-open)>.bb-roster,.bb-dossier:not(.bb-open)>.bb-ph{grid-column:1;grid-row:3/span 2}
  .bb-dossier:not(.bb-open)>.bb-meter{grid-column:2;grid-row:3}
  .bb-dossier:not(.bb-open)>.bb-fields{grid-column:2;grid-row:4}
}
.bb-close{display:none}
.bb-backdrop{display:none}
.bb-open{position:fixed;z-index:1001;top:4vh;left:50%;width:min(760px,92vw);max-height:92vh;overflow:auto;transform:translateX(-50%);
  margin:0;box-shadow:inset 0 0 0 1px var(--hk-accent);animation:bb-in .25s ease-out}
@keyframes bb-in{from{opacity:0}to{opacity:1}}
.bb-open .bb-close{display:inline-flex;align-items:center;min-height:44px;margin-left:auto;font:700 13px/1 monospace;letter-spacing:.12em;color:var(--hk-text);background:transparent;border:1px solid var(--hk-line);padding:0 14px;cursor:pointer}
.bb-backdrop.on{display:block;position:fixed;inset:0;z-index:1000;background:rgba(3,5,8,0.78)}
body.bb-lock{overflow:hidden}
.bb-rel{margin:0;padding:0;list-style:none}
.hk .bb-rel a{display:inline-flex;align-items:center;min-height:44px;font-size:15px;font-weight:600;color:var(--hk-text);text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:3px}
/* Keyboard focus: every link and button that is not a cut card (the kit draws those) gets a visible ring. */
.bb a:not(.hk-cut):focus-visible,.bb button:focus-visible{outline:2px solid var(--hk-accent-text);outline-offset:2px}
@media (max-width:640px){
  .bb-card{padding:16px 16px 18px}
  .bb-branches{grid-template-columns:1fr;padding-top:0}
  .bb-branches::before,.bb-branch::before{display:none}
  .bb-branch{border-left:2px solid var(--hk-line);padding-left:12px;margin-top:14px}
  .bb-fields{grid-template-columns:1fr;gap:4px 0}
  .bb-fields dd{margin-bottom:8px}
}
@media (prefers-reduced-motion:reduce){
  .bb-open{animation:none}
}
`;

function SourceLine({ fact }) {
  return (
    <span className="bb-src">
      {'Source: '}
      <a href={fact.src.href} rel="noopener" target="_blank">{fact.src.label}</a>
      {', section "' + fact.loc + '"'}
    </span>
  );
}

function FactItem({ id }) {
  var f = factById(id);
  return <li>{f.text}<SourceLine fact={f} /></li>;
}

function Unpub({ id }) {
  var u = unpublishedById(id);
  return <span><span className="bb-tag">UNPUBLISHED</span>{u.text}</span>;
}

function Meter({ dossier }) {
  var e = evidence(dossier);
  return (
    <div className="bb-meter" data-confirmed={e.confirmed} data-total={e.total}>
      <span>Evidence</span>
      <span className="bar" role="img" aria-label={e.confirmed + ' of ' + e.total + ' fields confirmed'}><span className="fill" style={{ width: e.pct + '%' }} /></span>
      <span>{e.confirmed + ' of ' + e.total + ' confirmed'}</span>
    </div>
  );
}

// The Lieutenants poster slot: a 3x3 mosaic of the Lieutenants seen in game (decorative, alt=""; the names and
// their source label are in the Lieutenants dossier roster).
function Mosaic() {
  return (
    <div className="bb-ph bb-mosaic">
      {LT_SEEN.names.map(function (lt) {
        var img = lieutenantImageSet(lt, LT_SEEN.mosaicSizes);
        // eslint-disable-next-line @next/next/no-img-element
        return img ? <img key={lt.id} src={img.src} srcSet={img.srcSet} sizes={img.sizes} alt="" loading="lazy" decoding="async" /> : null;
      })}
    </div>
  );
}

// The 4:3 portrait slot: the boss image when the dossier has one (whole, no crop), the Lieutenants mosaic, or the
// pending placeholder. alt: the poster's link label already names the boss, so its image is decorative there.
function Portrait({ dossier, sizes, alt }) {
  if (dossier.id === 'lieutenants') return <Mosaic />;
  var img = bossImageSet(dossier, sizes);
  return (
    <div className="bb-ph">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.src} srcSet={img.srcSet} sizes={img.sizes} alt={alt} loading="lazy" decoding="async" />
      ) : <span>SURVEILLANCE PHOTO PENDING</span>}
    </div>
  );
}

// Brief 188: the Boss Board reward figures the site operator saw on the in-game board cards (REWARDS_SEEN in
// lib/dmz/bosses.js), once, under the sourced reward facts. Same OBSERVED chip as the roster; each figure sits in
// an element marked data-observed-value, the only place on the page a reward amount may appear.
function RewardsSeen() {
  return (
    <section className="bb-rseen" data-rewards-seen="" aria-labelledby="bb-rseen-h">
      <p id="bb-rseen-h" className="bb-roster-h"><span className="bb-seen">OBSERVED</span>{REWARDS_SEEN.label}</p>
      <ul className="bb-facts">
        {REWARDS_SEEN.items.map(function (it) {
          return <li key={it.id} data-reward={it.id}>{it.what + ' showed REWARD '}<span data-observed-value="">{it.value}</span>{'.'}</li>;
        })}
      </ul>
      <p className="bb-line">{REWARDS_SEEN.paid + '.'}</p>
      <p className="bb-line">{REWARDS_SEEN.colossus_note}</p>
      <p className="bb-line">{'Seen on ' + REWARDS_SEEN.observed_date + ', on ' + REWARDS_SEEN.platforms.join(' and ') + '; build not recorded.'}</p>
    </section>
  );
}

// The Lieutenants dossier roster: the nine names seen in game, each with its image, under the source label.
function Roster() {
  return (
    <section className="bb-roster" data-lt-seen="" aria-labelledby="bb-roster-h">
      <p id="bb-roster-h" className="bb-roster-h"><span className="bb-seen">OBSERVED</span>{LT_SEEN.label}</p>
      <p className="bb-line">{LT_SEEN.note}</p>
      <ul className="bb-lts">
        {LT_SEEN.names.map(function (lt) {
          var img = lieutenantImageSet(lt, LT_SEEN.rosterSizes);
          return (
            <li key={lt.id} data-lt={lt.id}>
              <figure>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img.src} srcSet={img.srcSet} sizes={img.sizes} alt={lieutenantImageAlt(lt)} loading="lazy" decoding="async" />
                ) : null}
                <figcaption>{lt.name}</figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
      <p className="bb-credit">{LT_SEEN.credit}</p>
    </section>
  );
}

function Poster({ dossier }) {
  var e = evidence(dossier);
  var line = factById(dossier.fields.profile[0]).text;
  return (
    <a className="hk-cut bb-poster" href={'#' + dossier.id} data-dossier-open={dossier.id} aria-label={'Open the target dossier: ' + dossier.designation + ' (' + dossier.rank + ')'}>
      {bossSeen(dossier.id) ? <span className="bb-pchip">SEEN IN GAME</span> : null}
      <Portrait dossier={dossier} sizes={BOSS_IMAGE.posterSizes} alt="" />
      <span className="bb-rank">{dossier.rank}</span>
      <span className="bb-count">{e.confirmed + ' confirmed, ' + e.unpublished + ' UNPUBLISHED'}</span>
      <span className="bb-des">{dossier.designation}</span>
      <p className="bb-line">{line}</p>
      <span className="bb-bars" aria-hidden="true"><i style={{ width: '82%' }} /><i style={{ width: '64%' }} /><i style={{ width: '46%' }} /></span>
      <Meter dossier={dossier} />
    </a>
  );
}

function Field({ dossier, field }) {
  var v = dossier.fields[field.key];
  var value;
  if (!Array.isArray(v)) value = <Unpub id={v.open} />;
  else if (field.key === 'designation' || field.key === 'rank') {
    // A short value, backed by the facts that state it (their full text is in the profile and lists).
    value = (
      <>
        {field.key === 'designation' ? dossier.designation : dossier.rank}
        {field.key === 'designation' && dossier.note ? ' (' + dossier.note + ')' : ''}
        {v.map(function (id) { return <SourceLine key={id} fact={factById(id)} />; })}
      </>
    );
  } else value = <ul>{v.map(function (id) { return <FactItem key={id} id={id} />; })}</ul>;
  return (
    <>
      <dt>{field.label}</dt>
      <dd data-field={field.key} data-status={Array.isArray(v) ? 'confirmed' : 'unpublished'}>{value}</dd>
    </>
  );
}

function Dossier({ dossier }) {
  var hid = dossier.id + '-h';
  var seen = bossSeen(dossier.id);
  return (
    <article id={dossier.id} className="hk-cut bb-card bb-dossier" data-dossier={dossier.id} aria-labelledby={hid} tabIndex={-1}>
      <header>
        <span className="bb-rank">{'Target dossier / ' + dossier.rank}</span>
        <h3 id={hid} className="bb-des">{dossier.designation}</h3>
        <button type="button" className="bb-close" data-dossier-close="">Close</button>
      </header>
      {seen ? <p className="bb-sline" data-seen={seen.id}><span className="bb-seen">OBSERVED</span>{bossSeenLine(seen)}</p> : null}
      {bossImageSet(dossier) ? (
        <figure className="bb-fig">
          <Portrait dossier={dossier} sizes={BOSS_IMAGE.dossierSizes} alt={bossImageAlt(dossier)} />
          <figcaption className="bb-credit">{BOSS_IMAGE.credit}</figcaption>
        </figure>
      ) : dossier.id === 'lieutenants' ? <Roster /> : <Portrait dossier={dossier} />}
      <Meter dossier={dossier} />
      <dl className="bb-fields">
        {FIELDS.map(function (f) { return <Field key={f.key} dossier={dossier} field={f} />; })}
      </dl>
    </article>
  );
}

function TreeNode({ node, root }) {
  return (
    <div className={'bb-node' + (root ? ' bb-root' : '')} id={node.id}>
      <h3>{node.title}</h3>
      <ul>{node.facts.map(function (id) { return <li key={id}>{factById(id).text}</li>; })}</ul>
    </div>
  );
}

export default function DmzBossesPage() {
  var breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'DMZ', item: 'https://cyberneticpunks.com/dmz' },
      { '@type': 'ListItem', position: 3, name: 'Boss Board', item: PAGE_URL },
    ],
  };
  var webPage = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: TITLE, description: DESC, url: PAGE_URL, dateModified: CONTENT_CHANGED,
    publisher: { '@type': 'Organization', name: 'Cybernetic Punks', url: 'https://cyberneticpunks.com' },
    citation: Object.keys(SOURCES).map(function (k) { return { '@type': 'CreativeWork', name: SOURCES[k].label, url: SOURCES[k].href, datePublished: SOURCES[k].date }; }),
  };
  var commanders = DOSSIERS.filter(function (d) { return d.rank === 'Commander'; });
  var itemList = {
    '@context': 'https://schema.org', '@type': 'ItemList',
    name: 'Commanders named in the DMZ Deep Dives',
    itemListElement: commanders.map(function (d, i) { return { '@type': 'ListItem', position: i + 1, name: d.designation, url: PAGE_URL + '#' + d.id }; }),
  };
  var lieutenants = TREE.branches[0];
  var commandersBranch = TREE.branches[1];

  return (
    <main className={'hk bb ' + exo2.variable} style={Object.assign({ fontFamily: EXO }, DMZ_HUB_VARS)}>
      <style dangerouslySetInnerHTML={{ __html: HUB_KIT_CSS + HUB_PAGE_CSS + CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />

      {/* Header (hub kit): breadcrumb eyebrow, the trust badge, the H1 (its id kept on an inner span), the intro, the
          source-check line. No header stat: the counts are in the Intel status card right below. */}
      <HubPageHeader
        eyebrow={
          <nav aria-label="Breadcrumb" className="bb-crumb">
            <Link href="/dmz">DMZ</Link>
            <span className="bb-crumb-sep">/</span>
            <span>BOSS BOARD</span>
          </nav>
        }
        top={<span className="bb-badge">Based on official posts, not yet verified in-game; boss entries, Lieutenant names and board rewards seen in game</span>}
        title={<span id="bb-h1">Boss Board</span>}
        intro="Target dossiers for the bosses of Modern Warfare 4 DMZ: the Lieutenants you hunt through the Boss Board and the three Commanders named in Activision's Deep Dives. Every line is sourced to an official post, except the Lieutenant names and the Boss Board reward figures, which the site operator saw in game and which are labeled that way; the four boss entries were also seen in game by the site operator and are labeled that way; everything the posts do not state is marked UNPUBLISHED."
      >
        <p className="bb-checked hk-mono">{'Checked against source on ' + LAST_UPDATED}</p>
      </HubPageHeader>

      <div className="hk-pw">
      <CutCard className="bb-status">
        <b>Intel status</b>
        <span className="bb-ok">{FACTS.length + ' confirmed'}</span>
        <span className="bb-unp-c">{UNPUBLISHED.length + ' UNPUBLISHED'}</span>
      </CutCard>

      <section className="hk-cut bb-card" aria-labelledby="bb-tree-h">
        <h2 id="bb-tree-h">The Boss Board</h2>
        <p className="bb-line" style={{ marginBottom: 14 }}>The station, and the two boss types it covers. They are shown side by side: neither Deep Dive says one ranks above the other.</p>
        <div className="bb-tree">
          <TreeNode node={TREE.root} root />
          <span className="bb-stem" aria-hidden="true" />
          <div className="bb-branches">
            {[lieutenants, commandersBranch].map(function (b) {
              return (
                <div className="bb-branch" key={b.id}>
                  <TreeNode node={b} />
                  <div className="bb-kids">
                    {b.nodes.map(function (n) {
                      var unk = n.dossier === 'lieutenants';
                      return <a key={n.dossier + n.title} className={'bb-kid' + (unk ? ' unk' : '')} href={'#' + n.dossier} data-dossier-open={n.dossier}>{n.title}</a>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <ul className="bb-facts" style={{ marginTop: 14 }}>
          {['bb-unlock', 'bb-intel', 'bb-rewards'].map(function (id) { return <FactItem key={id} id={id} />; })}
        </ul>
        <RewardsSeen />
      </section>

      <section className="bb-sec" aria-labelledby="bb-wall-h" style={{ marginBottom: 14 }}>
        <h2 id="bb-wall-h">Target posters</h2>
        <div className="bb-wall">
          {DOSSIERS.map(function (d) { return <Poster key={d.id} dossier={d} />; })}
        </div>
        {DOSSIERS.some(function (d) { return !!bossImageSet(d); }) ? <p className="bb-credit">{BOSS_IMAGE.wallCredit}</p> : null}
      </section>

      <section className="bb-sec" aria-labelledby="bb-dossiers-h">
        <h2 id="bb-dossiers-h">Target dossiers</h2>
        {DOSSIERS.map(function (d) { return <Dossier key={d.id} dossier={d} />; })}
      </section>

      <section className="hk-cut bb-card" aria-labelledby="bb-unp-h">
        <h2 id="bb-unp-h">What the Deep Dives do not say</h2>
        <ul className="bb-facts">
          {UNPUBLISHED.map(function (u) { return <li key={u.id} data-unpublished={u.id}><span className="bb-tag">UNPUBLISHED</span>{u.text}</li>; })}
        </ul>
      </section>

      <section className="hk-cut bb-card" aria-labelledby="bb-log-h">
        <h2 id="bb-log-h">Update log</h2>
        <ul className="bb-facts bb-log">
          {UPDATE_LOG.map(function (u) { return <li key={u.date + u.text}><strong>{u.date}</strong>{' - ' + u.text}</li>; })}
        </ul>
      </section>

      <nav aria-label="Related DMZ pages" className="hk-cut bb-card">
        <h2>Related</h2>
        <ul className="bb-rel">
          {RELATED.map(function (r) { return <li key={r.href}><Link href={r.href}>{r.text}</Link></li>; })}
        </ul>
      </nav>
      </div>

      <div className="bb-backdrop" data-dossier-backdrop="" aria-hidden="true" />
      <DossierController />
    </main>
  );
}
