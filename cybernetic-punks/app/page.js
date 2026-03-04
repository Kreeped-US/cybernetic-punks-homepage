import HeroBanner from '@/components/HeroBanner';
import WhatsNew from '@/components/WhatsNew';
import MetaPreview from '@/components/MetaPreview';
import BuildsSection from '@/components/BuildsSection';
import TopPlays from '@/components/TopPlays';
import CommunityPulse from '@/components/CommunityPulse';
import IntelFeed from '@/components/IntelFeed';
import EditorsStrip from '@/components/EditorsStrip';
import DiscordCTA from '@/components/DiscordCTA';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white pt-14">
      <HeroBanner />
      <WhatsNew />
      <MetaPreview />
      <BuildsSection />
      <TopPlays />
      <CommunityPulse />
      <IntelFeed />
      <EditorsStrip />
      <DiscordCTA />
      <Footer />
    </main>
  );
}