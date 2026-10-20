"""Step 20: sun for open space, by tract (src/visionpitts/sun_tract.py).

Reads nopush/shadow/parcels/parcel_shadow.gpkg (step 15, kept on this machine) and app/src/data/zoning_districts.json,
and writes app/src/data/lazy/sun_tract.json: for each city tract, how many vacant and park-zoned lots meet the open
space sun yardstick, and their median hours of direct sun on June 21, September 22 and December 21. Only tract figures
are written; the lot files stay on the machine.
Run: uv run python scripts/20_build_sun_tract.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import json
from datetime import date

import geopandas as gpd

from visionpitts import sun_tract as st

ROOT = Path(__file__).resolve().parents[1]
LOTS = ROOT / "nopush" / "shadow" / "parcels" / "parcel_shadow.gpkg"
ZONING = ROOT / "app" / "src" / "data" / "zoning_districts.json"
OUT = ROOT / "app" / "src" / "data" / "lazy" / "sun_tract.json"


def main() -> None:
    if not LOTS.exists():
        sys.exit(f"{LOTS.relative_to(ROOT)} is missing: run scripts/15_build_parcel_shadow.py first")
    lots = gpd.read_file(LOTS)
    lots["geoid"] = lots["geoid"].astype(str)
    zoning = gpd.read_file(ZONING)
    lots["park"] = st.mark_parks(lots, zoning)
    out = st.build(lots, date.today().isoformat())
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    city = out["city"]
    for g in st.GROUPS:
        f = city.get(g)
        if f:
            print(f"{g}: {f['lots']:,} rated lots, {f['acres']:,} acres; {f['bre']:,} meet the yardstick on Sep 22, "
                  f"{f['winter2']:,} on Dec 21; median sun {f['sun_h']}")
    print(f"wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1e3:.1f} KB, {len(out['tracts'])} tracts)")


if __name__ == "__main__":
    main()
