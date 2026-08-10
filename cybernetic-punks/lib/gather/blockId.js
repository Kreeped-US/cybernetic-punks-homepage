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

// STORE-ROW CITATION (2026-08-10, content-model precondition -- see
// docs/VERIFIED_GROUNDED_REASONING.md). Verified store rows become first-class
// citable blocks, parallel to [BN]/[YT]. Prefix per stat table; only the 5 stat
// tables that carry verified rows (weapon/shell/core/mod/implant) mint ids here.
export const STORE_PREFIX = {
  weapon_stats: 'WS', shell_stats: 'SH', core_stats: 'CS', mod_stats: 'MS', implant_stats: 'IS',
};
// A verified store row is the SOURCE OF RECORD for the stat fact it grounds, so it
// ranks at the top tier when an article cites both a store row and an external
// block. Carried on the registry entry as `priority` (resolveCitedBlocks prefers it).
export const STORE_SOURCE_PRIORITY = 0;

// MASTER FLAG (default OFF): gates the WHOLE store-row-citation behavior as ONE
// switch, so there is never a half-state (cites-without-resolving). OFF (staged, the
// current production state) -> fetchGameContext presents rows as PROSE (no ids, no
// cite instruction) AND the write-site does not merge the store registry: live NEXUS
// is byte-identical to pre-store-citation. ON -> rows are tagged citable blocks, the
// editor is told to cite them, and store ids resolve to provenance. Read at CALL time
// (not import) so the dry-run can force it on via env before invoking callEditor.
// Armed deliberately (env STORE_ROW_CITATION_ENABLED=true) once the content model
// reaches step 3, per docs/VERIFIED_GROUNDED_REASONING.md build-before-publish.
export function storeRowCitationEnabled() {
  return process.env.STORE_ROW_CITATION_ENABLED === 'true';
}

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
    // priority is carried through so store-row entries (which set an explicit
    // priority) can outrank label-keyed entries; [BN]/[YT] entries have no
    // priority field and fall back to SOURCE_PRIORITY[source] -- byte-unchanged.
    if (hit) resolved.push({ id: id, source: hit.source, url: hit.url, priority: hit.priority });
    else rejected.push(id);
  }
  if (resolved.length === 0) {
    return { verified_source: null, verified_source_url: null, resolved: resolved, rejected: rejected };
  }
  const prio = (r) => (r.priority != null ? r.priority : (SOURCE_PRIORITY[r.source] != null ? SOURCE_PRIORITY[r.source] : 99));
  resolved.sort((a, b) => prio(a) - prio(b));
  const primary = resolved[0];
  return { verified_source: primary.source, verified_source_url: primary.url, resolved: resolved, rejected: rejected };
}

// STORE-ROW MINTER (content-model precondition). A single-pass minter used by
// fetchGameContext: as it renders each store row it calls tag(table, row), which
// -- for a VERIFIED row of a known stat table ONLY -- mints the next [PREFIX n] id,
// registers id -> { source: row.verified_source, url: null, priority }, and returns
// '[ID] ' to prefix the rendered line. Emit + register happen in ONE pass so the id
// the editor SEES and the id the resolver looks up cannot drift. Unverified rows (or
// unknown tables) return '' and are NOT citable -- a citation must MEAN verified.
export function makeStoreMinter() {
  const registry = new Map();
  const counters = {};
  return {
    registry,
    tag(table, row) {
      const prefix = STORE_PREFIX[table];
      if (!prefix || !row || row.verified !== true) return '';
      counters[prefix] = (counters[prefix] || 0) + 1;
      const id = prefix + counters[prefix];
      registry.set(id, { source: row.verified_source || null, url: null, priority: STORE_SOURCE_PRIORITY });
      return '[' + id + '] ';
    },
  };
}

// The store-aware cited_blocks tool-field description. The tool-field description is
// the LEVER the model reads to decide what goes in cited_blocks (mechanism finding,
// docs/VERIFIED_GROUNDED_REASONING.md), so it must (1) name store ids and (2) for
// STEP 2, instruct citing the PREMISES of a build recommendation (the shell + the
// specific cores/components it rests on). callEditor swaps this in per-call only when
// the master flag is ON (via toolWithStoreCites); OFF -> the tool is unchanged.
export const CITED_BLOCKS_SCHEMA_STORE_DESC = 'IDs of the context blocks whose FACTS you actually used, copied exactly from the bracketed ids shown in your context. TWO kinds: external sources ("BN1", "YT2") AND verified store rows ("WS3" weapon, "SH6" shell, "CS2" core, "MS4" mod, "IS9" implant) -- you MUST cite the store-row id for every verified stat, ability, kit, or perk fact you took from a tagged database row. AND when you make a BUILD or LOADOUT RECOMMENDATION (e.g. pairing a shell with specific cores/implants/mods), cite EVERY premise the recommendation rests on: the shell id AND each specific core/component id you recommend -- "run core X on shell Y because [interaction]" must include BOTH ids. A recommendation is grounded only when the rows under it are cited. Cite ONLY ids that appear in your context; cite nothing rather than guessing. Never write a URL here -- the id alone.';

// Return a tool CLONE whose cited_blocks description is the store-aware one. Targeted
// clone (no shared-const mutation); returns the tool unchanged if it has no cited_blocks.
export function toolWithStoreCites(tool) {
  const props = tool && tool.input_schema && tool.input_schema.properties;
  if (!props || !props.cited_blocks) return tool;
  return {
    ...tool,
    input_schema: {
      ...tool.input_schema,
      properties: {
        ...props,
        cited_blocks: { ...props.cited_blocks, description: CITED_BLOCKS_SCHEMA_STORE_DESC },
      },
    },
  };
}

// STORE ADJACENCY (step 2): render a verified relation array (countered_by /
// synergizes_with / counter_items) as a one-hop neighborhood line -- ONLY when
// enabled (the master flag). When disabled, or the array is empty/not-an-array,
// returns '' so the shell block is byte-identical to pre-adjacency.
export function renderRelationLine(label, arr, enabled) {
  if (!enabled || !Array.isArray(arr) || arr.length === 0) return '';
  return '    ' + label + ': ' + arr.filter(Boolean).join(', ');
}
