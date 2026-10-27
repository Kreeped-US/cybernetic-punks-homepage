// components/game/CutCard.js
// A clipped-corner card (Brief 192). With href it is one link (Next Link); without, a plain block. corner
// 'tl' clips the top-left corner instead of the top-right. Game-agnostic; styles in components/game/hubKitCss.js.
import Link from 'next/link';

export default function CutCard({ href, corner, style, className, children, ...rest }) {
  var cls = 'hk-cut' + (corner === 'tl' ? ' hk-cutl' : '') + (className ? ' ' + className : '');
  if (href) return <Link href={href} className={cls} style={style} {...rest}>{children}</Link>;
  return <div className={cls} style={style} {...rest}>{children}</div>;
}
