// ── lib/supabase.js ────────────────────────────────────────
// Lazy-initialized Supabase client. Next.js 16 evaluates module-scope code
// at build time before runtime env vars are available, so calling
// createClient() at module scope throws "supabaseUrl is required".
//
// SOLUTION: Export a Proxy that defers createClient() until first property
// access at runtime. All existing `import { supabase } from '@/lib/supabase'`
// imports continue to work unchanged — supabase.from(...), supabase.rpc(...),
// supabase.auth, etc. all still function identically.
//
// FIXED: May 15, 2026 — emergency build failure resolution
// ───────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

let _client = null;

function getClient() {
  if (_client) return _client;
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return _client;
}

// Proxy forwards every property access to the lazy client.
// supabase.from(...) → getClient().from(...)
// supabase.rpc(...) → getClient().rpc(...)
// supabase.auth.getUser() → getClient().auth.getUser()
// Etc. — fully transparent to consumers.
export const supabase = new Proxy({}, {
  get(_target, prop) {
    return getClient()[prop];
  }
});