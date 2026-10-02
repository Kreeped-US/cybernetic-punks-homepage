// lib/games/gameNavProps.js
// PURE: narrow a game config down to the PLAIN, serializable props the CLIENT GameNav needs.
//
// WHY (2026-10-02, /bodycam outage fix). GameNav (components/game/GameNav.js) is a 'use client'
// component. GameLayout previously passed it the WHOLE config across the Server->Client boundary, which
// Next serializes -- and the config now carries a RegExp at sources.patchNotes.detection.versionRe
// (added with Bodycam news generation). Next REJECTS a RegExp over that boundary ("Only plain objects,
// and a few built-ins, can be passed to Client Components ..."), so EVERY route rendering the bodycam
// layout (hub, section, every article) threw a 500. This builds a flat, strings-only nav object so the
// client prop is structured-clone + RSC safe. No React import -> node-testable. Does NOT touch the
// config's versionRe or lib/gather/patchnotes -- the regex stays; it just never crosses to the client.
//
// Shape: { displayName, basePath, slug, sections: [{ label, href, status }] }.
//   label  = sec.navLabel || sec.label
//   href   = basePath + '/' + sec.slug
//   status = 'soon' for a 'data' section (coming-soon shell) else 'live'  (drives the SOON badge)
// hideFromNav sections are dropped HERE (server side) so GameNav just maps what it is given.
export function buildGameNavProps(config) {
  var c = config || {};
  var base = c.basePath;
  return {
    displayName: c.displayName,
    basePath: base,
    slug: c.slug,
    sections: (c.sections || [])
      .filter(function (s) { return s && !s.hideFromNav; })
      .map(function (s) {
        return {
          label: s.navLabel || s.label,
          href: base + '/' + s.slug,
          status: s.source === 'data' ? 'soon' : 'live',
        };
      }),
  };
}
