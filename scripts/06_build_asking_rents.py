"""Step 6: asking rents from Dewey listings, an information layer (never scored).

Writes data/processed/asking_rents.csv (one row per city tract), data/processed/asking_rents_trend.json and
app/src/data/asking_rents.json (county / city context for the Sources modal), then re-runs the step-4 export so
the tract properties carry the seven app fields (asking_rents.APP_FIELDS).

Needs the licensed caches in data/raw/dewey_cache/ (git-ignored): allegheny_listings.parquet, id_mapping.parquet.
Run: uv run python scripts/06_build_asking_rents.py   (after 03_build_pressure.py)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import json
from datetime import UTC, datetime

import geopandas as gpd
import pandas as pd

from visionpitts import asking_rents as ar
from visionpitts import export, geo
from visionpitts import geo_levels as gl
from visionpitts.config import APP_DATA, INTERIM, PROCESSED, ROOT

OUT_CSV = PROCESSED / "asking_rents.csv"
OUT_TREND = PROCESSED / "asking_rents_trend.json"
OUT_APP = APP_DATA / "asking_rents.json"


def pct(v: float | None) -> str:
    return "n/a" if v is None else f"{v:+.1%}"


def main() -> None:
    if not ar.LISTINGS.exists() or not ar.ID_MAPPING.exists():
        sys.exit(f"missing licensed caches in {ar.DEWEY_CACHE} (allegheny_listings.parquet, id_mapping.parquet)")
    city = gpd.read_parquet(INTERIM / "tracts_city.parquet")
    city_ids = pd.Index(city["GEOID"])

    print("listings")
    df = ar.load_listings()
    n_bbox = len(df)
    df["GEOID"] = ar.assign_tracts(df, geo.county_tracts())
    df = df[df["GEOID"].notna()]
    n_county = len(df)
    df = ar.clean(df)
    n_clean = len(df)
    print(f"  {n_bbox:,} rows in the Allegheny bbox -> {n_county:,} inside a county tract -> {n_clean:,} after the "
          "rent/beds filter")

    print("unit ids")
    df, recovered = ar.recover_ids(df, ar.load_id_mapping())
    print("  UNIT_ID recovered from the mapping (share of rows lacking one, by year):")
    print(recovered.round(3).to_string())
    df["ukey"], df["pkey"], df["keytype"] = ar.keys(df)
    df["site"] = ar.site_key(df)
    # the ZIP code and municipality of each listing point, for the area series (aggregates only)
    df["zcta"] = ar.assign_tracts(df, gl.zctas("county"))
    df["muni"] = ar.assign_tracts(df, gl.munis())

    print("unit-months")
    um = ar.unit_months(df, extra=("zcta", "muni"))
    um["existing"] = ar.existing_stock(um)
    um["ratio"] = ar.mix_ratio(um)
    print(f"  {len(um):,} unit-months; key type: {um['keytype'].value_counts().to_dict()}")
    print("  by year:", um["year"].value_counts().sort_index().to_dict())
    mix = um["beds"].value_counts(normalize=True).sort_index()
    print("  bedroom mix (%):", (mix * 100).round(1).to_dict())
    in_city = um["geoid"].isin(city_ids)
    late2 = um[in_city & (um["beds"] == 2) & um["year"].isin(ar.LATE)]
    share_existing = late2["existing"].mean()
    print(f"  city unit-months: {int(in_city.sum()):,}; existing-stock share of city 2BR unit-months in 2025-26: "
          f"{share_existing:.1%}")

    print("tract table")
    tab = ar.tract_table(um, city_ids)
    tab.insert(0, "neighborhood", city.set_index("GEOID")["neighborhood"].reindex(tab.index))
    tab.insert(0, "name", city.set_index("GEOID")["name"].reindex(tab.index))
    tab.to_csv(OUT_CSV, index_label="GEOID")
    print(f"  wrote {OUT_CSV.relative_to(ROOT)} ({len(tab)} tracts x {tab.shape[1]} columns)")
    n_rent = int(tab["rent_2br_2025_26"].notna().sum())
    n_gx = int(tab["rent_2br_growth_existing"].notna().sum())
    n_ga = int(tab["rent_2br_growth_all"].notna().sum())
    n_fmr = int(tab["rent_2br_gt_fmr"].fillna(False).sum())
    print(f"  2025-26 2BR median shown for {n_rent} tracts; existing-stock growth for {n_gx}; all-listings growth "
          f"for {n_ga}")
    print(f"  above FMR ${ar.FMR_2BR_FY2026}: {n_fmr} of {n_rent}; confidence: "
          f"{tab['asking_rents_conf'].value_counts().to_dict()}")
    print("  existing-stock growth:", tab["rent_2br_growth_existing"].describe().round(3).to_dict())
    print("  all-listings growth:  ", tab["rent_2br_growth_all"].describe().round(3).to_dict())
    both = tab[["rent_2br_growth_existing", "rent_2br_growth_all"]].dropna()
    if len(both):
        gap = (both["rent_2br_growth_all"] - both["rent_2br_growth_existing"]).median()
        print(f"  tracts with both growth columns: {len(both)}; all-listings minus existing, median {gap:+.3f}")
    top = tab[tab["rent_2br_growth_existing"].notna()].sort_values("rent_2br_growth_existing", ascending=False)
    top = top.head(8)
    print(top[["neighborhood", "rent_2br_growth_existing", "rent_2br_growth_all", "n_units_existing_2019_20",
               "n_units_existing_2025_26", "rent_2br_2025_26"]].round(3).to_string())

    print("area series (ZIP codes and municipalities)")
    zcta_ids = gl.zctas("city")["GEOID"].tolist()
    muni_ids = gl.munis()["GEOID"].tolist()
    areas = {"tract": tab, "zcta": ar.area_table(um, "zcta", zcta_ids), "muni": ar.area_table(um, "muni", muni_ids)}
    for lv in ("zcta", "muni"):
        keep = ("rent_2br_", "n_units_2br_", "n_units_20", "asking_rents_conf")
        cols = [c for c in areas[lv].columns if c.startswith(keep)]
        areas[lv][cols].to_csv(PROCESSED / f"asking_rents_{lv}.csv", index_label="GEOID")
        n_lv = int(areas[lv]["rent_2br_2025_26"].notna().sum())
        n_gx = int(areas[lv]["rent_2br_growth_existing"].notna().sum())
        print(f"  {lv}: {n_lv} of {len(areas[lv])} with a 2025-26 level; existing-stock growth for {n_gx}")
    bundle = ar.area_bundle(areas)
    out_areas = APP_DATA / "asking_rents_areas.json"
    out_areas.write_text(json.dumps(bundle, separators=(",", ":")))
    print(f"  wrote app/src/data/asking_rents_areas.json ({out_areas.stat().st_size / 1024:.0f} KB)")

    print("context")
    ctx = ar.trend(um, city_ids)
    ctx.update({
        "source": "dewey_listings",
        "license": ("Licensed Dewey Data listings. Tract aggregates only (summary insights); raw rows are never "
                    "published."),
        "fmr_2br_fy2026": ar.FMR_2BR_FY2026,
        "thresholds": {"min_units_cell": ar.MIN_UNITS_CELL, "min_units_pooled": ar.MIN_UNITS_POOLED,
                       "conf_units": ar.CONF_UNITS, "existing_before": ar.EXISTING_BEFORE,
                       "site_decimals": ar.SITE_DECIMALS},
        "pipeline_counts": {"bbox_rows": n_bbox, "county_rows": n_county, "after_clean": n_clean,
                            "unit_months": len(um), "city_unit_months": int(in_city.sum()),
                            "existing_share_city_2br_2025_26": round(float(share_existing), 4)},
        "unit_id_recovered_by_year": {str(int(y)): {"rows_lacking": int(r["rows_lacking"]),
                                                    "share": round(float(r["share"]), 4)}
                                      for y, r in recovered.iterrows()},
        "bedroom_mix_pct": {str(int(k)): round(float(v) * 100, 1) for k, v in mix.items()},
        "coverage": {"n_city_tracts": len(tab), "n_with_rent_2025_26": n_rent, "n_with_growth_existing": n_gx,
                     "n_with_growth_all": n_ga, "n_above_fmr": n_fmr},
        "built_at": datetime.now(tz=UTC).date().isoformat(),
    })
    OUT_TREND.write_text(json.dumps(ctx, indent=1))
    OUT_APP.write_text(json.dumps(ctx, separators=(",", ":")))
    for y in ar.YEARS:
        c, p = ctx["county"][str(y)], ctx["city"][str(y)]
        print(f"  {y}: county 2BR ${c['median_2br']:.0f} ({c['n_units']:,} units)  "
              f"city ${p['median_2br']:.0f} ({p['n_units']:,} units)")
    for k in ("county", "city"):
        g = ctx["growth"][k]
        print(f"  {k} 2BR growth 2019-20 -> 2025-26: all listings {pct(g['all']['growth'])}, "
              f"existing stock {pct(g['existing']['growth'])}")

    wide_path = INTERIM / "wide_pressure.parquet"
    if wide_path.exists():
        w = pd.read_parquet(wide_path)
        w = w.join(tab[["rent_all_2025_26", "rent_2br_growth_existing", "rent_2br_growth_all"]])

        def sp(a: str, b: str) -> float:
            return w[[a, b]].dropna().corr(method="spearman").iloc[0, 1]

        print("  sanity (Spearman, city tracts): 2025-26 all-unit asking rent vs ACS median gross rent "
              f"{sp('rent_all_2025_26', 'med_gross_rent'):.2f}; existing-stock growth vs market_strength "
              f"{sp('rent_2br_growth_existing', 'market_strength'):.2f}, vs MVA change "
              f"{sp('rent_2br_growth_existing', 'mva_change'):.2f}; all-listings growth vs market_strength "
              f"{sp('rent_2br_growth_all', 'market_strength'):.2f}, vs MVA change "
              f"{sp('rent_2br_growth_all', 'mva_change'):.2f}")

    print("export (step 4 again, with the asking-rent fields)")
    export.write_from_interim()


if __name__ == "__main__":
    main()
