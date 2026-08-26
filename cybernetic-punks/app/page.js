// app/page.js
// NEUTRAL ROOT (network front door) -- premium redesign PASS A (visual + structural).
// Ports the approved v7 mock treatment (burgundy/black/gold, Chakra Petch/Inter/JetBrains
// Mono, the crosshair signature, the editorial desk, image-ready game tiles) over the
// proven live root. PASS A is COSMETIC + STRUCTURAL ONLY: the honesty-load-bearing data
// (telemetry values, the REPORTS count, the countdown, the subscribe storage, the receipts
// panel) is rendered INERT/PLACEHOLDER here and wired in PASS B. Data fns + SEO metadata +
// JSON-LD are preserved byte-for-byte from the live page. See docs/cnp-root-mock-v7.html
// (visual target) + docs/cnp-root-redesign-spec.md (blueprint).
//
// Font loading is scoped to this page via next/font (no layout change). CSS is scoped
// under `.cnp-root` so the mock's generic selectors cannot leak to other routes.

import Link from 'next/link';
import { Chakra_Petch, Inter, JetBrains_Mono } from 'next/font/google';
import { supabase } from '@/lib/supabase';
import { getLiveStats } from '@/lib/liveStats';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import { getIndexableGames } from '@/lib/games';
import { discourseHref } from '@/lib/discourse';
import { entitySlugFor } from '@/lib/coverage';
import AccountMenu from '@/components/AccountMenu';
import HeroCrosshair from '@/components/network/HeroCrosshair';
import ReceiptPanel from '@/components/network/ReceiptPanel';
import NetworkSubscribeForm from '@/components/network/NetworkSubscribeForm';
import { getEditorDisplay, editorInitial, editorHasPortrait } from '@/lib/editors/roster';
import EditorPortrait from '@/components/network/EditorPortrait';
import { dmz } from '@/lib/games/dmz';
import { wardogs } from '@/lib/games/wardogs';

// Premium type stack (mock Section 1). Scoped to this page; exposed as CSS variables the
// ported CSS maps --display / --body / --mono onto.
const chakra = Chakra_Petch({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--cnp-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--cnp-body', display: 'swap' });
const jbmono = JetBrains_Mono({ subsets: ['latin'], variable: '--cnp-mono', display: 'swap' });

// -- METADATA -- title/canonical/JSON-LD are byte-for-byte unchanged from the live page.
// The description string is edited ONCE in PASS B (the deliberate exception): the scope-free
// superlative "analyzed deeper than anywhere else" is removed and replaced with the mechanism
// statement "analyzed and verified", keeping every keyword. No comparative reaches the SERP.
export const metadata = {
  title: 'Verified Competitive-Shooter Intelligence Network',
  description: 'The verified competitive-shooter intelligence network - deep, verified intel for Marathon and extraction shooters. Every weapon, shell, and build analyzed and verified against the live game.',
  alternates: { canonical: 'https://cyberneticpunks.com' },
};

export const dynamic = 'force-dynamic';

// -- HELPERS (unchanged) --------------------------------------
function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}
function formatNum(n) {
  if (n == null) return '--';
  if (n < 1000) return String(n);
  if (n < 1000000) return (n / 1000).toFixed(n < 10000 ? 1 : 0) + 'K';
  return (n / 1000000).toFixed(1) + 'M';
}
function addCommas(n) {
  if (n == null) return '--';
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
// Whole days remaining until the DMZ launch, from the SINGLE machine date constant
// (dmz.launch_date). No hardcoded "Oct 23" literal anywhere -- every date surface derives
// from here. Null once the date has passed (the countdown then simply reads "live").
function daysUntilLaunch() {
  if (!dmz || !dmz.launch_date) return null;
  var ms = new Date(dmz.launch_date + 'T00:00:00Z').getTime() - Date.now();
  if (isNaN(ms)) return null;
  var days = Math.ceil(ms / 86400000);
  return days > 0 ? days : 0;
}

// "Sep 10" from an ISO launch date -- the EA-date fragment of the Wardogs tile pill
// ("INTEL LIVE - EA SEP 10"; the pill is CSS-uppercased). Single-sourced from the data
// module (wardogs.launch_date) -- no hardcoded date in this component: change the source
// and the label follows. Null on a missing/bad date so the pill falls back to "soon".
var CNP_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function eaDateLabel(iso) {
  if (!iso) return null;
  var d = new Date(iso + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  return CNP_MONTHS[d.getUTCMonth()] + ' ' + d.getUTCDate();
}

// -- DATA FNS (unchanged -- PASS A does NOT re-wire data sources) -
async function getNetworkPulse() {
  var liveGames = ROOT_GAMES.filter(function(g) { return g.pulse.mode === 'live'; });
  var feedGames = ROOT_GAMES.filter(function(g) { return g.pulse.feed && g.pulse.feed.gameSlug; });
  var pulse = {};
  var feeds = {};
  var liveStats = null;
  try { liveStats = await getLiveStats(); } catch (e) { liveStats = null; }
  liveGames.forEach(function(g) {
    var online = null;
    if (liveStats && g.pulse.onlineSource && liveStats[g.pulse.onlineSource]) {
      online = liveStats[g.pulse.onlineSource].value;
    }
    pulse[g.slug] = { online: online };
  });
  await Promise.all(feedGames.map(async function(g) {
    feeds[g.slug] = [];
    try {
      var res = await supabase
        .from('feed_items')
        .select('headline, slug, editor, created_at')
        .eq('is_published', true)
        .eq('game_slug', g.pulse.feed.gameSlug)
        .order('created_at', { ascending: false })
        .limit(4);
      feeds[g.slug] = (res.data || []).map(function(it) {
        var href = g.pulse.articleHref ? g.pulse.articleHref(it.slug) : ('/intel/' + it.slug);
        return { headline: it.headline, slug: it.slug, editor: it.editor, when: timeAgo(it.created_at), href: href };
      }).filter(function(it) { return it.href; });
    } catch (e) {
      feeds[g.slug] = [];
    }
  }));
  return { pulse: pulse, feeds: feeds };
}

async function getNetworkStats() {
  var out = { articles: null, updated: null };
  try {
    var { count } = await supabase
      .from('feed_items')
      .select('id', { count: 'exact', head: true })
      .eq('is_published', true);
    out.articles = typeof count === 'number' ? count : null;
  } catch (e) {}
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('created_at')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    out.updated = data && data.created_at ? data.created_at : null;
  } catch (e) {}
  return out;
}

async function getNetworkVoice() {
  try {
    var { data } = await supabase
      .from('network_brief')
      .select('hero_line, brief, created_at')
      .eq('skipped', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    return data || null;
  } catch (e) {
    return null;
  }
}

async function getNetworkDeskFeed() {
  try {
    var { data } = await supabase
      .from('feed_items')
      .select('headline, slug, game_slug, created_at, creator_info, tags')
      .eq('is_published', true)
      .contains('tags', ['discourse'])
      .order('created_at', { ascending: false })
      .limit(6);
    return (data || []).map(function(it) {
      return {
        headline: it.headline,
        slug: it.slug,
        game_slug: it.game_slug,
        when: timeAgo(it.created_at),
        creator: (it.creator_info && it.creator_info.name) || null,
        href: discourseHref(it),
      };
    }).filter(function(it) { return it.href; });
  } catch (e) {
    return [];
  }
}

// RECEIPTS: one REAL verified stat + its verified_source chain, for the receipts set piece.
// Pulls the most-recently-verified weapon row that has a source AND a damage figure, and
// resolves a TRAVERSABLE link to its entity page. FAIL-OPEN: any empty/malformed/thrown
// result returns null, and the panel renders its clean static fallback instead of a
// half-resolved chain, a null claim, or a dead link.
async function getReceipt() {
  try {
    var res = await supabase
      .from('weapon_stats')
      .select('name, damage, damage_type, verified_source, patch_verified, updated_at')
      .eq('verified', true)
      .eq('game_slug', 'marathon')
      .not('verified_source', 'is', null)
      .not('damage', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    var r = res && res.data;
    if (!r || !r.name || r.damage == null || !r.verified_source) return null;
    var slug = entitySlugFor('weapon', r.name);
    if (!slug) return null;
    var srcLower = String(r.verified_source).toLowerCase();
    var check = srcLower.indexOf('in-game') !== -1 ? 'Verified in-game, by hand' : 'Traced to the official source';
    return {
      claim: r.name + ' deals ' + r.damage + ' damage per shot' + (r.damage_type ? ' (' + r.damage_type + ' damage)' : ''),
      source: String(r.verified_source),
      check: check,
      patch: r.patch_verified ? String(r.patch_verified) : null,
      href: '/marathon/weapons/' + slug,
      linkLabel: 'Inspect ' + r.name + ' on the weapon page',
    };
  } catch (e) {
    return null;
  }
}

// -- STRUCTURED DATA (PRESERVED byte-for-byte) ----------------
const JSONLD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'CyberneticPunks',
    url: 'https://cyberneticpunks.com',
    logo: 'https://cyberneticpunks.com/cnp-512.png',
    sameAs: ['https://x.com/Cybernetic87250'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'CyberneticPunks',
    url: 'https://cyberneticpunks.com',
  },
];

// -- EDITORIAL DESK (roster ground truth: 5 live + VANTAGE + BROKER) -
// Order matches the approved mock. Cards render ONLY roster.js facts. BROKER (0 published)
// is the locked/classified card; its "deploys with <game>" line reads from broker.coverage
// (single source of truth), resolving the slug to the game display name -- no hardcoded date.
const DESK_ORDER = ['nexus', 'cipher', 'dexter', 'ghost', 'miranda', 'vantage', 'broker'];

function deskRankLabel(e, coverageLabel) {
  if (e.status === 'network') return 'NETWORK';
  if (e.status === 'incoming') return coverageLabel ? (coverageLabel + ' - INCOMING') : 'INCOMING';
  return 'CORE';
}

export default async function NetworkRoot() {
  var [data, voice, stats, deskFeed, receipt] = await Promise.all([getNetworkPulse(), getNetworkVoice(), getNetworkStats(), getNetworkDeskFeed(), getReceipt()]);

  // Game tile meta + telemetry (real data, PASS B).
  var updatedLabel = stats.updated ? timeAgo(stats.updated) : null;
  var marathonOnline = (data.pulse.marathon && typeof data.pulse.marathon.online === 'number') ? data.pulse.marathon.online : null;
  var launchDays = daysUntilLaunch();
  var wardogsEA = eaDateLabel(wardogs.launch_date); // "Sep 10", single-sourced from wardogs.launch_date
  var gameMeta = {};
  ROOT_GAMES.forEach(function(g) {
    var p = data.pulse[g.slug];
    gameMeta[g.slug] = {
      online: p && typeof p.online === 'number' ? formatNum(p.online) : null,
      updated: updatedLabel,
    };
  });

  // BROKER coverage -> display name (single-sourced from the game config, never hardcoded).
  var brokerCoverageLabel = null;
  var brokerEntry = getEditorDisplay('broker');
  if (brokerEntry && brokerEntry.coverage) {
    brokerCoverageLabel = (brokerEntry.coverage === dmz.slug) ? dmz.displayName : String(brokerEntry.coverage).toUpperCase();
  }

  var deskCards = DESK_ORDER.map(function(k) { return getEditorDisplay(k); }).filter(Boolean);

  return (
    <div className={'cnp-root ' + chakra.variable + ' ' + inter.variable + ' ' + jbmono.variable}>
      {JSONLD.map(function(node, i) {
        return <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }} />;
      })}
      <style>{CNP_CSS}</style>

      <div className="atmos" aria-hidden="true" />

      {/* NAV */}
      <nav>
        <div className="wrap nav-in">
          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cnp-512.png" alt="Cybernetic Punks" width="38" height="38" />
            <span className="wm">CYBERNETIC <b>PUNKS</b></span>
          </div>
          <div className="nav-right">
            <div className="nav-links">
              <a href="#games">Games</a>
              <a href="#proof">Why us</a>
              <a href="#desk">Editors</a>
              <a href="#how">How it works</a>
            </div>
            <AccountMenu align="right" />
          </div>
        </div>
      </nav>

      <main>
        {/* HERO */}
        <header className="hero">
          <div className="wrap hero-grid">
            <div>
              <div className="eyebrow"><span className="live" aria-hidden="true" />NO HYPE - JUST INTEL</div>
              <h1>The verified intel network for <span className="hl">competitive shooters</span>.</h1>
              <p className="sub">Every stat <b>checked by hand</b>, in-game. No AI slop, no reposted rumors, no hype cycles - just the real numbers, sourced and verified, for Marathon and MW4&apos;s DMZ, plus verified-source intel on Wardogs ahead of Early Access.</p>
              <div className="cta-row">
                <a href="#join" className="btn btn-gold">Get the intel drops &rarr;</a>
                <a href="#games" className="btn btn-ghost">Explore the network</a>
              </div>
            </div>
            <HeroCrosshair />
          </div>

          {/* TELEMETRY -- real data. Each cell labelled as exactly what it measures. */}
          <div className="wrap">
            <div className="telemetry">
              <div className="tel-head"><span>{'// NETWORK TELEMETRY'}</span><span className="rec"><i aria-hidden="true" />REC</span></div>
              <div className="tel-grid">
                <div className="tel-cell"><div className="lbl">Games Covered</div><div className="val">{String(getIndexableGames().length)}</div></div>
                <div className="tel-cell pop"><div className="lbl">Marathon Players (Steam)</div><div className="val">{marathonOnline != null ? formatNum(marathonOnline) : '--'}</div></div>
                <div className="tel-cell"><div className="lbl">Reports Published</div><div className="val">{stats.articles != null ? addCommas(stats.articles) : '--'}</div></div>
                <div className="tel-cell"><div className="lbl">Last Verified Update</div><div className="val" style={{ fontSize: '22px' }}>{updatedLabel || '--'}</div></div>
              </div>
            </div>
          </div>
        </header>

        {/* PROOF / THE STANDARD */}
        <section className="proof" id="proof">
          <div className="wrap">
            <div className="sec-eyebrow">The standard</div>
            <h2>Every stat verified in-game. Every claim traced to source.</h2>
            <p className="sec-sub">Game guides are drowning in unsourced, AI-generated content - stat pages scraped from other stat pages, patch numbers copied without a check. We built the opposite: a first-party data moat, verified by a human, in the actual game.</p>
            <div className="proof-grid">
              <div className="card them">
                <div className="tag">{'// The problem'}</div>
                <ul>
                  <li><span className="ic">&#10007;</span> AI-generated stat pages scraped from other AI-generated stat pages</li>
                  <li><span className="ic">&#10007;</span> Patch numbers reposted without ever being confirmed</li>
                  <li><span className="ic">&#10007;</span> Tier-lists tuned for clicks, with no sourcing behind them</li>
                  <li><span className="ic">&#10007;</span> Numbers you are just asked to trust</li>
                </ul>
              </div>
              <div className="card us">
                <div className="tag">{'// Our method'}</div>
                <ul>
                  <li><span className="ic">&#10003;</span> Every stat verified in-game, by hand, before it ships</li>
                  <li><span className="ic">&#10003;</span> Every claim traced to its source</li>
                  <li><span className="ic">&#10003;</span> Unconfirmed data flagged as unconfirmed - never faked</li>
                  <li><span className="ic">&#10003;</span> A first-party data moat, not a scraped aggregator</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* NETWORK VOICE (Vantage) -- PRESERVED live content, re-skinned */}
        {voice && voice.hero_line && (
          <section className="voice-sec">
            <div className="wrap">
              <figure className="voice">
                <figcaption className="voice-by"><span className="voice-dot" aria-hidden="true" />Vivian Cross / Vantage <span className="voice-role">Network editor</span></figcaption>
                <blockquote className="voice-line">{voice.hero_line}</blockquote>
                {voice.brief && <p className="voice-brief">{voice.brief}</p>}
              </figure>
            </div>
          </section>
        )}

        {/* GAMES -- image-ready tiles (real art + real current meta) */}
        <section className="games" id="games">
          <div className="wrap">
            <div className="sec-eyebrow">Choose your game</div>
            <h2>Covering the shooters worth grinding.</h2>
            <div className="game-grid">
              <Link href="/marathon" className="game mara" style={{ '--img': "url('/images/games/marathon-hero.jpg')" }}>
                <div className="art" aria-hidden="true" /><div className="scrim" aria-hidden="true" />
                <div className="status"><i aria-hidden="true" />Live now</div>
                <div className="meta">Bungie&apos;s extraction shooter{gameMeta.marathon && gameMeta.marathon.online ? ' - ' + gameMeta.marathon.online + ' players tracked' : ''}{gameMeta.marathon && gameMeta.marathon.updated ? ' - updated ' + gameMeta.marathon.updated : ''}</div>
                <div className="go">Enter the Marathon hub &rarr;</div>
              </Link>
              <Link href="/dmz" className="game dmz" style={{ '--img': "url('/images/games/dmz-hero.jpg')" }}>
                <div className="art" aria-hidden="true" /><div className="scrim" aria-hidden="true" />
                <div className="status dmz-pill"><i aria-hidden="true" />Launches with DMZ</div>
                <div className="meta">Call of Duty: MW4 extraction &middot; Hajin Exclusion Zone &middot; pre-launch intel building</div>
                <div className="go">Get day-one coverage &rarr;</div>
              </Link>
              {/* Wardogs -- LIVE tile. OUR COVERAGE is live (published confirmed-systems
                  intel at /wardogs); the GAME is still pre-launch (EA Sep 10), so the pill
                  leads with INTEL LIVE and keeps the EA date -- never implying the game
                  launched. Clickable Link mirroring the Marathon/DMZ tile structure. */}
              <Link href="/wardogs" className="game wardogs" style={{ '--img': "url('/images/games/wardogs-hero.jpg')" }}>
                <div className="art" aria-hidden="true" /><div className="scrim scrim-strong" aria-hidden="true" />
                <div className="status wardogs-pill"><i aria-hidden="true" />INTEL LIVE &middot; EA {wardogsEA || 'soon'}</div>
                <div className="meta">{wardogs.displayName} &middot; Steam Early Access</div>
                <div className="go">Get the confirmed intel &rarr;</div>
              </Link>
            </div>
          </div>
        </section>

        {/* NETWORK PULSE -- PRESERVED "Latest from" feeds (real data, re-skinned) */}
        <section className="pulse-sec">
          <div className="wrap">
            <div className="sec-eyebrow">Network pulse{updatedLabel ? ' - updated ' + updatedLabel : ''}</div>
            <h2>The latest, from the desk.</h2>
            <div className="pulse-grid">
              {ROOT_GAMES.map(function(game) {
                var rows = data.feeds[game.slug] || [];
                return (
                  <div key={game.slug} className="pcol" style={{ '--accent': (game.theme && game.theme.primary) || 'var(--gold)' }}>
                    <div className="pcol-head"><span className="pcol-mark" aria-hidden="true" /><span className="pcol-title">Latest from {game.label}</span></div>
                    <div className="pcol-body">
                      {rows.length > 0 ? rows.map(function(it) {
                        var ed = getEditorDisplay(it.editor);
                        return (
                          <Link key={it.slug} href={it.href} className="prow">
                            <span className="prow-meta">
                              <span className="prow-ed">{ed && ed.symbol ? ed.symbol + ' ' : ''}{it.editor}</span>
                              <span className="prow-when">{it.when}</span>
                            </span>
                            <span className="prow-head">{it.headline}</span>
                          </Link>
                        );
                      }) : (
                        <p className="pcol-empty">{game.pulse.mode === 'live' ? 'Quiet cycle - nothing new to verify yet.' : 'Pre-launch intel building.'}</p>
                      )}
                    </div>
                    {Array.isArray(game.keys) && game.keys.length > 0 && (
                      <div className="pkeys">
                        <span className="pkeys-label">{game.label} reference</span>
                        <span className="pkeys-row">
                          {game.keys.map(function(k) { return <Link key={k.href} href={k.href} className="pkey">{k.label}</Link>; })}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* NETWORK DESK FEED -- PRESERVED discourse (real data), re-skinned */}
        {deskFeed.length > 0 && (
          <section className="deskfeed-sec">
            <div className="wrap">
              <div className="sec-eyebrow">From the network desk</div>
              <ul className="deskfeed">
                {deskFeed.map(function(a) {
                  return (
                    <li key={a.slug}>
                      <Link href={a.href} className="deskfeed-row">
                        <span className="deskfeed-meta"><span className="deskfeed-game">{a.game_slug}</span>{a.creator ? <span className="deskfeed-creator">on {a.creator}</span> : null}<span className="deskfeed-when">{a.when}</span></span>
                        <span className="deskfeed-head">{a.headline}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {/* THE EDITORIAL DESK -- roster ground truth */}
        <section className="desk" id="desk">
          <div className="wrap">
            <div className="sec-eyebrow">The editorial desk</div>
            <h2>An AI newsroom. A human on the numbers.</h2>
            <p className="sec-sub">Specialist editors work the beats - meta, analysis, builds, community, field intel, and the cross-game view. Every number they publish is human-checked before it ships - against the game where it is live, against official sources where it is not. What can&apos;t be confirmed yet ships flagged. That is the difference between intel and noise.</p>
            <div className="desk-grid">
              {deskCards.map(function(e) {
                var locked = e.status === 'incoming';
                var isNetwork = e.status === 'network';
                var rank = deskRankLabel(e, brokerCoverageLabel);
                var lane = (!locked && !isNetwork) ? ('/marathon/intel/' + e.key) : null;
                var beat = locked
                  ? ('Beat - ' + e.role + (brokerCoverageLabel ? ' - deploys with ' + brokerCoverageLabel : ''))
                  : ('Beat - ' + e.role);
                var inner = (
                  <>
                    <div className="photo" style={{ '--op': e.color }}>
                      <div className="cbar" aria-hidden="true" />
                      {/* Portrait renders when a file exists (editorHasPortrait); onError or
                          a missing file degrades to the initial badge. BROKER's clear face
                          renders here even on the locked card -- redaction is on the name. */}
                      <EditorPortrait
                        src={editorHasPortrait(e.key) ? '/images/editors/' + e.key + '.jpg' : null}
                        alt={e.key.toUpperCase() + ' - ' + e.fullName}
                        imgClassName="ph-photo"
                        fallback={<div className="ph-badge" aria-hidden="true">{editorInitial(e.key)}</div>}
                      />
                      {locked
                        ? <div className="classified-stamp">Classified</div>
                        : (!editorHasPortrait(e.key) ? <div className="ph-tag">{'// PORTRAIT PENDING'}</div> : null)}
                    </div>
                    <div className="body">
                      <div className="rank">{rank}</div>
                      <div className="code">{e.key.toUpperCase()}</div>
                      <div className="handle">{e.role}</div>
                      <div className="name">{locked ? <span className="redact">&nbsp;{e.fullName}&nbsp;</span> : e.fullName}</div>
                      <div className="role">{e.bio}</div>
                      <div className="beat" dangerouslySetInnerHTML={{ __html: beat.replace(/&/g, '&amp;') }} />
                    </div>
                  </>
                );
                var cls = 'op' + (locked ? ' locked' : '') + (isNetwork ? ' network' : '');
                return lane
                  ? <Link key={e.key} href={lane} className={cls} style={{ '--op': e.color }}>{inner}</Link>
                  : <div key={e.key} className={cls} style={{ '--op': e.color }}>{inner}</div>;
              })}
            </div>
          </div>
        </section>

        {/* RECEIPTS -- the set piece: a REAL verified stat chain, animated + traversable.
            Fail-open in the client component: null receipt -> clean static true claim. */}
        <section className="receipts" id="receipts">
          <div className="wrap">
            <div className="sec-eyebrow">Inspectable by design</div>
            <h2>Every number, traceable to its receipt.</h2>
            <p className="sec-sub">Not a promise - a chain you can walk. Here is a real stat resolving from its source to the page you can check it on.</p>
            <ReceiptPanel receipt={receipt} />
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="how" id="how">
          <div className="wrap">
            <div className="sec-eyebrow">How the intel gets made</div>
            <h2>Transparent by design.</h2>
            <div className="how-grid">
              <div className="how-card"><div className="how-tag">{'// 01 - Pulled from the source'}</div><p>Official patch notes and dev channels lead. Community signal tells us what is hot - never what is true.</p></div>
              <div className="how-card"><div className="how-tag">{'// 02 - Verified in-game'}</div><p>Numbers get checked by hand, in the actual game, before they enter the data. Unconfirmed data stays flagged.</p></div>
              <div className="how-card"><div className="how-tag">{'// 03 - Published, sourced'}</div><p>The editorial desk writes only from verified data. What we can&apos;t confirm, we say so - plainly.</p></div>
            </div>
          </div>
        </section>

        {/* TOOLS & REFERENCES -- PRESERVED */}
        <section className="tools-sec">
          <div className="wrap">
            <div className="sec-eyebrow">Tools &amp; references</div>
            <h2>The reference pages, one click away.</h2>
            <div className="tools-grid">
              {[
                { href: '/marathon/meta',         label: 'Tier list',      sub: 'Weapons and shells ranked' },
                { href: '/marathon/leaderboard',  label: 'Leaderboard',    sub: 'Top runners tracked' },
                { href: '/marathon/status',       label: 'Server status',  sub: 'Player activity and errors' },
                { href: '/marathon/player-count', label: 'Player count',   sub: 'Live Steam concurrents' },
                { href: '/marathon/weapons',      label: 'Weapons',        sub: 'Every stat, every gun' },
                { href: '/marathon/mods',         label: 'Mods',           sub: 'Every mod, every slot' },
              ].map(function(t) {
                return (
                  <Link key={t.href} href={t.href} className="tool">
                    <span className="tool-text"><span className="tool-label">{t.label}</span><span className="tool-sub">{t.sub}</span></span>
                    <span className="tool-arrow" aria-hidden="true">&rarr;</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* WHAT IS CNP -- PRESERVED */}
        <section className="about-sec">
          <div className="wrap">
            <div className="sec-eyebrow">What is Cybernetic Punks?</div>
            <p className="about-body">The verified intelligence network for competitive shooters - Marathon now, Call of Duty&apos;s DMZ next, more to come. Every stat is verified against the live game, never scraped or guessed. Our editorial desk tracks the meta, builds, and economy of each game around the clock, so you get first-party intel that general-purpose AI can&apos;t replicate. No hype. Just intel.</p>
            <Link href="/about" className="about-link">How the network works &rarr;</Link>
          </div>
        </section>

        {/* SUBSCRIBE -- real DMZ-launch notify capture (NetworkSubscribeForm -> email_signups).
            Countdown days derive from the single dmz.launch_date constant. */}
        <section className="subscribe" id="join">
          <div className="wrap inner">
            {launchDays != null && (
              <div className="countdown">&#9670; {launchDays > 0 ? <>DMZ LAUNCHES IN <b>{launchDays} {launchDays === 1 ? 'DAY' : 'DAYS'}</b></> : <>DMZ IS <b>LIVE</b></>}</div>
            )}
            <h2>Get on the list before DMZ drops.</h2>
            <p className="sec-sub" style={{ margin: '0 auto' }}>One email when the meta moves: verified patch breakdowns, weapon and build changes, and the numbers that actually shifted - for Marathon now, and DMZ the day the Hajin Exclusion Zone opens. No spam, no hype. Only when there is something real to send.</p>
            <div className="sub-form-slot">
              <NetworkSubscribeForm />
            </div>
            <p className="microcopy">{'// Unsubscribe anytime; we email when the data changes, not on a schedule.'}</p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer>
        <div className="wrap foot-in">
          <div className="brand foot-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/cnp-512.png" alt="Cybernetic Punks" width="34" height="34" />
            <div>
              <span className="wm">CYBERNETIC <b>PUNKS</b></span>
              <p className="whisper">An AI-operated intelligence network with a human-verified data moat. The machines write; a human checks the numbers.</p>
            </div>
          </div>
          <div className="foot-links">
            <Link href="/marathon">Marathon</Link>
            <Link href="/dmz">DMZ</Link>
            <Link href="/about">About</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}


// -- STYLES (ported from cnp-root-mock-v7.html, scoped under .cnp-root; keyframes
// cnp-prefixed; --display/--body/--mono mapped onto the next/font variables). Class-based
// selectors carried through; a small preserved-feed block styles the "Latest from" columns,
// the Vantage voice, the network-desk feed, tools, about, and the receipts set piece. --
const CNP_CSS = `
.cnp-root{
  --base:#0D0A0B;--surface:#1A1315;--surface-2:#241A1D;
  --burg:#6E1423;--burg-bright:#9A2740;--burg-glow:rgba(154,39,64,.32);
  --red:#ff2038;--red-glow:rgba(255,32,56,.55);--gold:#E8B54D;
  --text:#F0EAE2;--text-dim:#9c908c;--line:rgba(240,234,226,.09);
  --display:var(--cnp-display),'Chakra Petch',sans-serif;--body:var(--cnp-body),'Inter',sans-serif;--mono:var(--cnp-mono),'JetBrains Mono',monospace;
  position:relative;background:var(--base);color:var(--text);font-family:var(--body);line-height:1.5;min-height:100vh;-webkit-font-smoothing:antialiased;overflow-x:hidden;
}
.cnp-root *{box-sizing:border-box}
.cnp-root ::selection{background:var(--burg-bright);color:#fff}
.cnp-root a{color:inherit;text-decoration:none}
.cnp-root .wrap{max-width:1200px;margin:0 auto;padding:0 32px}
@media(prefers-reduced-motion:reduce){.cnp-root *{animation:none!important;transition:none!important}}

.cnp-root .atmos{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(1100px 700px at 75% -10%, var(--burg-glow), transparent 60%),radial-gradient(900px 600px at 8% 15%, rgba(110,20,35,.16), transparent 55%)}
.cnp-root main{position:relative;z-index:1}
.cnp-root nav{position:sticky;top:0;z-index:50;backdrop-filter:blur(14px);background:linear-gradient(180deg,rgba(13,10,11,.92),rgba(13,10,11,.5));border-bottom:1px solid var(--line)}
.cnp-root .nav-in{display:flex;align-items:center;justify-content:space-between;height:70px}
.cnp-root .nav-right{display:flex;align-items:center;gap:22px}
.cnp-root .brand{display:flex;align-items:center;gap:13px}
.cnp-root .brand img{width:38px;height:38px;border-radius:9px;display:block}
.cnp-root .brand .wm{font-family:var(--display);font-weight:700;font-size:18px;letter-spacing:.05em}
.cnp-root .brand .wm b{color:var(--burg-bright)}
.cnp-root .nav-links{display:flex;gap:28px;align-items:center;font-size:14px;color:var(--text-dim);font-weight:500}
.cnp-root .nav-links a:hover{color:var(--text)}

.cnp-root .hero{padding:96px 0 68px;position:relative;overflow:hidden}
.cnp-root .hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center}
.cnp-root .eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.32em;color:var(--gold);text-transform:uppercase;display:flex;align-items:center;gap:12px;margin-bottom:28px}
.cnp-root .eyebrow .live{width:7px;height:7px;border-radius:50%;background:#3ddc84;box-shadow:0 0 10px #3ddc84;animation:cnpPulse 2s infinite}
@keyframes cnpPulse{0%,100%{opacity:1}50%{opacity:.35}}
.cnp-root h1{font-family:var(--display);font-weight:700;font-size:clamp(38px,5.6vw,68px);line-height:1.03;letter-spacing:-.01em;margin-bottom:24px}
.cnp-root h1 .hl{color:var(--burg-bright);position:relative}
.cnp-root h1 .hl::after{content:'';position:absolute;left:0;bottom:.05em;width:100%;height:.08em;background:var(--gold);opacity:.9}
.cnp-root .sub{font-size:18px;color:var(--text-dim);max-width:48ch;margin-bottom:36px;line-height:1.6}
.cnp-root .sub b{color:var(--text);font-weight:500}
.cnp-root .cta-row{display:flex;gap:14px;flex-wrap:wrap}
.cnp-root .btn{font-family:var(--display);font-size:15px;font-weight:600;letter-spacing:.02em;padding:15px 28px;border-radius:2px;transition:.22s;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;gap:9px}
.cnp-root .btn-gold{background:var(--gold);color:var(--base)}
.cnp-root .btn-gold:hover{box-shadow:0 6px 30px rgba(232,181,77,.35);transform:translateY(-2px)}
.cnp-root .btn-gold:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}
.cnp-root .btn-ghost{border-color:var(--line);color:var(--text)}
.cnp-root .btn-ghost:hover{border-color:var(--burg-bright);background:rgba(154,39,64,.12)}

.cnp-root .scope{position:relative;aspect-ratio:1;max-width:440px;margin:0 auto}
.cnp-root .scope svg{width:100%;height:100%;overflow:visible;display:block}
.cnp-root #reticle{transform-box:fill-box;transform-origin:center}
.cnp-root .glowpulse{animation:cnpGlowpulse 4s ease-in-out infinite}
@keyframes cnpGlowpulse{0%,100%{opacity:.35}50%{opacity:.7}}
.cnp-root .ring-rot{transform-origin:center;animation:cnpRot 26s linear infinite}
@keyframes cnpRot{to{transform:rotate(360deg)}}
.cnp-root .scope-label{position:absolute;bottom:4%;left:50%;transform:translateX(-50%);font-family:var(--mono);font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;white-space:nowrap;transition:color .2s}
.cnp-root .flash{opacity:0}

.cnp-root .telemetry{margin-top:56px;border:1px solid var(--line);border-radius:6px;background:linear-gradient(180deg,rgba(36,26,29,.55),rgba(26,19,21,.28));overflow:hidden;position:relative}
.cnp-root .telemetry::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.5}
.cnp-root .tel-head{display:flex;align-items:center;justify-content:space-between;padding:13px 20px;border-bottom:1px solid var(--line);font-family:var(--mono);font-size:11px;letter-spacing:.18em;color:var(--text-dim);text-transform:uppercase}
.cnp-root .tel-head .rec{display:flex;align-items:center;gap:8px;color:var(--red)}
.cnp-root .tel-head .rec i{width:6px;height:6px;border-radius:50%;background:var(--red);box-shadow:0 0 8px var(--red);animation:cnpPulse 1.4s infinite}
.cnp-root .tel-grid{display:grid;grid-template-columns:repeat(4,1fr)}
.cnp-root .tel-cell{padding:22px 20px;border-right:1px solid var(--line)}
.cnp-root .tel-cell:last-child{border-right:none}
.cnp-root .tel-cell .lbl{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px}
.cnp-root .tel-cell .val{font-family:var(--display);font-size:30px;font-weight:700;color:var(--text);line-height:1}
.cnp-root .tel-cell.pop .val{color:var(--gold)}
.cnp-root .pass-note{padding:9px 20px 13px;font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:var(--burg-bright);border-top:1px solid var(--line)}

.cnp-root section{padding:88px 0}
.cnp-root .sec-eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.28em;color:var(--gold);text-transform:uppercase;margin-bottom:16px;display:flex;align-items:center;gap:12px}
.cnp-root .sec-eyebrow::before{content:'';width:28px;height:1px;background:var(--gold)}
.cnp-root h2{font-family:var(--display);font-weight:700;font-size:clamp(28px,4vw,44px);line-height:1.08;letter-spacing:-.01em;margin-bottom:18px;max-width:22ch}
.cnp-root .sec-sub{color:var(--text-dim);font-size:17px;max-width:60ch;line-height:1.6}

.cnp-root .proof{border-top:1px solid var(--line)}
.cnp-root .proof-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:44px}
.cnp-root .card{border:1px solid var(--line);border-radius:6px;padding:32px;position:relative;overflow:hidden}
.cnp-root .card.them{background:var(--surface);opacity:.72}
.cnp-root .card.us{background:linear-gradient(180deg,rgba(110,20,35,.16),rgba(26,19,21,.4));border-color:var(--burg)}
.cnp-root .card .tag{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:20px}
.cnp-root .card.them .tag{color:var(--text-dim)}.cnp-root .card.us .tag{color:var(--gold)}
.cnp-root .card ul{list-style:none;display:flex;flex-direction:column;gap:14px}
.cnp-root .card li{display:flex;gap:12px;align-items:flex-start;font-size:15px;line-height:1.45}
.cnp-root .card .ic{font-family:var(--mono);flex-shrink:0;margin-top:1px}
.cnp-root .card.them .ic{color:#7a4a4a}.cnp-root .card.us .ic{color:var(--gold)}
.cnp-root .card.them li{color:var(--text-dim)}

.cnp-root .voice-sec{border-top:1px solid var(--line)}
.cnp-root .voice{border:1px solid var(--line);border-left:2px solid var(--gold);border-radius:6px;background:linear-gradient(180deg,rgba(36,26,29,.5),rgba(26,19,21,.25));padding:26px 28px;max-width:820px}
.cnp-root .voice-by{display:flex;align-items:center;gap:9px;font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:14px}
.cnp-root .voice-dot{width:7px;height:7px;border-radius:50%;background:var(--gold)}
.cnp-root .voice-role{color:var(--text-dim)}
.cnp-root .voice-line{font-family:var(--display);font-size:22px;font-weight:500;line-height:1.4;color:var(--text);margin:0}
.cnp-root .voice-brief{font-size:14.5px;line-height:1.6;color:var(--text-dim);margin:14px 0 0}

.cnp-root .games{border-top:1px solid var(--line)}
.cnp-root .game-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-top:44px}
.cnp-root .game{border:1px solid var(--line);border-radius:8px;overflow:hidden;position:relative;min-height:300px;display:flex;flex-direction:column;justify-content:flex-end;padding:28px;transition:.25s;cursor:pointer;isolation:isolate}
.cnp-root .game .art{position:absolute;inset:0;z-index:0;background-image:var(--img,var(--fallback));background-size:cover;background-position:center;transition:transform .5s ease}
.cnp-root .game{--fallback:linear-gradient(180deg,#1d1417,var(--surface))}
.cnp-root .game:hover .art{transform:scale(1.05)}
.cnp-root .game .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(13,10,11,.15) 0%,rgba(13,10,11,.05) 45%,rgba(13,10,11,.6) 78%,rgba(13,10,11,.94) 100%)}
/* Stronger bottom band for warm/bright art (Wardogs) so the bottom meta + CTA
   stay legible over amber. Darkens the lower half; top stays clear. */
.cnp-root .game .scrim.scrim-strong{background:linear-gradient(180deg,rgba(13,10,11,.22) 0%,rgba(13,10,11,.12) 38%,rgba(13,10,11,.74) 72%,rgba(13,10,11,.98) 100%)}
.cnp-root .game:hover{transform:translateY(-4px);border-color:var(--burg-bright)}
.cnp-root .game>*:not(.art):not(.scrim){position:relative;z-index:2}
.cnp-root .game .status{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;position:absolute;top:24px;left:28px;z-index:2;display:inline-flex;align-items:center;gap:8px;background:rgba(13,10,11,.72);backdrop-filter:blur(6px);padding:7px 12px;border-radius:100px;border:1px solid var(--line);color:#c8ff2f}
.cnp-root .game .status.dmz-pill{color:var(--gold)}
.cnp-root .game .status.wardogs-pill{color:var(--gold)}
.cnp-root .game .status i{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
.cnp-root .game .meta{font-size:13.5px;color:#d8cdc8;margin-bottom:14px;text-shadow:0 1px 14px rgba(0,0,0,.9);font-weight:500}
.cnp-root .game .go{font-family:var(--display);font-size:15px;font-weight:600;color:var(--gold);display:flex;align-items:center;gap:8px;text-shadow:0 1px 10px rgba(0,0,0,.8)}
.cnp-root .game:hover .go{gap:12px}

.cnp-root .pulse-sec{border-top:1px solid var(--line)}
.cnp-root .pulse-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:44px}
.cnp-root .pcol{border:1px solid var(--line);border-radius:8px;background:var(--surface);padding:20px}
.cnp-root .pcol-head{display:flex;align-items:center;gap:9px;padding-bottom:12px;border-bottom:1px solid var(--line);margin-bottom:14px}
.cnp-root .pcol-mark{width:8px;height:8px;border-radius:2px;background:var(--accent,var(--gold));flex-shrink:0}
.cnp-root .pcol-title{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-dim)}
.cnp-root .pcol-body{display:flex;flex-direction:column;gap:9px}
.cnp-root .prow{display:block;padding:12px 13px;background:var(--base);border:1px solid var(--line);border-left:2px solid transparent;border-radius:3px;transition:.15s}
.cnp-root .prow:hover{border-left-color:var(--accent,var(--gold));background:var(--surface-2)}
.cnp-root .prow-meta{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)}
.cnp-root .prow-when{margin-left:auto}
.cnp-root .prow-head{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:14px;font-weight:500;line-height:1.4;color:var(--text)}
.cnp-root .pcol-empty{font-family:var(--mono);font-size:12px;color:var(--text-dim)}
.cnp-root .pkeys{margin-top:14px;display:flex;flex-direction:column;gap:7px}
.cnp-root .pkeys-label{font-family:var(--mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim)}
.cnp-root .pkeys-row{display:flex;flex-wrap:wrap;gap:6px}
.cnp-root .pkey{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-dim);border:1px solid var(--line);border-radius:3px;padding:4px 9px;transition:.15s}
.cnp-root .pkey:hover{color:var(--text);border-color:var(--burg-bright)}

.cnp-root .deskfeed-sec{border-top:1px solid var(--line)}
.cnp-root .deskfeed{list-style:none;display:flex;flex-direction:column;gap:9px;margin-top:36px}
.cnp-root .deskfeed-row{display:block;padding:14px 16px;background:var(--surface);border:1px solid var(--line);border-left:2px solid var(--burg);border-radius:3px;transition:.15s}
.cnp-root .deskfeed-row:hover{border-left-color:var(--gold);background:var(--surface-2)}
.cnp-root .deskfeed-meta{display:flex;align-items:center;gap:9px;margin-bottom:6px;font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)}
.cnp-root .deskfeed-game{border:1px solid var(--line);border-radius:2px;padding:1px 7px}
.cnp-root .deskfeed-when{margin-left:auto}
.cnp-root .deskfeed-head{font-size:14.5px;font-weight:500;line-height:1.4;color:var(--text)}

.cnp-root .desk{border-top:1px solid var(--line)}
.cnp-root .desk-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:44px}
.cnp-root .op{display:grid;grid-template-columns:150px 1fr;border:1px solid var(--line);border-radius:8px;background:var(--surface);overflow:hidden;transition:.25s;color:inherit}
.cnp-root .op:hover{border-color:var(--op);transform:translateY(-3px)}
.cnp-root .op .photo{position:relative;background:linear-gradient(160deg,var(--surface-2),#120d0f);border-right:1px solid var(--line);display:flex;align-items:center;justify-content:center;min-height:150px}
.cnp-root .op .photo::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(13,10,11,.5));pointer-events:none;z-index:1}
/* Portrait fills the photo slot behind the scrim + cbar; the locked (BROKER) card
   does NOT grayscale it (only the badge is dimmed), so her face renders clear. */
.cnp-root .op .ph-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;z-index:0}
.cnp-root .op .ph-badge{font-family:var(--display);font-weight:700;font-size:40px;color:var(--op);opacity:.85}
.cnp-root .op .ph-tag{position:absolute;bottom:10px;left:0;right:0;text-align:center;font-family:var(--mono);font-size:8.5px;letter-spacing:.14em;color:var(--text-dim);text-transform:uppercase}
.cnp-root .op .photo .cbar{position:absolute;top:0;left:0;width:100%;height:4px;background:var(--op);z-index:1}
.cnp-root .op .body{padding:22px 24px;position:relative}
.cnp-root .op .rank{position:absolute;top:20px;right:22px;font-family:var(--mono);font-size:9px;letter-spacing:.12em;padding:3px 8px;border-radius:3px;text-transform:uppercase;background:rgba(232,181,77,.12);color:var(--gold);border:1px solid rgba(232,181,77,.3)}
.cnp-root .op .code{font-family:var(--display);font-size:21px;font-weight:700;letter-spacing:.02em;color:var(--text);line-height:1}
.cnp-root .op .handle{font-family:var(--display);font-size:13px;font-weight:600;color:var(--op);margin:5px 0 2px;letter-spacing:.02em}
.cnp-root .op .name{font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-bottom:14px}
.cnp-root .op .role{font-size:13.5px;color:var(--text-dim);line-height:1.5;margin-bottom:14px}
.cnp-root .op .beat{font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--text-dim);text-transform:uppercase;padding-top:12px;border-top:1px solid var(--line)}
.cnp-root .op .beat b{color:var(--text)}
.cnp-root .op.locked .photo{background:repeating-linear-gradient(45deg,#160f11,#160f11 8px,#1c1315 8px,#1c1315 16px)}
.cnp-root .op.locked .ph-badge{opacity:.14;filter:grayscale(1)}
.cnp-root .op.locked .code{color:var(--text-dim)}
.cnp-root .op.locked .redact{display:inline-block;background:var(--text-dim);color:transparent;border-radius:2px;user-select:none}
.cnp-root .op.locked .rank{background:rgba(255,32,56,.14);color:var(--red);border-color:rgba(255,32,56,.4)}
.cnp-root .op.locked .beat b{color:var(--gold)}
.cnp-root .classified-stamp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-14deg);z-index:5;font-family:var(--display);font-weight:700;font-size:14px;letter-spacing:.18em;color:var(--red);border:2.5px solid var(--red);border-radius:4px;padding:5px 12px;text-transform:uppercase;background:rgba(13,10,11,.55);box-shadow:0 0 20px rgba(255,32,56,.3);white-space:nowrap;opacity:.92}
.cnp-root .portrait-note{margin-top:18px;font-family:var(--mono);font-size:11px;color:var(--burg-bright);letter-spacing:.04em}

.cnp-root .receipts{border-top:1px solid var(--line)}
.cnp-root .receipt-shell{margin-top:34px;border:1px solid var(--line);border-radius:6px;background:var(--surface);overflow:hidden;max-width:820px}
.cnp-root .receipt-head{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid var(--line);font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim)}
.cnp-root .receipt-live{display:inline-flex;align-items:center;gap:7px;color:var(--gold)}
.cnp-root .receipt-live i{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:cnpPulse 1.5s ease-in-out infinite}
.cnp-root .receipt-body{padding:18px;display:flex;flex-direction:column;gap:13px}
.cnp-root .receipt-line{display:flex;align-items:baseline;gap:14px;opacity:0;transform:translateY(4px);transition:opacity .4s ease,transform .4s ease}
.cnp-root .receipt-line.in{opacity:1;transform:none}
.cnp-root .receipt-lbl{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);width:56px;flex-shrink:0}
.cnp-root .receipt-val{font-family:var(--mono);font-size:13px;line-height:1.5;color:var(--text-dim)}
.cnp-root .receipt-line.is-claim{margin-top:4px;padding-top:13px;border-top:1px solid var(--line)}
.cnp-root .receipt-line.is-claim .receipt-val{color:var(--text);font-size:14.5px}
.cnp-root .receipt-static-claim{font-size:15px;line-height:1.6;color:var(--text);margin:0 0 14px}
.cnp-root .receipt-link{display:inline-block;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);opacity:0;transform:translateY(4px);transition:opacity .45s ease,transform .45s ease}
.cnp-root .receipt-link.in{opacity:1;transform:none}
.cnp-root .receipt-link:hover{opacity:.75}

.cnp-root .how{border-top:1px solid var(--line)}
.cnp-root .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:44px}
.cnp-root .how-card{border:1px solid var(--line);border-radius:6px;padding:28px;background:var(--surface)}
.cnp-root .how-tag{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-bottom:14px}
.cnp-root .how-card p{color:var(--text-dim);font-size:14.5px;line-height:1.55}

.cnp-root .tools-sec{border-top:1px solid var(--line)}
.cnp-root .tools-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:44px}
.cnp-root .tool{display:flex;align-items:center;gap:12px;padding:16px 18px;background:var(--surface);border:1px solid var(--line);border-radius:5px;transition:.16s}
.cnp-root .tool:hover{border-color:var(--burg-bright);transform:translateY(-2px)}
.cnp-root .tool-text{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.cnp-root .tool-label{font-family:var(--display);font-size:14px;font-weight:600;color:var(--text)}
.cnp-root .tool-sub{font-family:var(--mono);font-size:10px;letter-spacing:.04em;color:var(--text-dim)}
.cnp-root .tool-arrow{color:var(--gold);flex-shrink:0}

.cnp-root .about-sec{border-top:1px solid var(--line)}
.cnp-root .about-body{font-size:15.5px;line-height:1.75;color:var(--text-dim);max-width:74ch;margin-top:22px}
.cnp-root .about-link{display:inline-block;margin-top:16px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.cnp-root .about-link:hover{opacity:.75}

.cnp-root .subscribe{border-top:1px solid var(--line);text-align:center}
.cnp-root .subscribe .inner{max-width:640px;margin:0 auto}
.cnp-root .countdown{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;letter-spacing:.16em;color:var(--red);text-transform:uppercase;border:1px solid var(--burg);padding:8px 16px;border-radius:100px;margin-bottom:26px;background:rgba(110,20,35,.14)}
.cnp-root .countdown b{color:var(--text)}
.cnp-root .subscribe h2{margin:0 auto 18px}
/* Slot maps the shared NetworkSubscribeForm's tokens onto the cnp-root palette so its
   inline-styled inputs render in burgundy/gold instead of the network-page silver. */
.cnp-root .sub-form-slot{display:flex;justify-content:center;margin:30px auto 14px;max-width:480px;--bg-page:var(--surface);--border:var(--line);--text-primary:var(--text);--nr-vantage:var(--gold)}
.cnp-root .microcopy{font-size:12.5px;color:var(--text-dim);font-family:var(--mono);letter-spacing:.04em}

.cnp-root footer{border-top:1px solid var(--line);padding:48px 0 40px;position:relative;z-index:1}
.cnp-root .foot-in{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:24px}
.cnp-root .foot-brand{align-items:flex-start}
.cnp-root .foot-brand img{width:34px;height:34px;border-radius:8px}
.cnp-root .foot-brand .wm{font-family:var(--display);font-weight:700;font-size:16px;letter-spacing:.05em}
.cnp-root .whisper{font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:.1em;max-width:42ch;margin-top:12px;line-height:1.6}
.cnp-root .foot-links{display:flex;gap:22px;font-size:13px;color:var(--text-dim)}
.cnp-root .foot-links a:hover{color:var(--gold)}

.cnp-root :focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:2px}

@media(max-width:920px){.cnp-root .hero-grid{grid-template-columns:1fr;gap:8px}.cnp-root .scope{max-width:300px;order:-1;margin-bottom:24px}.cnp-root .desk-grid,.cnp-root .pulse-grid{grid-template-columns:1fr}}
@media(max-width:820px){.cnp-root .proof-grid,.cnp-root .game-grid,.cnp-root .how-grid{grid-template-columns:1fr}.cnp-root .tel-grid{grid-template-columns:1fr 1fr}.cnp-root .tel-cell:nth-child(2){border-right:none}.cnp-root .tel-cell:nth-child(1),.cnp-root .tel-cell:nth-child(2){border-bottom:1px solid var(--line)}.cnp-root .nav-links{display:none}.cnp-root .form{flex-direction:column}.cnp-root .wrap{padding:0 22px}.cnp-root section{padding:60px 0}}
@media(max-width:420px){.cnp-root .op{grid-template-columns:1fr}.cnp-root .op .photo{min-height:110px;border-right:none;border-bottom:1px solid var(--line)}}
`;
