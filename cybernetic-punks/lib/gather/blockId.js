// lib/gather/blockId.js
// SHARED block-identity for verified_source capture (select-resolve-audit). ONE place
// computes the per-context-block ID string, used by BOTH the prompt formatters (to
// EMIT a visible, citable [ID] next to each block) AND the write-site resolver (to
// RECONSTRUCT the id -> {source, url} registry from rawData). This is the correctness
// LYNCHPIN: if the formatter and the resolver computed IDs differently, a cited ID
// would fail to resolve -- so they MUST call this one function with these one set of
// caps. The URL in the registry comes from PIPELINE METADATA (rawData), NEVER from
// anything the LLM wrote -- the model only SELECTS an ID from a closed set.

// Per-source prompt cap: each formatter shows the top-N of its source, so only the
// top-N get citable IDs. The resolver slices to the SAME N so the ids line up. These
// caps mirror the formatters' existing slices (patchnotes engine 6, youtube 5).
export const BLOCK_CAP = { bungie: 6, youtube: 5 };
const PREFIX = { bungie: 'BN', youtube: 'YT' };
const LABEL = { bungie: 'BUNGIE', youtube: 'YOUTUBE' };
// Primary-source precedence when an editor cites more than one source: official
// Bungie notes outrank creator (YouTube) coverage as the fact-source of record.
const SOURCE_PRIORITY = { BUNGIE: 0, YOUTUBE: 1 };

// 1-based index -> stable id. blockId('bungie', 1) === 'BN1'; blockId('youtube', 2) === 'YT2'.
export function blockId(source, index1) {
  const p = PREFIX[source];
  return p ? p + index1 : null;
}

// Reconstruct the id -> { source, url } registry from the SAME rawData the write-site
// already holds (prompts._rawData.bungieNews + .youtubeVideos -- the latter is already
// the FILTERED list the formatter used, so indices align). url is pipeline metadata;
// null when the item carries none (never invented).
export function buildBlockRegistry(rawData) {
  const reg = new Map();
  const rd = rawData || {};
  (rd.bungieNews || []).slice(0, BLOCK_CAP.bungie).forEach((it, i) => {
    reg.set(blockId('bungie', i + 1), { source: LABEL.bungie, url: (it && it.url) || null });
  });
  (rd.youtubeVideos || []).slice(0, BLOCK_CAP.youtube).forEach((v, i) => {
    const url = v && v.youtube_id ? 'https://www.youtube.com/watch?v=' + v.youtube_id : null;
    reg.set(blockId('youtube', i + 1), { source: LABEL.youtube, url });
  });
  return reg;
}

// Closed-set resolution -- mirrors the meta_update handler (route.js): every cited id
// is looked up in the registry; UNKNOWN ids are REJECTED (collected for logging, never
// trusted); KNOWN ids resolve to their {source, url}. The PRIMARY fact-source (by
// SOURCE_PRIORITY) becomes verified_source + its url. Empty or all-rejected ->
// { verified_source: null } (honest-unknown; the caller flags it). The model cannot
// author a URL (we only read the registry) or name an absent source (rejected).
export function resolveCitedBlocks(citedBlocks, registry) {
  const resolved = [], rejected = [];
  const ids = Array.isArray(citedBlocks) ? citedBlocks : [];
  for (const id of ids) {
    const hit = registry.get(id);
    if (hit) resolved.push({ id: id, source: hit.source, url: hit.url });
    else rejected.push(id);
  }
  if (resolved.length === 0) {
    return { verified_source: null, verified_source_url: null, resolved: resolved, rejected: rejected };
  }
  resolved.sort((a, b) => {
    const pa = SOURCE_PRIORITY[a.source]; const pb = SOURCE_PRIORITY[b.source];
    return (pa == null ? 99 : pa) - (pb == null ? 99 : pb);
  });
  const primary = resolved[0];
  return { verified_source: primary.source, verified_source_url: primary.url, resolved: resolved, rejected: rejected };
}
