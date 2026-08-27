// lib/socialLinks.js
// SINGLE SOURCE OF TRUTH for the network's external community/social links. Every consumer
// imports from here; never hardcode the raw URL. The Discord invite slug lives in exactly one
// place, so it changes once (same discipline as brandColors, the countdown helper, and the
// intent gates). DISPLAY_DISCORD is the bare host/slug for link text (no scheme).
export const DISCORD_INVITE = 'https://discord.gg/PnhbdRYh3w';
export const DISPLAY_DISCORD = DISCORD_INVITE.replace(/^https?:\/\//, '');
