// app/page.js
// NEUTRAL ROOT (network front door). Premium v7 treatment (burgundy/black/gold, Chakra
// Petch/Inter/JetBrains Mono, the crosshair signature, image-ready game tiles). All data is
// LIVE-wired (telemetry, game pulse feeds, the receipts chain, subscribe capture); SEO
// metadata + JSON-LD live here too.
//
// VOICE: product-forward + marketable, matching the network OG card ("Loadouts, tier lists,
// and meta for the games you play / NO HYPE. JUST INTEL."). The tools are the pitch; the
// verified-data moat is the supporting proof, not the headline. Editors are a backend method
// (produced-at-scale), deliberately NOT a hero section.
//
// Font loading is scoped to this page via next/font (no layout change). CSS is scoped
// under `.cnp-root` so the generic selectors cannot leak to other routes.

import Link from 'next/link';
import { Chakra_Petch, Inter, JetBrains_Mono } from 'next/font/google';
import { CNP_CSS } from '@/lib/network/networkTheme';
import { supabase } from '@/lib/supabase';
import { getLiveStats } from '@/lib/liveStats';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import { isGameLive } from '@/lib/network/gameStatus';
import { entitySlugFor } from '@/lib/coverage';
import AccountMenu from '@/components/AccountMenu';
import HeroCrosshair from '@/components/network/HeroCrosshair';
import ReceiptPanel from '@/components/network/ReceiptPanel';
import NetworkSubscribeForm from '@/components/network/NetworkSubscribeForm';
import NetworkFooter from '@/components/network/NetworkFooter';
import ViewTracker from '@/components/ViewTracker';
import AdvisorResumeLink from '@/components/AdvisorResumeLink';
import { getEditorDisplay } from '@/lib/editors/roster';
import { dmz } from '@/lib/games/dmz';
import { wardogs } from '@/lib/games/wardogs';

// Premium type stack (mock Section 1). Scoped to this page; exposed as CSS variables the
// ported CSS maps --display / --body / --mono onto.
const chakra = Chakra_Petch({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--cnp-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--cnp-body', display: 'swap' });
const jbmono = JetBrains_Mono({ subsets: ['latin'], variable: '--cnp-mono', display: 'swap' });

// -- METADATA -- title/canonical/JSON-LD unchanged. The description was rewritten in the
// FPS-players keyword pass: leads "Verified FPS intelligence" and weaves searched content-types
// (tier lists, weapon stats, guides) + game names, dropping the narrower "competitive-shooter"
// framing. Keeps the differentiator language ("verified", "first-party", "no hype", "checked
// in-game"); no superlative/comparative reaches the SERP.
export const metadata = {
  title: { absolute: 'Cybernetic Punks - Loadouts, Tier Lists & Meta for the Games You Play' },
  description: 'Loadouts, tier lists, weapon stats, and meta for Marathon, Wardogs, and extraction shooters - every stat checked in-game. No hype, just intel.',
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
// Whole days remaining until an ISO launch date, single-sourced per game from its
// launch_date constant (dmz.launch_date / wardogs.launch_date). No hardcoded date literal --
// every countdown derives from config. Returns days (>0), 0 once the date has passed (never
// negative -- the countdown then flips to a "LIVE" state), or null on a missing/bad date
// (the countdown hides).
function daysUntil(iso) {
  if (!iso) return null;
  var ms = new Date(iso + 'T00:00:00Z').getTime() - Date.now();
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
        // Every ROOT_GAMES entry defines pulse.articleHref (each returns the new
        // /<game>/... structure). A game that omits it drops its rows here (null ->
        // filtered below) rather than emit a dead root /intel/ URL -- a fail-safe,
        // mirroring the per-game builders' own null-on-unmapped-slug pattern.
        var href = g.pulse.articleHref ? g.pulse.articleHref(it.slug) : null;
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

// RECEIPTS: one REAL verified stat + its verified_source chain, for the receipts set piece.
// Pulls the most-recently-verified weapon row that has a source AND a damage figure, and
// resolves a TRAVERSABLE link to its entity page. FAIL-OPEN: any empty/malformed/thrown
// result returns null, and the panel renders its clean static fallback instead of a
// half-resolved chain, a null claim, or a dead link.
async function getReceipt() {
  try {
    var res = await supabase
      .from('weapon_stats')
      .select('name, damage, damage_type, verified_source, updated_at')
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
    name: 'Cybernetic Punks',
    url: 'https://cyberneticpunks.com',
    logo: 'https://cyberneticpunks.com/cnp-512.png',
    sameAs: ['https://x.com/Cybernetic87250'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Cybernetic Punks',
    url: 'https://cyberneticpunks.com',
  },
];

export default async function NetworkRoot() {
  var [data, stats, receipt] = await Promise.all([getNetworkPulse(), getNetworkStats(), getReceipt()]);

  // Game tile meta + telemetry (real data, PASS B).
  var updatedLabel = stats.updated ? timeAgo(stats.updated) : null;
  // GAMES COVERED = the front-door network size (ROOT_GAMES), not the SEO-indexability count.
  // Dynamic: adding a game to ROOT_GAMES updates this automatically.
  var gamesCovered = ROOT_GAMES.length;
  // PEAK PLAYERS TRACKED = the biggest VERIFIED peak-concurrent across the network (sourced
  // ROOT_GAMES[].verifiedPeak; today Wardogs' ~365K SteamDB EA-launch peak dominates). A PEAK,
  // not a live count (the cell label says so) -- the honest way to show the network's real scale
  // when we only fetch ONE live Steam count (Marathon's ~2K). null -> the cell hides gracefully.
  var networkPeak = ROOT_GAMES.reduce(function (max, g) {
    var v = g.verifiedPeak && typeof g.verifiedPeak.value === 'number' ? g.verifiedPeak.value : 0;
    return v > max ? v : max;
  }, 0);
  var wardogsDays = daysUntil(wardogs.launch_date); // Sep 10 EA -- the nearer event
  var dmzDays = daysUntil(dmz.launch_date);         // Oct 23 launch -- the primary growth launch
  var wardogsEA = eaDateLabel(wardogs.launch_date); // "Sep 10", single-sourced from wardogs.launch_date
  var wardogsLive = isGameLive(wardogs);            // date-driven: flips the tile pill when EA opens
  var dmzLive = isGameLive(dmz);                     // date-driven: flips the DMZ tile pill when it launches (Oct 23, full launch)
  var gameMeta = {};
  ROOT_GAMES.forEach(function(g) {
    var p = data.pulse[g.slug];
    gameMeta[g.slug] = {
      online: p && typeof p.online === 'number' ? formatNum(p.online) : null,
      updated: updatedLabel,
    };
  });

  return (
    <div className={'cnp-root ' + chakra.variable + ' ' + inter.variable + ' ' + jbmono.variable}>
      {/* Page-level analytics only (no layout/nav/footer or title/meta change): record a root
          page_view (with referrer host) so root traffic + its distribution source is measurable,
          matching every other page. Renders nothing. */}
      <ViewTracker slug="home" type="home" gameSlug="network" />
      {/* Client-only: shows a "Finish your Marathon build" link if an anon advisor draft is pending
          (renders null on the server, so this page's SSR HTML is unchanged). */}
      <AdvisorResumeLink />
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
              <a href="#tools">Tools</a>
              <a href="#proof">Why us</a>
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
              <h1>Loadouts, tier lists, and meta for <span className="hl">the games you play</span>.</h1>
              <p className="sub">The best loadouts, weapons ranked by real time-to-kill, and the meta that actually wins - for Marathon and Wardogs, with DMZ landing October 23. Every number checked in-game. <b>We don&apos;t guess</b> - if we don&apos;t know, we say so.</p>
              <div className="cta-row">
                <a href="#games" className="btn btn-gold">Explore the network &rarr;</a>
                <a href="#tools" className="btn btn-ghost">Jump to the tools</a>
              </div>
            </div>
            <HeroCrosshair />
          </div>

          {/* TELEMETRY -- real data. Each cell labelled as exactly what it measures. */}
          <div className="wrap">
            <div className="telemetry">
              <div className="tel-head"><span>{'// NETWORK TELEMETRY'}</span><span className="rec"><i aria-hidden="true" />REC</span></div>
              <div className="tel-grid">
                <div className="tel-cell"><div className="lbl">Games Covered</div><div className="val">{String(gamesCovered)}</div></div>
                <div className="tel-cell pop"><div className="lbl">Peak Players Tracked</div><div className="val">{networkPeak > 0 ? formatNum(networkPeak) : '--'}</div></div>
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
                <div className="status dmz-pill"><i aria-hidden="true" />{dmzLive ? <>LIVE NOW</> : <>Launches with DMZ</>}</div>
                <div className="meta">Call of Duty: MW4 extraction &middot; Hajin Exclusion Zone &middot; pre-launch intel building</div>
                <div className="go">Get day-one coverage &rarr;</div>
              </Link>
              {/* Wardogs -- LIVE in Steam Early Access (EA opened Sep 10). The pill is date-driven
                  (isGameLive), reading EARLY ACCESS - LIVE now; the tile leads with the products
                  (Loadout Finder, Tier List, Economy Hub). Clickable Link mirroring the other tiles. */}
              <Link href="/wardogs" className="game wardogs" style={{ '--img': "url('/images/games/wardogs-hero.jpg')" }}>
                <div className="art" aria-hidden="true" /><div className="scrim scrim-strong" aria-hidden="true" />
                <div className="status wardogs-pill"><i aria-hidden="true" />{wardogsLive ? <>EARLY ACCESS &middot; LIVE</> : <>INTEL LIVE &middot; EA {wardogsEA || 'soon'}</>}</div>
                <div className="meta">{wardogs.displayName} &middot; Loadout Finder, Tier List &amp; Economy Hub</div>
                <div className="go">Find your best loadout &rarr;</div>
              </Link>
              {/* PUBG: DED.NET -- REVEALED, no release date (launch_date null). The pill states
                  "REVEALED / CLOSED BETA" honestly -- NO countdown, NO date (there is none). Blood-red
                  accent inline (no new CSS class). Clickable Link mirroring the other tiles. */}
              <Link href="/pubg-dednet" className="game" style={{ '--img': "url('/images/games/pubg-dednet-hero.jpg')" }}>
                <div className="art" aria-hidden="true" /><div className="scrim scrim-strong" aria-hidden="true" />
                <div className="status" style={{ color: '#cc2936' }}><i aria-hidden="true" />REVEALED &middot; CLOSED BETA</div>
                <div className="meta">PUBG: DED.NET &middot; PUBG Studios / KRAFTON &middot; roguelite FPS</div>
                <div className="go">Get the intel &rarr;</div>
              </Link>
              {/* Bodycam -- LIVE in Steam Early Access (game #5). Genuinely playable now, so the
                  pill reads "LIVE / EARLY ACCESS" (honest, matching the Wardogs-live convention) --
                  NO countdown, NO date (there is none; status:'live', launch_date null). Steel-cyan
                  accent inline (no new CSS class), mirroring the DED.NET tile mechanism. Nav-only:
                  bodycam.indexable stays false, so the /bodycam subtree remains noindex. */}
              <Link href="/bodycam" className="game" style={{ '--img': "url('/images/games/bodycam-hero.jpg')" }}>
                <div className="art" aria-hidden="true" /><div className="scrim scrim-strong" aria-hidden="true" />
                <div className="status" style={{ color: '#3d97b8' }}><i aria-hidden="true" />LIVE &middot; EARLY ACCESS</div>
                <div className="meta">Bodycam &middot; Reissad Studio &middot; body-cam tactical FPS</div>
                <div className="go">Get the intel &rarr;</div>
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
                    {Array.isArray(game.keyRoutes) && game.keyRoutes.length > 0 && (
                      <div className="pkeys">
                        <span className="pkeys-label">{game.label} reference</span>
                        <span className="pkeys-row">
                          {game.keyRoutes.map(function(k) { return <Link key={k.href} href={k.href} className="pkey">{k.label}</Link>; })}
                        </span>
                      </div>
                    )}
                  </div>
                );
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

        {/* TOOLS -- the products, both heavily-built verticals (Wardogs + Marathon), one click
            away from the apex. Wardogs first (the flagship-built vertical + distribution funnel). */}
        <section className="tools-sec" id="tools">
          <div className="wrap">
            <div className="sec-eyebrow">The tools</div>
            <h2>The tools that actually help you play.</h2>
            <div className="tools-grid">
              {[
                { href: '/wardogs/loadouts',  label: 'Wardogs Loadout Finder', sub: 'Your best loadout, by budget & level' },
                { href: '/wardogs/tier-list', label: 'Wardogs Tier List',      sub: 'Every weapon ranked by real TTK' },
                { href: '/wardogs/economy',   label: 'Wardogs Economy',        sub: 'Where the cash flows + what to save for' },
                { href: '/wardogs/arsenal',   label: 'Wardogs Arsenal',        sub: 'Every gun, every stat' },
                { href: '/marathon/meta',     label: 'Marathon Tier List',     sub: 'Weapons and shells ranked' },
                { href: '/marathon/weapons',  label: 'Marathon Weapons',       sub: 'Every stat, every gun' },
                { href: '/marathon/mods',     label: 'Marathon Mods',          sub: 'Every mod, every slot' },
                { href: '/marathon/leaderboard', label: 'Marathon Leaderboard', sub: 'Top runners tracked' },
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
            <p className="about-body">The intel network for FPS players - loadouts, tier lists, weapon stats, and economy tools for the games you play. Marathon and Wardogs are live now (Wardogs in Steam Early Access), with Call of Duty&apos;s DMZ landing October 23. Every number is checked against the live game, never scraped or guessed - and where we don&apos;t know yet, we say so. Verified content, produced at scale. No hype. Just intel.</p>
            <Link href="/about" className="about-link">How the network works &rarr;</Link>
          </div>
        </section>

        {/* SUBSCRIBE -- real launch notify capture (NetworkSubscribeForm -> email_signups).
            TWO countdowns, each single-sourced from its game's launch_date (Wardogs Sep 10,
            DMZ Oct 23) via daysUntil; each hides on a missing date and flips to "LIVE" (never
            negative) once its own date passes. */}
        <section className="subscribe" id="join">
          <div className="wrap inner">
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 26 }}>
              {wardogsDays != null && (
                <div className="countdown" style={{ marginBottom: 0 }}>&#9670; {wardogsDays > 0 ? <>WARDOGS EARLY ACCESS IN <b>{wardogsDays} {wardogsDays === 1 ? 'DAY' : 'DAYS'}</b></> : <>WARDOGS IS <b>LIVE</b></>}</div>
              )}
              {dmzDays != null && (
                <div className="countdown" style={{ marginBottom: 0 }}>&#9670; {dmzDays > 0 ? <>DMZ LAUNCHES IN <b>{dmzDays} {dmzDays === 1 ? 'DAY' : 'DAYS'}</b></> : <>DMZ IS <b>LIVE</b></>}</div>
              )}
            </div>
            <h2>Get on the list before the next drop.</h2>
            <p className="sec-sub" style={{ margin: '0 auto' }}>One email when the meta moves: verified patch breakdowns, weapon and build changes, and the numbers that actually shifted - Marathon and Wardogs live now, DMZ the day the Hajin Exclusion Zone opens, and PUBG: DED.NET as its closed beta and release firm up. No spam, no hype. Only when there is something real to send.</p>
            <div className="sub-form-slot">
              <NetworkSubscribeForm />
            </div>
            <p className="microcopy">{'// Unsubscribe anytime; we email when the data changes, not on a schedule.'}</p>
          </div>
        </section>
      </main>

      {/* FOOTER -- shared NetworkFooter (extracted verbatim; adds the Editors link). */}
      <NetworkFooter />
    </div>
  );
}


// The .cnp-root stylesheet now lives in lib/network/networkTheme.js (CNP_CSS), imported above and
// injected via <style>{CNP_CSS}</style>. Extracted in About-rebuild Phase 1 so /about and other
// network pages share ONE network identity. The FONT loaders stay inline here (byte-identical);
// lib/network/networkFonts.js carries the same stack for the other network pages.

