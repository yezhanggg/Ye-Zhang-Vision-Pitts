"""Step 7: ACS 2020-2024 5-year variables for tracts, block groups, ZCTAs, municipalities, Allegheny County and the
Pittsburgh place.

Per level: fetch the 84 ACS stems from the Census API (cached in data/raw/acs/, git-ignored), clean sentinels,
derive the 37 catalogue variables with MOE and CV, round, join names and the city share, then write
  data/processed/acs_<level>.csv        county-wide (394 / 1062 / 170 / 129 / 1 / 1 rows), tracked
  app/src/data/acs_<level>.json         city subset {geoid: {var: [est, moe, cv]}}
  app/src/data/geo_<level>.json         bundled FeatureCollections for bg, zcta, muni, county, city (tracts reuse tracts.json)
  data/processed/acs_variables.json + app/src/data/acs_variables.json   the catalogue and level counts
  docs/data/acs_variables.md            the human-readable catalogue
Stops if the bundled counts are not 128 / 314 / 32 / 129 / 1 / 1.
Run: uv run python scripts/07_build_acs_levels.py [--refresh] [--levels tract bg zcta muni county city]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse
import json

import pandas as pd
import requests

from visionpitts import acs_levels as al
from visionpitts import geo_levels as gl
from visionpitts.config import APP_DATA, PROCESSED, ROOT

CATALOGUE_JSON = PROCESSED / "acs_variables.json"
DOCS_MD = ROOT / "docs" / "data" / "acs_variables.md"
REL_ORDER = ["high", "medium", "low", "n/a"]


def dump(obj, path: Path) -> None:
    path.write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False))


def kb(path: Path) -> str:
    return f"{path.stat().st_size / 1024:.0f} KB"


def build_level(level: str, *, zcta_ids: list[str], refresh: bool, session: requests.Session) -> dict:
    print(f"\n{level} ({al.LEVEL_LABELS[level]})")
    county_units = gl.units(level, "county")
    city_units = gl.units(level, "city")
    for scope, n in (("county", len(county_units)), ("city", len(city_units))):
        want = gl.EXPECTED[scope][level]
        if n != want:
            sys.exit(f"{level}: {n} {scope} units, expected {want}. Fix the geometry or the rule before continuing.")
    print(f"  geometry: {len(county_units)} county-wide, {len(city_units)} in the city")

    cached = al.cache_is_complete(level) and not refresh
    raw = al.fetch_level(level, zctas=zcta_ids, refresh=refresh, session=session)
    ids = county_units["GEOID"]
    missing = sorted(set(ids) - set(raw.index))
    extra = sorted(set(raw.index) - set(ids))
    note = f"; {len(missing)} units without an ACS row" + (f" e.g. {missing[:4]}" if missing else "")
    note += f"; {len(extra)} ACS rows without geometry e.g. {extra[:4]}" if extra else ""
    print(f"  ACS rows: {len(raw)} from the {'cache' if cached else 'API'} ({len(raw.columns)} E/M columns){note}")

    derived = al.round_values(al.derive(al.clean_raw(raw)))
    keys = [c for c in ("name", "tract", "pgh_share") if c in county_units.columns]
    table = county_units.drop(columns="geometry").set_index("GEOID")[keys].join(derived, how="left")
    csv = PROCESSED / f"acs_{level}.csv"
    table.to_csv(csv, index_label="GEOID")

    nonnull = pd.Series({v.id: float(table[v.id].notna().mean()) for v in al.CATALOGUE})
    empty = nonnull[nonnull == 0].index.tolist()
    partial = nonnull[(nonnull > 0) & (nonnull < 1)].sort_values()
    print(f"  non-null share: mean {nonnull.mean():.3f}; {int((nonnull == 1).sum())} of {len(nonnull)} variables complete")
    if len(partial):
        print("  partial: " + ", ".join(f"{k} {v:.2f}" for k, v in partial.items()))
    if empty:
        print(f"  ENTIRELY NULL at this level: {empty}")
    rel = pd.concat([al.reliability_series(table[f"{v.id}_cv"]) for v in al.CATALOGUE])
    mix = rel.value_counts(normalize=True).reindex(REL_ORDER).fillna(0.0)
    print("  reliability of all estimate cells: " + " · ".join(f"{k} {v:.1%}" for k, v in mix.items()))

    sizes = {csv.name: kb(csv)}
    p = APP_DATA / f"acs_{level}.json"
    dump(al.to_values_json(table, geoids=city_units["GEOID"].tolist()), p)
    sizes[p.name] = kb(p)
    if level != "tract":
        p = APP_DATA / f"geo_{level}.json"
        dump(gl.to_fc(city_units, gl.props_for(level), gl.SIMPLIFY_M[level]), p)
        sizes[p.name] = kb(p)
    print("  wrote " + ", ".join(f"{k} ({v})" for k, v in sizes.items()))
    return {"level": level, "total": len(county_units), "bundled": len(city_units), "api_rows": len(raw),
            "missing": len(missing), "nonnull": nonnull, "empty": empty, "mix": mix, "sizes": sizes}


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--refresh", action="store_true", help="ignore data/raw/acs/ and call the Census API again")
    ap.add_argument("--levels", nargs="+", choices=al.LEVELS, default=list(al.LEVELS))
    args = ap.parse_args()

    session = requests.Session()
    zcta_ids = gl.zcta_ids()
    print(f"ACS {al.VINTAGE}: {len(al.CATALOGUE)} variables from {len(al.raw_vars())} stems, "
          f"{len(al.batches(al.raw_vars()))} API calls per level; {len(zcta_ids)} county ZCTAs")
    results = [build_level(lv, zcta_ids=zcta_ids, refresh=args.refresh, session=session) for lv in args.levels]

    levels_meta = json.loads(CATALOGUE_JSON.read_text())["meta"]["levels"] if CATALOGUE_JSON.exists() else {}
    for r in results:
        levels_meta[r["level"]] = {"bundled": r["bundled"], "total": r["total"]}
    cat = al.catalogue_json(levels_meta)
    dump(cat, CATALOGUE_JSON)
    dump(cat, APP_DATA / "acs_variables.json")
    DOCS_MD.parent.mkdir(parents=True, exist_ok=True)
    DOCS_MD.write_text(al.catalogue_markdown(levels_meta))

    print("\nsummary")
    print(f"  {'level':7} {'total':>6} {'bundled':>8} {'acs rows':>9} {'non-null':>9}  reliability high/med/low/na")
    for r in results:
        m = r["mix"]
        print(f"  {r['level']:7} {r['total']:6} {r['bundled']:8} {r['api_rows']:9} {r['nonnull'].mean():9.3f}  "
              f"{m['high']:.0%}/{m['medium']:.0%}/{m['low']:.0%}/{m['n/a']:.0%}")
    grid = pd.DataFrame({r["level"]: r["nonnull"] for r in results}).round(2)
    print("\n  non-null share per variable")
    print(grid.to_string())
    flagged = {r["level"]: r["empty"] for r in results if r["empty"]}
    print(f"\n  entirely-null variables by level: {flagged or 'none'}")
    outputs = [CATALOGUE_JSON, APP_DATA / "acs_variables.json", DOCS_MD] + \
        [PROCESSED / f"acs_{r['level']}.csv" for r in results] + \
        [APP_DATA / f"acs_{r['level']}.json" for r in results] + \
        [APP_DATA / f"geo_{r['level']}.json" for r in results if r["level"] != "tract"]
    print("\n  outputs")
    for p in outputs:
        print(f"    {p.relative_to(ROOT)!s:45} {kb(p):>9}")
    # Land use and zoning (scripts/11_build_land_use.py) ride in the same catalogue and bundles: put them back.
    from visionpitts import land_use
    if land_use.merge_into_bundles():
        print("  land use and zoning variables merged back into the catalogue and bundles")


if __name__ == "__main__":
    main()
