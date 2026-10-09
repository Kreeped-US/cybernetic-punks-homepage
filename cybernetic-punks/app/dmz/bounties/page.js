// app/dmz/bounties/page.js
// DMZ BOUNTY SYSTEM explainer. Static, hand-written, sourced page (no DB read). Every fact, open
// question and update-log line comes from lib/dmz/bounties.js, which the OG image and the tests also
// read, so the visible counts, the card and the checks can never disagree.
//
// INDEXING: inherits the DMZ layout gate (dmz.indexable). Listed explicitly in lib/sitemap/eligible.js
// with a fixed lastmod (LAST_UPDATED). JSON-LD: BreadcrumbList + WebPage (dateModified = LAST_UPDATED,
// citations = the sources). NO FAQPage schema (doctrine A1): the FAQ is visible text only.

import Link from 'next/link';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { SOURCES, UNCONFIRMED_LIST, UPDATE_LOG, LAST_UPDATED, VIDEO_EXAMPLE_NOTE, PAGE_URL, TITLE, DESC, FAQ, factsFor, counts } from '@/lib/dmz/bounties';

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

var h2 = { fontFamily: 'Orbitron, monospace', fontSize: 17, fontWeight: 800, letterSpacing: 1, color: '#fff', margin: '0 0 12px' };
var card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, padding: '16px 18px' };
var listStyle = { margin: 0, paddingLeft: 18, fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.7 };
var AMBER = '#ffb400';

function SourceLink({ src }) {
  if (!src.href) return <span>{src.label}</span>;
  var a = { color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2 };
  if (!src.altLabel) return <a href={src.href} rel="noopener" target="_blank" style={a}>{src.label}</a>;
  // A source with two official posts: the label links the first, a short second link follows.
  return <><a href={src.href} rel="noopener" target="_blank" style={a}>{src.label}</a>{'; '}<a href={src.alt} rel="noopener" target="_blank" style={a}>{src.altLabel}</a></>;
}

function FactList({ section }) {
  return (
    <ul style={listStyle}>
      {factsFor(section).map(function (f) {
        return (
          <li key={f.text} style={{ marginBottom: 6 }}>
            {f.text + ' '}
            <span style={{ fontSize: 12 }}>(Source: <SourceLink src={f.src} />)</span>
            {f.note ? <span style={{ display: 'block', fontSize: 12, color: 'var(--text-tertiary)' }}>{f.note}</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function Section({ id, title, children }) {
  return (
    <section aria-labelledby={id} style={Object.assign({}, card, { marginBottom: 14 })}>
      <h2 id={id} style={h2}>{title}</h2>
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
    dateModified: LAST_UPDATED,
    publisher: { '@type': 'Organization', name: 'Cybernetic Punks', url: 'https://cyberneticpunks.com' },
    citation: Object.keys(SOURCES).filter(function (k) { return SOURCES[k].href; }).map(function (k) {
      return { '@type': 'CreativeWork', name: SOURCES[k].label, url: SOURCES[k].href, datePublished: SOURCES[k].date };
    }),
  };

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px 96px' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webPage) }} />

      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
        <Link href="/dmz" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>DMZ</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>BOUNTY SYSTEM</span>
      </nav>

      <div style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-tertiary)', border: '1px solid var(--border)', borderRadius: 2, padding: '3px 8px', marginBottom: 12 }}>
        Pre-launch: based on official posts, not yet verified in-game
      </div>

      <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, letterSpacing: 1, color: '#fff', margin: '0 0 12px' }}>DMZ Bounty System</h1>
      <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 700, margin: '0 0 8px' }}>
        How bounties, notoriety and the Bounty Stations work in Modern Warfare 4 DMZ, and how to pay off a bounty on your own head. Every line below is either confirmed by an official source, with the source named, or listed as unconfirmed.
      </p>
      <p style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-tertiary)', margin: '0 0 22px' }}>
        Checked against source on {LAST_UPDATED}
      </p>

      {/* Visible intel status: counts come from the same constants as the lists and the OG card. */}
      <div style={Object.assign({}, card, { display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: 22, borderLeft: '3px solid var(--green)' })}>
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#fff' }}>Intel status</span>
        <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--green)' }}>{c.confirmed + ' confirmed'}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 13, color: AMBER }}>{c.unconfirmed + ' unconfirmed'}</span>
      </div>

      <Section id="how" title="How the bounty system works"><FactList section="how" /></Section>

      <Section id="stations" title="Bounty Stations and paying off your own bounty">
        <FactList section="stations" />
        <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', margin: '14px 0 8px' }}>Claim or clear</h3>
        <FactList section="claim" />
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '10px 0 0' }}>The cost of paying off a bounty has not been published.</p>
      </Section>

      <Section id="video" title="What the official video shows">
        <FactList section="video" />
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '10px 0 0' }}>
          {VIDEO_EXAMPLE_NOTE + ' Also posted by Infinity Ward: '}
          <a href={SOURCES.VIDEO.alt} rel="noopener" target="_blank" style={{ color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2 }}>Infinity Ward on X</a>.
        </p>
      </Section>

      <Section id="leaderboard" title="The FOB Bounty Leaderboard"><FactList section="leaderboard" /></Section>

      <Section id="dogtags" title="Dog tags: rival Operators vs Lieutenants"><FactList section="dogtags" /></Section>

      <Section id="hunt" title="The Hunt Operators Dynamic Op">
        <FactList section="hunt" />
      </Section>

      <Section id="status" title="What we know vs unconfirmed">
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '0 0 8px' }}>Release timing</h3>
        <FactList section="launch" />
        <div style={{ height: 14 }} />
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
          {c.confirmed + ' confirmed facts are listed above with their sources. These ' + c.unconfirmed + ' points are not yet stated by any official source:'}
        </p>
        <ul style={listStyle}>
          {UNCONFIRMED_LIST.map(function (u) {
            return <li key={u.id}><span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: AMBER, marginRight: 8 }}>UNCONFIRMED</span>{u.text}</li>;
          })}
        </ul>
        <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '16px 0 8px' }}>Update log</h3>
        <ul style={Object.assign({}, listStyle, { fontSize: 13 })}>
          {UPDATE_LOG.map(function (u) { return <li key={u.date + u.text}><strong>{u.date}</strong>{' - ' + u.text}</li>; })}
        </ul>
      </Section>

      <Section id="faq" title="FAQ">
        {FAQ.map(function (f) {
          return (
            <div key={f.q} style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>{f.q}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{f.a}</p>
            </div>
          );
        })}
      </Section>

      <nav aria-label="Related DMZ pages" style={card}>
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

