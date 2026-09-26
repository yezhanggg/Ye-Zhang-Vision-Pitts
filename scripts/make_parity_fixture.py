"""Write tests/fixtures/scoring_cases.json (and a copy for the app) so the Python and TypeScript engines are checked
against the same numbers. Cases mix synthetic tracts with real focus tracts from the built data.

Run: uv run python scripts/make_parity_fixture.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))  # run without installing the package

import json
from pathlib import Path

import pandas as pd

from visionpitts import scoring
from visionpitts.config import INTERIM, ROOT, load_scoring


def main() -> None:
    cfg = load_scoring()
    fids = [f["id"] for f in cfg["factors"]]
    cases = []
    synthetic = [
        ("all mid", {f: 0.5 for f in fids}),
        ("high need low market", {"need": 0.95, "market_strength": 0.1, "displacement_risk": 0.8, "subsidy_eligible": 1.0, "transit_access": 0.6, "flood_exposure": 0.2}),
        ("strong market low need", {"need": 0.1, "market_strength": 0.95, "displacement_risk": 0.2, "subsidy_eligible": 0.0, "transit_access": 0.5, "flood_exposure": 0.1}),
        ("missing market", {"need": 0.7, "market_strength": None, "displacement_risk": 0.6, "subsidy_eligible": 1.0, "transit_access": 0.3, "flood_exposure": 0.9}),
        ("only need", {"need": 0.7, "market_strength": None, "displacement_risk": None, "subsidy_eligible": None, "transit_access": None, "flood_exposure": None}),
        ("nothing", {f: None for f in fids}),
    ]
    for name, x in synthetic:
        for p in cfg["presets"]:
            cases.append({"name": f"{name} / {p['id']}", "x": x, "weights": p["weights"], "scores": scoring.score(x, p["weights"], cfg)})
    wide = INTERIM / "wide_pressure.parquet"
    if wide.exists():
        w = pd.read_parquet(wide)
        focus = json.loads((INTERIM / "focus.json").read_text())
        for f in focus:
            r = w.loc[f["geoid"], fids]
            x = {k: (None if pd.isna(v) else float(v)) for k, v in r.items()}
            for p in cfg["presets"][:2]:
                cases.append({"name": f"{f['label']} / {p['id']}", "geoid": f["geoid"], "x": x, "weights": p["weights"], "scores": scoring.score(x, p["weights"], cfg)})
    out = json.dumps(cases, indent=1)
    (ROOT / "tests" / "fixtures").mkdir(exist_ok=True)
    (ROOT / "tests" / "fixtures" / "scoring_cases.json").write_text(out)
    app_fix = ROOT / "app" / "src" / "lib" / "__fixtures__"
    app_fix.mkdir(parents=True, exist_ok=True)
    (app_fix / "scoring_cases.json").write_text(out)
    print(f"{len(cases)} parity cases written")


if __name__ == "__main__":
    main()
