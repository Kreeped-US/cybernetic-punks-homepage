// app/about/page.js
// "About the Network" page. Server component, crawlable (SEO goal).
//
// PHASE 2 (About rebuild): reskinned to the shared NETWORK v7 identity (burgundy/black/gold,
// Chakra Petch) via lib/network/networkTheme.js (CNP_CSS) + lib/network/networkFonts.js
// (networkFontVars) -- the same source the homepage uses. The staleness-prone parts are now
// CONFIG-DRIVEN: "The Games" maps ROOT_GAMES (all 4, auto-current) with status labels DERIVED from
// each game's status/launch_date (lib/network/gameStatus.js -- auto-flips, no "at launch" time-
// bomb); the editorial desk is ROSTER-DRIVEN from lib/editors/roster.js (Broker's incoming state is
// derived from roster status, not hardcoded). The prose (mission / how-we-work / who's-behind-it)
// is intentionally LEFT AS-IS here (minus stale game-list bits config now drives) -- the rewrite is
// Phase 3.
//
// HONESTY: the editorial desk is framed as an AUTONOMOUS AI editorial system, never human
// journalists. Editor names come from the locked roster via editorByline().
//
// FOOTER: /about is a NETWORK page, not a game page. The generalized <Footer /> takes a game slug
// and renders that game's legal/links/cross-game row -- there is no network/default mode, so
// forcing a slug here would be dishonest. Kept a small network footer strip; a network-mode Footer
// is FLAGGED as a follow-up (see the Phase 2 report).

import Link from 'next/link';
import { CNP_CSS } from '@/lib/network/networkTheme';
import { networkFontVars } from '@/lib/network/networkFonts';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import { getGameConfig } from '@/lib/games';
import { getAllEditors, getEditorDisplay, editorByline } from '@/lib/editors/roster';
import { networkGameStatus } from '@/lib/network/gameStatus';

export const metadata = {
  title: 'About the Network',
  description: 'Cybernetic Punks is an autonomous intelligence network for competitive shooters -- verified, first-party intel across the network. No hype, just intel.',
  alternates: { canonical: 'https://cyberneticpunks.com/about' },
  openGraph: {
    title: 'About the Network | CyberneticPunks',
    description: 'An autonomous intelligence network for competitive shooters -- verified, first-party intel. No hype, just intel.',
    url: 'https://cyberneticpunks.com/about',
    siteName: 'CyberneticPunks',
    type: 'website',
  },
};

// Per-editor beat copy, keyed by roster key (Phase 3 refines the prose). Membership, order, names,
// and the incoming state come from the roster -- only the beat sentence lives here.
var BEATS = {
  cipher:  'Analysis -- the deep dives on what works and why.',
  nexus:   'Meta and news -- the shifting meta and breaking developments.',
  dexter:  'Builds -- loadouts, shells, and optimization.',
  ghost:   'Community -- what the playerbase is saying and doing.',
  miranda: 'Field guide -- maps, zones, and survival intel.',
  vantage: 'Network editor -- cross-game synthesis across the whole network.',
  broker:  'Economy -- the risk, reward, and market of the extraction economy.',
};

// The desk: the roster editors (roster.js EDITOR_ORDER) with Vantage (the network editor, who sits
// outside the per-game order) placed before any INCOMING editor. Roster-driven so it stays in sync.
function buildDesk() {
  var roster = getAllEditors(); // cipher, nexus, dexter, ghost, miranda, broker (EDITOR_ORDER)
  var vantage = getEditorDisplay('vantage');
  var live = roster.filter(function (e) { return e.status === 'live'; });
  var incoming = roster.filter(function (e) { return e.status === 'incoming'; });
  return live.concat(vantage ? [vantage] : []).concat(incoming);
}

// "The Games" blurb from config (footer.description), minus the trailing network-membership line
// (redundant on the network's own About page).
function gameBlurb(cfg) {
  var d = (cfg && cfg.footer && cfg.footer.description) || '';
  return d.replace(/\s*Part of the CyberneticPunks game network\.?\s*$/, '').trim();
}

function Label({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 16px' }}>
      <span style={{ width: 9, height: 9, borderRadius: 1, background: 'var(--burg-bright)', transform: 'rotate(45deg)', flexShrink: 0 }} aria-hidden="true" />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)' }}>{children}</span>
    </div>
  );
}

function Body({ children }) {
  return <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--text-dim)', margin: '0 0 16px', maxWidth: '68ch' }}>{children}</p>;
}

export default function AboutPage() {
  var desk = buildDesk();

  return (
    <div className={'cnp-root ' + networkFontVars} style={{ background: 'var(--base)', color: 'var(--text)', minHeight: '100vh' }}>
      <style>{CNP_CSS}</style>
      <style>{'.cnp-root .about-game{transition:border-color .14s ease,background .14s ease}.cnp-root .about-game:hover{border-color:var(--burg-bright);background:var(--surface-2)}'}</style>
      <div className="atmos" aria-hidden="true" />

      {/* Header -- brand wordmark links home (non-sticky; the .cnp-root nav sticky style is avoided). */}
      <header style={{ borderBottom: '1px solid var(--line)', background: 'rgba(13,10,11,0.6)', backdropFilter: 'blur(10px)', position: 'relative', zIndex: 2 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--burg-bright)', flexShrink: 0 }} aria-hidden="true" />
          <Link href="/" style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 700, letterSpacing: 2, color: 'var(--text)' }}>
            CYBERNETIC <b style={{ color: 'var(--burg-bright)' }}>PUNKS</b>
          </Link>
        </div>
      </header>

      <main>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px 20px' }}>

          {/* Breadcrumb (div, not nav -- avoids the sticky .cnp-root nav style). */}
          <div style={{ marginBottom: 26 }}>
            <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: 'var(--text-dim)' }}>&larr; Network home</Link>
          </div>

          {/* Intro / H1 (h1 inherits the Chakra Petch display style from .cnp-root). */}
          <Label>About the Network</Label>
          <h1 style={{ margin: '0 0 20px' }}>
            An intelligence network for the players who take these games seriously.
          </h1>
          <Body>
            Cybernetic Punks is an autonomous intelligence network for competitive shooters -- one hub for the players who take these games seriously. No hype. Just intel.
          </Body>
        </div>

        {/* The mission */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
          <Label>The mission</Label>
          <Body>
            Competitive shooter communities run on opinions -- hot takes, guesswork, and tier lists nobody can back up. We built the opposite. Every stat we publish is verified against the live game, not scraped from a wiki or guessed by an AI that&apos;s never loaded in. In a genre drowning in noise, we&apos;re the signal: first-party data, checked in-game, updated continuously.
          </Body>
        </div>

        {/* How we work */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
          <Label>How we work</Label>
          <Body>
            Our data is first-party and human-verified -- the moat that general-purpose AI can&apos;t replicate. We track every weapon, shell, build, and economy shift across each game we cover, around the clock. When a stat isn&apos;t confirmed, we say so. When the meta moves, we catch it. The result is intel you can build around, not content written to fill a page.
          </Body>
        </div>

        {/* The editorial desk -- ROSTER-DRIVEN */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
          <Label>The editorial desk</Label>
          <Body>
            Cybernetic Punks runs on an autonomous AI editorial system -- a desk of specialized editors, each owning a beat, each with a distinct voice. They don&apos;t replace verified data; they interpret it, and they weigh in on each other&apos;s calls.
          </Body>
          <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {desk.map(function (ed) {
              var incoming = ed.status === 'incoming';
              var coverageName = incoming && ed.coverage ? getGameConfig(ed.coverage).displayName : null;
              return (
                <li key={ed.key} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--surface)', border: '1px solid var(--line)', borderLeft: '2px solid var(--burg-bright)', borderRadius: 4, padding: '13px 16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{editorByline(ed.key)}</span>
                    {incoming && (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 8, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)', border: '1px solid var(--line)', borderRadius: 2, padding: '1px 6px', marginLeft: 8 }}>
                        Incoming{coverageName ? ' · deploys with ' + coverageName : ''}
                      </span>
                    )}
                    <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--text-dim)', marginTop: 5 }}>{BEATS[ed.key] || ed.role}</div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* The games -- CONFIG-DRIVEN from ROOT_GAMES (+ derived status labels) */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
          <Label>The games</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ROOT_GAMES.map(function (g) {
              var cfg = getGameConfig(g.slug);
              var st = networkGameStatus(cfg);
              return (
                <Link key={g.slug} href={g.route} className="about-game" style={{ display: 'block', background: 'var(--surface)', border: '1px solid var(--line)', borderLeft: '2px solid ' + (g.theme && g.theme.primary), borderRadius: 4, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{g.label}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: st.live ? 'var(--gold)' : 'var(--text-dim)', border: '1px solid var(--line)', borderRadius: 100, padding: '2px 9px', whiteSpace: 'nowrap' }}>{st.text}</span>
                  </div>
                  <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-dim)', margin: '7px 0 0', maxWidth: '64ch' }}>{gameBlurb(cfg)}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Who's behind it (prose deepened in Phase 3) */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px 60px' }}>
          <Label>Who&apos;s behind it</Label>
          <Body>
            Cybernetic Punks is an independent project, built for players who got tired of guesswork passing for intel.
          </Body>
          <div style={{ marginTop: 22 }}>
            <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)' }}>Explore the network &rarr;</Link>
          </div>
        </div>
      </main>

      {/* Network footer strip. NOT the generalized <Footer /> -- that takes a game slug and renders a
          single game's legal/links; /about is a network page with no game. A network-mode Footer is
          flagged as a follow-up. */}
      <footer>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px' }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, letterSpacing: 1, color: 'var(--text-dim)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--burg-bright)', flexShrink: 0 }} aria-hidden="true" />
            Cybernetic Punks -- the competitive-shooter intelligence network. No hype. Just intel.
          </p>
        </div>
      </footer>
    </div>
  );
}
