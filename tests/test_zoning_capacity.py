import json

import pytest
from shapely.geometry import box

from visionpitts import zoning_capacity as zc
from visionpitts.config import APP_DATA, ROOT


@pytest.fixture(scope="module")
def cfg():
    return zc.load_standards()


@pytest.fixture(scope="module")
def std(cfg):
    return zc.by_code(cfg)


def test_every_row_names_its_section_and_is_verified(cfg):
    for d in cfg["districts"]:
        assert d["section"].startswith(("§903.03.", "§904.0")), d["code"]
        assert d["verified"] is True
        assert set(d["uses"]) == set(cfg["use_labels"])
        assert set(d["uses"].values()) <= set(cfg["legend"])
    assert cfg["current_through"] and cfg["read_on"]
    for key in ("adu", "parking", "inclusionary"):
        assert cfg[key]["verified"] is True


def test_every_district_on_the_map_is_computed_or_explained(cfg):
    codes = {f["properties"]["code"] for f in json.loads((APP_DATA / "zoning_districts.json").read_text())["features"]}
    computed = {d["code"] for d in cfg["districts"]}
    assert codes - computed - set(cfg["not_computed"]) == set()
    assert computed & set(cfg["not_computed"]) == set()


def test_transcribed_values_spot_check(std):
    # §903.03: low density minimum lot 3,000 sq ft; RM-M 55 ft and 4 stories; RM-H 85 ft and 9 stories; VH no minimum lot.
    assert std["R2-L"]["min_lot_sqft"] == 3000 and std["R2-M"]["min_lot_sqft"] == 2400 and std["R1D-VL"]["min_lot_sqft"] == 6000
    assert (std["RM-M"]["max_height_ft"], std["RM-M"]["max_stories"]) == (55, 4)
    assert (std["RM-H"]["max_height_ft"], std["RM-H"]["max_stories"]) == (85, 9)
    assert std["RM-VH"]["min_lot_sqft"] == 0 and std["RM-VH"]["max_stories"] is None
    # §904: NDO FAR 3:1, LNC and NDI 2:1, all 45 ft / 3 stories, 90% coverage except UNC (none set).
    assert (std["NDO"]["max_far"], std["LNC"]["max_far"], std["NDI"]["max_far"], std["UNC"]["max_far"]) == (3.0, 2.0, 2.0, 3.0)
    assert std["UNC"]["max_coverage"] is None and std["UNC"]["near_transit"]["max_far"] == 4.0
    # §911.02: multi-unit by right only in RM among the residential districts; two-unit from R2, three-unit from R3.
    assert [std[c]["uses"]["multi_unit"] for c in ("R1D-L", "R2-L", "R3-L", "RM-M")] == ["N", "N", "N", "P"]
    assert std["R2-M"]["uses"]["two_unit"] == "P" and std["R2-M"]["uses"]["three_unit"] == "N"


def test_capped_districts_need_the_minimum_lot(std):
    assert zc.homes_by_right(std["R2-M"], 2400)["homes"] == 2
    r = zc.homes_by_right(std["R2-M"], 2399)
    assert r["homes"] == 0 and r["below_min"] is True
    assert zc.homes_by_right(None, 5000)["computed"] is False


def test_envelope_by_hand(std):
    # RM-M, 80 x 125 ft: (80 - 20) x (125 - 25 - 25) = 4,500 sq ft x 4 stories = 18,000; x 0.85 / 850 = 18 homes.
    r = zc.homes_by_right(std["RM-M"], 10000, 80, 125)
    assert r["floor_area"] == 18000 and r["homes"] == 18
    # LNC, 40 x 125 ft: footprint 40 x 105 = 4,200 (under 90% coverage) x 3 = 12,600, held to FAR 2 x 5,000 = 10,000.
    r = zc.homes_by_right(std["LNC"], 5000, 40, 125)
    assert r["floor_area"] == 10000 and r["homes"] == 10
    # RM-VL: 30 ft side setbacks on each side leave nothing on a 40 ft lot.
    assert zc.homes_by_right(std["RM-VL"], 6000, 40, 150)["homes"] == 0


def test_lot_dims_keep_the_area():
    f, d = zc.lot_dims(box(0, 0, 25, 100), 2500)
    assert f == pytest.approx(25) and d == pytest.approx(100)
    f, d = zc.lot_dims(box(0, 0, 30, 100), 2700)  # LOTAREA smaller than the shape: both sides scale down
    assert f * d == pytest.approx(2700)


def test_fixture_matches_the_rule(std):
    fx = json.loads(zc.FIXTURE.read_text())
    assert fx["assumptions"] == {"home_sqft": zc.HOME_SQFT, "efficiency": zc.EFFICIENCY, "story_ft": zc.STORY_FT}
    assert fx["cases"] == zc.fixture_cases(std)


def test_app_copy_of_the_standards_is_current(cfg):
    path = APP_DATA / "lazy" / "zoning_standards.json"
    if not path.exists():
        pytest.skip("not built")
    assert json.loads(path.read_text()) == cfg, "rerun scripts/18_build_zoning_capacity.py"


def test_capacity_file_is_tract_totals_only():
    path = APP_DATA / "lazy" / "zoning_capacity.json"
    if not path.exists():
        pytest.skip("not built")
    d = json.loads(path.read_text())
    places = json.loads((APP_DATA / "place.json").read_text())
    assert set(d["tracts"]) <= set(places)
    text = path.read_text()
    assert "PIN" not in text and "PARID" not in text
    for t in d["tracts"].values():
        assert set(t) == {"lots", "vacant", "gentle", "districts", "izo_share"}


def test_old_minimums_only_raise_the_lot_size(std):
    old = zc.old_minimums(std)
    assert old["R1D-VL"]["min_lot_sqft"] == 8000 and old["R2-L"]["min_lot_sqft"] == 5000
    assert old["R3-M"]["min_lot_sqft"] == 3200 and old["RM-H"]["min_lot_sqft"] == 1800
    assert old["LNC"] is std["LNC"]  # no density suffix: unchanged
    for code in std:
        assert old[code]["min_lot_sqft"] >= std[code]["min_lot_sqft"]
    # A 4,000 sq ft R2-L lot holds two homes today and none under the old 5,000 minimum.
    assert zc.homes_by_right(std["R2-L"], 4000)["homes"] == 2
    assert zc.homes_by_right(old["R2-L"], 4000)["homes"] == 0


def test_house_lot_gains():
    import pandas as pd

    rows = pd.DataFrame({
        "use": ["residential"] * 5 + ["vacant"],
        "family": ["R1D", "R2", "R2", "R3", "R1A", "R1D"],
        "existing": [1, 1, 2, 1, 1, None],
        "below_min": [False, False, False, False, True, False],
    })
    g = zc.house_lot_gains(rows)
    # R1D house: +1 ADU; R2 single: +1 (today's second home); R2 two-family: an ADU sits beside a single home only;
    # R3 single: +2 today; the R1A lot under its minimum and the vacant lot are left out.
    assert g["adu"] == 1 + 1 + 0 + 2
    assert g["up3"] == 2 + 2 + 1 + 2
    assert g["up4"] == 3 + 3 + 2 + 3
