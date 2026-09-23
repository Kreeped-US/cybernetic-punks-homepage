'use client';
// components/AdvisorResumeLink.js
// A render-nothing-on-server client island that shows ONE prominent "Finish your Marathon build"
// link IFF an anonymous advisor draft is pending in sessionStorage (saved when the visitor clicked
// sign-in on /marathon/advisor). Dropped on the OAuth landing pages (/ and /join/welcome) so a
// returning signed-in user can jump back to the advisor with their inputs restored.
//
// SSR-SAFE (freeze): returns null during server render (show starts false; the sessionStorage read
// runs only in the mount effect), so the host page's server HTML is byte-identical. No auto-redirect
// -- a link only, so it never hijacks onboarding.
//
// The key mirrors ADVISOR_DRAFT_KEY in app/marathon/advisor/AdvisorClient.js; the advisor restores
// and clears the draft, so this link stops appearing once the build is resumed.

import { useEffect, useState } from 'react';
import Link from 'next/link';

var ADVISOR_DRAFT_KEY = 'cnp_advisor_draft';

export default function AdvisorResumeLink() {
  var [show, setShow] = useState(false);
  useEffect(function () {
    try { if (window.sessionStorage.getItem(ADVISOR_DRAFT_KEY)) setShow(true); } catch (e) { /* no storage -> no link */ }
  }, []);
  if (!show) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 16px' }}>
      <Link href="/marathon/advisor" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px',
        background: 'rgba(255,136,0,0.1)', border: '1px solid rgba(255,136,0,0.4)', borderRadius: 3,
        color: '#ff8800', fontSize: 13, fontWeight: 800, letterSpacing: 0.5, textDecoration: 'none',
        fontFamily: 'system-ui, sans-serif',
      }}>
        Finish your Marathon build &rarr;
      </Link>
    </div>
  );
}
