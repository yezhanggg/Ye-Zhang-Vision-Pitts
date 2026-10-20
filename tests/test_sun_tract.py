import json

import geopandas as gpd
import pandas as pd
from shapely.geometry import box

from visionpitts import sun_tract as st
from visionpitts.config import APP_DATA


def lots_frame(rows: list[dict]) -> pd.DataFrame:
    base = {"rated": True, "sqft": 43560, "park": False, "use": "vacant", "geoid": "42003000100",
            "sun_h_jun": 9.0, "sun_h_sep": 6.0, "sun_h_dec": 3.0, "mostly_jun": 0.2, "mostly_sep": 0.5, "mostly_dec": 0.9}
    return pd.DataFrame([{**base, **r} for r in rows])


def test_half_sun_hours_counts_steps_not_mostly_shaded():
    df = lots_frame([{"mostly_sep": 0.75}])
    # 24 steps on Sep 22, a quarter of them with at least half the lot in sun: 6 steps of half an hour.
    assert st.half_sun_hours(df, "sep").iloc[0] == 3.0


def test_group_figures_apply_the_yardstick_and_skip_unrated_lots():
    df = lots_frame([
        {"mostly_sep": 0.5, "mostly_dec": 0.5},  # 6 h on Sep, 4.5 h on Dec: meets both
        {"mostly_sep": 0.9, "mostly_dec": 1.0, "sun_h_sep": 3.0},  # 1.2 h on Sep: fails
        {"rated": False},
    ])
    f = st.group_figures(df)
    assert f["lots"] == 2
    assert f["bre"] == 1 and f["winter2"] == 1
    assert f["ceqr6"] == 1 and f["ceqr4"] == 1
    assert f["acres"] == 2.0 and f["bre_acres"] == 1.0


def test_build_splits_vacant_and_park_lots():
    df = lots_frame([{}, {"park": True, "use": "institutional"}, {"use": "residential"}])
    out = st.build(df, "2026-10-20")
    t = out["tracts"]["42003000100"]
    assert t["vacant"]["lots"] == 1 and t["park"]["lots"] == 1
    assert out["yardstick"]["day"] == "sep22"


def test_mark_parks_uses_the_parks_family():
    lots = gpd.GeoDataFrame({"x": [1, 2]}, geometry=[box(0, 0, 1, 1), box(5, 5, 6, 6)], crs="EPSG:3857")
    zoning = gpd.GeoDataFrame({"family": ["parks", "res_single"]}, geometry=[box(-1, -1, 2, 2), box(4, 4, 7, 7)], crs="EPSG:3857")
    assert st.mark_parks(lots, zoning).tolist() == [True, False]


def test_published_file_holds_tract_figures_only():
    path = APP_DATA / "lazy" / "sun_tract.json"
    if not path.exists():
        return
    d = json.loads(path.read_text())
    assert set(d) == {"built", "yardstick", "city", "tracts"}
    for groups in d["tracts"].values():
        for f in groups.values():
            assert set(f) == {"lots", "acres", "sun_h", "bre", "bre_acres", "winter2", "ceqr6", "ceqr4"}
