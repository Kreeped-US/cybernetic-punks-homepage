// app/rising/page.js
// RISING RUNNERS — small Marathon Twitch streamers discovery hub
// Live data via <RisingRunners /> component; SEO-optimized surface.
//
// Updated April 27, 2026:
// - Colors aligned to design system tokens
// - Fonts standardized to system-ui / Orbitron / monospace
// - Mixed Tailwind + inline styles unified to inline-only
// - Breadcrumb added (visible + JSON-LD)
// - FAQ section + FAQPage schema added
// - WebPage + BreadcrumbList JSON-LD added
// - Long-tail keywords expanded
//
// Updated June 8, 2026:
// - Added Creator Spotlights section: lists creator_spotlight articles the
//   editors have published (feed_items.directive_type = 'creator_spotlight').
//
// Updated June 9, 2026:
// - Redesigned Creator Spotlight cards into horizontal "creator cards":
//   real Twitch avatar on the left (fetched in one batched Helix call via
//   getUserAvatars), ringed in the editor's accent color; creator name as the
//   headline; clickable X / Twitch / YouTube follow links directly under the
//   name; the article headline as the hook; editor byline as a corner tag.
//   Card is a <div> wrapper so the social <a> tags and the article <Link> are
//   siblings (no invalid <a>-in-<a>). Avatar <img> is only rendered when a URL
//   resolved server-side (no onError handler — build rule digest 255968484);
//   a glyph-in-accent-color placeholder is used otherwise.

import Link from 'next/link';
import RisingRunners from '@/components/RisingRunners';
import { createClient } from '@supabase/supabase-js';
import { getUserAvatars } from '@/lib/gather/twitch';
import { getEditorDisplay } from '@/lib/editors/roster';

// Display rename (editor rework Step 3): editor spotlight byline shows the
// editor's tag (proper case), not the raw uppercase codename. Null-safe.
function edTag(key) { var d = getEditorDisplay(key); return d ? (d.tag || d.fullName) : key; }

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Rising Marathon Game Streamers - Twitch Spotlights',
  description: 'Discover rising Twitch streamers playing Marathon, Bungie\'s extraction shooter. Creator spotlights for small streamers grinding the game right now.',
  keywords: [
    'Marathon streamers',
    'Marathon Twitch streamers',
    'Marathon small streamers',
    'small Marathon Twitch channels',
    'rising Marathon creators',
    'Marathon live streams',
    'new Marathon content creators',
    'best Marathon streamers to watch',
    'Marathon Twitch under 100 viewers',
    'find new Marathon streamers',
    'support small Marathon streamers',
    'discover Marathon Twitch',
  ],
  openGraph: {
    title: 'Rising Marathon Game Streamers - Twitch Spotlights',
    description: 'Live small streamers playing Marathon, Bungie\'s extraction shooter. Discover the next wave before they blow up.',
    url: 'https://cyberneticpunks.com/rising',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Rising Marathon Game Streamers',
    description: 'Live small streamers playing Marathon right now. Discover the next wave.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://cyberneticpunks.com/rising',
  },
};

// ─── DESIGN TOKENS (locked design system) ────────────────────
const BG_PAGE   = '#121418';
const BG_CARD   = '#1a1d24';
const BG_DEEP   = '#0e1014';
const BORDER    = '#22252e';
const BORDER_SUBTLE = '#1e2028';

const GHOST   = '#00ff88';  // Rising Runners is GHOST-themed (community pulse editor)
const NEXUS   = '#00d4ff';
const DEXTER  = '#ff8800';
const MIRANDA = '#9b5de5';

// Editor accent colors for spotlight cards (which editor wrote the piece)
const EDITOR_COLORS = {
  CIPHER:  '#ff2222',
  NEXUS:   '#00d4ff',
  DEXTER:  '#ff8800',
  GHOST:   '#00ff88',
  MIRANDA: '#9b5de5',
};

// Editor glyphs (used as the avatar placeholder when no Twitch image resolves)
const EDITOR_GLYPHS = {
  CIPHER:  '\u25C8', // ◈
  NEXUS:   '\u2B21', // ⬡
  DEXTER:  '\u2B22', // ⬢
  GHOST:   '\u25C7', // ◇
  MIRANDA: '\u25CE', // ◎
};

// Platform accent colors + labels for the social follow badges
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

// ─── FAQ DATA — drives both visible section AND schema ───────
const FAQS = [
  {
    q: 'Why support small Marathon streamers?',
    a: "Big Marathon streamers already have established audiences and algorithmic reach. Small streamers are putting in the work right now — learning the game, developing strategies, and building communities from scratch. A single chat message or follow can genuinely change their day. Discovering creators early is also how Marathon's community identity gets built — the next big personalities in the scene are streaming under 50 viewers right now.",
  },
  {
    q: 'How does CyberneticPunks find small Marathon streamers?',
    a: "We scan Twitch in real-time for streamers playing Marathon with under 100 viewers. The feed updates every time you visit the page — these are real players streaming right now, not algorithmic recommendations or pre-curated lists. We don't accept payment to feature streamers and we don't filter by language or region. If they're live and small, they're surfaced.",
  },
  {
    q: 'What viewer threshold makes a streamer qualify as "rising"?',
    a: "Rising Runners surfaces streamers with under 100 concurrent viewers. The threshold is intentionally generous — a streamer with 80 viewers still benefits enormously from a single new face in chat. We focus on streamers actively building rather than already-established creators with thousands of followers. As streamers grow past 100 viewers, they graduate out of the Rising feed.",
  },
  {
    q: 'Can I submit my Marathon Twitch channel to Rising Runners?',
    a: "You don't need to submit anything — if you're streaming Marathon on Twitch with under 100 viewers, you're automatically eligible. Just stream Marathon as your category and our scanner will find you. The scan runs whenever someone visits the Rising Runners page, so the feed stays current. No application, no waitlist, no curation — just stream and you're in.",
  },
  {
    q: 'When are most Marathon streamers live?',
    a: "Marathon's streaming activity peaks in evenings across each timezone — Pacific evening rush, then European afternoon, then Asian late-night. Weekend afternoons see sustained streaming throughout the day. The Rising Runners feed updates per-visit, so refreshing during your local prime time will surface the most active small streamers in your region. Marathon is a 24/7 game and someone is always grinding.",
  },
  {
    q: 'How is this different from Twitch\'s own discovery page?',
    a: "Twitch's browse page sorts by viewer count by default, which means small streamers get buried beneath established channels. Even when you sort low-to-high, you still wade through inactive streams, AFK channels, and viewer count gaming. Rising Runners filters specifically for active small streamers playing Marathon right now — no AFK, no rerun chains, no manipulation. It's a discovery tool optimized for finding actual rising creators, not a browse page.",
  },
];

// Fetch published creator-spotlight articles. createClient is called inside the
// function (never at module scope) per the Next.js 16 build rule.
async function fetchCreatorSpotlights() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data, error } = await supabase
      .from('feed_items')
      .select('headline, slug, editor, creator_info, created_at, tags')
      .eq('directive_type', 'creator_spotlight')
      .eq('is_published', true)
      .eq('game_slug', 'marathon')
      .order('created_at', { ascending: false })
      .limit(12);
    if (error) {
      console.error('[rising] spotlight fetch error:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[rising] spotlight fetch threw:', err.message);
    return [];
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var diff = Date.now() - new Date(dateStr).getTime();
  var hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

// Extract a twitch login from a creator_info.twitch URL.
// "https://www.twitch.tv/aiiygatorz" -> "aiiygatorz"
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
function socialLinks(info) {
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

export default async function RisingPage() {
  const spotlights = await fetchCreatorSpotlights();

  // Collect twitch logins from spotlights, fetch all avatars in ONE Helix call.
  const logins = [];
  for (let i = 0; i < spotlights.length; i++) {
    const login = twitchLoginFromUrl(
      spotlights[i].creator_info && spotlights[i].creator_info.twitch
    );
    if (login) logins.push(login);
  }
  let avatars = {};
  if (logins.length > 0) {
    try {
      avatars = await getUserAvatars(logins);
    } catch (e) {
      avatars = {};
    }
  }

  return (
    <main style={{
      background: BG_PAGE,
      minHeight: '100vh',
      color: '#ffffff',
      paddingTop: 48,
      paddingBottom: 80,
      fontFamily: 'system-ui, sans-serif',
    }}>

      {/* ─── BREADCRUMB ──────────────────────────────── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px 0' }}>
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 10,
          letterSpacing: 2,
          fontFamily: 'monospace',
          fontWeight: 700,
        }}>
          <Link href="/" style={{ color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>HOME</Link>
          <span style={{ color: 'rgba(255,255,255,0.1)' }}>/</span>
          <span style={{ color: GHOST }}>RISING</span>
        </nav>
      </div>

      {/* ─── HERO ─────────────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto 48px', padding: '40px 24px 0' }}>
        <h1 style={{
          fontFamily: 'Orbitron, monospace',
          fontSize: 'clamp(28px, 5vw, 40px)',
          fontWeight: 900,
          letterSpacing: '-0.3px',
          margin: '0 0 16px 0',
          lineHeight: 1.1,
        }}>
          <span style={{ color: GHOST, marginRight: 12 }}>◇</span>
          RISING <span style={{ color: GHOST }}>RUNNERS</span>
        </h1>

        <p style={{
          fontSize: 17,
          color: 'rgba(255,255,255,0.55)',
          maxWidth: 720,
          lineHeight: 1.6,
          margin: '0 0 28px',
        }}>
          The next wave of Marathon content creators. These streamers are live right now with smaller audiences — but that won&apos;t last long. Get in early, find your new favorite creator, and support the grind before they blow up.
        </p>

        {/* WHY card */}
        <div style={{
          background: BG_CARD,
          border: '1px solid ' + BORDER,
          borderLeft: '3px solid ' + GHOST,
          borderRadius: '0 3px 3px 0',
          padding: '18px 22px',
          marginBottom: 24,
        }}>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 10,
            color: GHOST,
            letterSpacing: 2,
            marginBottom: 8,
            fontWeight: 700,
          }}>
            WHY RISING RUNNERS?
          </div>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.65,
            margin: 0,
          }}>
            Big streamers already have their audience. These Runners are putting in the work right now — learning the game, developing strategies, building communities from scratch. One viewer can make their day. Your support matters more here than anywhere else in the Marathon ecosystem.
          </p>
        </div>
      </section>

      {/* ─── CREATOR SPOTLIGHTS (lead section) ───────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 22, color: GHOST }}>◇</span>
          <h2 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 26,
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.5px',
            margin: 0,
          }}>
            CREATOR <span style={{ color: GHOST }}>SPOTLIGHTS</span>
          </h2>
          <div style={{ flex: 1, height: 1, background: BORDER_SUBTLE }} />
        </div>
        <p style={{
          fontSize: 15,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.6,
          maxWidth: 720,
          margin: '0 0 24px',
        }}>
          Marathon creators worth knowing — their stories, their plays, and what they bring to the community. The people shaping the scene, covered in depth.
        </p>

        {spotlights.length === 0 ? (
          <div style={{
            background: BG_CARD,
            border: '1px solid ' + BORDER,
            borderRadius: 3,
            padding: '40px 28px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 28, color: GHOST, opacity: 0.25, marginBottom: 12 }}>◇</div>
            <div style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.4)',
              letterSpacing: 2,
              fontWeight: 700,
              fontFamily: 'monospace',
            }}>
              SPOTLIGHTS INCOMING — CHECK BACK SOON
            </div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
            gap: 16,
          }}>
            {spotlights.map(function(item, i) {
              var ec = EDITOR_COLORS[item.editor] || GHOST;
              var glyph = EDITOR_GLYPHS[item.editor] || '\u25C7';
              var info = item.creator_info || {};
              var creatorName = info.name ? info.name : 'Marathon Creator';
              var links = socialLinks(info);
              var login = twitchLoginFromUrl(info.twitch);
              var avatarUrl = login && avatars[login] ? avatars[login] : null;

              return (
                <div key={i} style={{
                  position: 'relative',
                  display: 'flex',
                  background: 'linear-gradient(135deg, ' + BG_CARD + ' 0%, ' + BG_DEEP + ' 100%)',
                  border: '1px solid ' + BORDER,
                  borderLeft: '3px solid ' + ec,
                  borderRadius: 6,
                  overflow: 'hidden',
                  minHeight: 132,
                }}>
                  {/* subtle accent glow in the corner */}
                  <div style={{
                    position: 'absolute',
                    top: -40,
                    right: -40,
                    width: 120,
                    height: 120,
                    background: ec,
                    opacity: 0.06,
                    borderRadius: '50%',
                    pointerEvents: 'none',
                  }} />

                  {/* ── AVATAR (left) ── */}
                  <div style={{
                    flexShrink: 0,
                    width: 132,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 4px',
                  }}>
                    <div style={{
                      width: 84,
                      height: 84,
                      borderRadius: '50%',
                      padding: 3,
                      background: 'linear-gradient(135deg, ' + ec + ' 0%, ' + ec + '44 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 18px ' + ec + '33',
                    }}>
                      {avatarUrl ? (
                        <img
                          src={avatarUrl}
                          alt={creatorName}
                          width={78}
                          height={78}
                          style={{
                            width: 78,
                            height: 78,
                            borderRadius: '50%',
                            objectFit: 'cover',
                            display: 'block',
                            background: BG_DEEP,
                          }}
                        />
                      ) : (
                        <div style={{
                          width: 78,
                          height: 78,
                          borderRadius: '50%',
                          background: BG_DEEP,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 30,
                          color: ec,
                        }}>
                          {glyph}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── BODY (right) ── */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '14px 18px 14px 0',
                    minWidth: 0,
                  }}>
                    {/* editor byline + timeago */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{
                        fontSize: 8,
                        color: ec,
                        background: ec + '18',
                        border: '1px solid ' + ec + '35',
                        borderRadius: 2,
                        padding: '2px 7px',
                        letterSpacing: 1.5,
                        fontWeight: 700,
                        fontFamily: 'monospace',
                      }}>
                        {(edTag(item.editor) || 'EDITOR') + ' SPOTLIGHT'}
                      </span>
                      <span style={{
                        fontSize: 8,
                        color: 'rgba(255,255,255,0.25)',
                        marginLeft: 'auto',
                        fontFamily: 'monospace',
                        letterSpacing: 1,
                      }}>
                        {timeAgo(item.created_at)}
                      </span>
                    </div>

                    {/* creator name (links to article) */}
                    <Link href={'/intel/' + item.slug} style={{
                      textDecoration: 'none',
                      display: 'block',
                    }}>
                      <div style={{
                        fontFamily: 'Orbitron, monospace',
                        fontSize: 19,
                        fontWeight: 800,
                        color: '#ffffff',
                        letterSpacing: '0.2px',
                        lineHeight: 1.15,
                        marginBottom: 6,
                      }}>
                        {creatorName}
                      </div>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'rgba(255,255,255,0.5)',
                        lineHeight: 1.4,
                        marginBottom: 10,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {item.headline}
                      </div>
                    </Link>

                    {/* follow links (siblings of the article Link) */}
                    {links.length > 0 && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginTop: 'auto',
                        flexWrap: 'wrap',
                      }}>
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
                        <Link href={'/intel/' + item.slug} style={{
                          fontSize: 9,
                          color: 'rgba(255,255,255,0.4)',
                          marginLeft: 'auto',
                          fontFamily: 'monospace',
                          letterSpacing: 1.5,
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}>
                          READ →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── LIVE RISING RUNNERS WIDGET ──────────────── */}
      <div style={{ marginTop: 56 }}>
        <RisingRunners />
      </div>

      {/* ─── HOW WE FIND THEM ────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '40px auto 64px', padding: '0 24px' }}>
        <div style={{
          background: BG_CARD,
          border: '1px solid ' + BORDER,
          borderLeft: '3px solid ' + NEXUS,
          borderRadius: '0 3px 3px 0',
          padding: '20px 24px',
        }}>
          <h3 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 13,
            fontWeight: 800,
            color: NEXUS,
            letterSpacing: 2,
            margin: '0 0 12px 0',
          }}>
            HOW WE FIND RISING RUNNERS
          </h3>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.6)',
            lineHeight: 1.65,
            margin: 0,
          }}>
            We scan Twitch in real-time for Marathon streamers with under 100 viewers. These are real players streaming right now — not algorithmic recommendations or pre-curated lists. The feed updates every time you visit. If no one is live, check back soon — Marathon is a 24/7 game and someone is always grinding.
          </p>
        </div>
      </section>

      {/* ─── FAQ SECTION ─────────────────────────────── */}
      <section style={{ maxWidth: 900, margin: '0 auto 64px', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 24,
            fontWeight: 800,
            color: '#fff',
            margin: '0 0 12px 0',
            letterSpacing: '-0.3px',
          }}>
            FREQUENTLY ASKED QUESTIONS
          </h2>
          <p style={{
            fontSize: 14,
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.6,
            maxWidth: 720,
            margin: '0 auto',
          }}>
            Common questions about Rising Runners, Marathon streamer discovery, and how the live feed works.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {FAQS.map(function(faq, i) {
            return (
              <div key={i} style={{
                padding: '18px 22px',
                background: BG_CARD,
                border: '1px solid ' + BORDER,
                borderLeft: '3px solid ' + GHOST,
                borderRadius: '0 3px 3px 0',
              }}>
                <h3 style={{
                  fontFamily: 'Orbitron, monospace',
                  fontSize: 14,
                  fontWeight: 700,
                  color: GHOST,
                  margin: '0 0 10px 0',
                  letterSpacing: '0.3px',
                }}>
                  {faq.q}
                </h3>
                <p style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.65)',
                  lineHeight: 1.65,
                  margin: 0,
                }}>
                  {faq.a}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CROSS-LINKS ─────────────────────────────── */}
      <section style={{ maxWidth: 800, margin: '0 auto 32px', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/intel/ghost" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: GHOST,
            padding: '8px 18px',
            border: '1px solid ' + GHOST + '44',
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            ◇ COMMUNITY INTEL
          </Link>
          <Link href="/editors" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            padding: '8px 18px',
            border: '1px solid ' + BORDER,
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            EDITORS →
          </Link>
          <Link href="/intel" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            padding: '8px 18px',
            border: '1px solid ' + BORDER,
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            ALL INTEL →
          </Link>
          <Link href="/meta" style={{
            fontFamily: 'Orbitron, monospace',
            fontSize: 11,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.5)',
            padding: '8px 18px',
            border: '1px solid ' + BORDER,
            borderRadius: 3,
            textDecoration: 'none',
            letterSpacing: 1.5,
          }}>
            META TIER LIST →
          </Link>
        </div>
      </section>

      {/* ─── BACK LINK ───────────────────────────────── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
        <Link
          href="/"
          style={{
            fontFamily: 'monospace',
            fontSize: 10,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.25)',
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          ← BACK TO HOME
        </Link>
      </section>

      {/* ─── JSON-LD STRUCTURED DATA ─────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Rising Runners — Marathon Streamers to Watch',
          url: 'https://cyberneticpunks.com/rising',
          description: 'Discover up-and-coming Marathon streamers on Twitch. Live small streamers under 100 viewers — surfaced in real-time.',
          isPartOf: { '@type': 'WebSite', name: 'CyberneticPunks', url: 'https://cyberneticpunks.com' },
        }),
      }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: 'https://cyberneticpunks.com',
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: 'Rising Runners',
              item: 'https://cyberneticpunks.com/rising',
            },
          ],
        }),
      }} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map(function(faq) {
            return {
              '@type': 'Question',
              name: faq.q,
              acceptedAnswer: {
                '@type': 'Answer',
                text: faq.a,
              },
            };
          }),
        }),
      }} />

      {/* ItemList of creator spotlights — only when there are spotlights to list. */}
      {spotlights.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'Marathon Creator Spotlights',
            description: 'Editorial spotlights on Marathon content creators published by the CyberneticPunks editors.',
            numberOfItems: spotlights.length,
            itemListElement: spotlights.map(function(item, i) {
              return {
                '@type': 'ListItem',
                position: i + 1,
                url: 'https://cyberneticpunks.com/intel/' + item.slug,
                name: item.headline,
              };
            }),
          }),
        }} />
      )}
    </main>
  );
}