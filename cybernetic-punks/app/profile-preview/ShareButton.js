'use client';
// app/profile-preview/ShareButton.js
// MOCK share affordance. Presents the action only -- real share-image generation
// is NOT wired (explicitly out of scope). Client component for the click state.

import { useState } from 'react';
import { brand } from './brand';

export default function ShareButton() {
  var [clicked, setClicked] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <button
        onClick={function() { setClicked(true); }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 18px',
          background: brand.dmz, color: '#0a0c10',
          border: 'none', borderRadius: 3,
          fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: 'inherit',
        }}
      >
        Share card
      </button>
      {clicked && (
        <span style={{ fontSize: 12, color: brand.textDim }}>
          Mock affordance — image export not wired yet.
        </span>
      )}
    </div>
  );
}
