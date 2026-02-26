export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-8 px-7">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-full border-2 border-red-600 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-red-600"/>
          </div>
          <div>
            <div className="font-mono text-[10px] font-black text-red-600 tracking-widest">CYBERNETIC PUNKS</div>
            <div className="font-mono text-[7px] text-cyan-400 tracking-[3px] opacity-60">MARATHON HUB</div>
          </div>
        </div>
        <div className="flex gap-6">
          <span className="font-mono text-[8px] text-white/20 tracking-widest">CIPHER</span>
          <span className="font-mono text-[8px] text-white/20 tracking-widest">NEXUS</span>
          <span className="font-mono text-[8px] text-white/20 tracking-widest">MIRANDA</span>
          <span className="font-mono text-[8px] text-white/20 tracking-widest">GHOST</span>
          <span className="font-mono text-[8px] text-white/20 tracking-widest">DEXTER</span>
        </div>
        <div className="font-mono text-[8px] text-white/20 tracking-widest">
          © 2025 CYBERNETIC PUNKS · NOT AFFILIATED WITH BUNGIE
        </div>
      </div>
    </footer>
  );
}