// app/manifest.js
// File-convention web manifest -> served at /manifest.webmanifest, auto-linked in <head>.
// PWA icons point at STATIC public/ PNGs (stable absolute URLs): the refreshed
// public/icon-192.png + the new public/cnp-512.png mark (scripts/gen-icons.mjs is
// retired; these are now hand-authored). theme_color = network burgundy,
// background_color = the dark site bg (globals.css --bg-page).

import { NETWORK_BURGUNDY, BG_PAGE } from '@/lib/brandColors';

export default function manifest() {
  return {
    name: 'Cybernetic Punks',
    short_name: 'Cybernetic Punks',
    description: 'The competitive-shooter intelligence network.',
    start_url: '/',
    display: 'standalone',
    theme_color: NETWORK_BURGUNDY,
    background_color: BG_PAGE,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/cnp-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/cnp-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
