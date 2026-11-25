UPDATE feed_items
SET body = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(body,
    'No. Bodycam has no classes. There is no Assault, no Medic, no Engineer, and no role you pick from a menu before a match. Every player drops in as the same operator body. ',
    'We found no Reissad post that describes preset classes or roles for Bodycam. What Reissad does describe is players building their own loadouts, each made for their own play style, in its Devlog #1. '),
    'This is a deliberate design choice, in keeping with the game' || chr(39) || 's grounded, tactical lineage -- closer to Counter-Strike or Ready or Not than to a class-based shooter. ',
    ''),
    'There is no loadout the game builds for you and no role that locks a slot.',
    'In its Devlog #1, Reissad says you are no longer stuck with random weapons: you choose everything and can create as many loadouts as you want.'),
    'Bodycam' || chr(39) || 's combat is lethal and grounded -- engagements are often settled in one or two shots, and reloading is punished if you do it under fire -- so what you carry matters less than when and how you use it.',
    'In its Devlog #1, Reissad says every weapon part changes how the weapon behaves, and that reloads under stress become rushed and less precise.'),
    '- Bodycam has no classes' || chr(59) || ' every player uses the same operator body.',
    '- No Reissad post found describing preset classes. Players build their own loadouts.'),
    'Because there are no classes, every player is self-sufficient by default -- you bring your own answer to each situation in the five slots, rather than leaning on a teammate' || chr(39) || 's assigned role.',
    'Because you choose your own loadout, the five slots are where you decide how you want to play.'),
    ', with no class menu in between.',
    '.'),
    'Gear is earned through play, not handed out by a class.',
    'Gear is earned through play.'),
    'It also puts the weight on decisions rather than raw loadout power. ',
    ''),
    ' Two players on the same team can fill completely different roles without either of them ever selecting one.',
    ''),
    'Sources: Reissad Studio, "Bodycam v0.9 The Dead & Damned is OUT NOW" (November 13, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144188325',
    'Correction (November 25, 2026): An earlier version of this article said flatly that Bodycam has no classes, listed three role names and said none exist, and said every player uses the same operator body. No Reissad source we checked states any of that, and Reissad' || chr(39) || 's March 2026 roadmap lists Operator among the things you customize, so we removed those claims. We also removed a comparison to other games and a claim about design intent, a sentence about combat being settled in one or two shots, and a line saying what you carry matters less than how you use it, because Reissad says in its Devlog #1 that every weapon part changes how the weapon behaves. We also reworded or removed other sentences that repeated the no-classes claim. Other descriptive sentences in this article, such as how the loadout slots work as a play style, are our own reading and were not changed in this correction.' || chr(13) || chr(10) || chr(13) || chr(10) || 'Sources: Reissad Studio, "Bodycam v0.9 The Dead & Damned is OUT NOW" (November 13, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144188325' || chr(59) || ' Reissad Studio, "Bodycam Devlog Part [1/4] : Animation & Loadout | V0.8 Locked & Loaded" (August 18, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1840944183788763' || chr(59) || ' Reissad Studio, Devlog #1: Animation & Loadout, video: https://www.youtube.com/watch?v=6YUWQXv0MTk' || chr(59) || ' Reissad Studio, "BODYCAM 2026 ROADMAP PART 1" (March 6, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1826362059925643'),
    updated_at = now()
WHERE id = '658ee121-e3cb-48b8-a6cf-10ee51c0c8ba'
  AND md5(body) = 'c69afd123ba0ebda75c3266449ce4705'
  AND is_published = true
  AND body NOT LIKE '%Correction (November 25, 2026)%';
