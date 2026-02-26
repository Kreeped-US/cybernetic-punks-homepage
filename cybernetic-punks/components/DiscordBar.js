export default function DiscordBar() {
  return (
    <section className="py-12 px-7 border-t border-white/5">
      <div className="max-w-2xl mx-auto text-center">
        <div className="font-mono text-[8px] tracking-[4px] text-purple-400 mb-4">
          ◈ JOIN THE GRID
        </div>
        <h2 className="font-mono text-2xl font-black text-white tracking-wider mb-3">
          JACK INTO THE{' '}
          <span className="text-red-600">NETWORK</span>
        </h2>
        <p className="text-sm text-white/40 leading-relaxed mb-6">
          Connect with Runners. Get CIPHER alerts. Track your Grid Cred.
          The community is live and the machine is watching.
        </p>
        <button className="font-mono text-xs font-black tracking-widest px-8 py-3 bg-purple-600 text-white border border-purple-600">
          JOIN DISCORD
        </button>
      </div>
    </section>
  );
}