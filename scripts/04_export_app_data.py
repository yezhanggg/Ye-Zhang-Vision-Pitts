"""Step 4: write data/processed/tracts.geojson and app/public/data/*.json.

Run: uv run python scripts/04_export_app_data.py   (after 03_build_pressure.py)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import json

import geopandas as gpd
import pandas as pd

from visionpitts import export, geo, pressure
from visionpitts.config import INTERIM, load_scoring


def main() -> None:
    cfg = load_scoring()
    t = gpd.read_parquet(INTERIM / "tracts_city.parquet")
    wide = pd.read_parquet(INTERIM / "wide_pressure.parquet")
    focus = json.loads((INTERIM / "focus.json").read_text())
    flips = pressure.flip_list(wide, cfg)
    print("export")
    export.write_all(t, wide, cfg, focus, flips, geo.neighborhoods())


if __name__ == "__main__":
    main()
