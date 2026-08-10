// scripts/seed-content-candidates.mjs
// Seed a few content_candidate rows so the LOG-ONLY assignment gate (increment 1)
// has queued candidates to evaluate. Idempotent: upsert on (game_slug, entity, facet).
// Run: node scripts/seed-content-candidates.mjs
//
// This seeds TEST candidates only. It does NOT wire demand into generation -- the
// gate is log-only and these rows only exist so the [GATE-LOG] lines have something
// to report. Safe to re-run; safe to delete the rows afterwards.
//
// SEED SET (increment 1 + the 1c/1d coverage-observation additions). Chosen against
// the REAL recent-500 feed_items window so the near-matches are genuine, and to
// reveal the FULL coverage distribution -- the 1.00s, the partial (~0.67), the
// genuine-new (no near), AND the flagged 2-token FALSE-POSITIVE (cov=1.00 on an
// unrelated page). Expected novelty outcomes (validated against the corpus):
//   Destroyer / shell        -> cov~1.00, real Destroyer-shell page   (TRUE reinforce)
//   Vandal    / shell        -> cov~1.00, real Vandal-shell page      (TRUE reinforce)
//   Recon     / shell        -> cov~1.00, real Recon-shell page       (TRUE reinforce)
//   Assassin  / shell        -> cov~1.00, real Assassin-shell page    (TRUE reinforce)
//   Recon Stealth / shell    -> cov~0.67, 2 of 3 tokens covered       (PARTIAL)
//   Squad     / ranked       -> cov~1.00 on a TRIAGE page             (FALSE-POSITIVE - generic tokens)
//   Extraction/ build        -> cov~1.00 on a THIEF page              (FALSE-POSITIVE - generic tokens)
//   Sentinel  / weapon       -> no near-match                          (GENUINE NEW)
//   Overclock / cradle       -> no near-match (+ substance gap)        (GENUINE NEW / gap)
//   Nonexistent Widget/weapon-> no near-match (+ substance gap)        (GENUINE NEW / gap)
// The false-positives are the point: they show cov=1.00 alone is NOT a safe
// reinforce signal for short generic candidates -- data for the 1d threshold call.
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
  // -- original increment-1 seeds (kept; idempotent) --
  { game_slug: 'marathon', entity: 'Destroyer',          facet: 'shell',  warrant_source: 'seed_reinforce', priority: 10 },
  { game_slug: 'marathon', entity: 'Vandal',             facet: 'shell',  warrant_source: 'seed_reinforce', priority: 9  },
  { game_slug: 'marathon', entity: 'Overclock',          facet: 'cradle', warrant_source: 'seed_reinforce', priority: 3  },
  { game_slug: 'marathon', entity: 'Nonexistent Widget', facet: 'weapon', warrant_source: 'seed_reinforce', priority: 1  },
  // -- 1c/1d coverage-observation additions (validated against the real corpus) --
  { game_slug: 'marathon', entity: 'Recon',              facet: 'shell',  warrant_source: 'seed_reinforce', priority: 8  }, // TRUE reinforce  cov~1.00
  { game_slug: 'marathon', entity: 'Assassin',           facet: 'shell',  warrant_source: 'seed_reinforce', priority: 7  }, // TRUE reinforce  cov~1.00
  { game_slug: 'marathon', entity: 'Recon Stealth',      facet: 'shell',  warrant_source: 'seed_reinforce', priority: 6  }, // PARTIAL         cov~0.67
  { game_slug: 'marathon', entity: 'Squad',              facet: 'ranked', warrant_source: 'seed_reinforce', priority: 5  }, // FALSE-POSITIVE  cov~1.00 (unrelated page)
  { game_slug: 'marathon', entity: 'Extraction',         facet: 'build',  warrant_source: 'seed_reinforce', priority: 4  }, // FALSE-POSITIVE  cov~1.00 (unrelated page)
  { game_slug: 'marathon', entity: 'Sentinel',           facet: 'weapon', warrant_source: 'seed_reinforce', priority: 2  }, // GENUINE NEW     no near-match
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
