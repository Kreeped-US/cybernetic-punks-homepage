// app/(network)/methodology/page.js
// "Methodology" -- the network-level trust + legibility page. Server component, crawlable (SEO).
// Two fused purposes: (1) HOW WE VERIFY (the trust asset -- surface the moat loudly), (2) HOW TO
// READ our outputs (tier lists, confidence badges, honest-null, builds). Network-level because
// verification is sitewide, not per-game; citable from entity pages across every game.
//
// VOICE: discipline-first, concrete (matches the strengthened /about). EVERY claimed mechanic is
// real -- grounded in the reference docs + code: primary-source-first; the tier model
// (lib/weapons/tierModel.js: band-normalized axes -> scoreToTier, unrankable when data is missing);
// confidence tiers + provenance badges (components/game/GameArsenal.js); honest-null (verified=false
// / values null); the Build Advisor engine (lib/advisor/generateBuild.js); operator review before
// publish. No invented process.
//
// CHROME: lives in app/(network) -- layout.js provides NetworkNav + NetworkFooter inside .cnp-root;
// this page renders ONLY its <main>. Static metadata (no per-request data). Draft copy pending
// editorial review before it is treated as shipped.

import Link from 'next/link';
// The confidence legend below is driven by the SHARED tier source -- the SAME icons that render on
// the entity-page provenance badges, so the explanation here can't drift from the marks it explains.
import { CONFIDENCE_TIERS, TierIcon } from '@/components/network/confidenceTiers';

export const metadata = {
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
};

function Label({ children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '34px 0 16px' }}>
      <span style={{ width: 9, height: 9, borderRadius: 1, background: 'var(--burg-bright)', transform: 'rotate(45deg)', flexShrink: 0 }} aria-hidden="true" />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)' }}>{children}</span>
    </div>
  );
}

function Body({ children }) {
  return <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--text-dim)', margin: '0 0 16px', maxWidth: '68ch' }}>{children}</p>;
}

export default function MethodologyPage() {
  return (
    <main>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '56px 24px 60px' }}>

        <div style={{ marginBottom: 26 }}>
          <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 600, letterSpacing: 1.5, color: 'var(--text-dim)' }}>&larr; Network home</Link>
        </div>

        <Label>Methodology</Label>
        <h1 style={{ margin: '0 0 16px' }}>How we verify, and how to read it.</h1>
        <p style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, lineHeight: 1.4, letterSpacing: '.01em', color: 'var(--gold)', margin: '0 0 22px' }}>
          Sourced, tiered, corrected - not scraped.
        </p>
        <Body>
          This is the whole method, in the open: where our numbers come from, how confident we are in each one, and how to read the tier lists, rankings, and builds you find across the network. If you only take one thing from it: when we are not sure, we tell you - we would rather show a blank than a guess.
        </Body>

        {/* ===================== HOW WE SOURCE ===================== */}
        <Label>How we source</Label>
        <Body>
          We start from primary sources - official patch notes, store pages, developer posts, and the live game itself - never scraped wikis or another site&apos;s numbers. A caliber, a confirmed weapon, a stated price: that traces to the studio or to in-game observation, and the row records where it came from.
        </Body>
        <Body>
          Every fact carries a confidence level, and we never dress one up as another:
        </Body>
        <ul style={{ margin: '0 0 16px', paddingLeft: 4, listStyle: 'none', maxWidth: '68ch' }}>
          <li style={{ margin: '0 0 10px', paddingLeft: 18, position: 'relative', fontSize: 15, lineHeight: 1.7, color: 'var(--text-dim)' }}><span style={{ position: 'absolute', left: 0, color: 'var(--gold)' }}>&bull;</span> <strong style={{ color: 'var(--text)' }}>Confirmed</strong> - stated first-party by the developer or verified in-game.</li>
          <li style={{ margin: '0 0 10px', paddingLeft: 18, position: 'relative', fontSize: 15, lineHeight: 1.7, color: 'var(--text-dim)' }}><span style={{ position: 'absolute', left: 0, color: 'var(--gold)' }}>&bull;</span> <strong style={{ color: 'var(--text)' }}>Attributed / beta-observed</strong> - real, but seen in a beta build or a community capture, and labeled as exactly that. It is not the launch record until the live game confirms it.</li>
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

        {/* ===================== HOW TO READ A TIER LIST ===================== */}
        <Label>How to read a tier list</Label>
        <Body>
          A tier letter is a ranking within an engagement band, not across the whole arsenal - a shotgun is scored against other close-range weapons, not against snipers. Each weapon is graded on four axes drawn from its real stats - firepower (burst lethality up close, sustained damage at range), accuracy, handling, and range - and the combined score maps to a letter: S, A, B, C, or D. Tap into a weapon and you can see the axis breakdown behind its placement; the ranking is a transparent model over measured stats, not a vibe.
        </Body>
        <Body>
          The honest part: a weapon whose underlying stats are not in the database yet is <strong style={{ color: 'var(--text)' }}>Unrankable</strong> - the model returns no letter rather than a made-up one. An unrated weapon is a data gap we are showing you, not a low score.
        </Body>

        {/* ===================== BADGES / PROVENANCE ===================== */}
        {/* Header brands the "how we verify" legend with the CNP mark (per operator: logo in the
            explainer header, NOT in each badge). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '34px 0 16px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/cnp-512.png" alt="Cybernetic Punks" width="22" height="22" style={{ borderRadius: 5, flexShrink: 0 }} />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', color: 'var(--gold)' }}>Confidence badges and provenance</span>
        </div>
        <Body>
          Every structured fact carries its source strength on its face &mdash; the SAME mark you see on a weapon or shell page appears here, so you always know how far to trust a number at a glance. From most to least confident:
        </Body>
        <ul style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, maxWidth: '68ch' }}>
          {CONFIDENCE_TIERS.map(function (t) {
            return (
              <li key={t.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, margin: '0 0 12px' }}>
                <span style={{ color: t.color, display: 'inline-flex', flexShrink: 0, marginTop: 3 }}>
                  <TierIcon tier={t.key} size={15} title={t.label} />
                </span>
                <span style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--text-dim)' }}>
                  <strong style={{ color: 'var(--text)' }}>{t.label}.</strong> {t.desc}
                </span>
              </li>
            );
          })}
        </ul>
        <Body>
          The gradient is the whole point: a solid mark is a fact we stand behind, a hollow or dashed one is us telling you the data is not there yet. We would rather show you the empty mark than a confident guess.
        </Body>

        {/* ===================== BUILDS ===================== */}
        <Label>How builds are chosen</Label>
        <Body>
          Two things wear the word "build". <strong style={{ color: 'var(--text)' }}>Best Builds</strong> on a weapon or shell page are reviewed write-ups - a specific loadout with the reasoning behind it. The <strong style={{ color: 'var(--text)' }}>Build Advisor</strong> is the interactive tool: you give it your shell, playstyle, and rank goal, and it assembles a full loadout - weapons, mods, cores, implants - by reasoning over the game&apos;s verified stat tables. It works from the same checked data everything else here uses; it cross-references real values and does not invent stats or item names. It is a starting point tuned to your inputs, not a decree.
        </Body>

        {/* ===================== THE DIFFERENCE ===================== */}
        <Label>The difference</Label>
        <Body>
          A wave of AI content farms scrapes wikis, mangles the numbers, and publishes broken data as fact. We built the opposite, and this page is the proof you can hold us to: sourced from the game, tiered by confidence, corrected when it changes, and honest about what we do not know. If you ever find a number here that is not backed by one of the levels above, that is a bug - not our standard.
        </Body>

        <div style={{ marginTop: 30, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <Link href="/about" style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--gold)' }}>About the network &rarr;</Link>
          <Link href="/" style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-dim)' }}>Explore the games &rarr;</Link>
        </div>
      </div>
    </main>
  );
}
