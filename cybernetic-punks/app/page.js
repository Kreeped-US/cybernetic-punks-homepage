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
import FeaturedArticle from '@/components/FeaturedArticle';
import ShellPortraitStrip from '@/components/ShellPortraitStrip';
import MetaWeaponShowcase from '@/components/MetaWeaponShowcase';
import SectionDivider from '@/components/SectionDivider';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white pt-24">
      <DevTicker />
      <HeroBanner />
      <UsageCounterStrip />
      <FeaturedArticle />
      <SectionDivider label="RUNNER SHELLS" />
      <ShellPortraitStrip />
      <SectionDivider label="FEATURED THIS CYCLE" />
      <FeaturedThisCycle />
      <SectionDivider label="LATEST INTEL" />
      <WhatsNew />
      <SectionDivider label="META INTELLIGENCE" />
      <MetaPreview />
      <MetaWeaponShowcase />
      <SectionDivider label="BUILD LAB" />
      <BuildsSection />
      <SectionDivider label="TOP PLAYS" />
      <TopPlays />
      <TwitchLive />
      <SectionDivider label="COMMUNITY PULSE" />
      <CommunityPulse />
      <SectionDivider label="INTEL FEED" />
      <IntelFeed />
      <SectionDivider label="THE EDITORS" />
      <EditorsStrip />
      <DiscordCTA />
      <Footer />
    </main>
  );
}
