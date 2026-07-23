// scripts/gsc-write-env.mjs
// ============================================================
// WRITE THE GSC ENV LINES FROM THE SERVICE-ACCOUNT JSON. ONE-OFF, IDEMPOTENT.
// ============================================================
// The manual paste kept failing, and the measured shape said why: 89 chars, 1 REAL
// newline, 0 literal \n -- i.e. the key was pasted MULTI-LINE (a JSON viewer rendered
// the \n escapes as real line breaks) and the line-by-line .env loader captured only
// the first physical line. No amount of care fixes that reliably by hand, so this
// removes the hand-copy from the loop entirely: the key goes JSON -> file with the
// newline escaping done in code.
//
// RUN:  node scripts/gsc-write-env.mjs "C:/path/to/service-account.json"
//
// SAFETY PROPERTIES:
//  - NEVER prints key material. Reports SHAPE FACTS ONLY (length, hasBEGIN, hasEND,
//    literal-\n count) -- the same rule lib/gsc/searchAnalytics.js follows, because a
//    key echoed into a terminal is a key in scrollback.
//  - Preserves every other line of .env.local BYTE-FOR-BYTE, including its CRLF
//    endings, and asserts afterwards that no unrelated line changed.
//  - Backs up .env.local first (the backup matches .gitignore's .env* so it cannot be
//    committed; delete it once the run is confirmed).
//  - REFUSES to run on an absent or implausibly short private_key.

import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';

var MIN_KEY_CHARS = 1000;

var jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('USAGE: node scripts/gsc-write-env.mjs <path-to-service-account.json>');
  process.exit(1);
}
if (!existsSync(jsonPath)) {
  console.error('FATAL: no file at: ' + jsonPath);
  process.exit(1);
}

// ── READ + VALIDATE THE JSON ─────────────────────────────────────────────────
var sa;
try {
  sa = JSON.parse(readFileSync(jsonPath, 'utf8'));
} catch (e) {
  console.error('FATAL: could not parse JSON: ' + e.message);
  process.exit(1);
}

var email = sa.client_email;
var key = sa.private_key;

if (!email) {
  console.error('FATAL: JSON has no client_email -- is this a service-account key file?');
  process.exit(1);
}
if (!key) {
  console.error('FATAL: JSON has no private_key -- is this a service-account key file?');
  process.exit(1);
}
if (key.length < MIN_KEY_CHARS) {
  console.error('FATAL: private_key is only ' + key.length + ' chars (expected ~1700). ' +
    'REFUSING to write a truncated key. Shape: hasBEGIN=' +
    (key.indexOf('-----BEGIN PRIVATE KEY-----') === 0) +
    ' hasEND=' + /-----END PRIVATE KEY-----\s*$/.test(key.trim()));
  process.exit(1);
}

// Escape REAL newlines back to literal \n so the value survives a line-based .env
// reader. This is the exact inverse of the normalization in searchAnalytics.js.
var escaped = key.replace(/\r\n/g, '\n').replace(/\n/g, '\\n');

// ── REWRITE .env.local, PRESERVING EVERYTHING ELSE ───────────────────────────
var envUrl = new URL('../.env.local', import.meta.url);
var envPath = envUrl.pathname.replace(/^\//, '');
var raw = existsSync(envUrl) ? readFileSync(envUrl, 'utf8') : '';

if (raw) {
  copyFileSync(envUrl, envPath + '.bak');
}

// Split on '\n' only, so any '\r' stays attached to its line and untouched lines are
// reproduced byte-for-byte on rejoin.
var lines = raw.length ? raw.split('\n') : [];
var usesCRLF = raw.indexOf('\r\n') !== -1;
var cr = usesCRLF ? '\r' : '';

var targets = {
  GSC_CLIENT_EMAIL: email.trim(),
  GSC_PRIVATE_KEY: '"' + escaped + '"',
};

var replaced = { GSC_CLIENT_EMAIL: false, GSC_PRIVATE_KEY: false };
var untouchedBefore = [];
var untouchedAfter = [];

for (var i = 0; i < lines.length; i++) {
  var bare = lines[i].replace(/\r$/, '');
  var name = null;
  for (var k in targets) {
    if (bare.indexOf(k + '=') === 0) name = k;
  }
  if (name) {
    lines[i] = name + '=' + targets[name] + cr;
    replaced[name] = true;
  } else {
    untouchedBefore.push(bare);
  }
}

// Append any that were not already present. Guard against a file that does not end in
// a newline (which would otherwise glue the new var onto the last existing line).
for (var k2 in targets) {
  if (!replaced[k2]) {
    if (lines.length && lines[lines.length - 1].replace(/\r$/, '') === '') {
      lines[lines.length - 1] = k2 + '=' + targets[k2] + cr;
      lines.push('');
    } else {
      lines.push(k2 + '=' + targets[k2] + cr);
      lines.push('');
    }
  }
}

var out = lines.join('\n');
writeFileSync(envUrl, out, 'utf8');

// ── ASSERT: no unrelated line changed ────────────────────────────────────────
var after = readFileSync(envUrl, 'utf8').split('\n');
for (var j = 0; j < after.length; j++) {
  var b = after[j].replace(/\r$/, '');
  var isTarget = false;
  for (var k3 in targets) { if (b.indexOf(k3 + '=') === 0) isTarget = true; }
  if (!isTarget) untouchedAfter.push(b);
}
var preserved =
  untouchedBefore.length === untouchedAfter.length &&
  untouchedBefore.every(function (v, idx) { return v === untouchedAfter[idx]; });

// ── REPORT: SHAPE FACTS ONLY ─────────────────────────────────────────────────
console.log('=== WROTE GSC ENV LINES (no key material printed) ===');
console.log('  source JSON:            ' + jsonPath);
console.log('  client_email set:       yes (' + email.trim().length + ' chars)');
console.log('');
console.log('  private_key from JSON:  ' + key.length + ' chars');
console.log('  written value length:   ' + escaped.length + ' chars (escaped, excl. quotes)');
console.log('  hasBEGIN:               ' + (key.indexOf('-----BEGIN PRIVATE KEY-----') === 0));
console.log('  hasEND:                 ' + /-----END PRIVATE KEY-----\s*$/.test(key.trim()));
console.log('  literal \\n written:     ' + (escaped.match(/\\n/g) || []).length);
console.log('  real newlines written:  ' + (escaped.match(/\n/g) || []).length + '   (must be 0)');
console.log('');
console.log('  GSC_CLIENT_EMAIL:       ' + (replaced.GSC_CLIENT_EMAIL ? 'replaced existing line' : 'appended'));
console.log('  GSC_PRIVATE_KEY:        ' + (replaced.GSC_PRIVATE_KEY ? 'replaced existing line' : 'appended'));
console.log('  other lines preserved:  ' + preserved + '   (' + untouchedBefore.length + ' lines)');
console.log('  backup written:         ' + (raw ? '.env.local.bak (gitignored -- delete once confirmed)' : 'n/a (no prior file)'));
console.log('');
console.log('Next: node scripts/gsc-dry-run.mjs');
