'use client';
// components/tierlist/ClassBandView.js
// ============================================================
// GAME-AGNOSTIC band-grouped tier view -- the fully model-accurate "By Class" layout. Groups
// weapon items by their model band, each band its own compact S-D ladder of tiles. Driven by:
//   items      -- [{ name, tier, band, imgSrc, iconFallback }] (model output + display data)
//   bandOrder  -- ordered band keys (Marathon: Close/Mid/Long/Special) -- per-game config
//   bandLabels, bandBlurb -- per-game display strings
//   tiers, tierStyles -- the S..D ladder + colors
//   onSelect(name) -- opens the breakdown panel
// No Marathon-specifics baked in; game #2 passes its own band config + item list.

export default function ClassBandView({ items, bandOrder, bandLabels, bandBlurb, tiers, tierStyles, onSelect }) {
  const byBand = {};
  (items || []).forEach(it => { (byBand[it.band] ||= []).push(it); });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 34 }}>
      {bandOrder.map(band => {
        const members = byBand[band] || [];
        if (!members.length) return null;
        const ranked = members.filter(m => m.tier);
        const unranked = members.filter(m => !m.tier);
        return (
          <section key={band}>
            {/* Band header */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: 2, textTransform: 'uppercase' }}>{bandLabels[band] || band}</span>
                <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', letterSpacing: 1 }}>{members.length}</span>
              </div>
              {bandBlurb && bandBlurb[band] ? (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.5 }}>{bandBlurb[band]}</div>
              ) : null}
            </div>

            {/* S..D ladder within band */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tiers.map(tier => {
                const inTier = ranked.filter(m => (m.tier || '').toUpperCase() === tier);
                if (!inTier.length) return null;
                const st = tierStyles[tier] || { bg: '#1a1d24', fg: '#fff', accent: '#333' };
                return (
                  <div key={tier} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
                    {/* tier letter */}
                    <div style={{ flexShrink: 0, minWidth: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: st.bg, color: st.fg, fontFamily: 'Orbitron, monospace', fontWeight: 900, fontSize: 18, borderRadius: 3 }}>{tier}</div>
                    {/* tiles */}
                    <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {inTier.map(m => (
                        <button
                          key={m.name}
                          onClick={() => onSelect && onSelect(m.name)}
                          title={'View ' + m.name + ' breakdown'}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                            background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + st.accent,
                            borderRadius: '0 3px 3px 0', padding: '7px 12px 7px 9px', textAlign: 'left', fontFamily: 'inherit',
                          }}
                        >
                          <span style={{ width: 30, height: 22, flexShrink: 0, background: '#0e1014', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            {m.imgSrc ? <img src={m.imgSrc} alt="" style={{ width: 28, height: 20, objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} /> : <span style={{ fontSize: 12, opacity: 0.4 }}>{m.iconFallback || '◢'}</span>}
                          </span>
                          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>{m.name}</span>
                          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginLeft: 2 }}>{'ⓘ'}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {unranked.length > 0 && (
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', letterSpacing: 1, marginTop: 2 }}>
                  UNRANKED (insufficient stat data): {unranked.map(m => m.name).join(', ')}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
