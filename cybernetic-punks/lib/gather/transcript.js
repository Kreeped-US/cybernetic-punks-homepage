// lib/gather/transcript.js
// Fetches auto-generated YouTube captions using youtube-transcript package
// Free — does NOT use YouTube API quota

import { YoutubeTranscript } from 'youtube-transcript';

/**
 * Fetch transcript for a single YouTube video
 * Returns cleaned transcript text or null if unavailable
 */
export async function fetchTranscript(videoId) {
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);

    if (!segments || segments.length === 0) {
      console.log(`[TRANSCRIPT] No captions available for ${videoId}`);
      return null;
    }

    // Combine all segments into one string
    let fullText = segments.map(s => s.text).join(' ');

    // Strip common auto-caption artifacts
    fullText = fullText
      .replace(/\[Music\]/gi, '')
      .replace(/\[Applause\]/gi, '')
      .replace(/\[Laughter\]/gi, '')
      .replace(/\[Cheering\]/gi, '')
      .replace(/\[Inaudible\]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Truncate to ~2000 words to keep Claude API costs reasonable
    const words = fullText.split(' ');
    if (words.length > 2000) {
      fullText = words.slice(0, 2000).join(' ') + '... [truncated]';
    }

    console.log(`[TRANSCRIPT] Got ${words.length} words for ${videoId}`);
    return fullText;

  } catch (error) {
    // Many videos won't have captions — this is expected and fine
    console.log(`[TRANSCRIPT] Unavailable for ${videoId}: ${error.message}`);
    return null;
  }
}

/**
 * Fetch transcripts for multiple videos in parallel
 * Returns a map of videoId -> transcript text (or null)
 */
export async function fetchTranscripts(videoIds) {
  const results = await Promise.allSettled(
    videoIds.map(id => fetchTranscript(id))
  );

  const transcriptMap = {};
  videoIds.forEach((id, i) => {
    transcriptMap[id] = results[i].status === 'fulfilled' ? results[i].value : null;
  });

  const found = Object.values(transcriptMap).filter(Boolean).length;
  console.log(`[TRANSCRIPT] Got transcripts for ${found}/${videoIds.length} videos`);

  return transcriptMap;
}