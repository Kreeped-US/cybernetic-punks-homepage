// app/matchups/[shell]/page.js
//
// Per-shell matchup page -- one template serving every shell in the allowlist
// (lib/matchups.js SHELLS). force-dynamic + no generateStaticParams, so a shell
// row edit "just works" the day it lands -- same contract as /mods/[slot] and
// /weapons/[slug].
//
// THIS IS THE CONSOLIDATION CANONICAL for the ~27 live "how to beat [shell]"
// articles (adjudication is a SEPARATE step). It renders BOTH directions of the
// game-verified matrix:
//   1. "How to beat [Shell]"  <- countered_by (the shells that beat it). PRIMARY.
//   2. "[Shell] is strong against" <- COMPUTED inverse: shells whose countered_by
//      contains this shell. Both directions trace to the same verified data.
//   3. Key counter items/tactics <- counter_items (game-verified this session).
//   4. General notes <- weaknesses. NOT part of the 2026-07-17 game-verified
//      pass (pre-existing data), so it renders under a separate, weaker-
//      provenance heading, never mixed into the verified counter data.
//
// EMPTY STATE (the honesty hinge, lib/matchups.js counterState):
//   has-counters  -> render the counters.
//   verified-none -> "no hard counter" as CONTENT (Rook), because the matchup
//                    marker is present in verified_source: a confident,
//                    owner-verified claim, not a blank.
//   pending       -> "analysis pending": an honest not-yet for any future shell
//                    whose matchup row was never game-checked. Reads differently
//                    from Rook by design.
//
// UNKNOWN SLUG -> notFound(), NOT a thin empty render (matches /mods/[slot]).
// dateModified is the FIXED verification date, never new Date() (false-freshness
// bug, see lib/mods.js).

import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Footer from '@/components/Footer';
import {
  MATCHUP_ACCENT,
  MATCHUP_VERIFIED_DATE,
  SHELLS,
  resolveShellSlug,
  shellToSlug,
  toArr,
  counterState,
  strongAgainst,
  matchupFaq,
} from '@/lib/matchups';

export const dynamic = 'force-dynamic';

const SELECT_COLS = 'name, role, lore_tagline, countered_by, counter_items, weaknesses, verified_source, updated_at';

// Fetch ALL marathon shell rows -- the inverse ("strong against") needs the
// whole matrix, not just the target row. supabase-js returns errors in .error
// and does NOT throw; an errored read returns null so the caller can 404 rather
// than render an empty page that tells the reader this shell has no matchups.
async function fetchAllShells() {
  var res = await supabase
    .from('shell_stats')
    .select(SELECT_COLS)
    .eq('game_slug', 'marathon');
  if (res.error) {
    console.error('[matchups] shell_stats read failed:', res.error.message);
    return null;
  }
  return res.data || [];
}

export async function generateMetadata({ params }) {
  var slug = (await params).shell;
  var name = resolveShellSlug(slug);
  if (!name) return { title: 'Matchup Not Found' };

  var title = 'How to Beat ' + name + ' in Marathon — Counters & Tactics';
  var desc = 'How to beat ' + name + ' in Marathon: which shells counter it, the key counter '
    + 'items and tactics, and what ' + name + ' is strong against. Owner-verified in-game.';
  var url = 'https://cyberneticpunks.com/matchups/' + shellToSlug(name);

  return {
    title: title,
    description: desc,
    openGraph: {
      title: title + ' | CyberneticPunks',
      description: desc,
      url: url,
      siteName: 'CyberneticPunks',
      type: 'website',
      images: [{ url: 'https://cyberneticpunks.com/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: 'How to Beat ' + name + ' in Marathon',
      description: desc,
      images: ['https://cyberneticpunks.com/og-image.png'],
    },
    alternates: { canonical: url },
  };
}

// Small chip. Linkable ones point at another shell's matchup page so counters
// chain; item chips are static (items have no page).
function Chip({ label, href, mirror }) {
  var inner = (
    <span style={{ fontSize: 12, color: MATCHUP_ACCENT, border: '1px solid ' + MATCHUP_ACCENT + '55', background: MATCHUP_ACCENT + '14', padding: '4px 11px', borderRadius: 3, fontWeight: 700, letterSpacing: 0.5, display: 'inline-block' }}>
      {label}{mirror ? ' (mirror)' : ''}
    </span>
  );
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
}

function ItemChip({ label }) {
  return (
    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', border: '1px solid #33373f', background: '#20242c', padding: '4px 11px', borderRadius: 3, fontWeight: 600, letterSpacing: 0.3, display: 'inline-block' }}>
      {label}
    </span>
  );
}

export default async function ShellMatchupPage({ params }) {
  var slug = (await params).shell;
  var name = resolveShellSlug(slug);
  if (!name) notFound(); // unknown/withheld slug -> clean 404, never a thin render.

  var allRows = await fetchAllShells();
  if (!allRows) notFound();

  var row = allRows.find(function (r) { return r.name === name; });
  if (!row) notFound();

  var state = counterState(row);
  var counters = toArr(row.countered_by);
  var items = toArr(row.counter_items);
  var weaknesses = toArr(row.weaknesses);
  var inverse = strongAgainst(allRows, name); // computed both-directions
  var faq = matchupFaq(row, allRows); // null only in 'pending'
  var url = 'https://cyberneticpunks.com/matchups/' + shellToSlug(name);

  var otherShells = SHELLS.filter(function (s) { return s !== name; });

  var breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Matchups', item: 'https://cyberneticpunks.com/matchups' },
      { '@type': 'ListItem', position: 3, name: name, item: url },
    ],
  };

  // FAQPage only when a verified answer exists (has-counters or verified-none).
  // The schema serializes the SAME text rendered in the visible FAQ block below,
  // so the two cannot drift (single source: matchupFaq). dateModified is the
  // FIXED verification date, never new Date().
  var faqSchema = faq ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    url: url,
    dateModified: MATCHUP_VERIFIED_DATE,
    mainEntity: [{
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    }],
  } : null;

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li><Link href="/matchups" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>MATCHUPS</Link></li>
          <li>/</li>
          <li style={{ color: 'var(--red)' }}>{name.toUpperCase()}</li>
        </ol>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ padding: '40px 0 28px', borderBottom: '1px solid #1e2028', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>HOME</Link>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
            <Link href="/matchups" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>MATCHUPS</Link>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
            <span style={{ color: MATCHUP_ACCENT }}>{name.toUpperCase()}</span>
          </div>
          <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(26px, 4.2vw, 40px)', fontWeight: 900, color: '#fff', letterSpacing: '1px', margin: '0 0 10px', lineHeight: 1.08 }}>
            How to Beat <span style={{ color: MATCHUP_ACCENT }}>{name}</span>
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
            {row.lore_tagline
              ? row.lore_tagline + ' '
              : ''}
            Which shells counter {name}, the items and tactics that beat it, and what {name} is strong
            against — owner-verified in-game.
          </p>
        </div>

        {/* 1. HOW TO BEAT -- primary, 3-state */}
        <section style={{ marginBottom: 34 }}>
          <h2 style={{ fontSize: 13, color: MATCHUP_ACCENT, letterSpacing: 2, fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Orbitron, monospace', margin: '0 0 12px' }}>
            Shells that counter {name}
          </h2>
          {state === 'has-counters' && (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {counters.map(function (c) {
                  var self = c === name;
                  return <Chip key={c} label={c} mirror={self} href={SHELLS.indexOf(c) !== -1 ? '/matchups/' + shellToSlug(c) : null} />;
                })}
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: '14px 0 0', maxWidth: 720 }}>
                Play {counters.map(function (c) { return c === name ? c + ' (mirror matchup)' : c; }).join(', ')} to
                beat {name}. These are the shells that hold the advantage in a straight matchup — owner-verified
                in-game.
              </p>
            </>
          )}
          {state === 'verified-none' && (
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + MATCHUP_ACCENT + '88', borderRadius: '0 3px 3px 0', padding: '16px 18px' }}>
              <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
                <strong style={{ color: '#fff' }}>{name} has no hard counter — and that&apos;s the point.</strong> It&apos;s a
                low-stakes solo scavenger, not a threat you build a loadout to beat. No shell or item specifically
                shuts it down, because any geared squad already outguns it in a straight fight. If you&apos;re up
                against a {name}, you don&apos;t need a counter — you just don&apos;t let a free kill walk away.
              </p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '10px 0 0', fontFamily: 'monospace', letterSpacing: 0.5 }}>Owner-verified in-game, Season 2.</p>
            </div>
          )}
          {state === 'pending' && (
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '16px 18px' }}>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
                Matchup analysis for {name} is being verified in-game. We publish counters only after in-game
                confirmation, so this section is intentionally blank rather than guessed.
              </p>
            </div>
          )}
        </section>

        {/* 2. COUNTER ITEMS */}
        {items.length > 0 && (
          <section style={{ marginBottom: 34 }}>
            <h2 style={{ fontSize: 13, color: MATCHUP_ACCENT, letterSpacing: 2, fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Orbitron, monospace', margin: '0 0 12px' }}>
              Key items &amp; tactics vs {name}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {items.map(function (it) { return <ItemChip key={it} label={it} />; })}
            </div>
          </section>
        )}

        {/* 3. STRONG AGAINST -- computed inverse */}
        <section style={{ marginBottom: 34 }}>
          <h2 style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', letterSpacing: 2, fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Orbitron, monospace', margin: '0 0 12px' }}>
            {name} is strong against
          </h2>
          {inverse.length > 0 ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {inverse.map(function (c) {
                  var self = c === name;
                  return <Chip key={c} label={c} mirror={self} href={SHELLS.indexOf(c) !== -1 ? '/matchups/' + shellToSlug(c) : null} />;
                })}
              </div>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '12px 0 0', lineHeight: 1.5, maxWidth: 720 }}>
                {name} appears as a counter on {inverse.length === 1 ? 'this shell' + '’' + 's' : 'these shells' + '’'} matchup {inverse.length === 1 ? 'page' : 'pages'} — the inverse of the same verified matrix.
              </p>
            </>
          ) : (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5, margin: 0 }}>
              {name} isn&apos;t a listed hard counter to any shell in the current matrix.
            </p>
          )}
        </section>

        {/* Visible FAQ -- SAME text as the FAQPage schema (single source: matchupFaq). */}
        {faq && (
          <section style={{ marginBottom: 34, paddingTop: 8 }}>
            <h2 style={{ fontSize: 13, color: MATCHUP_ACCENT, letterSpacing: 2, fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Orbitron, monospace', margin: '0 0 10px' }}>
              {faq.question}
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0, maxWidth: 720 }}>{faq.answer}</p>
          </section>
        )}

        {/* 4. GENERAL NOTES (weaknesses) -- WEAKER PROVENANCE, clearly separated.
            Not part of the 2026-07-17 game-verified matchup pass. */}
        {weaknesses.length > 0 && (
          <section style={{ marginBottom: 34, paddingTop: 20, borderTop: '1px solid #1e2028' }}>
            <h2 style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Orbitron, monospace', margin: '0 0 6px' }}>
              General notes
            </h2>
            <p style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.28)', margin: '0 0 12px', fontFamily: 'monospace', letterSpacing: 0.5, lineHeight: 1.5 }}>
              From the shell profile — general observations, not part of the game-verified matchup pass.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'rgba(255,255,255,0.5)', fontSize: 13.5, lineHeight: 1.7 }}>
              {weaknesses.map(function (w) { return <li key={w}>{w}</li>; })}
            </ul>
          </section>
        )}

        {/* Other shells */}
        <section style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid #1e2028' }}>
          <h2 style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 800, textTransform: 'uppercase', fontFamily: 'Orbitron, monospace', margin: '0 0 14px' }}>
            Other Matchups
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {otherShells.map(function (s) {
              return (
                <Link key={s} href={'/matchups/' + shellToSlug(s)} style={{ display: 'inline-block', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '7px 14px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                  {s}
                </Link>
              );
            })}
            <Link href="/matchups" style={{ display: 'inline-block', background: 'transparent', border: '1px solid ' + MATCHUP_ACCENT + '40', borderRadius: 3, padding: '7px 14px', color: MATCHUP_ACCENT, textDecoration: 'none', fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
              All Matchups
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}
