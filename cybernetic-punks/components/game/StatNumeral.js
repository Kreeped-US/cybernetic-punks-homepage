// components/game/StatNumeral.js
// A large outlined numeral with its label (Brief 192). The number is real text (the outline is CSS). Renders
// nothing unless value is a positive whole number: a failed or empty read is omitted, never printed as 0.
// Game-agnostic; styles in components/game/hubKitCss.js.
export function isShownCount(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

export default function StatNumeral({ value, label, size, as }) {
  if (!isShownCount(value)) return null;
  var Tag = as || 'div';
  return (
    <Tag className="hk-stat">
      <span className="hk-num" style={{ fontSize: size || 60 }}>{value}</span>
      {label ? <span className="hk-numl">{label}</span> : null}
    </Tag>
  );
}
