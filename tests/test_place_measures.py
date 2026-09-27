"""Place measures: arithmetic, geometry and JSON shape on synthetic inputs (no files under data/, no network)."""
from __future__ import annotations

import json
import math

import geopandas as gpd
import numpy as np
import pandas as pd
import pytest
from shapely.geometry import Point, box

from visionpitts import place_measures as pm

CRS = "EPSG:2272"


# ------------------------------------------------------------------------------------------------ CHAS arithmetic
def _band_cols() -> dict:
    cols = {"all": {"hh": "T8_est68"}}
    base = {"le30": 69, "b30_50": 82, "b50_80": 95, "b80_100": 108, "gt100": 121}
    for band, n in base.items():
        cols[band] = {"hh": f"T8_est{n}", "b30_50": f"T8_est{n + 4}", "gt50": f"T8_est{n + 7}"}
    return cols


def test_band_table_adds_burden_cells_and_combines_moe_root_sum_square():
    cols = _band_cols()
    row = {"T8_est68": 720, "T8_moe68": 198, "T8_est69": 435, "T8_moe69": 171, "T8_est73": 70, "T8_moe73": 64,
           "T8_est76": 280, "T8_moe76": 128}
    for band in ("b30_50", "b50_80", "b80_100", "gt100"):
        for part in ("hh", "b30_50", "gt50"):
            row[cols[band][part]] = 10
            row[cols[band][part].replace("est", "moe")] = 3
    t8 = pd.DataFrame([row], index=pd.Index(["42003562300"], name="GEOID"))
    out = pm.band_table(t8, cols)
    r = out.iloc[0]
    assert r["renter_hh"] == 720 and r["renter_hh_moe"] == 198
    assert r["le30_hh"] == 435 and r["le30_moe"] == 171
    assert r["le30_burden30"] == 350          # 70 paying 30-50% + 280 paying more than 50%
    assert r["le30_burden50"] == 280 and r["le30_burden50_moe"] == 128
    assert r["le30_burden30_moe"] == pytest.approx(math.sqrt(64**2 + 128**2))
    assert r["gt100_burden30"] == 20 and r["gt100_burden30_moe"] == pytest.approx(math.sqrt(18))


def test_rss_is_root_sum_square():
    m = pd.DataFrame({"a": [3.0, 0.0], "b": [4.0, 5.0]})
    assert pm.rss(m).tolist() == [5.0, 5.0]


def test_type_table_merges_the_two_upper_bands_into_gt80():
    cols = {}
    n = 100
    for band in pm.BANDS:
        cols[band] = {}
        for typ in pm.TYPES:
            cols[band][typ] = f"T7_est{n}"
            n += 1
    row = {}
    for band in pm.BANDS:
        for typ in pm.TYPES:
            c = cols[band][typ]
            row[c] = {"b80_100": 10, "gt100": 15}.get(band, 5)
            row[c.replace("est", "moe")] = {"b80_100": 3, "gt100": 4}.get(band, 2)
    row[cols["le30"]["elderly_alone"]] = 165
    t7 = pd.DataFrame([row], index=pd.Index(["42003562300"], name="GEOID"))
    out = pm.type_table(t7, cols)
    r = out.iloc[0]
    assert r["types_le30_elderly_alone"] == 165
    assert r["types_b30_50_small_family"] == 5 and r["types_b30_50_small_family_moe"] == 2
    assert r["types_gt80_other"] == 25                            # 10 (80-100%) + 15 (>100%)
    assert r["types_gt80_other_moe"] == pytest.approx(5.0)         # sqrt(3^2 + 4^2)
    assert {c for c in out.columns if not c.endswith("_moe")} == {f"types_{b}_{t}" for b in pm.TYPE_BANDS for t in pm.TYPES}


# ------------------------------------------------------------------------------------------------ HUD helpers
IL = {"data": {"area_name": "Pittsburgh, PA HUD Metro FMR Area", "year": "2026", "median_income": 110400,
               "very_low": {f"il50_p{n}": v for n, v in enumerate([38650, 44200, 49700, 55200, 59650, 64050, 68450, 72900], 1)},
               "extremely_low": {f"il30_p{n}": v for n, v in enumerate([23200, 26500, 29800, 33100, 38680, 44360, 50040, 55720], 1)},
               "low": {f"il80_p{n}": v for n, v in enumerate([61850, 70650, 79500, 88300, 95400, 102450, 109500, 116600], 1)}}}
FMR = {"data": {"area_name": "Pittsburgh, PA HUD Metro FMR Area", "year": "2026", "smallarea_status": "1", "basicdata": [
    {"zip_code": "MSA level", "Efficiency": 1001, "One-Bedroom": 1077, "Two-Bedroom": 1299, "Three-Bedroom": 1661, "Four-Bedroom": 1789},
    {"zip_code": "15207", "Efficiency": 1040, "One-Bedroom": 1120, "Two-Bedroom": 1350, "Three-Bedroom": 1730, "Four-Bedroom": 1860},
    {"zip_code": "15217", "Efficiency": 1250, "One-Bedroom": 1340, "Two-Bedroom": 1620, "Three-Bedroom": 2070, "Four-Bedroom": 2230},
]}}


def test_parse_limits_and_affordable_rent_reproduce_the_plan_figures():
    lim = pm.parse_limits(IL)
    assert lim["median"] == 110400 and lim["fy"] == 2026 and len(lim["il30"]) == 8
    # 0.30 x limit / 12, 1.5 persons per bedroom (1BR = mean of the 1- and 2-person limits), seniors alone = 1 person
    assert pm.affordable_rent(lim["il30"], 1) == 621
    assert pm.affordable_rent(lim["il50"], 1) == 1036
    assert pm.affordable_rent(lim["il30"], 2) == 745
    assert pm.affordable_rent(lim["il50"], 2) == 1242
    assert pm.affordable_rent(lim["il80"], 2) == 1988
    assert pm.affordable_rent(lim["il30"], 1, persons=1) == 580
    assert pm.affordable_rent(lim["il50"], 1, persons=1) == 966
    assert pm.household_size(0) == 1.0 and pm.household_size(3) == 4.5
    assert pm.affordable_rent(lim["il50"], 3) == round((55200 + 59650) / 2 * 0.3 / 12)


def test_parse_safmr_splits_metro_row_from_zip_rows():
    s = pm.parse_safmr(FMR)
    assert s["smallarea"] is True
    assert s["fmr"] == [1001, 1077, 1299, 1661, 1789]
    assert s["safmr"]["15207"][2] == 1350 and set(s["safmr"]) == {"15207", "15217"}


def test_to_hud_json_has_the_contract_shape_and_nulls_when_a_response_is_missing():
    hud = pm.to_hud_json(pm.parse_limits(IL), pm.parse_safmr(FMR))
    assert set(hud) == {"metro", "safmr", "city"}
    assert set(hud["metro"]) == {"name", "fy", "median", "il30", "il50", "il80", "fmr"}
    assert hud["metro"]["fy"] == 2026 and hud["metro"]["median"] == 110400 and len(hud["metro"]["il80"]) == 8
    assert hud["safmr"]["15217"] == [1250, 1340, 1620, 2070, 2230]
    json.dumps(hud, allow_nan=False)
    empty = pm.to_hud_json(None, None)
    assert empty["metro"]["median"] is None and empty["metro"]["fmr"] is None and empty["safmr"] == {}


# ------------------------------------------------------------------------------------------------ market and stock
def test_neighbor_median_ignores_missing_neighbors():
    nb = {"a": ["b", "c", "d"], "b": ["a"], "c": [], "d": ["a"]}
    v = pd.Series({"a": 100.0, "b": 200.0, "c": np.nan, "d": 400.0})
    med = pm.neighbor_median(v, nb)
    assert med["a"] == 300.0 and med["b"] == 100.0 and math.isnan(med["c"])


def test_market_reads_safmr_by_zip_and_neighbor_values():
    tr = pd.DataFrame({"rent_2br_2025_26": [1150.0, np.nan], "n_units_2025_26": [66, 0], "asking_rents_conf": ["high", "low"],
                       "zcta": ["15207", "15217"]}, index=pd.Index(["a", "b"], name="GEOID"))
    acs = pd.DataFrame({"med_gross_rent": [644, 2054], "med_gross_rent_moe": [271, 169], "med_home_value": [89100, 621700],
                        "med_home_value_moe": [31265, 60000]}, index=pd.Index(["a", "b"], name="GEOID"))
    m = pm.market(tr, acs, {"a": ["b"], "b": ["a"]}, pm.parse_safmr(FMR))
    assert m.loc["a", "safmr_2br"] == 1350 and m.loc["b", "safmr_2br"] == 1620
    assert m.loc["a", "value_nbr_acs"] == 621700 and m.loc["b", "value_nbr_acs"] == 89100
    assert math.isnan(m.loc["b", "asking_2br"]) and m.loc["a", "asking_n"] == 66


# ------------------------------------------------------------------------------------------------ transit geometry
def _transit_layout():
    # two square tracts of 5280 ft (one mile) side by side; block points on a grid; stops along the shared edge
    tracts = gpd.GeoDataFrame({"GEOID": ["W", "E"], "geometry": [box(0, 0, 5280, 5280), box(5280, 0, 10560, 5280)]}, crs=CRS)
    blocks = gpd.GeoDataFrame({
        "tract20": ["W", "W", "W", "E", "E"],
        "pop": [100, 100, 0, 50, 150],
        "geometry": [Point(5000, 2640), Point(1000, 2640), Point(2640, 5000), Point(5600, 2640), Point(9000, 2640)],
    }, crs=CRS)
    stops = gpd.GeoDataFrame({
        "dep": [100, 20, 0],                                   # frequent, infrequent, unserved
        "geometry": [Point(5280, 2640), Point(1500, 2640), Point(9100, 2640)],
    }, crs=CRS)
    return tracts, blocks, stops


def test_transit_from_points_distances_shares_and_departures():
    tracts, blocks, stops = _transit_layout()
    out = pm.transit_from_points(blocks, stops, tracts, freq_min=64, radius_ft=1320)
    # W: block at x=5000 is 280 ft from the frequent stop, block at x=1000 is 4280 ft; both pop 100 -> mean 2280 ft
    assert out.loc["W", "freq_dist_mi"] == pytest.approx(2280 / 5280)
    assert out.loc["W", "freq_share_qmi"] == pytest.approx(0.5)          # 100 of 200 residents within a quarter mile
    # nearest served stop of any kind: x=5000 -> 280 ft (frequent), x=1000 -> 500 ft (infrequent); unserved stop ignored
    assert out.loc["W", "any_dist_mi"] == pytest.approx((280 + 500) / 2 / 5280)
    # E: 50 residents 320 ft away, 150 residents 3720 ft away -> weighted mean 2870 ft; share 50/200
    assert out.loc["E", "freq_dist_mi"] == pytest.approx(2870 / 5280)
    assert out.loc["E", "freq_share_qmi"] == pytest.approx(0.25)
    # departures a resident can walk to (population-weighted): W = (100*100 + 100*20)/200 = 60 (the second block has only
    # the infrequent stop, 500 ft away, in reach); E = (50*100 + 150*0)/200 = 25 (the unserved stop counts nothing)
    assert out.loc["W", "departures_qmi"] == 60 and out.loc["E", "departures_qmi"] == 25
    # departures at stops within a quarter mile of each polygon (the frequent stop sits on the shared edge)
    assert out.loc["W", "departures_tract_qmi"] == 120 and out.loc["E", "departures_tract_qmi"] == 100
    assert out.loc["W", "freq_stops_qmi"] == 1 and out.loc["E", "freq_stops_qmi"] == 1
    assert out.loc["W", "block_pop"] == 200 and out.loc["E", "block_pop"] == 200


def test_transit_without_frequent_stops_yields_nulls_not_zeros():
    tracts, blocks, stops = _transit_layout()
    stops["dep"] = [30, 20, 0]  # nothing reaches 64
    out = pm.transit_from_points(blocks, stops, tracts)
    assert out["freq_dist_mi"].isna().all() and out["freq_share_qmi"].isna().all()
    assert out["any_dist_mi"].notna().all()


def test_weighted_mean_falls_back_to_plain_mean_for_unpopulated_groups():
    v = pd.Series([1.0, 3.0, 10.0, 20.0])
    w = pd.Series([1.0, 3.0, 0.0, 0.0])
    g = pd.Series(["a", "a", "park", "park"])
    m = pm._weighted_mean(v, w, g)
    assert m["a"] == pytest.approx(2.5) and m["park"] == pytest.approx(15.0)


def test_percentile_ranks_only_the_masked_tracts():
    s = pd.Series({"a": 10, "b": 20, "c": 30, "park": 100})
    p = pm.percentile(s, pd.Series({"a": True, "b": True, "c": True, "park": False}))
    assert p["c"] == 1.0 and p["a"] == pytest.approx(1 / 3) and math.isnan(p["park"])


# ------------------------------------------------------------------------------------------------ flood geometry
def test_fema_share_is_area_share_of_the_polygon_with_the_dominant_zone():
    tracts = gpd.GeoDataFrame({"GEOID": ["t1", "t2"], "geometry": [box(0, 0, 100, 100), box(200, 0, 300, 100)]}, crs=CRS)
    sfha = gpd.GeoDataFrame({"FLD_ZONE": ["AE", "A", "AE"],
                             "geometry": [box(0, 0, 100, 5), box(0, 5, 100, 8), box(0, 0, 50, 5)]}, crs=CRS)  # overlap must not double count
    out = pm.fema_share(tracts, sfha)
    assert out.loc["t1", "fema_sfha_pct"] == pytest.approx(8.0)
    assert out.loc["t1", "fema_zone"] == "AE"
    assert out.loc["t2", "fema_sfha_pct"] == 0.0 and out.loc["t2", "fema_zone"] is None


# ------------------------------------------------------------------------------------------------ zoning
RULES = {
    "threshold_share": 0.05,
    "families": [
        {"id": "R1D", "codes": ["R1D-"], "by_type": {"adu": "conditional", "duplex_triplex": "no", "townhome": "no", "small_apartment": "no", "senior": "conditional"}},
        {"id": "RM", "codes": ["RM-", "R-MU"], "by_type": {"adu": "conditional", "duplex_triplex": "yes", "townhome": "yes", "small_apartment": "yes", "senior": "yes"}},
        {"id": "P", "codes": ["P"], "by_type": {t: "no" for t in pm.ZONING_TYPES}},
        {"id": "PLANNED", "codes": ["SP-", "PUD"], "by_type": {t: "unknown" for t in pm.ZONING_TYPES}},
    ],
}


def test_zoning_family_matches_exact_codes_then_prefixes():
    assert pm.zoning_family("R1D-L", RULES) == "R1D"
    assert pm.zoning_family("RM-VH", RULES) == "RM"
    assert pm.zoning_family("R-MU", RULES) == "RM"
    assert pm.zoning_family("P", RULES) == "P"
    assert pm.zoning_family("SP-4", RULES) == "PLANNED"
    assert pm.zoning_family("PUD", RULES) == "PLANNED"
    assert pm.zoning_family("MTOBOR", RULES) is None and pm.zoning_family(None, RULES) is None
    assert pm.zoning_family("RP", RULES) is None  # "P" is an exact code, not a prefix


def test_zoning_by_type_thresholds():
    # 90% single-unit detached, 6% multi-unit, 4% parks
    shares = {"R1D": 0.90, "RM": 0.06, "P": 0.04, "PLANNED": 0.0}
    bt = pm.zoning_by_type(shares, RULES)
    assert bt["small_apartment"] == "yes"          # 6% of the land is in a yes district
    assert bt["duplex_triplex"] == "yes"
    assert bt["adu"] == "conditional"              # no yes district; 96% conditional
    shares = {"R1D": 0.97, "RM": 0.03, "P": 0.0, "PLANNED": 0.0}
    bt = pm.zoning_by_type(shares, RULES)
    assert bt["small_apartment"] == "no"           # 3% is under the 5% threshold
    assert bt["townhome"] == "no"
    shares = {"R1D": 0.50, "RM": 0.0, "P": 0.10, "PLANNED": 0.40}
    bt = pm.zoning_by_type(shares, RULES)
    assert bt["townhome"] == "unknown"             # nothing yes or conditional, 40% is unknown
    assert bt["senior"] == "conditional"


def test_zoning_shares_are_land_shares_of_the_tract():
    tracts = gpd.GeoDataFrame({"GEOID": ["t1"], "geometry": [box(0, 0, 100, 100)]}, crs=CRS)
    zoning = gpd.GeoDataFrame({"zon_new": ["R1D-L", "R1D-M", "RM-H", "MTOBOR"],
                               "geometry": [box(0, 0, 50, 100), box(50, 0, 80, 100), box(80, 0, 90, 100), box(90, 0, 100, 100)]}, crs=CRS)
    out = pm.zoning_shares(tracts, zoning, RULES)
    assert out.loc["t1", "zoning_R1D"] == pytest.approx(0.8)
    assert out.loc["t1", "zoning_RM"] == pytest.approx(0.1)
    assert out.loc["t1", "zoning_P"] == 0.0
    assert out.loc["t1", "zoning_unmapped"] == pytest.approx(0.1)
    assert out.loc["t1", "zoning_covered"] == pytest.approx(1.0)


def test_repo_zoning_rules_file_is_complete_and_unverified():
    rules = pm.load_zoning_rules()
    assert rules["verified"] is False and "Title 9" in rules["notes"]
    ids = [f["id"] for f in rules["families"]]
    assert len(ids) == len(set(ids)) >= 16
    allowed = {"yes", "conditional", "no", "unknown"}
    for f in rules["families"]:
        assert set(f["by_type"]) == set(pm.ZONING_TYPES), f["id"]
        assert set(f["by_type"].values()) <= allowed, f["id"]
        assert f["codes"]
    for code, fam in [("R1D-L", "R1D"), ("R1A-VH", "R1A"), ("R2-M", "R2"), ("R3-L", "R3"), ("RM-M", "RM"), ("H", "H"), ("LNC", "LNC"),
                      ("NDO", "NDO"), ("UNC", "UNC"), ("HC", "HC"), ("UI", "UI"), ("NDI", "NDI"), ("GI", "GI"), ("RIV-GI", "GI"),
                      ("RIV-MU", "RIV"), ("RIV-NS", "RIV"), ("GT-A", "GT"), ("EMI", "PLANNED"), ("P", "P"), ("SP-4", "PLANNED"),
                      ("RP", "PLANNED")]:
        assert pm.zoning_family(code, rules) == fam, code


# ------------------------------------------------------------------------------------------------ parcels
def test_parcel_measures_valid_recent_residential_sales_and_counts():
    pin_tract = pd.Series({"p1": "a", "p2": "a", "p3": "a", "p4": "b", "p5": "b", "p6": "b", "p7": "zz"})
    assess = pd.DataFrame({
        "PARID": ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"],
        "CLASSDESC": ["RESIDENTIAL"] * 6 + ["RESIDENTIAL", "RESIDENTIAL"],
        "USEDESC": ["SINGLE FAMILY", "TWO FAMILY", "VACANT LAND", "SINGLE FAMILY", "THREE FAMILY", "SINGLE FAMILY", "SINGLE FAMILY", "SINGLE FAMILY"],
        "SALEDATE": ["03-01-2024", "06-15-2023", "01-01-2024", "12-31-2022", "05-05-2025", "02-02-2024", "02-02-2024", "02-02-2024"],
        "SALEPRICE": ["100000", "200000", "5000", "999999", "300000", "0", "150000", "150000"],
        "SALEDESC": ["VALID SALE", "VALID SALE", "VALID SALE", "VALID SALE", "VALID SALE", "VALID SALE", "VALID SALE", "VALID SALE"],
        "FAIRMARKETTOTAL": ["1", "1", "1", "1", "1", "1", "1", "1"],
    })
    out = pm.parcel_measures(assess, pin_tract, {"a": ["b"], "b": ["a"]}, since="2023-01-01")
    assert out.loc["a", "sale_median"] == 150000 and out.loc["a", "sale_n"] == 2       # vacant land is not a home sale
    assert out.loc["b", "sale_median"] == 300000 and out.loc["b", "sale_n"] == 1       # 2022 sale and $0 sale excluded
    assert out.loc["a", "sale_nbr_median"] == 300000 and out.loc["a", "sale_nbr_n"] == 1
    assert out.loc["b", "sale_nbr_median"] == 150000 and out.loc["b", "sale_nbr_n"] == 2
    assert out.loc["a", "parcels_2_4"] == 1 and out.loc["b", "parcels_2_4"] == 1
    assert out.loc["a", "vacant_parcels"] == 1 and out.loc["b", "vacant_parcels"] == 0
    assert "p8" not in pin_tract.index and out.attrs["city_sale_n"] == 4                # p7 sits in a tract outside the set
    assert out.attrs["city_sale_median"] == 175000


# ------------------------------------------------------------------------------------------------ JSON shape
CONTRACT = {
    "renter_hh": None,
    "bands": {b: {"hh", "moe", "burden30", "burden50"} for b in pm.BANDS},
    "types": {b: set(pm.TYPES) for b in pm.TYPE_BANDS},
    "market": {"asking_2br", "asking_n", "asking_conf", "acs_rent", "acs_rent_moe", "zip", "safmr_2br", "value_acs", "value_acs_moe",
               "value_nbr_acs", "sale_median", "sale_n", "sale_nbr_median", "sale_nbr_n"},
    "stock": {"sfd_share", "units_2_4_share", "units_5_19_share", "units_20plus_share", "vacancy_share", "parcels_2_4", "vacant_parcels"},
    "transit": {"freq_share_qmi", "freq_dist_mi", "any_dist_mi", "departures_qmi", "departures_pct"},
    "access": {"jobs_1mi", "jobs_1mi_pct", "school_mi", "elem_mi", "grocery_mi", "services_halfmi"},
    "flood": {"fema_sfha_pct", "fema_zone", "hand_pct"},
    "zoning": None,
    "programs": {"qct", "dda", "oz", "cdbg"},
    "displacement": {"score", "conf"},
}


def _assert_contract(rec: dict) -> None:
    assert set(rec) == set(CONTRACT)
    for key, spec in CONTRACT.items():
        if spec is None:
            continue
        if isinstance(spec, dict):
            assert set(rec[key]) == set(spec), key
            for k2, leaves in spec.items():
                assert set(rec[key][k2]) == leaves, f"{key}.{k2}"
        else:
            assert set(rec[key]) == spec, key


def _frame() -> pd.DataFrame:
    idx = pd.Index(["42003562300", "42003999900"], name="GEOID")
    df = pd.DataFrame(index=idx)
    df["name"] = ["Tract 5623", "Tract 9999"]
    df["neighborhood"] = ["Hazelwood", None]
    df["residential"] = [True, False]
    df["displacement_score"] = [0.7169973, np.nan]
    df["displacement_conf"] = ["medium", None]
    for k, v in {"qct": [True, False], "dda": [False, False], "oz": [True, False], "cdbg": [True, np.nan]}.items():
        df[k] = v
    df["renter_hh"] = [720, np.nan]
    for b in pm.BANDS:
        df[f"{b}_hh"] = [435.0, np.nan]
        df[f"{b}_moe"] = [171.0, np.nan]
        df[f"{b}_burden30"] = [350.0, np.nan]
        df[f"{b}_burden50"] = [280.0, np.nan]
    for b in pm.TYPE_BANDS:
        for t in pm.TYPES:
            df[f"types_{b}_{t}"] = [165.0, np.nan]
    df["asking_2br"] = [1150.0, np.nan]
    df["asking_n"] = [66, 0]
    df["asking_conf"] = ["high", "low"]
    df["acs_rent"] = [644.0, np.nan]
    df["acs_rent_moe"] = [271.4, np.nan]
    df["zip"] = ["15207", None]
    df["safmr_2br"] = [1350.0, np.nan]
    df["value_acs"] = [89100.0, np.nan]
    df["value_acs_moe"] = [31265.0, np.nan]
    df["value_nbr_acs"] = [261000.0, np.nan]
    for c in ("sfd_share", "units_2_4_share", "units_5_19_share", "units_20plus_share", "vacancy_share"):
        df[c] = [0.61454321, np.nan]
    df["freq_share_qmi"] = [0.647191, np.nan]
    df["freq_dist_mi"] = [0.220265, np.nan]
    df["any_dist_mi"] = [0.076087, np.nan]
    df["departures_qmi"] = [647.0, np.nan]
    df["departures_pct"] = [0.7368421, np.nan]
    df["hand_pct"] = [17.1005, np.nan]
    df["jobs_1mi"] = [5234.4, np.nan]
    df["jobs_1mi_pct"] = [0.31578, np.nan]
    df["school_mi"] = [0.41234, np.nan]
    df["grocery_mi"] = [1.1049, np.nan]
    df["services_halfmi"] = [2.349, np.nan]
    return df


def test_to_place_json_matches_the_contract_with_nulls_and_rounding():
    place = pm.to_place_json(_frame())
    assert set(place) == {"42003562300", "42003999900"}
    for rec in place.values():
        _assert_contract(rec)
    h = place["42003562300"]
    assert h["renter_hh"] == 720 and isinstance(h["renter_hh"], int)
    assert h["bands"]["le30"] == {"hh": 435, "moe": 171, "burden30": 350, "burden50": 280}
    assert h["types"]["le30"]["elderly_alone"] == 165
    assert h["market"]["asking_2br"] == 1150 and h["market"]["acs_rent_moe"] == 271 and h["market"]["zip"] == "15207"
    assert h["market"]["safmr_2br"] == 1350 and h["market"]["sale_median"] is None  # Tier 2 not built: null, not 0
    assert h["stock"]["sfd_share"] == 0.6145 and h["stock"]["parcels_2_4"] is None
    assert h["transit"] == {"freq_share_qmi": 0.6472, "freq_dist_mi": 0.22, "any_dist_mi": 0.08, "departures_qmi": 647, "departures_pct": 0.7368}
    assert h["access"] == {"jobs_1mi": 5234, "jobs_1mi_pct": 0.3158, "school_mi": 0.41, "elem_mi": None,
                           "grocery_mi": 1.1, "services_halfmi": 2.3}
    assert place["42003999900"]["access"]["jobs_1mi"] is None
    assert h["flood"] == {"fema_sfha_pct": None, "fema_zone": None, "hand_pct": 17.1}
    assert h["zoning"] is None
    assert h["programs"] == {"qct": True, "dda": False, "oz": True, "cdbg": True}
    assert h["displacement"] == {"score": 0.717, "conf": "medium"}
    park = place["42003999900"]
    assert park["renter_hh"] is None and park["bands"]["gt100"]["hh"] is None and park["programs"]["cdbg"] is None
    assert park["displacement"] == {"score": None, "conf": None} and park["market"]["zip"] is None
    json.dumps(place, allow_nan=False)  # no NaN leaks into the file


def test_to_place_json_zoning_block_when_tier2_columns_exist():
    df = _frame()
    fams = [f["id"] for f in RULES["families"]]
    for f in fams:
        df[f"zoning_{f}"] = 0.0
    df.loc["42003562300", ["zoning_R1D", "zoning_RM", "zoning_P"]] = [0.7, 0.2, 0.1]
    for t in pm.ZONING_TYPES:
        df[f"zoning_bytype_{t}"] = "yes"
    df["zoning_ok"] = [True, True]
    df.loc["42003999900", [f"zoning_{f}" for f in fams]] = 0.0
    df.loc["42003999900", "zoning_P"] = 1.0
    place = pm.to_place_json(df, RULES)
    z = place["42003562300"]["zoning"]
    assert z["verified"] is False
    assert z["shares"] == {"R1D": 0.7, "RM": 0.2, "P": 0.1}       # zero shares dropped
    assert set(z["by_type"]) == set(pm.ZONING_TYPES) and z["by_type"]["adu"] == "yes"
    assert place["42003999900"]["zoning"]["shares"] == {"P": 1.0}
    # without the rules the block stays null even when the columns exist
    assert pm.to_place_json(df)["42003562300"]["zoning"] is None


def test_coverage_counts_non_null_leaves():
    place = pm.to_place_json(_frame())
    cov = pm.coverage(place)
    assert cov["renter_hh"] == 1 and cov["bands.le30.hh"] == 1 and cov["market.sale_median"] == 0 and cov["zoning"] == 0


# ------------------------------------------------------------------------------------------------ access
def _pts(xy: list[tuple[float, float]], **cols) -> gpd.GeoDataFrame:
    return gpd.GeoDataFrame(cols, geometry=[Point(x, y) for x, y in xy], crs=CRS)


def test_count_within_counts_and_sums_inside_the_radius_edges_included():
    pts = _pts([(0, 0), (10000, 0)])
    tg = _pts([(0, 5280), (3000, 0), (0, 5281), (10000, 100)], jobs=[10, 20, 400, 7])
    assert pm.count_within(pts, tg, pm.MILE_FT).tolist() == [2.0, 1.0]            # (0,5280) on the edge counts; 5281 not
    assert pm.count_within(pts, tg, pm.MILE_FT, weight="jobs").tolist() == [30.0, 7.0]
    assert pm.count_within(pts, tg.iloc[0:0], pm.MILE_FT).tolist() == [0.0, 0.0]


def test_service_kind_maps_osm_tags_once():
    assert pm.service_kind({"shop": "supermarket"}) == "grocery"
    assert pm.service_kind({"shop": "grocery"}) == "grocery"
    assert pm.service_kind({"shop": "convenience"}) is None
    assert pm.service_kind({"amenity": "pharmacy", "healthcare": "pharmacy"}) == "pharmacy"
    assert pm.service_kind({"healthcare": "doctor"}) == "health"
    assert pm.service_kind({"amenity": "hospital"}) == "health"
    assert pm.service_kind({"amenity": "library"}) == "library"
    assert pm.service_kind({"amenity": "bank"}) is None


def test_load_schools_filters_and_flags_elementary(tmp_path):
    base = {"latitude": 40.44, "longitude": -79.99, "school_status": 1, "school_type": 1, "virtual": 3}
    rows = [
        {**base, "ncessch": "a", "school_name": "K-5", "lowest_grade_offered": 0, "highest_grade_offered": 5},
        {**base, "ncessch": "b", "school_name": "HS", "lowest_grade_offered": 9, "highest_grade_offered": 12},
        {**base, "ncessch": "c", "school_name": "PreK", "lowest_grade_offered": -1, "highest_grade_offered": -1},
        {**base, "ncessch": "d", "school_name": "Closed", "school_status": 2, "lowest_grade_offered": 0, "highest_grade_offered": 5},
        {**base, "ncessch": "e", "school_name": "Cyber", "virtual": 1, "lowest_grade_offered": 0, "highest_grade_offered": 12},
        {**base, "ncessch": "f", "school_name": "CTC", "school_type": 3, "lowest_grade_offered": 9, "highest_grade_offered": 12},
    ]
    f = tmp_path / "ccd.json"
    f.write_text(json.dumps({"count": len(rows), "results": rows}))
    s = pm.load_schools(f)
    assert s["ncessch"].tolist() == ["a", "b", "c"]
    assert s["elem"].tolist() == [True, False, False]


def test_load_osm_services_uses_way_centers_and_drops_other_tags(tmp_path):
    els = [
        {"type": "node", "id": 1, "lat": 40.4, "lon": -80.0, "tags": {"shop": "supermarket"}},
        {"type": "way", "id": 2, "center": {"lat": 40.5, "lon": -80.1}, "tags": {"amenity": "hospital"}},
        {"type": "node", "id": 3, "lat": 40.4, "lon": -80.0, "tags": {"amenity": "bank"}},
        {"type": "node", "id": 1, "lat": 40.4, "lon": -80.0, "tags": {"shop": "supermarket"}},  # duplicate element
    ]
    f = tmp_path / "osm.json"
    f.write_text(json.dumps({"elements": els}))
    s = pm.load_osm_services(f)
    assert s["kind"].tolist() == ["grocery", "health"]
    assert s.geometry.iloc[1].x == pytest.approx(-80.1)


def test_access_from_points_population_weighted_distances_and_counts():
    tracts = gpd.GeoDataFrame({"GEOID": ["A", "B"]}, geometry=[box(0, 0, 10000, 10000), box(20000, 0, 30000, 10000)], crs=CRS)
    # tract A: 300 people at (0,0), 100 at (5280,0); tract B: one block with no residents
    blocks = _pts([(0, 0), (5280, 0), (25000, 0)], tract20=["A", "A", "B"], pop=[300, 100, 0])
    work = _pts([(0, 0), (5280, 0), (25000, 5000)], jobs=[1000, 200, 50])
    schools = _pts([(0, 2640), (5280, 5280)], elem=[False, True])
    services = _pts([(0, 1000), (1000, 0), (5280, 1320), (25000, 20000)], kind=["grocery", "pharmacy", "library", "grocery"])
    out = pm.access_from_points(blocks, tracts, work, schools, services)
    a = out.loc["A"]
    # jobs within 1 mile: both work blocks are 5280 ft apart, so each resident point reaches both -> 1200
    assert a["jobs_1mi"] == 1200
    # nearest school: (0,0) -> 2640 ft = 0.5 mi, (5280,0) -> 5280 ft = 1 mi; weighted (300*0.5 + 100*1)/400
    assert a["school_mi"] == pytest.approx(0.625)
    # nearest elementary is (5280,5280): 5280*sqrt(2) ft from (0,0), 5280 ft from (5280,0)
    assert a["elem_mi"] == pytest.approx((300 * math.sqrt(2) + 100 * 1.0) / 400)
    # nearest grocery (0,1000): 1000 ft and hypot(5280,1000) ft
    assert a["grocery_mi"] == pytest.approx((300 * 1000 + 100 * math.hypot(5280, 1000)) / 400 / 5280)
    # half-mile services: (0,0) sees grocery + pharmacy (2); (5280,0) sees the library (1)
    assert a["services_halfmi"] == pytest.approx((300 * 2 + 100 * 1) / 400)
    b = out.loc["B"]  # zero population falls back to the plain mean of its one block
    assert b["jobs_1mi"] == 50 and b["services_halfmi"] == 0 and b["grocery_mi"] == pytest.approx(20000 / 5280)


def test_access_from_points_missing_layers_stay_null():
    tracts = gpd.GeoDataFrame({"GEOID": ["A"]}, geometry=[box(0, 0, 10, 10)], crs=CRS)
    blocks = _pts([(1, 1)], tract20=["A"], pop=[10])
    out = pm.access_from_points(blocks, tracts, schools=_pts([(1, 5281)], elem=[None]))
    assert out.loc["A", "school_mi"] == pytest.approx(1.0)
    assert out[["jobs_1mi", "elem_mi", "grocery_mi", "services_halfmi"]].isna().all(axis=None)
