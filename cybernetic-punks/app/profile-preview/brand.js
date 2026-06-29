// app/profile-preview/brand.js
// MOCK brand palette for the profile/premium PREVIEW (Cybernetic Punks
// ops-center aesthetic). INLINE constants only -- deliberately NOT a CSS token
// system. globals.css has :root (Marathon) tokens + a .dmz-theme block, but NO
// network-level token layer yet. Introducing network tokens is a FOLLOW-UP
// (flagged), intentionally not done in this mock. Per-game accents mirror the
// brand positioning (Marathon teal / DMZ amber).

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
  marathon:  '#00ff41', // green (matches the live Marathon --green)
  dmz:       '#e89a2c', // amber
  premium:   '#d9a441', // gold-ish premium accent
};
