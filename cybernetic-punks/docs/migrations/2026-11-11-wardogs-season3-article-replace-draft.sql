-- 2026-11-11-wardogs-season3-article-replace-draft.sql
-- Brief 359. Replaces the body and metadata of the Season 3 cron draft (feed_items 5a4d5cf6-0c4e-4028-952a-33895dbba480)
-- with the operator-reviewed article. NOT RUN by the executor. The operator runs each block alone in
-- the Supabase SQL editor, in order: BEFORE, UPDATE, VERIFY.
-- Unchanged by this file: patch_key, gate_status, is_published, noindex, created_at, editor, provenance_tier.
-- No row is inserted. The draft stays unpublished. Approving it in admin publishes it and writes the
-- patch_covered marker for patch_key steam:1867240:1794419963.
-- Guard: one row only, and only while it is still the unedited cron draft (body md5 734b3f351828a870e10fb6aec84ebb41,
-- 3784 chars), unpublished, not rejected, and the new slug is free. A second run updates 0 rows.
-- updated_at is set to now() explicitly. The set_updated_at BEFORE UPDATE trigger may also set it.
-- Expected after: body 12838 chars, md5 21f90201130ab2b1662865401528db9e, no carriage returns (body_cr_pos 0).
-- Editor safety: plain single-quoted strings with apostrophes doubled, no dollar quotes, no semicolons inside
-- quoted strings, a semicolon only at the end of each statement. This file is saved with LF line endings.

-- ============================================================
-- BEFORE: run this alone. Expect 1 row: slug wardogs-season-3-patch-dmr-and-rifle-damage-buffs-v97x,
-- body_chars 3784, body_md5 734b3f351828a870e10fb6aec84ebb41, is_published false, rejected false.
-- ============================================================
SELECT id, slug, headline, char_length(body) AS body_chars, md5(body) AS body_md5, is_published, rejected, noindex, gate_status, patch_key, updated_at
FROM feed_items
WHERE id = '5a4d5cf6-0c4e-4028-952a-33895dbba480';

-- ============================================================
-- UPDATE: run this alone. Expect UPDATE 1 (UPDATE 0 means a guard failed: stop and report).
-- ============================================================
UPDATE feed_items SET
  headline = 'Wardogs Season 3 Patch Notes: Sabatulo, Limited Mode, DMRs',
  slug = 'wardogs-season-3-patch-notes-november-12-map-limited-mode-damage-prices',
  tags = ARRAY['news', 'patch-notes', 'season-3', 'weapons', 'vehicles', 'progression', 'economy']::text[],
  verified_source = 'Bulkhead: WARDOGS | Season 03 Patch Notes (Steam news, Nov 11, 2026)',
  verified_source_url = 'https://store.steampowered.com/news/app/1867240/view/688648135317127221',
  updated_at = now(),
  body = '**WARDOGS SEASON 3 PATCH NOTES**

Bulkhead published the Wardogs Season 3 patch notes on Steam on November 11, 2026. Season 3 goes live on November 12 after a scheduled maintenance window from 13:00 to 15:00 UTC, which Bulkhead estimates at roughly 2 hours of downtime. Everything below is what the notes say, and none of it is in the game until the update goes live.

At a glance:

- A new city map, Sabatulo, and a new Limited Mode with fewer end-game items in the vendor
- Assault rifle and LMG torso damage goes up, and every DMR kills faster
- The Infrared Range Finder and the Wager Vendor are removed
- Slower progression, roughly 3-month seasons, and shared items that unlock from every role track
- The first Early Access price increase, $5, comes at the end of Season 3

**NEW MAP AND NEW MODE**

Sabatulo is Wardogs'' first city map: tight streets, high-rises and heavy destruction, with a central hospital, a swimming pool, a power station and a river embankment as key locations. Bulkhead describes it as built for urban firefights, close-quarters combat and verticality.

Limited Mode restricts the vendor to items typically available early to mid season. It has no Hollow Point or Armor Piercing ammo, no Level 3 or Level 4 armor, no attack vehicles, no CIWS, Stingray, MG Nest or Drill Rig, and no anti-tank mines. Bulkhead says it is for players who want fairer engagements with fewer end-game power items, and for players joining later in a season. Progression and cash earned there carry over to other modes, and the server browser can now filter for Limited servers.

**WEAPON CHANGES**

Assault rifle torso damage returns to Season 1 values, and LMG torso damage now matches assault rifles. Compared with Season 2, upper torso damage is up 13 percent, middle torso 3 percent and lower torso 3 percent, with or without armor. Armor reduces damage by the same percentage as before. The notes give no new absolute damage numbers.

DMR damage lands between Season 1 and Season 2 values. Bulkhead says the Season 2 DMR changes were overtuned because they landed together with the recoil changes. The listed changes:

- Body: every DMR now kills an unarmored player in 2 shots, down from 3
- Armor: the SVD, BMR-308 and M14 need 1 to 2 fewer body shots at every armor level, and the SKS needs 1 fewer against Level 2 and Level 4 armor
- Head: every DMR now kills a player with no helmet in 1 headshot, down from 2, and the SVD, BMR-308 and M14 kill through a Level 3 helmet in 2 headshots, down from 3
- Neck: damage is up, but it still takes 2 shots
- Arms and legs: no change

The TCX-SPR gets less recoil climb in full auto and less side-to-side drift. The Compound Bow''s arrow speed is up 50 percent. The Halligan Bar can now force open enemy supply crates, which drops a random item on the ground.

**MOLOTOV, PARACHUTES AND GEAR**

Standing in Molotov fire now sets you ablaze, which deals damage and forces you to drop your held item. Its unlock cost halves from $25k to $12.5k, and it moves from Level 13 to Level 8. Damage against armored vehicles and heavy armor is reduced. Bulkhead says it was rarely unlocked or used last season.

The Basic Parachute becomes an emergency parachute for bailing out of helicopters. It takes longer to open and cannot be pulled within about 20m of the ground. It is effective above about 100m, and Bulkhead says it is still survivable above about 60m if you react fast. Its price rises from $500 to $1,250. The Sport Parachute turns, glides and dives much faster with a stronger, longer flare, comes down a little faster, and is effective above about 60m (survivable above about 40m). Its price rises from $700 to $2,250. Helicopter passengers now see their height above the ground above the minimap, and there is a new reward for parachuting into an enemy FOB.

Three item weights are corrected: the AMP-9 20-round magazine goes from 1 kg to 0.3 kg, the Improvised Explosive Device from 1.5 kg to 2.7 kg, and the IED Trigger from 1.5 kg to 0.2 kg.

**REMOVED: INFRARED RANGE FINDER AND WAGER VENDOR**

The Infrared Range Finder is removed from the vendor. Bulkhead says it was used in almost every match, that the Season 2 battery nerf did not curb its power, and that it stays out until a redesign. The Wager Vendor is also removed and goes back into development. Bulkhead says testing before its Season 2 release found too many potential exploits, and a redesign that cut its earning potential weakened the high-stakes role it was meant to fill.

**VEHICLES**

Price changes:

- Wolf-110 [M2 Browning]: $7,800 to $6,800
- Kodiak [M249]: $6,750 to $6,250
- AH-6M Littlebird [Miniguns]: $12,000 to $10,480
- Havoc: $28,000 to $26,000

Bulkhead says the Wolf-110 was overpriced given how exposed its driver and passengers are, and that the Kodiak was lowered alongside it to ease the longer grind to a tank. It says the Littlebird and Havoc now have extra rewards (a destroyed vehicle within 1,000m of a control zone earns the full control zone reward, and air vehicle kill streaks return) but that the upfront cost was still turning pilots away.

Reverse speeds go up for wheeled vehicles: Bobcat 16 to about 25 km/h, Kodiak 33 to about 57, Humvee 35 to about 57, Dune Buggy 43 to about 50, Ural 15 to 27, and Wolf-110 27 to about 40. Wheeled vehicles now roll downhill off the throttle, the Ural and Humvee get slightly better traction, and the Ural, Kodiak, Humvee, Dune Buggy and Wolf-110 lose some grip beyond the top speed they can reach under normal acceleration. The Ural can no longer build unfair speed by rolling backwards downhill.

Vehicle-mounted miniguns get higher damage multipliers against infantry, between Season 1 and Season 2 levels: head +50 percent, neck +78, upper torso +64, mid torso +55, lower torso +50, and pelvis, arms and legs +56. The AH-6R Littlebird [Rockets] pods now fire their own 70mm rockets instead of the Havoc''s 122mm rockets. Damage is unchanged, but the rockets wobble in flight, which Bulkhead says makes the AH-6R slightly less effective against infantry and unchanged against vehicles and FOBs. Pilots and co-pilots in the MH-6, AH-6R and AH-6M get more protection from gunfire, again between Season 1 and Season 2 levels.

The Vanguard CIWS now damages each vehicle section once per 20x102mm round instead of several times. Damage is retuned to roughly the same as Season 2 against the Havoc and Z20 Lakota, and slightly less against the Littlebirds. The anti-air emplacement''s maximum aim angle drops from 65 to 60 degrees, which widens the overhead blind spot. Tanks are more resistant to grenades, since a single grenade could destroy a tank''s engine.

Box hedges can now be flattened by vehicles other than the Bobcat, and tanks and artillery can destroy stone walls. Supply crates can no longer be deployed inside safe zones, and the drop heights at which crates and pallets survive are lower: about 60m to about 35m for supply crates, about 80m to about 35m for armored crates, and about 90m to about 40m for pallets. Item tooltips show the new heights.

**PROGRESSION AND ECONOMY**

The XP required per level goes up, and Bulkhead says overall progression speed is slowed for Season 3 and closer to Season 1 speeds. The notes give no XP figures. Seasons are now roughly 3 months long. Bulkhead warns that a very small share of players who min-max progression may unlock better items and vehicles in the first weekend, and points other players to new player and Limited servers.

Shared items now unlock from more than one role track. Armor, backpacks, tactical vests and parachutes unlock from every role track, and ammo types are spread across the role tracks by where the weapons that use them unlock. Each role gets certain role-adjacent items a little earlier: Assault gets armor first, Medic the tactical vest, Support backpacks and Recon Armor Piercing ammo. Bulkhead calls this temporary until an intel-based progression system arrives next year.

Level changes in the notes:

- C4: Level 4 to Level 5 (Assault)
- Molotov: Level 13 to Level 8
- Large Hammer: Level 8 to Level 14 (Support), to make mega-bases harder to set up early in the season
- Verba: Level 14 to Level 8 (Support), to give Support anti-air options against the AH-6M [Miniguns]
- AMR 50: Level 35 to Level 41 (Recon)
- Tanks: Level 20-35 to Level 35-50 on the Driver track, and Level 145 to 200 on the WARDOG track
- Ammo types also move later in the WARDOG track

Low-level players get an XP catch-up bonus and an extended vendor discount that grow week by week through the season, per role. The losing-faction vendor discount is now measured against the first-place faction instead of the faction above it.

Cash rewards: destroying an enemy L81 Mortar, Talon 9K-SAM, MG Nest or Stingray now pays $1,300 (was $650), and a Vanguard CIWS $2,400 (was $1,200). Air vehicle kill streak rewards return, and a vehicle destroyed by your own vehicle within 1,000m of a control zone earns the full control zone reward. Pallets deployed outside a friendly FOB give reduced rewards, lower-value crates pay less, and there is a new kickback for fuel deposited into a FOB that activates a drill. Rewards for killing a spotted target drop: AH-6M or AH-6R $1,000 to $850, Z20 Lakota $1,400 to $1,200, L2A6 $3,300 to $3,000, T-72B3 $2,400 to $2,000, and Hot Zone Magnet $1,650 to $1,500. In XP, a spotted player goes from 150 to 125, a FOB from 250 to 200, a Hot Zone Magnet from 225 to 200 and a spawn vehicle from 500 to 400.

**SERVERS, FAIR PLAY AND EARLY ACCESS PRICE**

The ping limit on official servers rises to 250 in all regions. Bulkhead cites its ban wave of 185,000+ players and a check of regional bias against real data. Using third-party software such as NVIDIA Inspector to remove smoke or grass, change geometry or LOD bias, or alter textures is now bannable, and players with such settings are blocked on launch with a warning popup. Bulkhead will also force a reset of the "potato" shadow setting on boot when it was changed outside the in-game menu, and says spoofing system specs to keep it is bannable from Season 3. The Global Illumination setting now appears only on the Overkill preset and is off elsewhere.

Community servers get a small cash bonus for play and a customizable "Server Rules" popup for joining players. During seeding a few unarmed vehicles spawn free for each team and are cleared when the match starts. The team switch penalty now applies only if you connected to the server earlier in the current match. Bulkhead acknowledges ongoing DDoS attacks on servers in Asian regions, says it has identified the attack vector, and targets infrastructure changes for the Season 3 release.

Early Access price: the first increase comes at the end of Season 3 on 28th January and raises the price by $5. The post does not give a year. Bulkhead says the next increase is intended around the one-year anniversary in September 2027, that players who already own Wardogs pay nothing extra, and that a preview of first-half 2027 content comes in the new year.

**EVERYTHING ELSE**

Season 3 adds Steam achievements (He''s Behind You, Car Jacker and Slot Machine), Steam replay timeline events for kills, revives and giving up, a themed main menu video, and controller changes including a hold-A shortcut to the driver''s seat and a Reload Discard on X (hold). Twitch Drops are enabled for Season 3, with watch-time tiers from 15 minutes to 15 hours. The Movember Tactical ''Stache DLC sends 100 percent of its profits to Movember, and the ''stache can only be equipped during November. New Gold Market camos: Defibrillator Black & Gold (limited time), MAAWS Two-Tone Desert, Compound Bow Digital Wood, and Chocolate Chip for the M1911 and FAL.

Fixes include the grenade launcher no longer destroying tank tracks in 1 shot (it now takes 3 hits for tracks and 5 to 6 to disable the engine, matching grenades), bullets no longer killing the T-72B3 driver from outside the tank, vehicle weapon hits being credited to the wrong weapon, and collision and spawn fixes on Bakurani, Zestafona and Ozeti. The vehicle window smear from the Season 2 rain update is also fixed, which Bulkhead says was left out of the Season 2 notes.

**WHAT IS STILL UNKNOWN**

The notes give percentage changes and shots-to-kill counts, but no new damage, time-to-kill or recoil values for the assault rifles, LMGs, DMRs or the TCX-SPR. They give no XP-per-level figures and no size for the catch-up bonus or vendor discounts. They do not mention a progression or cash reset either way.

Our arsenal, tier list and loadout figures come from community testing recorded in September and October 2026 and predate Season 3. They will not reflect these changes until they are updated.

Sources: Bulkhead, WARDOGS | Season 03 Patch Notes (Steam news, November 11, 2026).'
WHERE id = '5a4d5cf6-0c4e-4028-952a-33895dbba480'
  AND game_slug = 'wardogs'
  AND patch_key = 'steam:1867240:1794419963'
  AND is_published = false
  AND rejected = false
  AND md5(body) = '734b3f351828a870e10fb6aec84ebb41'
  AND NOT EXISTS (SELECT 1 FROM feed_items f2 WHERE f2.slug = 'wardogs-season-3-patch-notes-november-12-map-limited-mode-damage-prices');

-- ============================================================
-- VERIFY: run this alone. Expect 1 row: slug wardogs-season-3-patch-notes-november-12-map-limited-mode-damage-prices,
-- body_chars 12838, body_md5 21f90201130ab2b1662865401528db9e, body_cr_pos 0, is_published false,
-- rejected false, noindex false, gate_status clear, patch_key steam:1867240:1794419963, updated_at moved.
-- ============================================================
SELECT id, slug, headline, char_length(body) AS body_chars, md5(body) AS body_md5, is_published, rejected, noindex, gate_status, patch_key, updated_at, position(chr(13) in body) AS body_cr_pos, tags, verified_source, verified_source_url
FROM feed_items
WHERE id = '5a4d5cf6-0c4e-4028-952a-33895dbba480';
