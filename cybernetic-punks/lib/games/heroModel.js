// lib/games/heroModel.js
// PURE view-model for the shared full-bleed GameHero (components/game/GameHero.js), modeled on the original
// /wardogs hero (2026-10-02). GAME-AGNOSTIC: everything comes from config.hero + the config's status fields.
// No React import -> node-testable. The output is RSC-plain (strings / numbers / booleans / plain objects),
// so it is safe to hand to any component.
//
// config.hero keys:
//   image    { src, position }            optional -- absent -> the PLAIN variant (no art, no overlays)
//   overlay  { side, bottom }             CSS gradients over the art (bright art needs heavier stops)
//   logo     { src, alt, height }         optional official mark, shown as a BADGE above the text H1
//   h1       { text, accent? }            the ONE <h1>; '\n' in text = a line break; accent renders after
//                                         text in the accent color (e.g. 'PUBG: ' + 'DED.NET')
//   intro    string | { text, strong? }   optional; default = tagline + '. ' + hubIntro
//   ctas     [{ label, href, variant: 'primary' | 'ghost' }]
// The STATUS BADGE is never configured: heroStatusBadge derives it from status / earlyAccess / launch_date
// (via isGameLive), so it flips on its own when a game launches.

import { isGameLive } from '../network/gameStatus.js';

// { label, live }. Labels are upper-case (rendered verbatim), matching the original Wardogs badge.
//   live + earlyAccess -> 'EARLY ACCESS - LIVE' (em dash)   live -> 'LIVE'
//   not live + earlyAccess -> 'EARLY ACCESS'   status 'revealed' -> 'REVEALED'   else -> 'PRE-LAUNCH'
export function heroStatusBadge(config) {
  var c = config || {};
  var live = isGameLive(c);
  if (live) return { label: c.earlyAccess ? 'EARLY ACCESS — LIVE' : 'LIVE', live: true };
  if (c.earlyAccess) return { label: 'EARLY ACCESS', live: false };
  if (c.status === 'revealed') return { label: 'REVEALED', live: false };
  return { label: 'PRE-LAUNCH', live: false };
}

function str(v) { return typeof v === 'string' && v.length > 0 ? v : null; }

function introOf(config, hero) {
  var i = hero.intro;
  if (i && typeof i === 'object') return { text: String(i.text || ''), strong: str(i.strong) };
  if (str(i)) return { text: i, strong: null };
  var tag = str(config.tagline), body = str(config.hubIntro);
  if (tag && body) return { text: tag + '. ' + body, strong: null };
  if (tag) return { text: tag + '.', strong: null };
  if (body) return { text: body, strong: null };
  return null;
}

// The plain props GameHero renders. Throws if the config has no hero H1 (a hub without its H1 is an SEO
// regression, so it fails loudly at build/render rather than shipping silently).
export function buildHeroProps(config) {
  var c = config || {};
  var h = c.hero || {};
  if (!h.h1 || !str(h.h1.text)) throw new Error('[heroModel] ' + (c.slug || '?') + ': config.hero.h1.text is required');
  var image = h.image && str(h.image.src) ? { src: h.image.src, position: h.image.position || 'center' } : null;
  var overlay = image && h.overlay ? { side: str(h.overlay.side), bottom: str(h.overlay.bottom) } : null;
  var logo = h.logo && str(h.logo.src)
    ? { src: h.logo.src, alt: str(h.logo.alt) || c.displayName || '', height: Number.isFinite(h.logo.height) ? h.logo.height : 40 }
    : null;
  return {
    breadcrumbLabel: String(c.displayName || c.slug || '').toUpperCase(),
    image: image,
    overlay: overlay,
    logo: logo,
    badge: heroStatusBadge(c),
    h1: { lines: h.h1.text.split('\n'), accent: str(h.h1.accent) },
    intro: introOf(c, h),
    ctas: (Array.isArray(h.ctas) ? h.ctas : [])
      .filter(function (x) { return x && str(x.label) && str(x.href); })
      .map(function (x) { return { label: x.label, href: x.href, variant: x.variant === 'primary' ? 'primary' : 'ghost' }; }),
  };
}
