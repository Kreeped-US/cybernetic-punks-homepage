'use client';
// components/wardogs/WeaponImage.js
// SHARED Wardogs weapon-image slot -- the ONE component every Wardogs weapon surface renders:
// the loadouts hero cards (now), the /arsenal (when revamped), and any future weapon UI. It reads
// weapon_stats.image_filename (a BARE filename, e.g. "fal.webp") and builds /images/wardogs/<file>.
//
// PATH RECONCILE: the Wardogs images live in public/images/wardogs/ (not /images/weapons/, which is
// Marathon's). Keeping image_filename a bare filename matches Marathon's storage semantics; only the
// BASE DIR differs, and it lives HERE (wardogs-specific component) -- so Marathon/Bodycam/DMZ image
// handling is untouched (they don't use this component). One field, one component, every surface.
//
// HONEST empty state: no image_filename (or a 404) -> a muted reticle + "IMAGE PENDING", never a fake
// or broken image. onError falls back so a missing/mistyped file degrades gracefully.

import { useState } from 'react';

const CARD = 'var(--bg-card)';
const PAGE = 'var(--bg-page)';
const LSUB = 'var(--border-subtle)';
const AD = 'var(--accent-dim)';

// Wardogs weapon images live here. Bare image_filename joins onto this base.
export const WARDOGS_WEAPON_IMAGE_BASE = '/images/wardogs/';

export default function WeaponImage({ imageFilename, name, hero }) {
  const [failed, setFailed] = useState(false);
  const src = imageFilename ? WARDOGS_WEAPON_IMAGE_BASE + imageFilename : null;
  const show = src && !failed;
  const h = hero ? 128 : 104;
  return (
    <div style={{ height: h, marginBottom: 14, borderRadius: 3, background: 'linear-gradient(180deg, ' + CARD + ', ' + PAGE + ')', border: '1px solid ' + LSUB, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {show ? (
        <img src={src} alt={(name || 'Wardogs weapon') + ' — Wardogs weapon'} onError={() => setFailed(true)} style={{ maxWidth: '90%', maxHeight: '82%', objectFit: 'contain' }} />
      ) : (
        <div style={{ textAlign: 'center', color: AD, opacity: 0.6 }}>
          <svg width={hero ? 44 : 38} height={hero ? 44 : 38} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" style={{ display: 'block', margin: '0 auto' }}>
            <circle cx="12" cy="12" r="8.2" />
            <line x1="12" y1="0.5" x2="12" y2="4.5" /><line x1="12" y1="19.5" x2="12" y2="23.5" />
            <line x1="0.5" y1="12" x2="4.5" y2="12" /><line x1="19.5" y1="12" x2="23.5" y2="12" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          </svg>
          <div style={{ fontSize: 7.5, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, marginTop: 5 }}>IMAGE PENDING</div>
        </div>
      )}
    </div>
  );
}
