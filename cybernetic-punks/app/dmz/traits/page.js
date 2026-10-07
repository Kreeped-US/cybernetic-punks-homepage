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
import { emptyStateCopy } from '@/lib/network/launchCopy';
import { fetchTraitData, traitRobots, countVerified, buildColumns } from '@/lib/dmz/traits';
import TraitPlanner from '@/components/dmz/TraitPlanner';

export const dynamic = 'force-dynamic';

var PAGE_URL = 'https://cyberneticpunks.com/dmz/traits';
var TITLE = 'DMZ Trait Planner: Operator Trait Trees';
var DESC = 'Plan DMZ Operator traits: each Operator has its own trait tree and its own Trait Points. Only verified traits are shown; work in progress.';

var JUNE = { label: 'MW4 DMZ Deep Dive (Call of Duty blog, June 6, 2026)', href: 'https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive' };
var PART1 = { label: 'DMZ Deep Dive, Part 1 (Call of Duty blog, Oct 5, 2026)', href: 'https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-deep-dive-hajin' };

// Paraphrased, one source each. Keep in step with the official posts; add nothing they do not say.
var FACTS = [
  { text: 'Each Active Duty Operator keeps its own trait tree, alongside its own backpack and loadout.', src: JUNE },
  { text: 'Trait Points are earned during missions and belong to the Operator who earned them, so they can only be spent on that Operator.', src: JUNE },
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
];

// Official descriptions of the three trees (June Deep Dive). Not in-game tree names.
var OFFICIAL_TREES = ['Combat', 'Scavenging', 'Other capabilities'];

export const metadata = {
  title: { absolute: TITLE },
  description: DESC,
  robots: traitRobots(dmz),
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE + ' | Cybernetic Punks', description: DESC, url: PAGE_URL, siteName: 'Cybernetic Punks', type: 'website' },
  twitter: { card: 'summary', site: '@Cybernetic87250', title: TITLE, description: DESC },
};

function SourceLink({ src }) {
  return <a href={src.href} rel="noopener" target="_blank" style={{ color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{src.label}</a>;
}

export default async function DmzTraitsPage() {
  var data = await fetchTraitData();
  var verified = countVerified(data.traits);
  var empty = emptyStateCopy(dmz, 'traits', 'No traits are verified yet. Traits land here once each one is confirmed from an official source or in-game.');
  var cfg = dmz.traitPlanner || {};

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
        <section aria-label="Trait trees" style={{ marginBottom: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 12 }}>
            {OFFICIAL_TREES.map(function (t) {
              return (
                <div key={t} style={Object.assign({}, card, { borderStyle: 'dashed' })}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6 }}>{t}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'monospace', color: '#ffb400' }}>Layout unconfirmed</div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6, maxWidth: 680, margin: '0 0 14px' }}>
            These are the official descriptions of each tree&apos;s focus, not confirmed in-game tree names.
          </p>
          <div style={card}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>{empty.heading}</div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{empty.text}</p>
          </div>
        </section>
      ) : (
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
            {verified + ' of ' + data.traits.length + ' documented traits verified'}
          </p>
          <TraitPlanner columns={buildColumns(data.trees, data.traits)} tierRule={cfg.tierRule || null} />
        </div>
      )}

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
    </main>
  );
}
