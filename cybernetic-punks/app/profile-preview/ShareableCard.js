// app/profile-preview/ShareableCard.js
// The shareable card — the centerpiece. SLOT-BASED HERO: one hero element, but
// it's a slot filled by best-available data via the `hero` prop, so the hero
// TIER can change WITHOUT a rewrite (profile-premium-vision.md hero ladder:
// 1 real game-API stats, 2 AI Coach grade, 3 cross-game career, 4 build).
//
// THIS mock renders the CROSS-GAME CAREER hero (the shippable launch choice).
// grade / stats / build variants drop into the SAME slot later — see
// HERO_VARIANTS below. Server component, presentational, MOCK data only.
// Designed to read well AS AN IMAGE (social-share artifact).

import { brand } from './brand';

// ── HERO VARIANTS (the swappable slot) ─────────────────────────────
// Add 'grade' / 'stats' / 'build' renderers here; the card picks by `hero`.
// Each variant gets the card `data` object and returns the hero slot content.

function CareerHero({ profiles }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: 3, color: brand.textFaint, textTransform: 'uppercase', marginBottom: 10 }}>
        Extraction-shooter career
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {profiles.map(function(p) {
          var soon = !!p.comingSoon;
          var topGrade = (!soon && p.builds && p.builds.length)
            ? p.builds.map(function(b) { return b.grade; }).sort()[0]
            : null;
          return (
            <div key={p.game_slug} style={{
              background: brand.panelHi,
              border: '1px solid ' + brand.border,
              borderLeft: '3px solid ' + p.accent,
              borderRadius: 6,
              padding: '14px 14px 16px',
              opacity: soon ? 0.85 : 1,
            }}>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>
                {p.label}
              </div>
              {soon ? (
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: p.accent, textTransform: 'uppercase', border: '1px solid ' + brand.border, borderRadius: 2, padding: '2px 7px' }}>
                    Tracking at launch
                  </span>
                  <div style={{ fontSize: 11, color: brand.textDim, marginTop: 8 }}>Oct 23 · field intel incoming</div>
                </div>
              ) : (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Stat label="Rank" value={p.progression.rank} accent={p.accent} />
                  <Stat label="Builds" value={String(p.builds.length)} accent={p.accent} />
                  {topGrade && <Stat label="Top grade" value={topGrade} accent={p.accent} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Placeholders for the other hero tiers — same slot, drop-in later:
//   function GradeHero({ gradeSnapshot }) { ... }   // ladder tier 2
//   function StatsHero({ liveStats }) { ... }       // ladder tier 1 (real game-API)
//   function BuildHero({ build }) { ... }           // ladder tier 4
const HERO_VARIANTS = {
  career: CareerHero,
  // grade: GradeHero,
  // stats: StatsHero,
  // build: BuildHero,
};

function Stat({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
      <span style={{ fontSize: 10, color: brand.textDim, letterSpacing: 0.5 }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent || '#fff' }}>{value}</span>
    </div>
  );
}

function Avatar({ handle }) {
  // Mock: initial-based avatar (no live image -> no <img>, no event handlers).
  var initial = (handle || '?').charAt(0).toUpperCase();
  return (
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      background: 'linear-gradient(135deg, ' + brand.marathon + ', ' + brand.dmz + ')',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Orbitron, monospace', fontWeight: 800, fontSize: 18, color: '#06080b',
      flexShrink: 0,
    }}>
      {initial}
    </div>
  );
}

export default function ShareableCard({ account, hero = 'career', data }) {
  var Hero = HERO_VARIANTS[hero] || CareerHero;
  return (
    <div style={{
      width: '100%', maxWidth: 600,
      background: brand.panel,
      border: '1px solid ' + brand.borderHi,
      borderRadius: 10,
      overflow: 'hidden',
      boxShadow: '0 18px 50px rgba(0,0,0,0.5)',
    }}>
      {/* Brand header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 9,
        padding: '12px 18px',
        borderBottom: '1px solid ' + brand.border,
        background: brand.bg,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: brand.dmz, boxShadow: '0 0 8px rgba(232,154,44,0.5)' }} />
        <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, letterSpacing: 2.5, color: '#fff' }}>
          CYBERNETIC<span style={{ color: brand.textDim }}>PUNKS</span>
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 8, letterSpacing: 1.5, color: brand.textFaint, textTransform: 'uppercase' }}>
          Intelligence Network
        </span>
      </div>

      {/* Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px 14px' }}>
        <Avatar handle={account.handle} />
        <div>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
            {account.handle}
          </div>
          <div style={{ fontSize: 10, color: brand.textFaint, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>
            Operative · since {account.memberSince}
          </div>
        </div>
      </div>

      {/* Hero slot */}
      <div data-hero-slot style={{ padding: '0 18px 16px' }}>
        <Hero {...data} />
      </div>

      {/* Branded footer + CTA */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '11px 18px',
        borderTop: '1px solid ' + brand.border,
        background: brand.bg,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: brand.textDim }}>cyberneticpunks.com</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: brand.dmz, textTransform: 'uppercase' }}>
          No hype. Just intel.
        </span>
      </div>
    </div>
  );
}
