'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const links = [
    { label: 'HOME', href: '/' },
    { label: "WHAT'S META", href: '/#meta' },
    { label: 'BUILDS', href: '/#builds' },
    { label: 'EDITORS', href: '/#editors' },
    { label: 'DISCORD', href: 'https://discord.gg/fgxdSD7SJj', external: true },
  ];

  return (
    <nav
      style={{
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
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
        }}
      >
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
          <div
            style={{
              width: 10,
              height: 10,
              background: '#ff0000',
              borderRadius: '50%',
              boxShadow: '0 0 12px #ff0000, 0 0 24px rgba(255,0,0,0.3)',
              animation: 'pulse-glow 3s ease-in-out infinite',
            }}
          />
          <span
            style={{
              fontFamily: 'Orbitron, monospace',
              fontSize: 16,
              fontWeight: 700,
              color: '#fff',
              letterSpacing: 3,
            }}
          >
            CYBERNETIC<span style={{ color: '#ff0000' }}>PUNKS</span>
          </span>
        </Link>

        {/* Center tag */}
        <div
          style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 10,
            letterSpacing: 2,
            color: 'rgba(0,245,255,0.5)',
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          className="hidden md:block"
        >
          MARATHON INTELLIGENCE HUB
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex" style={{ gap: 24 }}>
          {links.map(link => (
            <Link
              key={link.label}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              style={{
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 13,
                letterSpacing: 1,
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#00f5ff')}
              onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.6)')}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Mobile menu button */}
        <button
          className="md:hidden"
          onClick={() => setOpen(!open)}
          style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: 20,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {open ? '✕' : '☰'}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div
          className="md:hidden"
          style={{
            position: 'absolute',
            top: 64,
            left: 0,
            right: 0,
            background: 'rgba(2,2,2,0.98)',
            borderBottom: '1px solid rgba(0,245,255,0.1)',
            padding: '8px 0',
          }}
        >
          {links.map(link => (
            <Link
              key={link.label}
              href={link.href}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                fontFamily: 'Share Tech Mono, monospace',
                fontSize: 13,
                letterSpacing: 2,
                color: 'rgba(255,255,255,0.5)',
                textDecoration: 'none',
                padding: '16px 24px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                transition: 'color 0.2s',
              }}
              onMouseEnter={(e) => (e.target.style.color = '#00f5ff')}
              onMouseLeave={(e) => (e.target.style.color = 'rgba(255,255,255,0.5)')}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}