// components/game/BountyNet.js
// BOUNTY NET: an original, game-agnostic bounty lifecycle simulator for a bounty system explainer.
// Server component. Every claim comes from the `model` (built by a game adapter, e.g. lib/dmz/bountyNet.js,
// from that game's single source of truth); this file holds only UI chrome and the CSS.
//
// HONESTY RULES (enforced by tests): an ILLUSTRATIVE label is always shown; cards carry redacted bars and
// abstract heat meters, never names or values; no digit appears in the graphic except rank POSITIONS
// (data-bn-rank) and inside data-bn-allow-digits elements (source labels, last-checked dates, intel ring
// counts). Unpublished items render as UNPUBLISHED <details> blocks, so they open without JavaScript.
//
// The client island (BountyNetClient) runs the simulator. Motion is transform and opacity only and stops
// under prefers-reduced-motion (instant state changes, static glow). Inline SVG and CSS only.

import { intelRingArcs } from '@/lib/game/bountyNetGeometry';
import BountyNetClient from './BountyNetClient';

// Inline, not a stylesheet: a separate CSS file measured ~150ms slower FCP on throttled mobile.
var CSS = `
.bn{--ok:#6cc97e;--unp:#ffb400;--acc:#ff6a1f;--ln:#243341;--pn:#0b1117;--tx:rgba(255,255,255,0.88);--mu:rgba(255,255,255,0.7);
  position:relative;margin:0;padding:18px;border:1px solid var(--ln);border-radius:10px;overflow:hidden;color:var(--tx);
  background:radial-gradient(120% 70% at 50% 0%,rgba(63,125,68,0.24),transparent 60%),linear-gradient(180deg,#0c1218,#080b10);
  box-shadow:0 0 0 1px rgba(63,125,68,0.25),0 0 48px rgba(63,125,68,0.16),inset 0 0 70px rgba(0,0,0,0.6)}
.bn *{box-sizing:border-box}
.bn::after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,0.022) 0 1px,transparent 1px 3px)}
.bn-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
.bn-title{font-family:Orbitron,monospace;font-weight:900;letter-spacing:4px;font-size:clamp(20px,4vw,30px);margin:0;color:#fff;text-shadow:0 0 18px rgba(108,201,126,0.55),0 0 2px #fff}
.bn-illus{font:700 11px/1.2 monospace;letter-spacing:1.5px;text-transform:uppercase;color:#0a0e13;background:var(--unp);border-radius:3px;padding:5px 8px}
.bn button{font:inherit;color:inherit}
.bn :focus-visible{outline:2px solid var(--acc);outline-offset:3px}
.bn-shead{display:flex;flex-wrap:wrap;align-items:center;gap:12px 16px;margin-bottom:12px}
.bn-tabs{display:inline-flex;border:1px solid var(--ln);border-radius:999px;padding:3px;background:#070a0e}
.bn-tab{font:800 12px/1 monospace;letter-spacing:2px;text-transform:uppercase;color:var(--mu);background:none;border:0;border-radius:999px;padding:10px 16px;cursor:pointer;min-height:40px}
.bn-tab small{font-size:10px;letter-spacing:1px;margin-left:6px;opacity:.8}
.bn-tab[aria-selected="true"]{color:#0a0e13;background:var(--ok);box-shadow:0 0 18px rgba(108,201,126,0.55)}
.bn-scope{display:inline-flex;gap:6px}
.bn-pill{font:700 11px/1 monospace;letter-spacing:1.5px;text-transform:uppercase;background:#070a0e;border:1px solid var(--ln);border-radius:999px;padding:9px 13px;cursor:pointer;color:var(--mu);min-height:36px}
.bn-pill[aria-pressed="true"]{color:#fff;border-color:var(--ok);box-shadow:inset 0 0 12px rgba(108,201,126,0.35)}
.bn-week{display:inline-flex;align-items:center;gap:8px;font:700 10.5px/1.2 monospace;letter-spacing:1px;text-transform:uppercase;color:var(--mu);margin-left:auto}
.bn-week svg{width:30px;height:30px}
.bn-wk0{fill:none;stroke:rgba(255,255,255,0.12);stroke-width:4}
.bn-wk1{fill:none;stroke:var(--ok);stroke-width:4;stroke-linecap:round;stroke-dasharray:62 101;transform-origin:20px 20px;animation:bn-spin 24s linear infinite;filter:drop-shadow(0 0 3px rgba(108,201,126,0.8))}
.bn-ladder{position:relative;padding:14px;border:1px solid var(--ln);border-radius:8px;background:linear-gradient(180deg,rgba(15,21,28,0.92),rgba(8,11,16,0.92));overflow:hidden;margin-bottom:10px}
.bn-scan{position:absolute;left:0;right:0;top:0;height:100%;pointer-events:none;background:linear-gradient(180deg,transparent 0,rgba(108,201,126,0.16) 6%,transparent 12%);animation:bn-scan 5s linear infinite}
.bn-hero,.bn-rest{list-style:none;margin:0;padding:0;display:grid;gap:10px;transition:transform .25s ease-out}
.bn-hero{grid-template-columns:repeat(5,minmax(0,1fr));transform:translate3d(calc(var(--px,0)*12px),calc(var(--py,0)*7px),0)}
.bn-rest{grid-template-columns:repeat(7,minmax(0,1fr));margin-top:10px;transform:translate3d(calc(var(--px,0)*5px),calc(var(--py,0)*3px),0)}
.bn-card{position:relative;display:flex;flex-direction:column;gap:8px;padding:10px;min-height:66px;border:1px solid rgba(108,201,126,0.32);border-radius:6px;background:linear-gradient(160deg,rgba(108,201,126,0.09),rgba(12,18,24,0.94));box-shadow:0 0 14px rgba(108,201,126,0.12);will-change:transform}
.bn-card.hero{min-height:112px;padding:12px}
.bn-cglow{position:absolute;inset:-1px;border-radius:7px;pointer-events:none;box-shadow:0 0 22px rgba(255,106,31,0.45),inset 0 0 18px rgba(255,106,31,0.16);border:1px solid rgba(255,106,31,0.5);transition:opacity .6s ease}
.bn-card.you{border-color:var(--acc);background:linear-gradient(160deg,rgba(255,106,31,0.2),rgba(12,18,24,0.94))}
.bn-card.you .bn-cglow{box-shadow:0 0 30px rgba(255,106,31,0.75),inset 0 0 22px rgba(255,106,31,0.3);border-color:var(--acc)}
.bn-card.rival{border-color:var(--unp)}
.bn-rank{font:900 13px/1 monospace;color:rgba(255,255,255,0.75);letter-spacing:1px}
.bn-card.hero .bn-rank{font-size:20px;color:#fff;text-shadow:0 0 10px rgba(108,201,126,0.6)}
.bn-cbody{display:flex;flex-direction:column;gap:6px;flex:1;justify-content:flex-end;min-width:0}
.bn-redact{display:block;height:10px;border-radius:2px;background:repeating-linear-gradient(90deg,#d7dde3 0 8px,#9aa4ad 8px 10px);opacity:.82}
.bn-redact.short{width:55%;opacity:.42}
.bn-card:not(.hero) .bn-redact.short{display:none}
.bn-you{position:relative;display:inline-flex;align-items:center;gap:6px;font:900 12px/1 monospace;letter-spacing:2px;text-transform:uppercase;color:#fff}
.bn-you.rv{color:var(--unp);letter-spacing:1px;font-size:10.5px}
.bn-mini{display:inline-block;width:9px;height:12px;border-radius:1px;background:var(--acc);box-shadow:0 0 8px var(--acc);animation:bn-breathe 1.8s ease-in-out infinite}
.bn-flash{position:absolute;inset:-8px -10px;border-radius:6px;background:rgba(255,180,0,0.45);animation:bn-out 1.4s ease-out forwards}
.bn-hm{display:block;height:6px;border-radius:999px;background:rgba(255,255,255,0.08);overflow:hidden}
.bn-hm i{display:block;height:100%;transform-origin:left center;background:linear-gradient(90deg,var(--ok),var(--unp),var(--acc));transition:transform .6s cubic-bezier(.2,.8,.2,1)}
.bn-more{display:none}
.bn-why{margin-top:12px}
.bn-cap{font-size:12.5px;color:var(--mu);line-height:1.5;margin:8px 0 0}
.bn-status{font:700 12px/1.4 monospace;letter-spacing:.5px;color:var(--ok);margin:0 0 12px;min-height:34px;padding:8px 10px;border-left:3px solid var(--ok);background:rgba(108,201,126,0.07);border-radius:0 4px 4px 0}
.bn-grid{display:grid;gap:12px;grid-template-columns:minmax(0,1.1fr) minmax(0,0.8fr) minmax(0,1.1fr);grid-template-areas:"deck tag log" "hunter hunter clear"}
.bn-log{display:flex;flex-direction:column}
.bn-log .bn-logl{flex:1 1 0;height:auto;min-height:280px}
.bn-hunter{display:grid;grid-template-columns:minmax(0,0.8fr) minmax(0,1.2fr);column-gap:16px;align-content:start}
.bn-hunter>h3{grid-column:1/-1}
.bn-hunter .bn-radar{grid-row:2/span 5;align-self:start;width:100%}
.bn-clear .bn-btns{grid-template-columns:minmax(0,1fr)}
.bn-deck{grid-area:deck}.bn-tagbox{grid-area:tag}.bn-log{grid-area:log}.bn-hunter{grid-area:hunter}.bn-clear{grid-area:clear}
.bn-box{border:1px solid var(--ln);border-radius:8px;padding:12px;background:var(--pn);min-width:0}
.bn-box h3{font:800 11px/1.3 monospace;letter-spacing:2px;text-transform:uppercase;color:var(--ok);margin:0 0 10px}
.bn-btns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.bn-btn{font:800 11.5px/1.25 monospace;letter-spacing:1px;text-transform:uppercase;color:#fff;background:linear-gradient(180deg,rgba(108,201,126,0.22),rgba(108,201,126,0.06));border:1px solid var(--ok);border-radius:5px;padding:11px 10px;min-height:46px;cursor:pointer;box-shadow:0 0 12px rgba(108,201,126,0.18);transition:transform .12s ease}
.bn-btn.hot{background:linear-gradient(180deg,rgba(255,106,31,0.34),rgba(255,106,31,0.1));border-color:var(--acc);box-shadow:0 0 14px rgba(255,106,31,0.25)}
.bn-btn.ghost{background:none;border-color:var(--ln);box-shadow:none;color:var(--mu);margin-top:10px;width:100%}
.bn-btn.done{border-color:var(--unp);box-shadow:inset 0 0 14px rgba(255,180,0,0.3)}
.bn-btn:active{transform:scale(.97)}
.bn-btn:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
.bn-list{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:8px}
.bn-node{border-left:3px solid var(--ok);padding:6px 10px;background:rgba(108,201,126,0.06);border-radius:0 4px 4px 0;font-size:13px;line-height:1.5}
.bn-node.unp{border-left-color:var(--unp);background:rgba(255,180,0,0.06)}
.bn-tag{display:inline-block;font:800 10px/1 monospace;letter-spacing:1.5px;text-transform:uppercase;padding:3px 6px;border-radius:2px;margin-right:8px;color:#0a0e13;background:var(--ok)}
.bn-tag.unp{background:var(--unp)}
.bn-src{display:block;font-size:11.5px;color:var(--mu);margin-top:2px}
.bn-src a{color:#8fdc9e;text-decoration:underline;text-underline-offset:2px}
.bn-unp{margin-top:10px;border:1px solid rgba(255,180,0,0.45);border-radius:6px;background:linear-gradient(160deg,rgba(255,180,0,0.08),#0b1117);box-shadow:0 0 14px rgba(255,180,0,0.1)}
.bn-unp.dec{border-color:rgba(108,201,126,0.55);background:linear-gradient(160deg,rgba(108,201,126,0.1),#0b1117)}
.bn-unp summary{cursor:pointer;list-style:none;padding:10px 12px;display:block;min-height:44px}
.bn-unp summary::-webkit-details-marker{display:none}
.bn-glitch{display:inline-block;font:800 11px/1.2 monospace;letter-spacing:2px;color:var(--unp);text-shadow:1px 0 rgba(255,106,31,0.8),-1px 0 rgba(108,201,126,0.6);animation:bn-glitch 3.2s steps(1) infinite;margin-right:8px}
.bn-unp.dec .bn-glitch{color:var(--ok);animation:none;text-shadow:0 0 8px rgba(108,201,126,0.6)}
.bn-topic{font-size:13px;font-weight:700;color:#fff}
.bn-bars{display:flex;gap:4px;margin-top:8px}
.bn-bars i{height:7px;border-radius:1px;background:repeating-linear-gradient(90deg,#d7dde3 0 5px,#9aa4ad 5px 7px);opacity:.5}
.bn-unp[open] .bn-bars{display:none}
.bn-unprow{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.bn-unprow .bn-unp{margin:0;flex:1 1 170px;min-width:0}
.bn-unprow .bn-unp[open]{flex-basis:100%}
.bn-unprow .bn-bars{display:none}
.bn-unprow summary,.bn-ugrid summary{padding:9px 10px}
.bn-list.cols{grid-template-columns:repeat(2,minmax(0,1fr))}
.bn-reveal{margin:0;padding:0 12px 12px;font-size:13px;line-height:1.5}
.bn-tagstage{position:relative;width:132px;height:192px;margin:4px auto 0}
.bn-tagghost{position:absolute;inset:0;width:100%;height:100%}
.bn-tagghost polygon{fill:none;stroke:rgba(255,255,255,0.18);stroke-width:2;stroke-dasharray:6 5}
.bn-tagwrap{position:absolute;inset:0}
.bn-tagwrap.flip{animation:bn-flip .7s cubic-bezier(.2,.8,.2,1)}
.bn-tglow{position:absolute;inset:-10px;border-radius:22px;pointer-events:none;transition:opacity .6s ease}
.bn-tglow::before{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(closest-side,rgba(255,106,31,0.85),rgba(255,106,31,0.25) 60%,transparent);filter:blur(10px);animation:bn-breathe 2.2s ease-in-out infinite}
.bn-tagsvg{position:relative;width:100%;height:100%;overflow:visible}
.bn-piece{fill:url(#bn-steel);stroke:#8fdc9e;stroke-width:1.2;stroke-linejoin:round;transform-box:fill-box;transform-origin:center}
.bn-hole{fill:#06090c;stroke:#8fdc9e;stroke-width:1.5}
.bn-seal{fill:rgba(255,106,31,0.12);stroke:var(--acc);stroke-width:2.5}
.bn-cross{stroke:var(--acc);stroke-width:2;opacity:.8}
.bn-core{fill:var(--acc)}
.bn-emb{fill:rgba(215,221,227,0.55)}
.bn-shimmer{fill:rgba(255,255,255,0.22);transform:skewX(-18deg);animation:bn-shim 2.8s ease-in-out infinite}
.bn-tagwrap.end-lost{animation:bn-lost .9s cubic-bezier(.5,0,.8,.4) forwards}
.bn-tagwrap.end-paid{animation:bn-paid .9s ease forwards}
.bn-tagwrap.end-claimed{animation:bn-claimed .9s cubic-bezier(.5,0,.8,.4) forwards}
.bn-tagwrap.end-died .bn-tagart,.bn-tagwrap.end-died .bn-shimmer{animation:bn-out .25s ease forwards}
.bn-tagwrap.end-died .p0{animation:bn-f0 .9s cubic-bezier(.2,.7,.4,1) forwards}
.bn-tagwrap.end-died .p1{animation:bn-f1 .9s cubic-bezier(.2,.7,.4,1) forwards}
.bn-tagwrap.end-died .p2{animation:bn-f2 .9s cubic-bezier(.2,.7,.4,1) forwards}
.bn-tagwrap.end-died .p3{animation:bn-f3 .9s cubic-bezier(.2,.7,.4,1) forwards}
.bn-tagstate{text-align:center;font:800 11px/1.3 monospace;letter-spacing:1.5px;text-transform:uppercase;color:#fff;margin:8px 0 0}
.bn-logl{height:330px;overflow:auto;margin-top:0;padding-right:4px}
.bn-empty{font-size:13px;color:var(--mu);line-height:1.5}
.bn-radar{position:relative;max-width:240px;margin:0 auto 10px}
.bn-radar svg{display:block;width:100%;height:auto;border-radius:50%;box-shadow:0 0 24px rgba(108,201,126,0.18)}
.bn-rbg{fill:#07100c}
.bn-rgrid{stroke:rgba(108,201,126,0.12);stroke-width:1}
.bn-rring{fill:none;stroke:rgba(108,201,126,0.28);stroke-width:1}
.bn-vic{opacity:0;transform:scale(0.01);transform-origin:134px 72px;transition:transform .8s cubic-bezier(.2,.8,.2,1),opacity .5s ease}
.bn-vic.on{opacity:1;transform:scale(var(--k))}
.bn-vicc{stroke:var(--acc);stroke-width:1.5;stroke-dasharray:4 4}
.bn-blip{fill:var(--acc);transform-box:fill-box;transform-origin:center;animation:bn-ping 1.6s ease-out infinite}
.bn-sweep{transform-origin:100px 100px;animation:bn-spin 3.4s linear infinite}
.bn-sweep path{fill:rgba(108,201,126,0.22)}
.bn-rmsg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:800 11px/1.2 monospace;letter-spacing:2px;text-transform:uppercase;color:var(--mu)}
.bn-btns.two{grid-template-columns:minmax(0,0.8fr) minmax(0,1.2fr)}
.bn-claimres{display:flex;align-items:center;justify-content:center;min-height:52px;margin-top:10px;border:1px dashed var(--ln);border-radius:6px}
.bn-got{display:inline-flex;align-items:center;gap:12px}
.bn-gotag{display:inline-block;width:18px;height:26px;clip-path:polygon(30% 0,70% 0,100% 15%,100% 85%,70% 100%,30% 100%,0 85%,0 15%);background:linear-gradient(160deg,#3a4b58,#16202a);box-shadow:0 0 10px var(--acc);animation:bn-slide .7s cubic-bezier(.2,.8,.2,1) both}
.bn-cash{display:inline-flex;align-items:center;gap:8px;font:800 12px/1 monospace;letter-spacing:1.5px;text-transform:uppercase;color:#0a0e13;background:var(--ok);border-radius:999px;padding:8px 12px;box-shadow:0 0 18px rgba(108,201,126,0.6);animation:bn-pop .6s .35s cubic-bezier(.2,.8,.2,1) both}
.bn-cash b{display:inline-block;width:34px;height:10px;border-radius:2px;background:repeating-linear-gradient(90deg,#0a0e13 0 6px,rgba(10,14,19,0.55) 6px 8px)}
.bn-cash.off{background:rgba(255,255,255,0.06);color:var(--mu);box-shadow:none;animation:none}
.bn-cash.off b{background:repeating-linear-gradient(90deg,rgba(255,255,255,0.3) 0 6px,rgba(255,255,255,0.12) 6px 8px)}
.bn-low{display:grid;grid-template-columns:minmax(0,0.42fr) minmax(0,1.58fr);gap:12px;margin-top:12px}
.bn-ring svg{display:block;width:100%;max-width:200px;height:auto;margin:0 auto}
.bn-ringtx{text-align:center;font:800 12px/1.4 monospace;letter-spacing:1px;margin:8px 0 0}
.bn-ringtx .c{color:var(--ok)}.bn-ringtx .u{color:var(--unp)}
.bn-ugrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,190px),1fr));gap:8px;align-content:start}
.bn-ugrid .bn-bars{margin-top:6px}
.bn-ugrid .bn-unp{margin:0}
.bn-callouts{margin-top:12px;border:1px dashed var(--ln);border-radius:6px;padding:0 14px}
.bn-callouts summary{cursor:pointer;padding:12px 0;font:800 11px/1.3 monospace;letter-spacing:2px;text-transform:uppercase;color:var(--mu)}
.bn-callouts .bn-list{margin:0 0 14px}
.bn-noscript{font-size:13px;color:var(--unp);margin:0 0 12px}
.bn figcaption{font-size:12.5px;color:var(--mu);margin-top:12px;line-height:1.5}
@keyframes bn-spin{to{transform:rotate(360deg)}}
@keyframes bn-scan{from{transform:translateY(-100%)}to{transform:translateY(100%)}}
@keyframes bn-breathe{0%,100%{opacity:1}50%{opacity:.6}}
@keyframes bn-out{to{opacity:0}}
@keyframes bn-glitch{0%,86%,100%{transform:none;opacity:1}88%{transform:translateX(2px);opacity:.6}90%{transform:translateX(-2px)}92%{opacity:.4}94%{transform:none;opacity:1}}
@keyframes bn-flip{0%{transform:perspective(700px) rotateY(0)}50%{transform:perspective(700px) rotateY(180deg) scale(1.08)}100%{transform:perspective(700px) rotateY(360deg)}}
@keyframes bn-shim{0%,35%{transform:skewX(-18deg) translateX(0)}100%{transform:skewX(-18deg) translateX(260px)}}
@keyframes bn-lost{to{transform:translateY(90px) rotate(32deg);opacity:0}}
@keyframes bn-paid{0%{transform:scale(1);opacity:1}35%{transform:scale(1.1);opacity:1}100%{transform:scale(.3);opacity:0}}
@keyframes bn-claimed{to{transform:translateX(170px) rotate(-14deg) scale(.55);opacity:0}}
@keyframes bn-f0{to{transform:translate(-46px,-34px) rotate(-38deg);opacity:0}}
@keyframes bn-f1{to{transform:translate(46px,-40px) rotate(32deg);opacity:0}}
@keyframes bn-f2{to{transform:translate(48px,44px) rotate(26deg);opacity:0}}
@keyframes bn-f3{to{transform:translate(-48px,42px) rotate(-30deg);opacity:0}}
@keyframes bn-ping{0%{transform:scale(.4);opacity:1}100%{transform:scale(3.6);opacity:0}}
@keyframes bn-slide{from{transform:translateX(-70px) rotate(-24deg);opacity:0}to{transform:none;opacity:1}}
@keyframes bn-pop{0%{transform:scale(.4);opacity:0}65%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
@media (max-width:900px){
  .bn-grid{grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-template-areas:"deck tag" "hunter hunter" "clear log"}
}
@media (max-width:720px){
  .bn{padding:12px;border-radius:8px}
  .bn-shead{flex-direction:column;align-items:stretch}
  .bn-tabs{display:grid;grid-template-columns:1fr;border-radius:8px;gap:3px}
  .bn-tab{border-radius:6px;min-height:46px;text-align:left}
  .bn-scope{display:grid;grid-template-columns:1fr 1fr}
  .bn-pill{min-height:44px}
  .bn-week{margin-left:0}
  .bn-ladder{padding:10px}
  .bn-hero,.bn-rest{grid-template-columns:1fr;gap:6px;transform:none}
  .bn-card,.bn-card.hero{display:grid;grid-template-columns:34px minmax(0,1fr);align-items:center;gap:10px;min-height:52px;padding:8px 10px}
  .bn-card.hero .bn-rank{font-size:17px}
  .bn-card .bn-redact.short{display:none}
  .bn-rest:not(.open) .bn-card:not(.you){display:none}
  .bn-rest:not(.open):not(:has(.you)) .bn-card:first-child{display:grid}
  .bn-status{min-height:68px}
  .bn-more{display:block;width:100%;margin-top:8px;min-height:44px;font:800 11px/1 monospace;letter-spacing:1.5px;text-transform:uppercase;color:var(--mu);background:#070a0e;border:1px solid var(--ln);border-radius:6px;cursor:pointer}
  .bn-grid{grid-template-columns:minmax(0,1fr);grid-template-areas:"deck" "tag" "hunter" "clear" "log"}
  .bn-btns,.bn-clear .bn-btns,.bn-btns.two{grid-template-columns:minmax(0,1fr)}
  .bn-btn{min-height:50px;font-size:12.5px}
  .bn-log .bn-logl{flex:none;height:300px;min-height:0}
  .bn-hunter{display:block}
  .bn-hunter .bn-radar{width:auto;max-width:220px;margin:0 auto 12px}
  .bn-low{grid-template-columns:minmax(0,1fr)}
  .bn-list.cols{grid-template-columns:minmax(0,1fr)}
}
@media (prefers-reduced-motion:reduce){
  .bn *,.bn *::before,.bn *::after{animation:none!important;transition:none!important}
  .bn-scan,.bn-shimmer,.bn-sweep,.bn-flash{display:none}
  .bn-tagwrap[class*="end-"]{display:none}
  .bn-hero,.bn-rest{transform:none!important}
}
`;

function Tag({ status }) {
  return <span className={'bn-tag' + (status === 'confirmed' ? '' : ' unp')}>{status === 'confirmed' ? 'Confirmed' : 'UNPUBLISHED'}</span>;
}

function SourceLine({ node, lastChecked }) {
  if (node.status !== 'confirmed') return <span className="bn-src" data-bn-allow-digits="">{'Not published yet. Last checked ' + lastChecked + '.'}</span>;
  return (
    <span className="bn-src" data-bn-allow-digits="">
      {'Source: '}
      {node.source.href ? <a href={node.source.href} rel="noopener" target="_blank">{node.source.label}</a> : node.source.label}
    </span>
  );
}

export function NodeItem({ node, lastChecked }) {
  return (
    <li className={'bn-node' + (node.status === 'confirmed' ? '' : ' unp')} data-claim-id={node.id} data-status={node.status}>
      <Tag status={node.status} />
      {node.text}
      <SourceLine node={node} lastChecked={lastChecked} />
    </li>
  );
}

export function IntelRing({ counts }) {
  var size = 200, cx = 100, r = 76;
  var a = intelRingArcs(counts.confirmed, counts.unpublished, r);
  return (
    <div className="bn-box bn-ring" data-bn-allow-digits="">
      <h3>Intel status</h3>
      <svg viewBox={'0 0 ' + size + ' ' + size} role="img" aria-label={counts.confirmed + ' confirmed, ' + counts.unpublished + ' unpublished'}>
        <circle cx={cx} cy={cx} r={r + 13} fill="none" stroke="#6cc97e" strokeOpacity="0.25" strokeWidth="2" />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#ffb400" strokeOpacity="0.55" strokeWidth="16" strokeDasharray="6 5" />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#6cc97e" strokeWidth="16" strokeLinecap="round" strokeDasharray={a.lit.toFixed(2) + ' ' + a.circumference.toFixed(2)} transform={'rotate(-90 ' + cx + ' ' + cx + ')'} style={{ filter: 'drop-shadow(0 0 6px rgba(108,201,126,0.7))' }} />
        <text x={cx} y={cx + 2} textAnchor="middle" fill="#ffffff" fontSize="34" fontWeight="900" fontFamily="monospace">{counts.confirmed}</text>
        <text x={cx} y={cx + 24} textAnchor="middle" fill="rgba(255,255,255,0.78)" fontSize="11" fontFamily="monospace" letterSpacing="2">CONFIRMED</text>
      </svg>
      <p className="bn-ringtx"><span className="c">{counts.confirmed + ' confirmed'}</span>{' / '}<span className="u">{counts.unpublished + ' UNPUBLISHED'}</span></p>
    </div>
  );
}

function IntelBlock({ node, lastChecked }) {
  var ok = node.status === 'confirmed';
  return (
    <details className={'bn-unp' + (ok ? ' dec' : '')} data-claim-id={node.id} data-status={node.status}>
      <summary>
        <span className="bn-glitch" data-bn-allow-digits="">{ok ? 'Now confirmed ' + node.confirmedOn : 'UNPUBLISHED'}</span>
        <span className="bn-topic">{node.topic}</span>
        <span className="bn-bars" aria-hidden="true"><i style={{ width: '38%' }} /><i style={{ width: '22%' }} /><i style={{ width: '30%' }} /></span>
      </summary>
      <p className="bn-reveal">{node.text}<SourceLine node={node} lastChecked={lastChecked} /></p>
    </details>
  );
}

export default function BountyNet({ model, title, headingId }) {
  // Only what the simulator needs crosses to the client: the claims it shows, labels and ladder shapes.
  var sim = { lastChecked: model.lastChecked, terms: model.terms, panels: model.panels, claims: model.claims, ladders: model.ladders, rivalHunter: model.rivalHunter };
  return (
    <figure className="bn" data-bountynet="" aria-labelledby={headingId}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bn-head">
        <p className="bn-title" aria-hidden="true">{title || 'BOUNTY NET'}</p>
        <span className="bn-illus">ILLUSTRATIVE - not live data, no real players</span>
      </div>
      <noscript><p className="bn-noscript">The simulator needs JavaScript. Every mechanic it shows is listed below with its tag and source.</p></noscript>

      <BountyNetClient sim={sim} />

      <div className="bn-low">
        <IntelRing counts={model.counts} />
        <div className="bn-box">
          <h3>Unpublished intel</h3>
          <div className="bn-ugrid">
            {model.intel.map(function (n) { return <IntelBlock key={n.id} node={n} lastChecked={model.lastChecked} />; })}
          </div>
        </div>
      </div>

      {/* Closed by default: the page's own sections below carry the same facts as plain text. */}
      <details className="bn-callouts">
        <summary>Every mechanic in this simulator, as text</summary>
        <ul className="bn-list">
          {model.callouts.map(function (n) { return <NodeItem key={n.id} node={n} lastChecked={model.lastChecked} />; })}
        </ul>
      </details>

      <figcaption>Illustrative simulator: no live data and no real players. Ladder numbers are positions only, never values. Confirmed mechanics come from official posts and carry their source; UNPUBLISHED blocks are mechanics no official source has stated yet.</figcaption>
    </figure>
  );
}
