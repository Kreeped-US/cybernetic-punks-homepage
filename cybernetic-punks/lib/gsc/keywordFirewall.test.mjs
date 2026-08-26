// lib/gsc/keywordFirewall.test.mjs
// STAGE 5 / Fable ruling 3: the KEYWORD FIREWALL, made a CI assertion.
// The GSC keyword-REVIEW namespace (lib/gsc/reviewList.js + the /gsc-review admin surface)
// must NEVER be imported by the editor-GENERATION path -- the prompt/context builders that
// feed the model. A review keyword reaching generation would let editors write TO the SEO
// review list, laundering targets into content; the review list is an admin/analysis
// surface only. This test FAILS the build if any generation file imports that namespace,
// and it PROVES it catches a violation (a planted bad import) so the assertion is not a
// pass-only no-op. Run: node --test lib/gsc/keywordFirewall.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// The forbidden namespace: the keyword-review list module + the admin review route surface.
// Matched ONLY inside an import/require module specifier (a quoted path on an import line) --
// never against a comment that merely names it.
const FORBIDDEN = ['reviewList', 'gsc-review'];

// Return the forbidden specifier a source imports, or null. Scans import/export-from and
// dynamic import()/require() lines only; skips comments so naming the module in prose is fine.
export function forbiddenReviewImport(src) {
  for (const raw of String(src).split('\n')) {
    const line = raw.trim();
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) continue;
    const isImport =
      /^import\b/.test(line) ||
      (/^export\b/.test(line) && /\bfrom\b/.test(line)) ||
      /\bimport\s*\(/.test(line) ||
      /\brequire\s*\(/.test(line);
    if (!isImport) continue;
    const specifiers = [...line.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
    for (const spec of specifiers) {
      for (const f of FORBIDDEN) if (spec.includes(f)) return f;
    }
  }
  return null;
}

// The editor-GENERATION context files: editorCore (prompts), every gather module (prompt/
// context data, recursively -- includes patchnotes adapters), and the standalone gen-*
// generators. These are exactly the files whose output becomes model input.
const libGather = new URL('../gather/', import.meta.url);
const scriptsDir = new URL('../../scripts/', import.meta.url);
function genFiles() {
  const files = [new URL('../editorCore.js', import.meta.url)];
  for (const rel of readdirSync(libGather, { recursive: true })) {
    if (String(rel).endsWith('.js') && !String(rel).endsWith('.test.js')) files.push(new URL('../gather/' + String(rel).replace(/\\/g, '/'), import.meta.url));
  }
  for (const f of readdirSync(scriptsDir)) {
    if (/^gen-.*\.mjs$/.test(f)) files.push(new URL('../../scripts/' + f, import.meta.url));
  }
  return files;
}

test('keyword firewall: no editor-generation file imports the GSC review namespace', () => {
  const offenders = [];
  for (const url of genFiles()) {
    const hit = forbiddenReviewImport(readFileSync(url, 'utf8'));
    if (hit) offenders.push(url.pathname.split('/').slice(-2).join('/') + ' -> ' + hit);
  }
  assert.deepEqual(offenders, [], 'generation files must not import the review namespace: ' + offenders.join('; '));
});

test('keyword firewall assertion CATCHES a planted violation (fail-on-violation proof)', () => {
  // A planted bad import is flagged...
  assert.equal(
    forbiddenReviewImport("import { keywordReviewList } from '@/lib/gsc/reviewList';\nconst x = 1;"),
    'reviewList',
    'a real import of the review list MUST be flagged',
  );
  assert.equal(
    forbiddenReviewImport("const r = await import('../gsc/reviewList.js');"),
    'reviewList',
    'a dynamic import of the review list MUST be flagged',
  );
  // ...but a comment that merely NAMES the module is NOT a violation (no false positive).
  assert.equal(
    forbiddenReviewImport("// never import from lib/gsc/reviewList here\nimport { GAMES } from '@/lib/games';"),
    null,
    'a comment mentioning the review namespace must NOT be flagged',
  );
});
