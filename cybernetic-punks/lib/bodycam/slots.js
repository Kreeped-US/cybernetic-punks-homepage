// lib/bodycam/slots.js
// The confirmed Bodycam attachment SLOT TAXONOMY -- pure data (no React, no DB), so BOTH the SSR
// frame (app/bodycam/builder/page.js, server) and the interactive widget (BodycamBuilderClient,
// client) render from ONE source of truth. Sourced from Reissad's Sept 2 2026 "Locked & Loaded"
// patch + devlog (docs/bodycam/ATTACHMENT_SEED_SCOPING.md section 2). STRUCTURE only -- categories
// and subtypes; specific parts and numbers are unpublished and are NOT represented here.
//
// `type` is the slot-type slug (matches bodycam_attachments.slot_type; used by the widget to group
// real parts once they are seeded). `slot` / `subtypes` / `role` are the display strings the
// crawlable table renders. Adding `type` does not change what the table renders.

export const BODYCAM_SLOTS = [
  { type: 'barrel',       slot: 'Barrel',       subtypes: 'Short, Long',                         role: 'Size vs control (section below)' },
  { type: 'muzzle',       slot: 'Muzzle',       subtypes: 'Suppressor, Flash Hider, Compensator', role: 'Suppressors carry per-weapon audio' },
  { type: 'upper-barrel', slot: 'Upper Barrel', subtypes: '-',                                   role: 'Provides a mounting rail' },
  { type: 'side-rail',    slot: 'Side Rail',    subtypes: '-',                                   role: 'Provides an optic mount' },
  { type: 'optic-mount',  slot: 'Optic Mount',  subtypes: '-',                                   role: 'Provides the optic mounting point' },
  { type: 'optic',        slot: 'Optic',        subtypes: 'Iron, Close, Mid, Long',              role: 'Requires an optic mount; reticle + canted-toggle option' },
  { type: 'magazine',     slot: 'Magazine',     subtypes: '-',                                   role: 'Ammo capacity and handling' },
  { type: 'trigger',      slot: 'Trigger',      subtypes: '-',                                   role: 'Fire behavior' },
  { type: 'grip',         slot: 'Grip',         subtypes: '-',                                   role: 'Recoil and handling' },
  { type: 'stock',        slot: 'Stock',        subtypes: 'Light, Heavy',                        role: 'Size vs control (section below)' },
  { type: 'ammo',         slot: 'Ammo',         subtypes: '-',                                   role: 'Ammo type slot' },
  { type: 'sticker',      slot: 'Sticker',      subtypes: '-',                                   role: 'Cosmetic only' },
];
