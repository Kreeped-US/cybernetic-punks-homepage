-- 2026-09-02-bodycam-weapon-roster.sql
-- Bodycam (game #5) weapon roster -- HONEST-NULL inserts. THE OPERATOR RUNS THIS ONCE in Supabase.
-- Claude does not run DB writes.
--
-- POSTURE (confirmed-skeleton / values-pending, the Wardogs precedent): every row is
-- verified=false and every stat column is left NULL. NO published per-weapon numbers exist -- do
-- NOT invent any. The gun's EXISTENCE is sourced; its VALUES are not, so verified stays false and
-- verified_source names the source honestly (never verified=true while the numbers are null).
--
-- TIERS map to verified_source (the arsenal render derives its per-weapon badge from this text):
--   PATCH-CONFIRMED  = added/returned in the Sept 2 2026 "Locked & Loaded" patch.
--   REWORKED         = already in-game, reworked for the attachment system (present, values pending).
--   ATTRIBUTED       = devlog only, NOT in the patch's added-list (Draco) -- flagged unconfirmed.
-- Devlog showcase aliases (R12=BK-101, Remington 700=Rivington, Viper=Veaper, CZ 75=CR-75, and the
-- slash-names) go in `notes` (weapon_stats has no dedicated alias column). Crossbow is EXCLUDED
-- (Zombies-only; Zombies is disabled this patch).
--
-- IDEMPOTENCY: weapon_stats has no unique key on (game_slug, name) and id is a uuid default, so a
-- re-run DUPLICATES. Run ONCE. To reset before re-running, uncomment the delete on the next line:
-- delete from weapon_stats where game_slug = 'bodycam';

insert into weapon_stats (game_slug, name, category, weapon_type, verified, verified_source, notes) values
-- PATCH-CONFIRMED (Sept 2 2026 "Locked & Loaded")
('bodycam', 'BK-101',       'Shotgun',        'Shotgun',        false, 'Reissad Sept 2 2026 Steam patch "Locked & Loaded" - weapon confirmed added; stat values not published or verified in-game', 'Also shown as R12 in the loadout devlog.'),
('bodycam', 'Rivington',    'Sniper Rifle',   'Sniper Rifle',   false, 'Reissad Sept 2 2026 Steam patch "Locked & Loaded" - weapon confirmed added; stat values not published or verified in-game', 'Bolt-action. Also shown as Remington 700 in the devlog.'),
('bodycam', 'SG9-X',        'Machine Pistol', 'Machine Pistol', false, 'Reissad Sept 2 2026 Steam patch "Locked & Loaded" - weapon confirmed added; stat values not published or verified in-game', NULL),
('bodycam', 'Veaper',       'Machine Pistol', 'Machine Pistol', false, 'Reissad Sept 2 2026 Steam patch "Locked & Loaded" - weapon confirmed added; stat values not published or verified in-game', 'Also shown as Viper in the devlog.'),
('bodycam', 'SG5-X',        'Machine Pistol', 'Machine Pistol', false, 'Reissad Sept 2 2026 Steam patch "Locked & Loaded" - weapon reintroduced; stat values not published or verified in-game', 'Reintroduced in Locked & Loaded.'),
('bodycam', 'CR-75',        'Pistol',         'Pistol',         false, 'Reissad Sept 2 2026 Steam patch "Locked & Loaded" - weapon confirmed added; stat values not published or verified in-game', 'Also shown as CZ 75 in the devlog.'),
-- REWORKED-EXISTING (present in-game, reworked for the attachment system; values pending)
('bodycam', 'M1911',        'Pistol',         'Pistol',         false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', NULL),
('bodycam', 'Glock 17',     'Pistol',         'Pistol',         false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', NULL),
('bodycam', 'Kobra',        'Pistol',         'Pistol',         false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', NULL),
('bodycam', 'Desert Eagle', 'Pistol',         'Pistol',         false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', NULL),
('bodycam', 'Mini Uzi',     'Submachine Gun', 'Submachine Gun', false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', NULL),
('bodycam', 'UMP-45',       'Submachine Gun', 'Submachine Gun', false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', NULL),
('bodycam', 'MP5',          'Submachine Gun', 'Submachine Gun', false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', NULL),
('bodycam', 'Remington 870','Shotgun',        'Shotgun',        false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', 'Also M870.'),
('bodycam', 'M4A1',         'Assault Rifle',  'Assault Rifle',  false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', NULL),
('bodycam', 'AK-47',        'Assault Rifle',  'Assault Rifle',  false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', 'Also AKM.'),
('bodycam', 'FN FAL',       'Assault Rifle',  'Assault Rifle',  false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', 'Battle-rifle platform.'),
('bodycam', 'SCAR',         'Assault Rifle',  'Assault Rifle',  false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', NULL),
('bodycam', 'Dragunov',     'Sniper Rifle',   'Sniper Rifle',   false, 'Present in-game, reworked for the attachment system per Reissad Sept 2 2026 patch - stat values not published or verified in-game', 'Also SVD.'),
-- DEVLOG-ATTRIBUTED (NOT in the patch added-list; unconfirmed) -- operator may hold this one out.
('bodycam', 'Draco',        'Pistol',         'Pistol',         false, 'Reissad loadout devlog (attributed) - NOT in the Sept 2 patch added-list; unconfirmed, stat values not published', 'Compact AK pistol. Devlog-attributed, not in the Sept 2 patch added-list.');

-- VERIFY after running:
--   select category, count(*) from weapon_stats where game_slug='bodycam' group by category order by category;
--   -- expect 20 rows: Assault Rifle 4, Machine Pistol 3, Pistol 6, Shotgun 2, Sniper Rifle 2, Submachine Gun 3.
--   -- (Pistol 6 = CR-75 + M1911 + Glock 17 + Kobra + Desert Eagle + Draco; if Draco is held, Pistol 5 / 19 total.)
