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

import Link from 'next/link';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import DossierController from './DossierController';
import { SOURCES, FACTS, UNPUBLISHED, TREE, FIELDS, DOSSIERS, UPDATE_LOG, LAST_UPDATED, CONTENT_CHANGED, PAGE_URL, TITLE, DESC, BOSS_IMAGE, factById, unpublishedById, evidence, bossImageSet, bossImageAlt } from '@/lib/dmz/bosses';

export const metadata = {
  title: { absolute: TITLE },
  description: DESC,
  alternates: { canonical: PAGE_URL },
  openGraph: { title: TITLE + ' | Cybernetic Punks', description: DESC, url: PAGE_URL, siteName: 'Cybernetic Punks', type: 'article' },
  twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: TITLE, description: DESC },
};

var RELATED = [
  { href: '/dmz/bounties', text: 'DMZ Bounty System: bounties, Bounty Stations and the Bounty Leaderboard' },
  { href: '/dmz/fob', text: 'FOB stations at a glance, including the Boss Board' },
  { href: '/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals', text: 'DMZ Hajin: 13 locations and the FOB in Deep Dive Part 1' },
  { href: '/dmz', text: 'DMZ hub: field intel and guides' },
];

// Inline, like the Bounty Net styles: one block, scoped under .bb. Motion is transform/opacity only and is
// switched off under prefers-reduced-motion.
var CSS = `
.bb{--ok:#6cc97e;--unp:#ffb400;--acc:#ff6a1f;--ln:#243341;--pn:#0b1117;--tx:rgba(255,255,255,0.88);--mu:rgba(255,255,255,0.68)}
.bb *{box-sizing:border-box}
.bb h2{font-family:Orbitron,monospace;font-size:17px;font-weight:800;letter-spacing:1px;color:#fff;margin:0 0 12px}
.bb-hero{position:relative;overflow:hidden;border:1px solid var(--ln);border-radius:10px;padding:26px 22px 22px;margin-bottom:22px;
  background:radial-gradient(120% 80% at 50% 0%,rgba(255,106,31,0.16),transparent 60%),linear-gradient(180deg,#0c1218,#080b10);
  box-shadow:0 0 0 1px rgba(255,106,31,0.18),0 0 48px rgba(255,106,31,0.10),inset 0 0 70px rgba(0,0,0,0.6)}
.bb-hero::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,0.022) 0 1px,transparent 1px 3px)}
.bb-scan{position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,var(--acc),transparent);opacity:.8;animation:bb-scan 4.5s linear infinite}
@keyframes bb-scan{from{transform:translateY(0)}to{transform:translateY(260px)}}
.bb-title{font-family:Orbitron,monospace;font-size:clamp(30px,6vw,46px);font-weight:900;letter-spacing:4px;color:#fff;margin:0 0 10px;text-shadow:0 0 18px rgba(255,106,31,0.45)}
.bb-lead{font-size:15px;color:var(--mu);line-height:1.6;max-width:700px;margin:0 0 8px}
.bb-badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--mu);border:1px solid var(--ln);border-radius:2px;padding:3px 8px;margin-bottom:12px}
.bb-checked{font:12px/1.4 monospace;color:var(--mu);margin:0}
.bb-card{background:var(--bg-card,#0b1117);border:1px solid var(--border,#243341);border-radius:6px;padding:16px 18px;margin-bottom:14px}
.bb-status{display:flex;gap:18px;flex-wrap:wrap;align-items:baseline;border-left:3px solid var(--acc)}
.bb-status b{font-family:Orbitron,monospace;font-size:15px;color:#fff}
.bb-ok{font:13px monospace;color:var(--ok)}
.bb-unp-c{font:13px monospace;color:var(--unp)}
.bb-src{display:block;font-size:13px;color:var(--mu);margin-top:3px}
.bb-src a{color:var(--green,#6cc97e);text-decoration:underline;text-underline-offset:2px}
.bb-facts{margin:0;padding-left:18px;font-size:14.5px;color:var(--tx);line-height:1.65}
.bb-facts li{margin-bottom:8px}
.bb-tag{font:700 10px/1 monospace;letter-spacing:1.5px;color:var(--unp);border:1px solid rgba(255,180,0,0.55);border-radius:2px;padding:2px 5px;margin-right:8px;white-space:nowrap}
/* Tree chart: the station, then two sibling branches (no ranking between them). */
.bb-tree{display:flex;flex-direction:column;align-items:center}
.bb-node{background:var(--pn);border:1px solid var(--ln);border-radius:8px;padding:12px 14px;width:100%}
.bb-node h3{font-family:Orbitron,monospace;font-size:14px;letter-spacing:2px;color:#fff;margin:0 0 8px;text-transform:uppercase}
.bb-node ul{margin:0;padding-left:16px;font-size:13.5px;color:var(--tx);line-height:1.55}
.bb-root{max-width:560px;border-color:rgba(255,106,31,0.55);box-shadow:0 0 22px rgba(255,106,31,0.12)}
.bb-stem{width:2px;height:22px;background:var(--ln)}
.bb-branches{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:18px;width:100%;padding-top:22px}
.bb-branches::before{content:"";position:absolute;top:0;left:25%;right:25%;height:2px;background:var(--ln)}
.bb-branch{position:relative;display:flex;flex-direction:column;align-items:stretch}
.bb-branch::before{content:"";position:absolute;top:-22px;left:50%;width:2px;height:22px;background:var(--ln)}
.bb-kids{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.bb-kid{flex:1 1 120px;display:block;text-align:center;font:700 13px/1.3 monospace;letter-spacing:1.5px;text-transform:uppercase;color:#fff;text-decoration:none;
  border:1px solid var(--ln);border-radius:6px;padding:10px 8px;background:#0e161e;transition:border-color .2s,transform .2s}
.bb-kid:hover,.bb-kid:focus-visible{border-color:var(--acc);transform:translateY(-1px)}
.bb-kid.unk{color:var(--unp);border-style:dashed}
/* Poster wall. */
.bb-wall{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.bb-poster{position:relative;display:flex;flex-direction:column;gap:8px;text-decoration:none;color:var(--tx);background:#0b1117;border:1px solid var(--ln);border-radius:8px;padding:12px;
  overflow:hidden;transition:transform .25s,border-color .25s}
.bb-poster:hover,.bb-poster:focus-visible{transform:translateY(-2px);border-color:var(--acc)}
.bb-poster :focus-visible,.bb-poster:focus-visible{outline:2px solid var(--acc);outline-offset:3px}
.bb-ph{position:relative;aspect-ratio:4/3;border:1px solid var(--ln);border-radius:4px;display:flex;align-items:center;justify-content:center;
  background:repeating-linear-gradient(45deg,rgba(255,255,255,0.025) 0 6px,transparent 6px 12px),#080c11;overflow:hidden}
.bb-ph span{font:700 10px/1.3 monospace;letter-spacing:2px;color:var(--mu);text-align:center;padding:0 8px}
.bb-ph svg{position:absolute;inset:0;width:100%;height:100%}
.bb-ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.bb-fig{margin:0 0 12px;max-width:320px}
.bb-dossier .bb-fig .bb-ph{margin-bottom:6px}
.bb-credit{font-size:11px;line-height:1.4;color:var(--mu);margin:8px 0 0}
.bb-des{font-family:Orbitron,monospace;font-size:18px;font-weight:900;letter-spacing:2px;color:#fff;margin:0}
.bb-rank{font:700 11px/1 monospace;letter-spacing:2px;text-transform:uppercase;color:var(--acc)}
.bb-line{font-size:13px;line-height:1.5;margin:0;color:var(--mu)}
.bb-bars{display:flex;flex-direction:column;gap:5px}
.bb-bars i{display:block;height:7px;border-radius:2px;background:rgba(255,255,255,0.13)}
.bb-stamp{position:absolute;z-index:3;top:26px;right:-44px;width:170px;text-align:center;transform:rotate(35deg);font:900 11px/1 monospace;letter-spacing:2px;color:var(--unp);
  border-top:2px solid var(--unp);border-bottom:2px solid var(--unp);padding:5px 0;background:rgba(8,11,16,0.92)}
/* Evidence meter: label and count on one line, the bar full width below. */
.bb-meter{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px 10px;font:12px monospace;color:var(--mu)}
.bb-meter .bar{order:3;flex:1 1 100%;height:8px;border-radius:4px;background:rgba(255,180,0,0.25);overflow:hidden}
.bb-meter .fill{display:block;height:100%;background:var(--ok)}
/* Dossiers: plain articles; with JS one opens as a modal dialog. */
.bb-dossier{scroll-margin-top:70px}
.bb-dossier header{display:flex;flex-wrap:wrap;align-items:baseline;gap:10px 14px;margin-bottom:10px}
.bb-dossier .bb-ph{max-width:320px;margin-bottom:12px}
.bb-fields{display:grid;grid-template-columns:minmax(110px,170px) 1fr;gap:10px 16px;margin:12px 0 0}
.bb-fields dt{font:700 11px/1.5 monospace;letter-spacing:1.5px;text-transform:uppercase;color:var(--mu)}
.bb-fields dd{margin:0;font-size:14px;line-height:1.6;color:var(--tx)}
.bb-fields dd ul{margin:0;padding-left:16px}
.bb-close{display:none}
.bb-backdrop{display:none}
.bb-open{position:fixed;z-index:1001;top:4vh;left:50%;width:min(760px,92vw);max-height:92vh;overflow:auto;transform:translateX(-50%);
  margin:0;box-shadow:0 0 0 1px var(--acc),0 20px 80px rgba(0,0,0,0.75);animation:bb-in .25s ease-out}
@keyframes bb-in{from{opacity:0}to{opacity:1}}
.bb-open .bb-close{display:inline-block;margin-left:auto;font:700 12px monospace;letter-spacing:1.5px;color:#fff;background:transparent;border:1px solid var(--ln);border-radius:4px;padding:6px 10px;cursor:pointer}
.bb-open .bb-close:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.bb-backdrop.on{display:block;position:fixed;inset:0;z-index:1000;background:rgba(3,5,8,0.78)}
body.bb-lock{overflow:hidden}
@media (max-width:640px){
  .bb-branches{grid-template-columns:1fr;padding-top:0}
  .bb-branches::before,.bb-branch::before{display:none}
  .bb-branch{border-left:2px solid var(--ln);padding-left:12px;margin-top:14px}
  .bb-fields{grid-template-columns:1fr;gap:4px 0}
  .bb-fields dd{margin-bottom:8px}
}
@media (prefers-reduced-motion:reduce){
  .bb-scan,.bb-open{animation:none}
  .bb-scan{display:none}
  .bb-poster,.bb-kid{transition:none}
  .bb-poster:hover,.bb-kid:hover{transform:none}
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

function Silhouette() {
  return (
    <svg viewBox="0 0 160 120" aria-hidden="true" focusable="false">
      <circle cx="80" cy="44" r="18" fill="rgba(255,255,255,0.10)" />
      <path d="M44 112 C46 82 60 70 80 70 C100 70 114 82 116 112 Z" fill="rgba(255,255,255,0.10)" />
      <text x="80" y="50" textAnchor="middle" fill="rgba(255,180,0,0.85)" fontSize="20" fontFamily="monospace" fontWeight="700">?</text>
    </svg>
  );
}

// The 4:3 portrait slot: the boss image when the dossier has one (whole, no crop), else the pending placeholder.
// alt: the poster's link label already names the boss, so its image is decorative there (alt="").
function Portrait({ dossier, sizes, alt }) {
  var unknown = dossier.id === 'lieutenants';
  var img = bossImageSet(dossier, sizes);
  return (
    <div className="bb-ph">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img.src} srcSet={img.srcSet} sizes={img.sizes} alt={alt} loading="lazy" decoding="async" />
      ) : (
        <>
          {unknown ? <Silhouette /> : null}
          <span>{unknown ? 'NAMES NOT PUBLISHED' : 'SURVEILLANCE PHOTO PENDING'}</span>
        </>
      )}
    </div>
  );
}

function Poster({ dossier }) {
  var e = evidence(dossier);
  var line = factById(dossier.fields.profile[0]).text;
  return (
    <a className="bb-poster" href={'#' + dossier.id} data-dossier-open={dossier.id} aria-label={'Open the target dossier: ' + dossier.designation + ' (' + dossier.rank + ')'}>
      {e.unpublished ? <span className="bb-stamp" aria-hidden="true">UNPUBLISHED</span> : null}
      <Portrait dossier={dossier} sizes={BOSS_IMAGE.posterSizes} alt="" />
      <span className="bb-rank">{dossier.rank}</span>
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
  return (
    <article id={dossier.id} className="bb-card bb-dossier" data-dossier={dossier.id} aria-labelledby={hid} tabIndex={-1}>
      <header>
        <span className="bb-rank">{'Target dossier / ' + dossier.rank}</span>
        <h3 id={hid} className="bb-des">{dossier.designation}</h3>
        <button type="button" className="bb-close" data-dossier-close="">Close</button>
      </header>
      {bossImageSet(dossier) ? (
        <figure className="bb-fig">
          <Portrait dossier={dossier} sizes={BOSS_IMAGE.dossierSizes} alt={bossImageAlt(dossier)} />
          <figcaption className="bb-credit">{BOSS_IMAGE.credit}</figcaption>
        </figure>
      ) : <Portrait dossier={dossier} />}
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
    <main className="bb" style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px 96px' }}>
      <style>{CSS}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webPage) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(itemList) }} />

      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, fontSize: 12, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
        <Link href="/dmz" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>DMZ</Link>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>BOSS BOARD</span>
      </nav>

      <section className="bb-hero" aria-labelledby="bb-h1">
        <span className="bb-scan" aria-hidden="true" />
        <span className="bb-badge">Based on official posts, not yet verified in-game</span>
        <h1 id="bb-h1" className="bb-title">Boss Board</h1>
        <p className="bb-lead">Target dossiers for the bosses of Modern Warfare 4 DMZ: the Lieutenants you hunt through the Boss Board and the three Commanders named in Activision&apos;s Deep Dives. Every line is sourced to an official post; everything the posts do not state is marked UNPUBLISHED.</p>
        <p className="bb-checked">{'Checked against source on ' + LAST_UPDATED}</p>
      </section>

      <div className="bb-card bb-status">
        <b>Intel status</b>
        <span className="bb-ok">{FACTS.length + ' confirmed'}</span>
        <span className="bb-unp-c">{UNPUBLISHED.length + ' UNPUBLISHED'}</span>
      </div>

      <section className="bb-card" aria-labelledby="bb-tree-h">
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
      </section>

      <section aria-labelledby="bb-wall-h" style={{ marginBottom: 14 }}>
        <h2 id="bb-wall-h">Target posters</h2>
        <div className="bb-wall">
          {DOSSIERS.map(function (d) { return <Poster key={d.id} dossier={d} />; })}
        </div>
        {DOSSIERS.some(function (d) { return !!bossImageSet(d); }) ? <p className="bb-credit">{BOSS_IMAGE.wallCredit}</p> : null}
      </section>

      <section aria-labelledby="bb-dossiers-h">
        <h2 id="bb-dossiers-h">Target dossiers</h2>
        {DOSSIERS.map(function (d) { return <Dossier key={d.id} dossier={d} />; })}
      </section>

      <section className="bb-card" aria-labelledby="bb-unp-h">
        <h2 id="bb-unp-h">What the Deep Dives do not say</h2>
        <ul className="bb-facts">
          {UNPUBLISHED.map(function (u) { return <li key={u.id} data-unpublished={u.id}><span className="bb-tag">UNPUBLISHED</span>{u.text}</li>; })}
        </ul>
      </section>

      <section className="bb-card" aria-labelledby="bb-log-h">
        <h2 id="bb-log-h">Update log</h2>
        <ul className="bb-facts" style={{ fontSize: 13 }}>
          {UPDATE_LOG.map(function (u) { return <li key={u.date + u.text}><strong>{u.date}</strong>{' - ' + u.text}</li>; })}
        </ul>
      </section>

      <nav aria-label="Related DMZ pages" className="bb-card">
        <h2>Related</h2>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.8 }}>
          {RELATED.map(function (r) { return <li key={r.href}><Link href={r.href} style={{ color: 'var(--green)', textDecoration: 'underline', textUnderlineOffset: 2 }}>{r.text}</Link></li>; })}
        </ul>
      </nav>

      <div className="bb-backdrop" data-dossier-backdrop="" aria-hidden="true" />
      <DossierController />
    </main>
  );
}
