"""Step 12: the six Equity & policy measures at ZIP-code (ZCTA) level, aggregated from the city's census tracts.

Places every 2020 census block (TIGER tabblock20, statewide file read within the ZCTAs' box, cached in
data/interim/blocks20_zcta.parquet) in one of the ZCTAs bundled for Explore (app/src/data/geo_zcta.json), weights each
city residential tract by its housing units in each ZIP, and writes app/src/data/equity_zip.json (compact):
burdened renters at four income levels (weighted sums of the tract CHAS counts), housing-unit-weighted means of jobs
within 1 mile, school and frequent-transit distance and services within 1/2 mile, the ZIP's median 2-bedroom asking
rent (data/processed/asking_rents_zcta.csv; the SAFMR is read here but the app takes it from hud_2026.json), the share of the ZIP's homes in the city and the tracts used.
Needs place.json (step 10) and the ZIP asking rents (step 6). Descriptive only; nothing enters a score.
Run: uv run python scripts/12_build_equity_zip.py [--refresh]
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import argparse

from visionpitts import equity_zip as ez


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--refresh", action="store_true", help="re-place the 2020 blocks in the ZCTAs")
    args = ap.parse_args()
    doc = ez.build(refresh=args.refresh)
    zips = doc["zips"]
    edge = [z for z, r in zips.items() if r["edge"]]
    rent = [z for z, r in zips.items() if r["asking_2br"] is not None and r["asking_conf"] in ez.USABLE_CONF]
    size = ez.write(doc)
    print(f"{len(zips)} ZIPs from {doc['tracts']} city tracts ({doc['city_hu']:,} homes placed)")
    print(f"  edge ZIPs (under {ez.EDGE_SHARE:.0%} of homes in the city): {len(edge)} {' '.join(edge)}")
    print(f"  with a usable asking rent: {len(rent)}")
    print(f"wrote {ez.OUT_JSON.relative_to(ez.OUT_JSON.parents[3])} ({size:,} bytes)")


if __name__ == "__main__":
    main()
