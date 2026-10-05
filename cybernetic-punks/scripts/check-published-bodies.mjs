// scripts/check-published-bodies.mjs
// READ-ONLY sweep: runs the body integrity checker (lib/content/bodyIntegrity.js) over EVERY published
// feed_items row, all games, and prints id / game / slug / problems for each row that fails. Writes
// nothing. Service key required (reads the same rows the site serves, plus any not anon-readable).
//
// USAGE:
//   node scripts/check-published-bodies.mjs            (all published rows)
//   node scripts/check-published-bodies.mjs --game wardogs
// Exit code: 0 when every row passes, 1 when any row fails or the read errors.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { checkBodyIntegrity } from '../lib/content/bodyIntegrity.js';

// Load .env.local into process.env (only fills what is not already set) -- mirrors publish-drafts.mjs.
function ensureEnv() {
  if (process.env.SUPABASE_SERVICE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) return;
  let raw;
  try { raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8'); } catch (e) { return; }
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    const val = m[2].replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

async function main() {
  ensureEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).');
    process.exit(1);
  }
  const game = argValue('--game');
  const supabase = createClient(url, key);

  let rows = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from('feed_items').select('id, game_slug, slug, headline, body')
      .eq('is_published', true).order('created_at', { ascending: true }).range(from, from + 999);
    if (game) q = q.eq('game_slug', game);
    const { data, error } = await q;
    if (error) {
      console.error('ERROR reading feed_items: ' + error.message);
      process.exit(1);
    }
    rows = rows.concat(data || []);
    if (!data || data.length < 1000) break;
  }

  let failed = 0;
  for (const r of rows) {
    const res = checkBodyIntegrity({ headline: r.headline, body: r.body });
    if (res.ok) continue;
    failed++;
    console.log(r.id + '  ' + r.game_slug + '  ' + r.slug);
    for (const p of res.problems) console.log('    ' + p.code + ': ' + p.message + (p.detail ? '  [' + String(p.detail).replace(/\s+/g, ' ') + ']' : ''));
  }
  console.log('\nchecked ' + rows.length + ' published row(s)' + (game ? ' (game=' + game + ')' : ' (all games)') + ' -- ' + failed + ' with problems.');
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
