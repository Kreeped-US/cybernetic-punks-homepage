import { supabase } from '@/lib/supabase';
import CreatorStrip from '@/components/CreatorStrip';
import NexusFeed from '@/components/NexusFeed';
import Top10Carousel from '@/components/Top10Carousel';
import DiscordBar from '@/components/DiscordBar';
import Footer from '@/components/Footer';

async function getData() {
  const [creatorsRes, feedRes, playsRes] = await Promise.all([
    supabase.from('creators').select('*').eq('is_active', true).order('ce_score', { ascending: false }),
    supabase.from('feed_items').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(10),
    supabase.from('plays').select('*').eq('is_active', true).order('rank', { ascending: true }).limit(10),
  ]);

  return {
    creators:  creatorsRes.data ?? [],
    feedItems: feedRes.data     ?? [],
    plays:     playsRes.data    ?? [],
  };
}

export default async function Home() {
  const { creators, feedItems, plays } = await getData();

  return (
    <main className="min-h-screen bg-black text-white pt-14">
      <CreatorStrip creators={creators} />
      <Top10Carousel plays={plays} />
      <NexusFeed items={feedItems} />
      <DiscordBar />
      <Footer />
    </main>
  );
}