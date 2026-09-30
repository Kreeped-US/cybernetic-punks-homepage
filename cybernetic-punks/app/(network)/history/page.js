// app/(network)/history/page.js
// "Since 2009" -- the history of Cybernetic Punks. Server component, crawlable (SEO goal).
//
// Lives in the app/(network) route group, so app/(network)/layout.js provides the shared
// NetworkNav + NetworkFooter inside the .cnp-root network identity (same chrome as /about and
// /methodology). This page renders ONLY its <main> content; the global Marathon Nav + LivePulseStrip
// are suppressed here via isNetworkChrome(). Styling mirrors /about (Label/Body, maxWidth 860, CNP
// tokens) so the two network pages read as one system.
//
// STRUCTURED DATA (page-level ONLY, no sitewide change): a single Organization node enriched with
// foundingDate 2009-05 + founder (the /about#justin Person via @id). Built from PUBLISHER_ORG
// (lib/authorEntity.js) so the identity stays single-sourced; the two history fields are added HERE
// only, so PUBLISHER_ORG and every other page's schema are untouched.
//
// COPY is operator-supplied and rendered VERBATIM (archive quotes keep original spelling/punctuation).
// Body/quote text lives in JS string constants (rendered via {}) so apostrophes/pipes stay exact
// without JSX-entity churn. Wayback capture provenance: the operator's OWN prior site, via the
// Wayback Machine snapshots linked throughout.

import Link from 'next/link';
import { PUBLISHER_ORG, AUTHOR_URL } from '@/lib/authorEntity';
import { withOgImages } from '@/lib/seo/ogImage';
import { safeJsonLd } from '@/lib/security/safeJsonLd';

// Wayback Machine snapshots (operator-supplied). Each is a capture of CyberneticPunks.com itself.
const WAYBACK = {
  '2009': { url: 'https://web.archive.org/web/20090522231250/http://www.cyberneticpunks.com/', captured: 'May 22, 2009' },
  '2010': { url: 'https://web.archive.org/web/20101027010528/http://cyberneticpunks.com/', captured: 'October 27, 2010' },
  '2011': { url: 'https://web.archive.org/web/20110131085940/http://cyberneticpunks.com/', captured: 'January 31, 2011' },
  '2012': { url: 'https://web.archive.org/web/20121025154548/http://cyberneticpunks.com/', captured: 'October 25, 2012' },
};

// Page-level Organization: PUBLISHER_ORG identity + the two history fields. founder references the
// canonical Person node (@id = /about#justin) rather than re-declaring it.
const ORG_LD = Object.assign(
  { '@context': 'https://schema.org' },
  PUBLISHER_ORG,
  { foundingDate: '2009-05', founder: { '@id': AUTHOR_URL } }
);

export const metadata = withOgImages({
  title: 'Since 2009: the history of Cybernetic Punks',
  description: 'CyberneticPunks.com has been online since May 2009, first as the Cybernetic Punks Hardcore Gaming Community, now as a verified competitive-FPS intel network.',
  alternates: { canonical: 'https://cyberneticpunks.com/history' },
  openGraph: {
    title: 'Since 2009: the history of Cybernetic Punks | Cybernetic Punks',
    description: 'Online since May 2009 -- first a hardcore gaming community, now a verified competitive-FPS intel network.',
    url: 'https://cyberneticpunks.com/history',
    siteName: 'Cybernetic Punks',
    type: 'website',
  },
});

// ── Copy (verbatim) ────────────────────────────────────────────────────────────────────────────
const INTRO = "CyberneticPunks.com didn't start as an intel site. It has been online since May 2009, when it was the home of the Cybernetic Punks Hardcore Gaming Community (CNP): a group of players who moved from game to game together, forming clans wherever we landed.";

const TIMELINE = [
  { date: 'May 2009', text: 'CyberneticPunks.com is online as the Cybernetic Punks Hardcore Gaming Community.', link: '2009' },
  { date: '2010', text: 'The StarCraft II era: strategy guides, forums and a community wiki.', link: '2010' },
  { date: '2011', text: "World of Warcraft raiding Horde-side on Mal'Ganis, plus TERA, Firefall and community game nights.", link: '2011' },
  { date: '2012', text: 'The PlanetSide 2 "reawakening" and the Cybernetic Punks DayZ server.', link: '2012' },
  { date: '2013-2025', text: 'The community went on hiatus. The domain stayed with Justin.', link: null },
  { date: 'February 2026', text: 'Relaunched as a verified competitive-FPS intel network, starting with Marathon. Today it covers Marathon, Wardogs, DMZ and PUBG: DED.NET.', link: null },
];

const PARAGRAPH = "Over the years CNP played Global Agenda, StarCraft II, World of Warcraft, TERA, Firefall, APB, Left 4 Dead 2, Star Wars: The Old Republic, Team Fortress 2, DayZ and PlanetSide 2, among others. The site ran forums, articles, strategy guides, a community wiki, a voice server and a podcast. Some of those old guides are still linked from gaming forums today.";

const ARCHIVE = [
  { quote: "Cybernetic Punks downs Halfus as Atlas Forever on Mal'Ganis, Horde. After two weeks of bad compositions (i.e. slate, storm AND haste buff) we got him down this week. Good job everyone!", line: 'Post dated 05.02.11, captured Jan 31, 2011.', link: '2011' },
  { quote: 'Everyday we are closer to that one game we want. Here is the list!', line: '"Games of 2011", captured Jan 31, 2011.', link: '2011' },
  { quote: 'be a part of the reawakening - CNP + PlanetSide 2 - now recruiting for members and leadership', line: 'Homepage banner, captured Oct 25, 2012.', link: '2012' },
  { quote: 'Your survival guide to DayZ - If you play the game with the other guides on the internet, you will probably rage-quit after your...', line: 'Captured Oct 25, 2012.', link: '2012' },
  { quote: 'Cybernetic Punks DayZ Server | Launches 7/16/2012', line: 'Captured Oct 25, 2012.', link: '2012' },
];

const SHOTS = [
  { src: '/images/history/cnp-2011.webp', w: 1092, h: 839, caption: 'CyberneticPunks.com, captured January 31, 2011 (Wayback Machine)', link: '2011' },
  { src: '/images/history/cnp-2012.webp', w: 1141, h: 833, caption: 'CyberneticPunks.com, captured October 25, 2012 (Wayback Machine)', link: '2012' },
];

const CLOSING = "The name is the same, and so is the person behind it. CyberneticPunks is still run by Justin (@Kreeped). What changed is the mission: instead of organizing clans, we verify the stats and systems of today's competitive shooters, in game and against primary sources, so players get intel they can trust.";
// Split around the @Kreeped handle so it renders as an inline link to Justin's PERSONAL X (@Kreeped) --
// NOT the company account @Cybernetic87250 (that belongs on the footer/publisher org, see authorEntity.js).
// rel="me" declares the identity relationship (this handle = the site's operator).
const CLOSING_PARTS = CLOSING.split('@Kreeped');

// ── Shared bits (mirrors /about) ─────────────────────────────────────────────────────────────────
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

const waybackLinkStyle = { fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: 'var(--gold)', textDecoration: 'none', whiteSpace: 'nowrap' };

export default function HistoryPage() {
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(ORG_LD) }} />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px 20px' }}>
        {/* Breadcrumb (div, not nav -- avoids the sticky .cnp-root nav style). */}
        <div style={{ marginBottom: 26 }}>
          <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: 'var(--text-dim)' }}>&larr; Network home</Link>
        </div>

        <Label>Since 2009</Label>
        <h1 style={{ margin: '0 0 20px' }}>Since 2009: the history of Cybernetic Punks</h1>
        <Body>{INTRO}</Body>
      </div>

      {/* Timeline */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
        <Label>Timeline</Label>
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {TIMELINE.map(function (t) {
            var wb = t.link ? WAYBACK[t.link] : null;
            return (
              <li key={t.date} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--surface)', border: '1px solid var(--line)', borderLeft: '2px solid var(--burg-bright)', borderRadius: 4, padding: '13px 16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{t.date}</span>
                  <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--text-dim)', marginTop: 5 }}>
                    {t.text}
                    {wb ? (
                      <>
                        {' '}
                        <a href={wb.url} target="_blank" rel="noopener noreferrer nofollow" style={waybackLinkStyle}>View on the Wayback Machine &rarr;</a>
                      </>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* What we played / ran */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
        <Body>{PARAGRAPH}</Body>
      </div>

      {/* From the archive */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
        <Label>From the archive</Label>
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {ARCHIVE.map(function (a, i) {
            var wb = WAYBACK[a.link];
            return (
              <li key={i} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderLeft: '2px solid var(--burg-bright)', borderRadius: 4, padding: '14px 16px' }}>
                <blockquote style={{ margin: 0, fontSize: 15, lineHeight: 1.65, color: 'var(--text)', fontStyle: 'italic' }}>&ldquo;{a.quote}&rdquo;</blockquote>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 0.3 }}>{a.line}</span>
                  <a href={wb.url} target="_blank" rel="noopener noreferrer nofollow" style={waybackLinkStyle}>View on the Wayback Machine &rarr;</a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Screenshots */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
        <Label>Screenshots</Label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {SHOTS.map(function (s) {
            var wb = WAYBACK[s.link];
            return (
              <figure key={s.src} style={{ margin: 0 }}>
                <a href={wb.url} target="_blank" rel="noopener noreferrer nofollow" style={{ display: 'block' }}>
                  <img
                    src={s.src}
                    width={s.w}
                    height={s.h}
                    alt={s.caption}
                    loading="lazy"
                    decoding="async"
                    style={{ display: 'block', width: '100%', height: 'auto', border: '1px solid var(--line)', borderRadius: 6, background: 'var(--surface)' }}
                  />
                </a>
                <figcaption style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)', letterSpacing: 0.3, marginTop: 8 }}>{s.caption}</figcaption>
              </figure>
            );
          })}
        </div>
      </div>

      {/* Closing */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px' }}>
        <Label>Where it stands now</Label>
        <Body>
          {CLOSING_PARTS[0]}
          <a href="https://x.com/Kreeped" target="_blank" rel="me noopener noreferrer" style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'underline' }}>@Kreeped</a>
          {CLOSING_PARTS[1]}
        </Body>
        <div style={{ marginTop: 4 }}>
          <Link href="/about" style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)' }}>About the network &rarr;</Link>
        </div>
      </div>

      {/* Sources */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '30px 24px 60px' }}>
        <Label>Sources</Label>
        <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {['2009', '2010', '2011', '2012'].map(function (y) {
            var wb = WAYBACK[y];
            return (
              <li key={y} style={{ fontSize: 13.5, color: 'var(--text-dim)' }}>
                <a href={wb.url} target="_blank" rel="noopener noreferrer nofollow" style={{ color: 'var(--gold)', textDecoration: 'underline', wordBreak: 'break-all' }}>{wb.url}</a>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, marginLeft: 8, whiteSpace: 'nowrap' }}>(captured {wb.captured})</span>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
