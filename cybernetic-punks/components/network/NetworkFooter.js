// components/network/NetworkFooter.js
// Shared NETWORK footer -- extracted verbatim from the homepage <footer> (app/page.js)
// so the homepage renders byte-identically after importing it (the ONE intentional
// delta is the added Editors link). Also used by app/(network)/layout.js to give
// /about + /editors the same footer. Renders a bare <footer> and relies on an
// ancestor .cnp-root for its styling (.foot-in/.foot-brand/.wm/.whisper/.foot-links
// from lib/network/networkTheme.js) -- no stats bar (network pages have no
// game-specific live stats; see the Option C report).
import Link from 'next/link';
// Game links are DERIVED from ROOT_GAMES (the same registry that drives the homepage
// routing tiles), not hardcoded -- so every game with a front-door tile (Marathon, DMZ,
// Wardogs, PUBG: DED.NET, Bodycam, and any future game) appears in the footer automatically.
// This kills the recurring per-game-footer hardcode gap (the same class as the isNetworkChrome
// /methodology + /bodycam-comment gaps). The /about + /editors links below are network content
// pages (not games), so they stay explicit.
import { ROOT_GAMES } from '@/lib/network/rootGames';

export default function NetworkFooter() {
  return (
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
          {ROOT_GAMES.map(function (g) {
            return <Link key={g.slug} href={g.route}>{g.label}</Link>;
          })}
          <Link href="/about">About</Link>
          <Link href="/editors">Editors</Link>
        </div>
      </div>
    </footer>
  );
}
