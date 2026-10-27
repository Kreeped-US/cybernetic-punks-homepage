// scripts/convert-dmz-boss-images.mjs
// Conversion of the DMZ boss source images (loose, untracked files in public/, supplied by the operator) into the
// served set public/images/DMZ/bosses/<dossier id>-<width>.webp, the files /dmz/bosses reads (lib/dmz/bosses.js
// BOSS_IMAGE). Same settings as scripts/convert-dmz-weapon-images.mjs: widths 512 and 1024, WebP quality 82,
// aspect kept, no enlargement, no crop. Unlike the weapon cutouts these sources may be opaque photos, so alpha is
// kept only when the source has transparent pixels. The sources are never modified or moved.
//
// Run from the repo root:  node scripts/convert-dmz-boss-images.mjs
// RE-RUNNABLE: to replace an image, put the new source in public/ (update BOSS_SOURCES if its name changed) and
// run again; the outputs are overwritten under the same names, so the page needs no change. A source narrower than
// a width is not enlarged: that output keeps the source width. Prints one line per file and the byte totals, and
// exits non-zero if a source is missing or an output has unexpected dimensions or alpha.
import { mkdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

const SRC_DIR = 'public';
const OUT_DIR = 'public/images/DMZ/bosses';
const WIDTHS = [512, 1024];
const QUALITY = 82;

// Dossier id (lib/dmz/bosses.js DOSSIERS, the ones with image: true) -> source file name in public/.
export const BOSS_SOURCES = {
  tank: 'tank.webp',
};

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const totals = Object.fromEntries(WIDTHS.map((w) => [w, 0]));
  const problems = [];
  for (const [id, file] of Object.entries(BOSS_SOURCES)) {
    const src = path.join(SRC_DIR, file);
    if (!existsSync(src)) { problems.push('missing source ' + src); continue; }
    const meta = await sharp(src).metadata();
    const alpha = meta.hasAlpha && !(await sharp(src).stats()).isOpaque;
    const parts = [id + ' <- ' + file + ' ' + meta.width + 'x' + meta.height + (alpha ? ' (transparent)' : ' (opaque)')];
    for (const width of WIDTHS) {
      const out = path.join(OUT_DIR, id + '-' + width + '.webp');
      let img = sharp(src).resize({ width, withoutEnlargement: true });
      if (!alpha) img = img.removeAlpha();
      const info = await img.webp({ quality: QUALITY }).toFile(out);
      const check = await sharp(out).metadata();
      const expectW = Math.min(width, meta.width);
      const expectH = Math.round(meta.height * expectW / meta.width);
      if (check.hasAlpha !== alpha) problems.push(out + ' alpha=' + check.hasAlpha + ', expected ' + alpha);
      if (check.width !== expectW || Math.abs(check.height - expectH) > 1) problems.push(out + ' is ' + check.width + 'x' + check.height);
      totals[width] += statSync(out).size;
      parts.push(width + ': ' + info.width + 'x' + info.height + ' ' + statSync(out).size + 'B alpha=' + check.hasAlpha);
    }
    console.log(parts.join(' | '));
  }
  console.log('TOTAL ' + WIDTHS.map((w) => w + 'w ' + totals[w]).join(' | ') + ' | all ' + Object.values(totals).reduce((a, b) => a + b, 0));
  if (problems.length) { console.error('PROBLEMS:\n  ' + problems.join('\n  ')); process.exit(1); }
}

// Run only when executed directly, so the test can import BOSS_SOURCES.
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
