// app/apple-icon.js
// Code-generated apple-touch icon: full 'CNP' (burgundy, white Exo 2) at 180x180.
// File convention -> auto-wires <link rel="apple-touch-icon">. Full-bleed square (no
// rounding) -- iOS applies its own rounded mask, so transparent corners are avoided.

import { ImageResponse } from 'next/og';
import { iconMark } from '@/lib/og/iconMark';
import { loadExo2 } from '@/lib/og/fonts';

export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default async function AppleIcon() {
  const fonts = await loadExo2();
  return new ImageResponse(iconMark('CNP', 180, 0), { ...size, fonts });
}
