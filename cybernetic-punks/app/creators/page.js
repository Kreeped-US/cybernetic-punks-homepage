// app/creators/page.js
// CREATOR DIRECTORY — Marathon content creators listed and searchable
// SEO targets: "Marathon YouTubers", "Marathon content creators", "Marathon streamers"

import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export var metadata = {
  title: 'Marathon Content Creators — YouTubers, Streamers & Community Voices | CyberneticPunks',
  description: 'Discover the best Marathon content creators — YouTubers, Twitch streamers, and community voices covering builds, gameplay, guides, and competitive play. Curated by CyberneticPunks.',
  keywords: 'Marathon content creators, Marathon YouTubers, Marathon streamers, Marathon Twitch, best Marathon channels, Marathon guides YouTube, Marathon gameplay creators, Marathon community creators',
  openGraph: {
    title: 'Marathon Content Creators | CyberneticPunks',
    description: 'Discover the best Marathon content creators — YouTubers, streamers, and community voices.',
    url: 'https://cyberneticpunks.com/creators',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Content Creators | CyberneticPunks',
    description: 'The best Marathon YouTubers, streamers, and community voices — curated directory.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/creators' },
};

var CYAN = '#00f5ff';
var RED = '#ff0000';
var ORANGE = '#ff8800';
var GREEN = '#00ff88';
var PURPLE = '#9b5de5';

var PLATFORM_STYLES = {
  youtube: { color: RED, label: 'YOUTUBE', icon: '▶' },
  twitch: { color: PURPLE, label: 'TWITCH', icon: '◈' },
  twitter: { color: CYAN, label: '𝕏', icon: '𝕏' },
};

var FOCUS_COLORS = {
  builds: ORANGE,
  gameplay: RED,
  guides: CYAN,
  competitive: PURPLE,
  community: GREEN,
  news: '#ffcc00',
  entertainment: '#ff66aa',
};

export default async function CreatorsPage() {
  var { data: creators } = await supabase
    .from('creators')
    .select('*')
    .eq('is_featured', true)
    .order('tier', { ascending: true })
    .order('name', { ascending: true });

  var creatorList = creators || [];

  // Group by tier
  var tierGroups = {};
  creatorList.forEach(function(c) {
    var t = c.tier || 'community';
    if (!tierGroups[t]) tierGroups[t] = [];
    tierGroups[t].push(c);
  });

  var TIER_ORDER = [
    { key: 'featured', label: 'FEATURED CREATORS', desc: 'Top Marathon content creators recognized by CyberneticPunks.', color: RED },
    { key: 'rising', label: 'RISING VOICES', desc: 'Up-and-coming creators producing quality Marathon content.', color: ORANGE },
    { key: 'community', label: 'COMMUNITY CONTRIBUTORS', desc: 'Active community members creating guides, discussions, and content.', color: GREEN },
  ];

  return (
    <main style={{ background: '#030303', minHeight: '100vh', color: '#ffffff' }}>

      {/* ─── HERO ─────────────────────────────────────── */}
      <section style={{
        padding: '120px 20px 50px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2rem, 6vw, 3rem)',
            fontWeight: 700,
            marginBottom: '12px',
          }}>
            CREATOR <span style={{ color: CYAN }}>DIRECTORY</span>
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '16px',
            color: '#999',
            lineHeight: 1.6,
            maxWidth: '600px',
            margin: '0 auto 20px',
          }}>
            The Marathon creators worth watching — YouTubers, streamers, and community voices curated by our AI editors based on content quality, consistency, and community impact.
          </p>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: '#444',
          }}>
            {creatorList.length} CREATORS LISTED
          </div>
        </div>
      </section>

      {/* ─── CREATOR TIERS ───────────────────────────── */}
      {TIER_ORDER.map(function(tier) {
        var group = tierGroups[tier.key] || [];

        return (
          <section key={tier.key} style={{
            padding: '30px 20px',
            maxWidth: '1100px',
            margin: '0 auto',
            borderTop: '1px solid ' + tier.color + '22',
          }}>
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '20px',
                fontWeight: 700,
                color: tier.color,
                marginBottom: '6px',
              }}>
                {tier.label}
              </h2>
              <p style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: '#666',
                margin: 0,
              }}>
                {tier.desc}
              </p>
            </div>

            {group.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '14px',
              }}>
                {group.map(function(creator) {
                  var platformStyle = PLATFORM_STYLES[creator.platform] || PLATFORM_STYLES.youtube;
                  var focusItems = (creator.focus || '').split(',').map(function(f) { return f.trim().toLowerCase(); });

                  return (
                    <div key={creator.id} style={{
                      background: '#0a0a0a',
                      border: '1px solid #1a1a1a',
                      borderRadius: '8px',
                      padding: '20px',
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '10px',
                      }}>
                        <div>
                          <h3 style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '16px',
                            fontWeight: 700,
                            color: '#fff',
                            margin: '0 0 4px 0',
                          }}>
                            {creator.name}
                          </h3>
                          <span style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            color: platformStyle.color,
                            padding: '2px 8px',
                            background: platformStyle.color + '11',
                            border: '1px solid ' + platformStyle.color + '22',
                            borderRadius: '3px',
                          }}>
                            {platformStyle.icon} {platformStyle.label}
                          </span>
                        </div>
                        {creator.subscribers && (
                          <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                            color: '#555',
                            textAlign: 'right',
                          }}>
                            {creator.subscribers}
                          </div>
                        )}
                      </div>

                      {creator.description && (
                        <p style={{
                          fontFamily: 'var(--font-body)',
                          fontSize: '13px',
                          color: '#777',
                          lineHeight: 1.5,
                          margin: '0 0 12px 0',
                        }}>
                          {creator.description}
                        </p>
                      )}

                      {/* Focus tags */}
                      {focusItems.length > 0 && focusItems[0] !== '' && (
                        <div style={{
                          display: 'flex',
                          gap: '6px',
                          flexWrap: 'wrap',
                          marginBottom: '12px',
                        }}>
                          {focusItems.map(function(focus) {
                            var fColor = FOCUS_COLORS[focus] || '#444';
                            return (
                              <span key={focus} style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '9px',
                                color: fColor,
                                padding: '2px 8px',
                                background: fColor + '11',
                                borderRadius: '3px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                              }}>
                                {focus}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Link */}
                      {creator.url && (
                        <a href={creator.url} target="_blank" rel="noopener noreferrer" style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          color: platformStyle.color,
                          textDecoration: 'none',
                        }}>
                          VISIT CHANNEL →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{
                padding: '30px',
                textAlign: 'center',
                background: '#0a0a0a',
                borderRadius: '8px',
                border: '1px dashed #1a1a1a',
              }}>
                <p style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  color: '#333',
                  margin: 0,
                }}>
                  SCOUTING {tier.label} — CHECK BACK SOON
                </p>
              </div>
            )}
          </section>
        );
      })}

      {/* ─── SUBMIT ──────────────────────────────────── */}
      <section style={{
        padding: '40px 20px 80px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{
          background: '#0a0a0a',
          border: '1px solid ' + CYAN + '22',
          borderRadius: '10px',
          padding: '30px',
        }}>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '16px',
            color: '#fff',
            marginBottom: '8px',
          }}>
            CREATE MARATHON CONTENT?
          </div>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            color: '#666',
            lineHeight: 1.6,
            marginBottom: '16px',
          }}>
            Our AI editors automatically discover creators through YouTube and Twitch analysis. If you want to be listed, drop your channel in our Discord and our editors will evaluate your content.
          </p>
          <a href="https://discord.gg/fgxdSD7SJj" target="_blank" rel="noopener noreferrer" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            color: CYAN,
            padding: '10px 24px',
            border: '1px solid ' + CYAN,
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            JOIN DISCORD TO SUBMIT
          </a>
        </div>
      </section>

      {/* ─── JSON-LD ─────────────────────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Marathon Content Creators Directory',
          url: 'https://cyberneticpunks.com/creators',
          description: 'Curated directory of Marathon content creators — YouTubers, streamers, and community voices.',
          mainEntity: {
            '@type': 'ItemList',
            numberOfItems: creatorList.length,
            itemListElement: creatorList.slice(0, 20).map(function(c, i) {
              return {
                '@type': 'ListItem',
                position: i + 1,
                name: c.name,
                url: c.url || 'https://cyberneticpunks.com/creators',
              };
            }),
          },
        }),
      }} />
    </main>
  );
}
