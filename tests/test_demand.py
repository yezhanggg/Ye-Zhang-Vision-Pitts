import json

import geopandas as gpd
import numpy as np
import pandas as pd
import pytest
from shapely.geometry import box

from visionpitts import demand as dm
from visionpitts.config import APP_DATA, CRS_PA_SOUTH


def row(values: dict[str, float], moe: float = 10.0) -> pd.DataFrame:
    """One raw API row (strings) with every demand stem: given estimates, the rest zero."""
    data = {}
    for s in dm.stems():
        data[f"{s}E"] = str(values.get(s, 0))
        data[f"{s}M"] = str(moe)
    return pd.DataFrame([data], index=pd.Index(["42003000100"], name="GEOID"))


def test_stems_cover_every_table():
    tables = {s.split("_")[0] for s in dm.stems()}
    assert tables == {"B25009", "B25042", "B25068", "B25118", "B25119", "B25032", "B25007", "B25064"}
    assert len(dm.rent_stems()) == 4 * (dm.RENT_BRACKETS + 1)
    assert len(dm.INCOME) + 1 == len(dm.INCOME_EDGES)
    assert dm.RENT_BRACKETS + 1 == len(dm.RENT_EDGES)


def test_label_check_catches_a_renumbered_stem():
    good = {f"{s}E": {"label": f"Estimate!!Total:!!{want}"} for s, want in dm.EXPECTED_LABELS.items()}
    assert dm.check_labels(good) == []
    bad = dict(good)
    bad["B25009_011E"] = {"label": "Estimate!!Total:!!Renter occupied:!!2-person household"}
    assert dm.check_labels(bad) == ["B25009_011: 'Estimate!!Total:!!Renter occupied:!!2-person household'"]


def test_unit_shares_and_sums():
    vals = {dm.TOTAL_HH: 1000, dm.RENTER_HH: 600, "B25009_011": 300, "B25009_012": 150, "B25009_013": 60, "B25009_014": 40,
            "B25009_015": 30, "B25009_016": 15, "B25009_017": 5, dm.RENTER_HOMES_STRUCT: 600, "B25032_014": 100, "B25032_015": 200,
            "B25032_016": 50, "B25032_017": 50, "B25032_018": 200, dm.RENTER_HH_AGE: 600, "B25007_019": 60, "B25007_020": 30,
            "B25007_021": 10, dm.RENT_MED: 1000, dm.RENTER_INCOME_MED: 40000}
    c = dm.al.clean_raw(row(vals)).iloc[0]
    u = dm.unit(c)
    assert u["renters"] == [600, 10]
    assert u["shares"]["renter"][0] == pytest.approx(0.6)
    assert u["shares"]["one_person"][0] == pytest.approx(0.5)
    assert u["shares"]["large5"][0] == pytest.approx(50 / 600, abs=1e-4)
    assert u["shares"]["age65"][0] == pytest.approx(100 / 600, abs=1e-4)
    assert u["shares"]["small_bldg"][0] == pytest.approx(400 / 600, abs=1e-4)
    assert u["rent_to_income"] == pytest.approx(0.3)
    assert len(u["size"]) == 7 and len(u["br"]) == 6 and len(u["inc"]) == 11 and len(u["age"]) == 9
    assert set(u["rent_br"]) == {"0", "1", "2", "3"} and all(len(v) == dm.RENT_BRACKETS for v in u["rent_br"].values())


def test_missing_estimates_stay_missing():
    raw = row({dm.TOTAL_HH: 1000, dm.RENTER_HH: 600})
    raw["B25009_011E"] = "-666666666"
    u = dm.unit(dm.al.clean_raw(raw).iloc[0])
    assert u["size"][0][0] is None
    assert u["shares"]["one_person"] == [None, None, None]
    assert u["rent_to_income"] is None  # median rent and income are zero in the fixture: no ratio


def test_growth_from_history(tmp_path):
    p = tmp_path / "h.csv"
    pd.DataFrame({"GEOID": ["1", "1", "1"], "year": [2014, 2019, 2024], "households": [1000, 1100, 1200],
                  "renter_share": [0.5, 0.5, 0.6], "med_gross_rent": [800, 900, 1200], "med_hh_income": [40000, 45000, 60000]}).to_csv(p, index=False)
    g = dm.growth("tract", p)["1"]
    assert g == {"renters": [500, 720], "rent": [800.0, 1200.0], "income": [40000.0, 60000.0]}


def test_year_placed_and_supply_windows():
    assert dm.year_placed("1995") == 1995
    assert dm.year_placed("8888") is None and dm.year_placed("9999") is None and dm.year_placed(None) is None
    df = pd.DataFrame({"HUD_ID": ["a", "b", "c", "d"], "PROJECT": ["A", "B", "C", "D"], "YR_PIS": ["1990", "1999", "2010", "8888"],
                       "LI_UNITS": [10, 20, 30, 5], "N_UNITS": [10, 20, 30, 5], "CREDIT": ["1", "2", "3", "2"], "BOND": ["2", "1", "2", "2"],
                       "LAT": [40.44, 40.44, 40.44, 40.44], "LON": [-79.99, -79.99, -79.99, -79.99]})
    s = dm.supply_counts(dm.lihtc_points(df))
    assert s["projects"] == 4 and s["li_units"] == 65
    assert s["li_units_recent"] == 30           # placed 2006 or later
    assert s["li_units_past30"] == 10           # 1990 + 30 <= 2026
    assert s["li_units_end_5y"] == 20           # 1999 + 30 = 2029, within five years
    assert s["no_year"] == 5


def test_tract_supply_counts_inside_and_within_a_mile():
    pts = gpd.GeoDataFrame({"HUD_ID": ["in", "near", "far"], "PROJECT": ["IN", "NEAR", "FAR"], "yr": [2010.0, 2000.0, 1995.0],
                            "li": [10.0, 20.0, 40.0], "n": [10.0, 20.0, 40.0], "CREDIT": ["2", "1", "2"], "BOND": ["2", "1", "2"]},
                           geometry=gpd.points_from_xy([500, 3000, 20000], [500, 500, 500]), crs=CRS_PA_SOUTH)
    tracts = gpd.GeoDataFrame({"GEOID": ["t"]}, geometry=[box(0, 0, 1000, 1000)], crs=CRS_PA_SOUTH)
    out = dm.tract_supply(pts, tracts)["t"]
    assert out["li_units"] == 10 and out["mile"]["li_units"] == 30
    assert [p["name"] for p in out["nearby"]] == ["In", "Near"]
    assert out["nearby"][1]["credit"] == "4%" and out["nearby"][1]["bond"] is True


def test_built_file_when_present():
    path = APP_DATA / "lazy" / "demand.json"
    if not path.exists():
        pytest.skip("demand.json not built")
    d = json.loads(path.read_text())
    places = json.loads((APP_DATA / "place.json").read_text())
    assert set(d["tracts"]) == set(places)
    city = d["city"]
    assert sum(x[0] for x in city["size"]) == city["renters"][0]
    assert sum(x[0] for x in city["br"]) == city["renters"][0]
    for t in d["tracts"].values():
        assert t["zip"] is None or t["zip"] in d["zips"]
    assert all(np.isfinite(v[0]) for v in city["shares"].values())


def test_tract_depth_sums_bands_within_a_mile():
    tracts = gpd.GeoDataFrame({"GEOID": ["a", "b", "c"]}, geometry=[box(0, 0, 1000, 1000), box(2000, 0, 3000, 1000), box(20000, 0, 21000, 1000)], crs=CRS_PA_SOUTH)
    band = lambda le30, b30, b50: {"bands": {"le30": {"hh": le30}, "b30_50": {"hh": b30}, "b50_80": {"hh": b50}}}
    places = {"a": band(100, 50, 30), "b": band(10, None, 60), "c": band(1000, 1000, 1000)}
    out = dm.tract_depth(tracts, places)
    assert out["a"] == {"tracts": 2, "le50": 160, "b50_80": 90, "le60": 190}   # 160 + 90 / 3
    assert out["c"]["tracts"] == 1 and out["c"]["le60"] == 2333


def test_built_file_has_depth_when_present():
    path = APP_DATA / "lazy" / "demand.json"
    if not path.exists():
        pytest.skip("demand.json not built")
    d = json.loads(path.read_text())
    places = json.loads((APP_DATA / "place.json").read_text())
    for g, t in d["tracts"].items():
        own = sum(((places[g].get("bands") or {}).get(b) or {}).get("hh") or 0 for b in ("le30", "b30_50"))
        assert t["depth"]["le50"] >= round(own) - 1 and t["depth"]["tracts"] >= 1
