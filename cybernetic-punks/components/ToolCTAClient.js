'use client';
// components/ToolCTAClient.js
// The clickable leaf of <ToolCTA>. Renders the resolved CTA and fires the
// advisor_cta_click funnel event on click. ALL resolution (per-game config lookup,
// entity detection, href/copy building) happens SERVER-side in ToolCTA.js, so this
// receives only serializable string props -- no game config is bundled into the client.

import Link from 'next/link';
import { track } from '@/lib/useTrack';

export default function ToolCTAClient({ href, copy, shell, game, sourceSlug, accent }) {
  function onClick() {
    // Upstream funnel entry:
    // advisor_cta_click -> page_view(slug=advisor) -> advisor_engaged -> advisor_generate.
    track('advisor_cta_click', { source: sourceSlug || null, shell: shell || null }, game || 'marathon');
  }
  var color = accent || '#ff8800';
  return (
    <div style={{ marginTop: 20, padding: '12px 16px', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + color, borderRadius: '0 3px 3px 0' }}>
      <Link href={href} onClick={onClick} style={{ fontSize: 11, color: color, textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>
        ⬢ {copy}
      </Link>
    </div>
  );
}
