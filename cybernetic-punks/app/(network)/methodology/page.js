// app/(network)/methodology/page.js
// "Methodology" -- the network-level trust + legibility page. Restyled 2026-09-30 after the
// provenance mockup (docs/docsdesignprovenance-mockup.html): HUD-grid background, animated confidence
// badges (glow/breathe + shimmer sweep), example "receipt" cards, section headers with a fading rule.
// VISUAL treatment only is borrowed from the mockup; the TIER SYSTEM is the LIVE one
// (components/network/confidenceTiers.js) and the example cards are REAL rows fetched at request time.
//
// LIVE-DATA CARDS: three real provenance receipts (Marathon unique, Wardogs weapon, DMZ location) are
// read at request time via the SERVICE-KEY server client -- the SAME read path the wardogs arsenal +
// DMZ entity pages use (createClient(url, SERVICE_KEY || ANON_KEY)). This is required because
// wardogs_ballistics is NOT anon-readable (RLS), so the anon client silently drops the Wardogs card;
// the service key is used server-side only (this is a server component -- it never reaches the client).
// A row that is missing or no longer qualifies (not verified / no source) HIDES its card -- never stale
// text. force-dynamic so the cards are always current.
//
// CHROME: app/(network)/layout.js provides NetworkNav + NetworkFooter inside .cnp-root; this page
// renders only its <main>. All animation CSS is scoped under .cnp-root, so the global
// prefers-reduced-motion kill-switch (networkTheme.js) disables it for reduced-motion users; the badge
// animations are ALSO wrapped in @media (prefers-reduced-motion: no-preference) as defense-in-depth.

import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { CONFIDENCE_TIERS, TierIcon } from '@/components/network/confidenceTiers';
import { withOgImages } from '@/lib/seo/ogImage';

export const dynamic = 'force-dynamic';

// Server-side read client. Prefers the service key (some stat tables -- e.g. wardogs_ballistics -- are
// not anon-readable), falling back to anon; identical to the wardogs arsenal + DMZ entity read path.
// Server component only, so the key is never bundled to the client.
function serverDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export const metadata = withOgImages({
  title: 'Methodology - How We Verify FPS Data',
  description: 'How Cybernetic Punks sources and verifies its FPS intel - primary sources, confidence tiers, and honest-null over guesses - plus how to read our tier lists, rankings, and builds.',
  alternates: { canonical: 'https://cyberneticpunks.com/methodology' },
  openGraph: {
    title: 'Methodology - How We Verify FPS Data | Cybernetic Punks',
    description: 'How we source and verify FPS intel, and how to read our tier lists, confidence badges, and builds. Primary sources, confidence tiers, honest-null.',
    url: 'https://cyberneticpunks.com/methodology',
    siteName: 'Cybernetic Punks',
    type: 'website',
  },
});

// tier key -> the live CONFIDENCE_TIERS entry (color/label/caption/icon).
function tier(key) { return CONFIDENCE_TIERS.find(function (t) { return t.key === key; }) || null; }

// Appended to the Verified legend line on THIS page only, and only while a Part 1 card is shown.
var VERIFIED_PRERELEASE_ADDENDUM = ' It also covers a fact named in an official pre-release source, which is labelled pre-release on its page.';

// LIVE example receipts. Each returns a card object or null (missing/unqualified -> card hidden).
// Read-only, fail-open: any thrown/empty query drops that card, never a stale claim.
async function getReceiptCards() {
  var cards = [];
  var sb = serverDb();
  // Marathon unique -- BR33 Victory Lap (unique_weapons). VERIFIED.
  try {
    var mu = (await sb.from('unique_weapons')
      .select('name, base_weapon, weapon_type, verified, verified_source')
      .eq('game_slug', 'marathon').eq('slug', 'br33-victory-lap').maybeSingle()).data;
    if (mu && mu.verified === true && mu.verified_source && mu.name) {
      cards.push({
        game: 'Marathon', type: 'Unique Weapon', tierKey: 'verified', name: mu.name,
        claim: mu.name + (mu.base_weapon ? ' - a ' + (mu.weapon_type || 'weapon').toLowerCase() + ' built on the ' + mu.base_weapon : ''),
        source: mu.verified_source, href: '/marathon/uniques/br33-victory-lap', linkLabel: 'Inspect the ' + mu.name + ' page',
      });
    }
  } catch (e) {}
  // Wardogs weapon -- A-91 head-shot ballistics (wardogs_ballistics). REPORTED (community-attributed).
  try {
    var wb = (await sb.from('wardogs_ballistics')
      .select('weapon_name, body_part, ammo_type, armor_tier, damage, shots_to_kill, confidence_tier, verified_source')
      .eq('game_slug', 'wardogs').eq('weapon_name', 'A-91').eq('body_part', 'HEAD').eq('ammo_type', 'FMJ').eq('armor_tier', 0).maybeSingle()).data;
    if (wb && wb.verified_source && wb.damage != null) {
      var wtk = tier(wb.confidence_tier) ? wb.confidence_tier : 'attributed';
      cards.push({
        game: 'Wardogs', type: 'Weapon', tierKey: wtk, name: wb.weapon_name,
        claim: wb.weapon_name + ' - ' + wb.damage + ' damage to the head (FMJ)' + (wb.shots_to_kill != null ? ', ' + wb.shots_to_kill + ' shots to kill unarmored' : ''),
        source: wb.verified_source, href: '/wardogs/arsenal/a-91', linkLabel: 'Inspect the ' + wb.weapon_name + ' page',
      });
    }
  } catch (e) {}
  // DMZ location -- the prison (dmz_pois). VERIFIED (Call of Duty blog). Its slug moves from 'prison' to
  // '14th-political-prison' (POI_LEGACY_REDIRECTS); read whichever row exists (the new one wins) and
  // link to that row's own slug, so the card never points at a redirect or a missing row.
  try {
    var dpRows = (await sb.from('dmz_pois')
      .select('slug, name, verified, verified_source')
      .eq('game_slug', 'dmz').in('slug', ['14th-political-prison', 'prison'])).data || [];
    var dp = dpRows.find(function (r) { return r.slug === '14th-political-prison'; }) || dpRows.find(function (r) { return r.slug === 'prison'; }) || null;
    if (dp && dp.verified === true && dp.verified_source && dp.name) {
      cards.push({
        // part1: this card is backed by a Deep Dive Part 1 row (pre-release source); drives the
        // methodology-only Verified legend addendum below.
        part1: dp.slug === '14th-political-prison',
        game: 'DMZ', type: 'Location', tierKey: 'verified', name: dp.name,
        // The renamed row is sourced to Deep Dive Part 1; the old 'prison' row (June blog) keeps its line.
        claim: dp.slug === '14th-political-prison'
          ? dp.name + ' - named in the official DMZ Deep Dive Part 1 (pre-release)'
          : dp.name + ' - a confirmed Hajin Exclusion Zone location',
        source: dp.verified_source, href: '/dmz/pois/' + dp.slug, linkLabel: 'Inspect the ' + dp.name + ' page',
      });
    }
  } catch (e) {}
  return cards;
}

// ── scoped CSS (all under .cnp-root, so the global reduced-motion kill-switch applies) ──────────────
const METH_CSS =
  '.cnp-root .m-page{position:relative}' +
  // faint HUD grid, masked to fade out -- fixed so it sits behind the whole page
  '.cnp-root .m-page::before{content:"";position:fixed;inset:0;z-index:0;pointer-events:none;' +
  'background-image:linear-gradient(rgba(180,140,150,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(180,140,150,.05) 1px,transparent 1px);' +
  'background-size:44px 44px;-webkit-mask-image:radial-gradient(circle at 50% 24%,#000,transparent 78%);mask-image:radial-gradient(circle at 50% 24%,#000,transparent 78%)}' +
  '.cnp-root .m-page > *{position:relative;z-index:1}' +
  // section header with a fading rule
  '.cnp-root .m-h2{display:flex;align-items:center;gap:14px;margin:44px 0 18px;font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:var(--gold)}' +
  '.cnp-root .m-h2::after{content:"";flex:1;height:1px;background:linear-gradient(90deg,var(--line),transparent)}' +
  // badge (glow + shimmer). --c is set inline per tier.
  '.cnp-root .m-badge{position:relative;display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:8px;isolation:isolate;overflow:hidden;' +
  'font-family:var(--mono);font-weight:700;font-size:12px;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;line-height:1.1}' +
  '.cnp-root .m-badge .m-cap{font-family:var(--body,inherit);text-transform:none;letter-spacing:0;font-weight:500;font-size:11.5px;opacity:.88;border-left:1px solid currentColor;padding-left:8px;margin-left:1px}' +
  // In a receipt card the badge may sit in a narrow column: let it wrap the caption to a second line
  // (grows taller) instead of clipping. Legend + inline badges keep nowrap (they have room).
  '.cnp-root .m-card .m-badge{white-space:normal;align-self:flex-start}' +
  '.cnp-root .m-badge::after{content:"";position:absolute;inset:-1px;border-radius:inherit;z-index:-1;box-shadow:0 0 18px -3px var(--c);opacity:.45}' +
  '.cnp-root .m-badge::before{content:"";position:absolute;top:0;bottom:0;width:42%;left:-60%;z-index:1;pointer-events:none;opacity:.22;' +
  'background:linear-gradient(100deg,transparent,var(--c),transparent)}' +
  '@media (prefers-reduced-motion: no-preference){' +
  '.cnp-root .m-badge::after{animation:mBreathe 3.6s ease-in-out infinite}' +
  '.cnp-root .m-badge::before{animation:mSweep 5s ease-in-out infinite}}' +
  '@keyframes mBreathe{0%,100%{opacity:.3}50%{opacity:.66}}' +
  '@keyframes mSweep{0%,66%{transform:translateX(0)}100%{transform:translateX(380%)}}' +
  // receipt cards
  '.cnp-root .m-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(258px,1fr));gap:16px;margin:0 0 8px}' +
  '.cnp-root .m-card{display:flex;flex-direction:column;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:14px;padding:18px}' +
  '.cnp-root .m-vert{font-family:var(--mono);font-size:10px;letter-spacing:2.4px;text-transform:uppercase;color:var(--text-dim)}' +
  '.cnp-root .m-card h3{font-family:var(--display);font-weight:700;font-size:19px;line-height:1.15;margin:0;color:var(--text)}' +
  '.cnp-root .m-rule{height:1px;background:var(--line);margin:2px 0}' +
  '.cnp-root .m-claim{margin:0;font-size:14px;line-height:1.55;color:var(--text)}' +
  '.cnp-root .m-src{margin:0;font-family:var(--mono);font-size:10.5px;line-height:1.65;color:var(--text-dim);letter-spacing:.02em;word-break:break-word}' +
  '.cnp-root .m-src b{color:var(--gold);font-weight:700;letter-spacing:1px}' +
  '.cnp-root .m-link{margin-top:auto;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--gold);text-decoration:none}' +
  '.cnp-root .m-link:hover{text-decoration:underline}' +
  // legend rows
  '.cnp-root .m-legend{display:grid;gap:12px;margin:0 0 8px}' +
  '.cnp-root .m-row{display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:start;padding:16px 16px 16px 20px;background:var(--surface);border:1px solid var(--line);border-radius:12px;position:relative;overflow:hidden}' +
  '.cnp-root .m-row::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:3px;border-radius:3px;background:var(--c)}' +
  '.cnp-root .m-row .m-mean strong{display:block;font-family:var(--display);font-weight:600;font-size:14.5px;margin-bottom:3px;color:var(--text)}' +
  '.cnp-root .m-row .m-mean p{margin:0;color:var(--text-dim);font-size:13.5px;line-height:1.6}' +
  '.cnp-root .m-axis{margin:12px 0 0;font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:.02em}' +
  '@media(max-width:560px){.cnp-root .m-row{grid-template-columns:1fr;gap:12px}}';

function Body({ children }) {
  return <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--text-dim)', margin: '0 0 16px', maxWidth: '68ch' }}>{children}</p>;
}
function Badge({ tierKey, withCaption }) {
  var t = tier(tierKey);
  if (!t) return null;
  return (
    <span className="m-badge" style={{ '--c': t.color, color: t.color, background: t.color + '14', border: '1px solid ' + t.color + '55' }}>
      <TierIcon tier={tierKey} size={15} />
      <span>{t.label}</span>
      {withCaption && <span className="m-cap">{t.caption}</span>}
    </span>
  );
}

export default async function MethodologyPage() {
  var cards = await getReceiptCards();
  var part1Live = cards.some(function (c) { return c.part1 === true; });

  return (
    <main>
      <style>{METH_CSS}</style>
      <div className="m-page" style={{ maxWidth: 900, margin: '0 auto', padding: '56px 24px 64px' }}>

        <div style={{ marginBottom: 26 }}>
          <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: 'var(--text-dim)' }}>&larr; Network home</Link>
        </div>

        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>CyberneticPunks - How we verify</div>
        <h1 style={{ margin: '0 0 18px' }}>Every stat carries <span style={{ color: 'var(--gold)' }}>its receipt.</span></h1>
        <p style={{ fontSize: 17.5, lineHeight: 1.6, color: 'var(--text-dim)', maxWidth: '62ch', margin: '0 0 8px' }}>
          Every weapon, core, shell and location we track carries its source and how sure we are. Confirmed reads strongest. Reported reads weaker. Where we don&apos;t know, we leave it blank. And when it&apos;s our judgment rather than fact, we label it Our Read.
        </p>

        {/* ===================== LIVE RECEIPT CARDS ===================== */}
        {cards.length > 0 && (
          <>
            <div className="m-h2">Real receipts, pulled live</div>
            <div className="m-cards">
              {cards.map(function (c) {
                return (
                  <article className="m-card" key={c.href}>
                    <span className="m-vert">{c.game} &middot; {c.type}</span>
                    <h3>{c.name}</h3>
                    <Badge tierKey={c.tierKey} withCaption />
                    <div className="m-rule" />
                    <p className="m-claim">{c.claim}</p>
                    <p className="m-src"><b>SOURCE</b> &nbsp;{c.source}</p>
                    <Link href={c.href} className="m-link">{c.linkLabel} &rarr;</Link>
                  </article>
                );
              })}
            </div>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--text-dim)', letterSpacing: '.02em', lineHeight: 1.7, margin: '2px 0 0' }}>
              These three are read live from the database as this page loads - a real verified unique, a community-reported weapon stat, and a location named in an official source. If a row ever stops qualifying, its card disappears rather than go stale.
            </p>
          </>
        )}

        {/* ===================== HOW WE SOURCE (kept) ===================== */}
        <div className="m-h2">How we source</div>
        <Body>
          We start from primary sources - official patch notes, store pages, developer posts, and the live game itself - never scraped wikis or another site&apos;s numbers. A caliber, a confirmed weapon, a stated price: that traces to the studio or to in-game observation, and the row records where it came from.
        </Body>
        <Body>
          Every fact carries a confidence level, and we never dress one up as another:
        </Body>
        <ul style={{ margin: '0 0 16px', paddingLeft: 4, listStyle: 'none', maxWidth: '68ch' }}>
          <li style={{ margin: '0 0 10px', paddingLeft: 18, position: 'relative', fontSize: 15, lineHeight: 1.7, color: 'var(--text-dim)' }}><span style={{ position: 'absolute', left: 0, color: 'var(--gold)' }}>&bull;</span> <strong style={{ color: 'var(--text)' }}>Confirmed</strong> - stated first-party by the developer or verified in-game.</li>
          <li style={{ margin: '0 0 10px', paddingLeft: 18, position: 'relative', fontSize: 15, lineHeight: 1.7, color: 'var(--text-dim)' }}><span style={{ position: 'absolute', left: 0, color: 'var(--gold)' }}>&bull;</span> <strong style={{ color: 'var(--text)' }}>Reported</strong> - real, but seen in a beta build or a community capture (or otherwise community-reported), and labeled as exactly that. It is not the launch record until the live game confirms it.</li>
          <li style={{ margin: '0 0 10px', paddingLeft: 18, position: 'relative', fontSize: 15, lineHeight: 1.7, color: 'var(--text-dim)' }}><span style={{ position: 'absolute', left: 0, color: 'var(--gold)' }}>&bull;</span> <strong style={{ color: 'var(--text)' }}>Honest-null</strong> - when a number is not published, the field stays empty. We do not fill it with a guess, a model&apos;s hallucination, or a competitor&apos;s estimate.</li>
        </ul>
        <Body>
          That last one is the discipline most sites skip. When a game launches with weapons we can name but stats nobody has measured yet, we publish the weapon - name, class, caliber - with the damage, fire rate, and everything else left blank and marked pending. A real gap, shown honestly, beats a confident fake. The numbers fill in as the live game is checked, and the row flips to verified when they do.
        </Body>
        <Body>
          When a source changes, we correct the record and re-tier it - a beta figure that the launch build overrides gets moved, not quietly kept. And the operation is verification-first by construction: nothing publishes without review, unconfirmed content is held out of search until it is verified, and the editors interpret verified data - they do not invent it.
        </Body>
        <Body>
          We are AI-operated, and that is how one network covers every weapon, shell, and build across every game around the clock, at a scale a single desk of people could not. The difference from the scraped-slop sites is not that a machine is involved - it is that ours reads the source and refuses to fake the gaps.
        </Body>

        {/* ===================== HOW TO READ A TIER LIST (kept) ===================== */}
        <div className="m-h2">How to read a tier list</div>
        <Body>
          A tier letter is a ranking within an engagement band, not across the whole arsenal - a shotgun is scored against other close-range weapons, not against snipers. Each weapon is graded on four axes drawn from its real stats - firepower (burst lethality up close, sustained damage at range), accuracy, handling, and range - and the combined score maps to a letter: S, A, B, C, or D. Tap into a weapon and you can see the axis breakdown behind its placement; the ranking is a transparent model over measured stats, not a vibe.
        </Body>
        <Body>
          The honest part: a weapon whose underlying stats are not in the database yet is <strong style={{ color: 'var(--text)' }}>Unrankable</strong> - the model returns no letter rather than a made-up one. An unrated weapon is a data gap we are showing you, not a low score.
        </Body>

        {/* ===================== THE TIERS (live legend, mockup-styled) ===================== */}
        <div className="m-h2">The confidence marks</div>
        <Body>
          Every structured fact carries its source strength on its face &mdash; the SAME mark you see on a weapon, shell, or location page appears here, so you always know how far to trust a number at a glance. From most to least confident:
        </Body>
        <div className="m-legend">
          {CONFIDENCE_TIERS.filter(function (t) { return t.key !== 'analysis'; }).map(function (t) {
            // METHODOLOGY-ONLY addendum (the shared CONFIDENCE_TIERS desc also feeds /about and the
            // article badge tooltip on every game, so it is not edited): once a Part 1 (pre-release)
            // row backs a Verified card here, say that Verified also covers that kind of source.
            var desc = t.key === 'verified' && part1Live ? t.desc + VERIFIED_PRERELEASE_ADDENDUM : t.desc;
            return (
              <div className="m-row" key={t.key} style={{ '--c': t.color }}>
                <div><Badge tierKey={t.key} /></div>
                <div className="m-mean"><strong>{desc}</strong><p>{t.caption}.</p></div>
              </div>
            );
          })}
        </div>
        <p className="m-axis">
          <strong style={{ color: 'var(--text)' }}>Our Read</strong> is a separate axis, not a confidence level. It marks editorial judgment - a ranking, a recommendation, our interpretation of verified data - shown in violet so opinion never reads as sourced fact.
        </p>
        <div className="m-legend" style={{ marginTop: 12 }}>
          <div className="m-row" style={{ '--c': tier('analysis').color }}>
            <div><Badge tierKey="analysis" /></div>
            <div className="m-mean"><strong>{tier('analysis').desc}</strong><p>{tier('analysis').caption}.</p></div>
          </div>
        </div>
        <p style={{ fontSize: 14.5, lineHeight: 1.7, color: 'var(--text-dim)', maxWidth: '68ch', margin: '16px 0 0' }}>
          Articles are being brought up to the same standard. Every article Justin approves carries his receipt.
        </p>

        {/* ===================== HOW BUILDS ARE CHOSEN (kept) ===================== */}
        <div className="m-h2">How builds are chosen</div>
        <Body>
          Two things wear the word &quot;build&quot;. <strong style={{ color: 'var(--text)' }}>Best Builds</strong> on a weapon or shell page are reviewed write-ups - a specific loadout with the reasoning behind it. The <strong style={{ color: 'var(--text)' }}>Loadout Finder</strong> is the interactive tool: you give it your shell, playstyle, and rank goal, and it assembles a full loadout - weapons, mods, cores, implants - by reasoning over the game&apos;s verified stat tables. It works from the same checked data everything else here uses; it cross-references real values and does not invent stats or item names. It is a starting point tuned to your inputs, not a decree.
        </Body>

        {/* ===================== THE DIFFERENCE (kept) ===================== */}
        <div className="m-h2">The difference</div>
        <Body>
          A wave of AI content farms scrapes wikis, mangles the numbers, and publishes broken data as fact. We built the opposite, and this page is the proof you can hold us to: sourced from the game, tiered by confidence, corrected when it changes, and honest about what we do not know. If you ever find a number here that is not backed by one of the levels above, that is a bug - not our standard.
        </Body>

        <div style={{ marginTop: 30, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Link href="/history" style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)' }}>Online since 2009 - our history &rarr;</Link>
          <Link href="/about" style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)' }}>About the network &rarr;</Link>
          <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Explore the games &rarr;</Link>
        </div>
      </div>
    </main>
  );
}
