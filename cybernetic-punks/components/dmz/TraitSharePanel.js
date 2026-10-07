'use client';
// components/dmz/TraitSharePanel.js
// Share panel for the DMZ trait planner (rendered by components/dmz/TraitPlanner.js, so only when
// the planner renders). Link and text are built from encodeBuild(state) and the page URL the SERVER
// passes in (shareUrl) -- the client never reads the browser location for the origin, so preview hosts
// can never leak into a shared link.
//
// Copy link / Copy text write to the clipboard inside the click handler; if that is blocked the
// matching read-only field is selected and a hint says how to copy it by hand. Post on X and Share on
// Reddit are plain links (new tab, rel noopener noreferrer). The build code box is read-only; a
// separate field loads a pasted code as ONE undoable change (onLoad) without rewriting the URL.
// A loaded code is decoded against the verified-node map, so unknown or unverified picks are dropped.

import { useRef, useState } from 'react';
import { decodeBuild, encodeBuild } from '@/lib/dmz/traitBuild';
import { acceptShareCode, shareLink, shareText } from '@/lib/dmz/traitShare';

var COPY_HINT = 'Copy blocked by the browser: the text is selected, press Ctrl+C (Cmd+C on Mac).';

function intentX(text) {
  return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
}
function intentReddit(url, title) {
  return 'https://www.reddit.com/submit?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title);
}

export default function TraitSharePanel({ shareUrl, state, nodes, onLoad }) {
  var [msg, setMsg] = useState('');
  var [paste, setPaste] = useState('');
  var linkRef = useRef(null);
  var textRef = useRef(null);

  var code = encodeBuild(state);
  var link = shareLink(shareUrl, state);
  var text = shareText(state, nodes, link);
  var title = text.slice(0, text.indexOf(' Work in progress:'));

  function copy(value, ref, done) {
    function fallback() {
      if (ref.current) { ref.current.focus(); ref.current.select(); }
      setMsg(COPY_HINT);
    }
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () { setMsg(done); }, fallback);
      } else {
        fallback();
      }
    } catch (e) {
      fallback();
    }
  }

  function load() {
    var raw = paste.trim();
    // Same limits as a shared link (length, pattern, version).
    var all = acceptShareCode(raw) ? decodeBuild(raw) : null;
    var kept = decodeBuild(raw, nodes);
    if (!all || !kept) { setMsg('That build code is not valid for this planner.'); return; }
    var count = function (s) { return s.operators.reduce(function (n, o) { return n + o.picks.length; }, 0); };
    var dropped = count(all) - count(kept);
    onLoad(kept);
    setPaste('');
    setMsg(dropped ? 'Build loaded. ' + dropped + ' picks were dropped (not verified or no longer listed).' : 'Build loaded.');
  }

  var field = { width: '100%', boxSizing: 'border-box', background: 'var(--bg-page)', color: '#fff', border: '1px solid var(--border)', borderRadius: 2, padding: '6px 8px', fontSize: 12, fontFamily: 'monospace' };
  var linkBtn = { display: 'inline-block', textDecoration: 'none' };

  return (
    <div className="tp-card tp-share" style={{ marginTop: 12 }}>
      <div className="tp-kicker" style={{ marginBottom: 8 }}>Share this plan</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        <button type="button" className="tp-btn" onClick={function () { copy(link, linkRef, 'Link copied.'); }}>Copy link</button>
        <button type="button" className="tp-btn" onClick={function () { copy(text, textRef, 'Text copied.'); }}>Copy text</button>
        <a className="tp-btn" style={linkBtn} href={intentX(text)} target="_blank" rel="noopener noreferrer">Post on X</a>
        <a className="tp-btn" style={linkBtn} href={intentReddit(link, title)} target="_blank" rel="noopener noreferrer">Share on Reddit</a>
      </div>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }} htmlFor="tp-share-link">Link</label>
      <input id="tp-share-link" ref={linkRef} readOnly value={link} style={Object.assign({}, field, { marginBottom: 8 })} />
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }} htmlFor="tp-share-text">Text</label>
      <textarea id="tp-share-text" ref={textRef} readOnly value={text} rows={2} style={Object.assign({}, field, { marginBottom: 8, resize: 'vertical' })} />
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }} htmlFor="tp-share-code">Build code</label>
      <input id="tp-share-code" readOnly value={code} style={Object.assign({}, field, { marginBottom: 8 })} />
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }} htmlFor="tp-share-load">Load a build code</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input id="tp-share-load" value={paste} placeholder="Paste a build code" onChange={function (e) { setPaste(e.target.value); }} style={field} />
        <button type="button" className="tp-btn" disabled={!paste.trim()} onClick={load}>Load</button>
      </div>
      <div aria-live="polite" style={{ minHeight: 18, marginTop: 8, fontSize: 12, color: 'var(--text-secondary)' }}>{msg}</div>
    </div>
  );
}
