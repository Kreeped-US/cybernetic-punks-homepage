// app/profile-preview/brand.js
// MOCK brand palette for the profile/premium PREVIEW (Cybernetic Punks
// ops-center aesthetic). INLINE constants only -- deliberately NOT a CSS token
// system. globals.css has :root (Marathon) tokens + a .dmz-theme block, but NO
// network-level token layer yet. Introducing network tokens is a FOLLOW-UP
// (flagged), intentionally not done in this mock. The CHROME values (bg/panel/border/
// text) are inline mock constants; the per-game ACCENTS now come from
// lib/brandColors.js (the JS color single-source), so Marathon green / DMZ forest stay
// consistent network-wide.

import { MARATHON_GREEN, DMZ_FOREST } from '@/lib/brandColors';

export const brand = {
  bg:        '#0a0c10', // ops-center deep background
  panel:     '#11141a',
  panelHi:   '#161b22',
  border:    '#232a33',
  borderHi:  '#2f3845',
  text:      'rgba(255,255,255,0.90)',
  textDim:   'rgba(255,255,255,0.50)',
  textFaint: 'rgba(255,255,255,0.28)',
  ink:       '#e8eaed', // neutral network-brand ink (games carry the color)
  marathon:  MARATHON_GREEN, // green (matches the live Marathon --green)
  dmz:       DMZ_FOREST, // forest green
  premium:   '#d9a441', // gold-ish premium accent
};
