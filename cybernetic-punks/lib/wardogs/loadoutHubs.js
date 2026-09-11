// lib/wardogs/loadoutHubs.js
// Registry-light config for the Channel B WEAPON-TYPE loadout hubs (/wardogs/loadouts/best/[type]).
// Per the Channel B scope doc: hubs are computed FROM the store (deterministic), so this file carries
// only (a) the type -> slug/label mapping and (b) the SHIP switch -- which type hubs are live+indexable
// right now. Per-weapon LEAF pages get per-row is_indexable flags later (the GSC evidence ramp); the
// HUBS just need this small curation list. Fan-out = flip `shipped: true` on the next type.
//
// DECISIONS LOCKED (operator, Phase B1):
//   - URL shape: /wardogs/loadouts/best/[type]  (reserves the bare /wardogs/loadouts/[class] segment
//     for the future B2 class hubs).
//   - Floor: only types with >= 3 TTK-ranked members ship (AR/Sniper/SMG/Sidearm/Marksman qualify;
//     Shotgun/LMG/Launcher/Bow are too thin -> held, not listed as qualifying).
//   - This PROOF ships ONE hub: assault-rifle. The other four are staged (shipped:false) for fan-out.
//
// `weaponType` MUST match weapon_stats.weapon_type verbatim (that column is the only populated taxonomy
// axis today -- class/budget/level are null, so B2 is deferred to the economy-data pass).

export const WEAPON_TYPE_HUBS = [
  { slug: 'assault-rifle', weaponType: 'Assault Rifle', label: 'Assault Rifle', plural: 'assault rifles', shipped: true },
  { slug: 'sniper-rifle',  weaponType: 'Sniper Rifle',  label: 'Sniper Rifle',  plural: 'sniper rifles',  shipped: false },
  { slug: 'smg',           weaponType: 'Submachine Gun', label: 'SMG',          plural: 'SMGs',           shipped: false },
  { slug: 'sidearm',       weaponType: 'Sidearm',        label: 'Sidearm',      plural: 'sidearms',       shipped: false },
  { slug: 'marksman-rifle', weaponType: 'Marksman Rifle', label: 'Marksman Rifle', plural: 'marksman rifles', shipped: false },
];

// The hubs that are LIVE + indexable now (drives the route's notFound gate, generateStaticParams, the
// sitemap emitter, and the on-site mesh). Fan-out flips more `shipped` flags -> they appear everywhere.
export function shippedTypeHubs() {
  return WEAPON_TYPE_HUBS.filter((h) => h.shipped);
}

export function typeHubBySlug(slug) {
  return WEAPON_TYPE_HUBS.find((h) => h.slug === slug) || null;
}

export function isShippedTypeHub(slug) {
  const h = typeHubBySlug(slug);
  return !!(h && h.shipped);
}
