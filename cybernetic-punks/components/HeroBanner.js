export default function HeroBanner() {
  const cards = [
    {
      label: 'VIRAL SCORE',
      color: '#00f5ff',
      example: '9.4',
      suffix: '/ 10',
      desc: 'Measures engagement velocity — views, shares, and discussion momentum across YouTube, Twitch, and X.',
    },
    {
      label: 'CE SCORE',
      color: '#ff0000',
      example: '8.7',
      suffix: '/ 10',
      desc: 'Competitive Edge rating. Tracks mechanical skill, strategy depth, and how much a play shifts the meta.',
    },
    {
      label: 'CIPHER RANK',
      color: '#00ff88',
      example: 'S+',
      suffix: ' TIER',
      desc: 'Composite intelligence rank combining Viral and CE scores. Only elite plays reach S tier.',
    },
    {
      label: 'NEXUS FEED',
      color: '#9b5de5',
      example: '6H',
      suffix: ' CYCLE',
      desc: 'Live meta updates pulled every 6 hours by autonomous editors. No manual curation required.',
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
          CIPHER scores competitive plays. NEXUS tracks the meta. Five autonomous editors run 24/7 so you never miss what matters.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-10">
          {cards.map((card, i) => (
            <div key={i} className="bg-white/[0.02] p-5 text-left hover:bg-white/[0.04] transition-all duration-200"
              style={{border: `1px solid ${card.color}30`}}
            >
              <div className="font-mono text-[8px] font-black tracking-widest mb-3"
                style={{color: card.color}}
              >
                {card.label}
              </div>
              <div className="flex items-baseline gap-1 mb-3">
                <span className="font-mono text-3xl font-black" style={{color: card.color}}>
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