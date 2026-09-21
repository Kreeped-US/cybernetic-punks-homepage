// lib/editors/roster.js
// ============================================================
// CANONICAL EDITOR-DESK DISPLAY MAP -- single source of truth for how the
// editorial DESKS are SHOWN to users (desk label, section role, accent, beat
// description, glyph).
// ============================================================
// Brief 2a (2026-09-21): the roster no longer carries FICTIONAL PERSON identities.
// Articles are AI-DRAFTED and then verified in-game + approved by Justin (the solo
// operator; see lib/authorEntity.js). The former per-persona human names, personal
// bios, and portrait FACES have been retired: each codename is now a DESK LABEL, not
// a person. The ~17 byline / masthead / lane / footer sites that consume this map
// INHERIT the desk labels with no per-site change, because they read the same fields
// (fullName is now the desk label; tag is null; bio is a beat description).
//
// KEYS STAY THE EXISTING CODENAMES (cipher/nexus/dexter/ghost/miranda + broker +
// vantage). The DB `feed_items.editor` column is unchanged (it stores the UPPERCASE
// codename). Look up via getEditorDisplay(), which normalizes case, so callers can
// pass either the DB value ('CIPHER') or the URL slug ('cipher').
//
// DESK LABELS (the byline surface): cipher=Analysis, nexus=Meta & News,
// dexter=Builds, ghost=Community, miranda=Field Guide, broker=Economy, vantage=Network.
//
// PORTRAITS RETIRED: hasPortrait is now false for every desk -- desks do not have a
// human face. Consumers already degrade gracefully to a glyph/monogram badge when a
// portrait is absent (editorInitial()/symbol), so no render site breaks. The
// /images/editors/*.jpg files are left on disk for now (a later cleanup removes the
// unreferenced assets); nothing renders them while hasPortrait is false.

export const EDITORS = {
  cipher: {
    key:      'cipher',
    status:   'live',      // producing now; has an /intel/cipher lane
    fullName: 'Analysis',  // DESK LABEL (was a person name; retired Brief 2a)
    tag:      null,        // no person side-name; byline is the desk alone
    role:     'Analysis',
    color:    '#ff2222', // red (existing)
    symbol:   '◈',
    bio:      'Deep-dive analysis desk. Evidence first: publishes the call only when the data supports it, and says so plainly when it does not.',
    image:    '/images/editors/cipher.jpg',
    hasPortrait: false,
  },
  nexus: {
    key:      'nexus',
    status:   'live',
    fullName: 'Meta & News',
    tag:      null,
    role:     'Meta & News',
    color:    '#00d4ff', // cyan (existing)
    symbol:   '⬡',
    bio:      'Meta and news desk. Tracks patch notes, tier shifts, and what the lobby is running right now.',
    image:    '/images/editors/nexus.jpg',
    hasPortrait: false,
  },
  dexter: {
    key:      'dexter',
    status:   'live',
    fullName: 'Builds',
    tag:      null,
    role:     'Builds',
    color:    '#ff8800', // orange (existing)
    symbol:   '⬢',
    bio:      'Builds desk. Loadouts, attachments, and setups tuned for the current meta.',
    image:    '/images/editors/dexter.jpg',
    hasPortrait: false,
  },
  ghost: {
    key:      'ghost',
    status:   'live',
    fullName: 'Community',
    tag:      null,
    role:     'Community',
    color:    '#00ff88', // green (existing)
    symbol:   '◇',
    bio:      'Community desk. What players are actually doing in the lobby, surfaced from the ground.',
    image:    '/images/editors/ghost.jpg',
    hasPortrait: false,
  },
  miranda: {
    key:      'miranda',
    status:   'live',
    fullName: 'Field Guide',
    tag:      null,
    role:     'Field Guide',
    color:    '#9b5de5', // purple (existing)
    symbol:   '◎',
    bio:      'Field guide desk. Practical, in-game how-to for the current season.',
    image:    '/images/editors/miranda.jpg',
    hasPortrait: false,
  },
  broker: {
    key:      'broker',
    status:   'incoming',  // NOT producing yet; no /intel/broker lane
    // COVERAGE (operator-confirmed 2026-08-25): the game whose economy this incoming
    // desk deploys with. SINGLE SOURCE OF TRUTH for the root card's "deploys with <game>"
    // line. The card resolves this slug to the game display name (date derives from that
    // game's launch_date constant in lib/games/<slug>.js). Value 'dmz' is the DMZ
    // extraction economy the Economy desk covers at launch.
    coverage: 'dmz',
    fullName: 'Economy',
    tag:      null,
    role:     'Economy',
    color:    '#8b95a7', // slate / silver-grey
    symbol:   '$',
    bio:      'Economy desk. Value, cost, and what actually pays in the in-game market. Deploys with DMZ.',
    image:    '/images/editors/broker.jpg',
    hasPortrait: false,
  },
  // VANTAGE -- the NETWORK desk (persona logic in lib/network/vantage.js). Kept here so a
  // feed_items row with editor='VANTAGE' resolves a real byline / accent / initial via the
  // same helpers every article renderer uses. status:'network' (NOT 'live') -> no
  // /intel/<lane>. Deliberately KEPT OUT of EDITOR_ORDER below.
  vantage: {
    key:      'vantage',
    status:   'network',
    fullName: 'Network',
    tag:      null,
    role:     'Network',
    color:    '#c8d4e0', // silver (network structural accent; matches --nr-vantage)
    symbol:   '◆',
    bio:      "Network desk. Frames what matters across every game and the discourse around them, never a single game's in-game facts.",
    image:    '/images/editors/vantage.jpg',
    hasPortrait: false,
  },
};

// Display order for roster/masthead surfaces. Broker last (newest desk).
// VANTAGE is intentionally ABSENT: it is the network desk, surfaced on /about separately.
export const EDITOR_ORDER = ['cipher', 'nexus', 'dexter', 'ghost', 'miranda', 'broker'];

// Case-normalized lookup. Accepts the DB value ('CIPHER') or the slug ('cipher').
// Returns null for unknown keys (callers decide the fallback) -- does NOT throw.
export function getEditorDisplay(key) {
  if (!key || typeof key !== 'string') return null;
  return EDITORS[key.toLowerCase()] || null;
}

// Roster in display order (for masthead / desks page).
export function getAllEditors() {
  return EDITOR_ORDER.map(function(k) { return EDITORS[k]; });
}

// Graceful-fallback helper: first initial of the desk label, for a monogram badge
// (desks have no portrait, so this is the common path). Never throws.
export function editorInitial(key) {
  var e = getEditorDisplay(key);
  return e ? e.fullName.charAt(0).toUpperCase() : '?';
}

// Whether a desk has a portrait FACE to render. Retired in Brief 2a: desks are not
// people, so this is false for every desk and consumers render the glyph/monogram
// badge instead. Kept as the single flag consumers check (do not reintroduce a
// status/name proxy).
export function editorHasPortrait(key) {
  var e = getEditorDisplay(key);
  return !!(e && e.hasPortrait);
}

// How to render the byline name from a display entry. Post-Brief-2a every desk has
// tag=null, so this returns the desk label alone (e.g. "Meta & News"). The tag branch
// is retained only so a future tagged entry would still format.
export function editorByline(key) {
  var e = getEditorDisplay(key);
  if (!e) return null;
  return e.tag ? (e.fullName + ' / ' + e.tag) : e.fullName;
}
