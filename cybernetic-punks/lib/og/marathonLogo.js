// lib/og/marathonLogo.js
// Loads the OFFICIAL Marathon wordmark (press-kit asset) for the next/og ImageResponse
// cards, mirroring the fonts loader gotcha: satori cannot fetch at render time, so the
// logo must be embedded -- we read the bundled PNG and hand it to <img> as a base64
// data URI. Used under Bungie press-kit terms; the Marathon vertical carries the
// "NOT AFFILIATED WITH BUNGIE / MARATHON IS A TRADEMARK OF BUNGIE, INC." disclaimer
// (lib/games/marathon.js footer.legal, rendered in the footer). The logo identifies the
// GAME on the card; it does NOT imply Bungie-official content (data stays honestly
// provenanced, same discipline as the Wardogs cards).
//
// NODE runtime: read with fs.readFile(URL) -- NOT fetch(new URL(...)), because Node's
// fetch does not support the file: scheme. new URL(..., import.meta.url) makes Next's
// file tracer bundle the PNG into the serverless function. Loaded once, then cached.
//
// The asset is the acid-green EN "complex" wordmark (MARATHON + degree mark +
// TAU CETI IV / DEATH IS THE FIRST STEP), which reads on-brand on the card's dark
// ground (#0e1014). Native art is 1920x650 (aspect ~2.954:1).

import { readFile } from 'node:fs/promises';

export const MARATHON_LOGO_ASPECT = 1920 / 650; // ~2.954

let _dataUri = null;

export async function loadMarathonLogo() {
  if (!_dataUri) {
    const buf = await readFile(new URL('../../public/MARATHON_LOGO_EN_COMPLEX.png', import.meta.url));
    _dataUri = 'data:image/png;base64,' + buf.toString('base64');
  }
  return _dataUri;
}
