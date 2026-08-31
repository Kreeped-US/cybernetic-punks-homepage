// app/editors/StaffCard.js
// Newsroom "our editors" staff card (editor rework Step 2, Bucket C).
// Sourced ENTIRELY from the canonical display map (lib/editors/roster.js) — no
// editor data is hardcoded here. Server component, presentational.
//
// status (from the map): 'live' editors link to their /intel/<key> lane (read
// their work); 'incoming' editors (Broker, not generating yet, no lane) render
// with NO link and an "incoming" marker — honest, and sells the expansion.
//
// PORTRAIT: renders the editor's portrait (editor.image) when a file exists
// (editorHasPortrait, roster hasPortrait flag) via the EditorPortrait client
// component, which onError-degrades to the initial-badge -- so a missing file shows
// the badge, never a broken image. The initial-badge remains the graceful fallback.

import Link from 'next/link';
import { editorInitial, editorHasPortrait } from '@/lib/editors/roster';
import EditorPortrait from '@/components/network/EditorPortrait';

const DEEP_BG = '#0e1014';
const CARD_BG = '#1a1d24';
const BORDER = '#22252e';

function CardBody({ editor }) {
  var accent = editor.color;
  var isLive = editor.status === 'live';
  return (
    <div style={{
      border: '1px solid ' + BORDER,
      borderLeft: '3px solid ' + accent,
      borderRadius: '0 3px 3px 0',
      padding: '20px 22px',
      display: 'grid',
      gridTemplateColumns: 'auto 1fr',
      gap: 18,
      alignItems: 'start',
      background: 'linear-gradient(135deg, ' + accent + '07, transparent 55%), ' + CARD_BG,
      opacity: isLive ? 1 : 0.92,
      height: '100%',
    }}>
      {/* Portrait when a file exists (editorHasPortrait), else the initial badge;
          onError also degrades to the badge. The framed box is shared by both. */}
      <div style={{
        width: 72, height: 72, flexShrink: 0,
        borderRadius: 3,
        border: '2px solid ' + accent + '55',
        background: DEEP_BG,
        overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <EditorPortrait
          src={editorHasPortrait(editor.key) ? editor.image : null}
          alt={editor.key.toUpperCase() + ' - ' + editor.fullName}
          imgStyle={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top', display: 'block' }}
          fallback={<span style={{ fontFamily: 'Orbitron, monospace', fontSize: 30, fontWeight: 800, color: accent, lineHeight: 1 }}>{editorInitial(editor.key)}</span>}
        />
      </div>

      <div style={{ minWidth: 0 }}>
        {/* Name + tag (+ incoming marker) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: accent, lineHeight: 1 }}>{editor.symbol}</span>
          <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>
            {editor.fullName}
          </span>
          {editor.tag && (
            <span style={{
              fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2,
              color: accent, background: accent + '14', border: '1px solid ' + accent + '33',
              borderRadius: 2, padding: '2px 8px', textTransform: 'uppercase',
            }}>
              {editor.tag}
            </span>
          )}
          {!isLive && (
            <span style={{
              fontFamily: 'monospace', fontSize: 8, fontWeight: 700, letterSpacing: 2,
              color: accent, background: accent + '10', border: '1px dashed ' + accent + '55',
              borderRadius: 2, padding: '2px 8px', textTransform: 'uppercase',
            }}>
              Incoming
            </span>
          )}
        </div>

        {/* Role */}
        <div style={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, letterSpacing: 2.5, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginTop: 8 }}>
          {editor.role}
        </div>

        {/* In-character bio */}
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.62)', lineHeight: 1.6, margin: '10px 0 0' }}>
          {editor.bio}
        </p>

        {/* Footer: live -> read-lane affordance; incoming -> honest "joining" note */}
        {isLive ? (
          <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, color: accent }}>
            READ {editor.tag || editor.fullName} &rarr;
          </div>
        ) : (
          <div style={{ marginTop: 12, fontFamily: 'monospace', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: 'rgba(255,255,255,0.35)' }}>
            A sixth analyst is joining the newsroom.
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffCard({ editor }) {
  // 'live' -> the card is a link into the editor's lane. 'incoming' (no lane,
  // would 404) -> render the body with no link. /intel/<key> is never built for
  // a non-live editor.
  if (editor.status === 'live') {
    return (
      <Link href={'/marathon/intel/' + editor.key} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
        <CardBody editor={editor} />
      </Link>
    );
  }
  return <CardBody editor={editor} />;
}
