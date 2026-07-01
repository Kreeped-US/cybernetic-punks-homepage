// lib/useTrack.js
// Lightweight usage tracking utility
// Usage: track('advisor_generate', { shell: 'Thief', playstyle: 'aggressive' })
//        track('advisor_generate', { ... }, 'dmz')   // per-game (3rd arg)
//
// gameSlug is OPTIONAL and defaults to 'marathon', so every existing Marathon
// call site (which passes only event + data) is unchanged. Pass a 3rd arg when a
// future DMZ/other-game surface fires an event.

export async function track(eventName, data, gameSlug) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, data: data || null, game_slug: gameSlug || 'marathon' }),
    });
  } catch (_) {
    // Never throw — tracking is best-effort, never breaks the UI
  }
}
