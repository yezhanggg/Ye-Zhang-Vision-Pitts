"""Step 1: City of Pittsburgh tracts (geometry, neighborhood label), ACS context, focus tracts, 2010->2020 crosswalk.

Run: uv run python scripts/01_build_tracts.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import json

from visionpitts import geo, ingest
from visionpitts.config import INTERIM


def main() -> None:
    print("tracts: selecting city tracts")
    t = geo.city_tracts()
    print(f"  {len(t)} tracts with >= 50% of their area inside Pittsburgh (of 394 in the county)")
    t.to_parquet(INTERIM / "tracts_city.parquet")

    print("focus tracts")
    focus = geo.resolve_focus(t)
    for f in focus:
        f["neighborhood"] = t.set_index("GEOID").loc[f["geoid"], "neighborhood"]
        print(f"  {f['geoid']}  {f['label']:<22} label from overlay: {f['neighborhood']}")
    (INTERIM / "focus.json").write_text(json.dumps(focus, indent=1))

    print("ACS context")
    a = ingest.acs(t["GEOID"])
    a.to_parquet(INTERIM / "acs.parquet")
    print(f"  median household income (city median of tract medians): ${a['med_hh_income'].median():,.0f}")

    print("crosswalk: 2020 blocks -> 2010 block groups / tracts")
    xw = geo.crosswalk()
    print(f"  {len(xw):,} blocks, {xw['bg10'].nunique()} 2010 block groups, {xw['hu'].sum():,} housing units")


if __name__ == "__main__":
    main()
