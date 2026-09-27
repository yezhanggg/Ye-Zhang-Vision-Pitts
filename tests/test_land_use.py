import pandas as pd

from visionpitts import land_use as lu
from visionpitts import place_measures as pm


def _assess(rows):
    return pd.DataFrame(rows, columns=["PARID", "CLASSDESC", "USEDESC", "LOTAREA"])


def test_classifier_edge_cases():
    assert pm.land_use_class("RESIDENTIAL", "VACANT LAND") == "vacant"
    assert pm.land_use_class("COMMERCIAL", "APART:40+ UNITS") == "residential"
    assert pm.land_use_class("GOVERNMENT", "MUNICIPAL GOVERNMENT") == "institutional"
    assert pm.land_use_class("INDUSTRIAL", "WAREHOUSE") == "industrial"
    assert pm.land_use_class(None, None) == "other"


def test_land_table_shares_counts_and_fallback():
    a = _assess([
        ["p1", "RESIDENTIAL", "SINGLE FAMILY", "3000"],
        ["p2", "COMMERCIAL", "RETAIL", "1000"],
        ["p3", "RESIDENTIAL", "VACANT LAND", "1000"],
        ["q1", "RESIDENTIAL", "SINGLE FAMILY", None],
        ["q2", "RESIDENTIAL", "VACANT LAND", None],
    ])
    pins = pd.Series({"p1": "A", "p2": "A", "p3": "A", "q1": "B", "q2": "B"})
    t = lu.land_table(a, pins)
    assert t.loc["A", "lu_residential"] == 0.6 and t.loc["A", "lu_commercial"] == 0.2 and t.loc["A", "lu_vacant"] == 0.2
    assert t.loc["A", "parcels"] == 3 and t.loc["A", "vacant_lots"] == 1
    # no lot area: shares of parcels instead
    assert t.loc["B", "lu_residential"] == 0.5 and t.loc["B", "lu_vacant"] == 0.5


def test_zoning_groups_sum_their_families():
    shares = pd.DataFrame({"zoning_R1D": [0.2], "zoning_R1A": [0.1], "zoning_RM": [0.3], "zoning_P": [0.25], "zoning_H": [0.15]}, index=["A"])
    g = lu.group_zoning(shares)
    assert round(g.loc["A", "zoned_single"], 6) == 0.3
    assert g.loc["A", "zoned_multi"] == 0.3
    assert round(g.loc["A", "zoned_parks_hillside"], 6) == 0.4
    assert g.loc["A", "zoned_industrial"] == 0.0
    assert set(g.columns) == set(lu.ZONING_IDS)


def test_every_zoning_family_is_grouped_once():
    rules = pm.load_zoning_rules()
    fams = [f for v in lu.CATALOGUE if v.group == "zoning" for f in v.families]
    assert sorted(fams) == sorted(f["id"] for f in rules["families"])


def test_merge_is_idempotent_and_keeps_acs_entries():
    cat = {"meta": {}, "groups": [{"id": "cost", "label": "Cost"}], "variables": [{"id": "med_gross_rent", "sort": 0}]}
    once = lu.merge_catalogue(cat)
    twice = lu.merge_catalogue(once)
    assert once == twice
    assert [v["id"] for v in once["variables"]][:1] == ["med_gross_rent"]
    assert len(once["variables"]) == 1 + len(lu.CATALOGUE)
    assert [g["id"] for g in once["groups"]] == ["cost", "land", "zoning"]
    values = {"A": {"pop": [10, 1, 0.1]}, "B": {"pop": [5, 1, 0.2]}}
    table = pd.DataFrame({"lu_vacant": [0.25], "vacant_lots": [3.0]}, index=["A"])
    merged = lu.merge_values(values, table)
    assert merged["A"]["pop"] == [10, 1, 0.1]
    assert merged["A"]["lu_vacant"] == [0.25, None, None] and merged["A"]["vacant_lots"] == [3, None, None]
    assert merged["B"]["lu_vacant"] == [None, None, None]
    assert lu.merge_values(merged, table) == merged


def test_long_rows_skip_missing_values():
    table = pd.DataFrame({"lu_vacant": [0.1, None], "zoned_multi": [None, 0.2]}, index=["A", "B"])
    rows = lu.long_rows("tract", table)
    assert {(r["geoid"], r["var"]) for r in rows} == {("A", "lu_vacant"), ("B", "zoned_multi")}
    assert all(r["moe"] is None and r["cv"] is None for r in rows)
