import json

import pandas as pd

from visionpitts import equity_zip as ez
from visionpitts.config import APP_DATA


def _bands(le30, b30_50, b50_80, b80_100, gt100):
    return {k: {"burden30": v} for k, v in zip(["le30", "b30_50", "b50_80", "b80_100", "gt100"], [le30, b30_50, b50_80, b80_100, gt100])}


def _blocks():
    # Tract A: 60 homes in ZIP 1, 40 in ZIP 2. Tract B: 50 homes, all in ZIP 2. Tract X is outside the city (ZIP 2 total only).
    return pd.DataFrame(
        [
            ["a1", "A", "11111", 60],
            ["a2", "A", "22222", 40],
            ["b1", "B", "22222", 50],
            ["x1", "X", "22222", 110],
            ["a0", "A", "22222", 0],
        ],
        columns=["GEOID20", "tract", "zcta", "hu"],
    )


def test_crosswalk_weights_sum_to_one_per_tract():
    xw, total = ez.crosswalk(_blocks(), {"A", "B"})
    sums = xw.groupby("tract")["w"].sum()
    assert sums.round(9).eq(1.0).all()
    a = xw.set_index(["tract", "zcta"])["w"]
    assert a[("A", "11111")] == 0.6 and a[("A", "22222")] == 0.4
    assert total["22222"] == 200 and total["11111"] == 60


def test_homes_outside_every_zip_stay_in_the_denominator():
    b = pd.concat([_blocks(), pd.DataFrame([["a9", "A", None, 100]], columns=["GEOID20", "tract", "zcta", "hu"])])
    xw, _ = ez.crosswalk(b, {"A", "B"})
    assert round(xw[xw.tract == "A"]["w"].sum(), 9) == 0.5


def test_tract_split_across_two_zips():
    place = {
        "A": {"bands": _bands(100, 50, 20, 10, 10), "access": {"jobs_1mi": 1000, "school_mi": 0.5, "services_halfmi": 2.0}, "transit": {"freq_dist_mi": 0.2}},
        "B": {"bands": _bands(10, 10, 10, 10, 0), "access": {"jobs_1mi": 4000, "school_mi": None, "services_halfmi": 6.0}, "transit": {"freq_dist_mi": 0.8}},
    }
    rents = pd.DataFrame([{"GEOID": "22222", "rent_2br_2025_26": 1500.0, "n_units_2025_26": 300, "asking_rents_conf": "high"}])
    xw, total = ez.crosswalk(_blocks(), {"A", "B"})
    z = ez.aggregate(xw, total, place, rents, {"22222": [1, 2, 1300, 4, 5]}, all_zips=["11111", "22222", "33333"])
    one, two = z["11111"], z["22222"]
    # burdened: count x share of the tract's homes in the ZIP; the two ZIPs add back to the tract totals
    assert one["burdened"]["30"] == 60 and two["burdened"]["30"] == 40 + 10
    assert one["burdened"]["50"] + two["burdened"]["50"] == 150 + 20
    assert two["burdened"]["100"] == round(20 * 0.4 + 10)
    # means weighted by the tract's homes in the ZIP (A 40, B 50); a missing value drops out
    assert two["jobs"] == round((1000 * 40 + 4000 * 50) / 90)
    assert two["school"] == 0.5
    assert two["transit"] == round((0.2 * 40 + 0.8 * 50) / 90, 2)
    assert one["jobs"] == 1000 and one["n"] == 1 and two["n"] == 2
    # share of the ZIP's homes in the city; under half is an edge ZIP
    assert one["share"] == 1.0 and not one["edge"]
    assert two["hu"] == 90 and two["share"] == 0.45 and two["edge"]
    assert two["asking_2br"] == 1500 and two["asking_conf"] == "high" and two["safmr_2br"] == 1300
    assert one["asking_2br"] is None and one["safmr_2br"] is None
    # a ZIP with no city homes is listed with no values
    assert z["33333"]["n"] == 0 and z["33333"]["jobs"] is None and z["33333"]["burdened"]["30"] is None


def test_burdened_needs_every_band():
    assert ez.burdened({"bands": _bands(1, 2, 3, 4, 5)}, ez.BURDEN_LEVELS["80"]) == 6
    assert ez.burdened({"bands": {"le30": {"burden30": 1}}}, ez.BURDEN_LEVELS["50"]) is None
    assert ez.burdened(None, ez.BURDEN_LEVELS["30"]) is None


def test_compact_form_is_short_and_drops_missing():
    rec = {"hu": 90, "share": 0.45, "n": 2, "t": {"42003000100": 0.4, "42003020300": 1.0}, "edge": True, "burdened": {"30": 50, "50": 70, "80": 90, "100": None},
           "jobs": 3000, "school": None, "transit": 0.53, "services": 4.1, "asking_2br": 1500, "asking_n": 30, "asking_conf": "low", "safmr_2br": 1300}
    c = ez.compact({"22222": rec})["22222"]
    assert c == {"h": 90, "p": 0.45, "t": [20300, 100], "b": [50, 70, 90, None], "j": 3000, "tr": 0.53, "sv": 4.1}


def test_bundled_file_is_small_and_consistent():
    p = APP_DATA / "equity_zip.json"
    if not p.exists():
        return
    assert p.stat().st_size < 8_000
    doc = json.loads(p.read_text())
    for z, r in doc["z"].items():
        assert len(z) == 5 and 0 <= r["p"] <= 1
        assert len(r.get("b", [0, 0, 0, 0])) == 4
