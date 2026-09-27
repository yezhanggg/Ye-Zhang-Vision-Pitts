"""Step 10: place measures for the Analysis tab.

Writes data/processed/place_measures.csv, app/src/data/place.json (128 city tracts) and app/src/data/hud_2026.json.

Run: uv run python scripts/10_build_place_measures.py            # Tier 1: CHAS bands and types, HUD API, market,
                                                                #         stock, transit, access, HAND flood, programs
     uv run python scripts/10_build_place_measures.py --tier2    # + zoning shares and map, FEMA SFHA share, parcel
                                                                #   sales and land use
     uv run python scripts/10_build_place_measures.py --refresh  # re-download the cached API / GeoJSON responses

A Tier 2 source that fails is reported and its fields stay null; the JSON is always valid. Needs tracts.csv and
acs_tract.csv (scripts 01-07) and the raw files listed in sources.py. HUD_API_KEY comes from .env and is never printed.
"""
from __future__ import annotations

import argparse
import sys
import time
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import pandas as pd

from visionpitts import place_measures as pm
from visionpitts import sources
from visionpitts import zoning_map

FOCUS_COLS = [
    "renter_hh", "le30_hh", "le30_moe", "le30_burden30", "le30_burden50", "b30_50_hh", "b30_50_burden30",
    "types_le30_elderly_alone", "types_le30_small_family", "asking_2br", "asking_n", "asking_conf", "acs_rent", "zip", "safmr_2br",
    "value_acs", "value_nbr_acs", "freq_share_qmi", "freq_dist_mi", "any_dist_mi", "departures_qmi", "departures_tract_qmi", "departures_pct",
    "jobs_1mi", "jobs_1mi_pct", "school_mi", "elem_mi", "grocery_mi", "services_halfmi",
    "hand_pct", "fema_sfha_pct", "fema_zone", "sale_median", "sale_n", "sale_nbr_median", "parcels_2_4", "vacant_parcels",
    "zoning_bytype_adu", "zoning_bytype_duplex_triplex", "zoning_bytype_small_apartment", "displacement_score",
    "lu_residential", "lu_commercial", "lu_industrial", "lu_vacant", "lu_institutional", "lu_other", "lu_vacant_lots", "lu_parcels",
]


def step(label: str, fn, failures: dict, *args, **kwargs):
    t = time.time()
    try:
        out = fn(*args, **kwargs)
        print(f"  {label}: ok ({time.time() - t:.1f}s)")
        return out
    except Exception as e:  # noqa: BLE001 -- a failed source must not stop the build: its fields stay null and it is reported
        failures[label] = f"{type(e).__name__}: {e}"
        print(f"  {label}: FAILED ({type(e).__name__}: {e})")
        traceback.print_exc(limit=2)
        return None


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tier2", action="store_true", help="also build zoning shares, FEMA SFHA share and parcel sales")
    ap.add_argument("--refresh", action="store_true", help="re-download cached API and GeoJSON responses")
    args = ap.parse_args()
    failures: dict[str, str] = {}

    print("place measures")
    tracts = pm.tracts_city()
    geoids = pd.Index(tracts["GEOID"])
    tr = pm.tract_table().reindex(geoids)
    acs = pm.acs_table()
    nbrs = pm.queen_neighbors(tracts)
    print(f"  tracts: {len(geoids)} city tracts, {int(tr['residential'].fillna(False).sum())} ranked")

    parts: list[pd.DataFrame] = []
    bands = step("CHAS Table 8 bands", pm.chas_bands, failures, geoids)
    types = step("CHAS Table 7 household types", pm.chas_household_types, failures, geoids)
    limits = step("HUD income limits (API)", pm.hud_limits, failures, 2026, args.refresh)
    safmr = step("HUD FMR / SAFMR (API)", pm.hud_safmr, failures, 2026, args.refresh)
    mkt = step("market", pm.market, failures, tr, acs, nbrs, safmr)
    stk = step("stock (ACS shares)", pm.stock, failures, acs, geoids)
    tra = step("transit (GTFS + 2020 blocks)", pm.transit_measures, failures, tracts)
    acc = step("access (LODES jobs, NCES schools, OSM services + 2020 blocks)", pm.access_measures, failures, tracts)
    hand = step("flood (HAND)", pm.hand_share, failures, geoids)
    for p in (bands, types, mkt, stk):
        if p is not None:
            parts.append(p)
    if tra is not None:
        frame, notes = tra
        parts.append(frame)
        print(f"    service day {notes['service_date']}; {notes['stops_served']} served stops, "
              f"{notes['stops_frequent']} frequent (>= {notes['frequent_min']} departures)")
    if acc is not None:
        frame, notes = acc
        parts.append(frame)
        print(f"    {notes.get('jobs_county', 0):,} county jobs on 2020 blocks; {notes.get('schools')} open regular public "
              f"schools ({notes.get('elementary')} elementary); OSM services {notes.get('services')}")
        for path in notes["missing"]:
            failures[f"access raw file {path}"] = "missing; its fields stay null"
    if hand is not None:
        parts.append(hand.to_frame())

    rules = None
    prc = None
    if args.tier2:
        print("tier 2")
        rules = pm.load_zoning_rules()
        zon = step("zoning (WPRDC districts)", pm.zoning, failures, tracts, None, rules, args.refresh)
        if zon is not None:
            parts.append(zon)
        zmap = step("zoning map (districts dissolved by code)", zoning_map.build, failures, refresh=False)
        if zmap is not None:
            print(f"    wrote {zmap['path']} ({zmap['bytes']:,} bytes, {zmap['features']} districts, "
                  f"{zmap['tolerance_m']:g} m / {zmap['dp']} dp)")
        sfha = step("FEMA NFHL download", pm.fema_download, failures, args.refresh)
        if sfha is not None:
            print(f"    {len(sfha)} SFHA polygons")
            fem = step("FEMA SFHA share", pm.fema_share, failures, tracts, sfha)
            if fem is not None:
                parts.append(fem)
        prc = step("parcels (sales since 2023, 2-4 family, vacant, land use)", pm.parcels, failures, tracts, nbrs, args.refresh)
        if prc is not None:
            parts.append(prc)
            print(f"    city-wide median valid residential sale since {pm.SALE_SINCE}: "
                  f"${prc.attrs.get('city_sale_median') or 0:,.0f} over {prc.attrs.get('city_sale_n')} sales")

    df = pm.assemble(tr, parts)
    place = pm.to_place_json(df, rules)
    city = None
    if prc is not None and prc.attrs.get('city_sale_median') is not None:
        city = {"sale_median": int(round(prc.attrs['city_sale_median'])), "sale_n": int(prc.attrs.get('city_sale_n') or 0)}
    hud = pm.to_hud_json(limits, safmr, city=city)
    sizes = pm.write_outputs(df, place, hud)
    for path, size in sizes.items():
        print(f"  wrote {path} ({size:,} bytes)")

    print(f"coverage (tracts with a value, of {len(place)})")
    for key, n in pm.coverage(place).items():
        print(f"  {key:40s} {n}")

    print("focus tracts")
    cols = [c for c in FOCUS_COLS if c in df.columns]
    focus = df.loc[[g for g in pm.FOCUS if g in df.index], cols].T
    focus.columns = [pm.FOCUS[g] for g in focus.columns]
    with pd.option_context("display.max_rows", 200, "display.width", 200):
        print(focus.to_string())
    if limits:
        print(f"HUD FY{limits['fy']} {limits['name']}: median ${limits['median']:,}")
        for pct, key in ((30, "il30"), (50, "il50"), (80, "il80")):
            print(f"  {pct}% limits 1-8 persons: {limits[key]}; 1BR ${pm.affordable_rent(limits[key], 1):,}, "
                  f"2BR ${pm.affordable_rent(limits[key], 2):,}, 3BR ${pm.affordable_rent(limits[key], 3):,}, "
                  f"senior alone ${pm.affordable_rent(limits[key], 1, persons=1):,}")
    if safmr:
        print(f"  metro FMR 0-4BR: {safmr['fmr']}; SAFMR ZIPs: {len(safmr['safmr'])}; 15207 2BR: {safmr['safmr'].get('15207', [None]*5)[2]}")

    sources.write_md()
    print(f"  wrote {sources.PROCESSED / 'sources.md'}")
    if failures:
        print("FAILED sources (fields left null):")
        for k, v in failures.items():
            print(f"  {k}: {v}")
    else:
        print("all sources built")


if __name__ == "__main__":
    main()
