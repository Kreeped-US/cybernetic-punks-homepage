// lib/games/heroOverlays.js
// Shared overlay (legibility scrim) presets for the GameHero art (components/game/GameHero.js), so games
// that should look alike READ THE SAME VALUES instead of re-typing them. A game config sets
// hero.overlay = <preset>; bright art that needs more darkening defines its own heavier overlay instead.

// STANDARD -- the original /wardogs hero scrims (dark text column left, dark bottom). Used by wardogs and
// (operator pick "A", 2026-10-02) dmz. Changing it changes every hero that uses it.
export const HERO_OVERLAY_STANDARD = Object.freeze({
  side: 'linear-gradient(90deg, rgba(8,9,12,0.94) 0%, rgba(8,9,12,0.72) 42%, rgba(8,9,12,0.32) 100%)',
  bottom: 'linear-gradient(0deg, #0b0d10 2%, rgba(11,13,16,0.15) 46%, rgba(11,13,16,0.35) 100%)',
});
