// components/game/GameArsenal.js
// SHARED honest-null ARSENAL roster for the game-section template -- a LIST, never a tier list.
// Renders weapon_stats rows (grouped by category) with NAMES + CLASSES only; stat values are never
// shown here, even for verified rows. Mirrors the DMZ/Wardogs honesty pattern: a banner, a per-weapon
// tier marker derived HONESTLY from verified + verified_source (an attributed gun reads "Attributed",
// never "Confirmed"), and NO asserted numbers / no JSON-LD fact. The intro and banner copy is derived
// from the rows passed in (verified count, total, config.earlyAccess), so it stays true as data
// changes. With zero verified rows the original values-pending copy renders unchanged.
// First used by Bodycam via the shared GameSectionPage.

import Link from 'next/link';
import { entitySlugFor } from '@/lib/coverage';
// Shared confidence-mark source (also drives Marathon's ProvenanceBadge + the /methodology legend).
// AXIS NOTE: most entries are STRUCTURE-PROVENANCE (where a weapon's existence is sourced) -- a
// DIFFERENT axis from the data-confidence gradient. So the icons map only where the meaning
// genuinely coincides: Attributed -> the shared attributed ring, Unconfirmed -> the shared pending
// dash, Patch-confirmed + Reworked (existence confirmed, values not confirmed) -> the STRUCTURE mark
// (a framed square). The green data-"verified" check is used ONLY for "Verified in-game": a row with
// verified=true whose verified_source is an owner in-game observation of its values (see tier()).
// Icons inherit each label's color.
import { TierIcon } from '@/components/network/confidenceTiers';

var FONT = 'Exo_2, system-ui, sans-serif';
var AMBER = '#ffb400'; // the site-wide "unconfirmed" honesty marker

// Honest tier from verified_source. Order matters: 'attributed' and 'reworked' win over 'patch'
// (a reworked gun's source also mentions the patch). Never upgrades an attributed gun to confirmed.
// `icon` is the shared TierIcon key: 'attributed'/'pending' where the meaning matches the network
// confidence tiers, 'structure' (the framed-square mark) for the existence-confirmed / values-pending
// entries. 'verified' (the shared green check) ONLY for a row that is verified=true AND whose source is
// an owner in-game observation of its values -- keyed to the data, never to a game slug.
export function tier(w) {
  var s = String(w.verified_source || '').toLowerCase();
  if (s.indexOf('attributed') !== -1 || s.indexOf('devlog') !== -1) return { label: 'Attributed', color: AMBER, icon: 'attributed' };
  if (w.verified === true && s.indexOf('owner in-game observation') !== -1) return { label: 'Verified in-game', color: '#00ff88', icon: 'verified' };
  if (s.indexOf('reworked') !== -1 || s.indexOf('present in-game') !== -1) return { label: 'Reworked', color: 'var(--text-tertiary)', icon: 'structure' };
  if (s.indexOf('patch') !== -1 || s.indexOf('locked') !== -1) return { label: 'Patch-confirmed', color: 'var(--accent)', icon: 'structure' };
  return { label: 'Unconfirmed', color: AMBER, icon: 'pending' };
}

// Badge key for the banner: every label tier() can return, with a plain meaning. Shown whenever at
// least one row is Verified in-game, so every badge on the page is explained.
export var LEGEND = [
  ['Verified in-game', 'stats observed in-game by the site owner'],
  ['Patch-confirmed', 'added or returned in official patch notes'],
  ['Reworked', 'already in the game, reworked per patch notes'],
  ['Attributed', 'shown in a devlog, not yet in a patch'],
  ['Unconfirmed', 'no confirming source yet'],
];

function groupByCategory(weapons) {
  var order = [];
  var map = {};
  (weapons || []).forEach(function (w) {
    var c = w.category || 'Other';
    if (!map[c]) { map[c] = []; order.push(c); }
    map[c].push(w);
  });
  return order.map(function (c) { return { category: c, guns: map[c] }; });
}

export default function GameArsenal({ config, section, weapons }) {
  var groups = groupByCategory(weapons);
  var total = (weapons || []).length;
  var verified = (weapons || []).filter(function (w) { return tier(w).label === 'Verified in-game'; }).length;
  var unverified = total - verified;
  var game = config.displayName;
  var ea = config.earlyAccess === true;

  return (
    <main style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 16px 80px' }}>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 8, marginBottom: 20, fontSize: 10, letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href={config.basePath} style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>{config.displayName}</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>{section.label}</span>
      </nav>

      <h1 style={{ fontFamily: FONT, fontSize: 30, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>{section.label}</h1>
      <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: '0 0 20px', maxWidth: 680, lineHeight: 1.6 }}>
        The weapon roster - {total} {total === 1 ? 'weapon' : 'weapons'} across {groups.length} {groups.length === 1 ? 'class' : 'classes'}{verified > 0
          ? '. ' + verified + ' ' + (verified === 1 ? 'has' : 'have') + ' stats verified in-game and ' + unverified + ' ' + (unverified === 1 ? 'does' : 'do') + ' not yet. Names and classes only; stat values are not shown on this list.'
          : '. Names and classes only; stat values are not shown because none are published yet.'}
      </p>

      {/* Honest banner: no numbers are asserted; the tier of each entry is shown honestly. With zero
          verified rows it renders the original values-pending copy unchanged. */}
      <div style={{ background: 'rgba(255,180,0,0.06)', border: '1px solid ' + AMBER, borderRadius: 4, padding: '14px 16px', marginBottom: 24 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'monospace', fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: AMBER, marginBottom: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: AMBER }} />
          {verified > 0 ? verified + ' of ' + total + ' verified in-game' : 'Structure confirmed - values pending'}
        </div>
        {verified > 0 ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
              Verified in-game means the site owner observed the weapon&apos;s stats in {game}{ea ? ' during Early Access' : ''}.{ea ? ' ' + game + ' is in Early Access, so values can change.' : ''} Weapons not yet verified, or not seen in the latest roster check, keep the tier of their earlier source and have no confirmed stats. This roster is not presented as complete or final.
            </p>
            <ul data-arsenal-legend="" style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '8px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
              {LEGEND.map(function (l) { return <li key={l[0]}><strong>{l[0]}</strong> - {l[1]}</li>; })}
            </ul>
          </>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6, maxWidth: 720 }}>
            The roster below is sourced from the official patch notes and devlogs. Damage, rate of fire, magazine sizes, and every other number stay unpublished and are NOT stated here - they are added only once verified in-game. Each entry carries its source tier: patch-confirmed, reworked-existing, or attributed (devlog, not yet in a patch).
          </p>
        )}
      </div>

      {groups.map(function (grp) {
        return (
          <div key={grp.category} style={{ marginBottom: 26 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 12px' }}>
              <h2 style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: 0 }}>{grp.category}</h2>
              <span style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-tertiary)' }}>{grp.guns.length}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(240px, 100%), 1fr))', gap: 8 }}>
              {grp.guns.map(function (w) {
                var t = tier(w);
                return (
                  <div key={w.name} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '2px solid ' + t.color, borderRadius: '0 3px 3px 0', padding: '13px 15px' }}>
                    <Link href={config.basePath + '/weapons/' + entitySlugFor('weapon', w.name)} style={{ display: 'block', fontFamily: FONT, fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 6, textDecoration: 'none' }}>{w.name}</Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: t.color }}>
                        <TierIcon tier={t.icon} size={10} />
                        {t.label}
                      </span>
                      {w.notes ? <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{w.notes}</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 28 }}>
        <Link href={config.basePath} style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text-secondary)', textDecoration: 'none', border: '1px solid var(--border)', borderRadius: 2, padding: '9px 16px' }}>
          &larr; All {config.displayName} sections
        </Link>
      </div>
    </main>
  );
}
