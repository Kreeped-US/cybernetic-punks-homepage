// app/dmz/traits/page.js
// DMZ TRAIT PLANNER (foundation). Server component, force-dynamic: reads dmz_trait_trees + dmz_traits
// per request (lib/dmz/traits.js; a missing table or read error = zero rows, never a crash).
//
// INDEXING: ALWAYS noindex,follow until dmz.traitPlanner.indexable is true (lib/games/dmz.js). Row
// counts and the launch date never change that. Not in the sitemap, not in any nav or hub link list:
// reachable by direct URL only. Canonical is fixed and self-referencing, with no query parameters.
//
// CONTENT: the written facts below are paraphrased from the official posts the DMZ config already
// cites (June Deep Dive, Deep Dive Part 1) and each links to its source. No trait names, counts,
// costs or rates live here. With zero VERIFIED trait rows the page shows the three trees by their
// official descriptions with "layout unconfirmed" and no node grid.

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

// Paraphrased, one source each. Keep in step with the official posts; add nothing they do not say.
var FACTS = [
  { text: 'Each Active Duty Operator keeps its own trait tree, alongside its own backpack and loadout.', src: JUNE },
  { text: 'Trait Points are earned during missions and belong to the Operator who earned them, so they can only be spent on that Operator.', src: JUNE },
  { text: 'If an Operator goes down and is lost in action, the MIA system lets you pay at the FOB for a rescue that recovers them, so they continue their progression instead of starting from scratch.', src: JUNE },
  { text: 'A rescued Operator comes back with their trait tree progress and the experience earned in that deployment.', src: IW_RESCUE },
  { text: 'There are three trait trees, each focused on a different area: combat, scavenging, and other capabilities.', src: JUNE },
  { text: 'Raising your Dog Tag level awards Operator Traits.', src: PART1 },
  { text: 'DMZ Player Level runs from 1 to 70. How that level relates to traits is not stated.', src: PART1 },
];

var UNCONFIRMED_LIST = [
  'How many Operators an account can hold, and how Active Duty slots work',
  'How many traits each tree has, and how they are laid out',
  'The point cost of each trait, and how many points an Operator can hold',
  'Prerequisites between traits, and whether each row is pick-one or take-all',
  'How fast Trait Points are earned',
  'Prestige and Permanent Prestige Traits',
  'Whether traits can be reset or refunded',
  'What happens to a lost Operator\'s trait tree if no rescue is paid',
  'How much a rescue costs',
];

// Official descriptions of the three trees (June Deep Dive). Not in-game tree names. Accent per focus.
var OFFICIAL_TREES = [
  { slug: 'combat', label: 'Combat', accent: '#e8604a' },
  { slug: 'scavenging', label: 'Scavenging', accent: '#d9a947' },
  { slug: 'other', label: 'Other capabilities', accent: '#3fbfae' },
];

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
        <Link href="/dmz" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>DMZ</Link>
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
