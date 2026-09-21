// scripts/ext-resolve.hooks.mjs
// Node ESM resolve hook for the prompt-render harness (Stage 1). lib/editorCore.js and its deps use
// EXTENSIONLESS relative imports ("./models", "./games") that Next/webpack resolves but plain node
// ESM does not. This hook appends ".js" (then "/index.js") to an extensionless relative specifier
// that would otherwise not resolve, so the harness can import the REAL editorCore under `node`.
// Harness-only; never loaded by the app runtime.
import path from 'node:path';

export async function resolve(specifier, context, nextResolve) {
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
