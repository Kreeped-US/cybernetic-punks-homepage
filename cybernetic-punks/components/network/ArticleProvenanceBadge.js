// components/network/ArticleProvenanceBadge.js
// ARTICLE-LEVEL provenance badge (data-driven, prose-independent) -- the article analogue of the
// entity ProvenanceBadge. Renders one of three article provenance states from a stored tier value
// (feed_items.provenance_tier), reusing the shared confidence-tier visual language so the mark and
// the /methodology legend can never drift:
//   'sourced'    -> the 'verified' mark (green)   -- fact from official material / patch notes
//   'attributed' -> the 'attributed' mark (bronze) -- community/beta-observed, not owner-verified
//   'analysis'   -> the 'analysis' mark (violet)   -- editorial judgment ("our read"), not a fact
//
// ADDITIVE + honest-null: an unknown/absent tier (e.g. an article with no provenance_tier, or before
// the column migration runs) renders NOTHING -- existing articles are unaffected. Server-safe, no state.
//
// This is Build 1 infrastructure: the badge is wired into the article renders reading
// article.provenance_tier, but no editor SETS that field yet (Build 2 = NEXUS source-binding), and the
// article-route SELECTs are NOT yet widened to fetch the column (so it reads undefined -> null here)
// until the operator runs docs/migrations/2026-09-18-feed-items-provenance-tier.sql. Inert-but-ready.

import { CONFIDENCE_TIERS, TierIcon } from '@/components/network/confidenceTiers';

// article provenance value -> (confidence-tier key, public label). SOURCED reuses the 'verified'
// mark/color; ATTRIBUTED and ANALYSIS use their own. Anything else -> no badge (honest-null).
var ARTICLE_TIERS = {
  sourced:    { tierKey: 'verified',   label: 'Sourced' },
  attributed: { tierKey: 'attributed', label: 'Attributed' },
  analysis:   { tierKey: 'analysis',   label: 'Our Read' },
};

export default function ArticleProvenanceBadge({ tier, size = 12 }) {
  if (!tier) return null;
  var map = ARTICLE_TIERS[String(tier).toLowerCase()];
  if (!map) return null; // unknown tier -> render nothing (additive; never guess)
  var t = CONFIDENCE_TIERS.find(function (x) { return x.key === map.tierKey; });
  if (!t) return null;
  return (
    <span
      title={t.desc}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        color: t.color, fontFamily: 'monospace', fontSize: 10, fontWeight: 800,
        letterSpacing: 1.2, textTransform: 'uppercase',
        border: '1px solid ' + t.color + '55', borderRadius: 3, padding: '2px 7px',
        background: t.color + '12',
      }}
    >
      <TierIcon tier={map.tierKey} size={size} title={t.label} />
      {map.label}
    </span>
  );
}
