// app/dmz/bounties/page.js
// DMZ BOUNTY SYSTEM explainer. Static, hand-written, sourced page (no DB read). Every fact, open
// question and update-log line comes from lib/dmz/bounties.js, which the OG image and the tests also
// read, so the visible counts, the card and the checks can never disagree.
//
// INDEXING: inherits the DMZ layout gate (dmz.indexable). Listed explicitly in lib/sitemap/eligible.js
// with a fixed lastmod (CONTENT_CHANGED). JSON-LD: BreadcrumbList + WebPage (dateModified = CONTENT_CHANGED,
// citations = the sources). NO FAQPage schema (doctrine A1): the FAQ is visible text only. The visible
// "Checked against source on" line stays on LAST_UPDATED (the source-check date; see lib/dmz/bounties.js).

import Link from 'next/link';
import { Exo_2 } from 'next/font/google';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import CutCard from '@/components/game/CutCard';
import HubPageHeader, { HUB_PAGE_CSS } from '@/components/game/HubPageHeader';
import { HUB_KIT_CSS } from '@/components/game/hubKitCss';
import { DMZ_HUB_VARS } from '@/lib/dmz/hubTheme';
import { SOURCES, FACTS, UNCONFIRMED_LIST, UPDATE_LOG, LAST_UPDATED, CONTENT_CHANGED, VIDEO_EXAMPLE_NOTE, BOSS_REWARDS_POINTER, PAGE_URL, TITLE, DESC, FAQ, counts } from '@/lib/dmz/bounties';

export const metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE + ' | Cybernetic Punks', description: DESC, url: PAGE_URL, siteName: 'Cybernetic Punks', type: 'article' },
  twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: TITLE, description: DESC },
};

var RELATED = [
  { href: '/dmz/fob', text: 'FOB stations at a glance, including the Bounty Leaderboard' },
  { href: '/dmz/fob/dmz-forward-operating-base-every-hub-system-detailed', text: 'DMZ Forward Operating Base: every hub system detailed' },
  { href: '/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals', text: 'DMZ Hajin: 13 locations and the FOB in Deep Dive Part 1' },
  { href: '/dmz', text: 'DMZ hub: field intel and guides' },
];

const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

// Brief 209: the page is on the hub kit (components/game: HubPageHeader, CutCard, hubKitCss; DMZ values
// for the --hk-* properties from lib/dmz/hubTheme.js), like the other DMZ pages. Text blocks are capped at 760px inside
// the 1160px container. No text under 12px. Notes and qualifiers use the fact text's own size and color (never weaker
// than the line they qualify). The first three rules tighten the shared header and container spacing on this page
// only, so the first sourced fact stays high on a phone. Brief 210: each fact carries a [n] marker (44px tap area
// from padding, which does not change the line height) linking its entry in the Sources list at the bottom.
var PAGE_CSS = `
.hk .hk-ph-in{padding-top:24px;padding-bottom:24px}
.hk .hk-ph-top{margin-bottom:14px}
.hk .hk-pw{padding-top:20px}
.dmzb-crumb{display:flex;align-items:center;gap:8px;flex-wrap:wrap;letter-spacing:.14em}
.dmzb-crumb-sep{opacity:.6}
.dmzb-trust{display:inline-block;padding:4px 10px;border:1px solid var(--hk-accent);font:700 12px/1.3 monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--hk-accent-text)}
.dmzb-checked{margin:14px 0 0;font-size:13px;color:var(--hk-soft)}
.dmzb-sec{max-width:760px;margin:0 0 14px;padding:18px 22px 20px}
.dmzb-h2{margin:0 0 12px;font-size:22px;font-weight:800;line-height:1.3;color:var(--hk-text)}
.dmzb-h3{margin:16px 0 8px;font-size:16px;font-weight:700;color:var(--hk-text)}
.dmzb-lab{margin:0 0 8px;font:700 12px/1.3 monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--hk-soft)}
.dmzb-list{margin:0;padding-left:18px;font-size:15px;line-height:1.7;color:#d5dae0}
.dmzb-list li::marker{color:var(--hk-accent-text)}
.hk a.dmzb-m{padding:15px 12px;margin:0 -8px;font:700 13px/1 monospace;color:var(--hk-accent-text);text-decoration:none;white-space:nowrap}
.hk a.dmzb-m:hover{text-decoration:underline}
.hk a.dmzb-m:focus-visible{outline:2px solid var(--hk-accent-text);outline-offset:-11px}
.dmzb-cite{white-space:nowrap}
.dmzb-obs{font-size:inherit;color:inherit}
.dmzb-note{display:block;font-size:inherit;font-style:italic;color:inherit}
.hk .dmzb-a{color:inherit;text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:2px}
.dmzb-np{margin:10px 0 0;font-size:15px;line-height:1.6;color:#d5dae0}
.hk-cut.dmzb-status{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;max-width:760px;margin:0 0 12px;padding:14px 20px;box-shadow:inset 3px 0 0 var(--hk-accent),inset 0 0 0 1px var(--hk-line)}
.dmzb-status-h{margin-right:6px;font-size:17px;font-weight:800;color:var(--hk-text)}
.dmzb-status .hk-tag{font-size:13px;padding:4px 10px}
.hk-tag.dmzb-ok{color:#8fe0a8;border-color:#4a9d5b}
.hk-tag.dmzb-unc{color:#ffb400;border-color:#ffb400}
.dmzb-det{margin-top:14px}
.dmzb-det summary{display:flex;align-items:center;min-height:44px;cursor:pointer;font-size:15px;font-weight:700;color:var(--hk-text)}
.dmzb-det summary::marker{color:var(--hk-accent-text)}
.dmzb-det-p{margin:4px 0 10px;font-size:15px;line-height:1.6;color:#d5dae0}
.dmzb-unc-tag{margin-right:8px;font:700 12px/1 monospace;letter-spacing:.08em;color:#ffb400}
.dmzb-log{font-size:15px}
.dmzb-faq{margin-bottom:14px}
.dmzb-faq h3{margin:0 0 4px;font-size:16px;font-weight:700;color:var(--hk-text)}
.dmzb-faq p{margin:0;font-size:15px;line-height:1.65;color:#d5dae0}
.dmzb-srcs{margin:0;padding:0;list-style:none;font-size:15px;line-height:1.6;color:#d5dae0}
.dmzb-srcs li{margin:0 0 12px;scroll-margin-top:96px}
.dmzb-srcs li:target{outline:2px solid var(--hk-accent);outline-offset:4px}
.dmzb-srcn{margin-right:6px;font:700 13px/1 monospace;color:var(--hk-accent-text)}
.dmzb-locs{display:block;font-size:inherit;color:inherit}
.dmzb-rel{margin:0;padding:0;list-style:none}
.hk .dmzb-rel a{display:inline-flex;align-items:center;min-height:44px;font-size:15px;font-weight:600;color:var(--hk-text);text-decoration:underline;text-decoration-color:var(--hk-accent);text-underline-offset:3px}
`;

function SourceLink({ src }) {
  if (!src.href) return <span>{src.label}</span>;
  if (!src.altLabel) return <a href={src.href} rel="noopener" target="_blank" className="dmzb-a">{src.label}</a>;
  // A source with two official posts: the label links the first, a short second link follows.
  return <><a href={src.href} rel="noopener" target="_blank" className="dmzb-a">{src.label}</a>{'; '}<a href={src.alt} rel="noopener" target="_blank" className="dmzb-a">{src.altLabel}</a></>;
}

// Brief 191: "The short version", five existing facts by id, rendered exactly as in their own groups (no new
// text, no new source). Each also stays in its own group below.
var SHORT_VERSION = ['wanted-four-kills', 'payoff-any-bounty', 'claim-bounty', 'clear-bounty', 'hunter-reward-scale'];

// Brief 210: topic groups, a page-level map from fact id to the list it renders in (the facts' own `section`
// values in lib/dmz/bounties.js are not edited). Every FACTS id is placed exactly once (lib/dmz/bounties.test.mjs
// reads this map and checks it). Order here is render order.
var GROUPS = {
  get: ['kill-cost', 'bounty-on-dogtag', 'bounty-raisers', 'notoriety', 'dangerous-hunters', 'rewards-dangers', 'wanted-four-kills', 'wanted-proximity-alert', 'bounty-factors'],
  clear: ['stations-payoff', 'payoff-station', 'payoff-any-bounty', 'clear-bounty', 'clear-revived', 'death-loses-bounty'],
  hunt: ['stations-review', 'intel-buy', 'wanted-list-free', 'intel-cost-scales', 'tacmap-circle', 'claim-bounty', 'hunter-reward-scale', 'bounty-cash'],
  huntOp: ['hunt-op', 'dynamic-ops-phones'],
  video: ['video-status', 'video-intel', 'video-hunt-op', 'video-hud'],
  leaderboard: ['lb-weekly-top50', 'leaderboard-scope', 'most-wanted-weekly', 'board-columns', 'lb-available', 'leaderboard-tracks', 'leaderboard-earn'],
  dogtags: ['dogtag-payouts', 'dogtag-case', 'dogtag-case-level20', 'case-upgrades-payout', 'lt-case-broadcast', 'lt-case-leave'],
  launch: ['early-access', 'early-access-eligibility'],
};

function factById(id) {
  return FACTS.find(function (x) { return x.id === id; });
}

// Sources are numbered by first appearance in render order (the short version first, then the groups). A source no
// fact cites is still listed, after the cited ones, so nothing is dropped.
var SOURCE_ORDER = [];
[].concat(SHORT_VERSION, ...Object.values(GROUPS)).forEach(function (id) {
  var f = factById(id);
  if (f && SOURCE_ORDER.indexOf(f.src) === -1) SOURCE_ORDER.push(f.src);
});
Object.keys(SOURCES).forEach(function (k) { if (SOURCE_ORDER.indexOf(SOURCES[k]) === -1) SOURCE_ORDER.push(SOURCES[k]); });

function sourceNo(src) {
  return SOURCE_ORDER.indexOf(src) + 1;
}

// The confidence qualifier, verbatim from the source label, for a source the operator observed ("observed by ...").
function observedQualifier(src) {
  var m = /observed by [^),]+/.exec(src.label);
  return m ? m[0] : null;
}

// One sourced fact, as every list on this page renders it (text, [n] marker, the observed qualifier if any, optional
// note). The <li> keeps its exact attributes (lib/dmz/bounties.test.mjs counts '<li style="margin-bottom:6px">' + text).
function FactItem({ f }) {
  var n = sourceNo(f.src);
  var obs = observedQualifier(f.src);
  return (
    <li style={{ marginBottom: 6 }}>
      {f.text + ' '}
      <span className="dmzb-cite">
        <a href={'#src-' + n} className="dmzb-m" aria-label={'Source ' + n}>{'[' + n + ']'}</a>
        {obs ? <span className="dmzb-obs">{' ' + obs}</span> : null}
      </span>
      {f.note ? <span className="dmzb-note">{f.note}</span> : null}
    </li>
  );
}

function FactList({ ids }) {
  return (
    <ul className="dmzb-list">
      {ids.map(function (id) {
        var f = factById(id);
        return f ? <FactItem key={id} f={f} /> : null;
      })}
    </ul>
  );
}

// One Sources entry: the full label (linking the source), the alternate link if any, and every section heading the
// page's facts cite for it (their `loc` values, in first-appearance order).
function SourceEntry({ src }) {
  var n = sourceNo(src);
  var locs = [];
  FACTS.forEach(function (f) { if (f.src === src && f.loc && locs.indexOf(f.loc) === -1) locs.push(f.loc); });
  return (
    <li id={'src-' + n}>
      <span className="dmzb-srcn">{'[' + n + ']'}</span>
      <SourceLink src={src} />
      {src.alt && !src.altLabel ? <>{'; '}<a href={src.alt} rel="noopener" target="_blank" className="dmzb-a">Infinity Ward on X</a></> : null}
      {locs.length ? <span className="dmzb-locs">{'Sections cited: ' + locs.map(function (l) { return '"' + l + '"'; }).join(', ')}</span> : null}
    </li>
  );
}

// A kit card section (hk-cut). The <h2> keeps id first (the tests read '<h2 id="...">' in order).
function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} className="hk-cut dmzb-sec">
      <h2 id={id} className="dmzb-h2">{title}</h2>
      {children}
    </section>
  );
}

export default function DmzBountiesPage() {
  var c = counts();
  var breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'DMZ', item: 'https://cyberneticpunks.com/dmz' },
      { '@type': 'ListItem', position: 3, name: 'Bounty System', item: PAGE_URL },
    ],
  };
  var webPage = {
    '@context': 'https://schema.org', '@type': 'WebPage',
    name: TITLE, description: DESC, url: PAGE_URL,
    dateModified: CONTENT_CHANGED,
    publisher: { '@type': 'Organization', name: 'Cybernetic Punks', url: 'https://cyberneticpunks.com' },
    citation: Object.keys(SOURCES).filter(function (k) { return SOURCES[k].href; }).map(function (k) {
      return { '@type': 'CreativeWork', name: SOURCES[k].label, url: SOURCES[k].href, datePublished: SOURCES[k].date };
    }),
  };

  return (
    <main className={'hk ' + exo2.variable} style={Object.assign({ fontFamily: EXO }, DMZ_HUB_VARS)}>
      <style dangerouslySetInnerHTML={{ __html: HUB_KIT_CSS + HUB_PAGE_CSS + PAGE_CSS }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webPage) }} />

      {/* Header (hub kit): breadcrumb eyebrow, the trust badge, the H1, the intro, the source-check line. */}
      <HubPageHeader
        eyebrow={
          <nav aria-label="Breadcrumb" className="dmzb-crumb">
            <Link href="/dmz">DMZ</Link>
            <span className="dmzb-crumb-sep">/</span>
            <span>BOUNTY SYSTEM</span>
          </nav>
        }
        top={
          <div className="dmzb-trust">
            Based on official posts, not yet verified in-game
          </div>
        }
        title="DMZ Bounty System"
        intro="How bounties, notoriety and the Bounty Stations work in Modern Warfare 4 DMZ, and how to pay off a bounty on your own head. Every line below is either confirmed by an official source, with the source named, or listed as unconfirmed."
      >
        <p className="dmzb-checked hk-mono">
          Checked against source on {LAST_UPDATED}
        </p>
      </HubPageHeader>

      <div className="hk-pw">
      {/* Visible intel status: counts come from the same constants as the lists and the OG card. */}
      <CutCard className="dmzb-status">
        <span className="dmzb-status-h">Intel status</span>
        {/* Kit tags, not StatNumeral: the tests pin each count as one string ("N confirmed"). */}
        <span className="hk-tag dmzb-ok">{c.confirmed + ' confirmed'}</span>
        <span className="hk-tag dmzb-unc">{c.unconfirmed + ' unconfirmed'}</span>
      </CutCard>

      <Section id="short" title="The short version">
        <FactList ids={SHORT_VERSION} />
      </Section>

      <Section id="get" title="Getting a bounty"><FactList ids={GROUPS.get} /></Section>

      <Section id="clear" title="Paying off or clearing a bounty">
        <FactList ids={GROUPS.clear} />
        <p className="dmzb-np">The cost of paying off a bounty has not been published.</p>
      </Section>

      <Section id="hunt" title="Hunting a bounty">
        <FactList ids={GROUPS.hunt} />
        <h3 className="dmzb-h3">The Hunt Operators Dynamic Op</h3>
        <FactList ids={GROUPS.huntOp} />
        <h3 className="dmzb-h3">What the official video shows</h3>
        <FactList ids={GROUPS.video} />
        <p className="dmzb-np">
          {VIDEO_EXAMPLE_NOTE + ' Also posted by Infinity Ward: '}
          <a href={SOURCES.VIDEO.alt} rel="noopener" target="_blank" className="dmzb-a">Infinity Ward on X</a>.
        </p>
        <h3 className="dmzb-h3">The FOB Bounty Leaderboard</h3>
        <FactList ids={GROUPS.leaderboard} />
      </Section>

      <Section id="dogtags" title="Dog tags: rival Operators vs Lieutenants">
        <FactList ids={GROUPS.dogtags} />
        {/* Brief 188: pointer only, no figure; the observed board figures live on /dmz/bosses. */}
        <p data-boss-rewards-pointer="" className="dmzb-np">
          {BOSS_REWARDS_POINTER.text}
          <Link href={BOSS_REWARDS_POINTER.href} className="dmzb-a">{BOSS_REWARDS_POINTER.linkText}</Link>.
        </p>
      </Section>

      <Section id="status" title="What we know vs unconfirmed">
        <h3 className="dmzb-lab">Release timing</h3>
        <FactList ids={GROUPS.launch} />
        {/* Brief 191: the open items sit in a <details>, closed by default; the list stays in the server HTML. */}
        <details data-unconfirmed-list="" className="dmzb-det">
          <summary>{'What is not published yet (' + UNCONFIRMED_LIST.length + ')'}</summary>
          <p className="dmzb-det-p">
            {c.confirmed + ' confirmed facts are listed above with their sources. These ' + c.unconfirmed + ' points are not yet stated by any official source:'}
          </p>
          <ul className="dmzb-list">
            {UNCONFIRMED_LIST.map(function (u) {
              return <li key={u.id}><span className="dmzb-unc-tag">UNCONFIRMED</span>{u.text}</li>;
            })}
          </ul>
        </details>
        <h3 className="dmzb-lab" style={{ marginTop: 16 }}>Update log</h3>
        <ul className="dmzb-list dmzb-log">
          {UPDATE_LOG.map(function (u) { return <li key={u.date + u.text}><strong>{u.date}</strong>{' - ' + u.text}</li>; })}
        </ul>
      </Section>

      <Section id="faq" title="FAQ">
        {FAQ.map(function (f) {
          return (
            <div key={f.q} className="dmzb-faq">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          );
        })}
      </Section>

      <Section id="sources" title="Sources">
        <ol className="dmzb-srcs">
          {SOURCE_ORDER.map(function (s) { return <SourceEntry key={s.label} src={s} />; })}
        </ol>
      </Section>

      <nav aria-label="Related DMZ pages" className="hk-cut dmzb-sec">
        <h2 className="dmzb-h2">Related</h2>
        <ul className="dmzb-rel">
          {RELATED.map(function (r) {
            return <li key={r.href}><Link href={r.href}>{r.text}</Link></li>;
          })}
        </ul>
      </nav>
      </div>
    </main>
  );
}

