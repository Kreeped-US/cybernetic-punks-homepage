// components/network/ArticleProvenanceBadge.js
// CHAIN OF CUSTODY -- the article-level provenance badge (data-driven, prose-independent). Renders
// one tier from the stored feed_items.provenance_tier, using the SINGLE-SOURCE Chain of Custody
// vocabulary (label + semantic color + plain-language caption) in components/network/confidenceTiers.js
// so the badge, the entity/in-prose confidence marks, the tooltips, and the /about + /methodology
// legends can never drift.
//
// TIER MAP (stored value -> confidence-tier key): sourced/verified -> Verified (green);
// partial/mixed -> Mixed (blue); attributed/reported -> Reported (amber); pending/unconfirmed ->
// Unconfirmed (slate); analysis -> Our Read (violet). Anything else / null -> renders NOTHING
// (honest-null: never fabricate a tier). Server-safe, no state.
//
// The verification CLAIM lives ONLY here (Brief 2b): the byline receipt is accountability-only
// ("Approved by Justin"), so the receipt can never contradict a Reported / Our Read article.
//
// MOTION: a CSS-only mount fade+rise (opacity + transform only -> ZERO layout shift, CLS stays 0),
// fully disabled under prefers-reduced-motion. Polish, not required for meaning.

import Link from 'next/link';
import { CONFIDENCE_TIERS, TierIcon } from '@/components/network/confidenceTiers';

// stored provenance value -> confidence-tier key (the single source of label/color/caption).
var TIER_KEY = {
  sourced: 'verified', verified: 'verified',
  partial: 'partial', mixed: 'partial',
  attributed: 'attributed', reported: 'attributed',
  pending: 'pending', unconfirmed: 'pending',
  analysis: 'analysis',
};

export default function ArticleProvenanceBadge({ tier, size = 13, withLink = true }) {
  if (!tier) return null; // honest-null: no tier -> no badge
  var key = TIER_KEY[String(tier).toLowerCase()];
  if (!key) return null; // unknown tier -> render nothing (never guess)
  var t = CONFIDENCE_TIERS.find(function (x) { return x.key === key; });
  if (!t) return null;

  var aria = t.label + ' - ' + t.caption;
  // CLS-safe mount motion (opacity + transform only -> zero layout shift), disabled under
  // prefers-reduced-motion. The <style> is a Fragment-level sibling (flow content), NOT nested in
  // a <span>, so it is valid HTML and hydrates cleanly; <style> is display:none so it never shifts
  // layout. Multiple badges on one page emit identical rules (harmless).
  return (
    <>
      <style>{
        '@keyframes cocIn{from{opacity:0;transform:translateY(2px)}to{opacity:1;transform:none}}' +
        '.coc-badge{animation:cocIn .32s ease-out both}' +
        '@media (prefers-reduced-motion: reduce){.coc-badge{animation:none}}'
      }</style>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span
          className="coc-badge"
          title={t.desc}
          aria-label={aria}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: t.color,
            border: '1px solid ' + t.color + '55', borderRadius: 4,
            padding: '3px 9px', background: t.color + '14',
            lineHeight: 1.1, whiteSpace: 'nowrap',
          }}
        >
          <TierIcon tier={key} size={size} />
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase' }}>{t.label}</span>
          <span aria-hidden="true" style={{ width: 1, height: 10, background: t.color, opacity: 0.4 }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.2, opacity: 0.92 }}>{t.caption}</span>
        </span>
        {withLink && (
          <Link
            href="/about#chain-of-custody"
            title="What is Chain of Custody?"
            aria-label="What is Chain of Custody?"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 15, height: 15, borderRadius: '50%',
              border: '1px solid ' + t.color + '55', color: t.color,
              fontSize: 9, fontWeight: 800, fontFamily: 'monospace', textDecoration: 'none',
              opacity: 0.7,
            }}
          >?</Link>
        )}
      </span>
    </>
  );
}
