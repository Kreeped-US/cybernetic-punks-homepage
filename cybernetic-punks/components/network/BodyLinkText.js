// components/network/BodyLinkText.js
// Renders a run of article-body text with its markdown links [label](target) as links (Brief 243;
// segments from lib/content/markdownLinks.js). Internal paths use next/link in the same tab; https
// links open in a new tab with rel="noopener noreferrer". The label is plain text inside the anchor:
// it never reaches renderText, so no item card, POI link or source link can nest inside it.
// `renderText` (optional) renders the remaining text runs (the route's linkers, cards or Sources-line
// links); `className` / `style` carry the route's existing in-body link style. Server-safe, no state.
//
// BODY_LINK_CSS is the focus ring (2px solid outline in the link colour, offset 2px, as SOURCE_LINK_CSS).
// A <style> cannot sit inside a <p>, so the route emits it once, only when the body has a markdown link.
import Link from 'next/link';
import { Fragment } from 'react';
import { splitMarkdownLinks } from '@/lib/content/markdownLinks';

export var BODY_LINK_CSS = '.body-link:focus-visible{outline:2px solid currentColor;outline-offset:2px}';

export function BodyLink({ seg, className, style }) {
  var cls = className ? 'body-link ' + className : 'body-link';
  if (seg.internal) return <Link href={seg.href} className={cls} style={style}>{seg.label}</Link>;
  return <a href={seg.href} target="_blank" rel="noopener noreferrer" className={cls} style={style}>{seg.label}</a>;
}

export default function BodyLinkText({ text, className, style, renderText }) {
  return (
    <>
      {splitMarkdownLinks(text).map(function (seg, i) {
        if (seg.type === 'link') return <BodyLink key={i} seg={seg} className={className} style={style} />;
        return <Fragment key={i}>{renderText ? renderText(seg.text) : seg.text}</Fragment>;
      })}
    </>
  );
}
