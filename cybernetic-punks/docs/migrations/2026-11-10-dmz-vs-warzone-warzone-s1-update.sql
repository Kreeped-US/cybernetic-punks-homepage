-- docs/migrations/2026-11-10-dmz-vs-warzone-warzone-s1-update.sql
-- Brief 336. Prepared by Claude, NOT run. Justin runs this in the Supabase SQL editor.
-- dmz-vs-warzone: add a dated Update paragraph (Warzone Season 1 post) after the Oct 23 Update, and the post to the Sources line.
-- Guard: id + slug + md5 of the current body. If the body has changed since 2026-11-10 the UPDATE matches 0 rows and changes nothing.
-- Line endings: replace(..., chr(13), '') strips any carriage return a CRLF checkout or copy adds inside the dollar quotes,
-- so the stored body keeps plain LF line breaks as today (the current dmz-vs-warzone body contains none).
-- feed_items has a BEFORE UPDATE trigger on body, so updated_at moves on its own; it is not set here. verified_source is not changed.

-- BEFORE (expected: 1 row, body_chars 5486, body_md5 f2e79fd4b1a11f5f911e0de9457f1eef)
SELECT id, slug, char_length(body) AS body_chars, md5(body) AS body_md5, updated_at FROM feed_items WHERE id = 'c46cb6e3-a6fe-49c9-858a-77cc67e4886e';

UPDATE feed_items SET body = replace($vs_wz_s1_20261110$**Two Modes, Opposite Goals**

DMZ and Warzone share the Call of Duty franchise, but in the shipped games they are built around opposite objectives. Warzone is about being the last squad standing. DMZ is about getting in, taking what you can, and getting out alive.

**Warzone, in the shipped games**

Warzone is a battle royale. Large lobbies drop into one map, a collapsing circle forces everyone together, and the last team alive wins. Activision's Warzone 2.0 tactical overview (November 14, 2022) describes Buy Stations where you purchase items with Cash, Contracts you accept in-match for Cash, and a Gulag with its own arena where eliminated players fight for a way back. You start with a pistol and two Armor Plates, and everything else must be collected within the map.

**The original DMZ, in the shipped games**

The original DMZ arrived with Warzone 2.0 Season 01 in November 2022, alongside Modern Warfare II. Activision's launch posts describe it as an open-world, narrative-focused extraction mode in which squads complete missions given by three factions, plus side objectives and Contracts. Dying costs you the nonpermanent items in your Backpack, and what you extract is kept in Storage that you can access between matches. The main threat is AI combatants, and you may also meet other Operators, so it is PvPvE rather than pure PvP.

**The core differences**

- Win condition: Warzone is last-team-standing; DMZ is complete your objectives and extract.
- Gear persistence: in Warzone nothing carries out; in DMZ you keep what you extract.
- Threat model: Warzone is player-versus-player; DMZ mixes players and AI (PvPvE).
- Pacing: Warzone is timed by a shrinking circle; DMZ lets you choose when to push and when to leave.

**What MW4 has announced for DMZ**

According to Call of Duty's official Deep Dive, published June 6, 2026, DMZ returns in Modern Warfare 4 in a new setting: the Hajin Exclusion Zone, a Korean-peninsula region the blog describes as scarred by radiation and evacuation. None of the following has been played -- it is what the developers have announced, not verified in-game.

- The extraction loop returns. As a shadow CIA asset you secure abandoned technology before rival forces, with Rogue Operators and enemy combatants both active.
- A Forward Operating Base anchors preparation, with a Gunsmith (weapons and attachments bought with cash, where more effective gear costs more, up to five attachments plus an Apex, and eight-attachment weapons revealed for Hajin), a Weapon Vendor, a persistent Stash, a cash Wallet (Deep Dive Part 2 calls it the Bank), and a 3D Printer that crafts gear from recovered resources -- though not Primary, Secondary, or Melee weapons.
- Active Duty Operators are managed and recovered after failed exfils, each carrying a persistent loadout and Trait Tree. Deep Dive Part 2 adds that a recovered Operator keeps their Traits but returns without their gear, and that Traits come from three Trait Trees.
- Hostile Lieutenants are hunted via the Boss Board and Hunt Towers, and dense fog banks and overcast skies change how familiar routes play.

The June Deep Dive does not detail the weapon roster or any tuning or numbers, and its map coverage names the Fallout reactor, the Prison complex, Hajin City and the Military Base. Deep Dive Part 1, published October 5, 2026, tours 13 major locations and says Hajin has over 60 named locations in total. Deep Dive Part 2, published October 9, 2026, lists 32 launch weapons across eight categories in the Gunsmith.

**Launch status**

The shape is familiar -- extraction, not battle royale -- but everything MW4-specific stays announced, not verified, until the mode is live.

DMZ launched October 23, 2026 as part of Call of Duty: Modern Warfare 4. Early Access opened October 20 for a digital pre-order or pre-purchase of the Standard Digital or Vault Edition.

Update (October 15, 2026): We removed two details about the original DMZ that Activision's own posts do not confirm (a no-respawn rule and insured weapon slots), and tied the background sections to Activision's 2022 posts. We also corrected the weather and PvPvE wording to match the June Deep Dive.

Update (October 23, 2026): DMZ is now live. This article was written before launch, so its MW4-specific details are as announced or reported at the time. See the DMZ hub for what is currently verified.

Update (November 10, 2026): Call of Duty's November 2 Warzone Season 1 post says Warzone Season 1 goes live at 0000 ET on November 6 (2100 PT on November 5). It describes a Battle Royale version of Hajin and says it differs from the DMZ version of the map in how the Edge Circle and gas move, in the available vehicles, in the distribution of interactable objects and loot caches, and in having no radioactive cloud at the nuclear reactor. The post also says Player Level resets, with optional Prestige across Multiplayer, DMZ and Warzone. For DMZ it mentions a new area, bosses and other bonus content, without details. The Warzone sections above still describe Warzone 2.0 as Activision's 2022 posts did; we have not compared the two modes on the new Hajin in game.

Sources: Call of Duty blog, "Modern Warfare 4 DMZ: Explore the Hajin Exclusion Zone" (June 6, 2026): https://www.callofduty.com/blog/2026/06/call-of-duty-modern-warfare-4-dmz-deep-dive; "DMZ Deep Dive, Part 1: Tour of Duty - Hajin Environments and Threats, Full Intel Guide" (October 5, 2026): https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-deep-dive-hajin; "DMZ Deep Dive, Part 2: How to Play - Forward Operating Base (FOB) Full Intel Guide" (October 9, 2026): https://www.callofduty.com/blog/2026/10/call-of-duty-modern-warfare-4-dmz-how-to-play-forward-operating-base-guide; Call of Duty blog, "Squad Up, Drop In! Call of Duty: Warzone 2.0 Tactical Overview - New Features, DMZ, and More" (November 14, 2022): https://www.callofduty.com/blog/2022/11/call-of-duty-warzone-2-0-season-01-dmz-battle-royale-overview; "Call of Duty: Modern Warfare II and Call of Duty: Warzone 2.0 Season 01: Everything You Need to Know, Including DMZ" (November 9, 2022): https://www.callofduty.com/blog/2022/11/call-of-duty-modern-warfare-II-warzone-2-0-season-01-overview-battle-pass-dmz; Call of Duty blog, Warzone Season 1 post (November 2, 2026): https://www.callofduty.com/blog/2026/11/call-of-duty-modern-warfare-4-warzone-season-1.$vs_wz_s1_20261110$, chr(13), '')
WHERE id = 'c46cb6e3-a6fe-49c9-858a-77cc67e4886e' AND slug = 'dmz-vs-warzone' AND md5(body) = 'f2e79fd4b1a11f5f911e0de9457f1eef';
-- expected: UPDATE 1

-- VERIFY (expected: body_chars 6404, body_md5 dc00b35808da41dbf636bfecb3c370cc, has_update true, has_source true, updated_at later than 2026-10-23T22:18:15Z)
SELECT id, char_length(body) AS body_chars, md5(body) AS body_md5, updated_at, body LIKE '%Update (November 10, 2026)%' AS has_update, body LIKE '%modern-warfare-4-warzone-season-1.%' AS has_source FROM feed_items WHERE id = 'c46cb6e3-a6fe-49c9-858a-77cc67e4886e';
