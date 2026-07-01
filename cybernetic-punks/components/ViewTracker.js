'use client';
// components/ViewTracker.js
// Fire-once-per-tab-session page-view tracker. Drops into any page (server or
// client) as a render-nothing client island. On mount it debounces via
// sessionStorage (one 'page_view' per path per browser-tab session -- no cookies,
// no login), then emits through the game-aware track() pipeline (Part 1).
//
// event_data denormalizes the headline at track time so historical view stats stay
// meaningful even if the article's title later changes or the article is removed.
//
// Props: slug (stable id, e.g. article slug or 'meta'), type ('article'|'tool'),
// headline (articles), gameSlug ('marathon'|'dmz'|...). The debounce key + the
// stored path come from the live pathname (usePathname), so callers never pass it.

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/useTrack';
import { viewKey, markViewedOnce } from '@/lib/viewTracking';

export default function ViewTracker({ slug, type, headline, gameSlug }) {
  var pathname = usePathname();

  useEffect(function () {
    var path = pathname || slug || '';
    if (!path) return;
    var storage = null;
    try { storage = window.sessionStorage; } catch (e) { storage = null; }
    if (!markViewedOnce(storage, viewKey(path))) return; // already counted this session

    track('page_view', {
      slug: slug || path,
      path: path,
      type: type || 'article',
      headline: headline || null,
    }, gameSlug || 'marathon');
  }, [pathname, slug, type, headline, gameSlug]);

  return null;
}
