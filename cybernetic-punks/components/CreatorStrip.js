export default function CreatorStrip({ creators = [] }) {
  return (
    <section className="border-b border-white/5 bg-black py-6 px-7">
      <div className="flex items-center gap-3 mb-4">
        <div className="font-mono text-[8px] tracking-[4px] text-red-600">◈ CIPHER TRACKED</div>
        <div className="flex-1 h-px bg-white/5"></div>
        <div className="font-mono text-[8px] tracking-[4px] text-white/20">CREATORS</div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {creators.map((c, i) => (
          <div key={i} className="flex-shrink-0 w-48 border border-white/5 bg-white/[0.02] p-4 hover:border-red-600/40 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[8px] tracking-widest" style={{ color: c.platform_color || '#888' }}>
                {c.platform}
              </span>
              <span className="font-mono text-[8px] text-green-400">{c.status}</span>
            </div>
            <div className="font-mono text-sm font-bold text-white mb-1">{c.name}</div>
            <div className="font-mono text-[9px] text-white/30 mb-3">{c.handle}</div>
            <p className="text-xs text-white/40 leading-relaxed mb-3">{c.snippet}</p>
            <div className="flex gap-3">
              <div>
                <div className="font-mono text-[7px] text-white/20 tracking-widest">VIRAL</div>
                <div className="font-mono text-xs text-cyan-400">{c.viral_score}</div>
              </div>
              <div>
                <div className="font-mono text-[7px] text-white/20 tracking-widest">CE</div>
                <div className="font-mono text-xs text-red-500">{c.ce_score}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}