# Editor-Rework Scoping Audit (read-only)

Read-only inventory + findings to scope the editor rework BEFORE any code changes —
the FEED_ITEMS_AUDIT-style map the build is sequenced from. Reference:
[editorial-staff-model.md](editorial-staff-model.md) (the locked rework: roster, names/tags,
voices, newsroom branding). No code was changed to produce this.

---

## Q1 — Backend-key viability (pivotal)

**Verdict: keep codenames as internal keys — display-layer-only is viable, but it's NOT a
trivial swap because display currently *equals* the key in ~15+ render sites.**

The canonical key is the **`feed_items.editor` column**, storing **uppercase codenames**
(`CIPHER`, `NEXUS`, `DEXTER`, `GHOST`, `MIRANDA`). Used as an identifier in:
- `EDITOR_PROMPTS` / `EDITOR_TOOLS` lookup keys (`editorCore.js:295,307`), `callEditor` routing
- `COMMENT_VOICES` / `COMMENT_AFFINITY` keys + `selectCommenters` (`editorCore.js:1240,1334`)
- cron generation list (`cron/route.js:666`)
- every `.eq('editor','CIPHER')` read (all Group-A surfaces), the lowercase URL slug
  (`/intel/cipher`), and portrait filenames `/images/editors/{codename}.jpg`

**The catch:** there is no display-name layer today — the UI prints `item.editor` (the raw
key) directly, and `EDITOR_STYLES.label` / `config.name` are literally `'CIPHER'`. So the
codename is **BOTH key and displayed string** at every byline/label.

**Recommendation (confirms the lean):** keep keys as-is (`cipher`…`broker`), **introduce one
canonical display map** (`key -> { fullName, tag, role, color, symbol, bio, image }`) as the
single source of truth, and route every render site through it. **No DB migration, no key
change** — but "display only" still spans ~15 sites + the new map. Clean separation is real;
it's wide, not deep.

> Sub-decision: the JSON-LD `author` (`intel/[slug]:1025`) prints `item.editor + ' —
> CyberneticPunks'`. Decide if schema author becomes "Marcus Vane" or stays the codename
> (SEO-facing).

---

## Q2 — Editor-identity inventory

### KEY-use (leave alone if keys stay)
| location | role | subsystem |
|---|---|---|
| `feed_items.editor` (DB) + all `.eq('editor',…)` reads | canonical key | data |
| `editorCore.js` `EDITOR_PROMPTS`/`EDITOR_TOOLS` (295,307) | persona routing keys | persona prompts |
| `editorCore.js` `COMMENT_VOICES` (1240), `COMMENT_AFFINITY`, `selectCommenters` (1334) | comment routing + **hardcoded 5-list (1336)** | article_comments |
| `cron/route.js` (666-670) | generation loop, **5-entry list** | cron |
| `lib/gather/*` (cipher.js, miranda.js, index.js NEXUS/DEXTER/GHOST) | per-editor data inputs | gather |
| `/public/images/editors/{codename}.jpg` | portrait assets | assets |

### DISPLAY-use (gets new name via the map) — many also print the key (**BOTH**)
| location | what renders |
|---|---|
| `intel/[slug]/page.js` | `EDITORS` cfg (10-14), `EDITOR_STYLES` (17-23), `OTHER_EDITOR_CONFIG` (595), byline (1074-92), comments (1184-93), related (1214), "MORE FROM {item.editor}" (1135), lane page (633-685), JSON-LD author (1025) |
| `editors/page.js` (54+) | the **"our editors" page** (roster/bios) |
| `Footer.js` (14-19), `Nav.js` (INTEL dropdown) | editor nav links |
| `HomeEditorReactions.js`, `HomeIntelFeed.js` (13, **5-array**) | home feed/reactions |
| `guides/[category]/page.js` (371) | editor cfg |
| `page.js` (426-428) | homepage product cards |

### Separate user-facing "functional-label" layer (NOT codenames)
"our build AI / meta AI / field-guide AI": `builds/page.js`, `builds/layouts.js`,
`guides/page.js`, `guides/[category]`, `guides/shells/[name]`, `FactionAdvisorCallout.js`,
`CoachCTA.js`, `join/intake/IntakeClient.js`, `page.js`. **Decision needed:** keep these
functional descriptors, or re-point to named editors? (The doc's "user-facing codename
cleanup.")

### Hardcoded "5 editors" copy
`intel/layout.js` (×3 "5 autonomous AI editors") -> 6 / "the newsroom".

---

## Q3 — Risk buckets

- **A. Display rename** — route ~15 sites through the new display map. *Low-risk IF keys
  stay*, but wide (touches the most files). Mechanical once the map exists.
- **B. Voice injection** — rewrite `EDITOR_PROMPTS` + `COMMENT_VOICES` with the cranked
  voices. **Changes article OUTPUT — medium risk** (tone/quality drift); wants before/after
  sampling.
- **C. New surfaces** — rebuild `/editors`, add masthead + "our editors" cards/portraits.
  **Mostly additive — low-ish risk.**
- **D. The 6th editor (Vera Sloan / Broker)** — **highest effort/risk.** Threading a 6th
  into a system built for 5 hits: `EDITOR_PROMPTS`/`TOOLS`, cron list, `COMMENT_VOICES`/
  `AFFINITY`, **`selectCommenters` 5->6 (1336)**, `EDITOR_STYLES`, every 5-array
  (`HomeIntelFeed:13`, `OTHER_EDITORS:594`, Footer, Nav, editors page), a new portrait
  asset, `/intel/broker` — **and a brand-new economy/market DATA SOURCE** (every other
  editor has a bespoke gather pipeline; Broker has none). That data pipeline is the real
  lift — arguably its own mini-audit.

### Flagged surprises
- **`selectCommenters` hardcodes `['CIPHER','NEXUS','DEXTER','GHOST','MIRANDA']` (1336).** A
  6th editor is silently excluded from commenting until this is updated.
- **Silent CIPHER fallback:** `EDITOR_STYLES[item.editor] || EDITOR_STYLES.CIPHER` and the
  `EDITORS[...] || CIPHER` configs mean a `BROKER` article published *before* its display
  config exists **renders as CIPHER** (red, wrong name). -> display config MUST land before
  any Broker article.
- **Per-editor data inputs are bespoke** — Broker's economy source doesn't exist; it's not a
  config add, it's a pipeline build.
- **Display == key everywhere** — the rename is broad (raw `item.editor` printed at many
  sites), not a 5-string config edit.

---

## Q4 — Recommended sequencing (safest/most-additive first)

0. **Confirm key-strategy** (keys stay; codenames remain `cipher`…). Foundation decision.
1. **Build the canonical display map** (new module, single source of truth) — additive,
   wired to nothing yet. *(enables A & C)*
2. **Bucket C — new surfaces** off the map: rebuild `/editors`, masthead, "our editors"
   cards + portraits. Additive; gate: visual review.
3. **Bucket A — display rename**: route all render sites + bylines through the map ->
   "Full Name / Tag". Display-only, keys untouched. Gate: bylines/nav/footer show new names;
   `feed_items.editor` unchanged; build green + Marathon visual spot-check.
4. **Functional-label cleanup**: resolve "build AI/meta AI/field-guide AI" + "5 editors"->
   "6"/"the newsroom" copy. Copy-only.
5. **Bucket B — voice injection**: update `EDITOR_PROMPTS` + `COMMENT_VOICES`. Gate: dry-run
   cron / before-after sample review per editor (output-changing).
6. **Bucket D — the 6th editor, LAST**, sub-sequenced: (a) design + build Broker's economy
   data source [its own scoped step], (b) add Broker's key across persona/tools/cron/
   comments/`selectCommenters`/styles/arrays + portrait + `/intel/broker`, (c) only then let
   Broker publish. Gate each.

**Rationale:** every step before B is additive or display-only (reversible, no output
change); B changes output (gated by sampling); D is both new-output and new-plumbing
(highest risk, isolated last). The silent-fallback finding makes "display config before
content" a hard ordering rule for D.
