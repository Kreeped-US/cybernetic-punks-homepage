// app/(network)/about/page.js
// "About the Network" page. Server component, crawlable (SEO goal).
//
// PHASE 2 (About rebuild): reskinned to the shared NETWORK v7 identity (burgundy/black/gold,
// Chakra Petch) via lib/network/networkTheme.js (CNP_CSS) + lib/network/networkFonts.js
// (networkFontVars) - the same source the homepage uses. The staleness-prone parts are now
// CONFIG-DRIVEN: "The Games" maps ROOT_GAMES (all 4, auto-current) with status labels DERIVED from
// each game's status/launch_date (lib/network/gameStatus.js - auto-flips, no "at launch" time-
// bomb); the editorial desk is ROSTER-DRIVEN from lib/editors/roster.js (Broker's incoming state is
// derived from roster status, not hardcoded). The prose (mission / how-we-work / who's-behind-it)
// is intentionally LEFT AS-IS here (minus stale game-list bits config now drives) - the rewrite is
// Phase 3.
//
// HONESTY: the editorial desk is framed as an AUTONOMOUS AI editorial system, never human
// journalists. Editor names come from the locked roster via editorByline().
//
// CHROME: /about lives in the app/(network) route group; app/(network)/layout.js provides the
// shared NetworkNav + NetworkFooter inside the .cnp-root network identity. This page renders ONLY
// its <main> content - no header/footer/theme shell of its own (the layout owns them), and the
// global Marathon Nav + LivePulseStrip are suppressed here via isNetworkChrome().

import Link from 'next/link';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import { getGameConfig } from '@/lib/games';
import { getAllEditors, getEditorDisplay, editorByline } from '@/lib/editors/roster';
import { networkGameStatus } from '@/lib/network/gameStatus';

export const metadata = {
  title: 'About the Network',
  description: 'Cybernetic Punks is an autonomous FPS intelligence network - verified, first-party intel across every game we cover. No hype, just intel.',
  alternates: { canonical: 'https://cyberneticpunks.com/about' },
  openGraph: {
    title: 'About the Network | Cybernetic Punks',
    description: 'An autonomous FPS intelligence network - verified, first-party intel. No hype, just intel.',
    url: 'https://cyberneticpunks.com/about',
    siteName: 'Cybernetic Punks',
    type: 'website',
  },
};

// Per-editor beat copy, keyed by roster key (Phase 3 refines the prose). Membership, order, names,
// and the incoming state come from the roster - only the beat sentence lives here.
var BEATS = {
  cipher:  'Analysis - the deep dives on what works and why.',
  nexus:   'Meta and news - the shifting meta and breaking developments.',
  dexter:  'Builds - loadouts, shells, and optimization.',
  ghost:   'Community - what the playerbase is saying and doing.',
  miranda: 'Field guide - maps, zones, and survival intel.',
  vantage: 'Network editor - cross-game synthesis across the whole network.',
  broker:  'Economy - the risk, reward, and market of the extraction economy.',
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
  return d.replace(/\s*Part of the Cybernetic Punks game network\.?\s*$/, '').trim();
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
    <>
      <style>{'.cnp-root .about-game{transition:border-color .14s ease,background .14s ease}.cnp-root .about-game:hover{border-color:var(--burg-bright);background:var(--surface-2)}'}</style>

      <main>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px 20px' }}>

          {/* Breadcrumb (div, not nav - avoids the sticky .cnp-root nav style). */}
          <div style={{ marginBottom: 26 }}>
            <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: 'var(--text-dim)' }}>&larr; Network home</Link>
          </div>

          {/* Intro / H1 (h1 inherits the Chakra Petch display style from .cnp-root). */}
          <Label>About the Network</Label>
          <h1 style={{ margin: '0 0 16px' }}>
            An intelligence network for the players who take these games seriously.
          </h1>
          {/* Positioning statement (lede) - /about-only; NOT the shared NetworkFooter whisper. */}
          <p style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, lineHeight: 1.4, letterSpacing: '.01em', color: 'var(--gold)', margin: '0 0 22px' }}>
            Verified intel for FPS players.
          </p>
          <Body>
            Cybernetic Punks is an autonomous FPS intelligence network - one hub for the players who take these games seriously. No hype. Just intel.
          </Body>
        </div>

        {/* The mission */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
          <Label>The mission</Label>
          <Body>
            Competitive shooter communities run on opinions - hot takes, guesswork, and tier lists nobody can back up. Worse, a wave of AI-generated sites now scrapes wikis, mangles the numbers, and publishes broken data as fact. We built the opposite. Every stat we publish is verified against the live game, not scraped, not guessed, not hallucinated by a model that never loaded in. When a number isn&apos;t confirmed, we say so - out loud, on the page. In a genre drowning in noise, we&apos;re the signal: first-party data, checked in-game, updated continuously.
          </Body>
        </div>

        {/* How we work */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
          <Label>How we work</Label>
          <Body>
            Our data is first-party and human-verified - the moat that scraped, general-purpose AI can&apos;t replicate. We track every weapon, shell, and build across each game we cover, around the clock. Tier lists are ranked by a transparent stat model you can inspect - tap any weapon and see the exact numbers and weights behind its placement, including what we can&apos;t measure and won&apos;t fake. Primary sources are cited; unconfirmed details stay flagged until they&apos;re verified in-game. The result is intel you can build around, not content written to fill a page.
          </Body>
        </div>

        {/* The editorial desk - ROSTER-DRIVEN */}
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
          <Label>The editorial desk</Label>
          <Body>
            Cybernetic Punks runs on an autonomous AI editorial system - a desk of specialized editors, each owning a beat, each with a distinct voice. They don&apos;t replace verified data; they interpret it, and they weigh in on each other&apos;s calls.
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

        {/* The games - CONFIG-DRIVEN from ROOT_GAMES (+ derived status labels) */}
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
            One person builds this. I&apos;ve been gaming since the Commodore 64 - RTS, FPS, MMOs, decades of it - and I got tired of watching AI content farms flood the games I love with fake tier lists and broken scraped data. So I built the site I wanted to exist: real numbers, checked in the actual game, no hype. I don&apos;t put my name on it - I put the receipts on it. If you want to know who&apos;s behind the data, I&apos;m <a href="https://x.com/Kreeped" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'underline' }}>Kreeped</a>.
          </Body>
          <div style={{ marginTop: 22 }}>
            <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)' }}>Explore the network &rarr;</Link>
          </div>
        </div>
      </main>
    </>
  );
}
