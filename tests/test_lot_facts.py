import json

import geopandas as gpd
import numpy as np
import pandas as pd
import pytest
from shapely.geometry import box

from visionpitts import lot_facts as lf
from visionpitts import parcel_shadow as ps
from visionpitts.config import CRS_PA_SOUTH, ROOT

SHAPES = ROOT / "app" / "public" / "data" / "parcel-shadow"
FACTS = ROOT / "app" / "public" / "data" / "parcel-lots"


def _lots():
    # Downtown Pittsburgh in State Plane feet: a 50 x 100 ft lot, a 40 x 40 ft lot, an unlabelled shape, and a lot
    # drawn as two shapes (the larger one's reading is kept).
    geoms = [box(1340000, 410000, 1340050, 410100), box(1340200, 410000, 1340240, 410040), box(1340400, 410000, 1340450, 410050),
             box(1340600, 410000, 1340700, 410100), box(1340600, 410200, 1340610, 410210)]
    return gpd.GeoDataFrame({"pin": ["A", "B", "C", "D", "D"], "lot": ["1-A-1", "1-A-2", "", "1-A-4", "1-A-4"]}, geometry=geoms, crs=CRS_PA_SOUTH)


def test_facts_read_area_dimensions_district_and_homes():
    lots = _lots()
    lotarea = pd.Series(["5000", "0", "9", "10000", "10000"], index=lots.index)
    usedesc = pd.Series(["TWO FAMILY", "VACANT LAND", "", "FOUR FAMILY", "FOUR FAMILY"], index=lots.index)
    district = pd.Series(["R2-M", None, "R1D-L", "RM-M", "RM-M"], index=lots.index)
    rows = lf.facts(lots, lotarea, usedesc, district).set_index("lot")
    assert set(rows.index) == {"1-A-1", "1-A-2", "1-A-4"}            # the unlabelled shape is left out, the lot drawn twice once
    a = rows.loc["1-A-1"]
    assert (a["district"], a["sqft"], a["frontage_ft"], a["depth_ft"], a["existing_homes"]) == ("R2-M", 5000, 50, 100, 2)
    b = rows.loc["1-A-2"]
    assert not isinstance(b["district"], str) and b["sqft"] == 1600                 # no LOTAREA: the shape's own area
    assert pd.isna(b["existing_homes"])
    assert rows.loc["1-A-4", "frontage_ft"] == 100                     # the larger of its two shapes


def test_chunk_file_lists_codes_once_and_marks_unknowns():
    rows = pd.DataFrame({"lot": ["1-A-1", "1-A-2"], "district": ["R2-M", None], "sqft": [5000, 1600], "frontage_ft": [50, None],
                         "depth_ft": [100, None], "existing_homes": [2, np.nan], "tx": [1, 1], "ty": [2, 2]})
    out = lf.chunk_json(rows)
    assert out == {"codes": ["R2-M"], "lots": {"1-A-1": [0, 5000, 50, 100, 2], "1-A-2": [-1, 1600, -1, -1, -1]}}


def test_tile_xy_is_the_web_map_tile():
    x, y = ps.tile_xy(np.array([-80.0]), np.array([40.44]), 13)
    assert (int(x[0]), int(y[0])) == (2275, 3088)


@pytest.mark.skipif(not (SHAPES / "manifest.json").exists() or not (FACTS / "manifest.json").exists(), reason="lot files not built here")
def test_every_labelled_lot_in_the_shapes_has_facts_in_the_same_chunk():
    shapes = sorted(p.stem for p in SHAPES.glob("*_*.json"))
    facts = sorted(p.stem for p in FACTS.glob("*_*.json"))
    assert shapes == facts
    smallest = min(shapes, key=lambda k: (SHAPES / f"{k}.json").stat().st_size)
    fc = json.loads((SHAPES / f"{smallest}.json").read_text())
    f = json.loads((FACTS / f"{smallest}.json").read_text())
    labels = [ft["properties"]["lot"] for ft in fc["features"] if ft["properties"]["lot"]]
    assert labels and all(lab in f["lots"] for lab in labels)
    manifest = json.loads((FACTS / "manifest.json").read_text())
    assert manifest["fields"] == lf.FIELDS and "owner" in manifest["note"]
