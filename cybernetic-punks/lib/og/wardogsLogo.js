// lib/og/wardogsLogo.js
// Loads the OFFICIAL Wardogs wordmark (press-kit asset) for the next/og ImageResponse
// cards, mirroring lib/og/marathonLogo.js. satori cannot fetch at render time, so the
// logo is embedded as a base64 data URI. Used under Bulkhead/Team17 press-kit terms; the
// Wardogs vertical carries the "UNOFFICIAL FAN SITE - NOT AFFILIATED WITH OR ENDORSED BY
// BULKHEAD OR TEAM17" disclaimer (lib/games/wardogs.js footer.legal, rendered in the
// Wardogs footer). The logo identifies the GAME on the card; it does NOT imply
// Bulkhead-official content (data stays honestly provenanced, same discipline as Marathon).
//
// NODE runtime: read with fs.readFile(URL) -- NOT fetch(new URL(...)), because Node's
// fetch does not support the file: scheme. new URL(..., import.meta.url) makes Next's
// file tracer bundle the PNG into the serverless function. Loaded once, then cached.
//
// The asset is the WHITE full lockup (wolf mark + WARDOGS + TACTICAL / ALL OUT WARFARE),
// which reads on the card's dark ground (#0e1014). Native art is 2468x490 (aspect ~5.037:1).

import { readFile } from 'node:fs/promises';

export const WARDOGS_LOGO_ASPECT = 2468 / 490; // ~5.037

let _dataUri = null;

export async function loadWardogsLogo() {
  if (!_dataUri) {
    const buf = await readFile(new URL('../../public/WD_Fullmark_White.png', import.meta.url));
    _dataUri = 'data:image/png;base64,' + buf.toString('base64');
  }
  return _dataUri;
}
