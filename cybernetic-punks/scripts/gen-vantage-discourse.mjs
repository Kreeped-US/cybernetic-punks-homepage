// scripts/gen-vantage-discourse.mjs
// ============================================================
// VANTAGE DISCOURSE-ARTICLE DRAFT GENERATOR (Phase 1). MANUAL. DRAFT-ONLY.
// ============================================================
// THIN CLI WRAPPER over lib/network/discourseGen.js (generateDiscourseDraft). The gen
// core is shared with the admin trigger route (app/api/admin/drafts/generate) so both
// paths behave identically -- this file only loads .env.local, parses argv, constructs a
// service-key Supabase client, calls the core (passing console.log / console.error so the
// original console output is preserved verbatim), and maps the result to an exit code.
//
// Reads a human-curated discourse directive from editor_directives (editor='VANTAGE',
// directive_type='discourse', status='pending'), has VANTAGE write a discourse ARTICLE
// strictly from the vetted source_text, and inserts it into feed_items as an UNPUBLISHED
// DRAFT (is_published=false, noindex=true). Then marks the directive consumed. It NEVER
// publishes and NEVER renders -- publishing is the separate approve step (with the A11 gate).
//
// RUN:  node scripts/gen-vantage-discourse.mjs            (oldest pending VANTAGE discourse directive)
//       node scripts/gen-vantage-discourse.mjs --dry      (generate + print, write NOTHING, leave directive pending)
//       node scripts/gen-vantage-discourse.mjs --id <uuid>(target one directive by id)
// Needs ANTHROPIC_API_KEY + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY --
// auto-loaded from .env.local if not already in env.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { generateDiscourseDraft } from '../lib/network/discourseGen.js';

// --- minimal .env.local loader (bare-node has no Next env injection) ----------
function loadEnvLocal() {
  var raw;
  try {
    raw = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
  } catch (e) {
    return;
  }
  var lines = raw.split('\n');
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line || line.charAt(0) === '#') continue;
    var eq = line.indexOf('=');
    if (eq === -1) continue;
    var key = line.slice(0, eq).trim();
    var val = line.slice(eq + 1).trim();
    if (val.length >= 2 && (val.charAt(0) === '"' || val.charAt(0) === "'")) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

async function main() {
  loadEnvLocal();
  var dry = process.argv.indexOf('--dry') !== -1;
  var idArg = null;
  var idIdx = process.argv.indexOf('--id');
  if (idIdx !== -1 && process.argv[idIdx + 1]) idArg = process.argv[idIdx + 1];

  var url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  var key = process.env.SUPABASE_SERVICE_KEY;
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('ERROR: ANTHROPIC_API_KEY must be set (env or .env.local).');
    process.exit(1);
  }
  if (!url || !key) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set (env or .env.local).');
    process.exit(1);
  }

  var supabase = createClient(url, key);
  var result = await generateDiscourseDraft(supabase, {
    directiveId: idArg,
    dry: dry,
    log: console.log,
    logError: console.error,
  });

  // Exit code, matching the old CLI: a real failure force-exits 1; success + informational
  // outcomes (created / skipped / dry / exists / not_found / not_pending) just RETURN and let
  // the process drain naturally, exactly as the old script did (which only ever called
  // process.exit on error branches). Forcing exit(0) mid-async would abort open sockets.
  var softCodes = ['not_found', 'not_pending'];
  var failed = !(result.ok || softCodes.indexOf(result.code) !== -1);
  if (failed) process.exit(1);
}

main();
