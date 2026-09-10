// components/network/NetworkFooter.js
// Shared NETWORK footer -- a multi-column structure (Identity / Games / Network / Community) with a
// moat-forward positioning line. Used by app/(network)/layout.js (/about, /editors, /methodology)
// AND by the homepage (app/page.js). Because it renders in two CSS contexts, it is SELF-CONTAINED:
// a scoped <style> (.nf-* classes) + the shared .cnp-root design tokens (var(--burg-bright),
// var(--gold), var(--text-dim), var(--line), var(--display)/--mono) -- it depends on no footer
// classes from networkTheme.js / app/page.js, so it styles identically wherever it mounts.
//
// POSITIONING (operator decision, matches the strengthened /about + /methodology voice):
// lead with the MOAT ("human-verified ... sourced, tiered, corrected"), AI acknowledged honestly
// but DEMOTED -- the AI-operated explanation lives at /methodology, reached via "How we verify ->",
// NOT headlined here ("the machines write" was removed). Discipline-first, not AI-first.
//
// Game links are DERIVED from ROOT_GAMES (the registry that drives the homepage routing tiles), so
// every game with a front-door tile (and any future game) appears automatically -- no per-game
// hardcode. The Network + Community links are explicit (they are not games).
import Link from 'next/link';
import { ROOT_GAMES } from '@/lib/network/rootGames';
import { DISCORD_INVITE, DISPLAY_DISCORD } from '@/lib/socialLinks';

const X_URL = 'https://x.com/Cybernetic87250';

export default function NetworkFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="nf">
      <style>{`
        .cnp-root .nf{border-top:1px solid var(--line);padding:56px 0 36px;position:relative;z-index:1}
        .cnp-root .nf-cols{display:grid;grid-template-columns:1.6fr 1fr 1fr 1.2fr;gap:40px 32px}
        .cnp-root .nf-brandrow{display:flex;align-items:center;gap:12px;margin-bottom:16px}
        .cnp-root .nf-brandrow img{width:34px;height:34px;border-radius:8px}
        .cnp-root .nf-wm{font-family:var(--display);font-weight:700;font-size:16px;letter-spacing:.05em;color:var(--text)}
        .cnp-root .nf-wm b{color:var(--burg-bright)}
        .cnp-root .nf-tag{font-size:13.5px;line-height:1.6;color:var(--text-dim);max-width:40ch}
        .cnp-root .nf-tag b{color:var(--text);font-weight:600}
        .cnp-root .nf-h{font-family:var(--mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin:0 0 14px}
        .cnp-root .nf-col{display:flex;flex-direction:column;gap:10px}
        .cnp-root .nf-col a{font-size:13.5px;color:var(--text-dim);text-decoration:none;transition:color .18s;width:fit-content}
        .cnp-root .nf-col a:hover{color:var(--gold)}
        .cnp-root .nf-social{display:flex;align-items:center;gap:9px}
        .cnp-root .nf-social svg{flex-shrink:0}
        .cnp-root .nf-social .nf-sub{display:block;font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;color:var(--text-dim);opacity:.65;margin-top:1px}
        .cnp-root .nf-bottom{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:14px;margin-top:40px;padding-top:22px;border-top:1px solid var(--line)}
        .cnp-root .nf-posit{font-family:var(--mono);font-size:11px;letter-spacing:.06em;line-height:1.7;color:var(--text-dim);max-width:74ch}
        .cnp-root .nf-posit a{color:var(--gold);text-decoration:none;white-space:nowrap}
        .cnp-root .nf-posit a:hover{text-decoration:underline}
        .cnp-root .nf-copy{font-family:var(--mono);font-size:10.5px;letter-spacing:.1em;color:var(--text-dim);opacity:.7;white-space:nowrap}
        @media(max-width:820px){
          .cnp-root .nf-cols{grid-template-columns:1fr 1fr;gap:32px 24px}
          .cnp-root .nf-ident{grid-column:1 / -1}
          .cnp-root .nf-bottom{flex-direction:column;align-items:flex-start}
        }
      `}</style>
      <div className="wrap">
        <div className="nf-cols">

          {/* IDENTITY -- leads with the moat, not AI */}
          <div className="nf-ident">
            <div className="nf-brandrow">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/cnp-512.png" alt="Cybernetic Punks" width="34" height="34" />
              <span className="nf-wm">CYBERNETIC <b>PUNKS</b></span>
            </div>
            <p className="nf-tag">
              <b>Human-verified FPS intelligence.</b> Every stat checked in the game itself &mdash; sourced, tiered by confidence, and never scraped.
            </p>
          </div>

          {/* GAMES -- derived from ROOT_GAMES */}
          <div>
            <h2 className="nf-h">Games</h2>
            <div className="nf-col">
              {ROOT_GAMES.map(function (g) {
                return <Link key={g.slug} href={g.route}>{g.label}</Link>;
              })}
            </div>
          </div>

          {/* NETWORK */}
          <div>
            <h2 className="nf-h">Network</h2>
            <div className="nf-col">
              <Link href="/about">About</Link>
              <Link href="/editors">Editors</Link>
              <Link href="/methodology">Methodology</Link>
            </div>
          </div>

          {/* COMMUNITY */}
          <div>
            <h2 className="nf-h">Community</h2>
            <div className="nf-col">
              <a href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" className="nf-social">
                <svg width="15" height="12" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M11.854 0.927C10.956 0.505 9.994 0.198 8.99 0.022C8.861 0.256 8.711 0.57 8.607 0.819C7.534 0.655 6.47 0.655 5.414 0.819C5.31 0.57 5.157 0.256 5.027 0.022C4.022 0.198 3.059 0.506 2.161 0.929C0.311 3.641 -0.19 6.285 0.06 8.893C1.27 9.789 2.442 10.336 3.595 10.696C3.887 10.3 4.147 9.879 4.371 9.436C3.947 9.276 3.541 9.078 3.158 8.845C3.261 8.769 3.362 8.69 3.461 8.609C5.742 9.672 8.266 9.672 10.52 8.609C10.62 8.691 10.721 8.77 10.823 8.845C10.439 9.079 10.031 9.278 9.606 9.437C9.83 9.879 10.089 10.302 10.382 10.697C11.536 10.337 12.709 9.79 13.919 8.893C14.213 5.87 13.419 3.25 11.854 0.927ZM4.676 7.279C3.983 7.279 3.413 6.639 3.413 5.854C3.413 5.069 3.971 4.428 4.676 4.428C5.381 4.428 5.952 5.068 5.939 5.854C5.94 6.639 5.38 7.279 4.676 7.279ZM9.297 7.279C8.604 7.279 8.034 6.639 8.034 5.854C8.034 5.069 8.592 4.428 9.297 4.428C10.002 4.428 10.573 5.068 10.56 5.854C10.56 6.639 10.001 7.279 9.297 7.279Z" fill="currentColor"/>
                </svg>
                <span>Discord<span className="nf-sub">{DISPLAY_DISCORD}</span></span>
              </a>
              <a href={X_URL} target="_blank" rel="noopener noreferrer" className="nf-social">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span>X / Twitter<span className="nf-sub">@Cybernetic87250</span></span>
              </a>
            </div>
          </div>

        </div>

        {/* BOTTOM BAR -- moat-forward positioning; AI acknowledged honestly but demoted to the link */}
        <div className="nf-bottom">
          <p className="nf-posit">
            Sourced against primary records, tiered by confidence, and corrected when the source changes. When we are not sure, we leave it blank. <Link href="/methodology">How we verify &rarr;</Link>
          </p>
          <span className="nf-copy">&copy; {year} Cybernetic Punks</span>
        </div>
      </div>
    </footer>
  );
}
