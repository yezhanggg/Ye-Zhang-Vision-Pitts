import json

import pytest

from visionpitts import pencil_defaults as pd_
from visionpitts.config import APP_DATA


@pytest.fixture(scope="module")
def cfg():
    return json.loads(pd_.CONFIG.read_text())


def test_every_input_is_labeled(cfg):
    for key, v in cfg["inputs"].items():
        assert v["kind"] == "example", key
        assert v["note"] and "unit" in v
    for block in (cfg["credit"], cfg["phfa"]):
        for key, v in block.items():
            assert v["kind"] == "sourced" and v["source"] in cfg["sources"] and v["ref"], key
    assert cfg["ua"]["source"] in cfg["sources"] and cfg["set_aside"]["source"] in cfg["sources"]


def test_utility_allowance_is_the_sum_of_its_parts(cfg):
    parts = cfg["ua"]["parts"].values()
    assert [sum(x) for x in zip(*parts)] == cfg["ua"]["by_br"]


def test_phfa_figures_as_transcribed(cfg):
    p = cfg["phfa"]
    assert (p["basis_per_home"]["nine"], p["basis_per_home"]["four"]) == (320000, 380000)
    assert (p["credit_cap"]["base"], p["credit_cap"]["large"], p["credit_cap"]["supportive"]) == (1700000, 1800000, 1850000)
    assert (p["fee"]["first"], p["fee"]["after"], p["fee"]["cap_nine_base"], p["fee"]["cap_nine_large"], p["fee"]["cap_four_paid"]) == (0.15, 0.10, 1750000, 2000000, 2550000)
    assert (cfg["credit"]["nine"]["rate"], cfg["credit"]["four"]["rate"], cfg["credit"]["boost"]["value"]) == (0.09, 0.04, 1.3)


def test_parse_mtsp():
    raw = {"data": {"area_name": "X", "year": "2026", "median_income": 100000,
                    **{f"{lv}percent": {f"il{lv}_p{n}": 1000 * int(lv) + n for n in range(1, 9)} for lv in ("30", "50", "60", "80")}}}
    m = pd_.parse_mtsp(raw)
    assert m["fy"] == 2026 and m["l"]["60"][0] == 60001 and len(m["l"]["80"]) == 8 and m["hera_special"] is False


def test_built_file_when_present(cfg):
    path = APP_DATA / "lazy" / "pencil_defaults.json"
    if not path.exists():
        pytest.skip("not built")
    d = json.loads(path.read_text())
    assert {k: v for k, v in d.items() if k != "mtsp"} == cfg, "rerun scripts/19_build_pencil_defaults.py"
    m = d["mtsp"]
    assert all(len(m["l"][lv]) == 8 for lv in pd_.LEVELS)
    for fifty, sixty in zip(m["l"]["50"], m["l"]["60"]):
        assert abs(round(fifty * 1.2) - sixty) <= 50  # HUD rounds to the nearest $50
