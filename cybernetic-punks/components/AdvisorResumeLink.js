'use client';
// components/AdvisorResumeLink.js
// A render-nothing-on-server client island that shows a prominent "Finish your ..." link for each
// pending anon draft in sessionStorage -- saved when a visitor clicked sign-in on a tool. Dropped on
// the OAuth landing pages (/ and /join/welcome) so a returning signed-in user can jump back to the
// tool with their inputs restored. Each tool restores + clears its own draft, so its link stops
// appearing once resumed.
//
// SSR-SAFE (freeze): renders null during server render (pending starts empty; sessionStorage is read
// only in the mount effect), so the host page's server HTML is byte-identical. No auto-redirect.
//
// Draft keys mirror the tools' own constants:
//   cnp_advisor_draft         <- app/marathon/advisor/AdvisorClient.js
//   cnp_wardogs_loadout_draft <- app/wardogs/loadouts/LoadoutsClient.js
// The Marathon link is FIRST + unchanged, so a session with only the advisor draft renders exactly
// what this component rendered before Wardogs was added.

import { useEffect, useState } from 'react';
import Link from 'next/link';

var DRAFTS = [
  { key: 'cnp_advisor_draft', href: '/marathon/advisor', label: 'Finish your Marathon build' },
  { key: 'cnp_wardogs_loadout_draft', href: '/wardogs/loadouts', label: 'Finish your Wardogs loadout' },
];

var LINK_STYLE = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
  background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.4)', borderRadius: 3,
  color: '#ff8800', fontSize: 13, fontWeight: 800, letterSpacing: 0.5, textDecoration: 'none',
  fontFamily: 'system-ui, sans-serif',
};

export default function AdvisorResumeLink() {
  var [pending, setPending] = useState([]);
  useEffect(function () {
    var out = [];
    for (var i = 0; i < DRAFTS.length; i++) {
      try { if (window.sessionStorage.getItem(DRAFTS[i].key)) out.push(DRAFTS[i]); } catch (e) { /* no storage -> no link */ }
    }
    setPending(out);
  }, []);
  if (!pending.length) return null;
  return (
    <>
      {pending.map(function (d) {
        return (
          <div key={d.key} style={{ display: 'flex', justifyContent: 'center', padding: '10px 16px' }}>
            <Link href={d.href} style={LINK_STYLE}>{d.label} &rarr;</Link>
          </div>
        );
      })}
    </>
  );
}
