UPDATE feed_items
SET body = '**UPDATE, NOVEMBER 19, 2026**'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'Reissad released v0.9 on November 13, 2026, so several statements on this page, written on October 2, are out of date. The sections below are left as written, and this update lists what Reissad has posted since.'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || '- Party System: still not released. Reissad says it is not part of v0.9 and that the solo-only Quick Play and Server Browser workaround stays in place for v0.9. Reissad also says it stopped building the online multiplayer layer on the external provider technology it had chosen and is now building its own solution with Epic Online Services and custom tech. It calls the Party System its number one priority, says it cannot commit to a date, and says it will do everything it can to deliver it in the coming months. Its v0.9 post does not mention the experimental-branch plan described below.'
    || chr(13) || chr(10)
    || '- Zombies: back. It was first playable again in a limited 24-hour playtest that opened on November 11 at 09:00 UTC, and for everyone from the November 13 release. Reissad says Zombies matches now earn Reissad Points, and its release post has a section headed "Zombies is permanent."'
    || chr(13) || chr(10)
    || '- Anti-cheat: Easy Anti-Cheat went live with v0.9 in PC peer-to-peer multiplayer matches. Reissad calls it the first building block of its anti-cheat and says more anti-cheat features will follow.'
    || chr(13) || chr(10)
    || '- Release: v0.9 shipped on November 13, 2026. Before release, Reissad described it as "a smaller, in-between update." This page said no date had been announced.'
    || chr(13) || chr(10)
    || '- Lobby: v0.9 added a new drone and RC car room with FPV radio controller and joystick support, developed with TRYP FPV. We found no Reissad post saying whether the obstacle course and shoot house rooms listed as closed below have opened.'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'Reissad has not addressed the Wingman duo queue, the real-money shop, language support, Oil Rig and Tumblewood, or the team-killing system in the posts we checked from October 1 through November 16. We will keep updating this page as Reissad posts.'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || body
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'Sources: Reissad Studio, "Bodycam v0.9 The Dead & Damned is OUT NOW" (November 13, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144188325' || chr(59) || ' Reissad Studio, "The Dead & Damned Playtest: Zombies Are Back, 24 Hours Only" (November 10, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1848664643360428' || chr(59) || ' Reissad Studio, "The Bodycam v0.9 Playtest is LIVE: bring your 3 friends" (November 11, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144177820' || chr(59) || ' Reissad Studio, "BODYCAM V0.9 THE DEAD & DAMNED - RELEASE DATE & WHAT' || chr(39) || 'S COMING" (October 29, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1847920302235981',
    updated_at = now()
WHERE id = 'c696f91f-3630-4be7-8468-9c0317d9a049'
  AND md5(body) = 'e3728c3ea4a76a4330ca10dd5514d196'
  AND is_published = true
  AND body NOT LIKE '%UPDATE, NOVEMBER 19, 2026%';

UPDATE feed_items
SET body = '**UPDATE, NOVEMBER 19, 2026**'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'Reissad released v0.9 on November 13, 2026, so the Zombies section of this page, written on October 2, is out of date. The rest of the page is left as written, and this update lists what Reissad has posted since about modes.'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || '- Zombies: back. It was first playable again in a limited 24-hour playtest that opened on November 11 at 09:00 UTC, and for everyone from the November 13 release. This page said no date had been given.'
    || chr(13) || chr(10)
    || '- Reissad Points: Reissad says Zombies matches now earn Reissad Points. We found no published rate, so the Reissad Points by Mode list below has no Zombies line.'
    || chr(13) || chr(10)
    || '- New content: Reissad says v0.9 brings a brand new mode on Trenches and a full pass on the Village and Asylum maps. This page does not cover them.'
    || chr(13) || chr(10)
    || '- Playing with friends: the Party System is not part of v0.9, and Reissad says the solo-only Quick Play and Server Browser workaround stays in place for v0.9.'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || body
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'Sources: Reissad Studio, "Bodycam v0.9 The Dead & Damned is OUT NOW" (November 13, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144188325' || chr(59) || ' Reissad Studio, "The Dead & Damned Playtest: Zombies Are Back, 24 Hours Only" (November 10, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1848664643360428' || chr(59) || ' Reissad Studio, "The Bodycam v0.9 Playtest is LIVE: bring your 3 friends" (November 11, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144177820',
    updated_at = now()
WHERE id = '48bae7ee-a939-4e9c-ad5a-73949f18a370'
  AND md5(body) = 'a3df128fb8b90a1f78e242604f4dd7c6'
  AND is_published = true
  AND body NOT LIKE '%UPDATE, NOVEMBER 19, 2026%';

UPDATE feed_items
SET body = body
    || chr(13) || chr(10) || chr(13) || chr(10)
    || '**UPDATE, NOVEMBER 19, 2026**'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'This page describes the September 2 Locked & Loaded release. Reissad released v0.9 on November 13, 2026, and three statements on this page have changed since then.'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || '- Zombies: the What Was Left Out at Launch list above says Reissad planned to bring it back for Halloween. Zombies was first playable again in a limited 24-hour playtest that opened on November 11 at 09:00 UTC, and for everyone from the November 13 release.'
    || chr(13) || chr(10)
    || '- Anti-cheat: the same list says anti-cheat was described as well underway. Easy Anti-Cheat went live with v0.9 in PC peer-to-peer multiplayer matches, and Reissad calls it the first building block of its anti-cheat.'
    || chr(13) || chr(10)
    || '- FPV controllers: the Drones, RC Cars, Knives and Grenades section above says dedicated radio-controller support was in development with Tryp FPV. Reissad says v0.9 added FPV radio controller and joystick support, developed with TRYP FPV.'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'The Party System is not part of v0.9, and Reissad says the solo-only Quick Play and Server Browser workaround stays in place for v0.9. In the Reissad posts we checked through November 16, we found nothing since September on Oil Rig and Tumblewood, the real-money shop, or language support.'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'Sources: Reissad Studio, "Bodycam v0.9 The Dead & Damned is OUT NOW" (November 13, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144188325' || chr(59) || ' Reissad Studio, "The Dead & Damned Playtest: Zombies Are Back, 24 Hours Only" (November 10, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1848664643360428' || chr(59) || ' Reissad Studio, "The Bodycam v0.9 Playtest is LIVE: bring your 3 friends" (November 11, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144177820',
    updated_at = now()
WHERE id = 'd0e1ded6-e9da-4867-819a-7fbf98825b65'
  AND md5(body) = '7ccbf3aa4376bafcc9b356687413b058'
  AND is_published = true
  AND body NOT LIKE '%UPDATE, NOVEMBER 19, 2026%';

UPDATE feed_items
SET body = body
    || chr(13) || chr(10) || chr(13) || chr(10)
    || '**UPDATE, NOVEMBER 19, 2026**'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'This guide was written from the September 2 Locked & Loaded update. Reissad released v0.9 on November 13, 2026, and two things above have changed or are unchecked.'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || '- Reissad Points: Reissad says Zombies matches now earn Reissad Points, so "any mode" above now includes Zombies.'
    || chr(13) || chr(10)
    || '- Loadout: Reissad says v0.9 puts two new weapons in your loadout and adds a new drone and RC car room in the lobby. We have not rechecked this guide against the v0.9 patch notes, so the slot and unlock details above are as of September 2.'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'Sources: Reissad Studio, "Bodycam v0.9 The Dead & Damned is OUT NOW" (November 13, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144188325',
    updated_at = now()
WHERE id = '658ee121-e3cb-48b8-a6cf-10ee51c0c8ba'
  AND md5(body) = '16379feb18733ac997afd05dfda08bcd'
  AND is_published = true
  AND body NOT LIKE '%UPDATE, NOVEMBER 19, 2026%';
