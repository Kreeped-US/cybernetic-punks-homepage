// lib/network/networkFonts.js
// The network v7 font stack (Chakra Petch / Inter / JetBrains Mono) as a REUSABLE loader for
// network pages OTHER than the homepage (/about next). The homepage keeps its OWN inline loaders
// on purpose: next/font hashes its generated class names by CALL SITE, so moving the homepage
// loaders here would change the homepage's rendered className hash -- a byte-identical regression.
// So the homepage stays byte-identical with its inline loaders, and this module serves the other
// network pages. next/font DEDUPES the actual woff2 files across call sites, so the duplicate
// loader is free at the network level; only the generated class names differ (invisibly).
//
// Usage on a network page: className={'cnp-root ' + networkFontVars} + <style>{CNP_CSS}</style>
// (CNP_CSS from lib/network/networkTheme.js).

import { Chakra_Petch, Inter, JetBrains_Mono } from 'next/font/google';

const chakra = Chakra_Petch({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--cnp-display', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--cnp-body', display: 'swap' });
const jbmono = JetBrains_Mono({ subsets: ['latin'], variable: '--cnp-mono', display: 'swap' });

export const networkFontVars = chakra.variable + ' ' + inter.variable + ' ' + jbmono.variable;
