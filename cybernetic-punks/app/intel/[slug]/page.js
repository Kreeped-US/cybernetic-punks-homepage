import { supabase } from '@/lib/supabase';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import { notFound } from 'next/navigation';

const EDITOR_STYLES = {
  CIPHER:  { color: '#ff0000', symbol: '◈', label: 'CIPHER' },
  NEXUS:   { color: '#00f5ff', symbol: '⬡', label: 'NEXUS' },
  MIRANDA: { color: '#9b5de5', symbol: '◎', label: 'MIRANDA' },
  GHOST:   { color: '#00ff88', symbol: '◇', label: 'GHOST' },
  DEXTER:  { color: '#ff8800', symbol: '⬢', label: 'DEXTER' },
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { data: item } = await supabase
    .from('feed_items')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!item) return { title: 'Intel Not Found | Cybernetic Punks' };

  return {
    title: `${item.headline} | Cybernetic Punks`,
    description: item.body,
    openGraph: {
      title: item.headline,
      description: item.body,
      url: `https://cyberneticpunks.com/intel/${item.slug}`,
      siteName: 'Cybernetic Punks',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: item.headline,
      description: item.body,
    },
  };
}

export default async function IntelPage({ params }) {
  const { slug } = await params;
  const { data: item } = await supabase
    .from('feed_items')
    .select('*')
    .eq('slug', slug)
    .single();

  if (!item) notFound();

  const editor = EDITOR_STYLES[item.editor] || EDITOR_STYLES.CIPHER;
  const publishedAt = new Date(item.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <main className="min-h-screen bg-black text-white pt-16">
      <Nav />
      <article className="max-w-3xl mx-auto px-7 py-16">
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
            style={{ background: `${editor.color}15`, color: editor.color, border: `1px solid ${editor.color}40` }}
          >
            {editor.symbol}
          </div>
          <div>
            <div className="font-mono text-[8px] tracking-widest" style={{ color: editor.color }}>
              {editor.label}
            </div>
            <div className="font-mono text-[8px] text-white/20 tracking-widest">
              {publishedAt}
            </div>
          </div>
          {item.source && (
            <span className="ml-auto font-mono text-[8px] text-white/20 border border-white/10 px-3 py-1">
              {item.source}
            </span>
          )}
        </div>
        <h1 className="font-mono text-2xl md:text-3xl font-black text-white leading-tight mb-6">
          {item.headline}
        </h1>
        <p className="text-base text-white/60 leading-relaxed mb-8">
          {item.body}
        </p>
        <div className="flex gap-6 border-t border-white/5 pt-6 mb-8">
          {item.ce_score > 0 && (
            <div>
              <div className="font-mono text-[7px] text-white/20 tracking-widest mb-1">
                {item.editor === 'NEXUS' ? 'GRID PULSE' : item.editor === 'DEXTER' ? 'LOADOUT GRADE' : 'CE SCORE'}
              </div>
              <div className="font-mono text-xl font-black" style={{ color: editor.color }}>
                {item.ce_score}
              </div>
            </div>
          )}
          {item.viral_score > 0 && (
            <div>
              <div className="font-mono text-[7px] text-white/20 tracking-widest mb-1">VIRAL SCORE</div>
              <div className="font-mono text-xl font-black text-cyan-400">{item.viral_score}</div>
            </div>
          )}
          {item.tags && item.tags.length > 0 && (
            <div className="ml-auto flex gap-2 items-center flex-wrap">
              {item.tags.map((tag, i) => (
                <span key={i} className="font-mono text-[8px] text-white/20 border border-white/10 px-3 py-1">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <a href="/" className="font-mono text-[9px] tracking-widest text-white/20 hover:text-red-600 transition-colors">{"← BACK TO THE GRID"}</a>
      </article>
      <Footer />
    </main>
  );
}