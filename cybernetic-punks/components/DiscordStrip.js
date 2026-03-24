'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function DiscordStrip() {
  var [hovered, setHovered] = useState(false);

  return (
    <div style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: '0 24px 0',
    }}>
      <Link
        href="https://discord.gg/PnhbdRYh3w"
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: 'none', display: 'block' }}
        onMouseEnter={function() { setHovered(true); }}
        onMouseLeave={function() { setHovered(false); }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '14px 22px',
          background: hovered ? 'rgba(88,101,242,0.12)' : 'rgba(88,101,242,0.06)',
          border: '1px solid ' + (hovered ? 'rgba(88,101,242,0.45)' : 'rgba(88,101,242,0.2)'),
          borderRadius: 8,
          transition: 'all 0.2s',
          flexWrap: 'wrap',
        }}>
          {/* Left — icon + message */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Discord icon */}
            <svg width="22" height="17" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, opacity: 0.9 }}>
              <path d="M11.854 0.927C10.956 0.505 9.994 0.198 8.99 0.022C8.861 0.256 8.711 0.57 8.607 0.819C7.534 0.655 6.47 0.655 5.414 0.819C5.31 0.57 5.157 0.256 5.027 0.022C4.022 0.198 3.059 0.506 2.161 0.929C0.311 3.641 -0.19 6.285 0.06 8.893C1.27 9.789 2.442 10.336 3.595 10.696C3.887 10.3 4.147 9.879 4.371 9.436C3.947 9.276 3.541 9.078 3.158 8.845C3.261 8.769 3.362 8.69 3.461 8.609C5.742 9.672 8.266 9.672 10.52 8.609C10.62 8.691 10.721 8.77 10.823 8.845C10.439 9.079 10.031 9.278 9.606 9.437C9.83 9.879 10.089 10.302 10.382 10.697C11.536 10.337 12.709 9.79 13.919 8.893C14.213 5.87 13.419 3.25 11.854 0.927ZM4.676 7.279C3.983 7.279 3.413 6.639 3.413 5.854C3.413 5.069 3.971 4.428 4.676 4.428C5.381 4.428 5.952 5.068 5.939 5.854C5.94 6.639 5.38 7.279 4.676 7.279ZM9.297 7.279C8.604 7.279 8.034 6.639 8.034 5.854C8.034 5.069 8.592 4.428 9.297 4.428C10.002 4.428 10.573 5.068 10.56 5.854C10.56 6.639 10.001 7.279 9.297 7.279Z" fill="#7289da"/>
            </svg>

            <div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: '#7289da', letterSpacing: 1, marginBottom: 2 }}>
                JOIN THE CYBERNETICPUNKS DISCORD
              </div>
              <div style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>
                LIVE INTEL DROPS · META DISCUSSION · PATCH ALERTS · BUILD REVIEWS
              </div>
            </div>
          </div>

          {/* Right — CTA */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            background: hovered ? 'rgba(88,101,242,0.3)' : 'rgba(88,101,242,0.15)',
            border: '1px solid rgba(88,101,242,0.4)',
            borderRadius: 5,
            transition: 'background 0.2s',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 10, color: '#7289da', letterSpacing: 2, whiteSpace: 'nowrap' }}>
              JOIN SERVER →
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}
