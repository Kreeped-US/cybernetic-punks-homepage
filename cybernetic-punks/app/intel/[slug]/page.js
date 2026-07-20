import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { getUserAvatars } from '@/lib/gather/twitch';
import Footer from '@/components/Footer';
import CoachCTA from '@/components/CoachCTA';
import { Sep } from '@/components/Sep';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEditorDisplay, editorByline, editorInitial, editorHasPortrait } from '@/lib/editors/roster';
import { formatPublishDate, toISOWithPTOffset } from '@/lib/formatDate';
import ViewTracker from '@/components/ViewTracker';
import DiscourseArticle from '@/components/DiscourseArticle';
import { isDiscourseArticle } from '@/lib/discourse';

// Display rename (editor rework Step 3). Visible editor identity routes through
// the canonical map: editorByline() for full bylines ("Marcus Vane / Cipher";
// Miranda -> "Miranda Malini"); edTag() for compact labels. Null-safe -> raw
// key, never a silent Cipher. KEYS (item.editor, EDITORS/EDITOR_STYLES routing,
// JSON-LD author) are untouched.
function edTag(key) { var d = getEditorDisplay(key); return d ? (d.tag || d.fullName) : key; }
function edRole(key) { var d = getEditorDisplay(key); return d ? d.role : ''; }
function edSymbol(key) { var d = getEditorDisplay(key); return d ? d.symbol : ''; }
function edColor(key) { var d = getEditorDisplay(key); return d ? d.color : '#888'; }

const EDITORS = {
  cipher:  { name: 'CIPHER',  symbol: '◈', color: '#ff2222', role: 'Play Analyst',    desc: 'Watches Marathon gameplay and tells you exactly what went right and wrong. Every play gets a Runner Grade from D to S+.', metaTitle: 'CIPHER — Marathon Play Analysis & Competitive Grades',  metaDesc: 'AI-powered Marathon gameplay analysis. Every play graded D to S+ with transcript breakdowns.' },
  nexus:   { name: 'NEXUS',   symbol: '⬡', color: '#00d4ff', role: 'Meta Strategist', desc: 'Tracks what weapons and strategies are actually winning right now.', metaTitle: 'NEXUS — Marathon Meta Tracking & Strategy Intel',  metaDesc: 'Live Marathon meta intelligence. What weapons and loadouts are winning — tracked throughout the day.' },
  ghost:   { name: 'GHOST',   symbol: '◇', color: '#00ff88', role: 'Community Pulse', desc: "Reads Reddit and Discord so you don't have to scroll all day.", metaTitle: 'GHOST — Marathon Community Sentiment & Player Pulse', metaDesc: 'What Marathon players actually think. Community sentiment from Reddit and Discord.' },
  dexter:  { name: 'DEXTER',  symbol: '⬢', color: '#ff8800', role: 'Build Engineer',  desc: 'Tests loadouts and tells you what to run before you drop in.', metaTitle: 'DEXTER — Marathon Build Analysis & Loadout Grades', metaDesc: 'Best Marathon builds and loadouts graded F to S.' },
  miranda: { name: 'MIRANDA', symbol: '◎', color: '#9b5de5', role: 'Field Guide',     desc: 'Deep-dive guides on shells, weapons, mods, and extraction strategy.', metaTitle: 'MIRANDA — Marathon Field Guides', metaDesc: 'Shell breakdowns, weapon analysis, and ranked prep for Marathon Runners.' },
};

const EDITOR_STYLES = {
  CIPHER:  { color: '#ff2222', symbol: '◈', label: 'CIPHER'  },
  NEXUS:   { color: '#00d4ff', symbol: '⬡', label: 'NEXUS'   },
  MIRANDA: { color: '#9b5de5', symbol: '◎', label: 'MIRANDA' },
  GHOST:   { color: '#00ff88', symbol: '◇', label: 'GHOST'   },
  DEXTER:  { color: '#ff8800', symbol: '⬢', label: 'DEXTER'  },
};

// Color tokens for item categories — used for icon fallbacks and accents
const ITEM_COLORS = {
  unique:  '#ffd700',
  shell:   '#00d4ff',
  weapon:  '#ff8800',
  mod:     '#ff2222',
  implant: '#9b5de5',
  core:    '#ffd700',
  faction: '#e8459b',
};

const ITEM_SYMBOLS = {
  unique:  '★',
  shell:   '◎',
  weapon:  '⬢',
  mod:     '◈',
  implant: '◇',
  core:    '⬡',
  faction: '◆',
};

const RARITY_COLORS = {
  Standard:   '#888',
  Enhanced:   '#00ff41',
  Deluxe:     '#00d4ff',
  Superior:   '#9b5de5',
  Prestige:   '#ffd700',
  Contraband: '#ff2d55',
};

// Platform accent colors + labels for the creator-spotlight follow links
const PLATFORM_COLORS = {
  x:       '#ffffff',
  twitch:  '#a970ff',
  youtube: '#ff4444',
};
const PLATFORM_LABELS = {
  x:       'X',
  twitch:  'TWITCH',
  youtube: 'YOUTUBE',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

function readTime(body) {
  if (!body) return '1 min';
  var words = body.split(' ').length;
  return Math.max(1, Math.round(words / 200)) + ' min read';
}

function extractYouTubeId(url) {
  if (!url) return null;
  var match = url.match(/(?:v=|\/)([\w-]{11})(?:\?|&|$)/);
  return match ? match[1] : null;
}

function isTwitchClipUrl(url) {
  return url && (url.includes('twitch.tv') || url.includes('clips.twitch.tv'));
}

function extractTwitchClipSlug(url) {
  if (!url) return null;
  var m = url.match(/clips\.twitch\.tv\/([A-Za-z0-9_-]+)/) || url.match(/twitch\.tv\/[^/]+\/clip\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

// Extract a twitch login from a creator_info.twitch URL.
function twitchLoginFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    var clean = url.split('?')[0].replace(/\/+$/, '');
    var parts = clean.split('/');
    var last = parts[parts.length - 1];
    return last ? last.toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

// Build ordered {key, url} social links from a creator_info object.
function creatorSocialLinks(info) {
  if (!info) return [];
  var order = ['x', 'twitch', 'youtube'];
  var out = [];
  for (var i = 0; i < order.length; i++) {
    var key = order[i];
    if (info[key] && typeof info[key] === 'string' && info[key].trim().length > 0) {
      out.push({ key: key, url: info[key] });
    }
  }
  return out;
}

// ─── BODY PARSER ─────────────────────────────────────────────
// Turns a raw markdown-ish body into typed elements: header | quote | para.
//
// Rules, in order:
//  1. A paragraph that is ENTIRELY **bold** -> header (e.g. GHOST sometimes
//     puts the section title on its own line — the clean case).
//  2. A paragraph that is ENTIRELY a quoted line ("...") -> pull-quote, so a
//     standalone creator quote breaks the wall as a styled block. Attributed
//     quotes ("...," she said) correctly stay paragraphs (they don't end on ").
//  3. A paragraph that STARTS with **Header** fused to following text ->
//     split into a header element + the remaining paragraph. This is the
//     common GHOST inconsistency that produced the "blob": header and first
//     sentence glued together. The leading bold only counts as a header when
//     it's short (<=60 chars) and contains no sentence punctuation — so
//     mid-sentence emphasis like "**Arachne Rank 25**" is NOT mistaken for one.
//  4. Otherwise -> paragraph (inline **bold** preserved downstream).
function isWholeQuote(s) {
  // starts and ends with a double-quote and contains exactly one pair
  return s.length > 2 && s.charAt(0) === '"' && s.charAt(s.length - 1) === '"'
    && (s.match(/"/g) || []).length === 2;
}

function parseBody(body) {
  if (!body) return [];
  var elements = [];
  var paragraphs = body.split(/\n{2,}/);

  paragraphs.forEach(function(rawPara, paraIdx) {
    var para = rawPara.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!para) return;

    // Rule 1: whole-paragraph bold header
    var fullHeader = para.match(/^\*\*\s*([^*]+?)\s*\*\*$/);
    if (fullHeader && fullHeader[1].length <= 120) {
      elements.push({ type: 'header', content: fullHeader[1].trim(), key: 'h-' + paraIdx });
      return;
    }

    // Rule 2: standalone pull-quote
    if (isWholeQuote(para)) {
      elements.push({ type: 'quote', content: para.slice(1, -1).trim(), key: 'q-' + paraIdx });
      return;
    }

    // Rule 3: leading **Header** fused to body text
    var lead = para.match(/^\*\*\s*([^*]+?)\s*\*\*\s+(.+)$/);
    if (lead) {
      var head = lead[1].trim();
      var rest = lead[2].trim();
      if (head.length <= 60 && !/[.!?]/.test(head)) {
        elements.push({ type: 'header', content: head, key: 'h-' + paraIdx });
        if (isWholeQuote(rest)) {
          elements.push({ type: 'quote', content: rest.slice(1, -1).trim(), key: 'q-' + paraIdx + 'b' });
        } else {
          elements.push({ type: 'para', content: rest, key: 'p-' + paraIdx + 'b' });
        }
        return;
      }
    }

    // Rule 4: default paragraph
    elements.push({ type: 'para', content: para, key: 'p-' + paraIdx });
  });

  return elements;
}

// Renders a paragraph with **inline bold** support
function ParagraphContent({ text }) {
  var parts = text.split(/(\*\*[^*]+\*\*)/);
  return (
    <>
      {parts.map(function(part, i) {
        var boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
        if (boldMatch) {
          return <strong key={i} style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700 }}>{boldMatch[1]}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// Build a clean meta description from an article body. The editors only emit
// **bold/header** markers and standalone "quoted" pull-quote lines, so the **
// markers are stripped while their inner text is kept, and quotation marks are
// left intact (valid in a description). Markdown the editors don't currently
// emit (# headings, [text](url), `code`, > blockquote) is stripped defensively.
// Result: newlines flattened, whitespace collapsed, truncated to <= 155 chars at
// a word boundary with a single ellipsis appended only when truncation occurred.
// Falls back to the provided headline when the body is empty or strips to empty.
function buildMetaDescription(body, fallback) {
  if (!body) return fallback;
  var text = body
    .replace(/`([^`]*)`/g, '$1')              // inline `code` -> text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')  // [text](url) -> text
    .replace(/\*\*([^*]+)\*\*/g, '$1')        // **bold/header** -> text
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')       // # heading marker -> removed
    .replace(/^\s{0,3}>\s?/gm, '')            // > blockquote marker -> removed
    .replace(/\s+/g, ' ')                     // flatten newlines + collapse whitespace
    .trim();
  if (!text) return fallback;
  if (text.length <= 155) return text;
  var truncated = text.slice(0, 155);
  var lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > 0) truncated = truncated.slice(0, lastSpace);
  return truncated.replace(/\s+$/, '') + '\u2026';
}

export async function generateMetadata({ params }) {
  var { slug } = await params;
  var editorConfig = EDITORS[slug.toLowerCase()];
  if (editorConfig) {
    return {
      title: editorConfig.metaTitle,
      description: editorConfig.metaDesc,
      openGraph: { title: editorConfig.metaTitle + ' — CyberneticPunks', description: editorConfig.metaDesc, url: 'https://cyberneticpunks.com/intel/' + slug.toLowerCase(), siteName: 'CyberneticPunks', type: 'website' },
      twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: editorConfig.metaTitle, description: editorConfig.metaDesc },
      alternates: { canonical: 'https://cyberneticpunks.com/intel/' + slug.toLowerCase() },
    };
  }
  var { data: item } = await supabase.from('feed_items').select('*').eq('slug', slug).eq('game_slug', 'marathon').eq('is_published', true).maybeSingle();
  if (!item) return { title: 'Intel Not Found' };
  var desc = buildMetaDescription(item.body, item.headline);
  return {
    // TITLE SUFFIX DROPPED (`absolute` bypasses the root layout's
    // '%s | CyberneticPunks' template). The suffix costs 18 chars of an ~60-char
    // SERP budget on every article -- 30% of the budget spent on branding the
    // domain already shows. Article titles are where keyword competition happens;
    // the homepage and non-keyword hubs keep the suffix.
    title: { absolute: item.headline },
    description: desc,
    openGraph: { title: item.headline, description: desc, url: 'https://cyberneticpunks.com/intel/' + item.slug, siteName: 'CyberneticPunks', type: 'article', publishedTime: item.created_at },
    twitter: { card: 'summary_large_image', site: '@Cybernetic87250', title: item.headline, description: desc },
    alternates: { canonical: 'https://cyberneticpunks.com/intel/' + item.slug },
    // SEO prune: de-index flagged articles. follow:true so outbound link equity
    // still flows. Row stays intact (historical-context reads it regardless).
    robots: item.noindex ? { index: false, follow: true } : undefined,
  };
}

function StatBar({ label, value, max, color }) {
  var pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, fontFamily: 'monospace', fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 10, color: color, fontWeight: 700, fontFamily: 'monospace' }}>{value}</span>
      </div>
      <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 1 }}>
        <div style={{ height: 2, width: pct + '%', background: color, borderRadius: 1 }} />
      </div>
    </div>
  );
}

// ─── CREATOR SPOTLIGHT HEADER ────────────────────────────────
// Rendered at the top of the article body ONLY when the piece was produced
// from a creator_spotlight directive and creator_info.name exists. Surfaces
// the creator's avatar (Twitch, fetched in the router), name, and follow
// links so the article reads as coverage OF a person, not a wall of text.
// The avatar <img> renders only when a URL resolved server-side (no onError
// handler — build rule digest 255968484); an editor-glyph placeholder is used
// otherwise.
function CreatorHeader({ info, avatarUrl, editorColor, editorGlyph }) {
  var links = creatorSocialLinks(info);
  var name = info && info.name ? info.name : 'Marathon Creator';

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      gap: 18,
      background: 'linear-gradient(135deg, #1a1d24 0%, #0e1014 100%)',
      border: '1px solid #22252e',
      borderLeft: '3px solid ' + editorColor,
      borderRadius: 6,
      padding: '18px 20px',
      marginBottom: 28,
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -50, right: -50, width: 140, height: 140,
        background: editorColor, opacity: 0.06, borderRadius: '50%', pointerEvents: 'none',
      }} />

      {/* Avatar */}
      <div style={{
        flexShrink: 0,
        width: 76,
        height: 76,
        borderRadius: '50%',
        padding: 3,
        background: 'linear-gradient(135deg, ' + editorColor + ' 0%, ' + editorColor + '44 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 0 18px ' + editorColor + '33',
      }}>
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            width={70}
            height={70}
            style={{ width: 70, height: 70, borderRadius: '50%', objectFit: 'cover', display: 'block', background: '#0e1014' }}
          />
        ) : (
          <div style={{
            width: 70, height: 70, borderRadius: '50%', background: '#0e1014',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, color: editorColor,
          }}>
            {editorGlyph}
          </div>
        )}
      </div>

      {/* Name + meta + links */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 8, color: editorColor, letterSpacing: 2, fontWeight: 700,
          fontFamily: 'monospace', marginBottom: 5, textTransform: 'uppercase',
        }}>
          Creator Spotlight
        </div>
        <div style={{
          fontFamily: 'Orbitron, monospace', fontSize: 22, fontWeight: 800,
          color: '#ffffff', letterSpacing: '0.2px', lineHeight: 1.1, marginBottom: 10,
        }}>
          {name}
        </div>
        {links.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace',
              letterSpacing: 1.5, fontWeight: 700, marginRight: 2,
            }}>
              FOLLOW
            </span>
            {links.map(function(link, li) {
              var pc = PLATFORM_COLORS[link.key] || '#ffffff';
              var isWhite = pc === '#ffffff';
              return (
                <a
                  key={li}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 9,
                    color: pc,
                    background: isWhite ? 'rgba(255,255,255,0.06)' : pc + '14',
                    border: '1px solid ' + (isWhite ? 'rgba(255,255,255,0.2)' : pc + '40'),
                    borderRadius: 3,
                    padding: '4px 11px',
                    letterSpacing: 1.5,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    textDecoration: 'none',
                  }}
                >
                  {PLATFORM_LABELS[link.key] || link.key.toUpperCase()}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── INLINE STAT CARD ────────────────────────────────────────
// Sep / SR_ONLY (the visually-hidden separator) now live in @/components/Sep,
// imported above, so every card site can share the one canonical separator.

function InlineStatCard({ item, type, color }) {
  var imgSrc = null;
  if (type === 'shell' && item.image_filename) imgSrc = '/images/shells/' + item.image_filename;
  else if (type === 'weapon' && item.image_filename) imgSrc = '/images/weapons/' + item.image_filename;
  else if (type === 'implant' && item.image_filename) imgSrc = '/images/implants/' + item.image_filename;
  else if (type === 'faction' && item.image_filename) imgSrc = '/images/factions/' + item.image_filename;

  var typeColor = color || ITEM_COLORS[type];
  var symbol = ITEM_SYMBOLS[type] || '◈';
  var rarityColor = item.rarity ? RARITY_COLORS[item.rarity] : null;

  // UNIQUES ONLY: render the card as a real <Link> to its canonical. Every other
  // type stays a plain <span>. This is the single crawlable path from the article
  // corpus to /uniques/[slug]; see the fetch comment in the page loader for why.
  // Guarded on item.slug -- a unique row with no slug renders as a span rather
  // than a link to /uniques/undefined.
  var Wrapper = (type === 'unique' && item.slug) ? Link : 'span';
  var wrapperProps = (type === 'unique' && item.slug) ? { href: '/uniques/' + item.slug } : {};

  return (
    <Wrapper
      {...wrapperProps}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: '#0e1014',
        border: '1px solid #22252e',
        borderLeft: '2px solid ' + typeColor,
        borderRadius: '0 2px 2px 0',
        padding: '4px 10px 4px 8px',
        margin: '2px 4px 2px 0',
        verticalAlign: 'middle',
        maxWidth: '100%',
        textDecoration: 'none',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          background: '#1a1d24',
          border: '1px solid ' + typeColor + '40',
          borderRadius: 2,
          flexShrink: 0,
          overflow: 'hidden',
        }}
      >
        {imgSrc ? (
          <img src={imgSrc} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
        ) : (
          <span aria-hidden="true" style={{ fontSize: 11, color: typeColor, lineHeight: 1 }}>{symbol}</span>
        )}
      </span>

      <Sep text=" " />

      <span style={{ display: 'inline-flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: typeColor,
            letterSpacing: 0.3,
            fontFamily: 'Orbitron, monospace',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </span>
        <Sep text=" - " />
        <span
          style={{
            fontSize: 7,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: 1.5,
            fontWeight: 700,
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            lineHeight: 1.2,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          {type === 'weapon' && item.weapon_type && <span>{item.weapon_type}</span>}
          {type === 'shell' && item.role && <span>{item.role}</span>}
          {type === 'mod' && item.slot_type && <span>{item.slot_type} MOD</span>}
          {type === 'implant' && item.slot_type && <span>{item.slot_type}</span>}
          {type === 'faction' && <span>{item.focus || 'Faction'}</span>}
          {type === 'unique' && item.base_weapon && <span>{item.base_weapon}</span>}
          {item.rarity && rarityColor && (
            <>
              <Sep text=" - " />
              <span style={{ color: rarityColor }}>{item.rarity}</span>
            </>
          )}
        </span>
      </span>
    </Wrapper>
  );
}

// ─── WHOLE-NAME MATCHER ──────────────────────────────────────
// Item names are matched against body text by WHOLE name only: the characters
// immediately before and after the matched span must be non-alphanumeric (a
// string edge counts as a boundary). This stops substring false positives where
// an item name is embedded in a longer word, e.g. "Second Wind" inside "second
// window", "Combat Mag" inside "combat magazine", or "Impact HAR" inside
// "impact harm". Used by BOTH the candidate filter and the inline injection so
// the sidebar reference list and the inline cards agree. Case-insensitive;
// callers pass already-lowercased strings. (Watch item: single common-word
// names like "Knife" still card on a whole-word match - acceptable for now.)
function isAlnumChar(ch) {
  return ch !== undefined && ch !== '' && /[a-z0-9]/i.test(ch);
}
function wholeNameIndex(haystackLower, nameLower) {
  if (!nameLower) return -1;
  var from = 0;
  while (from <= haystackLower.length) {
    var idx = haystackLower.indexOf(nameLower, from);
    if (idx === -1) return -1;
    var before = idx > 0 ? haystackLower.charAt(idx - 1) : undefined;
    var after = haystackLower.charAt(idx + nameLower.length); // '' past end -> boundary
    if (!isAlnumChar(before) && !isAlnumChar(after)) return idx;
    from = idx + 1;
  }
  return -1;
}
function bodyHasWholeName(haystackLower, name) {
  return !!name && wholeNameIndex(haystackLower, name.toLowerCase()) !== -1;
}

// ─── INLINE-AWARE PARAGRAPH ──────────────────────────────────
function ParagraphWithCards({ text, allItems, mentionedSet }) {
  var sorted = allItems.slice().sort(function(a, b) {
    return b.name.length - a.name.length;
  });

  var segments = [{ type: 'text', value: text }];

  sorted.forEach(function(item) {
    if (mentionedSet.has(item.name)) return;
    var nameLower = item.name.toLowerCase();
    var newSegments = [];
    var foundOnce = false;

    segments.forEach(function(seg) {
      if (foundOnce || seg.type !== 'text') {
        newSegments.push(seg);
        return;
      }
      var lower = seg.value.toLowerCase();
      var idx = wholeNameIndex(lower, nameLower);
      if (idx === -1) {
        newSegments.push(seg);
        return;
      }
      var before = seg.value.slice(0, idx);
      var match = seg.value.slice(idx, idx + item.name.length);
      var after = seg.value.slice(idx + item.name.length);
      if (before) newSegments.push({ type: 'text', value: before });
      newSegments.push({ type: 'card', item: item, displayName: match });
      if (after) newSegments.push({ type: 'text', value: after });
      foundOnce = true;
      mentionedSet.add(item.name);
    });

    segments = newSegments;
  });

  return (
    <>
      {segments.map(function(seg, i) {
        if (seg.type === 'card') {
          return <InlineStatCard key={i} item={seg.item} type={seg.item._type} color={ITEM_COLORS[seg.item._type]} />;
        }
        return <ParagraphContent key={i} text={seg.value} />;
      })}
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// EDITOR LANE PAGE (unchanged from before)
// ═══════════════════════════════════════════════════════════

function EditorLanePage({ config, items }) {
  var featured = items[0] || null;
  var rest = items.slice(1);

  var avgScore = items.length > 0
    ? (items.reduce(function(sum, i) { return sum + (i.ce_score || 0); }, 0) / items.length).toFixed(1)
    : null;
  var topScore = items.length > 0
    ? Math.max.apply(null, items.map(function(i) { return i.ce_score || 0; }))
    : null;
  var allTags = [];
  items.forEach(function(i) { (i.tags || []).forEach(function(t) { allTags.push(t); }); });
  var tagCounts = {};
  allTags.forEach(function(t) { tagCounts[t] = (tagCounts[t] || 0) + 1; });
  var topTag = Object.keys(tagCounts).sort(function(a, b) { return tagCounts[b] - tagCounts[a]; })[0] || null;

  var OTHER_EDITORS = ['cipher','nexus','dexter','ghost','miranda'].filter(function(e) { return e !== config.name.toLowerCase(); });
  var OTHER_EDITOR_CONFIG = {
    cipher:  { symbol: '◈', color: '#ff2222', role: 'Play Analyst' },
    nexus:   { symbol: '⬡', color: '#00d4ff', role: 'Meta Strategist' },
    dexter:  { symbol: '⬢', color: '#ff8800', role: 'Build Engineer' },
    ghost:   { symbol: '◇', color: '#00ff88', role: 'Community Pulse' },
    miranda: { symbol: '◎', color: '#9b5de5', role: 'Field Guide' },
  };

  return (
    <main style={{ background: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, paddingBottom: 80, fontFamily: 'system-ui, sans-serif' }}>

      <style>{`
        .lane-row:hover { background: #1e2228 !important; }
        /* Mobile (P4): the "Latest Intel" featured card is an inline 1fr 280px grid
           (text | image). The fixed 280px image track crushes the text column to
           ~30px on a phone (headline wraps 1-2 words). Collapse to one column so
           text + image STACK; desktop (>640px) keeps the inline 1fr 280px. Site 640px
           convention. (This style block is the editor-hub render path, where the
           card lives -- not the ArticlePage block.) */
        @media (max-width: 640px) {
          .latest-intel-card { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <section style={{ position: 'relative', overflow: 'hidden', background: '#0e1014', borderBottom: '1px solid #1e2028' }}>
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: '40%',
          backgroundImage: 'url(/images/editors/' + config.name.toLowerCase() + '.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'right center',
          opacity: 0.12,
        }} />
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0,
          width: '50%',
          background: 'linear-gradient(to right, #0e1014 0%, transparent 100%)',
        }} />

        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, ' + config.color + ' 0%, transparent 100%)' }} />

        <div style={{ position: 'absolute', top: -60, right: '30%', width: 240, height: 240, border: '1px solid ' + config.color + '12', transform: 'rotate(45deg)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '40px 24px 36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, fontSize: 10, letterSpacing: 2, fontFamily: 'monospace', fontWeight: 700 }}>
            <Link href="/intel" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>INTEL</Link>
            <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
            <span style={{ color: config.color }}>{edTag(config.name)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ width: 92, height: 92, borderRadius: '50%', overflow: 'hidden', border: '2px solid ' + config.color + '60', background: '#1a1d24', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={'/images/editors/' + config.name.toLowerCase() + '.jpg'} alt={edTag(config.name)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            </div>

            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ fontSize: 9, color: config.color + '88', letterSpacing: 3, marginBottom: 6, fontWeight: 700, fontFamily: 'monospace' }}>
                AI EDITOR · CYBERNETICPUNKS
              </div>
              <h1 style={{ fontFamily: 'Orbitron, monospace', fontSize: 'clamp(32px, 5vw, 48px)', fontWeight: 900, color: config.color, letterSpacing: '3px', margin: '0 0 6px', lineHeight: 1 }}>
                {editorByline(config.name)}
              </h1>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', letterSpacing: 2, marginBottom: 14, fontWeight: 700, textTransform: 'uppercase' }}>
                {config.role}
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, maxWidth: 500, margin: 0 }}>
                {config.desc}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 1, background: '#1e2028', marginTop: 24 }}>
            {[
              { label: 'Articles',  value: items.length },
              avgScore > 0 && { label: 'Avg Score', value: avgScore },
              topScore > 0 && { label: 'Top Score', value: topScore },
              topTag && { label: 'Top Topic', value: topTag.toUpperCase().slice(0, 12) },
            ].filter(Boolean).map(function(stat) {
              return (
                <div key={stat.label} style={{ background: '#1a1d24', borderTop: '2px solid ' + config.color, padding: '12px 16px' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: config.color, lineHeight: 1, letterSpacing: '-0.5px', marginBottom: 4 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
                    {stat.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>

        {items.length === 0 ? (
          <div style={{ margin: '40px 0', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 3, padding: '60px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, color: config.color, opacity: 0.2, marginBottom: 14 }}>{config.symbol}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700 }}>
              {edTag(config.name)} IS STANDING BY — NEXT CYCLE SOON
            </div>
          </div>
        ) : (
          <>
            {featured && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '32px 0 14px' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Latest Intel</span>
                  <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                </div>

                <Link href={'/intel/' + featured.slug} className="lane-row" style={{ textDecoration: 'none', display: 'block', background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + config.color, borderRadius: '0 0 3px 3px', overflow: 'hidden', marginBottom: 8, transition: 'background 0.1s' }}>
                  <div className="latest-intel-card" style={{ display: 'grid', gridTemplateColumns: featured.thumbnail ? '1fr 280px' : '1fr', minHeight: 150 }}>
                    <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 8, color: config.color, background: config.color + '18', border: '1px solid ' + config.color + '35', borderRadius: 2, padding: '2px 7px', letterSpacing: 1.5, fontWeight: 700 }}>LATEST</span>
                          {featured.ce_score > 0 && (
                            <span style={{ fontSize: 16, fontWeight: 900, color: config.color, fontFamily: 'Orbitron, monospace' }}>{featured.ce_score}</span>
                          )}
                          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', marginLeft: 'auto', fontFamily: 'monospace', letterSpacing: 1 }}>{timeAgo(featured.created_at)}</span>
                        </div>
                        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.3, margin: '0 0 10px' }}>{featured.headline}</h2>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.55, margin: 0 }}>
                          {(featured.body || '').replace(/\*\*/g, '').slice(0, 200)}{featured.body && featured.body.length > 200 ? '...' : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12 }}>
                        {(featured.tags || []).slice(0, 4).map(function(tag) {
                          return <span key={tag} style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', border: '1px solid #22252e', background: '#0e1014', borderRadius: 2, padding: '2px 7px', letterSpacing: 1, fontWeight: 700 }}>{tag.toUpperCase()}</span>;
                        })}
                      </div>
                    </div>
                    {featured.thumbnail && (
                      <div style={{ backgroundImage: 'url(' + featured.thumbnail + ')', backgroundSize: 'cover', backgroundPosition: 'center', minHeight: 150 }} />
                    )}
                  </div>
                </Link>
              </>
            )}

            {rest.length > 0 && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0 12px' }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>All Intel</span>
                  <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontFamily: 'monospace' }}>{rest.length} MORE</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 6, marginBottom: 8 }}>
                  {rest.map(function(item, i) {
                    return (
                      <Link key={i} href={'/intel/' + item.slug} className="lane-row" style={{ textDecoration: 'none', display: 'flex', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + config.color + '55', borderRadius: '0 3px 3px 0', overflow: 'hidden', transition: 'background 0.1s' }}>
                        {item.thumbnail && (
                          <div style={{ width: 80, flexShrink: 0, backgroundImage: 'url(' + item.thumbnail + ')', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        )}
                        <div style={{ padding: '12px 14px', flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                            {item.ce_score > 0 && <span style={{ fontSize: 11, fontWeight: 900, color: config.color, flexShrink: 0, fontFamily: 'Orbitron, monospace' }}>{item.ce_score}</span>}
                            {item.tags?.[0] && <span style={{ fontSize: 7, color: config.color + 'aa', background: config.color + '15', borderRadius: 2, padding: '1px 5px', letterSpacing: 1, fontWeight: 700 }}>{item.tags[0].toUpperCase()}</span>}
                            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto', flexShrink: 0, fontFamily: 'monospace', letterSpacing: 1 }}>{timeAgo(item.created_at)}</span>
                          </div>
                          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.8)', lineHeight: 1.35, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.headline}</h3>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {config.name === 'GHOST' && (
          <Link href="/rising" className="lane-row" style={{
            display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none',
            background: 'linear-gradient(135deg, #1a1d24 0%, #0e1014 100%)',
            border: '1px solid #22252e', borderLeft: '3px solid #00ff88',
            borderRadius: '0 3px 3px 0', padding: '16px 18px', margin: '32px 0 0',
            transition: 'background 0.1s',
          }}>
            <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: '50%', background: '#0e1014', border: '1px solid #00ff8850', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: '#00ff88' }}>
              ◇
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 8, color: '#00ff88', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace', marginBottom: 4 }}>GHOST · RISING RUNNERS</div>
              <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.2, marginBottom: 3 }}>Small Marathon streamers, live right now</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.4 }}>Discover up-and-coming creators and published spotlights before they blow up.</div>
            </div>
            <span style={{ fontSize: 10, color: '#00ff88', fontFamily: 'monospace', letterSpacing: 1.5, fontWeight: 700, flexShrink: 0 }}>RISING -&gt;</span>
          </Link>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '32px 0 12px' }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Other Editors</span>
          <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, marginBottom: 40 }}>
          {OTHER_EDITORS.map(function(slug) {
            var e = OTHER_EDITOR_CONFIG[slug];
            return (
              <Link key={slug} href={'/intel/' + slug} className="lane-row" style={{
                display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
                background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + e.color + '70',
                borderRadius: '0 0 3px 3px', padding: '10px 14px',
                transition: 'background 0.1s',
              }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', border: '1px solid ' + e.color + '40', flexShrink: 0, background: '#0e1014' }}>
                  <img src={'/images/editors/' + slug + '.jpg'} alt={edTag(slug)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: e.color, letterSpacing: 2 }}>{edTag(slug)}</div>
                  <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontWeight: 700, marginTop: 1 }}>{e.role.toUpperCase()}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <Footer />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════
// BODY RENDERER (with inline stat cards)
// ═══════════════════════════════════════════════════════════

function BodyRenderer({ parsed, editorColor, allItems }) {
  var mentionedSet = new Set();

  return (
    <div>
      {parsed.map(function(el) {
        if (el.type === 'header') {
          return (
            <div key={el.key} style={{ margin: '32px 0 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 3, height: 16, background: editorColor, borderRadius: 1, flexShrink: 0 }} />
              <h2 style={{ fontSize: 12, fontWeight: 800, color: editorColor, margin: 0, letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'Orbitron, monospace' }}>{el.content}</h2>
              <div style={{ flex: 1, height: 1, background: editorColor + '22' }} />
            </div>
          );
        }
        if (el.type === 'quote') {
          return (
            <blockquote key={el.key} style={{
              margin: '28px 0',
              padding: '4px 0 4px 24px',
              borderLeft: '3px solid ' + editorColor,
              fontFamily: 'Orbitron, monospace',
              fontSize: 22,
              fontWeight: 700,
              lineHeight: 1.4,
              color: 'rgba(255,255,255,0.92)',
              letterSpacing: '-0.2px',
            }}>
              <span style={{ color: editorColor, marginRight: 4 }}>&ldquo;</span>
              {el.content}
              <span style={{ color: editorColor, marginLeft: 2 }}>&rdquo;</span>
            </blockquote>
          );
        }
        return (
          <p key={el.key} style={{ fontSize: 16, color: 'rgba(255,255,255,0.84)', lineHeight: 1.6, margin: '0 0 1.5em', letterSpacing: 0.1, maxWidth: '66ch' }}>
            <ParagraphWithCards text={el.content} allItems={allItems} mentionedSet={mentionedSet} />
          </p>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SIDEBAR ITEM CARD (with images)
// ═══════════════════════════════════════════════════════════

function SidebarItemCard({ item, type, editorColor }) {
  var imgSrc = null;
  if (type === 'shell' && item.image_filename) imgSrc = '/images/shells/' + item.image_filename;
  else if (type === 'weapon' && item.image_filename) imgSrc = '/images/weapons/' + item.image_filename;
  else if (type === 'implant' && item.image_filename) imgSrc = '/images/implants/' + item.image_filename;

  var typeColor = ITEM_COLORS[type];
  var symbol = ITEM_SYMBOLS[type];
  var rarityColor = item.rarity ? RARITY_COLORS[item.rarity] : null;
  var labels = {
    shell: 'RUNNER SHELL',
    weapon: 'WEAPON',
    mod: 'MOD',
    implant: 'IMPLANT',
    core: 'CORE',
  };

  return (
    <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{
          width: 44, height: 44, flexShrink: 0,
          background: '#0e1014', border: '1px solid ' + typeColor + '40',
          borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {imgSrc ? (
            <img src={imgSrc} alt={item.name} style={{ width: 40, height: 40, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 18, color: typeColor + '60' }}>{symbol}</span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginBottom: 3, fontWeight: 700, fontFamily: 'monospace' }}>
            {labels[type]}
          </div>
          <Sep text=" - " />
          <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 800, color: typeColor, lineHeight: 1.3, marginBottom: 4 }}>
            {item.name}
          </div>
          <Sep text=" - " />
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            {type === 'weapon' && item.weapon_type && (
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {item.weapon_type}{item.ammo_type ? ' · ' + item.ammo_type : ''}
              </span>
            )}
            {type === 'shell' && item.role && (
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {item.role}
              </span>
            )}
            {(type === 'mod' || type === 'implant') && item.slot_type && (
              <span style={{ fontSize: 7, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase', fontFamily: 'monospace' }}>
                {item.slot_type} SLOT
              </span>
            )}
            {item.rarity && rarityColor && (
              <>
                <Sep text=" - " />
                <span style={{ fontSize: 7, color: rarityColor, border: '1px solid ' + rarityColor + '40', padding: '1px 5px', borderRadius: 2, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>
                  {item.rarity}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {type === 'shell' && (
        <>
          {item.base_health && <StatBar label="HP" value={item.base_health} max={200} color="#00ff41" />}
          {item.base_shield && <StatBar label="SHIELD" value={item.base_shield} max={100} color="#00d4ff" />}
          {item.active_ability_name && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 8, color: '#ff8800', letterSpacing: 2, marginBottom: 3, fontWeight: 700 }}>ACTIVE — {item.active_ability_name}</div>
              {item.active_ability_description && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{item.active_ability_description.slice(0, 120)}</div>}
            </div>
          )}
        </>
      )}

      {type === 'weapon' && (
        <>
          {item.damage && <StatBar label="DAMAGE" value={item.damage} max={200} color="#ff8800" />}
          {item.fire_rate && <StatBar label="FIRE RATE" value={item.fire_rate} max={1000} color="#ff2222" />}
          {item.magazine_size && <StatBar label="MAGAZINE" value={item.magazine_size} max={60} color="#00d4ff" />}
        </>
      )}

      {type === 'mod' && item.effect_desc && (
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>{item.effect_desc}</div>
      )}

      {type === 'implant' && (
        <>
          {item.passive_name && <div style={{ fontSize: 9, color: '#9b5de5', marginBottom: 4, fontWeight: 700, fontFamily: 'monospace' }}>{item.passive_name}</div>}
          {item.passive_desc && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, marginBottom: 6 }}>{item.passive_desc.slice(0, 120)}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {item.stat_1_label && item.stat_1_value && <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', letterSpacing: 1 }}>{item.stat_1_label}: <strong style={{ color: '#9b5de5' }}>{item.stat_1_value}</strong></span>}
            {item.stat_2_label && item.stat_2_value && <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', letterSpacing: 1 }}>{item.stat_2_label}: <strong style={{ color: '#9b5de5' }}>{item.stat_2_value}</strong></span>}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ARTICLE PAGE
// ═══════════════════════════════════════════════════════════

function ArticlePage({ item, shells, weapons, mods, implants, factions, uniques, comments, related, creatorAvatar }) {
  var editor = EDITOR_STYLES[item.editor] || EDITOR_STYLES.CIPHER;
  var publishedAt = formatPublishDate(item.created_at);
  var videoId = extractYouTubeId(item.source_url);
  var isTwitch = isTwitchClipUrl(item.source_url);
  var twitchSlug = extractTwitchClipSlug(item.source_url);
  // Label for the bottom "source" link — reflects the actual URL type so an X
  // or other link isn't mislabeled as YOUTUBE. Embed still only fires for
  // Twitch clips / YouTube (handled separately below).
  var sourceLinkLabel = 'SOURCE';
  if (item.source_url) {
    var surl = item.source_url.toLowerCase();
    if (surl.includes('twitch.tv')) sourceLinkLabel = 'TWITCH';
    else if (surl.includes('youtube.com') || surl.includes('youtu.be')) sourceLinkLabel = 'YOUTUBE';
    else if (surl.includes('x.com') || surl.includes('twitter.com')) sourceLinkLabel = 'X';
    else if (surl.includes('reddit.com')) sourceLinkLabel = 'REDDIT';
  }
  var articleUrl = 'https://cyberneticpunks.com/intel/' + item.slug;
  var rt = readTime(item.body);

  var bodyLower = (item.body || '').toLowerCase();
  // Uniques are matched FIRST and placed at the head of allMentionedItems so the
  // longer name wins: "BR33 Victory Lap" must card as the unique, not as its base
  // weapon "BR33 Volley Rifle". ParagraphWithCards sorts by name length, which
  // already favours the unique, but ordering here keeps the sidebar list honest too.
  var mentionedUniques = (uniques || [])
    .filter(function(u) { return bodyHasWholeName(bodyLower, u.name); })
    .map(function(u) { return Object.assign({}, u, { _type: 'unique' }); });
  var mentionedShells = (shells || [])
    .filter(function(s) { return bodyHasWholeName(bodyLower, s.name); })
    .map(function(s) { return Object.assign({}, s, { _type: 'shell' }); });
  var mentionedWeapons = (weapons || [])
    .filter(function(w) { return bodyHasWholeName(bodyLower, w.name); })
    .map(function(w) { return Object.assign({}, w, { _type: 'weapon' }); });
  var mentionedMods = (mods || [])
    .filter(function(m) { return bodyHasWholeName(bodyLower, m.name); })
    .slice(0, 8)
    .map(function(m) { return Object.assign({}, m, { _type: 'mod' }); });
  var mentionedImplants = (implants || [])
    .filter(function(imp) { return bodyHasWholeName(bodyLower, imp.name); })
    .slice(0, 8)
    .map(function(imp) { return Object.assign({}, imp, { _type: 'implant' }); });
  var mentionedFactions = (factions || [])
    .filter(function(f) { return bodyHasWholeName(bodyLower, f.name); })
    .map(function(f) { return Object.assign({}, f, { _type: 'faction' }); });

  var allMentionedItems = [].concat(mentionedUniques, mentionedShells, mentionedWeapons, mentionedMods, mentionedImplants, mentionedFactions);

  var hasDataRef = allMentionedItems.length > 0;

  var parsed = parseBody(item.body);
  var hasThumbnail = !!(item.thumbnail || videoId);

  // Creator spotlight detection — drives the CreatorHeader at the top of the body.
  var ci = item.creator_info || {};
  var isCreatorSpotlight = item.directive_type === 'creator_spotlight' && !!ci.name;

  var shareX = 'https://x.com/intent/tweet?text=' + encodeURIComponent(item.headline + ' — via @Cybernetic87250') + '&url=' + encodeURIComponent(articleUrl);
  var shareReddit = 'https://www.reddit.com/submit?url=' + encodeURIComponent(articleUrl) + '&title=' + encodeURIComponent(item.headline);

  var jsonLd = {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: item.headline,
    description: item.body ? item.body.replace(/\n/g, ' ').slice(0, 155) : item.headline,
    author: { '@type': 'Organization', name: item.editor + ' — CyberneticPunks', url: 'https://cyberneticpunks.com/intel/' + item.editor.toLowerCase() },
    publisher: { '@type': 'Organization', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
    datePublished: toISOWithPTOffset(item.created_at), dateModified: toISOWithPTOffset(item.created_at),
    url: articleUrl, mainEntityOfPage: { '@type': 'WebPage', '@id': articleUrl },
    keywords: item.tags ? item.tags.join(', ') : 'Marathon, gaming',
  };
  if (item.thumbnail) jsonLd.image = item.thumbnail;

  var creatorPersonSchema = null;
  if (isCreatorSpotlight) {
    var sameAs = [ci.youtube, ci.x, ci.twitch, ci.other].filter(Boolean);
    creatorPersonSchema = {
      '@context': 'https://schema.org', '@type': 'Person',
      name: ci.name,
    };
    if (sameAs.length > 0) creatorPersonSchema.sameAs = sameAs;
    jsonLd.about = { '@type': 'Person', name: ci.name };
    if (sameAs.length > 0) jsonLd.about.sameAs = sameAs;
  }

  // Breadcrumb trail (Home -> Intel -> this article). Apex canonical host.
  var breadcrumbLd = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://cyberneticpunks.com' },
      { '@type': 'ListItem', position: 2, name: 'Intel', item: 'https://cyberneticpunks.com/intel' },
      { '@type': 'ListItem', position: 3, name: item.headline, item: articleUrl },
    ],
  };

  return (
    <main style={{ backgroundColor: '#121418', minHeight: '100vh', color: '#fff', paddingTop: 48, fontFamily: 'system-ui, sans-serif' }}>
      <ViewTracker slug={item.slug} type="article" headline={item.headline} gameSlug="marathon" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      {creatorPersonSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(creatorPersonSchema) }} />
      )}

      <style>{`
        .article-related:hover { background: #1e2228 !important; }
        /* Mobile: collapse the article/data-reference grid to one column so the
           300px reference card STACKS BELOW the body instead of colliding with the
           crushed body column. !important overrides the inline gridTemplateColumns;
           desktop (>640px) keeps the inline 1fr 300px. Matches the site 640px convention. */
        @media (max-width: 640px) {
          .intel-article-grid { grid-template-columns: 1fr !important; }
          .intel-data-aside { position: static !important; top: auto !important; }
        }
      `}</style>

      <div style={{ position: 'relative', background: '#0e1014', borderBottom: '1px solid #1e2028', overflow: 'hidden' }}>
        {hasThumbnail && (
          <>
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'url(' + (item.thumbnail || ('https://img.youtube.com/vi/' + videoId + '/maxresdefault.jpg')) + ')',
              backgroundSize: 'cover', backgroundPosition: 'center',
              opacity: 0.15,
              filter: 'blur(8px)',
            }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(14,16,20,0.5) 0%, #0e1014 100%)' }} />
          </>
        )}

        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: 'linear-gradient(180deg, ' + editor.color + ' 0%, transparent 100%)' }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: '36px 24px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <Link href={'/intel/' + item.editor.toLowerCase()} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: editor.color + '15', border: '1px solid ' + editor.color + '35', borderRadius: 2, padding: '4px 10px', textDecoration: 'none' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid ' + editor.color + '50', background: '#0e1014' }}>
                <img src={'/images/editors/' + item.editor.toLowerCase() + '.jpg'} alt={edTag(item.editor)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
              </div>
              <span style={{ fontSize: 10, color: editor.color, letterSpacing: 2, fontWeight: 700 }}>{editorByline(item.editor)}</span>
            </Link>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontFamily: 'monospace' }}>{publishedAt} · {rt}</span>
            {item.source && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', border: '1px solid #22252e', padding: '3px 7px', borderRadius: 2, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{item.source}</span>}
          </div>

          <h1 style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.5px', margin: '0 0 18px', maxWidth: 860 }}>
            {item.headline}
          </h1>

          {(item.ce_score > 0 || (item.tags && item.tags.length > 0)) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {item.ce_score > 0 && (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, background: editor.color + '15', border: '1px solid ' + editor.color + '35', borderRadius: 2, padding: '5px 12px' }}>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, fontWeight: 700, fontFamily: 'monospace' }}>{item.editor === 'NEXUS' ? 'GRID PULSE' : item.editor === 'DEXTER' ? 'LOADOUT GRADE' : 'CE SCORE'}</span>
                  <span style={{ fontSize: 18, fontWeight: 900, color: editor.color, fontFamily: 'Orbitron, monospace' }}>{item.ce_score}</span>
                </div>
              )}
              {item.tags && item.tags.slice(0, 4).map(function(tag, i) {
                return <span key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', border: '1px solid #22252e', background: 'rgba(255,255,255,0.02)', padding: '4px 9px', borderRadius: 2, letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{tag}</span>;
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 64px' }}>
        <div className="intel-article-grid" style={{ display: 'grid', gridTemplateColumns: hasDataRef ? '1fr 300px' : '1fr', gap: 44, alignItems: 'start' }}>

          <article style={{ paddingTop: 32, minWidth: 0 }}>
            {videoId && (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 3, marginBottom: 32, border: '1px solid #22252e' }}>
                <iframe src={'https://www.youtube.com/embed/' + videoId} title={item.headline} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
              </div>
            )}
            {isTwitch && twitchSlug && (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 3, marginBottom: 32, border: '1px solid #22252e' }}>
                <iframe src={'https://clips.twitch.tv/embed?clip=' + twitchSlug + '&parent=cyberneticpunks.com&parent=www.cyberneticpunks.com'} title={item.headline} allowFullScreen style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
              </div>
            )}

            {isCreatorSpotlight && (
              <CreatorHeader info={ci} avatarUrl={creatorAvatar} editorColor={editor.color} editorGlyph={editor.symbol} />
            )}

            <div style={{ borderLeft: '1px solid ' + editor.color + '22', paddingLeft: 24 }}>
              <BodyRenderer parsed={parsed} editorColor={editor.color} allItems={allMentionedItems} />
            </div>

            {comments && comments.length > 0 && (
              <section id="editor-reactions" aria-labelledby="editor-panel-heading" style={{ marginTop: 36 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                  <h2 id="editor-panel-heading" style={{ fontFamily: 'Orbitron, monospace', fontSize: 15, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.2px' }}>The panel weighs in</h2>
                  <div style={{ flex: 1, height: 1, background: '#1e2028', minWidth: 20 }} />
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>{comments.length} {comments.length === 1 ? 'TAKE' : 'TAKES'}</span>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {comments.map(function(comment, i) {
                    var color = edColor(comment.editor);
                    var role = edRole(comment.editor);
                    return (
                      <li key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid ' + color, borderRadius: '0 3px 3px 0' }}>
                        {editorHasPortrait(comment.editor) ? (
                          <img src={'/images/editors/' + comment.editor.toLowerCase() + '.jpg'} alt="" width={36} height={36} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', border: '1px solid ' + color + '55', background: '#0e1014', flexShrink: 0, display: 'block' }} />
                        ) : (
                          <div aria-hidden="true" style={{ width: 36, height: 36, borderRadius: '50%', border: '1px solid ' + color + '55', background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'Orbitron, monospace', fontWeight: 800, fontSize: 14, color: color }}>{editorInitial(comment.editor)}</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: color, letterSpacing: 1.5 }}>{edSymbol(comment.editor)} {edTag(comment.editor)}</span>
                            {role && <span style={{ fontFamily: 'monospace', fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, fontWeight: 700, textTransform: 'uppercase' }}>{role}</span>}
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto', fontFamily: 'monospace', letterSpacing: 1 }}>{timeAgo(comment.created_at)}</span>
                          </div>
                          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.84)', lineHeight: 1.6 }}>{comment.body}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 24, marginTop: 32, borderTop: '1px solid #1e2028', flexWrap: 'wrap' }}>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 2, marginRight: 4, fontWeight: 700, fontFamily: 'monospace' }}>SHARE</div>
              <a href={shareX} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: '7px 13px', textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>POST TO X</a>
              <a href={shareReddit} target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', background: '#1a1d24', border: '1px solid #22252e', borderRadius: 2, padding: '7px 13px', textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>REDDIT</a>
              {item.source_url && <a href={item.source_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: 10, color: editor.color, textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>▶ {sourceLinkLabel} ↗</a>}
            </div>

            <div style={{ marginTop: 18 }}>
              <Link href={'/intel/' + item.editor.toLowerCase()} style={{ fontSize: 9, letterSpacing: 2, color: 'rgba(255,255,255,0.25)', textDecoration: 'none', fontWeight: 700, fontFamily: 'monospace' }}>← MORE FROM {edTag(item.editor)}</Link>
            </div>

            <div style={{ marginTop: 20, padding: '12px 16px', background: '#1a1d24', border: '1px solid #22252e', borderLeft: '3px solid #ff8800', borderRadius: '0 3px 3px 0' }}>
              <Link href="/advisor" style={{ fontSize: 11, color: '#ff8800', textDecoration: 'none', letterSpacing: 1, fontWeight: 700 }}>
                ⬢ Want a build based on this intel? Open the Build Advisor →
              </Link>
            </div>

            <CoachCTA variant="compact" />

          </article>

          {hasDataRef && (
            <aside className="intel-data-aside" style={{ position: 'sticky', top: 64, paddingTop: 32 }}>
              <div style={{ background: '#1a1d24', border: '1px solid #22252e', borderTop: '2px solid ' + editor.color, borderRadius: '0 0 3px 3px', padding: 18 }}>
                <div style={{ fontSize: 9, color: editor.color, letterSpacing: 3, marginBottom: 18, paddingBottom: 10, borderBottom: '1px solid #22252e', fontWeight: 700, textTransform: 'uppercase' }}>
                  Data Reference · {allMentionedItems.length} ITEMS
                </div>

                {mentionedShells.map(function(shell, i) {
                  return <SidebarItemCard key={'sh-' + i} item={shell} type="shell" editorColor={editor.color} />;
                })}

                {mentionedWeapons.map(function(weapon, i) {
                  return <SidebarItemCard key={'wp-' + i} item={weapon} type="weapon" editorColor={editor.color} />;
                })}

                {mentionedMods.map(function(mod, i) {
                  return <SidebarItemCard key={'mo-' + i} item={mod} type="mod" editorColor={editor.color} />;
                })}

                {mentionedImplants.map(function(imp, i) {
                  return <SidebarItemCard key={'im-' + i} item={imp} type="implant" editorColor={editor.color} />;
                })}
              </div>
            </aside>
          )}
        </div>

        {related && related.length > 0 && (
          <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #1e2028' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, textTransform: 'uppercase' }}>Related Intel</span>
              <div style={{ flex: 1, height: 1, background: '#1e2028' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 6 }}>
              {related.map(function(rel, i) {
                var relEditor = EDITOR_STYLES[rel.editor] || EDITOR_STYLES.CIPHER;
                return (
                  <Link key={i} href={'/intel/' + rel.slug} className="article-related" style={{
                    textDecoration: 'none', display: 'block',
                    background: '#1a1d24', border: '1px solid #22252e',
                    borderTop: '2px solid ' + relEditor.color + '70',
                    borderRadius: '0 0 3px 3px', padding: '13px 15px',
                    transition: 'background 0.1s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid ' + relEditor.color + '40', background: '#0e1014' }}>
                        <img src={'/images/editors/' + rel.editor.toLowerCase() + '.jpg'} alt={edTag(rel.editor)} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                      </div>
                      <span style={{ fontSize: 8, color: relEditor.color, letterSpacing: 2, fontWeight: 700 }}>{edTag(rel.editor)}</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4, marginBottom: 6 }}>{rel.headline}</div>
                    <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', letterSpacing: 1, fontFamily: 'monospace', fontWeight: 700 }}>{timeAgo(rel.created_at)}</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════

export default async function IntelPage({ params }) {
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  var { slug } = await params;
  var editorConfig = EDITORS[slug.toLowerCase()];

  if (editorConfig) {
    var items = [];
    try {
      var { data } = await supabase.from('feed_items').select('headline, body, slug, tags, ce_score, created_at, source, thumbnail, source_url').eq('editor', editorConfig.name).eq('is_published', true).eq('game_slug', 'marathon').eq('noindex', false).order('created_at', { ascending: false }).limit(50);
      if (data) items = data;
    } catch (err) { console.error('EditorLanePage fetch error:', err); }
    return <EditorLanePage config={editorConfig} items={items} />;
  }

  var [itemResult, shellResult, weaponResult, modResult, implantResult, factionResult, uniqueResult] = await Promise.all([
    // is_published guard (matches the DMZ route): an unpublished slug resolves to
    // null -> notFound() below. This gates BOTH the normal ArticlePage and the
    // discourse branch (which runs after the null check), so unpublished drafts --
    // including VANTAGE discourse drafts -- never render at /intel/<slug>.
    supabase.from('feed_items').select('*').eq('slug', slug).eq('game_slug', 'marathon').eq('is_published', true).maybeSingle(),
    supabaseService.from('shell_stats').select('name, role, base_health, base_shield, active_ability_name, active_ability_description, passive_ability_name, image_filename').limit(20),
    supabaseService.from('weapon_stats').select('name, damage, fire_rate, magazine_size, weapon_type, ammo_type, image_filename').limit(40),
    supabaseService.from('mod_stats').select('name, slot_type, rarity, effect_desc').limit(120),
    supabaseService.from('implant_stats').select('name, slot_type, rarity, passive_name, passive_desc, stat_1_label, stat_1_value, stat_2_label, stat_2_value, image_filename').limit(100),
    supabaseService.from('factions').select('name, leader, focus, image_filename').limit(20),
    // UNIQUES (2026-07-20). The only entity type whose inline card is a real
    // <Link>. Every /uniques/[slug] canonical had exactly two inbound internal
    // links -- the hub and its base-weapon page -- and ZERO from the 1,569
    // article corpus, because no card type links and article bodies are plain
    // text with no link syntax. Uniques get named in articles constantly, so
    // matching them here converts those existing mentions into real links.
    // Deliberately uniques-ONLY: converting weapon/shell/mod/implant/faction
    // cards to links is a much larger crawl-graph change and is a separate call.
    supabaseService.from('unique_weapons').select('name, slug, base_weapon, weapon_type, rarity, acquisition_source').eq('game_slug', 'marathon').limit(40),
  ]);

  if (!itemResult.data) notFound();

  // VANTAGE discourse pieces render via the game-neutral DiscourseArticle renderer,
  // branched in BEFORE the Marathon-coupled ArticlePage (which is never touched --
  // no stat-card injection, editor lane, or portrait). Canonical home stays
  // /intel/<slug> for a marathon-subject discourse piece. Skips the comments /
  // avatar / related fetches below (they assume Marathon editorial).
  if (isDiscourseArticle(itemResult.data)) {
    return <DiscourseArticle item={itemResult.data} ogImageUrl={'https://cyberneticpunks.com/intel/' + itemResult.data.slug + '/opengraph-image'} />;
  }

  var comments = [];
  if (itemResult.data) {
    var { data: commentData } = await supabase
      .from('article_comments')
      .select('editor, body, created_at')
      .eq('article_id', itemResult.data.id)
      .order('created_at', { ascending: true });
    comments = commentData || [];
  }

  // Creator-spotlight avatar: only fetch when this article is a spotlight with a
  // twitch handle. Normal articles skip this entirely (zero added cost). Never throws.
  var creatorAvatar = null;
  try {
    var ciData = itemResult.data.creator_info || {};
    if (itemResult.data.directive_type === 'creator_spotlight' && ciData.twitch) {
      var loginClean = ciData.twitch.split('?')[0].replace(/\/+$/, '').split('/').pop();
      if (loginClean) {
        var avatarMap = await getUserAvatars([loginClean]);
        creatorAvatar = avatarMap[loginClean.toLowerCase()] || null;
      }
    }
  } catch (e) {
    creatorAvatar = null;
  }

  var related = [];
  try {
    var articleTags = itemResult.data.tags || [];
    if (articleTags.length > 0) {
      // DMZ migration (step 3, batch C2): pass the producing game's slug so
      // related articles are scoped to the same game (the get_related_articles
      // RPC now filters on game_slug). Constant 'marathon' for now; becomes the
      // per-game target when DMZ content is served -- same parameterization-
      // pending pattern as the Batch B PRODUCING_GAME_SLUG constants + the cron
      // writer literal. Passed explicitly; the function's DEFAULT 'marathon' is
      // only a rollout/safety net, not relied on in normal operation.
      var rpcResult = await supabase.rpc('get_related_articles', { p_article_id: itemResult.data.id, p_tags: articleTags, p_limit: 6, p_game_slug: 'marathon' });
      if (!rpcResult.error && rpcResult.data) related = rpcResult.data;
    }
    if (related.length === 0) {
      var fallback = await supabase.from('feed_items').select('headline, slug, editor, tags, created_at').eq('is_published', true).eq('game_slug', 'marathon').eq('noindex', false).neq('slug', slug).order('created_at', { ascending: false }).limit(6);
      if (!fallback.error && fallback.data) related = fallback.data;
    }
    // SEO prune: the get_related_articles RPC takes no noindex param, so drop any
    // de-indexed related rows here -> we never internally link to a noindexed page.
    if (related.length > 0) {
      var relSlugs = related.map(function(r) { return r.slug; });
      var { data: niRows } = await supabase.from('feed_items').select('slug').in('slug', relSlugs).eq('noindex', true);
      if (niRows && niRows.length > 0) {
        var niSet = {};
        niRows.forEach(function(r) { niSet[r.slug] = true; });
        related = related.filter(function(r) { return !niSet[r.slug]; });
      }
    }
  } catch (err) { /* non-fatal */ }

  return (
    <ArticlePage
      item={itemResult.data}
      shells={shellResult.data || []}
      weapons={weaponResult.data || []}
      mods={modResult.data || []}
      implants={implantResult.data || []}
      factions={factionResult.data || []}
      uniques={uniqueResult.data || []}
      comments={comments}
      related={related}
      creatorAvatar={creatorAvatar}
    />
  );
}