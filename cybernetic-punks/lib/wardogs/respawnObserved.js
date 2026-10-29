// lib/wardogs/respawnObserved.js
// Brief 228: the observed respawn block on /wardogs/systems/wardogs-map-respawn (this slug only). A static, tier-bearing
// constant (the BOSSES_SEEN precedent in lib/dmz/bosses.js), NOT a DB column: the article body in feed_items is untouched.
//
// TIER: 'observed' -- the site operator's own in-game sightings (Justin, PC, Oct 10 to Oct 20, 2026), shown with the
// off-scale Observed mark (components/network/confidenceTiers.js OBSERVED_MARK). Not an official source. The window
// spans Bulkhead's Season 02 patch (Steam, 2026-10-14); which sighting fell before or after it is not recorded.
// Nothing here gives a countdown length, a travel time or a map size: none was measured.
//
// DEVELOPER STATEMENT: the existing body is Bulkhead's pre-launch design statement. Its respawn design comes from
// Bulkhead's Aug 11, 2026 video (on record in docs/HANDOFF.md, Brief 59, and in the row's verified_source_url); the
// timestamp of the respawn statement in that video is not on record.

export var RESPAWN_OBSERVED_SLUG = 'wardogs-map-respawn';

// Content date for this page's WebPage dateModified and sitemap lastmod: the later of the row's updated_at and this
// date (the CONTENT_CHANGED / WEAPON_CAMOS_UPDATED precedent). Applies to this slug only.
export var RESPAWN_OBSERVED_UPDATED = '2026-10-29';

export var RESPAWN_OBSERVED = {
  tier: 'observed',
  observer: 'Justin',
  platform: 'PC',
  window: { from: '2026-10-10', to: '2026-10-20' },
  answer: "Yes, you respawn in Wardogs: at your faction's HQ, unless a forward spawn vehicle is available.",
  heading: 'How to respawn',
  statements: [
    "Death returns you to your faction's HQ by default.",
    'If your team has parked a spawn vehicle in or near the zone and it is stationary and intact, you can select it on the Deployment Board at HQ and deploy into it.',
    'Selecting a forward spawn vehicle shows a short "WAITING TO DEPLOY" countdown. This is a deploy confirmation, not a death timer.',
    'A free team vehicle is usually available at HQ; other vehicles are bought from the vendor.',
    'You lose the kit you were carrying when you die and must buy it again at the vendor; the vendor shows the purchase total. No separate cash amount is shown on the death screen.',
    'There is no respawn timer in the match; the trip from HQ back to the action is the cost of dying.',
  ],
  windowLine: 'Observed by Justin on PC, Oct 10 to Oct 20, 2026, spanning the Oct 14 Season 02 patch. Not re-checked since Oct 20; patches after that date are not reflected.',
};

export var RESPAWN_DEV_STATEMENT = {
  lead: "The sections below are the developer's pre-launch design statement. Respawn design source: ",
  label: 'Bulkhead\'s Aug 11, 2026 video "WARDOGS | 10 Reasons NOT to Buy"',
  url: 'https://www.youtube.com/watch?v=ugkuP4a3xk4',
  note: 'The timestamp for the respawn statement is not on record.',
};

// The later of updated_at and RESPAWN_OBSERVED_UPDATED; null when updated_at is later (it then keeps its own value).
// Same rule as camosDateIfLater (lib/dmz/weaponCamos.js).
export function respawnDateIfLater(updatedAt) {
  var t = updatedAt ? Date.parse(updatedAt) : NaN;
  if (isNaN(t) || t < Date.parse(RESPAWN_OBSERVED_UPDATED + 'T00:00:00Z')) return RESPAWN_OBSERVED_UPDATED;
  return null;
}
