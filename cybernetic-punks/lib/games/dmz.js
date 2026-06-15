// lib/games/dmz.js
// DMZ game config — the FIRST INSTANCE of the network game-section template.
// See docs/dmz/GAME_TEMPLATE.md (decisions D1-D4).
//
// A future game attaches the SAME way: a config module like this (slug +
// sections) + a registry entry. The template is universal in STRUCTURE
// (slug + sections-config + shared shell); the sections themselves are
// per-game data, declared here. Nothing about DMZ's specific sections is
// baked into the renderer.

export const dmz = {
  slug: 'dmz',
  label: 'DMZ',
  // Tagline for the landing hero (display copy, game's own vocabulary).
  tagline: 'Extraction intelligence for the zone',
  basePath: '/dmz',

  // ROUGH theme tokens — approx the locked DMZ direction (GAME_TEMPLATE.md D3).
  // NOT final: the palette is tuned at the launch-polish pass. The actual
  // CSS-variable swap that drives rendering lives in `.dmz-theme` in
  // globals.css; these values are recorded here for reference / future
  // programmatic theming and MUST be kept in sync with that block.
  theme: {
    primary: '#e89a2c', // amber
    bgPage:  '#0b0e11', // cold grey-blue base
    bgCard:  '#11151a',
    border:  '#2b3640',
    hazard:  '#e0563a', // irradiated red-orange
  },

  // THIN section descriptors (D1): { slug, label, source, contentFilter }.
  //   source 'editor' = filled from feed_items WHERE game_slug='dmz' as articles
  //          publish (editor-fed). contentFilter scopes the feed_items read.
  //   source 'data'   = filled from its OWN entity tables at launch (data-fed);
  //          renders a "coming soon" shell now, contentFilter is null (no query).
  // The source flag is the one justified extra field (D2): it tells the renderer
  // where each section's content comes from. No other speculative fields.
  sections: [
    { slug: 'field-intel', label: 'Field Intel',   source: 'editor', contentFilter: { table: 'feed_items' } },
    { slug: 'meta',        label: 'Meta',          source: 'editor', contentFilter: { table: 'feed_items' } },
    { slug: 'loadouts',    label: 'Loadouts',      source: 'editor', contentFilter: { table: 'feed_items' } },
    { slug: 'printer',     label: '3D Printer',    source: 'data',   contentFilter: null },
    { slug: 'fob',         label: 'FOB',           source: 'data',   contentFilter: null },
    { slug: 'regions',     label: 'Hajin Regions', source: 'data',   contentFilter: null },
  ],
};
