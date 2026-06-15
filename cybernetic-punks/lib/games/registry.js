// lib/games/registry.js
// Network-level game registry — the single place that enumerates the games on
// the network, mapping game_slug -> config. See docs/dmz/GAME_TEMPLATE.md.
//
// Adding a future game = author its config module + add one entry here. The
// route group, nav, and landing all render FROM the registered config, so a new
// game's section structure appears without bespoke per-section page wiring.
//
// NOTE: Marathon is intentionally NOT in the registry yet. Marathon runs on its
// own (unprefixed) routes and is migrated onto this template later, deliberately
// (GAME_TEMPLATE.md: DMZ-first-then-template). DMZ is the first instance.

import { dmz } from './dmz';

export const GAME_REGISTRY = {
  dmz: dmz,
};

export function getGameConfig(slug) {
  return GAME_REGISTRY[slug] || null;
}

export function getGameSection(gameSlug, sectionSlug) {
  var game = getGameConfig(gameSlug);
  if (!game) return null;
  return game.sections.find(function(s) { return s.slug === sectionSlug; }) || null;
}
