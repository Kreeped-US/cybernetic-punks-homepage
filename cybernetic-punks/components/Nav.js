'use client';
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';

var NAV_ITEMS = [
  { label: 'HOME', href: '/' },
  { label: 'SHELLS', href: '/shells' },
  {
    label: 'INTEL',
    children: [
      { label: 'ALL INTEL', href: '/intel', desc: 'Every article, every editor' },
      { label: 'CIPHER', href: '/intel/cipher', desc: 'Play analysis & grades', color: '#ff0000' },
      { label: 'NEXUS', href: '/intel/nexus', desc: 'Meta tracking & strategy', color: '#00f5ff' },
      { label: 'DEXTER', href: '/intel/dexter', desc: 'Build analysis & loadouts', color: '#ff8800' },
      { label: 'GHOST', href: '/intel/ghost', desc: 'Community pulse & sentiment', color: '#00ff88' },
      { label: 'SITREP', href: '/sitrep', desc: 'Daily meta situation report', color: '#00f5ff' },
    ],
  },
  {
    label: 'TOOLS',
    children: [
      { label: 'META TIER LIST', href: '/meta', desc: "What's winning right now" },
      { label: 'BUILD LAB', href: '/builds', desc: 'Shell builds & weapon tiers' },
      { label: 'BUILD ADVISOR', href: '/advisor', desc: 'AI-engineered loadouts by DEXTER', color: '#ff8800' },
      { label: 'RANKED GUIDE', href: '/ranked', desc: 'Holotags, tiers & how to climb', color: '#ffd700' },
      { label: 'FIELD GUIDES', href: '/guides', desc: 'Shell breakdowns & strategy', color: '#9b5de5' },
      { label: 'SERVER STATUS', href: '/status', desc: 'Is Marathon down?' },
      { label: 'PERSONAL COACH ✦', href: '/join', desc: 'AI loadout audit — closed beta', color: '#00f5ff', beta: true },
    ],
  },
  {
    label: 'COMMUNITY',
    children: [
      { label: 'AI EDITORS', href: '/editors', desc: 'Meet the five editors' },
      { label: 'DISCORD', href: 'https://discord.gg/PnhbdRYh3w', desc: 'Join the community', external: true },
      { label: 'X / TWITTER', href: 'https://x.com/Cybernetic87250', desc: 'Follow for updates', external: true },
    ],
  },
];

function DropdownItem({ item, onClick }) {
  return (
    <Link
      href={item.href}
      target={item.external ? '_blank' : undefined}
      rel={item.external ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        padding: '10px 16px',
        textDecoration: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        transition: 'background 0.15s',
        background: item.beta ? 'rgba(0,245,255,0.02)' : 'transparent',
      }}
      onMouseEnter={function(e) { e.currentTarget.style.background = item.beta ? 'rgba(0,245,255,0.05)' : 'rgba(255,255,255,0.04)'; }}
      onMouseLeave={function(e) { e.currentTarget.style.background = item.beta ? 'rgba(0,245,255,0.02)' : 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          fontFamily: 'Share Tech Mono, monospace',
          fontSize: 12,
          letterSpacing: 1,
          color: item.color || '#ffffff',
        }}>
          {item.label} {item.external ? 'ext' : ''}
        </span>
        {item.beta && (
          <span style={{
            fontFamily: 'Share Tech Mono, monospace',
            fontSize: 7,
            color: '#00f5ff',
            background: 'rgba(0,245,255,0.1)',
            border: '1px solid rgba(0,245,255,0.25)',
            borderRadius: 3,
            padding: '1px 5px',
            letterSpacing: 1,
          }}>BETA</span>
        )}
      </div>
      {item.desc && (
        <span style={{
          fontFamily: 'Rajdhani, sans-serif',
          fontSize: 11,
          color: 'rgba(255,255,255,0.25)',
          lineHeight: 1.3,
        }}>
          {item.desc}
        </span>
      )}
    </Link>
  );
}

function DesktopDropdown({ item }) {
  var [open, setOpen] = useState(false);
  var timeout = useRef(null);

  function handleEnter() {
    if (timeout.current) clearTimeout(timeout.current);
    setOpen(true);
  }

  function handleLeave() {
    timeout.current = setTimeout(function() { setOpen(false); }, 150);
  }

  if (!item.children) {
    return (
      <Link href={item.href} style={{
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 13,
        letterSpacing: 1,
        color: 'rgba(255,255,255,0.6)',
        textDecoration: 'none',
        transition: 'color 0.2s',
        padding: '8px 0',
      }}
        onMouseEnter={function(e) { e.target.style.color = '#00f5ff'; }}
        onMouseLeave={function(e) { e.target.style.color = 'rgba(255,255,255,0.6)'; }}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <div
      style={{ position: 'relative' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button style={{
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 13,
        letterSpacing: 1,
        color: open ? '#00f5ff' : 'rgba(255,255,255,0.6)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '8px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'color 0.2s',
      }}>
        {item.label}
        <span style={{
          fontSize: 8,
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          v
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          marginTop: '8px',
          minWidth: '220px',
          background: 'rgba(8,8,8,0.98)',
          border: '1px solid rgba(0,245,255,0.12)',
          borderRadius: '8px',
          padding: '6px 0',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          zIndex: 200,
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(0,245,255,0.3), transparent)',
          }} />
          {item.children.map(function(child) {
            return <DropdownItem key={child.label} item={child} onClick={function() { setOpen(false); }} />;
          })}
        </div>
      )}
    </div>
  );
}

export default function Nav() {
  var [mobileOpen, setMobileOpen] = useState(false);
  var [mobileExpanded, setMobileExpanded] = useState(null);
  var [scrolled, setScrolled] = useState(false);

  useEffect(function() {
    var h = function() { setScrolled(window.scrollY > 40); };
    window.addEventListener('scroll', h);
    return function() { window.removeEventListener('scroll', h); };
  }, []);

  function toggleMobileSection(label) {
    if (mobileExpanded === label) {
      setMobileExpanded(null);
    } else {
      setMobileExpanded(label);
    }
  }

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      height: 64,
      background: scrolled ? 'rgba(2,2,2,0.95)' : 'rgba(2,2,2,0.7)',
      borderBottom: scrolled ? '1px solid rgba(0,245,255,0.15)' : '1px solid transparent',
      backdropFilter: 'blur(20px)',
      transition: 'all 0.3s ease',
      padding: '0 24px',
    }}>
      <div style={{
        maxWidth: 1200,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <div style={{
            width: 10,
            height: 10,
            background: '#ff0000',
            borderRadius: '50%',
            boxShadow: '0 0 12px #ff0000, 0 0 24px rgba(255,0,0,0.3)',
            animation: 'pulse-glow 3s ease-in-out infinite',
            flexShrink: 0,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <span style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 3,
              lineHeight: 1,
            }}>
              CYBERNETIC<span style={{ color: '#ff0000' }}>PUNKS</span>
            </span>
            <span style={{
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 10,
              color: 'rgba(0,245,255,0.7)',
              letterSpacing: 2,
              lineHeight: 1,
              textAlign: 'center',
            }} className="hidden md:block">
              MARATHON INTELLIGENCE HUB
            </span>
          </div>
        </Link>

        <div className="hidden md:flex" style={{ gap: 24, alignItems: 'center' }}>
          {NAV_ITEMS.map(function(item) {
            return <DesktopDropdown key={item.label} item={item} />;
          })}
          <Link
            href="https://discord.gg/PnhbdRYh3w"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 14px',
              background: 'rgba(88,101,242,0.15)',
              border: '1px solid rgba(88,101,242,0.4)',
              borderRadius: 6,
              textDecoration: 'none',
              fontFamily: 'Share Tech Mono, monospace',
              fontSize: 11,
              color: '#7289da',
              letterSpacing: 1,
              transition: 'background 0.2s, border-color 0.2s',
              flexShrink: 0,
            }}
            onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(88,101,242,0.25)'; e.currentTarget.style.borderColor = 'rgba(88,101,242,0.7)'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = 'rgba(88,101,242,0.15)'; e.currentTarget.style.borderColor = 'rgba(88,101,242,0.4)'; }}
          >
            <svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.854 0.927C10.956 0.505 9.994 0.198 8.99 0.022C8.861 0.256 8.711 0.57 8.607 0.819C7.534 0.655 6.47 0.655 5.414 0.819C5.31 0.57 5.157 0.256 5.027 0.022C4.022 0.198 3.059 0.506 2.161 0.929C0.311 3.641 -0.19 6.285 0.06 8.893C1.27 9.789 2.442 10.336 3.595 10.696C3.887 10.3 4.147 9.879 4.371 9.436C3.947 9.276 3.541 9.078 3.158 8.845C3.261 8.769 3.362 8.69 3.461 8.609C5.742 9.672 8.266 9.672 10.52 8.609C10.62 8.691 10.721 8.77 10.823 8.845C10.439 9.079 10.031 9.278 9.606 9.437C9.83 9.879 10.089 10.302 10.382 10.697C11.536 10.337 12.709 9.79 13.919 8.893C14.213 5.87 13.419 3.25 11.854 0.927ZM4.676 7.279C3.983 7.279 3.413 6.639 3.413 5.854C3.413 5.069 3.971 4.428 4.676 4.428C5.381 4.428 5.952 5.068 5.939 5.854C5.94 6.639 5.38 7.279 4.676 7.279ZM9.297 7.279C8.604 7.279 8.034 6.639 8.034 5.854C8.034 5.069 8.592 4.428 9.297 4.428C10.002 4.428 10.573 5.068 10.56 5.854C10.56 6.639 10.001 7.279 9.297 7.279Z" fill="#7289da"/>
            </svg>
            DISCORD
          </Link>
        </div>

        <button
          className="md:hidden"
          onClick={function() { setMobileOpen(!mobileOpen); }}
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 20,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {mobileOpen ? 'X' : '='}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden" style={{
          position: 'absolute',
          top: 64,
          left: 0,
          right: 0,
          background: 'rgba(2,2,2,0.98)',
          borderBottom: '1px solid rgba(0,245,255,0.1)',
          padding: '8px 0',
          maxHeight: 'calc(100vh - 64px)',
          overflowY: 'auto',
        }}>
          {NAV_ITEMS.map(function(item) {
            if (!item.children) {
              return (
                <Link key={item.label} href={item.href} onClick={function() { setMobileOpen(false); }} style={{
                  display: 'block',
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 13,
                  letterSpacing: 2,
                  color: 'rgba(255,255,255,0.5)',
                  textDecoration: 'none',
                  padding: '16px 24px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                }}>
                  {item.label}
                </Link>
              );
            }

            var isExpanded = mobileExpanded === item.label;
            return (
              <div key={item.label}>
                <button onClick={function() { toggleMobileSection(item.label); }} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  fontFamily: 'Share Tech Mono, monospace',
                  fontSize: 13,
                  letterSpacing: 2,
                  color: isExpanded ? '#00f5ff' : 'rgba(255,255,255,0.5)',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  padding: '16px 24px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}>
                  <span>{item.label}</span>
                  <span style={{
                    fontSize: 10,
                    transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}>
                    v
                  </span>
                </button>

                {isExpanded && (
                  <div style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}>
                    {item.children.map(function(child) {
                      return (
                        <Link
                          key={child.label}
                          href={child.href}
                          target={child.external ? '_blank' : undefined}
                          rel={child.external ? 'noopener noreferrer' : undefined}
                          onClick={function() { setMobileOpen(false); setMobileExpanded(null); }}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                            padding: '12px 24px 12px 40px',
                            textDecoration: 'none',
                            borderBottom: '1px solid rgba(255,255,255,0.02)',
                            background: child.beta ? 'rgba(0,245,255,0.02)' : 'transparent',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontFamily: 'Share Tech Mono, monospace',
                              fontSize: 12,
                              letterSpacing: 1,
                              color: child.color || 'rgba(255,255,255,0.6)',
                            }}>
                              {child.label} {child.external ? 'ext' : ''}
                            </span>
                            {child.beta && (
                              <span style={{ fontFamily: 'Share Tech Mono, monospace', fontSize: 7, color: '#00f5ff', background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.25)', borderRadius: 3, padding: '1px 5px', letterSpacing: 1 }}>BETA</span>
                            )}
                          </div>
                          {child.desc && (
                            <span style={{
                              fontFamily: 'Rajdhani, sans-serif',
                              fontSize: 11,
                              color: 'rgba(255,255,255,0.2)',
                            }}>
                              {child.desc}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
}
