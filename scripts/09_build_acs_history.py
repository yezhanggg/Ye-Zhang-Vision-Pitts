"""Step 9: ACS 5-year history 2014-2024 for tracts, ZIP codes, municipalities, the county and the city.

Per level and vintage: fetch the 84 stems (cached in data/raw/acs/acs5_<year>_<level>.csv), clean, carry 2010-vintage
tracts to 2020 tracts with the housing-unit crosswalk, derive the 37 variables, round. Writes
  data/processed/acs_history_<level>.csv     wide, one row per unit-year (tracked)
  app/src/data/acs_history.json              14 variables x 11 years for the bundled units (city tracts, city ZCTAs,
                                             all municipalities, county, city); MOE only for the six band variables
Run: uv run python scripts/09_build_acs_history.py [--levels ...] [--years 2014 2024] [--refresh]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse
import json

import pandas as pd
import requests

from visionpitts import acs_history as ah
from visionpitts import acs_levels as al
from visionpitts import geo
from visionpitts import geo_levels as gl
from visionpitts.config import APP_DATA, PROCESSED, ROOT

OUT_JSON = APP_DATA / "acs_history.json"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--levels", nargs="+", choices=ah.HISTORY_LEVELS, default=list(ah.HISTORY_LEVELS))
    ap.add_argument("--years", nargs=2, type=int, metavar=("FIRST", "LAST"), default=(ah.YEARS[0], ah.YEARS[-1]))
    ap.add_argument("--refresh", action="store_true")
    args = ap.parse_args()
    years = [y for y in ah.YEARS if args.years[0] <= y <= args.years[1]]

    session = requests.Session()
    zcta_ids = gl.zcta_ids()
    xw = geo.crosswalk()
    tables: dict[str, pd.DataFrame] = {}
    bundled: dict[str, list[str]] = {}
    for level in args.levels:
        county_ids = gl.units(level, "county")["GEOID"].tolist()
        bundled[level] = gl.units(level, "city")["GEOID"].tolist()
        parts = []
        for year in years:
            raw = ah.fetch_year(level, year, zctas=zcta_ids, session=session, refresh=args.refresh)
            table = ah.build_year(level, year, raw, xw if level == "tract" else None)
            table = table[table.index.isin(county_ids)]
            n_ok = int(table[[v.id for v in al.CATALOGUE]].notna().any(axis=1).sum())
            flag = ""
            if "xw_dominant" in table:
                n_flag = int((table['xw_dominant'] < ah.XW_DOMINANT_FLAG).sum())
                flag = f"; {n_flag} tracts assembled from several 2010 tracts"
            print(f"  {level:5} {year}: {len(raw):4} API rows -> {n_ok:4} units with values{flag}")
            parts.append(table)
        wide = pd.concat(parts)
        wide.index.name = "GEOID"
        csv = PROCESSED / f"acs_history_{level}.csv"
        wide.to_csv(csv, index_label="GEOID")
        print(f"  wrote {csv.relative_to(ROOT)} ({csv.stat().st_size / 1024:.0f} KB, {len(wide)} unit-years)")
        tables[level] = wide

    b = ah.bundle(tables, bundled, years)
    text = json.dumps(b, separators=(",", ":"))
    OUT_JSON.write_text(text)
    size = len(text.encode())
    print(f"\nbundle: {OUT_JSON.relative_to(ROOT)} {size / 1024:.0f} KB "
          f"({sum(len(v) for v in b['levels'].values())} units, {len(ah.HISTORY_VARS)} variables, {len(years)} years)")
    if size > ah.BUNDLE_BUDGET:
        sys.exit(f"bundle exceeds the {ah.BUNDLE_BUDGET / 1024:.0f} KB budget; trim HISTORY_VARS or BAND_VARS")
    flagged = sum(1 for v in b["xw_dominant"].values() if v < ah.XW_DOMINANT_FLAG)
    print(f"city tracts flagged for a changed boundary (dominant 2010 share < {ah.XW_DOMINANT_FLAG}): {flagged}")


if __name__ == "__main__":
    main()
