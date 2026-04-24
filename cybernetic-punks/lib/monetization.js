// lib/monetization.js
// Central feature flag for paid/premium features.
// Flip NEXT_PUBLIC_MONETIZATION_ENABLED=true in Vercel env vars to go live.
//
// When DISABLED (default):
//   - Personal Coach teasers show locked "Coming Soon" cards
//   - Paid API calls are never fired
//   - Registration, Bungie OAuth, pick rate collection all remain ON
//
// When ENABLED:
//   - Paid features unlock for users who qualify (subscription tier, etc.)
//   - API calls to paid endpoints are permitted

export function isMonetizationEnabled() {
  return process.env.NEXT_PUBLIC_MONETIZATION_ENABLED === 'true';
}

// Future expansion — individual feature toggles can live here
// export function isPersonalCoachEnabled() { ... }
// export function isPremiumBuildsEnabled() { ... }