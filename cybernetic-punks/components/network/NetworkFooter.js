// components/network/NetworkFooter.js
// Shared NETWORK footer -- extracted verbatim from the homepage <footer> (app/page.js)
// so the homepage renders byte-identically after importing it (the ONE intentional
// delta is the added Editors link). Also used by app/(network)/layout.js to give
// /about + /editors the same footer. Renders a bare <footer> and relies on an
// ancestor .cnp-root for its styling (.foot-in/.foot-brand/.wm/.whisper/.foot-links
// from lib/network/networkTheme.js) -- no stats bar (network pages have no
// game-specific live stats; see the Option C report).
import Link from 'next/link';

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
          <Link href="/marathon">Marathon</Link>
          <Link href="/dmz">DMZ</Link>
          <Link href="/wardogs">Wardogs</Link>
          <Link href="/pubg-dednet">PUBG: DED.NET</Link>
          <Link href="/about">About</Link>
          <Link href="/editors">Editors</Link>
        </div>
      </div>
    </footer>
  );
}
