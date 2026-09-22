'use client';
// components/ToolCTAClient.js
// The clickable leaf of <ToolCTA>. Renders the resolved CTA and fires the
// advisor_cta_click funnel event on click. ALL resolution (per-game config lookup,
// entity detection, href/copy building) happens SERVER-side in ToolCTA.js, so this
// receives only serializable string props -- no game config is bundled into the client.

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { track } from '@/lib/useTrack';

export default function ToolCTAClient({ href, copy, shell, game, sourceSlug, accent }) {
  var boxRef = useRef(null);
  var seenRef = useRef(false);

  // Impression: fire ONCE when the CTA actually scrolls into view (not merely rendered below the
  // fold), so click-through = advisor_cta_click / advisor_cta_impression is measurable. Ref-guarded
  // + observer disconnected after the first hit -> at most one impression per page load. Same
  // event_data shape as the click (source, shell). No-op if IntersectionObserver is unavailable.
  useEffect(function () {
    var el = boxRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    var obs = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting && !seenRef.current) {
          seenRef.current = true;
          track('advisor_cta_impression', { source: sourceSlug || null, shell: shell || null }, game || 'marathon');
          obs.disconnect();
          break;
        }
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return function () { obs.disconnect(); };
  }, [sourceSlug, shell, game]);

  function onClick() {
    // Upstream funnel entry:
    // advisor_cta_impression -> advisor_cta_click -> page_view(slug=advisor) -> advisor_engaged -> advisor_generate.
    track('advisor_cta_click', { source: sourceSlug || null, shell: shell || null }, game || 'marathon');
  }
  var color = accent || '#ff8800';
  return (
    <div ref={boxRef} style={{ marginTop: 20, padding: '12px 16px', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + color, borderRadius: '0 3px 3px 0' }}>
      <Link href={href} onClick={onClick} style={{ fontSize: 11, color: color, textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>
        ⬢ {copy}
      </Link>
    </div>
  );
}
