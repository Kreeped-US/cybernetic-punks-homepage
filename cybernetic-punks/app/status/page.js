// app/status/page.js
// SERVER STATUS + WEEKLY RESET TRACKER
// Server component with SEO metadata, pulls from Supabase

import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export var revalidate = 60; // Revalidate every 60 seconds

export var metadata = {
  title: 'Marathon Server Status — Is Marathon Down? Live Status & Weekly Reset | CyberneticPunks',
  description: 'Is Marathon down? Live server status for Steam, PlayStation 5, and Xbox. Weekly reset schedule, ranked zone rotations, faction contracts, Armory stock, and Marathon error code reference.',
  keywords: 'Marathon server status, is Marathon down, Marathon servers down, Marathon maintenance, Marathon weekly reset, Marathon reset schedule, Marathon ranked rotation, Marathon error codes, Marathon WEASEL, Marathon BROCCOLI, Marathon server issues, Marathon outage',
  openGraph: {
    title: 'Marathon Server Status — Is Marathon Down? | CyberneticPunks',
    description: 'Live Marathon server status across all platforms. Weekly reset tracker, ranked rotations, and error code fixes.',
    url: 'https://cyberneticpunks.com/status',
    siteName: 'CyberneticPunks',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@Cybernetic87250',
    title: 'Marathon Server Status — Is Marathon Down? | CyberneticPunks',
    description: 'Live server status, weekly reset tracker, and error code reference.',
    images: ['/og-image.png'],
  },
  alternates: { canonical: 'https://cyberneticpunks.com/status' },
};

var CYAN = '#00f5ff';
var RED = '#ff0000';
var GREEN = '#00ff88';
var ORANGE = '#ff8800';
var YELLOW = '#ffcc00';
var PURPLE = '#9b5de5';

var PLATFORM_INFO = {
  steam: { label: 'STEAM (PC)', icon: '⊞' },
  playstation: { label: 'PLAYSTATION 5', icon: '△' },
  xbox: { label: 'XBOX SERIES X|S', icon: '⊕' },
};

var STATUS_STYLES = {
  online: { color: GREEN, label: 'ONLINE' },
  issues: { color: YELLOW, label: 'ISSUES' },
  maintenance: { color: ORANGE, label: 'MAINTENANCE' },
  offline: { color: RED, label: 'OFFLINE' },
};

var ERROR_CODES = [
  { code: 'BASIL', desc: 'Basic disconnect. Try logging back in. If persistent, check server status above.', severity: 'low' },
  { code: 'BROCCOLI', desc: 'GPU not detected or driver crash. Update your GPU drivers and verify your graphics card is properly installed.', severity: 'high' },
  { code: 'GINGER', desc: 'A crew member disconnected during matchmaking. Usually resolves on the disconnected player\'s end.', severity: 'low' },
  { code: 'CURRANT', desc: 'Network connectivity issue. Check your ISP status, restart your router, and try a wired connection.', severity: 'medium' },
  { code: 'WEASEL', desc: 'Lost connection to Bungie servers. Often a server-side issue during high traffic or maintenance windows.', severity: 'high' },
  { code: 'ANTEATER', desc: 'Unable to connect to Bungie. Check your NAT type, firewall settings, and ensure BattlEye is not blocked.', severity: 'medium' },
];

var RESET_DEFAULTS = [
  { title: 'RANKED ZONES', desc: 'Competitive zones rotate weekly. New Holotag targets and zone selection each reset.', icon: '◎', color: PURPLE },
  { title: 'FACTION CONTRACTS', desc: 'New contracts from all six factions. Complete them for reputation and seasonal upgrades.', icon: '⬡', color: CYAN },
  { title: 'ARMORY STOCK', desc: 'Weapons, mods, and gear in the Armory refresh weekly. Check for new Prestige-tier items.', icon: '⬢', color: ORANGE },
  { title: 'EVENTS & MODIFIERS', desc: 'Rotating map events, enemy spawns, and environmental conditions change with each reset.', icon: '◈', color: RED },
];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  var now = new Date();
  var then = new Date(dateStr);
  var diffMs = now - then;
  var diffM = Math.floor(diffMs / (1000 * 60));
  if (diffM < 1) return 'just now';
  if (diffM < 60) return diffM + 'm ago';
  var diffH = Math.floor(diffM / 60);
  if (diffH < 24) return diffH + 'h ago';
  return Math.floor(diffH / 24) + 'd ago';
}

export default async function StatusPage() {
  var { data: serverStatus } = await supabase
    .from('server_status')
    .select('*')
    .order('updated_at', { ascending: false });

  var { data: weeklyReset } = await supabase
    .from('weekly_reset')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  var { data: incidents } = await supabase
    .from('server_incidents')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  var platforms = ['steam', 'playstation', 'xbox'];
  var statusMap = {};
  (serverStatus || []).forEach(function(s) { statusMap[s.platform] = s; });

  var resetItems = (weeklyReset && weeklyReset.length > 0) ? weeklyReset : null;
  var incidentList = incidents || [];

  return (
    <main style={{ background: '#030303', minHeight: '100vh', color: '#ffffff' }}>

      {/* ─── HERO ─────────────────────────────────────── */}
      <section style={{
        padding: '120px 20px 40px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(2rem, 6vw, 3rem)',
            fontWeight: 700,
            marginBottom: '12px',
          }}>
            SERVER <span style={{ color: GREEN }}>STATUS</span>
          </h1>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '16px',
            color: '#999',
            lineHeight: 1.6,
            maxWidth: '550px',
            margin: '0 auto 20px',
          }}>
            Live Marathon server status across all platforms. Plus weekly reset schedule, ranked zone rotations, and error code reference.
          </p>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: '#444',
          }}>
            FOLLOW <a href="https://x.com/BungieHelp" target="_blank" rel="noopener noreferrer" style={{ color: CYAN, textDecoration: 'none' }}>@BUNGIEHELP</a> FOR OFFICIAL UPDATES
          </div>
        </div>
      </section>

      {/* ─── SERVER STATUS PANELS ────────────────────── */}
      <section style={{
        padding: '0 20px 40px',
        maxWidth: '900px',
        margin: '0 auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '14px',
        }}>
          {platforms.map(function(platform) {
            var info = PLATFORM_INFO[platform];
            var data = statusMap[platform];
            var status = data ? STATUS_STYLES[data.status] || STATUS_STYLES.online : STATUS_STYLES.online;

            return (
              <div key={platform} style={{
                background: '#0a0a0a',
                border: '1px solid ' + status.color + '33',
                borderRadius: '10px',
                padding: '24px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>{info.icon}</div>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13px',
                  color: '#fff',
                  letterSpacing: '1px',
                  marginBottom: '12px',
                }}>
                  {info.label}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: status.color,
                    boxShadow: '0 0 12px ' + status.color + '44',
                  }} />
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: status.color,
                    letterSpacing: '1px',
                  }}>
                    {status.label}
                  </span>
                </div>

                {data && data.note && (
                  <div style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '12px',
                    color: '#555',
                    marginTop: '6px',
                  }}>
                    {data.note}
                  </div>
                )}

                {data && data.updated_at && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: '#333',
                    marginTop: '8px',
                  }}>
                    Updated {timeAgo(data.updated_at)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── RECENT INCIDENTS ────────────────────────── */}
      {incidentList.length > 0 && (
        <section style={{
          padding: '0 20px 40px',
          maxWidth: '900px',
          margin: '0 auto',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '18px',
            color: '#fff',
            marginBottom: '16px',
          }}>
            RECENT INCIDENTS
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {incidentList.map(function(inc) {
              var sevColor = inc.severity === 'critical' ? RED : inc.severity === 'major' ? ORANGE : YELLOW;
              return (
                <div key={inc.id} style={{
                  background: '#0a0a0a',
                  border: '1px solid #1a1a1a',
                  borderLeft: '3px solid ' + sevColor,
                  borderRadius: '6px',
                  padding: '14px 18px',
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#fff',
                    }}>
                      {inc.title}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: '#444',
                    }}>
                      {timeAgo(inc.created_at)}
                    </span>
                  </div>
                  {inc.description && (
                    <p style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '13px',
                      color: '#666',
                      margin: 0,
                      lineHeight: 1.5,
                    }}>
                      {inc.description}
                    </p>
                  )}
                  {inc.resolved && (
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '10px',
                      color: GREEN,
                      marginTop: '6px',
                      display: 'inline-block',
                    }}>
                      ✓ RESOLVED
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── WEEKLY RESET ────────────────────────────── */}
      <section style={{
        padding: '40px 20px',
        maxWidth: '900px',
        margin: '0 auto',
        borderTop: '1px solid #1a1a1a',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '20px',
            color: '#fff',
            margin: 0,
          }}>
            WEEKLY <span style={{ color: CYAN }}>RESET</span>
          </h2>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            color: '#444',
            letterSpacing: '1px',
          }}>
            RESETS EVERY TUESDAY · 10 AM PT / 1 PM ET / 6 PM GMT
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '14px',
        }}>
          {resetItems ? resetItems.map(function(item) {
            return (
              <div key={item.id} style={{
                background: '#0a0a0a',
                border: '1px solid #1a1a1a',
                borderRadius: '8px',
                padding: '20px',
              }}>
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '13px',
                  color: CYAN,
                  letterSpacing: '1px',
                  marginBottom: '8px',
                }}>
                  {item.category}
                </div>
                <div style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#fff',
                  marginBottom: '6px',
                }}>
                  {item.title}
                </div>
                {item.description && (
                  <p style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: '#666',
                    lineHeight: 1.5,
                    margin: 0,
                  }}>
                    {item.description}
                  </p>
                )}
              </div>
            );
          }) : RESET_DEFAULTS.map(function(item) {
            return (
              <div key={item.title} style={{
                background: '#0a0a0a',
                border: '1px solid ' + item.color + '22',
                borderRadius: '8px',
                padding: '20px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '10px',
                }}>
                  <span style={{ fontSize: '18px', color: item.color }}>{item.icon}</span>
                  <span style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '13px',
                    color: item.color,
                    letterSpacing: '1px',
                  }}>
                    {item.title}
                  </span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: '#666',
                  lineHeight: 1.5,
                  margin: 0,
                }}>
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── ERROR CODE REFERENCE ────────────────────── */}
      <section style={{
        padding: '40px 20px 60px',
        maxWidth: '900px',
        margin: '0 auto',
        borderTop: '1px solid #1a1a1a',
      }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '20px',
          color: '#fff',
          marginBottom: '8px',
        }}>
          MARATHON ERROR CODES
        </h2>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: '14px',
          color: '#666',
          marginBottom: '20px',
        }}>
          Common error codes and what to do about them. If none of the below fixes work, post on Bungie&apos;s Help forum.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {ERROR_CODES.map(function(err) {
            var sevColor = err.severity === 'high' ? RED : err.severity === 'medium' ? ORANGE : '#555';
            return (
              <div key={err.code} style={{
                display: 'flex',
                gap: '16px',
                alignItems: 'flex-start',
                padding: '14px 18px',
                background: '#0a0a0a',
                border: '1px solid #1a1a1a',
                borderRadius: '6px',
              }}>
                <span style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '14px',
                  fontWeight: 700,
                  color: sevColor,
                  minWidth: '100px',
                  letterSpacing: '1px',
                }}>
                  {err.code}
                </span>
                <span style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  color: '#888',
                  lineHeight: 1.5,
                }}>
                  {err.desc}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── CROSS LINKS ─────────────────────────────── */}
      <section style={{
        padding: '0 20px 80px',
        maxWidth: '600px',
        margin: '0 auto',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            color: '#666',
            padding: '8px 20px',
            border: '1px solid #333',
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            ← HOME
          </Link>
          <Link href="/meta" style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '12px',
            color: CYAN,
            padding: '8px 20px',
            border: '1px solid ' + CYAN + '44',
            borderRadius: '4px',
            textDecoration: 'none',
            letterSpacing: '1px',
          }}>
            META TIER LIST →
          </Link>
        </div>
      </section>

      {/* ─── JSON-LD ─────────────────────────────────── */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: [
            { '@type': 'Question', name: 'Is Marathon down right now?', acceptedAnswer: { '@type': 'Answer', text: 'Check cyberneticpunks.com/status for real-time Marathon server status across Steam, PlayStation 5, and Xbox Series X|S.' } },
            { '@type': 'Question', name: 'When does Marathon weekly reset happen?', acceptedAnswer: { '@type': 'Answer', text: 'Marathon resets every Tuesday at 10 AM PT / 1 PM ET / 6 PM GMT. This includes ranked zone rotations, faction contracts, and Armory stock.' } },
            { '@type': 'Question', name: 'What does WEASEL error code mean in Marathon?', acceptedAnswer: { '@type': 'Answer', text: 'WEASEL means you lost connection to Bungie servers. This is often a server-side issue during high traffic or maintenance. Check server status and try again.' } },
            { '@type': 'Question', name: 'What does BROCCOLI error code mean in Marathon?', acceptedAnswer: { '@type': 'Answer', text: 'BROCCOLI means your GPU cannot be detected, usually caused by a driver crash. Update your OS and GPU drivers and ensure your graphics card is properly installed.' } },
            { '@type': 'Question', name: 'How do I fix Marathon connection issues?', acceptedAnswer: { '@type': 'Answer', text: 'Restart Marathon, check server status, restart your router, try a wired ethernet connection, ensure BattlEye is not blocked by your firewall, and update your platform software.' } },
          ],
        }),
      }} />
    </main>
  );
}
