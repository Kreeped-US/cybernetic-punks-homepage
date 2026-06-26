// app/api/account/profile/route.js
// Owner-edit write for the network_account profile (stage b). The FIRST app-driven
// write to network_account.
//
// OWNER GATING (airtight): the target account id is session.accountId -- DERIVED
// FROM THE SESSION, never from the request body. The body carries ONLY the four
// editable field values (display_name, bio, accent_color, avatar_url); no id/handle.
// The UPDATE is .eq('id', session.accountId), so a caller can structurally only
// edit their OWN account. Mirrors the IDOR-safe pattern in /api/profile +
// /api/welcome/complete (id from session, not body).
//
// force-dynamic; service-key client in-handler (no module-scope createClient).

import { createClient } from '@supabase/supabase-js';
import { resolveSession } from '@/lib/auth/resolveSession';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
}

function isHttpUrl(s) {
  try {
    var u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

export async function PATCH(request) {
  try {
    var session = await resolveSession();
    if (!session || !session.accountId) {
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }
    // Target = the caller's OWN account, from the session. Never from the body.
    var accountId = session.accountId;

    var body = await request.json().catch(function() { return null; });
    if (!body || typeof body !== 'object') {
      return Response.json({ error: 'Invalid body' }, { status: 400 });
    }

    // Only these four fields are updatable; everything else in the body is ignored.
    var updates = {};

    if (body.display_name !== undefined) {
      var dn = String(body.display_name == null ? '' : body.display_name).trim();
      if (dn.length < 1 || dn.length > 32) {
        return Response.json({ error: 'Display name must be 1-32 characters.' }, { status: 400 });
      }
      updates.display_name = dn;
    }

    if (body.bio !== undefined) {
      var bio = String(body.bio == null ? '' : body.bio);
      if (bio.length > 300) {
        return Response.json({ error: 'Bio must be 300 characters or fewer.' }, { status: 400 });
      }
      updates.bio = bio.length ? bio : null;
    }

    if (body.accent_color !== undefined) {
      var ac = String(body.accent_color == null ? '' : body.accent_color).trim();
      if (ac === '') {
        updates.accent_color = null;
      } else if (/^#[0-9a-fA-F]{6}$/.test(ac)) {
        updates.accent_color = ac;
      } else {
        return Response.json({ error: 'Accent color must be a #RRGGBB hex value.' }, { status: 400 });
      }
    }

    if (body.avatar_url !== undefined) {
      var av = String(body.avatar_url == null ? '' : body.avatar_url).trim();
      if (av === '') {
        updates.avatar_url = null;
      } else if (av.length > 500) {
        return Response.json({ error: 'Avatar URL is too long.' }, { status: 400 });
      } else if (!isHttpUrl(av)) {
        return Response.json({ error: 'Avatar URL must be an http(s) link.' }, { status: 400 });
      } else {
        updates.avatar_url = av;
      }
    }

    if (Object.keys(updates).length === 0) {
      return Response.json({ error: 'No editable fields provided.' }, { status: 400 });
    }

    var supabase = getSupabase();
    var { data, error } = await supabase
      .from('network_account')
      .update(updates)
      .eq('id', accountId)
      .select('handle, display_name, bio, accent_color, avatar_url')
      .single();

    if (error || !data) {
      console.error('[account/profile] update error:', error);
      return Response.json({ error: 'Update failed.' }, { status: 500 });
    }

    // Echo only safe fields -- never the id/external_id/updated_at.
    return Response.json({ ok: true, profile: data });
  } catch (err) {
    console.error('[account/profile] error:', err);
    return Response.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
