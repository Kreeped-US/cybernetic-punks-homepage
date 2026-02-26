export default function NexusFeed({ items = [] }) {
  return (
    <section className="py-8 px-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="font-mono text-[8px] tracking-[4px] text-cyan-400">◈ NEXUS FEED</div>
        <div className="flex-1 h-px bg-white/5"></div>
        <div className="font-mono text-[8px] tracking-[4px] text-white/20">LIVE INTEL</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, i) => (
          <div key={i} className="border border-white/5 bg-white/[0.02] p-5 hover:border-cyan-400/20 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-[7px] tracking-widest text-cyan-400 border border-cyan-400/20 px-2 py-0.5">
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
            <h3 className="font-mono text-sm font-bold text-white mb-2 leading-snug">{item.headline}</h3>
            <p className="text-xs text-white/40 leading-relaxed mb-4">{item.body}</p>
            <div className="flex gap-4">
              <div>
                <div className="font-mono text-[7px] text-white/20 tracking-widest">VIRAL</div>
                <div className="font-mono text-xs text-cyan-400">{item.viral}</div>
              </div>
              <div>
                <div className="font-mono text-[7px] text-white/20 tracking-widest">CE</div>
                <div className="font-mono text-xs text-red-500">{item.ce}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}