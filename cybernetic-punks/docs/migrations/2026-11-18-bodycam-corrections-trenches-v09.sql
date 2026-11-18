-- docs/migrations/2026-11-18-bodycam-corrections-trenches-v09.sql
-- Brief 405 (prepared 2026-11-18). OPERATOR-RUN in the Supabase SQL editor. NOT run by the executor.
--
-- Two public corrections in two published Bodycam articles (feed_items, game_slug bodycam).
--   Block A  08e34d80-b70d-4a88-905d-12259e17e18a  bodycam-trenches-map
--            five sentence fixes about the lighting and weather scenario (three timing fixes, and the
--            unsourced labels daylight and overcast removed in two places), then a dated Correction
--            paragraph and a Sources paragraph appended at the end.
--   Block B  f0416912-5022-42a8-b1cd-e8fe44060b03  bodycam-v09-dead-damned-every-change-coming-nov-13-ipyb
--            a dated UPDATE block (heading, intro, three bullets) prepended and a Sources line appended
--            as the last block. The existing body is kept byte for byte between them, em-dashes included.
-- Sources (Reissad Studio Steam announcements, read with GetNewsForApp in Briefs 403 and 404):
--   gid 1842846814441066 (2026-09-02) Locked and Loaded release post: the scenario system is
--     "applied at match start and each round".
--   gid 1849192144188325 (2026-11-13) v0.9 release post. gid 1848664643360428 (2026-11-10) playtest post.
--   gid 1849192144184736 (2026-11-12) Devlog [2/2].
--
-- HOW TO RUN: each block has three statements: BEFORE, UPDATE, VERIFY. Run each statement on its own
-- (select it, then Run). Run Block A and Block B separately, in any order. Each UPDATE must return
-- exactly 1 row. If an UPDATE returns 0 rows, STOP: the body is not the reviewed one, the row is not
-- published, or the edit is already applied. Running an UPDATE a second time returns 0 rows.
--
-- RULES THIS FILE FOLLOWS: ASCII only, LF line endings, no dollar quotes, no semicolon inside any
-- quoted string (chr(59) instead), no apostrophe inside any literal. Every literal sits on one line.
-- Line breaks in stored text come only from chr(): Block A uses chr(13) || chr(10) because that body
-- is CRLF throughout. Block B uses chr(10) only because that body is LF only. A CRLF checkout of this
-- file cannot put a line break into a stored body. The em-dash count in Block B uses chr(8212).
--
-- GUARDS: id, md5(body) equal to the body read on 2026-11-18 (Brief 404), is_published, and a
-- not-already-applied check. Block A also requires each of its five old strings to occur exactly once.
-- updated_at is set to now() explicitly (the feed_items set_updated_at BEFORE UPDATE trigger also fires
-- on a body change). Nothing else changes: created_at, headline, slug, tags, source, source_url,
-- verified_source, verified_source_url, provenance_tier, noindex, gate_status and operator_approved_at
-- stay as they are.
--
-- EFFECT: the visible article dates (created_at) do not change. updated_at and the sitemap-bodycam.xml
-- lastmod move for these two URLs only. The NewsArticle JSON-LD dateModified is built from created_at,
-- so it does not move. Page-level corrections, not a sitewide SEO change.
--
-- Expected values below come from the executor PGlite replay (Brief 405) on copies of the two bodies.


-- =====================================================================================
-- Block A  bodycam-trenches-map  (08e34d80-b70d-4a88-905d-12259e17e18a)
-- =====================================================================================

-- A.BEFORE  (expect: 1 row, md5 4a2f11f8f72a56291549758983ea7d78, len 4838, bytes 4838, is_published true,
--           n_old1 1, n_old2 1, n_old3 1, n_old4 1, n_old5 1, n_new4 0, n_new5 0, n_correction 0,
--           n_cr 51, n_lf 51, n_crlf 51)
SELECT id, md5(body) AS md5, char_length(body) AS len, octet_length(body) AS bytes, is_published,
       (char_length(body) - char_length(replace(body, 'rolls a weighted lighting and weather scenario at the start of a match and holds it', ''))) / char_length('rolls a weighted lighting and weather scenario at the start of a match and holds it') AS n_old1,
       (char_length(body) - char_length(replace(body, 'There is no live day-night cycle mid-match' || chr(59) || ' what you load into is what you fight in.', ''))) / char_length('There is no live day-night cycle mid-match' || chr(59) || ' what you load into is what you fight in.') AS n_old2,
       (char_length(body) - char_length(replace(body, 'Lighting and weather are rolled per match and held', ''))) / char_length('Lighting and weather are rolled per match and held') AS n_old3,
       (char_length(body) - char_length(replace(body, 'so the same layout plays very differently in daylight, overcast, or night.', ''))) / char_length('so the same layout plays very differently in daylight, overcast, or night.') AS n_old4,
       (char_length(body) - char_length(replace(body, '(day / overcast / night' || chr(59) || ' stronger moonlight)', ''))) / char_length('(day / overcast / night' || chr(59) || ' stronger moonlight)') AS n_old5,
       (char_length(body) - char_length(replace(body, 'so the same layout can play very differently depending on the scenario it rolls, night included.', ''))) / char_length('so the same layout can play very differently depending on the scenario it rolls, night included.') AS n_new4,
       (char_length(body) - char_length(replace(body, '(night matches have stronger moonlight)', ''))) / char_length('(night matches have stronger moonlight)') AS n_new5,
       (char_length(body) - char_length(replace(body, 'Correction (November 18, 2026)', ''))) / char_length('Correction (November 18, 2026)') AS n_correction,
       (char_length(body) - char_length(replace(body, chr(13), ''))) AS n_cr, (char_length(body) - char_length(replace(body, chr(10), ''))) AS n_lf, (char_length(body) - char_length(replace(body, chr(13) || chr(10), ''))) / 2 AS n_crlf,
       created_at, updated_at
FROM feed_items
WHERE id = '08e34d80-b70d-4a88-905d-12259e17e18a';

-- A.UPDATE  (expect: 1 row returned, new_md5 a366bca03b4d8645e1392a2c73407772, new_len 5681, new_bytes 5681)
UPDATE feed_items
SET body = replace(
      replace(
        replace(
          replace(
            replace(
              body,
              'rolls a weighted lighting and weather scenario at the start of a match and holds it',
              'uses a weighted lighting and weather scenario that Reissad says is applied at match start and each round'
            ),
            'so the same layout plays very differently in daylight, overcast, or night.',
            'so the same layout can play very differently depending on the scenario it rolls, night included.'
          ),
          'There is no live day-night cycle mid-match' || chr(59) || ' what you load into is what you fight in.',
          'The dynamic time-of-day system was replaced by this scenario system, and Reissad does not say whether the weather can change within a round.'
        ),
        'Lighting and weather are rolled per match and held',
        'Lighting and weather scenarios are applied at match start and each round'
      ),
      '(day / overcast / night' || chr(59) || ' stronger moonlight)',
      '(night matches have stronger moonlight)'
    )
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'Correction (November 18, 2026): An earlier version of this article said Trenches rolls its lighting and weather scenario once at the start of a match and holds it for the whole match. The Locked and Loaded notes from Reissad say the scenario system is applied at match start and each round, and they do not say whether the weather can change within a round. We have corrected the three sentences that said otherwise and removed the labels daylight and overcast, which the Reissad notes do not use.'
    || chr(13) || chr(10) || chr(13) || chr(10)
    || 'Sources: Reissad Studio, "Bodycam Major Update OUT NOW! | Trench Warfare, Loadout System & Much More!" (September 2, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1842846814441066',
    updated_at = now()
WHERE id = '08e34d80-b70d-4a88-905d-12259e17e18a'
  AND md5(body) = '4a2f11f8f72a56291549758983ea7d78'
  AND is_published
  AND position('Correction (November 18, 2026)' in body) = 0
  AND (char_length(body) - char_length(replace(body, 'rolls a weighted lighting and weather scenario at the start of a match and holds it', ''))) = char_length('rolls a weighted lighting and weather scenario at the start of a match and holds it')
  AND (char_length(body) - char_length(replace(body, 'There is no live day-night cycle mid-match' || chr(59) || ' what you load into is what you fight in.', ''))) = char_length('There is no live day-night cycle mid-match' || chr(59) || ' what you load into is what you fight in.')
  AND (char_length(body) - char_length(replace(body, 'Lighting and weather are rolled per match and held', ''))) = char_length('Lighting and weather are rolled per match and held')
  AND (char_length(body) - char_length(replace(body, 'so the same layout plays very differently in daylight, overcast, or night.', ''))) = char_length('so the same layout plays very differently in daylight, overcast, or night.')
  AND (char_length(body) - char_length(replace(body, '(day / overcast / night' || chr(59) || ' stronger moonlight)', ''))) = char_length('(day / overcast / night' || chr(59) || ' stronger moonlight)')
RETURNING id, md5(body) AS new_md5, char_length(body) AS new_len, octet_length(body) AS new_bytes;

-- A.VERIFY  (expect: md5 a366bca03b4d8645e1392a2c73407772, len 5681, bytes 5681, n_old1 0, n_old2 0, n_old3 0, n_old4 0, n_old5 0,
--           n_new1 1, n_new2 1, n_new3 1, n_new4 1, n_new5 1, n_sentence1 1, n_correction 1, n_sources_para 1,
--           n_cr 55, n_lf 55, n_crlf 55, ends_with_sources true, created_at unchanged, updated_at = the time of the run)
SELECT id, md5(body) AS md5, char_length(body) AS len, octet_length(body) AS bytes,
       (char_length(body) - char_length(replace(body, 'rolls a weighted lighting and weather scenario at the start of a match and holds it', ''))) / char_length('rolls a weighted lighting and weather scenario at the start of a match and holds it') AS n_old1,
       (char_length(body) - char_length(replace(body, 'There is no live day-night cycle mid-match' || chr(59) || ' what you load into is what you fight in.', ''))) / char_length('There is no live day-night cycle mid-match' || chr(59) || ' what you load into is what you fight in.') AS n_old2,
       (char_length(body) - char_length(replace(body, 'Lighting and weather are rolled per match and held', ''))) / char_length('Lighting and weather are rolled per match and held') AS n_old3,
       (char_length(body) - char_length(replace(body, 'so the same layout plays very differently in daylight, overcast, or night.', ''))) / char_length('so the same layout plays very differently in daylight, overcast, or night.') AS n_old4,
       (char_length(body) - char_length(replace(body, '(day / overcast / night' || chr(59) || ' stronger moonlight)', ''))) / char_length('(day / overcast / night' || chr(59) || ' stronger moonlight)') AS n_old5,
       (char_length(body) - char_length(replace(body, 'uses a weighted lighting and weather scenario that Reissad says is applied at match start and each round', ''))) / char_length('uses a weighted lighting and weather scenario that Reissad says is applied at match start and each round') AS n_new1,
       (char_length(body) - char_length(replace(body, 'The dynamic time-of-day system was replaced by this scenario system, and Reissad does not say whether the weather can change within a round.', ''))) / char_length('The dynamic time-of-day system was replaced by this scenario system, and Reissad does not say whether the weather can change within a round.') AS n_new2,
       (char_length(body) - char_length(replace(body, 'Lighting and weather scenarios are applied at match start and each round', ''))) / char_length('Lighting and weather scenarios are applied at match start and each round') AS n_new3,
       (char_length(body) - char_length(replace(body, 'so the same layout can play very differently depending on the scenario it rolls, night included.', ''))) / char_length('so the same layout can play very differently depending on the scenario it rolls, night included.') AS n_new4,
       (char_length(body) - char_length(replace(body, '(night matches have stronger moonlight)', ''))) / char_length('(night matches have stronger moonlight)') AS n_new5,
       (char_length(body) - char_length(replace(body, 'Like every Bodycam map, Trenches uses a weighted lighting and weather scenario that Reissad says is applied at match start and each round -- so the same layout can play very differently depending on the scenario it rolls, night included.', ''))) / char_length('Like every Bodycam map, Trenches uses a weighted lighting and weather scenario that Reissad says is applied at match start and each round -- so the same layout can play very differently depending on the scenario it rolls, night included.') AS n_sentence1,
       (char_length(body) - char_length(replace(body, 'Correction (November 18, 2026)', ''))) / char_length('Correction (November 18, 2026)') AS n_correction,
       (char_length(body) - char_length(replace(body, chr(13) || chr(10) || chr(13) || chr(10) || 'Sources: ', ''))) / 13 AS n_sources_para,
       (char_length(body) - char_length(replace(body, chr(13), ''))) AS n_cr, (char_length(body) - char_length(replace(body, chr(10), ''))) AS n_lf, (char_length(body) - char_length(replace(body, chr(13) || chr(10), ''))) / 2 AS n_crlf,
       right(body, 16) = '1842846814441066' AS ends_with_sources,
       created_at, updated_at
FROM feed_items
WHERE id = '08e34d80-b70d-4a88-905d-12259e17e18a';


-- =====================================================================================
-- Block B  bodycam-v09-dead-damned-every-change-coming-nov-13-ipyb  (f0416912-5022-42a8-b1cd-e8fe44060b03)
-- =====================================================================================

-- B.BEFORE  (expect: 1 row, md5 3b6ab145366e80e28c2b4afdb0daf3b4, len 3267, bytes 3285, is_published true,
--           n_update_nov18 0, n_cr 0, n_lf 28, n_emdash 9)
SELECT id, md5(body) AS md5, char_length(body) AS len, octet_length(body) AS bytes, is_published,
       (char_length(body) - char_length(replace(body, 'UPDATE, NOVEMBER 18, 2026', ''))) / char_length('UPDATE, NOVEMBER 18, 2026') AS n_update_nov18,
       (char_length(body) - char_length(replace(body, chr(13), ''))) AS n_cr, (char_length(body) - char_length(replace(body, chr(10), ''))) AS n_lf, (char_length(body) - char_length(replace(body, chr(8212), ''))) AS n_emdash,
       created_at, updated_at
FROM feed_items
WHERE id = 'f0416912-5022-42a8-b1cd-e8fe44060b03';

-- B.UPDATE  (expect: 1 row returned, new_md5 d6c09bb6b531db30508ddacf2ea98370, new_len 4725, new_bytes 4743)
UPDATE feed_items
SET body = '**UPDATE, NOVEMBER 18, 2026**'
    || chr(10) || chr(10)
    || 'Bodycam v0.9, The Dead & Damned, released on November 13, 2026. This article was written on October 29 from the Reissad preview post, and the present and future tense below describes that preview. Three things have changed since then.'
    || chr(10) || chr(10)
    || '- Release: the November 13 release post says v0.9 is now live, and its changelist is in the same post.'
    || chr(10)
    || '- Weapon name: the October 29 preview post called the new machine pistol the TEC-9. The November 10, November 12 and November 13 Reissad posts call it the TK-9. We found no Reissad text saying the weapon was renamed, so the article below keeps the name used in the October 29 preview.'
    || chr(10)
    || '- Anti-cheat: the November 13 release post says Easy Anti-Cheat is live from day one with v0.9, integrated into PC peer-to-peer multiplayer matches. The article below says the preview did not say which lobby types it covers.'
    || chr(10) || chr(10)
    || body
    || chr(10) || chr(10)
    || 'Sources: Reissad Studio, "Bodycam v0.9 The Dead & Damned is OUT NOW" (November 13, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144188325' || chr(59) || ' Reissad Studio, "The Dead & Damned Playtest: Zombies Are Back, 24 Hours Only" (November 10, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1848664643360428' || chr(59) || ' Reissad Studio, "We made a map nobody want to play | Devlog [2/2]" (November 12, 2026): https://steamstore-a.akamaihd.net/news/externalpost/steam_community_announcements/1849192144184736',
    updated_at = now()
WHERE id = 'f0416912-5022-42a8-b1cd-e8fe44060b03'
  AND md5(body) = '3b6ab145366e80e28c2b4afdb0daf3b4'
  AND is_published
  AND position('UPDATE, NOVEMBER 18, 2026' in body) = 0
RETURNING id, md5(body) AS new_md5, char_length(body) AS new_len, octet_length(body) AS new_bytes;

-- B.VERIFY  (expect: md5 d6c09bb6b531db30508ddacf2ea98370, len 4725, bytes 4743, n_update_nov18 1, n_cr 0, n_lf 38,
--           n_emdash 9, old_body_md5 3b6ab145366e80e28c2b4afdb0daf3b4, ends_with_sources true, created_at unchanged,
--           updated_at = the time of the run)
-- old_body_md5: the old body starts right after H1 + LF LF + H2 + LF LF + the three H3 lines + LF LF,
-- which is 881 characters, so at position 882 (1-based), and is 3267 characters long.
SELECT id, md5(body) AS md5, char_length(body) AS len, octet_length(body) AS bytes,
       (char_length(body) - char_length(replace(body, 'UPDATE, NOVEMBER 18, 2026', ''))) / char_length('UPDATE, NOVEMBER 18, 2026') AS n_update_nov18,
       (char_length(body) - char_length(replace(body, chr(13), ''))) AS n_cr, (char_length(body) - char_length(replace(body, chr(10), ''))) AS n_lf, (char_length(body) - char_length(replace(body, chr(8212), ''))) AS n_emdash,
       md5(substr(body, 882, 3267)) AS old_body_md5,
       right(body, 16) = '1849192144184736' AS ends_with_sources,
       created_at, updated_at
FROM feed_items
WHERE id = 'f0416912-5022-42a8-b1cd-e8fe44060b03';
