-- 2026-09-02-bodycam-article-trenches.sql
-- Bodycam article #2 (the Trenches flagship-map deep-dive) -- a feed_items insert. THE OPERATOR
-- RUNS THIS in Supabase after review. Claude runs no DB writes.
--
-- GROUNDING: 100% from the CONFIRMED tier of docs/bodycam/BODYCAM_MAPS_REFERENCE.md (Reissad's
-- Sept 2 2026 "Locked & Loaded" patch + devlog). Trenches is confirmed-current, so no historical-pool
-- hedging. No fabricated numbers, no invented callouts. Destructible trees are flagged ROADMAP (not
-- shipped). Zombies maps are not treated as active. Unpublished specifics are left unstated in-body.
--
-- WHERE IT RENDERS: /bodycam/field-intel/bodycam-trenches-map. Requires BOTH this row AND the
-- slug->section mapping in lib/games/bodycam.js BODYCAM_ARTICLE_SECTION (added on this branch).
--
-- STATE: is_published=true (goes live on run), noindex=true (bodycam.indexable is false -> the
-- /bodycam subtree is noindex now; article is live-but-not-indexed, built to rank on the flip).
-- When bodycam.indexable flips and this piece should index, set noindex=false, noindexed_at=null.
--
-- EDITOR: NEXUS (bodycam's configured voice; matches article #1 and the new-game convention; a new
-- flagship map from the patch is timely Meta & News). SECTION: field-intel (matches article #1).
--
-- BODY FORMAT: standard markdown -- whole-line **bold** section headers, "- " bullet lists, and
-- blank-line-separated paragraphs. The shared parser (lib/dmz/articleContent.splitBlocks, CRLF fix
-- on main) normalizes CRLF->LF, so this renders as headings/lists/paragraphs (not a wall of text).
--
-- SOURCE: source_url is the real Bodycam store page (official source hub; not synthesized); the
-- patch + devlog are cited by name in-body. Replace with the exact patch/devlog permalink if you have it.
--
-- IDEMPOTENCY: no unique key on (game_slug, slug), so a re-run DUPLICATES. Run ONCE. To reset:
-- delete from feed_items where game_slug='bodycam' and slug='bodycam-trenches-map';
--
-- Run the whole statement at once.

insert into feed_items
  (game_slug, editor, headline, slug, body, tags, source, source_url, ce_score, is_published, noindex, noindexed_at, thumbnail, created_at)
values (
  'bodycam',
  'NEXUS',
  'Bodycam Trenches Map: What It Is and How It Plays',
  'bodycam-trenches-map',
  $bc$**The Short Answer**

Trenches is Bodycam's new flagship map, added in the September 2, 2026 "Locked & Loaded" update and one of the largest the studio has built. It is an outdoor, World War-style battlefield of trench lines, tunnels, and open ground, researched from real war footage. It plays as three fights at once: close-quarters work down in the trenches, long sightlines across the open flats, and a vertical threat from drones overhead.

**A Map Split Into Two Halves**

Trenches is built so you always know which side you are on. The battlefield is divided into two visual halves -- one side dense, standing forest; the other shelled, devastated ground. That contrast is a readability tool: a glance tells you your orientation and whose ground you are pushing into.

Between and beneath the two halves runs the trench system itself:

- Flooded and dry trench networks -- the primary infantry routes.
- Underground galleries and tunnels that connect sections out of sight.
- A central ruined church with a large underground shelter -- the map's landmark and a natural contested hub.
- Observation posts and ruined compounds along the line.
- Drone workshops built into the trenches (see below).
- Open fields between positions -- the exposed ground you cross at your peril.

**Minefield Borders, Not Invisible Walls**

The map edges are minefields -- a real, in-fiction kill boundary, not an invisible wall. Wander out and the mines kill you, which keeps the border consistent with the world instead of breaking immersion with a barrier. Treat the minefield as terrain: it bounds the play space and punishes flanks that stray too wide.

**How It Plays**

Trenches rewards reading the ground. Down in the trench networks and tunnels it is brutal close-quarters combat -- corners, blind turns, and Bodycam's one-or-two-shot lethality, where audio matters more than sightlines. Up on the open fields it flips to long-range engagements where crossing exposed ground without cover gets you killed. The two visual halves and the church hub are the map's anchors; most rounds are decided by whether you take the fight you are equipped for or get caught in the wrong one.

**The Drone and RC Dimension**

Gadgets are a map feature here, not just a loadout toy. Trenches was built with dedicated FPV drone and RC car lanes, and drone workshops are part of the trench line itself. That adds a genuine vertical and remote threat: a drone overhead or an RC car down a tunnel can scout or strike where infantry cannot reach. On this map you account for the airspace, not just the ground.

**Weather Changes The Same Ground**

Like every Bodycam map, Trenches rolls a weighted lighting and weather scenario at the start of a match and holds it -- so the same layout plays very differently in daylight, overcast, or night. Night is darker and moonlit (moonlight is stronger than before), turning the open fields into a different problem and the tunnels near-black. There is no live day-night cycle mid-match; what you load into is what you fight in.

**Modes**

Trenches supports Hardpoint -- holding the rotating zones -- and Wingman, Bodycam's ranked 2v2. Wingman-compatible maps received bombsites and side-switch, and you cannot join a Wingman round mid-match. The map's scale and multiple routes suit the objective push of Hardpoint and the tight, reset-based rounds of Wingman alike.

**Early Access And What Is Still Coming**

Bodycam is in Early Access and Trenches is new, so expect iteration. Destructible trees are on the ROADMAP -- announced, not shipped in this update -- so do not assume you can drop cover yet. The studio has said the map was researched from real war footage -- drone video, satellite imagery, and veteran interviews -- which is where its layout language comes from. Details the studio has not published (exact dimensions, spawn logic, precise callouts) are not stated here; they are added as they are confirmed in-game.

**Key facts**

- Trenches is Bodycam's new flagship map, added in the Sept 2, 2026 "Locked & Loaded" update -- one of the largest built.
- Outdoor; two visual halves (standing forest / shelled devastation) for instant orientation.
- Flooded and dry trenches, underground tunnels, a central ruined church with a shelter, observation posts, ruined compounds, and open fields.
- Borders are minefields -- a kill-boundary, not an invisible wall.
- Built with FPV drone and RC car lanes plus trench drone workshops; gadgets are a map feature.
- Lighting and weather are rolled per match and held (day / overcast / night; stronger moonlight).
- Supports Hardpoint and Wingman (ranked 2v2).
- Destructible trees are roadmap, not shipped. Early Access -- expect iteration.
- Source: Reissad Studio's Sept 2, 2026 "Locked & Loaded" patch and devlog.$bc$,
  array['bodycam','trenches','map','maps','locked and loaded','early access'],
  'LOCKED & LOADED PATCH',
  'https://store.steampowered.com/app/2406770/Bodycam/',
  0,
  true,
  true,
  now(),
  null,
  now()
);

-- VERIFY after running:
--   select slug, editor, is_published, noindex, char_length(body) from feed_items
--     where game_slug='bodycam' and slug='bodycam-trenches-map';
--   -- then load /bodycam/field-intel/bodycam-trenches-map (renders noindex while bodycam.indexable
--   -- is false) and confirm formatted (headings, bullet lists, paragraphs) + in the Field Intel list.
