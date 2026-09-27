"""Synthetic tests for the multi-geography ACS pipeline (no network, no data files)."""
import math

import geopandas as gpd
import numpy as np
import pandas as pd
import pytest
import requests
from shapely.geometry import box

from visionpitts import acs_levels as al
from visionpitts import geo_levels as gl
from visionpitts.config import CRS_PA_SOUTH, CRS_WGS84


# ------------------------------------------------------------------------------------------- catalogue
def test_catalogue_ids_unique_and_fields_valid():
    ids = [v.id for v in al.CATALOGUE]
    assert len(ids) == 37 and len(set(ids)) == 37
    groups = {g for g, _ in al.GROUPS}
    assert len(al.GROUPS) == 8
    for v in al.CATALOGUE:
        assert v.unit in al.UNITS, v.id
        assert v.group in groups, v.id
        assert v.description and v.label
        assert v.table_id == v.num[0].split("_")[0]
        assert all(al.STEM_RE.match(s) for s in v.stems), v.id
        if v.kind == "share":
            assert v.den is not None and v.unit == "share"
        else:
            assert v.den is None
        if v.kind == "median":
            assert len(v.num) == 1 and v.unit in ("usd", "age", "years")
        if v.kind == "sum":
            assert v.unit == "count"


def test_raw_vars_and_batches_stay_within_the_api_limit():
    stems = al.raw_vars()
    assert len(stems) == 85 and stems == sorted(set(stems))
    bs = al.batches(stems)
    assert [s for b in bs for s in b] == stems
    assert all(len(b) <= 24 and 2 * len(b) <= 50 for b in bs)
    assert len(bs) == 4
    with pytest.raises(ValueError):
        al.batches(stems, per_call=26)


def test_catalogue_json_shape():
    cat = al.catalogue_json({"tract": {"bundled": 128, "total": 394}, "city": {"bundled": 1, "total": 1}})
    assert set(cat) == {"meta", "groups", "variables"}
    assert cat["meta"]["acs_year"] == 2024 and cat["meta"]["moe_level"] == 90
    assert cat["meta"]["reliability"] == {"high": 0.15, "medium": 0.30}
    assert list(cat["meta"]["levels"]) == ["tract", "city"]
    assert len(cat["variables"]) == 37 and cat["variables"][0]["sort"] == 0 and cat["variables"][-1]["sort"] == 36
    v = {x["id"]: x for x in cat["variables"]}["under18_share"]
    assert v["kind"] == "share" and v["den"] == "B01001_001" and len(v["num"]) == 8 and v["table_id"] == "B01001"
    md = al.catalogue_markdown({"tract": {"bundled": 128, "total": 394}})
    assert "| `rent_burden30_share` |" in md and "37 variables from 85 ACS stems" in md


# ------------------------------------------------------------------------------------------- API plumbing
def test_geo_clause_per_level():
    assert al.geo_clause("tract") == {"for": "tract:*", "in": "state:42 county:003"}
    assert al.geo_clause("bg") == {"for": "block group:*", "in": "state:42 county:003 tract:*"}
    assert al.geo_clause("muni") == {"for": "county subdivision:*", "in": "state:42 county:003"}
    assert al.geo_clause("county") == {"for": "county:003", "in": "state:42"}
    assert al.geo_clause("city") == {"for": "place:61000", "in": "state:42"}
    z = al.geo_clause("zcta", ["15201", "15203"])
    assert z == {"for": "zip code tabulation area:15201,15203"} and "in" not in z
    with pytest.raises(ValueError):
        al.geo_clause("zcta")
    with pytest.raises(ValueError):
        al.geo_clause("blocks")


def test_rows_to_frame_builds_geoids_of_the_right_width():
    cases = {
        "tract": (["B01003_001E", "B01003_001M", "state", "county", "tract"], ["10", "5", "42", "003", "562300"], "42003562300"),
        "bg": (["B01003_001E", "B01003_001M", "state", "county", "tract", "block group"], ["10", "5", "42", "003", "562300", "1"],
               "420035623001"),
        "zcta": (["B01003_001E", "B01003_001M", "zip code tabulation area"], ["10", "5", "15207"], "15207"),
        "muni": (["B01003_001E", "B01003_001M", "state", "county", "county subdivision"], ["10", "5", "42", "003", "66576"],
                 "4200366576"),
        "county": (["B01003_001E", "B01003_001M", "state", "county"], ["10", "5", "42", "003"], "42003"),
        "city": (["B01003_001E", "B01003_001M", "state", "place"], ["10", "5", "42", "61000"], "4261000"),
    }
    for level, (header, row, geoid) in cases.items():
        df = al.rows_to_frame([header, row], level)
        assert list(df.index) == [geoid] and len(geoid) == al.GEOID_LEN[level]
        assert list(df.columns) == ["B01003_001E", "B01003_001M"]
    assert al.rows_to_frame([], "tract").empty
    with pytest.raises(ValueError):
        al.rows_to_frame([["B01003_001E", "state", "county", "tract"], ["1", "42", "3", "562300"]], "tract")


class _Resp:
    def __init__(self, status, payload=None, text=""):
        self.status_code = status
        self._payload = payload
        self.text = text
        self.content = b"" if payload is None and not text else b"x"

    def json(self):
        return self._payload


class _Session:
    def __init__(self, responses):
        self.responses = list(responses)
        self.calls = []

    def get(self, url, params=None, timeout=None):
        self.calls.append(params)
        r = self.responses.pop(0)
        if isinstance(r, Exception):
            raise r
        return r


def test_request_rows_handles_204_400_and_retries(monkeypatch):
    monkeypatch.setattr(al.time, "sleep", lambda s: None)
    assert al.request_rows(_Session([_Resp(204)]), {"get": "x"}) == []
    with pytest.raises(RuntimeError, match="unknown variable"):
        al.request_rows(_Session([_Resp(400, text="error: unknown variable 'B99999_001E'")]), {"get": "B99999_001E"})
    rows = [["B01003_001E", "state"], ["1", "42"]]
    s = _Session([_Resp(500, text="boom"), requests.ConnectionError("x"), _Resp(429), _Resp(200, rows)])
    assert al.request_rows(s, {"get": "x"}, tries=4) == rows and len(s.calls) == 4
    with pytest.raises(RuntimeError, match="gave up"):
        al.request_rows(_Session([_Resp(503)] * 2), {"get": "x"}, tries=2)


# ------------------------------------------------------------------------------------------- math
def test_clean_raw_applies_sentinels():
    raw = pd.DataFrame({"AE": ["10", "-666666666", "0"], "AM": ["-555555555", "-333333333", "4"]}, index=["a", "b", "c"])
    c = al.clean_raw(raw)
    assert c["AE"].tolist()[0] == 10 and math.isnan(c["AE"].iloc[1]) and c["AE"].iloc[2] == 0
    assert c["AM"].iloc[0] == 0 and math.isnan(c["AM"].iloc[1]) and c["AM"].iloc[2] == 4


def test_moe_sum_is_root_sum_square_and_strict_on_missing():
    m = pd.DataFrame({"a": [3.0, 3.0], "b": [4.0, np.nan]})
    out = al.moe_sum(m)
    assert out.iloc[0] == pytest.approx(5.0) and math.isnan(out.iloc[1])


def test_share_with_moe_proportion_then_ratio_fallback_and_zero_denominator():
    num = pd.Series([140.0, 220.0, 5.0])
    num_moe = pd.Series([20.0, math.sqrt(200), 2.0])
    den = pd.Series([500.0, 1000.0, 0.0])
    den_moe = pd.Series([40.0, 100.0, 3.0])
    p, moe = al.share_with_moe(num, num_moe, den, den_moe)
    assert p.iloc[0] == pytest.approx(0.28)
    assert moe.iloc[0] == pytest.approx(math.sqrt(400 - 0.28**2 * 1600) / 500)       # proportion formula
    assert moe.iloc[1] == pytest.approx(math.sqrt(200 + 0.22**2 * 10000) / 1000)     # ratio fallback
    assert math.isnan(p.iloc[2]) and math.isnan(moe.iloc[2])
    p2, _ = al.share_with_moe(pd.Series([12.0]), pd.Series([1.0]), pd.Series([10.0]), pd.Series([1.0]))
    assert p2.iloc[0] == 1.0


def test_cv_and_reliability_thresholds():
    c = al.cv(pd.Series([1000.0, 0.0, np.nan, 50.0]), pd.Series([100.0, 10.0, 10.0, np.nan]))
    assert c.iloc[0] == pytest.approx(100 / 1.645 / 1000)
    assert c.iloc[1:].isna().all()
    assert al.reliability(0.149) == "high"
    assert al.reliability(0.15) == "medium"
    assert al.reliability(0.30) == "medium"
    assert al.reliability(0.301) == "low"
    assert al.reliability(float("nan")) is None and al.reliability(None) is None
    s = al.reliability_series(pd.Series([0.1, 0.2, 0.5, np.nan]))
    assert s.tolist() == ["high", "medium", "low", "n/a"]


def _raw_two_geoids() -> pd.DataFrame:
    cols = [f"{s}{x}" for s in al.raw_vars() for x in ("E", "M")]
    raw = pd.DataFrame(np.nan, index=pd.Index(["A", "B"], name="GEOID"), columns=cols)
    raw.loc["A", ["B01003_001E", "B01003_001M"]] = [1000, 100]
    raw.loc["B", ["B01003_001E", "B01003_001M"]] = [2000, 0]
    raw.loc["A", ["B01001_001E", "B01001_001M"]] = [1000, 100]
    raw.loc["B", ["B01001_001E", "B01001_001M"]] = [2000, 20]
    under = [f"B01001_{i:03d}" for i in (3, 4, 5, 6, 27, 28, 29, 30)]
    for s, e in zip(under, [10, 20, 30, 40, 15, 25, 35, 45], strict=True):
        raw.loc["A", [f"{s}E", f"{s}M"]] = [e, 5]
        raw.loc["B", [f"{s}E", f"{s}M"]] = [50, 3]
    raw.loc["A", ["B25070_001E", "B25070_001M"]] = [500, 40]
    for s, e in zip([f"B25070_{i:03d}" for i in (7, 8, 9, 10)], [50, 40, 30, 20], strict=True):
        raw.loc["A", [f"{s}E", f"{s}M"]] = [e, 10]
    raw.loc["A", ["B19013_001E", "B19013_001M"]] = [45678.4, 2345.6]
    raw.loc["A", ["B01002_001E", "B01002_001M"]] = [34.56, 1.23]
    return raw


def test_derive_matches_hand_computed_values():
    d = al.derive(_raw_two_geoids())
    assert d.loc["A", "pop"] == 1000 and d.loc["A", "pop_moe"] == 100
    assert d.loc["A", "pop_cv"] == pytest.approx(100 / 1.645 / 1000)
    assert d.loc["B", "pop_cv"] == 0                              # MOE 0 (controlled) -> cv 0, not null
    assert d.loc["A", "under18_share"] == pytest.approx(0.22)
    assert d.loc["A", "under18_share_moe"] == pytest.approx(math.sqrt(200 + 0.22**2 * 10000) / 1000)   # fallback
    assert d.loc["B", "under18_share"] == pytest.approx(0.2)
    assert d.loc["B", "under18_share_moe"] == pytest.approx(math.sqrt(72 - 0.2**2 * 400) / 2000)     # proportion
    assert d.loc["A", "rent_burden30_share"] == pytest.approx(0.28)
    assert d.loc["A", "rent_burden30_share_moe"] == pytest.approx(math.sqrt(400 - 0.28**2 * 1600) / 500)
    assert math.isnan(d.loc["B", "rent_burden30_share"])
    assert math.isnan(d.loc["A", "med_gross_rent"]) and math.isnan(d.loc["A", "med_gross_rent_cv"])
    assert d.loc["A", "med_hh_income"] == 45678.4
    assert set(d.columns) == {f"{v.id}{s}" for v in al.CATALOGUE for s in ("", "_moe", "_cv")}


def test_round_values_and_values_json_shape():
    r = al.round_values(al.derive(_raw_two_geoids()))
    assert str(r["pop"].dtype) == "Int64" and str(r["med_hh_income"].dtype) == "Int64"
    assert r.loc["A", "med_hh_income"] == 45678 and r.loc["A", "med_hh_income_moe"] == 2346
    assert r.loc["A", "median_age"] == 34.6 and r.loc["A", "under18_share_moe"] == 0.0262
    out = al.to_values_json(r, geoids=["B", "A"])
    assert list(out) == ["B", "A"]
    assert out["A"]["pop"] == [1000, 100, 0.061]
    assert out["B"]["pop"] == [2000, 0, 0.0]
    assert out["A"]["under18_share"] == [0.22, 0.0262, 0.072]
    assert out["A"]["med_gross_rent"] == [None, None, None]
    assert set(out["A"]) == {v.id for v in al.CATALOGUE}
    assert all(isinstance(out["A"]["pop"][0], int) for _ in [0])
    long = al.to_long(r, "tract")
    assert len(long) == 2 * 37 and list(long.columns) == ["level", "geoid", "var", "est", "moe", "cv"]
    row = long[(long["geoid"] == "A") & (long["var"] == "pop")].iloc[0]
    assert row["level"] == "tract" and row["est"] == 1000 and row["cv"] == 0.061
    assert long[(long["geoid"] == "A") & (long["var"] == "med_gross_rent")]["est"].isna().all()


# ------------------------------------------------------------------------------------------- geometry
def test_block_group_only_tables_are_never_used():
    """B17001 and B08201 are published for tracts and above only; the catalogue must use C17002 / B25044 instead."""
    tables = {v.table_id for v in al.CATALOGUE}
    assert "B17001" not in tables and "B08201" not in tables
    assert al.VAR_BY_ID["no_vehicle_share"].stems == ("B25044_003", "B25044_010", "B25044_001")
    assert al.VAR_BY_ID["poverty_share"].den == "C17002_001"


def test_names():
    assert gl.bg_name("140201", "2") == "Tract 1402.01 · BG 2"
    assert gl.tract_name("020100") == "Tract 201"
    assert gl.tract_name("010301") == "Tract 103.01"


def _square(x0, y0, size):
    return box(x0, y0, x0 + size, y0 + size)


def test_zcta_city_share_threshold_on_synthetic_squares():
    city = gpd.GeoDataFrame({"GEOID": ["c"]}, geometry=[_square(0, 0, 100)], crs=CRS_PA_SOUTH)
    z = gpd.GeoDataFrame(
        {"GEOID": ["in", "half", "sliver", "out"]},
        geometry=[_square(10, 10, 20), _square(90, 0, 20), _square(99.9, 0, 20), _square(500, 500, 20)],
        crs=CRS_PA_SOUTH,
    )
    share = gl.zcta_city_share(z, city)
    assert share.name == "pgh_share"
    assert share.tolist() == pytest.approx([1.0, 0.5, 0.005, 0.0])
    keep = z[share >= gl.ZCTA_CITY_MIN]["GEOID"].tolist()
    assert keep == ["in", "half"]
    assert gl.ZCTA_CITY_MIN == 0.01 and gl.BG_CITY_MIN == 0.5


def test_to_fc_rounds_coordinates_and_keeps_props():
    g = gpd.GeoDataFrame(
        {"GEOID": ["420035623001"], "name": ["Tract 5623 · BG 1"], "tract": ["42003562300"], "pgh_share": [np.float64(0.98765)]},
        geometry=[box(-79.9412345678, 40.4098765432, -79.9312345678, 40.4198765432)],
        crs=CRS_WGS84,
    )
    fc = gl.to_fc(g, ["GEOID", "name", "tract", "pgh_share"], tolerance_m=5.0)
    assert fc["type"] == "FeatureCollection" and len(fc["features"]) == 1
    f = fc["features"][0]
    assert f["properties"] == {"GEOID": "420035623001", "name": "Tract 5623 · BG 1", "tract": "42003562300", "pgh_share": 0.98765}
    assert isinstance(f["properties"]["pgh_share"], float)
    assert f["geometry"]["type"] == "Polygon"
    ring = f["geometry"]["coordinates"][0]
    for x, y in ring:
        assert round(x, 5) == x and round(y, 5) == y
        assert -79.95 < x < -79.92 and 40.40 < y < 40.43
    fc4 = gl.to_fc(g, ["GEOID"], tolerance_m=5.0, nd=4)
    assert all(round(x, 4) == x for x, _ in fc4["features"][0]["geometry"]["coordinates"][0])
    assert fc4["features"][0]["properties"] == {"GEOID": "420035623001"}


@pytest.mark.skipif(not gl.COUSUB_ZIP.exists(), reason="county subdivision file is a local raw download")
def test_municipalities_are_the_129_units_other_than_pittsburgh():
    m = gl.munis()
    assert len(m) == gl.EXPECTED["county"]["muni"] == 129
    assert gl.PITTSBURGH_MUNI_GEOID not in set(m["GEOID"])
    assert m["GEOID"].str.len().eq(10).all() and m["GEOID"].is_monotonic_increasing
    assert set(m["kind"]) <= {"borough", "township", "city", "municipality"}
    assert "Mount Oliver borough" in set(m["name"])  # the enclave inside the city stays a municipality
    assert (m["pgh_share"] <= 0.05).all()  # nothing outside Pittsburgh overlaps the city polygon materially
