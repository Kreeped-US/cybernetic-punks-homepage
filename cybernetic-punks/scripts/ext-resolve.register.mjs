// scripts/ext-resolve.register.mjs
// Bootstrap for the prompt-render harness: registers the extensionless-import resolve hook BEFORE
// the main module loads. Usage: node --import ./scripts/ext-resolve.register.mjs scripts/render-prompts.mjs <game> <outDir>
import { register } from 'node:module';
register('./ext-resolve.hooks.mjs', import.meta.url);
