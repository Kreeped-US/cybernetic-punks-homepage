// lib/gather/youtubeSource.js
// Single-video-by-URL source builder for the VANTAGE discourse fetch-on-paste path
// (scripts/gen-vantage-discourse.mjs). Reuses the existing free transcript fetch
// (lib/gather/transcript.js) and adds ONE videos.list snippet read, then produces the
// SAME source_text shape the auto discourse script uses (title + channel + description
// + transcript). HONEST-NULL by design: returns null when the url is not a YouTube
// video, the API key is missing, the id is not found, or the source is too thin -- it
// never fabricates source material.
//
// youtubeIdFromUrl + buildSourceText were LIFTED here VERBATIM from
// scripts/gen-vantage-discourse-auto.mjs so the manual and auto discourse paths share
// ONE copy (no duplication). The auto script now imports them from here.

import { fetchTranscript } from './transcript.js';

var YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

// Eligibility floor: a description under this length is typically links/boilerplate,
// not an argument. Videos WITH a transcript qualify regardless. Mirrors the auto
// script's MIN_DESC_CHARS so both discourse paths gate source substance identically.
export var MIN_DESC_CHARS = 300;

// Extract the 11-char YouTube id from a watch/embed/youtu.be URL.
export function youtubeIdFromUrl(url) {
  if (!url) return null;
  var m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Build the in-memory source_text from a video: title + channel + FULL description
// + FULL transcript (not truncated -- the transcript/description is the honesty
// substance, unlike formatForEditor's 800-char slice for the per-cycle prompt).
export function buildSourceText(v) {
  var parts = [];
  parts.push('VIDEO TITLE: ' + v.title);
  parts.push('CHANNEL: ' + (v.channelTitle || v.channel || 'Unknown'));
  if (v.published_at) parts.push('PUBLISHED: ' + v.published_at);
  parts.push('');
  parts.push('DESCRIPTION:');
  parts.push((v.description && v.description.trim()) ? v.description.trim() : '(no description)');
  if (v.transcript && v.transcript.trim()) {
    parts.push('');
    parts.push("AUTO-GENERATED TRANSCRIPT (the creator's actual words -- the primary substance):");
    parts.push(v.transcript.trim());
  }
  return parts.join('\n');
}

// Fetch ONE video's snippet metadata (title, channel, description, publish date) by id.
// Returns the normalized meta object, or null (key missing, or id not found). Throws on
// a non-2xx API response so the caller can report the failure (and fall back to paste).
export async function fetchYouTubeVideoMeta(id, apiKey) {
  if (!id || !apiKey) return null;
  var url = YOUTUBE_API_BASE + '/videos?' + new URLSearchParams({ part: 'snippet', id: id, key: apiKey });
  var res = await fetch(url);
  if (!res.ok) throw new Error('YouTube videos.list ' + res.status);
  var data = await res.json();
  var item = data && data.items && data.items[0];
  if (!item || !item.snippet) return null;
  var sn = item.snippet;
  return {
    youtube_id: id,
    title: sn.title || '',
    channelTitle: sn.channelTitle || '',
    description: sn.description || '',
    published_at: sn.publishedAt || null,
  };
}

// Orchestrate the single-video fetch for fetch-on-paste. Parses the id from a YouTube
// url, reads snippet metadata + the (free) auto-transcript, and returns
// { source_text, creatorName, hadTranscript } -- or null when the url is not a YouTube
// video, the API key is missing, the id is not found, or the source is too thin
// (no transcript AND a description under MIN_DESC_CHARS). NEVER fabricates: a thin or
// empty source returns null so the caller falls through to the paste-required refusal.
export async function fetchYouTubeSource(url, apiKey) {
  var id = youtubeIdFromUrl(url);
  if (!id) return null;              // not a YouTube video url -> caller falls through
  if (!apiKey) return null;          // no snippet metadata without the API key
  var meta = await fetchYouTubeVideoMeta(id, apiKey);
  if (!meta) return null;            // id not found / API returned nothing usable
  var transcript = null;
  try { transcript = await fetchTranscript(id); } catch (e) { transcript = null; }
  var hasTranscript = !!(transcript && transcript.trim());
  var descLen = (meta.description || '').trim().length;
  if (!hasTranscript && descLen < MIN_DESC_CHARS) return null; // too thin -- honest-null
  var v = {
    title: meta.title,
    channelTitle: meta.channelTitle,
    description: meta.description,
    published_at: meta.published_at,
    transcript: transcript,
  };
  return {
    source_text: buildSourceText(v),
    creatorName: meta.channelTitle || null,
    hadTranscript: hasTranscript,
  };
}
