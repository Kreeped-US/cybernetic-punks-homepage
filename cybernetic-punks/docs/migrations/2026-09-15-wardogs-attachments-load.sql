-- 2026-09-15-wardogs-attachments-load.sql
-- HELD. Operator-run (rule 2) AFTER reviewing docs/wardogs/attachment-catalog-mapping.md AND after
-- running the schema (2026-09-15-wardogs-attachments-schema.sql). Loads the community attachment
-- catalog: 204 distinct rows. price/weight honest-null for the "." rows. Effect columns
-- stay NULL (Phase 2). Idempotent: ON CONFLICT (game_slug, name) updates the loadable fields.
-- DUPLICATES collapsed to one row each (AK74 Grip, MMGL Barrel, SV98 Extended Mag) -- confirm they are not distinct variants.
-- Provenance: tier=attributed, verified=false, verified_source below.

BEGIN;

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '.45 ACP Pistol Compensator', 'muzzle', 'compensator', 1030, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '.50 Cal Heavy Suppressor', 'muzzle', 'suppressor', 1420, 1.2, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '12 Gauge Suppressor', 'muzzle', 'suppressor', 1040, 0.8, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '2.5x Combat Optic', 'optic', NULL, 690, 0.4, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '3 Prong Flash Hider', 'muzzle', 'flash-hider', 1000, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '3-Chamber Brake', 'muzzle', 'brake', 1080, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '3x Tactical Prism Scope', 'optic', 'prism', 740, 0.4, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '3x-6x LPVO Short Dot', 'optic', 'reflex', 860, 0.6, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '45° Angled Foregrip', 'foregrip', 'angled', 680, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '4x Combat Prism Scope with Reflex', 'optic', 'reflex', 880, 0.4, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '6-10x Scope MOA', 'optic', 'scope', 1050, 1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '6-10x Scope MRAD', 'optic', 'scope', 1200, 1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '6x Marksman Scope + Reflex', 'optic', 'reflex', 1650, 0.7, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '6x Precision Rifle Scope', 'optic', 'scope', 680, 0.7, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AFG Angled Foregrip', 'foregrip', 'angled', 820, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AMP-9 50 RND Drum Magazine', 'magazine', 'drum', 180, 1.5, 'weapon-specific', ARRAY['AMP-9']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AMP-9 9x19 Suppressor', 'muzzle', 'suppressor', 1130, 0.4, 'weapon-specific', ARRAY['AMP-9']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AMP-9 Tactical Flash Hider', 'muzzle', 'flash-hider', 550, 0.1, 'weapon-specific', ARRAY['AMP-9']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AMR 50 Cal Muzzle Brake', 'muzzle', 'brake', 1600, 0.5, 'weapon-specific', ARRAY['AMR 50']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Angled Tactical Foregrip', 'foregrip', 'angled', 650, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AR Multi-Caliber Suppressor', 'muzzle', 'suppressor', 1350, 0.7, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Ballista Brake', 'muzzle', 'brake', 380, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Birdcage Flash Hider', 'muzzle', 'flash-hider', 900, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'BMR-308 Flash Hider', 'muzzle', 'flash-hider', 1280, 0.1, 'weapon-specific', ARRAY['BMR-308']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'BMR-308 Suppressor', 'muzzle', 'suppressor', 1200, 0.7, 'weapon-specific', ARRAY['BMR-308']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Compact T-2 Red Dot', 'optic', 'reflex', 340, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Constrictor Brake', 'muzzle', 'brake', 760, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'CQ-2x Prism Combat Scope', 'optic', 'prism', 640, 0.3, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'CQB 74 Brake', 'muzzle', 'brake', 680, 0.2, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'CQR Tactical Front Rail Grip', 'foregrip', NULL, 1100, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Deadeye Flash Hider', 'muzzle', 'flash-hider', 400, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Deagle 7 RND Magazine', 'magazine', NULL, 50, 0.4, 'weapon-specific', ARRAY['Deagle']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'DTK-1 Brake', 'muzzle', 'brake', 820, 0.2, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Dual Port Brake', 'muzzle', 'brake', 720, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Eclipse Flash Hider', 'muzzle', 'flash-hider', 700, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'FAL 20 RND Magazine', 'magazine', NULL, 150, 0.8, 'weapon-specific', ARRAY['FAL']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'FAL Flash Hider', 'muzzle', 'flash-hider', 1250, 0.2, 'weapon-specific', ARRAY['FAL']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Flow-Through .308 Suppressor', 'muzzle', 'suppressor', 1120, 0.3, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Four Reticle Reflex', 'optic', 'reflex', 580, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Frontier 2.5x-10x Precision Scope', 'optic', 'scope', 1800, 0.7, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Full Choke', 'muzzle', 'choke', 1400, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Galil 35 RND Magazine', 'magazine', NULL, 60, 0.7, 'weapon-specific', ARRAY['Galil']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Ghost LITE Muzzle Brake', 'muzzle', 'brake', 970, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'GOL Multi-Caliber Suppressor', 'muzzle', 'suppressor', 1800, 0.8, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Hexagon 762 Suppressor', 'muzzle', 'suppressor', 1210, 0.6, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Hexagon Brake', 'muzzle', 'brake', 350, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Holographic Sight', 'optic', 'reflex', 620, 0.3, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Hybrid Grip Pod', 'foregrip', NULL, 1500, 0.3, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Improved Cylinder Choke', 'muzzle', 'choke', 540, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Kobra Reflex', 'optic', 'reflex', 520, 0.4, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'M1911 7 RND Magazine', 'magazine', NULL, 20, 0.2, 'weapon-specific', ARRAY['M1911']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'M249 Bipod', 'bipod', NULL, 1050, 0.7, 'weapon-specific', ARRAY['M249 SAW']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'M500 Sabre Brake', 'muzzle', 'brake', 740, 0.1, 'weapon-specific', ARRAY['M500']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Mini Angled Foregrip', 'foregrip', 'angled', 720, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Mini Reflex Sight', 'optic', 'reflex', 200, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MP5 20 RND Magazine', 'magazine', NULL, 70, 0.3, 'weapon-specific', ARRAY['MP5']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MP5 30 RND Magazine', 'magazine', NULL, 100, 0.5, 'weapon-specific', ARRAY['MP5']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MP5 50 RND Drum Magazine', 'magazine', 'drum', 230, 1.5, 'weapon-specific', ARRAY['MP5']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MP5 Flash Hider', 'muzzle', 'flash-hider', 1150, 0.2, 'weapon-specific', ARRAY['MP5']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'OKP 7 Reflex', 'optic', 'reflex', 840, 0.5, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Orpheus Max Brake', 'muzzle', 'brake', 1020, 0.2, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'PBS-4 Suppressor', 'muzzle', 'suppressor', 1300, 0.8, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'PGO-7', 'optic', NULL, 850, 0.6, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'PKM Bipod', 'bipod', NULL, 1350, 0.7, 'weapon-specific', ARRAY['PKM']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'PP-19 50 RND Vityaz Drum Magazine', 'magazine', 'drum', 200, 1.3, 'weapon-specific', ARRAY['PP-19 Vityaz']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'PP-19 Vityaz Flash Hider', 'muzzle', 'flash-hider', 800, 0.1, 'weapon-specific', ARRAY['PP-19 Vityaz']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'PP-19-01 Vityaz 9x19 Suppressor', 'muzzle', 'suppressor', 1450, 0.5, 'weapon-specific', ARRAY['PP-19 Vityaz']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Pro Tilt Bipod', 'bipod', NULL, 1400, 0.6, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'QD-5 Suppressor', 'muzzle', 'suppressor', 1170, 0.4, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'RC-556 Suppressor', 'muzzle', 'suppressor', 1550, 0.5, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'RK6 Tactical Foregrip', 'foregrip', NULL, 380, 1.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Rubberized Ergonomic Foregrip', 'foregrip', NULL, 540, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'RVG Vertical Foregrip', 'foregrip', 'vertical', 770, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SG Multi-Caliber Suppressor', 'muzzle', 'suppressor', 1220, 0.6, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Shift Foregrip', 'foregrip', NULL, 1150, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SKS Bipod', 'bipod', NULL, 800, 0.5, 'weapon-specific', ARRAY['SKS']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Slicktap Brake', 'muzzle', 'brake', 940, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Slotted Flash Hider', 'muzzle', 'flash-hider', 960, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Spectr 4x', 'optic', 'scope', 800, 0.7, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Spitfire 3X', 'optic', 'scope', 790, 0.3, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SRVV Brake', 'muzzle', 'brake', 1470, 0.5, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'STRELIX Suppressor', 'muzzle', 'suppressor', 1000, 0.6, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Super-45 Flash Hider', 'muzzle', 'flash-hider', 1050, 0.1, 'weapon-specific', ARRAY['Super-45']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Suppressor T8L1 Scout', 'muzzle', 'suppressor', 1000, 0.6, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SV98 Bipod', 'bipod', NULL, 1250, 0.5, 'weapon-specific', ARRAY['SV98']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SVD 5 RND Magazine', 'magazine', NULL, 20, 0.2, 'weapon-specific', ARRAY['SVD']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SVD 7.62x54R Brake', 'muzzle', 'brake', 650, 0.2, 'weapon-specific', ARRAY['SVD']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SVD Bipod', 'bipod', NULL, 1120, 0.5, 'weapon-specific', ARRAY['SVD']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'TDG Vertical Foregrip', 'foregrip', 'vertical', 1000, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'TGP-A Suppressor 5.45', 'muzzle', 'suppressor', 1190, 0.7, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Three Port Brake', 'muzzle', 'brake', 1180, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'TopComp Brake', 'muzzle', 'brake', 770, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Tread Brake', 'muzzle', 'brake', 620, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Tricon 1.5x Compact Prism Scope', 'optic', 'prism', 650, 0.2, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Vektor Frenix-X Micro Reflex Sight', 'optic', 'reflex', 820, 0, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '10x', 'optic', 'scope', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '10x Thermal Scope', 'optic', 'thermal', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '4X Hybrid', 'optic', 'scope', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '9RD SHELL', 'magazine', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'A91 Barrel', 'barrel', NULL, NULL, NULL, 'weapon-specific', ARRAY['A-91']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'AGS-74 PRO Sniper Pistol Grip', 'grip', 'pistol', NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "AGS-74" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'AK-12 Pistol Grip', 'grip', 'pistol', NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "AK-12" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'AK-47 HERA CQR Stock', 'stock', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "AK-47" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'AK47N EXTENDED MAG 45RD', 'magazine', 'extended', NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "AK47N" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AK74 Barrel', 'barrel', NULL, NULL, NULL, 'weapon-specific', ARRAY['AK74']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AK74 Grip', 'grip', 'pistol', NULL, NULL, 'weapon-specific', ARRAY['AK74']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AK74 Handguard', 'handguard', NULL, NULL, NULL, 'weapon-specific', ARRAY['AK74']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AK74 Receiver', 'receiver', NULL, NULL, NULL, 'weapon-specific', ARRAY['AK74']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AK74 Stock', 'stock', NULL, NULL, NULL, 'weapon-specific', ARRAY['AK74']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'AK74N EXTENDED MAG 120RD', 'magazine', 'extended', NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "AK74N" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'AK74N EXTENDED MAG 60RD', 'magazine', 'extended', NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "AK74N" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'AK74u Dust Cover', 'dust_cover', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "AK74u" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'AK74u Polymer Handguard', 'handguard', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "AK74u" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'AK74u Steel Folding Stock', 'stock', 'folding', NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "AK74u" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'AK74u Wooden Handguard', 'handguard', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "AK74u" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'AKS74u Barrel + Gas Block', 'barrel', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "AKS74u" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Alpha Folding Stock', 'stock', 'folding', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Archangel OPFOR Forend', 'handguard', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Archangel OPFOR Pistol Grip', 'grip', 'pistol', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Archangel OPFOR Stock', 'stock', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Basic Muzzle', 'muzzle', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Buffertube Stock', 'stock', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Canted Irons', 'optic', 'irons', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'CGM4 Scope', 'optic', 'scope', NULL, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'CMC Flat Trigger', 'trigger', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'Glock Extended 27RD', 'magazine', 'extended', NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "Glock" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'HOMEMADE 50RD DRUM MAG', 'magazine', 'drum', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'KGB MG47 Grip', 'grip', 'pistol', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'KH2002 Barrel', 'barrel', NULL, NULL, NULL, 'weapon-specific', ARRAY['KH-2002']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'M-LOK Dong Grip', 'grip', 'pistol', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'M4 Barrel', 'barrel', NULL, NULL, NULL, 'weapon-specific', ARRAY['M4']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'M4 Handguard', 'handguard', NULL, NULL, NULL, 'weapon-specific', ARRAY['M4']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'M4 Pistol Grip', 'grip', 'pistol', NULL, NULL, 'weapon-specific', ARRAY['M4']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'M4 Stock', 'stock', NULL, NULL, NULL, 'weapon-specific', ARRAY['M4']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MAGPUL D60', 'magazine', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Magpul MBUS Iron Sights', 'magazine', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MI Universal Handguard', 'handguard', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MK22 10RD', 'magazine', NULL, NULL, NULL, 'weapon-specific', ARRAY['MK22']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MMGL Barrel', 'barrel', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MMGL Handguard', 'handguard', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MMGL Pistol Grip', 'grip', 'pistol', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MMGL Sight', 'optic', NULL, NULL, 0.1, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MMGL Stock', 'stock', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MOSIN 10RD Extended', 'magazine', 'extended', NULL, NULL, 'weapon-specific', ARRAY['Mosin Nagant']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MOSIN 20RD Extended', 'magazine', 'extended', NULL, NULL, 'weapon-specific', ARRAY['Mosin Nagant']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MOSIN Stripper Clip', 'magazine', NULL, NULL, NULL, 'weapon-specific', ARRAY['Mosin Nagant']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MOSS EXT MAG', 'magazine', 'extended', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'MP9 Extended Mag 30RD', 'magazine', 'extended', NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "MP9" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'NcSTAR Blue Laser', 'accessory', 'laser', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Polymer Handguard', 'handguard', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Polymer Pistol Grip', 'grip', 'pistol', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Polymer Stock', 'stock', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Railed Dust Cover', 'dust_cover', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'RAK-1 Enhanced Trigger', 'trigger', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'RFB 20RD MAGPUL', 'magazine', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "RFB" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'RPK74 Barrel + Gas Block', 'barrel', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "RPK74" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'RPK74 Dust Cover', 'dust_cover', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "RPK74" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'RPK74 Polymer Handguard', 'handguard', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "RPK74" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'RPK74 Wooden Handguard', 'handguard', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "RPK74" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'RPK74 Wooden Stock', 'stock', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "RPK74" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SAW-MAG 150 RD TWIN DRUM', 'magazine', 'drum', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Sharkfin Dong Grip', 'grip', 'pistol', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SKS EXT MAG 20RD', 'magazine', 'extended', NULL, NULL, 'weapon-specific', ARRAY['SKS']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SKS EXTENDED MAG 30RD', 'magazine', 'extended', NULL, NULL, 'weapon-specific', ARRAY['SKS']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SKS EXTENDED MAG 40RD', 'magazine', 'extended', NULL, NULL, 'weapon-specific', ARRAY['SKS']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Smoke Shell', 'magazine', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Sniper Muzzle', 'muzzle', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SUREFIRE 60 RD', 'magazine', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SV98 20RD MAG', 'magazine', NULL, NULL, NULL, 'weapon-specific', ARRAY['SV98']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SV98 Stock', 'stock', NULL, NULL, NULL, 'weapon-specific', ARRAY['SV98']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SVD MAG 20RD', 'magazine', NULL, NULL, NULL, 'weapon-specific', ARRAY['SVD']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'SVDM Barrel', 'barrel', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "SVDM" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'SVDM Handguard', 'handguard', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "SVDM" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'SVDM Stock', 'stock', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "SVDM" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'TI Battlerail', 'accessory', 'mount', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Timney Drop-in Trigger', 'trigger', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Wooden Dong Grip', 'grip', 'pistol', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Wooden Pistol Grip', 'grip', 'pistol', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Zenit Handguard', 'handguard', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Zenit Stock', 'stock', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'ZenitCo B-13 Side Mount', 'accessory', 'mount', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', '3-6x Scope', 'optic', 'scope', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AK74-M Extended Mag', 'magazine', 'extended', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'AR Extended Mag', 'magazine', 'extended', NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Combat Bow Standard Mag', 'magazine', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Deagle Barrel', 'barrel', NULL, NULL, NULL, 'weapon-specific', ARRAY['Deagle']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'FAL Pistol Grip', 'grip', 'pistol', NULL, NULL, 'weapon-specific', ARRAY['FAL']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'FAL Stock', 'stock', NULL, NULL, NULL, 'weapon-specific', ARRAY['FAL']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Galil Barrel', 'barrel', NULL, NULL, NULL, 'weapon-specific', ARRAY['Galil']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Galil Pistol Grip', 'grip', 'pistol', NULL, NULL, 'weapon-specific', ARRAY['Galil']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Galil Stock', 'stock', NULL, NULL, NULL, 'weapon-specific', ARRAY['Galil']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Launcher_04 Standard Mag', 'magazine', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'LVOA Handguard', 'handguard', NULL, NULL, NULL, 'weapon-specific', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'UNMATCHED weapon token "LVOA" (variant of a roster gun, or a weapon we do not stock -- operator resolve)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'M1911 Barrel', 'barrel', NULL, NULL, NULL, 'weapon-specific', ARRAY['M1911']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'M4 Extended Mag', 'magazine', 'extended', NULL, NULL, 'weapon-specific', ARRAY['M4']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'M500 Internal Mag', 'magazine', NULL, NULL, NULL, 'weapon-specific', ARRAY['M500']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MP43 Internal Mag', 'magazine', NULL, NULL, NULL, 'weapon-specific', ARRAY['MP43']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MP5 Barrel', 'barrel', NULL, NULL, NULL, 'weapon-specific', ARRAY['MP5']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MP5 Handguard', 'handguard', NULL, NULL, NULL, 'weapon-specific', ARRAY['MP5']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'MP5 Stock', 'stock', NULL, NULL, NULL, 'weapon-specific', ARRAY['MP5']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source, notes)
VALUES ('wardogs', 'RS2 Slim', 'other', NULL, NULL, NULL, 'generic', NULL, 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)', 'AMBIGUOUS-SLOT')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Scout Rifle Standard Barrel', 'barrel', NULL, NULL, NULL, 'weapon-specific', ARRAY['Scout Rifle TD']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'Scout Rifle Stock', 'stock', NULL, NULL, NULL, 'weapon-specific', ARRAY['Scout Rifle TD']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

INSERT INTO wardogs_attachments (game_slug, name, slot_type, slot_subtype, price, weight, compatibility_kind, compatible_weapons, tier, verified, verified_source)
VALUES ('wardogs', 'SV98 Extended Mag', 'magazine', 'extended', NULL, NULL, 'weapon-specific', ARRAY['SV98']::text[], 'attributed', false, 'community-aggregated attachment catalog, in-game tested (attributed)')
ON CONFLICT (game_slug, name) DO UPDATE SET slot_type=EXCLUDED.slot_type, slot_subtype=EXCLUDED.slot_subtype, price=EXCLUDED.price, weight=EXCLUDED.weight, compatibility_kind=EXCLUDED.compatibility_kind, compatible_weapons=EXCLUDED.compatible_weapons, updated_at=now();

COMMIT;

-- VERIFY: SELECT count(*) FROM wardogs_attachments;  -- expect 204
--         SELECT slot_type, count(*) FROM wardogs_attachments GROUP BY slot_type ORDER BY 2 DESC;
