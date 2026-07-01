// lib/og/logo.js
// Marathon wordmark logo for OG cards. SAME bundled-buffer technique as fonts.js:
// satori (next/og) cannot import an image the normal way -- it needs the raw bytes.
// We read the official transparent PNG at render time and hand satori a base64 data
// URI, which it renders as an <img>. new URL('./assets/...', import.meta.url) makes
// Next's file tracer bundle the PNG into the serverless function. Loaded once, then
// cached for the process.
//
// Returns a data URI string, or NULL if the file is unreadable -- callers fall back
// to the text tag, so a missing/renamed asset degrades gracefully (never crashes).

import { readFile } from 'node:fs/promises';

// Native pixel dimensions of the official asset (MARATHON_LOGO_EN_COMPLEX.png).
// Exposed so callers give satori explicit, undistorted width/height for a chosen height.
export const MARATHON_LOGO_W = 1920;
export const MARATHON_LOGO_H = 650;

let _logo; // undefined = not tried yet; string = data URI; null = tried + failed

export async function loadMarathonLogo() {
  if (_logo !== undefined) return _logo;
  try {
    const buf = await readFile(new URL('./assets/marathon-logo.png', import.meta.url));
    _logo = 'data:image/png;base64,' + buf.toString('base64');
  } catch (e) {
    _logo = null;
  }
  return _logo;
}
