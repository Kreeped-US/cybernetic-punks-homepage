'use client';
// components/dmz/ArmoryTabs.js
// Class tabs for the /dmz/weapons armory panel. Progressive enhancement: the server HTML is a list of plain links
// (#<class slug>) to class sections that are all visible, so without JavaScript every class shows and a tab jumps
// to its section. With JavaScript a tab filters the panel instead: it sets data-filter on the panel root (the
// armory CSS hides the other sections), marks itself aria-current, and puts the class in the URL hash with
// replaceState (no history entries). A hash on load selects that class. "All" clears the filter and the hash.
import { useEffect, useState } from 'react';

export default function ArmoryTabs({ tabs, rootId }) {
  var [selected, setSelected] = useState('all');
  var slugs = (tabs || []).map(function (t) { return t.slug; });

  function apply(slug, writeHash) {
    var root = typeof document !== 'undefined' ? document.getElementById(rootId) : null;
    if (!root) return;
    root.setAttribute('data-filter', slug);
    setSelected(slug);
    if (writeHash) {
      var base = window.location.pathname + window.location.search;
      window.history.replaceState(window.history.state, '', slug === 'all' ? base : base + '#' + slug);
    }
  }

  useEffect(function () {
    function fromHash() {
      var h = window.location.hash.replace(/^#/, '');
      if (h && slugs.indexOf(h) !== -1) apply(h, false);
      else if (!h || h === rootId) apply('all', false);
    }
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return function () { window.removeEventListener('hashchange', fromHash); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  var all = [{ slug: 'all', label: 'All', count: (tabs || []).reduce(function (n, t) { return n + t.count; }, 0) }].concat(tabs || []);
  return (
    <ul className="wa-tabs" aria-label="Filter weapons by class">
      {all.map(function (t) {
        var current = selected === t.slug;
        return (
          <li key={t.slug}>
            <a className="wa-tab" href={'#' + (t.slug === 'all' ? rootId : t.slug)} aria-current={current ? 'true' : undefined}
              onClick={function (e) { e.preventDefault(); apply(t.slug, true); }}>
              {t.label}<small>{t.count}</small>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
