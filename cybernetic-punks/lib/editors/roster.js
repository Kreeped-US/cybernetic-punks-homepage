// lib/editors/roster.js
// ============================================================
// CANONICAL EDITOR DISPLAY MAP — single source of truth for how editors are
// SHOWN to users (full name, tag, role, accent, bio, portrait).
// ============================================================
// Step 1 of the editor rework (see docs/network/EDITOR_REWORK_AUDIT.md, Q4).
//
// WIRED TO NOTHING YET. This module is additive + inert: no render site imports
// it, no behavior changes on creation. Step 3 (display rename) routes the
// existing byline/nav/footer/lane/comment sites through getEditorDisplay();
// Step 2 builds the new "our editors" surfaces off it.
//
// KEYS STAY THE EXISTING CODENAMES (cipher/nexus/dexter/ghost/miranda + broker).
// The DB `feed_items.editor` column is unchanged (it stores the UPPERCASE
// codename). Look up via getEditorDisplay(), which normalizes case, so callers
// can pass either the DB value ('CIPHER') or the URL slug ('cipher').
//
// Data source: docs/network/editorial-staff-model.md (locked roster, tags,
// roles, accent colors, character notes). Bios are composed in-character from
// the locked character notes; refine in the newsroom-branding pass.
//
// PORTRAITS: `image` points to where each portrait WILL live
// (/images/editors/<key>.jpg). The new imaging pass (editorial-staff-model.md
// "LOCKED IMAGING SPEC") has NOT run yet — broker.jpg does not exist, and the
// existing five are the OLD portraits pending replacement. CONSUMERS MUST
// DEGRADE GRACEFULLY when a portrait is missing (e.g. fall back to an initial
// badge via editorInitial()); do NOT assume the file is present. (Server
// components can't use <img onError> — use a presence-safe fallback instead.)

export const EDITORS = {
  cipher: {
    key:      'cipher',
    status:   'live',      // producing now; has an /intel/cipher lane
    fullName: 'Marcus Vane',
    tag:      'Cipher',
    role:     'Analysis',
    color:    '#ff2222', // red (existing)
    symbol:   '◈',  // ◈ (existing)
    bio:      "Evidence absolutist. Would rather publish “insufficient data to call this” than guess — the slowest to commit, the hardest to refute. Authority from rigor.",
    image:    '/images/editors/cipher.jpg',
  },
  nexus: {
    key:      'nexus',
    status:   'live',
    fullName: 'Remi Okafor',
    tag:      'Nexus',
    role:     'Meta & News',
    color:    '#00d4ff', // cyan (existing)
    symbol:   '⬡',  // ⬡ (existing)
    bio:      'Lives a week ahead of the lobby. Makes the aggressive early call and owns the misses — first, even when wrong. Authority from currency.',
    image:    '/images/editors/nexus.jpg',
  },
  dexter: {
    key:      'dexter',
    status:   'live',
    fullName: 'Felix Andersen',
    tag:      'Dexter',
    role:     'Builds',
    color:    '#ff8800', // orange (existing)
    symbol:   '⬢',  // ⬢ (existing)
    bio:      "Compulsive optimizer who can’t call a loadout “done” — there’s always another 2% to find. “Good enough” is an insult. Authority from craft.",
    image:    '/images/editors/dexter.jpg',
  },
  ghost: {
    key:      'ghost',
    status:   'live',
    fullName: 'Tariq Webb',
    tag:      'Ghost',
    role:     'Community',
    color:    '#00ff88', // green (existing)
    symbol:   '◇',  // ◇ (existing)
    bio:      'In the trenches, not the lab. Trusts the lived reality of the lobby over any spreadsheet. Authority from below.',
    image:    '/images/editors/ghost.jpg',
  },
  miranda: {
    key:      'miranda',
    status:   'live',
    fullName: 'Miranda Malini',
    // Miranda has NO tag: her name IS her tag (senior enough to need no handle).
    // Consumers must handle tag === null (render the name alone, no "/ tag").
    tag:      null,
    role:     'Field Guide',
    color:    '#9b5de5', // purple (existing)
    symbol:   '◎',  // ◎ (existing)
    bio:      'The formidable oracle. Rarely issues a verdict, but it lands hard — and she remembers every season that came before. Authority from above.',
    image:    '/images/editors/miranda.jpg',
  },
  broker: {
    key:      'broker',
    status:   'incoming',  // NOT producing yet; no /intel/broker lane (wired in Step 6)
    fullName: 'Vera Sloan',
    tag:      'Broker',
    role:     'Economy & Market',
    color:    '#8b95a7', // slate / silver-grey (PROPOSED — see note below; not yet a live token)
    symbol:   '$',  // $ — economy / market lane
    bio:      "Unsentimental EV accountant. The game is a ledger; she only cares whether it pays — and will call your favorite meta a value trap. Authority from the ledger.",
    image:    '/images/editors/broker.jpg', // NOTE: does not exist yet (imaging pass pending)
  },
};

// Display order for roster/masthead surfaces (Step 2). Broker last (newest lane).
export const EDITOR_ORDER = ['cipher', 'nexus', 'dexter', 'ghost', 'miranda', 'broker'];

// Case-normalized lookup. Accepts the DB value ('CIPHER') or the slug ('cipher').
// Returns null for unknown keys (callers decide the fallback) -- does NOT throw.
export function getEditorDisplay(key) {
  if (!key || typeof key !== 'string') return null;
  return EDITORS[key.toLowerCase()] || null;
}

// Roster in display order (for masthead / "our editors" page).
export function getAllEditors() {
  return EDITOR_ORDER.map(function(k) { return EDITORS[k]; });
}

// Graceful-fallback helper: first initial of the full name, for an avatar badge
// when the portrait image is missing (broker.jpg, or any not-yet-generated
// portrait). Lets consumers degrade without assuming the file exists.
export function editorInitial(key) {
  var e = getEditorDisplay(key);
  return e ? e.fullName.charAt(0).toUpperCase() : '?';
}

// How to render the byline name from a display entry (helper, not yet wired):
// Miranda -> "Miranda Malini"; everyone else -> "Marcus Vane / Cipher".
export function editorByline(key) {
  var e = getEditorDisplay(key);
  if (!e) return null;
  return e.tag ? (e.fullName + ' / ' + e.tag) : e.fullName;
}
