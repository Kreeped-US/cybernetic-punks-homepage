// components/LivePulseStrip.js
// Server component. Fetches live stats and hands them to a client gate that
// decides whether to render (hidden on the homepage, which has its own richer
// top strip). Rendered site-wide from layout.js above the footer.

import { getLiveStats } from '@/lib/liveStats';
import LivePulseGate from './LivePulseGate';

export default async function LivePulseStrip() {
  var stats = await getLiveStats();
  return <LivePulseGate stats={stats} />;
}