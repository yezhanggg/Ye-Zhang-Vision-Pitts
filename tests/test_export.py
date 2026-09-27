import json
import math

import numpy as np
import pandas as pd

from visionpitts import export, factors
from visionpitts.config import load_scoring

CFG = load_scoring()
FIDS = [f["id"] for f in CFG["factors"]]


def test_clean_handles_nan_inf_and_numpy_types():
    assert export.clean(None) is None
    assert export.clean(float("nan")) is None
    assert export.clean(np.nan) is None
    assert export.clean(float("inf")) is None and export.clean(-np.inf) is None
    assert export.clean(np.float64(0.123456)) == 0.1235
    assert export.clean(np.float32(2.5), 0) == 2.0
    assert export.clean(np.int64(7)) == 7 and isinstance(export.clean(np.int64(7)), int)
    assert export.clean(np.bool_(True)) is True and export.clean(False) is False
    assert export.clean("15207") == "15207"
    assert export.clean(pd.NA) is None
    assert export.clean(pd.NaT) is None
    assert json.dumps({k: export.clean(v) for k, v in {"a": np.nan, "b": np.int64(1), "c": np.bool_(False)}.items()})


def _frame(n: int = 6) -> pd.DataFrame:
    rng = np.random.default_rng(7)
    idx = [f"4200300{i:04d}" for i in range(n)]
    df = pd.DataFrame(index=idx)
    df["name"] = [f"Tract {i}" for i in range(n)]
    df["neighborhood"] = ["Hazelwood", "Garfield", None, "Bluff", "Beechview", "Shadyside"]
    df["residential"] = [True, True, True, True, True, False]
    df["pgh_share"] = 1.0
    for f in FIDS:
        df[f] = rng.random(n)
        df[f"{f}_conf"] = ["high", "medium", "low", "high", "medium", None]
    df.loc[idx[-1], FIDS] = np.nan                        # the park has no factor values
    df.loc[idx[2], "market_strength"] = np.nan            # one ranked tract without a market value
    df["subsidy_eligible"] = [1.0, 0.5, 0.0, 1.0, 0.5, np.nan]
    for c in export.RAW_FIELDS:
        if c not in df:
            df[c] = rng.random(n)
    df["hcv_count"] = [12.0, np.nan, 30.0, np.nan, 40.0, np.nan]
    df["flood_share_pct"] = [10.0, 55.0, 5.0, 70.0, 0.0, 80.0]
    df["mva21"] = ["A", "B", None, "C", "D", None]
    df["mva16"] = ["A", "B", None, "C", "D", None]
    df["qct"] = [True, False, False, True, False, False]
    df["zcta"] = ["15207", "15224", None, "15219", "15216", "15232"]
    df["eviction_zips"] = ["15207", "15224,15206", None, "15219", "15216", None]
    df["eviction_zip_n"] = [1, 2, 0, 1, 1, 0]
    df["displacement_n"] = [4, 3, 2, 4, 4, np.nan]
    for c in export.PRESSURE:
        df[c] = 0.0
    df["watch_list"] = [True, False, False, False, False, False]
    df["need_tercile"] = ["H", "L", "M", "H", "M", None]
    for c in export.CONTEXT:
        df[c] = rng.random(n) * 1000
    df["households"] = [1200.0, 900.0, 300.0, 1500.0, 700.0, 10.0]
    return df


def test_properties_carry_every_factor_tag_and_raw_field_and_are_json_clean():
    df = _frame()
    props = export.properties(df, CFG, {df.index[0]: "Hazelwood"})
    assert set(props) == set(df.index)
    p = props[df.index[0]]
    assert p["GEOID"] == df.index[0] and p["focus"] == "Hazelwood" and props[df.index[1]]["focus"] is None
    for f in FIDS:
        assert f in p and f"{f}_conf" in p
    for c in export.RAW_FIELDS:
        assert c in p, c
    for c in ("transit_departures_per_hh", "transit_departures_per_acre", "age65_share", "age65_share_cv", "units_2_4_share",
              "units_2_4_share_cv", "eviction_zip_dominant", "eviction_zip_n"):
        assert c in p
    park = props[df.index[-1]]
    assert park["need"] is None and park["need_conf"] is None and park["residential"] is False
    assert props[df.index[2]]["market_strength"] is None
    text = json.dumps(props, allow_nan=False)  # no NaN or Infinity anywhere
    assert "NaN" not in text
    assert p["eviction_zip_n"] == 1 and p["subsidy_eligible"] == 1.0


def test_properties_skip_columns_the_frame_does_not_have():
    df = _frame().drop(columns=["age65_share", "rent_2br_2025_26"], errors="ignore")
    p = export.properties(df, CFG, {})[df.index[0]]
    assert "age65_share" not in p and "rent_2br_2025_26" not in p


def test_meta_has_winners_margins_hud_and_the_v040_counts():
    df = _frame()
    m = export.meta(df, CFG)
    assert m["scoring_version"] == CFG["version"]
    assert m["n_tracts"] == 6 and m["n_residential"] == 5
    assert "hud" in m and "winners" in m and "margins" in m
    assert set(m["winners"]) == {p["id"] for p in CFG["presets"]}
    tids = [t["id"] for t in CFG["typologies"]]
    for pid, counts in m["winners"].items():
        assert list(counts) == tids
        assert sum(counts.values()) == 5, pid            # every ranked tract has a winner
        g = m["margins"][pid]
        assert set(g) == {"lt05", "lt03", "lt02", "ties", "median"}
        assert g["ties"] <= g["lt02"] <= g["lt03"] <= g["lt05"] <= 5
    assert m["subsidy_tiers"] == {"1": 2, "0.5": 2, "0": 1}
    assert m["hcv_suppressed_ranked"] == 2                 # the park's null is not counted
    assert m["flood_over_50"] == 2                         # 55 and 70 among ranked tracts; the park's 80 is not
    assert set(m["factor_coverage"]) == set(FIDS)
    assert m["factor_coverage"]["market_strength"] == 4
    for c in ("transit_departures_per_hh", "age65_share", "units_2_4_share", "eviction_zip_dominant", "svi_overall",
              "chas_burden_le50_share", "eviction_filing_rate", "hcv_per_renter"):
        assert c in m["city_medians"], c
    assert m["hud"] is None or m["hud"]["fy"] == 2026
    json.dumps(m, allow_nan=False)


def test_meta_hud_block_is_none_safe(monkeypatch):
    monkeypatch.setattr(export.hud, "summary", lambda: None)
    m = export.meta(_frame(), CFG)
    assert m["hud"] is None


def test_winners_agree_with_the_scoring_engine_on_the_real_data():
    """Only when the pipeline has run: meta.winners must be what score_table says over the ranked tracts."""
    from visionpitts.config import INTERIM
    from visionpitts import scoring

    p = INTERIM / "wide_pressure.parquet"
    if not p.exists():
        import pytest
        pytest.skip("pipeline not run")
    wide = pd.read_parquet(p)
    if any(f not in wide for f in FIDS):
        import pytest
        pytest.skip("wide table predates the current config")
    wins, gaps = export.winners(wide, CFG)
    r = wide[wide["residential"]]
    for pr in CFG["presets"]:
        st = scoring.score_table(r, pr["weights"], CFG)
        assert wins[pr["id"]] == {k: int((st["top"] == k).sum()) for k in [t["id"] for t in CFG["typologies"]]}
        assert gaps[pr["id"]]["ties"] <= gaps[pr["id"]]["lt02"]
    assert sum(wins["balanced"].values()) == len(r)
    assert factors.options(CFG)["flood"]["implausible_share_pct"] == 50
    assert not math.isnan(gaps["balanced"]["median"])
