import { NextResponse } from 'next/server';
import { resolveSession } from '@/lib/auth/resolveSession';
import { createClient } from '@supabase/supabase-js';

// PROMPT-INJECTION HARDENING AT THE SOURCE (June 8, 2026):
// Everything stored in loadout_snapshots is later fed into Claude prompts by
// the audit route and the ask-editor route. Rather than patch each reader, we
// sanitize free-text intake here, on write, so anything persisted is already
// clean for every current and future consumer. We strip control chars/newlines
// (so a value can't inject new prompt lines) and cap length (so a payload has
// no room to work and can't burn API budget). Numeric/enum fields are handled
// separately. Route is auth-gated (cp_player_id required).
function sanitizeField(value, maxLen) {
  if (value == null) return null;
  var s = String(value);
  s = s.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

// Sanitize an array of strings (zones, focus_areas). Drops non-strings/blanks,
// caps each element and the array length so a crafted payload can't smuggle a
// long injection string in as a list item or send thousands of items.
function sanitizeList(value, maxItems, maxLen) {
  if (!Array.isArray(value)) return [];
  var out = [];
  for (var i = 0; i < value.length && out.length < maxItems; i++) {
    var cleaned = sanitizeField(value[i], maxLen);
    if (cleaned) out.push(cleaned);
  }
  return out;
}

export async function POST(request) {
  try {
    const session = await resolveSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const playerId = session.playerProfileId;

    const answers = await request.json();

    // engagement_depth: numeric 1-10, clamp; default 5 if invalid.
    var engagementDepth = parseInt(answers.engagement_depth, 10);
    if (isNaN(engagementDepth) || engagementDepth < 1 || engagementDepth > 10) engagementDepth = 5;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: snapshot, error: snapshotError } = await supabase
      .from('loadout_snapshots')
      .insert({
        player_id: playerId,
        // Item-name fields: capped at 60. The UI offers menu choices, but the
        // route can't trust that a crafted POST did - so any string bound for a
        // prompt is sanitized regardless.
        shell: sanitizeField(answers.shell, 60),
        primary_weapon: sanitizeField(answers.primary_weapon, 60),
        secondary_weapon: sanitizeField(answers.secondary_weapon, 60),
        mod_slot_1: sanitizeField(answers.mod_slot_1, 60),
        mod_slot_1_rarity: sanitizeField(answers.mod_slot_1_rarity, 20),
        mod_slot_2: sanitizeField(answers.mod_slot_2, 60),
        mod_slot_2_rarity: sanitizeField(answers.mod_slot_2_rarity, 20),
        mod_slot_3: sanitizeField(answers.mod_slot_3, 60),
        mod_slot_3_rarity: sanitizeField(answers.mod_slot_3_rarity, 20),
        core_slot_1: sanitizeField(answers.core_slot_1, 60),
        core_slot_1_rarity: sanitizeField(answers.core_slot_1_rarity, 20),
        core_slot_2: sanitizeField(answers.core_slot_2, 60),
        core_slot_2_rarity: sanitizeField(answers.core_slot_2_rarity, 20),
        implant_1: sanitizeField(answers.implant_1, 60),
        implant_2: sanitizeField(answers.implant_2, 60),
        implant_3: sanitizeField(answers.implant_3, 60),
        // Free-text profile fields: the primary injection surface. Capped
        // generously enough for real answers, tight enough to kill payloads.
        motivation: sanitizeField(answers.motivation, 200),
        engagement_depth: engagementDepth,
        playstyle: sanitizeField(answers.playstyle, 200),
        zones: sanitizeList(answers.zones, 20, 60),
        squad_context: sanitizeField(answers.squad_context, 200),
        hours_per_week: sanitizeField(answers.hours_per_week, 40),
        focus_areas: sanitizeList(answers.focus_areas, 20, 80),
      })
      .select('id')
      .single();

    if (snapshotError) {
      console.error('Snapshot error:', snapshotError);
      return NextResponse.json({ error: 'Failed to save loadout', detail: snapshotError.message }, { status: 500 });
    }

    const { error: profileError } = await supabase
      .from('player_profiles')
      .update({
        onboarding_complete: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', playerId);

    if (profileError) {
      console.error('Profile error:', profileError);
      return NextResponse.json({ error: 'Failed to update profile', detail: profileError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, snapshot_id: snapshot.id });

  } catch (err) {
    console.error('Intake route error:', err);
    return NextResponse.json({ error: 'Server error', detail: err.message }, { status: 500 });
  }
}