// components/network/SourceLinkText.js
// Renders one fragment of an article's "Sources:" / "Source:" line with its URLs as links (Brief 232;
// segments from lib/content/sourceLinks.js). Link text is the hostname, the href is the URL as written
// in the body. Opens in a new tab with rel="noopener noreferrer", the convention of DiscourseArticle's
// body links. `className` / `style` carry the calling route's existing link style. Server-safe, no state.
//
// SOURCE_LINK_CSS is the focus ring (the site's 2px solid outline, offset 2px, in the link colour). A
// <style> cannot sit inside a <p>, so the route emits it once, outside the body paragraphs.
import { Fragment } from 'react';
import { linkSourceUrls } from '@/lib/content/sourceLinks';

export var SOURCE_LINK_CSS = '.src-link:focus-visible{outline:2px solid currentColor;outline-offset:2px}';

export default function SourceLinkText({ text, className, style }) {
  return (
    <>
      {linkSourceUrls(text).map(function (seg, i) {
        if (seg.type !== 'link') return <Fragment key={i}>{seg.text}</Fragment>;
        return (
          <a key={i} href={seg.href} target="_blank" rel="noopener noreferrer" className={className ? 'src-link ' + className : 'src-link'} style={style}>
            {seg.text}
          </a>
        );
      })}
    </>
  );
}
