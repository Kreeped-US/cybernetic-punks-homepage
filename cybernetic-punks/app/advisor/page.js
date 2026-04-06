import AdvisorClient from './AdvisorClient';
import CoachCTA from '@/components/CoachCTA';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'DEXTER Build Advisor — Marathon Loadout Generator',
  description: 'Tell DEXTER your Runner Shell, playstyle, and rank target. Get a personalized Marathon loadout — weapons, mods, cores, implants — engineered by AI and updated with live meta data.',
  keywords: 'Marathon build generator, Marathon loadout advisor, best Marathon builds, Marathon shell builds, DEXTER build advisor, Marathon mods cores implants',
  openGraph: {
    title: 'DEXTER Build Advisor — Personalized Marathon Loadout | CyberneticPunks',
    description: 'AI-engineered Marathon builds. Pick your shell, playstyle, and rank target. DEXTER does the rest.',
    url: 'https://cyberneticpunks.com/advisor',
    type: 'website',
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/advisor',
  },
};

export default function AdvisorPage() {
  return (
    <>
      <AdvisorClient />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 48px' }}>
        <CoachCTA variant="banner" />
      </div>
    </>
  );
}