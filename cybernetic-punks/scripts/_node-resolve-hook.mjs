// scripts/_node-resolve-hook.mjs
// ESM resolve hook so a STANDALONE node script can import the app's lib graph
// (lib/editorCore.js etc.), which uses Next-style EXTENSIONLESS + DIRECTORY imports
// ('./models', './games') that plain Node ESM does not resolve. For each relative,
// extensionless specifier it tries '<spec>.js' then '<spec>/index.js', else the
// original (a real miss still throws). Package specifiers are untouched. Read-only.
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('.') && !/\.([mc]?js|json)$/.test(spec)) {
    try { return await next(spec + '.js', ctx); } catch { /* try directory index next */ }
    try { return await next(spec + '/index.js', ctx); } catch { /* fall through to original */ }
  }
  return next(spec, ctx);
}
