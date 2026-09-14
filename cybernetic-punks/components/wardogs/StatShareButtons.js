'use client';

// components/wardogs/StatShareButtons.js
// Per-stat share buttons -- the lowest-friction spread. X (pre-filled honest text + link + @handle)
// and Copy (text + link). Every share carries the brand back: the CNP handle + the economy-hub URL.
// The pre-written text keeps "(modeled)" so the viral format stays honest.

import { useState } from 'react';

const HANDLE = 'Cybernetic87250';
const BASE = 'https://cyberneticpunks.com';

export default function StatShareButtons({ shareText, statKey, size = 'sm' }) {
  const [copied, setCopied] = useState(false);
  // Sharing the per-stat URL makes the link unfurl with THAT stat's OG card.
  const url = BASE + '/wardogs/economy' + (statKey ? '/stat/' + statKey : '');

  const xHref = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText) + '&url=' + encodeURIComponent(url) + '&via=' + HANDLE;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareText + ' ' + url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) { /* clipboard blocked -- the X button still works */ }
  };

  const A = 'var(--accent, #e0a13a)';
  const btn = {
    display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer',
    fontFamily: 'monospace', fontSize: size === 'lg' ? 12 : 10.5, fontWeight: 800, letterSpacing: 0.5,
    padding: size === 'lg' ? '8px 14px' : '5px 10px', borderRadius: 4, textDecoration: 'none',
    border: '1px solid #262b33', background: '#12151b', color: 'var(--text-secondary,#b5bcc6)',
  };

  return (
    <div style={{ display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
      <a href={xHref} target="_blank" rel="noopener noreferrer" style={{ ...btn, borderColor: 'rgba(224,161,58,0.4)', color: A }} aria-label="Share on X">
        𝕏 Share
      </a>
      <button type="button" onClick={copy} style={{ ...btn, font: 'inherit', fontFamily: 'monospace', fontSize: size === 'lg' ? 12 : 10.5, fontWeight: 800 }} aria-label="Copy share text">
        {copied ? '✓ Copied' : '⧉ Copy'}
      </button>
    </div>
  );
}
