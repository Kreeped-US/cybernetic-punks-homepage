'use client';
// app/admin/review/page.js -- THE DAILY DRIVER.
// The operator's core loop in one focused page: review + approve/reject DRAFTS (top), review
// incoming SOURCES, and SEED a draft (pending directives + generate). Split out of the old
// /admin/content mega-page so the daily work is not buried under the data-CRUD editor + SEO
// tools. Reuses the existing panel components + APIs unchanged; mounts ONLY these three panels
// (lighter than the old page that mounted all six at once).

import { useAdminAuth, S, FONTS } from '../adminShell';
import VantageDraftsPanel from '@/components/VantageDraftsPanel';
import SourceReviewPanel from '@/components/SourceReviewPanel';
import DirectivesGeneratePanel from '@/components/DirectivesGeneratePanel';

export default function AdminReviewPage() {
  const auth = useAdminAuth();
  const password = auth ? auth.password : '';

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: FONTS.display, fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: 2, margin: 0 }}>REVIEW</h1>
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: S.muted, letterSpacing: 2, marginTop: 4 }}>THE DAILY LOOP -- REVIEW + APPROVE, SOURCES, GENERATE</div>
      </div>

      {/* 1. DRAFTS -- the #1 daily action (review + approve/reject) */}
      <VantageDraftsPanel password={password} />

      {/* 2. SOURCE REVIEW -- accept/decline incoming sources that feed directives */}
      <SourceReviewPanel password={password} />

      {/* 3. DIRECTIVES + GENERATE -- seed a draft (pending directives -> generate -> Drafts above) */}
      <DirectivesGeneratePanel password={password} />
    </div>
  );
}
