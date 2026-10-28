// app/dmz/DmzComingSoon.js
// "Coming soon" shell for DATA-FED DMZ sections (3D Printer / FOB / Hajin
// Regions). These will later read their OWN entity tables (the Track-3 database
// work), NOT feed_items — so there is no query here yet. Server component,
// presentational. Brief 205: the message card only, in the hub kit's classes (hk-cut, hk-tag);
// app/dmz/[section]/page.js renders it under the shared page header. Built for DMZ; not extracted yet (D4).

import Link from 'next/link';

export default function DmzComingSoon({ section }) {
  return (
    <div className="hk-cut dmzs-msg">
      <span className="hk-tag">Coming soon</span>
      <p className="dmzs-msg-h">
        {section.label} is being built.
      </p>
      <p className="dmzs-msg-p">
          This is a structured-data tool that launches with the zone. It will be
          powered by its own dataset once DMZ goes live.
      </p>
      <Link href="/dmz" className="dmzs-back">
        ← All DMZ sections
      </Link>
    </div>
  );
}
