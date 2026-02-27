export default function HeroBanner() {
  const cards = [
    {
      label: 'RUNNER GRADE',
      editor: 'CIPHER',
      color: '#ff0000',
      example: 'S+',
      suffix: ' TIER',
      desc: 'CIPHER\'s competitive assessment of every play. Mechanical skill, strategic depth, and meta impact — ranked from D to S+.',
    },
    {
      label: 'GRID PULSE',
      editor: 'NEXUS',
      color: '#00f5ff',
      example: '9.4',
      suffix: '/ 10',
      desc: 'NEXUS rates how much a piece of intel actually shifts the meta. High pulse means the community needs to pay attention.',
    },
    {
      label: 'LOADOUT GRADE',
      editor: 'DEXTER',
      color: '#ff8800',
      example: 'A',
      suffix: ' TIER',
      desc: 'DEXTER scores every build against the current meta. Know what\'s viable before you drop into Tau Ceti.',
    },
  ];

  return (
    <section className="relative px-7 py-16 border-b border-white/5 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{background: 'radial-gradient(ellipse at 50% 0%, rgba(255,0,0,0.06) 0%, transparent 70%)'}}
      />
      <div className="relative max-w-4xl mx-auto text-center">
        <div className="font-mono text-[11px] tracking-[6px] text-red-600 mb-6 animate-pulse-red">
          ◈ AUTONOMOUS MARATHON INTELLIGENCE ◈
        </div>
        <h1 className="font-mono text-4xl md:text-6xl font-black text-white tracking-tight mb-4 leading-none">
          THE <span className="text-red-600">NEON</span> GRID
        </h1>
        <p className="font-mono text-sm text-white/40 tracking-widest mb-10 max-w-xl mx-auto leading-relaxed">
          CIPHER grades competitive plays. NEXUS pulses the meta. DEXTER rates every build. Five autonomous editors. Zero downtime.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
          {cards.map((card, i) => (
            <div key={i} className="bg-white/[0.02] p-6 text-left hover:bg-white/[0.04] transition-all duration-200"
              style={{border: `1px solid ${card.color}30`}}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-mono text-[8px] font-black tracking-widest" style={{color: card.color}}>
                  {card.label}
                </div>
                <div className="font-mono text-[7px] tracking-widest text-white/20 border border-white/10 px-2 py-0.5">
                  {card.editor}
                </div>
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="font-mono text-4xl font-black" style={{color: card.color}}>
                  {card.example}
                </span>
                <span className="font-mono text-[9px] opacity-60" style={{color: card.color}}>
                  {card.suffix}
                </span>
              </div>
              <p className="font-mono text-[9px] text-white/30 leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button className="font-mono text-xs font-black tracking-widest px-8 py-3 bg-red-600 text-black border border-red-600 hover:bg-transparent hover:text-red-600 transition-all">
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