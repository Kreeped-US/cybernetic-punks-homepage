'use client';
// app/dmz/bosses/DossierController.js
// Progressive enhancement for /dmz/bosses. Renders nothing. Every dossier is already a server-rendered
// <article id="..."> and every poster / tree node is a plain #hash link to it, so the page works without JS.
// With JS, activating a link opens that article in place as a modal dialog: role=dialog + aria-modal, focus
// moves to its Close button, Tab stays inside, Escape / Close / the backdrop closes it and focus returns to
// the link that opened it. The URL hash follows the open dossier (#colossus etc.); loading a hash opens it.

import { useEffect } from 'react';

var FOCUSABLE = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function DossierController() {
  useEffect(function () {
    var openEl = null;
    var trigger = null;
    var backdrop = document.querySelector('[data-dossier-backdrop]');

    function find(id) {
      var el = id ? document.getElementById(id) : null;
      return el && el.hasAttribute('data-dossier') ? el : null;
    }
    function open(id, from) {
      var el = find(id);
      if (!el) return false;
      if (openEl && openEl !== el) close(false);
      openEl = el;
      trigger = from || null;
      el.classList.add('bb-open');
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      if (backdrop) backdrop.classList.add('on');
      document.body.classList.add('bb-lock');
      var btn = el.querySelector('[data-dossier-close]');
      (btn || el).focus();
      if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
      return true;
    }
    function close(restore) {
      if (!openEl) return;
      openEl.classList.remove('bb-open');
      openEl.removeAttribute('role');
      openEl.removeAttribute('aria-modal');
      if (backdrop) backdrop.classList.remove('on');
      document.body.classList.remove('bb-lock');
      openEl = null;
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      if (restore !== false && trigger && trigger.focus) trigger.focus();
      trigger = null;
    }
    function onClick(e) {
      var t = e.target;
      var opener = t.closest && t.closest('[data-dossier-open]');
      if (opener) {
        if (open(opener.getAttribute('data-dossier-open'), opener)) e.preventDefault();
        return;
      }
      if (t.closest && t.closest('[data-dossier-close]')) { e.preventDefault(); close(); return; }
      if (backdrop && t === backdrop) close();
    }
    function onKey(e) {
      if (!openEl) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var items = Array.prototype.filter.call(openEl.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null; });
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    function onHash() {
      var id = location.hash.slice(1);
      if (id && find(id)) open(id, null);
      else if (!id) close(false);
    }

    document.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('hashchange', onHash);
    if (location.hash) onHash();
    return function () {
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('hashchange', onHash);
      close(false);
    };
  }, []);
  return null;
}
