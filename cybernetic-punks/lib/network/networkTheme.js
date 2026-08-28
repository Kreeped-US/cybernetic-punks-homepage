// lib/network/networkTheme.js
// SHARED canonical network v7 stylesheet (burgundy/black/gold), extracted VERBATIM from
// app/page.js so the homepage AND other network pages (/about next) inject ONE source. This
// module is a PURE STRING with NO imports or side-effects -- importing it must not pull in fonts
// or anything else. That is what keeps the homepage byte-identical: it imports CNP_CSS but keeps
// its own inline font loaders (see the note below and lib/network/networkFonts.js).
//
// CANONICAL network tokens live in the .cnp-root block: --burg-bright #9A2740, --red #ff2038,
// --gold #E8B54D, plus the base/surface set. CSS is scoped under .cnp-root so it cannot leak.
//
// CNP_CSS is byte-for-byte from app/page.js -- the backticks delimit a stylesheet string (a
// template literal), NOT house-style prose. Do NOT reformat: the homepage byte-identical guard
// depends on the injected string being unchanged.
export const CNP_CSS = `
.cnp-root{
  --base:#0D0A0B;--surface:#1A1315;--surface-2:#241A1D;
  --burg:#6E1423;--burg-bright:#9A2740;--burg-glow:rgba(154,39,64,.32);
  --red:#ff2038;--red-glow:rgba(255,32,56,.55);--gold:#E8B54D;
  --text:#F0EAE2;--text-dim:#9c908c;--line:rgba(240,234,226,.09);
  --display:var(--cnp-display),'Chakra Petch',sans-serif;--body:var(--cnp-body),'Inter',sans-serif;--mono:var(--cnp-mono),'JetBrains Mono',monospace;
  position:relative;background:var(--base);color:var(--text);font-family:var(--body);line-height:1.5;min-height:100vh;-webkit-font-smoothing:antialiased;overflow-x:hidden;
}
.cnp-root *{box-sizing:border-box}
.cnp-root ::selection{background:var(--burg-bright);color:#fff}
.cnp-root a{color:inherit;text-decoration:none}
.cnp-root .wrap{max-width:1200px;margin:0 auto;padding:0 32px}
@media(prefers-reduced-motion:reduce){.cnp-root *{animation:none!important;transition:none!important}}

.cnp-root .atmos{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(1100px 700px at 75% -10%, var(--burg-glow), transparent 60%),radial-gradient(900px 600px at 8% 15%, rgba(110,20,35,.16), transparent 55%)}
.cnp-root main{position:relative;z-index:1}
.cnp-root nav{position:sticky;top:0;z-index:50;backdrop-filter:blur(14px);background:linear-gradient(180deg,rgba(13,10,11,.92),rgba(13,10,11,.5));border-bottom:1px solid var(--line)}
.cnp-root .nav-in{display:flex;align-items:center;justify-content:space-between;height:70px}
.cnp-root .nav-right{display:flex;align-items:center;gap:22px}
.cnp-root .brand{display:flex;align-items:center;gap:13px}
.cnp-root .brand img{width:38px;height:38px;border-radius:9px;display:block}
.cnp-root .brand .wm{font-family:var(--display);font-weight:700;font-size:18px;letter-spacing:.05em}
.cnp-root .brand .wm b{color:var(--burg-bright)}
.cnp-root .nav-links{display:flex;gap:28px;align-items:center;font-size:14px;color:var(--text-dim);font-weight:500}
.cnp-root .nav-links a:hover{color:var(--text)}

.cnp-root .hero{padding:96px 0 68px;position:relative;overflow:hidden}
.cnp-root .hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:48px;align-items:center}
.cnp-root .eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.32em;color:var(--gold);text-transform:uppercase;display:flex;align-items:center;gap:12px;margin-bottom:28px}
.cnp-root .eyebrow .live{width:7px;height:7px;border-radius:50%;background:#3ddc84;box-shadow:0 0 10px #3ddc84;animation:cnpPulse 2s infinite}
@keyframes cnpPulse{0%,100%{opacity:1}50%{opacity:.35}}
.cnp-root h1{font-family:var(--display);font-weight:700;font-size:clamp(38px,5.6vw,68px);line-height:1.03;letter-spacing:-.01em;margin-bottom:24px}
.cnp-root h1 .hl{color:var(--burg-bright);position:relative}
.cnp-root h1 .hl::after{content:'';position:absolute;left:0;bottom:.05em;width:100%;height:.08em;background:var(--gold);opacity:.9}
.cnp-root .sub{font-size:18px;color:var(--text-dim);max-width:48ch;margin-bottom:36px;line-height:1.6}
.cnp-root .sub b{color:var(--text);font-weight:500}
.cnp-root .cta-row{display:flex;gap:14px;flex-wrap:wrap}
.cnp-root .btn{font-family:var(--display);font-size:15px;font-weight:600;letter-spacing:.02em;padding:15px 28px;border-radius:2px;transition:.22s;cursor:pointer;border:1px solid transparent;display:inline-flex;align-items:center;gap:9px}
.cnp-root .btn-gold{background:var(--gold);color:var(--base)}
.cnp-root .btn-gold:hover{box-shadow:0 6px 30px rgba(232,181,77,.35);transform:translateY(-2px)}
.cnp-root .btn-gold:disabled{opacity:.55;cursor:not-allowed;transform:none;box-shadow:none}
.cnp-root .btn-ghost{border-color:var(--line);color:var(--text)}
.cnp-root .btn-ghost:hover{border-color:var(--burg-bright);background:rgba(154,39,64,.12)}

.cnp-root .scope{position:relative;aspect-ratio:1;max-width:440px;margin:0 auto}
.cnp-root .scope svg{width:100%;height:100%;overflow:visible;display:block}
.cnp-root #reticle{transform-box:fill-box;transform-origin:center}
.cnp-root .glowpulse{animation:cnpGlowpulse 4s ease-in-out infinite}
@keyframes cnpGlowpulse{0%,100%{opacity:.35}50%{opacity:.7}}
.cnp-root .ring-rot{transform-origin:center;animation:cnpRot 26s linear infinite}
@keyframes cnpRot{to{transform:rotate(360deg)}}
.cnp-root .scope-label{position:absolute;bottom:4%;left:50%;transform:translateX(-50%);font-family:var(--mono);font-size:10.5px;letter-spacing:.24em;text-transform:uppercase;white-space:nowrap;transition:color .2s}
.cnp-root .flash{opacity:0}

.cnp-root .telemetry{margin-top:56px;border:1px solid var(--line);border-radius:6px;background:linear-gradient(180deg,rgba(36,26,29,.55),rgba(26,19,21,.28));overflow:hidden;position:relative}
.cnp-root .telemetry::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--gold),transparent);opacity:.5}
.cnp-root .tel-head{display:flex;align-items:center;justify-content:space-between;padding:13px 20px;border-bottom:1px solid var(--line);font-family:var(--mono);font-size:11px;letter-spacing:.18em;color:var(--text-dim);text-transform:uppercase}
.cnp-root .tel-head .rec{display:flex;align-items:center;gap:8px;color:var(--red)}
.cnp-root .tel-head .rec i{width:6px;height:6px;border-radius:50%;background:var(--red);box-shadow:0 0 8px var(--red);animation:cnpPulse 1.4s infinite}
.cnp-root .tel-grid{display:grid;grid-template-columns:repeat(4,1fr)}
.cnp-root .tel-cell{padding:22px 20px;border-right:1px solid var(--line)}
.cnp-root .tel-cell:last-child{border-right:none}
.cnp-root .tel-cell .lbl{font-family:var(--mono);font-size:10.5px;letter-spacing:.16em;color:var(--text-dim);text-transform:uppercase;margin-bottom:8px}
.cnp-root .tel-cell .val{font-family:var(--display);font-size:30px;font-weight:700;color:var(--text);line-height:1}
.cnp-root .tel-cell.pop .val{color:var(--gold)}
.cnp-root .pass-note{padding:9px 20px 13px;font-family:var(--mono);font-size:10px;letter-spacing:.08em;color:var(--burg-bright);border-top:1px solid var(--line)}

.cnp-root section{padding:88px 0}
.cnp-root .sec-eyebrow{font-family:var(--mono);font-size:12px;letter-spacing:.28em;color:var(--gold);text-transform:uppercase;margin-bottom:16px;display:flex;align-items:center;gap:12px}
.cnp-root .sec-eyebrow::before{content:'';width:28px;height:1px;background:var(--gold)}
.cnp-root h2{font-family:var(--display);font-weight:700;font-size:clamp(28px,4vw,44px);line-height:1.08;letter-spacing:-.01em;margin-bottom:18px;max-width:22ch}
.cnp-root .sec-sub{color:var(--text-dim);font-size:17px;max-width:60ch;line-height:1.6}

.cnp-root .proof{border-top:1px solid var(--line)}
.cnp-root .proof-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:44px}
.cnp-root .card{border:1px solid var(--line);border-radius:6px;padding:32px;position:relative;overflow:hidden}
.cnp-root .card.them{background:var(--surface);opacity:.72}
.cnp-root .card.us{background:linear-gradient(180deg,rgba(110,20,35,.16),rgba(26,19,21,.4));border-color:var(--burg)}
.cnp-root .card .tag{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;margin-bottom:20px}
.cnp-root .card.them .tag{color:var(--text-dim)}.cnp-root .card.us .tag{color:var(--gold)}
.cnp-root .card ul{list-style:none;display:flex;flex-direction:column;gap:14px}
.cnp-root .card li{display:flex;gap:12px;align-items:flex-start;font-size:15px;line-height:1.45}
.cnp-root .card .ic{font-family:var(--mono);flex-shrink:0;margin-top:1px}
.cnp-root .card.them .ic{color:#7a4a4a}.cnp-root .card.us .ic{color:var(--gold)}
.cnp-root .card.them li{color:var(--text-dim)}

.cnp-root .voice-sec{border-top:1px solid var(--line)}
.cnp-root .voice{border:1px solid var(--line);border-left:2px solid var(--gold);border-radius:6px;background:linear-gradient(180deg,rgba(36,26,29,.5),rgba(26,19,21,.25));padding:26px 28px;max-width:820px}
.cnp-root .voice-by{display:flex;align-items:center;gap:9px;font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold);margin-bottom:14px}
.cnp-root .voice-dot{width:7px;height:7px;border-radius:50%;background:var(--gold)}
.cnp-root .voice-role{color:var(--text-dim)}
.cnp-root .voice-line{font-family:var(--display);font-size:22px;font-weight:500;line-height:1.4;color:var(--text);margin:0}
.cnp-root .voice-brief{font-size:14.5px;line-height:1.6;color:var(--text-dim);margin:14px 0 0}

.cnp-root .games{border-top:1px solid var(--line)}
.cnp-root .game-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin-top:44px}
.cnp-root .game{border:1px solid var(--line);border-radius:8px;overflow:hidden;position:relative;min-height:300px;display:flex;flex-direction:column;justify-content:flex-end;padding:28px;transition:.25s;cursor:pointer;isolation:isolate}
.cnp-root .game .art{position:absolute;inset:0;z-index:0;background-image:var(--img,var(--fallback));background-size:cover;background-position:center;transition:transform .5s ease}
.cnp-root .game{--fallback:linear-gradient(180deg,#1d1417,var(--surface))}
.cnp-root .game:hover .art{transform:scale(1.05)}
.cnp-root .game .scrim{position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(13,10,11,.15) 0%,rgba(13,10,11,.05) 45%,rgba(13,10,11,.6) 78%,rgba(13,10,11,.94) 100%)}
/* Stronger bottom band for warm/bright art (Wardogs) so the bottom meta + CTA
   stay legible over amber. Darkens the lower half; top stays clear. */
.cnp-root .game .scrim.scrim-strong{background:linear-gradient(180deg,rgba(13,10,11,.22) 0%,rgba(13,10,11,.12) 38%,rgba(13,10,11,.74) 72%,rgba(13,10,11,.98) 100%)}
.cnp-root .game:hover{transform:translateY(-4px);border-color:var(--burg-bright)}
.cnp-root .game>*:not(.art):not(.scrim){position:relative;z-index:2}
.cnp-root .game .status{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;position:absolute;top:24px;left:28px;z-index:2;display:inline-flex;align-items:center;gap:8px;background:rgba(13,10,11,.72);backdrop-filter:blur(6px);padding:7px 12px;border-radius:100px;border:1px solid var(--line);color:#c8ff2f}
.cnp-root .game .status.dmz-pill{color:var(--gold)}
.cnp-root .game .status.wardogs-pill{color:var(--gold)}
.cnp-root .game .status i{width:6px;height:6px;border-radius:50%;background:currentColor;box-shadow:0 0 8px currentColor}
.cnp-root .game .meta{font-size:13.5px;color:#d8cdc8;margin-bottom:14px;text-shadow:0 1px 14px rgba(0,0,0,.9);font-weight:500}
.cnp-root .game .go{font-family:var(--display);font-size:15px;font-weight:600;color:var(--gold);display:flex;align-items:center;gap:8px;text-shadow:0 1px 10px rgba(0,0,0,.8)}
.cnp-root .game:hover .go{gap:12px}

.cnp-root .pulse-sec{border-top:1px solid var(--line)}
.cnp-root .pulse-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:44px}
.cnp-root .pcol{border:1px solid var(--line);border-radius:8px;background:var(--surface);padding:20px}
.cnp-root .pcol-head{display:flex;align-items:center;gap:9px;padding-bottom:12px;border-bottom:1px solid var(--line);margin-bottom:14px}
.cnp-root .pcol-mark{width:8px;height:8px;border-radius:2px;background:var(--accent,var(--gold));flex-shrink:0}
.cnp-root .pcol-title{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--text-dim)}
.cnp-root .pcol-body{display:flex;flex-direction:column;gap:9px}
.cnp-root .prow{display:block;padding:12px 13px;background:var(--base);border:1px solid var(--line);border-left:2px solid transparent;border-radius:3px;transition:.15s}
.cnp-root .prow:hover{border-left-color:var(--accent,var(--gold));background:var(--surface-2)}
.cnp-root .prow-meta{display:flex;align-items:center;gap:8px;margin-bottom:6px;font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)}
.cnp-root .prow-when{margin-left:auto}
.cnp-root .prow-head{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:14px;font-weight:500;line-height:1.4;color:var(--text)}
.cnp-root .pcol-empty{font-family:var(--mono);font-size:12px;color:var(--text-dim)}
.cnp-root .pkeys{margin-top:14px;display:flex;flex-direction:column;gap:7px}
.cnp-root .pkeys-label{font-family:var(--mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim)}
.cnp-root .pkeys-row{display:flex;flex-wrap:wrap;gap:6px}
.cnp-root .pkey{font-family:var(--mono);font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:var(--text-dim);border:1px solid var(--line);border-radius:3px;padding:4px 9px;transition:.15s}
.cnp-root .pkey:hover{color:var(--text);border-color:var(--burg-bright)}

.cnp-root .deskfeed-sec{border-top:1px solid var(--line)}
.cnp-root .deskfeed{list-style:none;display:flex;flex-direction:column;gap:9px;margin-top:36px}
.cnp-root .deskfeed-row{display:block;padding:14px 16px;background:var(--surface);border:1px solid var(--line);border-left:2px solid var(--burg);border-radius:3px;transition:.15s}
.cnp-root .deskfeed-row:hover{border-left-color:var(--gold);background:var(--surface-2)}
.cnp-root .deskfeed-meta{display:flex;align-items:center;gap:9px;margin-bottom:6px;font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)}
.cnp-root .deskfeed-game{border:1px solid var(--line);border-radius:2px;padding:1px 7px}
.cnp-root .deskfeed-when{margin-left:auto}
.cnp-root .deskfeed-head{font-size:14.5px;font-weight:500;line-height:1.4;color:var(--text)}

.cnp-root .desk{border-top:1px solid var(--line)}
.cnp-root .desk-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:44px}
.cnp-root .op{display:grid;grid-template-columns:150px 1fr;border:1px solid var(--line);border-radius:8px;background:var(--surface);overflow:hidden;transition:.25s;color:inherit}
.cnp-root .op:hover{border-color:var(--op);transform:translateY(-3px)}
.cnp-root .op .photo{position:relative;background:linear-gradient(160deg,var(--surface-2),#120d0f);border-right:1px solid var(--line);display:flex;align-items:center;justify-content:center;min-height:150px}
.cnp-root .op .photo::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(13,10,11,.5));pointer-events:none;z-index:1}
/* Portrait fills the photo slot behind the scrim + cbar; the locked (BROKER) card
   does NOT grayscale it (only the badge is dimmed), so her face renders clear. */
.cnp-root .op .ph-photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:top;z-index:0}
.cnp-root .op .ph-badge{font-family:var(--display);font-weight:700;font-size:40px;color:var(--op);opacity:.85}
.cnp-root .op .ph-tag{position:absolute;bottom:10px;left:0;right:0;text-align:center;font-family:var(--mono);font-size:8.5px;letter-spacing:.14em;color:var(--text-dim);text-transform:uppercase}
.cnp-root .op .photo .cbar{position:absolute;top:0;left:0;width:100%;height:4px;background:var(--op);z-index:1}
.cnp-root .op .body{padding:22px 24px;position:relative}
.cnp-root .op .rank{position:absolute;top:20px;right:22px;font-family:var(--mono);font-size:9px;letter-spacing:.12em;padding:3px 8px;border-radius:3px;text-transform:uppercase;background:rgba(232,181,77,.12);color:var(--gold);border:1px solid rgba(232,181,77,.3)}
.cnp-root .op .code{font-family:var(--display);font-size:21px;font-weight:700;letter-spacing:.02em;color:var(--text);line-height:1}
.cnp-root .op .handle{font-family:var(--display);font-size:13px;font-weight:600;color:var(--op);margin:5px 0 2px;letter-spacing:.02em}
.cnp-root .op .name{font-family:var(--mono);font-size:11px;color:var(--text-dim);margin-bottom:14px}
.cnp-root .op .role{font-size:13.5px;color:var(--text-dim);line-height:1.5;margin-bottom:14px}
.cnp-root .op .beat{font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--text-dim);text-transform:uppercase;padding-top:12px;border-top:1px solid var(--line)}
.cnp-root .op .beat b{color:var(--text)}
.cnp-root .op.locked .photo{background:repeating-linear-gradient(45deg,#160f11,#160f11 8px,#1c1315 8px,#1c1315 16px)}
.cnp-root .op.locked .ph-badge{opacity:.14;filter:grayscale(1)}
.cnp-root .op.locked .code{color:var(--text-dim)}
.cnp-root .op.locked .redact{display:inline-block;background:var(--text-dim);color:transparent;border-radius:2px;user-select:none}
.cnp-root .op.locked .rank{background:rgba(255,32,56,.14);color:var(--red);border-color:rgba(255,32,56,.4)}
.cnp-root .op.locked .beat b{color:var(--gold)}
.cnp-root .classified-stamp{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-14deg);z-index:5;font-family:var(--display);font-weight:700;font-size:14px;letter-spacing:.18em;color:var(--red);border:2.5px solid var(--red);border-radius:4px;padding:5px 12px;text-transform:uppercase;background:rgba(13,10,11,.55);box-shadow:0 0 20px rgba(255,32,56,.3);white-space:nowrap;opacity:.92}
.cnp-root .portrait-note{margin-top:18px;font-family:var(--mono);font-size:11px;color:var(--burg-bright);letter-spacing:.04em}

.cnp-root .receipts{border-top:1px solid var(--line)}
.cnp-root .receipt-shell{margin-top:34px;border:1px solid var(--line);border-radius:6px;background:var(--surface);overflow:hidden;max-width:820px}
.cnp-root .receipt-head{display:flex;align-items:center;justify-content:space-between;padding:12px 18px;border-bottom:1px solid var(--line);font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim)}
.cnp-root .receipt-live{display:inline-flex;align-items:center;gap:7px;color:var(--gold)}
.cnp-root .receipt-live i{width:6px;height:6px;border-radius:50%;background:var(--gold);animation:cnpPulse 1.5s ease-in-out infinite}
.cnp-root .receipt-body{padding:18px;display:flex;flex-direction:column;gap:13px}
.cnp-root .receipt-line{display:flex;align-items:baseline;gap:14px;opacity:0;transform:translateY(4px);transition:opacity .4s ease,transform .4s ease}
.cnp-root .receipt-line.in{opacity:1;transform:none}
.cnp-root .receipt-lbl{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--text-dim);width:56px;flex-shrink:0}
.cnp-root .receipt-val{font-family:var(--mono);font-size:13px;line-height:1.5;color:var(--text-dim)}
.cnp-root .receipt-line.is-claim{margin-top:4px;padding-top:13px;border-top:1px solid var(--line)}
.cnp-root .receipt-line.is-claim .receipt-val{color:var(--text);font-size:14.5px}
.cnp-root .receipt-static-claim{font-size:15px;line-height:1.6;color:var(--text);margin:0 0 14px}
.cnp-root .receipt-link{display:inline-block;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);opacity:0;transform:translateY(4px);transition:opacity .45s ease,transform .45s ease}
.cnp-root .receipt-link.in{opacity:1;transform:none}
.cnp-root .receipt-link:hover{opacity:.75}

.cnp-root .how{border-top:1px solid var(--line)}
.cnp-root .how-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:44px}
.cnp-root .how-card{border:1px solid var(--line);border-radius:6px;padding:28px;background:var(--surface)}
.cnp-root .how-tag{font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin-bottom:14px}
.cnp-root .how-card p{color:var(--text-dim);font-size:14.5px;line-height:1.55}

.cnp-root .tools-sec{border-top:1px solid var(--line)}
.cnp-root .tools-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:44px}
.cnp-root .tool{display:flex;align-items:center;gap:12px;padding:16px 18px;background:var(--surface);border:1px solid var(--line);border-radius:5px;transition:.16s}
.cnp-root .tool:hover{border-color:var(--burg-bright);transform:translateY(-2px)}
.cnp-root .tool-text{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}
.cnp-root .tool-label{font-family:var(--display);font-size:14px;font-weight:600;color:var(--text)}
.cnp-root .tool-sub{font-family:var(--mono);font-size:10px;letter-spacing:.04em;color:var(--text-dim)}
.cnp-root .tool-arrow{color:var(--gold);flex-shrink:0}

.cnp-root .about-sec{border-top:1px solid var(--line)}
.cnp-root .about-body{font-size:15.5px;line-height:1.75;color:var(--text-dim);max-width:74ch;margin-top:22px}
.cnp-root .about-link{display:inline-block;margin-top:16px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.cnp-root .about-link:hover{opacity:.75}

.cnp-root .subscribe{border-top:1px solid var(--line);text-align:center}
.cnp-root .subscribe .inner{max-width:640px;margin:0 auto}
.cnp-root .countdown{display:inline-flex;align-items:center;gap:10px;font-family:var(--mono);font-size:12px;letter-spacing:.16em;color:var(--red);text-transform:uppercase;border:1px solid var(--burg);padding:8px 16px;border-radius:100px;margin-bottom:26px;background:rgba(110,20,35,.14)}
.cnp-root .countdown b{color:var(--text)}
.cnp-root .subscribe h2{margin:0 auto 18px}
/* Slot maps the shared NetworkSubscribeForm's tokens onto the cnp-root palette so its
   inline-styled inputs render in burgundy/gold instead of the network-page silver. */
.cnp-root .sub-form-slot{display:flex;justify-content:center;margin:30px auto 14px;max-width:480px;--bg-page:var(--surface);--border:var(--line);--text-primary:var(--text);--nr-vantage:var(--gold)}
.cnp-root .microcopy{font-size:12.5px;color:var(--text-dim);font-family:var(--mono);letter-spacing:.04em}

.cnp-root footer{border-top:1px solid var(--line);padding:48px 0 40px;position:relative;z-index:1}
.cnp-root .foot-in{display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:24px}
.cnp-root .foot-brand{align-items:flex-start}
.cnp-root .foot-brand img{width:34px;height:34px;border-radius:8px}
.cnp-root .foot-brand .wm{font-family:var(--display);font-weight:700;font-size:16px;letter-spacing:.05em}
.cnp-root .whisper{font-family:var(--mono);font-size:11px;color:var(--text-dim);letter-spacing:.1em;max-width:42ch;margin-top:12px;line-height:1.6}
.cnp-root .foot-links{display:flex;gap:22px;font-size:13px;color:var(--text-dim)}
.cnp-root .foot-links a:hover{color:var(--gold)}

.cnp-root :focus-visible{outline:2px solid var(--gold);outline-offset:3px;border-radius:2px}

@media(max-width:920px){.cnp-root .hero-grid{grid-template-columns:1fr;gap:8px}.cnp-root .scope{max-width:300px;order:-1;margin-bottom:24px}.cnp-root .desk-grid,.cnp-root .pulse-grid{grid-template-columns:1fr}}
@media(max-width:820px){.cnp-root .proof-grid,.cnp-root .game-grid,.cnp-root .how-grid{grid-template-columns:1fr}.cnp-root .tel-grid{grid-template-columns:1fr 1fr}.cnp-root .tel-cell:nth-child(2){border-right:none}.cnp-root .tel-cell:nth-child(1),.cnp-root .tel-cell:nth-child(2){border-bottom:1px solid var(--line)}.cnp-root .nav-links{display:none}.cnp-root .form{flex-direction:column}.cnp-root .wrap{padding:0 22px}.cnp-root section{padding:60px 0}}
@media(max-width:420px){.cnp-root .op{grid-template-columns:1fr}.cnp-root .op .photo{min-height:110px;border-right:none;border-bottom:1px solid var(--line)}}
`;
