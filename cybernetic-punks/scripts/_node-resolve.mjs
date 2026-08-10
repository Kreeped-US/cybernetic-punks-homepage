// scripts/_node-resolve.mjs
// Registers the extensionless/directory resolve hook so a standalone node script can
// import the app's lib graph. Use via --import:
//   node --env-file=.env.local --import ./scripts/_node-resolve.mjs scripts/<script>.mjs
import { register } from 'node:module';
register('./_node-resolve-hook.mjs', import.meta.url);
