'use client';
import { useState } from 'react';

const EDITORS = {
  CIPHER:  { color: '#ff0000', bg: 'rgba(255,0,0,0.08)',    border: 'rgba(255,0,0,0.2)',    symbol: '◈', tagline: 'Viral clip hunter. Scores competitive plays by velocity and mechanical edge.' },
  NEXUS:   { color: '#00f5ff', bg: 'rgba(0,245,255,0.08)',  border: 'rgba(0,245,255,0.2)',  symbol: '⬡', tagline: 'Official source monitor. Pulls Bungie drops, announcements, and dev commentary.' },
  MIRANDA: { color: '#9b5de5', bg: 'rgba(155,93,229,0.08)', border: 'rgba(155,93,229,0.2)', symbol: '◎', tagline: 'Drama analyst. Tracks community conflict, creator tension, and narrative shifts.' },
  GHOST:   { color: '#00ff88', bg: 'rgba(0,255,136,0.08)',  border: 'rgba(0,255,136,0.2)',  symbol: '◇', tagline: 'Community pulse reader. Detects sentiment shifts before they become headlines.' },
  DEXTER:  { color: '#ff8800', bg: 'rgba(255,136,0,0.08)',  border: 'rgba(255,136,0,0.2)',  symbol: '⬢', tagline: 'Patch analyst. Breaks down updates, hotfixes, and competitive meta shifts.' },
};

export default function NexusFeed({ items = [] }) {
  const [activeEditor, setActiveEditor] = useState('ALL');
  const editorKeys = ['ALL', ...Object.keys(EDITORS)];

  const filtered = activeEditor === 'ALL'
    ? items
    : items.filter(item => item.editor === activeEditor);

  const active = activeEditor !== 'ALL' ? EDITORS[activeEditor] : null;

  return (
    <section className="py-8 px-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="font-mono text-[8px] tracking-[4px] text-cyan-400">◈ NEXUS FEED</div>
        <div className="flex-1 h-px bg-white/5"></div>
        <div className="font-mono text-[8px] tracking-[4px] text-white/20">LIVE INTEL</div>
      </div>

      {/* Editor tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {editorKeys.map(key => {
          const ed = EDITORS[key];
          const isActive = activeEditor === key;
          return (
            <button
              key={key}
              onClick={() => setActiveEditor(key)}
              className="font-mono text-[8px] tracking-widest px-3 py-1.5 border transition-all duration-200"
              style={{
                color: isActive ? (ed ? ed.color : '#ffffff') : 'rgba(255,255,255,0.3)',
                borderColor: isActive ? (ed ? ed.color : 'rgba(255,255,255,0.4)') : 'rgba(255,255,255,0.1)',
                background: isActive ? (ed ? ed.bg : 'rgba(255,255,255,0.05)') : 'transparent',
              }}
            >
              {ed ? `${ed.symbol} ${key}` : key}
            </button>
          );
        })}
      </div>

      {/* Active editor tagline */}
      {active && (
        <div className="mb-6 p-3 border-l-2 font-mono text-[9px] text-white/40 leading-relaxed"
          style={{ borderColor: active.color }}>
          {active.tagline}
        </div>
      )}

      {/* Feed cards */}
      {filtered.length === 0 ? (
        <div className="border border-white/5 bg-white/[0.02] p-8 text-center">
          <div className="font-mono text-[8px] tracking-widest text-white/20">NO INTEL IN THIS LANE YET</div>
          <div className="font-mono text-[7px] text-white/10 mt-2">EDITORS ARE SCANNING...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item, i) => {
            const editor = EDITORS[item.editor] || EDITORS.CIPHER;
            return (
              <div key={i}
                className="border bg-white/[0.02] p-5 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = editor.border}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
              >
                <div
                  className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: editor.bg, color: editor.color, border: `1px solid ${editor.border}` }}
                >
                  {editor.symbol}
                </div>
                <div className="flex items-center gap-2 mb-3 pr-12">
                  <span className="font-mono text-[7px] tracking-widest border px-2 py-0.5"
                    style={{ color: editor.color, borderColor: editor.border }}>
                    {item.editor}
                  </span>
                  <span className="font-mono text-[7px] tracking-widest text-white/20">{item.source}</span>
                </div>
                <h3 className="font-mono text-sm font-bold text-white mb-2 leading-snug pr-12">{item.headline}</h3>
                <p className="text-xs text-white/40 leading-relaxed mb-4">{item.body}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-4">
                    <div>
                      <div className="font-mono text-[7px] text-white/20 tracking-widest">VIRAL</div>
                      <div className="font-mono text-xs text-cyan-400">{item.viral_score}</div>
                    </div>
                    <div>
                      <div className="font-mono text-[7px] text-white/20 tracking-widest">CE</div>
                      <div className="font-mono text-xs text-red-500">{item.ce_score}</div>
                    </div>
                  </div>
                  <div className="font-mono text-[7px] text-white/20 tracking-widest">
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}