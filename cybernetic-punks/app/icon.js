// app/icon.js
// Code-generated browser favicon: a single 'C' (burgundy, white Exo 2), rounded chip.
// File convention -> auto-wires <link rel="icon" type="image/png">. Node runtime, reuses
// the OG build's bundled Exo 2 loader + the shared icon art. Single 48px source (browsers
// downscale to 16/32). The legacy /favicon.ico is the static .ico from scripts/gen-icons.mjs.

import { ImageResponse } from 'next/og';
import { iconMark } from '@/lib/og/iconMark';
import { loadExo2 } from '@/lib/og/fonts';

export const runtime = 'nodejs';
export const size = { width: 48, height: 48 };
export const contentType = 'image/png';

export default async function Icon() {
  const fonts = await loadExo2();
  return new ImageResponse(iconMark('C', 48, 0.2), { ...size, fonts });
}
