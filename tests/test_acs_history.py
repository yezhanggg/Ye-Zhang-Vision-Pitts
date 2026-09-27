import numpy as np
import pandas as pd
import pytest

from visionpitts import acs_history as ah


def _xw():
    # 2010 tract A splits 60/40 into 2020 tracts X and Y; 2010 tract B goes wholly into Y (blocks carry housing units)
    return pd.DataFrame({
        "block20": ["b1", "b2", "b3", "b4"],
        "tract10": ["A", "A", "B", "B"],
        "tract20": ["X", "Y", "Y", "Y"],
        "hu": [60, 40, 50, 50],
    })


def test_crosswalk_weights_rows_and_columns_sum_to_one():
    wc, wm = ah.crosswalk_weights(_xw())
    assert wc.loc["A", "X"] == pytest.approx(0.6) and wc.loc["A", "Y"] == pytest.approx(0.4)
    assert wc.sum(axis=1).round(9).eq(1).all()
    assert wm.sum(axis=0).round(9).eq(1).all()
    assert wm.loc["A", "Y"] == pytest.approx(40 / 140) and wm.loc["B", "Y"] == pytest.approx(100 / 140)


def test_carry_counts_conserves_totals_and_combines_moes_in_quadrature():
    wc, _ = ah.crosswalk_weights(_xw())
    est = pd.DataFrame({"pop": [1000.0, 500.0]}, index=["A", "B"])
    moe = pd.DataFrame({"pop": [100.0, 50.0]}, index=["A", "B"])
    e, m = ah.carry_counts(est, moe, wc)
    assert e.loc["X", "pop"] == pytest.approx(600) and e.loc["Y", "pop"] == pytest.approx(900)
    assert e["pop"].sum() == pytest.approx(1500)
    assert m.loc["Y", "pop"] == pytest.approx(np.sqrt((0.4 * 100) ** 2 + 50**2))
    # a missing 2010 value blanks every 2020 tract it feeds
    est.loc["B", "pop"] = np.nan
    e2, _ = ah.carry_counts(est, moe, wc)
    assert e2.loc["X", "pop"] == pytest.approx(600) and pd.isna(e2.loc["Y", "pop"])


def test_carry_means_is_a_housing_unit_weighted_mean_over_tracts_with_values():
    _, wm = ah.crosswalk_weights(_xw())
    est = pd.DataFrame({"inc": [40000.0, 80000.0]}, index=["A", "B"])
    moe = pd.DataFrame({"inc": [4000.0, 8000.0]}, index=["A", "B"])
    e, _ = ah.carry_means(est, moe, wm)
    assert e.loc["X", "inc"] == pytest.approx(40000)
    assert e.loc["Y", "inc"] == pytest.approx((40 * 40000 + 100 * 80000) / 140)
    est.loc["B", "inc"] = np.nan  # then Y is only A's value, renormalised
    e2, _ = ah.carry_means(est, moe, wm)
    assert e2.loc["Y", "inc"] == pytest.approx(40000)


def test_geo_clause_asks_pre_2020_zctas_by_state_and_keeps_the_rest():
    assert ah.geo_clause("zcta", 2016) == {"for": "zip code tabulation area:*", "in": "state:42"}
    assert ah.geo_clause("zcta", 2021, ["15207"]) == {"for": "zip code tabulation area:15207"}
    assert ah.geo_clause("muni", 2014) == {"for": "county subdivision:*", "in": "state:42 county:003"}


def test_bundle_shape_keeps_moe_only_for_band_variables():
    years = [2023, 2024]
    rows = []
    for y, inc, rent in ((2023, 50000, 900), (2024, 52000, 950)):
        rows.append({"GEOID": "T1", "year": y, "med_hh_income": inc, "med_hh_income_moe": 1000, "pop": 100 + y,
                     "pop_moe": 10, "xw_dominant": 0.95 if y == 2023 else np.nan})
    wide = pd.DataFrame(rows).set_index("GEOID")
    b = ah.bundle({"tract": wide}, {"tract": ["T1"]}, years)
    rec = b["levels"]["tract"]["T1"]
    assert rec["med_hh_income"] == [[50000, 52000], [1000, 1000]]
    assert rec["pop"] == [[2123, 2124], None]
    assert rec["renter_share"] == [[None, None], [None, None]]  # absent band variable stays null, never imputed
    assert rec["pop"][1] is None  # no band for the other variables
    assert b["xw_dominant"] == {"T1": 0.95} and b["meta"]["years"] == years
