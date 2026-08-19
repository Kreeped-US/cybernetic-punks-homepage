// components/dmz/DmzFrame.js
// Credited image frame for /dmz. SITE-FRAMED: bordered, visible chrome + a
// per-image credit caption -- NEVER full-bleed (Fable ruling). It always sits
// inside its parent's width; it never breaks out to the viewport edge.
//
// Ships EMPTY by default: with no `src` it renders a styled hatched PLACEHOLDER
// plus a small "image slot" label, so cleared assets can be dropped in later by
// passing `src` (+ `credit`). With a `src` it renders the <img> (loading="lazy",
// below-the-fold LCP-safe) and an "Image: <credit>" caption line.
//
// Server component -- static markup + a plain <img>, NO client JS (next/image is
// not used anywhere in this repo, so a plain <img> matches the codebase and needs
// no loader/domain config). Fits the /dmz SSR discipline.
//
// TOKEN DISCIPLINE: .dmz-theme tokens only (var(--border), var(--bg-card),
// var(--bg-nav), var(--text-*)); no hardcoded hex. DECORATIVE until real images
// land: the placeholder is aria-hidden and the <img> defaults to alt="" unless a
// meaningful alt is passed. HONESTY: do not pass a `credit` source that is not
// actually cleared.

var MONO = 'monospace';

// Shared caption-bar chrome (the "Image: <credit>" line under the frame).
var captionBar = {
  borderTop: '1px solid var(--border)',
  padding: '6px 12px',
  fontFamily: MONO,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: 1,
  color: 'var(--text-tertiary)',
  textTransform: 'uppercase',
};

var outer = {
  border: '1px solid var(--border)',
  borderRadius: 8,
  background: 'var(--bg-card)',
  overflow: 'hidden',
};

export default function DmzFrame({ src, alt, credit, height, label }) {
  var h = height || 200;

  // Populated: real image + credit caption. loading="lazy" (frames are below fold).
  if (src) {
    return (
      <figure style={{ ...outer, margin: 0 }}>
        <img
          src={src}
          alt={alt || ''}
          loading="lazy"
          style={{ display: 'block', width: '100%', height: h, objectFit: 'cover' }}
        />
        {credit ? <figcaption style={captionBar}>Image: {credit}</figcaption> : null}
      </figure>
    );
  }

  // Empty: hatched placeholder + slot label, plus the (stubbed) credit-caption line
  // so the framed-and-credited pattern is visible before a real asset lands.
  var hatch = {
    height: h,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'var(--bg-nav)',
    backgroundImage: 'repeating-linear-gradient(45deg, var(--border) 0, var(--border) 1px, transparent 1px, transparent 11px)',
  };

  return (
    <div style={outer} aria-hidden="true">
      <div style={hatch}>
        <span
          style={{
            fontFamily: MONO,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'var(--text-tertiary)',
            border: '1px dashed var(--border)',
            borderRadius: 4,
            padding: '5px 12px',
            background: 'var(--bg-card)',
          }}
        >
          {label || 'Image slot'}
        </span>
      </div>
      <div style={captionBar}>Image: credit on placement</div>
    </div>
  );
}
