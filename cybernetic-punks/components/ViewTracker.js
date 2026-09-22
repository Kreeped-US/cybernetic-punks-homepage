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

// REFERRAL ATTRIBUTION (host only -- privacy-preserving). We store WHERE a session arrived from
// so distribution (reddit vs x vs discord vs organic) is measurable, without any full URL, query
// string, or personal data. The EXTERNAL referrer only exists client-side (document.referrer); the
// /api/track request's own Referer is this page, so it must be read here.
//   ref_host: the referrer's HOST, lowercased, "www." stripped. Same-host -> 'internal'
//             (in-site navigation). No referrer (direct / privacy) -> null.
//   ref_tag : a campaign tag from ?ref=<tag> on THIS page's URL (e.g. a share link), sanitized to
//             [a-z0-9_-], max 32 chars. Absent -> null. Never the full query string.
function referrerHost() {
  try {
    var r = document.referrer;
    if (!r) return null;                                  // direct / no referrer
    var h = new URL(r).hostname.toLowerCase().replace(/^www\./, '');
    if (!h) return null;
    var self = window.location.hostname.toLowerCase().replace(/^www\./, '');
    return h === self ? 'internal' : h;                   // in-site nav vs external source
  } catch (e) { return null; }
}
function refTag() {
  try {
    var v = new URLSearchParams(window.location.search).get('ref');
    if (!v) return null;
    v = v.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
    return v || null;
  } catch (e) { return null; }
}

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
      ref_host: referrerHost(),   // external source host only (or 'internal' / null)
      ref_tag: refTag(),          // ?ref=<tag> campaign tag (sanitized) or null
    }, gameSlug || 'marathon');
  }, [pathname, slug, type, headline, gameSlug]);

  return null;
}
