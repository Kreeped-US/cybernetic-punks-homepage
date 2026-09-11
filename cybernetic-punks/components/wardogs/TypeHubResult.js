'use client';
// components/wardogs/TypeHubResult.js
// Channel B WEAPON-TYPE hub body -- a CATEGORY page ("best assault rifle loadout"), composed from the
// SHARED loadout primitives (SlotCard / RankTable / TheRead) so it is visually identical to the tool
// and the saved-build pages but purpose-built for a class ranking (no personalization chips, no empty
// SECONDARY slot). Client component (WeaponImage inside SlotCard needs onError state), but its initial
// HTML is server-rendered -> the ranked board + images + THE READ are in the raw crawlable HTML.
//
// Props (all plain data, computed server-side from the store):
//   hub      = { slug, label, plural }               -- the weapon-type hub
//   meta     = { recommendation, candidates, detail, provenance, budget }  (assembleLoadout output)
//   analysis = THE READ prose (front-loaded, deterministic, with a CAVEAT -> THE CATCH)
//   footer   = trailing action node (register CTA + mesh)

import { SlotCard, RankTable, TheRead, LOADOUT_KEYFRAMES } from '@/components/wardogs/LoadoutResult';
import { TierIcon, CONFIDENCE_TIERS } from '@/components/network/confidenceTiers';

const A = 'var(--accent)';
const AG = 'var(--accent-glow)';
const AD = 'var(--accent-dim)';
const CARD = 'var(--bg-card)';
const PAGE = 'var(--bg-page)';
const LINE = 'var(--border)';
const T1 = 'var(--text-primary)';
const T2 = 'var(--text-secondary)';
const T3 = 'var(--text-tertiary)';

function tierMeta(key) { return CONFIDENCE_TIERS.find((t) => t.key === key) || CONFIDENCE_TIERS[2]; }

export default function TypeHubResult({ hub, meta, analysis = '', footer = null }) {
  const rec = (meta && meta.recommendation) || {};
  const cand = (meta && meta.candidates) || {};
  const det = (meta && meta.detail) || {};
  const prov = (meta && meta.provenance) || { tier: 'attributed', basis: '', sources: [] };
  const t = tierMeta(prov.tier);

  // Class board = the type's weapons, ranked (primaries; a type hub has no secondary slot).
  const ranked = (cand.primary || []).filter((c) => c.rankable && c.score != null);
  const pick = rec.primary || null;
  const runnerUp = ranked.filter((c) => !pick || c.weapon_name !== pick.weapon_name)[0] || null;
  const gapMs = pick && runnerUp && pick.weighted_ttk_ms != null && runnerUp.weighted_ttk_ms != null
    ? Math.round(Math.abs(runnerUp.weighted_ttk_ms - pick.weighted_ttk_ms)) : null;

  const wrap = { background: PAGE, color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '8px 24px 40px' };
  const inner = { maxWidth: 1000, margin: '0 auto' };

  return (
    <div style={wrap}><div style={inner}>
      <style>{LOADOUT_KEYFRAMES}</style>

      {/* THE PICK -- the class winner, hero card (reused SlotCard). */}
      {pick && (
        <div className="ls-up" style={{ background: 'linear-gradient(160deg, ' + AG + ' 0%, ' + CARD + ' 55%)', border: '1px solid ' + AD, borderRadius: 4, padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: 3, color: '#fff', fontWeight: 900, fontFamily: 'monospace' }}>THE PICK &mdash; FASTEST TTK</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: t.color, fontSize: 10, fontWeight: 700, letterSpacing: 1, fontFamily: 'monospace' }}>
              <TierIcon tier={prov.tier} size={12} /> {t.label.toUpperCase()}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            <SlotCard label={hub.label.toUpperCase()} pick={rec.primary} detail={det.primary} hero rank={1} total={ranked.length} gapMs={gapMs} runnerUp={runnerUp} />
            {/* Runner-up alongside the pick -- fills the hero row and gives the head-to-head context
                a category page wants (the #2 the pick is measured against). */}
            {runnerUp && <SlotCard label={'RUNNER-UP'} pick={runnerUp} detail={det.runnerUp} rank={2} total={ranked.length} />}
          </div>
        </div>
      )}

      {/* THE READ -- front-loaded synthesis (deterministic), CAVEAT -> THE CATCH. */}
      {analysis && (
        <div style={{ background: CARD, border: '1px solid ' + LINE, borderLeft: '3px solid ' + A, borderRadius: '0 4px 4px 0', padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ fontSize: 10, letterSpacing: 2.5, color: A, fontWeight: 800, fontFamily: 'monospace', marginBottom: 12 }}>&#9698; THE READ</div>
          <TheRead text={analysis} streaming={false} />
        </div>
      )}

      {/* THE FULL BOARD -- every weapon of this type by TTK (reused RankTable). */}
      {ranked.length >= 2 && (
        <div className="ls-up" style={{ background: CARD, border: '1px solid ' + LINE, borderRadius: 4, padding: '18px 22px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.5, color: A, fontWeight: 800, fontFamily: 'monospace' }}>&#9698; EVERY {hub.label.toUpperCase()} BY TTK</div>
            <div style={{ fontSize: 10, color: T3, fontFamily: 'monospace' }}>BALANCED &middot; {pick && pick.ammo ? pick.ammo + ' ammo' : ''} &middot; lower = faster</div>
          </div>
          {gapMs != null && runnerUp && pick && (
            <div style={{ fontSize: 12, color: T2, marginBottom: 14 }}>
              {pick.weapon_name} kills <b style={{ color: A }}>{gapMs}ms faster</b> than {runnerUp.weapon_name}, the next best {hub.label.toLowerCase()}.
            </div>
          )}
          <RankTable rows={ranked} pickName={pick && pick.weapon_name} />
        </div>
      )}

      {/* Honest-null / provenance note. */}
      <div style={{ background: PAGE, border: '1px dashed ' + LINE, borderRadius: 4, padding: '14px 18px', marginBottom: 16, fontSize: 12, color: T2, lineHeight: 1.7 }}>
        <div><b style={{ color: T1 }}>Budget:</b> ranked by effectiveness only &mdash; Bulkhead hasn&rsquo;t published prices yet, so budget filtering is off. It switches on the moment prices land.</div>
        {prov.basis && <div style={{ marginTop: 6 }}><b style={{ color: T1 }}>Basis:</b> {prov.basis}.{prov.sources && prov.sources.length ? ' Source: ' + prov.sources[0] : ''}</div>}
      </div>

      {footer}
    </div></div>
  );
}
