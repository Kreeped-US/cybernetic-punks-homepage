// lib/useTrack.js
// Lightweight usage tracking utility
// Usage: track('advisor_generate', { shell: 'Thief', playstyle: 'aggressive' })

export async function track(eventName, data) {
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, data: data || null }),
    });
  } catch (_) {
    // Never throw — tracking is best-effort, never breaks the UI
  }
}
