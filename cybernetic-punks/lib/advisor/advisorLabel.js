// lib/advisor/advisorLabel.js
// Brief 293: the confidence label for a LIVE Advisor result. Runs the SAME loadBuildLabel the stored
// build pages use (lib/marathon/buildLabel.js), on the build generateBuild just returned, so the Advisor
// result and the static pages can never compute it differently. Returns the /api/advisor response body:
//   { build, label }   label = { tier, verified, total, checkedOn } or null.
// FAIL CLOSED: when the label cannot be computed (a lookup failed, or the build names no parts) the label
// is null -- never a default "Unconfirmed" -- and the reason is logged. Never throws, so a label problem
// cannot turn a generated build into an error.

import { loadBuildLabel, labelNames } from '../marathon/buildLabel.js';

function namesAnyPart(build) {
  var names = labelNames(build);
  return Object.keys(names).some(function (k) { return names[k].length > 0; });
}

export async function withBuildLabel(supabase, build, opts) {
  var o = opts || {};
  var log = o.log || console.error;
  var label = null;
  try {
    label = await loadBuildLabel(supabase, build, o.now || new Date());
  } catch (e) {
    label = null; // loadBuildLabel already catches; this is belt and braces
  }
  if (!label) {
    var reason = namesAnyPart(build) ? 'part lookup failed' : 'build names no parts';
    log('[advisor] build label not computed (' + reason + '); result shown without a label');
  }
  return { build: build, label: label || null };
}
