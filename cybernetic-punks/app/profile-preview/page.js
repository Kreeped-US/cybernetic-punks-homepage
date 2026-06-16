// app/profile-preview/page.js
// MOCK profile/premium PREVIEW page (profile-premium-vision.md). Renders the
// shareable card as the hero + supporting sections, all against hardcoded MOCK
// data (./mockData.js). NO Supabase / auth / live queries -> no force-dynamic
// needed. Not linked from live nav; noindex (design preview, not a feature).
//
// Toggle mockProfile.subscription.tier 'free' <-> 'premium' to see the
// free/premium branching change live.

import { mockProfile } from './mockData';
import { brand } from './brand';
import ShareableCard from './ShareableCard';
import ShareButton from './ShareButton';

export const metadata = {
  title: 'Profile Preview (mock)',
  robots: { index: false, follow: false },
};

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, color: brand.textFaint, textTransform: 'uppercase', marginBottom: 12 }}>
      {children}
    </div>
  );
}

function CareerDetail({ profiles }) {
  return (
    <section style={{ marginTop: 40 }}>
      <SectionLabel>Cross-game career</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {profiles.map(function(p) {
          return (
            <div key={p.game_slug} style={{ background: brand.panel, border: '1px solid ' + brand.border, borderLeft: '3px solid ' + p.accent, borderRadius: 6, padding: 18 }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>{p.label}</div>
              {p.comingSoon ? (
                <p style={{ fontSize: 12, color: brand.textDim, marginTop: 10, lineHeight: 1.6 }}>
                  Tracking at launch (Oct 23). Your DMZ career appears here once the zone goes live.
                </p>
              ) : (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Row label="Rank" value={p.progression.rank} />
                  <Row label="Cradle" value={p.progression.cradle} />
                  <Row label="Hours tracked" value={String(p.progression.hoursTracked)} />
                  <Row label="Saved builds" value={String(p.builds.length)} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, borderBottom: '1px solid ' + brand.border, paddingBottom: 6 }}>
      <span style={{ fontSize: 11, color: brand.textDim }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: brand.text }}>{value}</span>
    </div>
  );
}

function BuildsList({ profiles }) {
  var builds = [];
  profiles.forEach(function(p) { (p.builds || []).forEach(function(b) { builds.push(Object.assign({ accent: p.accent }, b)); }); });
  return (
    <section style={{ marginTop: 40 }}>
      <SectionLabel>Saved builds</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {builds.map(function(b) {
          return (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: brand.panel, border: '1px solid ' + brand.border, borderRadius: 6, padding: '14px 16px' }}>
              {/* Grade placeholder — labeled as a PREVIEW; the AI Coach isn't live */}
              <div style={{ flexShrink: 0, width: 46, textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 800, color: b.accent, lineHeight: 1 }}>{b.grade}</div>
                <div style={{ fontSize: 7, letterSpacing: 1, color: brand.textFaint, textTransform: 'uppercase', marginTop: 3 }}>Coach ·preview</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{b.name}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                  {b.tags.map(function(t) {
                    return <span key={t} style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: brand.textDim, border: '1px solid ' + brand.border, borderRadius: 2, padding: '2px 6px' }}>{t}</span>;
                  })}
                </div>
              </div>
              <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: b.is_public ? brand.marathon : brand.textFaint }}>
                {b.is_public ? 'Public' : 'Private'}
              </span>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: brand.textFaint, marginTop: 10 }}>
        Grades are an AI Coach PREVIEW (the grading model isn&apos;t live yet) — shown to place the slot, not to fake a feature.
      </p>
    </section>
  );
}

function CoachSection({ isPremium, snapshot, history }) {
  return (
    <section style={{ marginTop: 40 }}>
      <SectionLabel>AI Coach</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {/* FREE: current-grade snapshot — always shown */}
        <div style={{ background: brand.panel, border: '1px solid ' + brand.border, borderRadius: 6, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: brand.text }}>{snapshot.label}</span>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: brand.marathon, border: '1px solid ' + brand.border, borderRadius: 2, padding: '2px 6px' }}>Free</span>
          </div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 48, fontWeight: 800, color: '#fff', marginTop: 8 }}>{snapshot.value}</div>
          <div style={{ fontSize: 11, color: brand.textDim, marginTop: 4 }}>Current snapshot grade.</div>
        </div>

        {/* PREMIUM: grade history / trend — unlocked when premium, teased when free */}
        <div style={{ position: 'relative', background: brand.panel, border: '1px solid ' + (isPremium ? brand.premium : brand.border), borderRadius: 6, padding: 18, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: brand.text }}>Grade history &amp; trend</span>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: brand.premium, border: '1px solid ' + brand.premium, borderRadius: 2, padding: '2px 6px' }}>Premium</span>
          </div>

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'flex-end', gap: 10, filter: isPremium ? 'none' : 'blur(5px)', opacity: isPremium ? 1 : 0.5 }}>
            {history.map(function(h) {
              return (
                <div key={h.graded_at} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 800, color: brand.premium }}>{h.value}</div>
                  <div style={{ fontSize: 9, color: brand.textFaint, marginTop: 4 }}>{h.graded_at}</div>
                </div>
              );
            })}
          </div>

          {!isPremium && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(10,12,16,0.55)' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: brand.premium }}>🔒 Premium</span>
              <span style={{ fontSize: 11, color: brand.textDim, textAlign: 'center', maxWidth: 220, lineHeight: 1.5 }}>
                Track your grade over time — the coaching relationship. Upgrade to unlock.
              </span>
            </div>
          )}
        </div>
      </div>
      <p style={{ fontSize: 11, color: brand.textFaint, marginTop: 10 }}>
        Free = current snapshot. Premium = grade-over-time. (Toggle the mock tier to preview both — currently <strong style={{ color: brand.text }}>{isPremium ? 'premium' : 'free'}</strong>.)
      </p>
    </section>
  );
}

export default function ProfilePreviewPage() {
  var account = mockProfile.account;
  var profiles = mockProfile.profiles;
  var isPremium = mockProfile.subscription.tier === 'premium';

  return (
    <main style={{ minHeight: '100vh', background: brand.bg, color: brand.text, paddingTop: 64, paddingBottom: 96 }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 16px' }}>
        {/* Mock banner */}
        <div style={{ background: 'rgba(232,154,44,0.08)', border: '1px solid ' + brand.border, borderRadius: 4, padding: '8px 14px', marginBottom: 28, fontSize: 11, color: brand.textDim, letterSpacing: 0.5 }}>
          <strong style={{ color: brand.dmz }}>MOCK PREVIEW</strong> — sample data, not a live feature. Design artifact for the profile/premium vision.
        </div>

        {/* Hero: the shareable card (slot-based, career variant) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
          <ShareableCard account={account} hero="career" data={{ profiles: profiles }} />
          <ShareButton />
        </div>

        <CareerDetail profiles={profiles} />
        <BuildsList profiles={profiles} />
        <CoachSection isPremium={isPremium} snapshot={mockProfile.gradeSnapshot} history={mockProfile.gradeHistory} />
      </div>
    </main>
  );
}
