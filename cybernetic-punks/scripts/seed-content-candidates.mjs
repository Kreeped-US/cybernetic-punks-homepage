// scripts/seed-content-candidates.mjs
// Seed a few content_candidate rows so the LOG-ONLY assignment gate (increment 1)
// has queued candidates to evaluate. Idempotent: upsert on (game_slug, entity, facet).
// Run: node scripts/seed-content-candidates.mjs
//
// This seeds TEST candidates only. It does NOT wire demand into generation -- the
// gate is log-only and these rows only exist so the [GATE-LOG] lines have something
// to report. Safe to re-run; safe to delete the rows afterwards.
//
// The four seeds are chosen to exercise all three log outcomes:
//   Destroyer / shell  -> substance ok + likely an existing shell page  => reinforce
//   Vandal   / shell   -> substance ok + likely an existing shell page  => reinforce
//   Overclock/ cradle  -> depends on verified cradle_nodes for the track => pass or gap
//   Nonexistent Widget / weapon -> no matching verified row             => gap
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_KEY in env.');
  process.exit(1);
}
const supabase = createClient(url, key);

// warrant_source='seed_reinforce' marks these as hand-seeded (not machine-warranted).
// priority is a demand ANNOTATION only -- it ranks the log pass, nothing else.
const SEEDS = [
  { game_slug: 'marathon', entity: 'Destroyer',          facet: 'shell',  warrant_source: 'seed_reinforce', priority: 10 },
  { game_slug: 'marathon', entity: 'Vandal',             facet: 'shell',  warrant_source: 'seed_reinforce', priority: 5  },
  { game_slug: 'marathon', entity: 'Overclock',          facet: 'cradle', warrant_source: 'seed_reinforce', priority: 3  },
  { game_slug: 'marathon', entity: 'Nonexistent Widget', facet: 'weapon', warrant_source: 'seed_reinforce', priority: 1  },
];

const rows = SEEDS.map((s) => ({ ...s, status: 'queued', disposition: 'new' }));

const { data, error } = await supabase
  .from('content_candidate')
  .upsert(rows, { onConflict: 'game_slug,entity,facet' })
  .select('id, entity, facet, status, priority');

if (error) {
  console.error('seed failed:', error.message);
  process.exit(1);
}

console.log('Seeded ' + data.length + ' content_candidate rows (status=queued):');
for (const r of data) {
  console.log('  [p' + r.priority + '] ' + r.entity + ' / ' + r.facet + '  ' + r.id);
}
console.log('\nNow trigger the cron (or wait for the daily run) and grep the logs for [GATE-LOG].');
