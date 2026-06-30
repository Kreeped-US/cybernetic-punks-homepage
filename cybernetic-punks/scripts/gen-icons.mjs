// scripts/gen-icons.mjs
// ONE-TIME generator for the STATIC icon assets that need stable, absolute, committed
// URLs -- which ImageResponse cannot emit as fixed files: the manifest PWA icons
// (/icon-192.png, /icon-512.png), the JSON-LD Organization logo (app/page.js -> the
// absolute /icon-512.png), and the legacy favicon.ico (ImageResponse outputs PNG, never
// .ico). Reuses the SAME art (lib/og/iconMark.js) + bundled Exo 2 (lib/og/fonts.js) as
// the runtime icons (app/icon.js, app/apple-icon.js), so every mark is one source.
//
// Produces (committed to the repo):
//   public/icon-192.png  -- 'CNP' 192x192 (PWA + maskable-safe)
//   public/icon-512.png  -- 'CNP' 512x512 (PWA + maskable + JSON-LD logo)
//   app/favicon.ico      -- 'C' multi-size .ico (16/32/48)
//
// This is a BUILD/GENERATION tool, NOT part of the runtime/deploy path. Re-run after a
// brand change:   node scripts/gen-icons.mjs   (needs the png-to-ico devDependency)

// Script uses the standalone @vercel/og (a devDependency) because next/og is a
// bundler-only subpath, not importable from a bare-node script. Same ImageResponse;
// the runtime icon routes still import next/og.
import { ImageResponse } from '@vercel/og';
import { writeFile } from 'node:fs/promises';
import pngToIco from 'png-to-ico';
import { iconMark } from '../lib/og/iconMark.js';
import { loadExo2 } from '../lib/og/fonts.js';

const fonts = await loadExo2();

async function renderPng(text, px, radiusPct) {
  const img = new ImageResponse(iconMark(text, px, radiusPct), { width: px, height: px, fonts });
  return Buffer.from(await img.arrayBuffer());
}

// PWA icons + JSON-LD logo: full-square 'CNP' (maskable-safe center), 192 + 512.
await writeFile('public/icon-192.png', await renderPng('CNP', 192, 0));
await writeFile('public/icon-512.png', await renderPng('CNP', 512, 0));

// favicon.ico: rounded 'C' at 16/32/48 -> one multi-size .ico.
const ico = await pngToIco([
  await renderPng('C', 16, 0.2),
  await renderPng('C', 32, 0.2),
  await renderPng('C', 48, 0.2),
]);
await writeFile('app/favicon.ico', ico);

console.log('Generated: public/icon-192.png, public/icon-512.png, app/favicon.ico');
