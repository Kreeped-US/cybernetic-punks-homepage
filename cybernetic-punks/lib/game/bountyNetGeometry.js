// lib/game/bountyNetGeometry.js
// Pure geometry for the BOUNTY NET graphic (components/game/BountyNet.js) and its OG image. No React, no
// game data: the same numbers draw the intel ring on the page (React SVG) and in the OG card (an SVG
// string turned into a data URL), so the two can never disagree.

// Intel ring: one circle split into a confirmed arc and an unpublished arc.
export function intelRingArcs(confirmed, unpublished, r) {
  var total = Math.max(1, confirmed + unpublished);
  var c = 2 * Math.PI * r;
  var lit = c * (confirmed / total);
  return { circumference: c, lit: lit, dark: c - lit };
}

// The intel ring as a standalone SVG string (shapes only, no text: the OG renderer has no SVG fonts, so
// the counts are drawn as HTML next to it).
export function intelRingSvg(opts) {
  var size = opts.size || 220;
  var stroke = opts.stroke || 18;
  var r = (size - stroke) / 2 - 4;
  var cx = size / 2;
  var a = intelRingArcs(opts.confirmed, opts.unpublished, r);
  var lit = opts.litColor || '#4a9d5b';
  var dark = opts.unpublishedColor || '#ffb400';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<circle cx="' + cx + '" cy="' + cx + '" r="' + (r + stroke / 2 + 3) + '" fill="none" stroke="' + lit + '" stroke-opacity="0.25" stroke-width="2"/>' +
    '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + dark + '" stroke-opacity="0.55" stroke-width="' + stroke + '" stroke-dasharray="6 5"/>' +
    '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + lit + '" stroke-width="' + stroke + '" stroke-linecap="round" ' +
    'stroke-dasharray="' + a.lit.toFixed(2) + ' ' + a.circumference.toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>' +
    '</svg>';
}
