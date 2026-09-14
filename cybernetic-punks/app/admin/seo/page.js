'use client';
// app/admin/seo/page.js -- periodic SEO tools, out of the daily loop.
// GSC review (keyword candidates from Search Console) + demand check (authorize-before-building)
// + a link to the keyword_targets store (which lives in the CRUD editor's form). Split out of the
// old /admin/content mega-page. Reuses the existing panels/APIs; mounts only these two.
//
// GSC "accept" prefills a keyword_targets row -- that form lives on /admin/content?tab=keyword_targets,
// so onAccept here routes there (the accept action then completed in the CRUD form). refreshKey is a
// no-op on this page (no in-page keyword writes to react to).

import { useRouter } from 'next/navigation';
import { useAdminAuth, S, FONTS } from '../adminShell';
import GscReviewPanel from '@/components/GscReviewPanel';
import DemandCheckPanel from '@/components/DemandCheckPanel';

export default function AdminSeoPage() {
  const auth = useAdminAuth();
  const password = auth ? auth.password : '';
  const router = useRouter();

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px' }}>
      <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: 2, margin: 0 }}>SEO TOOLS</h1>
          <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: S.muted, letterSpacing: 2, marginTop: 4 }}>PERIODIC -- GSC REVIEW + DEMAND CHECK + KEYWORDS</div>
        </div>
        <a href="/admin/content?tab=keyword_targets" style={{ fontFamily: FONTS.mono, fontSize: 10, letterSpacing: 1, color: '#ff8c00', border: '1px solid rgba(255,140,0,0.4)', borderRadius: 4, padding: '7px 12px', textDecoration: 'none' }}>KEYWORD TARGETS &rarr;</a>
      </div>

      {/* GSC review -- accept prefills a keyword_targets row; the form lives in the CRUD editor. */}
      <GscReviewPanel
        password={password}
        onAccept={() => router.push('/admin/content?tab=keyword_targets')}
        refreshKey={0}
      />

      {/* Demand check -- authorize-before-building */}
      <DemandCheckPanel password={password} />
    </div>
  );
}
