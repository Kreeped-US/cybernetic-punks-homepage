// lib/og/cnpLogo.js
// Loads the CNP logo (public/cnp-512.png -- our own brand mark, no IP concern) for the
// next/og ImageResponse cards, mirroring lib/og/{marathonLogo,wardogsLogo}.js. satori
// cannot fetch at render time, so the logo is embedded as a base64 data URI. Used by the
// bespoke network brand card (app/opengraph-image.js). The shared Card (lib/og/card.js)
// has its own sync reader for the same file so it can stay synchronous.
//
// NODE runtime: read with fs.readFile(URL) -- NOT fetch(new URL(...)); Node's fetch does
// not support the file: scheme. new URL(..., import.meta.url) makes Next's file tracer
// bundle the PNG into the serverless function. Loaded once, then cached.

import { readFile } from 'node:fs/promises';

let _dataUri = null;

export async function loadCnpLogo() {
  if (!_dataUri) {
    const buf = await readFile(new URL('../../public/cnp-512.png', import.meta.url));
    _dataUri = 'data:image/png;base64,' + buf.toString('base64');
  }
  return _dataUri;
}
