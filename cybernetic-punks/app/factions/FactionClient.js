'use client';

import { useState } from 'react';
import Link from 'next/link';

// Visual styling only (not data). Faction identity now comes from the DB.
var FACTION_ORDER = ['Cyberacme', 'Nucaloric', 'Traxus', 'Mida', 'Arachne', 'Sekiguchi'];

var FACTION_COLORS = {
  Cyberacme: '#00ff41',
  Nucaloric: '#ff2d78',
  Traxus:    '#ff6600',
  Mida:      '#cc44ff',
  Arachne:   '#ff2222',
  Sekiguchi: '#c8b400',
};

var EDITOR_COLORS = {
  CIPHER: '#ff2222', NEXUS: '#00d4ff', DEXTER: '#ff8800', GHOST: '#00ff88', MIRANDA: '#9b5de5',
};
var EDITOR_SYMBOLS = {
  CIPHER: '◈', NEXUS: '⬡', DEXTER: '⬢', GHOST: '◇', MIRANDA: '◎',
};

function factionImage(fname) {
  return '/images/factions/' + fname.toLowerCase() + '.webp';
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function SectionHeader({ label, count, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
      <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: color || 'rgba(255,255,255,0.25)' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#22252e' }} />
      {count !== undefined && (
        <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{count}</span>
      )}
    </div>
  );
}

export default function FactionClient({ data }) {
  var [activeFaction, setActiveFaction] = useState('Cyberacme');

  var factions  = data?.factions  || [];
  var materials  = data?.materials || [];
  var articles  = data?.articles  || [];

  var selectedFaction  = factions.find(function(f) { return f.name === activeFaction; }) || null;
  var factionMaterials = materials.filter(function(m) { return m.faction_name === activeFaction; });
  var factionColor     = FACTION_COLORS[activeFaction] || '#00d4ff';

  var factionArticles = articles.filter(function(a) {
    var tags = (a.tags || []).map(function(t) { return (t || '').toLowerCase(); });
    return tags.includes(activeFaction.toLowerCase()) || tags.includes('factions');
  }).slice(0, 6);

  // Order DB factions by the canonical display order
  var orderedFactions = FACTION_ORDER.map(function(name) {
    return factions.find(function(f) { return f.name === name; });
  }).filter(Boolean);

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48 }}>
      <style>{`
        .f-card        { transition: background 0.12s, border-color 0.12s; }
        .f-card:hover  { background: #1e2228 !important; }
        .f-row:hover   { background: #1e2228 !important; }
        .f-tab-btn     { transition: background 0.12s, border-color 0.12s; cursor: pointer; }
        .f-tab-btn:hover { background: #1e2228 !important; }
      `}</style>

      {/* ══ BREADCRUMB ══ */}
      <nav aria-label="Breadcrumb" style={{ padding: '12px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <ol style={{ display: 'flex', gap: 8, fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, listStyle: 'none', padding: 0, margin: 0, flexWrap: 'wrap', fontWeight: 700 }}>
          <li><Link href="/" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>HOME</Link></li>
          <li>/</li>
          <li style={{ color: '#ffd700' }}>FACTIONS</li>
        </ol>
      </nav>

      {/* ══ HERO ══ */}
      <section style={{ padding: '24px 24px 28px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#ffd700', background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>6 FACTIONS</span>
          <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: '#00f5ff', background: 'rgba(0,245,255,0.08)', border: '1px solid rgba(0,245,255,0.25)', borderRadius: 2, padding: '3px 10px', letterSpacing: 2 }}>SEASON 2</span>
        </div>

        <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(2rem, 5vw, 3.4rem)', fontWeight: 900, letterSpacing: 1, lineHeight: 1.0, margin: '0 0 16px' }}>
          FACTION<br /><span style={{ color: '#ffd700' }}>INTEL</span>
        </h1>

        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 620, margin: 0 }}>
          Six organizations control contracts, reputation, unique gear, and Armory access on Tau Ceti IV - and unlocking all six is your key to Cryo Archive. In Season 2, your core Runner Shell stats come from the Cradle, not faction grinding.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 20 }}>
          <Link href="/cradle" style={{ padding: '11px 22px', background: '#00f5ff', color: '#000', fontSize: 11, fontWeight: 800, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
            CRADLE BUILD PLANNER -&gt;
          </Link>
          <Link href="/advisor" style={{ padding: '11px 22px', background: '#1a1d24', border: '1px solid #22252e', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700, letterSpacing: 2, borderRadius: 2, textDecoration: 'none', fontFamily: 'monospace' }}>
            BUILD ADVISOR -&gt;
          </Link>
        </div>
      </section>

      {/* ══ WHAT CHANGED IN S2 (authority asset + Cradle link) ══ */}
      <section style={{ padding: '0 24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #ffd700', borderRadius: '0 2px 2px 0', padding: '16px 18px' }}>
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#ffd700', letterSpacing: 1, marginBottom: 8 }}>WHAT CHANGED IN SEASON 2</div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: '0 0 8px' }}>
            In Season 1, Runner Shell stat upgrades came from grinding faction reputation across six separate upgrade trees. Season 2 moved those core stat upgrades into the Cradle - a unified, freely respec-able system shared across all shells.
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, margin: 0 }}>
            Factions still matter - just for different things now: contracts and reputation (faster in S2), unique gear and implant access, Sponsored Kits, Armory access, and gating Cryo Archive. For core stat builds, use the <Link href="/cradle" style={{ color: '#00f5ff', textDecoration: 'none' }}>Cradle build planner</Link>.
          </p>
        </div>
      </section>

      {/* ══ CRYO ARCHIVE GATING ══ */}
      <section style={{ padding: '0 24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #00d4ff', borderRadius: '0 2px 2px 0', padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#00d4ff', letterSpacing: 1, marginBottom: 4 }}>CRYO ARCHIVE ACCESS</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
              You must unlock all six factions to access Cryo Archive, the endgame zone. Faction progression resets each season, but factions you previously unlocked stay unlocked.
            </div>
          </div>
        </div>
      </section>

      {/* ══ FACTION TABS + DETAIL ══ */}
      <section id="faction-detail" style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader label="THE SIX FACTIONS" />

        {/* Tab bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3, marginBottom: 3 }}>
          {FACTION_ORDER.map(function(fname) {
            var active = activeFaction === fname;
            var color  = FACTION_COLORS[fname];
            var imgSrc = factionImage(fname);
            return (
              <button key={fname} className="f-tab-btn" onClick={function() { setActiveFaction(fname); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '10px 8px',
                  background: '#1a1d24',
                  border: '1px solid ' + (active ? color + '55' : '#22252e'),
                  borderTop: '2px solid ' + (active ? color : '#22252e'),
                  borderRadius: '0 0 2px 2px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden',
                }}>
                <div style={{ position: 'relative', zIndex: 1, width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', border: '1px solid ' + (active ? color + '60' : '#22252e'), flexShrink: 0, background: '#0e1014' }}>
                  <img src={imgSrc} alt={fname} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: active ? 1 : 0.5 }} />
                </div>
                <span style={{ position: 'relative', zIndex: 1, fontFamily: 'monospace', fontSize: 8, color: active ? color : 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>
                  {fname.toUpperCase()}
                </span>
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        <div style={{ position: 'relative', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + factionColor, borderRadius: '0 2px 2px 0', padding: 24, overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '35%', backgroundImage: 'url(' + factionImage(activeFaction) + ')', backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.06, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '40%', background: 'linear-gradient(to right, #1a1d24, transparent)', pointerEvents: 'none' }} />

          {/* Header */}
          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr auto', gap: 20, alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                <div style={{ width: 48, height: 48, borderRadius: 2, overflow: 'hidden', border: '1px solid ' + factionColor + '40', flexShrink: 0, background: '#0e1014' }}>
                  <img src={factionImage(activeFaction)} alt={activeFaction} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 900, color: factionColor, letterSpacing: 1, lineHeight: 1, marginBottom: 4 }}>{activeFaction.toUpperCase()}</div>
                  {selectedFaction?.leader && (
                    <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontWeight: 700 }}>REPRESENTATIVE: {selectedFaction.leader.toUpperCase()}</div>
                  )}
                </div>
              </div>
              {selectedFaction?.focus && (
                <div style={{ display: 'inline-block', fontFamily: 'monospace', fontSize: 9, color: factionColor, background: factionColor + '10', border: '1px solid ' + factionColor + '28', borderRadius: 2, padding: '3px 8px', letterSpacing: 1, fontWeight: 700, marginBottom: 10 }}>{selectedFaction.focus.toUpperCase()}</div>
              )}
              {selectedFaction?.description && (
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, maxWidth: 540 }}>
                  {selectedFaction.description}
                </div>
              )}
            </div>
            {selectedFaction?.max_credit_cost > 0 && (
              <div style={{ background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, padding: '12px 16px', textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginBottom: 6, fontWeight: 700 }}>FULL UNLOCK COST</div>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 18, fontWeight: 900, color: factionColor, lineHeight: 1 }}>{selectedFaction.max_credit_cost.toLocaleString()}</div>
                <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, marginTop: 4, fontWeight: 700 }}>CREDITS</div>
              </div>
            )}
          </div>

          {/* Materials */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ background: '#0e1014', border: '1px solid #22252e', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', borderBottom: '1px solid #22252e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 10, fontWeight: 700, color: factionColor, letterSpacing: 1.5 }}>FARM MATERIALS</span>
                <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>{factionMaterials.length}</span>
              </div>
              <div style={{ padding: '12px 14px' }}>
                {factionMaterials.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {factionMaterials.map(function(m, i) {
                      return (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'monospace', fontSize: 9, color: factionColor, background: factionColor + '0e', border: '1px solid ' + factionColor + '28', borderRadius: 2, padding: '4px 8px', letterSpacing: 1, fontWeight: 700 }}>
                          {m.image_filename && (
                            <img src={'/images/materials/' + m.image_filename} alt={m.material_name} style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0 }} />
                          )}
                          {m.material_name}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'monospace', fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontWeight: 700 }}>DATA PENDING</div>
                )}
                {selectedFaction?.max_cost_summary && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: '#ffd700', letterSpacing: 1.5, marginBottom: 4, fontWeight: 700 }}>TOTAL TO MAX:</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{selectedFaction.max_cost_summary}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ S2 PROGRESSION FACTS ══ */}
      <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <SectionHeader label="SEASON 2 PROGRESSION" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 8 }}>
          {[
            { t: 'FASTER REPUTATION', d: 'Standard Contracts grant significantly more reputation, and new sources were added - including Enhanced valuables and defeating UESC.' },
            { t: 'CHEAPER UPGRADES', d: 'Material costs to unlock faction upgrades were reduced, so reaching VIP rank is achievable for most players within a season.' },
            { t: 'FEWER GATES', d: 'Priority Contracts no longer require a faction rank, and have fewer single-run requirements.' },
            { t: 'UNLOCKS CARRY OVER', d: 'Faction level and upgrades reset each season, but factions you previously unlocked stay unlocked - no repeating Liaison Contracts.' },
          ].map(function(item) {
            return (
              <div key={item.t} style={{ background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: 14 }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 11, fontWeight: 700, color: '#00ff41', letterSpacing: 1, marginBottom: 6 }}>{item.t}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{item.d}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ══ EDITOR ARTICLES ══ */}
      {factionArticles.length > 0 && (
        <section style={{ padding: '0 24px 48px', maxWidth: 1200, margin: '0 auto' }}>
          <SectionHeader label={activeFaction.toUpperCase() + ' INTEL'} count={factionArticles.length + ' ARTICLES'} color={factionColor} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 }}>
            {factionArticles.map(function(article) {
              var color = EDITOR_COLORS[article.editor] || '#888';
              var symbol = EDITOR_SYMBOLS[article.editor] || '·';
              var portrait = '/images/editors/' + (article.editor || '').toLowerCase() + '.jpg';
              return (
                <Link key={article.id} href={'/intel/' + article.slug} className="f-card"
                  style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid ' + color, borderRadius: '0 2px 2px 0', overflow: 'hidden', textDecoration: 'none' }}>
                  {article.thumbnail && (
                    <div style={{ height: 90, background: '#0e1014', overflow: 'hidden', position: 'relative' }}>
                      <img src={article.thumbnail} alt={article.headline} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 50%, rgba(26,29,36,0.95))' }} />
                    </div>
                  )}
                  <div style={{ padding: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', overflow: 'hidden', border: '1px solid ' + color + '40', flexShrink: 0 }}>
                        <img src={portrait} alt={article.editor} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <span style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: color }}>{symbol} {article.editor}</span>
                      {article.ce_score > 0 && (
                        <span style={{ marginLeft: 'auto', fontFamily: 'monospace', fontSize: 9, fontWeight: 800, color: color, background: color + '18', border: '1px solid ' + color + '30', borderRadius: 2, padding: '1px 5px' }}>{article.ce_score}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.35, marginBottom: 6 }}>
                      {article.headline}
                    </div>
                    <div style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700 }}>{timeAgo(article.created_at)}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ══ FAQ ══ */}
      <section style={{ padding: '0 24px 64px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <span style={{ fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 3, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase' }}>Frequently Asked</span>
          <div style={{ flex: 1, height: 1, background: '#22252e' }} />
          <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700 }}>5 QUESTIONS</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { q: 'What do factions do in Marathon Season 2?', a: 'In Season 2, factions provide contracts and reputation, unique faction gear and implants, Sponsored Kits, and Armory and vendor access. They also gate Cryo Archive - you must unlock all six to access it. What factions no longer do is gate your core Runner Shell stat upgrades; those moved to the Cradle.' },
            { q: 'Do factions still give stat upgrades in Season 2?', a: 'No. In Season 1, Runner Shell stat upgrades came from grinding faction reputation. In Season 2 those core stat upgrades moved to the Cradle, where you allocate Energy across six stat tracks. Factions now focus on contracts, unique gear, and access rather than core stats.' },
            { q: 'Why should I unlock all six factions?', a: 'Unlocking all six factions is required to access Cryo Archive, the endgame zone. Beyond that, each faction offers its own contracts, reputation rewards, unique gear and implants, and Armory access.' },
            { q: 'How is faction progression different in Season 2?', a: 'Faster. Standard Contracts grant more reputation, new reputation sources were added (Enhanced valuables, defeating UESC), material costs were reduced, and Priority Contracts no longer require a faction rank. Faction level resets each season, but factions you previously unlocked stay unlocked.' },
            { q: 'Who are the six Marathon factions?', a: 'Cyberacme, Nucaloric, Traxus, Mida, Arachne, and Sekiguchi. Each is a distinct organization with its own representative and rewards. Cyberacme is the typical starting faction, and Sekiguchi are the creators of the Runner Shells.' },
          ].map(function(item, i) {
            return (
              <details key={i} style={{ background: '#1a1d24', border: '1px solid #22252e', borderLeft: '2px solid #ffd700', borderRadius: '0 2px 2px 0' }}>
                <summary style={{ padding: '14px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.85)', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span>{item.q}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#ffd700', flexShrink: 0, fontWeight: 700 }}>+</span>
                </summary>
                <div style={{ padding: '0 18px 16px', fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>
                  {item.a}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </main>
  );
}