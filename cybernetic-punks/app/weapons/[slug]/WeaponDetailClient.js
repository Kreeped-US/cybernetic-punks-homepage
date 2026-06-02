'use client';
import Link from 'next/link';

// Matches the shell detail page's visual system: #1a1d24 cards, #22252e
// borders, Orbitron headers, borderTop accent. Weapon data is uneven (many
// NULLs), so every section/stat checks for its value and hides if missing —
// a weapon page never shows "Damage: null".

var TIER_COLORS = {
  S: { bg: '#ff2222', fg: '#fff' },
  A: { bg: '#ff8800', fg: '#000' },
  B: { bg: '#00d4ff', fg: '#000' },
  C: { bg: '#666', fg: '#fff' },
  D: { bg: '#333', fg: 'rgba(255,255,255,0.7)' },
  BAN: { bg: '#ff2222', fg: '#fff' },
};

// Rarity ladder colors (consistent with the rest of the site).
var RARITY_COLORS = {
  Standard:   '#888888',
  Enhanced:   '#00ff41',
  Deluxe:     '#00d4ff',
  Superior:   '#9b5de5',
  Prestige:   '#ff2d55',
  Contraband: '#39ff14',
};

var EDITOR_COLORS = {
  CIPHER: '#ff2222', NEXUS: '#00d4ff', DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5',
};

// Weapon-type accent — falls back to cyan. Gives each page a little color
// identity without needing a per-weapon color table.
var TYPE_COLORS = {
  'AR': '#ff8800',
  'SMG': '#00d4ff',
  'Pistol': '#ffd700',
  'Shotgun': '#ff2222',
  'Precision Rifle': '#9b5de5',
  'Sniper Rifle': '#00ff88',
  'LMG': '#ff8800',
  'Railgun': '#00d4ff',
  'Hybrid': '#39ff14',
  'Melee': '#888888',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var h = Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
  if (h < 1) return 'just now';
  if (h < 24) return h + 'h ago';
  return Math.floor(h / 24) + 'd ago';
}

export default function WeaponDetailClient({
  weapon, weaponName, slug, metaTier, uniques, dexterPicks, articles, otherWeapons, faqItems,
}) {
  var color = TYPE_COLORS[weapon.weapon_type] || '#00d4ff';
  var imgSrc = weapon.image_filename ? '/images/weapons/' + weapon.image_filename : null;
  var tierStyle = metaTier ? TIER_COLORS[metaTier.tier] : null;
  var rarityColor = RARITY_COLORS[weapon.rarity] || '#888';
  var faqs = faqItems || [];
  var uniqueVariants = uniques || [];
  var dexterBuilds = dexterPicks || [];

  // Core combat stats — only the ones that actually have a value get shown.
  // Each entry: label + value (+ optional suffix). Nulls filtered out below.
  var statRows = [
    weapon.damage != null            && { label: 'Damage',      value: weapon.damage },
    weapon.fire_rate != null         && { label: 'Fire Rate',   value: weapon.fire_rate, suffix: ' RPM' },
    weapon.magazine_size != null     && { label: 'Magazine',    value: weapon.magazine_size },
    weapon.precision_multiplier != null && { label: 'Precision', value: weapon.precision_multiplier, suffix: 'x' },
    weapon.range_rating != null      && { label: 'Range',       value: weapon.range_rating },
    weapon.aim_assist != null        && { label: 'Aim Assist',  value: weapon.aim_assist },
  ].filter(Boolean);

  var rankedAvoid = weapon.ranked_viable === false;

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, fontFamily: 'system-ui, sans-serif' }}>

      <style>{`
        .wpn-card:hover   { background: #1e2228 !important; }
        .wpn-row:hover    { background: #1e2228 !important; }
        .bottom-nav:hover { background: #1e2228 !important; }
        .faq-card:hover   { background: #1e2228 !important; }
        .uniq-row:hover   { background: #1e2228 !important; }
      `}</style>

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#0e1014', borderBottom: '1px solid #1e2028' }}>

        {/* Subtle radial glow behind the weapon image, in the type color */}
        {imgSrc && (
          <div style={{
            position: 'absolute', right: '4%', top: '50%', transform: 'translateY(-50%)',
            width: 520, height: 320,
            background: 'radial-gradient(ellipse at center, ' + color + '22 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        )}

        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, ' + color + ' 0%, transparent 100%)' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '36px 24px' }}>

          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/meta" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>META</Link>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
            <span style={{ color: color }}>{weaponName.toUpperCase()}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) auto', gap: 32, alignItems: 'center' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color: color + 'aa', letterSpacing: 3, fontWeight: 700, marginBottom: 6, fontFamily: 'monospace' }}>
                {weapon.weapon_type ? weapon.weapon_type.toUpperCase() : 'WEAPON'}
                {weapon.ammo_type ? ' · ' + weapon.ammo_type.toUpperCase() : ''}
              </div>

              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(32px, 5.5vw, 52px)', fontWeight: 900, letterSpacing: '2px', color: color, margin: '0 0 12px', lineHeight: 0.95 }}>
                {weaponName.toUpperCase()}
              </h1>

              {/* Status pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
                {weapon.rarity && (
                  <span style={{ fontSize: 9, color: rarityColor, background: rarityColor + '14', border: '1px solid ' + rarityColor + '30', borderRadius: 2, padding: '4px 10px', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                    {weapon.rarity}
                  </span>
                )}
                {weapon.firing_mode && (
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: '4px 10px', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>
                    {weapon.firing_mode}
                  </span>
                )}
                {metaTier?.trend === 'up' && <span style={{ fontSize: 9, color: '#00ff41', background: 'rgba(0,255,65,0.1)', border: '1px solid rgba(0,255,65,0.25)', borderRadius: 2, padding: '4px 10px', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>↑ Rising Meta</span>}
                {metaTier?.trend === 'down' && <span style={{ fontSize: 9, color: '#ff2222', background: 'rgba(255,34,34,0.08)', border: '1px solid rgba(255,34,34,0.2)', borderRadius: 2, padding: '4px 10px', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>↓ Falling Meta</span>}
                {rankedAvoid && <span style={{ fontSize: 9, color: '#ff2222', background: 'rgba(255,34,34,0.1)', border: '1px solid rgba(255,34,34,0.3)', borderRadius: 2, padding: '4px 10px', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>Avoid in Ranked</span>}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link href="/meta" style={{ padding: '11px 20px', background: color, color: (color === '#ffd700' || color === '#00d4ff' || color === '#ff8800' || color === '#00ff88' || color === '#39ff14') ? '#000' : '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 1, borderRadius: 2, textDecoration: 'none' }}>
                  LIVE TIER LIST →
                </Link>
                <Link href="/advisor" style={{ padding: '11px 20px', background: 'transparent', border: '1px solid #22252e', color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 1, borderRadius: 2, textDecoration: 'none' }}>
                  BUILD ADVISOR →
                </Link>
              </div>
            </div>

            {/* Weapon image — the star of the hero */}
            <div style={{ position: 'relative', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              {imgSrc ? (
                <div style={{ position: 'relative', width: 'min(420px, 42vw)' }}>
                  <img
                    src={imgSrc}
                    alt={weaponName + ' — Marathon ' + (weapon.weapon_type || 'weapon')}
                    style={{ width: '100%', height: 'auto', objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.6))' }}
                  />
                  {/* Tier badge floats on the image */}
                  {tierStyle && (
                    <div style={{ position: 'absolute', top: 0, right: 0, background: tierStyle.bg, color: tierStyle.fg, fontSize: 18, fontWeight: 900, letterSpacing: 1, padding: '6px 14px', borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1, boxShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                      {metaTier.tier}
                    </div>
                  )}
                </div>
              ) : (
                /* No image — show a clean tier card fallback */
                <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + color, borderRadius: '0 0 3px 3px', padding: '18px 20px', minWidth: 200 }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, marginBottom: 14, fontWeight: 700, textTransform: 'uppercase' }}>Meta Tier</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace', flex: 1 }}>CURRENT</div>
                    {tierStyle ? (
                      <div style={{ background: tierStyle.bg, color: tierStyle.fg, fontSize: 16, fontWeight: 900, letterSpacing: 1, padding: '4px 12px', borderRadius: 2, fontFamily: 'Orbitron, monospace', lineHeight: 1 }}>
                        {metaTier.tier}
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Unrated</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {/* ══ COMBAT STATS ══════════════════════════════════ */}
        {statRows.length > 0 && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Combat Stats</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 1, background: '#1e2028' }}>
              {statRows.map(function(stat) {
                return (
                  <div key={stat.label} style={{ background: '#1a1d24', borderTop: '2px solid ' + color, padding: '14px 18px' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>{stat.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: color, fontFamily: 'Orbitron, monospace', letterSpacing: '-0.5px' }}>
                      {stat.value}{stat.suffix || ''}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* If the weapon has no numeric stats at all, say so honestly */}
          </section>
        )}

        {statRows.length === 0 && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + color, borderRadius: '0 3px 3px 0', padding: '14px 18px' }}>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                Detailed stats for the {weaponName} haven't been published yet. Check back as the database is updated.
              </div>
            </div>
          </section>
        )}

        {/* ══ NEXUS NOTE ════════════════════════════════════ */}
        {(metaTier?.note || metaTier?.ranked_note) && (
          <section style={{ paddingTop: 20 }}>
            <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #00d4ff', borderRadius: '0 3px 3px 0', padding: '14px 18px' }}>
              <div style={{ fontSize: 9, color: '#00d4ff', letterSpacing: 2, marginBottom: 8, fontWeight: 700, textTransform: 'uppercase' }}>⬡ NEXUS Analysis</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65 }}>{metaTier.note || metaTier.ranked_note}</div>
            </div>
          </section>
        )}

        {/* ══ UNIQUE VARIANTS — cross-link to /uniques ═══════ */}
        {uniqueVariants.length > 0 && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: '#ff2d55', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Unique Variants</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
              <Link href="/uniques" style={{ fontSize: 9, color: '#ff2d55', textDecoration: 'none', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>ALL UNIQUES →</Link>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, margin: '0 0 14px', maxWidth: 600 }}>
              Unique weapons based on the {weaponName}, with permanently locked mods.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 6 }}>
              {uniqueVariants.map(function(u) {
                var uColor = RARITY_COLORS[u.rarity] || '#ff2d55';
                return (
                  <Link key={u.name} href={'/uniques#' + u.slug} className="uniq-row" style={{
                    display: 'block', background: '#1a1d24', border: '1px solid #22252e',
                    borderLeft: '3px solid ' + uColor, borderRadius: '0 3px 3px 0',
                    padding: '12px 16px', textDecoration: 'none', transition: 'background 0.1s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: u.lore_tagline ? 6 : 0 }}>
                      <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: 1 }}>{u.name.toUpperCase()}</span>
                      <span style={{ flexShrink: 0, background: uColor, color: u.rarity === 'Deluxe' ? '#000' : '#fff', fontSize: 8, fontWeight: 900, letterSpacing: 1, padding: '2px 7px', borderRadius: 2, fontFamily: 'Orbitron, monospace' }}>
                        {(u.rarity || '').toUpperCase()}
                      </span>
                    </div>
                    {u.lore_tagline && (
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', lineHeight: 1.5 }}>"{u.lore_tagline}"</div>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ══ DEXTER'S PICKS ════════════════════════════════ */}
        {dexterBuilds.length > 0 && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: '#ff8800', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>⬢ DEXTER's Picks</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
              <Link href="/advisor" style={{ fontSize: 9, color: '#ff8800', textDecoration: 'none', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>BUILD ADVISOR →</Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 6 }}>
              {dexterBuilds.map(function(build) {
                var score = build.ce_score || 0;
                var grade = score >= 9 ? 'S' : score >= 7 ? 'A' : score >= 5 ? 'B' : 'C';
                var gradeColors = { S: '#ff2222', A: '#ff8800', B: '#00d4ff', C: '#666' };
                return (
                  <Link key={build.id} href={'/intel/' + build.slug} className="wpn-card" style={{
                    display: 'flex', gap: 12, background: '#1a1d24', border: '1px solid #22252e',
                    borderLeft: '3px solid #ff8800', borderRadius: '0 3px 3px 0',
                    padding: '12px 14px', textDecoration: 'none', transition: 'background 0.1s',
                  }}>
                    <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 32 }}>
                      <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 24, fontWeight: 900, color: gradeColors[grade], lineHeight: 1 }}>{grade}</div>
                      <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, marginTop: 2, fontWeight: 700, fontFamily: 'monospace' }}>CE {score}</div>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: '#ff8800', letterSpacing: 2, marginBottom: 4, fontWeight: 700, fontFamily: 'monospace' }}>⬢ DEXTER BUILD</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{build.headline}</div>
                      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700, fontFamily: 'monospace' }}>{timeAgo(build.created_at)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ══ ARTICLES ══════════════════════════════════════ */}
        {articles.length > 0 && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>{weaponName} Intel</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 6 }}>
              {articles.map(function(article) {
                var ec = EDITOR_COLORS[article.editor] || '#888';
                return (
                  <Link key={article.id} href={'/intel/' + article.slug} className="wpn-row" style={{
                    display: 'flex', gap: 10, background: '#1a1d24', border: '1px solid #22252e',
                    borderLeft: '3px solid ' + ec + '66', borderRadius: '0 3px 3px 0',
                    padding: '12px', textDecoration: 'none', overflow: 'hidden', transition: 'background 0.1s',
                  }}>
                    {article.thumbnail && (
                      <img src={article.thumbnail} alt="" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 2, flexShrink: 0, border: '1px solid #22252e' }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 9, color: ec, letterSpacing: 2, marginBottom: 4, fontWeight: 700 }}>{article.editor}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.3, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{article.headline}</div>
                      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(article.created_at)}</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* ══ FAQ ════════════════════════════════════════════ */}
        {faqs.length > 0 && (
          <section style={{ paddingTop: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Frequently Asked</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 6 }}>
              {faqs.map(function(item, i) {
                return (
                  <div key={i} className="faq-card" style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + color, borderRadius: '0 3px 3px 0', padding: '14px 18px', transition: 'background 0.1s' }}>
                    <h3 style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: '#fff', margin: '0 0 10px', lineHeight: 1.35 }}>{item.q}</h3>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.65, margin: 0 }}>{item.a}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ══ OTHER WEAPONS (same type) ══════════════════════ */}
        {otherWeapons.length > 0 && (
          <section style={{ paddingTop: 32, paddingBottom: 48 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>
                More {weapon.weapon_type || 'Weapons'}
              </span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 6 }}>
              {otherWeapons.map(function(w) {
                return (
                  <Link key={w.slug} href={'/weapons/' + w.slug} className="bottom-nav" style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                    background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + color + '70',
                    borderRadius: '0 0 3px 3px', textDecoration: 'none', transition: 'background 0.1s',
                  }}>
                    <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: color, letterSpacing: 1 }}>{w.name.toUpperCase()}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}