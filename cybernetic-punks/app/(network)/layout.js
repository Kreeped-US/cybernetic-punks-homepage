// app/(network)/layout.js
// Route-group layout for the NETWORK content pages (/about, /editors). Route groups
// (parens) do NOT change the URL -- these still serve /about and /editors.
//
// Gives them the shared network chrome: NetworkNav (games + Home/About/Editors, no
// Marathon game links) + NetworkFooter (no game-stats bar), inside the .cnp-root
// network identity (burgundy/black/gold, Chakra Petch) via CNP_CSS + networkFontVars.
//
// The ROOT layout (app/layout.js) still renders the global Marathon <Nav> +
// <LivePulseStrip>; a nested layout can add chrome but cannot remove the parent's,
// so those globals are suppressed for /about + /editors via isNetworkChrome()
// (components/Nav.js + components/LivePulseGate.js). This layout provides the
// replacement chrome; the pages render only their <main> content between.
import { CNP_CSS } from '@/lib/network/networkTheme';
import { networkFontVars } from '@/lib/network/networkFonts';
import NetworkNav from '@/components/network/NetworkNav';
import NetworkFooter from '@/components/network/NetworkFooter';

export default function NetworkLayout({ children }) {
  return (
    <div className={'cnp-root ' + networkFontVars}>
      <style>{CNP_CSS}</style>
      <div className="atmos" aria-hidden="true" />
      <NetworkNav />
      {children}
      <NetworkFooter />
    </div>
  );
}
