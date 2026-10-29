// app/dmz/traits/page.js
// DMZ TRAIT PLANNER (foundation). Server component, force-dynamic: reads dmz_trait_trees + dmz_traits
// per request (lib/dmz/traits.js; a missing table or read error = zero rows, never a crash).
//
// INDEXING: ALWAYS noindex,follow until dmz.traitPlanner.indexable is true (lib/games/dmz.js). Row
// counts and the launch date never change that. Not in the sitemap. Linked from the DMZ nav (Traits
// tab, app/dmz/DmzNav.js), the /dmz hub "In progress" row and the DMZ footer Explore list.
// Canonical is fixed and self-referencing, with no query parameters.
//
// CONTENT: the written facts below are paraphrased from the official sources the DMZ config cites
// (June Deep Dive, Deep Dive Part 1, Deep Dive Part 2, the official FOB Station Intel graphic
// "Operator Traits" observed by Justin, and the Infinity Ward post), each crediting its source. No
// trait NAMES live here (it is not known which listed trait is a random Minor Trait); counts and limits
// appear only as sourced facts. With zero VERIFIED trait rows the page shows the three trees by their
// official names (Part 2 and the graphic), each as a plate with its slot STRUCTURE only
// (lib/dmz/traitLayout.js: unnamed Major slots, "?" Minor slots, one Start slot) and an illustrative example
// path, under a caption saying the layout is not yet confirmed. That structure is the REPORTED (attributed)
// tier from published screenshots, kept in its own group (ATTRIBUTED), never in FACTS.

import Link from 'next/link';
import { dmz } from '@/lib/games/dmz';
import { fetchDmzLinkContent } from '@/lib/dmz/routeContentData';
import { gatedHref } from '@/lib/games/linkGate';
import { fetchTraitData, traitPageRobots, countVerified, buildColumns } from '@/lib/dmz/traits';
import { acceptShareCode, cardImagePath } from '@/lib/dmz/traitShare';
import { decodeBuild } from '@/lib/dmz/traitBuild';
import TraitPlanner from '@/components/dmz/TraitPlanner';
import TraitEmptyBoard from '@/components/dmz/TraitEmptyBoard';
import HubPageHeader, { HUB_PAGE_CSS } from '@/components/game/HubPageHeader';
import { HUB_KIT_CSS } from '@/components/game/hubKitCss';
import { DMZ_HUB_VARS } from '@/lib/dmz/hubTheme';
import { Exo_2 } from 'next/font/google';

export const dynamic = 'force-dynamic';

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

// Page styles (Brief 219: the hub kit, as the other DMZ pages), scoped to the trt- classes. No text under 12px;
// inline text links reach 44px by vertical padding (the lines do not move); every link gets a visible focus ring.
// The first two rules tighten the shared header and container on this page only, so the plates stay high on a phone.
var TRAITS_CSS = `
.hk .hk-ph-in{padding-top:24px;padding-bottom:24px}
.hk .hk-pw{padding-top:24px}
.hk .hk-ph-top{margin-bottom:10px}
.trt-crumb{display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:.14em}
.trt-crumb-sep{color:var(--hk-mute)}
.hk .trt-crumb a{padding:0 10px;margin:0 -10px}
.trt-crumb-here{color:var(--hk-soft)}
.trt-wip{display:inline-block;font:700 12px/1.4 monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--hk-soft);box-shadow:inset 0 0 0 1px var(--hk-line);padding:4px 10px}
.trt-h2{margin:0 0 12px;font-size:clamp(20px,3vw,24px);font-weight:800;color:var(--hk-text)}
.trt-card{padding:18px 20px}
.trt-count{margin:0 0 10px;font:13px/1.5 monospace;color:var(--hk-soft)}
.trt-list{margin:0;padding-left:18px;max-width:760px;font-size:15px;line-height:1.7;color:var(--hk-soft)}
.trt-srcl{font-size:13px}
.hk a.trt-src,.trt-related a{padding:14px 0;color:var(--hk-text);text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:3px}
.hk a.trt-src:focus-visible,.trt-related a:focus-visible,.trt-crumb a:focus-visible{outline:2px solid var(--hk-accent);outline-offset:2px}
.trt-related{margin-top:28px}
.trt-related ul{margin:0;padding-left:18px;font-size:15px;line-height:1.8;color:var(--hk-soft)}
`;

var PAGE_URL = 'https://cyberneticpunks.com/dmz/traits';

// Related DMZ pages (plain links, both states). Hub routes only; no DMZ article links until the Part 2
// rewrite. Labels are the site's own: the Hajin link uses the /dmz/regions page H1. Brief 190: an entry whose
// route is gated (lib/games/linkGate.js, the layout's cached map) is dropped, e.g. /dmz/loadouts below its
// navMinArticles.
var RELATED = [
  { href: '/dmz', text: 'DMZ hub: field intel and guides' },
  { href: '/dmz/fob', text: 'FOB stations, including the Active Duty Operators station' },
  { href: '/dmz/regions', text: 'Hajin Regions' },
  { href: '/dmz/loadouts', text: 'DMZ loadout coverage' },
];
var TITLE = 'DMZ Trait Planner: Operator Trait Trees';
var DESC = 'Plan DMZ Operator traits: each Operator has its own trait tree and its own Trait Points. Only verified traits are shown; work in progress.';

var JUNE = { label: 'MW4 DMZ Deep Dive (Call of Duty blog, June 6, 2026)', href: 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive' };
var PART1 = { label: 'DMZ Deep Dive, Part 1 (Call of Duty blog, Oct 5, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-deep-dive-hajin' };
// Official Infinity Ward post (URL supplied by Justin; X is not readable from the workspace).
var IW_RESCUE = { label: 'Infinity Ward on X (Oct 7, 2026), which calls them skill trees', href: 'https://x.com/InfinityWard/status/2107947690659360867' };
var PART2 = { label: 'DMZ Deep Dive, Part 2 (Call of Duty blog, Oct 9, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide' };
// Official FOB Station Intel graphic "Operator Traits" (in-game/official graphic, observed by Justin; no
// public URL is recorded, so it renders as plain text, not a link).
var GRAPHIC = { label: 'official FOB Station Intel graphic "Operator Traits", observed by Justin, 2026-10-09', href: null };
// ATTRIBUTED source (the network "Reported" tier, below confirmed): published screenshots of the in-game
// Traits screen. No URLs recorded yet, so the credit is plain text until Justin supplies them.
var SHOTS = { label: 'in-game Traits screen as shown in screenshots published by Game Rant and a second outlet, viewed by Justin, 2026-10-21', href: null };

// Paraphrased, one source each. Keep in step with the official sources; add nothing they do not say.
// ORDER MATTERS: the empty board reads FACTS[1] (loop), FACTS[4] (tree focus) and FACTS[5] (Dog Tag), so
// new facts are APPENDED. FACTS[1] (June: earned during missions) and the graphic's exfil/Dog Tag fact
// are both kept, each credited: the two sources say compatible things at different detail.
var FACTS = [
  { text: 'Each Active Duty Operator keeps its own trait tree, alongside its own backpack and loadout.', src: JUNE },
  { text: 'Trait Points are earned during missions and belong to the Operator who earned them, so they can only be spent on that Operator.', src: JUNE },
  { text: 'If an Operator goes down and is lost in action, the MIA system lets you pay at the FOB for a rescue that recovers them, so they continue their progression instead of starting from scratch.', src: JUNE },
  { text: 'A rescued Operator comes back with their trait tree progress and the experience earned in that deployment.', src: IW_RESCUE },
  { text: 'There are three trait trees, each focused on a different area: combat, scavenging, and other capabilities.', src: JUNE },
  { text: 'Raising your Dog Tag level awards Operator Traits.', src: PART1 },
  { text: 'DMZ Player Level runs from 1 to 70. How that level relates to traits is not stated.', src: PART1 },
  { text: 'There are 66 Traits, spread equally across three trees: Warfighter, Scout and Survivalist.', src: PART2 },
  { text: 'Each tree has 22 Traits: 6 Major and 16 Minor. Minor Traits are randomized.', src: PART2 },
  { text: 'An Operator can hold at most 18 Trait Points.', src: PART2 },
  { text: 'You start with two Active Duty slots and can unlock one more through your DMZ level; the Vault Edition starts with three.', src: PART2 },
  { text: 'An Operator who goes MIA can be brought back for DMZ Cash, at a cost set by their Trait Points, or dismissed.', src: PART2 },
  { text: 'Each Dog Tag level awards one Trait Point. There are 18 Dog Tag levels, from Steel I to Onyx III.', src: GRAPHIC },
  { text: 'Trait Points belong to each Operator and are earned by exfiltrating with that Operator; DMZ Player XP levels up the Dog Tag.', src: GRAPHIC },
  { text: 'In each branch of two or three traits you pick one, and the choice is locked once made.', src: GRAPHIC },
  { text: 'Some traits are hidden and selected at random as you progress.', src: GRAPHIC },
  { text: 'With 18 points you can fill two trees at nine points each, or spread them across all three.', src: GRAPHIC },
  { text: 'The more traits an Operator has, the more an MIA recovery costs.', src: GRAPHIC },
  { text: 'DMZ Operator Prestige follows Onyx III.', src: GRAPHIC },
];

// REPORTED (attributed tier): structure only, from published screenshots, not yet confirmed in our own
// capture. Rendered as its own clearly labelled group, never mixed into the confirmed FACTS. No trait names.
var ATTRIBUTED = [
  { text: 'Each tree is laid out in nine rows of 2, 3, 3, 2, 3, 3, 2, 3 and 1 slots: the pairs (rows 1, 4 and 7) are Major slots, the triples are Minor slots, and row 9 is a single center slot.', src: SHOTS },
  { text: 'You make one pick per row, and each row is one branch.', src: SHOTS },
  { text: 'Picks proceed from the bottom row upward.', src: SHOTS },
];
var LAYOUT_CAPTION = 'Layout as shown in published in-game screenshots; not yet confirmed in our own capture. Trait names, slot contents and point costs are not confirmed. The path shown is an example, not a recommended build.';

// Still open after Part 2 and the graphic. Narrowed where those sources answered part of an item.
var UNCONFIRMED_LIST = [
  'How many Operators an account can hold beyond its Active Duty slots',
  'Which trait sits in which slot, and the layout in our own capture',
  'Per-trait point cost (appears to be 1; not stated)',
  'Which listed traits are the randomized Minor Traits',
  'How much DMZ Player XP each Dog Tag level takes',
  'What DMZ Operator Prestige and Permanent Prestige Traits give',
  'Whether a locked trait choice can be reset or refunded',
  'What happens to a dismissed Operator\'s trait tree',
  'The DMZ Cash cost of an MIA recovery',
];

// The three trees by their official names (Deep Dive Part 2 and the official FOB Station Intel graphic),
// in the order Part 2 lists them. Accent follows the order, never a name. The June Deep Dive's focus
// descriptions (combat, scavenging, other capabilities) stay in FACTS[4]; no source says which focus
// goes with which tree, so the names are not paired with a focus.
var OFFICIAL_TREES = [
  { slug: 'warfighter', label: 'Warfighter', accent: '#e8604a' },
  { slug: 'scout', label: 'Scout', accent: '#d9a947' },
  { slug: 'survivalist', label: 'Survivalist', accent: '#3fbfae' },
];
var TREE_NOTE = 'Tree names per Deep Dive Part 2 and the official FOB Station Intel graphic. The June Deep Dive describes the trees\' focus as combat, scavenging and other capabilities; which focus goes with which tree is not stated.';

// Per-tree drawer list: the tree-level items of UNCONFIRMED_LIST, verbatim.
var TREE_UNCONFIRMED = [UNCONFIRMED_LIST[1], UNCONFIRMED_LIST[2], UNCONFIRMED_LIST[3]];

// Our own data status (not a game fact), shown under "Awaiting verification".
var EMPTY_NOTE = 'No traits are verified yet. Traits land here once each one is confirmed from an official source or in-game.';

// ?b= (a shared build). Any b at all marks the request as a share (noindex); only a code that passes
// the share limits is used (for the card image, and decoded by the planner).
function shareParam(sp) {
  var raw = sp ? sp.b : undefined;
  var first = Array.isArray(raw) ? raw[0] : raw;
  return { hasShare: raw !== undefined, code: acceptShareCode(first) };
}

// SHARE LINKS: any request with b is noindex,follow ALWAYS (traitPageRobots), even after
// dmz.traitPlanner.indexable is flipped. The canonical never carries query params. og:image and
// twitter:image always point at the share card route (/og/dmz-traits), with b only when it passes
// the limits; without b it is the generic card.
export async function generateMetadata({ searchParams }) {
  var share = shareParam(await searchParams);
  var image = { url: cardImagePath(share.code), width: 1200, height: 630, alt: 'DMZ Trait Planner on Cybernetic Punks' };
  return {
    title: { absolute: TITLE },
    description: DESC,
    robots: traitPageRobots(dmz, share.hasShare),
    alternates: { canonical: PAGE_URL },
    openGraph: { title: TITLE + ' | Cybernetic Punks', description: DESC, url: PAGE_URL, siteName: 'Cybernetic Punks', type: 'website', images: [image] },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: TITLE, description: DESC, images: [image.url] },
  };
}

function SourceLink({ src }) {
  // A source with no public URL (the observed FOB graphic) renders as plain text.
  if (!src.href) return <span>{src.label}</span>;
  return <a href={src.href} rel="noopener" target="_blank" className="trt-src">{src.label}</a>;
}

export default async function DmzTraitsPage({ searchParams }) {
  var [data, sp, linkContent] = await Promise.all([fetchTraitData(), searchParams, fetchDmzLinkContent()]);
  var verified = countVerified(data.traits);
  var cfg = dmz.traitPlanner || {};
  // A shared build is decoded here, on the server, against the verified-node map: unknown and
  // unverified picks are dropped (decodeBuild). With zero verified rows the empty state renders and
  // b is ignored.
  var columns = verified > 0 ? buildColumns(data.trees, data.traits) : null;
  var sharedState = null;
  var code = shareParam(sp).code;
  if (columns && code) {
    var nodes = {};
    columns.forEach(function (col) { col.nodes.forEach(function (n) { nodes[n.slug] = n; }); });
    sharedState = decodeBuild(code, nodes);
  }

  // Brief 219: on the hub kit (components/game: HubPageHeader, hubKitCss; DMZ values for the --hk-* properties from
  // lib/dmz/hubTheme.js). Same copy, ids, headings and links in the same order: the breadcrumb is the header
  // eyebrow, the work-in-progress line its top slot, then the H1 and the intro; cards are cut cards.
  return (
    <main className={'hk ' + exo2.variable} style={Object.assign({ fontFamily: EXO }, DMZ_HUB_VARS)}>
      <style dangerouslySetInnerHTML={{ __html: HUB_KIT_CSS + HUB_PAGE_CSS + TRAITS_CSS }} />
      <HubPageHeader
        eyebrow={
          <nav aria-label="Breadcrumb" className="trt-crumb">
            <Link href="/dmz">DMZ</Link>
            <span className="trt-crumb-sep">/</span>
            <span className="trt-crumb-here">TRAIT PLANNER</span>
          </nav>
        }
        top={<div className="trt-wip">Work in progress: this page changes often as traits are confirmed</div>}
        title="DMZ Trait Planner"
        intro="Plan how each Operator spends Trait Points. Every Operator has its own tree and its own points, so the planner keeps a separate budget for each one. Only traits verified from an official source or in-game are shown as fact."
      />

      <div className="hk-pw">
      {verified === 0 ? (
        // Designed empty state: tree panels + drawers, the confirmed loop, and the status board (which
        // carries the same FACTS and UNCONFIRMED_LIST as the planner branch's two sections below).
        <TraitEmptyBoard
          trees={OFFICIAL_TREES}
          treeNote={TREE_NOTE}
          layoutCaption={LAYOUT_CAPTION}
          attributed={ATTRIBUTED}
          focusFact={FACTS[4]}
          loopFact={FACTS[1]}
          dogTagFact={FACTS[5]}
          facts={FACTS}
          unconfirmed={UNCONFIRMED_LIST}
          treeUnconfirmed={TREE_UNCONFIRMED}
          emptyNote={EMPTY_NOTE}
        />
      ) : (
        <>
          <div style={{ marginBottom: 28 }}>
            <p className="trt-count">
              {verified + ' of ' + data.traits.length + ' documented traits verified'}
            </p>
            <TraitPlanner columns={columns} tierRule={cfg.tierRule || null} initialState={sharedState || undefined} shareUrl={PAGE_URL} />
          </div>

          <section className="hk-cut trt-card" style={{ marginBottom: 14 }}>
            <h2 className="trt-h2">What is confirmed</h2>
            <ul className="trt-list">
              {FACTS.map(function (f) {
                return <li key={f.text}>{f.text + ' '}<span className="trt-srcl">(Source: <SourceLink src={f.src} />)</span></li>;
              })}
            </ul>
          </section>

          <section className="hk-cut trt-card" style={{ marginBottom: 14 }}>
            <h2 className="trt-h2">Reported, not yet confirmed by us</h2>
            <ul className="trt-list">
              {ATTRIBUTED.map(function (f) {
                return <li key={f.text}>{f.text + ' '}<span className="trt-srcl">(Source: <SourceLink src={f.src} />)</span></li>;
              })}
            </ul>
          </section>

          <section className="hk-cut trt-card">
            <h2 className="trt-h2">Not yet confirmed</h2>
            <ul className="trt-list">
              {UNCONFIRMED_LIST.map(function (u) { return <li key={u}>{u}</li>; })}
            </ul>
          </section>
        </>
      )}

      <nav aria-label="Related DMZ pages" className="hk-cut trt-card trt-related">
        <h2 className="trt-h2">Related</h2>
        <ul>
          {RELATED.filter(function (r) { return gatedHref(r.href, linkContent) !== null; }).map(function (r) {
            return <li key={r.href}><Link href={r.href}>{r.text}</Link></li>;
          })}
        </ul>
      </nav>
      </div>
    </main>
  );
}
