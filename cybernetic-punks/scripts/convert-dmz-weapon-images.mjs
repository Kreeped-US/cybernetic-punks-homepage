// scripts/convert-dmz-weapon-images.mjs
// One-off conversion of the DMZ weapon source images (loose, untracked WebP files in public/, supplied by the
// operator) into the served set public/images/DMZ/weapons/<slug>-<width>.webp. Widths 512 and 1024, WebP
// quality 82, alpha PRESERVED (the sources are transparent cutouts; the page draws the backdrop in CSS), aspect
// kept, no enlargement, no crop. The sources are never modified or moved.
//
// Run from the repo root:  node scripts/convert-dmz-weapon-images.mjs
// Re-running overwrites the outputs with identical settings. Prints one line per file and the byte totals, and
// exits non-zero if a source is missing or an output lacks an alpha channel or has unexpected dimensions.
import { mkdirSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const SRC_DIR = 'public';
const OUT_DIR = 'public/images/DMZ/weapons';
const WIDTHS = [512, 1024];
const QUALITY = 82;

// The 33 weapon slugs (dmz_weapons.slug). A source file is <slug>.webp unless SOURCE_ALIASES names it.
export const WEAPON_SLUGS = [
  'han-86', 'm4', 'hyeon-burst', 'patriot-xmr', 'kastov-762', 'oden', 'axion', 'cronen-squall',
  'iso-nightshade', 'vel-46', 'wz-55-striga', 'ppsh-41', 'x-58-nyx', 'rezi-12', 'warlord',
  'finn-lmg', 'type-73', 'apoc-338', 'mar-9', 'oris-8-6', 'mosin-nagant', 'kg-7-vulcan', 'astaroth-57', 'signal-50',
  'sang-9mm', 'krait-p68', '50-gs', 'mojave-357', 'pila', 'rpg-8', 'jokr', 'pm-40-anvil', 'fss-carbon-edge-1095',
];

// Source file names that are spelled differently from the slug (input side only; outputs use the slug).
export const SOURCE_ALIASES = { 'mosin-nagant': 'moisin-nagant', 'oris-8-6': 'oris-86', 'patriot-xmr': 'patrion-xmr' };

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const totals = Object.fromEntries(WIDTHS.map((w) => [w, 0]));
  const problems = [];
  for (const slug of WEAPON_SLUGS) {
    const src = path.join(SRC_DIR, (SOURCE_ALIASES[slug] || slug) + '.webp');
    if (!existsSync(src)) { problems.push('missing source ' + src); continue; }
    const meta = await sharp(src).metadata();
    const parts = [slug + ' <- ' + path.basename(src) + ' ' + meta.width + 'x' + meta.height];
    for (const width of WIDTHS) {
      const out = path.join(OUT_DIR, slug + '-' + width + '.webp');
      const info = await sharp(src).resize({ width, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out);
      const check = await sharp(out).metadata();
      const expectH = Math.round(meta.height * Math.min(width, meta.width) / meta.width);
      if (!check.hasAlpha) problems.push(out + ' has no alpha channel');
      if (check.width !== Math.min(width, meta.width) || Math.abs(check.height - expectH) > 1) problems.push(out + ' is ' + check.width + 'x' + check.height);
      totals[width] += statSync(out).size;
      parts.push(width + ': ' + info.width + 'x' + info.height + ' ' + statSync(out).size + 'B alpha=' + check.hasAlpha);
    }
    console.log(parts.join(' | '));
  }
  console.log('TOTAL ' + WIDTHS.map((w) => w + 'w ' + totals[w]).join(' | ') + ' | all ' + Object.values(totals).reduce((a, b) => a + b, 0));
  if (problems.length) { console.error('PROBLEMS:\n  ' + problems.join('\n  ')); process.exit(1); }
}

main();
