"""Step 11: land use (county parcels) and zoning mix (City of Pittsburgh) for every Explore geography.

Places each parcel of the Allegheny County assessment at its representative point in a tract, block group, ZIP code,
municipality, the city and the county (cached in data/interim/parcel_units.parquet), classes it with the Place card's
land-use rule, and sums lot area by class. Measures the city zoning districts, grouped into seven families, as a share
of each city tract's and block group's land. Then writes
  data/processed/land_<level>.csv                  one row per unit, tracked
  and merges the 14 variables into the Explore catalogue and bundled value files (land_use.merge_into_bundles).
Descriptive only; nothing enters a score. Publish county-wide rows with scripts/08_publish_supabase.py --only variables land version.
Run: uv run python scripts/11_build_land_use.py [--refresh]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse

import pandas as pd

from visionpitts import geo_levels as gl
from visionpitts import land_use as lu
from visionpitts import place_measures as pm


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--refresh", action="store_true", help="rebuild the parcel-to-unit cache")
    args = ap.parse_args()

    units = lu.parcel_units(refresh=args.refresh)
    print(f"parcels placed: {len(units):,} ({int(units['tract'].notna().sum()):,} in a county tract, {int(units['in_city'].sum()):,} in the city)")
    assess = lu.read_assessments()
    print(f"assessment records: {len(assess):,}")
    zoning = pm.zoning_download(refresh=False)
    rules = pm.load_zoning_rules()

    tables: dict[str, pd.DataFrame] = {}
    for level in lu.LAND_LEVELS:
        ids = gl.units(level, "county")["GEOID"].astype(str)
        t = lu.land_table(assess, lu.pin_map(units, level)).reindex(pd.Index(ids, name="GEOID"))
        if level in lu.ZONING_LEVELS:
            t = t.join(lu.zoning_table(level, zoning, rules), how="left")
        for vid in lu.IDS:
            if vid not in t.columns:
                t[vid] = pd.NA
        t = lu.round_table(t[lu.IDS])
        t.to_csv(lu.land_csv(level))
        tables[level] = t
        c = lu.coverage({level: t})[level]
        print(f"  {level:6s} {c['units']:5d} units · {c['with_land']:5d} with parcels · {c['with_zoning']:4d} with zoning")

    touched = lu.merge_into_bundles(tables)
    print(f"merged into {len(touched)} catalogue and bundle files")


if __name__ == "__main__":
    main()
