// components/game/hubKitCss.js
// Shared CSS for the hub kit (HubSection, CutCard, StatNumeral; Brief 192). Game-agnostic: no game names, no
// colors of its own beyond neutral fallbacks. A game page sets the custom properties on its wrapper
// (--hk-ground, --hk-card, --hk-line, --hk-text, --hk-soft, --hk-mute, --hk-accent, --hk-accent-text,
// --hk-ghost) and renders HUB_KIT_CSS once in a <style> via dangerouslySetInnerHTML (React would escape the '>'
// of child selectors in plain style text). Monospace labels use the plain monospace stack
// (no font loads). Motion: the hover lift runs only under prefers-reduced-motion: no-preference.
// Focus (Brief 212): .hk-cut is clipped by clip-path, which also clips an outline drawn outside the box, so a linked
// card's keyboard focus ring sits inside its edge (negative offset). :focus-visible only: no ring on mouse click.
export var HUB_KIT_CSS = `
.hk{background:var(--hk-ground,#0b0d10);color:var(--hk-text,#e8eaed)}
.hk *{box-sizing:border-box}
.hk a{color:var(--hk-accent-text,#ffb48a)}
.hk-mono{font-family:monospace;letter-spacing:.12em;text-transform:uppercase}
.hk-sec{padding:56px 0 8px}
.hk-sech{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px 16px;margin-bottom:12px}
.hk-secn{font-size:54px;line-height:1;font-weight:900;-webkit-text-stroke:1.5px var(--hk-ghost,#3a4450);color:transparent;user-select:none}
.hk-sech h2{margin:0;font-size:clamp(24px,4vw,30px);font-weight:800;color:var(--hk-text,#e8eaed)}
.hk-rule{flex:1 1 40px;height:1px;background:var(--hk-line,#2a323b);align-self:center}
.hk-secact{display:inline-flex;align-items:center;min-height:44px;font-size:14px;font-weight:700}
.hk-intro{margin:0 0 20px;color:var(--hk-soft,#b4bcc6);font-size:15px;line-height:1.6;max-width:760px}
.hk-cut{display:block;background:var(--hk-card,#11151a);box-shadow:inset 0 0 0 1px var(--hk-line,#2a323b);clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,0 100%);color:var(--hk-text,#e8eaed);text-decoration:none}
.hk-cut.hk-cutl{clip-path:polygon(16px 0,100% 0,100% 100%,0 100%,0 16px)}
a.hk-cut{min-height:44px}
a.hk-cut:hover{box-shadow:inset 0 0 0 1px var(--hk-accent,#ff6a1f)}
a.hk-cut:focus-visible{outline:2px solid var(--hk-accent,#ff6a1f);outline-offset:-3px}
@media (prefers-reduced-motion:no-preference){a.hk-cut{transition:transform .15s ease,box-shadow .15s ease}a.hk-cut:hover{transform:translateY(-3px)}}
.hk-num{display:block;font-weight:900;line-height:1;-webkit-text-stroke:1.5px var(--hk-accent,#ff6a1f);color:transparent}
.hk-numl{display:block;margin-top:4px;font-size:13px;color:var(--hk-soft,#b4bcc6)}
.hk-tag{display:inline-block;font:700 11px/1.3 monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--hk-accent-text,#ffb48a);border:1px solid var(--hk-accent,#ff6a1f);padding:2px 6px}
.hk-chips{list-style:none;margin:0 0 14px;padding:0;display:flex;flex-wrap:wrap;gap:8px}
.hk-chips li{border:1px solid var(--hk-line,#2a323b);font-size:14px;color:var(--hk-soft,#b4bcc6)}
.hk-chips li>a,.hk-chips li>span{display:inline-flex;align-items:center;min-height:44px;padding:0 12px;text-decoration:none;color:inherit}
.hk-chips li>a:hover{color:var(--hk-text,#e8eaed)}
`;
