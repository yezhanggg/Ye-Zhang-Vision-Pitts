# Land use and zoning mix

What `scripts/11_build_land_use.py` and `src/visionpitts/land_use.py` produce. Descriptive only: nothing here enters a score.

## Land use (county-wide)

| item | value |
|---|---|
| Source | Allegheny County property assessments (WPRDC, 2026): `CLASSDESC`, `USEDESC`, `LOTAREA`; parcel shapes (WPRDC, 2026-09) |
| Assignment | Each parcel's representative point, EPSG:2272, joined to 2020 tracts, block groups, ZCTAs, the 129 municipalities, the city and the county. 585,356 parcel shapes placed; 584,999 assessment records. |
| Classes | `place_measures.land_use_class`: vacant first (any use containing VACANT), then public housing as residential, government / charitable / churches / cemeteries / private schools as institutional, residential class and apartment buildings as residential, then commercial and industrial; utilities, railroads, agriculture and anything else as other. |
| Measure | Share of parcel lot area by class (`lu_residential`, `lu_commercial`, `lu_industrial`, `lu_institutional`, `lu_vacant`; other is the remainder). A unit whose parcels carry no lot area falls back to shares of parcels. Counts: `vacant_lots`, `parcels`. |
| Coverage | 394 / 394 tracts, 1,061 / 1,062 block groups, 124 / 170 ZCTAs (the rest lie outside the county), 129 / 129 municipalities, city and county. |

## Zoning mix (City of Pittsburgh only)

| item | value |
|---|---|
| Source | City of Pittsburgh zoning districts (WPRDC), family table `config/zoning_rules.json` |
| Measure | Share of each city tract's and block group's area in each family (`place_measures.zoning_shares`), summed into seven groups: `zoned_single` (R1D, R1A), `zoned_2_3` (R2, R3), `zoned_multi` (RM), `zoned_mixed` (LNC, NDO, UNC, HC, RIV, GT), `zoned_industrial` (UI, NDI, GI), `zoned_parks_hillside` (P, H), `zoned_planned` (PLANNED). |
| Coverage | 128 city tracts, 314 city block groups, the city. ZIP codes and municipalities have no zoning values. |

## Where it lives

- `data/processed/land_<level>.csv`, merged into the Explore catalogue (`acs_variables.json`, groups `land` and `zoning`) and the bundled `acs_<level>.json` files as `[est, null, null]` (no margins: these are record counts, not survey estimates). `scripts/07_build_acs_levels.py` merges them back after a census rebuild.
- Supabase `acs_values` (county-wide rows) through `scripts/08_publish_supabase.py --only variables land version`.

## Caveats

- The assessed class and use describe the record, not necessarily what is on the ground today.
- Lot area is as recorded; some parcels carry none.
- ZIP codes that cross the county line count only their Allegheny County parcels.
- The zoning family grouping is a reading of the code for display; by-right statuses remain unverified.
