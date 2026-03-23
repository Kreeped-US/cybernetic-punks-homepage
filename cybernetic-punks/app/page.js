import HeroBanner from '@/components/HeroBanner';
import DevTicker from '@/components/DevTicker';
import WhatsNew from '@/components/WhatsNew';
import MetaPreview from '@/components/MetaPreview';
import BuildsSection from '@/components/BuildsSection';
import TopPlays from '@/components/TopPlays';
import TwitchLive from '@/components/TwitchLive';
import CommunityPulse from '@/components/CommunityPulse';
import IntelFeed from '@/components/IntelFeed';
import EditorsStrip from '@/components/EditorsStrip';
import DiscordCTA from '@/components/DiscordCTA';
import Footer from '@/components/Footer';
import UsageCounterStrip from '@/components/UsageCounterStrip';
import FeaturedThisCycle from '@/components/FeaturedThisCycle';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white pt-24">
      <DevTicker />
      <HeroBanner />
      <UsageCounterStrip />
      <FeaturedThisCycle />
      <WhatsNew />
      <MetaPreview />
      <BuildsSection />
      <TopPlays />
      <TwitchLive />
      <CommunityPulse />
      <IntelFeed />
      <EditorsStrip />
      <DiscordCTA />
      <Footer />
    </main>
  );
}
