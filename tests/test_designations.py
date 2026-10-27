import json

import pytest

from visionpitts import designations as ds


@pytest.fixture(scope="module")
def built():
    if not ds.OUT.exists():
        pytest.skip("designations.json not built (scripts/21_build_designations.py)")
    return json.loads(ds.OUT.read_text())


def test_hud_counts_for_allegheny(built):
    assert len(built["qct"]["2026"]) == 90 and len(built["qct"]["2027"]) == 86
    assert built["qct_change"]["lose"] == sorted(set(built["qct"]["2026"]) - set(built["qct"]["2027"]))
    # The four city tracts the verifier read from HUD's metro lists.
    for g in ("42003111500", "42003170200", "42003562901", "42003563202"):
        assert g in built["qct_change"]["lose"]
    assert built["sdda_zcta"]["2026"] == built["sdda_zcta"]["2027"]


def test_every_geoid_is_in_the_county(built):
    for y in ("2026", "2027"):
        assert all(g.startswith("42003") and len(g) == 11 for g in built["qct"][y])
