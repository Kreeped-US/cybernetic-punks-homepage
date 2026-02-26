export default function Top10Carousel({ plays = [] }) {
  return (
    <section className="py-8 px-7 border-t border-white/5">
      <div className="flex items-center gap-3 mb-6">
        <div className="font-mono text-[8px] tracking-[4px] text-red-600">◈ CIPHER TOP 10</div>
        <div className="flex-1 h-px bg-white/5"></div>
        <div className="font-mono text-[8px] tracking-[4px] text-white/20">RANKED PLAYS</div>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {plays.map((play, i) => (
          <div key={i} className="flex-shrink-0 w-64 border border-white/5 bg-white/[0.02] hover:border-red-600/40 hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
            <div className="relative">
              <img
                src={`https://img.youtube.com/vi/${play.youtube_id}/hqdefault.jpg`}
                alt={play.title}
                className="w-full h-36 object-cover"
              />
              <div className="absolute top-2 left-2 font-mono text-[8px] font-black text-black bg-red-600 px-2 py-0.5">
                #{play.rank}
              </div>
              <div className="absolute bottom-2 right-2 font-mono text-[8px] text-white bg-black/80 px-2 py-0.5">
                {play.duration}
              </div>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[8px] tracking-widest" style={{ color: play.platformColor || '#888' }}>
                  {play.platform}
                </span>
                <span className="font-mono text-[8px] text-white/30">{play.creatorHandle}</span>
              </div>
              <h3 className="font-mono text-xs font-bold text-white leading-snug mb-2">{play.title}</h3>
              <div className="flex gap-3">
                <div>
                  <div className="font-mono text-[7px] text-white/20 tracking-widest">VIRAL</div>
                  <div className="font-mono text-xs text-cyan-400">{play.viral}</div>
                </div>
                <div>
                  <div className="font-mono text-[7px] text-white/20 tracking-widest">CE</div>
                  <div className="font-mono text-xs text-red-500">{play.ce}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}