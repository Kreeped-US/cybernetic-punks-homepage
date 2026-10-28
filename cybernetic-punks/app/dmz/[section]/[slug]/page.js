// app/dmz/[section]/[slug]/page.js
// DMZ article detail -- the shareable article template (applies to every DMZ
// article: the existing 3 + future). Replaces the earlier minimal renderer.
//
// The Marathon /intel/[slug] renderer is intentionally NOT reused -- it injects
// inline shell/weapon stat cards and assumes Marathon editorial data, which would
// re-couple DMZ to Marathon. This page has its OWN renderer (parseBody +
// extractKeyFacts in lib/dmz/articleContent.js) for the DMZ news body shape:
// **bold headers** -> real <h2>, "- " lists -> bullets, standalone "quoted" lines
// -> pull-quotes, paragraphs with inline **bold**.
//
// FONT: display type is Exo 2 (the brand's OG/icon face), loaded here via
// next/font/google scoped to this page (className on <main> exposes --font-exo2).
// Body copy inherits the site default. (Other DMZ pages still use Orbitron -- that
// font reconciliation is separate, already-flagged future work; not touched here.)
//
// SECTION param is GENUINE: each DMZ article is assigned to one section via
// DMZ_ARTICLE_SECTION (lib/games/dmz.js). 404s on unknown section, missing/
// unpublished article, or a section/article mismatch. Nothing crashes.
//
// ROBOTS: gated in app/dmz/layout.js on dmz.indexable (index vs noindex,follow).
// This page sets NO robots of its own, so it INHERITS that gate.
//
// Supabase read via the lazy anon Proxy (no module-scope createClient).
// force-dynamic: queried at request time.

import { supabase } from '@/lib/supabase';
import { dataOrThrow } from '@/lib/data/dataOrThrow';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { truncateMetaTitle } from '@/lib/seo/metaTitle';
import { Exo_2 } from 'next/font/google';
import { getGameSection } from '@/lib/games';
import { DMZ_ARTICLE_SEO, dmzSectionForArticle, dmz } from '@/lib/games/dmz';
import { isGameLive } from '@/lib/network/gameStatus';
import { showLaunchNotify } from '@/lib/network/launchCopy';
import { getEditorDisplay, editorByline, editorInitial } from '@/lib/editors/roster';
import { resolveArticleAuthorship } from '@/lib/authorEntity';
import ArticleProvenanceBadge from '@/components/network/ArticleProvenanceBadge';
import { formatPublishDate, toISOWithPTOffset } from '@/lib/formatDate';
import { parseBody, extractKeyFacts, stripMarkers, linkifyPoiSegments, linkifyArticleSegments } from '@/lib/dmz/articleContent';
import { isLinkEligibleParagraph } from '@/lib/content/linkEligibility';
import { relatedLinksFor } from '@/lib/relatedLinks';
import { fetchDmzLinkContent } from '@/lib/dmz/routeContentData';
import { fetchRelatedArticles, rankRelated } from '@/lib/relatedArticles';
import ToolCTA from '@/components/ToolCTA';
import { fetchPoiLinkTargets } from '@/lib/dmz/entities';
import DiscourseArticle from '@/components/DiscourseArticle';
import { isDiscourseArticle } from '@/lib/discourse';
import DmzShare from '../../DmzShare';
import DmzNotifyStrip from '@/components/dmz/DmzNotifyStrip';
import ViewTracker from '@/components/ViewTracker';
import Link from 'next/link';
import { safeJsonLd } from '@/lib/security/safeJsonLd';
import { safeHref } from '@/lib/security/safeHref';
import { sourceLabel } from '@/lib/content/sourceLabel';
import CutCard from '@/components/game/CutCard';
import HubPageHeader, { HUB_PAGE_CSS } from '@/components/game/HubPageHeader';
import { HUB_KIT_CSS } from '@/components/game/hubKitCss';
import { DMZ_HUB_VARS } from '@/lib/dmz/hubTheme';

export const dynamic = 'force-dynamic';

// Exo 2 for display type, scoped to this page (variable exposed on <main>).
const exo2 = Exo_2({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-exo2', display: 'swap' });
var EXO = 'var(--font-exo2), system-ui, sans-serif';

var DMZ_GAME_SLUG = 'dmz';
var CANONICAL_BASE = 'https://cyberneticpunks.com';
// Publisher named in the "Sourced from ..." bar; the noun (blog / patch notes) comes from the article's
// source_url via lib/content/sourceLabel.js (Brief 198).
var SOURCE_PUBLISHER = 'Call of Duty';

// Brief 208: the article page is on the hub kit (components/game: HubPageHeader, CutCard, hubKitCss; DMZ values for
// the --hk-* properties from lib/dmz/hubTheme.js), like the section pages. DMZ-only rules for this page below. The
// reading column is 760px (about 72ch at 17px) inside the 1160px container, left-aligned with the header. No text
// under 12px. Body text #d5dae0 on the ground; meta and labels --hk-soft; links and accents --hk-accent-text. Long
// unbroken strings (the URLs in a "Sources:" line) may break anywhere, so a phone never scrolls sideways.
var ARTICLE_CSS = `
.dmza-crumb{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.dmza-crumb-sep{opacity:.6}
.dmza-kicker{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.dmza-kicker .hk-tag{font-size:12px}
.dmza-kick{font-size:12px;font-weight:700;color:var(--hk-soft)}
.dmza-by{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:6px}
.dmza-av{width:40px;height:40px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--hk-card);font-size:16px;font-weight:800}
.dmza-name{font-size:15px;font-weight:700;color:var(--hk-text)}
.dmza-meta{margin-top:2px;font-size:13px;font-weight:600;letter-spacing:.04em;color:var(--hk-soft)}
.dmza-col{max-width:760px}
.dmza-col p,.dmza-col li,.dmza-src{overflow-wrap:anywhere}
.hk-cut.dmza-cred{padding:16px 20px;margin:0 0 20px}
.dmza-cred-a{display:flex;align-items:flex-start;gap:12px;flex-wrap:wrap;justify-content:space-between}
.dmza-cred-txt{flex:1 1 260px;min-width:0}
.dmza-rcpt{font-size:13px;color:var(--hk-text)}
.dmza-disc{margin-top:3px;font-size:13px;font-style:italic;color:var(--hk-soft)}
.dmza-prov{margin-top:8px}
.dmza-prov .coc-badge span{font-size:12px !important}
.dmza-prov a{font-size:12px !important;width:20px !important;height:20px !important}
.dmza-src{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:14px;padding-top:12px;border-top:1px solid var(--hk-line);font-size:14px;color:var(--hk-soft)}
.dmza-dot{width:6px;height:6px;border-radius:50%;background:var(--hk-accent);flex-shrink:0}
.dmza-src a{color:var(--hk-accent-text);font-weight:600;text-decoration:none}
.dmza-src-plain{color:var(--hk-text)}
.hk-cut.dmza-kf{padding:18px 22px;margin:0 0 8px;box-shadow:inset 3px 0 0 var(--hk-accent),inset 0 0 0 1px var(--hk-line)}
.dmza-kf-h{margin:0 0 12px;font:700 12px/1.3 monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--hk-accent-text)}
.dmza-kf ul{margin:0;padding:0;list-style:none}
.dmza-kf li{position:relative;padding-left:20px;font-size:15px;line-height:1.6;color:var(--hk-text)}
.dmza-kf li+li{margin-top:8px}
.dmza-body{margin-top:28px}
.dmza-p{margin:0 0 1.35em;font-size:17px;line-height:1.7;color:#d5dae0}
.dmza-h2{margin:40px 0 14px}
.dmza-h2 h2{margin:0;font-size:24px;font-weight:800;line-height:1.3;color:var(--hk-text)}
.dmza-h2bar{width:40px;height:3px;margin-top:10px;background:var(--hk-accent)}
.dmza-ul{margin:0 0 1.5em;padding:0;list-style:none}
.dmza-ul li{position:relative;margin:0 0 .75em;padding-left:22px;font-size:17px;line-height:1.65;color:#d5dae0}
.dmza-mk{position:absolute;left:2px;top:0;font-weight:800;color:var(--hk-accent-text)}
.dmza-kf .dmza-mk{left:0}
.dmza-q{margin:28px 0;padding:6px 0 6px 22px;border-left:3px solid var(--hk-accent);font-size:21px;font-weight:600;line-height:1.45;color:var(--hk-text)}
.dmza-qm{color:var(--hk-accent-text)}
.dmza-strong{font-weight:700;color:var(--hk-text)}
.hk a.dmza-link{color:var(--hk-accent-text);text-decoration:underline;text-underline-offset:2px}
.dmza-blk{margin-top:32px;padding-top:16px;border-top:1px solid var(--hk-line)}
.dmza-blk-h{margin:0 0 10px;font:700 12px/1.3 monospace;letter-spacing:.14em;color:var(--hk-soft)}
.dmza-chips{display:flex;gap:10px;flex-wrap:wrap}
.hk .dmza-chip{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border:1px solid var(--hk-line);box-shadow:inset 3px 0 0 var(--hk-accent);font-size:14px;font-weight:700;color:var(--hk-text);text-decoration:none}
.dmza-rr{list-style:none;margin:0;padding:0}
.hk .dmza-rr a{display:inline-flex;align-items:center;min-height:44px;font-size:15px;font-weight:600;color:var(--hk-text);text-decoration:none}
.dmza-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:30px}
.dmza-tag{padding:4px 10px;border:1px solid var(--hk-line);background:var(--hk-card);font:700 12px/1.3 monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--hk-soft)}
.hk .dmza-back{display:inline-flex;align-items:center;min-height:44px;margin-top:24px;font:700 13px/1 monospace;letter-spacing:.1em;color:var(--hk-soft);text-decoration:none}
`;

async function fetchArticle(slug) {
  // select('*') so operator_approved_at (Brief 2e) is read whether or not the column exists yet -- no
  // deploy-ordering hazard (missing column reads as legacy). Matches marathon-intel. LOUD FAILURE: a
  // real read error THROWS (-> Next default 500, crawler-retryable) instead of the old swallow-to-null
  // that turned a transient blip into a 404 for a live indexable article; a genuine miss still returns
  // null -> notFound() (404), unchanged.
  var res = await supabase
    .from('feed_items')
    .select('*')
    .eq('slug', slug)
    .eq('game_slug', DMZ_GAME_SLUG)
    .eq('is_published', true)
    .maybeSingle();
  return dataOrThrow(res, 'dmz article (slug=' + slug + ')', null);
}

function readTime(body) {
  if (!body) return '1 min read';
  var words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200)) + ' min read';
}

function metaDescription(body, fallback) {
  if (!body) return fallback;
  // Strip inline [text](url) links (discourse bodies use them; DMZ news bodies do
  // not, so this is a no-op for existing articles) THEN the **bold** markers.
  var text = stripMarkers(body.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')).replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  if (text.length <= 155) return text;
  var cut = text.slice(0, 155);
  var sp = cut.lastIndexOf(' ');
  if (sp > 0) cut = cut.slice(0, sp);
  return cut.replace(/\s+$/, '') + '...';
}

export async function generateMetadata({ params }) {
  var p = await params;
  var section = getGameSection('dmz', p.section);
  var article = await fetchArticle(p.slug);
  if (!section || !article || dmzSectionForArticle(article) !== section.slug) {
    return { title: 'DMZ - Not Found' };
  }
  // Authored SEO overrides (lib/games/dmz.js) preferred; fall back to the
  // headline title + auto-truncated meta for any unmapped slug. The "-- DMZ"
  // suffix is dropped (headlines already lead with "DMZ"); the root
  // title.template appends " | Cybernetic Punks".
  var seo = DMZ_ARTICLE_SEO[article.slug] || null;
  var title = seo && seo.title ? seo.title : article.headline;
  var description = seo && seo.description ? seo.description : metaDescription(article.body, article.headline);
  var canonical = CANONICAL_BASE + '/dmz/' + section.slug + '/' + article.slug;
  // NO robots key -> inherits the dmz layout's robots gate (dmz.indexable).
  // openGraph/twitter override the Marathon-branded root defaults so shared DMZ
  // links carry the article's own title/description; the per-article DMZ OG image
  // comes from the sibling opengraph-image.js (Next wires og:image automatically).
  return {
    // Suffix dropped (`absolute` bypasses the root '%s | Cybernetic Punks'
    // template). DMZ article titles are keyword-competitive in exactly the way
    // /intel articles are, so they follow the same rule: the 18-char suffix is
    // budget spent branding a domain the SERP already shows.
    // SERP <title> smart-truncated to <=60 chars; the on-page H1 keeps the full headline.
    title: { absolute: truncateMetaTitle(title) },
    description: description,
    alternates: { canonical: canonical },
    openGraph: {
      title: title,
      description: description,
      url: canonical,
      siteName: 'Cybernetic Punks',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@Cybernetic87250',
      title: title,
      description: description,
    },
  };
}

// Canonical DMZ system -> its explainer article. Drives the render-time in-prose
// cross-linker (linkifyArticleSegments), a parallel pass to the POI linkifier. Names
// are matched longest-first, whole-word, case-sensitive, first-mention-only; an
// article NEVER links its own system (SELF-SKIP in articleLinkEntries). Two names may
// map to the same article ("Forward Operating Base"/"FOB", "Story Missions"/"Dynamic
// Operations") -- dedupe is by target slug, so that article links at most once.
// section + slug MUST match DMZ_ARTICLE_SECTION (lib/games/dmz.js).
var DMZ_SYSTEM_LINKS = [
  { name: 'Forward Operating Base', section: 'fob',         slug: 'dmz-forward-operating-base-every-hub-system-detailed' },
  { name: 'Weapon Vendor',          section: 'field-intel', slug: 'dmz-weapon-vendor' },
  { name: 'Dynamic Operations',     section: 'field-intel', slug: 'dmz-missions' },
  { name: 'Story Missions',         section: 'field-intel', slug: 'dmz-missions' },
  { name: '3D Printer',             section: 'loadouts',    slug: 'dmz-3d-printer-crafting-system-every-category-detailed' },
  { name: 'Tourniquet',             section: 'field-intel', slug: 'dmz-survival' },
  { name: 'Gunsmith',               section: 'field-intel', slug: 'dmz-gunsmith' },
  { name: 'Hajin',                  section: 'regions',     slug: 'dmz-hajin-exclusion-zone-what-the-deep-dive-reveals' },
  { name: 'FOB',                    section: 'fob',         slug: 'dmz-forward-operating-base-every-hub-system-detailed' },
  { name: 'MIA',                    section: 'field-intel', slug: 'dmz-survival' },
  // A non-article target (static explainer page): href overrides the built article route.
  { name: 'Bounty Leaderboard',     href: '/dmz/bounties',  slug: 'dmz-bounties' },
  // Same target, two more names (case-sensitive, whole word): "Bounty Station" (singular only; the
  // plural "Bounty Stations" is not a whole-word match) and the official term "Most Wanted". Dedupe is
  // by slug, so the bounties page is linked at most once per article: in the first prose span that
  // holds any of the three names (within one span the longest name wins).
  { name: 'Bounty Station',         href: '/dmz/bounties',  slug: 'dmz-bounties' },
  { name: 'Most Wanted',            href: '/dmz/bounties',  slug: 'dmz-bounties' },
  // Boss Board dossier page (static): the station and the two Commanders whose names are unique. "Commander"
  // and "Tank" are deliberately NOT link phrases (generic words). One link per article (shared slug).
  { name: 'Boss Board',             href: '/dmz/bosses',    slug: 'dmz-bosses' },
  { name: 'Colossus',               href: '/dmz/bosses',    slug: 'dmz-bosses' },
  { name: 'Deathstalker',           href: '/dmz/bosses',    slug: 'dmz-bosses' },
];

// Build the cross-link entries for ONE article: SELF-SKIP (drop any entry whose target
// is this very article -- so the Gunsmith article never linkifies "Gunsmith"), attach
// the route, and sort LONGEST-NAME-FIRST so "Forward Operating Base" is matched before
// "FOB" and "Weapon Vendor" is never partially caught.
function articleLinkEntries(currentSlug) {
  return DMZ_SYSTEM_LINKS
    .filter(function (e) { return e.slug !== currentSlug; })
    .map(function (e) { return { name: e.name, slug: e.slug, href: e.href || ('/dmz/' + e.section + '/' + e.slug) }; })
    .sort(function (a, b) { return b.name.length - a.name.length; });
}

// A plain (non-bold) text span. Two render-time linkify passes over the same text:
//   1. POI names  -> /dmz/pois/<slug>        (linkifyPoiSegments)
//   2. DMZ systems -> /dmz/<section>/<slug>   (linkifyArticleSegments)
// Pass 2 runs ONLY on the TEXT segments left by pass 1, so a term already POI-linked is
// never re-wrapped (no collision). Bold spans are handled by the caller and never
// passed here, so a name inside **bold** is never linked. Any/all of poiEntries/
// articleEntries may be absent. Headers and pull-quotes never reach this (prose + list
// items only).
function PlainSpan({ text, poiEntries, linked, articleEntries, articleLinked }) {
  var hasPoi = poiEntries && poiEntries.length > 0;
  var hasArticle = articleEntries && articleEntries.length > 0;
  if (!hasPoi && !hasArticle) return <>{text}</>;

  var poiSegs = hasPoi ? linkifyPoiSegments(text, poiEntries, linked) : [{ type: 'text', value: text == null ? '' : String(text) }];
  var segs = [];
  for (var i = 0; i < poiSegs.length; i++) {
    var ps = poiSegs[i];
    if (ps.type !== 'text' || !hasArticle) { segs.push(ps); continue; }
    var aSegs = linkifyArticleSegments(ps.value, articleEntries, articleLinked);
    for (var k = 0; k < aSegs.length; k++) segs.push(aSegs[k]);
  }

  return (
    <>
      {segs.map(function (seg, j) {
        if (seg.type === 'link') {
          return (
            <Link key={j} href={'/dmz/pois/' + seg.slug} className="dmza-link">
              {seg.value}
            </Link>
          );
        }
        if (seg.type === 'alink') {
          return (
            <Link key={j} href={seg.href} className="dmza-link">
              {seg.value}
            </Link>
          );
        }
        return <span key={j}>{seg.value}</span>;
      })}
    </>
  );
}

// Inline **bold** -> <strong>; plain runs pass through PlainSpan (POI + article linkify).
function InlineBold({ text, poiEntries, linked, articleEntries, articleLinked }) {
  var parts = text.split(/(\*\*[^*]+\*\*)/);
  return (
    <>
      {parts.map(function (part, i) {
        var m = part.match(/^\*\*([^*]+)\*\*$/);
        if (m) return <strong key={i} className="dmza-strong">{m[1]}</strong>;
        return <PlainSpan key={i} text={part} poiEntries={poiEntries} linked={linked} articleEntries={articleEntries} articleLinked={articleLinked} />;
      })}
    </>
  );
}

// Render the parsed body blocks: real h2 / bullet list / pull-quote / paragraph.
// `poiEntries` (longest-name-first) drives the POI linkifier; `articleEntries`
// (longest-name-first, self-skipped) drives the article cross-linker. `linked` /
// `articleLinked` are ONE Set each per article so each POI and each target article
// link at most once, in document order. Headers and pull-quotes are intentionally NOT
// linkified -- body prose and list items only. A "Sources:" paragraph or item is ineligible
// (isLinkEligibleParagraph): it renders with no linkers, so it never uses a first-mention slot.
function ArticleBody({ body, poiEntries, articleEntries }) {
  var blocks = parseBody(body);
  var linked = poiEntries && poiEntries.length ? new Set() : null;
  var articleLinked = articleEntries && articleEntries.length ? new Set() : null;
  function poiFor(text) { return isLinkEligibleParagraph(text) ? poiEntries : null; }
  function articleFor(text) { return isLinkEligibleParagraph(text) ? articleEntries : null; }
  return (
    <div>
      {blocks.map(function (b) {
        if (b.type === 'h2') {
          return (
            <div key={b.key} className="dmza-h2">
              <h2>
                {b.text}
              </h2>
              <div className="dmza-h2bar" />
            </div>
          );
        }
        if (b.type === 'ul') {
          return (
            <ul key={b.key} className="dmza-ul">
              {b.items.map(function (item, li) {
                return (
                  <li key={li}>
                    <span aria-hidden="true" className="dmza-mk">›</span>
                    <InlineBold text={item} poiEntries={poiFor(item)} linked={linked} articleEntries={articleFor(item)} articleLinked={articleLinked} />
                  </li>
                );
              })}
            </ul>
          );
        }
        if (b.type === 'quote') {
          return (
            <blockquote key={b.key} className="dmza-q">
              <span className="dmza-qm">&ldquo;</span>{b.text}<span className="dmza-qm">&rdquo;</span>
            </blockquote>
          );
        }
        return (
          <p key={b.key} className="dmza-p">
            <InlineBold text={b.text} poiEntries={poiFor(b.text)} linked={linked} articleEntries={articleFor(b.text)} articleLinked={articleLinked} />
          </p>
        );
      })}
    </div>
  );
}

export default async function DmzArticlePage({ params }) {
  var p = await params;
  var section = getGameSection('dmz', p.section);
  if (!section) notFound();

  var article = await fetchArticle(p.slug);
  if (!article) notFound();
  if (dmzSectionForArticle(article) !== section.slug) notFound();

  // VANTAGE discourse pieces render via the game-neutral DiscourseArticle renderer
  // (the same one /intel uses), not the DMZ news template. Canonical home is
  // /dmz/discourse/<slug> for a dmz-subject discourse piece.
  if (isDiscourseArticle(article)) {
    return <DiscourseArticle item={article} ogImageUrl={'https://cyberneticpunks.com/dmz/discourse/' + article.slug + '/opengraph-image'} />;
  }

  // Launch-email strip: read the dismissal cookie server-side so a dismissed strip
  // is never rendered (no hydration flash / flicker-in-then-out).
  var cookieStore = await cookies();
  var notifyCookie = cookieStore.get('dmz_notify_dismissed');
  var notifyDismissed = notifyCookie ? notifyCookie.value === '1' : false;

  var display = getEditorDisplay(article.editor);
  var editorColor = display ? display.color : '#888';
  var byline = editorByline(article.editor) || article.editor;
  var role = display ? display.role : '';
  var initial = editorInitial(article.editor);
  var pubDate = formatPublishDate(article.created_at);
  var rt = readTime(article.body);
  var tags = Array.isArray(article.tags) ? article.tags : [];
  // Tag-driven Related links (live tool/hub routes). Brief 175: routes with no entries are left out
  // (fetchDmzLinkContent, shared per request with the footer; fail-closed).
  var related = relatedLinksFor('dmz', tags, await fetchDmzLinkContent());
  // Related reading: sibling ARTICLE links (reciprocal internal links). Section is DERIVED via
  // dmzSectionForArticle (same mechanism this route uses for its own canonical); null-section
  // candidates are dropped. Fetch failure -> [] (non-essential; still renders).
  var relCandidates = (await fetchRelatedArticles(supabase, 'dmz', article))
    .map(function (c) { return Object.assign({}, c, { section: dmzSectionForArticle(c) }); })
    .filter(function (c) { return c.section; });
  var relatedReading = rankRelated({ id: article.id, slug: article.slug, tags: tags, section: section.slug }, relCandidates, { max: 5 })
    .map(function (c) { return { href: '/dmz/' + c.section + '/' + c.slug, headline: c.headline }; });

  // POI linkify targets (spoke 2): live dmz_pois rows, longest-name-first. Fetched
  // only for the news template (past the discourse early-return above). Empty/failed
  // read -> [] -> the body renders as plain text (no links).
  var poiEntries = await fetchPoiLinkTargets();

  // Authored SEO overrides (lib/games/dmz.js) preferred; fall back to the
  // render-time derivations for unmapped slugs. keyFacts null-hides as before.
  var seo = DMZ_ARTICLE_SEO[article.slug] || null;
  var keyFacts = (seo && Array.isArray(seo.keyFacts) && seo.keyFacts.length > 0)
    ? seo.keyFacts
    : extractKeyFacts(article.body);
  var description = seo && seo.description ? seo.description : metaDescription(article.body, article.headline);

  var canonical = CANONICAL_BASE + '/dmz/' + section.slug + '/' + article.slug;

  // NewsArticle JSON-LD -- mirrors the /intel Article shape (author + publisher +
  // datePublished helper + mainEntityOfPage), DMZ-branded, @type NewsArticle.
  // headline = DB headline (not the SEO title); author mirrors /intel exactly (the
  // editor codename byline is an intentional public byline). The DMZ article page
  // carries no other JSON-LD, so this is the only block.
  // Brief 2e: author/receipt honesty split -- Justin only on rows he individually approved.
  var auth = resolveArticleAuthorship(article);
  var jsonLd = {
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: article.headline,
    description: description,
    author: auth.author,
    ...(auth.reviewedBy ? { reviewedBy: auth.reviewedBy } : {}),
    publisher: auth.publisher,
    // dateModified = updated_at (created_at fallback), matching the DMZ sitemap lastmod (lib/sitemap/eligible.js).
    datePublished: toISOWithPTOffset(article.created_at), dateModified: toISOWithPTOffset(article.updated_at || article.created_at),
    url: canonical, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    keywords: article.tags ? article.tags.join(', ') : 'DMZ, Call of Duty',
  };

  return (
    <main className={'hk ' + exo2.variable} style={Object.assign({ fontFamily: EXO }, DMZ_HUB_VARS)}>
      <style dangerouslySetInnerHTML={{ __html: HUB_KIT_CSS + HUB_PAGE_CSS + ARTICLE_CSS }} />
      <ViewTracker slug={article.slug} type="article" headline={article.headline} gameSlug="dmz" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      {/* BreadcrumbList JSON-LD -- matches the VISIBLE breadcrumb below exactly
          (Network / DMZ / <section>). Discourse articles render via DiscourseArticle,
          which emits its own breadcrumb, so this news template is the only DMZ-article
          path that needed one. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Network', item: 'https://cyberneticpunks.com/' },
          { '@type': 'ListItem', position: 2, name: 'DMZ', item: 'https://cyberneticpunks.com/dmz' },
          { '@type': 'ListItem', position: 3, name: section.label, item: 'https://cyberneticpunks.com/dmz/' + section.slug },
        ],
      }) }} />
      {/* HEADER (hub kit): 1. breadcrumb eyebrow; then the launch-email strip and 2. the DMZ tag + kicker;
          3. the headline (the H1, compact size); 4. byline: avatar, name, date and read time. */}
      <HubPageHeader
        compact
        eyebrow={
          <nav aria-label="Breadcrumb" className="dmza-crumb">
            <Link href="/">Network</Link>
            <span className="dmza-crumb-sep">/</span>
            <Link href="/dmz">DMZ</Link>
            <span className="dmza-crumb-sep">/</span>
            <Link href={'/dmz/' + section.slug}>{section.label}</Link>
          </nav>
        }
        top={
          <>
            {/* Launch-email capture strip (article surface). Server-gated by the dismissal
                cookie above -> not rendered at all once dismissed (no hydration flash), and by
                showLaunchNotify(dmz) -> not rendered at all once DMZ is live. */}
            {!notifyDismissed && showLaunchNotify(dmz) && <DmzNotifyStrip />}
            <div className="dmza-kicker">
              <span className="hk-tag">DMZ</span>
              <span className="dmza-kick hk-mono">
                {/news$/i.test(section.label) ? section.label : section.label + ' · news'}
              </span>
            </div>
          </>
        }
        title={article.headline}
      >
        <div className="dmza-by">
          <div className="dmza-av" style={{ border: '1px solid ' + editorColor + '66', color: editorColor }}>{initial}</div>
          <div>
            <div className="dmza-name">{byline}</div>
            <div className="dmza-meta hk-mono">
              {[pubDate, rt].filter(Boolean).join('  ·  ')}
            </div>
          </div>
        </div>
      </HubPageHeader>

      <div className="hk-pw">
        <div className="dmza-col">
          {/* One card, two rows: the authorship receipt, AI disclosure, provenance badge and share icons; then
              the source line. Same content and order as before (they ended the byline row, then the source bar). */}
          <CutCard className="dmza-cred">
            <div className="dmza-cred-a">
              <div className="dmza-cred-txt">
                {/* Authorship receipt (Brief 2e): only on rows Justin individually approved (approval
                    date); legacy/auto rows show no receipt. AI disclosure shows on BOTH. */}
                {auth.receipt && <div className="dmza-rcpt">{auth.receipt}</div>}
                <div className="dmza-disc">{auth.disclosure}</div>
                {/* Chain of Custody tier badge (Brief 2b): renders from provenance_tier; null -> nothing. */}
                <div className="dmza-prov"><ArticleProvenanceBadge tier={article.provenance_tier} /></div>
              </div>
              <DmzShare url={canonical} title={article.headline} mode="row" />
            </div>
            {/* 5. Source-attribution line */}
            <div className="dmza-src">
              <span aria-hidden="true" className="dmza-dot" />
              <span>
                Sourced from{' '}
                {safeHref(article.source_url) ? (
                  <a href={safeHref(article.source_url)} target="_blank" rel="noopener noreferrer">
                    {sourceLabel(SOURCE_PUBLISHER, article.source_url)}
                  </a>
                ) : (
                  <span className="dmza-src-plain">{sourceLabel(SOURCE_PUBLISHER, article.source_url)}</span>
                )}
                {article.source ? ' · ' + article.source : ''}
              </span>
            </div>
          </CutCard>

          {/* 6. KEY FACTS callout (hidden entirely when extraction yields nothing usable) */}
          {keyFacts && (
            <CutCard className="dmza-kf">
              <div className="dmza-kf-h">
                Key facts
              </div>
              <ul>
                {keyFacts.map(function (fact, i) {
                  return (
                    <li key={i}>
                      <span aria-hidden="true" className="dmza-mk">›</span>
                      {fact}
                    </li>
                  );
                })}
              </ul>
            </CutCard>
          )}

          {/* 7. Body */}
          <article className="dmza-body">
            <ArticleBody body={article.body} poiEntries={poiEntries} articleEntries={articleLinkEntries(article.slug)} />
          </article>

          {/* Game-agnostic build-tool CTA. dmz.buildToolCta is null today -> renders
              nothing; auto-lights when DMZ gets a tool + entities (config edit only). */}
          <ToolCTA article={article} />

          {/* Related: tag-driven links to DMZ's live tools/hubs (deduped, <=4; hidden when empty). */}
          {related.length > 0 && (
            <div className="dmza-blk">
              <div className="dmza-blk-h">RELATED</div>
              <div className="dmza-chips">
                {related.map(function (r) {
                  return <Link key={r.href} href={r.href} className="dmza-chip">{r.label}</Link>;
                })}
              </div>
            </div>
          )}

          {/* Related reading: sibling-article links (dofollow; hidden when empty). */}
          {relatedReading.length > 0 && (
            <div className="dmza-blk">
              <div className="dmza-blk-h">RELATED READING</div>
              <ul className="dmza-rr">
                {relatedReading.map(function (r) {
                  return <li key={r.href}><Link href={r.href}>{r.headline}</Link></li>;
                })}
              </ul>
            </div>
          )}

          {/* 8. Tags */}
          {tags.length > 0 && (
            <div className="dmza-tags">
              {tags.map(function (t) {
                return <span key={t} className="dmza-tag">{t}</span>;
              })}
            </div>
          )}

          {/* 9. Bottom share CTA */}
          <DmzShare url={canonical} title={article.headline} mode="cta" live={isGameLive(dmz)} />

          {/* Back link */}
          <Link href={'/dmz/' + section.slug} className="dmza-back">
            &lt;- Back to {section.label}
          </Link>
        </div>
      </div>
    </main>
  );
}
