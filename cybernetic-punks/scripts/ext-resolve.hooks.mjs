// scripts/ext-resolve.hooks.mjs
// Node ESM resolve hook for the prompt-render harness + node --test. Two jobs, both to make modules
// that Next/webpack resolves also load under plain `node`:
//   1. EXTENSIONLESS relative imports ("./models", "./games") -> append ".js" / "/index.js".
//   2. The "@/" path alias (tsconfig/next baseUrl) -> the repo root, so modules like lib/content/
//      dedupGate.js (import "@/lib/topicTokens") are importable in tests. (2026-09-25)
// Harness/test-only; never loaded by the app runtime.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function resolve(specifier, context, nextResolve) {
  // "@/x" -> ROOT/x (try as-is, then .js, then /index.js).
  if (specifier.startsWith('@/')) {
    const base = path.join(ROOT, specifier.slice(2));
    for (const cand of [base, base + '.js', base + '/index.js']) {
      try { return await nextResolve(pathToFileURL(cand).href, context); } catch { /* try next */ }
    }
  }
  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    if (specifier.startsWith('.') && !path.extname(specifier)) {
      for (const cand of [specifier + '.js', specifier + '/index.js']) {
        try { return await nextResolve(cand, context); } catch { /* try next */ }
      }
    }
    throw err;
  }
}
