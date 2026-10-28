// components/game/HubPageHeader.js
// Page header for pages built on the hub kit (Brief 205): the hub hero's look (gridded ground, accent edge bar, mono
// eyebrow, large title) without its content. Order: eyebrow, optional `top` (e.g. a section image), title; `intro`, `stat`
// ({ value, label }, shown as a StatNumeral only when it is a positive count) and children (e.g. related links).
// Also exports HUB_PAGE_CSS: the header rules plus .hk-pw, the page container under the header (1160px, as the hub).
// Game-agnostic: every word comes from the caller; colors come from the --hk-* custom properties.
import CutCard from './CutCard';
import StatNumeral, { isShownCount } from './StatNumeral';

export var HUB_PAGE_CSS = `
.hk-ph{position:relative;overflow:hidden;border-bottom:1px solid var(--hk-line,#2a323b);background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 44px),repeating-linear-gradient(90deg,rgba(255,255,255,.025) 0 1px,transparent 1px 44px),var(--hk-ground,#0b0d10)}
.hk-ph-edge{position:absolute;left:0;top:0;bottom:0;width:6px;background:var(--hk-accent,#ff6a1f)}
.hk-ph-in{position:relative;max-width:1160px;margin:0 auto;padding:36px 16px 36px}
.hk-ph-top{margin:0 0 24px}
.hk-ph-row{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-end;justify-content:space-between}
.hk-ph-main{flex:1 1 480px;min-width:0}
.hk-ph-eyebrow{margin:0 0 10px;font-size:12px;font-weight:700;color:var(--hk-accent-text,#ffb48a)}
.hk-ph-eyebrow a{color:inherit;text-decoration:none;display:inline-flex;align-items:center;min-height:44px}
.hk-ph-title{margin:0 0 12px;font-size:clamp(36px,7vw,60px);line-height:1.02;font-weight:900;letter-spacing:-.01em;color:var(--hk-text,#e8eaed);overflow-wrap:anywhere}
.hk-ph-title.hk-ph-title-c{font-size:clamp(28px,4.6vw,46px);line-height:1.1;max-width:30ch}
.hk-ph-intro{margin:0;font-size:16px;line-height:1.6;color:var(--hk-soft,#b4bcc6);max-width:640px}
.hk-ph-stat{flex:0 0 auto;padding:18px 24px}
.hk-pw{max-width:1160px;margin:0 auto;padding:32px 16px 96px}
`;

// `compact`: a smaller title size for long titles (article headlines), a notch below the section titles.
export default function HubPageHeader({ eyebrow, title, intro, stat, top, compact, children }) {
  var showStat = stat && isShownCount(stat.value);
  return (
    <header className="hk-ph">
      <div className="hk-ph-edge" aria-hidden="true" />
      <div className="hk-ph-in">
        {eyebrow ? <div className="hk-ph-eyebrow hk-mono">{eyebrow}</div> : null}
        {top ? <div className="hk-ph-top">{top}</div> : null}
        <div className="hk-ph-row">
          <div className="hk-ph-main">
            <h1 className={compact ? 'hk-ph-title hk-ph-title-c' : 'hk-ph-title'}>{title}</h1>
            {intro ? <p className="hk-ph-intro">{intro}</p> : null}
            {children}
          </div>
          {showStat ? (
            <CutCard corner="tl" className="hk-ph-stat">
              <StatNumeral value={stat.value} label={stat.label} size={64} />
            </CutCard>
          ) : null}
        </div>
      </div>
    </header>
  );
}
