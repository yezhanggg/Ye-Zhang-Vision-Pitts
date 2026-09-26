"""Step 2: every source -> wide table -> six factors with confidence tags; writes the sources registry.

Run: uv run python scripts/02_build_factors.py   (after 01_build_tracts.py)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import geopandas as gpd
import pandas as pd

from visionpitts import factors, geo, ingest, sources
from visionpitts.config import INTERIM, PROCESSED, factor_ids

RESIDENTIAL_MIN_HH = 25


def main() -> None:
    t = gpd.read_parquet(INTERIM / "tracts_city.parquet")
    geoids = pd.Index(t["GEOID"])
    acs = pd.read_parquet(INTERIM / "acs.parquet")
    xw = geo.crosswalk()

    print("CHAS");     chas = ingest.chas(geoids)
    print("SVI");      svi = ingest.svi(geoids)
    print("HCV");      hcv = ingest.hcv(geoids, acs["renter_hh"])
    print("MVA");      mva = ingest.mva(geoids, xw)
    print("flags");    fl = ingest.flags(t, xw)
    print("transit");  tr = ingest.transit(t)
    print("flood");    fd = ingest.flood(geoids)
    print("eviction"); ev = ingest.eviction(t, acs["renter_hh"])

    wide = t.drop(columns="geometry").set_index("GEOID")[["name", "neighborhood", "pgh_share", "ALAND", "AWATER"]]
    for part in (acs, chas, svi, hcv, mva, fl, tr, fd, ev):
        wide = wide.join(part, how="left")
    # Tracts with (almost) no households are parks, rivers, stadiums, campuses. They stay on the map but are not ranked.
    wide["residential"] = wide["households"].fillna(0) >= RESIDENTIAL_MIN_HH
    print(f"  residential tracts (>= {RESIDENTIAL_MIN_HH} households): {int(wide['residential'].sum())} of {len(wide)}")

    print("factors (percentiles across residential tracts only)")
    ranked = factors.compute(wide[wide["residential"]])
    wide = ranked.reindex(wide.index).combine_first(wide)
    wide["residential"] = wide["residential"].astype(bool)
    wide.to_parquet(INTERIM / "wide.parquet")
    wide.to_csv(PROCESSED / "factors.csv", index_label="GEOID")
    sources.write_md()

    fids = factor_ids()
    print(wide[fids].describe().round(3).T)
    print("coverage (tracts with data):")
    print(wide[["need_count", "mva21_score", "mva16_score", "svi_overall", "chas_burden_le50_share", "hcv_per_renter",
                "cdbg", "transit_departures_per_acre", "flood_share_pct", "eviction_filing_rate"]].notna().sum().to_string())
    print("flags:", {c: int(wide[c].fillna(False).astype(bool).sum()) for c in ("qct", "dda", "oz", "cdbg")})
    print("displacement parts:", wide["displacement_n"].value_counts().to_dict())
    print("confidence:")
    print(pd.DataFrame({f: wide[f"{f}_conf"].value_counts(dropna=False) for f in fids}).fillna(0).astype(int))


if __name__ == "__main__":
    main()
