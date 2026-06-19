// lib/qualityMetricsCore.mjs
// PURE compute core for the internal AI-quality MEASUREMENT layer. Zero imports /
// zero I/O so it is unit-testable bare-node (qualityMetricsCore.test.mjs) and
// shared by lib/qualityMetrics.js (which reads the tables + writes the blob).
// Mirrors how computePatterns / entitlementsDecision are pure tested cores.
//
// HONESTY (non-negotiable - the measurement must be able to report BAD NEWS):
//  - Stores RAW COUNTS, not just percentages, so "1/8 confirmed" stays visible
//    and a tiny denominator can't be smoothed away.
//  - Represents all THREE verification buckets explicitly, including the
//    currently-empty SOURCE_AGREED middle (no row has that state today).
//  - The headline share is confirmed_data_share = share of stat DATA that is
//    human-confirmed. It is NOT an accuracy claim; the field names avoid the word
//    "accuracy" on purpose (the flatter-by-construction trap).
//  - NO LLM anywhere. Counting only. Bad numbers are surfaced, never tuned away.
//
// classify(row) is injected (= lib/verification.js verificationState) so the
// 3-state rules stay single-sourced. Stale-stamp is derived purely: a non-verified
// row WITH a patch_verified stamp that still classifies UNCHECKED can only be
// stale (a current stamp would have made it SOURCE_AGREED) -- no regex needed.

function share(n, d) {
  // one decimal; null when denominator is 0 so we never fabricate a number.
  return d > 0 ? Math.round((n / d) * 1000) / 10 : null;
}

// input: { tables: [{ name, rows, hasVerifiedSource }], classify, currency, nowMs }
//   currency: [{ table_name, last_fetched }] (from wiki_meta)
export function computeQualityMetrics(input) {
  var classify = input.classify;
  var perTable = {};
  var sum = { total: 0, confirmed: 0, source_agreed: 0, unchecked: 0, stale_stamp_count: 0 };

  (input.tables || []).forEach(function (t) {
    var rows = t.rows || [];
    var confirmed = 0, sourceAgreed = 0, unchecked = 0, staleStamp = 0, confirmedWithSource = 0;
    rows.forEach(function (row) {
      var state = classify(row);
      if (state === 'CONFIRMED') {
        confirmed++;
        if (t.hasVerifiedSource && row.verified_source) confirmedWithSource++;
      } else if (state === 'SOURCE_AGREED') {
        sourceAgreed++;
      } else {
        unchecked++;
        // stale stamp: had a patch_verified but still UNCHECKED (=> stamp is stale)
        if (row.verified !== true && row.patch_verified) staleStamp++;
      }
    });
    var entry = {
      total: rows.length,
      confirmed: confirmed,
      source_agreed: sourceAgreed,      // explicit, even when 0 (empty middle bucket)
      unchecked: unchecked,
      confirmed_data_share: share(confirmed, rows.length),  // NOT "accuracy"
      stale_stamp_count: staleStamp,
      has_verified_source: !!t.hasVerifiedSource,
    };
    if (t.hasVerifiedSource) {
      entry.confirmed_with_source = confirmedWithSource;
      // of the CONFIRMED rows, how many are traceable to a source (auditability)
      entry.source_attribution_share = share(confirmedWithSource, confirmed);
    }
    perTable[t.name] = entry;

    sum.total += rows.length;
    sum.confirmed += confirmed;
    sum.source_agreed += sourceAgreed;
    sum.unchecked += unchecked;
    sum.stale_stamp_count += staleStamp;
  });

  var overall = {
    total: sum.total,
    confirmed: sum.confirmed,
    source_agreed: sum.source_agreed,   // explicit empty middle
    unchecked: sum.unchecked,
    confirmed_data_share: share(sum.confirmed, sum.total),
    stale_stamp_count: sum.stale_stamp_count,
  };

  // Data currency (coarse, table/source-level -- NOT per-claim freshness).
  var dataCurrency = (input.currency || []).map(function (c) {
    var ageHours = c.last_fetched ? Math.round((input.nowMs - new Date(c.last_fetched).getTime()) / 3600000) : null;
    return { table_name: c.table_name, last_fetched: c.last_fetched || null, age_hours: ageHours };
  });

  return {
    overall: overall,
    per_table: perTable,
    data_currency: dataCurrency,
    notes: {
      headline: 'confirmed_data_share = share of stat DATA that is human-confirmed (verified=true). NOT an article-accuracy claim.',
      source_agreed: 'SOURCE_AGREED is the middle register (sources concur, current, not human-confirmed). Shown explicitly; today it is 0 across tables.',
      data_currency: 'Coarse table/source-level currency from wiki_meta.last_fetched, NOT per-claim freshness.',
    },
  };
}
