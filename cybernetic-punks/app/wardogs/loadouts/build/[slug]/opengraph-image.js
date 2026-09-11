// app/wardogs/loadouts/build/[slug]/opengraph-image.js
// Dynamic OG share-card for a SAVED Wardogs loadout (Channel A). This is what makes a shared link
// spread: a good preview = clicks = links = DA. Reads the wardogs_loadout_pages row by slug and
// renders a loadout-specific card (the primary weapon big, the measured TTK as the hero stat, the
// playstyle/level, the CNP/WARDOGS lockup) -- on-brand Wardogs amber, and HONEST (shows the
// attributed tier, never "verified"). Next auto-wires this as og:image + twitter:image for the route.
// satori (next/og) supports flexbox + a CSS subset only -- explicit margins, display:flex everywhere,
// no grid. Node runtime for the font read. A missing/unknown slug falls back to a generic card.

import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';
import { OG_COLORS } from '@/lib/og/colors';
import { loadExo2 } from '@/lib/og/fonts';

// SERVICE key (not the shared anon lib/supabase) -- wardogs_loadout_pages is RLS-on with no anon
// read, so the anon client returns no row and the card falls back. The service key reads it (the
// established pattern, same as the SSR page). Runtime-only read (runtime=nodejs), env is present.
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const runtime = 'nodejs';
export const alt = 'A Wardogs loadout ranked by measured time-to-kill on the Cybernetic Punks network';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

function cap(s) { const x = String(s || ''); return x.charAt(0).toUpperCase() + x.slice(1); }
function weaponSize(name) { const n = String(name || '').length; if (n <= 10) return 104; if (n <= 16) return 84; return 64; }

export default async function Image({ params }) {
  const fonts = await loadExo2();
  const p = await params;
  const accent = OG_COLORS.wardogs; // #e0a13a

  // Best-effort fetch -- a missing slug falls back to a generic card (never throws).
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

  return new ImageResponse(
    (
      <div style={{ width: '1200px', height: '630px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#0e1014', color: '#ffffff', fontFamily: 'Exo 2', padding: '58px 64px', position: 'relative' }}>
        {/* amber top rule */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '8px', backgroundColor: accent, display: 'flex' }} />

        {/* header: CNP lockup + WARDOGS pill */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '78px', height: '78px', backgroundColor: accent, borderRadius: '10px', color: '#000000', fontSize: '34px', fontWeight: 800 }}>CNP</div>
            <div style={{ display: 'flex', marginLeft: '24px', fontSize: '30px', fontWeight: 700, color: '#ffffff', letterSpacing: '0.06em' }}>CYBERNETIC PUNKS</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', border: '3px solid ' + accent, color: accent, borderRadius: '999px', padding: '9px 28px', fontSize: '25px', fontWeight: 800, letterSpacing: '0.10em' }}>WARDOGS</div>
        </div>

        {/* body: eyebrow -> weapon -> stat + chips */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: '24px', fontWeight: 800, color: accent, letterSpacing: '0.16em', marginBottom: '14px' }}>WARDOGS · BEST LOADOUT</div>
          <div style={{ display: 'flex', fontSize: weaponSize(primary) + 'px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.0 }}>{primary}</div>

          <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: '26px' }}>
            {ttk != null ? (
              <div style={{ display: 'flex', flexDirection: 'column', marginRight: '40px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{ display: 'flex', fontSize: '78px', fontWeight: 800, color: accent, lineHeight: 0.9 }}>{ttk}</div>
                  <div style={{ display: 'flex', fontSize: '34px', fontWeight: 800, color: accent, marginLeft: '4px', marginBottom: '8px' }}>ms</div>
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

        {/* footer: sidearm + honest tier tag */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', fontSize: '26px', fontWeight: 700, color: '#c8c8c8' }}>{secondary ? '+ ' + secondary + ' sidearm' : 'Ranked from measured ballistics'}</div>
          <div style={{ display: 'flex', fontSize: '20px', fontWeight: 700, color: '#8a8a8a', letterSpacing: '0.08em' }}>{tierLabel}</div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
