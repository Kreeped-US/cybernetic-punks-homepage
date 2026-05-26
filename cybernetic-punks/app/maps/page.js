// app/maps/page.js
// ============================================================
// MAPS INDEX — lists all PUBLISHED maps. Generalized; new maps
// appear here automatically once is_published = true.
// ============================================================
// Uses the anon client via the shared lib (public read of published
// maps only, which is exactly what this index should show). Unpublished
// maps never appear here — preview them directly via the slug page with
// the preview key.
//
// Created: May 26, 2026 (Step 2 of the maps build)

import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const BG = '#121418';
const CARD_BG = '#1a1d24';
const BORDER = '#22252e';
const CYAN = '#00d4ff';
const PURPLE = '#9b5de5';

export const metadata = {
  title: 'Marathon Maps - Interactive Map Guides & Vault Intel | CyberneticPunks',
  description: 'Interactive Marathon map guides. Vault breakdowns, mechanics, credential routes, and zone intel for every Marathon map.',
  alternates: { canonical: 'https://cyberneticpunks.com/maps' },
};

export default async function MapsIndex() {
  var { data: maps } = await supabase
    .from('maps')
    .select('slug, name, description, season')
    .eq('is_published', true)
    .order('updated_at', { ascending: false });

  var published = maps || [];

  return (
    <main style={{ background: BG, minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <style>{`
        .mi-card { transition: background 0.12s, border-color 0.12s, transform 0.12s; }
        .mi-card:hover { background: #1e2228 !important; transform: translateY(-1px); border-color: ${CYAN}55 !important; }
      `}</style>

      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: CYAN }}>MAPS</li>
        </ol>
      </nav>

      <section style={{ padding: '24px 24px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: CYAN, background: CYAN + '14', border: '1px solid ' + CYAN + '40', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>
          MAP INTEL
        </span>
        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.05, margin: '16px 0', color: CYAN }}>
          MARATHON MAPS
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
          Interactive map guides with full vault breakdowns, mechanics, and credential routes. Know the map better than the enemy.
        </p>
      </section>

      <section style={{ padding: '0 24px 64px', maxWidth: 1100, margin: '0 auto' }}>
        {published.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
            {published.map(function(m) {
              return (
                <Link key={m.slug} href={'/maps/' + m.slug} className="mi-card" style={{ display: 'block', background: CARD_BG, border: '1px solid ' + BORDER, borderLeft: '3px solid ' + CYAN, borderRadius: '0 2px 2px 0', padding: '18px 20px', textDecoration: 'none' }}>
                  <h2 style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>{m.name}</h2>
                  {m.season && <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700 }}>{m.season.toUpperCase()}</span>}
                  {m.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55, margin: '8px 0 0' }}>{m.description.slice(0, 140)}...</p>}
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: CYAN, letterSpacing: 1, fontWeight: 700, marginTop: 12 }}>VIEW MAP →</div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: CARD_BG, border: '1px solid ' + BORDER, borderRadius: 2 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700 }}>
              MAPS COMING SOON
            </div>
          </div>
        )}
      </section>
    </main>
  );
}