import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Gate 4 for image alt text (2026-07-20). eslint-config-next/core-web-vitals
  // ships jsx-a11y/alt-text as a WARNING, which a missing-alt <img> can merge
  // past. Elevated to ERROR so it hard-fails. The site currently has ZERO missing
  // alt (measured by rendering 45 pages across every type; alt is derived at
  // render from entity name or article headline, never stored), so this is a
  // ratchet to keep it that way -- not a fix for existing violations.
  {
    rules: {
      "jsx-a11y/alt-text": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
