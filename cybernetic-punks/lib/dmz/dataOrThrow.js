// lib/dmz/dataOrThrow.js
// MOVED (2026-09-24) to lib/data/dataOrThrow.js -- the helper is game-agnostic, now shared by every
// game's render reads (not DMZ-only). This is a thin re-export so existing imports (entities.js,
// weaponBuilds.js, tests) keep working unchanged; new callers import from '@/lib/data/dataOrThrow'.
export { dataOrThrow, countOrThrow } from '../data/dataOrThrow.js';
