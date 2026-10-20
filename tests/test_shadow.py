import json
import math
from datetime import date, datetime
from zoneinfo import ZoneInfo

import numpy as np
import pytest

from visionpitts import shadow as sh

# Read by hand off the NOAA solar calculator for MUSA 6950 Assignment 3: October 5, 2026, Eastern Daylight Time,
# at 40.0213, -75.0830 (hour, elevation, azimuth).
NOAA = [(8, 10.40, 105.36), (9, 21.08, 116.20), (10, 30.73, 128.90), (11, 38.62, 144.38), (12, 43.70, 163.10),
        (13, 44.99, 183.98), (14, 42.15, 204.29), (15, 35.85, 221.78), (16, 27.18, 236.08), (17, 17.04, 247.94)]


@pytest.mark.parametrize("hour,elevation,azimuth", NOAA)
def test_sun_position_matches_the_noaa_calculator(hour, elevation, azimuth):
    el, az = sh.solar_position(datetime(2026, 10, 5, hour, tzinfo=ZoneInfo("America/New_York")), 40.0213, -75.0830)
    assert el == pytest.approx(elevation, abs=0.05)
    assert az == pytest.approx(azimuth, abs=0.05)


def test_day_steps_cover_daylight_and_follow_the_seasons():
    june, sept, dec = (sh.day_steps(d) for _, _, d in sh.DAYS)
    assert len(june) > len(sept) > len(dec)
    for steps in (june, sept, dec):
        assert all(s["el"] >= sh.MIN_ELEV for s in steps)
        assert [s["min"] for s in steps] == list(range(steps[0]["min"], steps[-1]["min"] + 1, sh.STEP_MIN))
        noon = max(steps, key=lambda s: s["el"])
        assert 170 < noon["az"] < 200          # highest in the south
        assert steps[0]["az"] < 180 < steps[-1]["az"]   # rises in the east, sets in the west
    assert max(s["el"] for s in june) == pytest.approx(73.0, abs=0.6)   # 90 - 40.44 + 23.44
    assert max(s["el"] for s in dec) == pytest.approx(26.1, abs=0.6)    # 90 - 40.44 - 23.44
    assert sh.clock_label(0) == "12:00 AM" and sh.clock_label(750) == "12:30 PM" and sh.clock_label(1230) == "8:30 PM"


def test_true_north_is_about_one_and_a_half_degrees_east_of_grid_north_in_pittsburgh():
    assert sh.true_north_bearing(sh.DSM_CRS, sh.SUN_AT[1], sh.SUN_AT[0]) == pytest.approx(1.46, abs=0.05)
    # on the grid's central meridian the two norths agree
    assert sh.true_north_bearing(sh.DSM_CRS, -77.75, 40.4) == pytest.approx(0.0, abs=0.01)


def _pole(height=60.0, size=81, cell=6.0):
    dsm = np.full((size, size), 100.0, dtype=np.float32)
    dsm[size // 2, size // 2] += height
    return dsm, cell, size // 2


@pytest.mark.parametrize("azimuth,drow,dcol", [(180, -1, 0), (0, 1, 0), (90, 0, -1), (270, 0, 1)])
def test_a_pole_casts_its_shadow_away_from_the_sun(azimuth, drow, dcol):
    dsm, cell, mid = _pole()
    elevation = 30.0
    out = sh.shadow_reference(dsm, cell, *sh.sun_vector(azimuth, elevation))
    rows, cols = np.nonzero(out)
    # a straight line of cells on the far side of the pole from the sun
    assert np.all((rows - mid) * dcol == (cols - mid) * drow)
    reach = np.maximum(np.abs(rows - mid), np.abs(cols - mid))
    assert np.all(((rows - mid) * drow + (cols - mid) * dcol) > 0)
    # length = height / tan(elevation), to the cell
    expected = 60.0 / math.tan(math.radians(elevation)) / cell
    assert reach.max() == pytest.approx(expected, abs=1.0)
    assert out[mid, mid] == 0


def test_lower_sun_longer_shadow_and_flat_ground_none():
    dsm, cell, _ = _pole()
    low = sh.shadow_reference(dsm, cell, *sh.sun_vector(180, 15)).sum()
    high = sh.shadow_reference(dsm, cell, *sh.sun_vector(180, 60)).sum()
    assert low > high > 0
    flat = np.full((40, 40), 250.0, dtype=np.float32)
    assert sh.shadow_reference(flat, 6.0, *sh.sun_vector(135, 5)).sum() == 0


def test_nodata_cells_neither_cast_nor_receive():
    dsm, cell, mid = _pole()
    dsm[mid, mid] = sh.NODATA          # the pole becomes a hole
    dsm[5, 5] = sh.NODATA
    out = sh.shadow_reference(dsm, cell, *sh.sun_vector(180, 30))
    assert out.sum() == 0


def test_a_slope_facing_away_from_a_low_sun_is_in_its_own_shadow():
    # ground rising 1 ft per ft toward the north (45 degrees); the sun is in the north at 20 degrees
    rows = np.arange(60, dtype=np.float32)[:, None]
    dsm = np.repeat((60 - rows) * 6.0, 60, axis=1)
    lit_side = sh.shadow_reference(dsm, 6.0, *sh.sun_vector(180, 20))
    dark_side = sh.shadow_reference(dsm, 6.0, *sh.sun_vector(0, 20))
    assert lit_side.sum() == 0
    assert dark_side[10:, :].all()


def test_reference_caster_and_march_limit_agree():
    rng = np.random.default_rng(7)
    dsm = (rng.random((64, 64)) * 80 + 700).astype(np.float32)
    v = sh.sun_vector(222.0, 18.0)
    a = sh.ReferenceCaster(dsm, 6.0)(*v)
    b = sh.shadow_reference(dsm, 6.0, *v, dsm_max=1e9)   # no early stop: same answer, more steps
    assert np.array_equal(a, b)
    assert 0 < a.mean() < 1


def test_pages_round_trip_and_png_is_exact():
    rng = np.random.default_rng(3)
    stack = rng.integers(0, 2, size=(19, 12, 17), dtype=np.uint8)
    pages = sh.pack_steps(stack)
    assert pages.shape == (3, 12, 17) and sh.page_count(19) == 3 and sh.page_count(16) == 2
    for k in range(19):
        assert np.array_equal(sh.unpack_step(pages, k), stack[k])
    png = sh.png_gray(pages[1])
    assert np.array_equal(sh.read_png_gray(png), pages[1])
    # nothing but the header, the pixels and the end marker: no gamma or color chunks that could alter bits in a browser
    assert [png[i : i + 4] for i in (12,)] == [b"IHDR"] and b"gAMA" not in png and b"sRGB" not in png and b"iCCP" not in png


def test_tile_math():
    z, x, y = 13, 2275, 3088
    west, south, east, north = sh.tile_lonlat(z, x, y)
    assert west < sh.SUN_AT[1] < east and south < sh.SUN_AT[0] < north     # the chunk over Downtown
    minx, miny, maxx, maxy = sh.tile_bounds(z, x, y)
    assert maxx - minx == pytest.approx(maxy - miny) == pytest.approx(2 * sh.MERC / 8192)
    # about 6 ft on the ground per pixel at this latitude
    assert (maxx - minx) / sh.CHUNK_PX * math.cos(math.radians(40.44)) * 3.28084 == pytest.approx(6.0, abs=0.1)


def test_despike_removes_a_cone_and_keeps_buildings():
    dsm = np.full((120, 120), 710.0, dtype=np.float32)
    dsm[20:30, 20:30] = 1600.0                                # a tower: under the ceiling, stays
    rr, cc = np.mgrid[0:120, 0:120]
    cone = 4200.0 - 280.0 * np.hypot(rr - 80, cc - 80)
    dsm = np.maximum(dsm, cone.astype(np.float32))
    clean, changed = sh.despike(dsm)
    assert changed > 100
    assert clean[60:100, 60:100].max() <= 720.0
    assert np.array_equal(clean[20:30, 20:30], dsm[20:30, 20:30])
    assert sh.despike(clean)[1] == 0


def test_build_writes_every_file_the_manifest_names(tmp_path):
    # a small made-up surface placed over Downtown: flat ground with one block of tall buildings
    dsm = np.full((300, 300), 720.0, dtype=np.float32)
    dsm[140:160, 140:160] = 1200.0
    dsm[:, :20] = sh.NODATA
    x0, y0, cell = 1340000.0, 412000.0, 48.0
    seen = {}
    m = sh.build(dsm, x0, y0, cell, sh.ReferenceCaster(dsm, cell), tmp_path, days=[("dec21", "December 21", date(2026, 12, 21))],
                 chunk_px=256, overview_factor=4, keep=seen, log=lambda *_: None)
    day = m["days"][0]
    assert len(day["steps"]) == 18 and day["pages"] == 3
    assert m["chunks"] and m["bitsPerPage"] == 8 and m["grid"] == {"z": 13, "px": 256}
    for x, y in m["chunks"]:
        for p in range(day["pages"]):
            assert (tmp_path / m["paths"]["page"].format(day="dec21", x=x, y=y, p=p)).exists()
        assert (tmp_path / m["paths"]["hours"].format(day="dec21", x=x, y=y)).exists()
    assert (tmp_path / "dec21" / "ov_p0.png").exists() and (tmp_path / "dec21" / "ov_h.png").exists()
    # shadow share is lowest around solar noon and highest at the ends of the day
    shade = [s["shade"] for s in day["steps"]]
    assert min(shade) == pytest.approx(min(shade[6:12])) and shade[0] > min(shade) and shade[-1] > min(shade)
    # the cells just north of the block lose sun; open ground far to the south keeps all of it
    lit = seen["dec21"]
    assert lit[130, 150] < lit[280, 150] == 18
    # a chunk's hours page marks cells outside the data as 255, and its first page has shadow bits set somewhere
    x, y = m["chunks"][0]
    hours = sh.read_png_gray((tmp_path / "dec21" / f"{x}_{y}_h.png").read_bytes())
    assert hours.shape == (256, 256) and (hours == sh.HOURS_NODATA).any()
    assert any(sh.read_png_gray((tmp_path / "dec21" / f"{cx}_{cy}_p0.png").read_bytes()).any() for cx, cy in m["chunks"])


def test_publish_with_a_fine_level(tmp_path):
    dsm = np.full((240, 240), 720.0, dtype=np.float32)
    dsm[100:120, 100:120] = 1100.0
    days = [("dec21", "December 21", date(2026, 12, 21))]
    sh.build(dsm, 1340000.0, 412000.0, 48.0, sh.ReferenceCaster(dsm, 48.0), tmp_path / "run", days=days, chunk_px=256, overview_factor=4, log=lambda *_: None)
    assert sh.check_output(tmp_path / "run")[1] == []
    sh.reduce_run(tmp_path / "run", tmp_path / "run_x2", 2)
    assert sh.check_output(tmp_path / "run_x2")[1] == []
    main, fine = sh.publish(tmp_path / "run_x2", tmp_path / "site", fine_from=tmp_path / "run")
    assert main > 0 and fine > 0
    site = json.loads((tmp_path / "site" / "manifest.json").read_text())
    level = json.loads((tmp_path / "site" / "fine" / "manifest.json").read_text())
    assert site["grid"]["px"] == 128 and level["px"] == 256 and level["minZoom"] == sh.FINE_MIN_ZOOM
    x, y = site["chunks"][0]
    assert (tmp_path / "site" / level["page"].format(day="dec21", x=x, y=y, p=0)).exists()
    assert not list((tmp_path / "site" / "fine").glob("*/*_h.png")) and not list((tmp_path / "site" / "fine").glob("*/ov_*"))
    # a coarse cell is in shadow when at least half of its fine cells are
    a = sh.read_png_gray((tmp_path / "run" / "dec21" / f"{x}_{y}_p0.png").read_bytes()) & 1
    b = sh.read_png_gray((tmp_path / "run_x2" / "dec21" / f"{x}_{y}_p0.png").read_bytes()) & 1
    assert np.array_equal(b, (a.reshape(128, 2, 128, 2).sum(axis=(1, 3)) >= 2).astype(np.uint8))
    # without a fine run nothing is written for it
    assert sh.publish(tmp_path / "run_x2", tmp_path / "site2")[1] == 0 and not (tmp_path / "site2" / "fine").exists()
