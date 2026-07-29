# DMZ demand research - backing evidence (2026-07)

**Source:** Mangools / KWFinder exports, DMZ demand research, July 2026. These
six CSVs are the raw backing evidence for the ranked build queue in
`docs/dmz-demand-map.md`. They are grouped BY RESEARCH GROUP (how they were
pulled), not by target canonical - re-sorting them by canonical would corrupt
the audit trail. The demand map maps rows to canonicals; these files preserve
the exports as researched.

## Files and their group -> target_canonical mapping

Per `docs/dmz-demand-map.md`:

| file | research group | primarily feeds |
|---|---|---|
| `group-a-old-dmz-proxy.csv` | old-DMZ (MW2 2022) proxy terms - the launch-demand forecast | distributes across #1 launch hub, #2 keys, and the deferred entity clusters (missions/items/loadouts) |
| `group-b-launch-intent.csv` | launch / release intent | #1 launch-info hub -> EXTEND `/dmz` |
| `group-c-hajin-map-setting.csv` | Hajin map / setting | #3 Hajin -> EXTEND `/dmz/regions/dmz-hajin-exclusion-zone-what-the-deep-dive-reveals` |
| `group-d-pois.csv` | per-POI terms | DEFERRED (per-POI detail; hub `/dmz/pois` stays indexable) - near-zero demand evidence |
| `group-e-systems-mechanics.csv` | systems / mechanics | #4 gunsmith -> BUILD NEW `/dmz/loadouts`; and the evidence for REJECTING the #5 systems-explained hub (FOB / 3D printer already have deep canonicals) |
| `group-f-comparison-evergreen.csv` | comparison / evergreen | #1 `/dmz` "dmz vs warzone" section |

## Column meaning

Header (every file): `keyword,kd,vol_known,vol_3mo,jun_2026,growth_pct,peak_2023`

- `kd` - KWFinder keyword difficulty.
- `vol_known`, `vol_3mo`, `jun_2026` - KWFinder recent search-volume reads
  (known / 3-month / the June 2026 monthly value).
- `peak_2023` - the max monthly value across the 2020-2026 history, mostly the
  2023 live-DMZ spike. This is the launch-demand forecast: what the term did
  when DMZ was actually live.
- `growth_pct` - KWFinder interest-growth percentage.

## CRITICAL: blank is NOT zero

A **blank cell means KWFinder returned no data**, NOT zero. In particular a
**blank `kd` means difficulty was unscored** (thin / no SERP signal) - treat it
as "SERPChecker the SERP manually before committing," NEVER as "easy" or "0."
An explicit `0` in a volume column is a real zero read; a blank is absence of
data. Do not fill, round, or infer any blank.
