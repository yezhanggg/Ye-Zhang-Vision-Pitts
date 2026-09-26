import numpy as np
import pandas as pd
import pytest

from visionpitts import factors


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


def test_subsidy_flag_any_and_confidence_by_designation_age():
    df = pd.DataFrame(
        {
            "qct": [True, False, False, False],
            "dda": [False, False, False, False],
            "oz": [False, True, False, False],
            "cdbg": [False, False, True, False],
            "xw10_dominant": [1.0, 0.5, 0.95, 1.0],
        },
        index=list("abcd"),
    )
    value, conf = factors.subsidy_eligible(df)
    assert value.tolist() == [1.0, 1.0, 1.0, 0.0]
    assert conf["a"] == "high"      # 2026 designation
    assert conf["b"] == "low"       # 2018 designation and a big boundary change
    assert conf["c"] == "medium"    # 2018 designation, stable boundary
    assert conf["d"] == "high"      # a confident zero is still a confident value


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
