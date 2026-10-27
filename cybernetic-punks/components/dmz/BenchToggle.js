'use client';
// components/dmz/BenchToggle.js
// The APEX toggle on the Gunsmith bench. Progressive enhancement: the bench and the Apex card read in full without
// JavaScript; this button only switches the bench's data-apex attribute (the bench CSS dims the blocked nodes and
// shows the Apex line). The button keeps its space but stays invisible until it can work, so nothing shifts.
// State: aria-pressed for screen readers; "#apex" in the URL hash via replaceState (no history entries); a
// "#apex" hash on load switches it on.
import { useEffect, useState } from 'react';

export default function BenchToggle({ rootId }) {
  var [on, setOn] = useState(false);
  var [ready, setReady] = useState(false);

  function apply(next, writeHash) {
    var root = document.getElementById(rootId);
    if (root) root.setAttribute('data-apex', next ? 'on' : 'off');
    setOn(next);
    if (writeHash) {
      var base = window.location.pathname + window.location.search;
      window.history.replaceState(window.history.state, '', next ? base + '#apex' : base);
    }
  }

  useEffect(function () {
    if (window.location.hash === '#apex') apply(true, false);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button type="button" className="wb-toggle" aria-pressed={on ? 'true' : 'false'} aria-controls={rootId}
      style={ready ? undefined : { visibility: 'hidden' }} onClick={function () { apply(!on, true); }}>
      {on ? 'Apex on' : 'Apex off'}
    </button>
  );
}
