'use client';
// app/u/[handle]/EditProfile.js
// Owner-only edit affordance for /u/[handle]. Rendered by the server page ONLY when
// isOwner, so a non-owner never receives this component. Toggles an inline form that
// PATCHes /api/account/profile with just the four editable field values (NO id/handle
// in the body -- the route derives the account from the session). On success it
// router.refresh()es so the server-rendered card re-reads the new values.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { brand } from '@/app/profile-preview/brand';

var PROVIDER_LABEL = {
  bungie: 'Bungie', discord: 'Discord', activision: 'Activision',
  xbox: 'Xbox', psn: 'PlayStation', steam: 'Steam',
};

var FIELD_LABEL = {
  fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
  color: brand.textFaint, marginBottom: 6, display: 'block',
};
var INPUT = {
  width: '100%', boxSizing: 'border-box', background: brand.bg, color: brand.text,
  border: '1px solid ' + brand.border, borderRadius: 4, padding: '9px 11px',
  fontSize: 13, fontFamily: 'inherit', outline: 'none',
};

export default function EditProfile({ account, providerAvatars }) {
  var router = useRouter();
  var [open, setOpen] = useState(false);
  var [displayName, setDisplayName] = useState(account.display_name || '');
  var [bio, setBio] = useState(account.bio || '');
  var [accent, setAccent] = useState(account.accent_color || '#2dd4bf');
  var [avatarUrl, setAvatarUrl] = useState(account.avatar_url || '');
  var [saving, setSaving] = useState(false);
  var [error, setError] = useState(null);

  function reset() {
    setDisplayName(account.display_name || '');
    setBio(account.bio || '');
    setAccent(account.accent_color || '#2dd4bf');
    setAvatarUrl(account.avatar_url || '');
    setError(null);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      var res = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio,
          accent_color: accent,
          avatar_url: avatarUrl,
        }),
      });
      var json = await res.json().catch(function() { return {}; });
      if (!res.ok || !json.ok) {
        setError((json && json.error) || 'Could not save. Please try again.');
        setSaving(false);
        return;
      }
      setSaving(false);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError('Could not save. Please try again.');
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 11, color: brand.textDim, letterSpacing: 0.5 }}>
          <span style={{ color: account.accent_color || brand.marathon, fontWeight: 700 }}>◆</span> This is your profile.
        </span>
        <button
          type="button"
          onClick={function() { reset(); setOpen(true); }}
          style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: brand.text, background: 'none', border: '1px solid ' + brand.borderHi, borderRadius: 3, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Edit profile
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 18, background: brand.panel, border: '1px solid ' + brand.borderHi, borderRadius: 8, padding: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: brand.text, marginBottom: 16 }}>
        Edit profile
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={FIELD_LABEL}>Display name</label>
        <input type="text" value={displayName} maxLength={32} onChange={function(e) { setDisplayName(e.target.value); }} style={INPUT} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={FIELD_LABEL}>Bio</label>
        <textarea value={bio} maxLength={300} rows={3} onChange={function(e) { setBio(e.target.value); }} style={Object.assign({}, INPUT, { resize: 'vertical', lineHeight: 1.5 })} />
        <div style={{ fontSize: 9, color: brand.textFaint, marginTop: 4, textAlign: 'right' }}>{bio.length}/300</div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={FIELD_LABEL}>Accent color</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(accent) ? accent : '#2dd4bf'} onChange={function(e) { setAccent(e.target.value); }} style={{ width: 40, height: 34, padding: 0, border: '1px solid ' + brand.border, borderRadius: 4, background: brand.bg, cursor: 'pointer' }} />
          <input type="text" value={accent} maxLength={7} onChange={function(e) { setAccent(e.target.value); }} placeholder="#2dd4bf" style={Object.assign({}, INPUT, { maxWidth: 140 })} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={FIELD_LABEL}>Avatar URL</label>
        <input type="text" value={avatarUrl} maxLength={500} onChange={function(e) { setAvatarUrl(e.target.value); }} placeholder="https://..." style={INPUT} />
        {(providerAvatars && providerAvatars.length > 0) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {providerAvatars.map(function(p) {
              return (
                <button
                  key={p.provider}
                  type="button"
                  onClick={function() { setAvatarUrl(p.url); }}
                  style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: brand.textDim, background: 'none', border: '1px solid ' + brand.border, borderRadius: 2, padding: '4px 9px', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  Use {PROVIDER_LABEL[p.provider] || p.provider} avatar
                </button>
              );
            })}
            <button
              type="button"
              onClick={function() { setAvatarUrl(''); }}
              style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: brand.textFaint, background: 'none', border: '1px solid ' + brand.border, borderRadius: 2, padding: '4px 9px', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ fontSize: 11, color: '#ff8080', background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.25)', borderRadius: 3, padding: '8px 11px', marginBottom: 14 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={function() { setOpen(false); reset(); }}
          disabled={saving}
          style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: brand.textDim, background: 'none', border: '1px solid ' + brand.border, borderRadius: 3, padding: '8px 14px', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color: '#06080b', background: brand.marathon, border: 'none', borderRadius: 3, padding: '8px 16px', cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
