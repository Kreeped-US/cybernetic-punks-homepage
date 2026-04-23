'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useRef } from 'react';

var NAV_ITEMS = [
  { label: 'HOME',     href: '/' },
  { label: 'META',     href: '/meta' },
  { label: 'SHELLS',   href: '/shells' },
  { label: 'FACTIONS', href: '/factions' },
  {
    label: 'INTEL',
    activeOn: ['/intel', '/sitrep', '/editors'],
    children: [
      { label: 'ALL INTEL', href: '/intel',         desc: 'Every article, every editor' },
      { label: 'CIPHER',    href: '/intel/cipher',  desc: 'Play analysis & grades',             color: '#ff2222' },
      { label: 'NEXUS',     href: '/intel/nexus',   desc: 'Meta tracking & strategy',           color: '#00d4ff' },
      { label: 'DEXTER',    href: '/intel/dexter',  desc: 'Build analysis & loadouts',          color: '#ff8800' },
      { label: 'GHOST',     href: '/intel/ghost',   desc: 'Community pulse & sentiment',        color: '#00ff88' },
      { label: 'MIRANDA',   href: '/intel/miranda', desc: 'Field guides & player development',  color: '#9b5de5' },
      { label: 'SITREP',    href: '/sitrep',        desc: 'Daily meta situation report',        color: '#00d4ff' },
      { label: 'EDITORS',   href: '/editors',       desc: 'Meet the five editors' },
    ],
  },
  {
    label: 'TOOLS',
    activeOn: ['/advisor', '/builds', '/guides', '/status', '/join', '/me'],
    children: [
      { label: 'BUILD ADVISOR',    href: '/advisor', desc: 'AI-engineered loadouts by DEXTER',      color: '#ff8800' },
      { label: 'BUILD LAB',        href: '/builds',  desc: 'Shell builds & weapon browser' },
      { label: 'FIELD GUIDES',     href: '/guides',  desc: 'Shell breakdowns & strategy',           color: '#9b5de5' },
      { label: 'SERVER STATUS',    href: '/status',  desc: 'Is Marathon down?' },
      { label: 'PERSONAL COACH ✦', href: '/join',    desc: 'AI loadout audit — closed beta',        color: '#00d4ff', beta: true },
    ],
  },
  { label: 'RANKED', href: '/ranked' },
];

function isTabActive(item, pathname) {
  if (item.href) {
    return item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
  }
  if (item.activeOn) {
    return item.activeOn.some(function(p) { return pathname.startsWith(p); });
  }
  return false;
}

/* ── DROPDOWN ───────────────────────────────────────────────── */
function Dropdown({ item, active }) {
  var [open, setOpen] = useState(false);
  var timeout = useRef(null);

  function handleEnter() {
    clearTimeout(timeout.current);
    setOpen(true);
  }

  function handleLeave() {
    timeout.current = setTimeout(function() { setOpen(false); }, 120);
  }

  return (
    <div
      style={{ position: 'relative', height: '100%', display: 'flex', alignItems: 'stretch' }}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button style={{
        display:       'flex',
        alignItems:    'center',
        gap:           5,
        padding:       '0 18px',
        height:        '100%',
        background:    'none',
        border:        'none',
        borderBottom:  active ? '2px solid #00ff41' : '2px solid transparent',
        fontSize:      11,
        fontWeight:    600,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color:         active ? '#fff' : 'rgba(255,255,255,0.3)',
        cursor:        'pointer',
        whiteSpace:    'nowrap',
        transition:    'color 0.12s',
        fontFamily:    'inherit',
      }}
        onMouseEnter={function(e) { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
        onMouseLeave={function(e) { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
      >
        {item.label}
        <span style={{
          fontSize:   8,
          opacity:    0.5,
          marginTop:  1,
          transition: 'transform 0.15s',
          transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
          display:    'inline-block',
        }}>▾</span>
      </button>

      {open && (
        <div style={{
          position:   'absolute',
          top:        '100%',
          left:       0,
          marginTop:  1,
          minWidth:   220,
          background: '#1a1d24',
          border:     '1px solid #22252e',
          borderRadius: 3,
          zIndex:     200,
          overflow:   'hidden',
        }}>
          {item.children.map(function(child) {
            return (
              <Link
                key={child.label}
                href={child.href}
                onClick={function() { setOpen(false); }}
                style={{
                  display:       'flex',
                  flexDirection: 'column',
                  gap:           2,
                  padding:       '10px 16px',
                  textDecoration:'none',
                  borderBottom:  '1px solid #22252e',
                  background:    'transparent',
                  transition:    'background 0.1s',
                }}
                onMouseEnter={function(e) { e.currentTarget.style.background = '#1e2228'; }}
                onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {child.color && (
                    <span style={{ width: 5, height: 5, borderRadius: 1, background: child.color, flexShrink: 0 }} />
                  )}
                  <span style={{
                    fontSize:      11,
                    fontWeight:    700,
                    letterSpacing: '1px',
                    color:         child.color || 'rgba(255,255,255,0.75)',
                  }}>
                    {child.label}
                  </span>
                  {child.beta && (
                    <span style={{
                      fontSize:      7,
                      fontWeight:    700,
                      letterSpacing: 1,
                      color:         '#00d4ff',
                      background:    'rgba(0,212,255,0.1)',
                      border:        '1px solid rgba(0,212,255,0.25)',
                      borderRadius:  2,
                      padding:       '1px 5px',
                    }}>BETA</span>
                  )}
                </div>
                {child.desc && (
                  <span style={{
                    fontSize:  11,
                    color:     'rgba(255,255,255,0.25)',
                    lineHeight: 1.3,
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
}

/* ── NAV ────────────────────────────────────────────────────── */
export default function Nav() {
  var pathname = usePathname();
  var [mobileOpen, setMobileOpen]       = useState(false);
  var [mobileExpanded, setMobileExpanded] = useState(null);

  function toggleSection(label) {
    setMobileExpanded(mobileExpanded === label ? null : label);
  }

  return (
    <nav style={{
      position:     'fixed',
      top:          0,
      left:         0,
      right:        0,
      zIndex:       100,
      height:       48,
      background:   '#0e1014',
      borderBottom: '1px solid #1e2028',
    }}>
      <div style={{
        maxWidth:       1400,
        margin:         '0 auto',
        display:        'flex',
        alignItems:     'stretch',
        height:         '100%',
        padding:        '0 16px',
      }}>

        {/* Logo */}
        <Link href="/" style={{
          display:      'flex',
          alignItems:   'center',
          gap:          8,
          textDecoration: 'none',
          marginRight:  24,
          flexShrink:   0,
        }}>
          <div style={{
            width:       8,
            height:      8,
            borderRadius:'50%',
            background:  '#ff2222',
            boxShadow:   '0 0 8px rgba(255,34,34,0.6)',
            animation:   'pulse-glow 3s ease-in-out infinite',
            flexShrink:  0,
          }} />
          <span style={{
            fontFamily:    'Orbitron, monospace',
            fontSize:      13,
            fontWeight:    700,
            letterSpacing: '2px',
            color:         '#fff',
            whiteSpace:    'nowrap',
          }}>
            CYBERNETIC<span style={{ color: '#ff2222' }}>PUNKS</span>
          </span>
        </Link>

        {/* Desktop tabs */}
        <div className="hidden md:flex" style={{ flex: 1, alignItems: 'stretch', gap: 0 }}>
          {NAV_ITEMS.map(function(item) {
            var active = isTabActive(item, pathname);
            if (item.children) {
              return <Dropdown key={item.label} item={item} active={active} />;
            }
            return (
              <Link
                key={item.label}
                href={item.href}
                style={{
                  display:       'flex',
                  alignItems:    'center',
                  padding:       '0 18px',
                  fontSize:      11,
                  fontWeight:    600,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  textDecoration:'none',
                  color:         active ? '#fff' : 'rgba(255,255,255,0.3)',
                  borderBottom:  active ? '2px solid #00ff41' : '2px solid transparent',
                  whiteSpace:    'nowrap',
                  transition:    'color 0.12s',
                }}
                onMouseEnter={function(e) { if (!active) e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; }}
                onMouseLeave={function(e) { if (!active) e.currentTarget.style.color = active ? '#fff' : 'rgba(255,255,255,0.3)'; }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: 16, marginLeft: 'auto', flexShrink: 0 }}>
          {/* Live indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width:        5,
              height:       5,
              borderRadius: '50%',
              background:   '#00ff41',
              boxShadow:    '0 0 6px rgba(0,255,65,0.4)',
            }} />
            <span style={{
              fontSize:      9,
              fontWeight:    600,
              letterSpacing: '1px',
              color:         'rgba(255,255,255,0.2)',
              textTransform: 'uppercase',
            }}>LIVE</span>
          </div>

          {/* Discord */}
          <Link
            href="https://discord.gg/PnhbdRYh3w"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display:       'flex',
              alignItems:    'center',
              gap:           6,
              padding:       '6px 12px',
              background:    'rgba(88,101,242,0.1)',
              border:        '1px solid rgba(88,101,242,0.3)',
              borderRadius:  2,
              textDecoration:'none',
              fontSize:      10,
              fontWeight:    700,
              letterSpacing: '1px',
              color:         '#7289da',
              transition:    'background 0.12s, border-color 0.12s',
            }}
            onMouseEnter={function(e) { e.currentTarget.style.background = 'rgba(88,101,242,0.2)'; e.currentTarget.style.borderColor = 'rgba(88,101,242,0.5)'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = 'rgba(88,101,242,0.1)'; e.currentTarget.style.borderColor = 'rgba(88,101,242,0.3)'; }}
          >
            <svg width="13" height="10" viewBox="0 0 14 11" fill="none">
              <path d="M11.854 0.927C10.956 0.505 9.994 0.198 8.99 0.022C8.861 0.256 8.711 0.57 8.607 0.819C7.534 0.655 6.47 0.655 5.414 0.819C5.31 0.57 5.157 0.256 5.027 0.022C4.022 0.198 3.059 0.506 2.161 0.929C0.311 3.641 -0.19 6.285 0.06 8.893C1.27 9.789 2.442 10.336 3.595 10.696C3.887 10.3 4.147 9.879 4.371 9.436C3.947 9.276 3.541 9.078 3.158 8.845C3.261 8.769 3.362 8.69 3.461 8.609C5.742 9.672 8.266 9.672 10.52 8.609C10.62 8.691 10.721 8.77 10.823 8.845C10.439 9.079 10.031 9.278 9.606 9.437C9.83 9.879 10.089 10.302 10.382 10.697C11.536 10.337 12.709 9.79 13.919 8.893C14.213 5.87 13.419 3.25 11.854 0.927ZM4.676 7.279C3.983 7.279 3.413 6.639 3.413 5.854C3.413 5.069 3.971 4.428 4.676 4.428C5.381 4.428 5.952 5.068 5.939 5.854C5.94 6.639 5.38 7.279 4.676 7.279ZM9.297 7.279C8.604 7.279 8.034 6.639 8.034 5.854C8.034 5.069 8.592 4.428 9.297 4.428C10.002 4.428 10.573 5.068 10.56 5.854C10.56 6.639 10.001 7.279 9.297 7.279Z" fill="#7289da"/>
            </svg>
            DISCORD
          </Link>

          {/* Join CTA */}
          <Link href="/join" style={{
            padding:        '7px 14px',
            background:     '#00ff41',
            color:          '#000',
            fontSize:       10,
            fontWeight:     800,
            letterSpacing:  '1px',
            borderRadius:   2,
            textDecoration: 'none',
            whiteSpace:     'nowrap',
          }}>
            JOIN FREE
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden"
          onClick={function() { setMobileOpen(!mobileOpen); }}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border:     'none',
            color:      'rgba(255,255,255,0.5)',
            fontSize:   18,
            cursor:     'pointer',
            padding:    '0 4px',
            display:    'flex',
            alignItems: 'center',
          }}
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden" style={{
          position:   'absolute',
          top:        48,
          left:       0,
          right:      0,
          background: '#0e1014',
          borderBottom: '1px solid #1e2028',
          maxHeight:  'calc(100vh - 48px)',
          overflowY:  'auto',
          zIndex:     200,
        }}>
          {NAV_ITEMS.map(function(item) {
            var active = isTabActive(item, pathname);

            if (!item.children) {
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={function() { setMobileOpen(false); }}
                  style={{
                    display:       'block',
                    padding:       '14px 20px',
                    fontSize:      11,
                    fontWeight:    600,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color:         active ? '#fff' : 'rgba(255,255,255,0.4)',
                    textDecoration:'none',
                    borderBottom:  '1px solid #1e2028',
                    borderLeft:    active ? '2px solid #00ff41' : '2px solid transparent',
                  }}
                >
                  {item.label}
                </Link>
              );
            }

            var expanded = mobileExpanded === item.label;
            return (
              <div key={item.label}>
                <button
                  onClick={function() { toggleSection(item.label); }}
                  style={{
                    display:       'flex',
                    alignItems:    'center',
                    justifyContent:'space-between',
                    width:         '100%',
                    padding:       '14px 20px',
                    fontSize:      11,
                    fontWeight:    600,
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                    color:         expanded ? '#fff' : 'rgba(255,255,255,0.4)',
                    background:    'none',
                    border:        'none',
                    borderBottom:  '1px solid #1e2028',
                    borderLeft:    expanded ? '2px solid #00ff41' : '2px solid transparent',
                    cursor:        'pointer',
                    textAlign:     'left',
                  }}
                >
                  <span>{item.label}</span>
                  <span style={{
                    fontSize:  9,
                    transition:'transform 0.15s',
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    display:   'inline-block',
                    opacity:   0.4,
                  }}>▾</span>
                </button>

                {expanded && (
                  <div style={{ background: '#121418' }}>
                    {item.children.map(function(child) {
                      return (
                        <Link
                          key={child.label}
                          href={child.href}
                          target={child.external ? '_blank' : undefined}
                          rel={child.external ? 'noopener noreferrer' : undefined}
                          onClick={function() { setMobileOpen(false); setMobileExpanded(null); }}
                          style={{
                            display:       'flex',
                            flexDirection: 'column',
                            gap:           2,
                            padding:       '10px 20px 10px 32px',
                            textDecoration:'none',
                            borderBottom:  '1px solid #1e2028',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {child.color && (
                              <span style={{ width: 4, height: 4, borderRadius: 1, background: child.color, flexShrink: 0 }} />
                            )}
                            <span style={{
                              fontSize:      11,
                              fontWeight:    700,
                              letterSpacing: '1px',
                              color:         child.color || 'rgba(255,255,255,0.6)',
                            }}>
                              {child.label}
                            </span>
                            {child.beta && (
                              <span style={{
                                fontSize:   7,
                                fontWeight: 700,
                                color:      '#00d4ff',
                                background: 'rgba(0,212,255,0.1)',
                                border:     '1px solid rgba(0,212,255,0.25)',
                                borderRadius: 2,
                                padding:    '1px 5px',
                                letterSpacing: 1,
                              }}>BETA</span>
                            )}
                          </div>
                          {child.desc && (
                            <span style={{
                              fontSize:  11,
                              color:     'rgba(255,255,255,0.2)',
                              lineHeight: 1.3,
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

          {/* Mobile bottom links */}
          <div style={{ padding: '12px 20px', display: 'flex', gap: 10 }}>
            <Link href="https://discord.gg/PnhbdRYh3w" target="_blank" rel="noopener noreferrer"
              onClick={function() { setMobileOpen(false); }}
              style={{ flex: 1, textAlign: 'center', padding: '10px', background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.3)', borderRadius: 2, fontSize: 10, fontWeight: 700, color: '#7289da', textDecoration: 'none', letterSpacing: 1 }}>
              DISCORD
            </Link>
            <Link href="/join"
              onClick={function() { setMobileOpen(false); }}
              style={{ flex: 1, textAlign: 'center', padding: '10px', background: '#00ff41', borderRadius: 2, fontSize: 10, fontWeight: 800, color: '#000', textDecoration: 'none', letterSpacing: 1 }}>
              JOIN FREE
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
