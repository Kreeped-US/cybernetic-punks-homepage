// lib/og/iconMark.js
// Shared CNP icon art for app/icon.js, app/apple-icon.js, and scripts/gen-icons.mjs --
// ONE source so the runtime-generated icons and the committed static assets
// (favicon.ico, icon-192/512.png) stay identical: a burgundy (#b32d40) square with
// white Exo 2 800 letter(s). The small favicon is a single 'C'; larger marks are 'CNP'.
//
// Uses createElement (not JSX) and an explicit '.js' on the relative import so the
// bare-node generation script (scripts/gen-icons.mjs) can import this module too;
// Next resolves both forms fine.

import { createElement } from 'react';
import { OG_COLORS } from './colors.js';

// iconMark(text, px, radiusPct): radiusPct 0 = full square (apple-icon / maskable PWA),
// >0 = rounded chip (the browser favicon). Single-letter marks use a larger fill.
export function iconMark(text, px, radiusPct) {
  var single = text.length === 1;
  return createElement(
    'div',
    {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: OG_COLORS.network,
        color: '#ffffff',
        fontFamily: 'Exo 2',
        fontWeight: 800,
        fontSize: Math.round(px * (single ? 0.6 : 0.27)),
        letterSpacing: single ? '0' : '0.01em',
        borderRadius: radiusPct ? Math.round(px * radiusPct) : 0,
      },
    },
    text
  );
}
