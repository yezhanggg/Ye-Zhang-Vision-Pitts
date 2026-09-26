"""Step 3: the C layer. Market pressure from neighbors, bivariate need x market-change classes, flip list.

Run: uv run python scripts/03_build_pressure.py   (after 02_build_factors.py)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import geopandas as gpd
import pandas as pd

from visionpitts import pressure, scoring
from visionpitts.config import INTERIM, PROCESSED, load_scoring


def main() -> None:
    cfg = load_scoring()
    t = gpd.read_parquet(INTERIM / "tracts_city.parquet")
    wide = pd.read_parquet(INTERIM / "wide.parquet")

    print("market pressure + bivariate classes")
    wide = pressure.compute(wide, t, cfg)
    wide.to_parquet(INTERIM / "wide_pressure.parquet")
    print("  neighbors per tract:", wide["n_neighbors"].describe()[["min", "50%", "max"]].to_dict())
    print("  bivariate classes:", wide["bivariate_class"].value_counts(dropna=False).to_dict())
    print(f"  watch list (high need, rising market): {int(wide['watch_list'].sum())} tracts")
    print("  most pressured:", wide.sort_values("market_pressure", ascending=False)[["neighborhood", "market_strength", "market_lag", "market_pressure"]].head(5).round(3).to_string())

    print("flip list Balanced -> Anti-displacement")
    flips = pressure.flip_list(wide, cfg)
    flips["neighborhood"] = flips["GEOID"].map(wide["neighborhood"])
    flips.to_csv(PROCESSED / "flips_balanced_to_anti_displacement.csv", index=False)
    print(f"  {len(flips)} of {len(wide)} tracts change their top pick")
    print(flips.groupby(["from", "to"]).size().to_string())

    print("top pick per preset")
    for p in cfg["presets"]:
        st = scoring.score_table(wide, p["weights"], cfg)
        print(f"  {p['id']:<18}", st["top"].value_counts().to_dict())


if __name__ == "__main__":
    main()
