// lib/og/fonts.js
// Shared Exo 2 loader for the next/og ImageResponse cards.
//
// THE GOTCHA: ImageResponse (satori) does NOT use CSS / next/font -- fonts must be
// passed as binary buffers via the `fonts` option, or text falls back to a default
// face. So we BUNDLE the static Exo 2 TTFs (OFL-licensed, from Google Fonts; see
// ./fonts/OFL.txt) in lib/og/fonts/ and read them at render time. We do NOT fetch
// Google Fonts at runtime (fragile: network dependency, CSS parsing, rate limits).
//
// NODE runtime: read with fs.readFile(URL) -- NOT fetch(new URL(...)), because Node's
// fetch does not support the file: scheme (fetch(new URL) is the EDGE-runtime pattern).
// new URL('./fonts/x.ttf', import.meta.url) makes Next's file tracer bundle the .ttf
// into the serverless function. Loaded once, then cached for the process.

import { readFile } from 'node:fs/promises';

let _fonts = null;

export async function loadExo2() {
  if (!_fonts) {
    const [extraBold, bold] = await Promise.all([
      readFile(new URL('./fonts/Exo2-ExtraBold.ttf', import.meta.url)),
      readFile(new URL('./fonts/Exo2-Bold.ttf', import.meta.url)),
    ]);
    _fonts = [
      { name: 'Exo 2', data: extraBold, weight: 800, style: 'normal' },
      { name: 'Exo 2', data: bold, weight: 700, style: 'normal' },
    ];
  }
  return _fonts;
}
