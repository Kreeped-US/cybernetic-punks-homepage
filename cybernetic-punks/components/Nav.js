'use client';
import Link from 'next/link';
import { useState } from 'react';

export default function Nav() {
  const [open, setOpen] = useState(false);
  const links = ['Home','Builds','Community','Vault','Media'];
  const href = n => n === 'Home' ? '/' : `/${n.toLowerCase()}`;

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 bg-black/95 backdrop-blur-lg border-b border-red-600/20 flex items-center px-7 gap-4">
      <Link href="/" className="flex items-center gap-3 mr-8 flex-shrink-0">
        <div className="w-8 h-8 rounded-full border-2 border-red-600 flex items-center justify-center" style={{boxShadow: '0 0 10px rgba(255,0,0,0.4)'}}>
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"/>
        </div>
        <div>
          <div className="font-mono text-xs font-black text-red-600 tracking-widest">CYBERNETIC PUNKS</div>
          <div className="font-mono text-[9px] text-cyan-400 tracking-[4px] text-center animate-pulse">MARATHON HUB</div>
        </div>
      </Link>
      <div className="hidden md:flex items-center flex-1 justify-center gap-1">
        {links.map(n => (
          <Link key={n} href={href(n)} className="font-mono text-[10px] font-bold tracking-widest text-white/40 hover:text-red-600 px-4 h-16 flex items-center transition-colors border-b-2 border-transparent hover:border-red-600">
            {n}
          </Link>
        ))}
      </div>
      <div className="ml-auto flex gap-3 items-center">
        <button className="hidden md:block font-mono text-[9px] tracking-widest px-5 py-2 border border-white/10 text-white/40 hover:border-red-600 hover:text-red-600 transition-all">
          LOGIN
        </button>
        <button className="font-mono text-[9px] font-black tracking-widest px-5 py-2 bg-red-600 text-black hover:bg-transparent hover:text-red-600 border border-red-600 transition-all">
          JOIN NOW
        </button>
        <button className="md:hidden text-white/40 ml-1 text-xl" onClick={() => setOpen(!open)}>
          ☰
        </button>
      </div>
      {open && (
        <div className="absolute top-16 inset-x-0 bg-black border-b border-red-600/10 flex flex-col md:hidden">
          {links.map(n => (
            <Link key={n} href={href(n)} className="font-mono text-[10px] tracking-widest text-white/50 hover:text-red-600 px-6 py-4 border-b border-white/5">
              {n}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}