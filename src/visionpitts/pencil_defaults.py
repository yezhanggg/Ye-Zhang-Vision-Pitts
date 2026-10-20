"""The pencil's inputs for the Place page: config/pencil_defaults.json (PHFA caps, credit rates, the HACP utility
allowances and example costs, each labeled sourced or example) plus HUD's FY2026 MTSP income limits for the
Pittsburgh area, written to app/src/data/lazy/pencil_defaults.json.

MTSP limits are the ones tax credit rents are set from; they are read as HUD publishes them (30, 50, 60 and 80% of
area median income for 1 to 8 people), never derived from the Section 8 limits the rest of the Place page uses.
"""
from __future__ import annotations

import json
from pathlib import Path

from visionpitts import place_measures as pm
from visionpitts.config import APP_DATA, ROOT

CONFIG = ROOT / "config" / "pencil_defaults.json"
OUT = APP_DATA / "lazy" / "pencil_defaults.json"
LEVELS = ("30", "50", "60", "80")


def parse_mtsp(d: dict) -> dict:
    """{area, fy, median, l: {"30": [8], "50": [8], "60": [8], "80": [8]}} from a HUD User mtspil response."""
    data = d["data"]
    return {
        "area": data.get("area_name"), "fy": int(data.get("year")), "median": int(data["median_income"]),
        "l": {lv: [int(data[f"{lv}percent"][f"il{lv}_p{n}"]) for n in range(1, 9)] for lv in LEVELS},
        "hera_special": bool(data.get("hera_special_50percent") or data.get("hera_special_60percent")),
    }


def build(refresh: bool = False, fy: int = 2026) -> dict:
    cfg = json.loads(CONFIG.read_text())
    raw = pm._hud_get("mtspil", fy, refresh)
    if raw is None:
        raise SystemExit("HUD MTSP limits: no cache and no HUD_API_KEY")
    return {**cfg, "mtsp": {**parse_mtsp(raw), "source": "hud_mtsp"}}


def write(payload: dict, path: Path = OUT) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False))
