"""Paths, geography constants and demo tracts."""
from __future__ import annotations

import json
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env")

RAW = ROOT / "data" / "raw"              # public downloads, git-ignored
INTERIM = ROOT / "data" / "interim"      # caches (crosswalk), git-ignored
PROCESSED = ROOT / "data" / "processed"  # small derived outputs, tracked
SCORING_JSON = ROOT / "config" / "scoring.json"
APP_DATA = ROOT / "app" / "src" / "data"  # imported at build time, so the single-file export works over file://

for _d in (INTERIM, PROCESSED, APP_DATA):
    _d.mkdir(parents=True, exist_ok=True)

CENSUS_API_KEY = os.environ.get("CENSUS_API_KEY", "")

STATE_FIPS = "42"
COUNTY_FIPS = "003"
COUNTY_GEOID = STATE_FIPS + COUNTY_FIPS
CITY_PLACE_GEOID = "4261000"  # Pittsburgh city (Census place)

CRS_WGS84 = "EPSG:4326"
CRS_PA_SOUTH = "EPSG:2272"  # NAD83 / Pennsylvania South (US ft): use for area, distance, buffers

ACS_YEAR = 2024          # ACS 5-year 2020-2024
YEAR_NOW = 2026
CITY_SHARE_MIN = 0.5     # a tract is "in the city" if at least this share of its land area is inside the city limits
SQM_PER_ACRE = 4046.8564224
FT_PER_M = 3.280839895

# Demo tracts. The first is the hero. GEOIDs are resolved from neighborhood polygons at build time where None.
FOCUS_TRACTS: list[tuple[str, str | None]] = [
    ("Hazelwood", "42003562300"),
    ("Garfield", None),
    ("Middle Hill", "42003050100"),
    ("Homewood North", "42003130700"),
    ("Lower Lawrenceville", "42003060300"),
    ("South Side Flats", "42003160900"),
    ("Squirrel Hill North", "42003140300"),
    ("Beechview", None),
]


def load_scoring() -> dict:
    return json.loads(SCORING_JSON.read_text())


def factor_ids(cfg: dict | None = None) -> list[str]:
    cfg = cfg or load_scoring()
    return [f["id"] for f in cfg["factors"]]
