// app/dmz/traits/page.js
// DMZ TRAIT PLANNER (foundation). Server component, force-dynamic: reads dmz_trait_trees + dmz_traits
// per request (lib/dmz/traits.js; a missing table or read error = zero rows, never a crash).
//
// INDEXING: ALWAYS noindex,follow until dmz.traitPlanner.indexable is true (lib/games/dmz.js). Row
// counts and the launch date never change that. Not in the sitemap. Linked from the DMZ nav (Traits
// tab, app/dmz/DmzNav.js), the /dmz hub "Coming after launch" row and the DMZ footer Explore list.
// Canonical is fixed and self-referencing, with no query parameters.
//
// CONTENT: the written facts below are paraphrased from the official sources the DMZ config cites
// (June Deep Dive, Deep Dive Part 1, Deep Dive Part 2, the official FOB Station Intel graphic
// "Operator Traits" observed by Justin, and the Infinity Ward post), each crediting its source. No
// trait NAMES live here (it is not known which listed trait is a random Minor Trait); counts and limits
// appear only as sourced facts. With zero VERIFIED trait rows the page shows the three trees by their
// official names (Part 2 and the graphic), each with its slot STRUCTURE only (lib/dmz/traitLayout.js:
// unnamed Major slots, "?" Minor slots, one Start slot) and "layout unconfirmed". That structure is the
// REPORTED (attributed) tier from published screenshots, kept in its own group (ATTRIBUTED), never in FACTS.

import Link from 'next/link';
import { dmz } from '@/lib/games/dmz';
import { fetchTraitData, traitPageRobots, countVerified, buildColumns } from '@/lib/dmz/traits';
import { acceptShareCode, cardImagePath } from '@/lib/dmz/traitShare';
import { decodeBuild } from '@/lib/dmz/traitBuild';
import TraitPlanner from '@/components/dmz/TraitPlanner';
import TraitEmptyBoard from '@/components/dmz/TraitEmptyBoard';

export const dynamic = 'force-dynamic';

var PAGE_URL = 'https://cyberneticpunks.com/dmz/traits';

// Related DMZ pages (plain links, both states). Hub routes only; no DMZ article links until the Part 2
// rewrite. Labels are the site's own: the Hajin link uses the /dmz/regions page H1.
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
var LAYOUT_CAPTION = 'Layout as shown in published in-game screenshots; not yet confirmed in our own capture.';

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
  return <a href={src.href} rel="noopener" target="_blank" style={{ color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{src.label}</a>;
}

export default async function DmzTraitsPage({ searchParams }) {
  var [data, sp] = await Promise.all([fetchTraitData(), searchParams]);
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

  var h2 = { fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, letterSpacing: 1, color: '#fff', margin: '0 0 10px' };
  var card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '16px 18px' };

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 20px 96px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 12, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
        <Link href="/dmz" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>DMZ</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>TRAIT PLANNER</span>
      </div>

      <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-tertiary)', border: '1px solid var(--border)', borderRadius: 2, padding: '3px 8px', marginBottom: 12 }}>
        Work in progress: this page changes often as traits are confirmed
      </div>

      <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, letterSpacing: 1, color: '#fff', margin: '0 0 12px' }}>DMZ Trait Planner</h1>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 680, margin: '0 0 26px' }}>
        Plan how each Operator spends Trait Points. Every Operator has its own tree and its own points, so the planner keeps a separate budget for each one. Only traits verified from an official source or in-game are shown as fact.
      </p>

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
            <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
              {verified + ' of ' + data.traits.length + ' documented traits verified'}
            </p>
            <TraitPlanner columns={columns} tierRule={cfg.tierRule || null} initialState={sharedState || undefined} shareUrl={PAGE_URL} />
          </div>

          <section style={Object.assign({}, card, { marginBottom: 14 })}>
            <h2 style={h2}>What is confirmed</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {FACTS.map(function (f) {
                return <li key={f.text}>{f.text + ' '}<span style={{ fontSize: 12 }}>(Source: <SourceLink src={f.src} />)</span></li>;
              })}
            </ul>
          </section>

          <section style={Object.assign({}, card, { marginBottom: 14 })}>
            <h2 style={h2}>Reported, not yet confirmed by us</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {ATTRIBUTED.map(function (f) {
                return <li key={f.text}>{f.text + ' '}<span style={{ fontSize: 12 }}>(Source: <SourceLink src={f.src} />)</span></li>;
              })}
            </ul>
          </section>

          <section style={card}>
            <h2 style={h2}>Not yet confirmed</h2>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              {UNCONFIRMED_LIST.map(function (u) { return <li key={u}>{u}</li>; })}
            </ul>
          </section>
        </>
      )}

      <nav aria-label="Related DMZ pages" style={Object.assign({}, card, { marginTop: 14 })}>
        <h2 style={h2}>Related</h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.8 }}>
          {RELATED.map(function (r) {
            return <li key={r.href}><Link href={r.href} style={{ color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.text}</Link></li>;
          })}
        </ul>
      </nav>
    </main>
  );
}
