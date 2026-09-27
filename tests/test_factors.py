import numpy as np
import pandas as pd
import pytest

from visionpitts import factors
from visionpitts.config import load_scoring


def test_pct_is_in_unit_interval_and_keeps_nan():
    s = pd.Series([3.0, 1.0, np.nan, 2.0, 2.0])
    p = factors.pct(s)
    assert p.isna().tolist() == [False, False, True, False, False]
    assert p.dropna().between(0, 1).all()
    assert p[1] == pytest.approx(0.25)          # lowest of four -> 1/4
    assert p[3] == p[4]                          # ties share the average rank
    assert p[0] == pytest.approx(1.0)


def test_age_level_thresholds():
    assert factors.age_level(2026) == 0 and factors.age_level(2024) == 0
    assert factors.age_level(2023) == 1 and factors.age_level(2021) == 1
    assert factors.age_level(2020) == 2


def test_options_lay_config_over_defaults():
    assert factors.options(None) == factors.DEFAULT_OPTIONS
    assert factors.options(load_scoring()) == factors.DEFAULT_OPTIONS  # config/scoring.json is the v0.4.0 method
    o = factors.options({"factor_options": {"transit": {"basis": "acre"}, "subsidy": {"mode": "flag"}}})
    assert o["transit"] == {"basis": "acre", "household_floor": 400}
    assert o["subsidy"]["mode"] == "flag" and o["subsidy"]["tiers"] == factors.SUBSIDY_TIERS
    assert o["flood"] == factors.DEFAULT_OPTIONS["flood"]


# ------------------------------------------------------------------------------------------ need
def test_need_downgrades_on_cv():
    df = pd.DataFrame({"need_count": [10.0, 200.0, 50.0, np.nan], "need_count_cv": [0.5, 0.1, np.nan, 0.1]}, index=list("abcd"))
    value, conf = factors.need(df)
    assert conf.tolist() == ["low", "medium", "medium", None]  # 2022 data: medium at best; CV > .30 -> low
    assert pd.isna(value["d"])


# ------------------------------------------------------------------------------------ displacement
def _wide(n=6):
    idx = [f"t{i}" for i in range(n)]
    return pd.DataFrame(
        {
            "svi_overall": [0.1, 0.5, 0.9, np.nan, 0.3, 0.7],
            "chas_burden_le50_share": [0.2, 0.6, 0.8, 0.5, np.nan, 0.9],
            "eviction_filing_rate": [np.nan] * n,
            "hcv_per_renter": [0.01, 0.05, np.nan, np.nan, np.nan, 0.2],
            "chas_burden_le50_share_cv": [0.1, 0.1, 0.5, 0.1, 0.1, 0.1],
        },
        index=idx,
    )


def test_displacement_renormalizes_over_present_parts_and_needs_two():
    df = _wide()
    value, conf, n = factors.displacement_risk(df)
    assert n.tolist() == [3, 3, 2, 1, 1, 3]
    assert value["t3"] is np.nan or pd.isna(value["t3"])     # only one part -> null
    assert pd.isna(value["t4"])
    assert value.dropna().between(0, 1).all()
    # t2 has 2 parts -> downgraded; base is medium (2022) so it becomes low
    assert conf["t2"] == "low"
    assert pd.isna(conf["t3"])
    assert conf["t0"] == "medium"                             # three clean parts, no eviction estimate: no downgrade


def _four_parts():
    return pd.DataFrame(
        {
            "svi_overall": [0.2, 0.4, 0.6, 0.8, 0.5],
            "chas_burden_le50_share": [0.3, 0.5, 0.7, 0.9, 0.6],
            "eviction_filing_rate": [2.0, 4.0, 6.0, 8.0, np.nan],
            "hcv_per_renter": [0.02, 0.04, 0.06, 0.08, 0.05],
            "chas_burden_le50_share_cv": [0.1] * 5,
            "eviction_zip_dominant": [0.79, 0.81, 1.0, 0.79, 0.5],
            "eviction_zip_n": [2, 2, 1, 1, 3],
        },
        index=list("abcde"),
    )


def test_displacement_r5_downgrades_only_when_the_eviction_estimate_is_split_across_zips():
    value, conf, n = factors.displacement_risk(_four_parts(), zip_dominant_min=0.8)
    assert n.tolist() == [4, 4, 4, 4, 3]
    assert conf["a"] == "low"       # two ZIPs, dominant 0.79 < 0.8: the apportioned estimate is split
    assert conf["b"] == "medium"    # two ZIPs, dominant 0.81 >= 0.8: one ZIP carries the tract
    assert conf["c"] == "medium"    # one ZIP
    assert conf["d"] == "medium"    # one ZIP holding any housing: not several, whatever the share reads
    assert conf["e"] == "medium"    # no eviction part at all: the ZIP split is irrelevant


def test_displacement_without_zip_shares_treats_every_eviction_estimate_as_split():
    df = _four_parts().drop(columns=["eviction_zip_dominant", "eviction_zip_n"])
    _, conf, _ = factors.displacement_risk(df)
    assert conf.tolist() == ["low", "low", "low", "low", "medium"]


# ---------------------------------------------------------------------------------------- subsidy
def _flags():
    return pd.DataFrame(
        {
            "qct": [True, False, False, False],
            "dda": [False, False, False, False],
            "oz": [False, True, False, False],
            "cdbg": [False, False, True, False],
            "xw10_dominant": [1.0, 0.5, 0.95, 1.0],
        },
        index=list("abcd"),
    )


def test_subsidy_graded_tiers_and_confidence_by_designation_age():
    value, conf = factors.subsidy_eligible(_flags(), "graded", factors.SUBSIDY_TIERS)
    assert value.tolist() == [1.0, 0.5, 0.5, 0.0]
    assert conf["a"] == "high"      # 2026 designation
    assert conf["b"] == "low"       # 2018 designation and a big boundary change
    assert conf["c"] == "medium"    # 2018 designation, stable boundary
    assert conf["d"] == "high"      # a confident zero is still a confident value


def test_subsidy_graded_is_the_default_and_tiers_are_configurable():
    value, _ = factors.subsidy_eligible(_flags())
    assert value.tolist() == [1.0, 0.5, 0.5, 0.0]
    value, _ = factors.subsidy_eligible(_flags(), "graded", {"oz_or_cdbg_only": 0.25})
    assert value.tolist() == [1.0, 0.25, 0.25, 0.0]


def test_subsidy_flag_mode_reproduces_v030():
    value, conf = factors.subsidy_eligible(_flags(), "flag")
    assert value.tolist() == [1.0, 1.0, 1.0, 0.0]
    assert conf.tolist() == ["high", "low", "medium", "high"]
    with pytest.raises(ValueError):
        factors.subsidy_eligible(_flags(), "percentile")


def test_subsidy_qct_beats_old_designations_and_unknown_flags_give_no_value():
    df = pd.DataFrame({"qct": [True, None], "dda": [False, None], "oz": [True, None], "cdbg": [True, None],
                       "xw10_dominant": [0.5, 1.0]}, index=list("ab"))
    value, conf = factors.subsidy_eligible(df)
    assert value["a"] == 1.0 and conf["a"] == "high"   # QCT wins even with a weak crosswalk
    assert pd.isna(value["b"]) and conf["b"] is None


# ---------------------------------------------------------------------------------------- transit
def _transit():
    return pd.DataFrame(
        {
            "households": [1000.0, 200.0, 400.0, 1000.0, np.nan],
            "households_cv": [0.1, 0.1, 0.1, 0.4, 0.1],
            "transit_departures": [4000.0, 1200.0, 800.0, 1000.0, 500.0],
            "transit_departures_per_acre": [40.0, 30.0, 10.0, 5.0, 1.0],
        },
        index=list("abcde"),
    )


def test_transit_per_household_floors_small_tracts_and_tags_them():
    value, conf, per_hh = factors.transit_access(_transit(), "household", 400)
    assert per_hh.tolist()[:4] == pytest.approx([4.0, 3.0, 2.0, 1.0])  # b: 1200 / max(200, 400)
    assert pd.isna(per_hh["e"])
    assert value["a"] > value["b"] > value["c"] > value["d"]
    assert conf["a"] == "high"
    assert conf["b"] == "medium"    # floored
    assert conf["c"] == "high"      # exactly at the floor: not floored
    assert conf["d"] == "medium"    # household CV above .30
    assert conf["e"] is None


def test_transit_per_acre_basis_uses_the_acre_column_and_never_downgrades():
    value, conf, per_hh = factors.transit_access(_transit(), "acre", 400)
    assert value.tolist() == pytest.approx(factors.pct(_transit()["transit_departures_per_acre"]).tolist())
    assert conf.tolist() == ["high"] * 5
    assert per_hh["b"] == pytest.approx(3.0)  # still reported
    with pytest.raises(ValueError):
        factors.transit_access(_transit(), "mile")


def test_transit_without_household_cv_column_still_works():
    df = _transit().drop(columns="households_cv")
    _, conf, _ = factors.transit_access(df)
    assert conf.tolist() == ["high", "medium", "high", "high", None]


# ----------------------------------------------------------------------------------------- flood
def test_flood_is_medium_at_best_and_low_above_the_implausible_share():
    df = pd.DataFrame({"flood_share_pct": [49.0, 51.0, 0.0, np.nan]}, index=list("abcd"))
    value, conf = factors.flood_exposure(df, "medium", 50)
    assert conf.tolist() == ["medium", "low", "medium", None]
    assert value["b"] > value["a"] > value["c"]
    _, conf_high = factors.flood_exposure(df, "high", 50)
    assert conf_high.tolist() == ["high", "medium", "high", None]  # base level is a switch
    _, conf_int = factors.flood_exposure(df, 1, 60)
    assert conf_int.tolist() == ["medium", "medium", "medium", None]


# ------------------------------------------------------------------------------------- ACS shares
def test_share_factor_downgrades_on_high_or_undefined_cv_and_keeps_nan():
    df = pd.DataFrame(
        {"age65_share": [0.2, 0.1, 0.0, np.nan, 0.3], "age65_share_cv": [0.1, 0.35, np.nan, 0.1, 0.30]},
        index=list("abcde"),
    )
    value, conf = factors.acs_share_factor(df, "age65_share", 2024)
    assert pd.isna(value["d"]) and conf["d"] is None
    assert value.dropna().between(0, 1).all()
    assert conf["a"] == "high"
    assert conf["b"] == "medium"    # CV above .30
    assert conf["c"] == "medium"    # a share of zero has no CV: its reliability cannot be shown
    assert conf["e"] == "high"      # exactly .30 is not above .30
    _, old = factors.acs_share_factor(df, "age65_share", 2020)
    assert old["b"] == "low"        # old data and a high CV: two steps down, floored at low
    with pytest.raises(KeyError):
        factors.acs_share_factor(df.drop(columns="age65_share_cv"), "age65_share", 2024)


# ---------------------------------------------------------------------------------------- market
def test_market_strength_change_term_is_clipped_and_flagged_when_2016_missing():
    df = pd.DataFrame(
        {
            "mva21_score": [1.0, 0.5, 0.0, 0.8],
            "mva16_score": [0.0, 0.5, np.nan, 0.9],
            "mva21_coverage": [1.0, 1.0, 1.0, 1.0],
            "xw10_dominant": [1.0, 1.0, 1.0, 1.0],
        },
        index=list("abcd"),
    )
    value, conf, raw = factors.market_strength(df)
    assert raw["a"] == pytest.approx(0.8 * 1.0 + 0.2 * 0.5)  # +1.0 change clipped to +0.5
    assert raw["c"] == pytest.approx(0.0)                    # missing 2016 -> change 0
    assert conf["c"] == "low" and conf["a"] == "medium"
    assert value.between(0, 1).all()


def test_market_strength_downgrades_on_coverage_and_crosswalk():
    df = pd.DataFrame(
        {
            "mva21_score": [1.0, 0.5, 0.2],
            "mva16_score": [0.9, 0.5, 0.1],
            "mva21_coverage": [0.8, 1.0, 1.0],
            "xw10_dominant": [1.0, 0.7, 1.0],
        },
        index=list("abc"),
    )
    _, conf, _ = factors.market_strength(df)
    assert conf.tolist() == ["low", "low", "medium"]  # coverage < 90% / crosswalk < .8 / clean


# --------------------------------------------------------------------------------------- compute
def _wide_full(n=6):
    idx = [f"t{i}" for i in range(n)]
    rng = np.random.default_rng(1)
    df = pd.DataFrame(
        {
            "need_count": rng.integers(10, 500, n).astype(float), "need_count_cv": [0.1] * n,
            "mva21_score": rng.random(n), "mva16_score": rng.random(n), "mva21_coverage": [1.0] * n, "xw10_dominant": [1.0] * n,
            "svi_overall": rng.random(n), "chas_burden_le50_share": rng.random(n), "chas_burden_le50_share_cv": [0.1] * n,
            "eviction_filing_rate": rng.random(n) * 10, "hcv_per_renter": rng.random(n) / 10,
            "eviction_zip_dominant": [1.0] * n, "eviction_zip_n": [1] * n,
            "qct": [True, False, False, False, False, False], "dda": [False] * n,
            "oz": [False, True, False, False, False, False], "cdbg": [False, False, True, False, False, False],
            "households": [1000.0, 300.0, 800.0, 1200.0, 600.0, 2000.0], "households_cv": [0.1] * n,
            "transit_departures": rng.integers(500, 9000, n).astype(float), "transit_departures_per_acre": rng.random(n) * 50,
            "flood_share_pct": [10.0, 60.0, 5.0, 20.0, 0.0, 30.0],
            "age65_share": rng.random(n) / 3, "age65_share_cv": [0.1, 0.5, 0.1, 0.1, 0.1, 0.1],
            "units_2_4_share": rng.random(n) / 3, "units_2_4_share_cv": [0.1] * n,
        },
        index=idx,
    )
    return df


def test_compute_builds_all_eight_factors_with_tags_and_helper_columns():
    cfg = load_scoring()
    out = factors.compute(_wide_full(), cfg)
    for f in cfg["factors"]:
        assert f["id"] in out and f"{f['id']}_conf" in out
        assert out[f["id"]].between(0, 1).all()
    assert set(out["subsidy_eligible"].unique()) <= {0.0, 0.5, 1.0}
    assert "transit_departures_per_hh" in out and "transit_departures_per_acre" in out
    assert out["transit_departures_per_hh"]["t1"] == pytest.approx(out["transit_departures"]["t1"] / 400)
    assert out["transit_access_conf"]["t1"] == "medium" and out["flood_exposure_conf"]["t1"] == "low"
    assert out["senior_demand_conf"]["t1"] == "medium" and out["senior_demand_conf"]["t0"] == "high"


def test_compute_defaults_reproduce_the_config_and_switches_change_the_method():
    cfg = load_scoring()
    base = factors.compute(_wide_full(), cfg)
    none = factors.compute(_wide_full())
    pd.testing.assert_frame_equal(base, none)
    core = {**cfg, "factor_options": {**cfg["factor_options"], "transit": {"basis": "acre"}, "subsidy": {"mode": "flag"}},
            "factors": [f for f in cfg["factors"] if f["id"] != "small_multifamily_stock"]}
    out = factors.compute(_wide_full(), core)
    assert "small_multifamily_stock" not in out
    assert set(out["subsidy_eligible"].unique()) <= {0.0, 1.0}
    assert out["transit_access"].tolist() == pytest.approx(factors.pct(out["transit_departures_per_acre"]).tolist())
