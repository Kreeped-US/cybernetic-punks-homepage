// components/network/NetworkNav.js
// Shared NETWORK nav for app/(network)/layout.js (/about, /editors, and future
// network pages). Reuses the homepage nav's visual pattern (.nav-in/.brand/
// .nav-right/.nav-links from lib/network/networkTheme.js) but links CROSS-PAGE to
// the network surfaces -- Home, the four games (from ROOT_GAMES, the single source),
// About, Editors -- NOT Marathon's game sections. Renders a bare <nav> and relies
// on an ancestor .cnp-root for styling (nav is position:sticky there, so it
// reserves its own space -- no content padding needed on the pages).
//
// The homepage renders its OWN nav (in-page #anchors), so it does not use this.
import Link from 'next/link';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import AccountMenu from '@/components/AccountMenu';

export default function NetworkNav() {
  return (
    <nav>
      <div className="wrap nav-in">
        <Link href="/" className="brand" style={{ textDecoration: 'none' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cnp-512.png" alt="Cybernetic Punks" width="38" height="38" />
          <span className="wm">CYBERNETIC <b>PUNKS</b></span>
        </Link>
        <div className="nav-right">
          <div className="nav-links">
            <Link href="/">Home</Link>
            {ROOT_GAMES.map(function (g) {
              return <Link key={g.slug} href={g.route}>{g.label}</Link>;
            })}
            <Link href="/about">About</Link>
            <Link href="/editors">Editors</Link>
          </div>
          <AccountMenu align="right" />
        </div>
      </div>
    </nav>
  );
}
