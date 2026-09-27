"""Step 2: every source -> wide table -> eight factors with confidence tags; writes the sources registry.

Run: uv run python scripts/02_build_factors.py   (after 01_build_tracts.py and 07_build_acs_levels.py)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import geopandas as gpd
import pandas as pd

from visionpitts import factors, geo, ingest, sources
from visionpitts.config import INTERIM, PROCESSED, load_scoring

RESIDENTIAL_MIN_HH = 25


def main() -> None:
    cfg = load_scoring()
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
    print("ACS shares"); sh = ingest.acs_shares(geoids)

    wide = t.drop(columns="geometry").set_index("GEOID")[["name", "neighborhood", "pgh_share", "ALAND", "AWATER"]]
    for part in (acs, chas, svi, hcv, mva, fl, tr, fd, ev, sh):
        wide = wide.join(part, how="left")
    # Tracts with (almost) no households are parks, rivers, stadiums, campuses. They stay on the map but are not ranked.
    wide["residential"] = wide["households"].fillna(0) >= RESIDENTIAL_MIN_HH
    print(f"  residential tracts (>= {RESIDENTIAL_MIN_HH} households): {int(wide['residential'].sum())} of {len(wide)}")

    print(f"factors, scoring v{cfg['version']} (percentiles across residential tracts only)")
    print("  options:", factors.options(cfg))
    ranked = factors.compute(wide[wide["residential"]], cfg)
    wide = ranked.reindex(wide.index).combine_first(wide)
    wide["residential"] = wide["residential"].astype(bool)
    wide.to_parquet(INTERIM / "wide.parquet")
    wide.to_csv(PROCESSED / "factors.csv", index_label="GEOID")
    sources.write_md()

    fids = [f["id"] for f in cfg["factors"]]
    r = wide[wide["residential"]]
    print(wide[fids].describe().round(3).T)
    print("coverage (tracts with data):")
    print(wide[["need_count", "mva21_score", "mva16_score", "svi_overall", "chas_burden_le50_share", "hcv_per_renter",
                "cdbg", "transit_departures_per_acre", "transit_departures_per_hh", "flood_share_pct", "eviction_filing_rate",
                "age65_share", "units_2_4_share"]].notna().sum().to_string())
    print("flags:", {c: int(wide[c].fillna(False).astype(bool).sum()) for c in ("qct", "dda", "oz", "cdbg")})
    print("subsidy tiers (ranked tracts):", {f"{k:g}": int(v) for k, v in r["subsidy_eligible"].value_counts().sort_index(ascending=False).items()})
    floor = factors.options(cfg)["transit"]["household_floor"]
    print(f"transit: {int((r['households'] < floor).sum())} ranked tracts under the {floor}-household floor")
    print("eviction ZIPs per ranked tract:", r["eviction_zip_n"].value_counts().sort_index().to_dict(),
          f"; dominant share < {factors.options(cfg)['displacement']['eviction_zip_dominant_min']}:",
          int((r["eviction_zip_dominant"] < factors.options(cfg)["displacement"]["eviction_zip_dominant_min"]).sum()))
    print(f"flood: {int((r['flood_share_pct'] > factors.options(cfg)['flood']['implausible_share_pct']).sum())} ranked tracts above "
          f"{factors.options(cfg)['flood']['implausible_share_pct']}% of land")
    print("displacement parts:", wide["displacement_n"].value_counts().to_dict())
    print("confidence (ranked tracts):")
    conf = pd.DataFrame({f: r[f"{f}_conf"].fillna("no value").value_counts() for f in fids}).fillna(0).astype(int)
    print(conf.reindex([lv for lv in [*factors.LEVELS, "no value"] if lv in conf.index]).T.to_string())


if __name__ == "__main__":
    main()
