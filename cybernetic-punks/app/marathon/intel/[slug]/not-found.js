// app/marathon/intel/[slug]/not-found.js
// Rendered by notFound() in page.js when an article slug is missing or unpublished
// (a stale external link -- an old Google result, or a deleted/re-slugged article --
// redirects here from /intel/<slug> and lands on a gone page). Instead of a dead-end
// default 404, this surfaces LIVE intel so the visitor finds their way to current
// content. GROUNDED: it links only real published+indexable articles + real hubs, and
// the fetch is try/caught so a build-time (no-env) render degrades to the hubs, never
// crashes. Honest voice -- "this dispatch moved, here is what is running now."

import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const BG = '#121418', CARD = '#1a1d24', BORDER = '#22252e', CYAN = '#00d4ff';

async function recentIntel() {
  try {
    const { data } = await supabase
      .from('feed_items')
      .select('headline, slug, editor, created_at')
      .eq('game_slug', 'marathon')
      .eq('is_published', true)
      .eq('noindex', false)
      .order('created_at', { ascending: false })
      .limit(6);
    return data || [];
  } catch (e) {
    return [];
  }
}

export default async function IntelNotFound() {
  const recent = await recentIntel();
  const hubs = [
    { href: '/marathon/intel',   label: 'All Intel',        desc: 'The full Marathon feed' },
    { href: '/marathon/meta',    label: 'Weapon Tier List', desc: 'Live rankings' },
    { href: '/marathon/shells',  label: 'Shells',           desc: 'Every Runner Shell' },
    { href: '/marathon/uniques', label: 'Unique Weapons',   desc: 'Prestige & Deluxe variants' },
    { href: '/marathon/maps',    label: 'Maps',             desc: 'Zones, bosses, vaults' },
  ];

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 64 }}>
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '24px 24px 64px' }}>
        <div style={{ fontFamily: 'monospace', fontSize: 10, color: CYAN, letterSpacing: 3, fontWeight: 700, marginBottom: 12 }}>404 - SIGNAL LOST</div>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 14px' }}>
          This dispatch has moved or been archived.
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 640, margin: '0 0 32px' }}>
          The article you followed is not at this address - it may have been superseded by newer intel or re-filed. Here is what the desk is running right now.
        </p>

        {recent.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>LATEST INTEL</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {recent.map((r, i) => (
                <Link key={i} href={'/marathon/intel/' + r.slug} style={{ textDecoration: 'none', background: CARD, border: '1px solid ' + BORDER, borderLeft: '2px solid ' + CYAN, borderRadius: '0 2px 2px 0', padding: '12px 14px', display: 'block' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35 }}>{r.headline}</div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>JUMP TO</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {hubs.map((h, i) => (
            <Link key={i} href={h.href} style={{ textDecoration: 'none', background: CARD, border: '1px solid ' + BORDER, borderRadius: 2, padding: '12px 14px', display: 'block' }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: CYAN }}>{h.label} &rarr;</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 3 }}>{h.desc}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
