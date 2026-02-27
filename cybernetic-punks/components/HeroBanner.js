export default function HeroBanner() {
  return (
    <section className="relative px-7 py-16 border-b border-white/5 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(255,0,0,0.06)_0%,transparent_70%)] pointer-events-none" />
      <div className="relative max-w-4xl mx-auto text-center">
        <div className="font-mono text-[11px] tracking-[6px] text-red-600 mb-6 animate-pulse-red">
          ◈ AUTONOMOUS MARATHON INTELLIGENCE ◈
        </div>
        <h1 className="font-mono text-4xl md:text-6xl font-black text-white tracking-tight mb-4 leading-none">
          THE <span className="text-red-600 glow-red">NEON</span> GRID
        </h1>
        <p className="font-mono text-sm text-white/40 tracking-widest mb-10 max-w-xl mx-auto leading-relaxed">
          CIPHER scores competitive plays. NEXUS tracks the meta. Five autonomous editors run 24/7 so you never miss what matters.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-10">
          {[
            { label: 'VIRAL SCORE', desc: 'Engagement velocity across platforms', color: 'text-cyan-400' },
            { label: 'CE SCORE', desc: 'Competitive edge and mechanical skill', color: 'text-red-500' },
            { label: 'CIPHER RANK', desc: 'Composite intelligence ranking', color: 'text-green-400' },
            { label: 'NEXUS FEED', desc: 'Live meta updates every 6 hours', color: 'text-purple-400' },
          ].map((item, i) => (
            <div key={i} className="border border-white/5 bg-white/[0.02] p-4 text-left">
              <div className={`font-mono text-[8px] font-black tracking-widest mb-2 ${item.color}`}>
                {item.label}
              </div>
              <p className="font-mono text-[9px] text-white/30 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button className="font-mono text-xs font-black tracking-widest px-8 py-3 bg-red-600 text-black hover:bg-transparent hover:text-red-600 border border-red-600 transition-all">
            JACK IN
          </button>
          <button className="font-mono text-xs tracking-widest px-8 py-3 border border-white/10 text-white/40 hover:border-red-600 hover:text-red-600 transition-all">
            EXPLORE THE GRID
          </button>
        </div>
      </div>
    </section>
  );
}