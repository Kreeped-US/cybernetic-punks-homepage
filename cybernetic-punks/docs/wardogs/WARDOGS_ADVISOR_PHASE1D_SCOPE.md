# Wardogs Loadouts -- Phase 1d SCOPE: the two distribution channels (design proposal)

**Status:** DESIGN PROPOSAL for review. NOTHING built. No DB writes. HOLD.
**Recorded:** 2026-09-10. **Grounds in:** `WARDOGS_ADVISOR_SEO_STRATEGY.md` (Fable-corrected -- the
two channels + the domain-silhouette guard + the 5 gates), `WARDOGS_ADVISOR_ARCHITECTURE.md` (the
URL structure + build_pages reuse), and the build-phase flags in `docs/HANDOFF.md`
(one-shot floor fixed, "fastest TTK not best overall" framing).

---

## 0. Where we are / what Phase 1d does

The interactive loadouts tool is complete + verified-correct (`/wardogs/loadouts`), but it is
**unsurfaced (URL-only) and streams-and-persists-nothing** -- so it does zero for traffic or DA.
Phase 1d builds the two channels that turn the engine into the bread-and-butter:
- **Channel A** -- shareable synthesis artifacts (the DA-building lever, PRIMARY near-term).
- **Channel B** -- crawlable SEO synthesis pages (evidence-ramped, the compounding long-term surface).

Both are just **surfaces on the SAME solver engine** -- no new reasoning, only new outputs.

---

## 1. The shared foundation both channels need: PERSISTENCE (build first)

The live tool does `route -> solveLoadout -> STREAM the LLM prose` and stores nothing. Crawlers cannot
run a stream, and a shareable link needs a stable URL. **So both channels require a persisted
generation** -- exactly what Marathon already does with `build_pages` (persist `build_json` jsonb ->
SSR render -> freshness regen -> sitemap). This is the Phase 1d prerequisite.

PROPOSE a Wardogs loadout-pages store (mirrors Marathon `build_pages`, which is Marathon-shaped with
shell/weapon_slug columns -- see the operator decision in Section 6):
```
wardogs_loadout_pages (operator-run DDL)
  game_slug 'wardogs', slug (the stable URL key),
  page_kind  'hub' | 'leaf' | 'artifact',            -- which channel/shape
  class, budget_tier, level_band, playstyle,          -- the axis params (nullable per kind)
  build_json jsonb,        -- the solver output + the LLM prose (STORED, like Marathon build_json)
  used_sources jsonb, source_updated_at,              -- provenance + freshness (Marathon pattern)
  indexable boolean default false,                    -- THE RAMP SWITCH (see Section 3)
  impressions int default 0, updated_at
```
- **Rendering:** SSR from the stored `build_json` (reuse the Marathon `tools/build/[shell]` SSR-canonical
  render) -- the full result density (loadout cards, TTK viz, the FULL BOARD, the structured READ,
  provenance) rendered STATICALLY from stored json. The LLM prose is stored (non-deterministic, so we
  freeze it like Marathon does), the solver output is deterministic; freshness regen when the stores
  change (reuse `regenerateCanonical` + the `build-refresh` cron pattern).
- **Generation:** a batch/on-demand generator fills rows (reuse `gen-build-canonicals.mjs` shape) --
  runs the SAME `solveLoadout` + `generateLoadout` core, non-streamed, persists the result.
- **This foundation serves BOTH channels:** an artifact (A) and a crawlable page (B) are both a
  persisted generation at a stable slug; they differ only in `page_kind`, framing, and `indexable`.

---

## 2. CHANNEL A -- shareable synthesis artifacts (PRIMARY near-term, the DA lever)

**Why first (Fable):** on a young/low-DA domain, Channel B cannot rank yet. Shareable artifacts are the
most linkable assets the engine produces; posted "where the arguments happen" (Reddit/Discord/X) they
earn links that RAISE DA -- which is what Channel B's ranking (and its thin-content risk tolerance) is
gated on. Channel A builds the DA Channel B needs. So it leads.

**What an artifact IS:** a single generated loadout as a persistent PUBLIC page at a stable URL, plus a
rich link-preview (OG) image -- built to be screenshotted, posted, and linked.
- **URL:** `/wardogs/loadouts/build/[slug]` (a persisted generation; slug decision in Section 6).
- **Creation flow:** the interactive generator, on producing a build, offers **"Save & share this
  loadout"** -> persists the generation (`page_kind='artifact'`) -> returns the stable share URL. (The
  live generation stays gated; the SAVE creates a PUBLIC artifact page -- see gating below.)
- **The OG share-card:** a dynamic Open Graph image (Next `ImageResponse` route, or the Marathon
  share-card canvas pattern the Marathon advisor already uses) showing the loadout -- primary/secondary,
  TTK, the grade, "fastest TTK" tag, the attributed badge. This is what renders as the rich preview
  when the link is pasted. (Marathon's `generateShareCard` canvas is the working precedent.)
- **The share flow on the result:** "Copy link", "Download card", "Post to X / Discord" (the loadouts
  tool has NO share card today -- this is net-new, built on the Marathon precedent).
- **DA + funnel:** the artifact page is public + linkable (DA), carries the honest framing + provenance
  (credibility = shareability), and carries the **register-CTA** ("Generate your own custom loadout ->")
  funnelling to the gated interactive generator.

---

## 3. CHANNEL B -- crawlable synthesis pages (EVIDENCE-RAMPED, never sprouted)

**The hard rule (domain-silhouette guard):** a young/low-DA domain that SPROUTS ~150-200 templated
URLs matches the scaled-content-abuse shape even if every page is distinct. Channel B **does NOT bulk
launch.** It starts with a few canonical HUBS and GROWS leaves on evidence.

### 3.1 The launch set -- a FEW canonical HUB pages (not the grid)
Launch **per-class hubs only** (~4-6 substantive pages), indexable from day one:
- `/wardogs/loadouts/[class]` -> "Best Assault Loadout (Fastest TTK)", etc. -- a real, substantive page
  per combat class (Assault/Recon/Support/Medic + Driver/Pilot if meaningful).
- Optionally a root hub at `/wardogs/loadouts` (the tool page itself can double as the root hub with a
  crawlable intro -- it already has one).
That is the entire day-one indexable footprint: a handful of hubs, each genuinely useful. No leaves yet.

### 3.2 URL structure (from the strategy, unchanged)
```
/wardogs/loadouts                      root hub (the tool + crawlable intro)
/wardogs/loadouts/[class]              CLASS HUB          <- launches indexable
/wardogs/loadouts/[class]/[budget]     class x budget     <- leaf, ramped
/wardogs/loadouts/[class]/level-[band] class x level      <- leaf, ramped
/wardogs/loadouts/[class]/[budget]/level-[band]  deep leaf <- ramped
/wardogs/loadouts/build/[slug]         Channel A artifact (a saved generation)
```

### 3.3 The render (reuse Marathon SSR-canonical)
Each hub/leaf is SSR from stored `build_json`: the full density (loadout cards, TTK bar viz, THE FULL
BOARD, the structured READ, weapon-image slots), the provenance/tiering (attributed Swoleguy badge,
honest-null "prices TBD"), and the honest **"fastest time-to-kill" framing + class caveats** (never
unqualified "best loadout" -- a shotgun tops close-range TTK, say so). Plus the internal-link mesh
(hub <-> leaf <-> the crawlable weapon pages) for topical authority, and the register-CTA.

### 3.4 THE RAMP MECHANISM (the make-or-break -- how leaves promote on evidence)
The `indexable` flag is the ramp switch:
1. **Hubs:** `indexable=true` at launch (the small, substantive footprint).
2. **Leaves:** generated but `indexable=false` -> rendered with `robots:noindex` AND excluded from the
   sitemap. They exist (the tool can deep-link a produced intersection to its leaf), but they are NOT a
   sprout in Google's eyes.
3. **Promotion (small cohorts, on evidence):** a leaf flips to `indexable=true` ONLY when it clears,
   together: (a) **GSC-demonstrated demand** -- real impressions/queries for that intersection;
   (b) **output-distinctness** -- the solver produces a genuinely different build than its neighbours
   (near-identical -> stays a leaf / canonical to the hub); (c) **intent-distinctness** -- the query is
   demand-differentiated, not just a parameter combo. Promote a handful at a time, never in bulk.
4. **Corpus ratio:** programmatic pages stay a MINORITY of the wardogs corpus (editorial + reference
   outweigh them); if the grid approaches majority, stop promoting.
5. **Gate 3 (honest-null = NOINDEX):** where the solver returns no valid build (e.g. "$500 sniper"),
   the URL is noindex/non-render -- NEVER a published "no build found" page.

This inherits the Marathon build-generator's evidence-ramp discipline: pages EARN indexing; they are
not minted on spec. The GSC read + promotion tooling is deferred to when demand data exists.

---

## 4. Shared requirements (woven through both channels)

- **One engine, two surfaces:** both render a persisted `solveLoadout` + `generateLoadout` output. No
  new reasoning. The one-shot floor (merged) means the rankings are correct before anything publishes.
- **SEO-safe gating (operator rule):** everything that ranks or shares is PUBLIC -- Channel A artifact
  pages, Channel B hubs/leaves. The register-CTA lives ON those public pages ("generate your own ->").
  ONLY the live interactive generator is gated. No wall on content.
- **Honest framing:** "fastest time-to-kill" + class caveats on every published page; never unqualified
  "best loadout" (TTK ignores reload/range/recoil).
- **Provenance / honest-null visible:** attributed Swoleguy badge, "prices TBD", the confidence tiering
  -- the moat + E-E-A-T signal on the page.

---

## 5. Phasing -- the tomorrow-build order (each step its own gated task)

1. **PERSISTENCE FOUNDATION** -- `wardogs_loadout_pages` store (operator-run DDL) + a persist path
   (save a generation to a slug) + the SSR render-from-stored-json (reuse Marathon build_pages/SSR).
   Prereq for both channels.
2. **CHANNEL A (near-term primary)** -- the shareable artifact: save-&-share flow on the generator ->
   public `/wardogs/loadouts/build/[slug]` page + the dynamic OG card + copy/download/post flow +
   register-CTA. Start the community-distribution play (DA-building).
3. **SURFACE the tool** -- add the Wardogs nav/tile entry (+ the root hub), now that there is a public
   surface to point at. (Its own small gated task; timing flagged in Section 6.)
4. **CHANNEL B HUBS** -- generate + SSR the ~4-6 per-class hubs (indexable), the internal-link mesh,
   sitemap inclusion (reuse eligible.js). A small, substantive, evidence-worthy footprint.
5. **CHANNEL B RAMP** -- leaf generation (noindex) + the GSC-evidence promotion mechanism. DEFERRED:
   promote cohorts only as GSC shows demand. Never a bulk launch.

Near-term (tomorrow) = steps 1-2 (+ maybe 3). Steps 4-5 follow as DA accrues.

---

## 6. Operator decisions to flag (need input before/at build)

1. **Persistence table:** a NEW `wardogs_loadout_pages` (recommended -- `build_pages` is Marathon-shaped
   with shell/weapon_slug) vs generalizing `build_pages` with generic axis columns. Recommend NEW table.
2. **Hub granularity at launch:** per-class hubs only (~4-6, recommended) vs also per-budget hubs.
   Recommend per-class first (smallest substantive footprint).
3. **Share-artifact format:** dynamic OG image via Next `ImageResponse` (recommended, best link
   previews) vs the Marathon canvas share-card (downloadable) -- or both (OG for previews + a download
   button). Recommend OG route + optional download.
4. **Artifact URL:** `/wardogs/loadouts/build/[slug]` vs a shorter `/wl/[slug]` for shareability.
   Recommend the descriptive path (SEO-consistent).
5. **Surfacing timing:** surface the tool WITH Channel A (step 2/3), or wait until hubs exist (step 4)?
   Recommend surface with Channel A (there's a public artifact to point at, and the tool itself is the
   root hub).
6. **Save-artifact trigger:** auto-persist every generation (more artifacts, more DB rows) vs
   save-on-user-action ("Save & share", fewer/curated rows). Recommend save-on-action (avoids a sprout
   of low-quality auto-saved rows -- itself a silhouette concern).
7. **Freshness cadence:** reuse the Marathon `build-refresh` cron for regen when the stores change --
   confirm the cadence.

---

## 7. Summary

Phase 1d = two surfaces on the finished engine, on a shared persistence foundation. **Build order:**
persistence -> Channel A shareable artifacts (near-term, DA-building) -> surface the tool -> a few
Channel B hubs (indexable) -> ramp Channel B leaves on GSC evidence (deferred). **Non-negotiables
honored:** evidence-ramped (hubs first, leaves promoted on demand -- never a sprout), Channel A primary
near-term, "fastest TTK" framing, SEO-safe gating (only the generator gated), honest-null + attributed
provenance visible, intent-distinct pruning. **No build in this task** -- this is the plan for review.
