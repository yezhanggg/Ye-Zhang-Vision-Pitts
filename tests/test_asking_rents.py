import numpy as np
import pandas as pd
import pytest

from visionpitts import asking_rents as ar


def _rows(specs):
    """specs: (ID, PROPERTY_ID, UNIT_ID, rent, beds, scraped 'YYYY-MM-DD', geoid). Lat/lon are fixed per property."""
    rows = []
    for i, (lid, pid, uid, rent, beds, ts, geoid) in enumerate(specs):
        lat = 40.4 + (0 if pd.isna(pid) else pid) * 1e-4
        rows.append({"ID": lid, "PROPERTY_ID": pid, "UNIT_ID": uid, "LATITUDE": lat, "LONGITUDE": -79.9,
                     "RENT_PRICE": float(rent), "BEDS": float(beds), "DATE_POSTED": pd.Timestamp(ts, tz="UTC"),
                     "SCRAPED_TIMESTAMP": pd.Timestamp(ts, tz="UTC"), "GEOID": geoid})
    df = pd.DataFrame(rows)
    df["PROPERTY_ID"] = df["PROPERTY_ID"].astype(float)
    df["UNIT_ID"] = df["UNIT_ID"].astype(float)
    return df


def _prep(df):
    d = ar.clean(df)
    d["ukey"], d["pkey"], d["keytype"] = ar.keys(d)
    d["site"] = ar.site_key(d)
    um = ar.unit_months(d)
    um["existing"] = ar.existing_stock(um)
    um["ratio"] = ar.mix_ratio(um)
    return um


def test_clean_filters_rent_and_beds_and_derives_month():
    df = _rows([(1, 1, 1, 250, 2, "2025-03-04", "T"), (2, 1, 2, 1200, 2, "2025-03-04", "T"),
                (3, 1, 3, 1200, 6, "2025-03-04", "T"), (4, 1, 4, 12000, 1, "2025-03-04", "T")])
    d = ar.clean(df)
    assert d["ID"].tolist() == [2]
    assert str(d["month"].iloc[0]) == "2025-03" and d["BEDS"].dtype.kind == "i"


def test_unit_months_collapse_repeat_scrapes_to_one_row_with_the_median_rent():
    df = _rows([(1, 1, 7, 1000, 2, "2025-03-01", "T"), (2, 1, 7, 1100, 2, "2025-03-15", "T"), (3, 1, 7, 1300, 2, "2025-03-30", "T"),
                (4, 1, 7, 1400, 2, "2025-04-02", "T")])
    um = _prep(df)
    assert len(um) == 2
    march = um[um["month"] == pd.Period("2025-03")].iloc[0]
    assert march["rent"] == 1100 and march["ukey"] == "u7" and march["pkey"] == "p1"


def test_keys_fall_back_to_property_then_location_when_ids_are_missing():
    df = _rows([(1, 5, np.nan, 900, 1, "2018-05-01", "T"), (2, 5, np.nan, 900, 1, "2018-05-20", "T"),
                (3, 5, np.nan, 1500, 3, "2018-05-20", "T"), (4, np.nan, np.nan, 700, 0, "2018-05-20", "T")])
    d = ar.clean(df)
    ukey, pkey, keytype = ar.keys(d)
    assert ukey.iloc[0] == ukey.iloc[1] == "p5_1_900"   # same property, beds and rent: one unit
    assert ukey.iloc[2] == "p5_3_1500"                   # a different unit in the same building
    assert pkey.iloc[3].startswith("ll") and ukey.iloc[3].startswith("ll")
    assert set(keytype) == {"fallback"}


def test_recover_ids_fills_from_mapping_and_reports_share_by_year():
    df = ar.clean(_rows([(10, np.nan, np.nan, 900, 1, "2019-05-01", "T"), (11, np.nan, np.nan, 900, 1, "2019-06-01", "T"),
                         (12, 3, 33, 900, 1, "2024-06-01", "T")]))
    mapping = pd.DataFrame({"ID": [10], "PROPERTY_ID_MAP": [2], "UNIT_ID_MAP": [22]})
    out, rec = ar.recover_ids(df, mapping)
    assert out["UNIT_ID"].tolist() == [22, np.nan, 33] or (out["UNIT_ID"].iloc[0] == 22 and pd.isna(out["UNIT_ID"].iloc[1]))
    assert out["PROPERTY_ID"].iloc[0] == 2
    assert rec.loc[2019, "rows_lacking"] == 2 and rec.loc[2019, "share"] == pytest.approx(0.5)


def test_existing_stock_is_first_listing_of_the_property_before_2019():
    df = _rows([(1, 1, 1, 800, 2, "2016-01-01", "T"), (2, 1, 1, 1000, 2, "2025-01-01", "T"), (3, 1, 2, 1000, 2, "2025-01-01", "T"),
                (4, 2, 3, 2000, 2, "2019-01-01", "T"), (5, 2, 3, 2500, 2, "2025-01-01", "T")])
    um = _prep(df)
    assert um.set_index("ukey")["existing"].groupby(level=0).first().to_dict() == {"u1": True, "u2": True, "u3": False}


def test_existing_stock_survives_a_property_id_change_at_the_same_site():
    # property 1 listed in 2016; in 2025 the same building carries a new PROPERTY_ID (9) but the same geocode
    df = _rows([(1, 1, 1, 800, 2, "2016-01-01", "T"), (2, 9, 91, 1200, 2, "2025-01-01", "T"), (3, 7, 71, 2500, 2, "2025-01-01", "T")])
    df.loc[1, "LATITUDE"] = df.loc[0, "LATITUDE"]  # same site as property 1
    um = _prep(df)
    e = um.set_index("ukey")["existing"]
    assert bool(e["u91"]) is True and bool(e["u71"]) is False


def _tract(specs_per_unit):
    """Build listings where each spec is (property, unit, rent, beds, year, geoid, months). One scrape per month."""
    specs, lid = [], 0
    for pid, uid, rent, beds, year, geoid, months in specs_per_unit:
        for m in months:
            lid += 1
            specs.append((lid, pid, uid, rent, beds, f"{year}-{m:02d}-10", geoid))
    return _rows(specs)


def test_cells_are_suppressed_on_distinct_units_not_unit_months():
    # tract A: 5 units listed in 3 months each = 15 unit-months but only 5 units -> suppressed
    # tract B: 12 units listed once each -> shown
    a = [(100 + i, 100 + i, 1000 + 10 * i, 2, 2025, "A", [1, 2, 3]) for i in range(5)]
    b = [(200 + i, 200 + i, 1000 + 10 * i, 2, 2025, "B", [1]) for i in range(12)]
    um = _prep(_tract(a + b))
    tab = ar.tract_table(um, ["A", "B"])
    assert tab.loc["A", "n_months_2br_2025"] == 15 and tab.loc["A", "n_units_2br_2025"] == 5
    assert pd.isna(tab.loc["A", "rent_2br_2025"])
    assert tab.loc["B", "n_units_2br_2025"] == 12 and tab.loc["B", "rent_2br_2025"] == pytest.approx(1055)
    # the pooled headline needs 20 distinct units, so B (12) is still hidden and tagged low
    assert pd.isna(tab.loc["B", "rent_2br_2025_26"]) and tab.loc["B", "asking_rents_conf"] == "low"


def test_existing_stock_growth_ignores_new_buildings_and_all_listings_growth_does_not():
    # 25 units in one old building (listed in 2016): $1,000 in 2019 -> $1,200 in 2025 (+20%)
    old = [(1, 1000 + i, 1000, 2, 2016, "T", [6]) for i in range(25)]
    old += [(1, 1000 + i, 1000, 2, 2019, "T", [6]) for i in range(25)]
    old += [(1, 1000 + i, 1200, 2, 2025, "T", [6]) for i in range(25)]
    # 30 units in a new building first listed in 2024 at $2,500
    new = [(2, 2000 + i, 2500, 2, 2024, "T", [6]) for i in range(30)]
    new += [(2, 2000 + i, 2500, 2, 2025, "T", [6]) for i in range(30)]
    um = _prep(_tract(old + new))
    tab = ar.tract_table(um, ["T"])
    assert tab.loc["T", "rent_2br_growth_existing"] == pytest.approx(0.20)
    assert tab.loc["T", "n_units_existing_2019_20"] == 25 and tab.loc["T", "n_units_existing_2025_26"] == 25
    assert tab.loc["T", "rent_2br_growth_all"] == pytest.approx(2500 / 1000 - 1)  # the new building's median dominates
    assert tab.loc["T", "n_units_2025_26"] == 55 and tab.loc["T", "rent_2br_2025_26"] == 2500
    assert tab.loc["T", "asking_rents_conf"] == "high" and bool(tab.loc["T", "rent_2br_gt_fmr"]) is True


def test_growth_needs_twenty_existing_units_in_both_windows():
    early = [(1, 1000 + i, 1000, 2, 2016, "T", [6]) for i in range(19)] + [(1, 1000 + i, 1000, 2, 2019, "T", [6]) for i in range(19)]
    late = [(1, 1000 + i, 1300, 2, 2025, "T", [6]) for i in range(40)]
    tab = ar.tract_table(_prep(_tract(early + late)), ["T"])
    assert pd.isna(tab.loc["T", "rent_2br_growth_existing"]) and pd.isna(tab.loc["T", "rent_2br_growth_all"])
    assert tab.loc["T", "rent_2br_2025_26"] == 1300 and tab.loc["T", "asking_rents_conf"] == "medium"


def test_confidence_thresholds_and_fmr_flag():
    conf = ar.confidence(pd.Series([0, 19, 20, 49, 50, np.nan]))
    assert conf.tolist() == ["low", "low", "medium", "medium", "high", "low"]
    units = [(1, 1000 + i, 1290 if i < 15 else 1310, 2, 2025, "T", [6]) for i in range(30)]
    tab = ar.tract_table(_prep(_tract(units)), ["T", "EMPTY"])
    assert tab.loc["T", "rent_2br_2025_26"] == pytest.approx(1300) and bool(tab.loc["T", "rent_2br_gt_fmr"]) is True
    assert pd.isna(tab.loc["EMPTY", "rent_2br_gt_fmr"]) and tab.loc["EMPTY", "n_units_2025_26"] == 0


def test_mix_ratio_is_one_at_the_county_median_for_that_bedroom_count_and_year():
    units = [(1, 1, 800, 1, 2025, "A", [1]), (1, 2, 1000, 1, 2025, "A", [1]), (1, 3, 1200, 1, 2025, "B", [1]),
             (2, 4, 2000, 3, 2025, "B", [1]), (2, 5, 3000, 3, 2025, "B", [1])]
    um = _prep(_tract(units))
    r = um.set_index("ukey")["ratio"]
    assert r["u2"] == pytest.approx(1.0) and r["u1"] == pytest.approx(0.8)
    assert r["u4"] == pytest.approx(2000 / 2500)


def test_trend_reports_county_and_city_medians_with_distinct_units():
    units = [(1, 1000 + i, 1000, 2, 2025, "CITY", [1, 2]) for i in range(3)] + [(2, 2000 + i, 500, 2, 2025, "SUB", [1, 2]) for i in range(3)]
    um = _prep(_tract(units))
    ctx = ar.trend(um, ["CITY"])
    assert ctx["city"]["2025"] == {"median_2br": 1000.0, "n_units": 3, "n_unit_months": 6}
    # medians are over unit-months (one observation per unit per month), distinct units are reported beside them
    assert ctx["county"]["2025"]["n_units"] == 6 and ctx["county"]["2025"]["n_unit_months"] == 12
    assert ctx["county"]["2025"]["median_2br"] == pytest.approx(750)
    assert ctx["growth"]["city"]["existing"]["growth"] is None  # nothing listed before 2019
