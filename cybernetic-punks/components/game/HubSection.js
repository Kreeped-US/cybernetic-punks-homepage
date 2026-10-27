// components/game/HubSection.js
// A numbered hub section (Brief 192): an outlined section number (decorative, aria-hidden), the <h2>, a rule,
// an optional action link and an optional intro line. Game-agnostic: every word comes from the caller.
// Styles: components/game/hubKitCss.js (classes hk-sec*, hk-intro).
import Link from 'next/link';

export default function HubSection({ id, number, title, action, intro, children }) {
  var hid = id + '-h';
  return (
    <section id={id} className="hk-sec" aria-labelledby={hid}>
      <div className="hk-sech">
        {number ? <span className="hk-secn" aria-hidden="true">{number}</span> : null}
        <h2 id={hid}>{title}</h2>
        <span className="hk-rule" aria-hidden="true" />
        {action && action.href ? <Link className="hk-secact" href={action.href}>{action.label}</Link> : null}
      </div>
      {intro ? <p className="hk-intro">{intro}</p> : null}
      {children}
    </section>
  );
}
