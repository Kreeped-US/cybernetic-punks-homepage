// components/DiscourseArticle.js
// GAME-NEUTRAL renderer for VANTAGE discourse articles. Branched in AHEAD of each
// subject game's own template -- /intel/[slug] (Marathon) and /dmz/[section]/[slug]
// (DMZ) -- so a discourse piece renders IDENTICALLY regardless of subject game,
// and the Marathon-coupled ArticlePage (stat-card injection, editor lanes,
// portraits) is never touched.
//
// Server component. Themed entirely by design tokens (var(--bg-page) etc.), so it
// adopts Marathon's :root palette under /intel and the .dmz-theme swap under /dmz
// automatically. The only literal color is the editor accent from the roster
// (item.editor -> getEditorDisplay), exactly as every other article renderer uses
// editor colors inline.
//
// HONESTY-PRESERVING: this only RENDERS an already-approved row. It attributes the
// piece to VANTAGE (the byline) and surfaces the vetted creator source link; it
// adds no claims. The body is VANTAGE's approved text, parsed for **bold** headers
// and inline [text](url) links + **bold** (the discourse bodies use markdown links
// the DMZ/Marathon body renderers do not handle -- supported here).

import Link from 'next/link';
import ViewTracker from '@/components/ViewTracker';
import { getEditorDisplay, editorByline, editorInitial } from '@/lib/editors/roster';
import { formatPublishDate, toISOWithPTOffset } from '@/lib/formatDate';
import { parseBody } from '@/lib/dmz/articleContent';
import { discourseHome } from '@/lib/discourse';

var CANONICAL_BASE = 'https://cyberneticpunks.com';
var EXO = 'var(--font-orbitron), system-ui, sans-serif';
var MONO = 'var(--font-mono), monospace';

function readTime(body) {
  if (!body) return '1 min read';
  var words = body.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200)) + ' min read';
}

// Platform label for the vetted source. Prefer the script-set source label
// (TWITCH/YOUTUBE/X/REDDIT); fall back to sniffing the URL. Generic otherwise.
function sourceLabelFor(item) {
  var s = (item.source || '').toUpperCase();
  if (s === 'TWITCH') return 'Twitch';
  if (s === 'YOUTUBE') return 'YouTube';
  if (s === 'X') return 'X';
  if (s === 'REDDIT') return 'Reddit';
  var u = (item.source_url || '').toLowerCase();
  if (u.indexOf('twitch') !== -1) return 'Twitch';
  if (u.indexOf('youtu') !== -1) return 'YouTube';
  if (u.indexOf('x.com') !== -1 || u.indexOf('twitter') !== -1) return 'X';
  if (u.indexOf('reddit') !== -1) return 'Reddit';
  return null;
}

// Inline renderer: **bold** -> <strong>, [text](url) -> external link, else text.
function InlineRich({ text, accent }) {
  var parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/);
  return (
    <>
      {parts.map(function (part, i) {
        var b = part.match(/^\*\*([^*]+)\*\*$/);
        if (b) return <strong key={i} style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{b[1]}</strong>;
        var l = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (l) {
          return (
            <a key={i} href={l[2]} target="_blank" rel="noopener noreferrer" style={{ color: accent, textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 600 }}>
              {l[1]}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function Body({ body, accent }) {
  var blocks = parseBody(body);
  return (
    <div>
      {blocks.map(function (blk) {
        if (blk.type === 'h2') {
          return (
            <div key={blk.key} style={{ margin: '36px 0 14px' }}>
              <h2 style={{ fontFamily: EXO, fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3, letterSpacing: 0.2 }}>{blk.text}</h2>
              <div style={{ width: 36, height: 2, background: accent, marginTop: 9, borderRadius: 1 }} />
            </div>
          );
        }
        if (blk.type === 'ul') {
          return (
            <ul key={blk.key} style={{ margin: '0 0 1.5em', padding: 0, listStyle: 'none' }}>
              {blk.items.map(function (item, li) {
                return (
                  <li key={li} style={{ position: 'relative', fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.65, margin: '0 0 0.7em', paddingLeft: 20 }}>
                    <span aria-hidden="true" style={{ position: 'absolute', left: 2, top: 1, color: accent, fontWeight: 800 }}>&rsaquo;</span>
                    <InlineRich text={item} accent={accent} />
                  </li>
                );
              })}
            </ul>
          );
        }
        if (blk.type === 'quote') {
          return (
            <blockquote key={blk.key} style={{ margin: '26px 0', padding: '6px 0 6px 22px', borderLeft: '3px solid ' + accent, fontFamily: EXO, fontSize: 20, fontWeight: 600, lineHeight: 1.45, color: 'var(--text-primary)' }}>
              <InlineRich text={blk.text} accent={accent} />
            </blockquote>
          );
        }
        return (
          <p key={blk.key} style={{ fontSize: 16, color: 'var(--text-primary)', lineHeight: 1.7, margin: '0 0 1.4em', maxWidth: '68ch' }}>
            <InlineRich text={blk.text} accent={accent} />
          </p>
        );
      })}
    </div>
  );
}

export default function DiscourseArticle({ item, ogImageUrl }) {
  var display = getEditorDisplay(item.editor);
  var accent = display ? display.color : '#c8d4e0';
  var byline = editorByline(item.editor) || item.editor;
  var role = display ? display.role : 'Network editor';
  var initial = editorInitial(item.editor);
  var pub = formatPublishDate(item.created_at);
  var rt = readTime(item.body);
  var tags = Array.isArray(item.tags) ? item.tags : [];
  var home = discourseHome(item.game_slug);
  var ci = item.creator_info || {};
  var srcLabel = sourceLabelFor(item);
  var canonical = CANONICAL_BASE + (item.game_slug === 'dmz' ? '/dmz/discourse/' : '/intel/') + item.slug;

  // Source-bar text: attribute to the vetted creator + platform when known.
  var sourcedText = ci.name
    ? ('Sourced from ' + ci.name + (srcLabel ? ' on ' + srcLabel : ''))
    : (srcLabel ? ('Sourced from the original ' + srcLabel + ' post') : 'Sourced from the original post');

  // Article JSON-LD (discourse is editorial COMMENTARY -- Article, not NewsArticle,
  // which mildly over-claims; Article is fully rich-result eligible). author = the
  // network editor as a Person (a byline is a person, not an org). publisher.logo is
  // intentionally OMITTED for now -- it needs a real, purpose-built static logo asset
  // (no icon-512.png exists; og-image.png is a social card, wrong purpose); add it
  // once public/logo.png exists. image is emitted ONLY when a per-route OG URL is
  // passed in (never a hardcoded /intel path on a DMZ page -- better no image than a
  // broken one). The `about` Person (the creator) stays minimal + from real profiles
  // only -- unchanged.
  var jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: item.headline,
    author: { '@type': 'Person', name: (display && display.fullName) ? display.fullName : byline, worksFor: { '@type': 'Organization', name: 'CyberneticPunks', url: CANONICAL_BASE } },
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: CANONICAL_BASE },
    datePublished: toISOWithPTOffset(item.created_at), dateModified: toISOWithPTOffset(item.created_at),
    url: canonical, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    keywords: tags.length ? tags.join(', ') : 'discourse',
    ...(ogImageUrl ? { image: { '@type': 'ImageObject', url: ogImageUrl } } : {}),
  };
  if (ci.name) {
    var sameAs = [ci.youtube, ci.x, ci.twitch, ci.other].filter(Boolean);
    jsonLd.about = { '@type': 'Person', name: ci.name };
    if (sameAs.length) jsonLd.about.sameAs = sameAs;
  }

  // BreadcrumbList JSON-LD -- mirrors the VISIBLE breadcrumb, game-neutral (reuses
  // `home`, so DMZ discourse renders "DMZ" not "Marathon"). The last crumb has no
  // `item` (it is the current page). Reads home.href as-is, so if the parked
  // discourseHome retarget lands later, this updates in lockstep.
  var breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Network', item: CANONICAL_BASE + '/' },
      { '@type': 'ListItem', position: 2, name: home.label, item: CANONICAL_BASE + home.href },
      { '@type': 'ListItem', position: 3, name: 'Discourse' },
    ],
  };

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '44px 16px 96px', color: 'var(--text-primary)' }}>
      <ViewTracker slug={item.slug} type="article" headline={item.headline} gameSlug={item.game_slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Breadcrumb: Network / <subject-game hub> / Discourse */}
      <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22, fontSize: 10, letterSpacing: 1.5, fontFamily: MONO, fontWeight: 700, flexWrap: 'wrap' }}>
        <Link href="/" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Network</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <Link href={home.href} style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>{home.label}</Link>
        <span style={{ color: 'var(--text-tertiary)', opacity: 0.4 }}>/</span>
        <span style={{ color: 'var(--text-secondary)' }}>Discourse</span>
      </nav>

      {/* Eyebrow: network-desk marker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', fontFamily: MONO, fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: accent, border: '1px solid ' + accent, borderRadius: 999, padding: '3px 11px' }}>Discourse</span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-tertiary)', letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase' }}>Network desk</span>
      </div>

      {/* Headline */}
      <h1 style={{ fontFamily: EXO, fontSize: 33, fontWeight: 800, letterSpacing: 0.2, color: 'var(--text-primary)', margin: '0 0 20px', lineHeight: 1.2 }}>
        {item.headline}
      </h1>

      {/* Byline row: initial badge + name + role/date/read-time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
        <div aria-hidden="true" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'var(--bg-card)', border: '1px solid ' + accent + '66', display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, fontSize: 16, fontWeight: 800, fontFamily: EXO }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontFamily: EXO, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: 0.2 }}>{byline}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: 0.5, fontWeight: 600, marginTop: 2 }}>
            {[role, pub, rt].filter(Boolean).join('  ·  ')}
          </div>
        </div>
      </div>

      {/* Source-attribution bar: the vetted creator source */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', margin: '18px 0 4px', padding: '10px 14px', borderRadius: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
        <span>
          {item.source_url ? (
            <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ color: accent, textDecoration: 'none', fontWeight: 600 }}>{sourcedText}</a>
          ) : (
            <span style={{ color: 'var(--text-primary)' }}>{sourcedText}</span>
          )}
          {' '}&mdash; characterized by the network desk. Views are the creator&apos;s.
        </span>
      </div>

      {/* Body */}
      <article style={{ marginTop: 26 }}>
        <Body body={item.body} accent={accent} />
      </article>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 30 }}>
          {tags.map(function (t) {
            return (
              <span key={t} style={{ fontSize: 9, color: 'var(--text-tertiary)', border: '1px solid var(--border)', background: 'var(--bg-card)', borderRadius: 2, padding: '3px 9px', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{t}</span>
            );
          })}
        </div>
      )}

      {/* Back link to the subject-game hub */}
      <div style={{ marginTop: 28 }}>
        <Link href={home.href} style={{ fontSize: 11, color: 'var(--text-tertiary)', textDecoration: 'none', letterSpacing: 1.5, fontFamily: MONO, fontWeight: 700 }}>
          &lt;- Back to {home.label}
        </Link>
      </div>
    </main>
  );
}
