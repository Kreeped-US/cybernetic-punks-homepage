'use client';

const EDITOR_STYLES = {
  CIPHER:  { color: '#ff0000', bg: 'rgba(255,0,0,0.1)',     symbol: '◈' },
  NEXUS:   { color: '#00f5ff', bg: 'rgba(0,245,255,0.1)',   symbol: '⬡' },
  MIRANDA: { color: '#9b5de5', bg: 'rgba(155,93,229,0.1)',  symbol: '◎' },
  GHOST:   { color: '#00ff88', bg: 'rgba(0,255,136,0.1)',   symbol: '◇' },
  DEXTER:  { color: '#ff8800', bg: 'rgba(255,136,0,0.1)',   symbol: '⬢' },
};

export default function NexusFeed({ items = [] }) {
  return (
    <section className="py-8 px-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="font-mono text-[8px] tracking-[4px] text-cyan-400">◈ NEXUS FEED</div>
        <div className="flex-1 h-px bg-white/5"></div>
        <div className="font-mono text-[8px] tracking-[4px] text-white/20">LIVE INTEL</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, i) => {
          const editor = EDITOR_STYLES[item.editor] || EDITOR_STYLES.CIPHER;
          return (
            <div key={i} className="border border-white/5 bg-white/[0.02] p-5 hover:border-cyan-400/30 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer relative">
              <div
                className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                style={{ background: editor.bg, color: editor.color, border: `1px solid ${editor.color}40` }}
              >
                {editor.symbol}
              </div>
              <div className="flex items-center gap-2 mb-3 pr-12">
                <span className="font-mono text-[7px] tracking-widest border px-2 py-0.5" style={{ color: editor.color, borderColor: `${editor.color}30` }}>
                  {item.editor}
                </span>
                <span className="font-mono text-[7px] tracking-widest text-white/20">{item.source}</span>
                <div className="flex-1"></div>
                {item.tags?.map((tag, t) => (
                  <span key={t} className="font-mono text-[7px] text-white/20 border border-white/5 px-2 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
              <h3 className="font-mono text-sm font-bold text-white mb-2 leading-snug pr-12">{item.headline}</h3>
              <p className="text-xs text-white/40 leading-relaxed mb-4">{item.body}</p>
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
            </div>
          );
        })}
      </div>
    </section>
  );
}