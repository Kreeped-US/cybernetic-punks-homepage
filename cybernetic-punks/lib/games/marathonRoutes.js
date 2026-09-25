// lib/games/marathonRoutes.js
// CANONICAL Marathon internal-route allowlist (2026-09-24). The ONE place that owns the real,
// app-router-backed paths the writer prompt is allowed to link to. Every value is a canonical
// /marathon/<segment> route that resolves WITHOUT a redirect hop -- unlike the old bare paths
// ('/cradle', '/factions', '/meta'), which only worked via the next.config.mjs 301s and, worse,
// TRAINED the model to emit bare route literals in reader prose (the PIPELINE_LEAK class).
//
// HAND-LISTED constant (not derived at runtime): the router is a build-time fact, so the list is
// explicit and a companion test (marathonRoutes.test.mjs) asserts each entry has a real
// app/marathon/<segment>/page.js. That gives the "derive from the router" guarantee (a typo or a
// deleted page fails the test) without a runtime fs walk in the prompt path.
//
// CONSUMED by lib/games/marathon.js (vocabulary.links + editorial.primaryTool.href) -- i.e. the
// PROMPT path only. No page/component renders these values (verified 2026-09-24), so changing them
// changes only what the prompt teaches, never a live page link.
//
// 2026-09-25: generalized into lib/games/gameRoutes.js (per-game CTA allowlist for all games). This
// file now RE-EXPORTS MARATHON_ROUTES from there so marathon.js's import is unchanged (one source).

export { MARATHON_ROUTES } from './gameRoutes.js';
