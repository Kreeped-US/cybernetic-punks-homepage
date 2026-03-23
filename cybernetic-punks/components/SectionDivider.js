// components/SectionDivider.js
// Matches the ranked page section divider style exactly.
// Usage: <SectionDivider label="INTEL FEED" />

export default function SectionDivider({ label }) {
  return (
    <div style={{
      maxWidth: 1200,
      margin: '0 auto',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      marginBottom: 0,
      paddingBottom: 0,
    }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
      <span style={{
        fontFamily: 'Share Tech Mono, monospace',
        fontSize: 8,
        color: 'rgba(255,255,255,0.15)',
        letterSpacing: 6,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
    </div>
  );
}