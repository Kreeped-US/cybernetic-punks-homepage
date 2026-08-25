'use client';
// components/network/EditorPortrait.js
// Renders an editor portrait <img> that degrades GRACEFULLY to `fallback` (the
// initial-letter badge) with NO broken-image icon, ever. Two fallback triggers:
//   1. src is null/empty (the caller passes null when editorHasPortrait is false) ->
//      render the badge immediately, no <img> at all.
//   2. the <img> fails to load at runtime (file missing / 404) -> onError swaps to
//      the badge. This is why it is a CLIENT component: server components have no
//      <img onError>, so a stamped-but-missing file would show a broken icon.
// The caller owns the img className/style (so each surface keeps its own layout) and
// supplies the exact `fallback` node (the surface's own badge markup), so a swap is
// visually identical to never having had a portrait.
import { useState } from 'react';

export default function EditorPortrait({ src, alt, imgClassName, imgStyle, fallback }) {
  var [failed, setFailed] = useState(false);
  if (!src || failed) return fallback;
  return (
    <img
      src={src}
      alt={alt}
      className={imgClassName}
      style={imgStyle}
      onError={function () { setFailed(true); }}
    />
  );
}
