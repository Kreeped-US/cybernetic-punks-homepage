// app/wardogs/loadouts/build/[slug]/opengraph-image.js
// Dynamic OG share-card for a SAVED Wardogs loadout (Channel A). Now carries the CNP logo (brand
// hero, top-left) + the official Wardogs wordmark (white, secondary, top-right, aspect-preserved) +
// a fan-made disclaimer -- the loadout (weapon + measured TTK) stays the visual hero. On-brand amber,
// HONEST: attributed tier (never "verified") + "not affiliated with Bulkhead".
//
// ASSET LOADING: the two PNGs are read from public/ via new URL(..., import.meta.url) + readFile (the
// next/og local-asset pattern -- Next's file tracer bundles the referenced files into the function).
// Filenames are referenced EXACTLY as stored (case-sensitive prod FS): 'WD_Fullmark_White.png',
// 'cnp-512.png'. Embedded as base64 data URIs (satori needs the bytes, not a URL). If a read fails
// the card falls back to text branding (never a render error). Node runtime for fs + the font read.

import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';
import { OG_COLORS } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';
import { readFile } from 'node:fs/promises';

export const runtime = 'nodejs';
export const alt = 'A Wardogs loadout ranked by measured time-to-kill on the Cybernetic Punks network';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function cap(s) { const x = String(s || ''); return x.charAt(0).toUpperCase() + x.slice(1); }
function weaponSize(name) { const n = String(name || '').length; if (n <= 10) return 100; if (n <= 16) return 80; return 62; }

// SERVICE key (wardogs_loadout_pages is RLS-on; the anon client returns no row -> generic fallback).
function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

// Read the two brand PNGs from public/ as base64 data URIs. EXACT filename case. Tracer-bundled.
async function loadLogos() {
  try {
    const [cnp, wd] = await Promise.all([
      readFile(new URL('../../../../../public/cnp-512.png', import.meta.url)),
      readFile(new URL('../../../../../public/WD_Fullmark_White.png', import.meta.url)),
    ]);
    return { cnp: 'data:image/png;base64,' + cnp.toString('base64'), wd: 'data:image/png;base64,' + wd.toString('base64') };
  } catch (e) {
    return { cnp: null, wd: null };
  }
}

export default async function Image({ params }) {
  const [fonts, logos, p] = await Promise.all([loadExo2(), loadLogos(), params]);
  const accent = OG_COLORS.wardogs; // #e0a13a

  let primary = 'Wardogs Loadout', ttk = null, ammo = null, secondary = null, playstyle = 'balanced', level = null, tier = 'attributed';
  try {
    const res = await getSupabase()
      .from('wardogs_loadout_pages')
      .select('loadout_json, playstyle, career_level')
      .eq('game_slug', 'wardogs').eq('slug', p.slug).maybeSingle();
    const row = res && res.data;
    if (row && row.loadout_json) {
      const j = row.loadout_json;
      const rec = j.recommendation || {};
      if (rec.primary) { primary = rec.primary.weapon_name || primary; ttk = rec.primary.weighted_ttk_ms != null ? rec.primary.weighted_ttk_ms : null; ammo = rec.primary.ammo || null; }
      if (rec.secondary) secondary = rec.secondary.weapon_name || null;
      playstyle = j.playstyle || row.playstyle || playstyle;
      level = row.career_level != null ? row.career_level : (j.queried && j.queried.careerLevel != null ? j.queried.careerLevel : null);
      tier = (j.provenance && j.provenance.tier) || 'attributed';
    }
  } catch (e) { /* keep fallbacks */ }

  const tierLabel = tier === 'verified' ? 'VERIFIED IN-GAME' : 'COMMUNITY-TESTED BALLISTICS · ATTRIBUTED';
  const chip = (text, key) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', border: '2px solid ' + accent, color: accent, borderRadius: '8px', padding: '6px 16px', fontSize: '24px', fontWeight: 800, letterSpacing: '0.08em', marginRight: '14px' }}>{text}</div>
  );
  // Wardogs wordmark 2468x490 -> aspect-preserved at height 38.
  const WD_H = 38, WD_W = Math.round(WD_H * 2468 / 490);

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#0e1014', color: '#ffffff', fontFamily: 'Exo 2', padding: '52px 64px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', backgroundColor: accent, display: 'flex' }} />

        {/* header: CNP logo (brand hero) + wordmark; Wardogs official wordmark (secondary) right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {logos.cnp
              ? <img src={logos.cnp} alt="" width={68} height={68} style={{ borderRadius: '10px' }} />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '68px', height: '68px', backgroundColor: accent, borderRadius: '10px', color: '#000000', fontSize: '30px', fontWeight: 800 }}>CNP</div>}
            <div style={{ display: 'flex', marginLeft: '22px', fontSize: '29px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>CYBERNETIC PUNKS</div>
          </div>
          {logos.wd
            ? <img src={logos.wd} alt="" width={WD_W} height={WD_H} />
            : <div style={{ display: 'flex', alignItems: 'center', border: '3px solid ' + accent, color: accent, borderRadius: '999px', padding: '9px 28px', fontSize: '25px', fontWeight: 800, letterSpacing: '0.10em' }}>WARDOGS</div>}
        </div>

        {/* body: eyebrow -> weapon (hero) -> stat + chips */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: '24px', fontWeight: 800, color: accent, letterSpacing: '0.16em', marginBottom: '14px' }}>WARDOGS · BEST LOADOUT</div>
          <div style={{ display: 'flex', fontSize: weaponSize(primary) + 'px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.0 }}>{primary}</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '24px' }}>
            {ttk != null ? (
              <div style={{ display: 'flex', flexDirection: 'column', marginRight: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', fontSize: '74px', fontWeight: 800, color: accent, lineHeight: 0.9 }}>{ttk}</div>
                  <div style={{ display: 'flex', fontSize: '32px', fontWeight: 800, color: accent, marginLeft: '4px', marginBottom: '8px' }}>ms</div>
                </div>
                <div style={{ display: 'flex', fontSize: '20px', fontWeight: 700, color: '#9a9a9a', letterSpacing: '0.14em', marginTop: '4px' }}>FASTEST TIME-TO-KILL{ammo ? ' · ' + ammo : ''}</div>
              </div>
            ) : null}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {chip(cap(playstyle).toUpperCase(), 'ps')}
              {level != null ? chip('LEVEL ' + level, 'lvl') : null}
            </div>
          </div>
        </div>

        {/* footer: sidearm + tier tag; then the honest fan-made disclaimer */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', fontSize: '26px', fontWeight: 700, color: '#c8c8c8' }}>{secondary ? '+ ' + secondary + ' sidearm' : 'Ranked from measured ballistics'}</div>
            <div style={{ display: 'flex', fontSize: '20px', fontWeight: 700, color: '#8a8a8a', letterSpacing: '0.08em' }}>{tierLabel}</div>
          </div>
          <div style={{ display: 'flex', fontSize: '17px', fontWeight: 700, color: '#6f6f6f', letterSpacing: '0.04em' }}>Fan-made - not affiliated with or endorsed by Bulkhead. Wardogs is a trademark of its owner.</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
