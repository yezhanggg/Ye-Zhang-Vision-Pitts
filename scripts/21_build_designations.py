"""Step 21: HUD's 2026 and 2027 Qualified Census Tracts and Small Area DDAs for Allegheny County, for the pencil's basis
boost (app/src/data/lazy/designations.json). Reads the HUD files in data/raw/benchmark/flags/ (QCT{year}CSV.zip and
{year}-DDAs-Data-Used-to-Designate.xlsx, downloaded in a browser from huduser.gov/portal/datasets/qct.html).
Run: uv run --no-sync python scripts/21_build_designations.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

from visionpitts import designations as ds


def main() -> None:
    p = ds.build()
    for y in ds.YEARS:
        print(f"{y}: {len(p['qct'][str(y)])} QCTs in Allegheny County; Pittsburgh SDDA ZCTAs {', '.join(p['sdda_zcta'][str(y)])}")
    print(f"leaving QCT status on {ds.NOTICE['effective']}: {', '.join(p['qct_change']['lose']) or 'none'}")
    print(f"joining: {', '.join(p['qct_change']['gain']) or 'none'}")
    if p["sdda_zcta"]["2026"] != p["sdda_zcta"]["2027"]:
        print("note: the Small Area DDAs changed; the pencil reads them from this file")
    ds.write(p)
    print(f"wrote {ds.OUT.relative_to(ds.OUT.parents[3])}")


if __name__ == "__main__":
    main()
