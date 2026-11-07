// lib/wardogs/priceSource.js
// ONE place for where the Loadout Finder's prices come from (Brief 317). A loadout cost is the weapon's vendor
// price (weapon_stats.credit_cost) plus the selected load's ammo box price (wardogs_ammo.box_price); no armor
// or attachment price enters it.
// Backing (HANDOFF): economy Phase A, 2026-10-16 ("Phase A = vendor prices, unlock levels, the 5.56 AP career
// gate"; Block 1 = 17 weapon credit_cost rows) and slice E1, 2026-10-26 (the four new Season 2 weapons, price
// and unlock) set weapon prices from Bulkhead's Season 02 patch notes where the notes state them. No entry
// changes an ammo box price (Phase A Block 4 and slice C changed career gates only), so ammo box prices and the
// weapon prices the notes do not state remain community-recorded.
// Edit HERE when a later patch's prices are applied (see also PRICES_THROUGH in lib/wardogs/freshnessCopy.js).
export const LOADOUT_PRICE_SOURCE = "weapon prices follow Bulkhead's Season 02 patch notes where the notes state them; ammo box prices and other weapon prices are community-recorded";
export const LOADOUT_PRICE_TAG = 'patch-notes prices where stated, else community-recorded';
