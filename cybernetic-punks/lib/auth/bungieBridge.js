// lib/auth/bungieBridge.js
// One-time, best-effort bridge of a Bungie player into the network identity spine
// (network_account + linked_identity + player_profiles.account_id). This runs at
// LOGIN, in the Bungie callback -- a deliberate, one-time event -- NOT in the
// per-request read path (resolveSession only READS account_id).
//
// ABSOLUTE CONTRACT: this never throws. The entire body is guarded; on ANY error
// it logs [bungie-bridge] ... and returns, so the caller's login flow (cookie-set
// + redirect) proceeds regardless of whether the bridge succeeded. The bridge is
// enrichment, never a gate on auth.
//
// IDEMPOTENT: skips when player_profiles.account_id is already set, and resolves a
// pre-existing linked_identity(provider=bungie, external_id) instead of creating a
// duplicate -- so repeat logins never create multiple network_accounts.

// Turn a display name into a URL-safe handle slug.
function slugifyHandle(value) {
  var base = String(value || 'player')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!base) base = 'player';
  return base.slice(0, 24);
}

// Derive a UNIQUE handle: base, then base-2, base-3..., then a short random suffix.
// The handle column is UNIQUE NOT NULL.
async function deriveUniqueHandle(supabase, name) {
  var base = slugifyHandle(name);
  var candidate = base;
  for (var n = 1; n <= 20; n++) {
    var { data } = await supabase.from('network_account').select('id').eq('handle', candidate).maybeSingle();
    if (!data) return candidate;
    candidate = base + '-' + (n + 1);
  }
  return base + '-' + crypto.randomUUID().slice(0, 6);
}

// bridgeBungieAccount(supabase, playerId, identity)
//   supabase: the caller's service-key client (reused; no new/module-scope client).
//   playerId: player_profiles.id (the freshly upserted row).
//   identity: { membershipId, displayName, avatarUrl } from the Bungie callback.
// Returns nothing; never throws.
export async function bridgeBungieAccount(supabase, playerId, identity) {
  try {
    // Already bridged? Idempotent skip -- repeat logins create no duplicates.
    var { data: profile, error: readErr } = await supabase
      .from('player_profiles')
      .select('account_id')
      .eq('id', playerId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!profile) return;            // shouldn't happen right after the upsert
    if (profile.account_id) return;  // already linked -> done

    var extId = identity && identity.membershipId != null ? String(identity.membershipId) : null;
    if (!extId) return; // nothing to link on; cannot bridge safely

    // Self-heal / race pre-check: a bungie link may already exist (link landed but
    // the profile update didn't, or a concurrent login won).
    var { data: existingLink } = await supabase
      .from('linked_identity')
      .select('account_id')
      .eq('provider', 'bungie')
      .eq('external_id', extId)
      .maybeSingle();
    if (existingLink && existingLink.account_id) {
      await supabase.from('player_profiles').update({ account_id: existingLink.account_id }).eq('id', playerId);
      return;
    }

    var cleanName = (identity.displayName || '').replace(/#\d+$/, '').trim() || 'Player';
    var handle = await deriveUniqueHandle(supabase, cleanName);

    var { data: account, error: accErr } = await supabase
      .from('network_account')
      .insert({ handle: handle, display_name: cleanName, avatar_url: identity.avatarUrl || null })
      .select('id')
      .single();
    if (accErr || !account) throw (accErr || new Error('network_account insert returned no row'));

    var { error: linkErr } = await supabase
      .from('linked_identity')
      .insert({
        account_id: account.id,
        provider: 'bungie',
        external_id: extId,
        provider_username: identity.displayName || null,
        provider_avatar_url: identity.avatarUrl || null,
      });

    if (linkErr) {
      // Lost the UNIQUE(provider, external_id) race: resolve the winner, drop our
      // now-orphan account, point the profile at the winner.
      var { data: winner } = await supabase
        .from('linked_identity')
        .select('account_id')
        .eq('provider', 'bungie')
        .eq('external_id', extId)
        .maybeSingle();
      await supabase.from('network_account').delete().eq('id', account.id);
      if (winner && winner.account_id) {
        await supabase.from('player_profiles').update({ account_id: winner.account_id }).eq('id', playerId);
      }
      return;
    }

    await supabase.from('player_profiles').update({ account_id: account.id }).eq('id', playerId);
  } catch (e) {
    console.error('[bungie-bridge] failed (login unaffected):', e);
  }
}
