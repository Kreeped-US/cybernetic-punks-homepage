'use client';
// app/dmz/DmzShare.js
// Interactive share controls for the DMZ article detail page (isolated client
// island so the page itself stays a server component).
//
// mode='row' -> compact icon buttons under the byline (X, Reddit, copy-link).
// mode='cta' -> the bottom call-to-action block (forest-filled copy-link primary
//               + a share-on-X button), with the launch-date line.
//
// X + Reddit are REAL web share-intent URLs. Copy-link uses the Clipboard API and
// swaps to a checkmark for ~2s. Discord is intentionally OMITTED: it has no
// universal web share-intent, and a Discord-labeled button that silently only
// copies would mislead (the build rule is: no faked, non-functional buttons).
// All URLs use the actual canonical page URL + the actual headline (props).

import { useState } from 'react';

function intentX(url, title) {
  return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(title) + '&url=' + encodeURIComponent(url);
}
function intentReddit(url, title) {
  return 'https://www.reddit.com/submit?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title);
}

function IconX() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932 6.064-6.933ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}
function IconReddit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .415-.267l2.91.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.232.095.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}
function IconLink() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

var pillBase = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)',
  borderRadius: 4, cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit',
};

export default function DmzShare({ url, title, mode }) {
  var [copied, setCopied] = useState(false);

  function copy() {
    try {
      if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(function () {
          setCopied(true);
          setTimeout(function () { setCopied(false); }, 2000);
        }).catch(function () { /* clipboard blocked -- no-op, link stays selectable */ });
      }
    } catch (e) { /* no-op */ }
  }

  if (mode === 'cta') {
    return (
      <div style={{
        marginTop: 40, padding: '22px 22px 24px', borderRadius: 6,
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderTop: '2px solid var(--green)',
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: 'var(--font-exo2), system-ui, sans-serif' }}>
          DMZ launches Oct 23, 2026.
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Found this useful? Share it.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy link to this article"
            style={Object.assign({}, pillBase, {
              padding: '10px 18px', fontSize: 12, fontWeight: 700, letterSpacing: 0.5,
              background: 'var(--green)', border: '1px solid var(--green)', color: '#06140a',
            })}
          >
            {copied ? <IconCheck /> : <IconLink />}
            {copied ? 'Link copied' : 'Copy link'}
          </button>
          <a
            href={intentX(url, title)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on X"
            style={Object.assign({}, pillBase, { padding: '10px 16px', fontSize: 12, fontWeight: 700 })}
          >
            <IconX />
            Share on X
          </a>
        </div>
      </div>
    );
  }

  // mode === 'row' -- compact icon buttons
  var iconBtn = Object.assign({}, pillBase, { width: 34, height: 34, padding: 0 });
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <a href={intentX(url, title)} target="_blank" rel="noopener noreferrer" title="Share on X" aria-label="Share on X" style={iconBtn}>
        <IconX />
      </a>
      <a href={intentReddit(url, title)} target="_blank" rel="noopener noreferrer" title="Share on Reddit" aria-label="Share on Reddit" style={iconBtn}>
        <IconReddit />
      </a>
      <button
        type="button"
        onClick={copy}
        title={copied ? 'Link copied' : 'Copy link'}
        aria-label={copied ? 'Link copied' : 'Copy link'}
        style={Object.assign({}, iconBtn, copied ? { color: 'var(--green)', borderColor: 'var(--green)' } : null)}
      >
        {copied ? <IconCheck /> : <IconLink />}
      </button>
    </div>
  );
}
