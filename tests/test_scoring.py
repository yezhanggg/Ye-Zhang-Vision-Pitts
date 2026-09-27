import json
from pathlib import Path

import pytest

from visionpitts import scoring
from visionpitts.config import load_scoring

CFG = load_scoring()
FIDS = [f["id"] for f in CFG["factors"]]
ONES = {f: 1.0 for f in FIDS}
X = {"need": 0.9, "market_strength": 0.2, "displacement_risk": 0.8, "subsidy_eligible": 1.0, "transit_access": 0.5,
     "flood_exposure": 0.1, "senior_demand": 0.6, "small_multifamily_stock": 0.4}
FIXTURE = Path(__file__).parent / "fixtures" / "scoring_cases.json"


def test_config_is_v040_with_eight_factors_and_full_rows():
    assert CFG["version"] == "0.4.0"
    assert FIDS == ["need", "market_strength", "displacement_risk", "subsidy_eligible", "transit_access", "flood_exposure",
                    "senior_demand", "small_multifamily_stock"]
    for k, row in CFG["fit"]["matrix"].items():
        assert list(row) == FIDS, k
    for p in CFG["presets"]:
        assert list(p["weights"]) == FIDS, p["id"]
        if p["id"] in ("balanced", "anti_displacement", "market_led", "transit_first"):  # links written before v0.4.0 fill new weights with 1
            assert p["weights"]["senior_demand"] == 1 and p["weights"]["small_multifamily_stock"] == 1
    for ch in CFG["fit"]["changes"]:
        t, f = ch["cell"].split(".")
        assert CFG["fit"]["matrix"][t][f] == ch["to"], ch
    assert CFG["scoring"]["stability_draws"] == 1000
    assert CFG["scoring"]["tie_margin"] == 0.005 and CFG["scoring"]["close_margin"] == 0.03


def test_contribution_direction():
    assert scoring.contribution(0.8, 1.0) == pytest.approx(0.8)
    assert scoring.contribution(0.8, -1.0) == pytest.approx(0.2)
    assert scoring.contribution(0.3, -0.5) == pytest.approx(0.35)


def test_scores_are_weighted_average_fits_in_unit_interval():
    s = scoring.score(X, ONES, CFG)
    assert set(s) == {t["id"] for t in CFG["typologies"]}
    assert all(0.0 <= v <= 1.0 for v in s.values())


def test_all_high_factors_give_score_one_for_positive_only_row():
    """A typology whose fit row is all >= 0 scores exactly 1 when every factor is at its best value."""
    x = {f: 1.0 for f in FIDS}
    x["flood_exposure"] = 0.0  # every row wants low flood
    s = scoring.score(x, ONES, CFG)
    assert s["small_apartment"] == pytest.approx(1.0)
    assert s["senior"] == pytest.approx(1.0)


def test_graded_subsidy_enters_as_its_grade():
    """A 0.5 grade contributes exactly half of a full designation on the subsidy factor."""
    w = {**{f: 0.0 for f in FIDS}, "subsidy_eligible": 1.0}
    half = scoring.score({**X, "subsidy_eligible": 0.5}, w, CFG)
    full = scoring.score({**X, "subsidy_eligible": 1.0}, w, CFG)
    assert half["small_apartment"] == pytest.approx(0.5) and full["small_apartment"] == pytest.approx(1.0)


def test_missing_factor_is_skipped_not_imputed():
    x_full = {**{f: 0.5 for f in FIDS}, "subsidy_eligible": 1.0}
    x_missing = {**x_full, "market_strength": None}
    s_missing = scoring.score(x_missing, ONES, CFG)
    w_zero = {**ONES, "market_strength": 0.0}
    s_zero_weight = scoring.score(x_full, w_zero, CFG)
    for k in s_missing:
        assert s_missing[k] == pytest.approx(s_zero_weight[k])


def test_no_data_gives_none():
    s = scoring.score({f: None for f in FIDS}, ONES, CFG)
    assert all(v is None for v in s.values())
    assert scoring.ranking(s) == []


def test_ranking_orders_by_score_and_breaks_ties_in_config_order():
    assert scoring.ranking({"adu": 0.5, "duplex_triplex": 0.9, "townhome": 0.9, "small_apartment": None, "senior": 0.1}) == [
        "duplex_triplex", "townhome", "adu", "senior"]


def test_margin_and_is_tie():
    s = {"adu": 0.5, "duplex_triplex": 0.9, "townhome": 0.896, "small_apartment": None, "senior": 0.1}
    assert scoring.margin(s) == pytest.approx(0.004)
    assert scoring.is_tie(s) is True
    assert scoring.is_tie(s, eps=0.001) is False
    assert scoring.margin({"adu": 0.7, "senior": None}) is None
    assert scoring.is_tie({"adu": 0.7, "senior": None}) is False
    assert scoring.margin({"adu": None, "senior": None}) is None
    assert scoring.margin({"adu": 0.7, "senior": 0.7}) == 0.0 and scoring.is_tie({"adu": 0.7, "senior": 0.7})


def test_single_factor_weights_make_every_typology_with_that_fit_score_the_same():
    w = {**{f: 0.0 for f in FIDS}, "need": 1.0}
    s = scoring.score(X, w, CFG)
    assert s["townhome"] is None                      # townhome x need is 0: nothing to score on
    assert s["adu"] == s["senior"] == pytest.approx(0.9)
    assert scoring.is_tie(s)
    w = {**{f: 0.0 for f in FIDS}, "senior_demand": 1.0}
    s = scoring.score(X, w, CFG)
    assert s["senior"] == pytest.approx(0.6) and all(s[k] is None for k in s if k != "senior")
    assert scoring.margin(s) is None
    assert all(v is None for v in scoring.score(X, {f: 0.0 for f in FIDS}, CFG).values())


def test_anti_displacement_weights_raise_displacement_share_of_score():
    x = {**X, "displacement_risk": 0.9, "transit_access": 0.4, "flood_exposure": 0.3}
    bal = scoring.parts(x, scoring.preset_weights(CFG, "balanced"), CFG, "small_apartment")
    anti = scoring.parts(x, scoring.preset_weights(CFG, "anti_displacement"), CFG, "small_apartment")
    share = lambda ps: next(p["contrib"] for p in ps if p["factor"] == "displacement_risk")  # noqa: E731
    assert share(anti) > share(bal)


def test_stability_is_reproducible_and_bounded():
    a = scoring.rank_stability(X, ONES, CFG)
    b = scoring.rank_stability(X, ONES, CFG)
    assert a == b
    assert 0.0 <= a["stability"] <= 1.0
    assert a["draws"] == CFG["scoring"]["stability_draws"] == 1000


def _fixture() -> dict:
    if not FIXTURE.exists():
        pytest.skip("fixture not generated yet")
    return json.loads(FIXTURE.read_text())


def test_parity_fixture_matches_engine():
    """The fixture is generated by scripts/make_parity_fixture.py and also checked by the TypeScript engine."""
    fx = _fixture()
    assert fx["version"] == CFG["version"], "regenerate the fixture after changing config/scoring.json"
    assert fx["factors"] == FIDS
    assert len(fx["cases"]) > 40
    for c in fx["cases"]:
        s = scoring.score(c["x"], c["weights"], CFG)
        for k, v in c["scores"].items():
            assert (s[k] is None and v is None) or s[k] == pytest.approx(v, abs=1e-9), c["name"]
        rk = scoring.ranking(s)
        assert (rk[0] if rk else None) == c["top"], c["name"]
        m = scoring.margin(s)
        assert (m is None and c["margin"] is None) or m == pytest.approx(c["margin"], abs=1e-9), c["name"]
        assert scoring.is_tie(s, CFG["scoring"]["tie_margin"]) == c["tie"], c["name"]


def test_parity_fixture_covers_all_presets_edge_cases_and_focus_tracts():
    fx = _fixture()
    names = [c["name"] for c in fx["cases"]]
    for p in CFG["presets"]:
        assert any(n.endswith(f"/ {p['id']}") for n in names), p["id"]
    for edge in ("all weights zero", "need only", "senior_demand only"):
        assert any(n.endswith(edge) for n in names), edge
    with_geoid = [c for c in fx["cases"] if c.get("geoid")]
    assert len(with_geoid) >= 8 * len(CFG["presets"])


def test_parity_fixture_has_stability_cases_the_engine_reproduces():
    fx = _fixture()
    assert len(fx["stability"]) == 8
    for c in fx["stability"]:
        assert c["draws"] == CFG["scoring"]["stability_draws"] and c["seed"] == CFG["scoring"]["stability_seed"]
        assert c["tolerance"] == 0.05
        st = scoring.rank_stability(c["x"], c["weights"], CFG, seed=c["seed"], draws=c["draws"])
        assert st["top"] == c["top"], c["name"]
        assert st["stability"] == pytest.approx(c["share"]), c["name"]
