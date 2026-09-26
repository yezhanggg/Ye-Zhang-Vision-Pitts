import geopandas as gpd
import numpy as np
import pandas as pd
from shapely.geometry import box

from visionpitts import pressure


def _grid():
    # 3x3 grid of unit squares; ids r{row}c{col}
    rows = []
    for r in range(3):
        for c in range(3):
            rows.append({"GEOID": f"r{r}c{c}", "geometry": box(c, r, c + 1, r + 1)})
    return gpd.GeoDataFrame(rows, crs="EPSG:2272")


def test_queen_neighbors_on_a_grid():
    nb = pressure.queen_neighbors(_grid())
    assert len(nb["r1c1"]) == 8      # center touches all
    assert len(nb["r0c0"]) == 3      # corner: right, up, diagonal
    assert "r1c1" in nb["r0c0"]      # queen includes the diagonal


def test_spatial_lag_ignores_missing_neighbors():
    nb = {"a": ["b", "c"], "b": ["a"], "c": ["a"]}
    v = pd.Series({"a": 0.2, "b": 0.8, "c": np.nan})
    lag = pressure.spatial_lag(v, nb)
    assert lag["a"] == 0.8           # c has no data and is ignored
    assert lag["b"] == 0.2
    assert lag["c"] == 0.2


def test_tercile_and_direction_labels():
    t = pressure.tercile(pd.Series([0.1, 0.5, 0.9, np.nan]))
    assert t.tolist()[:3] == ["L", "M", "H"] and t.iloc[3] is None
    d = pressure.direction(pd.Series([0.2, -0.2, 0.01, np.nan]), band=0.05)
    assert d.tolist()[:3] == ["rising", "falling", "flat"] and d.iloc[3] is None
