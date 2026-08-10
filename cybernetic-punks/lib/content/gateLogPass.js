// lib/content/gateLogPass.js
// The LOG-ONLY pass that rides the generation cron. Reads QUEUED content_candidate
// rows and, for each, runs the assignment gate and LOGS what it WOULD decide. It
// writes NOTHING and feeds NOTHING into generation -- a pure observability probe,
// exactly like the pre-publish gate shipped log-only first.
// See docs/CONTENT_PIPELINE_ARCHITECTURE.md build-order step 1.

import { runAssignmentGate } from './assignmentGate.js';

// Cap the pass so a large queue can't blow up a cron cycle. Log-only; a partial
// pass is fine (the rest are picked up next cycle when this becomes real).
export var GATE_LOG_PASS_LIMIT = 50;

// PURE formatter for the novelty portion of the log line (increment 1b + 1c + 1d-observe).
// Three shapes, decision-neutral (this only renders what checkNovelty returned):
//   dup crosses threshold      -> 'dup:<slug>@<jaccard>'
//   new WITH a near-miss       -> 'new(near:<slug>@<jaccard>,cov=<coverage>,phrase=<yes|no|na>,shared=<n>)'
//                                 jaccard = symmetric score; cov = asymmetric containment (1c);
//                                 phrase = does the candidate bigram appear contiguously in the page
//                                 (1d-observe): yes|no, or na when the candidate has no bigram.
//   new with nothing to compare-> 'new'   (too-few-tokens / empty corpus)
export function formatNovelty(nov) {
  if (nov && nov.isDup) {
    return 'dup:' + nov.dupSlug + '@' + (typeof nov.score === 'number' ? nov.score.toFixed(2) : '?');
  }
  if (nov && nov.nearSlug && typeof nov.nearScore === 'number') {
    var cov = typeof nov.nearCoverage === 'number' ? nov.nearCoverage.toFixed(2) : '?';
    var phrase = nov.nearPhrase === true ? 'yes' : (nov.nearPhrase === false ? 'no' : 'na');
    return 'new(near:' + nov.nearSlug + '@' + nov.nearScore.toFixed(2) +
      ',cov=' + cov + ',phrase=' + phrase + ',shared=' + nov.nearShared + ')';
  }
  return 'new';
}

// Guarded + side-effect-free (no writes). Never throws into the cron (its own
// try/catch; the caller also wraps it). Returns a small summary for the cron JSON.
export async function runGateLogPass(supabase, config) {
  var gameSlug = (config && config.slug) || 'marathon';
  var summary = { ran: true, considered: 0, pass: 0, reinforce: 0, gap: 0, errors: 0 };
  try {
    var { data, error } = await supabase
      .from('content_candidate')
      .select('id, game_slug, entity, facet, priority')
      .eq('game_slug', gameSlug)
      .eq('status', 'queued')
      .order('priority', { ascending: false })
      .limit(GATE_LOG_PASS_LIMIT);
    if (error) {
      // Table absent (DDL not yet applied) or a transient read error: log and bow
      // out. The gate is log-only, so this is a no-op, not a failure.
      console.log('[GATE-LOG] queued-candidate read failed (non-fatal): ' + error.message);
      return { ran: false, reason: 'read-error' };
    }
    if (!data || data.length === 0) {
      console.log('[GATE-LOG] no queued content_candidate rows for ' + gameSlug + ' -- log pass idle');
      return summary;
    }
    for (var i = 0; i < data.length; i++) {
      var cand = data[i];
      summary.considered++;
      try {
        var res = await runAssignmentGate(
          { game_slug: cand.game_slug, entity: cand.entity, facet: cand.facet },
          supabase, config
        );
        if (res.decision === 'pass') summary.pass++;
        else if (res.decision === 'reinforce') summary.reinforce++;
        else if (res.decision === 'gap') summary.gap++;

        // Structured, greppable, LOG-ONLY line -- the whole product of increment 1:
        // what the gate WOULD decide, acting on nothing. novelty rendering (incl.
        // the 1b near-miss score) is factored into formatNovelty for testability.
        var nov = formatNovelty(res.novelty);
        console.log('[GATE-LOG] ' +
          'game=' + cand.game_slug +
          ' entity="' + cand.entity + '"' +
          ' facet=' + cand.facet +
          ' decision=' + res.decision +
          ' substance=' + res.substance.verifiedCount + '/' + res.substance.threshold +
            '(' + (res.substance.passes ? 'ok' : 'under') + (res.substance.reason ? ',' + res.substance.reason : '') + ')' +
          ' novelty=' + nov +
          ' cannib=' + (res.cannibalization.ran ? 'ran' : 'deferred') +
          ' [LOG-ONLY: no action taken]');
      } catch (perErr) {
        summary.errors++;
        console.log('[GATE-LOG] candidate ' + (cand && cand.id) + ' gate error (non-fatal): ' + (perErr && perErr.message));
      }
    }
    console.log('[GATE-LOG] pass complete: considered=' + summary.considered +
      ' pass=' + summary.pass + ' reinforce=' + summary.reinforce +
      ' gap=' + summary.gap + ' errors=' + summary.errors);
    return summary;
  } catch (err) {
    console.log('[GATE-LOG] log pass failed (non-fatal): ' + (err && err.message));
    return { ran: false, reason: 'exception' };
  }
}
