// app/wardogs/arsenal/page.js
// The /wardogs/arsenal LIST. This static `arsenal` segment is introduced so its sibling
// `arsenal/[slug]` (the per-weapon DETAIL page) can exist; a static segment SHADOWS the dynamic
// `[section]` route for /wardogs/arsenal, so this file must serve the list or the page 404s.
//
// To avoid ANY behavior change (the image-led list REVAMP is a separate gated task), this simply
// re-runs the existing config-driven section renderer with section='arsenal' -- identical roster +
// noindex + schema as before. Replace this with the revamped roster in the list-revamp task.

import WardogsSectionPage, { generateMetadata as sectionMetadata } from '../[section]/page';

export const dynamic = 'force-dynamic';

const arsenalParams = { params: Promise.resolve({ section: 'arsenal' }) };

export function generateMetadata() { return sectionMetadata(arsenalParams); }
export default function WardogsArsenalListPage() { return WardogsSectionPage(arsenalParams); }
