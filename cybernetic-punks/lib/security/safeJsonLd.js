// lib/security/safeJsonLd.js
// Safe serializer for JSON-LD `<script type="application/ld+json">` blocks (audit #3).
//
// JSON.stringify does NOT escape '<', so any DB/LLM-written field embedded in a schema
// (headline, description, tags, creator/player names, bios) that contains
// `</script><img src=x onerror=...>` breaks OUT of the <script> element and executes.
//
// This escapes the characters that can terminate the script context ('<', '>', '&') plus
// U+2028 / U+2029 (valid in JSON strings but illegal raw in a JS string literal / can break
// some parsers). Every replacement is a valid JSON \uXXXX escape, so the PARSED value is
// byte-for-byte unchanged -- JSON.parse(safeJsonLd(x)) deep-equals x. Drop-in for
// JSON.stringify(x) inside a dangerouslySetInnerHTML __html.

// U+2028 / U+2029 referenced by code point (never as a source-literal separator, which would
// itself terminate this line).
const LINE_SEP = String.fromCharCode(0x2028);
const PARA_SEP = String.fromCharCode(0x2029);

export function safeJsonLd(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .split(LINE_SEP).join('\\u2028')
    .split(PARA_SEP).join('\\u2029');
}
