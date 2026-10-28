// app/dmz/DmzEmptyState.js
// Empty-state for EDITOR-FED DMZ sections (feed_items WHERE game_slug='dmz') with zero eligible articles
// (today /dmz/meta and /dmz/discourse). Launch-neutral copy: it states only that nothing is published yet.
// Server component, presentational. Brief 205: the message card only, in the hub kit's classes (hk-cut, hk-tag);
// app/dmz/[section]/page.js renders it inside the kit wrapper, under the shared page header (eyebrow and H1).
// Built for DMZ; not extracted to a shared layer yet (GAME_TEMPLATE.md D4).

import Link from 'next/link';

export default function DmzEmptyState({ section }) {
  return (
    <div className="hk-cut dmzs-msg">
      <span className="hk-tag">Live feed</span>
      <p className="dmzs-msg-h">
        No {section.label} reports yet.
      </p>
      <p className="dmzs-msg-p">
        This feed fills automatically as DMZ {section.label} reports are published.
      </p>
      <Link href="/dmz" className="dmzs-back">
        ← All DMZ sections
      </Link>
    </div>
  );
}
