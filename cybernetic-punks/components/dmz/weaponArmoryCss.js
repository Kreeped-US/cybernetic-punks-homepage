// components/dmz/weaponArmoryCss.js
// Inline CSS for the DMZ weapons armory (WeaponArmory) and the Gunsmith bench (WeaponBench). Inline, not a
// stylesheet (a separate CSS file measured slower FCP on throttled mobile). Only opacity and transform ever animate,
// and only under prefers-reduced-motion: no-preference. Every box has its final size at first paint.
// Both are on the hub kit: they read the --hk-* custom properties the page sets (lib/dmz/hubTheme.js); the armory
// cards and the bench panel are hub-kit cut cards (components/game/hubKitCss.js). No text under 12px, controls 44px.
// Brief 211: the armory. Brief 213: the bench (no framed panel, scanlines or glow; a blocked slot is marked by its
// border, a muted struck-through name and the "Blocked by the Apex" line, never by fading the text).

// The weapon images are transparent cutouts of mostly black guns: a lighter slate spotlight keeps them legible.
export var SPOTLIGHT = 'radial-gradient(ellipse at 50% 48%,#5b6773 0%,#3c4853 38%,#26303a 72%,#182029 100%)';
// Hide every class section except the selected one; one rule per class slug (slugs are [a-z0-9-]).
function filterRules(slugs) {
  return (slugs || []).map(function (s) { return '.wa[data-filter="' + s + '"] .wa-sec:not([data-cls="' + s + '"]){display:none}'; }).join('');
}

export function armoryCss(slugs) {
  return '.wa{margin:0}'
    + '.wa-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}'
    + '.wa-title{margin:0;font-size:clamp(22px,3.4vw,26px);font-weight:800;letter-spacing:.04em;color:var(--hk-text)}'
    + '.wa-counts{display:flex;flex-wrap:wrap;gap:8px;list-style:none;margin:0 0 14px;padding:0}'
    + '.wa-counts li{font:700 12px/1.3 monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--hk-soft);border:1px solid var(--hk-line);padding:6px 10px}'
    + '.wa-counts b{color:var(--hk-text);font-size:14px;margin-right:6px}'
    + '.wa-tabs{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 22px;padding:0;list-style:none}'
    + '.wa .wa-tab{font:700 13px/1 monospace;letter-spacing:.1em;text-transform:uppercase;color:var(--hk-soft);border:1px solid var(--hk-line);padding:0 14px;min-height:44px;display:inline-flex;align-items:center;gap:8px;text-decoration:none;white-space:nowrap}'
    + '.wa-tab small{font-size:12px;color:var(--hk-mute)}'
    + '.wa .wa-tab:hover{color:var(--hk-text);border-color:var(--hk-accent)}'
    + '.wa .wa-tab[aria-current="true"]{color:var(--hk-ground);background:var(--hk-accent);border-color:var(--hk-accent)}'
    + '.wa .wa-tab[aria-current="true"] small{color:inherit}'
    + '.wa-tab:focus-visible{outline:2px solid var(--hk-accent);outline-offset:3px}'
    + '.wa-sec{margin:0 0 28px}.wa-sec:last-child{margin-bottom:0}'
    + '.wa-sech{display:flex;align-items:baseline;gap:10px;font:800 14px/1.2 monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--hk-text);margin:0 0 12px}'
    + '.wa-sech small{font-size:13px;color:var(--hk-mute)}'
    + '.wa-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}'
    + '.wa .wa-card{display:flex;flex-direction:column;height:100%;padding:12px 12px 14px;color:var(--hk-text)}'
    + '.wa-img{position:relative;aspect-ratio:2/1;overflow:hidden;margin-bottom:10px;background:' + SPOTLIGHT + '}'
    + '.wa-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:6px}'
    + '.wa-name{font-size:16px;font-weight:800;color:var(--hk-text);margin:0}'
    + '.wa-cls{font-size:13px;color:var(--hk-soft);margin:2px 0 10px}'
    + '.wa-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;margin:0 0 12px}'
    + '.wa-stats dt{font:700 12px/1.2 monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--hk-mute)}'
    + '.wa-stats dd{margin:2px 0 0;font-size:15px;font-weight:700;color:var(--hk-text)}'
    + '.wa-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}'
    + '.wa-tag,.wa-glitch{font:700 12px/1.3 monospace;letter-spacing:.1em;text-transform:uppercase;padding:2px 6px}'
    + '.wa-tag{color:#8fe0a8;border:1px solid #4a9d5b}.wa-glitch{color:#ffb400;border:1px solid #ffb400}'
    + '.wa-foot{font-size:13px;color:var(--hk-mute);margin:20px 0 0;padding-top:12px;border-top:1px solid var(--hk-line)}'
    + '@media (prefers-reduced-motion:no-preference){.wa-img img{transition:transform .2s ease}.wa .wa-card:hover .wa-img img{transform:scale(1.03)}}'
    // Phones: one scrolling row of tabs, scrollbar hidden and a right-edge fade (the DmzNav tab-strip pattern).
    + '@media (max-width:720px){.wa-tabs{flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px;scrollbar-width:none;'
    + '-webkit-mask-image:linear-gradient(to right,#000 calc(100% - 28px),transparent);mask-image:linear-gradient(to right,#000 calc(100% - 28px),transparent)}'
    + '.wa-tabs::-webkit-scrollbar{display:none}.wa .wa-tab{flex:none}'
    + '.wa-grid{grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.wa .wa-card{padding:8px 8px 10px}.wa-name{font-size:14px}'
    // Phones: each stat on one line (label left, value right), so a two-column card stays short.
    + '.wa-stats{grid-template-columns:1fr;gap:4px}.wa-stats>div{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:0 6px}.wa-stats dd{margin:0;font-size:14px}}'
    + filterRules(slugs);
}

export var BENCH_CSS = '.wb{margin:28px 0 0;padding:18px 20px 20px}'
  + '.wb-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}'
  + '.wb-title{margin:0;font:800 14px/1.2 monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--hk-text)}'
  + '.wb-illus{font:700 12px/1.3 monospace;letter-spacing:.1em;text-transform:uppercase;color:#ffb400;border:1px solid #ffb400;padding:2px 6px}'
  + '.wb-note{max-width:760px;font-size:14px;color:var(--hk-soft);margin:0 0 12px;line-height:1.5}'
  + '.wb-ctl{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:0 0 14px;min-height:44px}'
  + '.wb-toggle{font:700 13px/1 monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--hk-soft);background:var(--hk-ground);border:1px solid var(--hk-line);padding:0 18px;min-height:44px;cursor:pointer}'
  + '.wb-toggle:hover{color:var(--hk-text);border-color:var(--hk-accent)}'
  + '.wb-toggle[aria-pressed="true"]{color:var(--hk-ground);background:var(--hk-accent);border-color:var(--hk-accent)}'
  + '.wb-toggle:focus-visible{outline:2px solid var(--hk-accent);outline-offset:3px}'
  + '.wb-stage{display:grid;gap:12px}'
  + '.wb-row{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;gap:8px}'
  + '.wb-node{position:relative;width:140px;min-height:58px;padding:8px 10px;border:1px solid var(--hk-line);background:var(--hk-ground);display:flex;flex-direction:column;justify-content:center;gap:4px}'
  + '.wb-nm{font:700 13px/1.2 monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--hk-text)}'
  + '.wb-st{font:700 12px/1.2 monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--hk-accent-text);opacity:0}'
  + '.wb[data-apex="on"] .wb-node.bl{border-color:var(--hk-accent)}'
  + '.wb[data-apex="on"] .wb-node.bl .wb-nm{color:var(--hk-mute);text-decoration:line-through}'
  + '.wb[data-apex="on"] .wb-node.bl .wb-st{opacity:1}'
  + '.wb-img{position:relative;aspect-ratio:2/1;width:100%;max-width:560px;margin:0 auto;overflow:hidden;background:' + SPOTLIGHT + '}'
  + '.wb-img img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:8px}'
  + '.wb-apex{max-width:760px;margin:14px 0 0;padding:10px 14px;box-shadow:inset 3px 0 0 var(--hk-accent),inset 0 0 0 1px var(--hk-line);font-size:15px;line-height:1.6;color:var(--hk-soft);opacity:0;visibility:hidden}'
  + '.wb-apex strong{color:var(--hk-text)}.wb-apexb{display:block;margin-top:4px}'
  + '.wb[data-apex="on"] .wb-apex{opacity:1;visibility:visible}'
  + '@media (prefers-reduced-motion:no-preference){.wb-st,.wb-apex{transition:opacity .25s ease}}'
  + '@media (max-width:719px){.wb{padding:14px 14px 16px}.wb-img{display:none}.wb-stage{gap:8px}'
  + '.wb-row{flex-direction:column;align-items:stretch}.wb-node{width:auto;min-height:44px;flex-direction:row;justify-content:space-between;align-items:center}}';
